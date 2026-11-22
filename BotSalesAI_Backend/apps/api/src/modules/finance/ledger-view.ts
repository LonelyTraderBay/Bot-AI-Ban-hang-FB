import { NotFoundException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { Prisma } from '../../generated/prisma/client.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { FinanceAccess } from './access.js';
import { financeKey, financeMoney, financeShop } from './journal.js';
import { journalScope, reportWindow } from './report-data.js';

type LedgerRow = {
    id: string; createdAt: Date; journalId: string; sourceType: string; sourceId: string; accountId: string;
    accountCode: string; accountName: string; debit: Prisma.Decimal; credit: Prisma.Decimal;
    balance: Prisma.Decimal; description: string;
};
type Summary = { opening: Prisma.Decimal; debit: Prisma.Decimal; credit: Prisma.Decimal };

export class LedgerReader extends FinanceAccess {
    ledger(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, scope) => {
            const query = listQuery(raw, 'ledger');
            const { currency, timezone, policyVersion } = await financeShop(tx, shopId);
            const { from: fromTime, to: toTime, firstDay: from, lastDay: to } = reportWindow(query, timezone);
            if (query.accountId && (!validUuid(query.accountId) || !await tx.financeAccount.findUnique({
                where: financeKey(shopId, query.accountId), select: { id: true },
            }))) throw new NotFoundException();
            const page = paging({ ...query, sort: 'createdAt:asc' }, [
                'ledger', shopId, scope.userId, String(scope.permissionVersion), query.accountId ?? '', from, to, currency,
            ]);
            const account = query.accountId ? Prisma.sql`AND l.account_id = ${query.accountId}::uuid` : Prisma.empty;
            const source = Prisma.sql`
                FROM finance_journal_lines l JOIN finance_journals j ON j.shop_id=l.shop_id AND j.id=l.journal_id
                WHERE ${journalScope(shopId, currency)} ${account}
            `;
            const [summary] = await tx.$queryRaw<Summary[]>(Prisma.sql`
                SELECT coalesce(sum(l.debit-l.credit) FILTER (WHERE j.effective_date < ${from}::date),0) AS opening,
                       coalesce(sum(l.debit) FILTER (WHERE j.effective_date >= ${from}::date),0) AS debit,
                       coalesce(sum(l.credit) FILTER (WHERE j.effective_date >= ${from}::date),0) AS credit
                ${source} AND j.effective_date <= ${to}::date
            `);
            const after = page.position ? Prisma.sql`
                WHERE ("createdAt", id) > (${page.position.createdAt.toISOString().slice(0, 10)}::date, ${page.position.id}::uuid)
            ` : Prisma.empty;
            const money = (value: Prisma.Decimal) => financeMoney(value, currency);
            const rows = await tx.$queryRaw<LedgerRow[]>(Prisma.sql`
                WITH counted AS (
                  SELECT l.id, j.effective_date AS "createdAt", j.id AS "journalId", j.source_type AS "sourceType",
                         j.source_id AS "sourceId", l.account_id AS "accountId", l.description, l.debit, l.credit,
                         ${summary.opening}::numeric + sum(l.debit-l.credit)
                           OVER (ORDER BY j.effective_date, l.id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS balance
                  ${source} AND j.effective_date BETWEEN ${from}::date AND ${to}::date
                ), selected AS (SELECT * FROM counted ${after} ORDER BY "createdAt", id LIMIT ${page.limit + 1})
                SELECT s.*, a.code AS "accountCode", a.name AS "accountName"
                FROM selected s JOIN finance_accounts a ON a.shop_id = ${shopId}::uuid AND a.id = s."accountId"
                ORDER BY s."createdAt", s.id
            `);
            const result = page.result(rows);
            return {
                shopId, asOf: new Date().toISOString(), policyVersion,
                completeness: 'provisional', warnings: ['Số liệu từ bút toán đã ghi trong sổ quản trị.'],
                from: fromTime, to: toTime, timezone, accountId: query.accountId ?? null,
                openingBalance: money(summary.opening), totalDebit: money(summary.debit), totalCredit: money(summary.credit),
                closingBalance: money(new ExactDecimal(summary.opening).plus(summary.debit).minus(summary.credit)),
                entries: result.data.map(({ createdAt, debit, credit, balance, ...row }) => ({
                    ...row, effectiveDate: createdAt.toISOString().slice(0, 10), debit: money(debit), credit: money(credit), balance: money(balance),
                })),
                page: result.page,
            };
        });
    }
}
