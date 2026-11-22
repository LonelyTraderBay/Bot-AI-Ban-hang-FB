import { Prisma } from '../../generated/prisma/client.js';

type MarketingWindow = { shopId: string; currency: string; timezone: string; fromDate: string; toDate: string };

export async function confirmedOrderMarketing(tx: Prisma.TransactionClient, window: MarketingWindow) {
    const { shopId, currency, timezone, fromDate, toDate } = window;
    const eligible = Prisma.sql`
        SELECT o.id, o.promotion_id, o.promotion_snapshot, o.total,
            (r.created_at AT TIME ZONE ${timezone})::date AS local_day
        FROM sales_orders o JOIN stock_reservations r ON o.shop_id=r.shop_id AND o.reservation_id=r.id
        WHERE o.shop_id=${shopId}::uuid AND o.currency=${currency} AND o.order_state IN ('confirmed','completed')
          AND r.created_at >= (${fromDate}::date::timestamp AT TIME ZONE ${timezone})
          AND r.created_at < ((${toDate}::date + 1)::timestamp AT TIME ZONE ${timezone})
    `;
    const daily = await tx.$queryRaw<{ day: string; orders: number }[]>(Prisma.sql`
        WITH eligible AS (${eligible})
        SELECT local_day::text AS day, count(*)::int AS orders FROM eligible GROUP BY local_day ORDER BY local_day
    `);
    const promotions = await tx.$queryRaw<{ promotionId: string; name: string; orders: number; discount: Prisma.Decimal; netSales: Prisma.Decimal }[]>(Prisma.sql`
        WITH eligible AS (${eligible}), by_order AS (
            SELECT e.promotion_id, e.promotion_snapshot->>'name' AS name, e.local_day, e.id, e.total, sum(l.discount) AS discount
            FROM eligible e JOIN order_lines l ON l.shop_id=${shopId}::uuid AND l.order_id=e.id AND l.retired_at IS NULL
            WHERE e.promotion_id IS NOT NULL AND e.promotion_snapshot->>'name' IS NOT NULL
            GROUP BY e.promotion_id, e.promotion_snapshot->>'name', e.local_day, e.id, e.total
        )
        SELECT promotion_id AS "promotionId", (array_agg(name ORDER BY local_day DESC, id DESC))[1] AS name,
            count(*)::int AS orders, sum(discount) AS discount, sum(total) AS "netSales"
        FROM by_order GROUP BY promotion_id ORDER BY sum(total) DESC, promotion_id
    `);
    return { daily, promotions };
}
