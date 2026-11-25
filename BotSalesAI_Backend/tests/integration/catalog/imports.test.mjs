import assert from 'node:assert/strict';
import { Blob } from 'node:buffer';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { URLSearchParams } from 'node:url';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createContractValidator, schemaFromContract } from '../../../apps/api/dist/http/contracts.js';
import { readAuthConfig } from '../../../apps/api/dist/modules/workspace/index.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { assertFixtureDatabase, fixtureSession } from '../workspace/session-fixture.mjs';

const { components } = JSON.parse(readFileSync(new URL('../../../../botsales-kit/contracts/openapi.json', import.meta.url)));
const validator = createContractValidator(components.schemas);
const [shopA, shopB] = fixtureShops;
const path = (shop, resource) => '/shops/' + shop.id + '/' + resource;
const mapping = ['sku', 'name', 'price'].map(name => ({ sourceColumn: name, targetField: name }));
let app, db, base, origin, ownerA, ownerB, reader, worker;

async function until(check) {
    for (let attempt = 0; attempt < 100; attempt++) {
        const result = await check();
        if (result) return result;
        await delay(100);
    }
    assert.fail('Import worker did not reach expected state');
}

before(async () => {
    const url = readDatabaseUrl(process.env);
    assertFixtureDatabase(url);
    const redis = new URL(process.env.REDIS_URL);
    assert.equal(redis.protocol, 'redis:');
    assert.equal(redis.hostname, '127.0.0.1');
    assert.ok(redis.port, 'Set the port of a dedicated loopback Redis fixture');
    const auth = readAuthConfig(process.env);
    assert.ok(auth);
    origin = auth.appOrigin;
    const database = new Database(url);
    db = database.client;
    [ownerA, ownerB, reader] = await Promise.all(['p0-editor', 'p0-editor-b', 'p0-reader'].map(subject => fixtureSession(db, subject)));
    app = await createApp({ database, auth, quiet: true });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl() + '/api/v2';
    for (const actor of [ownerA, ownerB, reader]) actor.csrf = (await json(await request('/session', actor), 200, 'SessionResponse')).csrfToken;
    worker = spawn(process.execPath, ['apps/worker/src/main.mjs'], { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
    let output = '';
    worker.stdout.on('data', chunk => { output += String(chunk); });
    await until(() => {
        assert.equal(worker.exitCode, null);
        return output.includes('"status":"ready"');
    });
});

after(async () => {
    if (worker && worker.exitCode === null && worker.signalCode === null) {
        const stopped = once(worker, 'exit', { signal: AbortSignal.timeout(8000) });
        worker.kill();
        await stopped;
    }
    const ids = [ownerA, ownerB, reader].filter(Boolean).map(actor => actor.id);
    if (ids.length) await db.session.updateMany({ where: { id: { in: ids } }, data: { revokedAt: new Date() } });
    await app?.close();
});

function request(route, actor, options = {}) {
    return fetch(base + route, { ...options, headers: { cookie: actor.cookie, ...options.headers } });
}

async function json(response, status, schema) {
    assert.equal(response.status, status);
    const body = await response.json();
    const validate = validator.compile(schemaFromContract(schema));
    assert.equal(validate(body), true, JSON.stringify(validate.errors));
    assert.equal(body.meta?.requestId ?? body.requestId, response.headers.get('x-request-id'));
    return body.data;
}

function send(route, actor, body, key = randomUUID()) {
    const jsonBody = !(body instanceof globalThis.FormData);
    return request(route, actor, {
        method: 'POST',
        headers: { origin, 'x-csrf-token': actor.csrf, 'idempotency-key': key, ...(jsonBody ? { 'content-type': 'application/json' } : {}) },
        body: jsonBody ? JSON.stringify(body) : body,
    });
}

function upload(bytes, name = 'products.csv', type = 'text/csv', key) {
    const form = new globalThis.FormData();
    form.set('purpose', 'product_import');
    form.set('file', new Blob([bytes], { type }), name);
    return send(path(shopA, 'uploads'), ownerA, form, key);
}

function startPreview(fileId, duplicateStrategy = 'reject', key) {
    return send(path(shopA, 'imports'), ownerA, { fileId, mapping, duplicateStrategy, dryRun: true }, key);
}

async function getJob(jobId, state) {
    return until(async () => {
        const job = await json(await request(path(shopA, 'jobs/' + jobId), ownerA), 200, 'JobResponse');
        return job.status === state ? job : undefined;
    });
}

function commit(jobId, input, key) {
    return send(path(shopA, 'imports/' + jobId + '/commit'), ownerA, input, key);
}

test('SC-016: CSV preview records row errors, then POST retry and command recovery find one partial import', async () => {
    const sku = 'BE08-CSV-' + randomUUID();
    const source = 'sku,name,price\n' + sku + ',Dòng hợp lệ,15000\n' + sku.toLowerCase() + ',Trùng,20000\nINVALID,Dòng sai,0\n';
    const file = await json(await upload(source), 201, 'FileObjectResponse');
    assert.equal(file.status, 'ready');
    await json(await request(path(shopB, 'uploads/' + file.id), ownerB), 404, 'Problem');
    await json(await send(path(shopB, 'imports'), ownerB, { fileId: file.id, mapping, duplicateStrategy: 'reject', dryRun: true }), 404, 'Problem');
    await json(await send(path(shopA, 'imports'), reader, { fileId: file.id, mapping, duplicateStrategy: 'reject', dryRun: true }), 403, 'Problem');
    const previewKey = randomUUID();
    const admitted = await json(await startPreview(file.id, 'reject', previewKey), 202, 'JobResponse');
    const preview = await getJob(admitted.id, 'awaiting_confirmation');
    assert.equal((await json(await startPreview(file.id, 'reject', previewKey), 202, 'JobResponse')).id, preview.id);
    assert.equal(preview.completed, 3);
    assert.equal(preview.total, 3);
    assert.equal(preview.errorCount, 2);
    assert.deepEqual(preview.rowErrors.map(({ row, code }) => [row, code]), [[3, 'DUPLICATE_SKU'], [4, 'INVALID_PRODUCT']]);
    assert.ok(preview.validationToken);
    assert.equal(await db.variant.count({ where: { shopId: shopA.id, sku } }), 0);
    const body = { validationToken: preview.validationToken, confirmValidRowsOnly: true };
    await json(await commit(admitted.id, { ...body, validationToken: 'wrong' }), 409, 'Problem');

    const commitKey = randomUUID();
    const missed = await commit(admitted.id, body, commitKey);
    assert.equal(missed.status, 202);
    await missed.body.cancel();
    const confirmed = await getJob(admitted.id, 'partial');
    assert.equal(confirmed.completed, 1);
    assert.equal(confirmed.errorCount, 2);
    assert.deepEqual(confirmed.rowErrors, preview.rowErrors);
    assert.equal(confirmed.validationToken, null);
    const receipt = await json(await commit(admitted.id, body, commitKey), 202, 'JobResponse');
    assert.equal(receipt.status, 'partial');
    await json(await commit(admitted.id, body, randomUUID()), 409, 'Problem');
    const q = createHash('sha256').update(commitKey).digest('hex');
    const commands = await json(await request(path(shopA, 'commands') + '?' + new URLSearchParams({ kind: 'commitProductImport', q }), ownerA),
        200, 'CommandListResponse');
    assert.deepEqual(commands.map(command => [command.status, command.result]), [['succeeded', { type: 'job', id: receipt.id }]]);
    const jobs = await json(await request(path(shopA, 'jobs') + '?' + new URLSearchParams({ sort: '-createdAt', status: 'partial', q: admitted.id }), ownerA),
        200, 'JobListResponse');
    assert.deepEqual(jobs.map(job => job.id), [admitted.id]);
    assert.equal(await db.variant.count({ where: { shopId: shopA.id, sku } }), 1);
    assert.equal(await db.auditEntry.count({ where: { shopId: shopA.id, action: 'commitProductImport', resourceId: admitted.id } }), 1);
    await until(() => db.outboxEvent.count({ where: { shopId: shopA.id, jobId: receipt.id, publishedAt: { not: null } } }));
});

test('SC-016: XLSX preview stores exact decimal and update_existing preserves the existing variant', async () => {
    const xlsx = readFileSync(new URL('./products-fixture.xlsx', import.meta.url));
    const type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const file = await json(await upload(xlsx, 'products.xlsx', type), 201, 'FileObjectResponse');
    assert.equal(file.status, 'ready');
    const sku = 'BE08-XLSX-FIXTURE';
    for (let attempt = 0; attempt < 2; attempt++) {
        const initial = await db.variant.findFirst({ where: { shopId: shopA.id, sku } });
        const job = await json(await startPreview(file.id, 'update_existing'), 202, 'JobResponse');
        const preview = await getJob(job.id, 'awaiting_confirmation');
        assert.equal(preview.errorCount, 0);
        assert.equal((await db.variant.findFirst({ where: { shopId: shopA.id, sku } }))?.version, initial?.version);
        await json(await commit(job.id, { validationToken: preview.validationToken, confirmValidRowsOnly: true }), 202, 'JobResponse');
        await getJob(job.id, 'succeeded');
        const variant = await db.variant.findFirstOrThrow({ where: { shopId: shopA.id, sku } });
        assert.equal(variant.priceAmount.toFixed(), '9007199254740993.000000000000000001');
        if (initial) assert.equal(variant.id, initial.id);
    }
});

test('SC-017: uploads quarantine invalid spreadsheets and catalog changes invalidate a previous token', async () => {
    const bad = await json(await upload('sku,name,price\nA,B,30', 'fake.xlsx', 'application/octet-stream'), 201, 'FileObjectResponse');
    assert.equal(bad.status, 'quarantined');
    assert.equal(bad.readUrl, null);
    assert.equal(bad.rejectionReason, 'invalid_format');
    await json(await startPreview(bad.id), 404, 'Problem');
    const key = randomUUID();
    const rows = 'sku,name,price\n' + 'A,B,30\n'.repeat(1001);
    const limited = await json(await upload(rows, 'limit.csv', 'text/csv', key), 201, 'FileObjectResponse');
    assert.equal(limited.status, 'quarantined');
    assert.equal(limited.readUrl, null);
    assert.equal(limited.rejectionReason, 'spreadsheet_limit');
    const get = actor => request(path(shopA, 'uploads/' + limited.id), actor);
    assert.deepEqual(await json(await get(ownerA), 200, 'FileObjectResponse'), limited);
    assert.deepEqual(await json(await upload(rows, 'limit.csv', 'text/csv', key), 201, 'FileObjectResponse'), limited);
    await json(await get(ownerB), 404, 'Problem');
    await json(await get(reader), 404, 'Problem');
    await json(await startPreview(limited.id), 404, 'Problem');
    assert.equal(await db.fileBlob.count({ where: { shopId: shopA.id, fileId: limited.id } }), 0);
    const audit = await db.auditEntry.findMany({ where: { shopId: shopA.id, action: 'uploadFile', resourceId: limited.id } });
    assert.deepEqual(audit.map(entry => entry.metadata.rejectionReason), ['spreadsheet_limit']);
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1, 'x');
    await json(await upload(oversized), 413, 'Problem');
    const sku = 'BE08-STALE-' + randomUUID();
    const file = await json(await upload('sku,name,price\n' + sku + ',Mẫu,10000\n'), 201, 'FileObjectResponse');
    assert.equal(file.rejectionReason, undefined);
    const job = await json(await startPreview(file.id), 202, 'JobResponse');
    const preview = await getJob(job.id, 'awaiting_confirmation');
    await json(await send(path(shopA, 'categories'), ownerA, { name: 'BE08 ' + randomUUID(), parentId: null }), 201, 'CategoryResponse');
    await json(await commit(job.id, { validationToken: preview.validationToken, confirmValidRowsOnly: true }), 409, 'Problem');
    assert.equal(await db.variant.count({ where: { shopId: shopA.id, sku } }), 0);
});
