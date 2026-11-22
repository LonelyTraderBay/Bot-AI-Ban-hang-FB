import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { TextDecoder } from 'node:util';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createContractValidator, schemaFromContract } from '../../../apps/api/dist/http/contracts.js';
import { readAuthConfig } from '../../../apps/api/dist/modules/workspace/index.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { redisTarget } from '../../../scripts/staging-data-config.mjs';
import { assertFixtureDatabase, fixtureSession, restoreReader } from '../workspace/session-fixture.mjs';

const { components } = JSON.parse(readFileSync(new URL('../../../../botsales-kit/contracts/openapi.json', import.meta.url)));
const validate = createContractValidator(components.schemas).compile(schemaFromContract('EventEnvelope'));
const [shopA, shopB] = fixtureShops;
const shopPath = shop => '/shops/' + shop.id;
let app, db, base, origin, owner, other, reader, worker, ready = false;
const streams = new Set();

before(async () => {
    const connection = readDatabaseUrl(process.env);
    assertFixtureDatabase(connection);
    redisTarget(process.env, true);
    const auth = readAuthConfig(process.env);
    assert.ok(auth);
    origin = auth.appOrigin;
    const database = new Database(connection);
    db = database.client;
    [owner, other, reader] = await Promise.all(['p0-editor', 'p0-editor-b', 'p0-reader'].map(subject => fixtureSession(db, subject)));
    app = await createApp({ database, auth, quiet: true });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl() + '/api/v2';
    const session = await request('/session', owner);
    assert.equal(session.status, 200);
    owner.csrf = (await session.json()).data.csrfToken;
    worker = spawn(process.execPath, ['apps/worker/src/main.mjs'], { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
    worker.stdout.on('data', chunk => {
        if (String(chunk).includes('"status":"ready"')) ready = true;
    });
    await until(() => {
        assert.equal(worker.exitCode, null, 'Worker exited during startup');
        return ready;
    });
    await until(() => db.outboxEvent.count({ where: { publishedAt: null, failedAt: null } }).then(count => count === 0));
});

after(async () => {
    for (const stream of streams) await stream.cancel();
    if (worker && worker.exitCode === null && worker.signalCode === null) {
        const exited = once(worker, 'exit');
        worker.kill();
        await exited;
    }
    if (reader && db) await restoreReader(db, shopA.id, reader.userId);
    if (owner && other && reader) {
        await db.session.updateMany({ where: { id: { in: [owner.id, other.id, reader.id] } }, data: { revokedAt: new Date() } });
    }
    await app?.close();
});

async function until(check) {
    for (let i = 0; i < 80; i++) {
        const result = await check();
        if (result) return result;
        await delay(100);
    }
    assert.fail('Expected worker state did not become visible');
}

function request(path, actor, options = {}) {
    return fetch(base + path, { ...options, headers: { ...(actor ? { cookie: actor.cookie } : {}), ...options.headers } });
}

function events(shop, actor, id) {
    return request(shopPath(shop) + '/events', actor, {
        signal: AbortSignal.timeout(12000),
        headers: id ? { 'last-event-id': id } : {},
    });
}

async function openEvents(shop, actor, id) {
    const response = await events(shop, actor, id);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/event-stream/);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const stream = {
        cancel: async () => { streams.delete(stream); await reader.cancel().catch(() => undefined); },
        async read() {
            for (;;) {
                const end = buffer.indexOf('\n\n');
                if (end < 0) {
                    const chunk = await reader.read();
                    assert.equal(chunk.done, false, 'Stream ended before an event was returned');
                    buffer += decoder.decode(chunk.value, { stream: true });
                    continue;
                }
                const frame = buffer.slice(0, end).split('\n');
                buffer = buffer.slice(end + 2);
                const data = frame.find(line => line.startsWith('data: '));
                if (!data) continue;
                const envelope = JSON.parse(data.slice('data: '.length));
                assert.equal(validate(envelope), true, JSON.stringify(validate.errors));
                return { id: frame[0].slice('id: '.length), data: envelope };
            }
        },
    };
    streams.add(stream);
    return stream;
}

async function invite() {
    const key = randomUUID();
    const result = await request(shopPath(shopA) + '/members', owner, {
        method: 'POST',
        headers: { origin, 'idempotency-key': key, 'x-csrf-token': owner.csrf, 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'sse-' + key + '@botsales.test', roles: ['viewer'] }),
    });
    assert.equal(result.status, 201);
    await result.text();
    return db.command.findUniqueOrThrow({
        where: { shopId_actorId_operationId_idempotencyKey: { shopId: shopA.id, actorId: owner.userId, operationId: 'inviteMember', idempotencyKey: key } },
    });
}

test('SC2-C05-WAREHOUSE: real warehouse events expose only permitted metadata in the same shop', async () => {
    const member = { shopId_userId: { shopId: shopA.id, userId: reader.userId } };
    const current = await db.membership.findUniqueOrThrow({ where: member });
    await db.membership.update({ where: member, data: { roles: ['warehouse'], permissionVersion: { increment: 1 } } });
    try {
        const stream = await openEvents(shopA, reader);
        const key = randomUUID();
        const created = await request(shopPath(shopA) + '/warehouses', owner, {
            method: 'POST',
            headers: { origin, 'idempotency-key': key, 'x-csrf-token': owner.csrf, 'content-type': 'application/json' },
            body: JSON.stringify({ code: 'EVENT-' + key.slice(0, 8), name: 'Kho test SSE', addressLine: 'Địa chỉ fixture SSE' }),
        });
        assert.equal(created.status, 201);
        const { data: warehouse } = await created.json();
        const event = await stream.read();
        assert.equal(event.data.type, 'warehouse.updated');
        assert.equal(event.data.resourceType, 'warehouse');
        assert.equal(event.data.resourceId, warehouse.id);
        assert.equal(event.data.resourceVersion, warehouse.version);
        assert.equal(event.data.shopId, shopA.id);
        assert.doesNotMatch(JSON.stringify(event), /Kho test|Địa chỉ|token/i);
        await stream.cancel();
        const wrongShop = await openEvents(shopB, other, event.id);
        assert.equal((await wrongShop.read()).data.type, 'resync.required');
        await wrongShop.cancel();
        await until(() => db.outboxEvent.count({ where: { publishedAt: null, failedAt: null } }).then(count => count === 0));
    } finally {
        await db.membership.update({ where: member, data: { roles: current.roles, permissionVersion: { increment: 1 } } });
    }
});

test('BE-10-SSE: Redis worker publishes real commands and reconnect resumes in shop order', async () => {
    assert.equal((await events(shopA)).status, 401);
    assert.equal((await events(shopA, other)).status, 404);
    const firstStream = await openEvents(shopA, owner);
    const firstCommand = await invite();
    const first = await firstStream.read();
    assert.equal(first.id, first.data.eventId);
    assert.equal(first.data.type, 'command.updated');
    assert.equal(first.data.resourceId, firstCommand.id);
    assert.equal(first.data.shopId, shopA.id);
    assert.equal(first.data.resourceType, 'command');
    assert.doesNotMatch(JSON.stringify(first), /@|idempotency|token/i);
    await firstStream.cancel();
    const secondCommand = await invite();
    await until(() => db.outboxEvent.findFirst({ where: { shopId: shopA.id, commandId: secondCommand.id, publishedAt: { not: null } } }));
    const replay = await openEvents(shopA, owner, first.id);
    const second = await replay.read();
    assert.equal(second.data.resourceId, secondCommand.id);
    assert.equal(second.data.sequence, first.data.sequence + 1);
    await replay.cancel();

    const wrongShop = await openEvents(shopB, other, first.id);
    const resync = await wrongShop.read();
    assert.equal(resync.data.type, 'resync.required');
    assert.equal(resync.data.shopId, shopB.id);
    await wrongShop.cancel();
    await db.outboxEvent.update({ where: { shopId_id: { shopId: shopA.id, id: first.id } }, data: { publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) } });
    const expired = await openEvents(shopA, owner, first.id);
    assert.equal((await expired.read()).data.type, 'resync.required');
    await expired.cancel();
});

test('BE-10-SSE: a reader does not see other commands and a revoked membership closes the active stream', async () => {
    const stream = await openEvents(shopA, reader);
    const command = await invite();
    await until(() => db.outboxEvent.findFirst({ where: { shopId: shopA.id, commandId: command.id, publishedAt: { not: null } } }));
    const where = { shopId_userId: { shopId: shopA.id, userId: reader.userId } };
    try {
        await db.membership.update({ where, data: { status: 'revoked', permissionVersion: { increment: 1 } } });
        const event = await stream.read();
        assert.equal(event.data.type, 'session.revoked');
        assert.equal(event.data.shopId, shopA.id);
        assert.equal((await events(shopA, reader)).status, 404);
    } finally {
        await stream.cancel();
        await restoreReader(db, shopA.id, reader.userId);
    }
});

test('BE-10-SSE: invalid outbox work is isolated after bounded attempts', async () => {
    const observeQueue = () => {
        const result = spawnSync(process.execPath, ['scripts/check-operations.mjs', 'queue', '60000', '60000'], {
            env: { ...process.env, OPERATIONS_DATABASE_URL: readDatabaseUrl(process.env) }, encoding: 'utf8', timeout: 8000,
        });
        assert.ifError(result.error);
        return { exitCode: result.status, result: JSON.parse(result.stdout) };
    };
    const beforeFailure = observeQueue();
    assert.equal(beforeFailure.result.observations.terminalOutboxFailures, 0);
    assert.ok(!beforeFailure.result.issues.includes('OUTBOX_TERMINAL_FAILURE'));
    const event = await db.outboxEvent.create({ data: { shopId: shopA.id, eventType: 'fixture.unsupported', payload: {} } });
    const row = await until(async () => {
        const candidate = await db.outboxEvent.findUniqueOrThrow({ where: { shopId_id: { shopId: shopA.id, id: event.id } } });
        return candidate.failedAt ? candidate : undefined;
    });
    assert.equal(row.attempts, 3);
    assert.equal(row.sequence, null);
    assert.equal(row.publishedAt, null);
    assert.equal(row.leaseToken, null);
    const afterFailure = observeQueue();
    assert.equal(afterFailure.exitCode, 2);
    assert.equal(afterFailure.result.status, 'ATTENTION');
    assert.equal(afterFailure.result.observations.terminalOutboxFailures, 1);
    assert.equal(afterFailure.result.observations.outboxLagMs, 0);
    assert.ok(afterFailure.result.issues.includes('OUTBOX_TERMINAL_FAILURE'));
});
