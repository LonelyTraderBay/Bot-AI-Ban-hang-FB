import { UnprocessableEntityException } from '@nestjs/common';
import { Prisma, type AccountGroup } from '../../generated/prisma/client.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { financeMoney, localAccountingDate } from './journal.js';

export function reportWindow(query: { from?: string; to?: string; timezone?: string }, timezone: string) {
    const { from, to } = query;
    if (!from || !to || (query.timezone !== undefined && query.timezone !== timezone)) throw new UnprocessableEntityException();
    const start = new Date(from);
    const end = new Date(to);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) throw new UnprocessableEntityException();
    return { from, to, timezone, firstDay: localAccountingDate(start, timezone), lastDay: localAccountingDate(new Date(end.getTime() - 1), timezone) };
}

type AccountTotals = {
    accountId: string; code: string; name: string; group: AccountGroup; systemKey: string | null;
    opening: Prisma.Decimal; debit: Prisma.Decimal; credit: Prisma.Decimal;
};
type JournalRange = { shopId: string; currency: string; firstDay: string; lastDay: string };

export const journalScope = (shopId: string, currency: string) => Prisma.sql`
    j.shop_id = ${shopId}::uuid AND j.status IN ('posted', 'reversed') AND j.currency = ${currency}
`;

export function accountTotals(tx: Prisma.TransactionClient, range: JournalRange, includeOpening: boolean) {
    const { shopId, currency, firstDay, lastDay } = range;
    const bounds = includeOpening ? Prisma.empty : Prisma.sql`AND j.effective_date >= ${firstDay}::date`;
    return tx.$queryRaw<AccountTotals[]>(Prisma.sql`
        WITH totals AS (
            SELECT l.account_id,
                   sum(l.debit-l.credit) FILTER (WHERE j.effective_date < ${firstDay}::date) AS opening,
                   sum(l.debit) FILTER (WHERE j.effective_date >= ${firstDay}::date) AS debit,
                   sum(l.credit) FILTER (WHERE j.effective_date >= ${firstDay}::date) AS credit
            FROM finance_journals j JOIN finance_journal_lines l ON l.shop_id=j.shop_id AND l.journal_id=j.id
            WHERE ${journalScope(shopId, currency)} AND j.effective_date <= ${lastDay}::date ${bounds}
            GROUP BY l.account_id
        )
        SELECT a.id AS "accountId", a.code, a.name, a."group", a.system_key AS "systemKey",
               coalesce(t.opening, 0) AS opening, coalesce(t.debit, 0) AS debit, coalesce(t.credit, 0) AS credit
        FROM finance_accounts a LEFT JOIN totals t ON t.account_id=a.id
        WHERE a.shop_id=${shopId}::uuid ORDER BY a.code, a.id
    `);
}

export async function reportJournalIds(tx: Prisma.TransactionClient, range: JournalRange) {
    const { shopId, currency, firstDay, lastDay } = range;
    const items = await tx.financeJournal.findMany({ where: {
        shopId, currency, status: { in: ['posted', 'reversed'] },
        effectiveDate: { gte: new Date(firstDay + 'T00:00:00Z'), lte: new Date(lastDay + 'T00:00:00Z') },
    }, select: { id: true }, orderBy: [{ effectiveDate: 'asc' }, { id: 'asc' }] });
    return items.map(item => item.id);
}

export const netDebit = (row: AccountTotals) => new ExactDecimal(row.debit).minus(row.credit);
export const sumAmounts = <T>(rows: readonly T[], amount: (row: T) => Prisma.Decimal) =>
    rows.reduce((sum, row) => sum.plus(amount(row)), new ExactDecimal(0));

export async function dashboardMoney(tx: Prisma.TransactionClient, shopId: string, currency: string) {
    const [total] = await tx.$queryRaw<{ revenue: Prisma.Decimal; cash: Prisma.Decimal; hasRevenue: boolean; hasCash: boolean }[]>(Prisma.sql`
        WITH movements AS (
            SELECT j.id, a.system_key, sum(l.credit-l.debit) AS credit
            FROM finance_journals j JOIN finance_journal_lines l ON j.shop_id=l.shop_id AND l.journal_id=j.id
            JOIN finance_accounts a ON l.shop_id=a.shop_id AND l.account_id=a.id
            WHERE ${journalScope(shopId, currency)} AND j.source_type <> 'opening_balance'
              AND a.system_key IN ('sales','sales_returns','cash','bank')
            GROUP BY j.id, a.system_key
        ), by_journal AS (
            SELECT id, sum(credit) FILTER (WHERE system_key IN ('sales','sales_returns')) AS revenue,
                -sum(credit) FILTER (WHERE system_key IN ('cash','bank')) AS cash
            FROM movements GROUP BY id
        )
        SELECT coalesce(sum(revenue),0) AS revenue, coalesce(sum(cash) FILTER (WHERE cash>0),0) AS cash,
            count(revenue)>0 AS "hasRevenue", count(cash)>0 AS "hasCash" FROM by_journal
    `);
    return { recognizedRevenue: total.hasRevenue ? financeMoney(total.revenue, currency) : null,
        cashReceived: total.hasCash ? financeMoney(total.cash, currency) : null };
}
