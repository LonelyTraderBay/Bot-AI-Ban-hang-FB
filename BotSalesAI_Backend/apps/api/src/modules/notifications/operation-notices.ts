import { Prisma, type PrismaClient, type WorkItemKind } from '../../generated/prisma/client.js';
import { serializable } from '../../platform/database/transactions.js';
import { lockAutomationFence } from '../operations/index.js';
import { permissionsFor } from '../workspace/index.js';
import { deliverNotification } from './deliveries.js';
import { notificationBlockedByQuietHours, notificationPriorities, type EventPriorities } from './event-priorities.js';

const notices: readonly {
    event: Exclude<keyof EventPriorities, 'order'>;
    kinds: readonly WorkItemKind[];
    title: string;
    permission: string;
}[] = [
    { event: 'lateShipment', kinds: ['late_shipment'], title: 'Vận đơn cần kiểm tra', permission: 'fulfillment.read' },
    { event: 'lowStock', kinds: ['low_stock'], title: 'Tồn kho dưới ngưỡng', permission: 'inventory.read' },
    { event: 'paymentMismatch', kinds: ['payment_mismatch', 'unmatched_bank'], title: 'Khoản tiền cần đối chiếu', permission: 'finance.read' },
    { event: 'operationalError', kinds: ['recovery'], title: 'Công việc cần đối chiếu kết quả', permission: 'operations.read' },
];

export async function publishOperationNotices(db: PrismaClient, now = new Date()) {
    const policies = await db.notificationPolicy.findMany({
        where: { enabled: true, NOT: { eventPriorities: { equals: Prisma.DbNull } } }, select: { shopId: true },
    });
    for (const { shopId } of policies) {
        await serializable(db, async tx => {
            if ((await lockAutomationFence(tx, shopId)).paused) return;
            const policy = await tx.notificationPolicy.findUnique({ where: { shopId } });
            if (!policy?.enabled) return;
            const priorities = notificationPriorities(policy);
            const active = notices.filter(({ event }) => priorities[event] !== 'off' &&
                !notificationBlockedByQuietHours(policy, priorities[event], now))
                .sort((a, b) => Number(priorities[b.event] === 'urgent') - Number(priorities[a.event] === 'urgent'));
            if (!active.length) return;

            const recipients = await tx.membership.findMany({
                where: { shopId, userId: { in: [...policy.primaryUserIds, ...policy.fallbackUserIds] }, status: 'active' },
                select: { userId: true, roles: true },
            });
            const eligible = recipients.map(({ userId, roles }) => ({ userId, granted: permissionsFor(roles) }))
                .filter(({ granted }) => granted.includes('notifications.read') && granted.includes('operations.read'));

            for (const { event, kinds, title, permission } of active) {
                const allowed = eligible.filter(({ granted }) => granted.includes(permission));
                const primary = allowed.filter(({ userId }) => policy.primaryUserIds.includes(userId));
                const targets = primary.length ? primary : allowed.filter(({ userId }) => policy.fallbackUserIds.includes(userId));
                for (const { userId } of targets) {
                    const awaiting = await tx.$queryRaw<{ id: string; intent: string }[]>`
                        WITH candidates AS (
                            SELECT w.id, w.updated_at, encode(sha256(convert_to(
                              'ops-notice:' || w.id::text || ':' ||
                              COALESCE((EXTRACT(EPOCH FROM w.due_at) * 1000)::bigint::text, 'once'), 'UTF8')), 'hex') AS intent
                            FROM work_items w
                            WHERE w.shop_id = ${shopId}::uuid AND w.kind::text IN (${Prisma.join(kinds)})
                              AND w.state IN ('queued', 'claimed', 'working', 'blocked')
                        )
                        SELECT c.id, c.intent FROM candidates c
                        WHERE NOT EXISTS (SELECT 1 FROM app_notifications n
                            WHERE n.shop_id = ${shopId}::uuid AND n.recipient_user_id = ${userId}::uuid
                              AND n.channel = 'in_app' AND n.delivery_intent = c.intent)
                        ORDER BY c.updated_at, c.id LIMIT 10
                    `;
                    for (const item of awaiting) await deliverNotification(tx, {
                        shopId, sourceType: 'work_item', sourceId: item.id, workItemId: item.id, recipientUserId: userId,
                        title: priorities[event] === 'urgent' ? 'Khẩn · ' + title : title,
                        safeBody: 'Mở hàng ngoại lệ để xem công việc trong cửa hàng.', channel: 'in_app',
                    }, item.intent);
                }
            }
        }, true);
    }
}
