import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { recordAudit } from '../../platform/audit/index.js';
import { serializable } from '../../platform/database/transactions.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { settleStockReservation } from '../inventory/index.js';
import { orderKey } from './order-data.js';

const expirable = { orderState: 'confirmed', fulfillmentState: 'reserved', paymentState: 'unpaid' } as const;

export async function expireOrdersWithReservations(db: PrismaClient, now = new Date()) {
    const due = await db.salesOrder.findMany({
        where: { ...expirable, reservation: { status: 'active', expiresAt: { lte: now } } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 50,
        select: { shopId: true, id: true },
    });
    for (const { shopId, id } of due) {
        await serializable(db, async tx => {
            const order = await tx.salesOrder.findFirst({
                where: { ...expirable, shopId, id, reservation: { status: 'active', expiresAt: { lte: now } } },
                include: { reservation: { select: { id: true, actorId: true, version: true } } },
            });
            if (!order?.reservation) return;
            const hold = order.reservation;
            const reason = 'Đơn quá hạn giữ hàng';
            await settleStockReservation(tx, {
                shopId, id: hold.id, actorId: hold.actorId, status: 'expired', expectedVersion: hold.version, reason,
            }, now);
            const expired = await tx.salesOrder.update({
                where: orderKey(shopId, id),
                data: { orderState: 'cancelled', fulfillmentState: 'unfulfilled', version: { increment: 1 } },
            });
            await recordAudit(tx, {
                shopId, actorId: null, action: 'expireOrderReservation', requestId: randomUUID(),
                resourceType: 'order', resourceId: id, metadata: { reason, version: expired.version },
            });
            await enqueueResourceUpdate(tx, 'order.updated', expired);
        }, false);
    }
}
