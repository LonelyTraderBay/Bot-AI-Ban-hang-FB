import { UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { metaInboundPage, type MetaInboundConfig } from '../channels/index.js';
import { usesLocalOidcFixture, type AuthConfig } from '../workspace/index.js';
import { metaMessageDigest } from './messenger-inbound.js';

export async function requireCustomerConversation(tx: Prisma.TransactionClient, shopId: string, customerId: string, conversationId: string) {
    if (!validUuid(conversationId)) throw new UnprocessableEntityException();
    const conversation = await tx.channelConversation.findUnique({
        where: { shopId_customerId_id: { shopId, customerId, id: conversationId } },
        select: { id: true, customerIdentityId: true },
    });
    if (!conversation) throw new UnprocessableEntityException();
    return conversation;
}

export { inboxCommands, inboxModule } from './conversations.js';
export { conversationInShop, updateConversation } from './message-data.js';
export { dispatchMessengerMessages } from './dispatch.js';
export { processBotInbound } from './bot-inbound.js';
export { marketingConversationSignals } from './marketing.js';

type QuoteEvidence = {
    shopId: string; customerId: string; conversationId: string | null; identityId: string; sourceMessageId: string;
    quoteId: string; quoteHash: string; quotedAt: Date; expiresAt: Date;
};

export async function requireQuoteEvidence(tx: Prisma.TransactionClient, evidence: QuoteEvidence, config: AuthConfig, meta?: MetaInboundConfig) {
    const { shopId, customerId, conversationId, identityId, sourceMessageId, quoteId, quoteHash, quotedAt, expiresAt } = evidence;
    if (!conversationId || ![identityId, sourceMessageId].every(validUuid)) {
        throw new UnprocessableEntityException();
    }
    const message = await tx.channelMessage.findFirst({
        where: {
            shopId, id: sourceMessageId, conversationId, direction: 'inbound', redactedAt: null,
            conversation: { customerId, customerIdentityId: identityId, identity: { customer: { privacyErasedAt: null } } },
            createdAt: { gte: quotedAt, lt: expiresAt },
        },
        select: { origin: true, text: true, externalId: true, createdAt: true, senderKind: true, conversation: {
            select: { externalId: true, channel: true, identity: { select: { channel: true, pageId: true, externalId: true } } },
        } },
    });
    if (message?.text !== '[CONFIRM:' + quoteId + ':' + quoteHash + ']') throw new UnprocessableEntityException();
    if (message.origin === 'fixture' && usesLocalOidcFixture(config)) return;
    const { channel, identity, externalId: sender } = message.conversation;
    const page = metaInboundPage(meta, channel);
    if (message.origin !== 'provider' || message.senderKind !== 'customer' || message.createdAt > new Date() ||
        channel.provider !== 'messenger' || identity.channel !== channel.provider || identity.pageId !== channel.pageId ||
        identity.externalId !== sender || !page?.senderIds.has(sender)) throw new UnprocessableEntityException();
    const receipt = await tx.channelEvent.findFirst({
        where: { shopId, channelId: channel.id, externalId: message.externalId, occurredAt: message.createdAt,
            receivedAt: { gte: quotedAt, lt: expiresAt }, contentHash: metaMessageDigest(channel.pageId, sender, message.createdAt, message.text) },
        select: { externalId: true },
    });
    if (!receipt) throw new UnprocessableEntityException();
}
