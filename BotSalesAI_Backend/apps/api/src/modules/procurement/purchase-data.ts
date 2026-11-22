import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Prisma, SupplierOffer } from '../../generated/prisma/client.js';
import { requireVersion } from '../../http/response.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { financeMoney, type Money } from '../finance/index.js';
import { lockWarehouse } from '../inventory/index.js';
import { recordApproval, updateApprovalState, type ApprovalResource } from '../operations/index.js';
import type { ShopScope } from '../workspace/index.js';
import { procurementKey, requireResourceId } from './access.js';

export const purchaseDetails = {
    lines: { orderBy: { position: 'asc' }, include: { supplierOffer: true } },
    supplier: { include: { dispatchRoute: true } }, approval: true,
    budgetReservations: { where: { status: { not: 'released' } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1,
        select: { id: true, delegationId: true, delegationGeneration: true } },
} satisfies Prisma.PurchaseOrderInclude;
export type Purchase = Prisma.PurchaseOrderGetPayload<{ include: typeof purchaseDetails }>;
export const openPurchases = ['draft', 'pending_approval', 'approved', 'sending', 'unknown', 'sent', 'confirmed', 'part_received'] as const;
export const receiving = ['confirmed', 'part_received'] as const;
export const canCancelPurchase = (status: string) => ['draft', 'pending_approval', 'approved'].includes(status);
export const remainingToReceive = (line: { quantity: number; receivedQuantity: number; rejectedQuantity: number }) =>
    line.quantity - line.receivedQuantity - line.rejectedQuantity;

export function manualSupplierAllowed(shopId: string, supplierId: string) {
    const key = shopId.toLowerCase() + '/' + supplierId.toLowerCase();
    return process.env.PROCUREMENT_MANUAL_SUPPLIERS?.split(',').some(entry => entry.trim().toLowerCase() === key) ?? false;
}

export function manualPurchaseEnabled(order: Purchase) {
    return order.supplier.sendMethod === 'manual' && manualSupplierAllowed(order.shopId, order.supplierId);
}

export async function purchaseInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    requireResourceId(id);
    const row = await tx.purchaseOrder.findUnique({ where: procurementKey(shopId, id), include: purchaseDetails });
    if (!row) throw new NotFoundException();
    return row;
}

export function purchaseView(row: Purchase, scope: ShopScope, fixtureSend: boolean) {
    const { shopId, id, supplierId, warehouseId, status, version, createdAt, updatedAt, intentHash, approvalId, externalReference } = row;
    const allowedActions: string[] = [];
    const canWrite = scope.permissions.includes('procurement.write');
    const approvalCurrent = row.approval && row.approval.expiresAt > new Date();
    if (canWrite && (status === 'draft' || (['pending_approval', 'approved'].includes(status) && !approvalCurrent))) allowedActions.push('request_approval');
    if (scope.permissions.includes('procurement.send') && status === 'approved' && approvalCurrent) {
        if (manualPurchaseEnabled(row)) allowedActions.push('manual_handoff');
        else if (fixtureSend) allowedActions.push('send');
    }
    if (canWrite && ['sent', 'unknown'].includes(status)) allowedActions.push('confirm');
    if (canWrite && canCancelPurchase(status)) allowedActions.push('cancel');
    if (canWrite && (status === 'confirmed' || status === 'part_received')) allowedActions.push('receive');
    const reservation = row.budgetReservations[0];
    return {
        shopId, id, supplierId, warehouseId, status, version, createdAt, updatedAt, approvalId, intentHash, externalReference,
        budgetReservationId: reservation?.id ?? null, purchaseDelegationId: reservation?.delegationId ?? null,
        purchaseDelegationGeneration: reservation?.delegationGeneration ?? null, allowedActions, total: financeMoney(row.total, row.currency),
        lines: row.lines.map(({ id, variantId, supplierOfferId, quantity, unitCost, receivedQuantity, rejectedQuantity }) => ({
            id, variantId, supplierOfferId, quantity, unitCost: financeMoney(unitCost, row.currency), receivedQuantity, rejectedQuantity,
        })),
    };
}

export function hashPurchaseIntent(input: { supplierId: string; supplierVersion: number; warehouseId: string; total: Money;
    lines: { variantId: string; supplierOfferId: string; offerVersion: number; quantity: number; unitCost: Money }[] }) {
    return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

export async function requirePurchaseWarehouse(tx: Prisma.TransactionClient, shopId: string, warehouseId: string) {
    if ((await lockWarehouse(tx, shopId, warehouseId)).status !== 'active') throw new ConflictException();
}

export function offerIsValid(offer: SupplierOffer, supplierId: string, variantId: string, currency: string, count: number, now: Date) {
    return offer.supplierId === supplierId && offer.variantId === variantId && offer.currency === currency &&
        (offer.validUntil === null || offer.validUntil > now) && count >= offer.minimumQuantity && count % offer.packSize === 0;
}

export async function requireCurrentPurchaseTerms(tx: Prisma.TransactionClient, order: Purchase, now = new Date()) {
    await requirePurchaseWarehouse(tx, order.shopId, order.warehouseId);
    if (order.supplier.status !== 'approved' || order.supplier.version !== order.supplierVersion || order.supplier.currency !== order.currency ||
        (order.supplier.sendMethod === 'approved_adapter' && !order.supplier.dispatchRoute?.enabled) ||
        order.lines.some(line => line.offerVersion !== line.supplierOffer.version || !line.supplierOffer.unitCost.eq(line.unitCost) ||
            !offerIsValid(line.supplierOffer, order.supplierId, line.variantId, order.currency, line.quantity, now))) throw new ConflictException();
    const activeVariants = await tx.variant.count({
        where: { shopId: order.shopId, id: { in: order.lines.map(line => line.variantId) }, archivedAt: null, product: { status: { not: 'archived' } } },
    });
    if (activeVariants !== order.lines.length) throw new ConflictException();
}

export async function updatePurchase(tx: Prisma.TransactionClient, order: { shopId: string; id: string },
    data: Prisma.PurchaseOrderUncheckedUpdateInput) {
    const updated = await tx.purchaseOrder.update({
        where: procurementKey(order.shopId, order.id), data: { ...data, version: { increment: 1 } },
    });
    await enqueueResourceUpdate(tx, 'purchase.updated', updated);
    return updated;
}

export async function startPurchaseDispatch(tx: Prisma.TransactionClient, order: { shopId: string; id: string }, commandId: string,
    manualHandoff = false) {
    const { shopId, id: purchaseOrderId } = order;
    const where = { shopId_purchaseOrderId: { shopId, purchaseOrderId } };
    const prior = await tx.purchaseDispatch.findUnique({ where, include: { command: { select: { status: true } } } });
    if (prior && (prior.dueAt || prior.command.status !== 'failed')) throw new ConflictException();
    const dispatch = { commandId, manualHandoff, dueAt: manualHandoff ? null : new Date() };
    await tx.purchaseDispatch.upsert({ where, create: { shopId, purchaseOrderId, ...dispatch }, update: dispatch });
    return updatePurchase(tx, order, { status: manualHandoff ? 'unknown' : 'sending' });
}

export async function requestPurchaseApproval(tx: Prisma.TransactionClient, scope: ShopScope, id: string, version: number, intentHash?: string) {
    const order = await purchaseInShop(tx, scope.shopId, id);
    requireVersion(order.version, version);
    if (intentHash !== undefined && order.intentHash !== intentHash) throw new ConflictException();
    if (order.status !== 'draft') {
        if (!order.approval || !['pending_approval', 'approved'].includes(order.status) || order.approval.expiresAt > new Date()) {
            throw new ConflictException();
        }
        await updateApprovalState(tx, order.approval, { status: 'expired' });
    }
    await requireCurrentPurchaseTerms(tx, order);
    const approval = await recordApproval(tx, {
        shopId: order.shopId, resourceType: 'purchase_order', resourceId: order.id, action: 'purchase.send',
        resourceVersion: order.version + 1, intentHash: order.intentHash, requestedBy: scope.userId, amount: order.total, currency: order.currency,
    });
    await updatePurchase(tx, order, { approvalId: approval.id, status: 'pending_approval' });
    return approval;
}

export const purchaseApprovalResource: ApprovalResource = {
    action: 'purchase.send',
    resourceType: 'purchase_order',
    request(tx, scope, input) {
        if (!scope.permissions.includes('procurement.write')) throw new ForbiddenException();
        return requestPurchaseApproval(tx, scope, input.resource.id, input.resourceVersion, input.intentHash);
    },
    async decide(tx, _scope, approval, decision) {
        const order = await purchaseInShop(tx, approval.shopId, approval.resourceId);
        if (order.version !== approval.resourceVersion || order.approvalId !== approval.id || order.status !== 'pending_approval' ||
            order.intentHash !== approval.intentHash || !approval.amount?.eq(order.total) || order.currency !== approval.currency) throw new ConflictException();
        const approve = decision === 'approve';
        if (approve) await requireCurrentPurchaseTerms(tx, order);
        const updated = await updatePurchase(tx, order, {
            status: approve ? 'approved' : 'draft', ...(approve ? {} : { approvalId: null }),
        });
        return updated.version;
    },
};
