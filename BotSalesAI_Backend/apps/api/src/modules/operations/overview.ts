import { NotFoundException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { OwnerDigest, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { serializable } from '../../platform/database/transactions.js';
import { deliverNotification, duringQuietHours } from '../notifications/index.js';
import { permissionsFor, readAsSession, requireShopAccess, visibleUnknownCommandCount, type AuthConfig } from '../workspace/index.js';
import { currentAgentRoles, lockAutomationFence } from './automation.js';
import { readOperationsHealth } from './health.js';

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
    const health = await readOperationsHealth(tx, scope, asOf);
    return { asOf, queuedTasks, overdueTasks, pendingApprovals, unknownCommands, roles, health };
}

type WorkGroup = { count: number; workItemIds: string[] };
type WorkBucket = 'pending' | 'blocked' | 'completed';
type DigestBounds = { periodDay: Date; periodStart: Date; periodEnd: Date };

async function workInPeriod(tx: Prisma.TransactionClient, shopId: string, { periodStart, periodEnd }: DigestBounds) {
    const rows = await tx.$queryRaw<({ bucket: WorkBucket | 'baseline' } & WorkGroup)[]>`
        WITH latest AS (
            SELECT DISTINCT ON (work_item_id) work_item_id, state, occurred_at, baseline
            FROM work_item_lifecycle
            WHERE shop_id = ${shopId}::uuid AND occurred_at < ${periodEnd}
            ORDER BY work_item_id, occurred_at DESC, event_id DESC
        ), categorized AS (
            SELECT work_item_id, occurred_at,
                CASE WHEN state IN ('queued', 'claimed', 'working') THEN 'pending'
                     WHEN state = 'blocked' THEN 'blocked'
                     WHEN state = 'completed' AND NOT baseline AND occurred_at >= ${periodStart} THEN 'completed'
                END AS bucket
            FROM latest
        ), ranked AS (
            SELECT *, row_number() OVER (PARTITION BY bucket ORDER BY occurred_at DESC, work_item_id) AS rank
            FROM categorized WHERE bucket IS NOT NULL
        )
        SELECT bucket, count(*)::integer AS count,
            array_agg(work_item_id ORDER BY rank) FILTER (WHERE rank <= 100) AS "workItemIds"
        FROM ranked GROUP BY bucket
        UNION ALL
        SELECT 'baseline', 1, ARRAY[]::uuid[] WHERE EXISTS (
            SELECT 1 FROM work_item_lifecycle history
            JOIN work_items work ON (work.shop_id, work.id) = (history.shop_id, history.work_item_id)
            WHERE history.shop_id = ${shopId}::uuid AND history.baseline AND history.occurred_at > ${periodStart}
              AND work.created_at < ${periodEnd}
        )
    `;
    const group = (name: WorkBucket): WorkGroup => {
        const row = rows.find(({ bucket }) => bucket === name);
        return row ? { count: row.count, workItemIds: row.workItemIds } : { count: 0, workItemIds: [] };
    };
    return {
        coverage: rows.some(({ bucket }) => bucket === 'baseline') ? 'partial' : 'complete',
        pending: group('pending'), blocked: group('blocked'), completed: group('completed'),
    };
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
        const [bounds] = await tx.$queryRaw<DigestBounds[]>`
            WITH local_day AS (SELECT (${now}::timestamptz AT TIME ZONE ${policy.timezone})::date AS today)
            SELECT today-1 AS "periodDay", ((today-1)::timestamp AT TIME ZONE ${policy.timezone}) AS "periodStart",
                (today::timestamp AT TIME ZONE ${policy.timezone}) AS "periodEnd" FROM local_day
        `;
        const workSummary = await workInPeriod(tx, shopId, bounds);
        const { pending, blocked, completed, coverage } = workSummary;
        const text = `Chờ xử lý: ${pending.count}. Bị chặn: ${blocked.count}. Hoàn tất trong kỳ: ${completed.count}.` +
            (coverage === 'partial' ? ' Lịch sử công việc của kỳ này còn thiếu.' : '');
        const workItemIds = [...blocked.workItemIds, ...pending.workItemIds, ...completed.workItemIds].slice(0, 100);
        const [digest] = await tx.ownerDigest.createManyAndReturn({
            data: [{ shopId, ...bounds, status: 'accepted', workItemIds, workSummary, text }], skipDuplicates: true,
        });
        if (!digest) return;
        for (const recipient of recipients) {
            await deliverNotification(tx, { shopId, recipientUserId: recipient.userId, sourceType: 'digest', sourceId: digest.id,
                title: 'Bản tin điều hành', safeBody: text });
        }
    }, true);
}
