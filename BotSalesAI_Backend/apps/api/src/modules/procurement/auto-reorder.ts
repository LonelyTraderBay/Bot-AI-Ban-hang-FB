import { HttpException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import type { Prisma, PurchaseSuggestion, ReorderRule, SupplierOffer } from '../../generated/prisma/client.js';
import { recordAudit } from '../../platform/audit/index.js';
import { recordCommand } from '../../platform/commands/index.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { requireShopAccess, type AuthConfig } from '../workspace/index.js';
import { procurementKey } from './access.js';
import { reserveDelegatedTerms } from './delegations.js';
import { startPurchaseDispatch } from './purchase-data.js';
import { createPurchaseDraft, purchaseFixtureEnabled } from './purchases.js';

export async function queueDelegatedPurchase(tx: Prisma.TransactionClient, rule: ReorderRule, suggestion: PurchaseSuggestion, offer: SupplierOffer, at: Date,
    config?: AuthConfig) {
    const { shopId, purchaseDelegationId: delegationId, budgetPolicyId, warehouseId, supplierOfferId, variantId } = rule;
    const blocked = async (reason: string) => {
        const updated = await tx.purchaseSuggestion.update({ where: procurementKey(shopId, suggestion.id),
            data: { autoSendReason: reason, version: { increment: 1 } } });
        await enqueueResourceUpdate(tx, 'purchase_suggestion.updated', updated);
    };
    if (!delegationId || !budgetPolicyId || !config || !purchaseFixtureEnabled(config)) {
        await blocked('Cần ủy quyền, ngân sách và adapter gửi thử đã xác minh.');
        return;
    }
    let terms: Awaited<ReturnType<typeof reserveDelegatedTerms>>;
    try {
        terms = await reserveDelegatedTerms(tx, { shopId, delegationId, budgetPolicyId, warehouseId, supplierOfferId,
            total: new ExactDecimal(offer.unitCost).mul(suggestion.suggestedQuantity), currency: offer.currency }, at, config);
        await requireShopAccess(tx, terms.ownerId, shopId, 'procurement.write');
    } catch (error) {
        if (!(error instanceof HttpException) || ![403, 404, 409, 422].includes(error.getStatus())) throw error;
        await blocked('Ủy quyền, điều khoản hoặc hạn mức mua không còn hợp lệ.');
        return;
    }
    const order = await createPurchaseDraft(tx, shopId, { supplierId: offer.supplierId, warehouseId, suggestionId: suggestion.id,
        lines: [{ variantId, supplierOfferId, quantity: suggestion.suggestedQuantity }] });
    const { ownerId: actorId, policy, delegation, agent, shopGeneration } = terms;
    const operationId = 'sendPurchaseOrder';
    const idempotencyKey = createHmac('sha256', config.signingKey).update(JSON.stringify(['delegated-purchase/v1', shopId, order.id])).digest('hex');
    await recordCommand(tx, { shopId, actorId, operationId, idempotencyKey }, { id: order.id, intentHash: order.intentHash, delegationId },
        async command => {
            const reservation = await tx.purchaseDelegationReservation.create({ data: {
                shopId, delegationId, purchaseOrderId: order.id, budgetPolicyId, budgetPolicyVersion: policy.version,
                delegationGeneration: delegation.generation, agentGeneration: agent.generation, shopGeneration, intentHash: order.intentHash,
                amount: order.total, currency: order.currency, period: policy.period,
                periodKey: policy.period === 'per_order' ? order.id : terms.periodKey, commandId: command.id, createdAt: at,
            } });
            await enqueueResourceUpdate(tx, 'purchase_reservation.updated', reservation);
            await startPurchaseDispatch(tx, order, command.id);
            await recordAudit(tx, { shopId, actorId, action: operationId, resourceType: 'purchase_order', resourceId: order.id, requestId: command.id,
                metadata: { origin: 'delegation', delegationId, reservationId: reservation.id, intentHash: order.intentHash } });
            return { type: 'purchase_order', id: order.id };
        }, true);
}
