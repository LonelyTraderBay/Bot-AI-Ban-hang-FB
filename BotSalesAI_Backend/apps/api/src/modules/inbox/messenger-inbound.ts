import { lockShopClosure } from '../../platform/database/shop-lifecycle.js';
import { ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { ChannelConnection, MessageOrigin, Prisma } from '../../generated/prisma/client.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import type { ApprovedEvaluationConfig } from '../ai/index.js';
import { erasedIdentityKey } from '../privacy/index.js';
import type { AuthConfig } from '../workspace/index.js';
import { queueBotInbound } from './bot-inbound.js';
import { inboxKey, normalizedMessage, updateConversation } from './message-data.js';
import { queueStagedBotInbound } from './staged-bot-inbound.js';

export class ErasedChannelContact extends ConflictException {
    constructor() { super('Hồ sơ liên hệ đã xử lý quyền xóa.'); }
}

type InboundMessage = { senderId: string; conversationId: string; messageId: string; displayName: string; text: string };
type MessageObservation = { duplicate: boolean; messageId: string };

export function metaMessageDigest(pageId: string, senderId: string, occurredAt: Date, text: string) {
    return createHash('sha256').update(JSON.stringify([pageId, senderId, occurredAt.getTime(), text])).digest('hex');
}

export async function recordMessengerEvent(tx: Prisma.TransactionClient, channel: ChannelConnection,
    event: { externalId: string; occurredAt: Date; contentHash: string }, apply: (closedAt: Date | null) => Promise<MessageObservation>) {
    const closedAt = await lockShopClosure(tx, channel.shopId);
    const source = { shopId: channel.shopId, channelId: channel.id, externalId: event.externalId };
    const seen = await tx.channelEvent.findUnique({ where: { shopId_channelId_externalId: source } });
    if (seen) {
        if (seen.contentHash !== event.contentHash) throw new ConflictException();
        return { duplicate: true };
    }
    await tx.channelEvent.create({ data: { ...source, occurredAt: event.occurredAt, contentHash: event.contentHash } });
    const result = await apply(closedAt);
    const updated = await tx.channelConnection.update({ where: inboxKey(channel.shopId, channel.id),
        data: { lastWebhookAt: new Date(), version: { increment: 1 } } });
    await enqueueResourceUpdate(tx, 'health.updated', updated);
    return result;
}

export async function receiveMessengerMessage(tx: Prisma.TransactionClient, channel: ChannelConnection, input: InboundMessage,
    occurredAt: Date, origin: MessageOrigin, closedAt: Date | null, config?: AuthConfig, ai?: ApprovedEvaluationConfig) {
    const { shopId, id: channelId, provider, pageId } = channel;
    const identityKey = { shopId, channel: provider, pageId, externalId: input.senderId };
    const retiredKey = erasedIdentityKey(shopId, provider, pageId, input.senderId);
    const retired = await tx.customerIdentity.findUnique({
        where: { shopId_channel_pageId_externalId: { ...identityKey, externalId: retiredKey } }, select: { id: true },
    });
    if (retired) throw new ErasedChannelContact();
    let identity = await tx.customerIdentity.findUnique({ where: { shopId_channel_pageId_externalId: identityKey } });
    const session = { shopId, channelId, externalId: input.conversationId };
    let conversation = await tx.channelConversation.findUnique({ where: { shopId_channelId_externalId: session } });
    if (conversation && conversation.customerIdentityId !== identity?.id) throw new ConflictException();
    if (!identity) {
        const customer = await tx.customer.create({ data: { shopId, displayName: normalizedMessage(input.displayName) } });
        identity = await tx.customerIdentity.create({ data: { ...identityKey, customerId: customer.id } });
    }
    if (!conversation) conversation = await tx.channelConversation.create({ data: {
        ...session, customerId: identity.customerId, customerIdentityId: identity.id,
    } });
    const existing = await tx.channelMessage.findUnique({ where: { shopId_conversationId_externalId: {
        shopId, conversationId: conversation.id, externalId: input.messageId,
    } } });
    const text = normalizedMessage(input.text);
    if (existing) {
        if (existing.direction !== 'inbound' || (!existing.redactedAt && existing.text !== text) ||
            existing.createdAt.getTime() !== occurredAt.getTime()) throw new ConflictException();
        return { duplicate: true, messageId: existing.id };
    }
    const message = await tx.channelMessage.create({ data: {
        shopId, conversationId: conversation.id, externalId: input.messageId, direction: 'inbound', origin,
        senderKind: 'customer', text, createdAt: occurredAt,
    } });
    const newest = !conversation.lastInboundAt || conversation.lastInboundAt < occurredAt;
    if (newest) {
        const reopen = conversation.status === 'resolved' && occurredAt > conversation.updatedAt;
        const updated = await updateConversation(tx, conversation, {
            lastInboundAt: occurredAt, ...(reopen ? { status: 'open', assignedUserId: null, generation: { increment: 1 } } : {}),
            ...(conversation.status === 'open' || reopen ? { unreadCount: { increment: 1 } } : {}),
        });
        if (!closedAt && origin === 'fixture') await queueBotInbound(tx, updated, channel, message.id, config);
        if (!closedAt && origin === 'provider') await queueStagedBotInbound(tx, updated, channel, message, input.senderId, ai);
    }
    await enqueueResourceUpdate(tx, 'message.created', message);
    return { duplicate: false, messageId: message.id };
}
