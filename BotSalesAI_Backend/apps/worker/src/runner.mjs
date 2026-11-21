import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { setTimeout as delay } from 'node:timers/promises';
import { readDatabaseUrl } from '../../api/dist/config.js';
import { createDatabaseClient } from '../../api/dist/platform/database/client.js';
import { dueJobs, runJob } from '../../api/dist/platform/jobs/index.js';
import { outboxLag, pendingOutbox, publishOutbox } from '../../api/dist/platform/outbox/relay.js';
import { requireShopAccess } from '../../api/dist/modules/workspace/index.js';

const queueName = 'botsales-outbox-v1';

function readConnection(env) {
    if (!env.REDIS_URL) throw new Error('REDIS_URL is required');
    const redis = new URL(env.REDIS_URL);
    if (redis.protocol !== 'redis:' && redis.protocol !== 'rediss:') throw new Error('Invalid Redis scheme');
    const db = redis.pathname.slice(1);
    if (db && !/^\d+$/.test(db)) throw new Error('Invalid Redis DB index');
    return {
        host: redis.hostname, port: redis.port ? Number(redis.port) : 6379, db: Number(db),
        username: redis.username ? decodeURIComponent(redis.username) : undefined,
        password: redis.password ? decodeURIComponent(redis.password) : undefined,
        ...(redis.protocol === 'rediss:' ? { tls: {} } : {}),
    };
}

async function authorize(tx, job, permission) {
    try {
        await requireShopAccess(tx, job.actorId, job.shopId, permission);
        return true;
    } catch (error) {
        if (error.getStatus?.() === 403 || error.getStatus?.() === 404) return false;
        throw error;
    }
}

export async function runWorker(createHandlers, prefix, pollScheduled) {
    const connection = readConnection(process.env);
    const db = createDatabaseClient(readDatabaseUrl(process.env));
    const handlers = createHandlers(db);
    const producer = new Redis({ ...connection, maxRetriesPerRequest: 1, enableOfflineQueue: false });
    const queue = new Queue(queueName, { connection: producer, prefix });
    const worker = new Worker(queueName, job => {
        if (job.name === 'publish') return publishOutbox(db, job.data);
        const handler = handlers.get(job.data.sourceOperation);
        if (job.name === 'perform' && handler) return runJob(db, job.data, handler, authorize);
    }, {
        connection: { ...connection, maxRetriesPerRequest: null }, concurrency: 4, prefix,
    });
    const stop = new AbortController();
    const shutdown = () => stop.abort();
    const logFailure = () => console.error('Outbox worker dependency unavailable or delivery deferred.');
    producer.on('error', logFailure);
    queue.on('error', logFailure);
    worker.on('error', logFailure);
    worker.on('failed', logFailure);
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
    let nextHealth = 0;
    let nextPoll = 0;
    try {
        while (!stop.signal.aborted) {
            try {
                if (pollScheduled && nextPoll <= Date.now()) {
                    nextPoll = Date.now() + 15000;
                    await pollScheduled(db);
                }
                const ready = await pendingOutbox(db);
                const jobs = await dueJobs(db, [...handlers.keys()]);
                const batch = [
                    ...ready.map(data => ({ name: 'publish', data })),
                    ...jobs.map(data => ({ name: 'perform', data })),
                ];
                if (batch.length) await queue.addBulk(batch.map(job => ({
                    ...job, opts: {
                        jobId: job.name + '-' + job.data.shopId + '-' + job.data.id, removeOnComplete: true, removeOnFail: true,
                    },
                })));
                const now = Date.now();
                if (now >= nextHealth) {
                    if (await producer.ping() !== 'PONG') throw new Error('Redis not ready');
                    console.log(JSON.stringify({ status: 'ready', outboxLagMs: await outboxLag(db) }));
                    nextHealth = now + 10000;
                }
            } catch {
                logFailure();
            }
            await delay(500, undefined, { signal: stop.signal }).catch(error => {
                if (error.name !== 'AbortError') throw error;
            });
        }
    } finally {
        await Promise.allSettled([worker.close(), queue.close()]);
        producer.disconnect();
        await db.$disconnect();
    }
}
