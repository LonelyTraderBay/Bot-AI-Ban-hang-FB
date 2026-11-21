import { UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import type { AuthConfig } from '../workspace/index.js';

export async function requireCustomerConversation(tx: Prisma.TransactionClient, shopId: string, customerId: string, conversationId: string) {
    if (!validUuid(conversationId)) throw new UnprocessableEntityException();
    const conversation = await tx.channelConversation.findUnique({
        where: { shopId_customerId_id: { shopId, customerId, id: conversationId } },
        select: { id: true, customerIdentityId: true },
    });
    if (!conversation) throw new UnprocessableEntityException();
    return conversation;
}

export { inboxModule } from './conversations.js';

type QuoteEvidence = {
    shopId: string; customerId: string; conversationId: string | null; identityId: string; sourceMessageId: string;
    quoteId: string; quoteHash: string; quotedAt: Date; expiresAt: Date;
};

function localFixture(config: AuthConfig) {
    return config.clientId === 'botsales-p0-dev' && new URL(config.appOrigin).hostname === 'localhost' &&
        new URL(config.issuer).hostname === '127.0.0.1';
}

export async function requireQuoteEvidence(tx: Prisma.TransactionClient, evidence: QuoteEvidence, config: AuthConfig) {
    const { shopId, customerId, conversationId, identityId, sourceMessageId, quoteId, quoteHash, quotedAt, expiresAt } = evidence;
    if (!conversationId || ![identityId, sourceMessageId].every(validUuid) || !localFixture(config)) {
        throw new UnprocessableEntityException();
    }
    const message = await tx.channelMessage.findFirst({
        where: {
            shopId, id: sourceMessageId, conversationId, direction: 'inbound', origin: 'fixture',
            conversation: { customerId, customerIdentityId: identityId },
            createdAt: { gte: quotedAt, lt: expiresAt },
        },
        select: { id: true, text: true },
    });
    if (message?.text !== '[CONFIRM:' + quoteId + ':' + quoteHash + ']') throw new UnprocessableEntityException();
}
