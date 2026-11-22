import { Body, ConflictException, Controller, Get, HttpCode, NotFoundException, Param, Post, Query, Req, Res,
    UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { Prisma, type PrismaClient, type ReturnDisposition } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging, validUuid } from '../../http/query.js';
import { envelope, noStore, requireVersion, versionedEnvelope } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { ExactDecimal, proportionalAmount } from '../../platform/money/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { bookInspectedReturn, financeMoney } from '../finance/index.js';
import { recordStockMovement } from '../inventory/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig, type ShopScope } from '../workspace/index.js';
import { orderKey } from './order-data.js';

type Selection = { orderLineId: string; quantity: number };
type ReturnInput = { orderId: string; reason: string; lines: Selection[] };
type Inspection = { expectedVersion: number; lines: { orderLineId: string; acceptedQuantity: number;
    disposition: Exclude<ReturnDisposition, 'pending'>; reason: string }[] };
const inbound = (name: string) => new SchemaPipe(validator.compile(schemaFromContract(name)));
const resourceType = 'return_case';
export const returnCommands = ['createReturnCase', 'inspectReturn'].map(operationId => ({ operationId, resourceType }));
const returnLine = { orderBy: { orderLine: { position: 'asc' } } } satisfies Prisma.OrderReturn$linesArgs;
const visible = { lines: returnLine, shipment: { select: { currency: true } } } satisfies Prisma.OrderReturnInclude;

function returnView(record: Prisma.OrderReturnGetPayload<{ include: typeof visible }>) {
    const { id, shopId, orderId, version, state, createdAt, updatedAt } = record;
    return {
        id, shopId, orderId, version, state, createdAt, updatedAt,
        lines: record.lines.map(({ orderLineId, quantity, reason, disposition, acceptedQuantity }) => ({
            orderLineId, quantity, reason, disposition, acceptedQuantity,
        })),
        refundObligation: record.refundObligation ? financeMoney(record.refundObligation, record.shipment.currency) : null,
    };
}

function checkedReason(value: string) {
    const reason = value.trim();
    if (reason.length < 3 || reason.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
    return reason;
}

function checkedLines<T extends { orderLineId: string }>(lines: T[]) {
    const byId = new Map(lines.map(line => [line.orderLineId, line]));
    if (!lines.length || lines.length > 200 || byId.size !== lines.length || lines.some(line => !validUuid(line.orderLineId))) {
        throw new UnprocessableEntityException();
    }
    return byId;
}

async function getReturn(tx: Prisma.TransactionClient, shopId: string, id: string) {
    const record = await tx.orderReturn.findUnique({ where: orderKey(shopId, id), include: visible });
    if (!record) throw new NotFoundException();
    return returnView(record);
}

export class ReturnsService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    list(headers: IncomingHttpHeaders, shopId: string, query: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'orders.read');
            const page = paging(listQuery(query, 'page'), ['returns', shopId, userId, String(scope.permissionVersion)]);
            const result = page.result(await tx.orderReturn.findMany({
                where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1, include: visible,
            }));
            return { ...result, data: result.data.map(returnView) };
        });
    }

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            await requireShopAccess(tx, userId, shopId, 'orders.read');
            return getReturn(tx, shopId, id);
        });
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: ReturnInput, requestId: string) {
        return this.change(headers, shopId, 'createReturnCase', input, requestId, async tx => {
            const reason = checkedReason(input.reason);
            const requested = checkedLines(input.lines);
            if (!validUuid(input.orderId)) throw new UnprocessableEntityException();
            const shipment = await tx.shipment.findUnique({
                where: { shopId_orderId: { shopId, orderId: input.orderId } },
                include: { lines: true, returns: { select: { state: true, lines: { select: { orderLineId: true, quantity: true, acceptedQuantity: true } } } } },
            });
            if (!shipment || !['delivered', 'returned'].includes(shipment.state)) throw new ConflictException();
            const shipped = new Map(shipment.lines.map(line => [line.orderLineId, line.quantity]));
            const allocated = new Map<string, number>();
            for (const item of shipment.returns) {
                for (const line of item.lines) {
                    const quantity = item.state === 'inspected' ? line.acceptedQuantity : line.quantity;
                    allocated.set(line.orderLineId, (allocated.get(line.orderLineId) ?? 0) + quantity);
                }
            }
            for (const line of requested.values()) {
                const remaining = (shipped.get(line.orderLineId) ?? 0) - (allocated.get(line.orderLineId) ?? 0);
                if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > remaining) throw new UnprocessableEntityException();
            }
            return tx.orderReturn.create({
                data: { shopId, orderId: shipment.orderId, shipmentId: shipment.id, reason,
                    lines: { createMany: { data: [...requested.values()].map(({ orderLineId, quantity }) => ({ orderLineId, quantity, reason })) } } },
            });
        });
    }

    inspect(headers: IncomingHttpHeaders, shopId: string, id: string, input: Inspection, requestId: string) {
        return this.change(headers, shopId, 'inspectReturn', { id, input }, requestId, async (tx, scope) => {
            const selected = checkedLines(input.lines);
            const current = await tx.orderReturn.findUnique({
                where: orderKey(shopId, id), include: {
                    lines: { ...returnLine, include: { orderLine: true } },
                    shipment: { include: { order: true, lines: true } },
                },
            });
            if (!current) throw new NotFoundException();
            requireVersion(current.version, input.expectedVersion);
            if (current.state !== 'awaiting_goods' || current.lines.length !== selected.size) throw new ConflictException();
            const { shipment, orderId } = current;
            const prior = await tx.orderReturnLine.groupBy({
                by: ['orderLineId'], where: { shopId, orderId, returnCase: { state: 'inspected' } },
                _sum: { acceptedQuantity: true },
            });
            const accepted = new Map(prior.map(entry => [entry.orderLineId, entry._sum.acceptedQuantity ?? 0]));
            const issued = new Map(shipment.lines.map(line => [line.orderLineId, line]));
            const delivered = shipment.deliveredAt !== null;
            let salesValue = new ExactDecimal(0);
            let sellableCost = new ExactDecimal(0);
            let damagedTransitCost = new ExactDecimal(0);
            let received = false;
            for (const line of current.lines) {
                const review = selected.get(line.orderLineId);
                const sent = issued.get(line.orderLineId);
                if (!review || !sent || !Number.isInteger(review.acceptedQuantity) ||
                    review.acceptedQuantity < 0 || review.acceptedQuantity > line.quantity) throw new UnprocessableEntityException();
                const already = accepted.get(line.orderLineId) ?? 0;
                const next = already + review.acceptedQuantity;
                if (next > sent.quantity) throw new ConflictException();
                const reason = checkedReason(review.reason);
                const sellable = review.disposition === 'sellable';
                if (review.acceptedQuantity) {
                    received = true;
                    const cost = proportionalAmount(sent.costValue, next, sent.quantity)
                        .minus(proportionalAmount(sent.costValue, already, sent.quantity));
                    salesValue = salesValue.plus(proportionalAmount(line.orderLine.lineTotal, next, sent.quantity)
                        .minus(proportionalAmount(line.orderLine.lineTotal, already, sent.quantity)));
                    await recordStockMovement(tx, {
                        shopId, warehouseId: shipment.warehouseId, variantId: line.orderLine.variantId, actorId: scope.userId,
                        kind: 'return', source: { type: resourceType, id, lineId: line.orderLineId }, reason,
                        delta: {
                            ...(sellable ? { onHand: review.acceptedQuantity } : { quarantine: review.acceptedQuantity }),
                            ...(!delivered ? { transit: -review.acceptedQuantity } : {}),
                        },
                        ...(sellable ? { receivedValue: cost.toFixed() } : {}),
                    });
                    if (sellable) sellableCost = sellableCost.plus(cost);
                    else if (!delivered) damagedTransitCost = damagedTransitCost.plus(cost);
                }
                accepted.set(line.orderLineId, next);
                await tx.orderReturnLine.update({
                    where: { shopId_returnId_orderLineId: { shopId, returnId: id, orderLineId: line.orderLineId } },
                    data: { acceptedQuantity: review.acceptedQuantity, disposition: review.disposition, reason },
                });
            }
            const { refund, credit } = await bookInspectedReturn(tx, {
                shopId, sourceId: id, currency: shipment.currency, at: new Date(),
            }, shipment.order, delivered, salesValue, sellableCost, damagedTransitCost);
            if (received) {
                const allReturned = shipment.lines.every(line => accepted.get(line.orderLineId) === line.quantity);
                const order = await tx.salesOrder.update({
                    where: orderKey(shopId, orderId), data: {
                        orderState: allReturned ? 'completed' : shipment.order.orderState,
                        fulfillmentState: allReturned ? 'returned' : 'part_returned', version: { increment: 1 },
                    },
                });
                await enqueueResourceUpdate(tx, 'order.updated', order);
            }
            return tx.orderReturn.update({
                where: orderKey(shopId, id), data: {
                    state: 'inspected', refundObligation: refund, receivableCredit: credit, version: { increment: 1 },
                },
            });
        });
    }

    private change(headers: IncomingHttpHeaders, shopId: string, operationId: 'createReturnCase' | 'inspectReturn',
        payload: Prisma.InputJsonValue, requestId: string,
        apply: (tx: Prisma.TransactionClient, scope: ShopScope) => Promise<{ id: string; version: number }>) {
        const permission = operationId === 'inspectReturn' ? 'inventory.adjust' : 'orders.return';
        return writeShopCommand(this.db, this.config, { headers, shopId, operationId, permission, payload }, async (tx, scope) => {
            const result = await apply(tx, scope);
            await recordAudit(tx, { shopId, actorId: scope.userId, action: operationId, requestId, resourceType,
                resourceId: result.id, metadata: { version: result.version } });
            return { type: resourceType, id: result.id };
        }, async (tx, _scope, result) => getReturn(tx, shopId, result.id));
    }
}

@Controller('shops/:shopId/returns')
export class ReturnsController {
    constructor(private readonly returns: ReturnsService) {}

    @Get()
    @ContractOperation('listReturnCases')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.returns.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get(':resourceId')
    @ContractOperation('getReturnCase')
    async get(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.returns.get(request.headers, shopId, id));
    }

    @Post()
    @ContractOperation('createReturnCase')
    async create(@Param('shopId', idPipe) shopId: string, @Body(inbound('ReturnCaseCreate')) input: ReturnInput,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.returns.create(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post(':resourceId/inspect')
    @HttpCode(200)
    @ContractOperation('inspectReturn')
    async inspect(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Body(inbound('ReturnInspection')) input: Inspection,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.returns.inspect(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }
}
