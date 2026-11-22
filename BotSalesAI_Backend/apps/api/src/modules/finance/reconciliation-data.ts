import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { BankTransaction, Prisma } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { createWorkItem } from '../operations/index.js';
import type { Debt } from './debts.js';
import { financeKey, financeMoney, localAccountingDate, systemAccounts, writeJournal } from './journal.js';
import { sumAmounts } from './report-data.js';

export const bankDetails = { reconciliation: true } satisfies Prisma.BankTransactionInclude;
export const caseDetails = { transaction: true } satisfies Prisma.ReconciliationCaseInclude;
export const codDetails = { orders: { select: { orderId: true }, orderBy: { orderId: 'asc' } } } satisfies Prisma.CodSettlementInclude;
export type BankView = Prisma.BankTransactionGetPayload<{ include: typeof bankDetails }>;
export type CaseView = Prisma.ReconciliationCaseGetPayload<{ include: typeof caseDetails }>;
export type CodView = Prisma.CodSettlementGetPayload<{ include: typeof codDetails }>;
type Allocation = { debt: Debt; amount: Prisma.Decimal; bankAmount: Prisma.Decimal };

export function bankView(transaction: BankView) {
    const { accountId, externalTransactionId, occurredAt, direction, amount, currency, referenceText, reconciliation,
        shopId, id, version, updatedAt, createdAt } = transaction;
    return { shopId, id, version, updatedAt, createdAt, accountId, externalTransactionId, occurredAt, direction, referenceText,
        amount: financeMoney(amount, currency), matchState: reconciliation?.state ?? 'unmatched' };
}

export function reconciliationView(review: CaseView, suggestedResourceIds: string[]) {
    const { transaction: { currency }, difference, ...fields } = review;
    return { ...fields, suggestedResourceIds, difference: financeMoney(difference, currency) };
}

export function codBalance(cod: Pick<CodView, 'grossDue' | 'actualFees' | 'bankReceived'>) {
    return new ExactDecimal(cod.grossDue).minus(cod.actualFees).minus(cod.bankReceived);
}

export function codView(cod: CodView) {
    const { id, shopId, version, carrierId, externalBatchId, bankTransactionId, status, orders, createdAt, updatedAt,
        grossDue, actualFees, bankReceived, currency } = cod;
    const money = (amount: Prisma.Decimal) => financeMoney(amount, currency);
    return { id, shopId, version, createdAt, updatedAt, carrierId, externalBatchId, bankTransactionId, status,
        orderIds: orders.map(order => order.orderId), grossDue: money(grossDue), actualFees: money(actualFees),
        bankReceived: money(bankReceived), difference: money(codBalance(cod)) };
}

export async function bankInShop(tx: Prisma.TransactionClient, shopId: string, id: string, lock = false) {
    if (!validUuid(id)) throw new NotFoundException();
    if (lock) await tx.$queryRaw`SELECT id FROM bank_transactions WHERE shop_id=${shopId}::uuid AND id=${id}::uuid FOR UPDATE`;
    const row = await tx.bankTransaction.findUnique({ where: financeKey(shopId, id), include: bankDetails });
    if (!row) throw new NotFoundException();
    return row;
}

export async function caseInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const row = await tx.reconciliationCase.findUnique({ where: financeKey(shopId, id), include: caseDetails });
    if (!row) throw new NotFoundException();
    return row;
}

export async function codInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const row = await tx.codSettlement.findUnique({ where: financeKey(shopId, id), include: codDetails });
    if (!row) throw new NotFoundException();
    return row;
}

export async function updateReconciliation(tx: Prisma.TransactionClient, bank: BankView, difference: Prisma.Decimal, reason: string, paymentEvidenceId?: string) {
    if (!bank.reconciliation) throw new ConflictException();
    const next = await tx.reconciliationCase.update({ where: financeKey(bank.shopId, bank.reconciliation.id), data: {
        state: difference.isZero() ? 'matched' : 'suggested', difference, reason, version: { increment: 1 },
    } });
    await tx.bankTransaction.update({ where: financeKey(bank.shopId, bank.id), data: { version: { increment: 1 }, paymentEvidenceId } });
    return next;
}

export async function bindImportedBankReceipt(tx: Prisma.TransactionClient, proof: {
    shopId: string; id: string; reference: string; amount: Prisma.Decimal; currency: string;
}, accountId: string, effectiveDate: string, timezone: string) {
    const imported = await tx.bankTransaction.findUnique({ where: { shopId_accountId_externalTransactionId: {
        shopId: proof.shopId, accountId, externalTransactionId: proof.reference,
    } }, select: { id: true } });
    if (!imported) return;
    const bank = await bankInShop(tx, proof.shopId, imported.id, true);
    if (bank.direction !== 'credit' || bank.currency !== proof.currency || !bank.amount.eq(proof.amount) ||
        localAccountingDate(bank.occurredAt, timezone) !== effectiveDate || bank.reconciliation?.state !== 'unmatched' ||
        !bank.reconciliation.difference.eq(bank.amount)) throw new ConflictException('Chứng từ ngân hàng đã dùng hoặc đang có chênh lệch.');
    const review = await updateReconciliation(tx, bank, new ExactDecimal(0), 'Đã ghi phiếu theo đúng mã giao dịch sao kê.', proof.id);
    await enqueueResourceUpdate(tx, 'reconciliation.updated', review);
}

async function linkCarrierCollections(tx: Prisma.TransactionClient, allocation: { shopId: string; id: string; orderId: string | null; amount: Prisma.Decimal }) {
    if (!allocation.orderId) throw new ConflictException();
    const entries = await tx.financeEntry.findMany({ where: { shopId: allocation.shopId, orderId: allocation.orderId,
        kind: 'receipt', status: 'posted', evidence: { kind: 'carrier_collection' } },
        select: { id: true, amount: true, collectionApplications: { select: { amount: true } } },
        orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
    let remaining = new ExactDecimal(allocation.amount);
    for (const entry of entries) {
        if (remaining.isZero()) break;
        const available = new ExactDecimal(entry.amount).minus(sumAmounts(entry.collectionApplications, application => application.amount));
        const applied = ExactDecimal.min(available, remaining);
        if (applied.lt(0)) throw new ConflictException();
        if (applied.isZero()) continue;
        await tx.collectionApplication.create({ data: { shopId: allocation.shopId, financeEntryId: entry.id, allocationId: allocation.id, amount: applied } });
        remaining = remaining.minus(applied);
    }
}

function journalLine(accountId: string, amount: Prisma.Decimal, debit: boolean, description: string, currency: string) {
    const value = financeMoney(amount, currency);
    const zero = { amount: '0', currency };
    return { accountId, description, debit: debit ? value : zero, credit: debit ? zero : value };
}

export async function postAllocation(tx: Prisma.TransactionClient, bank: BankTransaction, parts: Allocation[], effectiveDate: string,
    revision: number, reason: string, fee: Prisma.Decimal = new ExactDecimal(0), codId?: string) {
    const { shopId, currency } = bank;
    const effective = new Date(effectiveDate + 'T00:00:00Z');
    if (parts.some(part => part.debt.effectiveDate > effective)) throw new UnprocessableEntityException('Bút toán thanh toán có ngày trước công nợ.');
    const intoBank = bank.direction === 'credit';
    const cashTotal = sumAmounts(parts, part => part.bankAmount);
    const journalLines = [
        journalLine(bank.accountId, cashTotal, intoBank, 'Số thực nhận hoặc thực chi theo sao kê', currency),
        ...parts.map(part => journalLine(part.debt.accountId, part.amount, !intoBank, 'Phân bổ công nợ ' + part.debt.id, currency)),
    ];
    if (fee.gt(0)) {
        const [account] = await systemAccounts(tx, shopId, 'carrier_fees');
        journalLines.push(journalLine(account, fee, true, 'Phí thực tế đã khấu trừ khi quyết toán COD', currency));
    }
    const { journal, repeat } = await writeJournal(tx, shopId, {
        sourceType: 'bank_transaction', sourceId: bank.id, eventType: codId ? 'cod_settlement' : 'allocate_bank',
        sourceRevision: revision, effectiveDate, lines: journalLines, reason,
    }, true);
    if (repeat) throw new ConflictException();
    const entry = await tx.financeEntry.create({ data: { shopId, kind: intoBank ? 'receipt' : 'disbursement', classification: codId ? 'sales_receipt' : 'other',
        amount: cashTotal, currency, status: 'posted', occurredAt: bank.occurredAt, description: reason, journalId: journal.id,
        sourceType: codId ? 'cod_settlement' : 'bank_allocation', sourceId: journal.id,
        paymentReference: Array.from(bank.externalTransactionId).slice(0, 160).join(''),
    } });
    await enqueueResourceUpdate(tx, 'finance.updated', entry);
    for (const part of parts) {
        const { debt, amount, bankAmount } = part;
        const created = await tx.settlementAllocation.create({ data: { shopId, journalId: journal.id, debtLineId: debt.id,
            transactionId: bank.id, codSettlementId: codId, orderId: debt.orderId, amount, bankAmount } });
        if (codId) await linkCarrierCollections(tx, created);
        if (debt.orderId) {
            const settled = amount.eq(debt.outstanding);
            const order = await tx.salesOrder.findUniqueOrThrow({ where: financeKey(shopId, debt.orderId), select: {
                total: true, paymentState: true,
                moneyEntries: { where: { kind: 'receipt', status: 'posted' }, select: { amount: true } },
                settlementAllocations: { select: { amount: true, bankAmount: true, applications: { select: { amount: true } } } },
                shipments: { select: { returns: { where: { state: 'inspected' }, select: { receivableCredit: true } } } },
            } });
            const credit = sumAmounts(order.shipments.flatMap(shipment => shipment.returns), item => item.receivableCredit ?? new ExactDecimal(0));
            const expected = new ExactDecimal(order.total).minus(credit);
            const paid = sumAmounts(order.moneyEntries, item => item.amount).plus(allocationTotals(order.settlementAllocations).additionalVerified);
            if (!paid.eq(expected) && settled) {
                const source = { shopId, kind: 'payment_mismatch', sourceType: 'order', sourceId: debt.orderId } as const;
                if (!await tx.workItem.findUnique({ where: { shopId_kind_sourceType_sourceId: source }, select: { id: true } })) {
                    await createWorkItem(tx, source);
                }
            }
            const updateState = settled && paid.eq(expected) && !['part_refunded', 'refunded'].includes(order.paymentState);
            const latest = await tx.salesOrder.update({ where: financeKey(shopId, debt.orderId),
                data: { version: { increment: 1 }, ...(updateState ? { paymentState: 'settled' } : {}) } });
            await enqueueResourceUpdate(tx, 'order.updated', latest);
        }
    }
}

export function allocationTotals(rows: readonly {
    amount: Prisma.Decimal; bankAmount: Prisma.Decimal; applications: readonly { amount: Prisma.Decimal }[];
}[]) {
    return {
        additionalVerified: sumAmounts(rows, row => new ExactDecimal(row.amount).minus(sumAmounts(row.applications, item => item.amount))),
        cashReceived: sumAmounts(rows, row => row.bankAmount),
    };
}
