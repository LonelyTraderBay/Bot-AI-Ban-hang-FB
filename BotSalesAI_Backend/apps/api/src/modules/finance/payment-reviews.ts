import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { Prisma } from '../../generated/prisma/client.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging } from '../../http/query.js';
import { envelope, noStore } from '../../http/response.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { FinanceAccess } from './access.js';
import { financeMoney, financeShop } from './journal.js';

type ReviewRow = {
    id: string; orderId: string; kind: 'collection' | 'refund'; status: string;
    expected: Prisma.Decimal; verified: Prisma.Decimal; createdAt: Date;
};
const unique = (values: (string | null | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort();

function reviewFacts(shopId: string, currency: string) {
    return Prisma.sql`
        WITH facts AS (
            SELECT o.id AS "orderId", o.order_state, o.payment_state, o.payment_method,
                   o.fulfillment_state, (o.fulfillment_state IN ('delivered','part_returned','returned')
                     OR EXISTS (SELECT 1 FROM shipments s WHERE s.shop_id=o.shop_id AND s.order_id=o.id AND s.delivered_at IS NOT NULL)) AS delivered,
                   greatest(o.updated_at, payments.latest, allocations.latest, returns.latest) AS "createdAt",
                   greatest(0, o.total-returns.credit) AS expected, payments.receipts + allocations.applied - allocations.overlap AS verified,
                   payments.banked + allocations.applied AS banked, returns.obligation + payments.early_refunds AS refund_due,
                   payments.refunds AS refunded
            FROM sales_orders o
            CROSS JOIN LATERAL (
                SELECT coalesce(sum(e.amount) FILTER (WHERE e.kind='receipt'),0) AS receipts,
                       coalesce(sum(e.amount) FILTER (WHERE e.kind='receipt' AND e.journal_id IS NOT NULL),0) AS banked,
                       coalesce(sum(e.amount) FILTER (WHERE e.kind='disbursement'),0) AS refunds,
                       coalesce(sum(e.amount) FILTER (WHERE e.kind='disbursement' AND e.source_type='order_refund'),0) AS early_refunds,
                       max(e.updated_at) AS latest
                FROM finance_entries e WHERE e.shop_id=o.shop_id AND e.order_id=o.id AND e.currency=o.currency AND e.status='posted'
            ) payments
            CROSS JOIN LATERAL (
                SELECT coalesce(sum(a.amount),0) AS applied, coalesce(sum(linked.applied),0) AS overlap, max(a.created_at) AS latest
                FROM settlement_allocations a
                CROSS JOIN LATERAL (
                    SELECT coalesce(sum(c.amount),0) AS applied FROM collection_applications c WHERE c.shop_id=a.shop_id AND c.allocation_id=a.id
                ) linked
                WHERE a.shop_id=o.shop_id AND a.order_id=o.id
            ) allocations
            CROSS JOIN LATERAL (
                SELECT coalesce(sum(r.receivable_credit),0) AS credit, coalesce(sum(r.refund_obligation),0) AS obligation, max(r.updated_at) AS latest
                FROM order_returns r WHERE r.shop_id=o.shop_id AND r.order_id=o.id AND r.state='inspected'
            ) returns
            WHERE o.shop_id=${shopId}::uuid AND o.currency=${currency}
        ), reviews AS (
            SELECT md5("orderId"::text || '/collection')::uuid AS id, "orderId", order_state, 'collection' AS kind, "createdAt", expected, verified,
                   CASE WHEN verified > expected OR verified < 0 OR (payment_state='settled' AND verified <> expected) THEN 'needs_check'
                        WHEN payment_method='cod' AND delivered AND banked < expected AND verified IN (0, expected) THEN 'cod_pending'
                        WHEN verified = expected THEN 'settled'
                        WHEN verified > 0 THEN 'partial' ELSE 'unpaid' END AS status
            FROM facts WHERE expected > 0 AND order_state <> 'cancelled' AND (order_state <> 'draft' OR payment_method='prepay')
            UNION ALL
            SELECT md5("orderId"::text || '/refund')::uuid AS id, "orderId", order_state, 'refund' AS kind, "createdAt", refund_due, refunded,
                   CASE WHEN refunded > refund_due OR (refunded < refund_due AND verified < refund_due) THEN 'needs_check'
                        WHEN refunded = refund_due THEN 'settled' ELSE 'refund_due' END AS status
            FROM facts WHERE refund_due > 0
        )
    `;
}

export async function hasUnsettledPayments(tx: Prisma.TransactionClient, shopId: string, currency: string) {
    const [row] = await tx.$queryRaw<{ open: boolean }[]>`
        ${reviewFacts(shopId, currency)}
        SELECT EXISTS (SELECT 1 FROM reviews WHERE status <> 'settled'
            AND (order_state <> 'draft' OR verified <> 0 OR kind = 'refund')) AS open
    `;
    return row.open;
}

export class PaymentReviews extends FinanceAccess {
    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, scope) => {
            const query = listQuery(raw, 'paymentReviews');
            const { currency } = await financeShop(tx, shopId);
            const page = paging(query, ['payment_reviews', shopId, scope.userId, String(scope.permissionVersion), query.kind ?? '', query.stage ?? '']);
            const kind = query.kind ? Prisma.sql`AND kind = ${query.kind}` : Prisma.empty;
            const stage = query.stage === 'settled' ? Prisma.sql`AND status='settled'` :
                query.stage === 'open' ? Prisma.sql`AND status <> 'settled'` : Prisma.empty;
            const after = page.position ? Prisma.sql`AND ("createdAt", id) < (${page.position.createdAt}, ${page.position.id}::uuid)` : Prisma.empty;
            const pattern = '%' + page.keyword + '%';
            const search = !page.keyword ? Prisma.empty : Prisma.sql`AND (
                "orderId"::text ILIKE ${pattern}
                OR EXISTS (SELECT 1 FROM finance_entries e WHERE e.shop_id=${shopId}::uuid AND e.order_id="orderId"
                     AND (e.payment_reference ILIKE ${pattern} OR e.id::text ILIKE ${pattern} OR e.evidence_id::text ILIKE ${pattern}
                        OR e.journal_id::text ILIKE ${pattern}))
                OR EXISTS (SELECT 1 FROM settlement_allocations a JOIN bank_transactions b ON b.shop_id=a.shop_id AND b.id=a.transaction_id
                     WHERE a.shop_id=${shopId}::uuid AND a.order_id="orderId" AND (b.external_transaction_id ILIKE ${pattern}
                        OR b.id::text ILIKE ${pattern} OR a.cod_settlement_id::text ILIKE ${pattern} OR a.journal_id::text ILIKE ${pattern}))
                OR EXISTS (SELECT 1 FROM order_returns r WHERE r.shop_id=${shopId}::uuid AND r.order_id="orderId" AND r.id::text ILIKE ${pattern})
            )`;
            const result = page.result(await tx.$queryRaw<ReviewRow[]>(Prisma.sql`
                ${reviewFacts(shopId, currency)}
                SELECT id, "orderId", kind, "createdAt", expected, verified, status
                FROM reviews WHERE true ${kind} ${stage} ${after} ${search}
                ORDER BY "createdAt" DESC, id DESC LIMIT ${page.limit + 1}
            `));

            const orderIds = [...new Set(result.data.map(row => row.orderId))];
            if (!orderIds.length) return { ...result, data: [] };
            const sources = await tx.salesOrder.findMany({
                where: { shopId, id: { in: orderIds } },
                select: {
                    id: true, shipments: { select: { id: true, returns: { where: { state: 'inspected' }, select: { id: true } } } },
                    moneyEntries: { where: { currency, status: 'posted' }, select: {
                        id: true, kind: true, evidenceId: true, paymentReference: true, journalId: true,
                        evidence: { select: { bankTransaction: { select: { id: true } } } },
                    } },
                    codSettlementOrder: { select: { settlementId: true } },
                    settlementAllocations: { select: { journalId: true, transactionId: true, codSettlementId: true,
                        journal: { select: { financeEntry: { select: { id: true } } } },
                        transaction: { select: { externalTransactionId: true } },
                    } },
                },
            });
            const shipmentIds = sources.flatMap(item => item.shipments.map(source => source.id));
            const returnIds = sources.flatMap(item => item.shipments.flatMap(shipment => shipment.returns.map(source => source.id)));
            const journals = await tx.financeJournal.findMany({ where: { shopId, currency, status: { in: ['posted', 'reversed'] },
                OR: [{ sourceType: 'shipment', eventType: 'delivery', sourceId: { in: shipmentIds } },
                    { sourceType: 'return_case', eventType: 'inspect', sourceId: { in: returnIds } }] },
                select: { id: true, sourceId: true },
            });
            const bankIds = unique(sources.flatMap(order => [...order.settlementAllocations.map(allocation => allocation.transactionId),
                ...order.moneyEntries.map(entry => entry.evidence?.bankTransaction?.id)]));
            const work = await tx.workItem.findMany({
                where: { shopId, kind: 'payment_mismatch', state: { notIn: ['completed', 'cancelled'] },
                    OR: [{ sourceType: 'order', sourceId: { in: orderIds } }, { sourceType: 'bank_transaction', sourceId: { in: bankIds } }] },
                orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
                select: { id: true, sourceType: true, sourceId: true, assigneeUserId: true, dueAt: true },
            });
            const mayReadPhotos = scope.permissions.includes('finance.reconcile');
            const photos = mayReadPhotos ? await tx.fileObject.findMany({ where: { shopId, purpose: 'payment_evidence_image',
                status: 'ready', resourceId: { in: orderIds } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                select: { id: true, resourceId: true, createdAt: true } }) : [];
            const photosByOrder = new Map<string, typeof photos>();
            for (const file of photos) {
                if (!file.resourceId) continue;
                const group = photosByOrder.get(file.resourceId);
                if (group) group.push(file);
                else photosByOrder.set(file.resourceId, [file]);
            }
            const byId = new Map(sources.map(order => [order.id, order]));
            const money = (amount: Prisma.Decimal) => financeMoney(amount, currency);
            return { ...result, data: result.data.map(row => {
                const order = byId.get(row.orderId)!;
                const returns = order.shipments.flatMap(shipment => shipment.returns);
                const collection = row.kind === 'collection';
                const allocations = collection ? order.settlementAllocations : [];
                const entries = order.moneyEntries.filter(entry => entry.kind === (collection ? 'receipt' : 'disbursement'));
                const orderBanks = unique([...allocations.map(allocation => allocation.transactionId),
                    ...entries.map(entry => entry.evidence?.bankTransaction?.id)]);
                const assignment = work.find(item => (item.sourceType === 'order' && item.sourceId === row.orderId) ||
                    (item.sourceType === 'bank_transaction' && orderBanks.includes(item.sourceId)));
                const sourceIds = new Set((collection ? order.shipments : returns).map(item => item.id));
                return {
                    id: row.id, orderId: row.orderId, kind: row.kind, status: row.status,
                    expected: money(row.expected), verified: row.verified.lt(0) ? null : money(row.verified),
                    remaining: row.status === 'needs_check' ? null : money(new ExactDecimal(row.expected).minus(row.verified)),
                    dueAt: assignment?.dueAt ?? null, assigneeUserId: assignment?.assigneeUserId ?? null, workItemId: assignment?.id ?? null,
                    returnIds: unique(returns.map(item => item.id)),
                    financeEntryIds: unique([...entries.map(item => item.id), ...allocations.map(item => item.journal.financeEntry?.id)]),
                    journalIds: unique([...entries.map(item => item.journalId), ...allocations.map(item => item.journalId),
                        ...journals.filter(journal => sourceIds.has(journal.sourceId)).map(journal => journal.id)]),
                    bankTransactionIds: orderBanks,
                    codSettlementIds: unique([...allocations.map(item => item.codSettlementId), ...(collection ? [order.codSettlementOrder?.settlementId] : [])]),
                    references: unique([...entries.flatMap(item => [item.evidenceId, item.paymentReference]), ...allocations.map(item => item.transaction.externalTransactionId)]),
                    ...(collection && mayReadPhotos ? { pendingTransferImages: (photosByOrder.get(row.orderId) ?? []).map(photo => ({
                        fileId: photo.id, status: 'pending_review' as const, createdAt: photo.createdAt,
                    })) } : {}),
                    updatedAt: row.createdAt,
                };
            }) };
        });
    }
}

@Controller('shops/:shopId/payment-reviews')
export class PaymentReviewsController {
    constructor(private readonly reviews: PaymentReviews) {}

    @Get()
    @ContractOperation('listPaymentReviews')
    async list(@Param('shopId', idPipe) shopId: string, @Query() raw: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.reviews.list(request.headers, shopId, raw);
        return { ...envelope(response, data), page };
    }
}
