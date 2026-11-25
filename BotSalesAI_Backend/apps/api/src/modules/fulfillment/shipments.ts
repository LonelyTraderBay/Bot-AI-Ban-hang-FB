import { Body, ConflictException, Controller, ForbiddenException, Get, HttpCode, NotFoundException,
    Param, Post, Query, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { Prisma, type PrismaClient, type ShipmentState } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging, validUuid } from '../../http/query.js';
import { envelope, noStore, requireVersion, versionedEnvelope } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { commandDto } from '../../platform/commands/index.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { bookDelivery, bookHandover, financeMoney, type Money } from '../finance/index.js';
import { recordStockMovement, settleStockReservation } from '../inventory/index.js';
import { setWorkState } from '../operations/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig } from '../workspace/index.js';

type ShipmentInput = { orderId: string; warehouseId: string; carrierId: string | null; orderLineIds: string[]; trackingCode?: string };
type Version = { expectedVersion: number };
type Observation = Version & { externalEventId: string; eventType: ShipmentState; occurredAt: string; evidenceRef: string };
type Action = 'createShipment' | 'handoverShipment' | 'recordShipmentEvent';
const inbound = (name: string) => new SchemaPipe(validator.compile(schemaFromContract(name)));
const resourceType = 'shipment';
export const shipmentCommands = ['createShipment', 'handoverShipment', 'recordShipmentEvent'].map(operationId => ({ operationId, resourceType }));
const key = (shopId: string, id: string) => ({ shopId_id: { shopId, id } });
const events = { orderBy: [{ occurredAt: 'asc' }, { externalEventId: 'asc' }] } satisfies Prisma.Shipment$eventsArgs;
const visible = { events } satisfies Prisma.ShipmentInclude;
const details = {
    ...visible, lines: { orderBy: { orderLine: { position: 'asc' } }, include: { orderLine: true } },
    order: { include: { reservation: true, preparation: { include: { workItem: true } } } },
} satisfies Prisma.ShipmentInclude;

function shipmentView(shipment: Prisma.ShipmentGetPayload<{ include: typeof visible }>) {
    const { id, shopId, orderId, warehouseId, carrierId, trackingCode, state, version, createdAt, updatedAt, currency } = shipment;
    return {
        id, shopId, orderId, warehouseId, carrierId, trackingCode, state, version, createdAt, updatedAt,
        shippingFeeQuote: shipment.shippingFeeQuote ? financeMoney(shipment.shippingFeeQuote, currency) : null,
        shippingFeeActual: shipment.shippingFeeActual ? financeMoney(shipment.shippingFeeActual, currency) : null,
        events: shipment.events.map(event => ({ externalEventId: event.externalEventId, type: event.state,
            occurredAt: event.occurredAt, evidenceRef: event.observationId })),
    };
}

const following: Partial<Record<ShipmentState, readonly ShipmentState[]>> = {
    handed_over: ['in_transit', 'delivered', 'failed', 'returning', 'returned'],
    in_transit: ['delivered', 'failed', 'returning', 'returned'],
    failed: ['in_transit', 'delivered', 'returning', 'returned'],
    returning: ['returned'],
};

function matchesObservedTime(submitted: Date, observed: Date) {
    const requested = submitted.getTime();
    const recorded = observed.getTime();
    return requested === recorded || (requested % 60000 === 0 && requested === Math.floor(recorded / 60000) * 60000);
}

async function shipmentInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    const shipment = await tx.shipment.findUnique({ where: key(shopId, id), include: details });
    if (!shipment) throw new NotFoundException();
    return shipment;
}

export async function cancelPlannedShipment(tx: Prisma.TransactionClient, shopId: string, orderId: string) {
    const shipment = await tx.shipment.findUnique({ where: { shopId_orderId: { shopId, orderId } } });
    if (!shipment || shipment.state === 'cancelled') return;
    if (shipment.state !== 'planned') throw new ConflictException();
    const updated = await tx.shipment.update({ where: key(shopId, shipment.id), data: { state: 'cancelled', version: { increment: 1 } } });
    await enqueueResourceUpdate(tx, 'shipment.updated', updated);
}

export class ShipmentsService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    list(headers: IncomingHttpHeaders, shopId: string, query: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'fulfillment.read');
            const page = paging(listQuery(query, 'page'), ['shipments', shopId, userId, String(scope.permissionVersion)]);
            const result = page.result(await tx.shipment.findMany({
                where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1, include: visible,
            }));
            return { ...result, data: result.data.map(shipmentView) };
        });
    }

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            await requireShopAccess(tx, userId, shopId, 'fulfillment.read');
            return shipmentView(await shipmentInShop(tx, shopId, id));
        });
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: ShipmentInput, requestId: string) {
        return this.change(headers, shopId, 'createShipment', input, requestId, async (tx, actorId) => {
            if (!validUuid(input.orderId) || !validUuid(input.warehouseId) || input.carrierId !== null) throw new UnprocessableEntityException();
            const order = await tx.salesOrder.findUnique({
                where: key(shopId, input.orderId), include: {
                    lines: { where: { retiredAt: null } }, shipments: { select: { id: true } },
                    preparation: { include: { workItem: true } }, reservation: true,
                    confirmation: { select: { quote: { select: { shippingRate: true, addressSnapshotId: true } } } },
                },
            });
            if (!order) throw new NotFoundException();
            if (order.preparation?.workItem.assigneeUserId !== actorId) throw new ForbiddenException();
            if (order.orderState !== 'confirmed' || order.fulfillmentState !== 'packed' ||
                order.preparation.state !== 'packed' || order.reservation?.status !== 'active' ||
                order.reservation.expiresAt <= new Date() || !order.confirmation?.quote.addressSnapshotId || order.shipments.length) {
                throw new ConflictException();
            }
            const lineIds = new Set(input.orderLineIds);
            if (order.warehouseId !== input.warehouseId || !lineIds.size || lineIds.size !== input.orderLineIds.length ||
                lineIds.size !== order.lines.length || order.lines.some(line => !lineIds.has(line.id))) throw new UnprocessableEntityException();
            const rate = order.confirmation.quote.shippingRate as { fee: Money } | null;
            return tx.shipment.create({
                data: {
                    shopId, orderId: order.id, warehouseId: order.warehouseId, currency: order.currency,
                    trackingCode: input.trackingCode?.trim() ?? null, shippingFeeQuote: rate?.fee.amount ?? null,
                    lines: { create: order.lines.map(line => ({ orderLineId: line.id, quantity: line.quantity })) },
                },
            });
        }, async (tx, result) => shipmentView(await shipmentInShop(tx, shopId, result.id)));
    }

    handover(headers: IncomingHttpHeaders, shopId: string, id: string, input: Version, requestId: string) {
        return this.change(headers, shopId, 'handoverShipment', { id, input }, requestId, async (tx, actorId) => {
            const shipment = await shipmentInShop(tx, shopId, id);
            requireVersion(shipment.version, input.expectedVersion);
            const { order } = shipment;
            const { reservation, preparation } = order;
            if (preparation?.workItem.assigneeUserId !== actorId) throw new ForbiddenException();
            if (shipment.state !== 'planned' || order.orderState !== 'confirmed' || order.fulfillmentState !== 'packed' ||
                preparation.state !== 'packed' || reservation?.status !== 'active' ||
                (order.paymentMethod === 'prepay' && order.paymentState !== 'verified')) throw new ConflictException();
            const at = new Date();
            await settleStockReservation(tx, {
                shopId, id: reservation.id, actorId, expectedVersion: reservation.version, status: 'consumed', reason: 'Bàn giao kiện hàng',
            }, at);
            const movements = await tx.stockMovement.findMany({
                where: { shopId, kind: 'fulfillment', sourceType: 'stock_reservation', sourceId: reservation.id },
                select: { sourceLineId: true, carryingDelta: true },
            });
            const byLine = new Map(movements.map(movement => [movement.sourceLineId, movement.carryingDelta]));
            let cost = new ExactDecimal(0);
            for (const line of shipment.lines) {
                const issued = byLine.get(line.orderLineId);
                if (!issued) throw new ConflictException();
                const costValue = issued.neg();
                await tx.shipmentLine.update({
                    where: { shopId_shipmentId_orderLineId: { shopId, shipmentId: id, orderLineId: line.orderLineId } },
                    data: { costValue },
                });
                cost = cost.plus(costValue);
            }
            await bookHandover(tx, { shopId, sourceId: id, at, currency: shipment.currency }, cost);
            await tx.shipmentEvent.create({
                data: { shopId, shipmentId: id, externalEventId: 'handover:' + id, state: 'handed_over', occurredAt: at, applied: true },
            });
            await tx.prepJob.update({ where: key(shopId, preparation.id), data: { state: 'handed_over', version: { increment: 1 } } });
            await setWorkState(tx, shopId, preparation.workItemId, 'completed');
            const changed = await tx.salesOrder.update({
                where: key(shopId, order.id), data: { fulfillmentState: 'dispatched', version: { increment: 1 } },
            });
            await enqueueResourceUpdate(tx, 'order.updated', changed);
            return tx.shipment.update({
                where: key(shopId, id), data: { state: 'handed_over', handedOverAt: at, lastEventAt: at, version: { increment: 1 } },
            });
        }, async (_tx, _result, command) => commandDto(command, resourceType));
    }

    record(headers: IncomingHttpHeaders, shopId: string, id: string, input: Observation, requestId: string) {
        return this.change(headers, shopId, 'recordShipmentEvent', { id, input }, requestId, async (tx, actorId) => {
            const shipment = await shipmentInShop(tx, shopId, id);
            const submittedAt = new Date(input.occurredAt);
            const externalEventId = input.externalEventId.trim();
            if (!externalEventId || externalEventId.includes(String.fromCharCode(0)) || !validUuid(input.evidenceRef) ||
                !Number.isFinite(submittedAt.getTime()) || submittedAt > new Date()) throw new UnprocessableEntityException();
            const existing = shipment.events.find(event => event.externalEventId === externalEventId);
            if (existing) {
                if (existing.state !== input.eventType || !matchesObservedTime(submittedAt, existing.occurredAt) ||
                    existing.observationId !== input.evidenceRef) throw new ConflictException();
                return { ...shipment, repeat: true };
            }
            requireVersion(shipment.version, input.expectedVersion);
            if (!shipment.handedOverAt || !shipment.lastEventAt) throw new ConflictException();
            const observed = await tx.shipmentObservation.findUnique({ where: key(shopId, input.evidenceRef) });
            if (!observed || observed.shipmentId !== id || observed.externalEventId !== externalEventId ||
                observed.state !== input.eventType || !matchesObservedTime(submittedAt, observed.occurredAt) ||
                observed.occurredAt > new Date()) throw new UnprocessableEntityException();
            const at = observed.occurredAt;
            if (at < shipment.handedOverAt) throw new ConflictException();
            const applied = at >= shipment.lastEventAt && (following[shipment.state]?.includes(observed.state) ?? false);
            if (applied && observed.state === 'delivered') {
                const { order } = shipment;
                const recognition = await bookDelivery(tx, { shopId, sourceId: id, at, currency: shipment.currency }, order);
                for (const line of shipment.lines) {
                    await recordStockMovement(tx, {
                        shopId, warehouseId: shipment.warehouseId, variantId: line.orderLine.variantId, actorId,
                        kind: 'fulfillment', source: { type: 'shipment_delivery', id, lineId: line.orderLineId },
                        reason: 'Hàng đã giao có bằng chứng', delta: { transit: -line.quantity },
                    });
                }
                const changed = await tx.salesOrder.update({
                    where: key(shopId, order.id), data: {
                        orderState: 'completed', fulfillmentState: 'delivered', recognitionPolicyVersion: recognition?.policyVersion,
                        version: { increment: 1 },
                    },
                });
                await enqueueResourceUpdate(tx, 'order.updated', changed);
            }
            await tx.shipmentEvent.create({
                data: { shopId, shipmentId: id, externalEventId, state: observed.state, occurredAt: at, observationId: observed.id, applied },
            });
            return tx.shipment.update({
                where: key(shopId, id), data: {
                    version: { increment: 1 }, ...(applied ? { state: observed.state, lastEventAt: at,
                        ...(observed.state === 'delivered' ? { deliveredAt: at } : {}) } : {}),
                },
            });
        }, async (tx, result) => shipmentView(await shipmentInShop(tx, shopId, result.id)));
    }

    private change<T>(headers: IncomingHttpHeaders, shopId: string, operationId: Action, payload: Prisma.InputJsonValue, requestId: string,
        apply: (tx: Prisma.TransactionClient, actorId: string) => Promise<{ id: string; shopId: string; version: number; repeat?: boolean }>,
        read: (tx: Prisma.TransactionClient, result: { id: string }, command: Parameters<typeof commandDto>[0]) => Promise<T>) {
        return writeShopCommand(this.db, this.config, {
            headers, shopId, operationId, permission: operationId === 'handoverShipment' ? 'fulfillment.handover' : 'fulfillment.write', payload,
        }, async (tx, scope) => {
            const current = await apply(tx, scope.userId);
            if (!current.repeat) {
                await recordAudit(tx, {
                    shopId, actorId: scope.userId, action: operationId, requestId, resourceType, resourceId: current.id,
                    metadata: { version: current.version },
                });
                await enqueueResourceUpdate(tx, 'shipment.updated', current);
            }
            return { type: resourceType, id: current.id };
        }, async (tx, _scope, result, command) => read(tx, result, command));
    }
}

@Controller('shops/:shopId/shipments')
export class ShipmentsController {
    constructor(private readonly shipments: ShipmentsService) {}

    @Get()
    @ContractOperation('listShipments')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.shipments.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get(':resourceId')
    @ContractOperation('getShipment')
    async get(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.shipments.get(request.headers, shopId, id));
    }

    @Post()
    @ContractOperation('createShipment')
    async create(@Param('shopId', idPipe) shopId: string, @Body(inbound('ShipmentCreate')) input: ShipmentInput,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.shipments.create(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post(':resourceId/handover')
    @HttpCode(202)
    @ContractOperation('handoverShipment')
    async handover(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(inbound('VersionRequest')) input: Version,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.shipments.handover(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post(':resourceId/events')
    @HttpCode(200)
    @ContractOperation('recordShipmentEvent')
    async record(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(inbound('ShipmentEventWrite')) input: Observation,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.shipments.record(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }
}
