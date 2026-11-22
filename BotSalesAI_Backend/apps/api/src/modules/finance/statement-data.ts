import { UnprocessableEntityException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import type { Prisma, StatementKind } from '../../generated/prisma/client.js';
import { contractDirectory, validator } from '../../http/contract-source.js';
import { schemaFromContract } from '../../http/contracts.js';
import { validUuid } from '../../http/query.js';
import { readyImportFile, readSpreadsheet } from '../files/index.js';
import { findDebts, manualCarrierId } from './debts.js';
import { cleanFinanceText, financeShop, parseMoney } from './journal.js';
import { sumAmounts } from './report-data.js';

export type StatementInput = { fileId: string; accountOrCarrierId: string; sourceBatchId: string; formatId: string; validationToken?: string };
export type StatementFormat = {
    id: string; formatId: string; kind: StatementKind; name: string; maxRows: number; maxBytes: number; requiredColumns: string[]; exampleCsv: string;
};
type BankRow = { kind: 'bank'; externalTransactionId: string; amount: Prisma.Decimal; direction: 'credit' | 'debit'; occurredAt: Date; referenceText: string };
type CodRow = { kind: 'cod'; externalBatchId: string; orderIds: string[]; grossDue: Prisma.Decimal };
type PreviewRow = { row: number; values: Record<string, string>; errors: string[]; parsed?: BankRow | CodRow };

export const statementFormats = (JSON.parse(readFileSync(new URL('../fixtures/statement-formats.json', contractDirectory), 'utf8')) as {
    formats: StatementFormat[];
}).formats;
const isDateTime = validator.compile(schemaFromContract('DateTime'));
const statementPurposes = ['bank_statement', 'cod_statement'] as const;

export async function statementOptions(tx: Prisma.TransactionClient, shopId: string, kind: StatementKind) {
    if (kind === 'bank') {
        const accounts = await tx.financeAccount.findMany({ where: { shopId, status: 'active', systemKey: 'bank' },
            select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } });
        return accounts.map(({ id, code, name }) => ({ id, label: Array.from(code + ' · ' + name).slice(0, 160).join('') }));
    }
    const carriers = await tx.shipment.findMany({
        where: { shopId, deliveredAt: { not: null }, order: { paymentMethod: 'cod' } },
        distinct: ['carrierId'], select: { carrierId: true }, orderBy: { carrierId: 'asc' },
    });
    return carriers.map(({ carrierId }) => ({ id: carrierId ?? manualCarrierId, label: carrierId ? 'Đơn vị ' + carrierId : 'Giao hàng thủ công' }));
}

export async function statementFile(tx: Prisma.TransactionClient, shopId: string, actorId: string, input: StatementInput, expected?: StatementKind) {
    if (!validUuid(input.accountOrCarrierId) || cleanFinanceText(input.sourceBatchId) !== input.sourceBatchId) throw new UnprocessableEntityException();
    const file = await readyImportFile(tx, shopId, actorId, input.fileId, [...statementPurposes]);
    const kind: StatementKind = file.purpose === 'bank_statement' ? 'bank' : 'cod';
    const format = statementFormats.find(entry => entry.kind === kind && entry.formatId === input.formatId);
    if (!format || (expected && expected !== kind) || (file.resourceId && file.resourceId !== input.accountOrCarrierId) ||
        file.bytes.length > format.maxBytes || !(await statementOptions(tx, shopId, kind)).some(source => source.id === input.accountOrCarrierId)) {
        throw new UnprocessableEntityException();
    }
    return { file, kind, format };
}

function paymentAmount(value: string, currency: string) {
    try { return parseMoney({ amount: value, currency }, currency, true); }
    catch { throw new Error('Số tiền phải dương và tuân theo độ chính xác của sổ.'); }
}

function required(value: string, max: number) {
    return Boolean(value && Array.from(value).length <= max && !/[\x00-\x1f\x7f]/.test(value));
}

export async function readStatementRows(tx: Prisma.TransactionClient, shopId: string, input: StatementInput,
    source: Awaited<ReturnType<typeof statementFile>>, selectedRows?: readonly number[]) {
    const { file, kind, format } = source;
    let sheet: string[][];
    try { sheet = await readSpreadsheet(file.bytes, file.mimeType); }
    catch { throw new UnprocessableEntityException('Không đọc được bảng sao kê.'); }
    const [header, ...lines] = sheet;
    if (new Set(header).size !== header.length || !format.requiredColumns.every(column => header.includes(column)) ||
        !lines.length || lines.length > format.maxRows) throw new UnprocessableEntityException('Sai cột hoặc số dòng của bảng sao kê.');
    const columns = format.requiredColumns.map(name => [name, header.indexOf(name)] as const);
    const allowed = selectedRows && new Set(selectedRows);
    const rows: PreviewRow[] = lines.map((line, index) => ({
        row: index + 2, values: Object.fromEntries(columns.map(([key, position]) => [key, line[position]?.trim() ?? ''])),
        errors: line.length === header.length ? [] : ['Số cột trong dòng khác dòng tiêu đề.'],
    })).filter(row => !allowed || allowed.has(row.row));
    const { currency } = await financeShop(tx, shopId);
    const accountOrCarrierId = input.accountOrCarrierId;
    const seen = new Set<string>();
    if (kind === 'bank') {
        const imported = await tx.bankTransaction.findMany({ where: { shopId, accountId: accountOrCarrierId,
            externalTransactionId: { in: rows.map(row => row.values.externalTransactionId).filter(id => required(id, 200)) } },
            select: { externalTransactionId: true } });
        const existing = new Set(imported.map(row => row.externalTransactionId));
        for (const row of rows) {
            if (row.errors.length) continue;
            const { externalTransactionId, direction, occurredAt, amount, referenceText } = row.values;
            try {
                if (!required(externalTransactionId, 200) || !['credit', 'debit'].includes(direction) ||
                    Array.from(referenceText).length > 500 || !isDateTime(occurredAt) || new Date(occurredAt) > new Date()) {
                    throw new Error('Mã giao dịch, chiều tiền, ngày hoặc nội dung chưa hợp lệ.');
                }
                if (row.values.currency !== currency) throw new Error('Tiền tệ khác đồng tiền cơ sở.');
                if (existing.has(externalTransactionId) || seen.has(externalTransactionId)) throw new Error('Mã giao dịch đã nhập hoặc xuất hiện nhiều lần.');
                row.parsed = { kind, externalTransactionId, direction: direction as 'credit' | 'debit', occurredAt: new Date(occurredAt),
                    amount: paymentAmount(amount, currency), referenceText };
                seen.add(externalTransactionId);
            } catch (error) {
                row.errors.push((error as Error).message);
            }
        }
        return { currency, rows };
    }

    const idsFor = (row: PreviewRow) => row.values.orderIds.split(';').map(id => id.trim());
    const orderIds = [...new Set(rows.flatMap(idsFor).filter(validUuid))];
    if (orderIds.length > format.maxRows) throw new UnprocessableEntityException('Quá số đơn COD được phép trong một lần nhập.');
    const assignments = await tx.codSettlementOrder.findMany({ where: { shopId, orderId: { in: orderIds } }, select: { orderId: true } });
    const assigned = new Set(assignments.map(row => row.orderId));
    const debts = await findDebts(tx, shopId, currency, { orderIds });
    const byOrder = new Map(debts.map(debt => [debt.orderId, debt]));
    const batches = await tx.codSettlement.findMany({ where: { shopId, carrierId: accountOrCarrierId,
        externalBatchId: { in: rows.map(row => row.values.externalBatchId).filter(id => required(id, 200)) } }, select: { externalBatchId: true } });
    const usedBatchIds = new Set(batches.map(batch => batch.externalBatchId));
    for (const row of rows) {
        if (row.errors.length) continue;
        const { externalBatchId } = row.values;
        const orders = idsFor(row);
        if (!required(externalBatchId, 200) || !orders.every(validUuid) || new Set(orders).size !== orders.length) {
            row.errors.push('Thiếu mã đợt, mã đơn COD không hợp lệ hoặc lặp trong dòng.');
        } else if (usedBatchIds.has(externalBatchId) || orders.some(id => assigned.has(id) || seen.has(id))) {
            row.errors.push('Mã đợt hoặc đơn COD đã nhập hoặc xuất hiện nhiều lần.');
        } else {
            const openDebts = orders.map(id => byOrder.get(id)).filter(debt => debt?.counterpartyId === accountOrCarrierId && debt.outstanding.gt(0));
            if (openDebts.length !== orders.length) row.errors.push('Đơn thiếu phải thu COD hoặc khác đơn vị vận chuyển.');
            else {
                row.parsed = { kind, externalBatchId, orderIds: orders, grossDue: sumAmounts(openDebts, debt => debt!.outstanding) };
                usedBatchIds.add(externalBatchId);
                for (const orderId of orders) seen.add(orderId);
            }
        }
    }
    return { currency, rows };
}
