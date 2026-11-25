import { BadRequestException, Body, Controller, Get, HttpCode, NotFoundException, Post, Query, Req, Res,
    ServiceUnavailableException, UnsupportedMediaTypeException, type RawBodyRequest } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { noStore } from '../../http/response.js';
import { serializable } from '../../platform/database/transactions.js';
import type { ApprovedEvaluationConfig } from '../ai/index.js';
import { metaNumericId, resolveMetaInboundChannel, type MetaInboundConfig } from '../channels/index.js';
import { ErasedChannelContact, metaMessageDigest, recordMessengerEvent, receiveMessengerMessage } from './messenger-inbound.js';

const digest = (value: string) => createHash('sha256').update(value).digest();
const record = (value: unknown): Record<string, unknown> | undefined =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

function parseTextMessage(event: unknown, pageId: string, senderIds: ReadonlySet<string>, now: number) {
    const row = record(event);
    const senderId = record(row?.sender)?.id;
    const message = record(row?.message);
    const time = row?.timestamp;
    if (typeof senderId !== 'string' || !senderIds.has(senderId) || record(row?.recipient)?.id !== pageId ||
        typeof time !== 'number' || !Number.isSafeInteger(time) || time <= 0 || time > now + 30000 || !message ||
        (message.is_echo !== undefined && message.is_echo !== false) || typeof message.mid !== 'string' || !message.mid ||
        typeof message.text !== 'string' || !message.text.trim() || message.text.length > 20000 || message.text.includes('\0')) return undefined;
    const messageId = 'meta:' + digest(message.mid).toString('hex');
    return { senderId, conversationId: senderId, messageId, displayName: 'Liên hệ Messenger', text: message.text.trim(), occurredAt: new Date(time) };
}

export class MetaMessenger {
    constructor(private readonly db: PrismaClient | undefined, private readonly config: MetaInboundConfig, private readonly ai?: ApprovedEvaluationConfig) {}

    challenge(query: Record<string, unknown>) {
        const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = query;
        if (mode !== 'subscribe' || typeof token !== 'string' || !timingSafeEqual(digest(token), digest(this.config.verifyToken)) ||
            typeof challenge !== 'string' || !/^[!-~]{1,256}$/.test(challenge)) throw new NotFoundException();
        return challenge;
    }

    async receive(body: unknown, request: RawBodyRequest<IncomingMessage>) {
        const mediaType = request.headers['content-type']?.split(';')[0]?.trim().toLowerCase();
        if (mediaType !== 'application/json' || !request.rawBody || (request.headers['content-encoding'] && request.headers['content-encoding'] !== 'identity')) {
            throw new UnsupportedMediaTypeException();
        }
        const signature = request.headers['x-hub-signature-256'];
        const match = typeof signature === 'string' && /^sha256=([0-9a-f]{64})$/i.exec(signature);
        if (!match || !timingSafeEqual(Buffer.from(match[1]!, 'hex'), createHmac('sha256', this.config.appSecret).update(request.rawBody).digest())) {
            throw new NotFoundException();
        }
        if (!this.db) throw new ServiceUnavailableException();
        const payload = record(body);
        if (payload?.object !== 'page' || !Array.isArray(payload.entry)) throw new BadRequestException();
        const now = Date.now();
        for (const entry of payload.entry) {
            const page = record(entry);
            if (typeof page?.id !== 'string' || !metaNumericId.test(page.id) || !Array.isArray(page.messaging)) continue;
            const pageId = page.id;
            const scope = this.config.pages.get(pageId);
            if (!scope) continue;
            for (const event of page.messaging) {
                const message = parseTextMessage(event, pageId, scope.senderIds, now);
                if (!message) continue;
                const { occurredAt } = message;
                const contentHash = metaMessageDigest(pageId, message.senderId, occurredAt, message.text);
                try {
                    await serializable(this.db, async tx => {
                        const channel = await resolveMetaInboundChannel(tx, pageId, scope.shopId);
                        if (!channel) return;
                        await recordMessengerEvent(tx, channel, { externalId: message.messageId, occurredAt, contentHash }, closedAt =>
                            receiveMessengerMessage(tx, channel, message, occurredAt, 'provider', closedAt, undefined, this.ai));
                    }, true);
                } catch (error) {
                    if (!(error instanceof ErasedChannelContact)) throw error;
                }
            }
        }
        return 'EVENT_RECEIVED';
    }
}

@Controller('integrations/meta/messenger')
export class MetaMessengerController {
    constructor(private readonly messenger: MetaMessenger) {}

    @Get('webhook')
    challenge(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        response.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return this.messenger.challenge(query);
    }

    @Post('webhook')
    @HttpCode(200)
    event(@Req() request: RawBodyRequest<IncomingMessage>, @Body() body: unknown, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        response.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return this.messenger.receive(body, request);
    }
}
