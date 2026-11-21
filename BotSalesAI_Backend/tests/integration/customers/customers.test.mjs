import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { URLSearchParams } from 'node:url';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createContractValidator, schemaFromContract } from '../../../apps/api/dist/http/contracts.js';
import { customerForChannelIdentity, snapshotAddress } from '../../../apps/api/dist/modules/customers/index.js';
import { readAuthConfig } from '../../../apps/api/dist/modules/workspace/index.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { serializable } from '../../../apps/api/dist/platform/database/transactions.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { assertFixtureDatabase, fixtureSession } from '../workspace/session-fixture.mjs';

const [shopA, shopB] = fixtureShops;
const path = (shop, resource) => '/shops/' + shop.id + '/' + resource;
const { components } = JSON.parse(readFileSync(new URL('../../../../botsales-kit/contracts/openapi.json', import.meta.url)));
const validator = createContractValidator(components.schemas);
let app, db, origin, base, ownerA, ownerB, reader;

before(async () => {
    const url = readDatabaseUrl(process.env);
    assertFixtureDatabase(url);
    const auth = readAuthConfig(process.env);
    assert.ok(auth);
    origin = auth.appOrigin;
    const database = new Database(url);
    db = database.client;
    [ownerA, ownerB, reader] = await Promise.all(['p0-editor', 'p0-editor-b', 'p0-reader'].map(subject => fixtureSession(db, subject)));
    app = await createApp({ database, auth, quiet: true });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl() + '/api/v2';
    for (const actor of [ownerA, ownerB, reader]) {
        actor.csrf = (await read('/session', actor, 200, 'SessionResponse')).data.csrfToken;
    }
});

after(async () => {
    const ids = [ownerA, ownerB, reader].filter(Boolean).map(actor => actor.id);
    if (ids.length) await db.session.updateMany({ where: { id: { in: ids } }, data: { revokedAt: new Date() } });
    await app?.close();
});

function read(route, actor, status, schema) {
    return send(route, actor, status, schema);
}

async function send(route, actor, status, schema, method = 'GET', body, headers) {
    const response = await fetch(base + route, {
        method,
        headers: {
            cookie: actor.cookie, ...(method === 'GET' ? {} : {
                origin, 'content-type': 'application/json', 'x-csrf-token': actor.csrf, 'idempotency-key': randomUUID(), ...headers,
            }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    assert.equal(response.status, status, route);
    const value = await response.json();
    const validate = validator.compile(schemaFromContract(schema));
    assert.equal(validate(value), true, JSON.stringify(validate.errors));
    assert.equal(value.meta?.requestId ?? value.requestId, response.headers.get('x-request-id'));
    return value;
}

function newCustomer(shop, actor, displayName = 'Khách thử ' + randomUUID()) {
    return send(path(shop, 'customers'), actor, 201, 'CustomerResponse', 'POST',
        { displayName, phone: '+84 (90) 123-4567', email: 'example@BOTSALES.TEST', notes: 'Hồ sơ tổng hợp' }).then(body => body.data);
}

const address = {
    label: 'Địa chỉ thử', recipient: 'Người nhận thử', phone: '090-222-3333', line1: 'Đường tổng hợp 1',
    ward: null, district: null, province: 'Hà Nội', postalCode: null, countryCode: 'VN',
};

test('SC2-G04: customer search and identity never merge same name or different pages', async () => {
    const name = 'Tên giống nhau ' + randomUUID();
    const [first, second] = await Promise.all([newCustomer(shopA, ownerA, name), newCustomer(shopA, ownerA, name)]);
    assert.notEqual(first.id, second.id);
    assert.equal(first.phone, '+84901234567');
    assert.equal(first.email, 'example@botsales.test');
    const q = new URLSearchParams({ q: name, limit: '1' });
    const listing = path(shopA, 'customers') + '?';
    const firstPage = await read(listing + q, ownerA, 200, 'CustomerListResponse');
    assert.ok(firstPage.page.nextCursor);
    q.set('cursor', firstPage.page.nextCursor);
    const secondPage = await read(listing + q, ownerA, 200, 'CustomerListResponse');
    assert.deepEqual(new Set([firstPage.data[0].id, secondPage.data[0].id]), new Set([first.id, second.id]));
    await read(path(shopB, 'customers/' + first.id), ownerB, 404, 'Problem');
    await read(path(shopA, 'customers/' + first.id), reader, 403, 'Problem');
    const reference = { channel: 'messenger', pageId: randomUUID(), externalId: randomUUID(), displayName: name };
    const identify = (shop, data = reference) => serializable(db, tx => customerForChannelIdentity(tx, shop.id, data), true);
    const [matched1, matched2] = await Promise.all([identify(shopA), identify(shopA)]);
    const nextPage = await identify(shopA, { ...reference, pageId: randomUUID() });
    const otherShop = await identify(shopB);
    assert.equal(matched1, matched2);
    assert.equal(new Set([matched1, nextPage, otherShop, first.id, second.id]).size, 5);
});

test('SC2-C05-ADDRESS: addresses are scoped to their customer, snapshots stay immutable and protected values cannot be read or written', async () => {
    const [customer, other] = await Promise.all([newCustomer(shopA, ownerA), newCustomer(shopA, ownerA)]);
    const route = path(shopA, 'customers/' + customer.id + '/addresses');
    const { data: created } = await send(route, ownerA, 201, 'CustomerAddressResponse', 'POST', address);
    assert.equal(created.phone, '0902223333');
    assert.equal((await read(route, ownerA, 200, 'CustomerAddressListResponse')).data[0].id, created.id);
    await read(path(shopA, 'customers/' + other.id + '/addresses/' + created.id), ownerA, 404, 'Problem');
    const snap = () => db.$transaction(tx => snapshotAddress(tx, shopA.id, customer.id, created.id));
    const saved = await snap();
    assert.equal(saved.data.line1, address.line1);
    assert.equal((await snap()).id, saved.id);
    const detail = route + '/' + created.id;
    await send(detail, ownerA, 428, 'Problem', 'PATCH', { line1: 'Đường tổng hợp 2' });
    await send(detail, ownerA, 200, 'CustomerAddressResponse', 'PATCH', { line1: 'Đường tổng hợp 2' }, { 'if-match': '"1"' });
    await send(detail, ownerA, 412, 'Problem', 'PATCH', { line1: 'Đường tổng hợp 3' }, { 'if-match': '"1"' });
    assert.equal((await snap()).data.line1, 'Đường tổng hợp 2');
    assert.equal((await db.addressSnapshot.findUniqueOrThrow({ where: { shopId_id: { shopId: shopA.id, id: saved.id } } })).data.line1, address.line1);
    const customerPath = path(shopA, 'customers/' + customer.id);
    await send(customerPath, ownerA, 200, 'CustomerResponse', 'PATCH', { notes: 'Ghi chú đã sửa' }, { 'if-match': '"1"' });
    await db.customer.update({
        where: { shopId_id: { shopId: shopA.id, id: customer.id } }, data: { redactedFields: ['addresses', 'phone', 'email'] },
    });
    const { data: hidden } = await read(detail, ownerA, 200, 'CustomerAddressResponse');
    assert.equal(hidden.phone, null);
    assert.equal(hidden.line1, null);
    assert.equal(hidden.label, null);
    assert.ok(hidden.redactedFields.includes('line1'));
    assert.deepEqual((await read(route + '?' + new URLSearchParams({ q: address.label }), ownerA, 200, 'CustomerAddressListResponse')).data, []);
    const { data: redacted } = await read(customerPath, ownerA, 200, 'CustomerResponse');
    assert.equal(redacted.phone, null);
    assert.equal(redacted.email, null);
    await send(customerPath, ownerA, 403, 'Problem', 'PATCH', { phone: '012345678' }, { 'if-match': '"2"' });
    await send(detail, ownerA, 403, 'Problem', 'PATCH', { line1: 'Đường bị cấm' }, { 'if-match': '"2"' });
    await assert.rejects(snap(), error => error.getStatus() === 403);
    const { data: receipt } = await send(detail + '/archive', ownerA, 202, 'CommandResponse', 'POST',
        { expectedVersion: 2, reason: 'Địa chỉ đã ngừng dùng' });
    assert.equal(receipt.status, 'succeeded');
    assert.equal((await read(detail, ownerA, 200, 'CustomerAddressResponse')).data.status, 'archived');
});

test('SC2-G04: service case uses current customer scope and expected version for transitions', async () => {
    const customer = await newCustomer(shopA, ownerA);
    const foreign = await newCustomer(shopB, ownerB);
    const route = path(shopA, 'service-cases');
    const body = { customerId: customer.id, orderId: null, kind: 'question', summary: 'Yêu cầu thử' };
    await send(route, ownerA, 404, 'Problem', 'POST', { ...body, customerId: foreign.id });
    const { data: created } = await send(route, ownerA, 201, 'ServiceCaseResponse', 'POST', body);
    assert.equal(created.state, 'open');
    assert.ok((await read(route, ownerA, 200, 'ServiceCaseListResponse')).data.some(item => item.id === created.id));
    await read(path(shopB, 'service-cases/' + created.id), ownerB, 404, 'Problem');
    const status = route + '/' + created.id + '/status';
    await send(status, ownerA, 200, 'ServiceCaseResponse', 'POST', { expectedVersion: 1, state: 'resolved', reason: 'Đã trao đổi' });
    await send(status, ownerA, 412, 'Problem', 'POST', { expectedVersion: 1, state: 'closed', reason: 'Đã xử lý' });
    await send(status, ownerA, 200, 'ServiceCaseResponse', 'POST', { expectedVersion: 2, state: 'closed', reason: 'Đã xử lý' });
    assert.equal((await read(route + '/' + created.id, ownerA, 200, 'ServiceCaseResponse')).data.state, 'closed');
});
