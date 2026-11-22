import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { FinanceClassification, FinanceEntry, FinanceEntryKind, PostingStatus, Prisma } from '../../generated/prisma/client.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { requireIfMatch, requireVersion } from '../../http/response.js';
import { commandDto } from '../../platform/commands/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { FinanceAccess } from './access.js';
import type { Reason } from './book.js';
import { cleanFinanceText, financeKey, financeMoney, financeShop, journalInShop, localAccountingDate, parseMoney,
    reversePostedJournal, systemAccounts, writeJournal, type JournalLine, type Money } from './journal.js';

export type EntryWrite = {
    kind: FinanceEntryKind; classification: FinanceClassification; amount: Money; occurredAt: string; description: string;
    sourceRef: { type: string; id: string } | null;
};

const counterparts: Record<FinanceClassification, string> = {
    sales_receipt: 'customer_deposit', inventory_purchase: 'supplier_prepayment', shipping: 'carrier_fees',
    platform_fee: 'operating_expense', payment_fee: 'operating_expense', ai_expense: 'operating_expense',
    operating_expense: 'operating_expense', capital: 'owner_capital', loan_principal: 'loan', transfer: 'bank', other: 'operating_expense',
};
const entryDetails = { journal: { select: { settlementAllocations: { select: { debtLineId: true } } } } } satisfies Prisma.FinanceEntryInclude;
type EntryView = Prisma.FinanceEntryGetPayload<{ include: typeof entryDetails }>;

export function pairedLines(debitAccount: string, creditAccount: string, amount: Money, description: string): JournalLine[] {
    const zero = { amount: '0', currency: amount.currency };
    const text = Array.from(description).slice(0, 300).join('');
    return [
        { accountId: debitAccount, debit: amount, credit: zero, description: text },
        { accountId: creditAccount, debit: zero, credit: amount, description: text },
    ];
}

async function entryInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const row = await tx.financeEntry.findUnique({ where: financeKey(shopId, id), include: entryDetails });
    if (!row) throw new NotFoundException();
    return row;
}

function entryView(row: EntryView) {
    const { id, shopId, version, createdAt, updatedAt, kind, classification, status, occurredAt, description, reversalOf,
        sourceType, sourceId, amount, currency, paymentReference, evidenceId } = row;
    return {
        id, shopId, version, createdAt, updatedAt, kind, classification, status, occurredAt, description, reversalOf,
        amount: financeMoney(amount, currency), sourceRef: sourceType && sourceId ? { type: sourceType, id: sourceId } : null,
        paymentReference, evidenceRef: evidenceId, reconciledDebtIds: row.journal?.settlementAllocations.map(item => item.debtLineId).sort() ?? [],
    };
}

function entryWriteFrom(row: FinanceEntry): EntryWrite {
    return {
        kind: row.kind, classification: row.classification, amount: financeMoney(row.amount, row.currency),
        occurredAt: row.occurredAt.toISOString(), description: row.description,
        sourceRef: row.sourceType && row.sourceId ? { type: row.sourceType, id: row.sourceId } : null,
    };
}

async function normalizeEntry(tx: Prisma.TransactionClient, shopId: string, input: EntryWrite) {
    const { currency } = await financeShop(tx, shopId);
    const occurredAt = new Date(input.occurredAt);
    if (!Number.isFinite(occurredAt.getTime()) || occurredAt.getTime() > Date.now() ||
        (input.sourceRef !== null && (!/^manual(?:_[a-z0-9_]{1,45})?$/.test(input.sourceRef.type) ||
            !/^[A-Za-z0-9_-]{1,160}$/.test(input.sourceRef.id)))) throw new UnprocessableEntityException();
    return {
        kind: input.kind, classification: input.classification, amount: parseMoney(input.amount, currency, true), currency,
        occurredAt, description: cleanFinanceText(input.description, 5), sourceType: input.sourceRef?.type ?? null, sourceId: input.sourceRef?.id ?? null,
    };
}

export class FinanceEntries extends FinanceAccess {
    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, scope) => {
            const query = listQuery(raw);
            if (query.status && !['draft', 'posted', 'reversed'].includes(query.status)) throw new UnprocessableEntityException();
            const page = paging(query, ['finance_entries', shopId, scope.userId, String(scope.permissionVersion)]);
            const contains = { contains: page.keyword, mode: 'insensitive' as const };
            const result = page.result(await tx.financeEntry.findMany({
                where: {
                    shopId, status: query.status as PostingStatus | undefined,
                    AND: [page.keyword ? { OR: [{ description: contains }, { sourceId: contains }, { paymentReference: contains }] } : {}, page.after ?? {}],
                },
                orderBy: page.orderBy, take: page.limit + 1, include: entryDetails,
            }));
            return { ...result, data: result.data.map(entryView) };
        });
    }

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async tx => entryView(await entryInShop(tx, shopId, id)));
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: EntryWrite, requestId: string) {
        return this.write({ headers, shopId, action: 'createFinanceEntry', payload: input, requestId }, async tx => {
            const data = await normalizeEntry(tx, shopId, input);
            return tx.financeEntry.create({ data: { shopId, ...data } });
        }, async (tx, result) => entryView(await entryInShop(tx, shopId, result.id)));
    }

    update(headers: IncomingHttpHeaders, shopId: string, id: string, patch: Partial<EntryWrite>, requestId: string) {
        const version = requireIfMatch(headers);
        return this.write({ headers, shopId, action: 'updateFinanceEntry', payload: { id, version, patch }, requestId }, async tx => {
            const existing = await entryInShop(tx, shopId, id);
            requireVersion(existing.version, version);
            if (existing.status !== 'draft' || existing.orderId) throw new ConflictException();
            const data = await normalizeEntry(tx, shopId, { ...entryWriteFrom(existing), ...patch });
            return tx.financeEntry.update({ where: financeKey(shopId, id), data: { ...data, version: { increment: 1 } } });
        }, async (tx, result) => entryView(await entryInShop(tx, shopId, result.id)));
    }

    post(headers: IncomingHttpHeaders, shopId: string, id: string, input: Reason, requestId: string) {
        const reason = cleanFinanceText(input.reason, 3);
        return this.write({ headers, shopId, action: 'postFinanceEntry', payload: { id, input }, requestId, reason }, async tx => {
            const current = await entryInShop(tx, shopId, id);
            requireVersion(current.version, input.expectedVersion);
            if (current.status !== 'draft' || current.orderId || (current.sourceId && await tx.financeEntry.findFirst({
                where: { shopId, sourceType: current.sourceType, sourceId: current.sourceId, id: { not: id }, status: { in: ['posted', 'reversed'] } },
                select: { id: true },
            }))) throw new ConflictException();
            const { timezone, currency } = await financeShop(tx, shopId);
            const amount = financeMoney(current.amount, current.currency);
            parseMoney(amount, currency, true);
            const [cash, other] = await systemAccounts(tx, shopId, 'cash', counterparts[current.classification]);
            const [debit, credit] = current.kind === 'receipt' ? [cash, other] : [other, cash];
            const { journal } = await writeJournal(tx, shopId, {
                sourceType: 'finance_entry', sourceId: id, eventType: 'post', sourceRevision: current.version,
                effectiveDate: localAccountingDate(current.occurredAt, timezone),
                lines: pairedLines(debit, credit, amount, current.description), reason,
            }, true);
            return tx.financeEntry.update({
                where: financeKey(shopId, id), data: { status: 'posted', journalId: journal.id, version: { increment: 1 } },
            });
        }, async (_tx, _result, command) => commandDto(command, 'finance_entry'));
    }

    reverse(headers: IncomingHttpHeaders, shopId: string, id: string, input: Reason, requestId: string) {
        const reason = cleanFinanceText(input.reason, 5);
        return this.write({ headers, shopId, action: 'reverseFinanceEntry', payload: { id, input }, requestId, reason }, async tx => {
            const current = await entryInShop(tx, shopId, id);
            requireVersion(current.version, input.expectedVersion);
            if (current.status !== 'posted' || !current.journalId || current.orderId || current.reversalOf ||
                current.journal?.settlementAllocations.length) throw new ConflictException();
            const prior = await journalInShop(tx, shopId, current.journalId);
            const reversed = await reversePostedJournal(tx, prior, reason);
            const original = await tx.financeEntry.update({
                where: financeKey(shopId, id), data: { status: 'reversed', version: { increment: 1 } },
            });
            await enqueueResourceUpdate(tx, 'finance.updated', original);
            return tx.financeEntry.create({
                data: {
                    shopId, reversalOf: id, kind: current.kind === 'receipt' ? 'disbursement' : 'receipt',
                    classification: current.classification, amount: current.amount, currency: current.currency,
                    status: 'posted', occurredAt: new Date(), description: reason, journalId: reversed.id,
                },
            });
        }, async (_tx, _result, command) => commandDto(command, 'finance_entry'));
    }
}
