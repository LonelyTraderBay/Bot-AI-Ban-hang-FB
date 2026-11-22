import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixtureShops } from '../../apps/api/prisma/p0-fixture.mjs';
import { currentMarketingConsent } from '../../apps/api/dist/modules/privacy/index.js';
import { createDatabaseClient } from '../../apps/api/dist/platform/database/client.js';
import { fixtureSession } from '../integration/workspace/session-fixture.mjs';

const [file, original, later] = process.argv.slice(2);
assert.ok(file && original && later, 'Pass the captured manifest and the original and later PITR fixture state files.');
const [shop, other] = fixtureShops;
const parse = path => JSON.parse(readFileSync(path, 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = parse(file), first = parse(original), second = parse(later);
const checksum = digest(readFileSync(file));
const directory = mkdtempSync(join(tmpdir(), 'botsales-privacy-replay-'));
const target = new URL(process.env.PRIVACY_RECOVERY_DATABASE_URL);
assert.equal(target.hostname, '127.0.0.1');
assert.equal(target.username, 'botsales_runtime');
assert.equal(target.pathname, '/botsales_be_recovery_fixture');
assert.ok(target.port && target.port !== '55432');
assert.ok([...target.searchParams].every(([key, value]) => (key === 'schema' && value === 'public') || (key === 'sslmode' && value === 'disable')));
const hold = new URL(target);
hold.pathname = '/botsales_be_recovery_hold';
const db = createDatabaseClient(target.href), held = createDatabaseClient(hold.href);
const key = (shopId, id) => ({ shopId_id: { shopId, id } });
const consentSlot = { shopId_customerId_channel: { shopId: shop.id, customerId: first.optOutId, channel: 'email' } };
const whichCustomer = { shopId: shop.id, customerId: first.erasedId };

function cli(url, args, error) {
    const child = spawnSync(process.execPath, ['infra/backup/privacy-recovery.mjs', ...args], {
        env: { ...process.env, PRIVACY_RECOVERY_DATABASE_URL: url.href }, encoding: 'utf8', timeout: 20000,
    });
    if (child.error) throw child.error;
    assert.equal(child.status, error ? 1 : 0, child.stderr);
    if (error) assert.match(child.stderr, error);
    return error ? undefined : JSON.parse(child.stdout);
}

try {
    assert.equal(manifest.shopId, shop.id);
    assert.deepEqual(new Set(manifest.withdrawals.map(row => row.customerId)), new Set([first.optOutId, second.optOutId]));
    assert.deepEqual(new Set(manifest.erasures.map(row => row.customerId)), new Set([first.erasedId, second.erasedId]));
    assert.ok(manifest.erasures.every(row => row.identities.length && row.identities.every(alias => /^erased:[a-f0-9]{64}$/.test(alias.externalId))));
    assert.doesNotMatch(JSON.stringify(manifest), /@example\.test|PITR synthetic message|PITR fixture shop B/);
    assert.equal((await db.customerConsent.findUniqueOrThrow({ where: consentSlot })).status, 'granted');
    assert.equal(await db.customer.findUnique({ where: key(shop.id, second.erasedId) }), null);
    assert.equal(await db.customer.findUnique({ where: key(shop.id, second.optOutId) }), null);

    cli(target, ['apply', shop.id, file, '0'.repeat(64)], /digest mismatch/);
    cli(target, ['apply', other.id, file, checksum], /scope does not match/);
    const override = new URL(target);
    override.searchParams.set('port', '55432');
    cli(override, ['apply', shop.id, file, checksum], /dedicated loopback fixture/);
    const invalidFile = join(directory, 'invalid.json');
    const invalid = JSON.stringify({ ...manifest, withdrawals: [...manifest.withdrawals, manifest.withdrawals[0]] });
    writeFileSync(invalidFile, invalid, { flag: 'wx', mode: 0o600 });
    cli(target, ['apply', shop.id, invalidFile, digest(invalid)], /Duplicate or overlapping/);
    const unrelatedFile = join(directory, 'unrelated.json');
    const unrelated = JSON.stringify({ ...manifest, shopCreatedAt: '2000-01-01T00:00:00.000Z' });
    writeFileSync(unrelatedFile, unrelated, { flag: 'wx', mode: 0o600 });
    cli(target, ['apply', shop.id, unrelatedFile, digest(unrelated)], /does not share the manifest lineage/);
    assert.equal((await db.customerConsent.findUniqueOrThrow({ where: consentSlot })).status, 'granted');
    console.log('Rejected wrong digest, wrong shop, connection override, duplicate facts and mismatched lineage.');

    const retention = { ...whichCustomer, kind: 'question', summary: 'Offline recovery retention fixture' };
    if (!await held.serviceCase.findFirst({ where: retention })) await held.serviceCase.create({ data: retention });
    cli(hold, ['apply', shop.id, file, checksum], /retained evidence/);
    const recoveryAudit = { shopId: shop.id, requestId: checksum };
    assert.equal(await held.auditEntry.count({ where: recoveryAudit }), 0);
    assert.equal((await held.customerConsent.findUniqueOrThrow({ where: consentSlot })).status, 'granted');
    assert.equal((await held.customer.findUniqueOrThrow({ where: key(shop.id, first.erasedId) })).privacyErasedAt, null);
    assert.equal(await held.customer.findUnique({ where: key(shop.id, second.erasedId) }), null);
    assert.equal(await held.serviceCase.count({ where: whichCustomer }), 1);
    console.log('A retention obligation rolls back the entire shop bundle and keeps the retained record.');

    const owner = await fixtureSession(db, 'p0-editor');
    await db.session.update({ where: { id: owner.id }, data: { revokedAt: new Date() } });
    const oldConsent = await db.customerConsent.findUniqueOrThrow({ where: consentSlot });
    const pending = await db.consentChallenge.create({ data: {
        shopId: shop.id, customerId: first.optOutId, channel: 'email', actorId: owner.userId, message: 'Offline fixture pending consent',
        policyVersion: oldConsent.policyVersion, priorConsentVersion: oldConsent.version, contentVersion: 1,
        expiresAt: new Date(Date.now() + 86400000),
    } });
    assert.equal(await db.$transaction(tx => currentMarketingConsent(tx, shop.id, first.optOutId, 'email', first.version)), true);
    const applied = cli(target, ['apply', shop.id, file, checksum]);
    assert.deepEqual(applied, { mode: 'apply', digest: checksum, withdrawalsApplied: 1, knownWithdrawals: 0, suppressedWithdrawals: 1,
        erasuresApplied: 2, aliasesAdded: manifest.erasures.find(row => row.customerId === second.erasedId).identities.length });
    const proof = manifest.withdrawals.find(row => row.customerId === first.optOutId);
    const consent = await db.customerConsent.findUniqueOrThrow({ where: consentSlot, include: { history: { include: { recoveryAudit: true } } } });
    const evidence = consent.history.find(row => row.id === proof.id);
    assert.deepEqual([consent.status, consent.version, evidence.action, evidence.recoveryAudit.action, evidence.recoveryAudit.requestId],
        ['withdrawn', first.version + 1, 'withdrawn', 'privacy.recovery.withdraw', checksum]);
    assert.equal((await db.consentChallenge.findUniqueOrThrow({ where: key(shop.id, pending.id) })).status, 'expired');
    assert.equal(await db.$transaction(tx => currentMarketingConsent(tx, shop.id, first.optOutId, 'email', first.version)), false);
    assert.equal(await db.customer.findUnique({ where: key(shop.id, second.optOutId) }), null);
    for (const row of manifest.erasures) {
        const profile = await db.customer.findUniqueOrThrow({ where: key(shop.id, row.customerId), include: { identities: true } });
        assert.equal(profile.privacyErasedAt.toISOString(), row.erasedAt);
        assert.deepEqual([profile.displayName, profile.email, profile.phone, profile.notes], ['Khách hàng đã ẩn', null, null, null]);
        assert.deepEqual(new Set(profile.identities.map(alias => alias.externalId)), new Set(row.identities.map(alias => alias.externalId)));
    }
    const message = await db.channelMessage.findUniqueOrThrow({ where: key(shop.id, first.messageId) });
    assert.ok(message.redactedAt);
    assert.equal(message.text, 'Đã ẩn nội dung');
    assert.equal((await db.customer.findUniqueOrThrow({ where: key(other.id, first.erasedId) })).notes, 'PITR fixture outside tenant');
    console.log('Applied the opt-out, expired the old challenge, masked the existing subject and kept only hashed aliases for the missing subject. Shop B was unchanged.');

    const auditCount = await db.auditEntry.count({ where: recoveryAudit });
    const outboxCount = await db.outboxEvent.count({ where: { shopId: shop.id } });
    const repeated = cli(target, ['apply', shop.id, file, checksum]);
    assert.deepEqual(repeated, { mode: 'apply', digest: checksum, withdrawalsApplied: 0, knownWithdrawals: 1, suppressedWithdrawals: 1,
        erasuresApplied: 0, aliasesAdded: 0 });
    assert.equal(auditCount, 3);
    assert.equal(await db.auditEntry.count({ where: recoveryAudit }), auditCount);
    assert.equal(await db.outboxEvent.count({ where: { shopId: shop.id } }), outboxCount);
    const recapturedFile = join(directory, 'recaptured.json');
    cli(target, ['capture', shop.id, recapturedFile]);
    const recaptured = parse(recapturedFile);
    assert.deepEqual(recaptured.withdrawals, [proof]);
    assert.deepEqual(recaptured.erasures, manifest.erasures);
    console.log('Replay produced no additional writes. Recapture preserved the withdrawal evidence ID and both erasure records.');
} finally {
    await Promise.all([db.$disconnect(), held.$disconnect()]);
}
