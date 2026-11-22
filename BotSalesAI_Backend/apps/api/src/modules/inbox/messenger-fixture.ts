import { Body, Controller, Headers, HttpCode, NotFoundException, Post, Res, UnprocessableEntityException } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { ServerResponse } from 'node:http';
import type { ChannelConnection, ChannelConversation, ChannelMessage, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { SchemaPipe } from '../../http/contracts.js';
import { envelope, noStore } from '../../http/response.js';
import { serializable } from '../../platform/database/transactions.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { messengerFixtureEnabled, messengerFixturePolicy } from '../channels/index.js';
import type { AuthConfig } from '../workspace/index.js';
import { recordMessengerEvent, receiveMessengerMessage } from './messenger-inbound.js';
import { inboxKey } from './message-data.js';

type EventBase = { pageId: string; eventId: string; generation: number; occurredAt: string; conversationId: string; messageId: string };
type Inbound = EventBase & { type: 'message'; senderId: string; displayName: string; text: string };
type Delivery = EventBase & { type: 'delivery'; status: 'delivered' | 'read' | 'failed' | 'unknown' };
type MessengerEvent = Inbound | Delivery;
const externalId = { type: 'string', pattern: '^[a-zA-Z0-9_.:-]{1,160}$' };
const base = {
    pageId: externalId, eventId: externalId, generation: { type: 'integer', minimum: 1, maximum: 2147483647 },
    occurredAt: { type: 'string', format: 'date-time' }, conversationId: externalId, messageId: externalId,
};
const shape = (type: string, fields: Record<string, unknown>) => ({
    type: 'object', additionalProperties: false, required: ['type', ...Object.keys(base), ...Object.keys(fields)],
    properties: { ...base, type: { const: type }, ...fields },
});
const eventInput = new SchemaPipe(validator.compile({ oneOf: [
    shape('message', { senderId: externalId, displayName: { type: 'string', minLength: 1, maxLength: 160 },
        text: { type: 'string', minLength: 1, maxLength: 20000 } }),
    shape('delivery', { status: { enum: ['delivered', 'read', 'failed', 'unknown'] } }),
] }));

function eventContent(input: MessengerEvent) {
    const { pageId, generation, eventId, occurredAt, type, conversationId, messageId } = input;
    return JSON.stringify([pageId, generation, eventId, occurredAt, type, conversationId, messageId,
        ...(type === 'message' ? [input.senderId, input.displayName, input.text] : [input.status])]);
}

export function signMessengerFixtureEvent(key: Buffer, input: MessengerEvent) {
    return createHmac('sha256', key).update('messenger-fixture-event/v1\n').update(eventContent(input)).digest('hex');
}

function markAllowed(message: ChannelMessage, target: Delivery['status']) {
    if (message.status === target || message.status === 'read' || message.status === 'failed') return false;
    if (message.status === 'delivered') return target === 'read';
    return message.status === 'sent' || (message.status === 'unknown' && target !== 'unknown');
}

async function receiveStatus(tx: Prisma.TransactionClient, channel: ChannelConnection, input: Delivery) {
    const conversation: ChannelConversation | null = await tx.channelConversation.findUnique({ where: {
        shopId_channelId_externalId: { shopId: channel.shopId, channelId: channel.id, externalId: input.conversationId },
    } });
    if (!conversation) throw new NotFoundException();
    const message = await tx.channelMessage.findUnique({ where: { shopId_conversationId_externalId: {
        shopId: channel.shopId, conversationId: conversation.id, externalId: input.messageId,
    } }, include: { dispatch: { select: { channelGeneration: true } } } });
    if (!message || message.direction !== 'outbound' || message.dispatch?.channelGeneration !== channel.generation) throw new NotFoundException();
    if (!markAllowed(message, input.status)) return { duplicate: false, messageId: message.id };
    const updated = await tx.channelMessage.update({ where: inboxKey(channel.shopId, message.id),
        data: { status: input.status, version: { increment: 1 } } });
    await enqueueResourceUpdate(tx, 'message.created', updated);
    return { duplicate: false, messageId: message.id };
}

export class MessengerFixture {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    receive(input: MessengerEvent, signature?: string) {
        const { config } = this;
        if (!this.db || !messengerFixtureEnabled(config)) throw new NotFoundException();
        if (!signature || !/^[a-f0-9]{64}$/.test(signature) ||
            !timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(signMessengerFixtureEvent(config.signingKey, input), 'hex'))) {
            throw new NotFoundException();
        }
        const occurredAt = new Date(input.occurredAt);
        if (!Number.isFinite(occurredAt.getTime()) || occurredAt.getTime() > Date.now() + 30000) throw new UnprocessableEntityException();
        const contentHash = createHash('sha256').update(eventContent(input)).digest('hex');
        return serializable(this.db, async tx => {
            const channel = await tx.channelConnection.findFirst({ where: {
                provider: 'messenger', pageId: input.pageId, status: 'connected', generation: input.generation, policyVersion: messengerFixturePolicy,
            } });
            if (!channel) throw new NotFoundException();
            return recordMessengerEvent(tx, channel, { externalId: input.eventId, occurredAt, contentHash }, () =>
                input.type === 'message' ? receiveMessengerMessage(tx, channel, input, occurredAt, 'fixture', config) : receiveStatus(tx, channel, input));
        }, true);
    }
}

@Controller('integrations/messenger-fixture')
export class MessengerFixtureController {
    constructor(private readonly fixture: MessengerFixture) {}

    @Post('events')
    @HttpCode(200)
    async event(@Body(eventInput) input: MessengerEvent, @Headers('x-botsales-fixture-signature') signature: string | undefined,
        @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.fixture.receive(input, signature));
    }
}
