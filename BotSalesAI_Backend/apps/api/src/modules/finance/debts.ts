import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { financeMoney, localAccountingDate } from './journal.js';
import { journalScope } from './report-data.js';

export const manualCarrierId = 'e7dbe0d2-4aaa-48ea-8b6f-cc89071c6949';

export type Debt = {
    id: string; shopId: string; version: number; createdAt: Date; updatedAt: Date; accountId: string;
    sourceId: string; sourceType: 'order' | 'goods_receipt'; counterpartyId: string; counterpartyType: 'carrier' | 'supplier';
    orderId: string | null; effectiveDate: Date; currency: string; original: Prisma.Decimal; outstanding: Prisma.Decimal;
    dueDate: Date | null; disputeHold: boolean;
};

export function debtDisputed(debt: Debt) {
    return debt.disputeHold || debt.outstanding.lt(0);
}

export function debtView(debt: Debt, timezone: string, asOf = new Date()) {
    const dueDate = debt.dueDate?.toISOString().slice(0, 10) ?? null;
    const daysOverdue = dueDate === null ? null : Math.max(0,
        (Date.parse(localAccountingDate(asOf, timezone)) - Date.parse(dueDate)) / 86_400_000);
    const agingBucket = debt.outstanding.eq(0) ? 'settled' : daysOverdue === null ? 'no_due_date'
        : daysOverdue === 0 ? 'current' : daysOverdue <= 30 ? 'overdue_1_30'
            : daysOverdue <= 60 ? 'overdue_31_60' : daysOverdue <= 90 ? 'overdue_61_90' : 'overdue_over_90';
    const { id, shopId, version, createdAt, updatedAt, sourceId, sourceType, counterpartyId, counterpartyType, currency } = debt;
    return {
        id, shopId, version, createdAt, updatedAt, source: { type: sourceType, id: sourceId },
        counterpartyId, counterpartyType, direction: counterpartyType === 'carrier' ? 'receivable' : 'payable',
        originalAmount: financeMoney(debt.original, currency), outstandingAmount: financeMoney(ExactDecimal.max(0, debt.outstanding), currency),
        dueAt: debt.dueDate, dueDate, agingBucket, daysOverdue, disputeHold: debt.disputeHold, disputed: debtDisputed(debt),
    };
}

export function findDebts(tx: Prisma.TransactionClient, shopId: string, currency: string, filter: {
    ids?: string[]; orderIds?: string[]; sourceIds?: string[]; before?: { id: string; createdAt: Date }; limit?: number;
} = {}) {
    const ids = (values: string[]) => Prisma.join(values.map(value => Prisma.sql`${value}::uuid`));
    const and = [
        filter.ids && (filter.ids.length ? Prisma.sql`AND l.id IN (${ids(filter.ids)})` : Prisma.sql`AND false`),
        filter.orderIds && (filter.orderIds.length ? Prisma.sql`AND s.order_id IN (${ids(filter.orderIds)})` : Prisma.sql`AND false`),
        filter.sourceIds && (filter.sourceIds.length ? Prisma.sql`AND coalesce(s.order_id, r.id) IN (${ids(filter.sourceIds)})` : Prisma.sql`AND false`),
        filter.before && Prisma.sql`AND (j.created_at, l.id) < (${filter.before.createdAt}, ${filter.before.id}::uuid)`,
    ].filter((value): value is Prisma.Sql => Boolean(value));
    const limits = filter.limit === undefined ? Prisma.empty : Prisma.sql`LIMIT ${filter.limit}`;
    return tx.$queryRaw<Debt[]>(Prisma.sql`
        WITH selected AS (
            SELECT l.id, l.shop_id AS "shopId", l.account_id AS "accountId", j.currency, j.created_at AS "createdAt",
                   j.updated_at AS "journalUpdatedAt", j.effective_date AS "effectiveDate", coalesce(s.order_id, r.id) AS "sourceId",
                   CASE WHEN s.id IS NULL THEN 'goods_receipt' ELSE 'order' END AS "sourceType",
                   CASE WHEN s.id IS NULL THEN po.supplier_id ELSE coalesce(s.carrier_id, ${manualCarrierId}::uuid) END AS "counterpartyId",
                   CASE WHEN s.id IS NULL THEN 'supplier' ELSE 'carrier' END AS "counterpartyType",
                   s.order_id AS "orderId", CASE WHEN s.id IS NULL THEN l.credit ELSE l.debit END AS original
            FROM finance_journals j
            JOIN finance_journal_lines l ON l.shop_id=j.shop_id AND l.journal_id=j.id
            JOIN finance_accounts a ON a.shop_id=l.shop_id AND a.id=l.account_id
            LEFT JOIN shipments s ON s.shop_id=j.shop_id AND s.id::text=j.source_id
                AND j.source_type='shipment' AND j.event_type='delivery' AND a.system_key='carrier_receivable' AND l.debit > 0
            LEFT JOIN goods_receipts r ON r.shop_id=j.shop_id AND r.id::text=j.source_id
                AND j.source_type='goods_receipt' AND a.system_key='supplier_payable' AND l.credit > 0
            LEFT JOIN purchase_orders po ON po.shop_id=r.shop_id AND po.id=r.purchase_order_id
            WHERE ${journalScope(shopId, currency)} AND (s.id IS NOT NULL OR r.id IS NOT NULL) ${and.length ? Prisma.join(and, ' ') : Prisma.empty}
            ORDER BY j.created_at DESC, l.id DESC ${limits}
        )
        SELECT s.id, s."shopId", s."accountId", s.currency, s."createdAt", s."sourceId", s."sourceType",
               s."counterpartyId", s."counterpartyType", s."orderId", s."effectiveDate", s.original,
               (1 + allocations.count + returns.count + coalesce(terms.version, 0))::int AS version,
               greatest(s."journalUpdatedAt", allocations.latest, returns.latest, terms.updated_at) AS "updatedAt",
               terms.due_date AS "dueDate", coalesce(terms.dispute_hold, false) AS "disputeHold",
               s.original - allocations.amount - returns.credit AS outstanding
        FROM selected s
        CROSS JOIN LATERAL (
            SELECT coalesce(sum(sa.amount), 0) AS amount, count(*) AS count, max(sa.created_at) AS latest
            FROM settlement_allocations sa WHERE sa.shop_id=s."shopId" AND sa.debt_line_id=s.id
        ) allocations
        CROSS JOIN LATERAL (
            SELECT coalesce(sum(r.receivable_credit), 0) AS credit, count(*) AS count, max(r.updated_at) AS latest
            FROM order_returns r WHERE r.shop_id=s."shopId" AND r.order_id=s."orderId"
              AND r.state='inspected' AND r.receivable_credit > 0
        ) returns
        LEFT JOIN debt_terms terms ON terms.shop_id=s."shopId" AND terms.debt_line_id=s.id
        ORDER BY s."createdAt" DESC, s.id DESC
    `);
}

export async function debtInShop(tx: Prisma.TransactionClient, shopId: string, currency: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const [debt] = await findDebts(tx, shopId, currency, { ids: [id] });
    if (!debt) throw new NotFoundException();
    return debt;
}
