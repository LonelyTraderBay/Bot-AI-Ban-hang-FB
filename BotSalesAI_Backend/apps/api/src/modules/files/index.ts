import {
    Body, ConflictException, Controller, Get, Module, NotFoundException, Param, Post, Query, Req, Res,
    UnprocessableEntityException, UploadedFile, UseInterceptors, type DynamicModule,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { extname } from 'node:path';
import { Worker } from 'node:worker_threads';
import sharp from 'sharp';
import type { FileObject, FilePurpose, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { API_PREFIX, ContractOperation } from '../../http/operations.js';
import { idPipe, validUuid } from '../../http/query.js';
import { envelope, noStore } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig, type ShopScope } from '../workspace/index.js';
import { csvType, readSpreadsheet, xlsxType } from './spreadsheets.js';

const maxBytes = 5 * 1024 * 1024;
const uploadInput = new SchemaPipe(validator.compile(schemaFromContract('FileUpload')));
const permissionByPurpose: Readonly<Record<FilePurpose, string>> = {
    product_image: 'catalog.write', product_import: 'catalog.import', knowledge_source: 'knowledge.write',
    bank_statement: 'finance.reconcile', cod_statement: 'finance.reconcile', conversation_media: 'conversations.reply',
};
export const fileCommand = { operationId: 'uploadFile', resourceType: 'file', scopePermissions: permissionByPurpose };
const rasterMime = new Map([['jpeg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']]);
type UploadInput = { purpose: FilePurpose; resourceId?: string };
type UploadPart = { buffer: Buffer; mimetype: string; originalname: string };

function scanSpreadsheet(bytes: Buffer, mimeType: string): Promise<boolean> {
    return new Promise(resolve => {
        const worker = new Worker(new URL('./spreadsheet-scan.js', import.meta.url), {
            workerData: { bytes, mimeType }, resourceLimits: { maxOldGenerationSizeMb: 96 },
        });
        const timeout = setTimeout(() => { void worker.terminate(); resolve(false); }, 10000);
        const finish = (valid: boolean) => { clearTimeout(timeout); resolve(valid); };
        worker.once('message', result => finish(result === true));
        worker.once('error', () => finish(false));
        worker.once('exit', () => finish(false));
    });
}

function fileKey(shopId: string, id: string) {
    return { shopId_id: { shopId, id } };
}

export async function readyImportFile(tx: Prisma.TransactionClient, shopId: string, userId: string, fileId: string) {
    if (!validUuid(fileId)) throw new NotFoundException();
    const file = await tx.fileObject.findFirst({
        where: { shopId, id: fileId, uploaderId: userId, purpose: 'product_import', status: 'ready' },
        select: { mimeType: true, blob: { select: { bytes: true } } },
    });
    if (!file?.blob) throw new NotFoundException();
    return { mimeType: file.mimeType, bytes: Buffer.from(file.blob.bytes) };
}

export { readSpreadsheet };

export async function replaceProductImages(tx: Prisma.TransactionClient, scope: Pick<ShopScope, 'shopId' | 'userId'>, productId: string, ids: string[]) {
    if (ids.length > 30 || new Set(ids).size !== ids.length || ids.some(id => !validUuid(id))) throw new UnprocessableEntityException();
    const files = await tx.fileObject.findMany({
        where: {
            shopId: scope.shopId, id: { in: ids }, status: 'ready', purpose: 'product_image',
            OR: [{ uploaderId: scope.userId, resourceId: null }, { resourceId: productId }],
        },
        select: { id: true },
    });
    if (files.length !== ids.length) throw new UnprocessableEntityException();
    await tx.fileObject.updateMany({ where: { shopId: scope.shopId, id: { in: ids } }, data: { resourceId: productId } });
    await tx.productImage.deleteMany({ where: { shopId: scope.shopId, productId } });
    await tx.productImage.createMany({ data: ids.map((fileId, position) => ({ shopId: scope.shopId, productId, fileId, position })) });
}

async function inspect(file: UploadPart, name: string, purpose: FilePurpose) {
    try {
        if (purpose === 'product_image') {
            if (!Array.from(rasterMime.values()).includes(file.mimetype)) return null;
            const image = sharp(file.buffer, { limitInputPixels: 8_000_000, failOn: 'warning' });
            const { format, pages } = await image.metadata();
            if (!rasterMime.has(format) || rasterMime.get(format) !== file.mimetype || (pages ?? 1) !== 1) return null;
            const bytes = await image.toBuffer();
            if (bytes.length > maxBytes) return null;
            return { bytes, mimeType: file.mimetype };
        }
        const extension = extname(name).toLowerCase();
        const mimeType = extension === '.csv' ? csvType : extension === '.xlsx' ? xlsxType : null;
        if (!mimeType) return null;
        const compatible = mimeType === csvType ? [csvType, 'text/plain', 'application/vnd.ms-excel'] : [xlsxType];
        if (!compatible.includes(file.mimetype) && file.mimetype !== 'application/octet-stream') return null;
        if (!await scanSpreadsheet(file.buffer, mimeType)) return null;
        return { bytes: file.buffer, mimeType };
    } catch {
        return null;
    }
}

function signedRead(key: Buffer, file: FileObject, userId: string, expires: number) {
    return createHmac('sha256', key).update(JSON.stringify(['read-file', file.shopId, file.id, userId, expires])).digest();
}

function canReadReady(file: FileObject, config: AuthConfig | undefined, userId: string, content: string) {
    const match = /^(\d{13})\.([a-f0-9]{64})$/.exec(content);
    if (!match || !config || file.status !== 'ready' || Number(match[1]) <= Date.now()) return false;
    return timingSafeEqual(Buffer.from(match[2], 'hex'), signedRead(config.signingKey, file, userId, Number(match[1])));
}

function fileView(file: FileObject, config: AuthConfig | undefined, userId: string) {
    const expires = Date.now() + 5 * 60 * 1000;
    const token = file.status === 'ready' && config ? expires + '.' + signedRead(config.signingKey, file, userId, expires).toString('hex') : null;
    return {
        id: file.id, shopId: file.shopId, name: file.name, mimeType: file.mimeType, sizeBytes: file.sizeBytes, status: file.status,
        purpose: file.purpose, resourceId: file.resourceId,
        readUrl: token ? API_PREFIX + '/shops/' + file.shopId + '/uploads/' + file.id + '?content=' + token : null,
    };
}

class FilesService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    async upload(headers: IncomingHttpHeaders, shopId: string, fields: Record<string, unknown>, file: UploadPart | undefined, requestId: string) {
        const input = uploadInput.transform({ ...fields, ...(file ? { file: 'received' } : {}) }) as UploadInput;
        if (Object.hasOwn(fields, 'file') || !file?.buffer.length) throw new UnprocessableEntityException();
        const permission = permissionByPurpose[input.purpose];
        await readAsSession(this.db, headers, (tx, userId) => requireShopAccess(tx, userId, shopId, permission));
        if (input.purpose !== 'product_image' && input.purpose !== 'product_import') throw new UnprocessableEntityException();
        if (input.resourceId && (!validUuid(input.resourceId) || input.purpose !== 'product_image')) throw new UnprocessableEntityException();
        const name = file.originalname.replace(/[\x00-\x1f\x7f/\\]/g, '_').trim().slice(0, 255) || 'upload';
        const digest = createHash('sha256').update(file.buffer).digest('hex');
        const inspected = await inspect(file, name, input.purpose);
        const { operationId } = fileCommand;
        return writeShopCommand(this.db, this.config, {
            headers, shopId, permission, operationId,
            payload: { purpose: input.purpose, resourceId: input.resourceId ?? null, name, mimeType: file.mimetype, digest },
        }, async (tx, scope) => {
            if (input.resourceId && !await tx.product.findFirst({
                where: { shopId, id: input.resourceId, status: { not: 'archived' } }, select: { id: true },
            })) throw new UnprocessableEntityException();
            const bytes = inspected?.bytes;
            const stored = await tx.fileObject.create({
                data: {
                    shopId, uploaderId: scope.userId, name, mimeType: inspected?.mimeType ?? 'application/octet-stream',
                    sizeBytes: bytes?.length ?? file.buffer.length, sha256: bytes ? createHash('sha256').update(bytes).digest('hex') : digest,
                    purpose: input.purpose, resourceId: input.resourceId, status: bytes ? 'ready' : 'quarantined',
                },
            });
            if (bytes) await tx.fileBlob.create({ data: { shopId, fileId: stored.id, bytes: Uint8Array.from(bytes) } });
            await recordAudit(tx, {
                shopId, actorId: scope.userId, action: operationId, requestId, resourceType: 'file', resourceId: stored.id,
                metadata: { purpose: input.purpose, status: stored.status, sizeBytes: stored.sizeBytes },
            });
            return { type: 'file', id: stored.id, scope: input.purpose };
        }, async (tx, scope, result) => {
            if (result.type !== 'file') throw new ConflictException();
            return fileView(await tx.fileObject.findUniqueOrThrow({ where: fileKey(shopId, result.id) }), this.config, scope.userId);
        });
    }

    read(headers: IncomingHttpHeaders, shopId: string, fileId: string, content: string | undefined) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId);
            const file = await tx.fileObject.findUnique({ where: fileKey(shopId, fileId) });
            if (!file) throw new NotFoundException();
            const permittedOwner = file.uploaderId === userId && scope.permissions.includes(permissionByPurpose[file.purpose]);
            const attachedImage = file.purpose === 'product_image' && scope.permissions.includes('catalog.read')
                && await tx.productImage.findFirst({ where: { shopId, fileId }, select: { fileId: true } });
            if (!permittedOwner && !attachedImage) throw new NotFoundException();
            const view = fileView(file, this.config, userId);
            if (content === undefined) return { view };
            if (!canReadReady(file, this.config, userId, content)) throw new NotFoundException();
            const blob = await tx.fileBlob.findUnique({ where: { shopId_fileId: { shopId, fileId } } });
            if (!blob) throw new NotFoundException();
            return { view, bytes: Buffer.from(blob.bytes) };
        });
    }
}

@Controller('shops/:shopId/uploads')
class FilesController {
    constructor(private readonly files: FilesService) {}

    @Post()
    @ContractOperation('uploadFile')
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: maxBytes, files: 1, fields: 2, fieldSize: 2048 } }))
    async upload(@Param('shopId', idPipe) shopId: string, @Body() fields: Record<string, unknown>, @UploadedFile() file: UploadPart | undefined,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.files.upload(request.headers, shopId, fields, file, String(response.getHeader('X-Request-Id'))));
    }

    @Get(':fileId')
    @ContractOperation('getFile')
    async get(@Param('shopId', idPipe) shopId: string, @Param('fileId', idPipe) fileId: string, @Query('content') content: string | undefined,
        @Req() request: IncomingMessage, @Res() response: ServerResponse) {
        noStore(response);
        const { bytes, view } = await this.files.read(request.headers, shopId, fileId, content);
        response.setHeader('X-Content-Type-Options', 'nosniff');
        if (!bytes) {
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify(envelope(response, view)));
            return;
        }
        response.setHeader('Content-Type', view.mimeType);
        response.setHeader('Content-Disposition', view.purpose === 'product_image' ? 'inline' : 'attachment');
        response.setHeader('Content-Length', bytes.length);
        response.end(bytes);
    }
}

@Module({})
class FilesModule {}

export function filesModule(db?: PrismaClient, config?: AuthConfig): DynamicModule {
    return {
        module: FilesModule, controllers: [FilesController],
        providers: [{ provide: FilesService, useFactory: () => new FilesService(db, config) }],
    };
}
