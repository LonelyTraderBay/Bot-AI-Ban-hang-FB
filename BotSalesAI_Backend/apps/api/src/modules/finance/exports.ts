import { Body, Controller, ForbiddenException, HttpCode, Param, Post, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe } from '../../http/query.js';
import { envelope, noStore } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { scheduleJob, type JobHandler } from '../../platform/jobs/index.js';
import { reportSourcePermissions } from '../../platform/jobs/sources.js';
import { jobDetails, jobDto } from '../../platform/jobs/view.js';
import { storeGeneratedFile } from '../files/index.js';
import { requireShopAccess, writeShopCommand, type AuthConfig } from '../workspace/index.js';
import { financeShop } from './journal.js';
import { reportExportSnapshotNotice, reportWindow } from './report-data.js';
import { cashflowProjection, profitLossProjection } from './reports.js';

type ReportType = keyof typeof reportSourcePermissions;
type SnapshotRequest = { reportType: ReportType; format: 'csv'; from: string; to: string; timezone: string; snapshotAsOf: string };
type Cells = Array<string | number>;
type Rows = { headers: string[]; rows: Cells[] };
const input = new SchemaPipe(validator.compile(schemaFromContract('ExportRequest')));
export const reportExportCommand = { operationId: 'createExport', resourceType: 'job' };
const maxRows = 5000;

function escapeCell(value: string | number) {
    const original = String(value);
    const danger = /^[\s\uFEFF]*[=+\-@]/u.test(original) && !/^-?\d+(?:\.\d+)?$/.test(original);
    const text = danger ? "'" + original : original;
    return '"' + text.replaceAll('"', '""') + '"';
}

function csvSnapshot(output: Rows, capturedAt: string, requestedAt: string, window: SnapshotRequest) {
    const columns = [...output.headers, 'snapshot_captured_at', 'source_view_as_of', 'from', 'to', 'timezone'];
    const scope: Cells = [capturedAt, requestedAt, window.from, window.to, window.timezone];
    const rows = output.rows.length ? output.rows : [output.headers.map(() => '')];
    return Buffer.from('\uFEFF' + [columns, ...rows.map(row => [...row, ...scope])].map(row => row.map(escapeCell).join(',')).join('\r\n'), 'utf8');
}

async function collectRows(tx: Prisma.TransactionClient, shopId: string, request: SnapshotRequest): Promise<Rows> {
    const { reportType, from, to, timezone } = request;
    if (reportType === 'inventory') {
        const positions = await tx.stockPosition.findMany({ where: { shopId, warehouse: { status: 'active' }, variant: {
            archivedAt: null, active: true, product: { status: 'active' },
        } }, include: { variant: { select: { sku: true, name: true } }, warehouse: { select: { code: true } } },
        orderBy: [{ warehouseId: 'asc' }, { variantId: 'asc' }], take: maxRows + 1 });
        return { headers: ['variant_id', 'sku', 'name', 'warehouse_id', 'warehouse_code', 'on_hand', 'reserved', 'available', 'quarantine', 'transit', 'inbound'],
            rows: positions.map(row => [row.variantId, row.variant.sku, row.variant.name, row.warehouseId, row.warehouse.code,
                row.onHand, row.reserved, row.onHand - row.reserved, row.quarantine, row.transit, row.inbound]) };
    }
    if (reportType === 'orders') {
        const orders = await tx.salesOrder.findMany({
            where: { shopId, createdAt: { gte: new Date(from), lt: new Date(to) } },
            select: { id: true, version: true, createdAt: true, orderState: true, fulfillmentState: true, paymentState: true, total: true, currency: true },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: maxRows + 1,
        });
        return { headers: ['order_id', 'version', 'created_at', 'order_state', 'fulfillment_state', 'payment_state', 'total', 'currency'],
            rows: orders.map(row => [row.id, row.version, row.createdAt.toISOString(), row.orderState, row.fulfillmentState, row.paymentState,
                row.total.toFixed(), row.currency]) };
    }
    const projection = reportType === 'cashflow' ? await cashflowProjection(tx, shopId, { from, to, timezone })
        : await profitLossProjection(tx, shopId, { from, to, timezone });
    const rows: Cells[] = [];
    for (const [metric, amount] of Object.entries(projection)) {
        if (amount && typeof amount === 'object' && 'amount' in amount && typeof amount.amount === 'string' && 'currency' in amount &&
            typeof amount.currency === 'string') rows.push([metric, amount.amount, amount.currency]);
    }
    return { headers: ['metric', 'amount', 'currency'], rows };
}

export class ReportExports {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    create(headers: IncomingHttpHeaders, shopId: string, request: SnapshotRequest, requestId: string) {
        const { operationId, resourceType } = reportExportCommand;
        const sourcePermission = reportSourcePermissions[request.reportType];
        return writeShopCommand(this.db, this.config, { headers, shopId, permission: 'reports.export', operationId, payload: request, deferred: true },
            async (tx, scope, _config, command) => {
                if (!scope.permissions.includes(sourcePermission)) throw new ForbiddenException();
                const { timezone } = await financeShop(tx, shopId);
                reportWindow(request, timezone);
                const capturedAt = new Date().toISOString();
                if (request.timezone !== timezone || new Date(request.snapshotAsOf).getTime() > Date.parse(capturedAt) + 30000) throw new UnprocessableEntityException();
                const output = await collectRows(tx, shopId, request);
                if (output.rows.length > maxRows) throw new UnprocessableEntityException('Báo cáo vượt số dòng cho một tệp. Chọn phạm vi nhỏ hơn.');
                const job = await scheduleJob(tx, { shopId, actorId: scope.userId, commandId: command.id, sourceOperation: operationId,
                    kind: 'export', input: { ...request, capturedAt } });
                const file = await storeGeneratedFile(tx, { shopId, uploaderId: scope.userId, resourceId: job.id, purpose: 'report_export',
                    name: request.reportType + '.csv', mimeType: 'text/csv', published: false, bytes: csvSnapshot(output, capturedAt, request.snapshotAsOf, request) });
                await tx.job.update({ where: { shopId_id: { shopId, id: job.id } },
                    data: { input: { ...request, capturedAt, snapshotFileId: file.id, rowCount: output.rows.length } } });
                await recordAudit(tx, { shopId, actorId: scope.userId, requestId, action: operationId, resourceType, resourceId: job.id,
                    metadata: { reportType: request.reportType, capturedAt, rowCount: output.rows.length } });
                return { type: resourceType, id: job.id };
            }, async (tx, scope, result) => {
                if (!scope.permissions.includes(sourcePermission)) throw new ForbiddenException();
                const job = await tx.job.findUniqueOrThrow({ where: { shopId_id: { shopId, id: result.id } }, include: jobDetails });
                const snapshot = job.input as SnapshotRequest & { capturedAt: string };
                return { job: jobDto(job), reportSnapshot: { capturedAt: snapshot.capturedAt, requestedAsOf: snapshot.snapshotAsOf } };
            });
    }
}

export const reportExportHandler: JobHandler = async job => async tx => {
    const source = job.input as SnapshotRequest & { snapshotFileId: string; rowCount: number };
    const scope = await requireShopAccess(tx, job.actorId, job.shopId, 'reports.export');
    const allowed = scope.permissions.includes(reportSourcePermissions[source.reportType]);
    const updated = await tx.fileObject.updateMany({
        where: { shopId: job.shopId, uploaderId: job.actorId, id: source.snapshotFileId, resourceId: job.id, purpose: 'report_export',
            status: 'quarantined', expiresAt: { gt: new Date() }, blob: { isNot: null } },
        data: { status: allowed ? 'ready' : 'rejected' },
    });
    if (!allowed || updated.count !== 1) return { status: 'failed', completed: 0, total: source.rowCount, errorCount: 1,
        rowErrors: [{ row: 1, field: 'report', code: 'EXPORT_SCOPE_CHANGED', message: 'Phạm vi đọc hoặc dữ liệu xuất đã hết hiệu lực.' }] };
    return { status: 'succeeded', completed: source.rowCount, total: source.rowCount, errorCount: 0, result: { type: 'file', id: source.snapshotFileId } };
};

@Controller('shops/:shopId/exports')
export class ReportExportsController {
    constructor(private readonly reports: ReportExports) {}

    @Post()
    @HttpCode(202)
    @ContractOperation('createExport')
    async create(@Param('shopId', idPipe) shopId: string, @Body(input) body: SnapshotRequest,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { job, reportSnapshot } = await this.reports.create(request.headers, shopId, body, String(response.getHeader('X-Request-Id')));
        const result = envelope(response, job);
        return { ...result, meta: { ...result.meta, reportSnapshot, warnings: [reportExportSnapshotNotice] } };
    }
}
