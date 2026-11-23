import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { createApp } from '../apps/api/dist/app.js';
import { readDatabaseUrl } from '../apps/api/dist/config.js';
import { readAuthConfig, usesLocalOidcFixture } from '../apps/api/dist/modules/workspace/index.js';
import { Database } from '../apps/api/dist/platform/database/client.js';
import { fixtureShops } from '../apps/api/prisma/p0-fixture.mjs';
import { assertFixtureDatabase, fixtureSession } from '../tests/integration/workspace/session-fixture.mjs';

const url = readDatabaseUrl(process.env);
assertFixtureDatabase(url);
const auth = readAuthConfig(process.env);
assert.ok(auth && usesLocalOidcFixture(auth), 'Use the local OIDC fixture');
assert.equal(new URL(url).search, '', 'Use a direct fixture database URL');
const database = new Database(url);
const db = database.client;
const sessions = [];

function latency(times) {
    times.sort((a, b) => a - b);
    const percentile = probability => Number(times[Math.ceil(times.length * probability) - 1].toFixed(1));
    return { p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99) };
}

async function measure(name, concurrency, requests, shopIndexFor, run) {
    const shopTimes = fixtureShops.map(() => []);
    const statuses = {};
    let next = 0;
    const began = performance.now();
    const completed = await Promise.allSettled(Array.from({ length: concurrency }, async () => {
        for (;;) {
            const index = next++;
            if (index >= requests) break;
            const start = performance.now();
            const shopIndex = shopIndexFor(index);
            const status = await run(index, shopIndex);
            shopTimes[shopIndex].push(performance.now() - start);
            statuses[status] = (statuses[status] ?? 0) + 1;
        }
    }));
    const failed = completed.find(worker => worker.status === 'rejected');
    if (failed) throw failed.reason;
    const elapsed = performance.now() - began;
    const result = { name, concurrency, requests, statuses, perSecond: Number((requests / elapsed * 1000).toFixed(1)),
        ...latency(shopTimes.flat()), shops: fixtureShops.map((shop, index) => ({
            name: shop.name, requests: shopTimes[index].length, ...latency(shopTimes[index]),
        })) };
    console.log(JSON.stringify(result));
    return result;
}

async function run(app) {
    await app.listen(0, '127.0.0.1');
    const origin = await app.getUrl() + '/api/v2';
    const request = (path, init = {}) => fetch(origin + path, { ...init, signal: AbortSignal.timeout(10_000) });
    for (const name of ['p0-editor', 'p0-editor-b']) {
        const session = await fixtureSession(db, name);
        sessions.push(session);
        const response = await request('/session', { headers: { cookie: session.cookie } });
        assert.equal(response.status, 200);
        session.csrf = (await response.json()).data.csrfToken;
    }
    async function read(actor, shopId, path) {
        const response = await request('/shops/' + shopId + '/' + path, { headers: { cookie: actor.cookie } });
        await response.arrayBuffer();
        return response.status;
    }
    const routes = ['products?limit=20', 'inventory?limit=20', 'orders?limit=20', 'conversations?limit=20', 'jobs?limit=10', 'reports'];
    for (const [index, shop] of fixtureShops.entries()) {
        for (const path of routes) assert.equal(await read(sessions[index], shop.id, path), 200);
    }
    const alternating = index => index % 2;
    for (const concurrency of [6, 12, 24]) {
        const skewed = concurrency === 24;
        const shopIndexFor = skewed ? index => Number(index % 4 === 3) : alternating;
        const groupSize = skewed ? 4 : 2;
        const reads = await measure(skewed ? 'tenant-scoped reads, 3:1' : 'tenant-scoped reads, balanced',
            concurrency, 240, shopIndexFor, (index, shopIndex) =>
                read(sessions[shopIndex], fixtureShops[shopIndex].id, routes[Math.floor(index / groupSize) % routes.length]));
        assert.deepEqual(reads.statuses, { 200: 240 });
    }
    const denied = await measure('second shop isolation', 8, 80, alternating, (_, shopIndex) =>
        read(sessions[1 - shopIndex], fixtureShops[shopIndex].id, 'products?limit=10'));
    assert.deepEqual(denied.statuses, { 404: 80 });
    const name = 'BE23 concurrency ' + randomUUID();
    const idem = randomUUID();
    const identities = fixtureShops.map(() => new Set());
    const writes = await measure('same-intent retries', 8, 64, alternating, async (_, shopIndex) => {
        const shop = fixtureShops[shopIndex];
        const owner = sessions[shopIndex];
        const response = await request('/shops/' + shop.id + '/customers', {
            method: 'POST', headers: { cookie: owner.cookie, origin: auth.appOrigin, 'x-csrf-token': owner.csrf,
                'idempotency-key': idem, 'content-type': 'application/json' },
            body: JSON.stringify({ displayName: name, email: null, phone: null, notes: '' }),
        });
        const result = await response.json();
        if (response.ok) identities[shopIndex].add(result.data.id);
        return response.status;
    });
    assert.deepEqual(writes.statuses, { 201: 64 });
    const shops = [];
    for (const [index, shop] of fixtureShops.entries()) {
        assert.equal(identities[index].size, 1);
        const [id] = identities[index];
        const command = { operationId: 'createCustomer', idempotencyKey: idem };
        const [customers, commands, audits, events] = await Promise.all([
            db.customer.count({ where: { shopId: shop.id, displayName: name } }),
            db.command.count({ where: { ...command, shopId: shop.id, actorId: sessions[index].userId } }),
            db.auditEntry.count({ where: { shopId: shop.id, resourceId: id, action: 'createCustomer' } }),
            db.outboxEvent.count({ where: { shopId: shop.id, eventType: 'command.updated', command } }),
        ]);
        assert.deepEqual([customers, commands, audits, events], [1, 1, 1, 1]);
        shops.push({ name: shop.name, customers, commands, audits, events });
    }
    console.log(JSON.stringify({ status: 'LOCAL_SYNTHETIC_PASS', shops }));
}

const app = await createApp({ database, auth, quiet: true });
try {
    await run(app);
} finally {
    try {
        if (sessions.length) await db.session.updateMany({ where: { id: { in: sessions.map(session => session.id) } }, data: { revokedAt: new Date() } });
    } finally {
        await app.close();
    }
}
