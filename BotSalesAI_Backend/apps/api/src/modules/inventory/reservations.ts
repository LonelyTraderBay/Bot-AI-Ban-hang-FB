import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, type PrismaClient, type StockReservationStatus } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { serializable } from '../../platform/database/transactions.js';
import { inventoryFingerprint, recordStockMovement } from './stock.js';

type ReservationLine = { warehouseId: string; variantId: string; lineId: string; quantity: number };
type ReservationInput = {
    shopId: string; orderId: string; orderVersion: number; actorId: string; expiresAt: Date; lines: ReservationLine[];
};
type Settlement = {
    shopId: string; id: string; actorId: string; expectedVersion: number;
    status: Exclude<StockReservationStatus, 'active'>; reason: string;
};

function compareLine(a: ReservationLine, b: ReservationLine) {
    const first = a.warehouseId + a.variantId + a.lineId;
    const second = b.warehouseId + b.variantId + b.lineId;
    return first < second ? -1 : first > second ? 1 : 0;
}

export async function reserveStock(tx: Prisma.TransactionClient, input: ReservationInput, now = new Date()) {
    const { shopId, orderId, orderVersion, actorId, expiresAt } = input;
    if (![shopId, orderId, actorId].every(validUuid) || !Number.isInteger(orderVersion) || orderVersion < 1 ||
        !Number.isFinite(expiresAt.getTime()) || input.lines.length === 0 || input.lines.length > 200) {
        throw new UnprocessableEntityException();
    }
    const lines = input.lines.map(({ warehouseId, variantId, lineId, quantity }) => ({ warehouseId, variantId, lineId, quantity }))
        .sort(compareLine);
    if (new Set(lines.map(line => line.lineId)).size !== lines.length ||
        lines.some(line => ![line.warehouseId, line.variantId, line.lineId].every(validUuid) || !Number.isInteger(line.quantity) || line.quantity <= 0)) {
        throw new UnprocessableEntityException();
    }
    const source = { shopId, orderId, orderVersion };
    const requestHash = inventoryFingerprint({ source, actorId, expiresAt, lines });
    const recorded = await tx.stockReservation.findUnique({ where: { shopId_orderId_orderVersion: source } });
    if (recorded) {
        if (recorded.requestHash !== requestHash) throw new ConflictException();
        return recorded;
    }
    if (expiresAt <= now || await tx.stockReservation.findFirst({ where: { shopId, orderId, status: 'active' }, select: { id: true } })) {
        throw new ConflictException();
    }
    const reservation = await tx.stockReservation.create({ data: { ...source, actorId, expiresAt, requestHash } });
    for (const line of lines) {
        await recordStockMovement(tx, {
            shopId, warehouseId: line.warehouseId, variantId: line.variantId, actorId, kind: 'reserve',
            source: { type: 'stock_reservation', id: reservation.id, lineId: line.lineId },
            reason: 'Giữ hàng cho đơn', delta: { reserved: line.quantity },
        });
    }
    await tx.stockReservationLine.createMany({ data: lines.map(line => ({ ...line, shopId, reservationId: reservation.id })) });
    return reservation;
}

export async function settleStockReservation(tx: Prisma.TransactionClient, change: Settlement, now = new Date()) {
    const { shopId, id, actorId, expectedVersion, status } = change;
    if (![shopId, id, actorId].every(validUuid) || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
        throw new UnprocessableEntityException();
    }
    const [locked] = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT id FROM stock_reservations WHERE shop_id = ${shopId}::uuid AND id = ${id}::uuid FOR UPDATE
    `);
    if (!locked) throw new NotFoundException();
    const where = { shopId_id: { shopId, id } };
    const current = await tx.stockReservation.findUniqueOrThrow({ where, include: { lines: true } });
    const replay = current.status === status && current.version === expectedVersion + 1;
    if (!replay && (current.status !== 'active' || current.version !== expectedVersion ||
        (status === 'consumed' && current.expiresAt <= now) || (status === 'expired' && current.expiresAt > now))) {
        throw new ConflictException();
    }
    const consumed = status === 'consumed';
    for (const line of [...current.lines].sort(compareLine)) {
        await recordStockMovement(tx, {
            shopId, warehouseId: line.warehouseId, variantId: line.variantId, actorId,
            kind: consumed ? 'fulfillment' : 'release',
            source: { type: 'stock_reservation', id, lineId: line.lineId },
            reason: change.reason,
            delta: { reserved: -line.quantity, ...(consumed ? { onHand: -line.quantity, transit: line.quantity } : {}) },
        });
    }
    if (replay) return current;
    return tx.stockReservation.update({
        where, data: { status, settledAt: now, version: { increment: 1 } }, include: { lines: true },
    });
}

export async function expireStockReservations(db: PrismaClient, now = new Date(), limit = 50) {
    const due = await db.stockReservation.findMany({
        where: { status: 'active', expiresAt: { lte: now } },
        orderBy: [{ expiresAt: 'asc' }, { shopId: 'asc' }, { id: 'asc' }], take: limit,
        select: { shopId: true, id: true, actorId: true, version: true },
    });
    for (const reservation of due) {
        try {
            await serializable(db, tx => settleStockReservation(tx, {
                shopId: reservation.shopId, id: reservation.id, actorId: reservation.actorId,
                expectedVersion: reservation.version, status: 'expired', reason: 'Giữ hàng đã hết hạn',
            }, now), false);
        } catch (error) {
            if (!(error instanceof ConflictException)) throw error;
        }
    }
}
