import { Body, ConflictException, Controller, Get, HttpCode, Module, NotFoundException, Param, Post, Query, Req, Res, type DynamicModule } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { AppNotification, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging, validUuid } from '../../http/query.js';
import { envelope, noStore, requireVersion, versionedEnvelope } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig } from '../workspace/index.js';
import { DeviceController, DeviceService } from './devices.js';
import { NotificationPolicyController, NotificationPolicyService } from './policy.js';
import { TelegramWebhook, TelegramWebhookController, type TelegramConfig } from './telegram.js';
import type { WebPushConfig } from './web-push.js';

const ackBody = new SchemaPipe(validator.compile(schemaFromContract('ClaimWorkRequest')));
export const acknowledgeCommand = { operationId: 'acknowledgeNotification', resourceType: 'notification' };
export { acceptFixturePairing, deviceCommands, deviceTestHandler } from './devices.js';
export { notificationPolicyCommand } from './policy.js';
export { cancelPreparationReminders, dispatchPreparationNotifications, duringQuietHours, notifyPreparation } from './schedule.js';
export { publishOperationNotices } from './operation-notices.js';
export { deliverNotification } from './deliveries.js';
export { readWebPushConfig, type WebPushConfig } from './web-push.js';
export { dispatchExternalNotifications } from './notification-dispatch.js';
export { readTelegramConfig, type TelegramConfig } from './telegram.js';

async function notificationForUser(tx: Prisma.TransactionClient, shopId: string, userId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const notification = await tx.appNotification.findFirst({ where: { shopId, recipientUserId: userId, id } });
    if (!notification) throw new NotFoundException();
    return notification;
}

function notificationView(notification: AppNotification, canAcknowledge: boolean) {
    const { id, shopId, version, createdAt, updatedAt, sourceId, sourceType, workItemId, recipientUserId, channel,
        title, safeBody, deliveryStatus, openedAt, acknowledgedAt } = notification;
    return {
        id, shopId, version, createdAt, updatedAt, source: { type: sourceType, id: sourceId }, workItemId, recipientUserId, channel,
        title, safeBody, deliveryStatus, openedAt, acknowledgedAt,
        allowedActions: canAcknowledge && workItemId && !acknowledgedAt ? ['acknowledge'] : [],
    };
}

class NotificationsService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'notifications.read');
            const page = paging(listQuery(raw, 'page'), ['notifications', shopId, userId, String(scope.permissionVersion)]);
            const result = page.result(await tx.appNotification.findMany({
                where: { shopId, recipientUserId: userId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1,
            }));
            return { ...result, data: result.data.map(item => notificationView(item, scope.permissions.includes('operations.claim'))) };
        });
    }

    get(headers: IncomingHttpHeaders, shopId: string, notificationId: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'notifications.read');
            return notificationView(await notificationForUser(tx, shopId, userId, notificationId), scope.permissions.includes('operations.claim'));
        });
    }

    acknowledge(headers: IncomingHttpHeaders, shopId: string, notificationId: string, input: { expectedVersion: number }, requestId: string) {
        const { operationId, resourceType } = acknowledgeCommand;
        return writeShopCommand(this.db, this.config, {
            headers, shopId, operationId, permission: 'operations.claim', payload: { notificationId, input },
        }, async (tx, scope) => {
            const current = await notificationForUser(tx, shopId, scope.userId, notificationId);
            requireVersion(current.version, input.expectedVersion);
            if (!current.workItemId || current.acknowledgedAt) throw new ConflictException();
            const now = new Date();
            const updated = await tx.appNotification.update({
                where: { shopId_id: { shopId, id: current.id } },
                data: { openedAt: current.openedAt ?? now, acknowledgedAt: now, version: { increment: 1 } },
            });
            await recordAudit(tx, {
                shopId, actorId: scope.userId, action: operationId, requestId, resourceType, resourceId: current.id, metadata: { version: updated.version },
            });
            await enqueueResourceUpdate(tx, 'notification.updated', updated);
            return { type: resourceType, id: current.id };
        }, async (tx, scope, result) => {
            if (result.type !== resourceType) throw new ConflictException();
            return notificationView(await notificationForUser(tx, shopId, scope.userId, result.id), true);
        });
    }
}

@Controller('shops/:shopId/notifications')
class NotificationsController {
    constructor(private readonly notifications: NotificationsService) {}

    @Get()
    @ContractOperation('listNotifications')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.notifications.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get(':resourceId')
    @ContractOperation('getNotification')
    async get(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.notifications.get(request.headers, shopId, id));
    }

    @Post(':resourceId/acknowledge')
    @HttpCode(200)
    @ContractOperation('acknowledgeNotification')
    async acknowledge(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(ackBody) input: { expectedVersion: number },
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.notifications.acknowledge(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }
}

@Module({})
class NotificationsModule {}

export function notificationsModule(db?: PrismaClient, config?: AuthConfig, webPush?: WebPushConfig, telegram?: TelegramConfig): DynamicModule {
    return {
        module: NotificationsModule, controllers: [NotificationsController, DeviceController, NotificationPolicyController,
            ...(telegram ? [TelegramWebhookController] : [])],
        providers: [
            { provide: NotificationsService, useFactory: () => new NotificationsService(db, config) },
            { provide: DeviceService, useFactory: () => new DeviceService(db, config, webPush, telegram) },
            { provide: NotificationPolicyService, useFactory: () => new NotificationPolicyService(db, config, telegram) },
            ...(telegram ? [{ provide: TelegramWebhook, useFactory: () => new TelegramWebhook(db, config, telegram) }] : []),
        ],
    };
}
