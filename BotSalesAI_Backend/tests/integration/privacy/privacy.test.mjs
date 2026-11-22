import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { openapi } from '../../../apps/api/dist/http/contract-source.js';
import { createContractValidator, schemaFromContract } from '../../../apps/api/dist/http/contracts.js';
import { reportExportHandler } from '../../../apps/api/dist/modules/finance/index.js';
import { currentMarketingConsent } from '../../../apps/api/dist/modules/privacy/consent.js';
import { privacyRequestHandler, runPrivacyMaintenance } from '../../../apps/api/dist/modules/privacy/index.js';
import { canInShop, readAuthConfig } from '../../../apps/api/dist/modules/workspace/index.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { runJob } from '../../../apps/api/dist/platform/jobs/index.js';
import { fixtureIssuer, fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { fixtureWriter, orderConversation } from '../orders/fixtures.mjs';
import { assertFixtureDatabase, fixtureSession } from '../workspace/session-fixture.mjs';

const validator = createContractValidator(openapi.components.schemas);
const secondShop = fixtureShops[1].id;
const password = randomUUID() + randomUUID();
const ns = randomUUID();
const subject = 'privacy-' + ns;
const oneDay = 24 * 60 * 60 * 1000;
const shopInput = { name: 'Kiểm BE21 ' + ns, currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', locale: 'vi-VN' };
let db, admin, app, auth, root, origin, owner, secondSession, foreign, browser, shopId;

async function checked(response, status, schema) {
    assert.equal(response.status, status);
    const body = await response.json();
    const validate = validator.compile(schemaFromContract(schema));
    assert.equal(validate(body), true, JSON.stringify(validate.errors));
    return body;
}

async function call(path, schema, { method = 'GET', body, status = 200, actor = owner, idem = randomUUID(), version, requestOrigin } = {}) {
    const res = await fetch(root + path, { method, headers: {
        ...(actor?.cookie ? { cookie: actor.cookie } : {}),
        ...(method !== 'GET' ? { origin: requestOrigin ?? auth.appOrigin, 'x-csrf-token': actor?.csrf ?? '',
            'idempotency-key': idem, ...(version === undefined ? {} : { 'If-Match': '"' + version + '"' }),
            'content-type': 'application/json' } : {}),
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (res.status !== status) {
        const result = await res.json();
        assert.fail(path + ' expected ' + status + ', got ' + res.status + ' (' + result.title + ' ' + result.code + ')');
    }
    return (await checked(res, status, schema)).data;
}

const shopPath = suffix => '/shops/' + shopId + '/' + suffix;
const post = (path, body, schema, options = {}) => call(path, schema, { method: 'POST', body, ...options });
const patch = (path, body, schema, options = {}) => call(path, schema, { method: 'PATCH', body, ...options });
const key = (id, shop = shopId) => ({ shopId_id: { shopId: shop, id } });
const stepUp = (options = {}, supplied = password) => post('/auth/step-up', { password: supplied }, 'StepUpResultResponse', options);
const subjectRow = (label, shop = shopId) => db.customer.create({ data: { shopId: shop,
    displayName: label + ' ' + ns, email: label + '@example.test', phone: '+84901234567', notes: 'Tổng hợp ' + ns } });
const requestFor = (customerId, kind, options = {}) => post(shopPath('privacy/requests'),
    { kind, customerId, reason: 'Yêu cầu tổng hợp ' + ns }, 'PrivacyRequestResponse', { status: 201, ...options });
const approval = (row, reauthToken) => ({ expectedVersion: row.version, reason: 'Phê duyệt tổng hợp ' + ns, reauthToken });
const approve = (row, body, options = {}) => post(shopPath('privacy/requests/' + row.id + '/approve'), body, 'CommandResponse', { status: 202, ...options });
const privacyRow = id => db.privacyRequest.findUniqueOrThrow({ where: key(id) });
const authorize = (tx, job, permission) => canInShop(tx, job.actorId, job.shopId, permission);
const perform = (id, sourceOperation, handler) => runJob(db, { shopId, id, sourceOperation }, handler, authorize);
const createChallenge = (customer, options = {}) => post(shopPath('customers/' + customer.id + '/consent-challenges'),
    { purpose: 'marketing', channel: 'email', message: 'Xác nhận đồng ý nhận tiếp thị BotSales AI, có thể rút quyền bất kỳ lúc nào.',
        contentVersion: 2 }, 'ConsentChallengeResponse', { status: 201, ...options });
const exchange = (token, options = {}) => post('/public/consent/challenges/exchange', { token }, 'PublicConsentChallengeViewResponse', { actor: browser, ...options });
const confirm = (body, options = {}) => post('/public/consent/confirmations', body, 'ConsentConfirmationResponse', { actor: browser, ...options });

before(async () => {
    process.env.P0_STEP_UP_PASSWORD = password;
    process.env.PRIVACY_FIXTURE_ACTIONS = '1';
    const url = readDatabaseUrl(process.env);
    assertFixtureDatabase(url);
    auth = readAuthConfig(process.env);
    const database = new Database(url);
    db = database.client;
    admin = fixtureWriter();
    await db.user.create({ data: { oidcIssuer: fixtureIssuer, oidcSubject: subject, displayName: 'Kiểm quyền riêng tư', email: subject + '@example.test' } });
    [owner, secondSession, foreign] = await Promise.all([subject, subject, 'p0-editor-b'].map(id => fixtureSession(db, id)));
    app = await createApp({ database, auth, quiet: true });
    await app.listen(0, '127.0.0.1');
    origin = await app.getUrl();
    root = origin + '/api/v2';
    for (const actor of [owner, secondSession, foreign]) actor.csrf = (await call('/session', 'SessionResponse', { actor })).csrfToken;
    const csrf = await fetch(root + '/auth/csrf');
    browser = { cookie: csrf.headers.get('set-cookie').split(';')[0], csrf: (await checked(csrf, 200, 'CsrfResponse')).data.csrfToken };
});

after(async () => {
    const ids = [owner, secondSession, foreign].filter(Boolean).map(actor => actor.id);
    if (ids.length) await db.session.updateMany({ where: { id: { in: ids } }, data: { revokedAt: new Date() } });
    await admin?.$disconnect();
    await app?.close();
});

test('SC2-G01: onboarding provisions one shop, owner, warehouse, controls and recoverable command', async () => {
    const idem = randomUUID();
    const create = (input = shopInput, { schema = 'ShopResponse', ...options } = {}) => post('/shops', input, schema, { status: 201, idem, ...options });
    const [first, replay] = await Promise.all([create(), create()]);
    shopId = first.id;
    assert.equal(first.id, replay.id);
    assert.equal(await db.shop.count({ where: { name: shopInput.name } }), 1);
    assert.equal(await db.warehouse.count({ where: { shopId } }), 1);
    assert.equal(await db.membership.count({ where: { shopId, userId: owner.userId, roles: { has: 'owner' } } }), 1);
    assert.equal(await db.agentRole.count({ where: { shopId } }), 4);
    assert.equal(await db.budgetPolicy.count({ where: { shopId } }), 3);
    assert.equal(await db.auditEntry.count({ where: { shopId, action: 'createShop', resourceId: shopId } }), 1);
    assert.equal(await db.command.count({ where: { shopId, operationId: 'createShop', status: 'succeeded' } }), 1);
    await create({ ...shopInput, name: 'Đổi ý định' }, { status: 409, schema: 'Problem' });
    await post('/shops', { ...shopInput, timezone: 'Fake/Timezone' }, 'Problem', { status: 422 });
    await call('/shops/' + shopId, 'Problem', { actor: foreign, status: 404 });
    await patch('/shops/' + shopId, { name: 'Khác quyền' }, 'Problem', { actor: foreign, status: 404, version: first.version });
    await patch('/shops/' + shopId, { name: 'Thiếu phiên bản' }, 'Problem', { status: 428 });
    const before = await db.shop.findUniqueOrThrow({ where: { id: shopId } });
    const updated = await patch('/shops/' + shopId, { timezone: 'Asia/Vientiane' }, 'ShopResponse', { version: first.version });
    await patch('/shops/' + shopId, { locale: 'en-US' }, 'Problem', { version: first.version, status: 412 });
    assert.equal(updated.version, first.version + 1);
    assert.equal(updated.timezone, 'Asia/Vientiane');
    assert.notEqual((await db.shop.findUniqueOrThrow({ where: { id: shopId } })).policyVersion, before.policyVersion);
});

test('SC2-C07-CONSENT: scope, replay, content, expiry and opt-out check current versions', async t => {
    const customer = await subjectRow('consent');
    const foreignCustomer = await subjectRow('foreign', secondShop);
    await post(shopPath('customers/' + foreignCustomer.id + '/consent-challenges'), { purpose: 'marketing', channel: 'email',
        message: 'Ca đối chiếu hai khách thuộc hai shop', contentVersion: 1 }, 'Problem', { status: 404 });
    const challenge = await createChallenge(customer);
    assert.ok(challenge.fixtureToken);
    assert.equal((await call(shopPath('customer-consents?customerId=' + customer.id), 'CustomerConsentListResponse')).length, 0);
    const challenges = await call(shopPath('customer-consent-challenges?customerId=' + customer.id), 'ConsentChallengeListResponse');
    assert.equal(challenges[0].id, challenge.id);
    assert.equal(challenges[0].fixtureToken, undefined);
    const invalid = (path, body, status, actor = browser) => post('/public/consent/' + path, body, 'Problem', { status, actor });
    await invalid('challenges/exchange', { token: challenge.fixtureToken }, 403, null);
    await invalid('challenges/exchange', { token: challenge.fixtureToken.replace(shopId, secondShop) }, 404);
    const idem = randomUUID();
    const exchanged = await exchange(challenge.fixtureToken, { idem });
    assert.equal(exchanged.challengeSessionId, (await exchange(challenge.fixtureToken, { idem })).challengeSessionId);
    await invalid('challenges/exchange', { token: challenge.fixtureToken }, 409);
    const input = { challengeSessionId: exchanged.challengeSessionId, decision: 'accept', contentVersion: exchanged.contentVersion };
    await invalid('confirmations', { ...input, contentVersion: input.contentVersion + 1 }, 409);
    const confirmKey = randomUUID();
    const accepted = await confirm(input, { idem: confirmKey });
    assert.deepEqual(await confirm(input, { idem: confirmKey }), accepted);
    await invalid('confirmations', input, 409);
    assert.equal(accepted.consentStatus, 'granted');
    assert.equal(await currentMarketingConsent(db, shopId, customer.id, 'email', accepted.consentVersion), true);
    const withdraw = await createChallenge(customer);
    assert.equal(withdraw.action, 'withdraw');
    const outgoing = await exchange(withdraw.fixtureToken);
    const withdrawn = await confirm({ challengeSessionId: outgoing.challengeSessionId, decision: 'accept', contentVersion: outgoing.contentVersion });
    assert.equal(withdrawn.consentStatus, 'withdrawn');
    assert.equal(await currentMarketingConsent(db, shopId, customer.id, 'email', accepted.consentVersion), false);
    const [record] = await call(shopPath('customer-consents?status=withdrawn&customerId=' + customer.id), 'CustomerConsentListResponse');
    assert.deepEqual(record.history.map(event => event.action), ['granted', 'requested', 'withdrawn']);
    const stale = await createChallenge(customer);
    await createChallenge(customer);
    await invalid('challenges/exchange', { token: stale.fixtureToken }, 409);
    const expired = await createChallenge(customer);
    // Advance fixture time without changing the stored claim signed into the URL.
    t.mock.timers.enable({ apis: ['Date'], now: Date.parse(expired.expiresAt) + 1 });
    try {
        await invalid('challenges/exchange', { token: expired.fixtureToken }, 409);
    } finally {
        t.mock.timers.reset();
    }
});

test('SC2-G05: step-up is session bound and single use; export, hold, erasure and retention are scoped', async () => {
    const subject = await subjectRow('erasable');
    const held = await subjectRow('hold');
    const foreignSubject = await subjectRow('should-not-export', secondShop);
    const heldCase = await db.serviceCase.create({ data: { shopId, customerId: held.id, kind: 'question', summary: 'Chứng từ cần lưu' } });
    const conversation = await orderConversation(db, shopId, subject.id);
    const old = new Date(Date.now() - 3 * oneDay);
    const msg = await db.channelMessage.create({ data: { shopId, conversationId: conversation.conversation.id, externalId: randomUUID(),
        text: 'Dữ liệu tổng hợp ' + ns, origin: 'fixture', direction: 'inbound', createdAt: old } });
    const policy = await call(shopPath('privacy/policy'), 'PrivacyPolicyResponse');
    assert.equal(policy.status, 'unconfigured');
    const saved = await patch(shopPath('privacy/policy'), { chatRetentionDays: 2, jurisdictionNote: 'Chính sách tổng hợp chỉ kiểm thử' },
        'PrivacyPolicyResponse', { version: policy.version });
    assert.equal(saved.status, 'active');
    await patch(shopPath('privacy/policy'), { chatRetentionDays: 5 }, 'Problem', { version: policy.version, status: 412 });
    await call(shopPath('privacy/requests'), 'Problem', { actor: foreign, status: 404 });
    await post(shopPath('privacy/requests'), { kind: 'export', customerId: foreignSubject.id, reason: 'Kiểm hai shop' }, 'Problem', { status: 404 });
    const exporting = await requestFor(subject.id, 'export');
    const deletion = await requestFor(subject.id, 'delete');
    const hold = await requestFor(held.id, 'delete');
    await post(shopPath('privacy/requests'), { kind: 'delete', customerId: held.id, reason: 'Kiểm trùng yêu cầu' }, 'Problem', { status: 409 });
    for (let i = 0; i < 5; i++) await post('/auth/step-up', { password: 'Sai mật khẩu' }, 'Problem', { actor: secondSession, status: 403 });
    await post('/auth/step-up', { password }, 'Problem', { actor: secondSession, status: 429 });
    const proof = await stepUp();
    const payload = approval(exporting, proof.reauthToken);
    const path = shopPath('privacy/requests/' + exporting.id + '/approve');
    await post(path, payload, 'Problem', { actor: secondSession, status: 403 });
    await post(path, { ...payload, expectedVersion: exporting.version + 1 }, 'Problem', { status: 412 });
    const idem = randomUUID();
    const accepted = await approve(exporting, payload, { idem });
    assert.equal((await approve(exporting, payload, { idem })).id, accepted.id);
    await post(shopPath('privacy/requests/' + deletion.id + '/approve'), approval(deletion, proof.reauthToken), 'Problem', { status: 403 });
    const exportedJob = (await privacyRow(exporting.id)).jobId;
    await perform(exportedJob, 'approvePrivacyRequest', privacyRequestHandler(auth));
    const job = await call(shopPath('jobs/' + exportedJob), 'JobResponse');
    assert.equal(job.status, 'succeeded');
    assert.ok(job.downloadUrl);
    const response = await fetch(origin + job.downloadUrl, { headers: { cookie: owner.cookie } });
    assert.equal(response.status, 200);
    const document = await response.json();
    assert.equal(document.customer.id, subject.id);
    assert.equal(document.messages[0].id, msg.id);
    assert.equal(JSON.stringify(document).includes(foreignSubject.displayName), false);
    await runPrivacyMaintenance(db, auth);
    assert.ok((await db.channelMessage.findUniqueOrThrow({ where: key(msg.id) })).redactedAt);
    const initial = await stepUp();
    await approve(hold, approval(hold, initial.reauthToken));
    const holdJob = (await privacyRow(hold.id)).jobId;
    await perform(holdJob, 'approvePrivacyRequest', privacyRequestHandler(auth));
    assert.equal((await privacyRow(hold.id)).status, 'legal_hold');
    assert.ok(await db.serviceCase.findUniqueOrThrow({ where: key(heldCase.id) }));
    const latest = await stepUp();
    await approve(deletion, approval(deletion, latest.reauthToken));
    const deleteJob = (await privacyRow(deletion.id)).jobId;
    await perform(deleteJob, 'approvePrivacyRequest', privacyRequestHandler(auth));
    assert.equal((await privacyRow(deletion.id)).status, 'completed');
    const erased = await db.customer.findUniqueOrThrow({ where: key(subject.id) });
    assert.ok(erased.privacyErasedAt);
    assert.equal(erased.email, null);
    assert.equal(erased.notes, null);
    assert.match((await db.customerIdentity.findUniqueOrThrow({ where: key(conversation.identity.id) })).externalId, /^erased:/);
    assert.equal((await db.channelConversation.findUniqueOrThrow({ where: key(conversation.conversation.id) })).status, 'resolved');
    assert.equal((await fetch(origin + job.downloadUrl, { headers: { cookie: owner.cookie } })).status, 404);
    await runPrivacyMaintenance(db, auth);
    assert.equal(await db.fileBlob.count({ where: { shopId, fileId: job.result.id } }), 0);
    const completed = await call(shopPath('privacy/requests?status=completed&q=' + subject.id), 'PrivacyRequestListResponse');
    assert.deepEqual(new Set(completed.map(row => row.id)), new Set([exporting.id, deletion.id]));
});

test('SC2-G07: generated reports freeze the snapshot, enforce source rights and revoke expired links', async () => {
    const until = new Date();
    const report = { reportType: 'profit_loss', format: 'csv', from: new Date(until - oneDay).toISOString(), to: until.toISOString(),
        timezone: 'Asia/Vientiane', snapshotAsOf: until.toISOString() };
    const path = shopPath('exports');
    const idem = randomUUID();
    const queued = await post(path, report, 'JobResponse', { status: 202, idem });
    assert.equal(queued.status, 'queued');
    assert.equal((await post(path, report, 'JobResponse', { status: 202, idem })).id, queued.id);
    await post(path, { ...report, reportType: 'cashflow' }, 'Problem', { status: 409, idem });
    await post(path, { ...report, timezone: 'UTC' }, 'Problem', { status: 422 });
    await post(path, report, 'Problem', { status: 404, actor: foreign });
    const stored = await db.job.findUniqueOrThrow({ where: key(queued.id) });
    const fileId = stored.input.snapshotFileId;
    const frozen = await db.fileBlob.findUniqueOrThrow({ where: { shopId_fileId: { shopId, fileId } } });
    await perform(queued.id, 'createExport', reportExportHandler);
    const done = await call(shopPath('jobs/' + queued.id), 'JobResponse');
    assert.equal(done.status, 'succeeded');
    assert.ok(done.downloadUrl);
    const response = await fetch(origin + done.downloadUrl, { headers: { cookie: owner.cookie } });
    assert.equal(response.status, 200);
    const actual = Buffer.from(await response.arrayBuffer());
    assert.deepEqual(actual, Buffer.from(frozen.bytes));
    assert.match(actual.toString('utf8'), /snapshot_captured_at.*source_view_as_of/);
    const member = { shopId_userId: { shopId, userId: owner.userId } };
    await db.membership.update({ where: member, data: { status: 'revoked', permissionVersion: { increment: 1 } } });
    try { assert.equal((await fetch(origin + done.downloadUrl, { headers: { cookie: owner.cookie } })).status, 404); }
    finally { await db.membership.update({ where: member, data: { status: 'active', permissionVersion: { increment: 1 } } }); }
    await admin.fileObject.update({ where: key(fileId), data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await fetch(origin + done.downloadUrl, { headers: { cookie: owner.cookie } })).status, 404);
    await runPrivacyMaintenance(db, auth);
    assert.equal(await db.fileBlob.count({ where: { shopId, fileId } }), 0);
});
