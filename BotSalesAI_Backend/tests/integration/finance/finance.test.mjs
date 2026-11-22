import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { URLSearchParams } from 'node:url';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createContractValidator, schemaFromContract } from '../../../apps/api/dist/http/contracts.js';
import { fixtureAccounts } from '../../../apps/api/dist/modules/finance/account-policy.js';
import { bookInspectedReturn, financeJobHandlers, localAccountingDate } from '../../../apps/api/dist/modules/finance/index.js';
import { manualCarrierId } from '../../../apps/api/dist/modules/finance/debts.js';
import { periodIntent } from '../../../apps/api/dist/modules/finance/period-data.js';
import { readAuthConfig, requireShopAccess } from '../../../apps/api/dist/modules/workspace/index.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { runJob } from '../../../apps/api/dist/platform/jobs/index.js';
import { ExactDecimal } from '../../../apps/api/dist/platform/money/index.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { assertFixtureDatabase, fixtureSession } from '../workspace/session-fixture.mjs';
import { fixtureWriter, orderConversation, quoteEvidenceFixture } from '../orders/fixtures.mjs';
import { deliveredDebt, independentReceipt } from './fixtures.mjs';

const { components } = JSON.parse(readFileSync(new URL('../../../../botsales-kit/contracts/openapi.json', import.meta.url)));
const validator = createContractValidator(components.schemas);
const [shopA, shopB] = fixtureShops;
const shopId = shopA.id;
const path = (resource, shop = shopA) => '/shops/' + shop.id + '/' + resource;
const today = localAccountingDate(new Date(), shopA.timezone);
const syntheticScopes = [];
let app, db, admin, origin, base, owner, other, restricted, priorRoles;

before(async () => {
    const connection = readDatabaseUrl(process.env);
    assertFixtureDatabase(connection);
    const auth = readAuthConfig(process.env);
    assert.ok(auth);
    origin = auth.appOrigin;
    const database = new Database(connection);
    db = database.client;
    admin = fixtureWriter();
    [owner, other, restricted] = await Promise.all(['p0-editor', 'p0-editor-b', 'p0-reader'].map(subject => fixtureSession(db, subject)));
    const where = { shopId_userId: { shopId, userId: restricted.userId } };
    priorRoles = (await db.membership.findUniqueOrThrow({ where })).roles;
    await db.membership.update({ where, data: { roles: ['manager'], permissionVersion: { increment: 1 } } });
    app = await createApp({ database, auth, quiet: true });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl() + '/api/v2';
    for (const actor of [owner, other, restricted]) actor.csrf = (await json(await request('/session', actor), 200, 'SessionResponse')).csrfToken;
    await ensurePeriod(shopA, today);
});

after(async () => {
    if (priorRoles) await db.membership.update({
        where: { shopId_userId: { shopId, userId: restricted.userId } },
        data: { roles: priorRoles, permissionVersion: { increment: 1 } },
    });
    if (syntheticScopes.length) await db.membership.updateMany({
        where: { shopId: { in: syntheticScopes }, userId: owner.userId },
        data: { status: 'revoked', permissionVersion: { increment: 1 } },
    });
    const ids = [owner, other, restricted].filter(Boolean).map(actor => actor.id);
    if (ids.length) await db.session.updateMany({ where: { id: { in: ids } }, data: { revokedAt: new Date() } });
    await admin?.$disconnect();
    await app?.close();
});

function request(route, actor = owner, options = {}) {
    return fetch(base + route, { ...options, headers: { cookie: actor.cookie, ...options.headers } });
}

async function json(response, expected, schema) {
    assert.equal(response.status, expected);
    const data = await response.json();
    const validate = validator.compile(schemaFromContract(schema));
    assert.equal(validate(data), true, JSON.stringify(validate.errors));
    assert.equal(data.meta?.requestId ?? data.requestId, response.headers.get('x-request-id'));
    return schema === 'Problem' ? data : data.data;
}

function send(resource, body, { shop = shopA, actor = owner, method = 'POST', key = randomUUID(), version } = {}) {
    return request(path(resource, shop), actor, {
        method, body: JSON.stringify(body),
        headers: {
            origin, 'content-type': 'application/json', 'idempotency-key': key, 'x-csrf-token': actor.csrf,
            ...(version === undefined ? {} : { 'if-match': '"' + version + '"' }),
        },
    });
}

function money(amount, shop = shopA) {
    return { currency: shop.currency, amount };
}

async function ensurePeriod(shop, date, actor = owner) {
    const day = new Date(date + 'T00:00:00.000Z');
    const existing = await db.accountingPeriod.findFirst({ where: { shopId: shop.id, startDate: { lte: day }, endDate: { gte: day } } });
    if (existing) {
        assert.equal(existing.state, 'open');
        return existing;
    }
    return json(await send('periods', { startDate: date, endDate: date, reason: 'Kỳ dữ liệu tổng hợp' },
        { shop, actor }), 201, 'AccountingPeriodResponse');
}

async function fixedAccount(systemKey, shop = shopA) {
    return db.financeAccount.findUniqueOrThrow({ where: { shopId_systemKey: { shopId: shop.id, systemKey } } });
}

function lines(debit, credit, amount, shop = shopA) {
    return [
        { accountId: debit.id, debit: money(amount, shop), credit: money('0', shop), description: 'Nợ tài khoản thử' },
        { accountId: credit.id, debit: money('0', shop), credit: money(amount, shop), description: 'Có tài khoản thử' },
    ];
}

async function product(shop = shopA) {
    const sku = 'BE12-' + randomUUID();
    const response = await send('products', {
        name: sku, description: '', categoryId: null, status: 'active', imageFileIds: [],
        variants: [{ sku, active: true, name: 'Mặc định', options: {}, price: money('15000.01', shop) }],
    }, { shop });
    return (await json(response, 201, 'ProductResponse')).variants[0];
}

async function openingShop() {
    const shop = { ...shopA, id: randomUUID(), name: 'Mở sổ fixture ' + randomUUID().slice(0, 8), defaultWarehouseId: randomUUID() };
    syntheticScopes.push(shop.id);
    await admin.$transaction(async tx => {
        await tx.$executeRaw`SET CONSTRAINTS "shops_default_warehouse_fkey" DEFERRED`;
        await tx.shop.create({ data: shop });
        await tx.warehouse.create({ data: { shopId: shop.id, id: shop.defaultWarehouseId, code: 'OPENING', name: 'Kho mở sổ', addressLine: 'Fixture' } });
        await tx.membership.create({ data: { shopId: shop.id, userId: owner.userId, status: 'active', roles: ['owner'] } });
        await tx.financeAccount.createMany({ data: fixtureAccounts.map(account => ({ ...account, shopId: shop.id })) });
    });
    return shop;
}

test('SC2-C05-ACCOUNT and SC2-E01: accounts, periods and balanced journals are scoped, versioned and replaceable through reversal', async () => {
    const code = 'TEST-' + randomUUID().slice(0, 8).toUpperCase();
    const accountInput = { code, name: 'Tài khoản ca kiểm', group: 'asset' };
    await json(await send('finance/accounts', accountInput, { actor: restricted }), 403, 'Problem');
    const account = await json(await send('finance/accounts', accountInput), 201, 'AccountResponse');
    assert.equal(account.used, false);
    await json(await request(path('finance/accounts/' + account.id, shopB), other), 404, 'Problem');
    const updated = await json(await send('finance/accounts/' + account.id, { name: 'Đổi tên' }, {
        method: 'PATCH', version: account.version,
    }), 200, 'AccountResponse');
    await json(await send('finance/accounts/' + account.id, { name: 'Bản cũ' }, { method: 'PATCH', version: account.version }), 412, 'Problem');
    const period = await ensurePeriod(shopA, today);
    await json(await send('periods', { startDate: today, endDate: today, reason: 'Kỳ trùng' }), 409, 'Problem');
    assert.equal((await json(await request(path('periods/' + period.id)), 200, 'AccountingPeriodResponse')).state, 'open');
    assert.ok((await json(await request(path('periods') + '?limit=100'), 200, 'AccountingPeriodListResponse')).some(item => item.id === period.id));
    const equity = await fixedAccount('owner_capital');
    const amount = '9007199254740993.000000000000000001';
    const entryLines = lines(account, equity, amount);
    const input = { sourceType: 'manual', sourceId: 'finance-' + randomUUID(), effectiveDate: today, lines: entryLines, reason: 'Kiểm bút toán cân bằng' };
    await json(await send('journals', { ...input, lines: [entryLines[0], { ...entryLines[1], credit: money('1') }] }), 422, 'Problem');
    const wrongAccount = await fixedAccount('owner_capital', shopB);
    await json(await send('journals', { ...input, lines: lines(account, wrongAccount, amount) }), 422, 'Problem');
    const draft = await json(await send('journals', input), 201, 'JournalResponse');
    assert.equal(draft.status, 'draft');
    assert.equal((await json(await send('journals', input), 201, 'JournalResponse')).id, draft.id);
    const [result] = await Promise.all([
        json(await send('journals/' + draft.id + '/post', { expectedVersion: draft.version }), 202, 'CommandResponse'),
    ]);
    assert.deepEqual(result.result, { type: 'journal', id: draft.id });
    const posted = await json(await request(path('journals/' + draft.id)), 200, 'JournalResponse');
    assert.equal(posted.lines[0].debit.amount, amount);
    await assert.rejects(db.$executeRaw`UPDATE finance_journals SET reason = 'Thay lý do' WHERE shop_id = ${shopId}::uuid AND id = ${draft.id}::uuid`,
        /immutable/i);
    const used = await json(await request(path('finance/accounts/' + account.id)), 200, 'AccountResponse');
    assert.equal(used.used, true);
    await json(await send('finance/accounts/' + account.id, { group: 'expense' }, { method: 'PATCH', version: updated.version }), 409, 'Problem');
    const reverseBody = { expectedVersion: posted.version, reason: 'Đảo bút toán kiểm thử' };
    const reverseKey = randomUUID();
    const reversed = await json(await send('journals/' + draft.id + '/reverse', reverseBody, { key: reverseKey }), 202, 'CommandResponse');
    assert.equal((await json(await send('journals/' + draft.id + '/reverse', reverseBody, { key: reverseKey }), 202, 'CommandResponse')).id, reversed.id);
    assert.equal(await db.financeJournal.count({ where: { reversalOf: draft.id, shopId } }), 1);
    const swap = await json(await send('journals', { ...input, replacesJournalId: draft.id }), 201, 'JournalResponse');
    assert.equal(swap.sourceRevision, 1);
    assert.equal(swap.replacesJournalId, draft.id);
    const all = await json(await request(path('journals') + '?limit=100'), 200, 'JournalListResponse');
    assert.ok(all.some(item => item.id === draft.id && item.status === 'reversed'));
    await json(await send('finance/accounts/' + account.id + '/archive', { expectedVersion: used.version, reason: 'Ngừng tài khoản thử' }),
        202, 'CommandResponse');
    const accounts = await json(await request(path('finance/accounts') + '?' + new URLSearchParams({ status: 'archived', q: code })),
        200, 'AccountListResponse');
    assert.deepEqual(accounts.map(row => row.id), [account.id]);
    await json(await send('journals/' + swap.id + '/post', { expectedVersion: swap.version }), 422, 'Problem');
});

test('SC2-E01: opening inventory matches ledger, posts once, and ledger totals span the full page window', async () => {
    const shop = await openingShop();
    await ensurePeriod(shop, today);
    const variant = await product(shop);
    const inventory = await fixedAccount('inventory', shop);
    const equity = await fixedAccount('owner_capital', shop);
    const scope = { shop };
    const draft = {
        effectiveDate: today, policyVersion: '1', reason: 'Mở sổ thử nghiệm',
        lines: lines(inventory, equity, '20.02', shop),
        inventory: [{ variantId: variant.id, warehouseId: shop.defaultWarehouseId, quantity: 2, unitCost: money('10.01', shop) }],
    };
    await json(await send('finance/opening-balances', { ...draft, lines: lines(inventory, equity, '2', shop) }, scope), 422, 'Problem');
    const beginning = await json(await send('finance/opening-balances', draft, scope), 201, 'OpeningBalanceResponse');
    const resource = 'finance/opening-balances/' + beginning.id;
    const saved = await json(await send(resource, { ...draft, reason: 'Mở sổ theo chứng từ kiểm thử' }, {
        ...scope, method: 'PUT', version: beginning.version,
    }), 200, 'OpeningBalanceResponse');
    assert.equal((await json(await request(path(resource, shop)), 200, 'OpeningBalanceResponse')).version, saved.version);
    const key = randomUUID();
    const payload = { expectedVersion: saved.version };
    const posted = await json(await send(resource + '/post', payload, { ...scope, key }), 202, 'CommandResponse');
    assert.equal((await json(await send(resource + '/post', payload, { ...scope, key }), 202, 'CommandResponse')).id, posted.id);
    const list = await json(await request(path('finance/opening-balances', shop)), 200, 'OpeningBalanceListResponse');
    assert.equal(list[0].status, 'posted');
    assert.ok(list[0].journalId);
    assert.equal(await db.stockMovement.count({ where: { shopId: shop.id, sourceId: beginning.id } }), 1);
    await json(await send('finance/opening-balances', draft, scope), 409, 'Problem');
    const query = new URLSearchParams({
        from: today + 'T00:00:00+07:00', to: today + 'T23:59:59+07:00', timezone: shop.timezone, limit: '1',
    });
    const first = await json(await request(path('finance/ledger', shop) + '?' + query), 200, 'LedgerResponse');
    assert.equal(first.entries.length, 1);
    assert.equal(first.totalDebit.amount, '20.02');
    assert.equal(first.totalCredit.amount, '20.02');
    assert.ok(first.page.nextCursor);
    query.set('cursor', first.page.nextCursor);
    const second = await json(await request(path('finance/ledger', shop) + '?' + query), 200, 'LedgerResponse');
    assert.equal(second.entries.length, 1);
    assert.notEqual(second.entries[0].id, first.entries[0].id);
    assert.equal(second.entries[0].balance.amount, '0');
    query.delete('cursor');
    query.set('accountId', inventory.id);
    const accountLedger = await json(await request(path('finance/ledger', shop) + '?' + query), 200, 'LedgerResponse');
    assert.equal(accountLedger.closingBalance.amount, '20.02');
});

test('SC2-E01 and SC-020: adjustment and finance entries obey period and journal rules with full rollback', async () => {
    const variant = await product();
    const position = await db.stockPosition.findUniqueOrThrow({
        where: { shopId_warehouseId_variantId: { shopId, warehouseId: shopA.defaultWarehouseId, variantId: variant.id } },
    });
    const adjustment = {
        warehouseId: shopA.defaultWarehouseId, variantId: variant.id, quantityDelta: 2,
        expectedVersion: position.version, unitCost: money('10.01'), reason: 'Kiểm chứng đối ứng tồn kho',
    };
    const asset = await fixedAccount('inventory_gain');
    await admin.financeAccount.update({ where: { shopId_id: { shopId, id: asset.id } }, data: { status: 'archived' } });
    try {
        await json(await send('inventory/adjustments', adjustment), 409, 'Problem');
        assert.equal(await db.stockMovement.count({ where: { shopId, variantId: variant.id } }), 0);
        assert.equal((await db.stockPosition.findUniqueOrThrow({ where: { shopId_id: { shopId, id: position.id } } })).onHand, 0);
    } finally {
        await admin.financeAccount.update({ where: { shopId_id: { shopId, id: asset.id } }, data: { status: 'active' } });
    }
    const stockKey = randomUUID();
    const receipt = await json(await send('inventory/adjustments', adjustment, { key: stockKey }), 202, 'CommandResponse');
    assert.equal((await json(await send('inventory/adjustments', adjustment, { key: stockKey }), 202, 'CommandResponse')).id, receipt.id);
    const movement = await db.stockMovement.findUniqueOrThrow({ where: { shopId_id: { shopId, id: receipt.result.id } } });
    assert.equal(movement.carryingDelta.toFixed(), '20.02');
    assert.equal(await db.financeJournal.count({ where: { shopId, sourceType: 'stock_adjustment', sourceId: movement.id } }), 1);
    await json(await send('inventory/adjustments', adjustment), 412, 'Problem');

    const sourceRef = { type: 'manual', id: randomUUID() };
    const data = { kind: 'receipt', classification: 'capital', amount: money('139.01'), occurredAt: new Date().toISOString(), description: 'Phiếu vốn thử', sourceRef };
    const draft = await json(await send('finance/entries', data), 201, 'FinanceEntryResponse');
    const resource = 'finance/entries/' + draft.id;
    const edited = await json(await send(resource, { description: 'Phiếu vốn đã sửa' }, { method: 'PATCH', version: draft.version }),
        200, 'FinanceEntryResponse');
    await json(await send(resource + '/post', { expectedVersion: edited.version, reason: 'Ghi phiếu vốn' }), 202, 'CommandResponse');
    const posted = await json(await request(path(resource)), 200, 'FinanceEntryResponse');
    assert.equal(posted.status, 'posted');
    const duplicate = await json(await send('finance/entries', data), 201, 'FinanceEntryResponse');
    await json(await send('finance/entries/' + duplicate.id + '/post', { expectedVersion: duplicate.version, reason: 'Thử nguồn trùng' }), 409, 'Problem');
    await json(await send(resource + '/reverse', { expectedVersion: posted.version, reason: 'Đảo phiếu vốn thử' }), 202, 'CommandResponse');
    const reversed = await json(await request(path('finance/entries') + '?status=reversed&q=' + sourceRef.id), 200, 'FinanceEntryListResponse');
    assert.deepEqual(reversed.map(item => item.id), [draft.id]);

    const isolated = await openingShop();
    const period = await ensurePeriod(isolated, today);
    const pending = await json(await send('finance/entries', { ...data, sourceRef: null }, { shop: isolated }), 201, 'FinanceEntryResponse');
    await admin.accountingPeriod.update({ where: { shopId_id: { shopId: isolated.id, id: period.id } }, data: { state: 'closed' } });
    await json(await send('finance/entries/' + pending.id + '/post', { expectedVersion: pending.version, reason: 'Kỳ đã khóa' }, { shop: isolated }), 409, 'Problem');
    assert.equal(await db.financeJournal.count({ where: { shopId: isolated.id } }), 0);
});

async function paymentFixtures() {
    const buyer = await json(await send('customers', { displayName: 'Khách kiểm thanh toán', phone: '0901111222', email: null, notes: '' }),
        201, 'CustomerResponse');
    const address = await json(await send('customers/' + buyer.id + '/addresses', {
        label: 'Địa chỉ A', recipient: 'Khách kiểm thanh toán', phone: '0901111222', line1: 'Căn số A',
        ward: null, district: null, postalCode: null, province: 'Hà Nội', countryCode: 'VN',
    }), 201, 'CustomerAddressResponse');
    const { conversation } = await orderConversation(admin, shopId, buyer.id);
    const variant = await product();
    await json(await send('inventory/adjustments', {
        warehouseId: shopA.defaultWarehouseId, variantId: variant.id, quantityDelta: 2, expectedVersion: 1, unitCost: money('1'), reason: 'Tồn thử thanh toán',
    }), 202, 'CommandResponse');
    const draft = {
        customerId: buyer.id, conversationId: conversation.id, warehouseId: shopA.defaultWarehouseId, notes: '',
        lines: [{ variantId: variant.id, quantity: 1 }], shippingAddressId: address.id, paymentMethod: 'prepay',
    };
    return { draft, variant, conversation };
}

async function observation(orderId, amount, kind = 'bank_receipt') {
    const instant = new Date();
    return admin.paymentEvidence.create({ data: {
        shopId, orderId, kind, amount, currency: shopA.currency, reference: 'CHECK-' + randomUUID(), observedAt: instant, verifiedAt: instant,
    } });
}

test('SC2-E05: prepay uses verified observations, partial totals and one receipt, while carrier collection changes no bank journal', async () => {
    const { draft, conversation } = await paymentFixtures();
    const prepay = await json(await send('orders', draft), 201, 'OrderResponse');
    const resource = 'orders/' + prepay.id;
    const proofFor = async () => {
        const offer = await json(await send(resource + '/quote'), 200, 'OrderQuoteResponse');
        const proof = await quoteEvidenceFixture(admin, offer, conversation);
        const recorded = await json(await send(resource + '/customer-confirmations', proof), 200, 'CustomerConfirmationResponse');
        return { expectedVersion: offer.orderVersion, quoteId: offer.id, customerConfirmationId: recorded.id };
    };
    await json(await send(resource + '/confirm', await proofFor()), 409, 'Problem');
    const first = await observation(prepay.id, '5000');
    const initial = { expectedVersion: prepay.version, amount: money('5000'), method: 'bank_transfer', reference: first.reference,
        reason: 'Xác minh khoản thu thử', evidenceRef: first.id };
    await json(await send(resource + '/pay', { ...initial, evidenceRef: randomUUID() }), 422, 'Problem');
    const key = randomUUID();
    const received = await json(await send(resource + '/pay', initial, { key }), 202, 'CommandResponse');
    assert.equal((await json(await send(resource + '/pay', initial, { key }), 202, 'CommandResponse')).id, received.id);
    const partial = await json(await request(path(resource)), 200, 'OrderResponse');
    assert.equal(partial.paymentState, 'part_paid');
    assert.deepEqual(partial.amountDue, money('10000.01'));
    assert.deepEqual(partial.cashReceived, money('5000'));
    await json(await send(resource + '/pay', { ...initial, expectedVersion: partial.version }), 409, 'Problem');
    const rest = await observation(prepay.id, '10000.01');
    await json(await send(resource + '/pay', { ...initial, expectedVersion: partial.version, amount: money('10000.01'),
        reference: rest.reference, evidenceRef: rest.id }), 202, 'CommandResponse');
    const paid = await json(await request(path(resource)), 200, 'OrderResponse');
    assert.equal(paid.paymentState, 'verified');
    assert.deepEqual(paid.amountDue, money('0'));
    await json(await send(resource + '/confirm', await proofFor()), 202, 'CommandResponse');
    assert.equal(await db.financeJournal.count({ where: { shopId, sourceType: 'order_payment', sourceId: { in: [first.id, rest.id] } } }), 2);
    const confirmed = await json(await request(path(resource)), 200, 'OrderResponse');
    const refund = await observation(prepay.id, '5000', 'observed_refund');
    const refusal = { expectedVersion: confirmed.version, amount: money('5001'), paymentReference: refund.reference, evidenceRef: refund.id,
        reason: 'Đã quan sát khoản hoàn' };
    await json(await send(resource + '/refund', refusal), 422, 'Problem');
    const refundKey = randomUUID();
    const returned = await json(await send(resource + '/refund', { ...refusal, amount: money('5000') }, { key: refundKey }),
        202, 'CommandResponse');
    assert.equal((await json(await send(resource + '/refund', { ...refusal, amount: money('5000') }, { key: refundKey }),
        202, 'CommandResponse')).id, returned.id);
    const returnedOrder = await json(await request(path(resource)), 200, 'OrderResponse');
    assert.equal(returnedOrder.paymentState, 'part_refunded');
    assert.deepEqual(returnedOrder.refundedAmount, money('5000'));

    const cod = await json(await send('orders', { ...draft, paymentMethod: 'cod' }), 201, 'OrderResponse');
    const collected = await observation(cod.id, '15000.01', 'carrier_collection');
    const codInput = { ...initial, expectedVersion: cod.version, amount: money('15000.01'), method: 'external',
        reference: collected.reference, evidenceRef: collected.id };
    await json(await send('orders/' + cod.id + '/pay', codInput), 409, 'Problem');
    await admin.salesOrder.update({ where: { shopId_id: { shopId, id: cod.id } }, data: { fulfillmentState: 'delivered', orderState: 'confirmed' } });
    await json(await send('orders/' + cod.id + '/pay', codInput), 202, 'CommandResponse');
    const collectedOrder = await json(await request(path('orders/' + cod.id)), 200, 'OrderResponse');
    assert.equal(collectedOrder.paymentState, 'cod_collected');
    assert.deepEqual(collectedOrder.amountDue, money('0'));
    assert.deepEqual(collectedOrder.cashReceived, money('0'));
    assert.equal(await db.financeJournal.count({ where: { shopId, sourceId: collected.id } }), 0);
});

test('SC2-C06-FINANCE and SC2-E07: reports use posted sources, and versioned closing requires one current approval to reopen', async () => {
    const shop = await openingShop();
    const { id: shopId } = shop;
    const period = await ensurePeriod(shop, today);
    const [bank, cash, inventory, capital, sales, costs, expenses] = await Promise.all([
        'bank', 'cash', 'inventory', 'owner_capital', 'sales', 'cost_of_goods', 'operating_expense',
    ].map(account => fixedAccount(account, shop)));
    const draft = (debit, credit, amount) => send('journals', {
        sourceType: 'manual_report_proof', sourceId: randomUUID(), effectiveDate: today,
        reason: 'Chứng từ kiểm thử báo cáo', lines: lines(debit, credit, amount, shop),
    }, { shop }).then(response => json(response, 201, 'JournalResponse'));
    const post = journal => send('journals/' + journal.id + '/post', { expectedVersion: journal.version }, { shop })
        .then(response => json(response, 202, 'CommandResponse'));
    const closePath = 'periods/' + period.id + '/close';
    const postDraft = await draft(inventory, capital, '500000');
    const pending = await json(await request(path('periods/' + period.id, shop)), 200, 'AccountingPeriodResponse');
    assert.deepEqual(pending.blockingIssues, ['Còn bút toán nháp.']);
    await json(await send(closePath, { expectedVersion: period.version }, { shop }), 409, 'Problem');
    await post(postDraft);
    const deposit = await draft(bank, sales, '249000');
    await post(deposit);
    await post(await draft(costs, inventory, '169000'));
    const from = new Date(Date.now() - 86400000).toISOString();
    const to = new Date(Date.now() + 86400000).toISOString();
    const window = '?' + new URLSearchParams({ from, to, timezone: shop.timezone });
    const read = (resource, schema) => request(path(resource, shop)).then(response => json(response, 200, schema));
    const profit = await read('finance/profit-loss' + window, 'ProfitLossResponse');
    assert.deepEqual(profit.grossProfit, money('80000', shop));
    assert.ok(profit.sourceJournalIds.includes(deposit.id));
    await post(await draft(expenses, bank, '50000'));
    const transfer = await draft(cash, bank, '12000');
    await post(transfer);
    const cashflow = await read('finance/cashflow' + window, 'CashflowResponse');
    assert.deepEqual(cashflow.receipts, money('249000', shop));
    assert.deepEqual(cashflow.disbursements, money('50000', shop));
    assert.ok(!cashflow.sourceJournalIds.includes(transfer.id));
    assert.deepEqual((await read('finance/profit-loss' + window, 'ProfitLossResponse')).operatingProfit, money('30000', shop));
    const trial = await read('finance/trial-balance' + window, 'TrialBalanceResponse');
    assert.equal(trial.balanced, true);
    assert.deepEqual(trial.totalDebit, trial.totalCredit);
    const balance = await read('finance/balance-sheet?atDate=' + today, 'BalanceSheetResponse');
    assert.equal(balance.balanced, true);
    assert.deepEqual(balance.assets, money('530000', shop));
    assert.deepEqual(balance.retainedProfit, money('30000', shop));
    assert.ok((await read('reports', 'ReportSummaryResponse')).availableReports.includes('profit_loss'));
    await json(await request(path('finance/profit-loss' + window, shop), other), 404, 'Problem');
    const close = { expectedVersion: period.version };
    const closeKey = randomUUID();
    const closed = await json(await send(closePath, close, { shop, key: closeKey }), 202, 'CommandResponse');
    assert.equal((await json(await send(closePath, close, { shop, key: closeKey }), 202, 'CommandResponse')).id, closed.id);
    await json(await send('journals', { sourceType: 'manual', sourceId: randomUUID(), effectiveDate: today,
        reason: 'Kiểm ghi lùi ngày', lines: lines(bank, capital, '100', shop) }, { shop }), 409, 'Problem');
    const current = await db.accountingPeriod.findUniqueOrThrow({ where: { shopId_id: { shopId, id: period.id } } });
    const approval = await json(await send('approvals', { action: 'finance.period.reopen', resource: { type: 'accounting_period', id: period.id },
        resourceVersion: current.version, intentHash: periodIntent(current), reason: 'Cần bổ sung bút toán kỳ đã khóa' }, { shop }), 201, 'ApprovalResponse');
    const reopenPath = 'periods/' + period.id + '/reopen';
    const input = { expectedVersion: current.version, approvalId: approval.id, reason: 'Điều chỉnh theo chứng từ nguồn' };
    await json(await send(reopenPath, input, { shop }), 409, 'Problem');
    await json(await send('approvals/' + approval.id + '/decision', { expectedVersion: approval.version, intentHash: approval.intentHash,
        decision: 'approve', reason: 'Đã kiểm đúng kỳ cần mở lại' }, { shop }), 200, 'ApprovalResponse');
    await json(await send(reopenPath, input, { shop }), 202, 'CommandResponse');
    assert.equal((await read('approvals/' + approval.id, 'ApprovalResponse')).status, 'consumed');
    assert.equal((await read('periods/' + period.id, 'AccountingPeriodResponse')).state, 'open');
    assert.equal(await db.auditEntry.count({ where: { shopId, action: 'closeAccountingPeriod', resourceId: period.id } }), 1);
});

test('SC2-E04 SC2-E05 SC2-E06 R65: private statement preview, durable import, partial allocation and actual COD fee preserve source identity', async () => {
    const shop = await openingShop();
    const { id: shopId, currency } = shop;
    const period = await ensurePeriod(shop, today);
    const at = new Date();
    const bank = await fixedAccount('bank', shop);
    const buyer = await admin.customer.create({ data: { shopId, displayName: 'Khách đối chiếu tổng hợp' } });
    const same = await deliveredDebt(admin, db, shop, buyer.id, at);
    const independent = await deliveredDebt(admin, db, shop, buyer.id, at);
    const evidence = await admin.paymentEvidence.create({ data: {
        shopId, orderId: same.order.id, kind: 'carrier_collection', amount: '249000', reference: 'CARRIER-COLLECT-' + randomUUID(),
        currency, verifiedAt: at, observedAt: at,
    } });
    await json(await send('orders/' + same.order.id + '/pay', { expectedVersion: same.order.version, method: 'external', amount: money('249000', shop),
        reference: evidence.reference, evidenceRef: evidence.id, reason: 'Chứng từ khách trả cho hãng giao hàng' }, { shop }), 202, 'CommandResponse');
    const separateReceipt = await independentReceipt(admin, db, shop, independent.order.id, at, today, 'OBSERVED-OTHER-' + randomUUID());
    const priorAccount = await admin.financeAccount.create({ data: {
        shopId, group: 'asset', code: 'BANK-' + randomUUID().slice(0, 8), name: 'Tài khoản ngân hàng cũ',
    } });
    const priorOrder = await admin.salesOrder.create({ data: { shopId, customerId: buyer.id, warehouseId: shop.defaultWarehouseId,
        paymentMethod: 'prepay', total: '50000', currency, notes: '' } });
    const priorReceipt = await independentReceipt(admin, db, shop, priorOrder.id, at, today, 'BANK-PRIOR-' + randomUUID(), priorAccount.id);
    const get = (resource, schema, expect = 200) => request(path(resource, shop)).then(response => json(response, expect, schema));
    const post = (resource, body, schema, expect = 200, key) => send(resource, body, { shop, key }).then(response => json(response, expect, schema));
    const formats = await get('finance/statement-formats', 'StatementFormatListResponse');
    assert.deepEqual(formats.map(format => format.kind), ['bank', 'cod']);
    assert.equal(formats[1].resourceOptions[0].id, manualCarrierId);
    const handlers = financeJobHandlers();
    const authorize = async (tx, job, permission) => Boolean(await requireShopAccess(tx, job.actorId, job.shopId, permission));
    async function ingest(kind, data, accountOrCarrierId, expectedCounts) {
        const form = new globalThis.FormData();
        form.set('purpose', kind + '_statement');
        form.set('resourceId', accountOrCarrierId);
        form.set('file', new globalThis.Blob([data], { type: 'text/csv' }), kind + '-statement.csv');
        const file = await json(await request(path('uploads', shop), owner, { method: 'POST', body: form,
            headers: { origin, 'x-csrf-token': owner.csrf, 'idempotency-key': randomUUID() } }), 201, 'FileObjectResponse');
        assert.equal(file.status, 'ready');
        const body = { fileId: file.id, accountOrCarrierId, formatId: 'botsales-csv-v1', sourceBatchId: randomUUID() };
        const preview = await post('finance/statement-import-preview', body, 'StatementPreviewResponse');
        assert.deepEqual([preview.validRows, preview.invalidRows], expectedCounts);
        const route = kind === 'bank' ? 'bank-transactions/import' : 'cod-settlements/import';
        const input = { ...body, validationToken: preview.validationToken };
        await post(route, { ...input, sourceBatchId: randomUUID() }, 'Problem', 409);
        const key = randomUUID();
        const queued = await post(route, input, 'JobResponse', 200, key);
        assert.equal((await post(route, input, 'JobResponse', 200, key)).id, queued.id);
        const operation = kind === 'bank' ? 'importBankStatement' : 'importCODStatement';
        await runJob(db, { shopId, id: queued.id, sourceOperation: operation }, handlers.get(operation), authorize);
        const result = await get('jobs/' + queued.id, 'JobResponse');
        assert.equal(result.status, expectedCounts[1] > 0 ? 'partial' : 'succeeded');
        assert.equal(result.completed, expectedCounts[0]);
        await post(route, input, 'Problem', 409);
        return { file, body };
    }
    const external = { b: 'BANK-INDEPENDENT-' + randomUUID(), first: 'BANK-COD-1-' + randomUUID(),
        last: 'BANK-COD-2-' + randomUUID(), deferred: 'BANK-BEFORE-PAY-' + randomUUID() };
    const line = (id, amount, reference) => [id, amount, currency, 'credit', at.toISOString(), reference].join(',');
    const csv = ['externalTransactionId,amount,currency,direction,occurredAt,referenceText',
        line(external.b, '249000', independent.order.id), line(external.first, '100000', same.order.id),
        line(external.last, '129000', same.order.id), line(separateReceipt.reference, '50000', 'Đã ghi trước khi nhập sao kê'),
        line(external.deferred, '1000', 'Ghi nhận phiếu sau khi nhập sao kê'),
        line(priorReceipt.reference, '50000', 'Trùng mã với giao dịch trên tài khoản khác'),
        line(external.b, '249000', independent.order.id)].join('\n');
    const imported = await ingest('bank', csv, bank.id, [6, 1]);
    const previous = await post('finance/statement-import-preview', { ...imported.body, sourceBatchId: randomUUID() }, 'StatementPreviewResponse');
    assert.equal(previous.validRows, 0);
    await json(await request(path('uploads/' + imported.file.id, shopB), other), 404, 'Problem');
    const externalBatchId = 'COD-PROOF-' + randomUUID();
    const codLine = externalBatchId + ',' + same.order.id;
    const codImport = await ingest('cod', ['externalBatchId,orderIds', codLine, codLine].join('\n'), manualCarrierId, [1, 1]);
    const repeatedCod = await post('finance/statement-import-preview', { ...codImport.body, sourceBatchId: randomUUID() }, 'StatementPreviewResponse');
    assert.deepEqual([repeatedCod.validRows, repeatedCod.invalidRows], [0, 2]);
    const [cod] = await get('cod-settlements', 'CODSettlementListResponse');
    assert.deepEqual(cod.grossDue, money('249000', shop));
    assert.equal((await get('cod-settlements/' + cod.id, 'CODSettlementResponse')).status, 'pending');
    const banks = await get('bank-transactions', 'BankTransactionListResponse');
    const bankByRef = new Map(banks.map(transaction => [transaction.externalTransactionId, transaction]));
    const cases = await get('reconciliation-cases', 'ReconciliationCaseListResponse');
    const byTransaction = new Map(cases.map(item => [item.transactionId, item]));
    assert.equal(byTransaction.get(bankByRef.get(separateReceipt.reference).id).state, 'matched');
    const separateAccountTransaction = bankByRef.get(priorReceipt.reference);
    assert.equal(byTransaction.get(separateAccountTransaction.id).state, 'unmatched');
    assert.equal((await db.bankTransaction.findUniqueOrThrow({ where: { shopId_id: { shopId, id: separateAccountTransaction.id } } })).paymentEvidenceId, null);
    assert.equal(await db.codSettlement.count({ where: { shopId, carrierId: manualCarrierId, externalBatchId } }), 1);
    assert.equal(await db.financeJournal.count({ where: { shopId, sourceType: 'bank_transaction', sourceId: bankByRef.get(separateReceipt.reference).id } }), 0);
    const prepay = await admin.salesOrder.create({ data: { shopId, customerId: buyer.id, warehouseId: shop.defaultWarehouseId,
        paymentMethod: 'prepay', total: '1000', currency, notes: '' } });
    const prepayProof = await admin.paymentEvidence.create({ data: { shopId, orderId: prepay.id, kind: 'bank_receipt', amount: '1000',
        currency, reference: external.deferred, observedAt: at, verifiedAt: at } });
    const incoming = bankByRef.get(external.deferred);
    assert.equal(incoming.matchState, 'unmatched');
    await post('orders/' + prepay.id + '/pay', { expectedVersion: prepay.version, method: 'bank_transfer', amount: money('1000', shop),
        reference: external.deferred, evidenceRef: prepayProof.id, reason: 'Ghi phiếu sau khi nhập sao kê' }, 'CommandResponse', 202);
    assert.equal((await get('bank-transactions/' + incoming.id, 'BankTransactionResponse')).matchState, 'matched');
    const [linkedPayment] = await get('payment-reviews?kind=collection&stage=settled&q=' + prepay.id, 'PaymentReviewListResponse');
    assert.deepEqual(linkedPayment.bankTransactionIds, [incoming.id]);
    const debts = await get('debts', 'DebtItemListResponse');
    const debt = debts.find(item => item.source.id === independent.order.id);
    const bankTx = bankByRef.get(external.b);
    assert.equal((await get('bank-transactions/' + bankTx.id, 'BankTransactionResponse')).externalTransactionId, external.b);
    const review = byTransaction.get(bankTx.id);
    assert.deepEqual(review.suggestedResourceIds, [debt.id]);
    const matchedPath = 'reconciliation-cases/' + review.id + '/match';
    const allocation = (amount, expectedVersion = review.version) => ({ transactionId: bankTx.id, expectedVersion,
        reason: 'Đã xác minh giao dịch và công nợ', allocations: [{ resource: { type: 'debt', id: debt.id }, amount: money(amount, shop) }] });
    await post(matchedPath, allocation('249001'), 'Problem', 422);
    const allocKey = randomUUID();
    const first = await post(matchedPath, allocation('90000'), 'CommandResponse', 202, allocKey);
    assert.equal((await post(matchedPath, allocation('90000'), 'CommandResponse', 202, allocKey)).id, first.id);
    await post(matchedPath, allocation('159000'), 'Problem', 412);
    const afterFirst = await get('reconciliation-cases/' + review.id, 'ReconciliationCaseResponse');
    assert.equal(afterFirst.state, 'suggested');
    assert.deepEqual(afterFirst.difference, money('159000', shop));
    assert.deepEqual((await get('debts/' + debt.id, 'DebtItemResponse')).outstandingAmount, money('159000', shop));
    await post(matchedPath, allocation('159000', afterFirst.version), 'CommandResponse', 202);
    assert.equal((await get('reconciliation-cases/' + review.id, 'ReconciliationCaseResponse')).state, 'matched');
    assert.deepEqual((await get('debts/' + debt.id, 'DebtItemResponse')).outstandingAmount, money('0', shop));
    const broken = (await get('payment-reviews?kind=collection&stage=open&q=' + external.b, 'PaymentReviewListResponse'))[0];
    assert.equal(broken.status, 'needs_check');
    assert.deepEqual(broken.expected, money('249000', shop));
    assert.deepEqual(broken.verified, money('299000', shop));
    assert.equal(broken.remaining, null);
    assert.deepEqual(broken.bankTransactionIds, [bankTx.id, bankByRef.get(separateReceipt.reference).id].sort());
    assert.ok(broken.workItemId);
    await post('work-items/' + broken.workItemId + '/claim', { expectedVersion: 1 }, 'WorkItemResponse');
    const dueAt = new Date(Date.now() + 3600000);
    await db.workItem.update({ where: { shopId_id: { shopId, id: broken.workItemId } },
        data: { dueAt, version: { increment: 1 } } });
    const assigned = (await get('payment-reviews?q=' + independent.order.id, 'PaymentReviewListResponse'))[0];
    assert.equal(assigned.assigneeUserId, owner.userId);
    assert.equal(assigned.dueAt, dueAt.toISOString());
    await post('periods/' + period.id + '/close', { expectedVersion: period.version }, 'Problem', 409);
    for (const [ref, fee, status] of [[external.first, '12000', 'part_settled'], [external.last, '8000', 'matched']]) {
        const source = bankByRef.get(ref);
        const latest = await get('cod-settlements/' + cod.id, 'CODSettlementResponse');
        const feeEvidence = await admin.codFeeEvidence.create({ data: { shopId, settlementId: cod.id, transactionId: source.id,
            amount: fee, currency, reference: 'FEE-' + randomUUID(), verifiedAt: at } });
        const match = { expectedVersion: latest.version, bankTransactionId: source.id, feeEvidenceRef: feeEvidence.id,
            actualFees: money(fee, shop), reason: 'Đối chiếu phí sau khi hãng trả tiền' };
        const route = 'cod-settlements/' + cod.id + '/match';
        await post(route, { ...match, feeEvidenceRef: randomUUID() }, 'Problem', 422);
        await post(route, match, 'CommandResponse', 202);
        assert.equal((await get('cod-settlements/' + cod.id, 'CODSettlementResponse')).status, status);
    }
    const finalCod = await get('cod-settlements/' + cod.id, 'CODSettlementResponse');
    assert.deepEqual(finalCod.actualFees, money('20000', shop));
    assert.deepEqual(finalCod.bankReceived, money('229000', shop));
    assert.deepEqual(finalCod.difference, money('0', shop));
    const [complete] = await get('payment-reviews?kind=collection&stage=settled&q=' + same.order.id, 'PaymentReviewListResponse');
    assert.deepEqual(complete.verified, money('249000', shop));
    assert.deepEqual(complete.remaining, money('0', shop));
    assert.equal(complete.bankTransactionIds.length, 2);
    assert.deepEqual(complete.codSettlementIds, [cod.id]);
    const order = await get('orders/' + same.order.id, 'OrderResponse');
    assert.deepEqual(order.cashReceived, money('229000', shop));
    assert.equal(order.paymentState, 'settled');
    assert.equal((await db.collectionApplication.aggregate({ where: { shopId }, _sum: { amount: true } }))._sum.amount.toFixed(), '249000');
    const lockedByReview = await get('periods/' + period.id, 'AccountingPeriodResponse');
    assert.deepEqual(lockedByReview.blockingIssues, [
        'Còn giao dịch ngân hàng chưa đối soát trong kỳ.', 'Còn khoản thu hoặc hoàn có chênh lệch cần kiểm trong kỳ.',
    ]);
    const returnId = randomUUID();
    const { refund, credit } = await db.$transaction(tx => bookInspectedReturn(tx,
        { shopId, sourceId: returnId, at, currency }, same.order, true, new ExactDecimal(9900), new ExactDecimal(0), new ExactDecimal(0)));
    await admin.orderReturn.create({ data: { shopId, id: returnId, orderId: same.order.id, shipmentId: same.shipment.id,
        state: 'inspected', reason: 'Hàng đã kiểm nhận trong fixture hoàn', refundObligation: refund, receivableCredit: credit } });
    const returnOrder = await admin.salesOrder.update({ where: { shopId_id: { shopId, id: same.order.id } },
        data: { fulfillmentState: 'part_returned', version: { increment: 1 } } });
    const [refundOpen] = await get('payment-reviews?kind=refund&stage=open&q=' + same.order.id, 'PaymentReviewListResponse');
    assert.equal(refundOpen.status, 'refund_due');
    assert.deepEqual(refundOpen.remaining, money('9900', shop));
    assert.deepEqual(refundOpen.returnIds, [returnId]);
    const observedRefund = await admin.paymentEvidence.create({ data: { shopId, orderId: same.order.id, currency, kind: 'observed_refund',
        amount: '9900', reference: 'REFUND-' + randomUUID(), observedAt: at, verifiedAt: at } });
    await post('orders/' + same.order.id + '/refund', { expectedVersion: returnOrder.version, amount: money('9900', shop),
        evidenceRef: observedRefund.id, paymentReference: observedRefund.reference, reason: 'Đã kiểm chứng từ hoàn cho khách' }, 'CommandResponse', 202);
    const [refundSettled] = await get('payment-reviews?kind=refund&stage=settled&q=' + same.order.id, 'PaymentReviewListResponse');
    assert.deepEqual(refundSettled.remaining, money('0', shop));
    assert.deepEqual(refundSettled.verified, money('9900', shop));
    assert.equal(refundSettled.journalIds.length, 2);
    const from = new Date(Date.now() - 86400000).toISOString();
    const to = new Date(Date.now() + 86400000).toISOString();
    const window = '?' + new URLSearchParams({ from, to, timezone: shop.timezone });
    const cashflow = await get('finance/cashflow' + window, 'CashflowResponse');
    assert.deepEqual(cashflow.receipts, money('529000', shop));
    assert.deepEqual(cashflow.disbursements, money('9900', shop));
    assert.deepEqual((await get('finance/profit-loss' + window, 'ProfitLossResponse')).shippingExpense, money('20000', shop));
    await json(await request(path('payment-reviews', shop), other), 404, 'Problem');
});
