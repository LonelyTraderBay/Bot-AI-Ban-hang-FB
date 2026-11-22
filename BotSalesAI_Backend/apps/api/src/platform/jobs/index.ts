import { randomUUID } from 'node:crypto';
import { Prisma, type Job, type JobStatus, type PrismaClient } from '../../generated/prisma/client.js';
import type { ResourceRef } from '../commands/index.js';
import { serializable } from '../database/transactions.js';
import { enqueueCommandUpdate, enqueueJobUpdate } from '../outbox/index.js';
import { jobSourcePermission } from './sources.js';

type JobKey = { shopId: string; id: string };
type Candidate = Pick<Job, 'shopId' | 'id' | 'actorId' | 'sourceOperation' | 'kind' | 'commandId'>;
type Outcome = {
    status: 'succeeded' | 'partial' | 'awaiting_confirmation' | 'failed';
    completed: number;
    total: number | null;
    errorCount: number;
    rowErrors?: Prisma.InputJsonValue;
    result?: ResourceRef;
};
type TransactionalOutcome = (tx: Prisma.TransactionClient) => Promise<Outcome>;
export type JobHandler = (job: Job, controls: {
    beginExternalEffect: () => Promise<void>; renew: () => Promise<void>;
}) => Promise<Outcome | TransactionalOutcome>;
type Authorize = (tx: Prisma.TransactionClient, job: Candidate, permission: string) => Promise<boolean>;
const commandOutcome = { succeeded: 'succeeded', partial: 'succeeded', awaiting_confirmation: 'unknown', failed: 'failed' } as const;

const maxAttempts = 3;
const leaseMs = 30000;
const noLease = { leaseToken: null, leaseUntil: null };
export const jobWorkerConcurrency = 4;
const activeJobsPerShop = jobWorkerConcurrency - 1;

export async function scheduleJob(tx: Prisma.TransactionClient, data: Pick<Prisma.JobUncheckedCreateInput,
    'shopId' | 'actorId' | 'sourceOperation' | 'kind' | 'input' | 'dueAt' | 'commandId'>) {
    if (!jobSourcePermission(data.kind, data.sourceOperation)) throw new Error('Unknown job source');
    if (data.commandId && !await tx.command.findFirst({
        where: { shopId: data.shopId, id: data.commandId, actorId: data.actorId, operationId: data.sourceOperation, status: 'accepted' },
        select: { id: true },
    })) throw new Error('Invalid job command');
    const job = await tx.job.create({ data });
    await enqueueJobUpdate(tx, job);
    return job;
}

async function recordTransition(tx: Prisma.TransactionClient, job: Job, commandStatus: string) {
    await enqueueJobUpdate(tx, job);
    if (!job.commandId) return;
    const command = { shopId: job.shopId, id: job.commandId };
    const updated = await tx.command.updateMany({
        where: { ...command, status: { in: ['accepted', 'running'] } },
        data: { status: commandStatus, ...(commandStatus === 'succeeded' ? { result: { type: 'job', id: job.id } } : {}) },
    });
    if (updated.count) await enqueueCommandUpdate(tx, command);
}

async function settleFailedAttempt(tx: Prisma.TransactionClient, job: Job, now: Date) {
    const status: JobStatus = job.externalStartedAt ? 'awaiting_confirmation' : job.attempts >= maxAttempts ? 'failed' : 'queued';
    const commandStatus = status === 'awaiting_confirmation' ? 'unknown' : status === 'failed' ? 'failed' : 'accepted';
    const settled = await tx.job.updateMany({
        where: { shopId: job.shopId, id: job.id, status: 'running', leaseToken: job.leaseToken, leaseUntil: job.leaseUntil },
        data: {
            ...noLease, status, ...(status === 'queued' ? { dueAt: new Date(now.getTime() + 1000 * 2 ** (job.attempts - 1)) } : {}),
            ...(status === 'failed' || status === 'awaiting_confirmation' ? { errorCount: { increment: 1 } } : {}),
        },
    });
    if (settled.count) await recordTransition(tx, job, commandStatus);
}

export async function dueJobs(db: PrismaClient, sourceOperations: string[], now = new Date()) {
    const expired = await db.job.findMany({
        where: { status: 'running', leaseUntil: { lte: now } }, orderBy: { leaseUntil: 'asc' }, take: 100,
    });
    for (const job of expired) await db.$transaction(tx => settleFailedAttempt(tx, job, now));
    if (!sourceOperations.length) return [];
    return db.$queryRaw<(JobKey & { sourceOperation: string })[]>`
        SELECT shop_id AS "shopId", id, source_operation AS "sourceOperation"
        FROM (
            SELECT candidate.*, row_number() OVER (PARTITION BY candidate.shop_id ORDER BY candidate.due_at, candidate.id) AS shop_position
            FROM shops AS shop
            CROSS JOIN LATERAL (
                SELECT count(*)::integer AS count
                FROM (
                    SELECT 1 FROM jobs WHERE shop_id = shop.id AND status = 'running' AND lease_until > ${now}
                    LIMIT ${activeJobsPerShop}
                ) AS active_jobs
            ) AS occupied
            CROSS JOIN LATERAL (
                SELECT shop_id, id, source_operation, due_at
                FROM jobs
                WHERE shop_id = shop.id AND status = 'queued' AND due_at <= ${now} AND attempts < ${maxAttempts}
                  AND source_operation IN (${Prisma.join(sourceOperations)})
                ORDER BY due_at, id
                LIMIT greatest(${activeJobsPerShop} - occupied.count, 0)
            ) AS candidate
        ) AS ranked
        ORDER BY shop_position, due_at, id, shop_id
        LIMIT 100
    `;
}

export async function runJob(db: PrismaClient, key: JobKey & { sourceOperation: string }, handler: JobHandler, authorize: Authorize) {
    const token = randomUUID();
    const job = await db.$transaction(async tx => {
        // Only lease admission is serialized. A running handler never holds this lock.
        const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`
            SELECT pg_try_advisory_xact_lock(hashtextextended('botsales/job-claim/' || ${key.shopId}::uuid::text, 0)) AS locked
        `;
        if (!locked) return;
        const now = new Date();
        const eligible = { ...key, status: 'queued', dueAt: { lte: now }, attempts: { lt: maxAttempts } } satisfies Prisma.JobWhereInput;
        const current = await tx.job.findFirst({ where: eligible });
        if (!current) return;
        const permission = jobSourcePermission(current.kind, current.sourceOperation);
        if (!permission || !await authorize(tx, current, permission)) {
            const cancelled = await tx.job.updateMany({ where: eligible, data: { status: 'cancelled' } });
            if (cancelled.count) await recordTransition(tx, current, 'failed');
            return;
        }
        const active = await tx.job.count({ where: { shopId: key.shopId, status: 'running', leaseUntil: { gt: now } } });
        if (active >= activeJobsPerShop) return;
        const [claimed] = await tx.job.updateManyAndReturn({
            where: eligible, data: {
                status: 'running', leaseToken: token, leaseUntil: new Date(now.getTime() + leaseMs), attempts: { increment: 1 },
            },
        });
        if (claimed) await recordTransition(tx, claimed, 'running');
        return claimed;
    }, { isolationLevel: 'ReadCommitted' });
    if (!job) return;

    const held = { ...key, status: 'running', leaseToken: token } as const;
    const renew = async () => {
        const now = new Date();
        const updated = await db.job.updateMany({
            where: { ...held, leaseUntil: { gt: now } },
            data: { leaseUntil: new Date(now.getTime() + leaseMs) },
        });
        if (!updated.count) throw new Error('Job lease lost or effect already started');
    };
    try {
        const outcome = await handler(job, {
            beginExternalEffect: async () => {
                await db.$transaction(async tx => {
                    const permission = jobSourcePermission(job.kind, job.sourceOperation);
                    if (!permission || !await authorize(tx, job, permission)) throw new Error('Job permission lost');
                    const started = new Date();
                    const updated = await tx.job.updateMany({
                        where: { ...held, externalStartedAt: null, leaseUntil: { gt: started } },
                        data: { externalStartedAt: started },
                    });
                    if (!updated.count) throw new Error('Job lease lost or effect already started');
                });
            },
            renew,
        });
        if (typeof outcome === 'function') {
            await serializable(db, async tx => {
                const now = new Date();
                const renewed = await tx.job.updateMany({
                    where: { ...held, leaseUntil: { gt: now } }, data: { leaseUntil: new Date(now.getTime() + leaseMs) },
                });
                if (!renewed.count) return;
                const permission = jobSourcePermission(job.kind, job.sourceOperation);
                if (!permission || !await authorize(tx, job, permission)) {
                    await tx.job.update({ where: { shopId_id: { shopId: job.shopId, id: job.id } }, data: { status: 'cancelled', ...noLease } });
                    await recordTransition(tx, job, 'failed');
                    return;
                }
                const settled = await outcome(tx);
                if (Date.now() >= now.getTime() + leaseMs) throw new Error('Job lease expired during transaction');
                await tx.job.update({ where: { shopId_id: { shopId: job.shopId, id: job.id } }, data: { ...settled, ...noLease } });
                await recordTransition(tx, job, commandOutcome[settled.status]);
            }, false, leaseMs - 5000);
        } else {
            await db.$transaction(async tx => {
                const updated = await tx.job.updateMany({ where: { ...held, leaseUntil: { gt: new Date() } }, data: { ...outcome, ...noLease } });
                if (updated.count) await recordTransition(tx, job, commandOutcome[outcome.status]);
            });
        }
    } catch (error) {
        await db.$transaction(async tx => {
            const now = new Date();
            const current = await tx.job.findFirst({ where: { ...held, leaseUntil: { gt: now } } });
            if (current) await settleFailedAttempt(tx, current, now);
        });
        throw error;
    }
}
