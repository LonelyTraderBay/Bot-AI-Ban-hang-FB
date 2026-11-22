import { Body, Controller, ForbiddenException, Get, Param, Put, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { Prisma, type NotificationPolicy, type PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, validUuid } from '../../http/query.js';
import { noStore, requireVersion, versionedEnvelope } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig } from '../workspace/index.js';
import { availableRecipients, notificationFixture } from './deliveries.js';
import { telegramFallbackDevice } from './schedule.js';
import type { TelegramConfig } from './telegram.js';
import { notificationPriorities, type EventPriorities } from './event-priorities.js';

type Policy = {
    enabled: boolean; timezone: string; quietHours: { start: string; end: string } | null; remindAfterMinutes: number | null;
    maxReminders: number; primaryUserIds: string[]; fallbackUserIds: string[];
    fallbackChannel: 'none' | 'telegram'; urgentMayBypassQuietHours: boolean; expectedVersion: number;
    eventPriorities?: EventPriorities;
};
const policyBody = new SchemaPipe(validator.compile(schemaFromContract('NotificationPolicyWrite')));
export const notificationPolicyCommand = { operationId: 'updateNotificationPolicy', resourceType: 'notification_policy' };

function policyView(shop: { id: string; timezone: string; createdAt: Date }, policy: NotificationPolicy | null) {
    return {
        id: shop.id, shopId: shop.id, version: policy?.version ?? 1, timezone: shop.timezone,
        createdAt: policy?.createdAt ?? shop.createdAt, updatedAt: policy?.updatedAt ?? shop.createdAt,
        enabled: policy?.enabled ?? false, quietHours: policy?.quietStart && policy.quietEnd ?
            { start: policy.quietStart, end: policy.quietEnd } : null,
        remindAfterMinutes: policy?.remindAfterMinutes ?? null, maxReminders: policy?.maxReminders ?? 0,
        primaryUserIds: policy?.primaryUserIds ?? [], fallbackUserIds: policy?.fallbackUserIds ?? [],
        fallbackChannel: policy?.fallbackChannel ?? 'none', urgentMayBypassQuietHours: policy?.urgentMayBypassQuietHours ?? false,
        ...(policy?.eventPriorities ? { eventPriorities: notificationPriorities(policy) } : {}),
    };
}

export class NotificationPolicyService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig, private readonly telegram?: TelegramConfig) {}

    get(headers: IncomingHttpHeaders, shopId: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            await requireShopAccess(tx, userId, shopId, 'notifications.read');
            const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, include: { notificationPolicy: true } });
            return policyView(shop, shop.notificationPolicy);
        });
    }

    update(headers: IncomingHttpHeaders, shopId: string, input: Policy, requestId: string) {
        const { operationId, resourceType } = notificationPolicyCommand;
        return writeShopCommand(this.db, this.config, {
            headers, shopId, operationId, permission: 'notifications.manage', payload: input,
        }, async (tx, scope) => {
            const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, include: { notificationPolicy: true } });
            requireVersion(shop.notificationPolicy?.version ?? 1, input.expectedVersion);
            if (input.urgentMayBypassQuietHours && !scope.roles.includes('owner')) throw new ForbiddenException();
            const ids = [...new Set([...input.primaryUserIds, ...input.fallbackUserIds])];
            if (input.timezone !== shop.timezone || (input.quietHours && input.quietHours.start === input.quietHours.end) ||
                input.maxReminders > 48 || (input.remindAfterMinutes !== null && input.remindAfterMinutes > 10080) ||
                (input.enabled && (!input.primaryUserIds.length || input.remindAfterMinutes === null)) ||
                (input.fallbackChannel === 'telegram' && !input.fallbackUserIds.length) ||
                ids.length > 100 || new Set(input.primaryUserIds).size !== input.primaryUserIds.length ||
                new Set(input.fallbackUserIds).size !== input.fallbackUserIds.length || ids.some(id => !validUuid(id))) throw new UnprocessableEntityException();
            if ((await availableRecipients(tx, shopId, ids)).length !== ids.length) throw new UnprocessableEntityException();
            if (input.fallbackChannel === 'telegram') {
                const linked = this.telegram ? await telegramFallbackDevice(tx, {
                    shopId, fallbackChannel: 'telegram', fallbackUserIds: input.fallbackUserIds,
                }, this.telegram) : notificationFixture(this.config) && await tx.notificationDevice.findFirst({
                    where: { shopId, userId: { in: input.fallbackUserIds }, channel: 'telegram', status: 'active', telegramChatCiphertext: null },
                    select: { id: true },
                });
                if (!linked) throw new UnprocessableEntityException();
            }
            const priorities = input.eventPriorities ?? (shop.notificationPolicy?.eventPriorities
                ? notificationPriorities(shop.notificationPolicy) : null);
            const values = {
                enabled: input.enabled, timezone: input.timezone, quietStart: input.quietHours?.start ?? null,
                quietEnd: input.quietHours?.end ?? null, remindAfterMinutes: input.remindAfterMinutes, maxReminders: input.maxReminders,
                fallbackChannel: input.fallbackChannel === 'telegram' ? 'telegram' as const : null,
                primaryUserIds: input.primaryUserIds, fallbackUserIds: input.fallbackUserIds,
                urgentMayBypassQuietHours: input.urgentMayBypassQuietHours,
                eventPriorities: priorities ?? Prisma.DbNull,
                version: input.expectedVersion + 1,
            };
            await tx.notificationPolicy.upsert({ where: { shopId }, create: { shopId, ...values }, update: values });
            await recordAudit(tx, { shopId, actorId: scope.userId, action: operationId, requestId,
                resourceType, resourceId: shopId, metadata: { version: values.version, enabled: input.enabled,
                    eventPriorities: priorities, urgentMayBypassQuietHours: values.urgentMayBypassQuietHours } });
            return { type: resourceType, id: shopId };
        }, async tx => {
            const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, include: { notificationPolicy: true } });
            return policyView(shop, shop.notificationPolicy);
        });
    }
}

@Controller('shops/:shopId/notification-policy')
export class NotificationPolicyController {
    constructor(private readonly policy: NotificationPolicyService) {}

    @Get()
    @ContractOperation('getNotificationPolicy')
    async get(@Param('shopId', idPipe) shopId: string, @Req() request: IncomingMessage,
        @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.policy.get(request.headers, shopId));
    }

    @Put()
    @ContractOperation('updateNotificationPolicy')
    async update(@Param('shopId', idPipe) shopId: string, @Body(policyBody) input: Policy, @Req() request: IncomingMessage,
        @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.policy.update(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }
}
