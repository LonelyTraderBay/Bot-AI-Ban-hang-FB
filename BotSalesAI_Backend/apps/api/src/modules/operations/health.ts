import type { Prisma } from '../../generated/prisma/client.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { jobWorker } from '../../platform/outbox/relay.js';
import { messengerFixturePolicy } from '../channels/index.js';
import type { ShopScope } from '../workspace/index.js';
import { budgetAmounts } from './budgets.js';

type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';
type Runbook = 'database' | 'worker' | 'messenger' | 'ai' | 'notifications' | 'budgets';
type Target = { component: string; label: string; maxAgeMs: number; runbook: Runbook };
type Observation = { status: HealthStatus; reason: string | null };
const dayMs = 24 * 3600000;
const postgres = { component: 'postgresql', label: 'PostgreSQL', maxAgeMs: 5000, runbook: 'database' } as const;
const jobs = { component: 'worker', label: 'Worker', maxAgeMs: jobWorker.heartbeatTtlMs, runbook: 'worker' } as const;
const ai = { component: 'ai', label: 'Kết nối AI', maxAgeMs: dayMs, runbook: 'ai' } as const;
const messenger = { component: 'messenger', label: 'Meta Messenger · webhook đến', maxAgeMs: dayMs, runbook: 'messenger' } as const;

function observed(target: Target, now: Date, checkedAt: Date | null, result: Observation) {
    const expiresAt = checkedAt ? new Date(+checkedAt + target.maxAgeMs) : null;
    const observation = checkedAt && +checkedAt > +now ? { status: 'unknown', reason: 'Dấu kiểm có thời điểm trong tương lai.' } as const
        : expiresAt && +expiresAt <= +now ? { status: 'unknown', reason: 'Dấu kiểm đã hết hiệu lực.' } as const
            : result;
    return { ...target, ...observation, checkedAt, expiresAt };
}

async function providerHealth(tx: Prisma.TransactionClient, shopId: string, now: Date) {
    const connections = await tx.aiConnection.findMany({
        where: { shopId, deletedAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: { id: true, name: true, providerId: true, status: true, lastCheckedAt: true, checkJob: { select: { status: true } } },
    });
    const channels = await tx.channelConnection.findMany({
        where: { shopId, provider: 'messenger' }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: { id: true, name: true, status: true, policyVersion: true, lastWebhookAt: true },
    });
    return [
        ...(connections.length ? connections.map(connection => {
            const fixture = connection.providerId === 'mock';
            const target = { ...ai, component: 'ai:' + connection.id, label: connection.name };
            const checkedAt = connection.lastCheckedAt;
            const jobStatus = connection.checkJob?.status;
            const result: Observation = !checkedAt || connection.status === 'validating' || connection.status === 'unconfigured' || connection.status === 'disabled'
                ? { status: 'unknown', reason: 'Chưa có lần kiểm của cấu hình AI đang dùng.' }
                : jobStatus === 'awaiting_confirmation'
                    ? { status: 'unknown', reason: 'Kết quả kiểm quyền truy cập model chưa rõ.' }
                    : connection.status === 'connected' && jobStatus === 'succeeded'
                        ? { status: 'healthy', reason: fixture ? 'Model thử nghiệm đã qua kiểm tra.' : 'Đã xác minh quyền truy cập model.' }
                        : jobStatus === 'failed'
                            ? { status: 'down', reason: 'Lần kiểm quyền truy cập model thất bại.' }
                            : { status: 'degraded', reason: 'Kết nối AI có dấu kiểm nhưng thiếu kết quả xác nhận.' };
            return observed(target, now, checkedAt, result);
        }) : [observed(ai, now, null, { status: 'unknown', reason: 'Shop chưa có kết nối AI được quan sát.' })]),
        ...(channels.length ? channels.map(channel => {
            const fixture = channel.policyVersion === messengerFixturePolicy;
            const target = { ...messenger, component: 'messenger:' + channel.id, label: channel.name ?? messenger.label };
            const result: Observation = channel.status === 'connected' && channel.lastWebhookAt
                ? { status: 'healthy', reason: fixture ? 'Đã ghi nhận webhook thử nghiệm.' : 'Đã ghi nhận webhook đến có chữ ký.' }
                : { status: 'unknown', reason: 'Chưa ghi nhận webhook đến trên kết nối đang dùng.' };
            return observed(target, now, channel.lastWebhookAt, result);
        }) : [observed(messenger, now, null, { status: 'unknown', reason: 'Shop chưa có kênh Messenger được quan sát.' })]),
    ];
}

async function notificationHealth(tx: Prisma.TransactionClient, shopId: string, now: Date) {
    return Promise.all((['web_push', 'telegram'] as const).map(async channel => {
        const target = { component: channel, label: channel === 'web_push' ? 'Web Push' : 'Telegram', maxAgeMs: dayMs, runbook: 'notifications' } as const;
        // Only an explicit device test has a persisted transport outcome separate from routine scheduling.
        const notice = await tx.appNotification.findFirst({
            where: { shopId, channel, sourceType: 'job', deliveryStatus: { not: 'queued' } },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { sourceId: true, deliveryStatus: true, createdAt: true },
        });
        const job = notice ? await tx.job.findUnique({ where: { shopId_id: { shopId, id: notice.sourceId } },
            select: { sourceOperation: true, externalStartedAt: true } }) : null;
        if (!notice || job?.sourceOperation !== 'testDevice')
            return observed(target, now, null, { status: 'unknown', reason: 'Chưa có kết quả gửi thử được ghi nhận.' });
        const result: Observation = notice.deliveryStatus === 'accepted_by_provider'
            ? { status: 'healthy', reason: job.externalStartedAt ? 'Nhà cung cấp đã tiếp nhận lần gửi thử.' : 'Đã tiếp nhận trong bộ thử cục bộ.' }
            : notice.deliveryStatus === 'failed' ? { status: 'degraded', reason: 'Gửi thử đến thiết bị thất bại.' }
                : { status: 'unknown', reason: 'Kết quả gửi thử đến thiết bị chưa rõ.' };
        return observed(target, now, notice.createdAt, result);
    }));
}

async function budgetHealth(tx: Prisma.TransactionClient, shopId: string, now: Date) {
    const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { timezone: true } });
    const policies = await tx.budgetPolicy.findMany({ where: { shopId }, orderBy: { kind: 'asc' } });
    const names = { ai_usage: 'Hạn mức AI', notification: 'Hạn mức thông báo', procurement: 'Hạn mức mua hàng' } as const;
    return Promise.all(policies.map(async policy => {
        const target = { component: 'budget:' + policy.kind, label: names[policy.kind], maxAgeMs: postgres.maxAgeMs, runbook: 'budgets' } as const;
        if (!policy.limitAmount || !policy.approvalId)
            return observed(target, now, now, { status: 'unknown', reason: 'Chưa có hạn mức đã phê duyệt.' });
        if (policy.period === 'per_order')
            return observed(target, now, now, { status: 'unknown', reason: 'Hạn mức được kiểm theo từng đơn mua.' });
        const { consumed, reserved } = await budgetAmounts(tx, policy, shop.timezone, now);
        const exhausted = policy.limitAmount.lte(new ExactDecimal(consumed.amount).plus(reserved.amount));
        return observed(target, now, now, exhausted ? { status: 'degraded', reason: 'Mức đã dùng và dự trù đã chạm hạn mức.' }
            : { status: 'healthy', reason: 'Mức đã dùng và dự trù còn dưới hạn mức.' });
    }));
}

export async function readOperationsHealth(tx: Prisma.TransactionClient, scope: ShopScope, now: Date) {
    const { shopId, permissions } = scope;
    const worker = await tx.workerHealth.findUnique({ where: { component: jobWorker.component } });
    const backlog = await tx.outboxEvent.findFirst({
        where: { shopId, sequence: null, failedAt: null, availableAt: { lt: new Date(+now - jobs.maxAgeMs) } },
        orderBy: [{ availableAt: 'asc' }, { id: 'asc' }], select: { availableAt: true },
    });
    const failed = await tx.outboxEvent.findFirst({
        where: { shopId, sequence: null, failedAt: { gte: new Date(+now - dayMs) } }, select: { id: true },
    });
    const workerResult: Observation = !worker ? { status: 'unknown', reason: 'Chưa có dấu kiểm worker.' }
        : failed ? { status: 'degraded', reason: 'Hàng đợi của shop có sự kiện thất bại trong 24 giờ qua.' }
            : backlog ? { status: 'degraded', reason: 'Hàng đợi sự kiện của shop có mục chờ quá hạn.' }
                : { status: 'healthy', reason: null };
    return [
        observed(postgres, now, now, { status: 'healthy', reason: null }),
        { ...observed(jobs, now, worker?.checkedAt ?? null, workerResult), ...(backlog ? { lagMs: +now - +backlog.availableAt } : {}) },
        ...await budgetHealth(tx, shopId, now),
        ...(permissions.includes('integrations.read') ? await providerHealth(tx, shopId, now) : []),
        ...(permissions.includes('notifications.manage') ? await notificationHealth(tx, shopId, now) : []),
    ];
}
