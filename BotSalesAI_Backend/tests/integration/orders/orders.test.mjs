import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { URLSearchParams } from 'node:url';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createContractValidator, schemaFromContract } from '../../../apps/api/dist/http/contracts.js';
import { localAccountingDate } from '../../../apps/api/dist/modules/finance/index.js';
import { recordStockMovement } from '../../../apps/api/dist/modules/inventory/index.js';
import { acceptFixturePairing, deviceTestHandler, dispatchExternalNotifications, dispatchPreparationNotifications,
    readTelegramConfig, readWebPushConfig } from '../../../apps/api/dist/modules/notifications/index.js';
import { telegramPairingCode } from '../../../apps/api/dist/modules/notifications/telegram.js';
import { expireOrdersWithReservations } from '../../../apps/api/dist/modules/orders/index.js';
import { readAuthConfig, requireShopAccess } from '../../../apps/api/dist/modules/workspace/index.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { serializable } from '../../../apps/api/dist/platform/database/transactions.js';
import { dueJobs, runJob } from '../../../apps/api/dist/platform/jobs/index.js';
import { ExactDecimal, proportionalAmount } from '../../../apps/api/dist/platform/money/index.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { reviewedEvidenceFixture, sha256 } from '../helpers/reviewed-evidence-fixture.mjs';
import { pushConfigEnv, pushReceiver } from '../notifications/web-push-fixture.mjs';
import { telegramFixtureEnv, telegramStartUpdate } from '../notifications/telegram-fixture.mjs';
import { assertFixtureDatabase, fixtureSession } from '../workspace/session-fixture.mjs';
import { fixtureWriter, orderConversation, quoteEvidenceFixture } from './fixtures.mjs';

const { components } = JSON.parse(readFileSync(new URL('../../../../botsales-kit/contracts/openapi.json', import.meta.url)));
const validator = createContractValidator(components.schemas);
const [shopA, shopB] = fixtureShops;
const shopId = shopA.id;
const route = (resource, shop = shopA) => '/shops/' + shop.id + '/' + resource;
const webPush = readWebPushConfig(pushConfigEnv());
let app, db, admin, auth, base, origin, owner, other, viewer;

before(async () => {
    const url = readDatabaseUrl(process.env);
    assertFixtureDatabase(url);
    process.env.NOTIFICATION_FIXTURE_ADAPTER = '1';
    auth = readAuthConfig(process.env);
    assert.ok(auth);
    origin = auth.appOrigin;
    const database = new Database(url);
    db = database.client;
    admin = fixtureWriter();
    [owner, other, viewer] = await Promise.all(['p0-editor', 'p0-editor-b', 'p0-reader'].map(subject => fixtureSession(db, subject)));
    app = await createApp({ database, auth, webPush, quiet: true });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl() + '/api/v2';
    for (const actor of [owner, other, viewer]) actor.csrf = (await json(await request('/session', actor), 200, 'SessionResponse')).csrfToken;
});

after(async () => {
    const ids = [owner, other, viewer].filter(Boolean).map(actor => actor.id);
    if (ids.length) await db.session.updateMany({ where: { id: { in: ids } }, data: { revokedAt: new Date() } });
    await admin?.$disconnect();
    await app?.close();
});

function request(path, actor = owner, options = {}) {
    return fetch(base + path, { ...options, headers: { cookie: actor.cookie, ...options.headers } });
}

async function json(response, status, schema) {
    assert.equal(response.status, status);
    const body = await response.json();
    const validate = validator.compile(schemaFromContract(schema));
    assert.equal(validate(body), true, JSON.stringify(validate.errors));
    assert.equal(body.meta?.requestId ?? body.requestId, response.headers.get('x-request-id'));
    return schema === 'Problem' ? body : body.data;
}

function send(resource, body, { actor = owner, shop = shopA, key = randomUUID(), method = 'POST', version } = {}) {
    return request(route(resource, shop), actor, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
        headers: {
            origin, 'idempotency-key': key, 'x-csrf-token': actor.csrf, 'content-type': 'application/json',
            ...(version !== undefined ? { 'if-match': '"' + version + '"' } : {}),
        },
    });
}

async function customer() {
    const person = await json(await send('customers', {
        displayName: 'Khách fixture ' + randomUUID().slice(0, 8), phone: '0900000111', email: null, notes: '',
    }), 201, 'CustomerResponse');
    const address = await json(await send('customers/' + person.id + '/addresses', {
        label: 'Địa chỉ giao', recipient: 'Người nhận thử', phone: '0900000111', line1: 'Địa chỉ 1',
        ward: null, district: null, province: 'Hà Nội', postalCode: null, countryCode: 'VN',
    }), 201, 'CustomerAddressResponse');
    const { conversation } = await orderConversation(admin, shopId, person.id);
    return { person, address, conversation };
}

async function product(shop = shopA, actor = owner, variantCount = 1, prices = []) {
    const name = 'BE11-' + randomUUID();
    return json(await send('products', {
        name, description: '', categoryId: null, status: 'active', imageFileIds: [],
        variants: Array.from({ length: variantCount }, (_, index) => ({
            sku: name + '-' + index, name: 'Biến thể ' + index, options: {}, active: true,
            price: { amount: prices[index] ?? '9007199254740993.000000000000000001', currency: shop.currency },
        })),
    }, { shop, actor }), 201, 'ProductResponse');
}

async function fillStock(variant, quantity = 1, warehouseId = shopA.defaultWarehouseId, receivedValue = '10.01') {
    return serializable(db, tx => recordStockMovement(tx, {
        shopId, actorId: owner.userId, warehouseId, variantId: variant.id, kind: 'receipt',
        source: { type: 'fixture_receipt', id: randomUUID() }, reason: 'Nhập hàng cho kiểm thử đơn',
        delta: { onHand: quantity }, receivedValue,
    }), true);
}

function draft(client, line, overrides = {}) {
    return {
        customerId: client.person.id, conversationId: client.conversation.id, warehouseId: shopA.defaultWarehouseId,
        shippingAddressId: client.address.id, notes: 'Ghi chú fixture', paymentMethod: 'cod',
        lines: [{ variantId: line.id, quantity: 1 }], ...overrides,
    };
}

async function quote(order) {
    return json(await send('orders/' + order.id + '/quote'), 200, 'OrderQuoteResponse');
}

async function evidence(order, offer, conversation) {
    const input = await quoteEvidenceFixture(admin, offer, conversation);
    return json(await send('orders/' + order.id + '/customer-confirmations', input), 200, 'CustomerConfirmationResponse');
}

function confirm(order, offer, proof, options) {
    return send('orders/' + order.id + '/confirm', {
        expectedVersion: order.version, quoteId: offer.id, customerConfirmationId: proof.id,
    }, options);
}

test('SC2-C04: a versioned shipping policy matches shop and address and excludes fees from merchandise total', async () => {
    const before = await json(await request(route('shipping-policy')), 200, 'ShippingPolicyResponse');
    await json(await request(route('shipping-policy'), viewer), 403, 'Problem');
    const rules = [{ countryCode: 'VN', province: '  Hà   Nội ', serviceName: 'Giao chuẩn', amount: '25000.00' }];
    await json(await send('shipping-policy', { rules }, { method: 'PUT' }), 428, 'Problem');
    await json(await send('shipping-policy', { rules: [...rules, { ...rules[0], province: 'hà nội' }] },
        { method: 'PUT', version: before.version }), 422, 'Problem');
    const saved = await send('shipping-policy', { rules }, { method: 'PUT', version: before.version });
    assert.equal(saved.headers.get('etag'), '"' + (before.version + 1) + '"');
    const policy = await json(saved, 200, 'ShippingPolicyResponse');
    assert.equal(policy.rules[0].province, 'Hà Nội');
    await json(await send('shipping-policy', { rules: [] }, { method: 'PUT', version: before.version }), 412, 'Problem');
    const { variants: [variant] } = await product();
    const client = await customer();
    const order = await json(await send('orders', draft(client, variant)), 201, 'OrderResponse');
    const offer = await quote(order);
    assert.deepEqual(offer.shippingRate.fee, { currency: 'VND', amount: '25000' });
    assert.equal(offer.shippingRate.policyVersion, policy.version);
    assert.equal(offer.total.amount, '9007199254740993.000000000000000001');
    assert.equal(offer.lines[0].discount.amount, '0');
    assert.ok(offer.warnings.some(warning => warning.includes(variant.sku)));
    await json(await request(route('orders/' + order.id, shopB), other), 404, 'Problem');
    await json(await send('orders', draft(client, variant, { promotionId: randomUUID() })), 422, 'Problem');
    const stale = await quoteEvidenceFixture(admin, offer, client.conversation);
    const updatedRules = [{ ...rules[0], amount: '30000' }];
    const changed = await json(await send('shipping-policy', { rules: updatedRules }, { method: 'PUT', version: policy.version }),
        200, 'ShippingPolicyResponse');
    await json(await send('orders/' + order.id + '/customer-confirmations', stale), 409, 'Problem');

    const unservedAddress = await json(await send('customers/' + client.person.id + '/addresses', {
        label: 'Ngoài vùng', recipient: 'Người nhận thử', phone: '0900000111', line1: 'Địa chỉ thử',
        ward: null, district: null, province: 'Đà Nẵng', postalCode: null, countryCode: 'VN',
    }), 201, 'CustomerAddressResponse');
    const unserved = await json(await send('orders', draft(client, variant, { shippingAddressId: unservedAddress.id })), 201, 'OrderResponse');
    const unservedPath = 'orders/' + unserved.id;
    const blockedQuote = await json(await send(unservedPath + '/quote'), 409, 'Problem');
    assert.equal(blockedQuote.code, 'SHIPPING_ZONE_UNAVAILABLE');
    assert.equal(await db.orderQuote.count({ where: { shopId, orderId: unserved.id } }), 0);

    const manualPolicy = await json(await send('shipping-policy', { rules: [] }, { method: 'PUT', version: changed.version }),
        200, 'ShippingPolicyResponse');
    const manual = await quote(unserved);
    assert.equal(manual.shippingRate, null);
    await fillStock(variant);
    const validProof = await evidence(unserved, manual, client.conversation);
    const restored = await json(await send('shipping-policy', { rules: updatedRules }, { method: 'PUT', version: manualPolicy.version }),
        200, 'ShippingPolicyResponse');
    assert.equal(restored.rules[0].province, 'Hà Nội');
    const blockedConfirmation = await json(await confirm(unserved, manual, validProof), 409, 'Problem');
    assert.equal(blockedConfirmation.code, 'SHIPPING_ZONE_UNAVAILABLE');
    assert.equal((await json(await request(route(unservedPath)), 200, 'OrderResponse')).orderState, 'draft');
    assert.equal(await db.stockReservation.count({ where: { shopId, orderId: unserved.id } }), 0);
    assert.equal(await db.workItem.count({ where: { shopId, sourceType: 'order', sourceId: unserved.id } }), 0);
    console.log(JSON.stringify({ status: 'SC2_C04_SHIPPING_ZONE', outsideQuote: blockedQuote.code, outsideConfirm: blockedConfirmation.code,
        manualQuoteRate: manual.shippingRate, reservationRows: 0, preparationRows: 0 }));
});

test('SC-022 and SC-023: draft reads and edits respect tenant, version, exact price, and existing quote references', async () => {
    const { variants: [variant] } = await product();
    const client = await customer();
    const wrong = await customer();
    const linked = '?customerId=' + client.person.id;
    assert.deepEqual((await json(await request(route('conversations') + linked), 200, 'ConversationListResponse')).map(item => item.id),
        [client.conversation.id]);
    assert.deepEqual(await json(await request(route('conversations', shopB) + linked, other), 200, 'ConversationListResponse'), []);
    await json(await send('orders', draft(client, variant, { shippingAddressId: wrong.address.id })), 404, 'Problem');
    await json(await send('orders', draft(client, variant, { conversationId: wrong.conversation.id })), 422, 'Problem');
    await json(await send('orders', draft(client, variant), { actor: viewer }), 403, 'Problem');
    const input = draft(client, variant);
    const key = randomUUID();
    const initial = await json(await send('orders', input, { key }), 201, 'OrderResponse');
    assert.equal((await json(await send('orders', input, { key }), 201, 'OrderResponse')).id, initial.id);
    const offer = await quote(initial);
    const edit = { lines: [{ variantId: variant.id, quantity: 2 }] };
    const mismatch = await json(await send('orders', { ...input, ...edit }, { key }), 409, 'Problem');
    assert.equal(mismatch.code, 'IDEMPOTENCY_MISMATCH');
    assert.match(mismatch.detail, /Khóa thao tác đã gắn với dữ liệu khác/);
    assert.equal((await db.orderLine.findFirstOrThrow({ where: { shopId, orderId: initial.id } })).quantity, 1);
    await json(await send('orders/' + initial.id, edit, { method: 'PATCH' }), 428, 'Problem');
    const edited = await json(await send('orders/' + initial.id, edit, { method: 'PATCH', version: initial.version }), 200, 'OrderResponse');
    assert.equal(edited.total.amount, '18014398509481986.000000000000000002');
    assert.equal(edited.lines[0].id, initial.lines[0].id);
    await json(await send('orders/' + initial.id, { notes: 'Cũ' }, { method: 'PATCH', version: initial.version }), 412, 'Problem');
    await json(await send('orders/' + initial.id + '/customer-confirmations', await quoteEvidenceFixture(admin, offer, client.conversation)), 409, 'Problem');
    const list = await json(await request(route('orders') + '?' + new URLSearchParams({ customerId: client.person.id, limit: '1' })),
        200, 'OrderListResponse');
    assert.deepEqual(list.map(order => order.id), [initial.id]);
});

test('SC-024 and SC-025: evidence is bound to message and quote, final SKU is allocated once and lost responses recover', async () => {
    const { variants: [variant] } = await product();
    await fillStock(variant);
    const client = await customer();
    const sample = async () => {
        const order = await json(await send('orders', draft(client, variant)), 201, 'OrderResponse');
        const offer = await quote(order);
        const path = 'orders/' + order.id + '/customer-confirmations';
        const wrong = await quoteEvidenceFixture(admin, offer, client.conversation, 'Nội dung không xác nhận');
        await json(await send(path, wrong), 422, 'Problem');
        await json(await send(path, { ...wrong, sourceMessageId: randomUUID() }), 422, 'Problem');
        const input = await quoteEvidenceFixture(admin, offer, client.conversation);
        const proof = await json(await send(path, input), 200, 'CustomerConfirmationResponse');
        assert.equal((await json(await send(path, input), 200, 'CustomerConfirmationResponse')).id, proof.id);
        assert.equal(await db.orderCustomerConfirmation.count({ where: { shopId, sourceMessageId: input.sourceMessageId } }), 1);
        return { order, offer, proof, key: randomUUID() };
    };
    const candidates = [await sample(), await sample()];
    const responses = await Promise.all(candidates.map(({ order, offer, proof, key }) => confirm(order, offer, proof, { key })));
    assert.deepEqual(responses.map(response => response.status).sort(), [202, 409]);
    const winner = responses.findIndex(response => response.status === 202);
    await Promise.all(responses.map(response => response.body.cancel()));
    const { order, offer, proof, key } = candidates[winner];
    const digest = createHash('sha256').update(key).digest('hex');
    const [command] = await json(await request(route('commands') + '?' + new URLSearchParams({ kind: 'confirmOrder', q: digest })),
        200, 'CommandListResponse');
    assert.deepEqual(command.result, { type: 'order', id: order.id });
    assert.equal((await json(await confirm(order, offer, proof, { key }), 202, 'CommandResponse')).id, command.id);
    const otherCandidate = candidates[1 - winner];
    const mismatch = await json(await confirm(otherCandidate.order, otherCandidate.offer, otherCandidate.proof, { key }), 409, 'Problem');
    assert.equal(mismatch.code, 'IDEMPOTENCY_MISMATCH');
    assert.equal(await db.stockReservation.count({ where: { shopId, orderId: otherCandidate.order.id } }), 0);
    assert.equal(await db.stockReservation.count({ where: { shopId, orderId: order.id } }), 1);
    assert.equal(await db.stockMovement.count({ where: { shopId, variantId: variant.id, kind: 'reserve' } }), 1);
    assert.equal(await db.auditEntry.count({ where: { shopId, resourceId: order.id, action: 'confirmOrder' } }), 1);
    assert.equal(await db.outboxEvent.count({ where: { shopId, commandId: command.id } }), 1);
    const before = await json(await request(route('orders/' + order.id)), 200, 'OrderResponse');
    assert.equal(before.orderState, 'confirmed');
    assert.equal(before.fulfillmentState, 'reserved');
    const fieldRedaction = await json(await request(route('orders/' + order.id), viewer), 200, 'OrderResponse');
    assert.equal(fieldRedaction.shippingAddressSnapshot.phone, null);
    await json(await send('customers/' + client.person.id + '/addresses/' + client.address.id, { line1: 'Địa chỉ thay sau chốt' },
        { method: 'PATCH', version: client.address.version }), 200, 'CustomerAddressResponse');
    const historical = await json(await request(route('orders/' + order.id)), 200, 'OrderResponse');
    assert.deepEqual(historical.shippingAddressSnapshot, before.shippingAddressSnapshot);
    const caseLink = await json(await send('service-cases', {
        customerId: client.person.id, orderId: order.id, kind: 'question', summary: 'Hỗ trợ cho đơn đã xác nhận',
    }), 201, 'ServiceCaseResponse');
    assert.equal(caseLink.orderId, order.id);
    const cancelKey = randomUUID();
    const cancellation = { expectedVersion: historical.version, reason: 'Hủy đơn kiểm thử' };
    const cancelled = await json(await send('orders/' + order.id + '/cancel', cancellation, { key: cancelKey }), 202, 'CommandResponse');
    assert.equal((await json(await send('orders/' + order.id + '/cancel', cancellation, { key: cancelKey }), 202, 'CommandResponse')).id, cancelled.id);
    assert.equal(await db.stockMovement.count({ where: { shopId, variantId: variant.id, kind: 'release' } }), 1);
});

test('SC2-A02 rejects preparation before payment or when a later stock line cannot be reserved', async () => {
    const first = await product();
    const second = await product();
    const [stocked, empty] = [first.variants[0], second.variants[0]].sort((a, b) => a.id.localeCompare(b.id));
    await fillStock(stocked, 1);
    const client = await customer();
    const draftWith = overrides => send('orders', draft(client, stocked, overrides)).then(reply => json(reply, 201, 'OrderResponse'));
    const unreadied = async order => {
        assert.equal(await db.stockReservation.count({ where: { shopId, orderId: order.id } }), 0);
        assert.equal(await db.prepJob.count({ where: { shopId, orderId: order.id } }), 0);
        assert.equal(await db.workItem.count({ where: { shopId, sourceType: 'order', sourceId: order.id, kind: 'prepare_order' } }), 0);
        assert.equal(await db.appNotification.count({ where: { shopId, workItem: { sourceType: 'order', sourceId: order.id } } }), 0);
    };
    const reject = async order => {
        const offer = await quote(order);
        const proof = await evidence(order, offer, client.conversation);
        await json(await confirm(order, offer, proof), 409, 'Problem');
        await unreadied(order);
        const unchanged = await json(await request(route('orders/' + order.id)), 200, 'OrderResponse');
        assert.equal(unchanged.orderState, 'draft');
    };
    const unpaid = await draftWith({ paymentMethod: 'prepay' });
    await unreadied(unpaid);
    await reject(unpaid);
    const stockShortage = await draftWith({ lines: [{ variantId: stocked.id, quantity: 1 }, { variantId: empty.id, quantity: 1 }] });
    await reject(stockShortage);
    assert.equal(await db.stockMovement.count({ where: { shopId, variantId: { in: [stocked.id, empty.id] }, kind: 'reserve' } }), 0);
    console.log(JSON.stringify({ status: 'SC2_A02_PREPARATION_GATES', unpaid: 409, laterLineShortage: 409,
        reservationMovementsPersisted: 0, prepJobsPersisted: 0, workItemsPersisted: 0, notificationsPersisted: 0 }));
});

test('SC-024 SC-026 SC2-B02 SC2-B03 SC2-F02: only a current verified quote can reserve stock, and expiry releases it once', async () => {
    const original = await product();
    const [variant] = original.variants;
    await fillStock(variant);
    const client = await customer();
    const addressWithoutPhone = await json(await send('customers/' + client.person.id + '/addresses', {
        label: 'Thiếu số người nhận', recipient: 'Người nhận thử', phone: null, line1: 'Địa chỉ thử',
        ward: null, district: null, province: 'Hà Nội', postalCode: null, countryCode: 'VN',
    }), 201, 'CustomerAddressResponse');
    for (const shippingAddressId of [null, addressWithoutPhone.id]) {
        const incomplete = await json(await send('orders', draft(client, variant, { shippingAddressId })), 201, 'OrderResponse');
        const offer = await quote(incomplete);
        const proof = await evidence(incomplete, offer, client.conversation);
        await json(await confirm(incomplete, offer, proof), 409, 'Problem');
        assert.equal((await json(await request(route('orders/' + incomplete.id)), 200, 'OrderResponse')).orderState, 'draft');
        assert.equal(await db.stockReservation.count({ where: { shopId, orderId: incomplete.id } }), 0);
        assert.equal(await db.workItem.count({ where: { shopId, sourceType: 'order', sourceId: incomplete.id } }), 0);
    }
    const order = await json(await send('orders', draft(client, variant)), 201, 'OrderResponse');
    const stale = await quote(order);
    const priorEvidence = await evidence(order, stale, client.conversation);
    const { id, sku, options, name, active } = variant;
    await json(await send('products/' + original.id, { variants: [{ id, sku, options, name, active, price: { amount: '123.456', currency: 'VND' } }] },
        { method: 'PATCH', version: original.version }), 200, 'ProductResponse');
    const repriced = await json(await confirm(order, stale, priorEvidence), 409, 'Problem');
    assert.equal(repriced.code, 'PRICE_CHANGED');
    assert.match(repriced.detail, /Lấy báo giá mới và xác nhận lại/);
    assert.equal(await db.stockReservation.count({ where: { shopId, orderId: order.id } }), 0);
    const expiring = await quote(order);
    const expiringProof = await evidence(order, expiring, client.conversation);
    const now = Date.now();
    await admin.orderQuote.update({ where: { shopId_id: { shopId, id: expiring.id } },
        data: { createdAt: new Date(now - 60000), expiresAt: new Date(now - 1000) } });
    const expiredQuoteProblem = await json(await confirm(order, expiring, expiringProof), 409, 'Problem');
    assert.equal(expiredQuoteProblem.code, 'QUOTE_EXPIRED');
    assert.match(expiredQuoteProblem.detail, /Báo giá đã hết hạn/);
    assert.equal(await db.stockReservation.count({ where: { shopId, orderId: order.id } }), 0);
    const revised = await quote(order);
    await json(await confirm(order, revised, expiringProof), 409, 'Problem');
    console.log(JSON.stringify({ status: 'SC2_B02_B03_QUOTE_GATES', missingAddress: 409, missingRecipientPhone: 409,
        repriced: repriced.code, expired: expiredQuoteProblem.code, oldProofRejected: true, invalidPreparationRows: 0 }));
    const currentProof = await evidence(order, revised, client.conversation);
    await json(await confirm(order, revised, currentProof), 202, 'CommandResponse');
    const hold = await db.stockReservation.findFirstOrThrow({ where: { shopId, orderId: order.id } });
    const prep = await db.prepJob.findUniqueOrThrow({ where: { shopId_orderId: { shopId, orderId: order.id } }, include: { workItem: true } });
    const workRoute = route('work-items/' + prep.workItemId);
    assert.equal(prep.workItem.state, 'queued');
    assert.ok(prep.workItem.dueAt);
    const later = new Date(hold.expiresAt.getTime() + 1);
    await Promise.all([expireOrdersWithReservations(db, later), expireOrdersWithReservations(db, later)]);
    const expired = await json(await request(route('orders/' + order.id)), 200, 'OrderResponse');
    assert.equal(expired.orderState, 'cancelled');
    assert.equal(expired.fulfillmentState, 'unfulfilled');
    assert.equal(await db.auditEntry.count({ where: { shopId, action: 'expireOrderReservation', resourceId: order.id } }), 1);
    assert.equal(await db.stockMovement.count({ where: { shopId, sourceId: hold.id, kind: 'release' } }), 1);
    const cancelled = await json(await request(workRoute), 200, 'WorkItemResponse');
    assert.equal(cancelled.state, 'cancelled');
    assert.equal(cancelled.version, prep.workItem.version + 1);
    assert.deepEqual(cancelled.source, { type: 'order', id: order.id });
    assert.deepEqual(cancelled.allowedActions, []);
    assert.equal(await db.workItem.count({ where: { shopId, kind: 'prepare_order', sourceType: 'order', sourceId: order.id } }), 1);
    assert.equal(await db.appNotification.count({ where: { shopId, workItemId: cancelled.id, recipientUserId: owner.userId } }), 1);
    await json(await send('work-items/' + cancelled.id + '/claim', { expectedVersion: cancelled.version }), 409, 'Problem');
    console.log(JSON.stringify({ status: 'SC2_F02_PREP_CANCELLATION', versionIncrement: 1, retainedWorkItems: 1,
        retainedNotifications: 1, claimStatus: 409, releaseCount: 1 }));
});

test('SC2-F02: cancelling preparation also cancels its dependent notification recovery', async () => {
    const previous = await json(await request(route('notification-policy')), 200, 'NotificationPolicyResponse');
    const { version } = previous;
    const policy = Object.fromEntries(Object.entries(previous).filter(([field]) =>
        !['id', 'shopId', 'createdAt', 'updatedAt', 'version'].includes(field)));
    const membership = { shopId_userId: { shopId, userId: viewer.userId } };
    const { roles } = await admin.membership.findUniqueOrThrow({ where: membership, select: { roles: true } });
    const updateRoles = roles => admin.membership.update({ where: membership, data: { roles, permissionVersion: { increment: 1 } } });
    const updatePolicy = async input => json(await send('notification-policy', input, { method: 'PUT' }), 200, 'NotificationPolicyResponse');
    let configured, restored;
    await updateRoles(['manager']);
    try {
        configured = await updatePolicy({ ...policy, expectedVersion: version, enabled: true, quietHours: null,
            primaryUserIds: [viewer.userId], fallbackUserIds: [], fallbackChannel: 'none', remindAfterMinutes: 1, maxReminders: 1,
            ...(policy.eventPriorities ? { eventPriorities: { ...policy.eventPriorities, order: 'normal' } } : {}),
        });
        const first = await confirmedOrder(1);
        const second = await confirmedOrder(1);
        await updateRoles(roles);
        restored = true;
        const workKey = sourceId => ({ shopId_kind_sourceType_sourceId: { shopId, kind: 'recovery', sourceType: 'notification_schedule', sourceId } });
        const scheduleKey = workItemId => ({ shopId_workItemId: { shopId, workItemId } });
        const now = new Date();
        await Promise.all([dispatchPreparationNotifications(db, auth, now), dispatchPreparationNotifications(db, auth, now)]);
        const dependent = await db.workItem.findUniqueOrThrow({ where: workKey(first.prep.workItemId) });
        const unrelated = await db.workItem.findUniqueOrThrow({ where: workKey(second.prep.workItemId) });
        assert.equal(dependent.state, 'queued');
        assert.deepEqual([dependent.sourceType, dependent.sourceId], ['notification_schedule', first.prep.workItemId]);

        const current = await json(await request(route('orders/' + first.draftOrder.id)), 200, 'OrderResponse');
        const path = 'orders/' + current.id + '/cancel';
        const body = { expectedVersion: current.version, reason: 'Hủy đơn thử với việc nhắc phụ thuộc' };
        const commandOptions = { key: randomUUID() };
        const cancel = async () => json(await send(path, body, commandOptions), 202, 'CommandResponse');
        assert.equal((await cancel()).id, (await cancel()).id);
        const result = await db.workItem.findUniqueOrThrow({ where: workKey(first.prep.workItemId) });
        assert.equal(result.state, 'cancelled', 'Cancelling preparation must cancel its dependent recovery');
        assert.equal(result.id, dependent.id);
        assert.equal(result.version, dependent.version + 1);
        assert.deepEqual(await db.workItem.findUniqueOrThrow({ where: workKey(second.prep.workItemId) }), unrelated);
        assert.equal((await db.workNotificationSchedule.findUniqueOrThrow({ where: scheduleKey(first.prep.workItemId) })).nextDueAt, null);
        const currentWork = await json(await request(route('work-items/' + result.id)), 200, 'WorkItemResponse');
        assert.deepEqual(currentWork.allowedActions, []);
        await json(await request(route('work-items/' + result.id, shopB), other), 404, 'Problem');
        await dispatchPreparationNotifications(db, auth, now);
        assert.equal((await db.workItem.findUniqueOrThrow({ where: workKey(first.prep.workItemId) })).version, result.version);
        console.log(JSON.stringify({ status: 'SC2_F02_NOTIFICATION_DEPENDENCY', sourceState: 'cancelled', dependentState: result.state,
            sameTask: true, versionIncrement: 1, otherOrderUnchanged: true, scheduleCleared: true, foreignAccess: 404 }));
    } finally {
        if (!restored) await updateRoles(roles);
        if (configured) await updatePolicy({ ...policy, expectedVersion: configured.version });
    }
});

test('SC2-B05: promotion effective dates and tenant are filtered before the page boundary', async () => {
    const products = [await product(shopA, owner, 2), await product(shopB, other, 2)];
    const name = 'Ưu đãi ' + randomUUID();
    async function addPromo(shop, index, dates) {
        return admin.promotion.create({
            data: {
                ...dates, shopId: shop.id, name, discountAmount: '1000.1', minMarginPercent: 2, status: 'active',
                lines: { create: products[index].variants.map((variant, position) => ({
                    variantId: variant.id, sku: variant.sku, label: variant.name, quantity: 1, position,
                })) },
            },
        });
    }
    const activeDates = { startsOn: new Date('2000-01-01'), endsOn: new Date('2100-01-01') };
    const active = await addPromo(shopA, 0, activeDates);
    const recentExpired = await addPromo(shopA, 0, { startsOn: new Date('2000-01-01'), endsOn: new Date('2001-01-01') });
    const outside = await addPromo(shopB, 1, activeDates);
    const search = '?' + new URLSearchParams({ effective: 'yes', limit: '1', q: name });
    const list = await json(await request(route('promotions') + search), 200, 'PromotionListResponse');
    assert.deepEqual(list.map(entry => entry.id), [active.id]);
    assert.equal(list[0].discountAmount, '1000.1');
    assert.notEqual(list[0].id, recentExpired.id);
    const scoped = await json(await request(route('promotions', shopB) + search, other), 200, 'PromotionListResponse');
    assert.deepEqual(scoped.map(entry => entry.id), [outside.id]);
});

test('SC2-C01 SC2-C02 SC2-C03 SC2-A02 SC2-F02: order confirmation creates one task and notification ack leaves work unchanged', async () => {
    const { variants: [variant] } = await product();
    await fillStock(variant);
    const client = await customer();
    const order = await json(await send('orders', draft(client, variant)), 201, 'OrderResponse');
    const offer = await quote(order);
    const proof = await evidence(order, offer, client.conversation);
    const confirmationKey = randomUUID();
    const submission = await json(await confirm(order, offer, proof, { key: confirmationKey }), 202, 'CommandResponse');
    assert.equal((await json(await confirm(order, offer, proof, { key: confirmationKey }), 202, 'CommandResponse')).id, submission.id);
    const confirmed = await json(await request(route('orders/' + order.id)), 200, 'OrderResponse');
    assert.ok(confirmed.prepTaskId);
    const prepRef = await db.prepJob.findUniqueOrThrow({ where: { shopId_orderId: { shopId, orderId: order.id } } });
    const work = await json(await request(route('work-items/' + prepRef.workItemId)), 200, 'WorkItemResponse');
    assert.equal(work.id, confirmed.prepTaskId);
    assert.deepEqual(work.allowedActions, ['claim']);
    const list = await json(await request(route('work-items') + '?kind=prepare_order&assignee=unassigned&exception=active&q=' + order.id),
        200, 'WorkItemListResponse');
    assert.deepEqual(list.map(entry => entry.id), [work.id]);
    await json(await request(route('work-items/' + work.id, shopB), other), 404, 'Problem');
    const notice = await db.appNotification.findFirstOrThrow({ where: { shopId, workItemId: work.id, recipientUserId: owner.userId } });
    const visible = await json(await request(route('notifications/' + notice.id)), 200, 'NotificationResponse');
    assert.deepEqual(visible.allowedActions, ['acknowledge']);
    const published = await json(await request(route('notifications') + '?limit=100'), 200, 'NotificationListResponse');
    assert.ok(published.some(entry => entry.id === notice.id));
    const ackKey = randomUUID();
    const ack = () => send('notifications/' + notice.id + '/acknowledge', { expectedVersion: notice.version }, { key: ackKey });
    const acknowledged = await json(await ack(), 200, 'NotificationResponse');
    assert.ok(acknowledged.acknowledgedAt);
    assert.equal(acknowledged.workItemId, work.id);
    assert.deepEqual((await json(await ack(), 200, 'NotificationResponse')), acknowledged);
    assert.deepEqual(await json(await request(route('work-items/' + work.id)), 200, 'WorkItemResponse'), work);
    const member = { shopId_userId: { shopId, userId: viewer.userId } };
    const prior = await db.membership.findUniqueOrThrow({ where: member });
    try {
        const claim = actor => send('work-items/' + work.id + '/claim', { expectedVersion: work.version }, { actor });
        await db.membership.update({ where: member, data: { roles: ['warehouse'], permissionVersion: { increment: 1 } } });
        await json(await claim(viewer), 403, 'Problem');
        assert.deepEqual((await json(await request(route('work-items/' + work.id), viewer), 200, 'WorkItemResponse')).allowedActions, []);
        await json(await request(route('notifications/' + notice.id), viewer), 404, 'Problem');
        await db.membership.update({ where: member, data: { roles: ['manager'], permissionVersion: { increment: 1 } } });
        const requests = await Promise.all([claim(owner), claim(viewer)]);
        assert.deepEqual(requests.map(response => response.status).sort(), [200, 412]);
        const claimant = requests[0].status === 200 ? owner : viewer;
        const otherActor = claimant === owner ? viewer : owner;
        const accepted = await json(requests.find(response => response.status === 200), 200, 'WorkItemResponse');
        await json(requests.find(response => response.status === 412), 412, 'Problem');
        const observed = await json(await request(route('work-items/' + work.id), otherActor), 200, 'WorkItemResponse');
        assert.equal(observed.assigneeUserId, claimant.userId);
        assert.equal(observed.version, work.version + 1);
        assert.equal(observed.updatedAt, accepted.updatedAt);
        assert.ok(Date.parse(observed.updatedAt) >= Date.parse(work.updatedAt));
        assert.ok(!observed.allowedActions.includes('claim'));
        const claimAudit = await db.auditEntry.findFirstOrThrow({ where: { shopId, action: 'claimWorkItem', resourceId: work.id } });
        assert.equal(claimAudit.actorId, claimant.userId);
        assert.equal(claimAudit.metadata.version, observed.version);
        assert.ok(claimAudit.createdAt >= new Date(work.createdAt));
        console.log(JSON.stringify({ status: 'SC2_A04_CLAIM_OBSERVATION', accepted: 200, stale: 412,
            readByOther: true, winnerMatchesAudit: true, timestampMatchesResponse: true }));
        const prep = await json(await request(route('prep-jobs/' + prepRef.id)), 200, 'PrepJobResponse');
        assert.equal(prep.assigneeUserId, claimant.userId);
        assert.equal(prep.state, 'claimed');
        await json(await request(route('prep-jobs') + '?limit=10'), 200, 'PrepJobListResponse');
        const input = { expectedVersion: prep.version, orderLineId: prep.lines[0].orderLineId,
            scannedSku: prep.lines[0].sku, pickedQuantity: 1, issueReason: 'Cần kiểm lại hàng' };
        const pick = (actor, body, key = randomUUID()) => send('prep-jobs/' + prep.id + '/pick', body, { actor, key });
        await json(await pick(otherActor, input), 403, 'Problem');
        await json(await pick(claimant, { ...input, scannedSku: 'WRONG' }), 422, 'Problem');
        await json(await pick(claimant, { ...input, pickedQuantity: 2 }), 422, 'Problem');
        const blocked = await json(await pick(claimant, input), 200, 'PrepJobResponse');
        const pack = version => send('prep-jobs/' + prep.id + '/pack', { expectedVersion: version }, { actor: claimant });
        await json(await pack(blocked.version), 409, 'Problem');
        const fixed = await json(await pick(claimant, { ...input, expectedVersion: blocked.version, issueReason: null }), 200, 'PrepJobResponse');
        const packed = await json(await pack(fixed.version), 200, 'PrepJobResponse');
        assert.equal(packed.state, 'packed');
        assert.equal(await db.auditEntry.count({ where: { shopId, action: 'claimWorkItem', resourceId: work.id } }), 1);
        assert.equal(await db.prepJob.count({ where: { shopId, orderId: order.id } }), 1);
        assert.equal(await db.appNotification.count({ where: { shopId, workItemId: work.id, recipientUserId: owner.userId } }), 1);
        console.log(JSON.stringify({ status: 'SC2_F02_PREP_ACK', sameCommandOnReplay: true, ackLinksWork: true, ackChangesWork: false,
            observations: 1, concurrentClaimStatuses: [200, 412], crossShopStatus: 404 }));
    } finally {
        await db.membership.update({ where: member, data: { roles: prior.roles, permissionVersion: { increment: 1 } } });
    }
});

async function openPeriod() {
    const date = localAccountingDate(new Date(), shopA.timezone);
    const day = new Date(date + 'T00:00:00.000Z');
    const existing = await db.accountingPeriod.findFirst({ where: { shopId, startDate: { lte: day }, endDate: { gte: day } } });
    if (existing) assert.equal(existing.state, 'open');
    else await json(await send('periods', { startDate: date, endDate: date, reason: 'Kỳ thử bàn giao và trả hàng' }), 201, 'AccountingPeriodResponse');
}

async function confirmedOrder(quantity, receivedValue) {
    const { variants: [variant] } = await product();
    await fillStock(variant, quantity, shopA.defaultWarehouseId, receivedValue);
    const client = await customer();
    const draftOrder = await json(await send('orders', draft(client, variant, { lines: [{ variantId: variant.id, quantity }] })),
        201, 'OrderResponse');
    const offer = await quote(draftOrder);
    await json(await confirm(draftOrder, offer, await evidence(draftOrder, offer, client.conversation)), 202, 'CommandResponse');
    const prep = await db.prepJob.findUniqueOrThrow({ where: { shopId_orderId: { shopId, orderId: draftOrder.id } }, include: { workItem: true } });
    return { draftOrder, prep, variant, offer };
}

async function packedOrder(quantity, receivedValue) {
    const { draftOrder, prep, variant, offer } = await confirmedOrder(quantity, receivedValue);
    await packOrder(draftOrder, prep);
    const order = await json(await request(route('orders/' + draftOrder.id)), 200, 'OrderResponse');
    return { order, variant, prep, offer };
}

async function packOrder(order, prep) {
    await json(await send('work-items/' + prep.workItemId + '/claim', { expectedVersion: prep.workItem.version }), 200, 'WorkItemResponse');
    let version = prep.version;
    for (const line of order.lines) {
        const picked = await json(await send('prep-jobs/' + prep.id + '/pick', {
            expectedVersion: version, orderLineId: line.id, pickedQuantity: line.quantity, scannedSku: line.sku, issueReason: null,
        }), 200, 'PrepJobResponse');
        version = picked.version;
    }
    await json(await send('prep-jobs/' + prep.id + '/pack', { expectedVersion: version }), 200, 'PrepJobResponse');
}

async function observeShipment(shipment, state, at = new Date()) {
    const observation = await admin.shipmentObservation.create({
        data: { shopId, shipmentId: shipment.id, state, occurredAt: at, externalEventId: randomUUID() },
    });
    return {
        expectedVersion: shipment.version, eventType: state, occurredAt: at.toISOString(),
        externalEventId: observation.externalEventId, evidenceRef: observation.id,
    };
}

async function observePayment(orderId, amount, kind) {
    const now = new Date();
    return admin.paymentEvidence.create({ data: {
        shopId, orderId, amount, kind, reference: 'BE13-' + randomUUID(), currency: shopA.currency, observedAt: now, verifiedAt: now,
    } });
}

test('SC2-E02: weighted cost is frozen at handover and recognized only on evidenced delivery', async () => {
    await openPeriod();
    const { order, variant } = await packedOrder(3, '4.02');
    await fillStock(variant, 3, order.warehouseId, '16');
    const stock = () => db.stockPosition.findUniqueOrThrow({
        where: { shopId_warehouseId_variantId: { shopId, warehouseId: order.warehouseId, variantId: variant.id } },
    });
    const assertStock = async (onHand, transit, value) => {
        const row = await stock();
        assert.deepEqual([row.onHand, row.transit, row.carryingValue.toFixed()], [onHand, transit, value]);
    };
    await assertStock(6, 0, '20.02');
    const window = '?' + new URLSearchParams({ timezone: shopA.timezone,
        from: new Date(Date.now() - 86400000).toISOString(), to: new Date(Date.now() + 86400000).toISOString() });
    const report = () => request(route('finance/profit-loss' + window)).then(response => json(response, 200, 'ProfitLossResponse'));
    const readOrder = () => request(route('orders/' + order.id)).then(response => json(response, 200, 'OrderResponse'));
    const before = await report();
    const shipment = await json(await send('shipments', { orderId: order.id, warehouseId: order.warehouseId, carrierId: null,
        orderLineIds: order.lines.map(line => line.id) }), 201, 'ShipmentResponse');
    const shipmentPath = 'shipments/' + shipment.id;
    await json(await send(shipmentPath + '/handover', { expectedVersion: shipment.version }), 202, 'CommandResponse');
    const handed = await json(await request(route(shipmentPath)), 200, 'ShipmentResponse');
    const lines = () => db.shipmentLine.findMany({ where: { shopId, shipmentId: shipment.id } });
    assert.deepEqual((await lines()).map(line => line.costValue.toFixed()), ['10.01']);
    await assertStock(3, 3, '10.01');
    const waiting = await report();
    assert.deepEqual([waiting.netSales, waiting.cogs], [before.netSales, before.cogs]);
    assert.equal((await readOrder()).recognitionPolicyVersion, null);

    await fillStock(variant, 2, order.warehouseId, '50');
    await assertStock(5, 3, '60.01');
    const proof = await observeShipment(handed, 'delivered');
    const key = randomUUID();
    const delivered = await json(await send(shipmentPath + '/events', proof, { key }), 200, 'ShipmentResponse');
    assert.deepEqual(await json(await send(shipmentPath + '/events', proof, { key }), 200, 'ShipmentResponse'), delivered);
    await assertStock(5, 0, '60.01');
    assert.deepEqual((await lines()).map(line => line.costValue.toFixed()), ['10.01']);
    const after = await report();
    assert.equal(new ExactDecimal(after.cogs.amount).minus(before.cogs.amount).toFixed(), '10.01');
    assert.equal(new ExactDecimal(after.netSales.amount).minus(before.netSales.amount).toFixed(), order.total.amount);
    const books = await db.financeJournal.findMany({ where: { shopId, sourceType: 'shipment', sourceId: shipment.id } });
    assert.deepEqual(books.map(book => [book.eventType, book.policyVersion]).sort(), [['delivery', before.policyVersion], ['handover', before.policyVersion]]);
    const recognized = await readOrder();
    assert.equal(recognized.recognitionPolicyVersion, books.find(book => book.eventType === 'delivery').policyVersion,
        'Delivered order identifies the policy recorded on its revenue journal');
    console.log(JSON.stringify({ status: 'SC2_E02_WEIGHTED_SNAPSHOT', initialUnits: 6, initialValue: '20.02', issuedUnits: 3,
        recordedCost: '10.01', laterReceipt: '50', remainingValue: '60.01', deliveryRevenueOnce: true, policyVersionPinned: true,
        orderMatchesJournalPolicy: true }));
});

test('SC-031, SC2-C05, SC2-C06, SC2-C07 and SC2-C08: handoff recovery, manual carrier evidence, subsequent returns and exact stock and finance', async t => {
    await openPeriod();
    const { order, variant, prep, offer } = await packedOrder(3);
    const orderLineId = order.lines[0].id;
    const readOrder = () => request(route('orders/' + order.id)).then(response => json(response, 200, 'OrderResponse'));
    const stock = () => db.stockPosition.findUniqueOrThrow({
        where: { shopId_warehouseId_variantId: { shopId, warehouseId: order.warehouseId, variantId: variant.id } },
    });
    const create = { orderId: order.id, warehouseId: order.warehouseId, carrierId: null, orderLineIds: [orderLineId] };
    await json(await send('shipments', { ...create, orderLineIds: [] }), 422, 'Problem');
    await json(await send('shipments', { ...create, carrierId: randomUUID() }), 422, 'Problem');
    const shipment = await json(await send('shipments', create), 201, 'ShipmentResponse');
    assert.equal(shipment.state, 'planned');
    assert.deepEqual(shipment.shippingFeeQuote, offer.shippingRate.fee);
    assert.deepEqual((await readOrder()).shipmentIds, [shipment.id]);
    assert.equal((await stock()).reserved, 3);
    await json(await send('shipments', create), 409, 'Problem');
    const fixture = await reviewedEvidenceFixture('shipment', {
        env: { ...process.env, SHIPMENT_MANUAL_SHOPS: shopId }, document: 'Synthetic carrier receipt for ' + shipment.id,
    });
    t.after(fixture.close);
    const eventFor = (current, eventType, at = new Date()) => ({
        shopId, shipmentId: current.id, orderId: order.id, reviewerId: owner.userId, expectedVersion: current.version,
        eventType, occurredAt: at.toISOString(), externalEventId: randomUUID(),
    });
    const record = async (review, hash) => {
        const { stdout } = await fixture.execute(hash ?? await fixture.prepare(review));
        return JSON.parse(stdout).evidenceId;
    };
    const eventRequest = (review, evidenceRef) => ({
        expectedVersion: review.expectedVersion, eventType: review.eventType, occurredAt: review.occurredAt,
        externalEventId: review.externalEventId, evidenceRef,
    });
    await assert.rejects(record(eventFor(shipment, 'in_transit')), { stderr: /rejected \(409\)/ });
    const shipmentPath = 'shipments/' + shipment.id;
    const readShipment = () => request(route(shipmentPath)).then(response => json(response, 200, 'ShipmentResponse'));
    assert.equal((await json(await request(route('shipments') + '?limit=100'), 200, 'ShipmentListResponse'))
        .some(item => item.id === shipment.id), true);
    await json(await request(route(shipmentPath, shopB), other), 404, 'Problem');
    await json(await request(route(shipmentPath), viewer), 403, 'Problem');
    const handoverKey = randomUUID();
    const handover = key => send(shipmentPath + '/handover', { expectedVersion: shipment.version }, { key });
    await (await handover(handoverKey)).body.cancel();
    const digest = createHash('sha256').update(handoverKey).digest('hex');
    const [command] = await json(await request(route('commands') + '?' + new URLSearchParams({ kind: 'handoverShipment', q: digest })),
        200, 'CommandListResponse');
    assert.deepEqual(command.result, { type: 'shipment', id: shipment.id });
    const retrieved = await json(await request(route('commands/' + command.id)), 200, 'CommandResponse');
    assert.equal(retrieved.status, 'succeeded');
    assert.equal((await json(await handover(handoverKey), 202, 'CommandResponse')).id, command.id);
    await json(await handover(randomUUID()), 412, 'Problem');
    const inDispatch = await readShipment();
    assert.equal(inDispatch.state, 'handed_over');
    await json(await send(shipmentPath + '/handover', { expectedVersion: inDispatch.version }), 409, 'Problem');
    assert.deepEqual(await readShipment(), inDispatch);
    assert.equal((await readOrder()).fulfillmentState, 'dispatched');
    assert.equal((await stock()).onHand, 0);
    assert.equal((await stock()).reserved, 0);
    assert.equal((await stock()).transit, 3);
    assert.equal((await db.prepJob.findUniqueOrThrow({ where: { shopId_id: { shopId, id: prep.id } } })).state, 'handed_over');
    const cancel = { expectedVersion: (await readOrder()).version, reason: 'Không hủy sau bàn giao' };
    await json(await send('orders/' + order.id + '/cancel', cancel), 409, 'Problem');
    const updateEvent = (body, key) => send(shipmentPath + '/events', body, { key });
    const first = eventFor(inDispatch, 'in_transit');
    await assert.rejects(record({ ...first, shopId: shopB.id }), { stderr: /rejected \(403\)/ });
    await assert.rejects(record({ ...first, reviewerId: viewer.userId }), { stderr: /rejected \(403\)/ });
    await assert.rejects(record({ ...first, orderId: randomUUID() }), { stderr: /rejected \(409\)/ });
    await assert.rejects(record({ ...first, expectedVersion: shipment.version }), { stderr: /rejected \(412\)/ });
    await assert.rejects(record({ ...first, occurredAt: '2000-01-01T00:00:00.000Z' }), { stderr: /rejected \(422\)/ });
    await assert.rejects(record({ ...first, documentSha256: sha256('unreviewed content') }), { stderr: /Document checksum mismatch/ });
    const fingerprintSql = readFileSync(new URL('../../../infra/backup/external-effect-fingerprints.sql', import.meta.url), 'utf8')
        .replace(/\\gset\s*$/, '');
    const carrierFingerprint = async () => {
        const [report] = await admin.$queryRawUnsafe(fingerprintSql);
        return report.external_effect_report.find(row => row.component === 'external/carrier_events');
    };
    const beforeObservation = await carrierFingerprint();
    const hash = await fixture.prepare(first);
    const [firstId, sameId] = await Promise.all([record(first, hash), record(first, hash)]);
    assert.equal(firstId, sameId);
    const pendingObservation = await carrierFingerprint();
    assert.equal(pendingObservation.records, beforeObservation.records + 1);
    assert.notEqual(pendingObservation.snapshot, beforeObservation.snapshot);
    await assert.rejects(record({ ...first, eventType: 'delivered' }), { stderr: /rejected \(409\)/ });
    const inTransit = eventRequest(first, firstId);
    await json(await updateEvent({ ...inTransit, evidenceRef: randomUUID() }), 422, 'Problem');
    const travelling = await json(await updateEvent(inTransit), 200, 'ShipmentResponse');
    assert.equal(travelling.state, 'in_transit');
    const delivery = eventFor(travelling, 'delivered');
    const proof = eventRequest(delivery, await record(delivery));
    const orderKey = { shopId_id: { shopId, id: order.id } };
    const { reservationId } = await db.salesOrder.findUniqueOrThrow({ where: orderKey });
    assert.ok(reservationId);
    const lineKey = { shopId_shipmentId_orderLineId: { shopId, shipmentId: shipment.id, orderLineId } };
    const { costValue } = await db.shipmentLine.findUniqueOrThrow({ where: lineKey });
    const journalQuery = { shopId, sourceType: 'shipment', sourceId: shipment.id, eventType: 'delivery' };
    assert.equal(costValue.toFixed(), '10.01');
    const deliveryKey = randomUUID();
    await admin.salesOrder.update({ where: orderKey, data: { reservationId: null } });
    try {
        await json(await updateEvent(proof, deliveryKey), 409, 'Problem');
    } finally {
        await admin.salesOrder.update({ where: orderKey, data: { reservationId } });
    }
    await admin.shipmentLine.update({ where: lineKey, data: { costValue: '0' } });
    try {
        await json(await updateEvent(proof, deliveryKey), 409, 'Problem');
        assert.deepEqual(await readShipment(), travelling);
        assert.equal((await stock()).transit, 3);
        assert.equal((await readOrder()).fulfillmentState, 'dispatched');
        assert.equal(await db.financeJournal.count({ where: journalQuery }), 0);
    } finally {
        await admin.shipmentLine.update({ where: lineKey, data: { costValue } });
    }
    const delivered = await json(await updateEvent(proof, deliveryKey), 200, 'ShipmentResponse');
    assert.equal(delivered.state, 'delivered');
    assert.equal(await db.financeJournal.count({ where: journalQuery }), 1);
    const query = shop => '?' + new URLSearchParams({ timezone: shop.timezone,
        from: new Date(Date.now() - 86400000).toISOString(), to: new Date(Date.now() + 86400000).toISOString() });
    const report = (shop = shopA, actor = owner, status = 200) => request(route('finance/profit-loss' + query(shop), shop), actor)
        .then(response => json(response, status, status === 200 ? 'ProfitLossResponse' : 'Problem'));
    const complete = await report();
    assert.ok(complete.cogs);
    await admin.shipmentLine.update({ where: lineKey, data: { costValue: '0' } });
    try {
        const historical = await report();
        assert.deepEqual([historical.cogs, historical.grossProfit, historical.operatingProfit], [null, null, null]);
        assert.equal(historical.completeness, 'incomplete');
        assert.deepEqual(historical.netSales, complete.netSales);
        assert.ok(historical.warnings.some(warning => warning.includes('Chứng từ giá vốn')));
        assert.equal((await report(shopB, other)).completeness, 'provisional');
        await report(shopA, viewer, 403);
    } finally {
        await admin.shipmentLine.update({ where: lineKey, data: { costValue } });
    }
    assert.deepEqual((await report()).cogs, complete.cogs);
    assert.deepEqual(await json(await updateEvent(proof), 200, 'ShipmentResponse'), delivered);
    assert.equal(await record(first), firstId);
    const lateReview = eventFor(delivered, 'failed', new Date(first.occurredAt));
    const late = eventRequest(lateReview, await record(lateReview));
    assert.equal((await json(await updateEvent(late), 200, 'ShipmentResponse')).state, 'delivered');
    assert.equal((await db.shipmentEvent.findUniqueOrThrow({
        where: { shopId_shipmentId_externalEventId: { shopId, shipmentId: shipment.id, externalEventId: late.externalEventId } },
    })).applied, false);
    const storedProof = await db.shipmentObservation.findUniqueOrThrow({ where: { shopId_id: { shopId, id: firstId } } });
    assert.equal(storedProof.attestationHash, hash);
    assert.ok(storedProof.observedAt >= storedProof.occurredAt);
    assert.equal(await db.auditEntry.count({ where: { shopId, resourceId: shipment.id, action: 'recordManualShipmentEvidence' } }), 3);
    await json(await updateEvent({ ...proof, eventType: 'failed' }), 409, 'Problem');
    assert.equal((await stock()).transit, 0);
    const sold = await readOrder();
    assert.equal(sold.fulfillmentState, 'delivered');
    assert.equal(sold.paymentState, 'unpaid');
    assert.equal(sold.cashReceived.amount, '0');
    assert.deepEqual(sold.amountDue, order.total);
    const receipt = await observePayment(order.id, sold.total.amount, 'carrier_collection');
    await json(await send('orders/' + order.id + '/pay', {
        expectedVersion: sold.version, amount: sold.total, method: 'external', reference: receipt.reference, evidenceRef: receipt.id,
        reason: 'Hãng giao nhận đã thu tiền COD',
    }), 202, 'CommandResponse');
    const startReturn = (quantity, opts) => send('returns', {
        orderId: order.id, reason: 'Khách đề nghị trả hàng', lines: [{ orderLineId, quantity }],
    }, opts);
    await json(await startReturn(4), 422, 'Problem');
    const firstReturn = await json(await startReturn(1), 201, 'ReturnCaseResponse');
    const returnPath = 'returns/' + firstReturn.id;
    assert.equal(firstReturn.refundObligation, null);
    assert.equal((await stock()).onHand, 0);
    await json(await startReturn(3), 422, 'Problem');
    assert.ok((await json(await request(route('returns') + '?limit=100'), 200, 'ReturnCaseListResponse')).some(item => item.id === firstReturn.id));
    assert.equal((await json(await request(route(returnPath)), 200, 'ReturnCaseResponse')).state, 'awaiting_goods');
    await json(await request(route(returnPath, shopB), other), 404, 'Problem');
    const inspect = (id, version, disposition, acceptedQuantity, opts) => send('returns/' + id + '/inspect', {
        expectedVersion: version, lines: [{ orderLineId, acceptedQuantity, disposition, reason: 'Đã kiểm tình trạng hàng' }],
    }, opts);
    await json(await inspect(firstReturn.id, firstReturn.version, 'sellable', 2), 422, 'Problem');
    await json(await inspect(firstReturn.id, firstReturn.version, 'sellable', 1, { actor: viewer }), 403, 'Problem');
    const inspectKey = randomUUID();
    const checked = await json(await inspect(firstReturn.id, firstReturn.version, 'sellable', 1, { key: inspectKey }), 200, 'ReturnCaseResponse');
    assert.deepEqual(await json(await inspect(firstReturn.id, firstReturn.version, 'sellable', 1, { key: inspectKey }),
        200, 'ReturnCaseResponse'), checked);
    const part = await readOrder();
    assert.equal(part.fulfillmentState, 'part_returned');
    assert.equal(part.refundedAmount.amount, '0');
    assert.equal(part.cashReceived.amount, '0');
    assert.equal((await stock()).onHand, 1);
    const tooMuch = new ExactDecimal(checked.refundObligation.amount).plus('0.01').toFixed();
    const excessive = await observePayment(order.id, tooMuch, 'observed_refund');
    const refund = proof => send('orders/' + order.id + '/refund', {
        expectedVersion: part.version, amount: { currency: shopA.currency, amount: proof.amount.toFixed() },
        paymentReference: proof.reference, evidenceRef: proof.id, reason: 'Xác nhận chứng từ đã hoàn',
    });
    await json(await refund(excessive), 422, 'Problem');
    const payout = await observePayment(order.id, checked.refundObligation.amount, 'observed_refund');
    await json(await refund(payout), 202, 'CommandResponse');
    assert.equal((await readOrder()).refundedAmount.amount, checked.refundObligation.amount);
    const second = await json(await startReturn(1), 201, 'ReturnCaseResponse');
    const damaged = await json(await inspect(second.id, second.version, 'quarantined', 1), 200, 'ReturnCaseResponse');
    assert.equal((await stock()).onHand, 1);
    assert.equal((await stock()).quarantine, 1);
    const last = await json(await startReturn(1), 201, 'ReturnCaseResponse');
    const passed = await json(await inspect(last.id, last.version, 'sellable', 1), 200, 'ReturnCaseResponse');
    await json(await startReturn(1), 422, 'Problem');
    assert.equal((await readOrder()).fulfillmentState, 'returned');
    assert.equal(new ExactDecimal(checked.refundObligation.amount)
        .plus(damaged.refundObligation.amount).plus(passed.refundObligation.amount).toFixed(), sold.total.amount);
    const stockNow = await stock();
    assert.equal(stockNow.onHand, 2);
    assert.equal(stockNow.quarantine, 1);
    const totalCost = new ExactDecimal('10.01');
    const damagedCost = proportionalAmount(totalCost, 2, 3).minus(proportionalAmount(totalCost, 1, 3));
    assert.equal(stockNow.carryingValue.toFixed(), totalCost.minus(damagedCost).toFixed());
    const books = await db.financeJournal.findMany({ where: { shopId, sourceType: 'shipment', sourceId: shipment.id }, include: { lines: { include: { account: true } } } });
    assert.deepEqual(books.map(book => book.eventType).sort(), ['delivery', 'handover']);
    assert.equal(books.find(book => book.eventType === 'delivery').lines.find(line => line.account.systemKey === 'carrier_receivable').debit.toFixed(), sold.total.amount);
    assert.equal(await db.auditEntry.count({ where: { shopId, action: 'handoverShipment', resourceId: shipment.id } }), 1);
    assert.equal(await db.outboxEvent.count({ where: { shopId, commandId: command.id } }), 1);
});

test('SC-031: a recorded zero-cost stock issue permits delivery without a missing-cost warning', async () => {
    await openPeriod();
    const { order } = await packedOrder(1, '0');
    const shipment = await json(await send('shipments', {
        orderId: order.id, warehouseId: order.warehouseId, carrierId: null, orderLineIds: order.lines.map(line => line.id),
    }), 201, 'ShipmentResponse');
    const resource = 'shipments/' + shipment.id;
    await json(await send(resource + '/handover', { expectedVersion: shipment.version }), 202, 'CommandResponse');
    const handed = await json(await request(route(resource)), 200, 'ShipmentResponse');
    const delivered = await json(await send(resource + '/events', await observeShipment(handed, 'delivered')), 200, 'ShipmentResponse');
    assert.equal(delivered.state, 'delivered');
    const { reservationId } = await db.salesOrder.findUniqueOrThrow({ where: { shopId_id: { shopId, id: order.id } } });
    const issue = await db.stockMovement.findFirstOrThrow({ where: { shopId, sourceType: 'stock_reservation', sourceId: reservationId, kind: 'fulfillment' } });
    assert.deepEqual([issue.carryingDelta.toFixed(), issue.quantityDelta], ['0', -1]);
    const query = new URLSearchParams({ timezone: shopA.timezone,
        from: new Date(Date.now() - 86400000).toISOString(), to: new Date(Date.now() + 86400000).toISOString() });
    const report = await json(await request(route('finance/profit-loss?' + query)), 200, 'ProfitLossResponse');
    assert.ok(report.cogs);
    assert.equal(report.completeness, 'provisional');
    assert.ok(report.warnings.every(warning => !warning.includes('Chứng từ giá vốn')));
});

test('SC2-A01, SC2-A07 and SC2-A08: device tests use current permission and retain provider uncertainty without duplicate sends', async () => {
    const push = outcome => ({ deviceName: 'Firefox fixture', endpoint: 'https://push-fixture.invalid/' + outcome + '/' + randomUUID(),
        p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString('base64url'), auth: Buffer.alloc(16, 2).toString('base64url') });
    const create = input => send('devices', input);
    const read = id => request(route('devices/' + id)).then(response => json(response, 200, 'DeviceSubscriptionResponse'));
    const revoke = device => send('devices/' + device.id + '/revoke', { expectedVersion: device.version });
    const jobHandler = deviceTestHandler(auth);
    const authorize = async (tx, job, permission) => {
        try { return Boolean(await requireShopAccess(tx, job.actorId, job.shopId, permission)); }
        catch (error) {
            if ([403, 404].includes(error.getStatus?.())) return false;
            throw error;
        }
    };
    await json(await create({ ...push('accepted'), endpoint: auth.issuer }), 422, 'Problem');
    await json(await request(route('devices'), viewer), 403, 'Problem');
    try {
        process.env.NOTIFICATION_FIXTURE_ADAPTER = '';
        await json(await create(push('accepted')), 503, 'Problem');
    } finally {
        process.env.NOTIFICATION_FIXTURE_ADAPTER = '1';
    }
    for (const [outcome, commandStatus, deviceState, delivery] of [
        ['accepted', 'succeeded', 'active', 'accepted_by_provider'],
        ['failed', 'failed', 'denied', 'failed'],
        ['unknown', 'unknown', 'pending', 'unknown'],
        ['accepted', 'failed', 'revoked', null],
    ]) {
        const input = push(outcome);
        const device = await json(await create(input), 201, 'DeviceSubscriptionResponse');
        assert.equal(device.status, 'pending');
        assert.equal((await json(await create(input), 201, 'DeviceSubscriptionResponse')).id, device.id);
        await json(await request(route('devices/' + device.id, shopB), other), 404, 'Problem');
        const testKey = randomUUID();
        const testDevice = key => send('devices/' + device.id + '/test', { expectedVersion: device.version }, { key });
        const queued = await json(await testDevice(testKey), 202, 'CommandResponse');
        assert.equal(queued.status, 'accepted');
        assert.equal((await json(await testDevice(testKey), 202, 'CommandResponse')).id, queued.id);
        const entry = await db.job.findFirstOrThrow({ where: { shopId, commandId: queued.id } });
        assert.ok((await dueJobs(db, ['testDevice'])).some(job => job.id === entry.id));
        if (deviceState === 'revoked') {
            const reserved = await read(device.id);
            await json(await send('devices/' + device.id + '/test', { expectedVersion: reserved.version }), 429, 'Problem');
            await json(await revoke(reserved), 200, 'DeviceSubscriptionResponse');
        }
        const candidate = { shopId, id: entry.id, sourceOperation: 'testDevice' };
        await Promise.all([runJob(db, candidate, jobHandler, authorize), runJob(db, candidate, jobHandler, authorize)]);
        const result = await json(await request(route('commands/' + queued.id)), 200, 'CommandResponse');
        assert.equal(result.status, commandStatus);
        assert.deepEqual(result.result, commandStatus === 'succeeded' ? { type: 'job', id: entry.id } : null);
        const notifications = await db.appNotification.findMany({ where: { shopId, sourceType: 'job', sourceId: entry.id } });
        assert.equal(notifications.length, delivery === null ? 0 : 1);
        if (delivery !== null) {
            assert.equal(notifications[0].deliveryStatus, delivery);
            assert.equal(notifications[0].openedAt, null);
            assert.equal(notifications[0].acknowledgedAt, null);
            const notice = await json(await request(route('notifications/' + notifications[0].id)), 200, 'NotificationResponse');
            assert.deepEqual(notice.allowedActions, []);
            assert.ok(!JSON.stringify(notice).includes(input.endpoint));
        }
        const finalDevice = await read(device.id);
        assert.equal(finalDevice.status, deviceState);
        assert.equal(Boolean(finalDevice.lastVerifiedAt), deviceState === 'active');
        assert.ok((await json(await request(route('devices') + '?limit=100'), 200, 'DeviceSubscriptionListResponse')).some(row => row.id === device.id));
        if (deviceState !== 'revoked') await json(await revoke(finalDevice), 200, 'DeviceSubscriptionResponse');
        await json(await create(input), 409, 'Problem');
    }
});

test('T070 Web Push tests encrypt the registration and settle delivery without treating it as device receipt', async () => {
    const read = id => request(route('devices/' + id)).then(response => json(response, 200, 'DeviceSubscriptionResponse'));
    for (const [status, expected, deviceStatus, revokeBefore] of [
        [201, 'succeeded', 'active', false], [410, 'failed', 'expired', false],
        [undefined, 'unknown', 'pending', false], [201, 'failed', 'revoked', true],
    ]) {
        const { subscription, read: decode } = pushReceiver();
        const input = { ...subscription, deviceName: 'Thiết bị Push thử' };
        const device = await json(await send('devices', input), 201, 'DeviceSubscriptionResponse');
        assert.equal(device.status, 'pending');
        assert.ok(!JSON.stringify(device).includes(subscription.endpoint));
        const where = { shopId_id: { shopId, id: device.id } };
        const record = await db.notificationDevice.findUniqueOrThrow({ where });
        assert.match(record.pushSubscriptionCiphertext, /^v1\./);
        for (const secret of Object.values(subscription)) assert.ok(!record.pushSubscriptionCiphertext.includes(secret));
        assert.equal((await json(await send('devices', input), 201, 'DeviceSubscriptionResponse')).id, device.id);
        const command = await json(await send('devices/' + device.id + '/test', { expectedVersion: device.version }), 202, 'CommandResponse');
        const job = await db.job.findFirstOrThrow({ where: { shopId, commandId: command.id } });
        if (revokeBefore) {
            const current = await read(device.id);
            await json(await send('devices/' + device.id + '/revoke', { expectedVersion: current.version }), 200, 'DeviceSubscriptionResponse');
        }
        let calls = 0;
        const handler = deviceTestHandler(auth, { db, webPush, request: async (endpoint, init) => {
            calls++;
            assert.equal(endpoint, subscription.endpoint);
            const payload = decode(init, webPush);
            assert.equal(payload.path, '/s/' + shopId + '/notifications');
            assert.equal(payload.eventId, job.id);
            if (status === undefined) throw new Error('Response unavailable');
            return new globalThis.Response(null, { status });
        } });
        const candidate = { shopId, id: job.id, sourceOperation: 'testDevice' };
        const authorized = async (tx, candidate, permission) => Boolean(await requireShopAccess(tx, candidate.actorId, shopId, permission));
        await Promise.all([runJob(db, candidate, handler, authorized), runJob(db, candidate, handler, authorized)]);
        const result = await json(await request(route('commands/' + command.id)), 200, 'CommandResponse');
        assert.equal(result.status, expected);
        assert.equal(calls, revokeBefore ? 0 : 1);
        const tested = await read(device.id);
        assert.equal(tested.status, deviceStatus);
        const output = await db.appNotification.findFirst({ where: { shopId, sourceType: 'job', sourceId: job.id } });
        if (!revokeBefore) {
            assert.equal(output.deliveryStatus, status === 201 ? 'accepted_by_provider' : status === 410 ? 'failed' : 'unknown');
            assert.equal(output.openedAt, null);
            assert.equal(output.acknowledgedAt, null);
        } else assert.equal(output, null);
        if (deviceStatus === 'expired' || deviceStatus === 'revoked') {
            assert.equal((await db.notificationDevice.findUniqueOrThrow({ where })).pushSubscriptionCiphertext, null);
        } else {
            await json(await send('devices/' + device.id + '/revoke', { expectedVersion: tested.version }), 200, 'DeviceSubscriptionResponse');
        }
    }
});

test('SC2-C06 and SC2-C08: cancel a planned parcel after shelving, or inspect a failed returned parcel without recognizing a sale', async () => {
    await openPeriod();
    const plan = order => send('shipments', {
        orderId: order.id, warehouseId: order.warehouseId, carrierId: null, orderLineIds: order.lines.map(line => line.id),
    }).then(response => json(response, 201, 'ShipmentResponse'));
    const cancelled = await packedOrder(1);
    const planToCancel = await plan(cancelled.order);
    const cancelledCommand = await send('orders/' + cancelled.order.id + '/cancel', {
        expectedVersion: cancelled.order.version, reason: 'Đã kiểm và đưa hàng về vị trí ban đầu',
    });
    await json(cancelledCommand, 202, 'CommandResponse');
    const afterCancel = await json(await request(route('shipments/' + planToCancel.id)), 200, 'ShipmentResponse');
    assert.equal(afterCancel.state, 'cancelled');
    await json(await send('shipments/' + planToCancel.id + '/handover', { expectedVersion: afterCancel.version }), 409, 'Problem');
    const { order, variant } = await packedOrder(1);
    const shipment = await plan(order);
    const path = 'shipments/' + shipment.id;
    await json(await send(path + '/handover', { expectedVersion: shipment.version }), 202, 'CommandResponse');
    const handed = await json(await request(route(path)), 200, 'ShipmentResponse');
    const append = async (current, state) => json(await send(path + '/events', await observeShipment(current, state)),
        200, 'ShipmentResponse');
    const failed = await append(handed, 'failed');
    assert.equal(failed.state, 'failed');
    const returnLine = { orderLineId: order.lines[0].id, quantity: 1 };
    const createReturn = () => send('returns', { orderId: order.id, lines: [returnLine], reason: 'Kiện không giao được' });
    await json(await createReturn(), 409, 'Problem');
    const returning = await append(failed, 'returning');
    assert.equal(returning.state, 'returning');
    const back = await append(returning, 'returned');
    assert.equal(back.state, 'returned');
    const started = await json(await createReturn(), 201, 'ReturnCaseResponse');
    const stock = () => db.stockPosition.findUniqueOrThrow({
        where: { shopId_warehouseId_variantId: { shopId, warehouseId: order.warehouseId, variantId: variant.id } },
    });
    assert.equal((await stock()).transit, 1);
    assert.equal((await stock()).onHand, 0);
    const reviewed = await json(await send('returns/' + started.id + '/inspect', { expectedVersion: started.version,
        lines: [{ orderLineId: returnLine.orderLineId, acceptedQuantity: 1, disposition: 'damaged', reason: 'Kiện bị hư hỏng' }],
    }), 200, 'ReturnCaseResponse');
    assert.equal(reviewed.refundObligation.amount, '0');
    const current = await stock();
    assert.equal(current.onHand, 0);
    assert.equal(current.quarantine, 1);
    assert.equal(current.transit, 0);
    assert.equal(await db.financeJournal.count({ where: { shopId, sourceId: shipment.id, eventType: 'delivery' } }), 0);
    const finalOrder = await json(await request(route('orders/' + order.id)), 200, 'OrderResponse');
    assert.equal(finalOrder.fulfillmentState, 'returned');
    assert.equal(finalOrder.amountDue.amount, '0');
});

test('SC2-A03, SC2-A04, SC2-A05, SC2-A06 and SC2-A08: shop policy, paired fallback, quiet hours, worker dedupe and assignment stop', async () => {
    const pairKey = randomUUID();
    const pairing = await json(await send('telegram-pairing', undefined, { key: pairKey }), 200, 'TelegramPairingResponse');
    assert.deepEqual(await json(await send('telegram-pairing', undefined, { key: pairKey }), 200, 'TelegramPairingResponse'), pairing);
    await json(await send('telegram-pairing'), 429, 'Problem');
    const callback = (shop, code = pairing.pairingCode, at) => acceptFixturePairing(db, auth, shop, code, randomUUID(), at);
    await assert.rejects(() => callback(shopB.id), { status: 409 });
    const badCode = pairing.pairingCode.slice(0, -1) + (pairing.pairingCode.endsWith('A') ? 'B' : 'A');
    await assert.rejects(() => callback(shopId, badCode), { status: 409 });
    await assert.rejects(() => callback(shopId, pairing.pairingCode, new Date(pairing.expiresAt)), { status: 409 });
    const paired = await callback(shopId);
    await assert.rejects(() => callback(shopId), { status: 409 });
    assert.equal(paired.status, 'active');
    assert.equal(paired.channel, 'telegram');
    const clock = new Intl.DateTimeFormat('en-GB', { timeZone: shopA.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const anchor = Date.now();
    const at = offset => new Date(anchor + offset * 60000);
    const readPolicy = () => request(route('notification-policy')).then(response => json(response, 200, 'NotificationPolicyResponse'));
    const initial = await readPolicy();
    const { version } = initial;
    const previous = Object.fromEntries(Object.entries(initial).filter(([field]) =>
        !['id', 'shopId', 'createdAt', 'updatedAt', 'version'].includes(field)));
    const update = input => send('notification-policy', input, { method: 'PUT' });
    const input = { ...previous, expectedVersion: version, enabled: true, remindAfterMinutes: 1, maxReminders: 2,
        primaryUserIds: [owner.userId], fallbackUserIds: [owner.userId], fallbackChannel: 'telegram',
        ...(previous.eventPriorities ? { eventPriorities: { ...previous.eventPriorities, order: 'normal' } } : {}),
        quietHours: { start: clock.format(at(-1)), end: clock.format(at(2)) }, urgentMayBypassQuietHours: true };
    await json(await update({ ...input, primaryUserIds: [other.userId] }), 422, 'Problem');
    await json(await update({ ...input, primaryUserIds: [viewer.userId] }), 422, 'Problem');
    const configured = await json(await update(input), 200, 'NotificationPolicyResponse');
    assert.equal(configured.version, version + 1);
    try {
        await json(await update(input), 412, 'Problem');
        const { prep } = await confirmedOrder(1);
        const notices = () => db.appNotification.findMany({ where: { shopId, workItemId: prep.workItemId }, orderBy: { createdAt: 'asc' } });
        const initialChannels = configured.eventPriorities ? [] : ['in_app'];
        assert.deepEqual((await notices()).map(notice => notice.channel), initialChannels);
        await dispatchPreparationNotifications(db, auth, at(1));
        assert.deepEqual((await notices()).map(notice => notice.channel), initialChannels);
        await Promise.all([dispatchPreparationNotifications(db, auth, at(3)), dispatchPreparationNotifications(db, auth, at(3))]);
        const delivered = await notices();
        assert.deepEqual(delivered.map(notice => notice.channel).sort(), ['in_app', 'telegram']);
        const deliveredTelegram = delivered.find(notice => notice.channel === 'telegram');
        assert.equal(deliveredTelegram.deliveryStatus, 'accepted_by_provider');
        assert.equal(deliveredTelegram.openedAt, null);
        assert.equal(deliveredTelegram.acknowledgedAt, null);
        await json(await request(route('notifications/' + deliveredTelegram.id, shopB), other), 404, 'Problem');
        const alert = await json(await request(route('notifications/' + deliveredTelegram.id)), 200, 'NotificationResponse');
        assert.ok(alert.allowedActions.includes('acknowledge'));
        const acknowledged = await json(await send('notifications/' + alert.id + '/acknowledge', { expectedVersion: alert.version }),
            200, 'NotificationResponse');
        assert.ok(acknowledged.openedAt && acknowledged.acknowledgedAt);
        assert.equal((await db.workItem.findUniqueOrThrow({ where: { shopId_id: { shopId, id: prep.workItemId } } })).state, 'queued');
        await json(await send('work-items/' + prep.workItemId + '/claim', { expectedVersion: prep.workItem.version }), 200, 'WorkItemResponse');
        await dispatchPreparationNotifications(db, auth, at(6));
        assert.equal((await notices()).length, 2);
        const stopped = await db.workNotificationSchedule.findUniqueOrThrow({ where: { shopId_workItemId: { shopId, workItemId: prep.workItemId } } });
        assert.equal(stopped.nextDueAt, null);
    } finally {
        await json(await update({ ...previous, expectedVersion: configured.version }), 200, 'NotificationPolicyResponse');
        await json(await send('devices/' + paired.id + '/revoke', { expectedVersion: paired.version }), 200, 'DeviceSubscriptionResponse');
    }
});

test('T070 order Web Push keeps the shop, work version and recipient current and recovers only the observation', async () => {
    const receiver = pushReceiver();
    const device = await json(await send('devices', { ...receiver.subscription, deviceName: 'Thiết bị nhận đơn thử' }), 201, 'DeviceSubscriptionResponse');
    const tested = await json(await send('devices/' + device.id + '/test', { expectedVersion: device.version }), 202, 'CommandResponse');
    const job = await db.job.findFirstOrThrow({ where: { shopId, commandId: tested.id } });
    const mock = async (endpoint, init) => {
        assert.equal(endpoint, receiver.subscription.endpoint);
        receiver.read(init, webPush);
        return new globalThis.Response(null, { status: 201 });
    };
    await runJob(db, { shopId, id: job.id, sourceOperation: 'testDevice' }, deviceTestHandler(auth, { db, webPush, request: mock }),
        async (tx, candidate, permission) => Boolean(await requireShopAccess(tx, candidate.actorId, shopId, permission)));
    const active = await json(await request(route('devices/' + device.id)), 200, 'DeviceSubscriptionResponse');
    assert.equal(active.status, 'active');
    const old = await json(await request(route('notification-policy')), 200, 'NotificationPolicyResponse');
    const previous = Object.fromEntries(Object.entries(old).filter(([field]) =>
        !['id', 'shopId', 'createdAt', 'updatedAt', 'version'].includes(field)));
    const update = (input) => send('notification-policy', input, { method: 'PUT' }).then(result => json(result, 200, 'NotificationPolicyResponse'));
    const policy = await update({ ...previous, expectedVersion: old.version, enabled: true, quietHours: null,
        primaryUserIds: [owner.userId], remindAfterMinutes: 1, maxReminders: 0, fallbackChannel: 'none', fallbackUserIds: [] });
    try {
        const queue = async () => {
            const order = await confirmedOrder(1);
            const now = new Date(Date.now() + 100);
            await dispatchPreparationNotifications(db, auth, now, { webPush });
            const notification = await db.appNotification.findFirstOrThrow({ where: {
                shopId, workItemId: order.prep.workItemId, channel: 'web_push',
            } });
            assert.equal(notification.deliveryStatus, 'queued');
            assert.equal(notification.pushDeviceId, device.id);
            assert.equal(notification.pushPolicyVersion, policy.version);
            assert.equal(notification.pushWorkVersion, order.prep.workItem.version);
            return { order, now, where: { shopId_id: { shopId, id: notification.id } }, notification };
        };
        const accepted = await queue();
        let calls = 0;
        const delivery = async (endpoint, init) => {
            calls++;
            assert.equal(endpoint, receiver.subscription.endpoint);
            assert.deepEqual(receiver.read(init, webPush), { eventId: accepted.notification.id, title: 'Đơn cần chuẩn bị',
                safeBody: 'Có công việc đang chờ nhận.', path: '/s/' + shopId + '/orders/' + accepted.notification.sourceId });
            return new globalThis.Response(null, { status: 201 });
        };
        await Promise.all([dispatchExternalNotifications(db, { webPush }, accepted.now, delivery),
            dispatchExternalNotifications(db, { webPush }, accepted.now, delivery)]);
        assert.equal(calls, 1);
        const recorded = await db.appNotification.findUniqueOrThrow({ where: accepted.where });
        assert.equal(recorded.deliveryStatus, 'accepted_by_provider');
        assert.equal(recorded.openedAt, null);
        assert.equal(recorded.acknowledgedAt, null);
        await json(await request(route('notifications/' + recorded.id, shopB), other), 404, 'Problem');
        const forbidden = async () => { calls++; throw new Error('Unexpected dispatch'); };

        const claimed = await queue();
        await json(await send('work-items/' + claimed.order.prep.workItemId + '/claim', {
            expectedVersion: claimed.order.prep.workItem.version,
        }), 200, 'WorkItemResponse');
        await dispatchExternalNotifications(db, { webPush }, claimed.now, forbidden);
        assert.equal((await db.appNotification.findUniqueOrThrow({ where: claimed.where })).deliveryStatus, 'failed');

        const interrupted = await queue();
        await db.appNotification.update({ where: interrupted.where, data: { deliveryStartedAt: new Date(interrupted.now.getTime() - 61_000) } });
        await dispatchExternalNotifications(db, { webPush }, interrupted.now, forbidden);
        assert.equal((await db.appNotification.findUniqueOrThrow({ where: interrupted.where })).deliveryStatus, 'unknown');

        const revoked = await queue();
        await json(await send('devices/' + device.id + '/revoke', { expectedVersion: active.version }), 200, 'DeviceSubscriptionResponse');
        await dispatchExternalNotifications(db, { webPush }, revoked.now, forbidden);
        assert.equal((await db.appNotification.findUniqueOrThrow({ where: revoked.where })).deliveryStatus, 'failed');
        assert.equal(calls, 1);
    } finally {
        await update({ ...previous, expectedVersion: policy.version });
    }
});

test('T070 Telegram verifies private pairing, suppresses replay and sends exactly one authorized fallback', async () => {
    const chat = '9123456789';
    const otherChat = '9123456790';
    const telegram = readTelegramConfig(telegramFixtureEnv([
        { shopId, userId: owner.userId, telegramUserId: chat }, { shopId: shopB.id, userId: other.userId, telegramUserId: otherChat },
    ]));
    const previousBase = base;
    const staging = await createApp({ database: new Database(readDatabaseUrl(process.env)), auth, webPush, telegram, quiet: true });
    await staging.listen(0, '127.0.0.1');
    base = await staging.getUrl() + '/api/v2';
    const readPolicy = () => request(route('notification-policy')).then(result => json(result, 200, 'NotificationPolicyResponse'));
    const updatePolicy = input => send('notification-policy', input, { method: 'PUT' }).then(result => json(result, 200, 'NotificationPolicyResponse'));
    const initial = await readPolicy();
    const previous = Object.fromEntries(Object.entries(initial).filter(([field]) => !['id', 'shopId', 'createdAt', 'updatedAt', 'version'].includes(field)));
    const policyInput = { ...previous, expectedVersion: initial.version, enabled: true, quietHours: null,
        primaryUserIds: [owner.userId], fallbackUserIds: [owner.userId], fallbackChannel: 'telegram', remindAfterMinutes: 1, maxReminders: 0 };
    let policy;
    try {
        await json(await send('notification-policy', policyInput, { method: 'PUT' }), 422, 'Problem');
        const pair = (options) => send('telegram-pairing', undefined, options).then(response => json(response, 200, 'TelegramPairingResponse'));
        const key = randomUUID();
        const pairedA = await pair({ key });
        assert.deepEqual(await pair({ key }), pairedA);
        assert.equal(pairedA.botUsername, telegram.botUsername);
        const webhook = async (input, secret = telegram.webhookSecret, expected = 200) => {
            const response = await fetch(base + '/integrations/telegram/updates', {
                method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': secret },
                body: JSON.stringify(input),
            });
            assert.equal(response.status, expected);
            await response.arrayBuffer();
        };
        const event = telegramStartUpdate(101, chat, pairedA.pairingCode);
        const pairingKey = { shopId_id: { shopId, id: pairedA.pairingCode.slice(0, 36) } };
        await webhook(event, randomUUID(), 404);
        await webhook(telegramStartUpdate(101, otherChat, pairedA.pairingCode));
        await webhook(telegramStartUpdate(101, chat, pairedA.pairingCode, 'supergroup'));
        assert.equal((await db.telegramPairing.findUniqueOrThrow({ where: pairingKey })).usedAt, null);
        await Promise.all([webhook(event), webhook(event), webhook(event)]);
        const one = await db.telegramPairing.findUniqueOrThrow({ where: pairingKey });
        assert.ok(one.usedAt);
        assert.equal(one.telegramUpdateId, 101n);
        const device = await db.notificationDevice.findFirstOrThrow({ where: { shopId, userId: owner.userId, telegramChatCiphertext: { not: null } } });
        assert.equal(device.status, 'active');
        assert.ok(!device.telegramChatCiphertext.includes(chat));
        assert.equal(await db.auditEntry.count({ where: { shopId, action: 'confirmTelegramPairing', requestId: one.id } }), 1);
        const pairedB = await pair({ shop: shopB, actor: other });
        await webhook(telegramStartUpdate(101, otherChat, pairedB.pairingCode));
        const pairingB = { shopId_id: { shopId: shopB.id, id: pairedB.pairingCode.slice(0, 36) } };
        assert.equal((await db.telegramPairing.findUniqueOrThrow({ where: pairingB })).usedAt, null);
        const memberB = { shopId_userId: { shopId: shopB.id, userId: other.userId } };
        const originalMembership = await admin.membership.findUniqueOrThrow({ where: memberB });
        await admin.membership.update({ where: memberB, data: { roles: ['viewer'], permissionVersion: { increment: 1 } } });
        try {
            await webhook(telegramStartUpdate(102, otherChat, pairedB.pairingCode));
            assert.equal((await db.telegramPairing.findUniqueOrThrow({ where: pairingB })).usedAt, null);
            await admin.membership.update({ where: memberB, data: { roles: originalMembership.roles, status: 'revoked',
                permissionVersion: { increment: 1 } } });
            await webhook(telegramStartUpdate(105, otherChat, pairedB.pairingCode));
            assert.equal((await db.telegramPairing.findUniqueOrThrow({ where: pairingB })).usedAt, null);
            console.log(JSON.stringify({ status: 'SC2_A08_PAIRING_AUTHORITY', roleRemovalBlocked: true, membershipRevocationBlocked: true }));
        } finally {
            const { roles, status } = originalMembership;
            await admin.membership.update({ where: memberB, data: { roles, status, permissionVersion: { increment: 1 } } });
        }
        const expired = await admin.telegramPairing.update({ where: pairingB,
            data: { createdAt: new Date(Date.now() - 10_000), expiresAt: new Date(Date.now() - 1000) } });
        await webhook(telegramStartUpdate(103, otherChat, telegramPairingCode(auth, expired)));
        assert.equal((await db.telegramPairing.findUniqueOrThrow({ where: pairingB })).usedAt, null);
        await json(await request(route('devices/' + device.id, shopB), other), 404, 'Problem');

        const providers = { telegram, appOrigin: auth.appOrigin };
        let calls = 0;
        const telegramSend = async (endpoint, init) => {
            calls++;
            assert.equal(endpoint, 'https://api.telegram.org/bot' + telegram.botToken + '/sendMessage');
            const payload = JSON.parse(init.body);
            assert.equal(payload.chat_id, chat);
            assert.equal(payload.protect_content, true);
            assert.match(payload.reply_markup.inline_keyboard[0][0].url, /\/s\/[a-f0-9-]+\/(notifications|orders\/[a-f0-9-]+)$/);
            assert.ok(!JSON.stringify(payload).includes('callback_data'));
            return new globalThis.Response(JSON.stringify({ ok: true, result: { chat: { id: Number(chat) }, message_id: calls } }));
        };
        const deviceCommand = await json(await send('devices/' + device.id + '/test', { expectedVersion: device.version }), 202, 'CommandResponse');
        const job = await db.job.findFirstOrThrow({ where: { shopId, commandId: deviceCommand.id } });
        await runJob(db, { shopId, id: job.id, sourceOperation: 'testDevice' }, deviceTestHandler(auth, { db, ...providers, request: telegramSend }),
            async (tx, candidate, permission) => Boolean(await requireShopAccess(tx, candidate.actorId, shopId, permission)));
        assert.equal((await json(await request(route('commands/' + deviceCommand.id)), 200, 'CommandResponse')).status, 'succeeded');

        policy = await updatePolicy(policyInput);
        const queue = async options => {
            const order = await confirmedOrder(1);
            const now = new Date(Date.now() + 100);
            await dispatchPreparationNotifications(db, auth, now, options);
            return { now, notices: () => db.appNotification.findMany({ where: { shopId, workItemId: order.prep.workItemId } }) };
        };
        const noPrimary = await queue(providers);
        assert.equal((await noPrimary.notices()).find(row => row.channel === 'telegram').deliveryStatus, 'queued');
        await Promise.all([dispatchExternalNotifications(db, providers, noPrimary.now, telegramSend),
            dispatchExternalNotifications(db, providers, noPrimary.now, telegramSend)]);
        const delivered = (await noPrimary.notices()).find(row => row.channel === 'telegram');
        assert.equal(delivered.deliveryStatus, 'accepted_by_provider');
        assert.equal(delivered.openedAt, null);
        assert.equal(delivered.acknowledgedAt, null);
        assert.equal(calls, 2);

        const budgets = await json(await request(route('budget-policies') + '?limit=10'), 200, 'BudgetPolicyListResponse');
        const alertBudget = budgets.find(entry => entry.kind === 'notification');
        assert.ok(Number(alertBudget.consumed.amount) > 0);
        const budgetKey = { shopId_id: { shopId, id: alertBudget.id } };
        const priorBudget = await admin.budgetPolicy.findUniqueOrThrow({ where: budgetKey });
        const requesterKey = { shopId_userId: { shopId, userId: viewer.userId } };
        const requester = await admin.membership.findUniqueOrThrow({ where: requesterKey });
        await admin.membership.update({ where: requesterKey, data: { roles: ['manager', 'accountant'], permissionVersion: { increment: 1 } } });
        try {
            const action = 'budget.change.daily';
            const { amount, currency } = alertBudget.consumed;
            const intentHash = createHash('sha256').update(JSON.stringify([action, shopId, alertBudget.id, alertBudget.version, amount, currency])).digest('hex');
            const approval = await json(await send('approvals', { action, resource: { type: 'budget_policy', id: alertBudget.id },
                resourceVersion: alertBudget.version, intentHash, reason: 'LIMIT ' + amount + ' ' + currency + '\nGiới hạn thông báo cho ca kiểm.',
            }, { actor: viewer }), 201, 'ApprovalResponse');
            const approved = await json(await send('approvals/' + approval.id + '/decision', {
                expectedVersion: approval.version, intentHash, decision: 'approve', reason: 'Kiểm giới hạn qua phê duyệt độc lập.',
            }), 200, 'ApprovalResponse');
            const applied = await json(await send('budget-policies/' + alertBudget.id, {
                expectedVersion: alertBudget.version, approvalId: approved.id, limitAmount: { amount, currency }, period: 'daily',
            }, { method: 'PUT' }), 200, 'BudgetPolicyResponse');
            assert.equal(applied.approvalId, approval.id);
            const limited = await queue(providers);
            assert.deepEqual((await limited.notices()).map(row => row.channel), ['in_app']);
            await dispatchExternalNotifications(db, providers, limited.now, telegramSend);
            assert.equal(calls, 2);
            console.log(JSON.stringify({ status: 'SC2_A08_NOTIFICATION_CAP', budgetExhausted: true,
                externalAttempts: 0, inAppAvailable: true, independentApproval: true }));
        } finally {
            const { limitAmount, period, approvalId } = priorBudget;
            await admin.budgetPolicy.update({ where: budgetKey, data: { limitAmount, period, approvalId } });
            await admin.membership.update({ where: requesterKey, data: { roles: requester.roles, permissionVersion: { increment: 1 } } });
        }

        const push = pushReceiver();
        const pushDevice = await json(await send('devices', { ...push.subscription, deviceName: 'Ưu tiên Push' }), 201, 'DeviceSubscriptionResponse');
        await admin.notificationDevice.update({ where: { shopId_id: { shopId, id: pushDevice.id } }, data: { status: 'active', lastVerifiedAt: new Date() } });
        for (const [status, expected] of [[429, 'failed'], [503, 'unknown']]) {
            const both = { ...providers, webPush };
            const news = await queue(both);
            assert.equal((await news.notices()).some(row => row.channel === 'telegram'), false);
            await dispatchExternalNotifications(db, both, news.now, async (endpoint, init) => {
                assert.equal(endpoint, push.subscription.endpoint);
                push.read(init, webPush);
                return new globalThis.Response(null, { status });
            });
            assert.equal((await news.notices()).find(row => row.channel === 'web_push').deliveryStatus, expected);
            await Promise.all([dispatchExternalNotifications(db, both, news.now, telegramSend),
                dispatchExternalNotifications(db, both, news.now, telegramSend)]);
            const backup = (await news.notices()).filter(row => row.channel === 'telegram');
            assert.equal(backup.length, status === 429 ? 1 : 0);
            if (status === 429) assert.equal(backup[0].deliveryStatus, 'accepted_by_provider');
        }
        assert.equal(calls, 3);
        const queuedBeforeRenewal = await queue(providers);
        const current = await json(await request(route('devices/' + device.id)), 200, 'DeviceSubscriptionResponse');
        await json(await send('devices/' + device.id + '/revoke', { expectedVersion: current.version }), 200, 'DeviceSubscriptionResponse');
        assert.equal((await db.notificationDevice.findFirstOrThrow({ where: { shopId, id: device.id } })).telegramChatCiphertext, null);
        await webhook(event);
        assert.equal((await db.notificationDevice.findFirstOrThrow({ where: { shopId, id: device.id } })).status, 'revoked');
        await admin.telegramPairing.update({ where: pairingKey, data: { createdAt: new Date(Date.now() - 11_000) } });
        const newGrant = await pair();
        await webhook(telegramStartUpdate(104, chat, newGrant.pairingCode));
        const renewed = await json(await request(route('devices/' + device.id)), 200, 'DeviceSubscriptionResponse');
        assert.equal(renewed.status, 'active');
        await dispatchExternalNotifications(db, providers, queuedBeforeRenewal.now, telegramSend);
        assert.equal((await queuedBeforeRenewal.notices()).find(row => row.channel === 'telegram').deliveryStatus, 'failed');
        assert.equal(calls, 3);
        await json(await send('devices/' + device.id + '/revoke', { expectedVersion: renewed.version }), 200, 'DeviceSubscriptionResponse');
        await json(await send('devices/' + pushDevice.id + '/revoke', { expectedVersion: pushDevice.version }), 200, 'DeviceSubscriptionResponse');
    } finally {
        if (policy) await updatePolicy({ ...previous, expectedVersion: policy.version });
        base = previousBase;
        await staging.close();
    }
});

test('SC2-B05 and SC2-C07: versioned combo pricing is validated at sale and historical net value drives partial returns', async () => {
    await openPeriod();
    const { variants: [first, second, unvalued] } = await product(shopA, owner, 3, ['100.01', '201.02', '50']);
    await fillStock(first, 4);
    await fillStock(second, 3);
    await fillStock(unvalued, 1, shopA.defaultWarehouseId, '0');
    const input = { name: 'Kiểm combo ' + randomUUID(), startsOn: '2020-01-01', endsOn: '2100-01-01',
        lines: [first, second].map(variant => ({ variantId: variant.id, quantity: 1 })), discountAmount: '10.0001', minMarginPercent: 20 };
    const { variants: [foreign] } = await product(shopB, other);
    await json(await send('promotions', { ...input, lines: [input.lines[0], input.lines[0]] }), 422, 'Problem');
    await json(await send('promotions', { ...input, lines: [input.lines[0], { variantId: foreign.id, quantity: 1 }] }), 422, 'Problem');
    await json(await send('promotions', { ...input, discountAmount: '0.0000' }), 422, 'Problem');
    await json(await send('promotions', input, { actor: viewer }), 403, 'Problem');
    const createKey = randomUUID();
    const row = await json(await send('promotions', input, { key: createKey }), 201, 'PromotionResponse');
    assert.equal(row.status, 'draft');
    assert.equal((await json(await send('promotions', input, { key: createKey }), 201, 'PromotionResponse')).id, row.id);
    const decide = (promo, action, options) => send('promotions/' + promo.id + '/decision', { action, reason: 'Kiểm phiên bản và hiệu lực' },
        { method: 'PATCH', version: promo.version, ...options });
    const edit = (promo, changes, options) => send('promotions/' + promo.id, { ...input, ...changes },
        { method: 'PATCH', version: promo.version, ...options });
    await json(await edit(row, {}, { shop: shopB, actor: other }), 404, 'Problem');
    await json(await decide(row, 'activate', { version: undefined }), 428, 'Problem');
    const revised = await json(await edit(row, { name: input.name + ' dùng thử' }), 200, 'PromotionResponse');
    await json(await decide(row, 'activate'), 412, 'Problem');
    const active = await json(await decide(revised, 'activate'), 200, 'PromotionResponse');
    await json(await edit(active, {}), 409, 'Problem');
    const activeRead = await json(await request(route('promotions') + '?' + new URLSearchParams({ effective: 'yes', q: row.id })),
        200, 'PromotionListResponse');
    assert.deepEqual(activeRead.map(promo => promo.id), [row.id]);

    const buyer = await customer();
    const lines = [{ variantId: first.id, quantity: 3 }, { variantId: second.id, quantity: 2 }];
    const selected = draft(buyer, first, { lines, promotionId: row.id });
    await json(await send('orders', { ...selected, lines: [lines[0]] }), 422, 'Problem');
    await json(await send('orders', { ...selected, lines: [{ ...lines[0], quantity: 5 }, lines[1]] }), 409, 'Problem');
    const initial = await json(await send('orders', selected), 201, 'OrderResponse');
    const before = await quote(initial);
    assert.equal(before.promotion.version, active.version);
    const proof = await evidence(initial, before, buyer.conversation);
    const unpaid = await json(await send('orders', { ...selected, paymentMethod: 'prepay' }), 201, 'OrderResponse');
    const paused = await json(await decide(active, 'pause'), 200, 'PromotionResponse');
    await json(await send('orders', selected), 409, 'Problem');
    await json(await confirm(initial, before, proof), 409, 'Problem');
    const tooDeep = await json(await edit(paused, { discountAmount: '300', minMarginPercent: 90 }), 200, 'PromotionResponse');
    const marginFailure = await json(await decide(tooDeep, 'activate'), 200, 'PromotionResponse');
    await json(await send('orders', selected), 409, 'Problem');
    const marginPaused = await json(await decide(marginFailure, 'pause'), 200, 'PromotionResponse');
    const newTerms = await json(await edit(marginPaused, {}), 200, 'PromotionResponse');
    const restored = await json(await decide(newTerms, 'activate'), 200, 'PromotionResponse');
    await json(await confirm(initial, before, proof), 409, 'Problem');
    const stalePay = await observePayment(unpaid.id, unpaid.total.amount, 'bank_receipt');
    await json(await send('orders/' + unpaid.id + '/pay', {
        expectedVersion: unpaid.version, amount: unpaid.total, method: 'bank_transfer', reference: stalePay.reference,
        reason: 'Khoản thu cho phiên bản cũ', evidenceRef: stalePay.id,
    }), 409, 'Problem');

    const future = await json(await send('promotions', { ...input, startsOn: '2099-01-01' }), 201, 'PromotionResponse');
    await json(await decide(future, 'activate'), 200, 'PromotionResponse');
    await json(await send('orders', { ...selected, promotionId: future.id }), 409, 'Problem');
    const expired = await json(await send('promotions', { ...input, startsOn: '2000-01-01', endsOn: '2001-01-01' }), 201, 'PromotionResponse');
    await json(await decide(expired, 'activate'), 409, 'Problem');
    const unknownCost = await json(await send('promotions', { ...input, lines: [input.lines[0], { variantId: unvalued.id, quantity: 1 }] }),
        201, 'PromotionResponse');
    await json(await decide(unknownCost, 'activate'), 200, 'PromotionResponse');
    await json(await send('orders', { ...selected, promotionId: unknownCost.id, lines: [lines[0], { variantId: unvalued.id, quantity: 1 }] }),
        409, 'Problem');

    const priced = await quote(initial);
    assert.equal(priced.promotion.version, restored.version);
    assert.equal(priced.total.amount, '692.0699');
    assert.equal(priced.promotion.discount.amount, input.discountAmount);
    const firstDiscount = new ExactDecimal('10.0001').mul('100.01').div('301.03').toDecimalPlaces(18);
    assert.equal(priced.lines[0].discount.amount, firstDiscount.toFixed());
    assert.equal(new ExactDecimal(priced.lines[1].discount.amount).plus(firstDiscount).toFixed(), '10.0001');
    await json(await confirm(initial, priced, await evidence(initial, priced, buyer.conversation)), 202, 'CommandResponse');
    const readOrder = () => request(route('orders/' + initial.id)).then(response => json(response, 200, 'OrderResponse'));
    const confirmed = await readOrder();
    assert.deepEqual(confirmed.promotion, priced.promotion);
    assert.ok(confirmed.promotionAppliedAt);
    const prep = await db.prepJob.findUniqueOrThrow({ where: { shopId_orderId: { shopId, orderId: initial.id } }, include: { workItem: true } });
    await packOrder(confirmed, prep);
    const shipment = await json(await send('shipments', { orderId: initial.id, warehouseId: initial.warehouseId, carrierId: null,
        orderLineIds: confirmed.lines.map(line => line.id) }), 201, 'ShipmentResponse');
    const path = 'shipments/' + shipment.id;
    await json(await send(path + '/handover', { expectedVersion: shipment.version }), 202, 'CommandResponse');
    const handed = await json(await request(route(path)), 200, 'ShipmentResponse');
    await json(await send(path + '/events', await observeShipment(handed, 'delivered')), 200, 'ShipmentResponse');
    const sold = await readOrder();
    const collected = await observePayment(sold.id, sold.total.amount, 'carrier_collection');
    await json(await send('orders/' + sold.id + '/pay', {
        expectedVersion: sold.version, amount: sold.total, method: 'external', reference: collected.reference,
        reason: 'Đối chứng hãng thu đơn có giảm', evidenceRef: collected.id,
    }), 202, 'CommandResponse');
    const disabled = await json(await decide(restored, 'pause'), 200, 'PromotionResponse');
    await json(await edit(disabled, { discountAmount: '50' }), 200, 'PromotionResponse');
    const orderLineId = priced.lines[0].id;
    let sum = new ExactDecimal(0);
    for (let portion = 1; portion <= 3; portion++) {
        const record = await json(await send('returns', { orderId: sold.id, reason: 'Hoàn một phần dòng có combo', lines: [{ orderLineId, quantity: 1 }] }),
            201, 'ReturnCaseResponse');
        const accepted = await json(await send('returns/' + record.id + '/inspect', {
            expectedVersion: record.version, lines: [{ orderLineId, acceptedQuantity: 1, disposition: 'sellable', reason: 'Đã kiểm mặt hàng combo' }],
        }), 200, 'ReturnCaseResponse');
        sum = sum.plus(accepted.refundObligation.amount);
        assert.equal(sum.toFixed(), proportionalAmount(new ExactDecimal(priced.lines[0].lineTotal.amount), portion, 3).toFixed());
        assert.equal(await db.financeJournal.count({ where: { shopId, sourceId: record.id, sourceType: 'return_case', eventType: 'inspect' } }), 1);
    }
    const after = await readOrder();
    assert.equal(after.fulfillmentState, 'part_returned');
    assert.deepEqual(after.promotion, priced.promotion);
    assert.equal(after.lines[0].lineTotal.amount, sum.toFixed());
    assert.equal(after.refundedAmount.amount, '0');
    assert.equal(await db.auditEntry.count({ where: { shopId, resourceId: row.id, action: 'createPromotion' } }), 1);
});
