import { readFileSync } from 'node:fs';
import { readDatabaseUrl } from '../apps/api/dist/config.js';
import { createDatabaseClient } from '../apps/api/dist/platform/database/client.js';
import { jobWorker, observeJobWorker, outboxLag } from '../apps/api/dist/platform/outbox/relay.js';

const positiveMs = text => /^[1-9][0-9]*$/.test(text ?? '') && Number.isSafeInteger(Number(text));
const report = data => console.log(JSON.stringify(data));

async function externalDispatch(tx, now, age) {
    const purchases = await tx.purchaseDispatch.aggregate({ where: { dueAt: { lte: now } }, _count: { _all: true }, _min: { dueAt: true } });
    const messenger = await tx.messageDispatch.aggregate({ where: { finishedAt: null }, _count: { _all: true }, _min: { createdAt: true } });
    const approvedRun = { providerRunId: { not: null } };
    const messengerAi = await tx.botInboundTask.aggregate({ where: { ...approvedRun, finishedAt: null },
        _count: { _all: true }, _min: { createdAt: true } });
    const externalNotice = { channel: { in: ['web_push', 'telegram'] }, pushDeviceId: { not: null } };
    const notifications = await tx.appNotification.aggregate({ where: { ...externalNotice, deliveryStatus: 'queued' },
        _count: { _all: true }, _min: { createdAt: true } });

    return {
        purchases: { pending: purchases._count._all, oldestPendingAgeMs: age(purchases._min.dueAt) },
        messenger: { pending: messenger._count._all, oldestPendingAgeMs: age(messenger._min.createdAt) },
        messengerAi: { pending: messengerAi._count._all, oldestPendingAgeMs: age(messengerAi._min.createdAt),
            recordedUnknown: await tx.botInboundTask.count({ where: { ...approvedRun, outcome: 'provider_unknown' } }) },
        notifications: { pending: notifications._count._all, oldestPendingAgeMs: age(notifications._min.createdAt),
            recordedUnknown: await tx.appNotification.count({ where: { ...externalNotice, deliveryStatus: 'unknown' } }) },
    };
}

async function queue(tx, now, maxQueueMs, maxUnknownMs) {
    const heartbeat = await tx.workerHealth.findUnique({ where: { component: jobWorker.component }, select: { checkedAt: true } });
    const worker = observeJobWorker(heartbeat?.checkedAt, now);
    const outboxLagMs = await outboxLag(tx, now);
    const terminalOutboxFailures = await tx.outboxEvent.count({ where: { failedAt: { not: null } } });
    const queued = await tx.job.aggregate({ where: { status: 'queued', dueAt: { lte: now } },
        _count: { _all: true }, _min: { dueAt: true } });
    const expired = await tx.job.aggregate({ where: { status: 'running', leaseUntil: { lte: now } },
        _count: { _all: true }, _min: { leaseUntil: true } });
    const commands = await tx.command.aggregate({ where: { status: 'unknown' }, _count: { _all: true }, _min: { updatedAt: true } });
    const uncertain = await tx.job.aggregate({ where: { status: 'awaiting_confirmation' }, _count: { _all: true }, _min: { updatedAt: true } });
    const age = value => value ? Math.max(0, now.getTime() - value.getTime()) : 0;
    const observations = {
        workerHeartbeatAgeMs: worker.ageMs,
        outboxLagMs, terminalOutboxFailures,
        dueJobs: queued._count._all, oldestDueJobAgeMs: age(queued._min.dueAt),
        expiredJobLeases: expired._count._all, oldestExpiredLeaseAgeMs: age(expired._min.leaseUntil),
        unknownCommands: commands._count._all, oldestUnknownCommandAgeMs: age(commands._min.updatedAt),
        awaitingConfirmationJobs: uncertain._count._all, oldestAwaitingConfirmationAgeMs: age(uncertain._min.updatedAt),
        externalDispatch: await externalDispatch(tx, now, age),
    };
    const issues = [];
    if (!worker.fresh) issues.push(worker.ageMs !== null && worker.ageMs < 0 ? 'WORKER_CLOCK_AHEAD' : 'WORKER_HEARTBEAT_MISSING_OR_STALE');
    if (outboxLagMs > maxQueueMs) issues.push('OUTBOX_LAG');
    if (terminalOutboxFailures > 0) issues.push('OUTBOX_TERMINAL_FAILURE');
    if (observations.oldestDueJobAgeMs > maxQueueMs) issues.push('DUE_JOB_LAG');
    if (observations.oldestExpiredLeaseAgeMs > maxQueueMs) issues.push('EXPIRED_JOB_LEASE');
    if (Object.values(observations.externalDispatch).some(dispatch => dispatch.oldestPendingAgeMs > maxQueueMs)) issues.push('EXTERNAL_DISPATCH_LAG');
    if (observations.oldestUnknownCommandAgeMs > maxUnknownMs || observations.oldestAwaitingConfirmationAgeMs > maxUnknownMs) {
        issues.push('RECONCILIATION_OVERDUE');
    }
    return { limits: { workerHeartbeatTtlMs: jobWorker.heartbeatTtlMs, maxQueueMs, maxUnknownMs }, observations, issues };
}

async function integrity(tx) {
    const file = readFileSync(new URL('../infra/backup/integrity-counts.sql', import.meta.url), 'utf8');
    // The trailing psql directive binds the same result when called by verify-restore.sql.
    const query = file.replace(/\r?\n\\gset\s*$/, '');
    const [{ integrity_report: observations }] = await tx.$queryRawUnsafe(query);
    const issues = Object.keys(observations).filter(key => observations[key] > 0);
    return { observations, issues };
}

async function fileStorage(tx, now, maxTransferMs, maxPurgeMs) {
    const { fileStorageBacklog, readFileTransfersEnabled } = await import('../apps/api/dist/modules/files/index.js');
    const transferNewFiles = readFileTransfersEnabled(process.env);
    const observations = { transferNewFiles, ...await fileStorageBacklog(tx, now) };
    const issues = [];
    if (transferNewFiles && observations.oldestTransferAgeMs > maxTransferMs) issues.push('FILE_TRANSFER_LAG');
    if (observations.oldestRetiredAgeMs > maxPurgeMs) issues.push('FILE_PURGE_LAG');
    return { limits: { maxTransferMs, maxPurgeMs }, observations, issues };
}

async function main() {
    const [mode, firstLimit, secondLimit, extra] = process.argv.slice(2);
    const valid = mode === 'integrity' ? firstLimit === undefined
        : ['queue', 'file-storage'].includes(mode) && positiveMs(firstLimit) && positiveMs(secondLimit) && extra === undefined;
    if (!valid) {
        report({ status: 'UNAVAILABLE', reason: 'Run integrity, queue <max-queue-ms> <max-unknown-ms> or file-storage <max-transfer-ms> <max-purge-ms>' });
        process.exitCode = 1;
        return;
    }
    const db = createDatabaseClient(readDatabaseUrl({ DATABASE_URL: process.env.OPERATIONS_DATABASE_URL }));
    try {
        const observation = await db.$transaction(async tx => {
            await tx.$executeRaw`SET TRANSACTION READ ONLY`;
            const [{ observed_at: now }] = await tx.$queryRaw`SELECT clock_timestamp() AS observed_at`;
            if (mode === 'integrity') return { ...await integrity(tx), observedAt: now.toISOString() };
            const observe = mode === 'queue' ? queue : fileStorage;
            const detail = await observe(tx, now, Number(firstLimit), Number(secondLimit));
            return { ...detail, observedAt: now.toISOString() };
        }, { isolationLevel: 'RepeatableRead' });
        report({ status: observation.issues.length ? 'ATTENTION' : 'OK', check: mode, ...observation });
        if (observation.issues.length) process.exitCode = 2;
    } finally {
        await db.$disconnect();
    }
}

try {
    await main();
} catch {
    report({ status: 'UNAVAILABLE', reason: 'Operations database or read-only query unavailable' });
    process.exitCode = 1;
}
