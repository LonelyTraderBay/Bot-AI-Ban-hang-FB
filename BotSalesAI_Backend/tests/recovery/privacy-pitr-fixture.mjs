import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createApp } from '../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../apps/api/dist/config.js';
import { currentMarketingConsent } from '../../apps/api/dist/modules/privacy/consent.js';
import { privacyRequestHandler } from '../../apps/api/dist/modules/privacy/index.js';
import { canInShop, readAuthConfig, usesLocalOidcFixture } from '../../apps/api/dist/modules/workspace/index.js';
import { Database } from '../../apps/api/dist/platform/database/client.js';
import { runJob } from '../../apps/api/dist/platform/jobs/index.js';
import { fixtureShops } from '../../apps/api/prisma/p0-fixture.mjs';
import { orderConversation } from '../integration/orders/fixtures.mjs';
import { assertFixtureDatabase, fixtureSession } from '../integration/workspace/session-fixture.mjs';

const [phase, stateFile] = process.argv.slice(2);
assert.ok(stateFile && ['prepare', 'change', 'sentinel', 'verify-before', 'verify-after'].includes(phase));
const url = new URL(readDatabaseUrl(process.env));
assertFixtureDatabase(url.href);
assert.notEqual(url.port, '55432', 'Use a disposable cluster on a dedicated loopback port');
assert.ok(url.port, 'Use an explicit loopback port');
const [shop, other] = fixtureShops;
const database = new Database(url.href);
const db = database.client;
const modelKey = (shopId, id) => ({ shopId_id: { shopId, id } });
const scoped = suffix => '/shops/' + shop.id + '/' + suffix;
const otherNotes = 'PITR fixture outside tenant';
const messageText = 'PITR synthetic message';

async function withApi(run) {
    const password = randomUUID() + randomUUID();
    process.env.P0_STEP_UP_PASSWORD = password;
    process.env.PRIVACY_FIXTURE_ACTIONS = '1';
    const auth = readAuthConfig(process.env);
    assert.ok(auth && usesLocalOidcFixture(auth));
    const app = await createApp({ database, auth, quiet: true });
    let owner;
    try {
        await app.listen(0, '127.0.0.1');
        const base = await app.getUrl() + '/api/v2';
        owner = await fixtureSession(db, 'p0-editor');
        async function call(path, expected, { method = 'GET', actor = owner, body, version } = {}) {
            const resp = await fetch(base + path, { method, headers: { cookie: actor.cookie, origin: auth.appOrigin,
                'x-csrf-token': actor.csrf ?? '', 'idempotency-key': randomUUID(), 'content-type': 'application/json',
                ...(version === undefined ? {} : { 'if-match': '"' + version + '"' }),
            }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
            assert.equal(resp.status, expected, path);
            return (await resp.json()).data;
        }
        owner.csrf = (await call('/session', 200)).csrfToken;
        const csrf = await fetch(base + '/auth/csrf');
        assert.equal(csrf.status, 200);
        const browser = { cookie: csrf.headers.get('set-cookie').split(';')[0], csrf: (await csrf.json()).data.csrfToken };
        async function confirmConsent(customerId, expectedAction) {
            const challenge = await call(scoped('customers/' + customerId + '/consent-challenges'), 201, { method: 'POST',
                body: { purpose: 'marketing', channel: 'email', message: 'Xác nhận dùng dữ liệu thử nghiệm cho lựa chọn tiếp thị.', contentVersion: 1 } });
            assert.equal(challenge.action, expectedAction);
            const exchange = await call('/public/consent/challenges/exchange', 200, { method: 'POST', actor: browser,
                body: { token: challenge.fixtureToken } });
            return call('/public/consent/confirmations', 200, { method: 'POST', actor: browser,
                body: { challengeSessionId: exchange.challengeSessionId, decision: 'accept', contentVersion: exchange.contentVersion } });
        }
        await run({ call, confirmConsent, auth, password });
    } finally {
        if (owner) await db.session.update({ where: { id: owner.id }, data: { revokedAt: new Date() } });
        await app.close();
    }
}

async function prepare() {
    await withApi(async ({ call, confirmConsent }) => {
        const createSubject = label => db.customer.create({ data: { shopId: shop.id, displayName: label, email: label + '@example.test', notes: label } });
        const optOut = await createSubject('pitr-consent-fixture');
        const erased = await createSubject('pitr-erasure-fixture');
        await db.customer.create({ data: { shopId: other.id, id: erased.id, displayName: 'PITR fixture shop B', notes: otherNotes } });
        const { identity, conversation } = await orderConversation(db, shop.id, erased.id);
        const message = await db.channelMessage.create({ data: { shopId: shop.id, conversationId: conversation.id, externalId: randomUUID(),
            text: messageText, origin: 'fixture', direction: 'inbound' } });
        const policy = await call(scoped('privacy/policy'), 200);
        await call(scoped('privacy/policy'), 200, { method: 'PATCH', version: policy.version,
            body: { chatRetentionDays: 90, jurisdictionNote: 'PITR synthetic policy' } });
        const grant = await confirmConsent(optOut.id, 'confirm');
        assert.equal(grant.consentStatus, 'granted');
        writeFileSync(stateFile, JSON.stringify({ sourcePort: url.port, optOutId: optOut.id, version: grant.consentVersion,
            erasedId: erased.id, identityId: identity.id, messageId: message.id }), { flag: 'wx', mode: 0o600 });
        console.log(JSON.stringify({ phase, initialConsent: grant.consentStatus, consentVersion: grant.consentVersion }));
    });
}

async function change(state) {
    await withApi(async ({ call, confirmConsent, auth, password }) => {
        const withdrawn = await confirmConsent(state.optOutId, 'withdraw');
        assert.equal(withdrawn.consentStatus, 'withdrawn');
        assert.equal(withdrawn.consentVersion, state.version + 1);
        const request = await call(scoped('privacy/requests'), 201, { method: 'POST', body: { kind: 'delete',
            customerId: state.erasedId, reason: 'PITR synthetic deletion' } });
        const proof = await call('/auth/step-up', 200, { method: 'POST', body: { password } });
        await call(scoped('privacy/requests/' + request.id + '/approve'), 202, { method: 'POST', body: {
            expectedVersion: request.version, reason: 'PITR synthetic approval', reauthToken: proof.reauthToken,
        } });
        const where = modelKey(shop.id, request.id);
        const queued = await db.privacyRequest.findUniqueOrThrow({ where });
        await runJob(db, { shopId: shop.id, id: queued.jobId, sourceOperation: 'approvePrivacyRequest' }, privacyRequestHandler(auth),
            (tx, job, permission) => canInShop(tx, job.actorId, job.shopId, permission));
        assert.equal((await db.privacyRequest.findUniqueOrThrow({ where })).status, 'completed');
        console.log(JSON.stringify({ phase, consent: withdrawn.consentStatus, consentVersion: withdrawn.consentVersion, erasure: 'completed' }));
    });
}

async function verify(state, after, pause) {
    assert.equal(pause, 'paused', 'Recovery must have reached its named target');
    const { optOutId, erasedId, identityId, messageId, version } = state;
    const snapshot = await db.$transaction(async tx => {
        const consent = await tx.customerConsent.findFirstOrThrow({ where: { shopId: shop.id, customerId: optOutId, channel: 'email' }, include: { history: true } });
        const customer = await tx.customer.findUniqueOrThrow({ where: modelKey(shop.id, erasedId) });
        const sameId = await tx.customer.findUniqueOrThrow({ where: modelKey(other.id, erasedId) });
        const identity = await tx.customerIdentity.findUniqueOrThrow({ where: modelKey(shop.id, identityId) });
        const message = await tx.channelMessage.findUniqueOrThrow({ where: modelKey(shop.id, messageId) });
        const oldGrantUsable = await currentMarketingConsent(tx, shop.id, optOutId, 'email', version);
        return { consent, customer, sameId, identity, message, oldGrantUsable };
    });
    const { consent, customer, sameId, identity, message, oldGrantUsable } = snapshot;
    assert.equal(consent.status, after ? 'withdrawn' : 'granted');
    assert.equal(consent.version, version + Number(after));
    assert.equal(consent.history.filter(evidence => evidence.action === 'withdrawn').length, Number(after));
    assert.equal(oldGrantUsable, !after);
    assert.equal(Boolean(customer.privacyErasedAt), after);
    assert.equal(customer.email, after ? null : 'pitr-erasure-fixture@example.test');
    assert.equal(identity.externalId.startsWith('erased:'), after);
    assert.equal(Boolean(message.redactedAt), after);
    assert.equal(message.text, after ? 'Đã ẩn nội dung' : messageText);
    assert.equal(sameId.notes, otherNotes);
    const app = await createApp({ database, quiet: true });
    try {
        await app.listen(0, '127.0.0.1');
        const health = await app.getUrl() + '/api/v2/health/';
        assert.equal((await fetch(health + 'live')).status, 200);
        assert.equal((await fetch(health + 'ready')).status, 503);
    } finally {
        await app.close();
    }
    console.log(JSON.stringify({ phase, state: pause, consent: consent.status, oldGrantUsable,
        erased: Boolean(customer.privacyErasedAt), messageRedacted: Boolean(message.redactedAt), otherShopUnchanged: true,
        live: 200, ready: 503 }));
}

try {
    const [walState] = await db.$queryRaw`SELECT pg_is_in_recovery() AS recovering,
        CASE WHEN pg_is_in_recovery() THEN pg_get_wal_replay_pause_state() END AS pause`;
    if (phase === 'prepare') {
        assert.equal(walState.recovering, false);
        await prepare();
    } else {
        const state = JSON.parse(readFileSync(stateFile, 'utf8'));
        const readOnly = phase.startsWith('verify-');
        assert.equal(walState.recovering, readOnly);
        assert.equal(url.port === state.sourcePort, !readOnly);
        if (readOnly) await verify(state, phase === 'verify-after', walState.pause);
        else if (phase === 'change') await change(state);
        else {
            await db.customer.update({ where: modelKey(other.id, state.erasedId), data: { notes: 'PITR write beyond the target' } });
            console.log(JSON.stringify({ phase, wroteAfterNamedTarget: true }));
        }
    }
} finally {
    await db.$disconnect();
}
