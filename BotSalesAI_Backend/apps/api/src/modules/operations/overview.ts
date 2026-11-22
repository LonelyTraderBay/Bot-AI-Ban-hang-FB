import { NotFoundException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { OwnerDigest, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { serializable } from '../../platform/database/transactions.js';
import { jobWorker, observeJobWorker } from '../../platform/outbox/relay.js';
import { deliverNotification, duringQuietHours } from '../notifications/index.js';
import { permissionsFor, readAsSession, requireShopAccess, visibleUnknownCommandCount, type AuthConfig } from '../workspace/index.js';
import { currentAgentRoles, lockAutomationFence } from './automation.js';

const workActive = { in: ['queued', 'claimed', 'working', 'blocked'] } satisfies Prisma.EnumWorkItemStateFilter;

async function summary(tx: Prisma.TransactionClient, shopId: string, scope: Awaited<ReturnType<typeof requireShopAccess>>, auth?: AuthConfig) {
    const asOf = new Date();
    const queuedTasks = await tx.workItem.count({ where: { shopId, state: 'queued' } });
    const overdueTasks = await tx.workItem.count({ where: { shopId, state: workActive, dueAt: { lt: asOf } } });
    const pendingApprovals = scope.permissions.includes('approvals.read') ? await tx.approval.count({
        where: { shopId, status: 'pending', expiresAt: { gt: asOf } },
    }) : 0;
    const unknownCommands = await visibleUnknownCommandCount(tx, scope);
    const roles = scope.permissions.includes('bot.read') ? await currentAgentRoles(tx, shopId, auth) : [];
    const worker = await tx.workerHealth.findUnique({ where: { component: jobWorker.component } });
    const { expiresAt, fresh } = observeJobWorker(worker?.checkedAt, asOf);
    const backlog = fresh ? await tx.outboxEvent.findFirst({ where: {
        shopId, sequence: null, availableAt: { lt: new Date(asOf.getTime() - jobWorker.heartbeatTtlMs) },
    }, select: { id: true } }) : null;
    const health = [
        { component: 'postgresql', status: 'healthy', checkedAt: asOf, expiresAt: new Date(asOf.getTime() + 5000), reason: null },
        { component: 'worker', status: !fresh ? 'unknown' : backlog ? 'degraded' : 'healthy',
            checkedAt: worker?.checkedAt ?? null, expiresAt, reason: !fresh ? 'Chưa có lần kiểm worker còn hiệu lực.' :
                backlog ? 'Hàng đợi sự kiện của shop có mục chờ quá hạn.' : null },
    ];
    return { asOf, queuedTasks, overdueTasks, pendingApprovals, unknownCommands, roles, health };
}

function digestView({ periodDay: _periodDay, ...row }: OwnerDigest) {
    return row;
}

export class OperationsOverview {
    constructor(private readonly db?: PrismaClient, private readonly auth?: AuthConfig) {}

    summary(headers: IncomingHttpHeaders, shopId: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'operations.read');
            return summary(tx, shopId, scope, this.auth);
        });
    }

    digests(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'operations.read');
            const page = paging(listQuery(raw, 'page'), ['owner_digests', shopId, userId, String(scope.permissionVersion)]);
            const result = page.result(await tx.ownerDigest.findMany({ where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1 }));
            return { ...result, data: result.data.map(digestView) };
        });
    }

    digest(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            await requireShopAccess(tx, userId, shopId, 'operations.read');
            if (!validUuid(id)) throw new NotFoundException();
            const row = await tx.ownerDigest.findUnique({ where: { shopId_id: { shopId, id } } });
            if (!row) throw new NotFoundException();
            return digestView(row);
        });
    }
}

export async function publishOwnerDigests(db: PrismaClient, now = new Date(), hour = process.env.OWNER_DIGEST_LOCAL_HOUR) {
    if (hour === undefined || !/^(?:[0-9]|1[0-9]|2[0-3])$/.test(hour)) return;
    const due = await db.$queryRaw<{ shopId: string }[]>`
        SELECT s.id AS "shopId" FROM shops s
        JOIN notification_policies p ON p.shop_id=s.id AND p.enabled AND cardinality(p.primary_user_ids)>0
        JOIN shop_automation a ON a.shop_id=s.id AND NOT a.paused
        WHERE EXTRACT(hour FROM (${now}::timestamptz AT TIME ZONE s.timezone)) >= ${Number(hour)}
          AND NOT EXISTS (
            SELECT 1 FROM owner_digests d WHERE d.shop_id=s.id AND d.period_day=(${now}::timestamptz AT TIME ZONE s.timezone)::date-1
          )
        ORDER BY s.id LIMIT 60
    `;
    for (const { shopId } of due) await serializable(db, async tx => {
        if ((await lockAutomationFence(tx, shopId)).paused) return;
        const policy = await tx.notificationPolicy.findUnique({ where: { shopId } });
        if (!policy?.enabled || !policy.primaryUserIds.length ||
            (policy.quietStart && policy.quietEnd && duringQuietHours(now, policy.timezone, policy.quietStart, policy.quietEnd))) return;
        const owners = await tx.membership.findMany({ where: { shopId, userId: { in: policy.primaryUserIds }, status: 'active', roles: { has: 'owner' } },
            select: { userId: true, roles: true } });
        const recipients = owners.filter(row => permissionsFor(row.roles).includes('notifications.read'));
        if (!recipients.length) return;
        const [bounds] = await tx.$queryRaw<{ periodDay: Date; periodStart: Date; periodEnd: Date }[]>`
            WITH local_day AS (SELECT (${now}::timestamptz AT TIME ZONE ${policy.timezone})::date AS today)
            SELECT today-1 AS "periodDay", ((today-1)::timestamp AT TIME ZONE ${policy.timezone}) AS "periodStart",
                (today::timestamp AT TIME ZONE ${policy.timezone}) AS "periodEnd" FROM local_day
        `;
        const items = await tx.workItem.findMany({ where: { shopId, state: workActive, createdAt: { lt: bounds.periodEnd },
            OR: [{ state: 'blocked' }, { assigneeUserId: null }, { dueAt: { lt: bounds.periodEnd } }] },
        select: { id: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100 });
        const text = items.length ? 'Có công việc cần kiểm tra. Danh sách hiển thị tối đa 100 mục theo thứ tự mới nhất.'
            : 'Chưa có công việc cần kiểm tra cho kỳ này.';
        const [digest] = await tx.ownerDigest.createManyAndReturn({
            data: [{ shopId, ...bounds, status: 'accepted', workItemIds: items.map(row => row.id), text }], skipDuplicates: true,
        });
        if (!digest) return;
        for (const recipient of recipients) {
            await deliverNotification(tx, { shopId, recipientUserId: recipient.userId, sourceType: 'digest', sourceId: digest.id,
                title: 'Bản tin điều hành', safeBody: text });
        }
    }, true);
}
