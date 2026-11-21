import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { URLSearchParams } from 'node:url';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createContractValidator, schemaFromContract } from '../../../apps/api/dist/http/contracts.js';
import { expireStockReservations, recordStockMovement, reserveStock, settleStockReservation } from '../../../apps/api/dist/modules/inventory/index.js';
import { readAuthConfig } from '../../../apps/api/dist/modules/workspace/index.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { serializable } from '../../../apps/api/dist/platform/database/transactions.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { assertFixtureDatabase, fixtureSession } from '../workspace/session-fixture.mjs';

const { components } = JSON.parse(readFileSync(new URL('../../../../botsales-kit/contracts/openapi.json', import.meta.url)));
const validator = createContractValidator(components.schemas);
const [shopA, shopB] = fixtureShops;
const shopId = shopA.id;
const route = (resource, shop = shopA) => '/shops/' + shop.id + '/' + resource;
let app, db, base, origin, owner, other, warehouseUser, previousRoles;

before(async () => {
    const url = readDatabaseUrl(process.env);
    assertFixtureDatabase(url);
    const auth = readAuthConfig(process.env);
    assert.ok(auth);
    origin = auth.appOrigin;
    const database = new Database(url);
    db = database.client;
    [owner, other, warehouseUser] = await Promise.all(['p0-editor', 'p0-editor-b', 'p0-reader'].map(subject => fixtureSession(db, subject)));
    const member = { shopId_userId: { shopId, userId: warehouseUser.userId } };
    previousRoles = (await db.membership.findUniqueOrThrow({ where: member })).roles;
    await db.membership.update({ where: member, data: { roles: ['warehouse'], permissionVersion: { increment: 1 } } });
    app = await createApp({ database, auth, quiet: true });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl() + '/api/v2';
    for (const actor of [owner, other, warehouseUser]) actor.csrf = (await json(await request('/session', actor), 200, 'SessionResponse')).csrfToken;
});

after(async () => {
    if (previousRoles) await db.membership.update({
        where: { shopId_userId: { shopId, userId: warehouseUser.userId } },
        data: { roles: previousRoles, permissionVersion: { increment: 1 } },
    });
    const ids = [owner, other, warehouseUser].filter(Boolean).map(actor => actor.id);
    if (ids.length) await db.session.updateMany({ where: { id: { in: ids } }, data: { revokedAt: new Date() } });
    await app?.close();
});

function request(path, actor, options = {}) {
    return fetch(base + path, { ...options, headers: { cookie: actor.cookie, ...options.headers } });
}

async function json(response, status, schema) {
    assert.equal(response.status, status);
    const body = await response.json();
    const validate = validator.compile(schemaFromContract(schema));
    assert.equal(validate(body), true, JSON.stringify(validate.errors));
    return schema === 'Problem' ? body : body.data;
}

function mutate(path, actor, body, { key = randomUUID(), method = 'POST', headers } = {}) {
    return request(path, actor, {
        method, body: JSON.stringify(body),
        headers: { origin, 'idempotency-key': key, 'content-type': 'application/json', 'x-csrf-token': actor.csrf, ...headers },
    });
}

function tx(action) {
    return serializable(db, action, true);
}

async function product(count = 1) {
    const sku = 'BE09-' + randomUUID();
    const variants = Array.from({ length: count }, (_, index) => ({
        sku: sku + '-' + index, name: 'Biến thể ' + index, options: {}, active: true, price: { currency: 'VND', amount: '12000' },
    }));
    return json(await mutate(route('products'), owner, {
        name: sku, description: '', categoryId: null, status: 'active', imageFileIds: [], variants,
    }), 201, 'ProductResponse');
}

function receipt(variantId, quantity, value, warehouseId = shopA.defaultWarehouseId) {
    return {
        shopId, warehouseId, variantId, actorId: owner.userId, kind: 'receipt',
        source: { type: 'fixture_receipt', id: randomUUID() }, reason: 'Nhận hàng fixture',
        delta: { onHand: quantity }, receivedValue: value,
    };
}

function stockInput(variants, quantities, now = Date.now()) {
    return {
        shopId, actorId: owner.userId, orderId: randomUUID(), orderVersion: 1, expiresAt: new Date(now + 60000),
        lines: variants.map((variant, index) => ({
            lineId: randomUUID(), variantId: variant.id, warehouseId: shopA.defaultWarehouseId, quantity: quantities[index],
        })),
    };
}

function balance(variantId, warehouseId = shopA.defaultWarehouseId) {
    return db.stockPosition.findUniqueOrThrow({ where: { shopId_warehouseId_variantId: { shopId, warehouseId, variantId } } });
}

function domainConflict(error) {
    return error.getStatus?.() === 409;
}

test('SC2-C05-WAREHOUSE: warehouse writes are owned by authorised users and keep tenant, version and archive history', async () => {
    const name = 'Kho phụ ' + randomUUID();
    const body = { code: 'OUT-' + randomUUID().slice(0, 8), name, addressLine: 'Địa chỉ fixture' };
    const key = randomUUID();
    await json(await mutate(route('warehouses'), warehouseUser, body), 403, 'Problem');
    const created = await json(await mutate(route('warehouses'), owner, body, { key }), 201, 'WarehouseResponse');
    assert.equal((await json(await mutate(route('warehouses'), owner, body, { key }), 201, 'WarehouseResponse')).id, created.id);
    await json(await mutate(route('warehouses'), owner, { ...body, code: body.code.toLowerCase() }), 409, 'Problem');
    const path = 'warehouses/' + created.id;
    await json(await request(route(path, shopB), other), 404, 'Problem');
    const detail = await request(route(path), warehouseUser);
    assert.equal(detail.headers.get('etag'), '"1"');
    assert.equal((await json(detail, 200, 'WarehouseResponse')).status, 'active');
    const patch = { addressLine: 'Địa chỉ mới fixture' };
    await json(await mutate(route(path), owner, patch, { method: 'PATCH' }), 428, 'Problem');
    const update = await mutate(route(path), owner, patch, { method: 'PATCH', headers: { 'if-match': '"1"' } });
    assert.equal(update.headers.get('etag'), '"2"');
    assert.equal((await json(update, 200, 'WarehouseResponse')).addressLine, patch.addressLine);
    await json(await mutate(route(path), owner, patch, { method: 'PATCH', headers: { 'if-match': '"1"' } }), 412, 'Problem');
    await json(await mutate(route('warehouses/' + shopA.defaultWarehouseId + '/archive'), owner, {
        expectedVersion: 1, reason: 'Thử ngừng kho mặc định',
    }), 409, 'Problem');
    const archive = { expectedVersion: 2, reason: 'Dừng kho thử nghiệm' };
    const archiveKey = randomUUID();
    const archiveRequest = () => mutate(route(path + '/archive'), owner, archive, { key: archiveKey });
    const command = await json(await archiveRequest(), 202, 'CommandResponse');
    assert.equal((await json(await archiveRequest(), 202, 'CommandResponse')).id, command.id);
    assert.equal((await json(await request(route(path), owner), 200, 'WarehouseResponse')).status, 'archived');
    const list = await json(await request(route('warehouses') + '?' + new URLSearchParams({ q: body.code, status: 'archived', limit: '1' }),
        warehouseUser), 200, 'WarehouseListResponse');
    assert.deepEqual(list.map(item => item.id), [created.id]);
    assert.equal(await db.auditEntry.count({ where: { shopId, resourceId: created.id, action: 'archiveWarehouse' } }), 1);
    assert.equal(await db.outboxEvent.count({ where: { shopId, eventType: 'warehouse.updated', payload: { path: ['resourceId'], equals: created.id } } }), 3);
});

test('SC2-D01 and SC-021: ledger is append-only, earlier variants have positions and cost is permission-scoped', async () => {
    const { variants: [variant] } = await product();
    const initial = await balance(variant.id);
    assert.equal(initial.onHand, 0);
    const incoming = receipt(variant.id, 3, '20.01');
    const posted = await tx(t => recordStockMovement(t, incoming));
    assert.equal((await tx(t => recordStockMovement(t, incoming))).id, posted.id);
    await assert.rejects(tx(t => recordStockMovement(t, { ...incoming, delta: { onHand: 4 } })), domainConflict);
    await tx(t => recordStockMovement(t, {
        ...incoming, kind: 'adjustment', source: { type: 'fixture_adjustment', id: randomUUID() },
        delta: { quarantine: 2, inbound: 5 }, receivedValue: undefined,
    }));
    await assert.rejects(tx(t => recordStockMovement(t, { ...incoming, source: { ...incoming.source, id: randomUUID() },
        warehouseId: shopB.defaultWarehouseId,
    })), error => error.getStatus?.() === 404);
    const q = '?' + new URLSearchParams({ q: variant.sku, warehouseId: shopA.defaultWarehouseId, variantId: variant.id, status: 'in_stock' });
    const [snapshot] = await json(await request(route('inventory') + q, owner), 200, 'StockSnapshotListResponse');
    assert.deepEqual([snapshot.onHand, snapshot.reserved, snapshot.available, snapshot.quarantine, snapshot.inbound], [3, 0, 3, 2, 5]);
    assert.deepEqual(snapshot.unitCost, { amount: '6.67', currency: 'VND' });
    const [redacted] = await json(await request(route('inventory') + q, warehouseUser), 200, 'StockSnapshotListResponse');
    assert.equal(redacted.unitCost, null);
    assert.equal(redacted.carryingValue, null);
    assert.deepEqual(await json(await request(route('inventory', shopB) + q, other), 200, 'StockSnapshotListResponse'), []);
    const movements = await json(await request(route('inventory/movements') + '?q=' + variant.sku, warehouseUser), 200, 'StockMovementListResponse');
    assert.equal(movements.length, 2);
    assert.doesNotMatch(JSON.stringify(movements), /requestHash|carryingDelta/);
    await assert.rejects(db.$executeRaw`UPDATE stock_movements SET reason = 'changed' WHERE id = ${posted.id}::uuid`, /permission denied/i);
    await assert.rejects(db.$executeRaw`UPDATE stock_positions SET reserved = on_hand + 1 WHERE id = ${initial.id}::uuid`, /stock_positions_nonnegative/i);
});

test('SC-019: 100 contenders for the last unit have one winner, release and consume each write once', async () => {
    const { variants: [variant] } = await product();
    await tx(t => recordStockMovement(t, receipt(variant.id, 1, '9007199254740993.000000000000000001')));
    const inputs = Array.from({ length: 100 }, () => stockInput([variant], [1]));
    const attempts = await Promise.allSettled(inputs.map(input => tx(t => reserveStock(t, input))));
    const won = attempts.flatMap((attempt, index) => attempt.status === 'fulfilled' ? [{ record: attempt.value, input: inputs[index] }] : []);
    assert.equal(won.length, 1);
    const unexpected = attempts.flatMap(attempt => attempt.status === 'rejected' && !domainConflict(attempt.reason)
        ? [attempt.reason.code ?? attempt.reason.name] : []);
    assert.deepEqual(unexpected, []);
    const { record, input } = won[0];
    assert.equal((await tx(t => reserveStock(t, input))).id, record.id);
    assert.equal((await balance(variant.id)).reserved, 1);
    const settle = { shopId, id: record.id, actorId: owner.userId, expectedVersion: 1, status: 'released', reason: 'Đơn fixture đã huỷ' };
    assert.equal((await tx(t => settleStockReservation(t, settle))).status, 'released');
    assert.equal((await tx(t => settleStockReservation(t, settle))).status, 'released');
    assert.equal((await balance(variant.id)).reserved, 0);
    const next = await tx(t => reserveStock(t, stockInput([variant], [1])));
    const handover = { ...settle, id: next.id, status: 'consumed', reason: 'Đã bàn giao đơn fixture' };
    await tx(t => settleStockReservation(t, handover));
    await tx(t => settleStockReservation(t, handover));
    const current = await balance(variant.id);
    assert.deepEqual([current.onHand, current.reserved, current.transit], [0, 0, 1]);
    const ledger = await db.stockMovement.findMany({ where: { shopId, variantId: variant.id } });
    const totals = ledger.reduce((sum, row) => ({
        onHand: sum.onHand + row.quantityDelta, reserved: sum.reserved + row.reservedDelta, transit: sum.transit + row.transitDelta,
    }), { onHand: 0, reserved: 0, transit: 0 });
    assert.deepEqual(totals, { onHand: current.onHand, reserved: current.reserved, transit: current.transit });
    assert.equal(ledger.filter(entry => entry.kind === 'release').length, 1);
    assert.equal(ledger.filter(entry => entry.kind === 'fulfillment').length, 1);
    assert.equal(ledger.find(entry => entry.kind === 'fulfillment').carryingDelta.toFixed(), '-9007199254740993.000000000000000001');
});

test('SC-019 and SC-020: multi-SKU failure rolls back, stale movements and expired holds are fenced', async () => {
    const { variants } = await product(2);
    const [first, second] = [...variants].sort((a, b) => a.id.localeCompare(b.id));
    const posted = receipt(first.id, 2, '1');
    await tx(t => recordStockMovement(t, posted));
    const bundle = stockInput([second, first], [1, 1]);
    await assert.rejects(tx(t => reserveStock(t, bundle)), domainConflict);
    assert.equal((await balance(first.id)).reserved, 0);
    assert.equal(await db.stockReservation.count({ where: { shopId, orderId: bundle.orderId } }), 0);
    assert.equal(await db.stockMovement.count({ where: { shopId, variantId: first.id, kind: 'reserve' } }), 0);
    const when = new Date();
    const soon = { ...stockInput([first], [2]), expiresAt: new Date(when.getTime() + 1000) };
    const hold = await tx(t => reserveStock(t, soon, when));
    const adjustment = { ...posted, kind: 'adjustment', source: { type: 'fixture_adjustment', id: randomUUID() }, delta: { onHand: -1 }, receivedValue: undefined };
    await assert.rejects(tx(t => recordStockMovement(t, adjustment)), domainConflict);
    await assert.rejects(tx(t => recordStockMovement(t, { ...adjustment, expectedVersion: 1 })), domainConflict);
    await assert.rejects(tx(t => recordStockMovement(t, { ...adjustment, delta: { onHand: 1 } })),
        error => error.getStatus?.() === 422);
    const afterExpiry = new Date(soon.expiresAt.getTime() + 1);
    const consume = { shopId, id: hold.id, actorId: owner.userId, expectedVersion: 1, status: 'consumed', reason: 'Bàn giao sau hạn' };
    await assert.rejects(tx(t => settleStockReservation(t, consume, afterExpiry)), domainConflict);
    await Promise.all([expireStockReservations(db, afterExpiry), expireStockReservations(db, afterExpiry)]);
    assert.equal((await db.stockReservation.findUniqueOrThrow({ where: { shopId_id: { shopId, id: hold.id } } })).status, 'expired');
    assert.equal(await db.stockMovement.count({ where: { shopId, sourceId: hold.id, kind: 'release' } }), 1);
    const updated = await balance(first.id);
    assert.deepEqual([updated.onHand, updated.reserved, updated.transit], [2, 0, 0]);
    const signed = await tx(t => recordStockMovement(t, { ...adjustment, expectedVersion: updated.version }));
    assert.equal(signed.carryingDelta.toFixed(), '-0.5');
    assert.equal((await balance(first.id)).carryingValue.toFixed(), '0.5');
});

test('SC2-C05-WAREHOUSE: a warehouse or variant with stock cannot be archived', async () => {
    const { id, version, variants: [occupied, kept] } = await product(2);
    const warehouse = await json(await mutate(route('warehouses'), owner, {
        name: 'Kho có hàng', code: 'BUSY-' + randomUUID().slice(0, 8), addressLine: 'Địa chỉ fixture',
    }), 201, 'WarehouseResponse');
    await tx(t => recordStockMovement(t, receipt(occupied.id, 1, '1', warehouse.id)));
    await json(await mutate(route('warehouses/' + warehouse.id + '/archive'), owner, {
        expectedVersion: 1, reason: 'Thử khi kho còn hàng',
    }), 409, 'Problem');
    await json(await mutate(route('products/' + id + '/archive'), owner, {
        expectedVersion: version, reason: 'Thử khi SKU còn hàng',
    }), 409, 'Problem');
    const { sku, name, options, price, active } = kept;
    await json(await mutate(route('products/' + id), owner, {
        variants: [{ id: kept.id, sku, name, options, price, active }],
    }, { method: 'PATCH', headers: { 'if-match': '"' + version + '"' } }), 409, 'Problem');
    const unchanged = await json(await request(route('products/' + id), owner), 200, 'ProductResponse');
    assert.equal(unchanged.version, version);
    assert.deepEqual(unchanged.variants.map(item => item.id), [occupied.id, kept.id]);
});

test('SC2-C05-WAREHOUSE: adding stock and archiving the same warehouse cannot both succeed', async () => {
    const { variants: [variant] } = await product();
    const warehouse = await json(await mutate(route('warehouses'), owner, {
        name: 'Kho kiểm cạnh tranh', code: 'RACE-' + randomUUID().slice(0, 8), addressLine: 'Địa chỉ fixture',
    }), 201, 'WarehouseResponse');
    const results = await Promise.allSettled([
        tx(t => recordStockMovement(t, receipt(variant.id, 1, '1', warehouse.id))),
        mutate(route('warehouses/' + warehouse.id + '/archive'), owner, { expectedVersion: 1, reason: 'Kiểm cạnh tranh' }),
    ]);
    const [move, archive] = results;
    assert.equal(archive.status, 'fulfilled');
    const archived = archive.value.status === 202;
    assert.equal(archive.value.status, archived ? 202 : 409);
    await archive.value.body.cancel();
    assert.equal(move.status, archived ? 'rejected' : 'fulfilled');
    if (move.status === 'rejected') assert.ok(domainConflict(move.reason));
    const current = await json(await request(route('warehouses/' + warehouse.id), owner), 200, 'WarehouseResponse');
    assert.equal(current.status, archived ? 'archived' : 'active');
    const count = await db.stockMovement.count({ where: { shopId, warehouseId: warehouse.id, variantId: variant.id } });
    assert.equal(count, archived ? 0 : 1);
});
