import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { requireVersion } from '../../http/response.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';

export type Money = { amount: string; currency: string };
export type JournalLine = { accountId: string; debit: Money; credit: Money; description: string };
export type JournalInput = {
    sourceType: string; sourceId: string; eventType: string; sourceRevision: number;
    effectiveDate: string; lines: JournalLine[]; reason: string; replacesJournalId?: string | null; reversalOf?: string | null;
};

export const financeKey = (shopId: string, id: string) => ({ shopId_id: { shopId, id } });
export const journalLines = { orderBy: { position: 'asc' } } satisfies Prisma.FinanceJournal$linesArgs;
type Journal = Prisma.FinanceJournalGetPayload<{ include: { lines: typeof journalLines } }>;

export function financeMoney(value: Prisma.Decimal, currency: string): Money {
    const amount = value.toFixed();
    if (amount.length > 60) throw new UnprocessableEntityException();
    return { amount, currency };
}

export function parseMoney(value: Money, currency: string, positive = false): Prisma.Decimal {
    if (value.currency !== currency || value.amount.length > 60 || !/^(0|[1-9][0-9]*)(\.[0-9]{1,18})?$/.test(value.amount)) {
        throw new UnprocessableEntityException();
    }
    const number = new ExactDecimal(value.amount);
    if (positive && number.isZero()) throw new UnprocessableEntityException();
    return number;
}

export function cleanFinanceText(value: string, minLength = 1) {
    const clean = value.trim();
    if (clean.length < minLength || clean.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
    return clean;
}

export function accountingDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new UnprocessableEntityException();
    const parsed = new Date(value + 'T00:00:00.000Z');
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new UnprocessableEntityException();
    return parsed;
}

export function localAccountingDate(value: Date, timezone: string) {
    const components = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value);
    const part = (type: string) => components.find(component => component.type === type)?.value;
    return part('year') + '-' + part('month') + '-' + part('day');
}

export async function financeShop(tx: Prisma.TransactionClient, shopId: string) {
    return tx.shop.findUniqueOrThrow({
        where: { id: shopId }, select: { currency: true, timezone: true, policyVersion: true },
    });
}

export async function lockOpenPeriod(tx: Prisma.TransactionClient, shopId: string, effectiveDate: string) {
    accountingDate(effectiveDate);
    const matched = await tx.$queryRaw<{ id: string; state: string }[]>(Prisma.sql`
        SELECT id, state FROM accounting_periods
        WHERE shop_id = ${shopId}::uuid AND start_date <= ${effectiveDate}::date AND end_date >= ${effectiveDate}::date
        ORDER BY id FOR SHARE
    `);
    if (matched.length !== 1 || matched[0].state !== 'open') throw new ConflictException();
    return matched[0].id;
}

export function normalizedJournalLines(lines: JournalLine[], currency: string) {
    if (lines.length < 2 || lines.length > 500) throw new UnprocessableEntityException();
    let debitSum = new ExactDecimal(0);
    let creditSum = new ExactDecimal(0);
    const rows = lines.map((line, position) => {
        if (!validUuid(line.accountId)) throw new UnprocessableEntityException();
        const debit = parseMoney(line.debit, currency);
        const credit = parseMoney(line.credit, currency);
        if (debit.isZero() === credit.isZero()) throw new UnprocessableEntityException();
        debitSum = debitSum.plus(debit);
        creditSum = creditSum.plus(credit);
        return { position, accountId: line.accountId, debit, credit, description: cleanFinanceText(line.description, 0) };
    });
    if (!debitSum.eq(creditSum) || debitSum.toFixed().length > 60) throw new UnprocessableEntityException();
    return rows;
}

export async function lockActiveAccounts(tx: Prisma.TransactionClient, shopId: string, ids: string[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) return;
    const matched = await tx.$queryRaw<{ id: string; status: string }[]>(Prisma.sql`
        SELECT id, status FROM finance_accounts WHERE shop_id = ${shopId}::uuid
        AND id IN (${Prisma.join(unique.map(id => Prisma.sql`${id}::uuid`))}) ORDER BY id FOR SHARE
    `);
    if (matched.length !== unique.length || matched.some(account => account.status !== 'active')) throw new UnprocessableEntityException();
}

export async function systemAccounts(tx: Prisma.TransactionClient, shopId: string, ...keys: string[]) {
    const rows = await tx.financeAccount.findMany({
        where: { shopId, status: 'active', systemKey: { in: [...new Set(keys)] } }, select: { id: true, systemKey: true },
    });
    const result = new Map(rows.map(row => [row.systemKey, row.id]));
    return keys.map(key => {
        const id = result.get(key);
        if (!id) throw new ConflictException();
        return id;
    });
}

export async function journalInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const journal = await tx.financeJournal.findUnique({ where: financeKey(shopId, id), include: { lines: journalLines } });
    if (!journal) throw new NotFoundException();
    return journal;
}

export function journalView(journal: Journal) {
    const { id, shopId, version, createdAt, updatedAt, sourceType, sourceId, status, effectiveDate, periodId,
        policyVersion, lines, reversalOf, reason, replacesJournalId, sourceRevision, currency } = journal;
    return {
        id, shopId, version, createdAt, updatedAt, sourceType, sourceId, status, effectiveDate: effectiveDate.toISOString().slice(0, 10),
        periodId, policyVersion, reversalOf, reason, replacesJournalId, sourceRevision,
        lines: lines.map(line => ({
            accountId: line.accountId, debit: financeMoney(line.debit, currency), credit: financeMoney(line.credit, currency), description: line.description,
        })),
    };
}

export async function writeJournal(tx: Prisma.TransactionClient, shopId: string, input: JournalInput, post: boolean) {
    if (!/^[a-z][a-z0-9_]{0,99}$/.test(input.sourceType) || !/^[A-Za-z0-9_-]{1,160}$/.test(input.sourceId) ||
        !/^[a-z][a-z0-9_]{0,63}$/.test(input.eventType) || !Number.isInteger(input.sourceRevision) || input.sourceRevision < 0) {
        throw new UnprocessableEntityException();
    }
    const { currency, policyVersion } = await financeShop(tx, shopId);
    const reason = cleanFinanceText(input.reason);
    const rows = normalizedJournalLines(input.lines, currency);
    const effectiveDate = accountingDate(input.effectiveDate);
    const source = { shopId, sourceType: input.sourceType, sourceId: input.sourceId, eventType: input.eventType, sourceRevision: input.sourceRevision };
    const requestHash = createHash('sha256').update(JSON.stringify({
        date: input.effectiveDate, currency, reason, rows,
        reversalOf: input.reversalOf ?? null, replacesJournalId: input.replacesJournalId ?? null,
    })).digest('hex');
    const recorded = await tx.financeJournal.findUnique({ where: { shopId_sourceType_sourceId_eventType_sourceRevision: source } });
    if (recorded) {
        if (recorded.requestHash !== requestHash || (post && recorded.status !== 'posted')) throw new ConflictException();
        return { journal: recorded, repeat: true };
    }
    const periodId = await lockOpenPeriod(tx, shopId, input.effectiveDate);
    await lockActiveAccounts(tx, shopId, rows.map(row => row.accountId));
    const journal = await tx.financeJournal.create({
        data: {
            ...source, requestHash, currency, policyVersion, effectiveDate, periodId, reason,
            reversalOf: input.reversalOf, replacesJournalId: input.replacesJournalId,
        },
    });
    await tx.financeJournalLine.createMany({ data: rows.map(row => ({ ...row, shopId, journalId: journal.id })) });
    if (!post) return { journal, repeat: false };
    const posted = await tx.financeJournal.update({ where: financeKey(shopId, journal.id), data: { status: 'posted' } });
    await enqueueResourceUpdate(tx, 'journal.updated', posted);
    return { journal: posted, repeat: false };
}

export async function postDraftJournal(tx: Prisma.TransactionClient, shopId: string, id: string, version: number) {
    const journal = await journalInShop(tx, shopId, id);
    requireVersion(journal.version, version);
    if (journal.status !== 'draft') throw new ConflictException();
    const period = await lockOpenPeriod(tx, shopId, journal.effectiveDate.toISOString().slice(0, 10));
    const { currency, policyVersion } = await financeShop(tx, shopId);
    if (period !== journal.periodId || currency !== journal.currency || policyVersion !== journal.policyVersion) throw new ConflictException();
    await lockActiveAccounts(tx, shopId, journal.lines.map(line => line.accountId));
    const result = await tx.financeJournal.update({
        where: financeKey(shopId, id), data: { status: 'posted', version: { increment: 1 } },
    });
    await enqueueResourceUpdate(tx, 'journal.updated', result);
    return result;
}

export async function reversePostedJournal(tx: Prisma.TransactionClient, original: Journal, reason: string, now = new Date()) {
    const { shopId, id, currency, lines } = original;
    if (original.status !== 'posted' || original.reversalOf) throw new ConflictException();
    const { timezone } = await financeShop(tx, shopId);
    const { journal: reversing } = await writeJournal(tx, shopId, {
        sourceType: 'journal_reversal', sourceId: id, eventType: 'reverse', sourceRevision: original.version,
        effectiveDate: localAccountingDate(now, timezone), reason, reversalOf: id,
        lines: lines.map(line => ({
            accountId: line.accountId, debit: financeMoney(line.credit, currency),
            credit: financeMoney(line.debit, currency), description: line.description,
        })),
    }, true);
    const closed = await tx.financeJournal.update({
        where: financeKey(shopId, id), data: { status: 'reversed', version: { increment: 1 } },
    });
    await enqueueResourceUpdate(tx, 'journal.updated', closed);
    return reversing;
}
