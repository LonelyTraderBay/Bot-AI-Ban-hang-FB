import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma, type StockMovementKind } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { ExactDecimal as Decimal, proportionalAmount } from '../../platform/money/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';

type StockKey = { shopId: string; warehouseId: string; variantId: string };
type Delta = { onHand?: number; reserved?: number; quarantine?: number; transit?: number; inbound?: number };
export type StockMovementInput = StockKey & {
    actorId: string;
    kind: StockMovementKind;
    source: { type: string; id: string; lineId?: string };
    reason: string;
    delta: Delta;
    receivedValue?: string;
    expectedVersion?: number;
};

const maxQuantity = 2147483647;
const valuePattern = /^(0|[1-9]\d*)(\.\d{1,18})?$/;

export function inventoryFingerprint(value: object) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function units(value: number) {
    return Number.isInteger(value) && Math.abs(value) <= maxQuantity;
}

export async function lockWarehouse(tx: Prisma.TransactionClient, shopId: string, warehouseId: string, archive = false) {
    if (!validUuid(warehouseId)) throw new NotFoundException();
    const [locked] = await tx.$queryRaw<{ status: 'active' | 'archived' }[]>(Prisma.sql`
        SELECT status FROM warehouses WHERE shop_id = ${shopId}::uuid AND id = ${warehouseId}::uuid
        ${archive ? Prisma.sql`FOR UPDATE` : Prisma.sql`FOR SHARE`}
    `);
    if (!locked) throw new NotFoundException();
    return locked;
}

async function lockVariant(tx: Prisma.TransactionClient, shopId: string, variantId: string) {
    if (!validUuid(variantId)) throw new NotFoundException();
    const [locked] = await tx.$queryRaw<{ sku: string; active: boolean; archivedAt: Date | null; productStatus: string }[]>(Prisma.sql`
        SELECT v.sku, v.active, v.archived_at AS "archivedAt", p.status AS "productStatus"
        FROM variants v JOIN products p ON p.shop_id = v.shop_id AND p.id = v.product_id
        WHERE v.shop_id = ${shopId}::uuid AND v.id = ${variantId}::uuid
        FOR SHARE OF p, v
    `);
    if (!locked) throw new NotFoundException();
    return locked;
}

const nonemptyPosition = [
    { onHand: { gt: 0 } }, { reserved: { gt: 0 } }, { quarantine: { gt: 0 } }, { transit: { gt: 0 } }, { inbound: { gt: 0 } },
] satisfies Prisma.StockPositionWhereInput[];

export async function requireVariantsClear(tx: Prisma.TransactionClient, shopId: string, ids: string[]) {
    if (ids.length && await tx.stockPosition.findFirst({
        where: { shopId, variantId: { in: ids }, OR: nonemptyPosition }, select: { id: true },
    })) throw new ConflictException();
}

export async function requireWarehouseClear(tx: Prisma.TransactionClient, shopId: string, warehouseId: string) {
    if (await tx.stockPosition.findFirst({
        where: { shopId, warehouseId, OR: nonemptyPosition }, select: { id: true },
    })) throw new ConflictException();
    if (await tx.salesOrder.findFirst({
        where: { shopId, warehouseId, orderState: { in: ['draft', 'confirmed'] } }, select: { id: true },
    })) throw new ConflictException();
    if (await tx.stockTransfer.findFirst({
        where: { shopId, toWarehouseId: warehouseId, status: 'in_transit' }, select: { id: true },
    })) throw new ConflictException();
    if (await tx.stocktake.findFirst({
        where: { shopId, warehouseId, status: { in: ['counting', 'submitted'] } }, select: { id: true },
    })) throw new ConflictException();
}

export function sellableStockPositions(tx: Prisma.TransactionClient, shopId: string, warehouseId: string, variantIds: string[]) {
    return tx.stockPosition.findMany({
        where: { shopId, warehouseId, variantId: { in: variantIds } }, select: { variantId: true, onHand: true, reserved: true, carryingValue: true },
    });
}

export async function sellableAvailability(tx: Prisma.TransactionClient, shopId: string, warehouseId: string, ids: string[]) {
    const rows = await sellableStockPositions(tx, shopId, warehouseId, ids);
    return new Map(rows.map(row => [row.variantId, row.onHand - row.reserved]));
}

export async function createDefaultStockPositions(tx: Prisma.TransactionClient, shopId: string, variantIds: string[]) {
    if (!variantIds.length) return;
    const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { defaultWarehouseId: true } });
    await tx.stockPosition.createMany({
        data: variantIds.map(variantId => ({ shopId, variantId, warehouseId: shop.defaultWarehouseId })),
    });
}

export async function recordStockMovement(tx: Prisma.TransactionClient, input: StockMovementInput) {
    const { shopId, warehouseId, variantId, actorId, kind, expectedVersion } = input;
    const key = { shopId, warehouseId, variantId };
    const source = {
        shopId, sourceType: input.source.type, sourceId: input.source.id,
        sourceLineId: input.source.lineId ?? input.source.id, kind,
    };
    const reason = input.reason.trim();
    const { onHand = 0, reserved = 0, quarantine = 0, transit = 0, inbound = 0 } = input.delta;
    const change = { onHand, reserved, quarantine, transit, inbound };
    const hold = kind === 'reserve' || kind === 'release';
    const keepsStock = onHand === 0 && quarantine === 0 && transit === 0 && inbound === 0;
    const validReserveDelta = hold
        ? keepsStock && (kind === 'reserve' ? reserved > 0 : reserved < 0)
        : kind === 'fulfillment' && onHand < 0 ? reserved === onHand && transit === -onHand : reserved === 0;
    if (![shopId, actorId, source.sourceId, source.sourceLineId].every(validUuid) ||
        !/^[a-z][a-z0-9_]{0,63}$/.test(source.sourceType) ||
        reason.length < 3 || reason.length > 1000 || reason.includes(String.fromCharCode(0)) ||
        !Object.values(change).every(units) || !Object.values(change).some(Boolean) || !validReserveDelta ||
        (onHand > 0 ? !input.receivedValue || input.receivedValue.length > 60 || !valuePattern.test(input.receivedValue)
            : input.receivedValue !== undefined)) throw new UnprocessableEntityException();
    const receivedValue = input.receivedValue === undefined ? null : new Decimal(input.receivedValue).toFixed();
    const requestHash = inventoryFingerprint({ key, actorId, source, reason, change, receivedValue, expectedVersion: expectedVersion ?? null });
    const previous = await tx.stockMovement.findUnique({
        where: { shopId_sourceType_sourceId_sourceLineId_kind: source },
    });
    if (previous) {
        if (previous.requestHash !== requestHash) throw new ConflictException();
        return previous;
    }

    const warehouse = await lockWarehouse(tx, shopId, warehouseId);
    const variant = await lockVariant(tx, shopId, variantId);
    if (warehouse.status !== 'active' || variant.archivedAt || variant.productStatus === 'archived' ||
        (kind === 'reserve' && (!variant.active || variant.productStatus !== 'active'))) throw new ConflictException();
    const [locked] = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT id FROM stock_positions WHERE shop_id = ${shopId}::uuid
        AND warehouse_id = ${warehouseId}::uuid AND variant_id = ${variantId}::uuid FOR UPDATE
    `);
    const position = locked
        ? await tx.stockPosition.findUniqueOrThrow({ where: { shopId_id: { shopId, id: locked.id } } })
        : await tx.stockPosition.create({ data: key });
    if (expectedVersion !== undefined && position.version !== expectedVersion) throw new ConflictException();
    const totals = {
        onHand: position.onHand + onHand, reserved: position.reserved + reserved, quarantine: position.quarantine + quarantine,
        transit: position.transit + transit, inbound: position.inbound + inbound,
    };
    if (Object.values(totals).some(value => !units(value) || value < 0) || totals.reserved > totals.onHand) throw new ConflictException();
    const carryingDelta = onHand < 0
        ? proportionalAmount(position.carryingValue, -onHand, position.onHand).neg()
        : new Decimal(receivedValue ?? 0);
    const carryingValue = new Decimal(position.carryingValue).plus(carryingDelta);
    if (carryingValue.gte('1e60')) throw new UnprocessableEntityException();
    const updated = await tx.stockPosition.update({
        where: { shopId_id: { shopId, id: position.id } },
        data: { ...totals, carryingValue, version: { increment: 1 } },
    });
    const movement = await tx.stockMovement.create({
        data: {
            ...key, ...source, actorId, sku: variant.sku, requestHash, reason, quantityDelta: onHand, reservedDelta: reserved,
            quarantineDelta: quarantine, transitDelta: transit, inboundDelta: inbound, carryingDelta,
        },
    });
    await enqueueResourceUpdate(tx, 'inventory.updated', updated);
    return movement;
}
