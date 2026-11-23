import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { createApp } from '../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../apps/api/dist/config.js';
import { localAccountingDate, reportExportHandler } from '../../apps/api/dist/modules/finance/index.js';
import { readAuthConfig, usesLocalOidcFixture } from '../../apps/api/dist/modules/workspace/index.js';
import { Database } from '../../apps/api/dist/platform/database/client.js';
import { fixtureShops } from '../../apps/api/prisma/p0-fixture.mjs';
import { runWorker } from '../../apps/worker/src/runner.mjs';
import { assertFixtureDatabase, fixtureSession } from '../integration/workspace/session-fixture.mjs';

const [phase, statePath, extra] = process.argv.slice(2);
assert.ok(statePath && extra === undefined && ['prepare', 'verify-queued', 'verify-completed'].includes(phase));
const url = new URL(readDatabaseUrl(process.env));
assertFixtureDatabase(url.href);
assert.ok(url.port && url.port !== '55432' && !url.search, 'Use a dedicated fixture cluster with a direct URL');
const auth = readAuthConfig(process.env);
assert.ok(auth && usesLocalOidcFixture(auth), 'Use the local OIDC fixture');
const state = phase === 'prepare' ? undefined : JSON.parse(readFileSync(statePath, 'utf8'));
if (state) {
    assert.notEqual(url.port, state.sourcePort, 'Use the restored cluster');
    assert.deepEqual(state.shops.map(shop => shop.shopId), fixtureShops.map(shop => shop.id));
} else {
    assert.ok(!existsSync(statePath), 'Use a new state file');
}

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const scope = shopId => '/api/v2/shops/' + shopId;
const database = new Database(url.href);
const db = database.client;
const app = await createApp({ database, auth, quiet: true });
const sessions = [];
let worker;

async function prepare(shop, request) {
    const base = scope(shop.id);
    const post = (path, payload, status) => request(base + path, status, payload);
    const date = localAccountingDate(new Date(), shop.timezone);
    await post('/periods', { startDate: date, endDate: date, reason: 'Kỳ tổng hợp diễn tập BE-23' }, 201);
    const sku = 'RESTORE-' + randomUUID();
    const product = await post('/products', { name: sku, description: '', categoryId: null, status: 'active', imageFileIds: [],
        variants: [{ sku, name: 'Mẫu phục hồi', options: {}, active: true, price: { amount: '20000', currency: shop.currency } }],
    }, 201);
    const [variant] = product.variants;
    const adjustment = await post('/inventory/adjustments', { expectedVersion: 1, warehouseId: shop.defaultWarehouseId,
        variantId: variant.id, quantityDelta: 4, unitCost: { amount: '2500', currency: shop.currency }, reason: 'Nhập tồn mẫu để kiểm phục hồi',
    }, 202);
    assert.equal(adjustment.status, 'succeeded');
    const customer = await post('/customers', { displayName: 'Khách mẫu ' + shop.currency, email: null, phone: null, notes: sku }, 201);
    const order = await post('/orders', { customerId: customer.id, conversationId: null, warehouseId: shop.defaultWarehouseId,
        shippingAddressId: null, notes: 'Đơn nháp diễn tập', paymentMethod: 'cod', lines: [{ variantId: variant.id, quantity: 1 }],
    }, 201);
    const bytes = Buffer.from('Tệp phục hồi tổng hợp ' + shop.currency, 'utf8');
    const input = new globalThis.FormData();
    input.set('purpose', 'knowledge_source');
    input.set('file', new globalThis.Blob([bytes], { type: 'text/plain' }), 'restore-fixture.txt');
    const file = await post('/uploads', input, 201);
    assert.equal(file.status, 'ready');
    const now = Date.now();
    const job = await post('/exports', { reportType: 'inventory', format: 'csv', timezone: shop.timezone,
        from: new Date(now - 86400000).toISOString(), to: new Date(now).toISOString(), snapshotAsOf: new Date(now).toISOString(),
    }, 202);
    assert.equal(job.status, 'queued');
    const jobRow = await db.job.findUniqueOrThrow({ where: { shopId_id: { shopId: shop.id, id: job.id } } });
    const exportBlob = await db.fileBlob.findUniqueOrThrow({ where: { shopId_fileId: { shopId: shop.id, fileId: jobRow.input.snapshotFileId } } });
    return { shopId: shop.id, productId: product.id, variantId: variant.id, orderId: order.id,
        fileId: file.id, fileSha256: sha256(bytes), jobId: job.id, exportSha256: sha256(exportBlob.bytes) };
}

async function verify(shop, expected, request, download, denied) {
    const base = scope(shop.id);
    const position = await db.stockPosition.findUniqueOrThrow({ where: { shopId_warehouseId_variantId: {
        shopId: shop.id, warehouseId: shop.defaultWarehouseId, variantId: expected.variantId,
    } } });
    assert.equal(position.onHand, 4);
    assert.ok(await db.financeJournal.count({ where: { shopId: shop.id, status: 'posted' } }) > 0);
    assert.equal((await request(base + '/products/' + expected.productId)).id, expected.productId);
    assert.equal((await request(base + '/orders/' + expected.orderId)).id, expected.orderId);
    const file = await request(base + '/uploads/' + expected.fileId);
    assert.equal(sha256(await download(file.readUrl)), expected.fileSha256);
    await denied(file.readUrl);

    const jobPath = base + '/jobs/' + expected.jobId;
    if (phase === 'verify-queued') {
        assert.equal((await request(jobPath)).status, 'queued');
        return { name: shop.name, onHand: 4, file: 200, crossShopFile: 404, export: 'queued' };
    }
    for (let attempt = 0; attempt < 100; attempt++) {
        const job = await request(jobPath);
        if (job.status === 'succeeded') {
            assert.equal(sha256(await download(job.downloadUrl)), expected.exportSha256);
            await denied(job.downloadUrl);
            const row = await db.job.findUniqueOrThrow({ where: { shopId_id: { shopId: shop.id, id: expected.jobId } } });
            assert.equal(row.attempts, 1);
            return { name: shop.name, onHand: 4, file: 200, crossShopFile: 404, export: job.status, attempts: row.attempts };
        }
        assert.ok(['queued', 'running'].includes(job.status), 'Restored export failed');
        await delay(200);
    }
    throw new Error('Restored export did not finish');
}

try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const call = (path, actor, payload) => {
        assert.ok(path?.startsWith('/api/v2/'), 'Expected an application URL');
        const headers = { cookie: actor?.cookie ?? '' };
        if (payload !== undefined) Object.assign(headers, { origin: auth.appOrigin, 'x-csrf-token': actor.csrf,
            'idempotency-key': randomUUID(), ...(payload instanceof globalThis.FormData ? {} : { 'content-type': 'application/json' }) });
        return fetch(base + path, { headers, signal: AbortSignal.timeout(5000), ...(payload === undefined ? {} : {
            method: 'POST', body: payload instanceof globalThis.FormData ? payload : JSON.stringify(payload),
        }) });
    };
    assert.equal((await call('/api/v2/health/ready')).status, 200);
    for (const subject of ['p0-editor', 'p0-editor-b']) {
        const actor = await fixtureSession(db, subject);
        sessions.push(actor);
        const response = await call('/api/v2/session', actor);
        assert.equal(response.status, 200);
        actor.csrf = (await response.json()).data.csrfToken;
    }
    if (phase === 'verify-completed') {
        const redis = new URL(process.env.REDIS_URL);
        assert.ok(redis.protocol === 'redis:' && redis.hostname === '127.0.0.1' && redis.port,
            'Use a fresh, dedicated loopback Redis fixture');
        const queued = await db.job.count({ where: { status: 'queued', attempts: 0,
            OR: state.shops.map(shop => ({ shopId: shop.shopId, id: shop.jobId })),
        } });
        assert.equal(queued, state.shops.length, 'Restore the snapshot with both untouched queued exports before replay');
        worker = runWorker(() => new Map([['createExport', reportExportHandler]]), 'botsales-restore-' + randomUUID());
        // Observe startup failure even while an HTTP check is still running.
        void worker.catch(() => {});
    }
    const shops = [];
    for (const [index, shop] of fixtureShops.entries()) {
        const actor = sessions[index];
        const foreign = sessions[1 - index];
        const request = async (path, status = 200, payload) => {
            const response = await call(path, actor, payload);
            assert.equal(response.status, status, path);
            return (await response.json()).data;
        };
        const download = async path => {
            const response = await call(path, actor);
            assert.equal(response.status, 200);
            return Buffer.from(await response.arrayBuffer());
        };
        const denied = async path => {
            const response = await call(path, foreign);
            assert.equal(response.status, 404);
            await response.body?.cancel();
        };
        assert.equal((await request(scope(shop.id))).id, shop.id);
        await denied(scope(shop.id));
        shops.push(state ? await verify(shop, state.shops[index], request, download, denied) : await prepare(shop, request));
    }
    if (!state) writeFileSync(statePath, JSON.stringify({ sourcePort: url.port, shops }), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ status: 'LOCAL_RECOVERY_SMOKE_PASSED', phase, readiness: 200, shops: state ? shops : shops.length }));
} finally {
    try {
        if (worker) {
            process.emit('SIGTERM');
            await worker;
        }
    } finally {
        try {
            if (sessions.length) await db.session.updateMany({ where: { id: { in: sessions.map(session => session.id) } }, data: { revokedAt: new Date() } });
        } finally {
            await app.close();
        }
    }
}
