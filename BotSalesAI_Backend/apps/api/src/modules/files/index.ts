import {
    Body, ConflictException, Controller, Get, Module, NotFoundException, Param, Post, Query, Req, Res,
    ServiceUnavailableException, UnprocessableEntityException, UploadedFile, UseInterceptors, type DynamicModule,
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
import { channelMediaPolicy, messengerFixtureEnabled } from '../channels/index.js';
import { readAsSession, requireIdempotencyKey, requireMutationCsrf, requireSessionToken, requireShopAccess,
    usesLocalOidcFixture, writeShopCommand, type AuthConfig, type ShopScope } from '../workspace/index.js';
import { csvType, readSpreadsheet, xlsxType } from './spreadsheets.js';
import { maxUploadBytes, type UploadScanner } from './upload-scanner.js';
import { fileContents, readReadyFileBytes } from './storage-transfer.js';

const maxBytes = maxUploadBytes;
export { readFileScannerTarget, UploadScanner, type FileScannerTarget } from './upload-scanner.js';
export { configuredFileStore, configuredFixtureFileStore, readFileTransfersEnabled, readObjectStorageConfig } from './object-storage.js';
export { fileContents, fileStorageBacklog, purgeRecoveredFiles, readReadyFileBytes, transferFileObjects } from './storage-transfer.js';
const uploadInput = new SchemaPipe(validator.compile(schemaFromContract('FileUpload')));
const permissionByPurpose: Readonly<Record<FilePurpose, string>> = {
    product_image: 'catalog.write', product_import: 'catalog.import', knowledge_source: 'knowledge.write',
    bank_statement: 'finance.reconcile', cod_statement: 'finance.reconcile', conversation_media: 'conversations.reply',
    report_export: 'reports.export', privacy_export: 'privacy.manage',
};
export const fileCommand = { operationId: 'uploadFile', resourceType: 'file', scopePermissions: permissionByPurpose };
const rasterMime = new Map([['jpeg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']]);
const plainText = new TextDecoder('utf-8', { fatal: true });
type GeneratedPurpose = 'report_export' | 'privacy_export';
type UploadInput = { purpose: Exclude<FilePurpose, GeneratedPurpose>; resourceId?: string };
type UploadPart = { buffer: Buffer; mimetype: string; originalname: string };

function scanFile(workerUrl: URL, workerData: { bytes: Buffer; mimeType?: string }): Promise<unknown> {
    return new Promise(resolve => {
        const worker = new Worker(workerUrl, { workerData, resourceLimits: { maxOldGenerationSizeMb: 96 } });
        const timeout = setTimeout(() => { void worker.terminate(); resolve(null); }, 10000);
        const finish = (result: unknown) => { clearTimeout(timeout); resolve(result); };
        worker.once('message', finish);
        worker.once('error', () => finish(null));
        worker.once('exit', () => finish(null));
    });
}

export async function extractKnowledgeText(bytes: Buffer, mimeType: string) {
    let text: string;
    if (mimeType === 'application/pdf') {
        const extracted = await scanFile(new URL('./pdf-text-worker.js', import.meta.url), { bytes });
        if (typeof extracted !== 'string') throw new UnprocessableEntityException();
        text = extracted;
    } else if (mimeType === 'text/plain') text = plainText.decode(bytes);
    else if (mimeType === csvType) text = (await readSpreadsheet(bytes, mimeType)).map(row => row.join('\t')).join('\n');
    else throw new UnprocessableEntityException();
    const value = text.trim();
    if (!value || value.length > 100000 || value.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
    return value;
}

function fileKey(shopId: string, id: string) {
    return { shopId_id: { shopId, id } };
}

export async function storeGeneratedFile(tx: Prisma.TransactionClient, input: {
    shopId: string; uploaderId: string; purpose: GeneratedPurpose; resourceId: string; name: string; mimeType: 'text/csv' | 'application/json';
    bytes: Buffer; published: boolean;
}) {
    const { bytes, published, ...metadata } = input;
    if (bytes.length > maxBytes || !bytes.length || !/^[a-zA-Z0-9_.-]{1,100}$/.test(input.name)) throw new UnprocessableEntityException();
    const file = await tx.fileObject.create({ data: { ...metadata, status: published ? 'ready' : 'quarantined',
        sizeBytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    await tx.fileBlob.create({ data: { shopId: input.shopId, fileId: file.id, bytes: Uint8Array.from(bytes) } });
    return file;
}

export const reportSourcePermissions = {
    inventory: 'inventory.read', orders: 'orders.read', cashflow: 'finance.read', profit_loss: 'finance.read',
} as const;

async function generatedFileAccessible(tx: Prisma.TransactionClient, file: FileObject, scope: ShopScope) {
    if (!file.resourceId || file.status !== 'ready' || !file.expiresAt || file.expiresAt <= new Date() || file.uploaderId !== scope.userId ||
        !scope.permissions.includes(permissionByPurpose[file.purpose])) return false;
    const job = await tx.job.findUnique({ where: fileKey(file.shopId, file.resourceId) });
    if (!job || job.actorId !== scope.userId || job.status !== 'succeeded') return false;
    if (file.purpose === 'privacy_export') return job.sourceOperation === 'approvePrivacyRequest';
    const input = job.input as { reportType?: keyof typeof reportSourcePermissions };
    return job.sourceOperation === 'createExport' && Boolean(input.reportType && Object.hasOwn(reportSourcePermissions, input.reportType) &&
        scope.permissions.includes(reportSourcePermissions[input.reportType]));
}

export async function readyImportFile(tx: Prisma.TransactionClient, shopId: string, userId: string, fileId: string,
    allowedPurposes: FilePurpose[] = ['product_import']) {
    if (!validUuid(fileId)) throw new NotFoundException();
    const file = await tx.fileObject.findFirst({
        where: { shopId, id: fileId, uploaderId: userId, purpose: { in: allowedPurposes }, status: 'ready' },
        include: fileContents,
    });
    if (!file) throw new NotFoundException();
    const { mimeType, purpose, resourceId, sha256 } = file;
    return { mimeType, purpose, resourceId, sha256, bytes: await readReadyFileBytes(file) };
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

function pcmWave(bytes: Buffer) {
    if (bytes.length < 46 || bytes.toString('latin1', 0, 4) !== 'RIFF' || bytes.readUInt32LE(4) !== bytes.length - 8 ||
        bytes.toString('latin1', 8, 16) !== 'WAVEfmt ' || bytes.readUInt32LE(16) !== 16 || bytes.readUInt16LE(20) !== 1 ||
        bytes.toString('latin1', 36, 40) !== 'data' || bytes.readUInt32LE(40) !== bytes.length - 44) return false;
    const channels = bytes.readUInt16LE(22);
    const sampleRate = bytes.readUInt32LE(24);
    const frame = channels * 2;
    return (channels === 1 || channels === 2) && sampleRate >= 8000 && sampleRate <= 48000 && bytes.readUInt16LE(34) === 16 &&
        bytes.readUInt16LE(32) === frame && bytes.readUInt32LE(28) === sampleRate * frame && (bytes.length - 44) % frame === 0;
}

async function inspect(file: UploadPart, name: string, purpose: FilePurpose) {
    try {
        if (purpose === 'conversation_media' && file.mimetype === 'audio/wav') {
            return extname(name).toLowerCase() === '.wav' && pcmWave(file.buffer) ? { bytes: file.buffer, mimeType: file.mimetype } : null;
        }
        if (purpose === 'product_image' || purpose === 'conversation_media') {
            if (!Array.from(rasterMime.values()).includes(file.mimetype)) return null;
            const image = sharp(file.buffer, { limitInputPixels: 8_000_000, failOn: 'warning' });
            const { format, pages } = await image.metadata();
            if (!rasterMime.has(format) || rasterMime.get(format) !== file.mimetype || (pages ?? 1) !== 1) return null;
            const bytes = await image.toBuffer();
            if (bytes.length > maxBytes) return null;
            return { bytes, mimeType: file.mimetype };
        }
        const extension = extname(name).toLowerCase();
        if (purpose === 'knowledge_source' && extension === '.txt') {
            if (!['text/plain', 'application/octet-stream'].includes(file.mimetype) ||
                plainText.decode(file.buffer).includes(String.fromCharCode(0))) return null;
            return { bytes: file.buffer, mimeType: 'text/plain' };
        }
        if (purpose === 'knowledge_source' && extension === '.pdf') {
            if (!['application/pdf', 'application/octet-stream'].includes(file.mimetype) || file.buffer.subarray(0, 5).toString() !== '%PDF-') return null;
            await extractKnowledgeText(file.buffer, 'application/pdf');
            return { bytes: file.buffer, mimeType: 'application/pdf' };
        }
        const mimeType = extension === '.csv' ? csvType : extension === '.xlsx' ? xlsxType : null;
        if (!mimeType) return null;
        if (purpose !== 'product_import' && mimeType !== csvType) return null;
        const compatible = mimeType === csvType ? [csvType, 'text/plain', 'application/vnd.ms-excel'] : [xlsxType];
        if (!compatible.includes(file.mimetype) && file.mimetype !== 'application/octet-stream') return null;
        if (await scanFile(new URL('./spreadsheet-scan.js', import.meta.url), { bytes: file.buffer, mimeType }) !== true) return null;
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
    if (!match || !config || file.status !== 'ready' || Number(match[1]) <= Date.now() || (file.expiresAt && file.expiresAt <= new Date())) return false;
    return timingSafeEqual(Buffer.from(match[2], 'hex'), signedRead(config.signingKey, file, userId, Number(match[1])));
}

function fileView(file: FileObject, config: AuthConfig | undefined, userId: string) {
    const expires = Math.min(Date.now() + 5 * 60 * 1000, file.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY);
    const token = file.status === 'ready' && config ? expires + '.' + signedRead(config.signingKey, file, userId, expires).toString('hex') : null;
    return {
        id: file.id, shopId: file.shopId, name: file.name, mimeType: file.mimeType, sizeBytes: file.sizeBytes, status: file.status,
        ...(file.purpose === 'report_export' || file.purpose === 'privacy_export' ? {} : { purpose: file.purpose }), resourceId: file.resourceId,
        readUrl: token ? API_PREFIX + '/shops/' + file.shopId + '/uploads/' + file.id + '?content=' + token : null,
    };
}

export async function generatedFileUrl(tx: Prisma.TransactionClient, scope: ShopScope, fileId: string, config?: AuthConfig) {
    if (!validUuid(fileId)) return null;
    const file = await tx.fileObject.findUnique({ where: fileKey(scope.shopId, fileId) });
    if (!file || (file.purpose !== 'report_export' && file.purpose !== 'privacy_export') || !await generatedFileAccessible(tx, file, scope)) return null;
    return fileView(file, config, scope.userId).readUrl;
}

class FilesService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig, private readonly scanner?: UploadScanner) {}

    async upload(headers: IncomingHttpHeaders, shopId: string, fields: Record<string, unknown>, file: UploadPart | undefined, requestId: string) {
        const input = uploadInput.transform({ ...fields, ...(file ? { file: 'received' } : {}) }) as UploadInput;
        if (Object.hasOwn(fields, 'file') || !file?.buffer.length) throw new UnprocessableEntityException();
        const permission = permissionByPurpose[input.purpose];
        const sessionToken = requireSessionToken(headers);
        if (!this.config) throw new ServiceUnavailableException();
        requireMutationCsrf(this.config, headers, sessionToken);
        await readAsSession(this.db, headers, (tx, userId) => requireShopAccess(tx, userId, shopId, permission));
        requireIdempotencyKey(headers);
        if (input.resourceId && (!validUuid(input.resourceId) || ['product_import', 'knowledge_source'].includes(input.purpose))) {
            throw new UnprocessableEntityException();
        }
        if (input.purpose === 'conversation_media' && !input.resourceId) throw new UnprocessableEntityException();
        const name = file.originalname.replace(/[\x00-\x1f\x7f/\\]/g, '_').trim().slice(0, 255) || 'upload';
        const digest = createHash('sha256').update(file.buffer).digest('hex');
        const scan = this.scanner ? await this.scanner.scan(file.buffer)
            : usesLocalOidcFixture(this.config) ? 'fixture' : 'unavailable';
        const inspected = scan === 'clean' || scan === 'fixture' ? await inspect(file, name, input.purpose) : null;
        const { operationId } = fileCommand;
        return writeShopCommand(this.db, this.config, {
            headers, shopId, permission, operationId,
            payload: { purpose: input.purpose, resourceId: input.resourceId ?? null, name, mimeType: file.mimetype, digest },
        }, async (tx, scope, config) => {
            if (input.purpose === 'product_image' && input.resourceId && !await tx.product.findFirst({
                where: { shopId, id: input.resourceId, status: { not: 'archived' } }, select: { id: true },
            })) throw new UnprocessableEntityException();
            if (input.purpose === 'conversation_media') {
                const conversation = await tx.channelConversation.findUnique({ where: fileKey(shopId, input.resourceId!),
                    include: { channel: true } });
                if (!conversation) throw new NotFoundException();
                const limits = messengerFixtureEnabled(config) ? channelMediaPolicy(conversation.channel) : null;
                if (!limits || conversation.status !== 'open' || conversation.mode !== 'human' ||
                    (conversation.assignedUserId !== null && conversation.assignedUserId !== scope.userId) ||
                    file.buffer.length > limits.maxFileSizeBytes || !limits.allowedMimeTypes.includes(file.mimetype)) throw new UnprocessableEntityException();
            }
            // The ledger resolves existing intents before applying a new upload.
            if (scan === 'unavailable') throw new ServiceUnavailableException();
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
                metadata: { purpose: input.purpose, status: stored.status, sizeBytes: stored.sizeBytes, scan },
            });
            return { type: 'file', id: stored.id, scope: input.purpose };
        }, async (tx, scope, result) => {
            if (result.type !== 'file') throw new ConflictException();
            return fileView(await tx.fileObject.findUniqueOrThrow({ where: fileKey(shopId, result.id) }), this.config, scope.userId);
        });
    }

    async read(headers: IncomingHttpHeaders, shopId: string, fileId: string, content: string | undefined) {
        const access = await readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId);
            const file = await tx.fileObject.findUnique({ where: fileKey(shopId, fileId) });
            if (!file) throw new NotFoundException();
            const generated = file.purpose === 'report_export' || file.purpose === 'privacy_export';
            const permittedOwner = generated ? await generatedFileAccessible(tx, file, scope) :
                file.uploaderId === userId && scope.permissions.includes(permissionByPurpose[file.purpose]);
            const attachedImage = file.purpose === 'product_image' && scope.permissions.includes('catalog.read')
                && await tx.productImage.findFirst({ where: { shopId, fileId }, select: { fileId: true } });
            const attachedMessage = file.purpose === 'conversation_media' && file.resourceId && scope.permissions.includes('conversations.read')
                && await tx.channelAttachment.findFirst({ where: { shopId, fileId, message: { conversationId: file.resourceId } },
                    select: { fileId: true } });
            const attachedKnowledge = file.purpose === 'knowledge_source' && scope.permissions.includes('knowledge.read')
                && await tx.knowledgeRevision.findFirst({ where: { shopId, fileId }, select: { id: true } });
            if (!permittedOwner && !attachedImage && !attachedMessage && !attachedKnowledge) throw new NotFoundException();
            const view = fileView(file, this.config, userId);
            if (content === undefined) return { view };
            if (!canReadReady(file, this.config, userId, content)) throw new NotFoundException();
            const source = await tx.fileObject.findUniqueOrThrow({ where: fileKey(shopId, fileId), include: fileContents });
            return { view, source };
        });
        return { view: access.view, bytes: access.source ? await readReadyFileBytes(access.source) : undefined };
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

export function filesModule(db?: PrismaClient, config?: AuthConfig, scanner?: UploadScanner): DynamicModule {
    return {
        module: FilesModule, controllers: [FilesController],
        providers: [{ provide: FilesService, useFactory: () => new FilesService(db, config, scanner) }],
    };
}
