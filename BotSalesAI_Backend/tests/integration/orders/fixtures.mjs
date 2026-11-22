import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDatabaseClient } from '../../../apps/api/dist/platform/database/client.js';

export function fixtureWriter() {
    const url = new URL(process.env.MIGRATION_DATABASE_URL);
    assert.equal(url.hostname, '127.0.0.1');
    assert.equal(url.pathname, '/botsales_be_dev');
    assert.equal(url.username, 'botsales_migrator');
    return createDatabaseClient(url.href);
}

export async function orderConversation(db, shopId, customerId) {
    const identity = await db.customerIdentity.create({
        data: {
            shopId, customerId, channel: 'messenger', pageId: 'fixture-only', externalId: randomUUID(),
        },
    });
    const channel = await db.channelConnection.upsert({
        where: { shopId_provider_pageId: { shopId, provider: identity.channel, pageId: identity.pageId } },
        update: {}, create: { shopId, provider: identity.channel, pageId: identity.pageId },
    });
    const conversation = await db.channelConversation.create({
        data: { shopId, customerId, customerIdentityId: identity.id, externalId: randomUUID(), channelId: channel.id },
    });
    return { identity, conversation };
}

export async function quoteEvidenceFixture(db, quote, conversation, text = '[CONFIRM:' + quote.id + ':' + quote.quoteHash + ']') {
    const message = await db.channelMessage.create({
        data: {
            shopId: quote.shopId, conversationId: conversation.id, externalId: randomUUID(), origin: 'fixture', direction: 'inbound', text,
        },
    });
    return {
        quoteId: quote.id, quoteHash: quote.quoteHash, quoteVersion: quote.orderVersion,
        customerIdentityId: conversation.customerIdentityId, sourceMessageId: message.id,
    };
}
