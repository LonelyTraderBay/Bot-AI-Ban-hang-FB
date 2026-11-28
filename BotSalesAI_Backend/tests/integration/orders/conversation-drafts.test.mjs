import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { createApp } from '../../../apps/api/dist/app.js';
import { fixtureIssuer, fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { readAuthConfig } from '../../../apps/api/dist/modules/workspace/index.js';
import { eraseSubject } from '../../../apps/api/dist/modules/privacy/data.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { assertFixtureDatabase, fixtureSession } from '../workspace/session-fixture.mjs';
import { fixtureWriter, orderConversation } from './fixtures.mjs';

const [shopA, shopB] = fixtureShops;
let app, db, writer, base, config, desktop, phone, teammate, other, conversation;

async function request(actor, path, { method = 'GET', body, version, key = randomUUID() } = {}) {
    const headers = { cookie: actor.cookie, origin: config.appOrigin, 'x-csrf-token': actor.csrf,
        'idempotency-key': key, ...(version !== undefined && { 'if-match': '"' + version + '"' }) };
    if (body !== undefined) headers['content-type'] = 'application/json';
    const response = await fetch(base + path, { method, body: body === undefined ? undefined : JSON.stringify(body), headers });
    return { status: response.status, body: await response.json() };
}

const draftPath = (shop = shopA) => `/shops/${shop.id}/conversations/${conversation.id}/order-draft`;
const listPath = (shop = shopA) => `/shops/${shop.id}/conversation-order-drafts`;

before(async () => {
    const url = process.env.DATABASE_URL;
    assertFixtureDatabase(url);
    config = readAuthConfig(process.env);
    assert.ok(config);
    const database = new Database(url);
    db = database.client;
    writer = fixtureWriter();
    [desktop, phone, teammate, other] = await Promise.all(['p0-editor', 'p0-editor', 'p0-reader', 'p0-editor-b']
        .map(subject => fixtureSession(db, subject)));
    await writer.membership.update({
        where: { shopId_userId: { shopId: shopA.id, userId: teammate.userId } },
        data: { roles: ['sales'], permissionVersion: { increment: 1 } },
    });
    const customer = await writer.customer.create({ data: { shopId: shopA.id, displayName: 'Khách thử đơn đang nhập' } });
    ({ conversation } = await orderConversation(writer, shopA.id, customer.id));
    app = await createApp({ database, auth: config, quiet: true });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl() + '/api/v2';
    for (const person of [desktop, phone, teammate, other]) {
        const result = await request(person, '/session');
        assert.equal(result.status, 200);
        person.csrf = result.body.data.csrfToken;
    }
});

after(async () => {
    if (teammate) await writer.membership.update({
        where: { shopId_userId: { shopId: shopA.id, userId: teammate.userId } },
        data: { roles: ['viewer'], permissionVersion: { increment: 1 } },
    });
    await app?.close();
    await writer?.$disconnect();
});

test('one atomic claim, saved fields follow the conversation, and a stale session cannot overwrite them', async () => {
    const resource = draftPath();
    const desktopTab = randomUUID();
    const phoneTab = randomUUID();
    const teammateTab = randomUUID();
    const acquired = await Promise.all([
        request(desktop, resource + '/access', { method: 'POST', body: { tabId: desktopTab, action: 'open' } }),
        request(teammate, resource + '/access', { method: 'POST', body: { tabId: teammateTab, action: 'open' } }),
    ]);
    assert.deepEqual(acquired.map(item => item.status).sort(), [200, 409]);
    const winner = acquired[0].status === 200 ? desktop : teammate;
    const loser = winner === desktop ? teammate : desktop;
    const winnerTab = winner === desktop ? desktopTab : teammateTab;
    const draft = acquired.find(item => item.status === 200).body.data;
    assert.equal((await db.channelConversation.findUniqueOrThrow({ where: { shopId_id: { shopId: shopA.id, id: conversation.id } } })).assignedUserId, winner.userId);

    const values = { notes: 'Giao sau 17 giờ', lastField: 'notes', lines: [] };
    const input = { method: 'PATCH', version: draft.version, body: { tabId: winnerTab, editEpoch: draft.editEpoch, values } };
    const saved = await request(winner, resource + '/' + draft.id, input);
    assert.equal(saved.status, 200);
    assert.deepEqual(saved.body.data.values, values);
    assert.equal((await request(loser, resource)).body.data.draft.values.notes, values.notes);
    const readerSubject = 'draft-reader-' + randomUUID();
    const reader = await writer.user.create({ data: { oidcIssuer: fixtureIssuer, oidcSubject: readerSubject, displayName: 'Người đọc', email: readerSubject + '@botsales.test' } });
    await writer.membership.create({ data: { shopId: shopA.id, userId: reader.id, roles: ['viewer', 'bot_admin'] } });
    const readerSession = await fixtureSession(db, readerSubject);
    const readOnly = await request(readerSession, resource);
    assert.equal(readOnly.status, 200);
    assert.equal(readOnly.body.data.canOpen, false);
    assert.equal(Object.hasOwn(readOnly.body.data.draft.values, 'notes'), false);
    assert.equal((await request(other, draftPath(shopB))).status, 404);
    assert.equal((await request(other, listPath(shopB))).body.data.length, 0);
    assert.equal((await request(winner, listPath() + '?q=Kh%C3%A1ch%20th%E1%BB%AD')).body.data[0].conversationId, conversation.id);
    assert.equal(await db.salesOrder.count({ where: { shopId: shopA.id, conversationId: conversation.id } }), 0);

    const nextSession = winner === desktop ? phone : await fixtureSession(db, 'p0-reader');
    if (!nextSession.csrf) nextSession.csrf = (await request(nextSession, '/session')).body.data.csrfToken;
    const resume = { method: 'POST', body: { tabId: phoneTab, action: 'resume', draftId: draft.id, editEpoch: draft.editEpoch } };
    const competing = await Promise.all([request(nextSession, resource + '/access', resume),
        request(winner, resource + '/access', { ...resume, body: { ...resume.body, tabId: randomUUID() } })]);
    assert.deepEqual(competing.map(result => result.status).sort(), [200, 409]);
    const initialTransfer = competing[0];
    const transferred = initialTransfer.status === 200 ? initialTransfer : await request(nextSession, resource + '/access', {
        ...resume, body: { ...resume.body, editEpoch: competing[1].body.data.editEpoch },
    });
    assert.equal(transferred.status, 200);
    assert.deepEqual(transferred.body.data.values, values);
    assert.notEqual(transferred.body.data.editEpoch, draft.editEpoch);
    assert.equal((await request(winner, resource + '/' + draft.id, { ...input, version: saved.body.data.version })).status, 409);

    const assign = async userId => {
        const current = await db.channelConversation.findUniqueOrThrow({ where: { shopId_id: { shopId: shopA.id, id: conversation.id } } });
        const result = await request(desktop, `/shops/${shopA.id}/conversations/${conversation.id}/assign`,
            { method: 'POST', version: current.version, body: { expectedVersion: current.version, userId } });
        assert.equal(result.status, 202);
    };
    await assign(loser.userId);
    assert.equal((await request(nextSession, resource + '/' + draft.id, {
        ...input, version: saved.body.data.version, body: { ...input.body, tabId: phoneTab, editEpoch: transferred.body.data.editEpoch },
    })).status, 409);
    await assign(winner.userId);
    assert.equal((await request(nextSession, resource + '/access', {
        method: 'POST', version: saved.body.data.version, body: { action: 'renew', tabId: phoneTab, draftId: draft.id, editEpoch: transferred.body.data.editEpoch },
    })).status, 409);
});

test('estimate is read-only and conversion with a repeated key returns one priced SalesOrder', async () => {
    const prefix = `/shops/${shopA.id}`;
    const customer = await writer.customer.create({ data: { shopId: shopA.id, displayName: 'Khách thử định giá bản nháp' } });
    const fixture = await orderConversation(writer, shopA.id, customer.id);
    const resource = `${prefix}/conversations/${fixture.conversation.id}/order-draft`;
    const tabId = randomUUID();
    const open = await request(desktop, resource + '/access', { method: 'POST', body: { tabId, action: 'open' } });
    assert.equal(open.status, 200);
    const draft = open.body.data;
    const product = await request(desktop, prefix + '/products', {
        method: 'POST', body: { name: 'Hàng thử ' + randomUUID(), description: '', categoryId: null, status: 'active', imageFileIds: [],
            variants: [{ name: 'Thử', sku: randomUUID(), options: {}, active: true, price: { amount: '9007199254740993.000000000000000001', currency: 'VND' } }] },
    });
    assert.equal(product.status, 201);
    const values = { warehouseId: shopA.defaultWarehouseId, paymentMethod: 'cod', notes: 'Giao buổi sáng',
        lines: [{ variantId: product.body.data.variants[0].id, quantity: 2 }] };
    const path = resource + '/' + draft.id;
    const body = { tabId, editEpoch: draft.editEpoch };
    const saved = await request(desktop, path, { method: 'PATCH', version: draft.version, body: { ...body, values } });
    assert.equal(saved.status, 200);
    const version = saved.body.data.version;
    const estimate = await request(desktop, path + '/estimate');
    assert.equal(estimate.status, 200);
    assert.deepEqual(estimate.body.data.items, { amount: '18014398509481986.000000000000000002', currency: 'VND' });
    assert.equal(await db.salesOrder.count({ where: { shopId: shopA.id, conversationId: fixture.conversation.id } }), 0);

    const renewal = await request(desktop, resource + '/access', { method: 'POST', version, body: { ...body, draftId: draft.id, action: 'renew' } });
    assert.equal(renewal.status, 200);
    assert.equal(renewal.body.data.version, version);
    const command = { method: 'POST', version, body, key: randomUUID() };
    const results = await Promise.all([request(desktop, path + '/convert', command), request(desktop, path + '/convert', command)]);
    assert.deepEqual(results.map(response => response.status), [201, 201]);
    const order = results[0].body.data;
    assert.equal(order.id, results[1].body.data.id);
    assert.equal(order.orderState, 'draft');
    assert.equal(order.total.amount, estimate.body.data.items.amount);
    assert.equal(await db.salesOrder.count({ where: { shopId: shopA.id, conversationId: fixture.conversation.id } }), 1);
    assert.equal(await db.stockMovement.count({ where: { shopId: shopA.id, sourceId: order.id } }), 0);
    assert.equal((await request(desktop, resource)).body.data.draft, null);
});

test('closing and reopening a shop revokes editing; discard and privacy erasure clear stored data', async () => {
    const created = await request(other, '/shops', { method: 'POST', body: {
        name: 'Shop kiểm tra bản đang nhập ' + randomUUID(), timezone: 'Asia/Vientiane', locale: 'vi-VN', currency: 'LAK',
    } });
    assert.equal(created.status, 201);
    const shopId = created.body.data.id;
    const prefix = `/shops/${shopId}`;
    const customer = await writer.customer.create({ data: { shopId, displayName: 'Khách dữ liệu tổng hợp' } });
    const { conversation: target } = await orderConversation(writer, shopId, customer.id);
    const path = `${prefix}/conversations/${target.id}/order-draft`;
    const tabId = randomUUID();
    const acquire = (action = 'open', row) => request(other, path + '/access', { method: 'POST',
        body: { action, tabId, ...(row && { draftId: row.id, editEpoch: row.editEpoch }) } });
    const open = await acquire();
    assert.equal(open.status, 200);
    const draft = open.body.data;
    const shop = (await request(other, prefix)).body.data;
    const close = await request(other, prefix + '/close', { method: 'POST', version: shop.version });
    assert.equal(close.status, 200);
    assert.equal((await request(other, path)).body.data.canOpen, false);
    const reopen = await request(other, prefix + '/reopen', { method: 'POST', version: close.body.data.version });
    assert.equal(reopen.status, 200);
    const save = (row, notes) => request(other, `${path}/${row.id}`, { method: 'PATCH', version: row.version, body: { tabId, editEpoch: row.editEpoch, values: { notes } } });
    assert.equal((await save(draft, 'Phiên trước khi đóng')).status, 409);
    const resumed = (await acquire('resume', (await request(other, path)).body.data.draft)).body.data;
    const saved = (await save(resumed, 'Nội dung bỏ')).body.data;
    const discarded = await request(other, `${path}/${saved.id}/discard`,
        { method: 'POST', version: saved.version, body: { tabId, editEpoch: saved.editEpoch } });
    assert.equal(discarded.status, 200);
    assert.equal((await acquire('resume', saved)).status, 409);
    assert.equal((await db.conversationOrderDraft.findUniqueOrThrow({ where: { shopId_id: { shopId, id: saved.id } } })).values, null);

    const fresh = (await acquire()).body.data;
    const sensitive = await save(fresh, 'Nội dung cần xóa');
    assert.equal(sensitive.status, 200);
    await writer.$transaction(tx => eraseSubject(tx, shopId, customer.id, new Date(), { recoveryAuditId: randomUUID() }));
    const erased = await db.conversationOrderDraft.findUniqueOrThrow({ where: { shopId_id: { shopId, id: fresh.id } } });
    assert.equal(erased.values, null);
    assert.equal(erased.editSessionId, null);
    assert.equal((await request(other, path)).status, 404);
});
