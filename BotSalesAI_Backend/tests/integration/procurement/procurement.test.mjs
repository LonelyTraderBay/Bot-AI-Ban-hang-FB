import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { URLSearchParams } from 'node:url';
import { createApp } from '../../../apps/api/dist/app.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createContractValidator, schemaFromContract } from '../../../apps/api/dist/http/contracts.js';
import { localAccountingDate } from '../../../apps/api/dist/modules/finance/index.js';
import { dispatchPurchases } from '../../../apps/api/dist/modules/procurement/index.js';
import { readAuthConfig } from '../../../apps/api/dist/modules/workspace/index.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { fixtureWriter } from '../orders/fixtures.mjs';
import { reviewedEvidenceFixture, sha256 } from '../helpers/reviewed-evidence-fixture.mjs';
import { assertFixtureDatabase, fixtureSession } from '../workspace/session-fixture.mjs';

const { components } = JSON.parse(readFileSync(new URL('../../../../botsales-kit/contracts/openapi.json', import.meta.url)));
const validator = createContractValidator(components.schemas);
const [shopA, shopB] = fixtureShops;
const shopId = shopA.id;
const money = amount => ({ amount, currency: shopA.currency });
let app, db, admin, auth, base, owner, other, reader;

before(async () => {
    process.env.PROCUREMENT_FIXTURE_ADAPTER = '1';
    const url = readDatabaseUrl(process.env);
    assertFixtureDatabase(url);
    auth = readAuthConfig(process.env);
    assert.ok(auth);
    const database = new Database(url);
    db = database.client;
    admin = fixtureWriter();
    [owner, other, reader] = await Promise.all(['p0-editor', 'p0-editor-b', 'p0-reader'].map(subject => fixtureSession(db, subject)));
    app = await createApp({ database, auth, quiet: true });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl() + '/api/v2';
    for (const actor of [owner, other, reader]) {
        const session = await assertData(await fetch(base + '/session', { headers: { cookie: actor.cookie } }), 200, 'SessionResponse');
        actor.csrf = session.csrfToken;
    }
});

after(async () => {
    const ids = [owner, other, reader].filter(Boolean).map(actor => actor.id);
    if (ids.length) await db.session.updateMany({ where: { id: { in: ids } }, data: { revokedAt: new Date() } });
    await admin?.$disconnect();
    await app?.close();
});

async function assertData(response, status, schema) {
    assert.equal(response.status, status, response.url);
    const body = await response.json();
    const validate = validator.compile(schemaFromContract(schema));
    assert.equal(validate(body), true, JSON.stringify(validate.errors));
    return schema === 'Problem' ? body : body.data;
}

function call(path, { body, method = 'GET', actor = owner, shop = shopA, key = randomUUID(), version } = {}) {
    const headers = { cookie: actor.cookie };
    if (method !== 'GET') Object.assign(headers, { origin: auth.appOrigin, 'content-type': 'application/json',
        'idempotency-key': key, 'x-csrf-token': actor.csrf });
    if (version !== undefined) headers['if-match'] = '"' + version + '"';
    return fetch(base + '/shops/' + shop.id + '/' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

function get(path, schema, options) {
    return call(path, options).then(response => assertData(response, 200, schema));
}

function write(path, body, status, schema, options = {}) {
    return call(path, { method: 'POST', body, ...options }).then(response => assertData(response, status, schema));
}

async function product() {
    const sku = 'BE16-' + randomUUID();
    const result = await write('products', { name: sku, description: '', categoryId: null, status: 'active', imageFileIds: [],
        variants: [{ sku, name: sku, options: {}, active: true, price: money('80') }] }, 201, 'ProductResponse');
    return result.variants[0];
}

function supplierInput(approvedAdapterId = null) {
    return { name: 'Nhà cung cấp ' + randomUUID(), contactLabel: 'Đầu mối tổng hợp', currency: shopA.currency,
        leadTimeDays: 2, paymentTerms: 'Thanh toán theo hàng đạt', sendMethod: approvedAdapterId ? 'approved_adapter' : 'manual', approvedAdapterId };
}

function status(supplier, target = 'approved', options) {
    return write('suppliers/' + supplier.id + '/status', { expectedVersion: supplier.version, status: target, reason: 'Đã đối chiếu hồ sơ tổng hợp' },
        200, 'SupplierResponse', options);
}

function offerData(supplier, variant) {
    return { supplierId: supplier.id, variantId: variant.id, unitCost: money('33.335'), minimumQuantity: 3,
        packSize: 2, leadTimeDays: 2, validUntil: null };
}

async function prepareSupplier(variant, outcome = null) {
    const route = outcome && await admin.supplierDispatchRoute.create({ data: { shopId, outcome } });
    const vendor = await write('suppliers', supplierInput(route?.id ?? null), 201, 'SupplierResponse');
    const supplier = await status(vendor);
    const offer = await write('supplier-offers', offerData(supplier, variant), 201, 'SupplierOfferResponse');
    return { supplier, offer };
}

function purchaseInput(supplier, offer, count, suggestionId = null) {
    return { supplierId: supplier.id, warehouseId: shopA.defaultWarehouseId, suggestionId,
        lines: [{ supplierOfferId: offer.id, variantId: offer.variantId, quantity: count }] };
}

function purchase(id, options) {
    return get('purchase-orders/' + id, 'PurchaseOrderResponse', options);
}

function approve(approval, decision = 'approve') {
    return write('approvals/' + approval.id + '/decision', {
        expectedVersion: approval.version, intentHash: approval.intentHash, decision, reason: 'Đối chiếu nội dung và hạn duyệt',
    }, 200, 'ApprovalResponse');
}

async function proof(order, kind, externalRef) {
    return admin.procurementEvidence.create({ data: { shopId, purchaseOrderId: order.id, kind, externalRef, occurredAt: new Date() } });
}

async function period() {
    const date = localAccountingDate(new Date(), shopA.timezone);
    const day = new Date(date + 'T00:00:00Z');
    const existing = await db.accountingPeriod.findFirst({ where: { shopId, startDate: { lte: day }, endDate: { gte: day } } });
    if (existing) assert.equal(existing.state, 'open');
    else await write('periods', { startDate: date, endDate: date, reason: 'Kỳ thử công nợ nhà cung cấp' }, 201, 'AccountingPeriodResponse');
}

test('SC2-D02, SC2-D03, SC2-D04 and SC2-D07: supplier and offer scopes, fixed reorder evaluation and duplicate proposal prevention', async () => {
    await write('suppliers', supplierInput(), 403, 'Problem', { actor: reader });
    await write('suppliers', supplierInput(randomUUID()), 422, 'Problem');
    const vendor = await write('suppliers', supplierInput(), 201, 'SupplierResponse');
    const updated = await write('suppliers/' + vendor.id, { expectedVersion: vendor.version, leadTimeDays: 3 },
        200, 'SupplierResponse', { method: 'PATCH' });
    assert.equal(updated.leadTimeDays, 3);
    const read = await get('suppliers/' + vendor.id, 'SupplierResponse');
    assert.equal(read.version, updated.version);
    await assertData(await call('suppliers/' + vendor.id, { actor: other, shop: shopB }), 404, 'Problem');
    const listed = await get('suppliers?limit=100', 'SupplierListResponse');
    assert.ok(listed.some(row => row.id === vendor.id));
    const variant = await product();
    const offer = await write('supplier-offers', offerData(vendor, variant), 201, 'SupplierOfferResponse');
    await write('purchase-orders', purchaseInput(vendor, offer, 6), 409, 'Problem');
    const supplier = await status(updated);
    await write('supplier-offers', offerData(supplier, variant), 404, 'Problem', { shop: shopB, actor: other });
    const expired = await write('supplier-offers', { ...offerData(supplier, variant), validUntil: '2001-01-01T00:00:00Z' },
        201, 'SupplierOfferResponse');
    await write('purchase-orders', purchaseInput(supplier, expired, 6), 422, 'Problem');
    await write('purchase-orders', purchaseInput(supplier, offer, 3), 422, 'Problem');
    assert.deepEqual((await get('supplier-offers/' + offer.id, 'SupplierOfferResponse')).unitCost, offer.unitCost);
    assert.ok((await get('supplier-offers?limit=100', 'SupplierOfferListResponse')).some(row => row.id === offer.id));
    const input = { variantId: variant.id, warehouseId: shopA.defaultWarehouseId, supplierOfferId: offer.id,
        reorderPoint: 1, targetQuantity: 5, safetyStock: 0, mode: 'draft_for_approval', enabled: true, budgetPolicyId: null };
    await write('reorder-rules', { ...input, mode: 'auto_send' }, 422, 'Problem');
    const rule = await write('reorder-rules', input, 201, 'ReorderRuleResponse');
    await write('reorder-rules', input, 409, 'Problem');
    await write('reorder-rules/' + rule.id, { ...input, expectedVersion: rule.version + 1 }, 412, 'Problem', { method: 'PUT' });
    const changed = await write('reorder-rules/' + rule.id, { ...input, expectedVersion: rule.version, safetyStock: 1 },
        200, 'ReorderRuleResponse', { method: 'PUT' });
    try {
        assert.equal((await get('reorder-rules/' + rule.id, 'ReorderRuleResponse')).safetyStock, 1);
        assert.ok((await get('reorder-rules?limit=100', 'ReorderRuleListResponse')).some(row => row.id === rule.id));
        const key = randomUUID();
        const evaluate = options => write('purchase-suggestions/evaluate', undefined, 202, 'CommandResponse', options);
        const evaluated = await evaluate({ key });
        assert.equal((await evaluate({ key })).id, evaluated.id);
        await evaluate();
        const suggestions = await get('purchase-suggestions?limit=100', 'PurchaseSuggestionListResponse');
        const matched = suggestions.filter(row => row.variantId === variant.id);
        assert.equal(matched.length, 1);
        const [proposal] = matched;
        assert.equal(proposal.suggestedQuantity, 6);
        assert.equal(proposal.available, 0);
        assert.match(proposal.reason, /^Quy tắc min-max/);
        const selected = purchaseInput(supplier, offer, proposal.suggestedQuantity, proposal.id);
        const race = await Promise.all([call('purchase-orders', { method: 'POST', body: selected }),
            call('purchase-orders', { method: 'POST', body: selected })]);
        assert.deepEqual(race.map(response => response.status).sort(), [201, 409]);
        const order = await assertData(race.find(response => response.status === 201), 201, 'PurchaseOrderResponse');
        await assertData(race.find(response => response.status === 409), 409, 'Problem');
        assert.deepEqual(order.total, money('200.01'));
        const laterOffer = await write('supplier-offers', { ...offerData(supplier, variant), unitCost: money('40') },
            201, 'SupplierOfferResponse');
        assert.notEqual(laterOffer.id, offer.id);
        assert.deepEqual((await get('supplier-offers/' + offer.id, 'SupplierOfferResponse')).unitCost, offer.unitCost);
        assert.deepEqual((await purchase(order.id)).lines[0].unitCost, offer.unitCost);
        assert.deepEqual(laterOffer.unitCost, money('40'));
        await evaluate();
        const waiting = await get('purchase-suggestions/' + proposal.id, 'PurchaseSuggestionResponse');
        assert.equal(waiting.activePurchaseOrderId, order.id);
        assert.equal(waiting.openProposalQuantity, 6);
        assert.equal(waiting.suggestedQuantity, 0);
        const cancelled = await write('purchase-orders/' + order.id + '/cancel', { expectedVersion: order.version, reason: 'Hủy nhu cầu thử nghiệm' },
            202, 'CommandResponse');
        assert.equal(cancelled.status, 'succeeded');
        await evaluate();
        const again = await get('purchase-suggestions/' + proposal.id, 'PurchaseSuggestionResponse');
        assert.equal(again.activePurchaseOrderId, null);
        assert.equal(again.suggestedQuantity, 6);
    } finally {
        await write('reorder-rules/' + rule.id, { ...input, enabled: false, expectedVersion: changed.version },
            200, 'ReorderRuleResponse', { method: 'PUT' });
    }
});

test('SC2-C05-WAREHOUSE: an open purchase blocks archive and purchase creation cannot race past archive', async () => {
    const member = { shopId_userId: { shopId, userId: reader.userId } };
    const prior = await admin.membership.findUniqueOrThrow({ where: member });
    await admin.membership.update({ where: member, data: { roles: ['manager'], permissionVersion: { increment: 1 } } });
    try {
        const createWarehouse = () => write('warehouses', {
            name: 'Kho nhập hàng', code: 'PO-' + randomUUID().slice(0, 8), addressLine: 'Địa chỉ kho thử',
        }, 201, 'WarehouseResponse', { actor: reader });
        const created = await createWarehouse();
        const warehousePath = 'warehouses/' + created.id;
        const updated = await write(warehousePath, { addressLine: 'Địa chỉ đã kiểm' }, 200, 'WarehouseResponse',
            { actor: reader, method: 'PATCH', version: created.version });
        const variant = await product();
        const { supplier, offer } = await prepareSupplier(variant);
        const purchaseAt = warehouseId => ({ ...purchaseInput(supplier, offer, 6), warehouseId });
        const archive = warehouse => call('warehouses/' + warehouse.id + '/archive', { method: 'POST', actor: reader,
            body: { expectedVersion: warehouse.version, reason: 'Đã kiểm các đơn nhập của kho' } });
        const order = await write('purchase-orders', purchaseAt(updated.id), 201, 'PurchaseOrderResponse');
        await assertData(await archive(updated), 409, 'Problem');
        assert.equal((await get(warehousePath, 'WarehouseResponse')).status, 'active');
        await write('purchase-orders/' + order.id + '/cancel', { expectedVersion: order.version, reason: 'Hủy đơn nhập thử' }, 202, 'CommandResponse');
        await assertData(await archive(updated), 202, 'CommandResponse');
        assert.equal((await get(warehousePath, 'WarehouseResponse')).status, 'archived');
        const historical = await purchase(order.id);
        assert.deepEqual([historical.status, historical.warehouseId, historical.total], ['cancelled', updated.id, order.total]);
        await write('purchase-orders', purchaseAt(updated.id), 409, 'Problem');

        const raceWarehouse = await createWarehouse();
        const [bought, archived] = await Promise.all([
            call('purchase-orders', { method: 'POST', body: purchaseAt(raceWarehouse.id) }),
            archive(raceWarehouse),
        ]);
        assert.equal(bought.status, archived.status === 202 ? 409 : 201);
        assert.equal(archived.status, bought.status === 201 ? 409 : 202);
        await Promise.all([bought.body.cancel(), archived.body.cancel()]);
        console.log(JSON.stringify({ status: 'SC2_C05_WAREHOUSE_OPEN_PURCHASE', blockedWithOrder: true,
            archivedAfterCancellation: true, managerWrite: true, historicalRead: true, exclusiveRace: true }));
    } finally {
        await admin.membership.update({ where: member, data: { roles: prior.roles, permissionVersion: { increment: 1 } } });
    }
});

test('SC2-D05, SC2-F04 and SC2-F05: approval binds current purchase intent, unknown send is held, and confirmation is evidenced', async () => {
    const variant = await product();
    const { supplier, offer } = await prepareSupplier(variant, 'unknown');
    const row = await write('purchase-orders', purchaseInput(supplier, offer, 6), 201, 'PurchaseOrderResponse');
    const path = 'purchase-orders/' + row.id;
    assert.ok((await get('purchase-orders?limit=100', 'PurchaseOrderListResponse')).some(item => item.id === row.id));
    const generic = { action: 'purchase.send', resource: { type: 'purchase_order', id: row.id }, resourceVersion: row.version,
        intentHash: row.intentHash, reason: 'Phê duyệt phương án mua cụ thể' };
    await write('approvals', { ...generic, intentHash: 'a'.repeat(64) }, 409, 'Problem');
    const approval = await write('approvals', generic, 201, 'ApprovalResponse');
    assert.equal(approval.resourceVersion, row.version + 1);
    assert.equal((await get('approvals/' + approval.id, 'ApprovalResponse')).status, 'pending');
    assert.ok((await get('approvals?limit=100', 'ApprovalListResponse')).some(item => item.id === approval.id));
    await write('approvals/' + approval.id + '/decision', { expectedVersion: approval.version + 1, intentHash: row.intentHash,
        decision: 'approve', reason: 'Phiên bản thử bị sai' }, 412, 'Problem');
    await write('approvals/' + approval.id + '/decision', { expectedVersion: approval.version, intentHash: 'a'.repeat(64),
        decision: 'approve', reason: 'Nội dung thử bị đổi' }, 409, 'Problem');
    assert.equal((await approve(approval, 'reject')).status, 'rejected');
    const draft = await purchase(row.id);
    const requested = await write(path + '/request-approval', { expectedVersion: draft.version }, 200, 'ApprovalResponse');
    const accepted = await approve(requested);
    const approved = await purchase(row.id);
    assert.equal(approved.status, 'approved');
    assert.equal(accepted.resourceVersion, approved.version);
    const payload = { expectedVersion: approved.version, approvalId: accepted.id, intentHash: approved.intentHash };
    await write(path + '/send', { ...payload, approvalId: approval.id }, 409, 'Problem');
    await write(path + '/send', payload, 403, 'Problem', { actor: reader });
    delete process.env.PROCUREMENT_FIXTURE_ADAPTER;
    try {
        await write(path + '/send', payload, 503, 'Problem');
        assert.equal((await purchase(row.id)).status, 'approved');
        assert.equal(await db.purchaseDispatch.count({ where: { shopId, purchaseOrderId: row.id } }), 0);
    } finally {
        process.env.PROCUREMENT_FIXTURE_ADAPTER = '1';
    }
    const sendKey = randomUUID();
    const sent = await write(path + '/send', payload, 202, 'CommandResponse', { key: sendKey });
    assert.equal(sent.status, 'accepted');
    assert.equal((await purchase(row.id)).status, 'sending');
    await Promise.all([dispatchPurchases(db, auth), dispatchPurchases(db, auth)]);
    const unknown = await purchase(row.id);
    assert.equal(unknown.status, 'unknown');
    const query = new URLSearchParams({ kind: 'sendPurchaseOrder', q: sha256(sendKey) });
    const [located] = await get('commands?' + query, 'CommandListResponse');
    assert.equal(located.status, 'unknown');
    assert.equal(located.id, sent.id);
    const duplicate = await write(path + '/send', payload, 202, 'CommandResponse', { key: sendKey });
    assert.equal(duplicate.status, 'unknown');
    await write(path + '/send', { ...payload, expectedVersion: unknown.version }, 409, 'Problem');
    await write(path + '/cancel', { expectedVersion: unknown.version, reason: 'Không hủy khi còn đợi đối chiếu' }, 409, 'Problem');
    await write(path + '/confirm', { expectedVersion: unknown.version, externalReference: 'SUP-001', supplierConfirmationRef: randomUUID() },
        422, 'Problem');
    const observed = await proof(row, 'supplier_confirmation', 'SUP-' + randomUUID());
    const confirmed = await write(path + '/confirm', { expectedVersion: unknown.version, externalReference: observed.externalRef,
        supplierConfirmationRef: observed.id }, 200, 'PurchaseOrderResponse');
    assert.equal(confirmed.status, 'confirmed');
    assert.equal((await get('commands/' + sent.id, 'CommandResponse')).status, 'succeeded');
    assert.equal((await get('approvals/' + accepted.id, 'ApprovalResponse')).status, 'consumed');
    assert.equal(await db.purchaseDispatch.count({ where: { shopId, purchaseOrderId: row.id } }), 1);
    assert.equal(await db.auditEntry.count({ where: { shopId, resourceId: row.id, action: 'dispatchPurchaseFixture' } }), 1);
    const stock = await db.stockPosition.findUniqueOrThrow({
        where: { shopId_warehouseId_variantId: { shopId, warehouseId: row.warehouseId, variantId: variant.id } },
    });
    assert.deepEqual([stock.onHand, stock.inbound], [0, 6]);
});

test('SC2-D08: receipts post one source, keep damaged goods unavailable and accrue payable on accepted quantities', async () => {
    await period();
    const variant = await product();
    const { supplier, offer } = await prepareSupplier(variant);
    const row = await write('purchase-orders', purchaseInput(supplier, offer, 6), 201, 'PurchaseOrderResponse');
    const path = 'purchase-orders/' + row.id;
    const approval = await approve(await write(path + '/request-approval', { expectedVersion: row.version }, 200, 'ApprovalResponse'));
    const approved = await purchase(row.id);
    await write(path + '/send', { expectedVersion: approved.version, approvalId: approval.id, intentHash: approved.intentHash }, 202, 'CommandResponse');
    await dispatchPurchases(db, auth);
    const sent = await purchase(row.id);
    assert.equal(sent.status, 'sent');
    const confirmedProof = await proof(row, 'supplier_confirmation', sent.externalReference);
    const confirmed = await write(path + '/confirm', {
        expectedVersion: sent.version, externalReference: sent.externalReference, supplierConfirmationRef: confirmedProof.id,
    }, 200, 'PurchaseOrderResponse');
    const book = (current, document, acceptedQuantity, rejectedQuantity = 0) => ({
        purchaseOrderId: row.id, expectedPurchaseVersion: current.version, sourceDocumentRef: document.id,
        lines: [{ purchaseLineId: row.lines[0].id, acceptedQuantity, rejectedQuantity, reason: rejectedQuantity ? 'Bao bì hỏng lúc nhận' : '' }],
    });
    await write('goods-receipts', book(confirmed, confirmedProof, 3), 422, 'Problem');
    const firstDocument = await proof(row, 'goods_receipt', 'DELIVERY-' + randomUUID());
    const body = book(confirmed, firstDocument, 2, 1);
    const receipt = await write('goods-receipts', body, 201, 'GoodsReceiptResponse');
    await write('goods-receipts', body, 409, 'Problem');
    const balance = () => db.stockPosition.findUniqueOrThrow({
        where: { shopId_warehouseId_variantId: { shopId, warehouseId: row.warehouseId, variantId: variant.id } },
    });
    assert.deepEqual([(await balance()).onHand, (await balance()).quarantine], [0, 0]);
    const receiptPath = 'goods-receipts/' + receipt.id;
    assert.equal((await get(receiptPath, 'GoodsReceiptResponse')).status, 'draft');
    assert.ok((await get('goods-receipts?limit=100', 'GoodsReceiptListResponse')).some(row => row.id === receipt.id));
    await assertData(await call(receiptPath, { actor: other, shop: shopB }), 404, 'Problem');
    const key = randomUUID();
    const post = () => write(receiptPath + '/post', { expectedVersion: receipt.version }, 202, 'CommandResponse', { key });
    const receiptCommand = await post();
    assert.equal((await post()).id, receiptCommand.id);
    const partial = await purchase(row.id);
    assert.equal(partial.status, 'part_received');
    assert.equal(partial.lines[0].receivedQuantity, 2);
    assert.equal(partial.lines[0].rejectedQuantity, 1);
    const midway = await balance();
    assert.deepEqual([midway.onHand, midway.quarantine, midway.inbound, midway.carryingValue.toFixed()], [2, 1, 3, '66.67']);
    const lastDocument = await proof(row, 'goods_receipt', 'DELIVERY-' + randomUUID());
    await write('goods-receipts', book(partial, lastDocument, 4), 422, 'Problem');
    const second = await write('goods-receipts', book(partial, lastDocument, 3), 201, 'GoodsReceiptResponse');
    const extra = await write('goods-receipts', book(partial, await proof(row, 'goods_receipt', 'OTHER-' + randomUUID()), 3),
        201, 'GoodsReceiptResponse');
    await write('goods-receipts/' + second.id + '/post', { expectedVersion: second.version }, 202, 'CommandResponse');
    await write('goods-receipts/' + extra.id + '/post', { expectedVersion: extra.version }, 409, 'Problem');
    assert.equal((await purchase(row.id)).status, 'received');
    const after = await balance();
    assert.deepEqual([after.onHand, after.quarantine, after.inbound, after.carryingValue.toFixed()], [5, 1, 0, '166.675']);
    const sources = [receipt.id, second.id];
    const journals = await db.financeJournal.findMany({ where: { shopId, sourceType: 'goods_receipt', sourceId: { in: sources } },
        include: { lines: { include: { account: true } } } });
    assert.equal(journals.length, 2);
    assert.deepEqual(journals.map(row => row.lines.find(line => line.account.systemKey === 'supplier_payable').credit.toFixed()).sort(),
        ['100.005', '66.67']);
    assert.equal(await db.stockMovement.count({ where: { shopId, sourceType: 'goods_receipt', sourceId: { in: sources } } }), 2);
});

test('T071 manual procurement holds one approved handoff and posts stock only from reviewed documents', async t => {
    await period();
    const variant = await product();
    const { supplier, offer } = await prepareSupplier(variant);
    const row = await write('purchase-orders', purchaseInput(supplier, offer, 6), 201, 'PurchaseOrderResponse');
    const path = 'purchase-orders/' + row.id;
    const approval = await approve(await write(path + '/request-approval', { expectedVersion: row.version }, 200, 'ApprovalResponse'));
    const approved = await purchase(row.id);
    const payload = { expectedVersion: approved.version, approvalId: approval.id, intentHash: approved.intentHash };
    const key = randomUUID();
    const savedScope = process.env.PROCUREMENT_MANUAL_SUPPLIERS;
    delete process.env.PROCUREMENT_FIXTURE_ADAPTER;
    t.after(() => {
        process.env.PROCUREMENT_FIXTURE_ADAPTER = '1';
        if (savedScope === undefined) delete process.env.PROCUREMENT_MANUAL_SUPPLIERS;
        else process.env.PROCUREMENT_MANUAL_SUPPLIERS = savedScope;
    });

    process.env.PROCUREMENT_MANUAL_SUPPLIERS = shopB.id + '/' + supplier.id;
    assert.ok(!(await purchase(row.id)).allowedActions.includes('send'));
    await write(path + '/send', payload, 503, 'Problem', { key });
    process.env.PROCUREMENT_MANUAL_SUPPLIERS = shopId + '/' + supplier.id;
    assert.ok((await purchase(row.id)).allowedActions.includes('manual_handoff'));
    await write(path + '/send', { ...payload, expectedVersion: approved.version + 1 }, 412, 'Problem');
    await write(path + '/send', payload, 403, 'Problem', { actor: reader });
    const send = () => write(path + '/send', payload, 202, 'CommandResponse', { key });
    const [handoff, replay] = await Promise.all([send(), send()]);
    assert.deepEqual(handoff, replay);
    assert.equal(handoff.status, 'accepted');
    const waiting = await purchase(row.id);
    assert.equal(waiting.status, 'unknown');
    assert.equal(waiting.externalReference, null);
    await write(path + '/send', { ...payload, expectedVersion: waiting.version }, 409, 'Problem');
    await dispatchPurchases(db, auth);
    const dispatch = await db.purchaseDispatch.findUniqueOrThrow({ where: { shopId_purchaseOrderId: { shopId, purchaseOrderId: row.id } } });
    assert.deepEqual([dispatch.manualHandoff, dispatch.dueAt, dispatch.commandId], [true, null, handoff.id]);
    const work = { shopId, sourceType: 'purchase_order', sourceId: row.id, kind: 'recovery' };
    assert.equal(await db.workItem.count({ where: work }), 1);
    assert.equal(await db.auditEntry.count({ where: { shopId, resourceId: row.id, action: 'sendPurchaseOrder' } }), 1);
    assert.equal(await db.auditEntry.count({ where: { shopId, resourceId: row.id, action: 'dispatchPurchaseFixture' } }), 0);

    const content = 'Synthetic supplier evidence for ' + row.id + '\n';
    const { close, prepare, execute: command } = await reviewedEvidenceFixture('procurement', { document: content });
    t.after(close);
    const review = {
        shopId, purchaseOrderId: row.id, supplierId: supplier.id, reviewerId: owner.userId,
        intentHash: waiting.intentHash, expectedVersion: waiting.version,
        kind: 'supplier_confirmation', externalRef: 'MANUAL-PO-' + row.id, occurredAt: new Date().toISOString(),
    };
    await assert.rejects(command(await prepare({ ...review, database: 'unapproved:5432/other' })), { stderr: /Database target/ });
    await assert.rejects(command(await prepare({ ...review, reviewerId: other.userId })), { stderr: /rejected \(404\)/ });
    await assert.rejects(command(await prepare({ ...review, reviewerId: reader.userId })), { stderr: /rejected \(403\)/ });
    await assert.rejects(command(await prepare({ ...review, expectedVersion: waiting.version - 1 })), { stderr: /rejected \(412\)/ });
    await assert.rejects(command(await prepare({ ...review, occurredAt: '2000-01-01T00:00:00.000Z' })), { stderr: /rejected \(422\)/ });
    await assert.rejects(command(await prepare({ ...review, documentSha256: sha256('different bytes') })), { stderr: /Document checksum mismatch/ });
    const original = await prepare(review);
    await assert.rejects(command(sha256('different manifest')), { stderr: /Attestation checksum mismatch/ });
    const [first, second] = await Promise.all([command(original), command(original)]);
    const observed = JSON.parse(first.stdout).evidenceId;
    assert.equal(JSON.parse(second.stdout).evidenceId, observed);
    await assert.rejects(command(await prepare({ ...review, occurredAt: new Date().toISOString() })), { stderr: /rejected \(409\)/ });
    const confirm = { expectedVersion: waiting.version, externalReference: review.externalRef, supplierConfirmationRef: observed };
    const unreviewed = await proof(row, 'supplier_confirmation', 'UNREVIEWED-' + row.id);
    await write(path + '/confirm', { ...confirm, supplierConfirmationRef: unreviewed.id, externalReference: unreviewed.externalRef }, 422, 'Problem');
    const confirmed = await write(path + '/confirm', confirm, 200, 'PurchaseOrderResponse');
    assert.equal(confirmed.status, 'confirmed');
    assert.equal((await get('commands/' + handoff.id, 'CommandResponse')).status, 'succeeded');
    assert.equal((await db.workItem.findFirstOrThrow({ where: work })).state, 'completed');
    assert.equal(JSON.parse((await command(await prepare(review))).stdout).evidenceId, observed);

    const createReceipt = sourceDocumentRef => ({
        purchaseOrderId: row.id, expectedPurchaseVersion: confirmed.version, sourceDocumentRef,
        lines: [{ purchaseLineId: row.lines[0].id, acceptedQuantity: 2, rejectedQuantity: 1, reason: 'Bao bì hỏng lúc nhận' }],
    });
    const unreviewedReceipt = await proof(row, 'goods_receipt', 'UNREVIEWED-RECEIPT-' + row.id);
    await write('goods-receipts', createReceipt(unreviewedReceipt.id), 422, 'Problem');
    const delivery = { ...review, expectedVersion: confirmed.version, kind: 'goods_receipt',
        externalRef: 'MANUAL-RECEIPT-' + row.id, occurredAt: new Date().toISOString() };
    const evidenceId = JSON.parse((await command(await prepare(delivery))).stdout).evidenceId;
    const receipt = await write('goods-receipts', createReceipt(evidenceId), 201, 'GoodsReceiptResponse');
    await write('goods-receipts', createReceipt(evidenceId), 409, 'Problem');
    const post = await write('goods-receipts/' + receipt.id + '/post', { expectedVersion: receipt.version }, 202, 'CommandResponse');
    assert.equal(post.status, 'succeeded');
    const stock = await db.stockPosition.findUniqueOrThrow({
        where: { shopId_warehouseId_variantId: { shopId, warehouseId: row.warehouseId, variantId: variant.id } },
    });
    assert.deepEqual([stock.onHand, stock.quarantine, stock.inbound, stock.carryingValue.toFixed()], [2, 1, 3, '66.67']);
    const journal = await db.financeJournal.findFirstOrThrow({ where: { shopId, sourceType: 'goods_receipt', sourceId: receipt.id },
        include: { lines: { include: { account: true } } } });
    assert.equal(journal.lines.find(line => line.account.systemKey === 'supplier_payable').credit.toFixed(), '66.67');
    assert.equal(await db.auditEntry.count({ where: { shopId, resourceId: row.id, action: 'recordManualProcurementEvidence' } }), 2);
});
