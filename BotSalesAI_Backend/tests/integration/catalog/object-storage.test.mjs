import assert from 'node:assert/strict';
import { Blob } from 'node:buffer';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { promisify } from 'node:util';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { configuredFileStore, readyImportFile, transferFileObjects } from '../../../apps/api/dist/modules/files/index.js';
import { FileObjectStore, objectKey, readObjectStorageConfig } from '../../../apps/api/dist/modules/files/object-storage.js';
import { readAuthConfig } from '../../../apps/api/dist/modules/workspace/index.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { assertFixtureDatabase, fixtureSession } from '../workspace/session-fixture.mjs';

const [shop] = fixtureShops;
const shopId = shop.id;
const root = '/shops/' + shopId + '/uploads';
const run = promisify(execFile);
let db, auth, app, base, store, owner, viewer;

before(async () => {
    assert.equal(process.env.OBJECT_STORE_FIXTURE_ADAPTER, '1');
    assert.equal(new URL(process.env.FILE_OBJECT_STORE_ENDPOINT).hostname, '127.0.0.1');
    assert.equal(process.env.FILE_OBJECT_STORE_BUCKET, 'botsales-file-fixture');
    const url = readDatabaseUrl(process.env);
    assertFixtureDatabase(url);
    const database = new Database(url);
    db = database.client;
    store = configuredFileStore();
    assert.ok(store);
    await store.checkBucket();
    auth = readAuthConfig(process.env);
    [owner, viewer] = await Promise.all(['p0-editor', 'p0-reader'].map(user => fixtureSession(db, user)));
    app = await createApp({ database, auth, quiet: true });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
    const session = await fetch(base + '/api/v2/session', { headers: { cookie: owner.cookie } });
    assert.equal(session.status, 200);
    owner.csrf = (await session.json()).data.csrfToken;
});

after(async () => {
    if (owner && viewer) await db.session.updateMany({ where: { id: { in: [owner.id, viewer.id] } }, data: { revokedAt: new Date() } });
    await app?.close();
});

const fileKey = fileId => ({ shopId_id: { shopId, id: fileId } });
const storageKey = fileId => ({ shopId_fileId: { shopId, fileId } });
const bytesOf = fileId => db.fileBlob.findUnique({ where: storageKey(fileId) });
const download = (url, actor = owner) => fetch(base + url, { headers: { cookie: actor.cookie } });

async function upload() {
    const text = 'sku,name\nS3-' + randomUUID() + ',Synthetic fixture\n';
    const form = new globalThis.FormData();
    form.set('purpose', 'product_import');
    form.set('file', new Blob([text], { type: 'text/csv' }), 'object-fixture.csv');
    const response = await fetch(base + '/api/v2' + root, {
        method: 'POST', body: form,
        headers: { cookie: owner.cookie, origin: auth.appOrigin, 'x-csrf-token': owner.csrf, 'idempotency-key': randomUUID() },
    });
    assert.equal(response.status, 201);
    const { data } = await response.json();
    return { data, text, row: await db.fileObject.findUniqueOrThrow({ where: fileKey(data.id) }) };
}

function withWrite(write) {
    return { id: store.id, checkBucket: () => store.checkBucket(), remove: row => store.remove(row), write };
}

test('SC-017: transfer retries an acknowledged object after a lost result and reads it only through authorized API', async () => {
    const { data, text, row } = await upload();
    const id = data.id;
    assert.equal((await bytesOf(id)).bytes.length, row.sizeBytes);
    const interrupted = withWrite(async (file, bytes) => {
        await store.write(file, bytes);
        throw new Error('Synthetic loss before PostgreSQL settlement');
    });
    await assert.rejects(transferFileObjects(db, interrupted), /will be retried/);
    const pending = await db.fileStorage.findUniqueOrThrow({ where: storageKey(id) });
    assert.equal(pending.state, 'pending');
    assert.equal(pending.attempts, 1);
    assert.ok(pending.dueAt > new Date());
    assert.equal((await download(data.readUrl)).status, 200);
    assert.equal((await store.read(row)).toString(), text);
    await db.fileStorage.update({ where: storageKey(id), data: { dueAt: null } });
    await Promise.all([transferFileObjects(db, store), transferFileObjects(db, store)]);
    assert.equal((await db.fileStorage.findUniqueOrThrow({ where: storageKey(id) })).state, 'stored');
    assert.equal(await bytesOf(id), null);
    assert.equal(await db.auditEntry.count({ where: { shopId, resourceId: id, action: 'storeFileObject' } }), 1);
    assert.equal(await (await download(data.readUrl)).text(), text);
    assert.equal((await download(data.readUrl, viewer)).status, 404);
    assert.equal((await db.$transaction(tx => readyImportFile(tx, shopId, owner.userId, id))).bytes.toString(), text);
    const publicUrl = process.env.FILE_OBJECT_STORE_ENDPOINT + '/' + process.env.FILE_OBJECT_STORE_BUCKET + '/' + objectKey(row);
    assert.ok([401, 403].includes((await fetch(publicUrl)).status));
    const report = JSON.parse((await run(process.execPath, ['scripts/check-object-storage.mjs'])).stdout);
    assert.equal(report.status, 'CHECKED');
    assert.ok(report.checked > 0 && report.mismatches === 0);

    await store.remove(row);
    assert.equal((await download(data.readUrl)).status, 503);
    await assert.rejects(run(process.execPath, ['scripts/check-object-storage.mjs']), error => {
        const result = JSON.parse(error.stdout);
        return error.code === 2 && result.status === 'ATTENTION' && result.mismatches === 1;
    });
    await store.write(row, Buffer.from(text));
    await db.fileObject.update({ where: fileKey(id), data: { status: 'rejected', expiresAt: new Date() } });
    assert.equal((await download(data.readUrl)).status, 404);
    await transferFileObjects(db, store);
    assert.equal((await db.fileStorage.findUniqueOrThrow({ where: storageKey(id) })).state, 'purged');
    await assert.rejects(store.read(row), error => error.$metadata?.httpStatusCode === 404);
});

test('SC-017: revocation during transfer switches to verified cleanup and preserves no readable copy', async () => {
    const { data, row } = await upload();
    const revoked = withWrite(async (file, bytes) => {
        await store.write(file, bytes);
        await db.fileObject.update({ where: fileKey(file.id), data: { status: 'rejected', expiresAt: new Date() } });
    });
    await transferFileObjects(db, revoked);
    assert.equal((await db.fileStorage.findUniqueOrThrow({ where: storageKey(row.id) })).state, 'pending');
    assert.equal((await download(data.readUrl)).status, 404);
    assert.ok(await bytesOf(row.id));
    await transferFileObjects(db, store);
    assert.equal((await db.fileStorage.findUniqueOrThrow({ where: storageKey(row.id) })).state, 'purged');
    assert.equal(await bytesOf(row.id), null);
    await assert.rejects(store.read(row), error => error.$metadata?.httpStatusCode === 404);
    assert.equal(await db.auditEntry.count({ where: { shopId, resourceId: row.id, action: 'purgeFileBytes' } }), 1);
});

test('SC-017: restore write probe checks its own object and leaves the integrity report unchanged', async () => {
    const script = 'scripts/check-object-storage.mjs';
    const probe = [script, '--probe-write'];
    const check = async () => JSON.parse((await run(process.execPath, [script])).stdout);
    const before = await check();
    assert.equal(before.status, 'CHECKED');
    await assert.rejects(run(process.execPath, probe, { env: { ...process.env, OBJECT_STORE_FIXTURE_ADAPTER: '0' } }), error => {
        return error.code === 1 && JSON.parse(error.stdout).status === 'UNAVAILABLE';
    });
    const result = JSON.parse((await run(process.execPath, probe)).stdout);
    assert.equal(result.status, 'WRITABLE');
    assert.equal(result.writeVerified, true);
    assert.equal(result.absentWhenChecked, true);
    assert.match(result.probeId, /^[a-f0-9-]{36}$/);
    await assert.rejects(run(process.execPath, [script, '--resolve-write', result.probeId]), error => {
        const state = JSON.parse(error.stdout);
        return error.code === 2 && state.status === 'ATTENTION' && !state.writeVerified && !state.absentWhenChecked;
    });
    assert.deepEqual(await check(), before);
});

test('SC-017: paused transfers retain staging and report overdue purges', async t => {
    const env = { ...process.env, FILE_OBJECT_STORE_TRANSFER_NEW_FILES: '0' };
    const paused = new FileObjectStore(readObjectStorageConfig(env));
    assert.equal(paused.id, store.id);
    assert.throws(() => readObjectStorageConfig({ ...env, FILE_OBJECT_STORE_TRANSFER_NEW_FILES: 'false' }), /must be 0 or 1/);
    const stored = await upload();
    const retired = await upload();
    await transferFileObjects(db, store);
    assert.equal((await db.fileStorage.findUniqueOrThrow({ where: storageKey(stored.row.id) })).state, 'stored');
    assert.equal((await db.fileStorage.findUniqueOrThrow({ where: storageKey(retired.row.id) })).state, 'stored');
    const staged = await upload();
    const past = new Date(Date.now() - 120000);
    await db.fileObject.update({ where: fileKey(staged.row.id), data: { createdAt: past } });
    await db.fileObject.update({ where: fileKey(retired.row.id), data: { status: 'rejected', expiresAt: past, createdAt: past } });

    const observe = async transfer => {
        const options = { env: { SystemRoot: process.env.SystemRoot, OPERATIONS_DATABASE_URL: readDatabaseUrl(process.env),
            FILE_OBJECT_STORE_TRANSFER_NEW_FILES: transfer } };
        try {
            const result = await run(process.execPath, ['scripts/check-operations.mjs', 'file-storage', '60000', '60000'], options);
            return JSON.parse(result.stdout);
        } catch (error) {
            assert.equal(error.code, 2, error.message);
            return JSON.parse(error.stdout);
        }
    };
    const enabled = await observe('1');
    assert.deepEqual(enabled.issues, ['FILE_TRANSFER_LAG', 'FILE_PURGE_LAG']);
    assert.equal(enabled.observations.retiredAwaitingPurge, 1);
    assert.equal(enabled.observations.rejectedWithoutElapsedExpiry, 0);
    await db.fileObject.update({ where: fileKey(retired.row.id), data: { expiresAt: null } });
    const pausedBeforePurge = await observe('0');
    assert.deepEqual(pausedBeforePurge.issues, ['FILE_PURGE_LAG']);
    assert.equal(pausedBeforePurge.observations.waitingToTransfer, 1);
    assert.equal(pausedBeforePurge.observations.rejectedWithoutElapsedExpiry, 1);

    await transferFileObjects(db, paused);
    assert.equal(await db.fileStorage.findUnique({ where: storageKey(staged.row.id) }), null);
    assert.equal(Buffer.from((await bytesOf(staged.row.id)).bytes).toString(), staged.text);
    assert.equal(await (await download(stored.data.readUrl)).text(), stored.text);
    assert.equal(await (await download(staged.data.readUrl)).text(), staged.text);
    assert.equal((await download(retired.data.readUrl)).status, 404);
    await assert.rejects(store.read(retired.row), error => error.$metadata?.httpStatusCode === 404);
    assert.equal((await db.fileStorage.findUniqueOrThrow({ where: storageKey(retired.row.id) })).state, 'purged');
    const pausedAfterPurge = await observe('0');
    assert.equal(pausedAfterPurge.status, 'OK');
    assert.equal(pausedAfterPurge.observations.waitingToTransfer, 1);
    assert.equal(pausedAfterPurge.observations.retiredAwaitingPurge, 0);
    await transferFileObjects(db, store);
    const resumed = await observe('1');
    assert.equal(resumed.status, 'OK');
    assert.equal(resumed.observations.waitingToTransfer, 0);
    t.diagnostic(JSON.stringify({ enabled, pausedBeforePurge, pausedAfterPurge, resumed }));
});
