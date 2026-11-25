import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import sharp from 'sharp';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createContractValidator, schemaFromContract } from '../../../apps/api/dist/http/contracts.js';
import { channelTestHandler, readMetaInboundConfig } from '../../../apps/api/dist/modules/channels/index.js';
import { dispatchMessengerMessages } from '../../../apps/api/dist/modules/inbox/index.js';
import { signMessengerFixtureEvent } from '../../../apps/api/dist/modules/inbox/messenger-fixture.js';
import { recordStockMovement } from '../../../apps/api/dist/modules/inventory/index.js';
import { assignedKnowledge, knowledgeIndexHandler, publishedKnowledge } from '../../../apps/api/dist/modules/knowledge/index.js';
import { erasedIdentityKey } from '../../../apps/api/dist/modules/privacy/index.js';
import { readAuthConfig, requireShopAccess } from '../../../apps/api/dist/modules/workspace/index.js';
import { recordCommand } from '../../../apps/api/dist/platform/commands/index.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { runJob } from '../../../apps/api/dist/platform/jobs/index.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { fixtureWriter } from '../orders/fixtures.mjs';
import { assertFixtureDatabase, fixtureSession } from '../workspace/session-fixture.mjs';

const [shopA, shopB] = fixtureShops;
const numericId = () => (BigInt('0x' + randomBytes(8).toString('hex')) + 1n).toString();
const [pageA, pageB, occupiedPage, replyPage, checkoutPage, senderId, retiredSender, errorSender] = Array.from({ length: 8 }, numericId);
const metaSecret = randomUUID();
const metaVerifyToken = randomUUID();
const metaPageToken = randomUUID();
const metaRoute = '/integrations/meta/messenger/webhook';
const { components } = JSON.parse(readFileSync(new URL('../../../../botsales-kit/contracts/openapi.json', import.meta.url)));
const validator = createContractValidator(components.schemas);
const authorize = async (tx, job, permission) => Boolean(await requireShopAccess(tx, job.actorId, job.shopId, permission));
const shopPath = (shop, resource) => '/shops/' + shop.id + '/' + resource;
let app, db, writer, config, meta, base, owner, other, staff, priorRoles;
let received;

before(async () => {
    process.env.MESSENGER_FIXTURE_ADAPTER = '1';
    const connection = readDatabaseUrl(process.env);
    assertFixtureDatabase(connection);
    config = readAuthConfig(process.env);
    assert.ok(config);
    const database = new Database(connection);
    db = database.client;
    writer = fixtureWriter();
    [owner, other, staff] = await Promise.all(['p0-editor', 'p0-editor-b', 'p0-reader'].map(subject => fixtureSession(db, subject)));
    const membership = { shopId_userId: { shopId: shopA.id, userId: staff.userId } };
    priorRoles = (await db.membership.findUniqueOrThrow({ where: membership })).roles;
    await db.membership.update({ where: membership, data: { roles: ['sales'], permissionVersion: { increment: 1 } } });
    meta = readMetaInboundConfig({ META_MESSENGER_APP_SECRET: metaSecret, META_MESSENGER_VERIFY_TOKEN: metaVerifyToken,
        META_MESSENGER_GRAPH_VERSION: 'v27.0', META_MESSENGER_PAGE_TOKENS: JSON.stringify({ [replyPage]: metaPageToken }),
        META_MESSENGER_PAGES: JSON.stringify([{ pageId: pageA, shopId: shopA.id, senderIds: [senderId, retiredSender] },
            { pageId: pageB, shopId: shopB.id, senderIds: [senderId] }, { pageId: occupiedPage, shopId: shopA.id, senderIds: [senderId] },
            { pageId: replyPage, shopId: shopA.id, senderIds: [senderId, errorSender] },
            { pageId: checkoutPage, shopId: shopA.id, senderIds: [senderId, errorSender] }]) });
    app = await createApp({ database, auth: config, meta, quiet: true });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl() + '/api/v2';
    for (const person of [owner, other, staff]) person.csrf = (await data(await request('/session', person), 200, 'SessionResponse')).csrfToken;
});

function metaEvent(pageId, { mid = randomUUID(), text = 'Tin nhắn thử đã được duyệt', timestamp = Date.now(), sender = senderId, ...message } = {}) {
    return { sender: { id: sender }, recipient: { id: pageId }, timestamp, message: { mid, text, ...message } };
}

const metaPayload = (...entry) => JSON.stringify({ object: 'page', entry }, null, 2);
const metaSignature = body => 'sha256=' + createHmac('sha256', metaSecret).update(body).digest('hex');
const metaId = mid => 'meta:' + createHash('sha256').update(mid).digest('hex');
const findMetaChannel = pageId => db.channelConnection.findFirst({ where: { provider: 'messenger', pageId } });
async function deliverMeta(body, expected = 200, signature = metaSignature(body), type = 'application/json') {
    const response = await fetch(base + metaRoute, { method: 'POST', headers: { 'content-type': type, 'x-hub-signature-256': signature }, body });
    assert.equal(response.status, expected);
    if (expected === 200) assert.equal(await response.text(), 'EVENT_RECEIVED');
    else await response.arrayBuffer();
}

test('T069 Meta: challenge and exact signed bytes are required, unapproved events are ignored', async () => {
    const check = token => fetch(base + metaRoute + '?' + new globalThis.URLSearchParams({ 'hub.mode': 'subscribe', 'hub.challenge': '123456', 'hub.verify_token': token }));
    const bad = await check(randomUUID());
    assert.equal(bad.status, 404);
    await bad.arrayBuffer();
    const challenge = await check(metaVerifyToken);
    assert.equal(challenge.status, 200);
    assert.match(challenge.headers.get('content-type'), /^text\/plain/);
    assert.equal(challenge.headers.get('cache-control'), 'no-store');
    assert.equal(await challenge.text(), '123456');
    const signed = metaPayload({ id: pageA, messaging: [metaEvent(pageA)] });
    await deliverMeta(signed + '\n', 404, metaSignature(signed));
    await deliverMeta(signed, 415, metaSignature(signed), 'text/plain');
    await deliverMeta(JSON.stringify({ object: 'user', entry: [] }), 400);
    await deliverMeta(metaPayload({ id: pageA, messaging: [metaEvent(pageA, { sender: numericId() }), metaEvent(pageB),
        metaEvent(pageA, { is_echo: true }), metaEvent(pageA, { text: '', attachments: [{ type: 'image' }] }),
        metaEvent(pageA, { timestamp: Date.now() + 3600000 })] }, { id: numericId(), messaging: [metaEvent(pageA)] }));
    assert.equal(await findMetaChannel(pageA), null);
});

test('T069 Meta: ordered ledger, page and sender isolation, revocation and deletion suppression', async () => {
    const newest = metaEvent(pageA);
    const body = metaPayload({ id: pageA, messaging: [newest] });
    await Promise.all([deliverMeta(body), deliverMeta(body), deliverMeta(body)]);
    const channel = await findMetaChannel(pageA);
    assert.equal(channel.shopId, shopA.id);
    const conversation = await db.channelConversation.findUniqueOrThrow({ where: { shopId_channelId_externalId: {
        shopId: shopA.id, channelId: channel.id, externalId: senderId,
    } } });
    const message = await db.channelMessage.findUniqueOrThrow({ where: { shopId_conversationId_externalId: {
        shopId: shopA.id, conversationId: conversation.id, externalId: metaId(newest.message.mid),
    } } });
    assert.equal(message.origin, 'provider');
    assert.equal(conversation.unreadCount, 1);
    assert.equal(conversation.lastInboundAt.getTime(), newest.timestamp);
    assert.equal(await db.channelEvent.count({ where: { shopId: shopA.id, channelId: channel.id } }), 1);
    assert.equal(await db.outboxEvent.count({ where: { shopId: shopA.id, eventType: 'message.created', payload: { path: ['resourceId'], equals: message.id } } }), 1);
    assert.equal(await db.botInboundTask.count({ where: { shopId: shopA.id, messageId: message.id } }), 0);
    await deliverMeta(metaPayload({ id: pageA, messaging: [{ ...newest, message: { ...newest.message, text: 'Nội dung khác' } }] }), 409);
    const otherPage = metaEvent(pageB, { mid: newest.message.mid });
    const earlier = metaEvent(pageA, { timestamp: newest.timestamp - 1000 });
    await deliverMeta(metaPayload({ id: pageA, messaging: [earlier] }, { id: pageB, messaging: [otherPage] }));
    assert.equal((await findMetaChannel(pageB)).shopId, shopB.id);
    assert.equal(await db.channelMessage.count({ where: { shopId: shopB.id, externalId: message.externalId } }), 1);
    assert.equal((await db.channelConversation.findUniqueOrThrow({ where: { shopId_id: { shopId: shopA.id, id: conversation.id } } })).lastInboundAt.getTime(), newest.timestamp);
    await get('conversations/' + conversation.id, 'Problem', { shop: shopB, actor: other, expected: 404 });
    const partner = await get('integrations/channels/' + channel.id, 'ChannelResponse');
    assert.deepEqual(partner.capabilities, ['receive_messages']);
    const visible = await get('conversations/' + conversation.id, 'ConversationResponse');
    assert.equal(visible.sendEligibility.state, 'blocked');

    const retired = await db.customer.create({ data: { shopId: shopA.id, displayName: 'Liên hệ thử đã xóa' } });
    await db.customerIdentity.create({ data: { shopId: shopA.id, customerId: retired.id, channel: 'messenger', pageId: pageA,
        externalId: erasedIdentityKey(shopA.id, 'messenger', pageA, retiredSender) } });
    await writer.channelConnection.create({ data: { shopId: shopB.id, provider: 'messenger', pageId: occupiedPage } });
    const ignored = metaEvent(pageA, { sender: retiredSender });
    await deliverMeta(metaPayload({ id: pageA, messaging: [ignored] }, { id: occupiedPage, messaging: [metaEvent(occupiedPage)] }));
    assert.equal(await db.channelEvent.count({ where: { shopId: shopA.id, channelId: channel.id, externalId: metaId(ignored.message.mid) } }), 0);
    assert.equal(await db.channelConnection.count({ where: { shopId: shopA.id, provider: 'messenger', pageId: occupiedPage } }), 0);

    const check = await send('integrations/channels/' + channel.id + '/check', undefined, 'JobResponse', { expected: 202 });
    await runJob(db, { shopId: shopA.id, id: check.id, sourceOperation: 'checkChannelHealth' }, channelTestHandler(config), authorize);
    assert.equal((await get('jobs/' + check.id, 'JobResponse')).status, 'succeeded');
    await send('integrations/channels/' + channel.id + '/disconnect', { expectedVersion: partner.version, reason: 'Dừng nhận tin thử' }, 'CommandResponse', { expected: 202 });
    await deliverMeta(metaPayload({ id: pageA, messaging: [metaEvent(pageA)] }));
    assert.equal((await findMetaChannel(pageA)).status, 'disabled');
    assert.equal(await db.channelEvent.count({ where: { shopId: shopA.id, channelId: channel.id } }), 2);
});

test('T072: a signed Messenger quote confirmation releases one preparation task after stock is available', async () => {
    const { id: shopId, defaultWarehouseId: warehouseId, currency } = shopA;
    const receive = (...messaging) => deliverMeta(metaPayload({ id: checkoutPage, messaging }));
    await receive(metaEvent(checkoutPage));
    const channel = await findMetaChannel(checkoutPage);
    const conversation = await conversationFor(channel, senderId);
    const address = await send('customers/' + conversation.customerId + '/addresses', {
        label: 'Địa chỉ thử', recipient: 'Khách tổng hợp', phone: '0900000111', line1: 'Địa chỉ thử T072',
        ward: null, district: null, province: 'Hà Nội', postalCode: null, countryCode: 'VN',
    }, 'CustomerAddressResponse', { expected: 201 });
    const sku = 'T072-' + randomUUID();
    const { variants: [variant] } = await send('products', {
        name: sku, description: '', categoryId: null, status: 'active', imageFileIds: [],
        variants: [{ sku, name: 'Biến thể thử', active: true, options: {}, price: { amount: '12000', currency } }],
    }, 'ProductResponse', { expected: 201 });
    const draft = await send('orders', {
        customerId: conversation.customerId, conversationId: conversation.id, warehouseId, shippingAddressId: address.id,
        paymentMethod: 'cod', notes: '', lines: [{ variantId: variant.id, quantity: 1 }],
    }, 'OrderResponse', { expected: 201 });
    const path = 'orders/' + draft.id;
    const quote = await send(path + '/quote', undefined, 'OrderQuoteResponse');
    const marker = '[CONFIRM:' + quote.id + ':' + quote.quoteHash + ']';
    const evidencePath = path + '/customer-confirmations';
    const findMessage = incoming => db.channelMessage.findUniqueOrThrow({ where: { shopId_conversationId_externalId: {
        shopId, conversationId: conversation.id, externalId: metaId(incoming.message.mid),
    } } });
    const evidenceFor = message => ({ quoteId: quote.id, quoteHash: quote.quoteHash, quoteVersion: quote.orderVersion,
        customerIdentityId: conversation.customerIdentityId, sourceMessageId: message.id });
    const unrelated = metaEvent(checkoutPage, { text: 'Khách đã đồng ý theo tóm tắt ' + marker });
    const foreign = metaEvent(checkoutPage, { sender: errorSender, text: marker });
    await receive(unrelated, foreign);
    const foreignConversation = await conversationFor(channel, errorSender);
    const foreignMessage = await db.channelMessage.findUniqueOrThrow({ where: { shopId_conversationId_externalId: {
        shopId, conversationId: foreignConversation.id, externalId: metaId(foreign.message.mid),
    } } });
    await send(evidencePath, evidenceFor(await findMessage(unrelated)), 'Problem', { expected: 422 });
    await send(evidencePath, evidenceFor(foreignMessage), 'Problem', { expected: 422 });
    await send(evidencePath, evidenceFor(foreignMessage), 'Problem', { shop: shopB, actor: other, expected: 404 });
    assert.equal(await db.orderCustomerConfirmation.count({ where: { shopId, quoteId: quote.id } }), 0);

    const inbound = metaEvent(checkoutPage, { text: marker });
    await receive(inbound);
    await receive(inbound);
    const source = await findMessage(inbound);
    assert.equal(source.origin, 'provider');
    assert.equal(await db.channelEvent.count({ where: { shopId, channelId: channel.id, externalId: source.externalId } }), 1);
    assert.equal(await db.outboxEvent.count({ where: { shopId, eventType: 'message.created', payload: { path: ['resourceId'], equals: source.id } } }), 1);
    const proofInput = evidenceFor(source);
    const proof = await send(evidencePath, proofInput, 'CustomerConfirmationResponse');
    assert.equal((await send(evidencePath, proofInput, 'CustomerConfirmationResponse')).id, proof.id);
    assert.equal(await db.orderCustomerConfirmation.count({ where: { shopId, quoteId: quote.id } }), 1);

    const body = { expectedVersion: draft.version, quoteId: quote.id, customerConfirmationId: proof.id };
    const tasks = () => db.workItem.findMany({ where: { shopId, sourceType: 'order', sourceId: draft.id, kind: 'prepare_order' } });
    const pages = new Map(meta.pages).set(checkoutPage, { shopId, senderIds: new Set([errorSender]) });
    const restrictedApp = await createApp({ database: new Database(readDatabaseUrl(process.env)),
        auth: config, meta: { ...meta, pages }, quiet: true });
    const initialBase = base;
    try {
        await restrictedApp.listen(0, '127.0.0.1');
        base = await restrictedApp.getUrl() + '/api/v2';
        await send(path + '/confirm', body, 'Problem', { expected: 422 });
    } finally {
        base = initialBase;
        await restrictedApp.close();
    }
    await send(path + '/confirm', body, 'Problem', { expected: 409 });
    assert.equal((await get(path, 'OrderResponse')).orderState, 'draft');
    assert.equal((await tasks()).length, 0);
    assert.equal(await db.stockReservation.count({ where: { shopId, orderId: draft.id } }), 0);
    assert.equal(await db.auditEntry.count({ where: { shopId, resourceId: draft.id, action: 'confirmOrder' } }), 0);

    await db.$transaction(tx => recordStockMovement(tx, { shopId, warehouseId, variantId: variant.id, actorId: owner.userId,
        kind: 'receipt', source: { type: 'fixture_receipt', id: randomUUID() }, reason: 'Nhập hàng kiểm T072',
        delta: { onHand: 1 }, receivedValue: '10000' }));
    const key = randomUUID();
    const confirm = () => send(path + '/confirm', body, 'CommandResponse', { expected: 202, key });
    const confirmed = await confirm();
    assert.equal((await confirm()).id, confirmed.id);
    const current = await get(path, 'OrderResponse');
    const work = await tasks();
    assert.deepEqual(work.map(item => item.id), [current.prepTaskId]);
    assert.equal(await db.stockReservation.count({ where: { shopId, orderId: draft.id } }), 1);
    assert.equal(await db.auditEntry.count({ where: { shopId, resourceId: draft.id, action: 'confirmOrder' } }), 1);
    assert.equal(await db.outboxEvent.count({ where: { shopId, commandId: confirmed.id } }), 1);

    const notice = await db.appNotification.findFirstOrThrow({ where: { shopId, workItemId: work[0].id, recipientUserId: owner.userId } });
    const ack = await send('notifications/' + notice.id + '/acknowledge', { expectedVersion: notice.version }, 'NotificationResponse');
    assert.ok(ack.acknowledgedAt);
    assert.equal((await tasks())[0].state, 'queued');
    await send(path + '/cancel', { expectedVersion: current.version, reason: 'Dừng đơn thử T072' }, 'CommandResponse', { expected: 202 });
    assert.equal((await tasks())[0].state, 'cancelled');
});

test('T069 Meta: text replies honor scope, handoff and the window at queue and dispatch', async () => {
    const inbound = () => deliverMeta(metaPayload({ id: replyPage, messaging: [metaEvent(replyPage)] }));
    await inbound();
    const channel = await findMetaChannel(replyPage);
    const conversation = await conversationFor(channel, senderId);
    const path = 'conversations/' + conversation.id;
    const where = { shopId_id: { shopId: shopA.id, id: conversation.id } };
    const detail = () => get(path, 'ConversationResponse');
    const action = async name => send(path + '/' + name, { expectedVersion: (await detail()).version, reason: 'Đổi chế độ trả lời thử' },
        'CommandResponse', { expected: 202 });
    const queue = async (text, actor = owner) => send(path + '/messages', { text, clientMessageId: randomUUID(),
        expectedConversationVersion: (await detail()).version }, 'CommandResponse', { expected: 202, actor });
    const command = id => get('commands/' + id, 'CommandResponse');
    const blockedFetch = () => {
        assert.fail('Ineligible message contacted Graph');
    };
    const channelView = await get('integrations/channels/' + channel.id, 'ChannelResponse');
    assert.deepEqual(channelView.capabilities, ['send_text', 'receive_messages']);
    assert.equal(channelView.mediaPolicy, null);
    assert.equal((await detail()).sendEligibility.reasonCode, 'HANDOFF_REQUIRED');
    await action('takeover');
    assert.equal((await detail()).sendEligibility.state, 'allowed');
    const payload = { text: 'Phản hồi thử nghiệm', clientMessageId: randomUUID(), expectedConversationVersion: (await detail()).version };
    await send(path + '/messages', payload, 'Problem', { shop: shopB, actor: other, expected: 404 });
    await send(path + '/messages', { ...payload, fileIds: [randomUUID()] }, 'Problem', { expected: 422 });
    const key = randomUUID();
    const queued = await send(path + '/messages', payload, 'CommandResponse', { key, expected: 202 });
    assert.equal((await send(path + '/messages', payload, 'CommandResponse', { key, expected: 202 })).id, queued.id);
    let calls = 0;
    const accepted = async (url, init) => {
        calls += 1;
        assert.equal(url, 'https://graph.facebook.com/v27.0/' + replyPage + '/messages');
        assert.equal(init.method, 'POST');
        assert.equal(init.redirect, 'error');
        assert.ok(init.signal);
        assert.equal(init.headers.authorization, 'Bearer ' + metaPageToken);
        assert.deepEqual(JSON.parse(init.body), { messaging_type: 'RESPONSE', recipient: { id: senderId }, message: { text: payload.text } });
        return new globalThis.Response(JSON.stringify({ recipient_id: senderId, message_id: 'test-mid-confirmed' }));
    };
    await Promise.all([dispatchMessengerMessages(db, config, meta, accepted), dispatchMessengerMessages(db, config, meta, accepted)]);
    assert.equal(calls, 1);
    const sent = await command(queued.id);
    assert.equal(sent.status, 'succeeded');
    assert.equal((await send(path + '/messages', payload, 'CommandResponse', { key, expected: 202 })).status, 'succeeded');
    const stored = await db.channelMessage.findUniqueOrThrow({ where: { shopId_id: { shopId: shopA.id, id: sent.result.id } } });
    assert.equal(stored.origin, 'provider');
    assert.equal(stored.status, 'sent');
    assert.match(stored.externalId, /^meta-out:[a-f0-9]{64}$/);
    assert.equal(await db.auditEntry.count({ where: { shopId: shopA.id, resourceId: stored.id, action: 'messenger.dispatch' } }), 1);
    assert.equal(await db.outboxEvent.count({ where: { shopId: shopA.id, eventType: 'message.created',
        payload: { path: ['resourceId'], equals: stored.id } } }), 2);

    const priorGeneration = await queue('Phản hồi chờ trước khi giao lại');
    await action('release');
    await dispatchMessengerMessages(db, config, meta, blockedFetch);
    assert.equal((await command(priorGeneration.id)).status, 'failed');
    assert.deepEqual(await command(queued.id), sent);
    const retained = (await get(path + '/messages', 'MessageListResponse')).find(message => message.id === stored.id);
    assert.equal(retained.status, 'sent');
    assert.equal(calls, 1);
    console.log(JSON.stringify({ status: 'SC2_H02_PROVIDER_BOUNDARY', pendingGeneration: 'failed',
        acceptedStillSent: true, acceptedProviderCalls: calls }));
    await action('takeover');
    const expired = await queue('Phản hồi đã quá cửa sổ khi worker chạy');
    await writer.channelConversation.update({ where, data: { lastInboundAt: new Date(Date.now() - 25 * 3600000) } });
    assert.equal((await detail()).sendEligibility.reasonCode, 'SEND_WINDOW_CLOSED');
    await dispatchMessengerMessages(db, config, meta, blockedFetch);
    assert.equal((await command(expired.id)).status, 'failed');
    await inbound();
    const revokedSender = await queue('Tài khoản thử vừa bị gỡ');
    const pages = new Map(meta.pages);
    pages.set(replyPage, { ...pages.get(replyPage), senderIds: new Set([retiredSender]) });
    await dispatchMessengerMessages(db, config, { ...meta, pages }, blockedFetch);
    assert.equal((await command(revokedSender.id)).status, 'failed');
    await send(path + '/assign', { expectedVersion: (await detail()).version, userId: staff.userId }, 'CommandResponse', { expected: 202 });
    const member = await queue('Quyền nhân viên vừa bị thu hồi', staff);
    const staffKey = { shopId_userId: { shopId: shopA.id, userId: staff.userId } };
    await db.membership.update({ where: staffKey, data: { roles: ['warehouse'], permissionVersion: { increment: 1 } } });
    try {
        await dispatchMessengerMessages(db, config, meta, blockedFetch);
        await get('commands/' + member.id, 'Problem', { actor: staff, expected: 404 });
    } finally {
        await db.membership.update({ where: staffKey, data: { roles: ['sales'], permissionVersion: { increment: 1 } } });
    }
    assert.equal((await get('commands/' + member.id, 'CommandResponse', { actor: staff })).status, 'failed');
});

test('T069 Meta: explicit rejections and uncertain outcomes are recorded without repeating the send', async () => {
    await deliverMeta(metaPayload({ id: replyPage, messaging: [metaEvent(replyPage, { sender: errorSender })] }));
    const channel = await findMetaChannel(replyPage);
    const conversation = await conversationFor(channel, errorSender);
    const path = 'conversations/' + conversation.id;
    await send(path + '/takeover', { expectedVersion: conversation.version, reason: 'Tiếp quản ca mất phản hồi' }, 'CommandResponse', { expected: 202 });
    const queue = async () => send(path + '/messages', { text: 'Một lần thử được ghi nhận', clientMessageId: randomUUID(),
        expectedConversationVersion: (await get(path, 'ConversationResponse')).version }, 'CommandResponse', { expected: 202 });
    const check = async (id, status, reason) => {
        assert.equal((await get('commands/' + id, 'CommandResponse')).status, status);
        const row = await db.messageDispatch.findUniqueOrThrow({ where: { shopId_commandId: { shopId: shopA.id, commandId: id } }, include: { message: true } });
        assert.ok(row.startedAt && row.finishedAt);
        assert.equal(row.message.status, status);
        const entries = await db.auditEntry.findMany({ where: { shopId: shopA.id, resourceId: row.messageId, action: 'messenger.dispatch' } });
        assert.equal(entries.length, 1);
        assert.deepEqual(entries[0].metadata, { commandId: id, status, reason });
    };
    for (const [statusCode, errorCode, delivery, reason] of [
        [429, 613, 'failed', 'rate_limited'],
        [500, 2, 'unknown', 'outcome_unconfirmed'], [undefined, undefined, 'unknown', 'outcome_unconfirmed'],
    ]) {
        const item = await queue();
        let calls = 0;
        const request = async () => {
            calls += 1;
            if (!statusCode) throw new Error('Connection closed after receiving the request');
            return new globalThis.Response(JSON.stringify({ error: { code: errorCode, message: 'Raw provider data' } }), { status: statusCode });
        };
        await dispatchMessengerMessages(db, config, meta, request);
        await dispatchMessengerMessages(db, config, meta, request);
        assert.equal(calls, 1);
        await check(item.id, delivery, reason);
    }

    const interrupted = await queue();
    const interruptedClient = {
        messageDispatch: db.messageDispatch,
        $transaction: (action, options) => db.$transaction(async tx => {
            await action(tx);
            throw new Error('Worker terminated before final commit');
        }, options),
    };
    let calls = 0;
    const accepted = async () => {
        calls += 1;
        return new globalThis.Response(JSON.stringify({ recipient_id: errorSender, message_id: 'test-mid-interrupted' }));
    };
    await assert.rejects(() => dispatchMessengerMessages(interruptedClient, config, meta, accepted), /before final commit/);
    const key = { shopId_commandId: { shopId: shopA.id, commandId: interrupted.id } };
    const pending = await db.messageDispatch.findUniqueOrThrow({ where: key });
    assert.ok(pending.startedAt);
    assert.equal(pending.finishedAt, null);
    await dispatchMessengerMessages(db, config, meta, accepted);
    assert.equal(calls, 1);
    await db.messageDispatch.update({ where: key, data: { startedAt: new Date(Date.now() - 61_000) } });
    await dispatchMessengerMessages(db, config, meta, accepted);
    await check(interrupted.id, 'unknown', 'attempt_interrupted');
    assert.equal(calls, 1);

    const rejected = await queue();
    const pendingAfterRejection = await queue();
    const rejectToken = async () => {
        calls += 1;
        return new globalThis.Response(JSON.stringify({ error: { code: 190, message: 'Synthetic authorization rejection' } }), { status: 400 });
    };
    await dispatchMessengerMessages(db, config, meta, rejectToken);
    await check(rejected.id, 'failed', 'token_rejected');
    const expired = await findMetaChannel(replyPage);
    const blocked = await get(path, 'ConversationResponse');
    console.log(JSON.stringify({ status: 'SC049_TOKEN_REJECTION_OBSERVED', channel: expired.status,
        generationChanged: expired.generation === channel.generation + 1, canSend: blocked.sendEligibility.state === 'allowed' }));
    assert.equal(expired.status, 'expired');
    assert.equal(expired.generation, channel.generation + 1);
    assert.equal(expired.version, channel.version + 1);
    assert.equal(blocked.sendEligibility.reasonCode, 'CHANNEL_NOT_READY');
    await dispatchMessengerMessages(db, config, meta, rejectToken);
    await check(pendingAfterRejection.id, 'failed', 'send_ineligible');
    assert.equal(calls, 2, 'A queued send after the rejection must not contact the provider');
    await send(path + '/messages', { text: 'Tin thử sau khi hết quyền', clientMessageId: randomUUID(),
        expectedConversationVersion: blocked.version }, 'Problem', { expected: 409 });
    const health = await send('integrations/channels/' + channel.id + '/check', undefined, 'JobResponse', { expected: 202 });
    await runJob(db, { shopId: shopA.id, id: health.id, sourceOperation: 'checkChannelHealth' }, channelTestHandler(config), authorize);
    assert.equal((await get('jobs/' + health.id, 'JobResponse')).status, 'failed');
    const view = await get('integrations/channels/' + channel.id, 'ChannelResponse');
    assert.deepEqual([view.status, view.capabilities], ['expired', []]);
    await deliverMeta(metaPayload({ id: replyPage, messaging: [metaEvent(replyPage, { sender: errorSender })] }));
    assert.equal((await findMetaChannel(replyPage)).status, 'expired');
    console.log(JSON.stringify({ status: 'SC049_EXPIRED_GENERATION_BLOCKED', providerCallsForExpiredPair: 1,
        oldCommand: 'failed', newSend: 409, health: 'failed', staysExpiredAfterInbound: true }));
});

after(async () => {
    if (priorRoles) await db.membership.update({ where: { shopId_userId: { shopId: shopA.id, userId: staff.userId } },
        data: { roles: priorRoles, permissionVersion: { increment: 1 } } });
    const ids = [owner, other, staff].filter(Boolean).map(person => person.id);
    if (ids.length) await db.session.updateMany({ where: { id: { in: ids } }, data: { revokedAt: new Date() } });
    await writer?.$disconnect();
    await app?.close();
});

function request(route, actor = owner, params = {}) {
    return fetch(base + route, { ...params, headers: { cookie: actor.cookie, ...params.headers } });
}

async function data(response, expected, schema) {
    assert.equal(response.status, expected, response.headers.get('x-request-id'));
    const body = await response.json();
    const check = validator.compile(schemaFromContract(schema));
    assert.equal(check(body), true, JSON.stringify(check.errors));
    assert.equal(body.meta?.requestId ?? body.requestId, response.headers.get('x-request-id'));
    return schema === 'Problem' ? body : body.data;
}

const get = (res, schema, { shop = shopA, actor = owner, expected = 200 } = {}) =>
    request(shopPath(shop, res), actor).then(response => data(response, expected, schema));
function send(resource, payload, schema, { shop = shopA, actor = owner, expected = 200, key = randomUUID(), method = 'POST', version } = {}) {
    const multipart = payload instanceof globalThis.FormData;
    return request(shopPath(shop, resource), actor, { method, body: multipart ? payload : JSON.stringify(payload),
        headers: { origin: config.appOrigin, 'x-csrf-token': actor.csrf, 'idempotency-key': key,
            ...(multipart ? {} : { 'content-type': 'application/json' }), ...(version === undefined ? {} : { 'If-Match': '"' + version + '"' }) },
    }).then(response => data(response, expected, schema));
}

async function connect(shop, actor, channelId) {
    const body = { channelKind: 'facebook_messenger', returnPath: '/s/' + shop.id + '/integrations/channels' };
    const route = channelId ? 'integrations/channels/' + channelId + '/reconnect' : 'integrations/channels/connect';
    const key = randomUUID();
    const start = await send(route, body, 'ConnectStartResponse', { shop, actor, key });
    assert.equal((await send(route, body, 'ConnectStartResponse', { shop, actor, key })).authorizationUrl, start.authorizationUrl);
    const next = new URL(start.authorizationUrl);
    assert.equal(next.origin, config.appOrigin);
    const callback = next.pathname.slice('/api/v2'.length) + next.search;
    const result = await request(callback, actor, { redirect: 'manual' });
    assert.equal(result.status, 302);
    assert.equal(result.headers.get('location'), body.returnPath);
    assert.equal((await request(callback, actor, { redirect: 'manual' })).status, 409);
    return db.channelConnection.findUniqueOrThrow({ where: { shopId_provider_pageId: { shopId: shop.id, provider: 'messenger', pageId: 'fixture-' + shop.id } } });
}

function inbound(channel, overrides = {}) {
    return {
        type: 'message', pageId: channel.pageId, generation: channel.generation, eventId: randomUUID(), conversationId: randomUUID(),
        messageId: randomUUID(), senderId: randomUUID(), occurredAt: new Date(Date.now() - 1000).toISOString(),
        displayName: 'Khách Messenger tổng hợp', text: 'Khách hỏi chính sách giao hàng', ...overrides,
    };
}

async function event(input, expected = 200, signature = signMessengerFixtureEvent(config.signingKey, input)) {
    const result = await fetch(base + '/integrations/messenger-fixture/events', { method: 'POST',
        headers: { 'content-type': 'application/json', 'x-botsales-fixture-signature': signature }, body: JSON.stringify(input),
    });
    assert.equal(result.status, expected, result.headers.get('x-request-id'));
    return (await result.json()).data;
}

async function conversationFor(channel, externalId) {
    return db.channelConversation.findUniqueOrThrow({ where: { shopId_channelId_externalId: { shopId: channel.shopId, channelId: channel.id, externalId } } });
}

function upload(purpose, bytes, name, type, resourceId, options = {}) {
    const form = new globalThis.FormData();
    form.set('purpose', purpose);
    if (resourceId) form.set('resourceId', resourceId);
    form.set('file', new globalThis.Blob([bytes], { type }), name);
    return send('uploads', form, options.schema ?? 'FileObjectResponse', { ...options, expected: options.expected ?? 201 });
}

test('SC-033 SC-047 SC-048 SC-049 SC-050: fixture channel authorization is one-time and signed input is scoped by page and shop', async () => {
    await send('integrations/channels/connect', { returnPath: '/s/' + shopB.id + '/integrations/channels', channelKind: 'facebook_messenger' },
        'Problem', { expected: 422 });
    const first = await connect(shopA, owner);
    const second = await connect(shopB, other);
    const input = inbound(first);
    await event(input, 404, '0'.repeat(64));
    const original = await event(input);
    assert.equal(original.duplicate, false);
    assert.equal((await event(input)).duplicate, true);
    await event({ ...input, text: 'Sự kiện cùng mã khác nội dung' }, 409);
    assert.equal((await event({ ...input, eventId: randomUUID() })).duplicate, true);
    await event({ ...input, pageId: second.pageId, generation: second.generation, eventId: randomUUID(), messageId: randomUUID() });
    const conversation = await conversationFor(first, input.conversationId);
    const otherShop = await conversationFor(second, input.conversationId);
    assert.notEqual(conversation.customerId, otherShop.customerId);
    await event({ ...input, eventId: randomUUID(), messageId: randomUUID(), occurredAt: new Date(Date.now() - 60000).toISOString(),
        text: 'Tin đến muộn qua Webhook' });
    const current = await get('conversations/' + conversation.id, 'ConversationResponse');
    assert.equal(current.unreadCount, 1);
    assert.equal(current.lastMessagePreview, input.text);
    assert.equal((await get('conversations?q=' + conversation.id, 'ConversationListResponse'))[0].id, conversation.id);
    assert.equal((await get('conversations/metadata', 'InboxMetadataResponse')).channels.find(channel => channel.id === first.id).mediaPolicy.maxAttachmentCount, 5);
    assert.equal((await get('conversations/' + conversation.id + '/messages', 'MessageListResponse')).length, 2);
    await get('conversations/' + conversation.id, 'Problem', { shop: shopB, actor: other, expected: 404 });
    const link = await get('integrations/channels/' + first.id, 'ChannelResponse');
    assert.ok(link.lastWebhookAt);
    assert.ok((await get('integrations/channels?status=connected', 'ChannelListResponse')).some(channel => channel.id === first.id));
    const queued = await send('integrations/channels/' + first.id + '/check', undefined, 'JobResponse', { expected: 202 });
    await runJob(db, { shopId: shopA.id, id: queued.id, sourceOperation: 'checkChannelHealth' }, channelTestHandler(config), authorize);
    assert.equal((await get('jobs/' + queued.id, 'JobResponse')).status, 'succeeded');
    received = { channel: first, input, conversationId: conversation.id, messageId: original.messageId };
});

test('SC-034 SC-035 SC-036 SC-037 SC2-B07 SC2-B08: media stays scoped and takeover invalidates a prior generation before dispatch', async () => {
    const { channel, input, conversationId } = received;
    const resource = 'conversations/' + conversationId;
    const start = await get(resource, 'ConversationResponse');
    await send(resource + '/takeover', { expectedVersion: start.version, reason: 'Nhân viên nhận tư vấn' }, 'CommandResponse', { expected: 202 });
    const adopted = await get(resource, 'ConversationResponse');
    assert.equal(adopted.sendEligibility.state, 'allowed');
    assert.equal(adopted.unreadCount, 0);
    assert.equal(adopted.assignedUserId, owner.userId);
    await send(resource + '/release', { expectedVersion: start.version, reason: 'Kiểm phiên bản tiếp quản cũ' }, 'Problem', { expected: 412 });
    const releaseReason = 'Giao hội thoại về trợ lý';
    await send(resource + '/release', { expectedVersion: adopted.version, reason: releaseReason }, 'CommandResponse', { expected: 202 });
    const bot = await db.channelConversation.findUniqueOrThrow({ where: { shopId_id: { shopId: shopA.id, id: conversationId } } });
    const releaseAudits = await db.auditEntry.findMany({ where: {
        shopId: shopA.id, resourceId: conversationId, action: 'releaseConversation',
    } });
    assert.equal(releaseAudits.length, 1);
    assert.equal(releaseAudits[0].actorId, owner.userId);
    assert.deepEqual(releaseAudits[0].metadata, { version: bot.version, mode: 'bot', reason: releaseReason });
    assert.equal(bot.assignedUserId, null);
    const older = await db.$transaction(tx => recordCommand(tx, { shopId: shopA.id, actorId: owner.userId,
        operationId: 'sendMessage', idempotencyKey: randomUUID() }, { draft: 'fixture bot' }, async command => {
        const message = await tx.channelMessage.create({ data: { shopId: shopA.id, conversationId, externalId: randomUUID(),
            direction: 'outbound', origin: 'fixture', senderKind: 'bot', status: 'queued', text: 'Bản nháp trước tiếp quản' } });
        await tx.messageDispatch.create({ data: { shopId: shopA.id, commandId: command.id, messageId: message.id,
            conversationGeneration: bot.generation, channelGeneration: channel.generation } });
        return { type: 'message', id: message.id };
    }, true));
    await send(resource + '/takeover', { expectedVersion: bot.version, reason: 'Nhận tiếp quản bản nháp đang chờ' }, 'CommandResponse', { expected: 202 });
    await dispatchMessengerMessages(db, config);
    assert.equal((await get('commands/' + older.command.id, 'CommandResponse')).status, 'failed');
    assert.equal((await get(resource + '/messages?status=failed', 'MessageListResponse'))[0].id, older.result.id);
    const note = await send(resource + '/notes', { text: 'Ghi chú chỉ lưu nội bộ' }, 'MessageResponse', { expected: 201 });
    assert.equal(note.direction, 'internal');
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#1386aa' } }).png().toBuffer();
    await upload('conversation_media', png, 'fake.png', 'image/png', randomUUID(), { expected: 404, schema: 'Problem' });
    await upload('conversation_media', png, 'other-shop.png', 'image/png', conversationId,
        { shop: shopB, actor: other, expected: 404, schema: 'Problem' });
    await upload('conversation_media', png, 'wrong.svg', 'image/svg+xml', conversationId,
        { expected: 422, schema: 'Problem' });
    await upload('conversation_media', Buffer.alloc(5 * 1024 * 1024 + 1), 'oversize.png', 'image/png', conversationId,
        { expected: 413, schema: 'Problem' });
    const quarantined = await upload('conversation_media', Buffer.from('not a raster image'), 'invalid.png', 'image/png', conversationId);
    assert.deepEqual([quarantined.status, quarantined.rejectionReason, quarantined.readUrl], ['quarantined', 'invalid_format', null]);
    const catalogImage = await upload('product_image', png, 'catalog.png', 'image/png', null);
    const image = await upload('conversation_media', png, 'test.png', 'image/png', conversationId);
    assert.equal(image.status, 'ready');
    await get('uploads/' + image.id, 'Problem', { actor: staff, expected: 404 });
    const current = await get(resource, 'ConversationResponse');
    const reply = { clientMessageId: randomUUID(), expectedConversationVersion: current.version, fileIds: [image.id] };
    const dispatchCount = () => db.messageDispatch.count({ where: { shopId: shopA.id, message: { conversationId } } });
    const beforeInvalidSends = await dispatchCount();
    for (const fileId of [catalogImage.id, quarantined.id]) {
        await send(resource + '/messages', { ...reply, fileIds: [fileId] }, 'Problem', { expected: 409 });
    }
    const tooMany = [image.id, ...Array.from({ length: 5 }, () => randomUUID())];
    await send(resource + '/messages', { ...reply, fileIds: tooMany }, 'Problem', { expected: 400 });
    assert.equal(await dispatchCount(), beforeInvalidSends);
    const key = randomUUID();
    const queued = await send(resource + '/messages', reply, 'CommandResponse', { expected: 202, key });
    assert.equal(queued.status, 'accepted');
    assert.equal((await send(resource + '/messages', reply, 'CommandResponse', { expected: 202, key })).id, queued.id);
    await dispatchMessengerMessages(db, config);
    const command = await get('commands/' + queued.id, 'CommandResponse');
    assert.equal(command.status, 'succeeded');
    const sent = (await get(resource + '/messages?status=sent', 'MessageListResponse'))[0];
    assert.equal(sent.text, '');
    assert.equal(sent.attachments[0].fileId, image.id);
    assert.equal(sent.id, command.result.id);
    console.log(JSON.stringify({ status: 'SC2_B07_B08_INBOX_GATES', releaseAudits: 1, releaseClearedAssignee: true,
        staleDispatch: 'failed', wrongShop: 404, unsupportedMime: 422, oversize: 413, attachmentCount: 400,
        wrongPurpose: 409, quarantinedFile: 409, validImageSent: true }));
    await send(resource + '/notes', { text: 'Nguồn hình không thể là bản chép lời',
        transcriptSource: { messageId: sent.id, fileId: image.id } }, 'Problem', { expected: 422 });
    const wave = Buffer.from('524946462600000057415645666d74201000000001000100401f0000803e00000200100064617461020000000000', 'hex');
    const wav = await upload('conversation_media', wave, 'voice.wav', 'audio/wav', conversationId);
    assert.equal(wav.status, 'ready');
    const audioReply = await send(resource + '/messages', { clientMessageId: randomUUID(),
        expectedConversationVersion: (await get(resource, 'ConversationResponse')).version, fileIds: [wav.id] },
    'CommandResponse', { expected: 202 });
    await dispatchMessengerMessages(db, config);
    const audioMessage = (await get('commands/' + audioReply.id, 'CommandResponse')).result.id;
    const reviewBody = { text: 'Bản chép lời đã đối chiếu nội bộ', transcriptSource: { messageId: audioMessage, fileId: wav.id } };
    const transcriptKey = randomUUID();
    const transcript = await send(resource + '/notes', reviewBody, 'MessageResponse', { expected: 201, key: transcriptKey });
    assert.equal(transcript.direction, 'internal');
    assert.deepEqual(transcript.sourceEvidence, [{ type: 'voice_transcript_file', id: wav.id }, { type: 'voice_transcript_message', id: audioMessage }]);
    assert.equal((await send(resource + '/notes', reviewBody, 'MessageResponse', { expected: 201, key: transcriptKey })).id, transcript.id);
    assert.equal(await db.messageDispatch.count({ where: { shopId: shopA.id, messageId: transcript.id } }), 0);
    const updatedConversation = await get(resource, 'ConversationResponse');
    await send(resource + '/messages', { ...reply, expectedConversationVersion: updatedConversation.version }, 'Problem', { expected: 409 });
    const anotherEvent = inbound(channel);
    await event(anotherEvent);
    const another = await conversationFor(channel, anotherEvent.conversationId);
    const anotherPath = 'conversations/' + another.id;
    await send(anotherPath + '/notes', reviewBody, 'Problem', { expected: 422 });
    await send(anotherPath + '/takeover', { expectedVersion: another.version, reason: 'Mở hội thoại khác khi kiểm tệp' },
        'CommandResponse', { expected: 202 });
    const anotherVersion = (await get(anotherPath, 'ConversationResponse')).version;
    await send(anotherPath + '/messages', { ...reply, clientMessageId: randomUUID(), expectedConversationVersion: anotherVersion },
        'Problem', { expected: 409 });
    const expiredEvent = inbound(channel, { occurredAt: new Date(Date.now() - 25 * 3600000).toISOString() });
    await event(expiredEvent);
    const expired = await conversationFor(channel, expiredEvent.conversationId);
    const expiredPath = 'conversations/' + expired.id;
    await send(expiredPath + '/takeover', { expectedVersion: expired.version, reason: 'Kiểm cửa sổ gửi đã quá hạn' },
        'CommandResponse', { expected: 202 });
    const tooOld = await get(expiredPath, 'ConversationResponse');
    assert.equal(tooOld.sendEligibility.reasonCode, 'SEND_WINDOW_CLOSED');
    await send(expiredPath + '/messages', { clientMessageId: randomUUID(), expectedConversationVersion: tooOld.version, text: 'Hết cửa sổ gửi' },
        'Problem', { expected: 409 });
    const providerMessage = await db.channelMessage.findUniqueOrThrow({ where: { shopId_id: { shopId: shopA.id, id: sent.id } } });
    const dispatch = await db.messageDispatch.findUniqueOrThrow({ where: { shopId_messageId: { shopId: shopA.id, messageId: sent.id } } });
    const commandKey = { shopId: shopA.id, commandId: dispatch.commandId, eventType: 'command.updated' };
    const commandEvents = await db.outboxEvent.count({ where: commandKey });
    await db.$transaction([
        db.channelMessage.update({ where: { shopId_id: { shopId: shopA.id, id: sent.id } }, data: { status: 'unknown' } }),
        db.command.update({ where: { shopId_id: { shopId: shopA.id, id: dispatch.commandId } }, data: { status: 'unknown' } }),
    ]);
    const delivered = { type: 'delivery', pageId: channel.pageId, generation: channel.generation, eventId: randomUUID(),
        occurredAt: new Date().toISOString(), conversationId: input.conversationId, messageId: providerMessage.externalId, status: 'read' };
    await event(delivered);
    assert.equal((await event(delivered)).duplicate, true);
    await event({ ...delivered, eventId: randomUUID(), status: 'delivered' });
    const reconciled = await get('commands/' + dispatch.commandId, 'CommandResponse');
    assert.deepEqual([reconciled.status, reconciled.result?.id], ['succeeded', sent.id]);
    assert.equal(await db.outboxEvent.count({ where: commandKey }), commandEvents + 1);
    assert.equal((await get(resource + '/messages?status=read', 'MessageListResponse'))[0].id, sent.id);
    const shared = await get('uploads/' + image.id, 'FileObjectResponse', { actor: staff });
    const mine = new URL(image.readUrl, config.appOrigin);
    assert.equal((await request(mine.pathname.slice('/api/v2'.length) + mine.search, staff)).status, 404);
    const own = new URL(shared.readUrl, config.appOrigin);
    const downloaded = await request(own.pathname.slice('/api/v2'.length) + own.search, staff);
    assert.equal(downloaded.status, 200);
    assert.equal(downloaded.headers.get('content-type'), 'image/png');
    await get('uploads/' + image.id, 'Problem', { shop: shopB, actor: other, expected: 404 });
    const fresh = await get(resource, 'ConversationResponse');
    await send(resource + '/assign', { expectedVersion: fresh.version, userId: staff.userId }, 'CommandResponse', { expected: 202 });
    const assigned = await get(resource, 'ConversationResponse');
    assert.equal(assigned.assignedUserId, staff.userId);
    await send(resource + '/resolve', { expectedVersion: assigned.version, reason: 'Đã trả lời và hoàn tất hội thoại' }, 'CommandResponse', { expected: 202 });
    assert.equal((await get(resource, 'ConversationResponse')).status, 'resolved');
    const detail = await get('integrations/channels/' + channel.id, 'ChannelResponse');
    await send('integrations/channels/' + channel.id + '/disconnect', { expectedVersion: detail.version, reason: 'Tắt trang thử sau đối chiếu' },
        'CommandResponse', { expected: 202 });
    await event({ ...input, eventId: randomUUID(), messageId: randomUUID() }, 404);
    const currentChannel = await connect(shopA, owner, channel.id);
    assert.notEqual(currentChannel.generation, channel.generation);
    assert.equal(currentChannel.lastWebhookAt, null);
    await event({ ...input, eventId: randomUUID(), messageId: randomUUID() }, 404);
});

function textPdf(text) {
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
        (() => { const stream = 'BT /F1 12 Tf 72 740 Td (' + text + ') Tj ET\n'; return '<< /Length ' + stream.length + ' >>\nstream\n' + stream + 'endstream'; })(),
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];
    let pdf = '%PDF-1.4\n';
    const starts = objects.map((object, index) => {
        const offset = pdf.length;
        pdf += (index + 1) + ' 0 obj\n' + object + '\nendobj\n';
        return String(offset).padStart(10, '0') + ' 00000 n \n';
    });
    const beforeXref = pdf.length;
    return Buffer.from(pdf + 'xref\n0 6\n0000000000 65535 f \n' + starts.join('') +
        'trailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n' + beforeXref + '\n%%EOF\n', 'ascii');
}

test('SC-039 SC-040 SC-041 SC-042 SC2-G03 SC2-G06: knowledge drafts, file indexing, scoped approval and published revision retirement', async () => {
    const { conversationId, messageId } = received;
    const original = 'Phản hồi tổng hợp có số thử 202-555-0100.';
    const feedback = await send('feedback', { conversationId, messageId, rating: 'negative', correction: original },
        'FeedbackResponse', { expected: 201 });
    await send('feedback', { conversationId, messageId, rating: 'positive', correction: '' }, 'Problem',
        { shop: shopB, actor: other, expected: 404 });
    const restricted = (await get('feedback?status=pending', 'FeedbackListResponse', { actor: staff })).find(item => item.id === feedback.id);
    assert.equal(restricted.correction, '');
    const reviewInput = { expectedVersion: feedback.version, decision: 'approve', reason: 'Đã đọc và bỏ nội dung riêng tư',
        redactedCorrection: 'Hướng dẫn đổi hàng trong 30 ngày đối với đơn từ 2500000.' };
    const reviewPath = 'feedback/' + feedback.id + '/review';
    await send(reviewPath, reviewInput, 'Problem', { actor: staff, expected: 403 });
    const reviewScope = { shopId: shopA.id, feedbackId: feedback.id };
    const reviewAudit = { shopId: shopA.id, resourceId: feedback.id, action: 'reviewFeedback' };
    for (const contact of [original, 'Liên hệ mẫu: reviewer@example.invalid', 'Số tổng hợp +84 000 000 001', 'Số tổng hợp 020 0000 0001']) {
        const denied = await send(reviewPath, { ...reviewInput, redactedCorrection: contact }, 'Problem', { expected: 422 });
        assert.deepEqual([denied.errors[0].path, denied.errors[0].code], ['/redactedCorrection', 'PRIVATE_CONTACT_DETAILS']);
        assert.ok(!JSON.stringify(denied).includes(contact));
    }
    assert.equal(await db.knowledgeDocument.count({ where: reviewScope }), 0);
    assert.equal(await db.auditEntry.count({ where: reviewAudit }), 0);
    assert.equal((await db.conversationFeedback.findUniqueOrThrow({ where: { shopId_id: { shopId: shopA.id, id: feedback.id } } })).status, 'pending');
    const feedbackKey = randomUUID();
    const approved = await send(reviewPath, reviewInput, 'FeedbackResponse', { key: feedbackKey });
    assert.equal((await send(reviewPath, reviewInput, 'FeedbackResponse', { key: feedbackKey })).id, approved.id);
    assert.equal(approved.correction, reviewInput.redactedCorrection);
    assert.equal(await db.knowledgeDocument.count({ where: reviewScope }), 1);
    assert.equal(await db.auditEntry.count({ where: reviewAudit }), 1);
    const suggestion = await db.knowledgeDocument.findUniqueOrThrow({ where: { shopId_feedbackId: { shopId: shopA.id, feedbackId: feedback.id } } });
    const suggestionView = await get('knowledge/' + suggestion.id, 'KnowledgeResponse');
    assert.deepEqual([suggestionView.status, suggestionView.content, suggestionView.publishedRevisionId], ['draft', reviewInput.redactedCorrection, null]);
    assert.deepEqual(await db.$transaction(tx => assignedKnowledge(tx, shopA.id, [suggestion.draftRevisionId])), []);

    const marker = 'CHINH-SACH-PDF-' + randomUUID().slice(0, 8);
    const invalid = await upload('knowledge_source', Buffer.from('%PDF-invalid'), 'invalid.pdf', 'application/pdf');
    assert.equal(invalid.status, 'quarantined');
    const file = await upload('knowledge_source', textPdf(marker), 'fixture.pdf', 'application/pdf');
    assert.equal(file.status, 'ready');
    await get('uploads/' + file.id, 'Problem', { actor: staff, expected: 404 });
    const input = { title: marker, sourceKind: 'file', fileId: file.id, content: null };
    await send('knowledge', input, 'Problem', { shop: shopB, actor: other, expected: 422 });
    const draft = await send('knowledge', input, 'KnowledgeResponse', { expected: 201 });
    assert.equal((await get('uploads/' + file.id, 'FileObjectResponse', { actor: staff })).status, 'ready');
    assert.equal((await get('knowledge?q=' + marker, 'KnowledgeListResponse'))[0].id, draft.id);
    const path = 'knowledge/' + draft.id;
    const renamed = await send(path, { title: marker + ' v1' }, 'KnowledgeResponse', { method: 'PATCH', version: draft.version });
    await send(path, { title: 'Đổi từ phiên bản cũ' }, 'Problem', { method: 'PATCH', version: draft.version, expected: 412 });
    const review = { expectedVersion: renamed.version, reason: 'Gửi kiểm tra văn bản từ PDF' };
    const job = await send(path + '/submit-review', review, 'JobResponse', { expected: 202 });
    await runJob(db, { shopId: shopA.id, id: job.id, sourceOperation: 'submitKnowledgeReview' }, knowledgeIndexHandler(db), authorize);
    assert.equal((await get('jobs/' + job.id, 'JobResponse')).status, 'succeeded');
    const indexed = await get(path, 'KnowledgeResponse');
    assert.equal(indexed.status, 'ready_for_review');
    const revision = await get(path + '/revisions/' + indexed.draftRevisionId, 'KnowledgeRevisionResponse');
    assert.match(revision.contentHash, /^[a-f0-9]{64}$/);
    const publish = { expectedVersion: indexed.version, revisionId: indexed.draftRevisionId, evaluationRunId: randomUUID(), reason: 'Đã kiểm và duyệt phiên bản PDF' };
    await send(path + '/publish', publish, 'Problem', { expected: 409 });
    const evaluation = await writer.evaluation.create({ data: {
        shopId: shopA.id, configRevision: 1, datasetVersion: 'fixture-knowledge-v1', knowledgeRevisionId: indexed.draftRevisionId,
        knowledgeHash: '0'.repeat(64), policyVersion: (await db.shop.findUniqueOrThrow({ where: { id: shopA.id } })).policyVersion,
        status: 'passed', totalCases: 2, passedCases: 2, criticalFailures: 0, fixture: true,
    } });
    const approvedInput = { ...publish, evaluationRunId: evaluation.id };
    await send(path + '/publish', approvedInput, 'Problem', { expected: 409 });
    await writer.evaluation.update({ where: { shopId_id: { shopId: shopA.id, id: evaluation.id } }, data: { knowledgeHash: revision.contentHash } });
    await send(path + '/publish', approvedInput, 'Problem', { actor: staff, expected: 403 });
    const key = randomUUID();
    const accepted = await send(path + '/publish', approvedInput, 'CommandResponse', { expected: 202, key });
    assert.equal((await send(path + '/publish', approvedInput, 'CommandResponse', { expected: 202, key })).id, accepted.id);
    const live = await get(path, 'KnowledgeResponse');
    assert.equal(live.publishedRevisionId, indexed.draftRevisionId);
    const liveRevision = await get(path + '/revisions/' + live.publishedRevisionId, 'KnowledgeRevisionResponse');
    const matched = await db.$transaction(tx => publishedKnowledge(tx, shopA.id, marker));
    assert.equal(matched[0].id, indexed.draftRevisionId);
    assert.match(matched[0].indexedText, new RegExp(marker));
    assert.deepEqual(await db.$transaction(tx => publishedKnowledge(tx, shopB.id, marker)), []);
    const newDraft = await send(path + '/revisions', { title: 'Phiên bản mới', content: 'Nội dung nháp chưa đánh giá', sourceKind: 'manual', fileId: null },
        'KnowledgeRevisionResponse', { expected: 201 });
    assert.equal(newDraft.revision, 2);
    const second = await get(path, 'KnowledgeResponse');
    assert.equal(second.publishedRevisionId, live.publishedRevisionId);
    const reindex = await send(path + '/submit-review', { expectedVersion: second.version, reason: 'Kiểm bản hai trước khi xuất bản' },
        'JobResponse', { expected: 202 });
    await runJob(db, { shopId: shopA.id, id: reindex.id, sourceOperation: 'submitKnowledgeReview' }, knowledgeIndexHandler(db), authorize);
    const document = await get(path, 'KnowledgeResponse');
    assert.equal(document.status, 'ready_for_review');
    assert.equal(document.draftRevisionId, newDraft.id);
    assert.notEqual(document.contentHash, revision.contentHash);
    await send(path + '/publish', { ...approvedInput, expectedVersion: document.version, revisionId: document.draftRevisionId },
        'Problem', { expected: 409 });
    const afterStale = await get(path, 'KnowledgeResponse');
    assert.deepEqual(afterStale, document);
    assert.deepEqual(await db.$transaction(tx => assignedKnowledge(tx, shopA.id, [indexed.draftRevisionId, newDraft.id])), matched);
    const restored = await send(path + '/revisions/' + indexed.draftRevisionId + '/restore', {
        expectedVersion: document.version, reason: 'Mở bản cũ thành nháp mới để rà lại' }, 'KnowledgeRevisionResponse', { expected: 201 });
    assert.equal(restored.revision, 3);
    assert.equal(restored.status, 'draft');
    assert.equal((await get(path + '/revisions', 'KnowledgeRevisionListResponse')).length, 3);
    const current = await get(path, 'KnowledgeResponse');
    assert.equal(current.publishedRevisionId, indexed.draftRevisionId);
    assert.deepEqual(await get(path + '/revisions/' + live.publishedRevisionId, 'KnowledgeRevisionResponse'),
        { ...liveRevision, draftRevisionId: restored.id });
    await send(path + '/retire', { expectedVersion: current.version, reason: 'Ngừng dùng chính sách cũ' }, 'CommandResponse', { expected: 202 });
    assert.deepEqual(await db.$transaction(tx => publishedKnowledge(tx, shopA.id, marker)), []);
    assert.deepEqual(await db.$transaction(tx => assignedKnowledge(tx, shopA.id, [indexed.draftRevisionId])), []);
    assert.equal((await get(path + '/revisions/' + indexed.draftRevisionId, 'KnowledgeRevisionResponse')).status, 'retired');
    assert.equal(await db.auditEntry.count({ where: { shopId: shopA.id, resourceId: draft.id, action: 'retireKnowledge' } }), 1);
    await get(path, 'Problem', { shop: shopB, actor: other, expected: 404 });
});

test('SC2-B01 SC2-G02: structured knowledge checks source shop, required policies and published revisions', async () => {
    const [product, foreignProduct] = await Promise.all([shopA, shopB].map(shop => writer.product.create({
        data: { shopId: shop.id, name: 'Nguồn đã kiểm ' + randomUUID().slice(0, 8), description: '', status: 'active' },
    })));
    const manual = { sourceKind: 'manual', fileId: null, content: null };
    const productTemplate = {
        kind: 'product_content', sourceOwner: 'Phụ trách danh mục', productId: product.id,
        features: 'Dùng trong nhà', sizeUse: 'Kích cỡ S', warranty: 'Kiểm chứng phiếu bảo hành',
        alternatives: 'Hỏi lại mẫu', forbiddenPromises: 'Không hứa miễn phí ngoài chính sách',
    };
    const item = { ...manual, title: product.name, template: productTemplate };
    await send('knowledge', { ...item, template: { ...productTemplate, productId: foreignProduct.id } }, 'Problem', { expected: 422 });
    const productDraft = await send('knowledge', item, 'KnowledgeResponse', { expected: 201 });
    assert.deepEqual(productDraft.template, productTemplate);
    const productPath = 'knowledge/' + productDraft.id;
    await writer.product.update({ where: { shopId_id: { shopId: shopA.id, id: product.id } }, data: { status: 'archived' } });
    await send(productPath + '/submit-review', { expectedVersion: productDraft.version, reason: 'Kiểm nguồn đã lưu trữ' }, 'Problem', { expected: 422 });

    const marker = 'SCRIPT-' + randomUUID().slice(0, 8);
    const template = {
        kind: 'sales_script', industry: marker, persona: 'Nhân viên tư vấn của cửa hàng', needs: 'Hỏi nhu cầu sử dụng', requiredFacts: 'Xác nhận mẫu và tồn',
        boundaries: 'Thiếu chính sách thì hỏi người phụ trách', shippingPolicy: '', returnPolicy: 'Theo tài liệu đổi trả đã duyệt',
    };
    const draft = await send('knowledge', { ...manual, title: marker, template }, 'KnowledgeResponse', { expected: 201 });
    const path = 'knowledge/' + draft.id;
    const submit = { expectedVersion: draft.version, reason: 'Gửi thẩm định kịch bản theo ngành' };
    await send(path + '/submit-review', submit, 'Problem', { expected: 422 });
    const updated = await send(path, { template: { ...template, shippingPolicy: 'Theo lịch giao đã xác nhận' } }, 'KnowledgeResponse', {
        method: 'PATCH', version: draft.version,
    });
    const job = await send(path + '/submit-review', { ...submit, expectedVersion: updated.version }, 'JobResponse', { expected: 202 });
    await runJob(db, { shopId: shopA.id, id: job.id, sourceOperation: 'submitKnowledgeReview' }, knowledgeIndexHandler(db), authorize);
    const indexed = await get(path, 'KnowledgeResponse');
    const revision = await get(path + '/revisions/' + indexed.draftRevisionId, 'KnowledgeRevisionResponse');
    assert.equal(indexed.status, 'ready_for_review');
    assert.deepEqual(await db.$transaction(tx => assignedKnowledge(tx, shopA.id, [revision.id])), []);
    const evaluation = await writer.evaluation.create({ data: {
        shopId: shopA.id, configRevision: 1, datasetVersion: 'fixture-structured-knowledge', knowledgeRevisionId: revision.id,
        knowledgeHash: revision.contentHash, policyVersion: (await db.shop.findUniqueOrThrow({ where: { id: shopA.id } })).policyVersion,
        status: 'passed', totalCases: 2, passedCases: 2, criticalFailures: 0, fixture: true,
    } });
    await send(path + '/publish', {
        expectedVersion: indexed.version, revisionId: revision.id, evaluationRunId: evaluation.id, reason: 'Đã thẩm định nội dung và chính sách',
    }, 'CommandResponse', { expected: 202 });
    assert.equal((await db.$transaction(tx => assignedKnowledge(tx, shopA.id, [revision.id])))[0].id, revision.id);
    assert.deepEqual(await db.$transaction(tx => assignedKnowledge(tx, shopB.id, [revision.id])), []);
    const [match] = await db.$transaction(tx => publishedKnowledge(tx, shopA.id, marker));
    assert.match(match.indexedText, /Theo lịch giao đã xác nhận/);
});
