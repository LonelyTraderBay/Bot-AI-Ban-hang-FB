import type { AppNotification, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { serializable } from '../../platform/database/transactions.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { lockAutomationFence, notificationBudgetAvailable } from '../operations/index.js';
import { availableRecipients, deliverNotification } from './deliveries.js';
import { notificationTarget, type NotificationProviders } from './notification-target.js';
import { duringQuietHours, preparationNotice, queuedDelivery, telegramFallbackDevice } from './schedule.js';
import type { ProviderObservation } from './web-push.js';

const unsent = { deliveryStatus: 'queued', pushDeviceId: { not: null } } as const;
const failed: ProviderObservation = { status: 'failed', expired: false };
const uncertainty: ProviderObservation = { status: 'unknown', expired: false };

async function activeWork(tx: Prisma.TransactionClient, notice: AppNotification, now: Date) {
    const { shopId, workItemId, pushDeadlineAt } = notice;
    if (notice.sourceType !== 'order' || !workItemId || !pushDeadlineAt || pushDeadlineAt <= now ||
        (await lockAutomationFence(tx, shopId)).paused) return undefined;
    const work = await tx.workItem.findUnique({ where: { shopId_id: { shopId, id: workItemId } } });
    const policy = await tx.notificationPolicy.findUnique({ where: { shopId } });
    if (work?.state !== 'queued' || work.assigneeUserId || work.version !== notice.pushWorkVersion ||
        (work.dueAt && work.dueAt <= now) || !policy?.enabled || policy.version !== notice.pushPolicyVersion ||
        (policy.quietStart && policy.quietEnd && duringQuietHours(now, policy.timezone, policy.quietStart, policy.quietEnd))) return undefined;
    return { work, policy, deadline: pushDeadlineAt };
}

async function currentTarget(db: PrismaClient, notification: AppNotification, now: Date, providers: NotificationProviders) {
    const { shopId, id, recipientUserId } = notification;
    return db.$transaction(async tx => {
        const current = await tx.appNotification.findUnique({
            where: { shopId_id: { shopId, id } }, include: { pushDevice: true },
        });
        if (!current || current.deliveryStatus !== 'queued' || current.pushDevice?.status !== 'active' ||
            current.pushDevice.channel !== current.channel || (current.pushDeviceVersion && current.pushDevice.version !== current.pushDeviceVersion)) return undefined;
        const context = await activeWork(tx, current, now);
        if (!context) return undefined;
        const { policy, deadline } = context;
        const recipients = current.channel === 'telegram' && policy.fallbackChannel === 'telegram' ? policy.fallbackUserIds
            : current.channel === 'web_push' ? policy.primaryUserIds : [];
        if (!recipients.includes(recipientUserId)) return undefined;
        if (!(await availableRecipients(tx, shopId, [recipientUserId])).length) return undefined;
        const send = notificationTarget(current.pushDevice, providers);
        const ttl = Math.floor((deadline.getTime() - now.getTime()) / 1000);
        return send && ttl > 0 ? { send, ttl, device: current.pushDevice } : undefined;
    }, { isolationLevel: 'RepeatableRead' });
}

async function queueFallback(tx: Prisma.TransactionClient, notice: AppNotification, now: Date, providers: NotificationProviders) {
    if (!providers.telegram || !providers.appOrigin) return;
    const context = await activeWork(tx, notice, now);
    if (!context) return;
    const { work, policy, deadline } = context;
    const binding = { shopId: notice.shopId, workItemId: work.id, deliveryIntent: notice.deliveryIntent };
    if (await tx.appNotification.findFirst({ where: { ...binding, OR: [
        { channel: 'telegram' }, { channel: 'web_push', deliveryStatus: { not: 'failed' } },
    ] }, select: { id: true } })) return;
    const device = await telegramFallbackDevice(tx, policy, providers.telegram);
    if (!device || !await notificationBudgetAvailable(tx, notice.shopId, policy.timezone, now)) return;
    await deliverNotification(tx, { ...preparationNotice(work, device.userId), ...queuedDelivery(device, policy.version, work, now),
        channel: 'telegram', pushDeadlineAt: deadline }, notice.deliveryIntent);
}

export async function dispatchExternalNotifications(db: PrismaClient, providers: NotificationProviders, now = new Date(), request = fetch) {
    const due = await db.appNotification.findFirst({
        where: { ...unsent, OR: [{ deliveryStartedAt: null }, { deliveryStartedAt: { lte: new Date(now.getTime() - 60_000) } }] },
        orderBy: [{ createdAt: 'asc' }, { shopId: 'asc' }, { id: 'asc' }],
    });
    if (!due) return;
    const { shopId, id } = due;
    // An indeterminate attempt is settled after its deadline without an additional provider call.
    const started = due.deliveryStartedAt ?? now;
    if (!due.deliveryStartedAt) {
        const claim = await db.appNotification.updateMany({
            where: { ...unsent, shopId, id, deliveryStartedAt: null }, data: { deliveryStartedAt: started },
        });
        if (!claim.count) return;
    }
    const target = !due.deliveryStartedAt ? await currentTarget(db, due, now, providers) : undefined;
    const result = target
        ? await target.send({
            eventId: id, title: due.title, safeBody: due.safeBody, path: '/s/' + shopId + '/orders/' + due.sourceId,
        }, target.ttl, request)
        : due.deliveryStartedAt ? uncertainty : failed;
    await serializable(db, async tx => {
        const [updated] = await tx.appNotification.updateManyAndReturn({
            where: { ...unsent, shopId, id, deliveryStartedAt: started },
            data: { deliveryStatus: result.status, version: { increment: 1 } },
        });
        if (!updated) return;
        if (result.expired && target) await tx.notificationDevice.updateMany({
            where: { shopId, id: target.device.id, version: target.device.version, status: 'active' },
            data: { status: 'expired', lastVerifiedAt: null, pushSubscriptionCiphertext: null, telegramChatCiphertext: null,
                version: { increment: 1 } },
        });
        await enqueueResourceUpdate(tx, 'notification.updated', updated);
        if (target && due.channel === 'web_push' && result.status === 'failed') await queueFallback(tx, due, now, providers);
    }, true);
}
