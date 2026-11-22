import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { setTimeout as delay } from 'node:timers/promises';
import { readDatabaseUrl, readReleaseManifestHash } from '../../api/dist/config.js';
import { createDatabaseClient } from '../../api/dist/platform/database/client.js';
import { dueJobs, jobWorkerConcurrency, runJob } from '../../api/dist/platform/jobs/index.js';
import { jobWorker, outboxLag, pendingOutbox, publishOutbox } from '../../api/dist/platform/outbox/relay.js';
import { canInShop } from '../../api/dist/modules/workspace/index.js';
import { readRedisConnection } from './redis-config.mjs';

const queueName = 'botsales-outbox-v1';

const authorize = (tx, job, permission) => canInShop(tx, job.actorId, job.shopId, permission);

async function poll(signal, interval, run, logFailure) {
    while (!signal.aborted) {
        try {
            await run();
        } catch {
            logFailure();
        }
        await delay(interval, undefined, { signal }).catch(error => {
            if (error.name !== 'AbortError') throw error;
        });
    }
}

export async function runWorker(createHandlers, prefix, pollScheduled, dispatchers = []) {
    const connection = readRedisConnection(process.env);
    const releaseManifestSha256 = readReleaseManifestHash();
    const db = createDatabaseClient(readDatabaseUrl(process.env));
    const handlers = createHandlers(db);
    const producer = new Redis({ ...connection, maxRetriesPerRequest: 1, enableOfflineQueue: false });
    const queue = new Queue(queueName, { connection: producer, prefix });
    const worker = new Worker(queueName, job => {
        if (job.name === 'publish') return publishOutbox(db, job.data);
        const handler = handlers.get(job.data.sourceOperation);
        if (job.name === 'perform' && handler) return runJob(db, job.data, handler, authorize);
    }, {
        connection: { ...connection, maxRetriesPerRequest: null }, concurrency: jobWorkerConcurrency, prefix,
    });
    const stop = new AbortController();
    const logFailure = () => console.error('Outbox worker dependency unavailable or delivery deferred.');
    let closingWorker;
    const shutdown = () => {
        stop.abort();
        closingWorker ??= worker.close().catch(logFailure);
    };
    producer.on('error', logFailure);
    queue.on('error', logFailure);
    worker.on('error', logFailure);
    worker.on('failed', logFailure);
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
    let nextHealth = 0;
    const relay = async () => {
        const ready = await pendingOutbox(db);
        const jobs = await dueJobs(db, [...handlers.keys()]);
        if (stop.signal.aborted) return;
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
        if (now >= nextHealth && !stop.signal.aborted) {
            if (await producer.ping() !== 'PONG') throw new Error('Redis not ready');
            const lagMs = Math.min(2147483647, await outboxLag(db));
            const observation = { checkedAt: new Date(now), lagMs };
            await db.workerHealth.upsert({ where: { component: jobWorker.component }, update: observation,
                create: { component: jobWorker.component, ...observation } });
            console.log(JSON.stringify({ status: 'ready', outboxLagMs: lagMs, releaseManifestSha256 }));
            nextHealth = now + 10000;
        }
    };
    const polls = [poll(stop.signal, 500, relay, logFailure)];
    if (pollScheduled) polls.push(poll(stop.signal, 15000, () => pollScheduled(db), () => console.error('Scheduled worker maintenance deferred.')));
    for (const dispatch of dispatchers) polls.push(poll(stop.signal, 500, () => dispatch(db), () => console.error('External dispatch deferred.')));
    try {
        await Promise.all(polls);
    } finally {
        shutdown();
        await Promise.allSettled([...polls, closingWorker]);
        await Promise.allSettled([queue.close()]);
        producer.disconnect();
        process.removeListener('SIGTERM', shutdown);
        process.removeListener('SIGINT', shutdown);
        await db.$disconnect();
    }
}
