import { lockShopClosure } from '../../platform/database/shop-lifecycle.js';
import { Prisma, type PrismaClient, type WorkItemKind } from '../../generated/prisma/client.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { serializable } from '../../platform/database/transactions.js';
import { createWorkItem, setWorkState } from './index.js';

type Source = { shopId: string; sourceId: string; dueAt: Date; workId: string | null };
type ExceptionRule = {
    kind: WorkItemKind;
    sourceType: string;
    sources: (now: Date) => Prisma.Sql;
};

const ruleVersion = 'operations.exceptions.v1';
const cooldownMs = 30 * 60 * 1000;
const active = Prisma.sql`('queued', 'claimed', 'working', 'blocked')`;
const batchSize = 32;
const rules: readonly ExceptionRule[] = [
    {
        kind: 'customer_handoff', sourceType: 'conversation',
        sources: now => Prisma.sql`
            SELECT c.shop_id, c.id AS source_id, c.last_inbound_at + interval '15 minutes' AS due_at
            FROM channel_conversations c
            JOIN channel_connections ch ON (ch.shop_id, ch.id) = (c.shop_id, c.channel_id)
            JOIN customers customer ON (customer.shop_id, customer.id) = (c.shop_id, c.customer_id)
            WHERE c.status = 'open' AND ch.status = 'connected' AND customer.privacy_erased_at IS NULL
              AND c.last_inbound_at <= ${now}::timestamptz - interval '15 minutes'
              AND NOT EXISTS (
                SELECT 1 FROM channel_messages m
                WHERE (m.shop_id, m.conversation_id) = (c.shop_id, c.id)
                  AND m.direction = 'outbound' AND m.status IN ('sent', 'delivered', 'read')
                  AND m.created_at >= c.last_inbound_at
              )
        `,
    },
    {
        kind: 'late_shipment', sourceType: 'shipment',
        sources: now => Prisma.sql`
            SELECT shop_id, id AS source_id, handed_over_at + interval '48 hours' AS due_at
            FROM shipments
            WHERE state IN ('handed_over', 'in_transit')
              AND handed_over_at <= ${now}::timestamptz - interval '48 hours'
        `,
    },
    {
        kind: 'low_stock', sourceType: 'stock_position',
        sources: now => Prisma.sql`
            SELECT p.shop_id, p.id AS source_id, LEAST(p.updated_at, ${now}::timestamptz) AS due_at
            FROM stock_positions p
            JOIN warehouses w ON (w.shop_id, w.id) = (p.shop_id, p.warehouse_id)
            JOIN variants v ON (v.shop_id, v.id) = (p.shop_id, p.variant_id)
            JOIN products product ON (product.shop_id, product.id) = (v.shop_id, v.product_id)
            WHERE w.status = 'active' AND v.active AND v.archived_at IS NULL AND product.status = 'active'
              AND p.low_stock_threshold > 0 AND p.on_hand - p.reserved <= p.low_stock_threshold
        `,
    },
    {
        kind: 'unmatched_bank', sourceType: 'reconciliation_case',
        sources: now => Prisma.sql`
            SELECT shop_id, id AS source_id, created_at + interval '24 hours' AS due_at
            FROM reconciliation_cases
            WHERE state <> 'matched' AND difference > 0
              AND created_at <= ${now}::timestamptz - interval '24 hours'
        `,
    },
];

export async function refreshOperationExceptions(db: PrismaClient, now = new Date()) {
    const reopenBefore = new Date(now.getTime() - cooldownMs);
    for (const rule of rules) {
        await serializable(db, async tx => {
            const sourceQuery = rule.sources(now);
            const resolved = await tx.$queryRaw<{ shopId: string; id: string }[]>`
                WITH sources AS (${sourceQuery})
                SELECT w.shop_id AS "shopId", w.id
                FROM work_items w JOIN shops shop ON shop.id = w.shop_id AND shop.closed_at IS NULL
                WHERE w.kind = ${rule.kind}::work_item_kind AND w.source_type = ${rule.sourceType}
                  AND w.rule_version IS NOT NULL AND w.state IN ${active}
                  AND NOT EXISTS (
                    SELECT 1 FROM sources s WHERE (s.shop_id, s.source_id) = (w.shop_id, w.source_id)
                  )
                ORDER BY w.updated_at, w.shop_id, w.id LIMIT ${batchSize}
            `;

            const open = await tx.$queryRaw<Source[]>`
                WITH sources AS (${sourceQuery})
                SELECT s.shop_id AS "shopId", s.source_id AS "sourceId", s.due_at AS "dueAt", w.id AS "workId"
                FROM sources s JOIN shops shop ON shop.id = s.shop_id AND shop.closed_at IS NULL
                LEFT JOIN work_items w ON (w.shop_id, w.source_id) = (s.shop_id, s.source_id)
                    AND w.kind = ${rule.kind}::work_item_kind AND w.source_type = ${rule.sourceType}
                WHERE w.id IS NULL OR (w.rule_version IS NOT NULL AND w.state NOT IN ${active}
                    AND w.updated_at <= ${reopenBefore}::timestamptz)
                ORDER BY s.due_at, s.shop_id, s.source_id LIMIT ${batchSize}
            `;
            const activeShops = new Set<string>();
            const candidates = new Set([...resolved, ...open].map(row => row.shopId));
            for (const shopId of [...candidates].sort()) {
                if (!await lockShopClosure(tx, shopId)) activeShops.add(shopId);
            }
            for (const row of resolved) {
                if (activeShops.has(row.shopId)) await setWorkState(tx, row.shopId, row.id, 'completed');
            }
            for (const { shopId, sourceId, dueAt, workId } of open) {
                if (!activeShops.has(shopId)) continue;
                if (!workId) {
                    await createWorkItem(tx, { shopId, sourceId, dueAt, ruleVersion, kind: rule.kind, sourceType: rule.sourceType });
                    continue;
                }
                const reopened = await tx.workItem.update({
                    where: { shopId_id: { shopId, id: workId } },
                    data: { state: 'queued', dueAt, ruleVersion, assigneeUserId: null, blockedReason: null, version: { increment: 1 } },
                });
                await enqueueResourceUpdate(tx, 'work_item.updated', reopened);
            }
        }, true);
    }
}
