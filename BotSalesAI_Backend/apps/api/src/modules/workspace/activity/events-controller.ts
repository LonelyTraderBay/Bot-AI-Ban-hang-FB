import { Controller, Get, NotFoundException, Param, Req, Res, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { ContractOperation } from '../../../http/operations.js';
import { idPipe } from '../../../http/query.js';
import { noStore } from '../../../http/response.js';
import { outboxResource } from '../../../platform/outbox/index.js';
import { headerValue } from '../auth/session-tokens.js';
import { ActivityService } from './activity-service.js';

function controlEvent(response: ServerResponse, shopId: string, sequence: bigint, type: 'resync.required' | 'session.revoked') {
    return frame(response, '', {
        eventId: randomUUID(), type, schemaVersion: 2, shopId, resourceType: 'shop', resourceId: shopId,
        resourceVersion: 0, occurredAt: new Date().toISOString(), sequence: Number(sequence),
    });
}

function frame(response: ServerResponse, id: string, value: object) {
    return response.write('id: ' + id + '\ndata: ' + JSON.stringify(value) + '\n\n');
}

@Controller('shops/:shopId/events')
export class EventsController {
    constructor(private readonly activity: ActivityService) {}

    @Get()
    @ContractOperation('subscribeEvents')
    async stream(@Param('shopId', idPipe) shopId: string, @Req() request: IncomingMessage, @Res() response: ServerResponse) {
        noStore(response);
        const initial = await this.activity.openEvents(request.headers, shopId, headerValue(request.headers, 'last-event-id'));
        const disconnected = new AbortController();
        response.once('close', () => disconnected.abort());
        if (response.destroyed) return;
        response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        response.setHeader('X-Accel-Buffering', 'no');
        response.flushHeaders();
        let after = initial.after;
        let heartbeatAt = Date.now() + 15000;
        try {
            if (initial.resync && !controlEvent(response, shopId, after, 'resync.required')) return;
            if (!response.write(': connected\n\n')) return;
            while (!disconnected.signal.aborted) {
                const events = await this.activity.nextEvents(request.headers, shopId, after, initial.permissionVersion);
                if (disconnected.signal.aborted) return;
                if (!events) {
                    controlEvent(response, shopId, after, 'session.revoked');
                    return;
                }
                for (const event of events.rows) {
                    const resource = outboxResource(event);
                    if (!resource || event.sequence === null) continue;
                    const sequence = Number(event.sequence);
                    if (!Number.isSafeInteger(sequence) || !frame(response, event.id, {
                        eventId: event.id, type: event.eventType, schemaVersion: 2, shopId, ...resource,
                        resourceVersion: resource.resourceVersion ?? sequence, occurredAt: event.createdAt.toISOString(), sequence,
                    })) return;
                }
                after = events.after;
                if (Date.now() >= heartbeatAt) {
                    if (!response.write(': heartbeat\n\n')) return;
                    heartbeatAt = Date.now() + 15000;
                }
                await delay(500, undefined, { signal: disconnected.signal });
            }
        } catch (error) {
            if (!response.destroyed && (error instanceof UnauthorizedException || error instanceof NotFoundException)) {
                controlEvent(response, shopId, after, 'session.revoked');
            }
        } finally {
            if (!response.destroyed) response.end();
        }
    }
}
