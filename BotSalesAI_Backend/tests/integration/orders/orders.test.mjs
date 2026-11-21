import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { URLSearchParams } from 'node:url';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createContractValidator, schemaFromContract } from '../../../apps/api/dist/http/contracts.js';
import { recordStockMovement } from '../../../apps/api/dist/modules/inventory/index.js';
import { expireOrdersWithReservations } from '../../../apps/api/dist/modules/orders/index.js';
import { readAuthConfig } from '../../../apps/api/dist/modules/workspace/index.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { serializable } from '../../../apps/api/dist/platform/database/transactions.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { assertFixtureDatabase, fixtureSession } from '../workspace/session-fixture.mjs';
import { fixtureWriter, orderConversation, quoteEvidenceFixture } from './fixtures.mjs';

const { components } = JSON.parse(readFileSync(new URL('../../../../botsales-kit/contracts/openapi.json', import.meta.url)));
const validator = createContractValidator(components.schemas);
const [shopA, shopB] = fixtureShops;
const shopId = shopA.id;
const route = (resource, shop = shopA) => '/shops/' + shop.id + '/' + resource;
let app, db, admin, base, origin, owner, other, viewer;

before(async () => {
    const url = readDatabaseUrl(process.env);
    assertFixtureDatabase(url);
    const auth = readAuthConfig(process.env);
    assert.ok(auth);
    origin = auth.appOrigin;
    const database = new Database(url);
    db = database.client;
    admin = fixtureWriter();
    [owner, other, viewer] = await Promise.all(['p0-editor', 'p0-editor-b', 'p0-reader'].map(subject => fixtureSession(db, subject)));
    app = await createApp({ database, auth, quiet: true });
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

async function product(shop = shopA, actor = owner, variantCount = 1) {
    const name = 'BE11-' + randomUUID();
    return json(await send('products', {
        name, description: '', categoryId: null, status: 'active', imageFileIds: [],
        variants: Array.from({ length: variantCount }, (_, index) => ({
            sku: name + '-' + index, name: 'Biến thể ' + index, options: {}, active: true,
            price: { amount: '9007199254740993.000000000000000001', currency: shop.currency },
        })),
    }, { shop, actor }), 201, 'ProductResponse');
}

async function fillStock(variant, quantity = 1, warehouseId = shopA.defaultWarehouseId) {
    return serializable(db, tx => recordStockMovement(tx, {
        shopId, actorId: owner.userId, warehouseId, variantId: variant.id, kind: 'receipt',
        source: { type: 'fixture_receipt', id: randomUUID() }, reason: 'Nhập hàng cho kiểm thử đơn',
        delta: { onHand: quantity }, receivedValue: '10.01',
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
    await json(await send('shipping-policy', { rules: [{ ...rules[0], amount: '30000' }] }, { method: 'PUT', version: policy.version }),
        200, 'ShippingPolicyResponse');
    await json(await send('orders/' + order.id + '/customer-confirmations', stale), 409, 'Problem');
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

test('SC-024 and SC-026: price changes invalidate quote and expiry atomically cancels and releases held stock', async () => {
    const original = await product();
    const [variant] = original.variants;
    await fillStock(variant);
    const client = await customer();
    const order = await json(await send('orders', draft(client, variant)), 201, 'OrderResponse');
    const stale = await quote(order);
    const priorEvidence = await evidence(order, stale, client.conversation);
    const { id, sku, options, name, active } = variant;
    await json(await send('products/' + original.id, { variants: [{ id, sku, options, name, active, price: { amount: '123.456', currency: 'VND' } }] },
        { method: 'PATCH', version: original.version }), 200, 'ProductResponse');
    await json(await confirm(order, stale, priorEvidence), 409, 'Problem');
    const revised = await quote(order);
    const currentProof = await evidence(order, revised, client.conversation);
    await json(await confirm(order, revised, currentProof), 202, 'CommandResponse');
    const hold = await db.stockReservation.findFirstOrThrow({ where: { shopId, orderId: order.id } });
    const later = new Date(hold.expiresAt.getTime() + 1);
    await Promise.all([expireOrdersWithReservations(db, later), expireOrdersWithReservations(db, later)]);
    const expired = await json(await request(route('orders/' + order.id)), 200, 'OrderResponse');
    assert.equal(expired.orderState, 'cancelled');
    assert.equal(expired.fulfillmentState, 'unfulfilled');
    assert.equal(await db.auditEntry.count({ where: { shopId, action: 'expireOrderReservation', resourceId: order.id } }), 1);
    assert.equal(await db.stockMovement.count({ where: { shopId, sourceId: hold.id, kind: 'release' } }), 1);
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
