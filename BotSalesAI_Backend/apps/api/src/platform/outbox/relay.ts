import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { outboxResource, verifyEventResource } from './index.js';

const maxAttempts = 3;
const leaseMs = 30000;
const retryDelayMs = 1000;
type EventKey = { shopId: string; id: string };

export const jobWorker = { component: 'jobs', heartbeatTtlMs: 30000 } as const;

export function observeJobWorker(checkedAt: Date | undefined, now: Date) {
    const ageMs = checkedAt ? now.getTime() - checkedAt.getTime() : null;
    return {
        ageMs, expiresAt: checkedAt ? new Date(checkedAt.getTime() + jobWorker.heartbeatTtlMs) : null,
        fresh: ageMs !== null && ageMs >= 0 && ageMs < jobWorker.heartbeatTtlMs,
    };
}

const pending = {
    publishedAt: null, failedAt: null,
} satisfies Prisma.OutboxEventWhereInput;

function available(now: Date) {
    return { ...pending, availableAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] };
}

export async function pendingOutbox(db: PrismaClient, now = new Date()) {
    const eligible = available(now);
    await db.outboxEvent.updateMany({
        where: { ...eligible, attempts: { gte: maxAttempts } },
        data: { failedAt: now, leaseUntil: null, leaseToken: null },
    });
    return db.outboxEvent.findMany({
        where: { ...eligible, attempts: { lt: maxAttempts } },
        orderBy: [{ availableAt: 'asc' }, { id: 'asc' }],
        select: { shopId: true, id: true },
        take: 100,
    });
}

export async function outboxLag(db: Prisma.TransactionClient, now = new Date()) {
    const oldest = await db.outboxEvent.findFirst({
        where: { ...pending, availableAt: { lte: now } },
        select: { availableAt: true }, orderBy: { availableAt: 'asc' },
    });
    return oldest ? now.getTime() - oldest.availableAt.getTime() : 0;
}

export async function publishOutbox(db: PrismaClient, key: EventKey) {
    const now = new Date();
    const token = randomUUID();
    const [claimed] = await db.outboxEvent.updateManyAndReturn({
        where: { ...available(now), ...key, attempts: { lt: maxAttempts } },
        data: { leaseToken: token, leaseUntil: new Date(now.getTime() + leaseMs), attempts: { increment: 1 } },
        select: { attempts: true, eventType: true, commandId: true, jobId: true, payload: true },
    });
    if (!claimed) return;

    const held = { ...pending, ...key, leaseToken: token };
    try {
        const resource = outboxResource(claimed);
        if (!resource) throw new Error('Unsupported event source');
        await db.$transaction(async tx => {
            await verifyEventResource(tx, key.shopId, resource);
            const { eventSequence } = await tx.shop.update({
                where: { id: key.shopId },
                data: { eventSequence: { increment: 1 } },
                select: { eventSequence: true },
            });
            const publishedAt = new Date();
            const release = await tx.outboxEvent.updateMany({
                where: { ...held, leaseUntil: { gt: publishedAt } },
                data: { publishedAt, sequence: eventSequence, leaseToken: null, leaseUntil: null },
            });
            if (!release.count) throw new Error('Outbox lease lost');
        });
    } catch (error) {
        const failed = new Date();
        await db.outboxEvent.updateMany({
            where: held,
            data: {
                leaseToken: null, leaseUntil: null,
                ...(claimed.attempts >= maxAttempts
                    ? { failedAt: failed }
                    : { availableAt: new Date(failed.getTime() + retryDelayMs * 2 ** (claimed.attempts - 1)) }),
            },
        });
        throw error;
    }
}
