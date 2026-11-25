import { Prisma } from '../../generated/prisma/client.js';

type MarketingWindow = { shopId: string; currency: string; timezone: string; fromDate: string; toDate: string };

export async function confirmedOrderMarketing(tx: Prisma.TransactionClient, window: MarketingWindow, asOf: Date, includeDemand: boolean) {
    const { shopId, currency, timezone, fromDate, toDate } = window;
    const eligible = Prisma.sql`
        SELECT o.id, o.promotion_id, o.promotion_snapshot, o.total,
            (r.created_at AT TIME ZONE ${timezone})::date AS local_day
        FROM sales_orders o JOIN stock_reservations r ON o.shop_id=r.shop_id AND o.reservation_id=r.id
        WHERE o.shop_id=${shopId}::uuid AND o.currency=${currency} AND o.order_state IN ('confirmed','completed')
          AND r.created_at >= (${fromDate}::date::timestamp AT TIME ZONE ${timezone})
          AND r.created_at < ((${toDate}::date + 1)::timestamp AT TIME ZONE ${timezone})
    `;
    const attributed = Prisma.sql`
        SELECT e.*, a.channel, a.campaign_id, a.confidence, a.source_id FROM (${eligible}) e
        LEFT JOIN LATERAL (
            SELECT channel, campaign_id, confidence, source_id FROM marketing_evidence
            WHERE shop_id=${shopId}::uuid AND order_id=e.id AND accounting_date=e.local_day AND recorded_at <= ${asOf}
            ORDER BY revision DESC LIMIT 1
        ) a ON true
    `;
    const daily = await tx.$queryRaw<{ day: string; known: number; estimated: number; unknown: number }[]>(Prisma.sql`
        SELECT local_day::text AS day,
               count(*) FILTER (WHERE confidence='known')::int AS known,
               count(*) FILTER (WHERE confidence='estimated')::int AS estimated,
               count(*) FILTER (WHERE confidence IS NULL)::int AS unknown
        FROM (${attributed}) scoped GROUP BY local_day ORDER BY local_day
    `);
    const campaigns = await tx.$queryRaw<{
        channel: string; campaignId: string; knownOrders: number; estimatedOrders: number; orderId: string; attributionSourceId: string;
    }[]>(Prisma.sql`
        SELECT channel, campaign_id AS "campaignId",
               count(*) FILTER (WHERE confidence='known')::int AS "knownOrders",
               count(*) FILTER (WHERE confidence='estimated')::int AS "estimatedOrders",
               (array_agg(id ORDER BY local_day DESC, id))[1] AS "orderId",
               (array_agg(source_id ORDER BY local_day DESC, id))[1] AS "attributionSourceId"
        FROM (${attributed}) scoped WHERE campaign_id IS NOT NULL
        GROUP BY channel, campaign_id ORDER BY count(*) DESC, channel, campaign_id LIMIT 50
    `);
    const promotions = await tx.$queryRaw<{ promotionId: string; name: string; orders: number; discount: Prisma.Decimal; netSales: Prisma.Decimal; orderId: string }[]>(Prisma.sql`
        WITH eligible AS (${eligible}), by_order AS (
            SELECT e.promotion_id, e.promotion_snapshot->>'name' AS name, e.local_day, e.id, e.total, sum(l.discount) AS discount
            FROM eligible e JOIN order_lines l ON l.shop_id=${shopId}::uuid AND l.order_id=e.id AND l.retired_at IS NULL
            WHERE e.promotion_id IS NOT NULL AND e.promotion_snapshot->>'name' IS NOT NULL
            GROUP BY e.promotion_id, e.promotion_snapshot->>'name', e.local_day, e.id, e.total
        )
        SELECT promotion_id AS "promotionId", (array_agg(name ORDER BY local_day DESC, id DESC))[1] AS name,
            count(*)::int AS orders, sum(discount) AS discount, sum(total) AS "netSales",
            (array_agg(id ORDER BY local_day DESC, id DESC))[1] AS "orderId"
        FROM by_order GROUP BY promotion_id ORDER BY sum(total) DESC, promotion_id
    `);
    const demand = includeDemand ? await tx.$queryRaw<{ variantId: string; sku: string; orderedUnits: number; orderId: string }[]>(Prisma.sql`
        WITH eligible AS (${eligible})
        SELECT l.variant_id AS "variantId",
               (array_agg(l.sku ORDER BY e.local_day DESC, e.id, l.id))[1] AS sku,
               sum(l.quantity)::float8 AS "orderedUnits",
               (array_agg(e.id ORDER BY e.local_day DESC, e.id, l.id))[1] AS "orderId"
        FROM eligible e JOIN order_lines l ON l.shop_id=${shopId}::uuid AND l.order_id=e.id AND l.retired_at IS NULL
        GROUP BY l.variant_id ORDER BY sum(l.quantity) DESC, l.variant_id LIMIT 25
    `) : undefined;
    return { daily, promotions, demand, campaigns };
}
