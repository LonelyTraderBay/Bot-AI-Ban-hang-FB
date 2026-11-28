import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { URLSearchParams } from 'node:url';
import { after, before, test } from 'node:test';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createContractValidator, schemaFromContract } from '../../../apps/api/dist/http/contracts.js';
import { readAuthConfig } from '../../../apps/api/dist/modules/workspace/index.js';
import { acceptInvitations } from '../../../apps/api/dist/modules/workspace/members/invitations.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { recordAudit } from '../../../apps/api/dist/platform/audit/index.js';
import { recordCommand } from '../../../apps/api/dist/platform/commands/index.js';
import { recordAdvertisingEstimate, recordMarketingEvidence } from '../../../apps/api/dist/modules/finance/index.js';
import { recordManualShipmentEvidence } from '../../../apps/api/dist/modules/fulfillment/index.js';
import { recordManualEvidence } from '../../../apps/api/dist/modules/procurement/index.js';
import { fixtureIssuer, fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { orderConversation } from '../orders/fixtures.mjs';
import { reviewedEvidenceFixture } from '../helpers/reviewed-evidence-fixture.mjs';
import { assertFixtureDatabase, fixtureSession, restoreReader } from './session-fixture.mjs';

const { components } = JSON.parse(readFileSync(new URL('../../../../botsales-kit/contracts/openapi.json', import.meta.url)));
const validator = createContractValidator(components.schemas);
const [shopA, shopB] = fixtureShops;
const shopPath = id => '/shops/' + id;
const membersPath = id => shopPath(id) + '/members';
let db, app, base, authConfig, ownerA, ownerB, reader;

before(async () => {
    const connectionString = readDatabaseUrl(process.env);
    assertFixtureDatabase(connectionString);
    authConfig = readAuthConfig(process.env);
    assert.ok(authConfig);
    const database = new Database(connectionString);
    db = database.client;
    [ownerA, ownerB, reader] = await Promise.all(['p0-editor', 'p0-editor-b', 'p0-reader'].map(subject => fixtureSession(db, subject)));
    app = await createApp({ database, auth: authConfig, quiet: true });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl() + '/api/v2';
});

after(async () => {
    if (ownerA && ownerB && reader) {
        await db.session.updateMany({
            where: { id: { in: [ownerA.id, ownerB.id, reader.id] } }, data: { revokedAt: new Date() },
        });
    }
    await app?.close();
});

function request(path, session, options = {}) {
    return fetch(base + path, { ...options, headers: { ...(session ? { cookie: session.cookie } : {}), ...options.headers } });
}

async function json(response, expected, schema) {
    assert.equal(response.status, expected);
    const body = await response.json();
    const validate = validator.compile(schemaFromContract(schema));
    assert.equal(validate(body), true, JSON.stringify(validate.errors));
    assert.equal(body.meta?.requestId ?? body.requestId, response.headers.get('x-request-id'));
    return body;
}

async function sessionFor(actor) {
    return (await json(await request('/session', actor), 200, 'SessionResponse')).data;
}

function revoke(actor, shopId, memberId, headers) {
    return request(membersPath(shopId) + '/' + memberId, actor, { method: 'DELETE', headers });
}

function sendMemberWrite(actor, path, method, body, headers) {
    return request(path, actor, { method, headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
}

const digest = key => createHash('sha256').update(key).digest('hex');
const commandsPath = shopId => shopPath(shopId) + '/commands';
const auditPath = shopId => shopPath(shopId) + '/audit';
const recoverPath = (shopId, kind, key) => commandsPath(shopId) + '?' + new URLSearchParams({ kind, q: digest(key), limit: '1' });

test('P0-06: concurrent R32 writes create one membership, audit entry, command and outbox event', async () => {
    const key = randomUUID();
    const email = 'be06-' + randomUUID() + '@botsales.test';
    const ownerSession = await sessionFor(ownerA);
    const makeInvite = roles => sendMemberWrite(ownerA, membersPath(shopA.id), 'POST', { email, roles }, {
        origin: authConfig.appOrigin, 'x-csrf-token': ownerSession.csrfToken, 'idempotency-key': key,
    });
    const replies = await Promise.all([makeInvite(['viewer', 'sales']), makeInvite(['sales', 'viewer'])]);
    const [receipt, repeat] = await Promise.all(replies.map(response => json(response, 201, 'MembershipResponse')));
    assert.deepEqual(repeat.data, receipt.data);
    const mismatch = await json(await makeInvite(['sales']), 409, 'Problem');
    assert.equal(mismatch.code, 'IDEMPOTENCY_MISMATCH');
    assert.equal(await db.membership.count({ where: { shopId: shopA.id, user: { email } } }), 1);
    const rows = await db.command.findMany({ where: { shopId: shopA.id, actorId: ownerA.userId, idempotencyKey: key } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].intentHash, digest(key));
    const events = await db.outboxEvent.findMany({ where: { shopId: shopA.id, commandId: rows[0].id } });
    assert.equal(events.length, 1);
    assert.equal(events[0].eventType, 'command.updated');
    assert.equal(events[0].publishedAt, null);
    assert.deepEqual(events[0].payload, { resourceType: 'command', resourceId: rows[0].id });

    const path = auditPath(shopA.id) + '?q=' + receipt.data.id;
    const result = await request(path, ownerA);
    assert.equal(result.headers.get('cache-control'), 'no-store');
    const { data } = await json(result, 200, 'AuditEventListResponse');
    assert.equal(data.length, 1);
    assert.deepEqual(data[0].resource, { type: 'membership', id: receipt.data.id });
    assert.equal(data[0].actorId, ownerA.userId);
    assert.equal(data[0].action, 'inviteMember');
    assert.ok(replies.some(response => response.headers.get('x-request-id') === data[0].requestId));
    assert.doesNotMatch(JSON.stringify(data), /@|permissionVersion|metadata|inviteEmailHash/);
    await json(await request(path, reader), 403, 'Problem');
    await json(await request(path, ownerB), 404, 'Problem');
    assert.deepEqual((await json(await request(auditPath(shopB.id) + '?q=' + receipt.data.id, ownerB), 200, 'AuditEventListResponse')).data, []);
});

test('P0-06: a failure before commit rolls back the write, command, audit and outbox', async () => {
    const key = { shopId: shopA.id, actorId: ownerA.userId, operationId: 'revokeMembership', idempotencyKey: randomUUID() };
    const where = { shopId_userId: { shopId: shopA.id, userId: reader.userId } };
    const before = await db.membership.findUniqueOrThrow({ where });
    const requestId = randomUUID();
    let commandId;
    const abort = new Error('fixture failure before commit');
    await assert.rejects(db.$transaction(async tx => {
        await recordCommand(tx, key, [before.id, before.permissionVersion], async () => {
            await tx.membership.update({ where, data: { status: 'revoked', permissionVersion: { increment: 1 } } });
            await recordAudit(tx, {
                shopId: key.shopId, actorId: key.actorId, requestId, action: key.operationId,
                resourceType: 'membership', resourceId: before.id,
            });
            return { type: 'membership', id: before.id };
        });
        const recorded = await tx.command.findUniqueOrThrow({ where: { shopId_actorId_operationId_idempotencyKey: key } });
        commandId = recorded.id;
        assert.equal(await tx.outboxEvent.count({ where: { shopId: key.shopId, commandId } }), 1);
        throw abort;
    }), error => error === abort);
    assert.ok(commandId);
    assert.deepEqual(await db.membership.findUniqueOrThrow({ where }), before);
    assert.equal(await db.command.findUnique({ where: { shopId_actorId_operationId_idempotencyKey: key } }), null);
    assert.equal(await db.auditEntry.count({ where: { shopId: key.shopId, requestId } }), 0);
    assert.equal(await db.outboxEvent.count({ where: { shopId: key.shopId, commandId } }), 0);
});

test('P0-07: lookup rechecks actor, origin permission and shop, and preserves distinct command states', async () => {
    const kinds = 'updateMemberRoles';
    const ownerWhere = { shopId_userId: { shopId: shopA.id, userId: ownerA.userId } };
    const otherWhere = { shopId_userId: { shopId: shopA.id, userId: reader.userId } };
    const statuses = ['accepted', 'running', 'failed', 'unknown'];
    const fixtures = await Promise.all(statuses.map(status => {
        const key = randomUUID();
        return db.command.create({
            data: { shopId: shopA.id, actorId: ownerA.userId, operationId: kinds, idempotencyKey: key,
                intentHash: digest(key), status, requestHash: digest('synthetic-' + status) },
        });
    }));
    const first = fixtures[0];
    const detail = commandsPath(shopA.id) + '/' + first.id;
    for (const command of fixtures) {
        const path = recoverPath(shopA.id, kinds, command.idempotencyKey);
        const { data } = await json(await request(path, ownerA), 200, 'CommandListResponse');
        assert.equal(data.length, 1);
        assert.deepEqual([data[0].id, data[0].status, data[0].result, data[0].problem], [command.id, command.status, null, null]);
        assert.doesNotMatch(JSON.stringify(data), /idempotencyKey|intentHash|requestHash/);
    }
    const get = await request(detail, ownerA);
    assert.equal(get.headers.get('referrer-policy'), 'no-referrer');
    assert.equal((await json(get, 200, 'CommandResponse')).data.id, first.id);
    await json(await request(detail), 401, 'Problem');
    await json(await request(detail, reader), 403, 'Problem');
    await json(await request(detail, ownerB), 404, 'Problem');
    await json(await request(commandsPath(shopA.id) + '?status=invalid', ownerA), 422, 'Problem');
    await json(await request(commandsPath(shopA.id) + '?status=', ownerA), 422, 'Problem');
    const absent = await json(await request(recoverPath(shopA.id, kinds, randomUUID()), ownerA), 200, 'CommandListResponse');
    assert.deepEqual(absent.data, []);
    const list = commandsPath(shopA.id) + '?kind=' + kinds + '&status=unknown&limit=1';
    const { data: [entry], page } = await json(await request(list, ownerA), 200, 'CommandListResponse');
    assert.equal(entry.status, 'unknown');
    // Add a second unknown row so the cursor can be checked against a different filter.
    await db.command.create({
        data: { shopId: shopA.id, actorId: ownerA.userId, operationId: kinds, idempotencyKey: randomUUID(),
            status: 'unknown', requestHash: digest('synthetic-pagination') },
    });
    const { data: [head], page: continued } = await json(await request(list, ownerA), 200, 'CommandListResponse');
    assert.ok(continued.nextCursor);
    const cursor = '&cursor=' + encodeURIComponent(continued.nextCursor);
    const { data: [next] } = await json(await request(list + cursor, ownerA), 200, 'CommandListResponse');
    assert.equal(next.status, 'unknown');
    assert.notEqual(next.id, head.id);
    await json(await request(list.replace('status=unknown', 'status=accepted') + cursor, ownerA), 400, 'Problem');
    assert.equal(page.limit, 1);

    const savedOwner = await db.membership.findUniqueOrThrow({ where: ownerWhere });
    const savedReader = await db.membership.findUniqueOrThrow({ where: otherWhere });
    try {
        await db.membership.update({ where: otherWhere, data: { roles: ['owner'], permissionVersion: { increment: 1 } } });
        await json(await request(detail, reader), 404, 'Problem');
        const path = recoverPath(shopA.id, kinds, first.idempotencyKey);
        assert.deepEqual((await json(await request(path, reader), 200, 'CommandListResponse')).data, []);
        await db.membership.update({ where: ownerWhere, data: { roles: ['sales'], permissionVersion: { increment: 1 } } });
        await json(await request(detail, ownerA), 404, 'Problem');
        assert.deepEqual((await json(await request(path, ownerA), 200, 'CommandListResponse')).data, []);
        await json(await request(auditPath(shopA.id), ownerA), 403, 'Problem');
        await db.membership.update({ where: ownerWhere, data: { status: 'revoked', permissionVersion: { increment: 1 } } });
        await json(await request(path, ownerA), 404, 'Problem');
    } finally {
        for (const [where, saved] of [[ownerWhere, savedOwner], [otherWhere, savedReader]]) {
            await db.membership.update({ where, data: { roles: saved.roles, status: saved.status, permissionVersion: { increment: 1 } } });
        }
    }
});

test('P0-05: shop list and detail reflect the authenticated membership in shop A and B', async () => {
    await json(await request('/shops'), 401, 'Problem');
    await json(await request(shopPath(shopA.id)), 401, 'Problem');
    for (const [actor, expected, other] of [[ownerA, shopA, shopB], [reader, shopA, shopB], [ownerB, shopB, shopA]]) {
        const list = await request('/shops?limit=1&status=active', actor);
        assert.equal(list.headers.get('cache-control'), 'no-store');
        const { data, page } = await json(list, 200, 'ShopListResponse');
        assert.deepEqual(data.map(shop => shop.id), [expected.id]);
        assert.deepEqual(page, { hasMore: false, limit: 1, nextCursor: null });
        const response = await request(shopPath(expected.id), actor);
        const detail = (await json(response, 200, 'ShopResponse')).data;
        assert.equal(detail.defaultWarehouseId, expected.defaultWarehouseId);
        assert.equal(detail.currency, expected.currency);
        assert.equal(response.headers.get('etag'), '"' + detail.version + '"');
        const forbidden = await json(await request(shopPath(other.id), actor), 404, 'Problem');
        const nonexistent = await json(await request('/shops/' + randomUUID(), actor), 404, 'Problem');
        assert.equal(forbidden.code, nonexistent.code);
        assert.equal(forbidden.title, nonexistent.title);
    }
    await json(await request('/shops/not-a-uuid', ownerA), 404, 'Problem');
    await json(await request('/shops/%40', ownerA), 400, 'Problem');
});

test('P0-05: query filters and keyset cursor operate inside the authorized scope', async () => {
    const searches = [['botsales p0 a', [shopA.id]], ['BotSales P0 B', []], ['%', []]];
    for (const [query, expected] of searches) {
        const rows = await json(await request('/shops?q=' + encodeURIComponent(query), reader), 200, 'ShopListResponse');
        assert.deepEqual(rows.data.map(shop => shop.id), expected);
    }
    await json(await request('/shops?limit=101', ownerA), 400, 'Problem');
    await json(await request('/shops?sort=unknown', ownerA), 422, 'Problem');
    await json(await request('/shops?cursor=invalid', ownerA), 400, 'Problem');
    const path = membersPath(shopA.id);
    const filter = '?limit=1&q=p0-&sort=createdAt:asc,id:asc';
    const first = await json(await request(path + filter, ownerA), 200, 'MembershipListResponse');
    assert.equal(first.data.length, 1);
    assert.equal(first.page.hasMore, true);
    const next = await json(await request(path + filter + '&cursor=' + first.page.nextCursor, ownerA), 200, 'MembershipListResponse');
    assert.equal(next.data.length, 1);
    assert.equal(next.page.hasMore, false);
    assert.notEqual(next.data[0].id, first.data[0].id);
    await json(await request(path + '?cursor=' + first.page.nextCursor, ownerA), 400, 'Problem');
    await json(await request(membersPath(shopB.id) + filter + '&cursor=' + first.page.nextCursor, ownerB), 400, 'Problem');
});

test('P0-05: member detail and capabilities use the current actor and the composite shop key', async () => {
    let cursor, mine, target;
    do {
        const query = new URLSearchParams({ status: 'active', limit: '50', ...(cursor ? { cursor } : {}) });
        const { data, page } = await json(await request(membersPath(shopA.id) + '?' + query, ownerA), 200, 'MembershipListResponse');
        mine ??= data.find(row => row.userId === ownerA.userId);
        target ??= data.find(row => row.userId === reader.userId);
        cursor = page.nextCursor;
    } while (cursor && (!mine || !target));
    assert.ok(mine && target);
    assert.deepEqual(mine.allowedActions, []);
    assert.deepEqual(target.allowedActions, ['updateMemberRoles', 'revokeMembership']);
    assert.equal('email' in target, false);
    const detail = await request(membersPath(shopA.id) + '/' + target.id, ownerA);
    assert.deepEqual((await json(detail, 200, 'MembershipResponse')).data, target);
    assert.equal(detail.headers.get('etag'), '"' + target.permissionVersion + '"');
    await json(await request(membersPath(shopA.id), reader), 403, 'Problem');
    await json(await request(membersPath(shopA.id) + '/' + target.id, reader), 403, 'Problem');
    await json(await request(membersPath(shopA.id) + '/' + target.id, ownerB), 404, 'Problem');
    await json(await request(membersPath(shopB.id) + '/' + target.id, ownerB), 404, 'Problem');
});

test('P0-05: revoke validates CSRF and version, commits once, and removes scope from the same session', async () => {
    const ownerSession = await sessionFor(ownerA);
    const viewerSession = await sessionFor(reader);
    const target = viewerSession.memberships[0];
    const mine = ownerSession.memberships[0];
    const version = '"' + target.permissionVersion + '"';
    const key = randomUUID();
    const header = { origin: authConfig.appOrigin, 'x-csrf-token': ownerSession.csrfToken, 'idempotency-key': key, 'if-match': version };
    assert.equal((await request(shopPath(shopA.id), reader)).status, 200);
    await json(await revoke(ownerA, shopA.id, target.id, { ...header, 'x-csrf-token': '' }), 403, 'Problem');
    await json(await revoke(ownerA, shopA.id, target.id, { ...header, 'if-match': '' }), 428, 'Problem');
    await json(await revoke(ownerA, shopA.id, target.id, { ...header, 'if-match': '"0"' }), 412, 'Problem');
    await json(await revoke(reader, shopA.id, target.id, { ...header, 'x-csrf-token': viewerSession.csrfToken }), 403, 'Problem');
    await json(await revoke(ownerA, shopA.id, mine.id, { ...header, 'if-match': '"' + mine.permissionVersion + '"' }), 403, 'Problem');
    await json(await revoke(ownerA, shopB.id, target.id, header), 404, 'Problem');
    try {
        const responses = await Promise.all([revoke(ownerA, shopA.id, target.id, header), revoke(ownerA, shopA.id, target.id, header)]);
        assert.deepEqual(responses.map(response => response.status), [204, 204]);
        await json(await revoke(ownerA, shopA.id, mine.id, header), 409, 'Problem');
        const member = (await json(await request(membersPath(shopA.id) + '/' + target.id, ownerA), 200, 'MembershipResponse')).data;
        assert.equal(member.status, 'revoked');
        assert.equal(member.permissionVersion, target.permissionVersion + 1);
        assert.deepEqual(member.permissions, []);
        assert.deepEqual(member.allowedActions, []);
        assert.deepEqual((await sessionFor(reader)).memberships, []);
        assert.deepEqual((await json(await request('/shops', reader), 200, 'ShopListResponse')).data, []);
        await json(await request(shopPath(shopA.id), reader), 404, 'Problem');
        assert.equal((await request(shopPath(shopB.id), ownerB)).status, 200);

        const record = await db.command.findMany({ where: { shopId: shopA.id, actorId: ownerA.userId, idempotencyKey: key } });
        assert.equal(record.length, 1);
        assert.equal(record[0].status, 'succeeded');
        const audit = await db.auditEntry.findMany({
            where: { requestId: { in: responses.map(response => response.headers.get('x-request-id')) } },
        });
        assert.equal(audit.length, 1);
        assert.deepEqual([audit[0].action, audit[0].resourceId, audit[0].actorId], ['revokeMembership', target.id, ownerA.userId]);
    } finally {
        await restoreReader(db, shopA.id, reader.userId);
    }
});

test('P0-05: simultaneous revocation by two owners leaves one active owner', async () => {
    const readerKey = { shopId: shopA.id, userId: reader.userId };
    const ownerKey = { shopId: shopA.id, userId: ownerA.userId };
    try {
        await db.membership.update({
            where: { shopId_userId: readerKey },
            data: { roles: ['owner'], permissionVersion: { increment: 1 } },
        });
        const [first, second] = await Promise.all([sessionFor(ownerA), sessionFor(reader)]);
        const revokeOther = (actor, csrfToken, target) => revoke(actor, shopA.id, target.id, {
            origin: authConfig.appOrigin, 'x-csrf-token': csrfToken, 'idempotency-key': randomUUID(),
            'if-match': '"' + target.permissionVersion + '"',
        });
        const attempts = await Promise.all([
            revokeOther(ownerA, first.csrfToken, second.memberships[0]),
            revokeOther(reader, second.csrfToken, first.memberships[0]),
        ]);
        assert.deepEqual(attempts.map(response => response.status).sort(), [204, 404]);
        assert.equal(await db.membership.count({ where: { shopId: shopA.id, status: 'active', roles: { has: 'owner' } } }), 1);
        assert.equal(await db.membership.count({ where: { shopId: shopB.id, status: 'active', roles: { has: 'owner' } } }), 1);
    } finally {
        await db.$transaction([
            db.membership.update({
                where: { shopId_userId: ownerKey },
                data: { status: 'active', permissionVersion: { increment: 1 } },
            }),
            db.membership.update({
                where: { shopId_userId: readerKey },
                data: { status: 'active', roles: ['viewer'], permissionVersion: { increment: 1 } },
            }),
        ]);
    }
});

test('P0-05: member role changes re-check scope, protect ownership, version permissions and audit once', async () => {
    const [ownerSession, ownerBSession, readerSession] = await Promise.all([sessionFor(ownerA), sessionFor(ownerB), sessionFor(reader)]);
    const original = readerSession.memberships[0];
    const path = membersPath(shopA.id) + '/' + original.id;
    const key = randomUUID();
    const header = {
        origin: authConfig.appOrigin, 'x-csrf-token': ownerSession.csrfToken, 'idempotency-key': key,
        'if-match': '"' + original.permissionVersion + '"',
    };
    const patch = (actor, body = { roles: ['sales'] }, headers = header, target = path) =>
        sendMemberWrite(actor, target, 'PATCH', body, headers);
    const pendingInvite = { email: 'another-' + randomUUID() + '@botsales.test', roles: ['viewer'] };
    await json(await sendMemberWrite(reader, membersPath(shopA.id), 'POST', pendingInvite, {
        ...header, 'x-csrf-token': readerSession.csrfToken,
    }), 403, 'Problem');
    await json(await sendMemberWrite(ownerB, membersPath(shopA.id), 'POST', pendingInvite, {
        ...header, 'x-csrf-token': ownerBSession.csrfToken,
    }), 404, 'Problem');
    await json(await patch(reader, undefined, { ...header, 'x-csrf-token': readerSession.csrfToken }), 403, 'Problem');
    await json(await patch(ownerB, undefined, { ...header, 'x-csrf-token': ownerBSession.csrfToken }), 404, 'Problem');
    await json(await patch(ownerA, undefined, { ...header, 'x-csrf-token': '' }), 403, 'Problem');
    await json(await patch(ownerA, undefined, { ...header, 'if-match': '' }), 428, 'Problem');
    await json(await patch(ownerA, undefined, { ...header, 'if-match': '"0"' }), 412, 'Problem');
    await json(await patch(ownerA, { roles: [] }), 422, 'Problem');
    await json(await patch(ownerA, { roles: ['viewer', 'viewer'] }), 422, 'Problem');
    await json(await patch(ownerA, { roles: ['owner'] }), 403, 'Problem');
    const ownerMember = ownerSession.memberships[0];
    await json(await patch(ownerA, { roles: ['viewer'] }, { ...header, 'if-match': '"' + ownerMember.permissionVersion + '"' },
        membersPath(shopA.id) + '/' + ownerMember.id), 403, 'Problem');
    assert.equal(await db.command.count({ where: { shopId: shopA.id, idempotencyKey: key } }), 0);

    try {
        const [first, replay] = await Promise.all([patch(ownerA), patch(ownerA)]);
        const [current, repeated] = await Promise.all([json(first, 200, 'MembershipResponse'), json(replay, 200, 'MembershipResponse')]);
        assert.deepEqual(current.data, repeated.data);
        assert.equal(current.data.permissionVersion, original.permissionVersion + 1);
        assert.equal(first.headers.get('etag'), '"' + current.data.permissionVersion + '"');
        await json(await patch(ownerA, { roles: ['viewer'] }), 409, 'Problem');
        const same = await json(await patch(ownerA, undefined, {
            ...header, 'idempotency-key': randomUUID(), 'if-match': first.headers.get('etag'),
        }), 200, 'MembershipResponse');
        assert.deepEqual(same.data, current.data);
        const refreshed = await sessionFor(reader);
        assert.deepEqual(refreshed.memberships[0].roles, ['sales']);
        assert.equal(refreshed.memberships[0].permissionVersion, current.data.permissionVersion);
        assert.ok(refreshed.memberships[0].permissions.includes('orders.write'));
        assert.equal((await request(shopPath(shopB.id), ownerB)).status, 200);
        const audits = await db.auditEntry.findMany({
            where: { requestId: { in: [first.headers.get('x-request-id'), replay.headers.get('x-request-id'), same.meta.requestId] } },
        });
        assert.equal(audits.length, 1);
        assert.deepEqual([audits[0].action, audits[0].resourceId, audits[0].actorId], ['updateMemberRoles', original.id, ownerA.userId]);
        assert.deepEqual(audits[0].metadata, { previousRoles: ['viewer'], roles: ['sales'], permissionVersion: current.data.permissionVersion });
    } finally {
        await db.membership.update({
            where: { shopId_id: { shopId: shopA.id, id: original.id } },
            data: { roles: ['viewer'], permissionVersion: { increment: 1 } },
        });
    }
});

test('SC2-G01: shop country is explicit, independently editable and never inferred', async () => {
    const read = (actor, id) => request(shopPath(id), actor).then(response => json(response, 200, 'ShopResponse')).then(body => body.data);
    const [first, second] = await Promise.all([read(ownerA, shopA.id), read(ownerB, shopB.id)]);
    assert.equal(first.businessCountry, null);
    assert.equal(second.businessCountry, null);
    const { csrfToken } = await sessionFor(ownerA);
    const change = (patch, version, actor = ownerA) => request(shopPath(shopA.id), actor, {
        method: 'PATCH', headers: { 'content-type': 'application/json', origin: authConfig.appOrigin,
            'x-csrf-token': csrfToken, 'idempotency-key': randomUUID(), 'if-match': '"' + version + '"' }, body: JSON.stringify(patch),
    });
    await json(await change({ businessCountry: 'ZZ' }, first.version), 422, 'Problem');
    const { data: updated } = await json(await change({ businessCountry: 'LA' }, first.version), 200, 'ShopResponse');
    assert.equal(updated.businessCountry, 'LA');
    assert.equal(updated.currency, 'VND');
    assert.equal(updated.timezone, 'Asia/Ho_Chi_Minh');
    assert.equal(updated.locale, 'vi-VN');
    assert.notEqual(updated.policyVersion, first.policyVersion);
    assert.equal((await read(ownerB, shopB.id)).businessCountry, null);
    assert.equal((await read(ownerA, shopA.id)).businessCountry, 'LA');
    await json(await change({ businessCountry: 'VN' }, first.version), 412, 'Problem');
    const { data: vietnam } = await json(await change({ businessCountry: 'VN' }, updated.version), 200, 'ShopResponse');
    assert.deepEqual([vietnam.businessCountry, vietnam.currency, vietnam.timezone], ['VN', 'VND', 'Asia/Ho_Chi_Minh']);
    const comparison = await read(ownerB, shopB.id);
    assert.deepEqual([comparison.businessCountry, comparison.currency, comparison.timezone],
        [second.businessCountry, 'LAK', second.timezone]);
    const { data: cleared } = await json(await change({ businessCountry: null }, vietnam.version), 200, 'ShopResponse');
    assert.equal(cleared.businessCountry, null);
    assert.equal((await read(ownerA, shopA.id)).businessCountry, null);
    console.log(JSON.stringify({ status: 'SC2_G01_VN_REFERENCE', country: vietnam.businessCountry,
        currency: vietnam.currency, timezone: vietnam.timezone, otherShopCurrency: comparison.currency }));
});

async function closureFixture(t) {
    const subject = 'closure-' + randomUUID();
    await db.user.create({ data: { oidcIssuer: fixtureIssuer, oidcSubject: subject, email: subject + '@example.test', displayName: 'Chủ cửa hàng' } });
    const owner = await fixtureSession(db, subject);
    t.after(() => db.session.update({ where: { id: owner.id }, data: { revokedAt: new Date() } }));
    const { csrfToken } = await sessionFor(owner);
    const headers = (version, key = randomUUID()) => ({
        origin: authConfig.appOrigin, 'x-csrf-token': csrfToken, 'idempotency-key': key,
        ...(version === undefined ? {} : { 'if-match': '"' + version + '"' }),
    });
    const create = async () => {
        const response = await sendMemberWrite(owner, '/shops', 'POST', {
            name: subject, timezone: 'Asia/Vientiane', locale: 'vi-VN', currency: 'LAK',
        }, headers());
        assert.equal(response.status, 201);
        return (await response.json()).data;
    };
    const shop = await create();
    const path = shopPath(shop.id);
    const change = (action, options = headers(shop.version), actor = owner) =>
        request(path + '/' + action, actor, { method: 'POST', headers: options });
    return { shop, owner, path, headers, change, create };
}

test('P0-05 SHOP-LIFECYCLE: owner closes and reopens once, preserving history and blocking new writes from existing sessions', async t => {
    const { shop, owner, path, headers, change, create } = await closureFixture(t);
    const other = await create();
    const member = await db.membership.create({ data: { shopId: shop.id, userId: reader.userId, roles: ['manager'] } });
    t.after(() => db.membership.update({ where: { shopId_id: { shopId: shop.id, id: member.id } }, data: { status: 'revoked' } }));
    const customer = await db.customer.create({ data: { shopId: shop.id, displayName: 'Khách có lịch sử' } });
    const headerFor = async actor => ({ ...headers(shop.version), 'x-csrf-token': (await sessionFor(actor)).csrfToken });
    await json(await change('close', await headerFor(reader), reader), 403, 'Problem');
    await json(await change('close', await headerFor(ownerB), ownerB), 404, 'Problem');
    await json(await request('/shops/not-a-uuid/close', owner, { method: 'POST', headers: headers(shop.version) }), 404, 'Problem');
    await json(await change('close', { ...headers(shop.version), 'x-csrf-token': '' }), 403, 'Problem');
    await json(await change('close', headers()), 428, 'Problem');
    await json(await change('close', headers(shop.version - 1)), 412, 'Problem');
    await json(await change('close', { ...headers(shop.version), 'idempotency-key': '' }), 400, 'Problem');

    const firstPage = await json(await request('/shops?limit=1', owner), 200, 'ShopListResponse');
    assert.ok(firstPage.page.nextCursor);
    const cursor = encodeURIComponent(firstPage.page.nextCursor);
    await json(await request('/shops?status=active&limit=1&cursor=' + cursor, owner), 200, 'ShopListResponse');
    await json(await request('/shops?status=closed&cursor=' + cursor, owner), 400, 'Problem');
    const patchHeader = headers(shop.version);
    const patch = () => sendMemberWrite(owner, path, 'PATCH', { name: 'Tên đã cập nhật' }, patchHeader);
    const updated = (await json(await patch(), 200, 'ShopResponse')).data;
    const closeHeaders = headers(updated.version);
    const replies = await Promise.all([change('close', closeHeaders), change('close', closeHeaders)]);
    const [closed, repeated] = await Promise.all(replies.map(reply => json(reply, 200, 'ShopResponse').then(body => body.data)));
    assert.equal(replies[0].headers.get('etag'), '"' + closed.version + '"');
    assert.equal(closed.version, updated.version + 1);
    assert.equal(closed.status, 'closed');
    assert.ok(Number.isFinite(Date.parse(closed.closedAt)));
    assert.deepEqual(closed, repeated);
    assert.deepEqual((await json(await request('/shops', owner), 200, 'ShopListResponse')).data.map(s => s.id), [other.id]);
    assert.deepEqual((await json(await request('/shops?status=closed', owner), 200, 'ShopListResponse')).data, [closed]);
    assert.deepEqual((await json(await request(path, reader), 200, 'ShopResponse')).data, closed);
    await json(await request(path, ownerB), 404, 'Problem');
    const lookup = await json(await request(recoverPath(shop.id, 'closeShop', closeHeaders['idempotency-key']), owner), 200, 'CommandListResponse');
    assert.equal(lookup.data[0].result.id, shop.id);
    assert.equal(await db.auditEntry.count({ where: { shopId: shop.id, action: 'closeShop' } }), 1);
    await json(await patch(), 200, 'ShopResponse');
    const blocked = await json(await sendMemberWrite(owner, path, 'PATCH', { name: 'Ghi sau đóng' }, headers(closed.version)), 409, 'Problem');
    assert.equal(blocked.code, 'SHOP_CLOSED');
    assert.equal((await json(await request(shopPath(shopB.id), ownerB), 200, 'ShopResponse')).data.status, 'active');
    await json(await change('reopen', await headerFor(reader), reader), 403, 'Problem');
    await json(await change('reopen', headers(updated.version)), 412, 'Problem');
    const privacy = await json(await sendMemberWrite(owner, path + '/privacy/requests', 'POST', {
        kind: 'export', customerId: customer.id, reason: 'Xuất dữ liệu của khách',
    }, headers()), 201, 'PrivacyRequestResponse');
    assert.equal(privacy.data.customerId, customer.id);
    assert.equal((await revoke(owner, shop.id, member.id, headers(member.permissionVersion))).status, 204);
    await json(await request(path, reader), 404, 'Problem');
    const opened = (await json(await change('reopen', headers(closed.version)), 200, 'ShopResponse')).data;
    assert.deepEqual(opened, { ...updated, status: 'active', closedAt: null, version: closed.version + 1 });
    assert.ok((await json(await request('/shops', owner), 200, 'ShopListResponse')).data.some(row => row.id === shop.id));
    assert.equal(await db.auditEntry.count({ where: { shopId: shop.id, action: 'reopenShop' } }), 1);
});

test('P0-05 SHOP-LIFECYCLE: drafts survive closure but unprocessed work and delivered COD block it by group', async t => {
    const { shop, owner, change } = await closureFixture(t);
    const customer = await db.customer.create({ data: { shopId: shop.id, displayName: 'Khách COD' } });
    const order = await db.salesOrder.create({ data: { shopId: shop.id, customerId: customer.id, warehouseId: shop.defaultWarehouseId,
        paymentMethod: 'cod', currency: shop.currency, total: '15000', notes: '' } });
    const where = { shopId_id: { shopId: shop.id, id: order.id } };
    const job = await db.job.create({ data: { shopId: shop.id, actorId: owner.userId, sourceOperation: 'createExport', kind: 'export', input: {} } });
    await db.salesOrder.update({ where, data: { orderState: 'completed', fulfillmentState: 'delivered' } });
    const problem = await json(await change('close'), 409, 'Problem');
    assert.equal(problem.code, 'SHOP_CLOSE_BLOCKED');
    assert.deepEqual(problem.errors.map(item => item.code).sort(), ['BACKGROUND_WORK', 'RECONCILIATION']);
    assert.ok(problem.errors.every(item => item.path === '/status' && item.message.length > 0));
    assert.equal(await db.auditEntry.count({ where: { shopId: shop.id, action: 'closeShop' } }), 0);
    await db.job.update({ where: { shopId_id: { shopId: shop.id, id: job.id } }, data: { status: 'succeeded' } });
    await db.salesOrder.update({ where, data: { orderState: 'draft', fulfillmentState: 'unfulfilled', paymentMethod: 'prepay' } });
    await json(await change('close'), 200, 'ShopResponse');
    assert.equal((await db.salesOrder.findUniqueOrThrow({ where })).orderState, 'draft');
});

test('P0-05 SHOP-LIFECYCLE: closure sees a worker job committed while the HTTP command waits on the shop lock', async t => {
    const { shop, owner, change } = await closureFixture(t);
    let response;
    await db.$transaction(async tx => {
        const [lock] = await tx.$queryRaw`SELECT pg_backend_pid() AS pid FROM shops WHERE id=${shop.id}::uuid FOR NO KEY UPDATE`;
        response = change('close');
        const deadline = Date.now() + 4000;
        let waiting = false;
        while (!waiting && Date.now() < deadline) {
            const [activity] = await db.$queryRaw`SELECT EXISTS (
                SELECT 1 FROM pg_stat_activity WHERE ${lock.pid}::int = ANY(pg_blocking_pids(pid))
            ) AS waiting`;
            waiting = activity.waiting;
            if (!waiting) await delay(10);
        }
        assert.ok(waiting, 'closure must acquire the same shop lock as the worker');
        await tx.job.create({ data: { shopId: shop.id, actorId: owner.userId, sourceOperation: 'createExport', kind: 'export', input: {} } });
    }, { isolationLevel: 'ReadCommitted', timeout: 10000 });
    const problem = await json(await response, 409, 'Problem');
    assert.deepEqual(problem.errors.map(item => item.code), ['BACKGROUND_WORK']);
    assert.equal((await db.shop.findUniqueOrThrow({ where: { id: shop.id } })).closedAt, null);
});

test('P0-05 SHOP-LIFECYCLE: an HTTP export racing closure either queues its job or reports SHOP_CLOSED', async t => {
    const { shop, owner, path, headers, change } = await closureFixture(t);
    const snapshotAsOf = new Date().toISOString();
    const [close, createExport] = await Promise.all([change('close'), sendMemberWrite(owner, path + '/exports', 'POST', {
        reportType: 'orders', format: 'csv', from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z',
        timezone: shop.timezone, snapshotAsOf,
    }, headers())]);
    const jobs = await db.job.count({ where: { shopId: shop.id, kind: 'export' } });
    if (close.status === 200) {
        assert.equal((await json(await createExport, 409, 'Problem')).code, 'SHOP_CLOSED');
        assert.equal(jobs, 0);
    } else {
        assert.equal((await json(close, 409, 'Problem')).code, 'SHOP_CLOSE_BLOCKED');
        assert.equal(createExport.status, 202);
        assert.equal(jobs, 1);
    }
});

test('P0-05 SHOP-LIFECYCLE: operations report every outstanding blocker, then isolate a refund after physical processing ends', async t => {
    const { shop, owner, change } = await closureFixture(t);
    const shopId = shop.id;
    const warehouseId = shop.defaultWarehouseId;
    const customer = await db.customer.create({ data: { shopId, displayName: 'Kiểm nhóm đang xử lý' } });
    const supplier = await db.supplier.create({ data: { shopId, name: 'Nhà cung cấp', contactLabel: 'Liên hệ', currency: shop.currency,
        leadTimeDays: 2, paymentTerms: 'Theo lần nhận', sendMethod: 'manual' } });
    const order = await db.salesOrder.create({ data: { shopId, warehouseId, customerId: customer.id, orderState: 'confirmed',
        paymentMethod: 'prepay', currency: shop.currency, total: '15000', notes: '' } });
    const purchase = await db.purchaseOrder.create({ data: { shopId, warehouseId, supplierId: supplier.id, supplierVersion: 1,
        currency: shop.currency, total: '10000', intentHash: digest(randomUUID()), status: 'sent', externalReference: 'PO-TEST' } });
    const hold = await db.stockReservation.create({ data: { shopId, orderId: order.id, orderVersion: 1, actorId: owner.userId,
        requestHash: digest(randomUUID()), expiresAt: new Date(Date.now() + 120000) } });
    const shipment = await db.shipment.create({ data: { shopId, orderId: order.id, warehouseId, state: 'returning', handedOverAt: new Date(), lastEventAt: new Date(), currency: shop.currency } });
    const returned = await db.orderReturn.create({ data: { shopId, orderId: order.id, shipmentId: shipment.id, reason: 'Chờ kiểm nhận' } });
    const key = id => ({ shopId_id: { shopId, id } });
    const blockers = async () => (await json(await change('close'), 409, 'Problem')).errors.map(item => item.code).sort();
    assert.deepEqual(await blockers(), ['ORDER_PROCESSING', 'PURCHASE_RECEIVING', 'RECONCILIATION', 'RETURN_PROCESSING', 'SHIPMENT_PROCESSING', 'STOCK_RESERVED']);
    await db.salesOrder.update({ where: key(order.id), data: { orderState: 'completed', fulfillmentState: 'returned' } });
    await db.shipment.update({ where: key(shipment.id), data: { state: 'returned' } });
    await db.orderReturn.update({ where: key(returned.id), data: { state: 'inspected', receivableCredit: '15000', refundObligation: '15000' } });
    await db.stockReservation.update({ where: key(hold.id), data: { status: 'released', settledAt: new Date() } });
    await db.purchaseOrder.update({ where: key(purchase.id), data: { status: 'unknown' } });
    assert.deepEqual(await blockers(), ['EXTERNAL_UNKNOWN', 'RECONCILIATION']);
    await db.purchaseOrder.update({ where: key(purchase.id), data: { status: 'cancelled' } });
    assert.deepEqual(await blockers(), ['RECONCILIATION']);
});

test('P0-05 SHOP-LIFECYCLE: reviewed evidence writers replay prior receipts and reject new attestations after closure', async t => {
    const { shop, owner, change } = await closureFixture(t);
    const { id: shopId, currency, defaultWarehouseId: warehouseId } = shop;
    const reviewerId = owner.userId, key = id => ({ shopId_id: { shopId, id } });
    const customer = await db.customer.create({ data: { shopId, displayName: 'Khách hàng' } });
    const supplier = await db.supplier.create({ data: { shopId, name: 'Nhà cung cấp', contactLabel: 'Liên hệ', currency,
        leadTimeDays: 1, paymentTerms: 'Trả khi nhận', sendMethod: 'manual' } });
    for (const [name, value] of Object.entries({ ADVERTISING_ESTIMATE_SHOPS: shopId, MARKETING_EVIDENCE_SHOPS: shopId,
        SHIPMENT_MANUAL_SHOPS: shopId, PROCUREMENT_MANUAL_SUPPLIERS: shopId + '/' + supplier.id })) {
        const previous = process.env[name];
        process.env[name] = value;
        t.after(() => { if (previous === undefined) delete process.env[name]; else process.env[name] = previous; });
    }
    const day = new Date('2020-01-01T12:00:00Z');
    const order = await db.salesOrder.create({ data: { shopId, warehouseId, customerId: customer.id, orderState: 'completed',
        fulfillmentState: 'returned', paymentMethod: 'cod', currency, total: '15000', notes: '' } });
    const reservation = await db.stockReservation.create({ data: { shopId, orderId: order.id, orderVersion: 1, actorId: reviewerId,
        requestHash: digest(randomUUID()), status: 'released', createdAt: day, settledAt: day, expiresAt: day } });
    await db.salesOrder.update({ where: key(order.id), data: { reservationId: reservation.id } });
    const shipment = await db.shipment.create({ data: { shopId, orderId: order.id, warehouseId, currency, state: 'returned', handedOverAt: day, lastEventAt: day } });
    const purchase = await db.purchaseOrder.create({ data: { shopId, warehouseId, supplierId: supplier.id, supplierVersion: 1,
        currency, total: '10000', intentHash: digest(randomUUID()), status: 'unknown' } });
    const command = await db.command.create({ data: { shopId, actorId: reviewerId, operationId: 'sendPurchaseOrder',
        idempotencyKey: randomUUID(), requestHash: digest(randomUUID()), status: 'succeeded' } });
    await db.purchaseDispatch.create({ data: { shopId, purchaseOrderId: purchase.id, commandId: command.id, manualHandoff: true } });
    const common = { shopId, reviewerId, documentSha256: digest('reviewed document') };
    const date = '2020-01-01', occurredAt = new Date().toISOString();
    const writers = [
        ['advertising-estimate', recordAdvertisingEstimate, db.advertisingEstimate, { date, expectedRevision: 0, amount: { amount: '500', currency } }, { expectedRevision: 1 }],
        ['marketing', recordMarketingEvidence, db.marketingEvidence, { orderId: order.id, date, expectedRevision: 0, confidence: 'known', channel: 'messenger',
            campaignId: 'campaign', sourceId: 'source-1' }, { expectedRevision: 1, sourceId: 'source-2' }],
        ['shipment', recordManualShipmentEvidence, db.shipmentObservation, { orderId: order.id, shipmentId: shipment.id, expectedVersion: shipment.version,
            eventType: 'returned', externalEventId: 'returned-1', occurredAt }, { externalEventId: 'returned-2' }],
        ['procurement', recordManualEvidence, db.procurementEvidence, { purchaseOrderId: purchase.id, supplierId: supplier.id, intentHash: purchase.intentHash,
            expectedVersion: purchase.version, kind: 'supplier_confirmation', externalRef: 'observation-1', occurredAt }, { externalRef: 'observation-2' }],
    ];
    const prepared = [];
    for (const [kind, writer, table, input, revision] of writers) {
        const cli = await reviewedEvidenceFixture(kind, { document: 'reviewed document' });
        t.after(cli.close);
        const original = { ...common, ...input }, hash = await cli.prepare(original);
        const { stdout } = await cli.execute(hash);
        prepared.push({ kind, writer, table, cli, original, hash, revision, id: JSON.parse(stdout).evidenceId });
    }
    await db.purchaseOrder.update({ where: key(purchase.id), data: { status: 'cancelled' } });
    await json(await change('close'), 200, 'ShopResponse');
    const auditCount = () => db.auditEntry.count({ where: { shopId } });
    const audits = await auditCount();
    for (const { kind, writer, table, cli, original, hash, revision, id } of prepared) await t.test(kind, async () => {
        assert.equal(JSON.parse((await cli.execute(hash)).stdout).evidenceId, id);
        await assert.rejects(writer(db, { ...original, reviewerId: ownerB.userId }, hash),
            error => error.getStatus() === 404);
        const next = { ...original, ...revision }, nextHash = await cli.prepare(next);
        await assert.rejects(writer(db, next, nextHash), { problemCode: 'SHOP_CLOSED' });
        await assert.rejects(cli.execute(nextHash), { stderr: /rejected \(409\)/ });
        assert.equal(await table.count({ where: { shopId } }), 1);
        assert.equal(await auditCount(), audits);
    });
});

test('P0-05 SHOP-LIFECYCLE: a closed shop rejects pending marketing opt-ins and lets a customer withdraw earlier consent', async t => {
    const { shop, owner, path, headers, change } = await closureFixture(t);
    const shopId = shop.id;
    const createChallenge = async existing => {
        const customer = await db.customer.create({ data: { shopId, displayName: 'Kiểm đồng ý', email: randomUUID() + '@example.test' } });
        if (existing) await db.customerConsent.create({ data: { shopId, customerId: customer.id, channel: 'email', status: 'granted', policyVersion: shop.policyVersion } });
        const response = await sendMemberWrite(owner, path + '/customers/' + customer.id + '/consent-challenges', 'POST',
            { purpose: 'marketing', channel: 'email', message: 'Xác nhận việc nhận nội dung tiếp thị qua email.', contentVersion: 1 }, headers());
        const challenge = (await json(response, 201, 'ConsentChallengeResponse')).data;
        return { customer, token: challenge.fixtureToken };
    };
    const pending = await createChallenge(false);
    const exchanged = await createChallenge(false);
    const withdrawal = await createChallenge(true);
    const csrf = await request('/auth/csrf');
    const browser = { cookie: csrf.headers.get('set-cookie').split(';')[0] };
    const csrfToken = (await json(csrf, 200, 'CsrfResponse')).data.csrfToken;
    const post = (url, body) => sendMemberWrite(browser, '/public/consent/' + url, 'POST', body, { ...headers(), 'x-csrf-token': csrfToken });
    const exchange = token => post('challenges/exchange', { token });
    const confirm = data => post('confirmations', { challengeSessionId: data.challengeSessionId, contentVersion: 1, decision: 'accept' });
    const ready = (await json(await exchange(exchanged.token), 200, 'PublicConsentChallengeViewResponse')).data;
    await json(await change('close'), 200, 'ShopResponse');
    assert.equal((await json(await exchange(pending.token), 409, 'Problem')).code, 'SHOP_CLOSED');
    assert.equal((await json(await confirm(ready), 409, 'Problem')).code, 'SHOP_CLOSED');
    const revokeConsent = (await json(await exchange(withdrawal.token), 200, 'PublicConsentChallengeViewResponse')).data;
    await json(await confirm(revokeConsent), 200, 'ConsentConfirmationResponse');
    assert.equal((await db.customerConsent.findFirstOrThrow({ where: { shopId, customerId: withdrawal.customer.id } })).status, 'withdrawn');
    assert.equal(await db.customerConsent.count({ where: { shopId, customerId: exchanged.customer.id } }), 0);
});

test('P0-05 SHOP-LIFECYCLE: signing in can still accept another shop invitation while the closed shop invitation stays pending', async t => {
    const { shop, owner, path, headers, change, create } = await closureFixture(t);
    const other = await create();
    const subject = randomUUID();
    const email = subject + '@example.test';
    const identity = { oidcIssuer: fixtureIssuer, oidcSubject: subject, displayName: 'Thành viên mới', email };
    for (const id of [shop.id, other.id]) {
        await json(await sendMemberWrite(owner, membersPath(id), 'POST', { email, roles: ['viewer'] }, headers()), 201, 'MembershipResponse');
    }
    const closed = (await json(await change('close'), 200, 'ShopResponse')).data;
    const signIn = () => db.$transaction(tx => acceptInvitations(tx, identity, randomUUID()), { isolationLevel: 'Serializable' });
    const user = await signIn();
    const viewer = await fixtureSession(db, subject);
    t.after(() => db.session.update({ where: { id: viewer.id }, data: { revokedAt: new Date() } }));
    assert.equal((await request(shopPath(other.id), viewer)).status, 200);
    assert.equal((await request(path, viewer)).status, 404);
    assert.equal(await db.membership.count({ where: { shopId: shop.id, status: 'invited' } }), 1);
    await json(await change('reopen', headers(closed.version)), 200, 'ShopResponse');
    assert.equal((await signIn()).id, user.id);
    assert.equal((await request(path, viewer)).status, 200);
});

test('P0-05 SHOP-LIFECYCLE: a file that expires during an external write still blocks closing until its lease settles', async t => {
    const { shop, owner, change } = await closureFixture(t);
    const file = await db.fileObject.create({ data: { shopId: shop.id, uploaderId: owner.userId, name: 'ảnh.png', mimeType: 'image/png', sizeBytes: 1,
        sha256: digest('a'), purpose: 'product_image', status: 'ready' } });
    const key = { shopId: shop.id, fileId: file.id };
    await db.fileStorage.create({ data: { ...key, targetId: digest('fixture'), leaseUntil: new Date(Date.now() + 60000) } });
    await db.fileObject.update({ where: { shopId_id: { shopId: shop.id, id: file.id } }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const blocked = await json(await change('close'), 409, 'Problem');
    assert.deepEqual(blocked.errors.map(item => item.code), ['BACKGROUND_WORK']);
    await db.fileStorage.update({ where: { shopId_fileId: key }, data: { state: 'purged', leaseUntil: null } });
    await json(await change('close'), 200, 'ShopResponse');
});

test('P0-05 SHOP-LIFECYCLE: resolving a handoff and acknowledging its notification clears the blockers while preserving unknown outcomes', async t => {
    const { shop, owner, path, headers, change } = await closureFixture(t);
    const shopId = shop.id;
    const customer = await db.customer.create({ data: { shopId, displayName: 'Khách được bàn giao' } });
    const { conversation } = await orderConversation(db, shopId, customer.id);
    const message = await db.channelMessage.create({ data: { shopId, conversationId: conversation.id, direction: 'inbound', origin: 'provider',
        senderKind: 'customer', externalId: randomUUID(), text: 'Hỗ trợ từ nhân viên' } });
    const work = await db.workItem.create({ data: { shopId, kind: 'customer_handoff', sourceType: 'conversation', sourceId: conversation.id,
        state: 'working', assigneeUserId: owner.userId } });
    await db.botInboundTask.create({ data: { shopId, messageId: message.id, channelGeneration: 1, conversationGeneration: 1, botGeneration: 1,
        providerRunId: randomUUID(), externalStartedAt: new Date(), finishedAt: new Date(), outcome: 'provider_unknown' } });
    const notice = await db.appNotification.create({ data: { shopId, workItemId: work.id, sourceType: 'work_item', sourceId: work.id,
        recipientUserId: owner.userId, channel: 'telegram', title: 'Chuyển cho nhân viên', safeBody: 'Kiểm tra yêu cầu',
        deliveryStatus: 'unknown', deliveryIntent: digest(randomUUID()) } });
    const former = await db.membership.create({ data: { shopId, userId: reader.userId, roles: ['manager'] } });
    await db.appNotification.create({ data: { shopId, workItemId: work.id, sourceType: 'work_item', sourceId: work.id, recipientUserId: reader.userId,
        channel: 'telegram', title: 'Hỗ trợ khách', safeBody: 'Nhắc công việc', deliveryStatus: 'unknown', deliveryIntent: digest(randomUUID()) } });
    assert.equal((await revoke(owner, shopId, former.id, headers(former.permissionVersion))).status, 204);
    const blocked = async () => (await json(await change('close'), 409, 'Problem')).errors.map(e => e.code);
    assert.ok((await blocked()).includes('BACKGROUND_WORK'));
    const post = (resource, input) => sendMemberWrite(owner, path + '/' + resource, 'POST', input, headers());
    await json(await post('conversations/' + conversation.id + '/resolve', { expectedVersion: conversation.version, reason: 'Đã hỗ trợ khách' }), 202, 'CommandResponse');
    await json(await post('work-items/' + work.id + '/actions', { action: 'complete', expectedVersion: work.version, reason: 'Xác nhận bàn giao đã hoàn tất' }), 200, 'WorkItemResponse');
    assert.deepEqual(await blocked(), ['EXTERNAL_UNKNOWN']);
    await json(await post('notifications/' + notice.id + '/acknowledge', { expectedVersion: notice.version }), 200, 'NotificationResponse');
    await json(await change('close'), 200, 'ShopResponse');
    assert.equal((await db.appNotification.findUniqueOrThrow({ where: { shopId_id: { shopId, id: notice.id } } })).deliveryStatus, 'unknown');
    assert.equal((await db.botInboundTask.findUniqueOrThrow({ where: { shopId_messageId: { shopId, messageId: message.id } } })).outcome, 'provider_unknown');
    assert.equal(await db.auditEntry.count({ where: { shopId, actorId: owner.userId, action: 'acknowledgeNotification', resourceId: notice.id } }), 1);
    assert.equal(await db.auditEntry.count({ where: { shopId, actorId: owner.userId, action: 'updateWorkItem', resourceId: work.id } }), 1);
});

test('P0-05 SHOP-LIFECYCLE: an active device probe blocks closure and a finished inconclusive probe remains available for diagnostics', async t => {
    const { shop, owner, change } = await closureFixture(t);
    const shopId = shop.id;
    const job = await db.job.create({ data: { shopId, actorId: owner.userId, sourceOperation: 'testDevice', kind: 'connection_test', input: {} } });
    assert.deepEqual((await json(await change('close'), 409, 'Problem')).errors.map(e => e.code), ['BACKGROUND_WORK']);
    await db.job.update({ where: { shopId_id: { shopId, id: job.id } }, data: { status: 'awaiting_confirmation', externalStartedAt: new Date() } });
    const notice = await db.appNotification.create({ data: { shopId, sourceType: 'job', sourceId: job.id, recipientUserId: owner.userId,
        channel: 'telegram', title: 'Kiểm tra thiết bị', safeBody: 'Chưa xác minh kết quả', deliveryStatus: 'unknown', deliveryIntent: digest(randomUUID()) } });
    await json(await change('close'), 200, 'ShopResponse');
    assert.equal((await db.appNotification.findUniqueOrThrow({ where: { shopId_id: { shopId, id: notice.id } } })).deliveryStatus, 'unknown');
});
