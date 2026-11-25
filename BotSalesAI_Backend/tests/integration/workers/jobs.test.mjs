import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { createConnection, createServer } from 'node:net';
import { after, afterEach, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createContractValidator, schemaFromContract } from '../../../apps/api/dist/http/contracts.js';
import { readAuthConfig } from '../../../apps/api/dist/modules/workspace/index.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { runJob, scheduleJob } from '../../../apps/api/dist/platform/jobs/index.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { assertFixtureDatabase, fixtureSession } from '../workspace/session-fixture.mjs';

const { components } = JSON.parse(readFileSync(new URL('../../../../botsales-kit/contracts/openapi.json', import.meta.url)));
const validator = createContractValidator(components.schemas);
const [shopA, shopB] = fixtureShops;
const sourceOperation = 'createProductImport';
const jobsPath = shop => '/shops/' + shop.id + '/jobs';
let app, db, base, ownerA, ownerB, reader, worker;

before(async () => {
    const connection = readDatabaseUrl(process.env);
    assertFixtureDatabase(connection);
    const redis = new URL(process.env.REDIS_URL);
    assert.equal(redis.protocol, 'redis:');
    assert.equal(redis.hostname, '127.0.0.1');
    assert.ok(redis.port, 'Set the port of a dedicated loopback Redis fixture');
    const database = new Database(connection);
    db = database.client;
    [ownerA, ownerB, reader] = await Promise.all(['p0-editor', 'p0-editor-b', 'p0-reader'].map(subject => fixtureSession(db, subject)));
    app = await createApp({ database, auth: readAuthConfig(process.env), quiet: true });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl() + '/api/v2';
});

afterEach(() => stopWorker());

after(async () => {
    const ids = [ownerA, ownerB, reader].filter(Boolean).map(actor => actor.id);
    if (ids.length) await db.session.updateMany({ where: { id: { in: ids } }, data: { revokedAt: new Date() } });
    await app?.close();
});

async function until(predicate, attempts = 100) {
    for (let i = 0; i < attempts; i++) {
        const result = await predicate();
        if (result) return result;
        await delay(100);
    }
    assert.fail('Expected job state did not become visible');
}

async function startWorker(scenario, redisUrl = process.env.REDIS_URL) {
    assert.equal(worker, undefined);
    const prefix = 'botsales-test-' + randomUUID();
    worker = spawn(process.execPath, ['tests/integration/workers/job-worker-fixture.mjs'], {
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true,
        env: { ...process.env, REDIS_URL: redisUrl, BE10_JOB_PAUSE: scenario, BE10_JOB_QUEUE_PREFIX: prefix },
    });
    let output = '';
    worker.stdout.on('data', chunk => { output += String(chunk); });
    worker.stderr.on('data', chunk => { output += String(chunk); });
    const wait = marker => until(() => {
        assert.equal(worker.exitCode, null, 'Worker exited unexpectedly');
        return output.includes(marker);
    });
    await wait('"status":"ready"');
    return wait;
}

async function stopWorker(graceful = false) {
    if (worker && worker.exitCode === null && worker.signalCode === null) {
        const closed = once(worker, 'exit', { signal: AbortSignal.timeout(8000) });
        if (graceful) worker.send('shutdown');
        else worker.kill('SIGKILL');
        const [exitCode] = await closed;
        if (graceful) assert.equal(exitCode, 0);
    }
    worker = undefined;
}

async function jobFixture(shop, actor, scenario, dueAt = new Date()) {
    return db.$transaction(async tx => {
        const command = await tx.command.create({
            data: {
                shopId: shop.id, actorId: actor.userId, operationId: sourceOperation, idempotencyKey: randomUUID(),
                status: 'accepted', requestHash: createHash('sha256').update(scenario).digest('hex'),
            },
        });
        return scheduleJob(tx, {
            shopId: shop.id, actorId: actor.userId, kind: 'import', sourceOperation,
            commandId: command.id, dueAt, input: { scenario },
        });
    });
}

function loadJob(job) {
    return db.job.findUniqueOrThrow({ where: { shopId_id: { shopId: job.shopId, id: job.id } } });
}

async function expireClaim(job) {
    const { count } = await db.job.updateMany({
        where: { shopId: job.shopId, id: job.id, status: 'running' }, data: { leaseUntil: new Date(Date.now() - 1) },
    });
    assert.equal(count, 1);
}

async function read(path, actor, expected, schema) {
    const response = await fetch(base + path, { headers: actor ? { cookie: actor.cookie } : {} });
    assert.equal(response.status, expected);
    const body = await response.json();
    const validate = validator.compile(schemaFromContract(schema));
    assert.equal(validate(body), true, JSON.stringify(validate.errors));
    return body.data;
}

test('SC2-H01: due jobs survive a worker restart and an empty replacement queue with one completed command', async () => {
    const job = await jobFixture(shopA, ownerA, 'before', new Date(Date.now() + 700));
    assert.equal((await loadJob(job)).status, 'queued');
    const held = await startWorker('before');
    await held('before effect ' + job.id);
    await stopWorker();
    const suspended = await loadJob(job);
    assert.equal(suspended.status, 'running');
    assert.equal(suspended.externalStartedAt, null);
    await expireClaim(job);

    await startWorker('normal');
    const completed = await until(async () => {
        const current = await loadJob(job);
        return current.status === 'succeeded' ? current : undefined;
    });
    assert.equal(completed.attempts, 2);
    assert.equal(completed.completed, 1);
    const command = await db.command.findUniqueOrThrow({ where: { shopId_id: { shopId: job.shopId, id: job.commandId } } });
    assert.equal(command.status, 'succeeded');
    assert.deepEqual(command.result, { type: 'job', id: job.id });
    // Earlier CI suites share this outbox, so the relay can publish their events first.
    await until(() => db.outboxEvent.count({ where: { shopId: job.shopId, jobId: job.id, publishedAt: { not: null } } }).then(count => count >= 4), 300);
    await stopWorker(true);

    const detail = await read(jobsPath(shopA) + '/' + job.id, ownerA, 200, 'JobResponse');
    assert.equal(detail.status, 'succeeded');
    assert.doesNotMatch(JSON.stringify(detail), /scenario|leaseToken|sourceOperation/);
    const list = await read(jobsPath(shopA) + '?q=' + job.id + '&kind=import&status=succeeded', ownerA, 200, 'JobListResponse');
    assert.deepEqual(list.map(item => item.id), [job.id]);
    await read(jobsPath(shopA) + '/' + job.id, reader, 403, 'Problem');
    await read(jobsPath(shopB) + '/' + job.id, ownerB, 404, 'Problem');
    for (const [actor, roles, check] of [
        [reader, ['owner'], async () => read(jobsPath(shopA) + '/' + job.id, reader, 404, 'Problem')],
        [ownerA, ['sales'], async () => read(jobsPath(shopA) + '/' + job.id, ownerA, 404, 'Problem')],
    ]) {
        const where = { shopId_userId: { shopId: shopA.id, userId: actor.userId } };
        const previous = await db.membership.findUniqueOrThrow({ where });
        try {
            await db.membership.update({ where, data: { roles, permissionVersion: { increment: 1 } } });
            await check();
        } finally {
            await db.membership.update({ where, data: { roles: previous.roles, permissionVersion: { increment: 1 } } });
        }
    }
});

test('SC2-H04: a crash after provider acceptance leaves an unknown command without automatic replay', async () => {
    const job = await jobFixture(shopA, ownerA, 'after');
    const accepted = await startWorker('after');
    await accepted('fixture provider accepted ' + job.id);
    await stopWorker();
    assert.ok((await loadJob(job)).externalStartedAt);
    await expireClaim(job);
    await startWorker('normal');

    const reconciled = await until(async () => {
        const current = await loadJob(job);
        return current.status === 'awaiting_confirmation' ? current : undefined;
    });
    assert.equal(reconciled.attempts, 1);
    assert.equal(reconciled.leaseToken, null);
    assert.equal(reconciled.completed, 0);
    const command = await db.command.findUniqueOrThrow({ where: { shopId_id: { shopId: job.shopId, id: job.commandId } } });
    assert.equal(command.status, 'unknown');
    const observed = await read('/shops/' + shopA.id + '/commands/' + command.id, ownerA, 200, 'CommandResponse');
    assert.equal(observed.status, 'unknown');
    const detail = await read(jobsPath(shopA) + '/' + job.id, ownerA, 200, 'JobResponse');
    assert.equal(detail.status, 'awaiting_confirmation');
    await stopWorker(true);
});

test('SC2-H01: a running worker resumes due work after losing its Redis connection', async () => {
    const redis = new URL(process.env.REDIS_URL);
    const sockets = new Set();
    let unavailable = false;
    const proxy = createServer(client => {
        if (unavailable) { client.destroy(); return; }
        const upstream = createConnection({ host: redis.hostname, port: Number(redis.port) });
        const disconnect = () => { client.destroy(); upstream.destroy(); sockets.delete(disconnect); };
        sockets.add(disconnect);
        for (const socket of [client, upstream]) {
            socket.on('error', disconnect);
            socket.once('close', disconnect);
        }
        client.pipe(upstream).pipe(client);
    }).listen(0, '127.0.0.1');
    await once(proxy, 'listening');
    const partitioned = new URL(redis);
    partitioned.port = String(proxy.address().port);
    try {
        const observed = await startWorker('normal', partitioned.href);
        unavailable = true;
        for (const disconnect of sockets) disconnect();
        await observed('Outbox worker dependency unavailable or delivery deferred.');
        const job = await jobFixture(shopA, ownerA, 'normal');
        const pending = await read(jobsPath(shopA) + '/' + job.id, ownerA, 200, 'JobResponse');
        assert.equal(pending.status, 'queued');
        assert.equal((await loadJob(job)).attempts, 0);
        unavailable = false;
        const completed = await until(async () => {
            const current = await loadJob(job);
            return current.status === 'succeeded' ? current : undefined;
        });
        assert.equal(completed.attempts, 1);
        assert.equal(completed.completed, 1);
        const state = await read('/shops/' + shopA.id + '/commands/' + job.commandId, ownerA, 200, 'CommandResponse');
        assert.equal(state.status, 'succeeded');
        assert.deepEqual(state.result, { type: 'job', id: job.id });
        await until(async () => await db.outboxEvent.count({ where: { shopId: job.shopId, jobId: job.id, publishedAt: { not: null } } }) === 3);
    } finally {
        unavailable = false;
        try { await stopWorker(true); } finally {
            for (const disconnect of sockets) disconnect();
            await new Promise(resolve => proxy.close(resolve));
        }
    }
});

test('SC2-H04: a repeatedly failing job stops at the retry limit while another shop completes', async () => {
    const failing = await jobFixture(shopA, ownerA, 'persistent-failure');
    const peer = await jobFixture(shopB, ownerB, 'normal');
    try {
        await startWorker('normal');
        await until(async () => (await loadJob(peer)).status === 'succeeded');
        await until(async () => (await loadJob(failing)).status === 'failed');
        const failed = await loadJob(failing);
        const succeeded = await loadJob(peer);
        assert.equal(failed.attempts, 3);
        assert.equal(failed.leaseToken, null);
        assert.equal(succeeded.attempts, 1);
        const command = await read('/shops/' + shopA.id + '/commands/' + failing.commandId, ownerA, 200, 'CommandResponse');
        assert.equal(command.status, 'failed');
        console.log(JSON.stringify({ status: 'SC2_H04_BOUNDED_FAILURE', failedAttempts: failed.attempts,
            leaseReleased: true, peerAttempts: succeeded.attempts }));
        await stopWorker(true);
    } finally {
        await stopWorker();
    }
});

test('T076: a blocked provider dispatch leaves job relay available and shutdown drains the active dispatch', async () => {
    try {
        const observed = await startWorker('dispatch');
        await observed('fixture dispatch waiting');
        await observed('fixture parallel dispatch advanced');
        const job = await jobFixture(shopA, ownerA, 'normal');
        await until(async () => (await loadJob(job)).status === 'succeeded');
        await until(async () => await db.outboxEvent.count({ where: { shopId: job.shopId, jobId: job.id, publishedAt: { not: null } } }) === 3);
        const exited = once(worker, 'exit', { signal: AbortSignal.timeout(8000) });
        worker.send('shutdown');
        await observed('fixture shutdown requested');
        worker.send('release-dispatch');
        const [code] = await exited;
        assert.equal(code, 0);
    } finally {
        await stopWorker();
    }
});

test('T074: a tenant burst keeps a worker slot available for another shop', async () => {
    const dueAt = new Date(Date.now() - 5000);
    const burst = await db.job.createManyAndReturn({ data: Array.from({ length: 104 }, () => ({
        shopId: shopA.id, actorId: ownerA.userId, kind: 'import', sourceOperation, dueAt, input: { scenario: 'held' },
    })), select: { id: true } });
    const ids = burst.map(job => job.id);
    const where = { shopId: shopA.id, id: { in: ids } };
    const peer = await jobFixture(shopB, ownerB, 'normal');
    try {
        const observed = await startWorker('tenant-burst');
        await observed('fixture tenant job waiting');
        const settled = await until(async () => {
            const job = await loadJob(peer);
            return job.status === 'succeeded' ? job : undefined;
        });
        await until(async () => await db.job.count({ where: { ...where, status: 'running' } }) === 3);
        const alreadyQueued = await db.job.findFirstOrThrow({ where: { ...where, status: 'queued' } });
        await runJob(db, { shopId: shopA.id, id: alreadyQueued.id, sourceOperation },
            () => assert.fail('A stale queue entry must still respect the shop lease cap'), () => true);
        assert.equal(await db.job.count({ where: { ...where, status: 'queued', attempts: 0 } }), 101);
        assert.equal(settled.attempts, 1);
        console.log(JSON.stringify({ case: 'tenant-burst', burstJobs: burst.length, runningInBurst: 3,
            peerCompletionMs: settled.updatedAt.getTime() - peer.createdAt.getTime(), peerAttempts: settled.attempts }));
        const exited = once(worker, 'exit', { signal: AbortSignal.timeout(8000) });
        worker.send('shutdown');
        await observed('fixture shutdown requested');
        worker.send('release-jobs');
        const [code] = await exited;
        assert.equal(code, 0);
        assert.equal(await db.job.count({ where: { ...where, status: 'succeeded' } }), 3);
    } finally {
        await stopWorker();
        await db.job.updateMany({ where: { ...where, status: { in: ['queued', 'running'] } },
            data: { status: 'cancelled', leaseToken: null, leaseUntil: null } });
    }
});
