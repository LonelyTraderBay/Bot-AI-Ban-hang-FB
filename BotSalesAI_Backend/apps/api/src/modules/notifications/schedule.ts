import { lockShopClosure } from '../../platform/database/shop-lifecycle.js';
import type { NotificationPolicy, Prisma, PrismaClient, WorkItem } from '../../generated/prisma/client.js';
import { serializable } from '../../platform/database/transactions.js';
import { createWorkItem, lockAutomationFence, notificationBudgetAvailable, setWorkState } from '../operations/index.js';
import type { AuthConfig } from '../workspace/index.js';
import { availableRecipients, deliverNotification, notificationFixture } from './deliveries.js';
import { notificationBlockedByQuietHours, notificationPriorities, type EventPriority } from './event-priorities.js';
import type { NotificationProviders } from './notification-target.js';
import { openTelegramChat, type TelegramConfig } from './telegram.js';

type Source = { shopId: string; id: string; sourceType: string; sourceId: string };

export { duringQuietHours } from './event-priorities.js';

export function preparationNotice(work: Source, recipientUserId: string, priority: EventPriority = 'normal') {
    return { shopId: work.shopId, workItemId: work.id, sourceType: work.sourceType, sourceId: work.sourceId, recipientUserId,
        title: priority === 'urgent' ? 'Khẩn · Đơn cần chuẩn bị' : 'Đơn cần chuẩn bị', safeBody: 'Có công việc đang chờ nhận.' };
}

export async function notifyPreparation(tx: Prisma.TransactionClient, work: Source, confirmedBy: string, now = new Date()) {
    const { shopId, id: workItemId } = work;
    const policy = await tx.notificationPolicy.findUnique({ where: { shopId } });
    const priority = notificationPriorities(policy).order;
    if (priority === 'off') return;
    let recipients = [confirmedBy];
    if (policy?.enabled) {
        const primary = await availableRecipients(tx, shopId, policy.primaryUserIds);
        const assigned = primary.length ? primary : await availableRecipients(tx, shopId, policy.fallbackUserIds);
        if (assigned.length) recipients = assigned;
        await tx.workNotificationSchedule.create({
            data: { shopId, workItemId, policyVersion: policy.version, nextDueAt: now },
        });
        if (policy.eventPriorities && notificationBlockedByQuietHours(policy, priority, now)) return;
    }
    for (const id of recipients) await deliverNotification(tx, preparationNotice(work, id, priority));
}

export async function cancelPreparationReminders(tx: Prisma.TransactionClient, shopId: string, workItemId: string) {
    const where = { shopId_workItemId: { shopId, workItemId } };
    const schedule = await tx.workNotificationSchedule.findUnique({ where });
    if (!schedule) return;
    if (schedule.nextDueAt) await tx.workNotificationSchedule.update({ where, data: { nextDueAt: null } });
    const recovery = await tx.workItem.findUnique({ where: { shopId_kind_sourceType_sourceId: {
        shopId, kind: 'recovery', sourceType: 'notification_schedule', sourceId: workItemId,
    } } });
    if (recovery && recovery.state !== 'completed' && recovery.state !== 'cancelled') {
        await setWorkState(tx, shopId, recovery.id, 'cancelled');
    }
}

export async function telegramFallbackDevice(tx: Prisma.TransactionClient,
    policy: Pick<NotificationPolicy, 'shopId' | 'fallbackChannel' | 'fallbackUserIds'>, config: TelegramConfig) {
    if (policy.fallbackChannel !== 'telegram') return undefined;
    const userIds = await availableRecipients(tx, policy.shopId, policy.fallbackUserIds);
    const devices = await tx.notificationDevice.findMany({
        where: { shopId: policy.shopId, status: 'active', channel: 'telegram', userId: { in: userIds }, telegramChatCiphertext: { not: null } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    for (const userId of policy.fallbackUserIds) {
        const device = devices.find(row => row.userId === userId && openTelegramChat(config, row));
        if (device) return device;
    }
    return undefined;
}

export function queuedDelivery(device: { id: string; version: number }, policyVersion: number,
    work: Pick<WorkItem, 'version' | 'dueAt'>, now: Date) {
    return { deliveryStatus: 'queued' as const, pushDeviceId: device.id, pushDeviceVersion: device.version,
        pushPolicyVersion: policyVersion, pushWorkVersion: work.version,
        pushDeadlineAt: new Date(Math.min(work.dueAt?.getTime() ?? Infinity, now.getTime() + 300_000)) };
}

export async function dispatchPreparationNotifications(db: PrismaClient, config?: AuthConfig, now = new Date(), providers: NotificationProviders = {}) {
    const { webPush, telegram, appOrigin } = providers;
    const due = await db.workNotificationSchedule.findMany({
        where: { nextDueAt: { lte: now }, workItem: { shop: { closedAt: null } } }, orderBy: [{ nextDueAt: 'asc' }, { shopId: 'asc' }, { workItemId: 'asc' }], take: 50,
        select: { shopId: true, workItemId: true },
    });
    for (const key of due) {
        await serializable(db, async tx => {
            if (await lockShopClosure(tx, key.shopId)) return;
            if ((await lockAutomationFence(tx, key.shopId)).paused) return;
            const where = { shopId_workItemId: key };
            const schedule = await tx.workNotificationSchedule.findUnique({ where, include: { workItem: true } });
            if (!schedule?.nextDueAt || schedule.nextDueAt > now) return;
            const { workItem, reminderCount } = schedule;
            const policy = await tx.notificationPolicy.findUnique({ where: { shopId: key.shopId } });
            const priority = notificationPriorities(policy).order;
            if (!policy?.enabled || schedule.policyVersion !== policy.version || policy.remindAfterMinutes === null ||
                priority === 'off' || workItem.state !== 'queued' || workItem.assigneeUserId || (workItem.dueAt && workItem.dueAt <= now)) {
                await tx.workNotificationSchedule.update({ where, data: { nextDueAt: null } });
                return;
            }
            if (notificationBlockedByQuietHours(policy, priority, now)) {
                await tx.workNotificationSchedule.update({ where, data: { nextDueAt: new Date(now.getTime() + 60000) } });
                return;
            }
            const primary = await availableRecipients(tx, key.shopId, policy.primaryUserIds);
            const fallback = await availableRecipients(tx, key.shopId, policy.fallbackUserIds);
            if (!primary.length && !fallback.length) {
                await createWorkItem(tx, { shopId: key.shopId, kind: 'recovery', sourceType: 'notification_schedule',
                    sourceId: workItem.id, dueAt: now });
                await tx.workNotificationSchedule.update({ where, data: { nextDueAt: null } });
                return;
            }
            const fixture = notificationFixture(config);
            const pushOrigins = [
                ...(webPush ? [{ pushSubscriptionCiphertext: { not: null } }] : []),
                ...(fixture ? [{ pushSubscriptionCiphertext: null }] : []),
            ];
            const devices = fixture || webPush ? await tx.notificationDevice.findMany({
                where: { shopId: key.shopId, status: 'active', OR: [
                    { channel: 'web_push', userId: { in: primary }, OR: pushOrigins },
                    ...(fixture && policy.fallbackChannel === 'telegram' ? [{ channel: 'telegram' as const, userId: { in: fallback },
                        telegramChatCiphertext: null }] : []),
                ] }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            }) : [];
            const push = devices.filter(device => device.channel === 'web_push');
            const liveFallback = !push.length && telegram && appOrigin ? await telegramFallbackDevice(tx, policy, telegram) : undefined;
            const eligible = push.length ? [...push.filter(device => device.pushSubscriptionCiphertext), ...push.filter(device => !device.pushSubscriptionCiphertext)]
                : liveFallback ? [liveFallback] : devices.filter(device => device.channel === 'telegram');
            const delivered = new Set<string>();
            for (const device of eligible) {
                if (delivered.has(device.userId)) continue;
                if (!await notificationBudgetAvailable(tx, key.shopId, policy.timezone, now)) break;
                delivered.add(device.userId);
                const delivery = device.pushSubscriptionCiphertext || device.telegramChatCiphertext ? queuedDelivery(device, policy.version, workItem, now)
                    : { deliveryStatus: device.fixtureOutcome };
                await deliverNotification(tx, { ...preparationNotice(workItem, device.userId, priority), channel: device.channel, ...delivery }, reminderCount);
            }
            if (reminderCount === 0 && policy.eventPriorities) {
                for (const recipient of primary.length ? primary : fallback) {
                    await deliverNotification(tx, preparationNotice(workItem, recipient, priority));
                }
            } else if (reminderCount > 0) {
                for (const recipient of primary.length ? primary : fallback) {
                    if (!delivered.has(recipient)) await deliverNotification(tx, preparationNotice(workItem, recipient, priority), reminderCount);
                }
            }
            await tx.workNotificationSchedule.update({ where, data: {
                reminderCount: reminderCount + 1,
                nextDueAt: reminderCount < policy.maxReminders ? new Date(now.getTime() + policy.remindAfterMinutes * 60000) : null,
            } });
        }, false);
    }
}
