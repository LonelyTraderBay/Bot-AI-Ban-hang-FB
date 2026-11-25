import { ConflictException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';

// Compare each shipment line with the stock issue used at handover. A recorded zero cost is valid.
const issuedShipmentCost = Prisma.sql`
    SELECT coalesce(sum(l.cost_value), 0) AS cost,
           count(*) > 0 AND bool_and(m.id IS NOT NULL) AS complete
    FROM sales_orders o
    JOIN order_lines ol ON (ol.shop_id, ol.order_id) = (o.shop_id, o.id) AND ol.retired_at IS NULL
    LEFT JOIN shipment_lines l ON (l.shop_id, l.shipment_id, l.order_line_id) = (s.shop_id, s.id, ol.id)
    LEFT JOIN stock_reservations r ON (r.shop_id, r.id, r.order_id) = (o.shop_id, o.reservation_id, o.id)
        AND r.status = 'consumed'
    LEFT JOIN stock_movements m ON (m.shop_id, m.source_id, m.source_line_id) = (r.shop_id, r.id, ol.id)
        AND m.source_type = 'stock_reservation' AND m.kind = 'fulfillment'
        AND m.warehouse_id = s.warehouse_id AND m.variant_id = ol.variant_id
        AND l.quantity = ol.quantity AND m.quantity_delta = -l.quantity AND m.transit_delta = l.quantity
        AND m.carrying_delta = -l.cost_value
    WHERE (o.shop_id, o.id) = (s.shop_id, s.order_id)
`;

function shipmentJournalCost(event: 'handover' | 'delivery', account: 'inventory_transit' | 'cost_of_goods') {
    return Prisma.sql`
        SELECT coalesce(sum(l.debit - l.credit), 0)
        FROM finance_journals j
        JOIN finance_journal_lines l ON (l.shop_id, l.journal_id) = (j.shop_id, j.id)
        JOIN finance_accounts a ON (a.shop_id, a.id) = (l.shop_id, l.account_id)
        WHERE j.shop_id = s.shop_id AND j.currency = s.currency AND j.source_type = 'shipment'
          AND j.source_id = s.id::text AND j.event_type = ${event} AND j.status = 'posted'
          AND a.system_key = ${account}
    `;
}

const handoverCost = shipmentJournalCost('handover', 'inventory_transit');

export async function requireShipmentCost(tx: Prisma.TransactionClient, shopId: string, shipmentId: string) {
    const [issue] = await tx.$queryRaw<{ cost: Prisma.Decimal; valid: boolean }[]>`
        SELECT issue.cost, issue.complete AND issue.cost = (${handoverCost}) AS valid
        FROM shipments s CROSS JOIN LATERAL (${issuedShipmentCost}) issue
        WHERE s.shop_id = ${shopId}::uuid AND s.id = ${shipmentId}::uuid
    `;
    if (!issue?.valid) throw new ConflictException('Chứng từ giá vốn giao hàng thiếu hoặc không khớp.');
    return issue.cost;
}

export async function hasIncompleteShipmentCost(tx: Prisma.TransactionClient, shopId: string, currency: string,
    timezone: string, firstDay: string, lastDay: string) {
    const [result] = await tx.$queryRaw<{ incomplete: boolean }[]>`
        SELECT EXISTS (
            SELECT 1
            FROM shipments s CROSS JOIN LATERAL (${issuedShipmentCost}) issue
            WHERE s.shop_id = ${shopId}::uuid AND s.currency = ${currency} AND s.state = 'delivered'
              AND s.delivered_at >= (${firstDay}::date::timestamp AT TIME ZONE ${timezone})
              AND s.delivered_at < ((${lastDay}::date + 1)::timestamp AT TIME ZONE ${timezone})
              AND (NOT issue.complete OR issue.cost <> (${handoverCost})
                   OR issue.cost <> (${shipmentJournalCost('delivery', 'cost_of_goods')}))
        ) AS incomplete
    `;
    return result.incomplete;
}
