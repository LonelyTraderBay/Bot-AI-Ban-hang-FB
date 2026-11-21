import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { URLSearchParams } from 'node:url';
import { after, before, test } from 'node:test';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createContractValidator, schemaFromContract } from '../../../apps/api/dist/http/contracts.js';
import { readAuthConfig } from '../../../apps/api/dist/modules/workspace/index.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { recordAudit } from '../../../apps/api/dist/platform/audit/index.js';
import { recordCommand } from '../../../apps/api/dist/platform/commands/index.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
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
    await json(await makeInvite(['sales']), 409, 'Problem');
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
    const rows = (await json(await request(membersPath(shopA.id), ownerA), 200, 'MembershipListResponse')).data;
    const mine = rows.find(row => row.userId === ownerA.userId);
    const target = rows.find(row => row.userId === reader.userId);
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
