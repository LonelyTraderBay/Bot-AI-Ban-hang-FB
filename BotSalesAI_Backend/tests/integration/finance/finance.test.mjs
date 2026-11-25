import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { URLSearchParams } from 'node:url';
import sharp from 'sharp';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createContractValidator, schemaFromContract } from '../../../apps/api/dist/http/contracts.js';
import { reserveAiUsage } from '../../../apps/api/dist/modules/ai/engine.js';
import { fixtureAccounts } from '../../../apps/api/dist/modules/finance/account-policy.js';
import { bookInspectedReturn, financeJobHandlers, localAccountingDate, reportExportHandler } from '../../../apps/api/dist/modules/finance/index.js';
import { manualCarrierId } from '../../../apps/api/dist/modules/finance/debts.js';
import { periodIntent } from '../../../apps/api/dist/modules/finance/period-data.js';
import { refreshOperationExceptions } from '../../../apps/api/dist/modules/operations/index.js';
import { readAuthConfig, requireShopAccess } from '../../../apps/api/dist/modules/workspace/index.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { runJob } from '../../../apps/api/dist/platform/jobs/index.js';
import { ExactDecimal } from '../../../apps/api/dist/platform/money/index.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { assertFixtureDatabase, fixtureSession } from '../workspace/session-fixture.mjs';
import { fixtureWriter, orderConversation, quoteEvidenceFixture } from '../orders/fixtures.mjs';
import { deliveredDebt, independentReceipt } from './fixtures.mjs';
import { reviewedEvidenceFixture } from '../helpers/reviewed-evidence-fixture.mjs';

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

async function product(shop = shopA, actor = owner) {
    const sku = 'BE12-' + randomUUID();
    const response = await send('products', {
        name: sku, description: '', categoryId: null, status: 'active', imageFileIds: [],
        variants: [{ sku, active: true, name: 'Mặc định', options: {}, price: money('15000.01', shop) }],
    }, { shop, actor });
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
    const missingCost = await json(await send('inventory/adjustments', { ...adjustment, unitCost: null }), 422, 'Problem');
    assert.deepEqual(missingCost.errors?.map(({ path, code }) => [path, code]), [['/unitCost', 'UNIT_COST_REQUIRED']]);
    assert.equal(await db.stockMovement.count({ where: { shopId, variantId: variant.id } }), 0);
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

async function paymentFixtures(shop = shopA, actor = owner) {
    const options = { shop, actor };
    const buyer = await json(await send('customers', { displayName: 'Khách kiểm thanh toán', phone: '0901111222', email: null, notes: '' }, options),
        201, 'CustomerResponse');
    const address = await json(await send('customers/' + buyer.id + '/addresses', {
        label: 'Địa chỉ A', recipient: 'Khách kiểm thanh toán', phone: '0901111222', line1: 'Căn số A',
        ward: null, district: null, postalCode: null, province: 'Hà Nội', countryCode: 'VN',
    }, options), 201, 'CustomerAddressResponse');
    const { conversation } = await orderConversation(admin, shop.id, buyer.id);
    const variant = await product(shop, actor);
    await json(await send('inventory/adjustments', {
        warehouseId: shop.defaultWarehouseId, variantId: variant.id, quantityDelta: 2, expectedVersion: 1, unitCost: money('1', shop), reason: 'Tồn thử thanh toán',
    }, options), 202, 'CommandResponse');
    const draft = {
        customerId: buyer.id, conversationId: conversation.id, warehouseId: shop.defaultWarehouseId, notes: '',
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

test('SC2-E04-PHOTO: pending bank evidence stays private to finance and leaves the ledger unchanged', async context => {
    for (const [shop, actor, peer, peerShop] of [[shopA, owner, other, shopB], [shopB, other, owner, shopA]]) {
        await context.test(shop.currency, async () => {
            await ensurePeriod(shop, localAccountingDate(new Date(), shop.timezone), actor);
            const { draft } = await paymentFixtures(shop, actor);
            const options = { shop, actor };
            const order = await json(await send('orders', draft, options), 201, 'OrderResponse');
            const step = async (resource, code, schema, user = actor, inShop = shop) => json(await request(path(resource, inShop), user), code, schema);
            const privateText = 'synthetic-customer-identifier';
            const photo = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#bbaabb' } })
                .withExif({ IFD0: { ImageDescription: privateText } }).jpeg().toBuffer();
            assert.ok((await sharp(photo).metadata()).exif.includes(privateText));
            const snapshots = () => Promise.all([
                db.financeJournal.count({ where: { shopId: shop.id } }),
                db.financeEntry.count({ where: { shopId: shop.id } }),
                db.paymentEvidence.count({ where: { shopId: shop.id } }),
            ]);
            const before = await snapshots();
            function upload(resourceId, key = randomUUID(), user = actor, inShop = shop) {
                const body = new globalThis.FormData();
                body.set('purpose', 'payment_evidence_image');
                if (resourceId) body.set('resourceId', resourceId);
                body.set('file', new globalThis.Blob([photo], { type: 'image/jpeg' }), privateText + '.jpg');
                return request(path('uploads', inShop), user, { method: 'POST', body,
                    headers: { origin, 'x-csrf-token': user.csrf, 'idempotency-key': key } });
            }
            const key = randomUUID();
            const stored = await json(await upload(order.id, key), 201, 'FileObjectResponse');
            assert.equal(stored.status, 'ready');
            assert.equal(stored.resourceId, order.id);
            assert.ok(!stored.name.includes(privateText));
            assert.equal((await json(await upload(order.id, key), 201, 'FileObjectResponse')).id, stored.id);
            await json(await upload(), 422, 'Problem');
            await json(await upload(order.id, randomUUID(), peer, peerShop), 404, 'Problem');
            const review = 'payment-reviews?kind=collection&q=' + order.id;
            const [pending] = await step(review, 200, 'PaymentReviewListResponse');
            assert.equal(pending.verified.amount, '0');
            assert.equal(pending.status, 'unpaid');
            assert.deepEqual(pending.pendingTransferImages.map(item => [item.fileId, item.status]), [[stored.id, 'pending_review']]);
            const filePath = 'uploads/' + stored.id;
            const file = await step(filePath, 200, 'FileObjectResponse');
            const signed = new URL(file.readUrl, base).search;
            const source = await request(path(filePath, shop) + signed, actor);
            assert.equal(source.status, 200);
            assert.match(source.headers.get('cache-control'), /no-store/u);
            assert.ok(!(await sharp(Buffer.from(await source.arrayBuffer())).metadata()).exif);
            assert.equal((await fetch(base + path(filePath, shop) + signed)).status, 401);
            await step(filePath + signed, 404, 'Problem', peer, peerShop);
            if (shop.id === shopA.id) {
                await json(await upload(order.id, randomUUID(), restricted), 403, 'Problem');
                await step(filePath, 404, 'Problem', restricted);
                const [readOnly] = await step(review, 200, 'PaymentReviewListResponse', restricted);
                assert.equal(readOnly.pendingTransferImages, undefined);
            }
            await json(await send('orders/' + order.id + '/pay', { expectedVersion: order.version, amount: money('15000.01', shop),
                method: 'bank_transfer', reference: 'UNVERIFIED', reason: 'Ảnh đang chờ đối chiếu', evidenceRef: stored.id }, options), 422, 'Problem');
            assert.equal((await step('orders/' + order.id, 200, 'OrderResponse')).paymentState, 'unpaid');
            assert.deepEqual(await snapshots(), before);
            console.log(JSON.stringify({ case: 'SC2_E04_PENDING_TRANSFER_IMAGE', currency: shop.currency, attachedToOrder: true,
                idempotent: true, removedMetadata: true, noSignedAnonymousRead: true, ledgerUnchanged: true }));
        });
    }
});

test('SC2-E04 SC2-E05 SC2-E06: prepay needs verified observations, deposits stay outside revenue, and carrier collection changes no bank journal', async () => {
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
    await json(await send(resource + '/pay', { ...initial, amount: money('5000', shopB) }), 422, 'Problem');
    const bank = await fixedAccount('bank');
    const image = new globalThis.FormData();
    image.set('purpose', 'bank_statement');
    image.set('resourceId', bank.id);
    const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jqakAAAAASUVORK5CYII=', 'base64');
    image.set('file', new globalThis.Blob([pixel], { type: 'image/png' }), 'transfer.png');
    const attachment = await json(await request(path('uploads'), owner, { method: 'POST', body: image,
        headers: { origin, 'x-csrf-token': owner.csrf, 'idempotency-key': randomUUID() } }), 201, 'FileObjectResponse');
    assert.equal(attachment.status, 'quarantined');
    await json(await send(resource + '/pay', { ...initial, evidenceRef: attachment.id }), 422, 'Problem');
    assert.equal((await json(await request(path(resource)), 200, 'OrderResponse')).paymentState, 'unpaid');
    const window = new URLSearchParams({ timezone: shopA.timezone, from: new Date(Date.now() - 86400000).toISOString(),
        to: new Date(Date.now() + 86400000).toISOString() });
    const profit = () => request(path('finance/profit-loss?' + window)).then(response => json(response, 200, 'ProfitLossResponse'));
    const beforePrepay = await profit();
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
    const deposit = await fixedAccount('customer_deposit');
    const recordedDeposit = await db.financeJournalLine.aggregate({
        where: { shopId, accountId: deposit.id, journal: { sourceType: 'order_payment', sourceId: { in: [first.id, rest.id] } } },
        _sum: { credit: true },
    });
    assert.equal(recordedDeposit._sum.credit.toFixed(), '15000.01');
    assert.deepEqual((await profit()).netSales, beforePrepay.netSales);
    console.log(JSON.stringify({ status: 'SC2_E04_E06_PAYMENT_EVIDENCE', unverifiedImageRejected: true,
        crossCurrencyRejected: true, customerDeposit: recordedDeposit._sum.credit.toFixed(), netSalesUnchanged: true }));
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
    const sale = await draft(bank, sales, '249000');
    await post(sale);
    await post(await draft(costs, inventory, '169000'));
    const from = new Date(Date.now() - 86400000).toISOString();
    const to = new Date(Date.now() + 86400000).toISOString();
    const window = '?' + new URLSearchParams({ from, to, timezone: shop.timezone });
    const read = (resource, schema) => request(path(resource, shop)).then(response => json(response, 200, schema));
    const profit = await read('finance/profit-loss' + window, 'ProfitLossResponse');
    assert.deepEqual(profit.grossProfit, money('80000', shop));
    assert.ok(profit.sourceJournalIds.includes(sale.id));
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
    const sourceJournals = () => db.financeJournal.findMany({ where: { shopId }, include: { lines: { orderBy: { id: 'asc' } } },
        orderBy: { id: 'asc' } });
    const lockedJournals = await sourceJournals();
    const snapshot = await read('finance/profit-loss' + window, 'ProfitLossResponse');
    const exportJob = await json(await send('exports', { reportType: 'profit_loss', format: 'csv', from, to, timezone: shop.timezone,
        snapshotAsOf: snapshot.asOf }, { shop }), 202, 'JobResponse');
    await runJob(db, { shopId, id: exportJob.id, sourceOperation: 'createExport' }, reportExportHandler,
        async (tx, job, permission) => Boolean(await requireShopAccess(tx, job.actorId, job.shopId, permission)));
    const exported = await read('jobs/' + exportJob.id, 'JobResponse');
    assert.equal(exported.status, 'succeeded');
    assert.ok(exported.downloadUrl);
    assert.deepEqual(await sourceJournals(), lockedJournals);
    assert.equal((await read('periods/' + period.id, 'AccountingPeriodResponse')).state, 'closed');
    console.log(JSON.stringify({ status: 'SC2_E07_LOCKED_EXPORT', blockedBackdated: true, exported: true,
        journalsUnchanged: true, periodRemainedClosed: true }));
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

test('SC2-E03: AI estimates stay outside the ledger and posted charges can be traced and reversed once', async () => {
    const at = new Date();
    const scopes = [[shopA, owner], [shopB, other]];
    for (const [shop, actor] of scopes) {
        const date = localAccountingDate(at, shop.timezone);
        await ensurePeriod(shop, date, actor);
        const window = '?' + new URLSearchParams({ timezone: shop.timezone,
            from: new Date(at.getTime() - 86400000).toISOString(), to: new Date(at.getTime() + 86400000).toISOString() });
        const report = () => request(path('finance/profit-loss' + window, shop), actor).then(response => json(response, 200, 'ProfitLossResponse'));
        const before = await report();
        const reserved = await db.$transaction(tx => reserveAiUsage(tx, shop, new ExactDecimal('1000'), at, new ExactDecimal('217')));
        assert.equal(reserved, true);
        const afterEstimate = await report();
        assert.deepEqual(afterEstimate.aiExpense, before.aiExpense);
        assert.deepEqual(afterEstimate.sourceJournalIds, before.sourceJournalIds);

        const sourceRef = { type: 'manual_ai_invoice', id: randomUUID() };
        const charge = { kind: 'disbursement', classification: 'ai_expense', amount: money('321.04', shop),
            occurredAt: at.toISOString(), description: 'Hóa đơn AI tổng hợp đã kiểm', sourceRef };
        const draft = await json(await send('finance/entries', charge, { shop, actor }), 201, 'FinanceEntryResponse');
        assert.deepEqual((await report()).aiExpense, before.aiExpense);
        const entry = 'finance/entries/' + draft.id;
        const key = randomUUID();
        const post = () => send(entry + '/post', { expectedVersion: draft.version, reason: 'Ghi hóa đơn thử' }, { shop, actor, key });
        const posted = await json(await post(), 202, 'CommandResponse');
        assert.equal((await json(await post(), 202, 'CommandResponse')).id, posted.id);
        const record = await db.financeEntry.findUniqueOrThrow({ where: { shopId_id: { shopId: shop.id, id: draft.id } } });
        const actual = await report();
        assert.equal(new ExactDecimal(actual.aiExpense.amount).minus(before.aiExpense.amount).toFixed(), '321.04');
        assert.ok(actual.sourceJournalIds.includes(record.journalId));

        const peer = actor === owner ? other : owner;
        await json(await request(path(entry, shop), peer), 404, 'Problem');
        const reverseKey = randomUUID();
        const reverse = () => send(entry + '/reverse', { expectedVersion: record.version, reason: 'Điều chỉnh hóa đơn thử' },
            { shop, actor, key: reverseKey });
        const reversed = await json(await reverse(), 202, 'CommandResponse');
        assert.equal((await json(await reverse(), 202, 'CommandResponse')).id, reversed.id);
        const corrected = await report();
        assert.deepEqual(corrected.aiExpense, before.aiExpense);
        assert.equal(corrected.sourceJournalIds.length, before.sourceJournalIds.length + 2);
        assert.ok(corrected.sourceJournalIds.includes(record.journalId));
        assert.equal(await db.financeJournal.count({ where: { shopId: shop.id, reversalOf: record.journalId } }), 1);
    }
    console.log(JSON.stringify({ status: 'SC2_E03_AI_ESTIMATE_ACTUAL', shops: ['VND', 'LAK'], budgetEstimate: '217',
        reportChangeOnEstimate: '0', postedCharge: '321.04', postReplays: 2, reversalReplays: 2, crossShopStatus: 404 }));
});

test('SC2-E03: advertising and packaging are distinct posted costs with cited source and reversible totals', async () => {
    const at = new Date();
    const scopes = [[shopA, owner], [shopB, other]];
    for (const [shop, actor] of scopes) {
        const date = localAccountingDate(at, shop.timezone);
        await ensurePeriod(shop, date, actor);
        const reportQuery = '?' + new URLSearchParams({ timezone: shop.timezone,
            from: new Date(at.getTime() - 86400000).toISOString(), to: new Date(at.getTime() + 86400000).toISOString() });
        const marketingQuery = '?' + new URLSearchParams({ fromDate: date, toDate: date, bucket: 'week' });
        const read = (resource, schema) => request(path(resource, shop), actor).then(response => json(response, 200, schema));
        const profit = () => read('finance/profit-loss' + reportQuery, 'ProfitLossResponse');
        const marketing = () => read('marketing-summary' + marketingQuery, 'MarketingSummaryResponse');
        const before = await profit();
        assert.equal((await marketing()).actualSpend, null);
        const invoice = { kind: 'disbursement', classification: 'advertising_expense', amount: money('37.5', shop),
            occurredAt: at.toISOString(), description: 'Chứng từ quảng cáo tổng hợp', sourceRef: { type: 'manual', id: randomUUID() } };
        await json(await send('finance/entries', { ...invoice, sourceRef: null }, { shop, actor }), 422, 'Problem');
        const created = await send('finance/entries', invoice, { shop, actor });
        assert.equal(created.status, 201, 'Advertising has a supported expense classification');
        const adDraft = await json(created, 201, 'FinanceEntryResponse');
        const draft = input => send('finance/entries', input, { shop, actor }).then(response => json(response, 201, 'FinanceEntryResponse'));
        const packageDraft = await draft({ ...invoice, classification: 'packaging_expense', amount: money('8.25', shop),
            sourceRef: { type: 'manual', id: randomUUID() } });
        assert.equal((await marketing()).actualSpend, null);
        const posted = (row, key = randomUUID()) => send('finance/entries/' + row.id + '/post',
            { expectedVersion: row.version, reason: 'Chứng từ chi đã đối chiếu' }, { shop, actor, key });
        const key = randomUUID();
        const command = await json(await posted(adDraft, key), 202, 'CommandResponse');
        assert.equal((await json(await posted(adDraft, key), 202, 'CommandResponse')).id, command.id);
        await json(await posted(packageDraft), 202, 'CommandResponse');
        const conflict = await draft({ ...invoice, classification: 'packaging_expense' });
        await json(await posted(conflict), 409, 'Problem');

        const actual = await profit();
        assert.deepEqual(actual.advertisingExpense, money('37.5', shop));
        assert.deepEqual(actual.packagingExpense, money('8.25', shop));
        assert.deepEqual(actual.otherOperatingExpenses, before.otherOperatingExpenses);
        assert.equal(new ExactDecimal(before.operatingProfit.amount).minus(actual.operatingProfit.amount).toFixed(), '45.75');
        const observed = await marketing();
        assert.deepEqual(observed.actualSpend, actual.advertisingExpense);
        assert.deepEqual(observed.trend.map(point => point.actualSpend), [observed.actualSpend]);
        assert.equal(observed.estimatedSpend, null);
        const stored = await db.financeEntry.findUniqueOrThrow({ where: { shopId_id: { shopId: shop.id, id: adDraft.id } } });
        assert.ok(actual.sourceJournalIds.includes(stored.journalId));
        assert.deepEqual(observed.actualSpendSources, [{ channel: null, campaignId: null, journalId: stored.journalId, sourceId: invoice.sourceRef.id }]);
        const proof = await reviewedEvidenceFixture('marketing', { cwd: process.cwd(),
            env: { ...process.env, MARKETING_EVIDENCE_SHOPS: shop.id },
            document: 'Synthetic approved invoice allocation. Whole advertising document assigned to the matching source campaign.' });
        const campaignId = 'campaign-' + randomUUID();
        try {
            const manifest = { shopId: shop.id, reviewerId: actor.userId, entryId: adDraft.id, date, expectedRevision: 0,
                channel: 'messenger', campaignId, confidence: 'known', sourceId: 'allocation-' + randomUUID() };
            const unsupported = await proof.prepare({ ...manifest, entryId: packageDraft.id });
            await assert.rejects(proof.execute(unsupported), /Attestation rejected \(422\)/);
            const estimated = await proof.prepare({ ...manifest, confidence: 'estimated' });
            await assert.rejects(proof.execute(estimated), /Attestation rejected \(422\)/);
            const hash = await proof.prepare(manifest);
            await proof.execute(hash);
            const linked = await marketing();
            assert.deepEqual(linked.actualSpend, actual.advertisingExpense);
            assert.deepEqual(linked.campaignResults.find(row => row.campaignId === campaignId), {
                channel: 'messenger', campaignId, knownOrders: 0, estimatedOrders: 0, orderId: null, attributionSourceId: null,
                actualSpend: money('37.5', shop), spendJournalId: stored.journalId,
            });
        } finally {
            await proof.close();
        }
        await json(await request(path('finance/entries/' + adDraft.id, shop), actor === owner ? other : owner), 404, 'Problem');
        await json(await send('finance/entries/' + adDraft.id + '/reverse', { expectedVersion: stored.version,
            reason: 'Đảo hóa đơn nguồn thử' }, { shop, actor }), 202, 'CommandResponse');
        const afterReversal = await marketing();
        assert.deepEqual(afterReversal.actualSpend, money('0', shop));
        assert.deepEqual(afterReversal.campaignResults.find(row => row.campaignId === campaignId)?.actualSpend, money('0', shop));
        const corrected = await profit();
        assert.deepEqual(corrected.advertisingExpense, money('0', shop));
        assert.deepEqual(corrected.packagingExpense, money('8.25', shop));
        assert.equal(new ExactDecimal(before.operatingProfit.amount).minus(corrected.operatingProfit.amount).toFixed(), '8.25');
    }
    console.log(JSON.stringify({ status: 'SC2_E03_CLASSIFIED_EXPENSES', shops: ['VND', 'LAK'], advertising: '37.5', packaging: '8.25',
        initialNetExpense: '45.75', netAfterReversal: '8.25', duplicateSourceStatus: 409, foreignAccess: 404, unknownEstimate: true }));
});

test('SC2-E03: reviewed advertising estimates keep daily revisions and remain independent of actual spend', async () => {
    const fromDate = '2020-01-30', missingDay = '2020-01-31', toDate = '2020-02-01';
    const estimates = await reviewedEvidenceFixture('advertising-estimate', { cwd: process.cwd(),
        env: { ...process.env, ADVERTISING_ESTIMATE_SHOPS: [shopA.id, shopB.id].join(',') }, document: 'Dự trù tổng hợp đã được kiểm' });
    const scopes = [[shopA, owner, other, '25.15'], [shopB, other, owner, '42.25']];
    try {
        for (const [shop, actor, foreign, revisedAmount] of scopes) {
            const { id: shopId } = shop;
            const query = (first, last, bucket = 'day') => 'marketing-summary?' + new URLSearchParams({ fromDate: first, toDate: last, bucket });
            const get = (first = fromDate, last = toDate, bucket = 'day') => request(path(query(first, last, bucket), shop), actor)
                .then(response => json(response, 200, 'MarketingSummaryResponse'));
            const manifest = { shopId, reviewerId: actor.userId, date: fromDate, expectedRevision: 0, amount: money('10', shop) };
            const record = async input => {
                const hash = await estimates.prepare(input);
                const { stdout } = await estimates.execute(hash);
                return JSON.parse(stdout).evidenceId;
            };
            const journals = () => db.financeJournal.count({ where: { shopId } });
            const before = await journals();
            assert.equal((await get()).estimatedSpend, null);
            await assert.rejects(record({ ...manifest, reviewerId: foreign.userId }), { stderr: /rejected \(404\)/ });
            await assert.rejects(record({ ...manifest, amount: money('10', shop === shopA ? shopB : shopA) }), { stderr: /rejected \(422\)/ });
            const hash = await estimates.prepare(manifest);
            const [first, replay] = await Promise.all([estimates.execute(hash), estimates.execute(hash)]);
            const original = JSON.parse(first.stdout).evidenceId;
            assert.equal(JSON.parse(replay.stdout).evidenceId, original);
            assert.deepEqual((await get()).estimatedSpend, money('10', shop));
            const revised = await record({ ...manifest, expectedRevision: 1, amount: money(revisedAmount, shop) });
            assert.notEqual(revised, original);
            await assert.rejects(record({ ...manifest, expectedRevision: 1, amount: money('99', shop) }), { stderr: /rejected \(412\)/ });
            assert.equal(await record(manifest), original);
            await record({ ...manifest, date: toDate, amount: money('0', shop) });
            const projection = await get();
            assert.deepEqual(projection.estimatedSpend, money(revisedAmount, shop));
            assert.equal(projection.actualSpend, null);
            assert.deepEqual(projection.trend.map(row => row.estimatedSpend), [money(revisedAmount, shop), null, money('0', shop)]);
            assert.deepEqual((await get(fromDate, toDate, 'month')).trend.map(row => row.estimatedSpend), [money(revisedAmount, shop), money('0', shop)]);
            assert.equal((await get(missingDay, missingDay)).estimatedSpend, null);
            assert.equal((await get(missingDay, missingDay)).estimateCoverage, undefined);

            const rows = await db.advertisingEstimate.findMany({ where: { shopId }, orderBy: [{ accountingDate: 'asc' }, { revision: 'asc' }] });
            assert.deepEqual(rows.map(row => [row.revision, row.amount.toFixed()]), [[1, '10'], [2, revisedAmount], [1, '0']]);
            assert.deepEqual(projection.estimateCoverage, { daysWithEstimate: 2, daysInPeriod: 3, lastRecordedAt: rows[2].recordedAt.toISOString() });
            const audits = await db.auditEntry.findMany({ where: { shopId, action: 'recordAdvertisingEstimate' } });
            assert.deepEqual(new Set(audits.map(row => row.resourceId)), new Set(rows.map(row => row.id)));
            assert.equal(audits.length, 3);
            assert.ok(audits.every(row => row.actorId === actor.userId && Number.isInteger(row.metadata.permissionVersion)));
            assert.equal(await journals(), before);
            await json(await request(path(query(fromDate, toDate), shop), foreign), 404, 'Problem');

            await ensurePeriod(shop, fromDate, actor);
            const actual = await json(await send('finance/entries', { kind: 'disbursement', classification: 'advertising_expense', amount: money('8', shop),
                occurredAt: fromDate + 'T12:00:00Z', description: 'Chứng từ quảng cáo đã chi', sourceRef: { type: 'manual', id: randomUUID() } },
            { shop, actor }), 201, 'FinanceEntryResponse');
            await json(await send('finance/entries/' + actual.id + '/post', { expectedVersion: actual.version, reason: 'Ghi chi thực tế' },
                { shop, actor }), 202, 'CommandResponse');
            assert.equal(await journals(), before + 1);
            const withActual = await get();
            assert.deepEqual(withActual.actualSpend, money('8', shop));
            assert.deepEqual(withActual.estimatedSpend, projection.estimatedSpend);
            assert.deepEqual(withActual.estimateCoverage, projection.estimateCoverage);
        }
        const [privileges] = await db.$queryRaw`SELECT has_table_privilege(current_user, 'advertising_estimates', 'UPDATE') AS update,
            has_table_privilege(current_user, 'advertising_estimates', 'DELETE') AS delete`;
        assert.deepEqual(privileges, { update: false, delete: false });
        console.log(JSON.stringify({ status: 'SC2_E03_REVIEWED_DAILY_ESTIMATES', shops: ['VND', 'LAK'], historyRowsPerShop: 3,
            daysWithEstimate: 2, daysInPeriod: 3, staleRevision: 412, crossShop: 404, unknownDay: null, zeroIsKnown: true,
            estimateJournals: 0, actualJournals: 1, estimateUnchangedAfterActual: true, runtimeCannotRewrite: true }));
    } finally {
        await estimates.close();
    }
});

test('SC2-E04 SC2-E05 SC2-E06 R65: private statement preview, durable import, partial allocation and actual COD fee preserve source identity', async () => {
    const shop = await openingShop();
    const { id: shopId, currency } = shop;
    const period = await ensurePeriod(shop, today);
    const at = new Date();
    const bank = await fixedAccount('bank', shop);
    const buyer = await admin.customer.create({ data: { shopId, displayName: 'Khách đối chiếu tổng hợp' } });
    const same = await deliveredDebt(admin, db, shop, buyer.id, at);
    const direct = await deliveredDebt(admin, db, shop, buyer.id, at);
    const independent = await deliveredDebt(admin, db, shop, buyer.id, at);
    for (const { order } of [same, direct]) {
        const evidence = await admin.paymentEvidence.create({ data: {
            shopId, orderId: order.id, kind: 'carrier_collection', amount: '249000', reference: 'CARRIER-COLLECT-' + randomUUID(),
            currency, verifiedAt: at, observedAt: at,
        } });
        await json(await send('orders/' + order.id + '/pay', { expectedVersion: order.version, method: 'external', amount: money('249000', shop),
            reference: evidence.reference, evidenceRef: evidence.id, reason: 'Chứng từ khách trả cho hãng giao hàng' }, { shop }), 202, 'CommandResponse');
    }
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
    const external = { b: 'BANK-INDEPENDENT-' + randomUUID(), direct: 'BANK-CARRIER-DIRECT-' + randomUUID(), first: 'BANK-COD-1-' + randomUUID(),
        last: 'BANK-COD-2-' + randomUUID(), deferred: 'BANK-BEFORE-PAY-' + randomUUID() };
    const line = (id, amount, reference) => [id, amount, currency, 'credit', at.toISOString(), reference].join(',');
    const csv = ['externalTransactionId,amount,currency,direction,occurredAt,referenceText',
        line(external.b, '249000', independent.order.id), line(external.first, '100000', same.order.id),
        line(external.direct, '249000', direct.order.id),
        line(external.last, '129000', same.order.id), line(separateReceipt.reference, '50000', 'Đã ghi trước khi nhập sao kê'),
        line(external.deferred, '1000', 'Ghi nhận phiếu sau khi nhập sao kê'),
        line(priorReceipt.reference, '50000', 'Trùng mã với giao dịch trên tài khoản khác'),
        line(external.b, '249000', independent.order.id)].join('\n');
    const imported = await ingest('bank', csv, bank.id, [7, 1]);
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
    const directBank = bankByRef.get(external.direct);
    const directReview = byTransaction.get(directBank.id);
    const directDebt = debts.find(item => item.source.id === direct.order.id);
    const nextDay = new Date(Date.now() + 25 * 60 * 60_000);
    await refreshOperationExceptions(db, nextDay);
    const bankException = { shopId, kind: 'unmatched_bank', sourceType: 'reconciliation_case', sourceId: directReview.id };
    assert.equal((await db.workItem.findFirstOrThrow({ where: bankException })).state, 'queued');
    await post('reconciliation-cases/' + directReview.id + '/match', {
        transactionId: directBank.id, expectedVersion: directReview.version, reason: 'Đã đối chiếu khoản hãng vận chuyển chuyển về',
        allocations: [{ resource: { type: 'debt', id: directDebt.id }, amount: money('249000', shop) }],
    }, 'CommandResponse', 202);
    assert.equal((await get('orders/' + direct.order.id, 'OrderResponse')).paymentState, 'settled');
    await refreshOperationExceptions(db, nextDay);
    assert.equal((await db.workItem.findFirstOrThrow({ where: bankException })).state, 'completed');
    const [directPayment] = await get('payment-reviews?kind=collection&stage=settled&q=' + direct.order.id, 'PaymentReviewListResponse');
    assert.deepEqual(directPayment.verified, money('249000', shop));
    assert.deepEqual(directPayment.bankTransactionIds, [directBank.id]);
    assert.deepEqual(directPayment.codSettlementIds, []);
    assert.equal(await db.workItem.count({ where: { shopId, kind: 'payment_mismatch', sourceType: 'order', sourceId: direct.order.id } }), 0);
    const debt = debts.find(item => item.source.id === independent.order.id);
    const bankTx = bankByRef.get(external.b);
    assert.equal((await get('bank-transactions/' + bankTx.id, 'BankTransactionResponse')).externalTransactionId, external.b);
    const review = byTransaction.get(bankTx.id);
    assert.deepEqual(review.suggestedResourceIds, [debt.id]);
    const matchedPath = 'reconciliation-cases/' + review.id + '/match';
    const allocation = (amount, expectedVersion = review.version) => ({ transactionId: bankTx.id, expectedVersion,
        reason: 'Đã xác minh giao dịch và công nợ', allocations: [{ resource: { type: 'debt', id: debt.id }, amount: money(amount, shop) }] });
    const terms = (version, disputeHold) => send('debts/' + debt.id, { expectedVersion: version, dueDate: null, disputeHold,
        reason: disputeHold ? 'Mở tranh chấp nguồn công nợ' : 'Đã giải quyết tranh chấp' }, { shop, method: 'PATCH' })
        .then(reply => json(reply, 200, 'DebtItemResponse'));
    const held = await terms(debt.version, true);
    assert.deepEqual((await get('reconciliation-cases/' + review.id, 'ReconciliationCaseResponse')).suggestedResourceIds, []);
    await post(matchedPath, allocation('90000'), 'Problem', 409);
    assert.deepEqual((await get('debts/' + debt.id, 'DebtItemResponse')).outstandingAmount, debt.outstandingAmount);
    await terms(held.version, false);
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
    for (const { order } of [same, direct]) {
        const applications = await db.collectionApplication.aggregate({
            where: { shopId, allocation: { orderId: order.id } }, _sum: { amount: true },
        });
        assert.equal(applications._sum.amount.toFixed(), '249000');
    }
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
    assert.deepEqual(cashflow.receipts, money('778000', shop));
    assert.deepEqual(cashflow.disbursements, money('9900', shop));
    assert.deepEqual((await get('finance/profit-loss' + window, 'ProfitLossResponse')).shippingExpense, money('20000', shop));
    await json(await request(path('payment-reviews', shop), other), 404, 'Problem');
});

test('SC2-E06-TERMS: due dates and dispute decisions use local dates, versions and isolated accounting', async context => {
    for (const [shop, actor, otherShop, foreign] of [[shopA, owner, shopB, other], [shopB, other, shopA, owner]]) {
        await context.test(shop.currency, async () => {
            const at = new Date();
            const calendarDate = localAccountingDate(at, shop.timezone);
            await ensurePeriod(shop, calendarDate, actor);
            const options = { shop, actor };
            const buyer = await json(await send('customers', { displayName: 'Đối tác kiểm công nợ', phone: '0900000000', email: null, notes: '' },
                options), 201, 'CustomerResponse');
            const { order } = await deliveredDebt(admin, db, shop, buyer.id, at);
            const get = (resource, code, schema, user = actor, tenant = shop) => request(path(resource, tenant), user).then(reply => json(reply, code, schema));
            const list = await get('debts?limit=100', 200, 'DebtItemListResponse');
            const debt = list.find(item => item.source.id === order.id);
            assert.ok(debt);
            assert.equal(debt.dueAt, null);
            const due = new Date(Date.parse(calendarDate) - 31 * 86_400_000).toISOString().slice(0, 10);
            const payload = { expectedVersion: debt.version, dueDate: due, disputeHold: true, reason: 'Chờ đối chiếu công nợ bằng chứng từ' };
            const resource = 'debts/' + debt.id;
            const update = (body, code, key = randomUUID(), overrides = {}) => send(resource, body, { ...options, method: 'PATCH', key, ...overrides })
                .then(reply => json(reply, code, code === 200 ? 'DebtItemResponse' : 'Problem'));
            const before = await db.financeJournal.count({ where: { shopId: shop.id } });
            const key = randomUUID();
            const held = await update(payload, 200, key);
            assert.equal(held.version, debt.version + 1);
            assert.equal(held.dueDate, due);
            assert.equal(held.agingBucket, 'overdue_31_60');
            assert.equal(held.daysOverdue, 31);
            assert.equal(held.disputeHold, true);
            assert.equal(held.disputed, true);
            assert.deepEqual(held.outstandingAmount, debt.outstandingAmount);
            assert.equal((await update(payload, 200, key)).version, held.version);
            await update({ ...payload, expectedVersion: debt.version }, 412);
            await update({ ...payload, expectedVersion: held.version }, 404, randomUUID(), { shop: otherShop, actor: foreign });
            if (shop.id === shopA.id) await update({ ...payload, expectedVersion: held.version }, 403, randomUUID(), { actor: restricted });
            assert.equal((await get(resource, 200, 'DebtItemResponse')).disputeHold, true);
            const released = await update({ ...payload, expectedVersion: held.version, dueDate: calendarDate,
                disputeHold: false, reason: 'Đủ chứng từ xác nhận gỡ giữ công nợ' }, 200);
            assert.equal(released.disputed, false);
            assert.equal(released.agingBucket, 'current');
            assert.equal(released.daysOverdue, 0);
            assert.deepEqual(released.outstandingAmount, debt.outstandingAmount);
            assert.equal(await db.financeJournal.count({ where: { shopId: shop.id } }), before);
            const audits = await db.auditEntry.findMany({ where: { shopId: shop.id, action: 'updateDebtTerms', resourceId: debt.id },
                orderBy: { createdAt: 'asc' } });
            assert.deepEqual(audits.map(row => row.metadata.reason), [payload.reason, 'Đủ chứng từ xác nhận gỡ giữ công nợ']);
            console.log(JSON.stringify({ case: 'SC2_E06_DEBT_TERMS', currency: shop.currency, protected: true,
                pastDueDays: held.daysOverdue, staleEdit412: true, ledgerUnchanged: true, decisions: audits.length }));
        });
    }
});

async function postClosurePayment(shop, orderId, refund, amount) {
    const resource = 'orders/' + orderId;
    const now = new Date();
    const evidence = await admin.paymentEvidence.create({ data: { shopId: shop.id, orderId,
        kind: refund ? 'observed_refund' : 'cash_receipt', amount, currency: shop.currency, reference: randomUUID(), observedAt: now, verifiedAt: now } });
    const current = await json(await request(path(resource, shop)), 200, 'OrderResponse');
    return json(await send(resource + (refund ? '/refund' : '/pay'), {
        expectedVersion: current.version, reason: 'Ghi nhận giao dịch theo chứng từ', amount: money(amount, shop), evidenceRef: evidence.id,
        ...(refund ? { paymentReference: evidence.reference } : { method: 'cash', reference: evidence.reference }),
    }, { shop }), 202, 'CommandResponse');
}

test('SHOP-FINANCE: an undelivered returned COD order can close once its deposit is refunded', async () => {
    const shop = await openingShop();
    const shopId = shop.id;
    await ensurePeriod(shop, localAccountingDate(new Date(), shop.timezone));
    const { draft } = await paymentFixtures(shop);
    const order = await json(await send('orders', { ...draft, paymentMethod: 'cod' }, { shop }), 201, 'OrderResponse');
    await postClosurePayment(shop, order.id, false, '2000');
    await admin.salesOrder.update({ where: { shopId_id: { shopId, id: order.id } },
        data: { orderState: 'completed', fulfillmentState: 'returned' } });
    const shipment = await admin.shipment.create({ data: { shopId, orderId: order.id, warehouseId: shop.defaultWarehouseId,
        state: 'returned', handedOverAt: new Date(), lastEventAt: new Date(), currency: shop.currency } });
    await admin.orderReturn.create({ data: { shopId, orderId: order.id, shipmentId: shipment.id, reason: 'Chưa giao được',
        state: 'inspected', refundObligation: '2000', receivableCredit: '0' } });
    const close = () => send('close', undefined, { shop, version: 1 });
    assert.deepEqual((await json(await close(), 409, 'Problem')).errors.map(e => e.code), ['RECONCILIATION']);
    await postClosurePayment(shop, order.id, true, '2000');
    await json(await close(), 200, 'ShopResponse');
});

for (const paymentMethod of ['prepay', 'cod']) {
    test('SHOP-FINANCE: ' + paymentMethod + ' deposit, full refund and repayment follow the net posted balance', async () => {
        const shop = await openingShop();
        const options = { shop };
        await ensurePeriod(shop, localAccountingDate(new Date(), shop.timezone));
        const { draft } = await paymentFixtures(shop);
        const order = await json(await send('orders', { ...draft, paymentMethod }, options), 201, 'OrderResponse');
        const resource = 'orders/' + order.id;
        const close = version => send('close', undefined, { shop, version });
        await postClosurePayment(shop, order.id, false, '5000');
        assert.deepEqual((await json(await close(1), 409, 'Problem')).errors.map(error => error.code), ['RECONCILIATION']);
        await postClosurePayment(shop, order.id, true, '5000');
        const first = await json(await close(1), 200, 'ShopResponse');
        const open = await json(await send('reopen', undefined, { shop, version: first.version }), 200, 'ShopResponse');
        await postClosurePayment(shop, order.id, false, '15000.01');
        assert.equal((await json(await close(open.version), 409, 'Problem')).errors[0].code, 'RECONCILIATION');
        await admin.salesOrder.update({ where: { shopId_id: { shopId: shop.id, id: order.id } },
            data: { orderState: 'completed', fulfillmentState: 'delivered' } });
        assert.equal((await json(await request(path(resource, shop)), 200, 'OrderResponse')).amountDue.amount, '0');
        await json(await close(open.version), 200, 'ShopResponse');
    });
}
