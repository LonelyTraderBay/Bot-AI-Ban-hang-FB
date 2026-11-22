import { Body, ConflictException, Controller, Get, HttpCode, Param, Post, Query, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Prisma, PrismaClient, StatementKind } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging } from '../../http/query.js';
import { envelope, noStore } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { scheduleJob, type JobHandler } from '../../platform/jobs/index.js';
import { jobDetails, jobDto } from '../../platform/jobs/view.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig } from '../workspace/index.js';
import { financeKey, financeShop, localAccountingDate } from './journal.js';
import { readStatementRows, statementFile, statementFormats, statementOptions, type StatementInput } from './statement-data.js';

const statementBody = new SchemaPipe(validator.compile(schemaFromContract('StatementImport')));
const previewLifetimeMs = 15 * 60 * 1000;
const permission = 'finance.reconcile';
const imports = { bank: 'importBankStatement', cod: 'importCODStatement' } as const;
export const statementCommands = [
    { operationId: 'previewStatementImport', resourceType: 'file' },
    ...Object.values(imports).map(operationId => ({ operationId, resourceType: 'job' })),
];
const displayIds: Record<StatementKind, string> = {
    bank: '08c2d14b-cf50-42fa-b65f-aedcf660476b', cod: '025fe862-56c7-4a6a-8ca0-dee309fefea2',
};

type RowError = { row: number; field: string; code: string; message: string };
type JobInput = StatementInput & { digest: string; selectedRows: number[]; rowErrors: RowError[] };
type BoundInput = { shopId: string; actorId: string; input: StatementInput; kind: StatementKind; digest: string; rows: readonly number[] };

function signature(key: Buffer, value: BoundInput, expires: number) {
    const { shopId, actorId, input, kind, digest, rows } = value;
    return createHmac('sha256', key).update(JSON.stringify([
        'statement_import', shopId, actorId, input.fileId, input.accountOrCarrierId, input.formatId, input.sourceBatchId, kind, digest, rows, expires,
    ])).digest();
}

function verifyToken(key: Buffer, value: BoundInput, token: string | undefined) {
    const match = /^(\d{13})\.([a-f0-9]{64})$/.exec(token ?? '');
    if (!match || Number(match[1]) <= Date.now() || !value.rows.length ||
        !timingSafeEqual(signature(key, value, Number(match[1])), Buffer.from(match[2], 'hex'))) throw new ConflictException();
}

const rejected = (row: { row: number; errors: string[] }): RowError => ({
    row: row.row, field: 'statement', code: 'INVALID_STATEMENT_ROW', message: row.errors.join(' ').slice(0, 500),
});

export class FinanceStatements {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    formats(headers: IncomingHttpHeaders, shopId: string, query: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, actorId) => {
            const scope = await requireShopAccess(tx, actorId, shopId, permission);
            const page = paging(listQuery(query, 'page'), ['statement_formats', shopId, actorId, String(scope.permissionVersion)]);
            const staticRows = statementFormats.map(format => ({ format, id: displayIds[format.kind], createdAt: new Date(0) }))
                .sort((left, right) => right.id.localeCompare(left.id));
            const result = page.result(staticRows.filter(row => !page.position || row.id < page.position.id));
            const data = [];
            for (const { format, id } of result.data) {
                data.push({ ...format, id, resourceOptions: await statementOptions(tx, shopId, format.kind) });
            }
            return { ...result, data };
        });
    }

    preview(headers: IncomingHttpHeaders, shopId: string, input: StatementInput, requestId: string) {
        const operationId = 'previewStatementImport';
        return writeShopCommand(this.db, this.config, { headers, shopId, operationId, permission, payload: input },
            async (tx, scope) => {
                await recordAudit(tx, { shopId, actorId: scope.userId, action: operationId, requestId, resourceType: 'file', resourceId: input.fileId });
                return { type: 'file', id: input.fileId };
            }, async (tx, scope, result, command) => {
                if (result.type !== 'file' || result.id !== input.fileId || !this.config) throw new ConflictException();
                const source = await statementFile(tx, shopId, scope.userId, input);
                const { rows } = await readStatementRows(tx, shopId, input, source);
                const accepted = rows.filter(row => row.parsed).map(row => row.row);
                const expires = command.createdAt.getTime() + previewLifetimeMs;
                const bound = { shopId, actorId: scope.userId, input, kind: source.kind, digest: source.file.sha256, rows: accepted };
                const { fileId, accountOrCarrierId, sourceBatchId, formatId } = input;
                return { fileId, accountOrCarrierId, sourceBatchId, formatId, kind: source.kind,
                    rows: rows.map(({ parsed: _parsed, ...row }) => row), validRows: accepted.length, invalidRows: rows.length - accepted.length,
                    validationToken: expires + '.' + signature(this.config.signingKey, bound, expires).toString('hex'),
                    expiresAt: new Date(expires).toISOString() };
            });
    }

    queue(headers: IncomingHttpHeaders, shopId: string, input: StatementInput, kind: StatementKind, requestId: string) {
        const operationId = imports[kind];
        return writeShopCommand(this.db, this.config, { headers, shopId, operationId, permission, payload: input, deferred: true },
            async (tx, scope, config, command) => {
                const source = await statementFile(tx, shopId, scope.userId, input, kind);
                const { rows } = await readStatementRows(tx, shopId, input, source);
                const selectedRows = rows.filter(row => row.parsed).map(row => row.row);
                const digest = source.file.sha256;
                verifyToken(config.signingKey, { shopId, actorId: scope.userId, input, kind, digest, rows: selectedRows }, input.validationToken);
                const { fileId, accountOrCarrierId, sourceBatchId, formatId } = input;
                const batchKey = { shopId, kind, accountOrCarrierId, sourceBatchId };
                if (await tx.statementBatch.findUnique({ where: { shopId_kind_accountOrCarrierId_sourceBatchId: batchKey }, select: { id: true } })) {
                    throw new ConflictException();
                }
                const job = await scheduleJob(tx, { shopId, actorId: scope.userId, sourceOperation: operationId, kind: 'import', commandId: command.id,
                    input: { fileId, accountOrCarrierId, sourceBatchId, formatId, digest, selectedRows, rowErrors: rows.filter(row => !row.parsed).map(rejected) },
                });
                const batch = await tx.statementBatch.create({ data: { ...batchKey, fileId, jobId: job.id, formatId } });
                await recordAudit(tx, { shopId, actorId: scope.userId, action: operationId, requestId, resourceType: 'job', resourceId: job.id,
                    metadata: { batchId: batch.id, validRows: selectedRows.length } });
                return { type: 'job', id: job.id };
            }, async (tx, _scope, result) => {
                if (result.type !== 'job') throw new ConflictException();
                return jobDto(await tx.job.findUniqueOrThrow({ where: financeKey(shopId, result.id), include: jobDetails }));
            });
    }
}

export async function observedBankReceipt(tx: Prisma.TransactionClient, row: { shopId: string; accountId: string; externalTransactionId: string;
    occurredAt: Date; currency: string; amount: Prisma.Decimal; direction: 'credit' | 'debit' }) {
    if (row.direction !== 'credit') return {};
    const evidence = await tx.paymentEvidence.findUnique({
        where: { shopId_kind_reference: { shopId: row.shopId, kind: 'bank_receipt', reference: row.externalTransactionId } },
        include: { entry: { include: { journal: { include: {
            lines: { where: { accountId: row.accountId, debit: { gt: 0 } }, select: { debit: true } },
        } } } } },
    });
    const journal = evidence?.entry?.journal;
    if (!evidence || evidence.entry?.status !== 'posted' || !journal?.lines.length) return {};
    const { timezone } = await financeShop(tx, row.shopId);
    const exact = evidence.currency === row.currency && evidence.amount.eq(row.amount) && journal.status === 'posted' &&
        journal.lines.some(line => line.debit.eq(row.amount)) && localAccountingDate(row.occurredAt, timezone) === journal.effectiveDate.toISOString().slice(0, 10);
    return { existing: evidence, exact };
}

const statementHandler = (kind: StatementKind): JobHandler => async job => async tx => {
    const input = job.input as JobInput;
    const batch = await tx.statementBatch.findUniqueOrThrow({ where: { shopId_jobId: { shopId: job.shopId, jobId: job.id } } });
    if (batch.kind !== kind || batch.fileId !== input.fileId || batch.accountOrCarrierId !== input.accountOrCarrierId ||
        batch.formatId !== input.formatId || batch.sourceBatchId !== input.sourceBatchId) throw new Error('Statement batch mismatch');
    const rowErrors = [...input.rowErrors];
    const total = input.selectedRows.length + rowErrors.length;
    let validated;
    try {
        const source = await statementFile(tx, job.shopId, job.actorId, input, kind);
        if (source.file.sha256 !== input.digest) throw new UnprocessableEntityException();
        validated = await readStatementRows(tx, job.shopId, input, source, input.selectedRows);
    } catch (error) {
        if (!(error instanceof UnprocessableEntityException)) throw error;
        rowErrors.push({ row: 1, field: 'file', code: 'STATEMENT_SOURCE_CHANGED', message: 'Nguồn sao kê đổi sau khi xem trước.' });
        return { status: 'failed', completed: 0, total, errorCount: rowErrors.length, rowErrors };
    }
    let completed = 0;
    for (const current of validated.rows) {
        const row = current.parsed;
        if (!row) {
            rowErrors.push(rejected(current));
            continue;
        }
        if (row.kind === 'bank') {
            const { externalTransactionId, amount, direction, occurredAt, referenceText } = row;
            const data = { shopId: job.shopId, currency: validated.currency, batchId: batch.id,
                accountId: batch.accountOrCarrierId, externalTransactionId, amount, direction, occurredAt, referenceText };
            const observed = await observedBankReceipt(tx, data);
            const transaction = await tx.bankTransaction.create({ data: { ...data,
                paymentEvidenceId: observed.exact ? observed.existing?.id : undefined } });
            const state = observed.exact ? 'matched' : observed.existing ? 'disputed' : 'unmatched';
            const review = await tx.reconciliationCase.create({ data: { shopId: job.shopId, transactionId: transaction.id, state,
                difference: observed.exact ? 0 : row.amount,
                reason: observed.existing ? (observed.exact ? 'Đã có phiếu ngân hàng cùng chứng từ.' : 'Chứng từ cùng mã có chênh lệch.') : null } });
            await enqueueResourceUpdate(tx, 'reconciliation.updated', review);
        } else {
            await tx.codSettlement.create({ data: { shopId: job.shopId, currency: validated.currency, batchId: batch.id,
                carrierId: batch.accountOrCarrierId, externalBatchId: row.externalBatchId, grossDue: row.grossDue,
                orders: { create: row.orderIds.map(orderId => ({ orderId })) },
            } });
        }
        completed++;
    }
    return { status: completed === 0 ? 'failed' : rowErrors.length ? 'partial' : 'succeeded', completed, total,
        errorCount: rowErrors.length, rowErrors, result: { type: 'statement_batch', id: batch.id } };
};

export function financeJobHandlers(): ReadonlyMap<string, JobHandler> {
    return new Map([[imports.bank, statementHandler('bank')], [imports.cod, statementHandler('cod')]]);
}

@Controller('shops/:shopId')
export class StatementsController {
    constructor(private readonly statements: FinanceStatements) {}

    @Get('finance/statement-formats')
    @ContractOperation('listStatementFormats')
    async formats(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.statements.formats(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Post('finance/statement-import-preview')
    @HttpCode(200)
    @ContractOperation('previewStatementImport')
    async preview(@Param('shopId', idPipe) shopId: string, @Body(statementBody) input: StatementInput,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.statements.preview(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post('bank-transactions/import')
    @HttpCode(200)
    @ContractOperation('importBankStatement')
    async bank(@Param('shopId', idPipe) shopId: string, @Body(statementBody) input: StatementInput,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.statements.queue(request.headers, shopId, input, 'bank', String(response.getHeader('X-Request-Id'))));
    }

    @Post('cod-settlements/import')
    @HttpCode(200)
    @ContractOperation('importCODStatement')
    async cod(@Param('shopId', idPipe) shopId: string, @Body(statementBody) input: StatementInput,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.statements.queue(request.headers, shopId, input, 'cod', String(response.getHeader('X-Request-Id'))));
    }
}
