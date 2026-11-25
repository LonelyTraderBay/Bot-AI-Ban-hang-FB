import { createHmac } from 'node:crypto';
import type { ChannelConversation, Prisma } from '../../generated/prisma/client.js';
import { recordAudit } from '../../platform/audit/index.js';
import { recordCommand } from '../../platform/commands/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import type { BotAgentAuditContext } from '../ai/index.js';
import { findOrCreateWorkItem } from '../operations/index.js';
import { createSalesDraft } from '../orders/index.js';
import type { AuthConfig } from '../workspace/index.js';
import { updateConversation } from './message-data.js';

export const inboundIntentKey = (config: AuthConfig, shopId: string, messageId: string, action: string) => createHmac('sha256', config.signingKey)
    .update(JSON.stringify(['bot-inbound/v1', action, shopId, messageId])).digest('hex');

export async function workForHandoff(tx: Prisma.TransactionClient, conversation: ChannelConversation, acceptHuman: boolean) {
    const item = await findOrCreateWorkItem(tx, { shopId: conversation.shopId, kind: 'customer_handoff', sourceType: 'conversation', sourceId: conversation.id });
    if (acceptHuman) await updateConversation(tx, conversation, { mode: 'human', assignedUserId: null, generation: { increment: 1 } });
    return item;
}

export async function recordInboundDraft(tx: Prisma.TransactionClient, config: AuthConfig, input: {
    conversation: ChannelConversation; actorId: string; messageId: string; warehouseId: string;
    auditContext: BotAgentAuditContext & { permissionVersion: number }; proposal: { variantId: string; units: number }; providerRunId?: string;
}) {
    const { conversation, actorId, messageId, warehouseId, auditContext, proposal, providerRunId } = input;
    const { shopId, customerId, id: conversationId } = conversation;
    const draft = { customerId, conversationId, warehouseId, shippingAddressId: null, paymentMethod: 'cod' as const,
        notes: 'Nháp từ hội thoại thử nghiệm, chờ nhân viên kiểm tra.', lines: [{ variantId: proposal.variantId, quantity: proposal.units }] };
    const command = await recordCommand(tx, { shopId, actorId, operationId: 'createOrder', idempotencyKey: inboundIntentKey(config, shopId, messageId, 'draft') },
        { draft, sourceMessageId: messageId, configHash: auditContext.configHash, ...(providerRunId ? { providerRunId } : {}) }, async () => {
            const created = await createSalesDraft(tx, shopId, draft);
            await recordAudit(tx, { shopId, actorId, requestId: messageId, action: 'createOrder', resourceType: 'order', resourceId: created.id,
                metadata: { ...auditContext, origin: providerRunId ? 'bot_staging' : 'bot_fixture', sourceMessageId: messageId,
                    resourceVersion: created.version, result: 'draft_created', ...(providerRunId ? { providerRunId } : {}) } });
            await enqueueResourceUpdate(tx, 'order.updated', created);
            return { type: 'order', id: created.id };
        });
    return command.result;
}
