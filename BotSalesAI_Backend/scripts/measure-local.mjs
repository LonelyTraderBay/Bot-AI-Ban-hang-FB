import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { createApp } from '../apps/api/dist/app.js';
import { readDatabaseUrl } from '../apps/api/dist/config.js';
import { readAuthConfig } from '../apps/api/dist/modules/workspace/index.js';
import { Database } from '../apps/api/dist/platform/database/client.js';
import { fixtureShops } from '../apps/api/prisma/p0-fixture.mjs';
import { assertFixtureDatabase, fixtureSession } from '../tests/integration/workspace/session-fixture.mjs';

const url = readDatabaseUrl(process.env);
assertFixtureDatabase(url);
const auth = readAuthConfig(process.env);
const [shop, other] = fixtureShops;
const database = new Database(url);
const db = database.client;
const sessions = [];

async function measure(name, concurrency, requests, run) {
    const times = [];
    const statuses = {};
    let next = 0;
    const began = performance.now();
    await Promise.all(Array.from({ length: concurrency }, async () => {
        for (;;) {
            const index = next++;
            if (index >= requests) break;
            const start = performance.now();
            const status = await run(index);
            times.push(performance.now() - start);
            statuses[status] = (statuses[status] ?? 0) + 1;
        }
    }));
    const elapsed = performance.now() - began;
    times.sort((a, b) => a - b);
    const percentile = probability => Number(times[Math.ceil(times.length * probability) - 1].toFixed(1));
    const result = { name, concurrency, requests, statuses, perSecond: Number((requests / elapsed * 1000).toFixed(1)),
        p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99) };
    console.log(JSON.stringify(result));
    return result;
}

async function run(app) {
    await app.listen(0, '127.0.0.1');
    const origin = await app.getUrl() + '/api/v2';
    for (const name of ['p0-editor', 'p0-editor-b']) {
        const session = await fixtureSession(db, name);
        const response = await fetch(origin + '/session', { headers: { cookie: session.cookie } });
        assert.equal(response.status, 200);
        sessions.push({ ...session, csrf: (await response.json()).data.csrfToken });
    }
    const [owner, foreign] = sessions;
    async function read(actor, shopId, path) {
        const response = await fetch(origin + '/shops/' + shopId + '/' + path, { headers: { cookie: actor.cookie } });
        await response.arrayBuffer();
        return response.status;
    }
    const routes = ['products?limit=20', 'inventory?limit=20', 'orders?limit=20', 'reports'];
    for (const path of routes) assert.equal(await read(owner, shop.id, path), 200);
    const reads = await measure('tenant-scoped reads', 12, 240, index => read(owner, shop.id, routes[index % routes.length]));
    assert.deepEqual(reads.statuses, { 200: 240 });
    const denied = await measure('second shop isolation', 8, 40, index => index % 2
        ? read(owner, other.id, 'products?limit=10') : read(foreign, shop.id, 'products?limit=10'));
    assert.deepEqual(denied.statuses, { 404: 40 });
    const name = 'BE23 concurrency ' + randomUUID();
    const idem = randomUUID();
    const identities = new Set();
    const writes = await measure('same-intent retries', 8, 32, async () => {
        const response = await fetch(origin + '/shops/' + shop.id + '/customers', {
            method: 'POST', headers: { cookie: owner.cookie, origin: auth.appOrigin, 'x-csrf-token': owner.csrf,
                'idempotency-key': idem, 'content-type': 'application/json' },
            body: JSON.stringify({ displayName: name, email: null, phone: null, notes: '' }),
        });
        const result = await response.json();
        if (response.ok) identities.add(result.data.id);
        return response.status;
    });
    assert.deepEqual(writes.statuses, { 201: 32 });
    assert.equal(identities.size, 1);
    const [id] = identities;
    const [customers, commands, audits, events] = await Promise.all([
        db.customer.count({ where: { shopId: shop.id, displayName: name } }),
        db.command.count({ where: { shopId: shop.id, actorId: owner.userId, operationId: 'createCustomer', idempotencyKey: idem } }),
        db.auditEntry.count({ where: { shopId: shop.id, resourceId: id, action: 'createCustomer' } }),
        db.outboxEvent.count({ where: { shopId: shop.id, eventType: 'command.updated', command: { operationId: 'createCustomer', idempotencyKey: idem } } }),
    ]);
    assert.deepEqual([customers, commands, audits, events], [1, 1, 1, 1]);
    console.log(JSON.stringify({ status: 'LOCAL_SYNTHETIC_PASS', customers, commands, audits, events }));
}

const app = await createApp({ database, auth, quiet: true });
try {
    await run(app);
} finally {
    if (sessions.length) await db.session.updateMany({ where: { id: { in: sessions.map(session => session.id) } }, data: { revokedAt: new Date() } });
    await app.close();
}
