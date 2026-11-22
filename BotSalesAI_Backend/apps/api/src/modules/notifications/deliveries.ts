import { createHash } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { permissionsFor, usesLocalOidcFixture, type AuthConfig } from '../workspace/index.js';

type NotificationIntent = Pick<Prisma.AppNotificationUncheckedCreateInput,
    'shopId' | 'workItemId' | 'sourceType' | 'sourceId' | 'recipientUserId' | 'title' | 'safeBody' | 'channel' | 'deliveryStatus' |
    'pushDeviceId' | 'pushPolicyVersion' | 'pushWorkVersion' | 'pushDeviceVersion' | 'pushDeadlineAt'>;

export const fingerprint = (text: string) => createHash('sha256').update(text).digest('hex');
export const notificationFixture = (config?: AuthConfig) =>
    process.env.NOTIFICATION_FIXTURE_ADAPTER === '1' && Boolean(config && usesLocalOidcFixture(config));

export async function deliverNotification(tx: Prisma.TransactionClient, intent: NotificationIntent, sequence: number | string = 0) {
    const { recipientUserId, shopId, sourceId, sourceType, workItemId } = intent;
    const identity = [sourceType, sourceId, workItemId ?? null];
    const deliveryIntent = typeof sequence === 'string' ? sequence : fingerprint(JSON.stringify(sequence ? [...identity, sequence] : identity));
    const [created] = await tx.appNotification.createManyAndReturn({
        data: [{ ...intent, deliveryIntent }], skipDuplicates: true,
    });
    if (created) await enqueueResourceUpdate(tx, 'notification.updated', { ...created, recipientUserId, shopId });
    return created;
}

export async function availableRecipients(tx: Prisma.TransactionClient, shopId: string, ids: string[]) {
    const members = await tx.membership.findMany({
        where: { shopId, status: 'active', userId: { in: ids } }, select: { userId: true, roles: true },
    });
    return members.flatMap(member => {
        const permissions = permissionsFor(member.roles);
        return permissions.includes('notifications.read') && permissions.includes('operations.claim') ? [member.userId] : [];
    });
}
