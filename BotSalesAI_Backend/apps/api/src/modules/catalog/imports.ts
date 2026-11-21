import { Body, ConflictException, Controller, HttpCode, NotFoundException, Param, Post, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Job, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe } from '../../http/query.js';
import { envelope, noStore } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { scheduleJob, type JobHandler } from '../../platform/jobs/index.js';
import { jobDetails, jobDto } from '../../platform/jobs/view.js';
import { enqueueJobUpdate } from '../../platform/outbox/index.js';
import { readyImportFile, readSpreadsheet } from '../files/index.js';
import { writeShopCommand, type AuthConfig } from '../workspace/index.js';
import { advanceCatalog, productInShop, productWriteFromView, skuKey, writeProduct, type ProductWrite } from './catalog-service.js';

const previewOperation = 'createProductImport';
const commitOperation = 'commitProductImport';
const importPermission = 'catalog.import';
const tokenLifetimeMs = 30 * 60 * 1000;
const importInput = new SchemaPipe(validator.compile(schemaFromContract('ImportRequest')));
const commitInput = new SchemaPipe(validator.compile(schemaFromContract('ImportCommit')));
const parseProduct = validator.compile(schemaFromContract('ProductWrite'));

type ImportField = 'sku' | 'name' | 'description' | 'category' | 'price' | 'currency' | 'variantName';
type PreviewInput = {
    fileId: string;
    mapping: { sourceColumn: string; targetField: ImportField }[];
    duplicateStrategy: 'reject' | 'update_existing';
    dryRun: true;
};
type ConfirmInput = { validationToken: string; confirmValidRowsOnly: true };
type RowError = { row: number; field: string; code: string; message: string };
type ImportRow = {
    sku: string; name: string; amount: string;
    description?: string; categoryId?: string | null; variantName?: string; productId?: string; variantId?: string;
};

function rowError(row: number, field: string, code: string, message: string): RowError {
    return { row, field, code, message };
}

function failed(error: RowError) {
    return { status: 'failed' as const, completed: 0, total: null, errorCount: 1, rowErrors: [error] };
}

function checkMapping(input: PreviewInput) {
    const source = input.mapping.map(column => column.sourceColumn.trim());
    const targets = new Set(input.mapping.map(column => column.targetField));
    if (input.mapping.length > 7 || source.some(name => !name || name.length > 160) ||
        new Set(source).size !== source.length || targets.size !== source.length ||
        !targets.has('sku') || !targets.has('name') || !targets.has('price')) throw new UnprocessableEntityException();
}

function productForRow(row: ImportRow, currency: string): ProductWrite {
    return {
        name: row.name, description: row.description ?? '', categoryId: row.categoryId ?? null, status: 'draft', imageFileIds: [],
        variants: [{ sku: row.sku, name: row.variantName || row.name, options: {}, active: true, price: { amount: row.amount, currency } }],
    };
}

async function inspectRows(tx: Prisma.TransactionClient, job: Job, input: PreviewInput, sheet: string[][]) {
    const headers = sheet[0].map(header => header.trim());
    const columns = new Map(input.mapping.map(column => [column.targetField, headers.indexOf(column.sourceColumn.trim())]));
    if (new Set(headers).size !== headers.length || headers.some(header => !header) || [...columns.values()].includes(-1) || sheet.length === 1) {
        return failed(rowError(1, 'mapping', 'INVALID_HEADER', 'Cột trong tệp cần duy nhất, đủ ánh xạ và có ít nhất một dòng dữ liệu.'));
    }
    const keys = sheet.slice(1).map(cells => skuKey(cells[columns.get('sku') ?? -1] ?? ''));
    const { currency, catalogVersion } = await tx.shop.findUniqueOrThrow({
        where: { id: job.shopId }, select: { currency: true, catalogVersion: true },
    });
    const existing = new Map((await tx.variant.findMany({
        where: { shopId: job.shopId, skuKey: { in: keys } },
        select: { id: true, skuKey: true, productId: true, archivedAt: true, product: { select: { status: true } } },
    })).map(variant => [variant.skuKey, variant]));
    const categories = new Map<string, string | null>();
    if (columns.has('category')) {
        const categoryNames = [...new Set(sheet.slice(1).map(cells => cells[columns.get('category') ?? -1]?.trim() ?? '').filter(Boolean))];
        const found = await tx.category.findMany({
            where: { shopId: job.shopId, active: true, name: { in: categoryNames } }, select: { id: true, name: true },
        });
        for (const category of found) categories.set(category.name, categories.has(category.name) ? null : category.id);
    }
    const accepted = new Set<string>();
    const rows: ImportRow[] = [];
    const errors: RowError[] = [];
    for (const [index, cells] of sheet.slice(1).entries()) {
        const number = index + 2;
        const field = (name: ImportField) => cells[columns.get(name) ?? -1]?.trim();
        const sku = field('sku') ?? '';
        const name = field('name') ?? '';
        const amount = field('price') ?? '';
        const description = field('description');
        const variantName = field('variantName') || undefined;
        const category = field('category');
        const categoryId = category ? categories.get(category) : category === '' ? null : undefined;
        const key = keys[index];
        const variant = existing.get(key);
        const draft = productForRow({ sku, name, amount, description, variantName, categoryId }, currency);
        if (cells.length !== headers.length || cells.some(value => value.includes(String.fromCharCode(0)))) {
            errors.push(rowError(number, 'row', 'INVALID_ROW', 'Số cột hoặc dữ liệu của dòng không hợp lệ.'));
        } else if ((field('currency') && field('currency') !== currency) || !/[1-9]/.test(amount) || !parseProduct(draft)) {
            errors.push(rowError(number, 'product', 'INVALID_PRODUCT', 'Kiểm tra SKU, tên, giá dương và mã tiền tệ của cửa hàng.'));
        } else if (category && !categoryId) {
            errors.push(rowError(number, 'category', 'INVALID_CATEGORY', 'Danh mục không có hiệu lực hoặc tên danh mục chưa duy nhất.'));
        } else if (accepted.has(key) || (variant && (input.duplicateStrategy === 'reject' || variant.archivedAt || variant.product.status === 'archived'))) {
            errors.push(rowError(number, 'sku', 'DUPLICATE_SKU', 'SKU đã xuất hiện hoặc không thể cập nhật.'));
        } else {
            accepted.add(key);
            rows.push({
                sku, name, amount,
                ...(description !== undefined ? { description } : {}), ...(categoryId !== undefined ? { categoryId } : {}),
                ...(variantName ? { variantName } : {}), ...(variant ? { productId: variant.productId, variantId: variant.id } : {}),
            });
        }
    }
    const summary = { total: sheet.length - 1, completed: sheet.length - 1, errorCount: errors.length, rowErrors: errors };
    if (rows.length === 0) return { status: 'failed' as const, ...summary };
    await tx.productImportPreview.create({
        data: {
            shopId: job.shopId, jobId: job.id, token: randomBytes(32).toString('hex'),
            expiresAt: new Date(Date.now() + tokenLifetimeMs), catalogVersion, rows,
        },
    });
    return { status: 'awaiting_confirmation' as const, ...summary };
}

function jobAsResult(tx: Prisma.TransactionClient, shopId: string, id: string) {
    return tx.job.findUniqueOrThrow({ where: { shopId_id: { shopId, id } }, include: jobDetails }).then(jobDto);
}

class ImportsService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    preview(headers: IncomingHttpHeaders, shopId: string, input: PreviewInput, requestId: string) {
        checkMapping(input);
        return writeShopCommand(this.db, this.config, {
            headers, shopId, permission: importPermission, operationId: previewOperation, payload: input, deferred: true,
        }, async (tx, scope, _config, command) => {
            await readyImportFile(tx, shopId, scope.userId, input.fileId);
            const job = await scheduleJob(tx, {
                shopId, actorId: scope.userId, commandId: command.id, kind: 'import', sourceOperation: previewOperation, input,
            });
            await recordAudit(tx, {
                shopId, actorId: scope.userId, action: previewOperation, requestId, resourceType: 'job', resourceId: job.id,
            });
            return { type: 'job', id: job.id };
        }, (tx, _scope, result) => jobAsResult(tx, shopId, result.id));
    }

    commit(headers: IncomingHttpHeaders, shopId: string, jobId: string, input: ConfirmInput, requestId: string) {
        return writeShopCommand(this.db, this.config, {
            headers, shopId, permission: importPermission, operationId: commitOperation, payload: { jobId, ...input }, deferred: true,
        }, async (tx, scope, _config, command) => {
            const where = { shopId_jobId: { shopId, jobId } };
            const preview = await tx.productImportPreview.findUnique({ where, include: {
                job: { select: { actorId: true, status: true } },
            } });
            if (!preview || preview.job.actorId !== scope.userId) throw new NotFoundException();
            if (preview.commitJobId || preview.job.status !== 'awaiting_confirmation' || preview.expiresAt <= new Date() ||
                !/^[a-f0-9]{64}$/.test(input.validationToken) ||
                !timingSafeEqual(Buffer.from(input.validationToken, 'hex'), Buffer.from(preview.token, 'hex'))) {
                throw new ConflictException();
            }
            const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { catalogVersion: true } });
            if (shop.catalogVersion !== preview.catalogVersion) throw new ConflictException();
            const commitJob = await scheduleJob(tx, {
                shopId, actorId: scope.userId, commandId: command.id, kind: 'import', sourceOperation: commitOperation,
                input: { jobId, requestId },
            });
            await tx.productImportPreview.update({ where, data: { commitJobId: commitJob.id } });
            await enqueueJobUpdate(tx, { shopId, id: jobId });
            return { type: 'job', id: commitJob.id };
        }, (tx, _scope, result) => jobAsResult(tx, shopId, result.id));
    }
}

@Controller('shops/:shopId/imports')
export class ImportsController {
    constructor(private readonly imports: ImportsService) {}

    @Post()
    @HttpCode(202)
    @ContractOperation(previewOperation)
    async preview(@Param('shopId', idPipe) shopId: string, @Body(importInput) input: PreviewInput,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.imports.preview(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post(':jobId/commit')
    @HttpCode(202)
    @ContractOperation(commitOperation)
    async confirm(@Param('shopId', idPipe) shopId: string, @Param('jobId', idPipe) jobId: string, @Body(commitInput) input: ConfirmInput,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.imports.commit(request.headers, shopId, jobId, input, String(response.getHeader('X-Request-Id'))));
    }
}

export { ImportsService };

function previewHandler(db: PrismaClient): JobHandler {
    return async job => {
        const input = job.input as PreviewInput;
        const file = await db.$transaction(tx => readyImportFile(tx, job.shopId, job.actorId, input.fileId));
        let sheet: string[][];
        try {
            sheet = await readSpreadsheet(file.bytes, file.mimeType);
        } catch {
            return failed(rowError(1, 'file', 'INVALID_FILE', 'Không đọc được tệp nhập.'));
        }
        return tx => inspectRows(tx, job, input, sheet);
    };
}

const commitHandler: JobHandler = async job => async tx => {
    const { jobId, requestId } = job.input as { jobId: string; requestId: string };
    const preview = await tx.productImportPreview.findUniqueOrThrow({
        where: { shopId_jobId: { shopId: job.shopId, jobId } },
        include: { job: { select: { total: true, errorCount: true, actorId: true } } },
    });
    if (preview.commitJobId !== job.id || preview.job.actorId !== job.actorId) throw new Error('Import job reference mismatch');
    const { catalogVersion, currency } = await tx.shop.findUniqueOrThrow({
        where: { id: job.shopId }, select: { catalogVersion: true, currency: true },
    });
    if (catalogVersion !== preview.catalogVersion) {
        return failed(rowError(1, 'catalog', 'CATALOG_CHANGED', 'Danh mục đã thay đổi. Kiểm tra lại tệp trước khi xác nhận.'));
    }
    const rows = preview.rows as ImportRow[];
    const scope = { shopId: job.shopId, userId: job.actorId };
    for (const row of rows) {
        const desired = productForRow(row, currency);
        if (row.productId) {
            const current = await productInShop(tx, job.shopId, row.productId);
            const updated = productWriteFromView(current);
            updated.name = desired.name;
            if (row.description !== undefined) updated.description = row.description;
            if (row.categoryId !== undefined) updated.categoryId = row.categoryId;
            const variant = updated.variants.find(entry => entry.id === row.variantId);
            if (!variant) throw new Error('Import variant reference mismatch');
            variant.price = desired.variants[0].price;
            if (row.variantName) variant.name = row.variantName;
            await writeProduct(tx, scope, updated, current);
        } else {
            await writeProduct(tx, scope, desired);
        }
    }
    await advanceCatalog(tx, job.shopId);
    await recordAudit(tx, {
        shopId: job.shopId, actorId: job.actorId, action: commitOperation, requestId, resourceType: 'job', resourceId: jobId,
        metadata: { importedRows: rows.length, skippedRows: preview.job.errorCount },
    });
    return {
        status: preview.job.errorCount ? 'partial' : 'succeeded', completed: rows.length, total: preview.job.total, errorCount: 0,
        result: { type: 'job', id: jobId },
    };
};

export function catalogJobHandlers(db: PrismaClient): ReadonlyMap<string, JobHandler> {
    return new Map([[previewOperation, previewHandler(db)], [commitOperation, commitHandler]]);
}
