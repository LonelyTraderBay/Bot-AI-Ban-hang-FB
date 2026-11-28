import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { Prisma, type PrismaClient, type OrderCustomerConfirmation, type OrderState, type OrderFulfillmentState, type OrderPaymentState, type SalesOrder } from '../../generated/prisma/client.js';
import { OrderState as States } from '../../generated/prisma/enums.js';
import { DomainConflict } from '../../http/contracts.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { requireIfMatch, requireVersion } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { commandDto, type ResourceRef } from '../../platform/commands/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { requireOpenShop } from '../../platform/database/shop-lifecycle.js';
import type { MetaInboundConfig } from '../channels/index.js';
import { addressRedactions, addressSnapshotView, createAddressForCustomer, type AddressInput } from '../customers/index.js';
import { cancelPlannedShipment, cancelPreparation, estimatedShipping, provisionPreparation } from '../fulfillment/index.js';
import { requireQuoteEvidence } from '../inbox/index.js';
import { reserveStock, settleStockReservation } from '../inventory/index.js';
import { readAsSession, requireShopAccess, writeAsSession, writeShopCommand, type AuthConfig, type ShopScope } from '../workspace/index.js';
import { canCancelOrder, draftDetails, lineIndex, orderDetails, orderInShop, orderKey, orderView, requireDraft,
    saveOrderLines, type OrderDetails } from './order-data.js';
import { estimateOrderPricing, orderMoney, orderQuoteHash, priceOrder, quoteWarnings, type DraftOrder } from './pricing.js';

export type DraftPatch = Partial<Omit<DraftOrder, 'paymentMethod'>>;
export type CustomerEvidence = { quoteId: string; quoteHash: string; quoteVersion: number; customerIdentityId: string; sourceMessageId: string };
export type ConfirmOrder = { expectedVersion: number; quoteId: string; customerConfirmationId: string };
export type CancelOrder = { expectedVersion: number; reason: string };
type Result = { id: string; version?: number; repeat?: boolean };

const quoteMs = 15 * 60 * 1000;
const holdMs = 24 * 60 * 60 * 1000;
const actionSources = {
    createOrder: { resourceType: 'order', permission: 'orders.write' },
    updateOrderDraft: { resourceType: 'order', permission: 'orders.write' },
    quoteOrder: { resourceType: 'order_quote', permission: 'orders.write' },
    recordCustomerConfirmation: { resourceType: 'customer_confirmation', permission: 'orders.write' },
    confirmOrder: { resourceType: 'order', permission: 'orders.confirm' },
    cancelOrder: { resourceType: 'order', permission: 'orders.write' },
} as const;
type Action = keyof typeof actionSources;
export const orderCommands = Object.entries(actionSources).map(([operationId, source]) => ({ operationId, resourceType: source.resourceType }));

async function quoteForOrder(tx: Prisma.TransactionClient, order: OrderDetails, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const quote = await tx.orderQuote.findFirst({ where: { shopId: order.shopId, orderId: order.id, id } });
    if (!quote) throw new NotFoundException();
    return quote;
}

function requireShippingZone(priced: { outsideConfiguredRegions: boolean }) {
    if (priced.outsideConfiguredRegions) {
        throw new DomainConflict('SHIPPING_ZONE_UNAVAILABLE', 'Địa chỉ nằm ngoài vùng giao hàng đã cấu hình. Cập nhật địa chỉ hoặc biểu phí trước khi tiếp tục.');
    }
}

async function currentQuote(tx: Prisma.TransactionClient, order: OrderDetails, id: string, now: Date) {
    requireDraft(order);
    const quote = await quoteForOrder(tx, order, id);
    if (quote.orderVersion !== order.version || quote.customerId !== order.customerId) throw new ConflictException();
    if (quote.expiresAt <= now) {
        throw new DomainConflict('QUOTE_EXPIRED', 'Báo giá đã hết hạn. Lấy báo giá mới và xác nhận lại với khách trước khi chốt.');
    }
    const priced = await priceOrder(tx, order.shopId, draftDetails(order), lineIndex(order), now);
    requireShippingZone(priced);
    if (quote.quoteHash !== orderQuoteHash(order.id, order.version, priced.termsHash)) {
        throw new DomainConflict('PRICE_CHANGED', 'Điều kiện báo giá đã thay đổi. Lấy báo giá mới và xác nhận lại với khách trước khi chốt.');
    }
    return { quote, priced };
}

function pricedOrderFields(priced: Awaited<ReturnType<typeof priceOrder>>) {
    const { total, currency, promotion } = priced;
    return { total, currency, promotionId: promotion?.id ?? null, promotionSnapshot: promotion ?? Prisma.DbNull };
}

export async function requireCurrentPaymentPrice(tx: Prisma.TransactionClient, order: SalesOrder) {
    if (order.orderState !== 'draft' || !order.promotionId) return;
    const current = await orderInShop(tx, order.shopId, order.id);
    const priced = await priceOrder(tx, order.shopId, draftDetails(current), lineIndex(current));
    const version = (order.promotionSnapshot as { version?: number } | null)?.version;
    if (!order.total.eq(priced.total) || priced.promotion?.version !== version ||
        priced.lines.some((line, index) => !current.lines[index].lineTotal.eq(line.lineTotal))) throw new ConflictException();
}

export async function createSalesDraft(tx: Prisma.TransactionClient, shopId: string, draft: DraftOrder) {
    const priced = await priceOrder(tx, shopId, draft, new Map());
    const { customerId, conversationId, warehouseId, shippingAddressId, paymentMethod, notes } = draft;
    const order = await tx.salesOrder.create({
        data: { shopId, customerId, conversationId, warehouseId, shippingAddressId, paymentMethod, notes, ...pricedOrderFields(priced) },
    });
    await saveOrderLines(tx, shopId, order.id, priced.lines);
    return order;
}

async function issueSalesQuote(tx: Prisma.TransactionClient, current: OrderDetails, now: Date,
    priced?: Awaited<ReturnType<typeof priceOrder>>) {
    const { shopId, id } = current;
    priced ??= await priceOrder(tx, shopId, draftDetails(current), lineIndex(current), now);
    requireShippingZone(priced);
    const warnings = await quoteWarnings(tx, shopId, current.warehouseId, priced.lines);
    if (priced.promotion && !['unpaid', 'refunded'].includes(current.paymentState) && !current.total.eq(priced.total)) {
        throw new ConflictException();
    }
    return tx.orderQuote.create({
        data: {
            shopId, orderId: id, orderVersion: current.version, customerId: current.customerId,
            addressSnapshotId: priced.address?.id, quoteHash: orderQuoteHash(id, current.version, priced.termsHash),
            lines: priced.publicLines, total: priced.total, currency: priced.currency, warnings,
            shippingRate: priced.rate ?? Prisma.DbNull, promotionSnapshot: priced.promotion ?? Prisma.DbNull,
            createdAt: now, expiresAt: new Date(now.getTime() + quoteMs),
        },
    });
}

async function checkSalesQuoteEvidence(tx: Prisma.TransactionClient, current: OrderDetails, body: CustomerEvidence,
    config: AuthConfig, meta?: MetaInboundConfig) {
    const { shopId } = current;
    const { quote } = await currentQuote(tx, current, body.quoteId, new Date());
    if (body.quoteVersion !== quote.orderVersion || body.quoteHash !== quote.quoteHash) throw new ConflictException();
    await requireQuoteEvidence(tx, {
        shopId, customerId: current.customerId, conversationId: current.conversationId, identityId: body.customerIdentityId,
        sourceMessageId: body.sourceMessageId, quoteId: quote.id, quoteHash: quote.quoteHash,
        quotedAt: quote.createdAt, expiresAt: quote.expiresAt,
    }, config, meta);
    return quote;
}

export async function recordSalesQuoteEvidence(tx: Prisma.TransactionClient, current: OrderDetails, body: CustomerEvidence,
    config: AuthConfig, meta?: MetaInboundConfig) {
    const { shopId } = current;
    const quote = await checkSalesQuoteEvidence(tx, current, body, config, meta);
    const existing = await tx.orderCustomerConfirmation.findUnique({ where: { shopId_sourceMessageId: { shopId, sourceMessageId: body.sourceMessageId } } });
    if (existing) {
        if (existing.quoteId !== quote.id || existing.customerIdentityId !== body.customerIdentityId) throw new ConflictException();
        return { id: existing.id, repeat: true };
    }
    return tx.orderCustomerConfirmation.create({
        data: {
            shopId, quoteId: quote.id, quoteHash: quote.quoteHash, customerIdentityId: body.customerIdentityId,
            sourceMessageId: body.sourceMessageId, expiresAt: quote.expiresAt,
        },
    });
}

function confirmationView(record: OrderCustomerConfirmation, current: Pick<SalesOrder, 'version' | 'customerConfirmationId'>, orderVersion: number) {
    const status = current.version !== orderVersion && current.customerConfirmationId !== record.id
        ? 'superseded' : record.expiresAt <= new Date() ? 'expired' : 'valid';
    return { ...record, version: 1, updatedAt: record.createdAt, status };
}

async function reusableSalesQuote(tx: Prisma.TransactionClient, current: OrderDetails, now: Date, config: AuthConfig, meta?: MetaInboundConfig) {
    const evidence = await tx.orderCustomerConfirmation.findFirst({
        where: { shopId: current.shopId, expiresAt: { gt: now },
            quote: { orderId: current.id, orderVersion: current.version, customerId: current.customerId, expiresAt: { gt: now } },
            message: { conversationId: current.conversationId ?? undefined, direction: 'inbound', redactedAt: null } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    if (!evidence) return null;
    try {
        return await checkSalesQuoteEvidence(tx, current, { ...evidence, quoteVersion: current.version }, config, meta);
    } catch (error) {
        if (error instanceof ConflictException || error instanceof ForbiddenException ||
            error instanceof NotFoundException || error instanceof UnprocessableEntityException) return null;
        throw error;
    }
}

export async function quoteDeliveryDraft(tx: Prisma.TransactionClient, current: OrderDetails, address: AddressInput,
    paymentMethod: SalesOrder['paymentMethod']) {
    const { shopId, id } = current;
    if (current.orderState !== 'draft' || current.paymentState !== 'unpaid' || current.shippingAddressId ||
        current.customer.privacyErasedAt || addressRedactions(current.customer).length) return null;
    const now = new Date();
    const lines = lineIndex(current);
    const draft = { ...draftDetails(current), paymentMethod };
    const shipping = await estimatedShipping(tx, shopId, address, current.currency);
    if (shipping.outsideConfiguredRegions) return null;
    try {
        const preview = await priceOrder(tx, shopId, draft, lines, now);
        if ((await quoteWarnings(tx, shopId, current.warehouseId, preview.lines)).length) return null;
    } catch (error) {
        if (error instanceof ConflictException || error instanceof NotFoundException || error instanceof UnprocessableEntityException) return null;
        throw error;
    }
    const shippingAddress = await createAddressForCustomer(tx, shopId, current.customerId, address);
    const priced = await priceOrder(tx, shopId, { ...draft, shippingAddressId: shippingAddress.id }, lines, now);
    const updated = await tx.salesOrder.update({ where: orderKey(shopId, id), data: { shippingAddressId: shippingAddress.id,
        paymentMethod, customerConfirmationId: null, version: { increment: 1 }, ...pricedOrderFields(priced) } });
    await saveOrderLines(tx, shopId, id, priced.lines, current.lines);
    const quote = await issueSalesQuote(tx, { ...current, ...updated }, now, priced);
    return { order: updated, address: shippingAddress, quote, lines: priced.publicLines, rate: priced.rate };
}

export class OrdersService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig, private readonly meta?: MetaInboundConfig) {}

    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'orders.read');
            const query = listQuery(raw, 'orders');
            if (query.status && !Object.hasOwn(States, query.status)) throw new UnprocessableEntityException();
            const stateFilters = query.fulfillmentState || query.paymentState
                ? [query.fulfillmentState ?? '', query.paymentState ?? ''] : [];
            const page = paging(query, ['orders', shopId, userId, String(scope.permissionVersion), query.customerId ?? '', ...stateFilters]);
            const id = query.q?.trim();
            const search = page.keyword ? { OR: [
                { lines: { some: { retiredAt: null, sku: { contains: page.keyword, mode: 'insensitive' as const } } } },
                ...(id && validUuid(id) ? [{ id }, { customerId: id }] : []),
            ] } : {};
            const result = page.result(await tx.salesOrder.findMany({
                where: {
                    shopId, customerId: query.customerId, orderState: query.status as OrderState | undefined,
                    fulfillmentState: query.fulfillmentState as OrderFulfillmentState | undefined,
                    paymentState: query.paymentState as OrderPaymentState | undefined,
                    AND: [search, page.after ?? {}],
                },
                orderBy: page.orderBy, take: page.limit + 1, include: orderDetails,
            }));
            return { ...result, data: result.data.map(order => orderView(order, scope)) };
        });
    }

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'orders.read');
            return orderView(await orderInShop(tx, shopId, id), scope);
        });
    }

    estimate(headers: IncomingHttpHeaders, shopId: string, draft: DraftOrder) {
        return writeAsSession(this.db, this.config, headers, async (tx, userId) => {
            await requireShopAccess(tx, userId, shopId, 'orders.write');
            await requireOpenShop(tx, shopId);
            return estimateOrderPricing(tx, shopId, draft);
        });
    }

    create(headers: IncomingHttpHeaders, shopId: string, draft: DraftOrder, requestId: string) {
        return this.change(headers, shopId, 'createOrder', draft, requestId, tx => createSalesDraft(tx, shopId, draft),
            async (tx, scope, result) => orderView(await orderInShop(tx, shopId, result.id), scope));
    }

    patch(headers: IncomingHttpHeaders, shopId: string, id: string, patch: DraftPatch, requestId: string) {
        const version = requireIfMatch(headers);
        return this.change(headers, shopId, 'updateOrderDraft', { id, version, patch }, requestId, async tx => {
            const current = await orderInShop(tx, shopId, id);
            requireVersion(current.version, version);
            requireDraft(current);
            if (current.paymentState !== 'unpaid') throw new ConflictException();
            const draft = { ...draftDetails(current), ...patch };
            const priced = await priceOrder(tx, shopId, draft, lineIndex(current));
            const { customerId, conversationId, warehouseId, shippingAddressId, notes } = draft;
            const order = await tx.salesOrder.update({
                where: orderKey(shopId, id), data: {
                    customerId, conversationId, warehouseId, shippingAddressId, notes, ...pricedOrderFields(priced),
                    customerConfirmationId: null, version: { increment: 1 },
                },
            });
            await saveOrderLines(tx, shopId, id, priced.lines, current.lines);
            return order;
        }, async (tx, scope, result) => orderView(await orderInShop(tx, shopId, result.id), scope));
    }

    quote(headers: IncomingHttpHeaders, shopId: string, id: string, requestId: string) {
        return this.change(headers, shopId, 'quoteOrder', { id }, requestId, async (tx, _scope, config) => {
            const current = await orderInShop(tx, shopId, id);
            requireDraft(current);
            const now = new Date();
            const reusable = current.conversationId ? await reusableSalesQuote(tx, current, now, config, this.meta) : null;
            return reusable ? { id: reusable.id, repeat: true } : issueSalesQuote(tx, current, now);
        }, async (tx, scope, result) => {
            const quote = await tx.orderQuote.findUniqueOrThrow({
                where: orderKey(shopId, result.id), include: {
                    order: { include: { customer: true } }, addressSnapshot: { include: { address: true } },
                    confirmations: { where: { message: { direction: 'inbound', redactedAt: null } },
                        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1 },
                },
            });
            const { id: quoteId, orderId, orderVersion, quoteHash, lines, total, currency, warnings, expiresAt, shippingRate, addressSnapshot } = quote;
            const evidence = quote.confirmations[0];
            return {
                id: quoteId, shopId, orderId, orderVersion, quoteHash, lines, total: orderMoney(total, currency), warnings, expiresAt,
                shippingRate, promotion: quote.promotionSnapshot,
                ...(evidence?.quoteHash === quoteHash ? { customerConfirmation: confirmationView(evidence, quote.order, orderVersion) } : {}),
                shippingAddressSnapshot: addressSnapshot && quote.order.customer.id === quote.customerId
                    ? addressSnapshotView(addressSnapshot, quote.order.customer, scope.permissions.includes('customers.read')) : null,
            };
        });
    }

    evidence(headers: IncomingHttpHeaders, shopId: string, id: string, body: CustomerEvidence, requestId: string) {
        return this.change(headers, shopId, 'recordCustomerConfirmation', { id, body }, requestId, async (tx, _scope, config) => {
            const current = await orderInShop(tx, shopId, id);
            return recordSalesQuoteEvidence(tx, current, body, config, this.meta);
        }, async (tx, _scope, result) => {
            const { quote, ...record } = await tx.orderCustomerConfirmation.findUniqueOrThrow({
                where: orderKey(shopId, result.id), include: {
                    quote: { select: { orderVersion: true, order: { select: { version: true, customerConfirmationId: true } } } },
                },
            });
            return confirmationView(record, quote.order, quote.orderVersion);
        });
    }

    confirm(headers: IncomingHttpHeaders, shopId: string, id: string, body: ConfirmOrder, requestId: string) {
        return this.change(headers, shopId, 'confirmOrder', { id, body }, requestId, async (tx, scope, config) => {
            const current = await orderInShop(tx, shopId, id);
            requireVersion(current.version, body.expectedVersion);
            const now = new Date();
            const { quote, priced } = await currentQuote(tx, current, body.quoteId, now);
            if (!validUuid(body.customerConfirmationId)) throw new NotFoundException();
            const evidence = await tx.orderCustomerConfirmation.findFirst({
                where: { shopId, id: body.customerConfirmationId, quoteId: quote.id, quoteHash: quote.quoteHash, expiresAt: { gt: now } },
            });
            if (!evidence || quote.addressSnapshotId !== priced.address?.id ||
                !priced.address || !(priced.address.data as AddressInput).phone ||
                (current.paymentMethod === 'prepay' && (current.paymentState !== 'verified' || !current.total.eq(priced.total)))) {
                throw new ConflictException();
            }
            await requireQuoteEvidence(tx, {
                shopId, customerId: current.customerId, conversationId: current.conversationId, identityId: evidence.customerIdentityId,
                sourceMessageId: evidence.sourceMessageId, quoteId: quote.id, quoteHash: quote.quoteHash,
                quotedAt: quote.createdAt, expiresAt: quote.expiresAt,
            }, config, this.meta);
            const reservation = await reserveStock(tx, {
                shopId, orderId: id, orderVersion: current.version + 1, actorId: scope.userId, expiresAt: new Date(now.getTime() + holdMs),
                lines: priced.lines.map(line => ({ warehouseId: current.warehouseId, variantId: line.variantId, lineId: line.id, quantity: line.quantity })),
            }, now);
            await saveOrderLines(tx, shopId, id, priced.lines, current.lines);
            const updated = await tx.salesOrder.update({
                where: orderKey(shopId, id), data: {
                    orderState: 'confirmed', fulfillmentState: 'reserved', customerConfirmationId: evidence.id,
                    reservationId: reservation.id, ...pricedOrderFields(priced), promotionAppliedAt: priced.promotion ? now : null,
                    version: { increment: 1 },
                },
            });
            await provisionPreparation(tx, updated, priced.lines, scope.userId, reservation.expiresAt);
            return updated;
        }, async (_tx, _scope, _result, command) => commandDto(command, 'order'));
    }

    cancel(headers: IncomingHttpHeaders, shopId: string, id: string, body: CancelOrder, requestId: string) {
        const reason = body.reason.trim();
        if (reason.length < 3 || reason.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
        return this.change(headers, shopId, 'cancelOrder', { id, body }, requestId, async (tx, scope) => {
            const current = await orderInShop(tx, shopId, id);
            requireVersion(current.version, body.expectedVersion);
            if (!canCancelOrder(current, scope)) throw new ConflictException();
            if (current.reservation) await settleStockReservation(tx, {
                shopId, id: current.reservation.id, expectedVersion: current.reservation.version,
                actorId: scope.userId, status: 'released', reason,
            });
            await cancelPreparation(tx, shopId, id);
            await cancelPlannedShipment(tx, shopId, id);
            return tx.salesOrder.update({
                where: orderKey(shopId, id), data: { orderState: 'cancelled', fulfillmentState: 'unfulfilled', version: { increment: 1 } },
            });
        }, async (_tx, _scope, _result, command) => commandDto(command, 'order'), reason);
    }

    private change<T>(headers: IncomingHttpHeaders, shopId: string, operationId: Action, payload: Prisma.InputJsonValue, requestId: string,
        apply: (tx: Prisma.TransactionClient, scope: ShopScope, config: AuthConfig) => Promise<Result>,
        read: (tx: Prisma.TransactionClient, scope: ShopScope, result: ResourceRef, command: Parameters<typeof commandDto>[0]) => Promise<T>,
        reason?: string) {
        const { resourceType, permission } = actionSources[operationId];
        return writeShopCommand(this.db, this.config, { headers, shopId, operationId, permission, payload }, async (tx, scope, config) => {
            const result = await apply(tx, scope, config);
            if (!result.repeat) {
                await recordAudit(tx, {
                    shopId, actorId: scope.userId, action: operationId, requestId, resourceType, resourceId: result.id,
                    metadata: { ...(result.version ? { version: result.version } : {}), ...(reason ? { reason } : {}) },
                });
                if (resourceType === 'order' && result.version) await enqueueResourceUpdate(tx, 'order.updated', { shopId, id: result.id, version: result.version });
            }
            return { type: resourceType, id: result.id };
        }, (tx, scope, result, command) => {
            if (result.type !== resourceType) throw new ConflictException();
            return read(tx, scope, result, command);
        });
    }
}
