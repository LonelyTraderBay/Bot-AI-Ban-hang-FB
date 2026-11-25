import assert from 'node:assert/strict';
import { Blob } from 'node:buffer';
import { createHash, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { after, before, test } from 'node:test';
import { URLSearchParams } from 'node:url';
import sharp from 'sharp';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createContractValidator, schemaFromContract } from '../../../apps/api/dist/http/contracts.js';
import { readFileScannerTarget } from '../../../apps/api/dist/modules/files/index.js';
import { readAuthConfig } from '../../../apps/api/dist/modules/workspace/index.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { fixtureCategory, fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { assertFixtureDatabase, fixtureSession } from '../workspace/session-fixture.mjs';

const { components } = JSON.parse(readFileSync(new URL('../../../../botsales-kit/contracts/openapi.json', import.meta.url)));
const validator = createContractValidator(components.schemas);
const [shopA, shopB] = fixtureShops;
const path = (shop, resource) => '/shops/' + shop.id + '/' + resource;
let origin, app, db, base, ownerA, ownerB, reader, auth;

before(async () => {
    const url = readDatabaseUrl(process.env);
    assertFixtureDatabase(url);
    auth = readAuthConfig(process.env);
    assert.ok(auth);
    origin = auth.appOrigin;
    const database = new Database(url);
    db = database.client;
    [ownerA, ownerB, reader] = await Promise.all(['p0-editor', 'p0-editor-b', 'p0-reader'].map(subject => fixtureSession(db, subject)));
    app = await createApp({ database, auth, quiet: true });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl() + '/api/v2';
    for (const actor of [ownerA, ownerB, reader]) {
        const session = await json(await request('/session', actor), 200, 'SessionResponse');
        actor.csrf = session.data.csrfToken;
    }
});

after(async () => {
    const ids = [ownerA, ownerB, reader].filter(Boolean).map(actor => actor.id);
    if (ids.length) await db.session.updateMany({ where: { id: { in: ids } }, data: { revokedAt: new Date() } });
    await app?.close();
});

function request(route, actor, options = {}) {
    return fetch(base + route, { ...options, headers: { ...(actor ? { cookie: actor.cookie } : {}), ...options.headers } });
}

async function json(response, status, schema) {
    assert.equal(response.status, status);
    const body = await response.json();
    const check = validator.compile(schemaFromContract(schema));
    assert.equal(check(body), true, JSON.stringify(check.errors));
    assert.equal(body.meta?.requestId ?? body.requestId, response.headers.get('x-request-id'));
    return body;
}

function write(shop, actor, body, key = randomUUID(), headers) {
    return request(path(shop, 'products'), actor, {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json', 'idempotency-key': key, 'x-csrf-token': actor.csrf, ...headers },
        body: JSON.stringify(body),
    });
}

function draft(shop, sku = 'BE07-' + randomUUID()) {
    return {
        name: 'Sản phẩm ' + sku, description: 'Fixture tổng hợp', categoryId: shop === shopA ? fixtureCategory.id : null,
        status: 'draft', imageFileIds: [],
        variants: [{ sku, name: 'Mặc định', options: {}, price: { amount: '9007199254740993.000000000000000001', currency: shop.currency }, active: true }],
    };
}

const cleanUpload = 'sku,name\nCLEAN-FILE,File scan fixture\n';
const flaggedUpload = 'sku,name\nFLAGGED-FILE,BOTSALES_SCAN_BLOCK_FIXTURE\n';

async function scanningApi(t, fileScanner, authConfig = auth) {
    const scanApp = await createApp({ database: new Database(readDatabaseUrl(process.env)), auth: authConfig, fileScanner, quiet: true });
    t.after(() => scanApp.close());
    await scanApp.listen(0, '127.0.0.1');
    const root = await scanApp.getUrl() + '/api/v2';
    const actor = ownerA;
    const upload = (content, key = randomUUID(), headers = {}) => {
        const payload = new globalThis.FormData();
        payload.set('purpose', 'product_import');
        payload.set('file', new Blob([content], { type: 'text/csv' }), 'scan.csv');
        return fetch(root + path(shopA, 'uploads'), {
            method: 'POST', headers: { cookie: actor.cookie, origin, 'x-csrf-token': actor.csrf, 'idempotency-key': key, ...headers },
            body: payload,
        });
    };
    return { root, upload };
}

async function scannerFixture(t) {
    const observed = { scans: [], mode: 'normal' };
    const server = createServer(socket => {
        let input = Buffer.alloc(0);
        socket.on('data', chunk => {
            input = Buffer.concat([input, chunk]);
            if (input.toString() === 'zPING\0') {
                socket.end(observed.mode === 'normal' ? 'PONG\0' : 'UNAVAILABLE\0');
                return;
            }
            const command = Buffer.from('zINSTREAM\0');
            const start = command.length + 4;
            if (input.length < start) return;
            assert.deepEqual(input.subarray(0, command.length), command);
            const size = input.readUInt32BE(command.length);
            if (input.length < start + size + 4) return;
            assert.equal(input.readUInt32BE(start + size), 0);
            const bytes = input.subarray(start, start + size).toString();
            observed.scans.push(bytes);
            if (observed.mode === 'error') socket.end('stream: backend unavailable ERROR\0');
            else if (observed.mode === 'truncated') socket.end('stream: OK');
            else if (bytes === flaggedUpload) socket.end('stream: Synthetic.Marker FOUND\0');
            else {
                socket.write('stream:');
                socket.end(' OK\0');
            }
        });
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
    return { observed, target: { host: '127.0.0.1', port: server.address().port } };
}

test('SC-017: scanner gates upload bytes, outage leaves no new command and recovery preserves replay', async t => {
    const { observed, target } = await scannerFixture(t);
    const { root, upload } = await scanningApi(t, target);
    await json(await upload(cleanUpload, randomUUID(), { 'x-csrf-token': 'invalid' }), 403, 'Problem');
    await json(await upload(cleanUpload, 'invalid'), 400, 'Problem');
    assert.deepEqual(observed.scans, []);
    assert.equal((await fetch(root + '/health/ready')).status, 200);
    const key = randomUUID();
    const clean = (await json(await upload(cleanUpload, key), 201, 'FileObjectResponse')).data;
    assert.equal(clean.status, 'ready');
    assert.equal(clean.rejectionReason, undefined);
    assert.equal(await (await fetch(root.replace(/\/api\/v2$/, '') + clean.readUrl, { headers: { cookie: ownerA.cookie } })).text(), cleanUpload);
    const blockedKey = randomUUID();
    const blocked = (await json(await upload(flaggedUpload, blockedKey), 201, 'FileObjectResponse')).data;
    assert.equal(blocked.status, 'quarantined');
    assert.equal(blocked.readUrl, null);
    assert.equal(blocked.rejectionReason, 'unsafe_file');
    assert.equal(await db.fileBlob.count({ where: { shopId: shopA.id, fileId: blocked.id } }), 0);
    const scanAudit = await db.auditEntry.findFirstOrThrow({ where: { shopId: shopA.id, action: 'uploadFile', resourceId: blocked.id } });
    assert.equal(scanAudit.metadata.scan, 'blocked');
    assert.equal(scanAudit.metadata.rejectionReason, 'unsafe_file');
    assert.deepEqual(observed.scans, [cleanUpload, flaggedUpload]);

    const retryKey = randomUUID();
    observed.mode = 'truncated';
    await json(await upload(cleanUpload, retryKey), 503, 'Problem');
    observed.mode = 'error';
    assert.equal((await fetch(root + '/health/live')).status, 200);
    assert.equal((await fetch(root + '/health/ready')).status, 503);
    await json(await upload(cleanUpload, retryKey), 503, 'Problem');
    assert.equal(await db.command.count({ where: { shopId: shopA.id, operationId: 'uploadFile', idempotencyKey: retryKey } }), 0);
    assert.equal((await json(await upload(cleanUpload, key), 201, 'FileObjectResponse')).data.id, clean.id);
    assert.deepEqual((await json(await upload(flaggedUpload, blockedKey), 201, 'FileObjectResponse')).data, blocked);
    observed.mode = 'normal';
    assert.equal((await fetch(root + '/health/ready')).status, 200);
    assert.equal((await json(await upload(cleanUpload, retryKey), 201, 'FileObjectResponse')).data.status, 'ready');
});

test('SC-017: configured non-fixture auth requires a scanner for readiness and new uploads', async t => {
    const { root, upload } = await scanningApi(t, undefined, { ...auth, clientId: 'real-client' });
    assert.equal((await fetch(root + '/health/ready')).status, 503);
    const key = randomUUID();
    await json(await upload(cleanUpload, key), 503, 'Problem');
    assert.equal(await db.command.count({ where: { shopId: shopA.id, operationId: 'uploadFile', idempotencyKey: key } }), 0);
});

test('SC-017: real local ClamAV daemon scans clean CSV and detects the harmless signature fixture', {
    skip: !process.env.P0_CLAMD_PORT,
}, async t => {
    const target = readFileScannerTarget({ FILE_SCAN_PORT: process.env.P0_CLAMD_PORT });
    const { root, upload } = await scanningApi(t, target, { ...auth, clientId: 'real-client' });
    assert.equal((await fetch(root + '/health/ready')).status, 200);
    const clean = (await json(await upload(cleanUpload), 201, 'FileObjectResponse')).data;
    const blocked = (await json(await upload(flaggedUpload), 201, 'FileObjectResponse')).data;
    assert.deepEqual([clean.status, blocked.status, blocked.readUrl], ['ready', 'quarantined', null]);
    assert.equal(blocked.rejectionReason, 'unsafe_file');
    assert.equal(await db.fileBlob.count({ where: { shopId: shopA.id, fileId: blocked.id } }), 0);
});

test('P0-08: dashboard declares unconfigured sources and category lists stay in the authorized shop', async () => {
    await json(await request(path(shopA, 'dashboard')), 401, 'Problem');
    for (const [shop, actor] of [[shopA, ownerA], [shopB, ownerB]]) {
        const { data } = await json(await request(path(shop, 'dashboard'), actor), 200, 'DashboardResponse');
        assert.equal(data.shopId, shop.id);
        assert.equal(data.botStatus, 'unconfigured');
        assert.equal(data.recognizedRevenue, null);
        assert.equal(data.cashReceived, null);
        assert.ok(data.warnings.length);
    }
    await json(await request(path(shopB, 'dashboard'), ownerA), 404, 'Problem');
    const filter = '?' + new URLSearchParams({ q: fixtureCategory.name, status: 'active' });
    const { data: categories } = await json(await request(path(shopA, 'categories') + filter, reader), 200, 'CategoryListResponse');
    assert.deepEqual(categories.map(category => category.id), [fixtureCategory.id]);
    assert.equal(categories[0].shopId, shopA.id);
    assert.deepEqual((await json(await request(path(shopB, 'categories') + filter, ownerB), 200, 'CategoryListResponse')).data, []);
});

test('P0-08: catalog writes preserve decimal precision, stable paging and the command source reference', async () => {
    const sku = 'BE07-' + randomUUID();
    const first = draft(shopA, sku + '-01');
    first.variants.push({ ...first.variants[0], sku: sku + '-EXTRA', name: 'Biến thể thứ hai' });
    const key = randomUUID();
    const writeResponse = await write(shopA, ownerA, first, key);
    assert.equal(writeResponse.headers.get('etag'), '"1"');
    const { data } = await json(writeResponse, 201, 'ProductResponse');
    assert.deepEqual(data.variants.map(variant => variant.sku), first.variants.map(variant => variant.sku));
    assert.equal(data.variants[0].price.amount, first.variants[0].price.amount);
    assert.equal(data.variants[0].price.currency, shopA.currency);
    assert.equal(data.variants[0].productId, data.id);
    assert.doesNotMatch(JSON.stringify(data), /skuKey|priceAmount/);
    const detail = await request(path(shopA, 'products/' + data.id), reader);
    assert.equal(detail.headers.get('etag'), '"1"');
    assert.deepEqual((await json(detail, 200, 'ProductResponse')).data, data);
    await json(await request(path(shopB, 'products/' + data.id), ownerB), 404, 'Problem');

    const second = draft(shopA, sku + '-02');
    const { data: added } = await json(await write(shopA, ownerA, second), 201, 'ProductResponse');
    const filters = new URLSearchParams({ q: sku, categoryId: fixtureCategory.id, status: 'draft', limit: '1' });
    const list = path(shopA, 'products') + '?';
    const { data: pageOne, page } = await json(await request(list + filters, reader), 200, 'ProductListResponse');
    assert.equal(pageOne.length, 1);
    assert.ok(page.nextCursor && page.hasMore);
    filters.set('cursor', page.nextCursor);
    const { data: pageTwo } = await json(await request(list + filters, reader), 200, 'ProductListResponse');
    assert.deepEqual(new Set([pageOne[0].id, pageTwo[0].id]), new Set([data.id, added.id]));
    filters.set('categoryId', randomUUID());
    await json(await request(list + filters, reader), 400, 'Problem');
    const variantMatch = await json(await request(list + new URLSearchParams({ q: sku + '-EXTRA' }), reader), 200, 'ProductListResponse');
    assert.deepEqual(variantMatch.data.map(product => product.id), [data.id]);

    const digest = createHash('sha256').update(key).digest('hex');
    const lookup = path(shopA, 'commands') + '?' + new URLSearchParams({ kind: 'createProduct', q: digest });
    const { data: commands } = await json(await request(lookup, ownerA), 200, 'CommandListResponse');
    assert.equal(commands.length, 1);
    assert.deepEqual(commands[0].result, { type: 'product', id: data.id });
    assert.equal(commands[0].status, 'succeeded');
    assert.equal(await db.outboxEvent.count({ where: { shopId: shopA.id, commandId: commands[0].id } }), 1);
    assert.equal(await db.auditEntry.count({ where: { shopId: shopA.id, resourceId: data.id, action: 'createProduct' } }), 1);
});

test('SC-013 and P0-09: SKU conflicts identify the field, survive write races and stay shop-scoped', async () => {
    const input = draft(shopA);
    await json(await write(shopA, reader, input), 403, 'Problem');
    await json(await write(shopB, ownerA, input), 404, 'Problem');
    await json(await write(shopA, ownerA, input, randomUUID(), { origin: 'https://invalid.example' }), 403, 'Problem');
    const withinProduct = draft(shopA);
    withinProduct.variants.push({ ...withinProduct.variants[0], sku: withinProduct.variants[0].sku.toLowerCase() });
    const payloadConflict = await json(await write(shopA, ownerA, withinProduct), 409, 'Problem');
    assert.deepEqual(payloadConflict.errors.map(({ path, code }) => ({ path, code })), [
        { path: '/variants/1/sku', code: 'SKU_CONFLICT' },
    ]);

    const replies = await Promise.all([write(shopA, ownerA, input), write(shopA, ownerA, input)]);
    assert.deepEqual(replies.map(reply => reply.status).sort(), [201, 409]);
    const conflicts = [
        await json(replies.find(reply => reply.status === 409), 409, 'Problem'),
        await json(await write(shopA, ownerA, draft(shopA, input.variants[0].sku.toLowerCase())), 409, 'Problem'),
    ];
    const patchTarget = await json(await write(shopA, ownerA, draft(shopA)), 201, 'ProductResponse');
    const variant = { ...input.variants[0], id: patchTarget.data.variants[0].id };
    const patch = await request(path(shopA, 'products/' + patchTarget.data.id), ownerA, {
        method: 'PATCH',
        headers: { origin, 'content-type': 'application/json', 'idempotency-key': randomUUID(),
            'x-csrf-token': ownerA.csrf, 'if-match': '"' + patchTarget.data.version + '"' },
        body: JSON.stringify({ variants: [variant] }),
    });
    conflicts.push(await json(patch, 409, 'Problem'));
    for (const conflict of conflicts) {
        assert.equal(conflict.code, 'CONFLICT');
        assert.deepEqual(conflict.errors.map(({ path, code }) => ({ path, code })), [
            { path: '/variants/0/sku', code: 'SKU_CONFLICT' },
        ]);
    }
    const unchanged = await json(await request(path(shopA, 'products/' + patchTarget.data.id), ownerA), 200, 'ProductResponse');
    assert.deepEqual(unchanged.data, patchTarget.data);
    assert.equal(await db.product.count({ where: { shopId: shopA.id, name: input.name } }), 1);
    assert.equal(await db.variant.count({ where: { shopId: shopA.id, sku: input.variants[0].sku } }), 1);

    const other = draft(shopB, input.variants[0].sku);
    await json(await write(shopB, ownerB, { ...other, categoryId: fixtureCategory.id }), 422, 'Problem');
    const { data } = await json(await write(shopB, ownerB, other), 201, 'ProductResponse');
    assert.equal(data.shopId, shopB.id);
    const empty = await json(await request(path(shopA, 'products') + '?categoryId=' + randomUUID(), reader), 200, 'ProductListResponse');
    assert.deepEqual(empty.data, []);
    assert.equal(empty.page.hasMore, false);
});

test('P0-09: same key replays one receipt and rejects changed input and unsupported references', async () => {
    const input = draft(shopA);
    const key = randomUUID();
    const replies = await Promise.all([write(shopA, ownerA, input, key), write(shopA, ownerA, input, key)]);
    const [created, replayed] = await Promise.all(replies.map(reply => json(reply, 201, 'ProductResponse')));
    assert.deepEqual(created.data, replayed.data);
    await json(await write(shopA, ownerA, { ...input, name: 'changed' }, key), 409, 'Problem');

    const invalid = draft(shopA);
    await json(await write(shopA, ownerA, { ...invalid, imageFileIds: [randomUUID()] }), 422, 'Problem');
    const [variant] = invalid.variants;
    for (const override of [
        { id: randomUUID() },
        { price: { ...variant.price, currency: shopB.currency } },
        { price: { ...variant.price, amount: '0.000' } },
        { sku: '   ' },
    ]) {
        await json(await write(shopA, ownerA, { ...invalid, variants: [{ ...variant, ...override }] }), 422, 'Problem');
    }
    assert.equal(await db.product.count({ where: { shopId: shopA.id, name: invalid.name } }), 0);
});

test('SC-018: category writes isolate hierarchy, enforce version and replay the archive receipt once', async () => {
    const route = path(shopA, 'categories');
    const mutate = (target, method, body, headers, key = randomUUID()) => request(target, ownerA, {
        method,
        headers: { origin, 'content-type': 'application/json', 'x-csrf-token': ownerA.csrf, 'idempotency-key': key, ...headers },
        body: JSON.stringify(body),
    });
    const prefix = 'Nhóm ' + randomUUID();
    const { data: parent } = await json(await mutate(route, 'POST', { name: prefix, parentId: null }), 201, 'CategoryResponse');
    const { data: child } = await json(await mutate(route, 'POST', { name: prefix + ' con', parentId: parent.id }), 201, 'CategoryResponse');
    await json(await request(path(shopB, 'categories/' + child.id), ownerB), 404, 'Problem');
    const detail = await request(route + '/' + child.id, reader);
    assert.equal(detail.headers.get('etag'), '"1"');
    assert.equal((await json(detail, 200, 'CategoryResponse')).data.parentId, parent.id);
    await json(await mutate(route + '/' + child.id, 'PATCH', { name: prefix + ' mới' }), 428, 'Problem');
    await json(await mutate(route + '/' + parent.id, 'PATCH', { parentId: child.id }, { 'if-match': '"1"' }), 409, 'Problem');
    const { data: updated } = await json(await mutate(route + '/' + child.id, 'PATCH', { name: prefix + ' mới' }, { 'if-match': '"1"' }),
        200, 'CategoryResponse');
    assert.equal(updated.version, 2);
    await json(await mutate(route + '/' + child.id, 'PATCH', { name: prefix }, { 'if-match': '"1"' }), 412, 'Problem');
    const reason = 'Ngừng danh mục thử';
    await json(await mutate(route + '/' + parent.id + '/archive', 'POST', { expectedVersion: 1, reason }), 409, 'Problem');
    const key = randomUUID();
    const archived = () => mutate(route + '/' + child.id + '/archive', 'POST', { expectedVersion: 2, reason }, {}, key);
    const { data: receipt } = await json(await archived(), 202, 'CommandResponse');
    assert.deepEqual((await json(await archived(), 202, 'CommandResponse')).data, receipt);
    assert.deepEqual(receipt.result, { type: 'category', id: child.id });
    const { data: inactive } = await json(await request(route + '/' + child.id, reader), 200, 'CategoryResponse');
    assert.equal(inactive.active, false);
    const page = await json(await request(route + '?' + new URLSearchParams({ q: prefix, status: 'archived' }), reader),
        200, 'CategoryListResponse');
    assert.deepEqual(page.data.map(row => row.id), [child.id]);
});

test('SC-017: private images require present source permission and are scoped to the attached product', async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#407090' } }).png().toBuffer();
    const send = (shop, actor, bytes, key, mimetype = 'image/png') => {
        const form = new globalThis.FormData();
        form.set('purpose', 'product_image');
        form.set('file', new Blob([bytes], { type: mimetype }), 'product.png');
        return request(path(shop, 'uploads'), actor, {
            method: 'POST', body: form, headers: { origin, 'x-csrf-token': actor.csrf, 'idempotency-key': key },
        });
    };
    const { data: quarantined } = await json(await send(shopA, ownerA, 'Not a raster image', randomUUID()), 201, 'FileObjectResponse');
    assert.equal(quarantined.status, 'quarantined');
    assert.equal(quarantined.readUrl, null);
    assert.equal(await db.fileBlob.count({ where: { shopId: shopA.id, fileId: quarantined.id } }), 0);
    await json(await send(shopA, reader, png, randomUUID()), 403, 'Problem');
    const key = randomUUID();
    const { data: file } = await json(await send(shopA, ownerA, png, key), 201, 'FileObjectResponse');
    assert.equal(file.status, 'ready');
    assert.ok(file.readUrl);
    const { data: replay } = await json(await send(shopA, ownerA, png, key), 201, 'FileObjectResponse');
    assert.equal(replay.id, file.id);
    assert.equal(await db.auditEntry.count({ where: { shopId: shopA.id, action: 'uploadFile', resourceId: file.id } }), 1);
    const q = createHash('sha256').update(key).digest('hex');
    const lookup = path(shopA, 'commands') + '?' + new URLSearchParams({ kind: 'uploadFile', q });
    const { data: commands } = await json(await request(lookup, ownerA), 200, 'CommandListResponse');
    assert.deepEqual(commands.map(command => command.result), [{ type: 'file', id: file.id }]);
    const metadata = path(shopA, 'uploads/' + file.id);
    await json(await request(metadata, reader), 404, 'Problem');
    await json(await request(path(shopB, 'uploads/' + file.id), ownerB), 404, 'Problem');
    await json(await write(shopB, ownerB, { ...draft(shopB), imageFileIds: [file.id] }), 422, 'Problem');
    const { data: product } = await json(await write(shopA, ownerA, { ...draft(shopA), imageFileIds: [file.id] }), 201, 'ProductResponse');
    assert.deepEqual(product.imageFileIds, [file.id]);
    const { data: attached } = await json(await request(metadata, reader), 200, 'FileObjectResponse');
    assert.equal(attached.resourceId, product.id);
    await json(await request(file.readUrl.slice('/api/v2'.length), reader), 404, 'Problem');
    const binary = await request(attached.readUrl.slice('/api/v2'.length), reader);
    assert.equal(binary.status, 200);
    assert.equal(binary.headers.get('content-type'), 'image/png');
    assert.equal(binary.headers.get('cache-control'), 'no-store');
    assert.equal(binary.headers.get('x-content-type-options'), 'nosniff');
    assert.equal((await binary.arrayBuffer()).byteLength, attached.sizeBytes);
    await json(await write(shopA, ownerA, { ...draft(shopA), imageFileIds: [file.id] }), 422, 'Problem');
});

test('SC-012 and SC-014: product patches preserve variant IDs, archive removed variants and enforce If-Match', async () => {
    const draftProduct = draft(shopA);
    draftProduct.variants.push({ ...draftProduct.variants[0], name: 'Dự phòng', sku: 'BE08-' + randomUUID() });
    const { data: initial } = await json(await write(shopA, ownerA, draftProduct), 201, 'ProductResponse');
    const route = path(shopA, 'products/' + initial.id);
    const change = (actor, suffix, method, body, headers, key = randomUUID()) => request(route + suffix, actor, {
        method, headers: { origin, 'content-type': 'application/json', 'x-csrf-token': actor.csrf, 'idempotency-key': key, ...headers },
        body: JSON.stringify(body),
    });
    const edit = { name: 'Đổi tên', variants: [{ ...draftProduct.variants[0], id: initial.variants[0].id, name: 'Giữ lại' }] };
    await json(await change(ownerA, '', 'PATCH', edit), 428, 'Problem');
    await json(await change(reader, '', 'PATCH', edit, { 'if-match': '"1"' }), 403, 'Problem');
    const key = randomUUID();
    const updated = await change(ownerA, '', 'PATCH', edit, { 'if-match': '"1"' }, key);
    assert.equal(updated.headers.get('etag'), '"2"');
    const { data: product } = await json(updated, 200, 'ProductResponse');
    assert.equal(product.variants[0].id, initial.variants[0].id);
    assert.equal(product.variants.length, 1);
    assert.deepEqual((await json(await change(ownerA, '', 'PATCH', edit, { 'if-match': '"1"' }, key), 200, 'ProductResponse')).data, product);
    await json(await change(ownerA, '', 'PATCH', edit, { 'if-match': '"1"' }), 412, 'Problem');
    const removed = await db.variant.findUniqueOrThrow({ where: { shopId_id: { shopId: shopA.id, id: initial.variants[1].id } } });
    assert.ok(removed.archivedAt);
    assert.equal(removed.active, false);
    const archive = { expectedVersion: 2, reason: 'Ngừng bán sản phẩm thử' };
    const { data: receipt } = await json(await change(ownerA, '/archive', 'POST', archive), 202, 'CommandResponse');
    assert.deepEqual(receipt.result, { type: 'product', id: initial.id });
    assert.equal((await json(await request(route, reader), 200, 'ProductResponse')).data.status, 'archived');
    await json(await change(ownerA, '', 'PATCH', edit, { 'if-match': '"3"' }), 409, 'Problem');
});
