import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, type SalesOrder } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { addressSnapshotView } from '../customers/index.js';
import { allocationTotals } from '../finance/index.js';
import type { ShopScope } from '../workspace/index.js';
import { lineView, orderMoney, type DraftOrder } from './pricing.js';

export const orderDetails = {
    lines: { where: { retiredAt: null }, orderBy: { position: 'asc' } },
    customer: true,
    reservation: { select: { id: true, status: true, version: true } },
    confirmation: { include: { quote: { include: { addressSnapshot: { include: { address: true } } } } } },
    moneyEntries: { where: { status: 'posted' }, select: { kind: true, amount: true, journalId: true, sourceType: true } },
    settlementAllocations: { select: { amount: true, bankAmount: true, applications: { select: { amount: true } } } },
    preparation: { select: { workItemId: true, workItem: { select: { assigneeUserId: true } } } },
    shipments: { select: { id: true, state: true, deliveredAt: true,
        returns: { where: { state: 'inspected' }, select: { refundObligation: true, receivableCredit: true } } } },
} satisfies Prisma.SalesOrderInclude;

export type OrderDetails = Prisma.SalesOrderGetPayload<{ include: typeof orderDetails }>;
export const orderKey = (shopId: string, id: string) => ({ shopId_id: { shopId, id } });

export async function orderInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const order = await tx.salesOrder.findUnique({ where: orderKey(shopId, id), include: orderDetails });
    if (!order) throw new NotFoundException();
    return order;
}

export function draftDetails(order: OrderDetails): DraftOrder {
    return {
        customerId: order.customerId, conversationId: order.conversationId, warehouseId: order.warehouseId,
        lines: order.lines.map(({ variantId, quantity }) => ({ variantId, quantity })),
        notes: order.notes, paymentMethod: order.paymentMethod, shippingAddressId: order.shippingAddressId, promotionId: order.promotionId,
    };
}

export const lineIndex = (order: OrderDetails) => new Map(order.lines.map(line => [line.variantId, line.id]));

export function requireDraft(order: Pick<SalesOrder, 'orderState'>) {
    if (order.orderState !== 'draft') throw new ConflictException();
}

export function canCancelOrder(order: OrderDetails, scope: ShopScope) {
    if (!['unpaid', 'refunded'].includes(order.paymentState)) return false;
    return order.orderState === 'draft' || (order.orderState === 'confirmed' && (order.fulfillmentState === 'reserved' ||
        (['picking', 'packed'].includes(order.fulfillmentState) && scope.permissions.includes('fulfillment.write') &&
            order.preparation?.workItem.assigneeUserId === scope.userId)));
}

export function orderView(order: OrderDetails, scope: ShopScope) {
    const permissions = scope.permissions;
    const confirmed = order.confirmation?.quote;
    const snapshot = confirmed?.addressSnapshot;
    const redactedFields: string[] = [];
    const canSeeAddress = permissions.includes('customers.read');
    const canWrite = permissions.includes('orders.write');
    const allowedActions: string[] = [];
    if (order.orderState === 'draft') {
        if (canWrite) allowedActions.push('edit', 'quote');
        if (permissions.includes('orders.confirm')) allowedActions.push('confirm');
    }
    if (canWrite && canCancelOrder(order, scope)) allowedActions.push('cancel');
    const shipment = order.shipments[0];
    const beforeHandover = ['unfulfilled', 'reserved', 'picking', 'packed'].includes(order.fulfillmentState);
    const collectCod = order.paymentMethod === 'cod' && (order.fulfillmentState === 'delivered' || Boolean(shipment?.deliveredAt));
    if (permissions.includes('orders.return') && ['delivered', 'returned'].includes(shipment?.state ?? '') &&
        order.fulfillmentState !== 'returned') allowedActions.push('request_return');
    if (!canSeeAddress) redactedFields.push('shippingAddressSnapshot');
    if (!canWrite) redactedFields.push('notes');
    const settled = allocationTotals(order.settlementAllocations);
    let paid = settled.additionalVerified;
    let refunded = new ExactDecimal(0);
    let returnPayout = new ExactDecimal(0);
    let cashReceived = settled.cashReceived;
    for (const entry of order.moneyEntries) {
        const incoming = entry.kind === 'receipt';
        if (incoming) paid = paid.plus(entry.amount);
        else {
            refunded = refunded.plus(entry.amount);
            if (entry.sourceType === 'return_refund') returnPayout = returnPayout.plus(entry.amount);
        }
        if (entry.journalId) cashReceived = incoming ? cashReceived.plus(entry.amount) : cashReceived.minus(entry.amount);
    }
    const credit = (shipment?.returns ?? []).reduce((total, item) => total.plus(item.receivableCredit ?? 0), new ExactDecimal(0));
    const refundBalance = (shipment?.returns ?? []).reduce((total, item) => total.plus(item.refundObligation ?? 0), returnPayout.neg());
    const due = order.orderState === 'cancelled' || (shipment?.state === 'returned' && order.fulfillmentState === 'returned') ? new ExactDecimal(0) :
        ExactDecimal.max(0, new ExactDecimal(order.total).minus(paid).plus(refunded).minus(returnPayout).minus(credit));
    if (order.orderState !== 'cancelled' && due.gt(0) && (beforeHandover || collectCod) && permissions.includes('finance.post') &&
        ['unpaid', 'part_paid', 'part_refunded', 'refunded'].includes(order.paymentState)) allowedActions.push('record_payment');
    if (permissions.includes('finance.refund') && (refundBalance.gt(0) || (beforeHandover && paid.gt(refunded)))) allowedActions.push('request_refund');
    return {
        id: order.id, shopId: order.shopId, version: order.version, createdAt: order.createdAt, updatedAt: order.updatedAt,
        customerId: order.customerId, conversationId: order.conversationId, warehouseId: order.warehouseId,
        orderState: order.orderState, fulfillmentState: order.fulfillmentState, paymentState: order.paymentState,
        paymentMethod: order.paymentMethod, total: orderMoney(order.total, order.currency),
        paidAmount: orderMoney(paid, order.currency), refundedAmount: orderMoney(refunded, order.currency), amountDue: orderMoney(due, order.currency),
        cashReceived: permissions.includes('finance.read') ? orderMoney(cashReceived, order.currency) : null,
        lines: order.lines.map(line => lineView(line, order.currency)),
        allowedActions, redactedFields, prepTaskId: order.preparation?.workItemId ?? null,
        shipmentIds: order.shipments.map(shipment => shipment.id), customerConfirmationId: order.customerConfirmationId,
        recognitionPolicyVersion: order.recognitionPolicyVersion, notes: canWrite ? order.notes : '',
        shippingAddressId: order.shippingAddressId,
        shippingAddressSnapshot: snapshot ? addressSnapshotView(snapshot, order.customer, canSeeAddress) : null,
        shippingRate: confirmed?.shippingRate ?? null, promotionId: order.promotionId, promotion: order.promotionSnapshot,
        promotionAppliedAt: order.promotionAppliedAt,
    };
}

export async function saveOrderLines(tx: Prisma.TransactionClient, shopId: string, orderId: string,
    lines: Awaited<ReturnType<typeof import('./pricing.js').priceOrder>>['lines'], prior: OrderDetails['lines'] = []) {
    const keep = new Set(lines.map(line => line.id));
    const previous = new Set(prior.map(line => line.id));
    if (prior.some(line => !keep.has(line.id))) await tx.orderLine.updateMany({
        where: { shopId, orderId, retiredAt: null, id: { notIn: [...keep] } },
        data: { retiredAt: new Date() },
    });
    for (const { id, ...data } of lines) {
        if (previous.has(id)) await tx.orderLine.update({ where: orderKey(shopId, id), data });
    }
    const additions = lines.filter(line => !previous.has(line.id));
    if (additions.length) await tx.orderLine.createMany({ data: additions.map(line => ({ ...line, shopId, orderId })) });
}
