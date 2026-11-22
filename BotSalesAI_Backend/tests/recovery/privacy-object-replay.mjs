import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { fixtureIssuer, fixtureShops } from '../../apps/api/prisma/p0-fixture.mjs';
import { fixtureSession } from '../integration/workspace/session-fixture.mjs';

const [phase, pitrPath, filesPath, manifestPath, runtime] = process.argv.slice(2);
assert.ok(pitrPath && filesPath && (phase === 'stage' || (phase === 'verify' && manifestPath && runtime)));
const target = new URL(process.env.DATABASE_URL);
assert.equal(target.hostname, '127.0.0.1');
assert.equal(target.username, 'botsales_runtime');
assert.ok(target.port && target.port !== '55432');
assert.ok([...target.searchParams].every(([key, value]) => (key === 'schema' && value === 'public') || (key === 'sslmode' && value === 'disable')));
assert.ok(phase === 'stage' ? target.pathname === '/botsales_be_dev' : /^\/botsales_be_recovery_[a-z0-9_]+$/.test(target.pathname));
assert.equal(new URL(process.env.FILE_OBJECT_STORE_ENDPOINT).hostname, '127.0.0.1');
assert.equal(process.env.FILE_OBJECT_STORE_BUCKET, 'botsales-file-fixture');
assert.equal(process.env.OBJECT_STORE_FIXTURE_ADAPTER, '1');

const moduleFrom = path => import(pathToFileURL(resolve(runtime ?? '.', 'apps/api/dist', path)).href);
const [{ createApp }, { configuredFileStore }, { currentMarketingConsent }, { readAuthConfig }, { Database }] = await Promise.all([
    moduleFrom('app.js'), moduleFrom('modules/files/index.js'), moduleFrom('modules/privacy/index.js'),
    moduleFrom('modules/workspace/index.js'), moduleFrom('platform/database/client.js'),
]);
const database = new Database(target.href);
const db = database.client;
const [shop, foreign] = fixtureShops;
const store = configuredFileStore();
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const { optOutId, erasedId, messageId, version } = read(pitrPath);
const modelKey = (shopId, id) => ({ shopId_id: { shopId, id } });
const storageKey = ({ shopId, id }) => ({ shopId_fileId: { shopId, fileId: id } });
const payload = name => Buffer.from('Synthetic recovery attachment: ' + name);
const run = promisify(execFile);

async function stage() {
    const { conversationId } = await db.channelMessage.findUniqueOrThrow({ where: modelKey(shop.id, messageId) });
    const uploader = subject => db.user.findUniqueOrThrow({ where: { oidcIssuer_oidcSubject: { oidcIssuer: fixtureIssuer, oidcSubject: subject } } });
    const [owner, other] = await Promise.all(['p0-editor', 'p0-editor-b'].map(uploader));
    async function fixture(name, shopId, uploaderId, { purpose = 'conversation_media', resourceId, rejected = false, stored = false } = {}) {
        const bytes = payload(name);
        const file = await db.fileObject.create({ data: { shopId, uploaderId, name, purpose, resourceId,
            mimeType: 'application/octet-stream', sizeBytes: bytes.length, sha256: digest(bytes),
            status: rejected ? 'rejected' : 'ready', expiresAt: rejected ? new Date() : null } });
        if (stored) {
            await store.write(file, bytes);
            await db.fileStorage.create({ data: { shopId, fileId: file.id, state: 'stored', targetId: store.id } });
        } else {
            await db.fileBlob.create({ data: { shopId, fileId: file.id, bytes } });
        }
        return file.id;
    }
    const media = await fixture('stored-media', shop.id, owner.id, { resourceId: conversationId, stored: true });
    const staged = await fixture('staged-media', shop.id, owner.id, { resourceId: conversationId });
    const active = await fixture('active-import', shop.id, owner.id, { purpose: 'product_import' });
    const outside = await fixture('retired-other-shop', foreign.id, other.id, { rejected: true, stored: true });
    writeFileSync(filesPath, JSON.stringify({ media, staged, active, outside }), { flag: 'wx', mode: 0o600 });
}

async function verify() {
    const ids = read(filesPath);
    const file = (name, shopId = shop.id) => db.fileObject.findUniqueOrThrow({ where: modelKey(shopId, ids[name]) });
    const [media, staged, active, outside] = await Promise.all([file('media'), file('staged'), file('active'), file('outside', foreign.id)]);
    const checksum = digest(readFileSync(manifestPath));
    const action = 'purgeFileBytes';
    const storage = row => db.fileStorage.findUnique({ where: storageKey(row) });
    const blob = row => db.fileBlob.findUnique({ where: storageKey(row) });
    const auditCount = resourceId => db.auditEntry.count({ where: { shopId: shop.id, resourceId, action } });
    const useOldGrant = () => db.$transaction(tx => currentMarketingConsent(tx, shop.id, optOutId, 'email', version));
    async function replay(expected = 0, env = {}, sha = checksum) {
        const args = ['infra/backup/privacy-recovery.mjs', 'apply', shop.id, manifestPath, sha, '--purge-files'];
        try {
            const result = await run(process.execPath, args, { cwd: runtime, timeout: 60000,
                env: { ...process.env, PRIVACY_RECOVERY_DATABASE_URL: target.href, ...env } });
            assert.equal(expected, 0);
            return JSON.parse(result.stdout);
        } catch (error) {
            assert.equal(error.code, expected, error.stderr ?? error.message);
            return expected === 2 ? JSON.parse(error.stdout) : error.stderr;
        }
    }

    const app = await createApp({ database, auth: readAuthConfig(process.env), quiet: true });
    const actors = [];
    try {
        await app.listen(0, '127.0.0.1');
        const api = await app.getUrl();
        const owner = await fixtureSession(db, 'p0-editor');
        const other = await fixtureSession(db, 'p0-editor-b');
        actors.push(owner.id, other.id);
        const request = (path, actor = owner) => fetch(api + path, { headers: { cookie: actor.cookie } });
        const route = '/api/v2/shops/' + shop.id + '/uploads/' + media.id;
        const metadata = await request(route);
        assert.equal(metadata.status, 200);
        const link = (await metadata.json()).data.readUrl;
        const download = await request(link);
        assert.equal(download.status, 200);
        assert.equal(digest(Buffer.from(await download.arrayBuffer())), media.sha256);
        assert.equal((await request(link, other)).status, 404);
        assert.equal(await useOldGrant(), true);

        assert.match(await replay(1, {}, '0'.repeat(64)), /digest mismatch/);
        assert.match(await replay(1, { FILE_OBJECT_STORE_BUCKET: 'wrong-bucket' }), /dedicated loopback fixture bucket/);
        assert.equal(await useOldGrant(), true);
        assert.equal((await file('media')).status, 'ready');

        await db.fileStorage.update({ where: storageKey(media), data: { dueAt: new Date(Date.now() + 600_000) } });
        const first = await replay(2);
        assert.ok(first.withdrawalsApplied >= 1 && first.erasuresApplied >= 1);
        assert.equal(first.files.pending, 1);
        assert.equal(await useOldGrant(), false);
        assert.equal((await request(link)).status, 404);
        assert.ok((await db.customer.findUniqueOrThrow({ where: modelKey(shop.id, erasedId) })).privacyErasedAt);
        assert.equal((await db.customer.findUniqueOrThrow({ where: modelKey(foreign.id, erasedId) })).privacyErasedAt, null);
        assert.equal((await store.read(media)).compare(payload(media.name)), 0);
        assert.equal(await blob(staged), null);
        assert.equal((await storage(staged)).state, 'purged');

        await db.fileStorage.update({ where: storageKey(media), data: { dueAt: null } });
        const retry = await replay();
        assert.deepEqual(retry.files, { purged: 1, pending: 0 });
        assert.equal((await storage(media)).state, 'purged');
        await assert.rejects(store.read(media), error => error.$metadata?.httpStatusCode === 404);
        assert.equal(await auditCount(media.id), 1);
        assert.equal(await auditCount(staged.id), 1);
        assert.equal((await storage(outside)).state, 'stored');
        assert.equal((await store.read(outside)).compare(payload(outside.name)), 0);
        assert.equal(await storage(active), null);
        assert.equal(Buffer.from((await blob(active)).bytes).compare(payload(active.name)), 0);
        const repeated = await replay();
        assert.equal(repeated.erasuresApplied, 0);
        assert.equal(repeated.withdrawalsApplied, 0);
        assert.deepEqual(repeated.files, { purged: 0, pending: 0 });
        assert.equal(await auditCount(media.id), 1);
        assert.equal(await auditCount(staged.id), 1);
        console.log(JSON.stringify({ status: 'LOCAL_PRIVACY_OBJECT_REPLAY_VERIFIED', checksum, before: 200, wrongShop: 404,
            after: 404, deferredExitCode: 2, recoveredObject: 404, consent: 'withdrawn', replayIdempotent: true,
            purgeAudits: 2, unrelatedObjectsAndStagingPreserved: true }));
    } finally {
        await db.session.updateMany({ where: { id: { in: actors } }, data: { revokedAt: new Date() } });
        await app.close();
    }
}

try {
    await store.checkBucket();
    await (phase === 'stage' ? stage() : verify());
} finally {
    await database.onApplicationShutdown();
}
