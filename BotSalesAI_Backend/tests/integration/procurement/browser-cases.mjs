import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { localAccountingDate } from '../../../apps/api/dist/modules/finance/index.js';
import { createDatabaseClient } from '../../../apps/api/dist/platform/database/client.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { appOrigin } from '../../../infra/p0/oidc/tls.mjs';
import { fixtureWriter } from '../orders/fixtures.mjs';
import { reviewedEvidenceFixture } from '../helpers/reviewed-evidence-fixture.mjs';
import { assertFixtureDatabase } from '../workspace/session-fixture.mjs';

const [shop] = fixtureShops;
const app = appOrigin + '/s/' + shop.id;
const api = appOrigin + '/api/v2/shops/' + shop.id;

async function data(pending, status) {
    const response = await pending;
    assert.equal(response.status(), status, `${new URL(response.url()).pathname} returned ${response.status()}, expected ${status}`);
    return (await response.json()).data;
}

function mutation(page, path, method = 'POST') {
    const pending = page.waitForResponse(response => response.request().method() === method && response.url() === api + path)
        .catch(error => { throw new Error(`Chờ ${method} ${path}: ${error.name}`, { cause: error }); });
    void pending.catch(() => {});
    return pending;
}

const rowMatching = (page, text) => page.getByRole('row').filter({ hasText: text });

export async function provisionManualSupplier() {
    assertFixtureDatabase(readDatabaseUrl(process.env));
    const writer = fixtureWriter();
    try {
        const supplier = await writer.supplier.create({ data: {
            shopId: shop.id, name: 'NCC thủ công Firefox ' + randomUUID(), currency: shop.currency, sendMethod: 'manual',
            contactLabel: 'Đầu mối Firefox tổng hợp', leadTimeDays: 2, paymentTerms: 'Chứng từ kiểm thử',
        } });
        process.env.PROCUREMENT_MANUAL_SUPPLIERS = shop.id + '/' + supplier.id;
        return supplier;
    } finally {
        await writer.$disconnect();
    }
}

async function attestDocument(order, kind, externalRef, reviewerId, runtime) {
    const fixture = await reviewedEvidenceFixture('procurement', { cwd: runtime, document: 'Synthetic browser proof ' + externalRef });
    try {
        const hash = await fixture.prepare({
            shopId: shop.id, purchaseOrderId: order.id, supplierId: order.supplierId, intentHash: order.intentHash,
            expectedVersion: order.version, kind, externalRef, occurredAt: new Date().toISOString(), reviewerId,
        });
        const { stdout } = await fixture.execute(hash);
        return { id: JSON.parse(stdout).evidenceId, externalRef };
    } finally {
        await fixture.close();
    }
}

async function supplierFlow(page, name, sku, manualSupplier) {
    await page.goto(app + '/suppliers');
    let supplier = manualSupplier;
    if (!supplier) {
        await page.getByRole('button', { name: 'Thêm nhà cung cấp' }).click();
        const form = page.getByRole('dialog', { name: 'Nhà cung cấp mới' });
        await form.getByRole('textbox', { name: 'Tên nhà cung cấp' }).fill(name);
        await form.getByRole('textbox', { name: 'Đầu mối liên hệ' }).fill('Đầu mối Firefox tổng hợp');
        const created = mutation(page, '/suppliers');
        await form.getByRole('button', { name: 'Lưu', exact: true }).click();
        supplier = await data(created, 201);
    }
    const row = rowMatching(page, name);
    await row.getByRole('button', { name: 'Duyệt / tạm dừng' }).click();
    const approval = page.getByRole('dialog', { name: 'Đổi trạng thái nhà cung cấp' });
    await approval.getByRole('textbox', { name: 'Lý do' }).fill('Đã kiểm nhà cung cấp trên Firefox');
    const approved = mutation(page, '/suppliers/' + supplier.id + '/status');
    await approval.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    assert.equal((await data(approved, 200)).status, 'approved');
    await row.getByRole('button', { name: 'Thêm báo giá' }).click();
    const quote = page.getByRole('dialog', { name: 'Báo giá — ' + name });
    await quote.getByRole('combobox', { name: 'Biến thể' }).click();
    await page.getByRole('option', { name: new RegExp(sku + '$') }).click();
    await quote.getByRole('textbox', { name: 'Giá nhập đơn vị' }).fill('13.25');
    await quote.getByRole('spinbutton', { name: 'Lượng tối thiểu' }).fill('2');
    await quote.getByRole('spinbutton', { name: 'Bội số đóng gói' }).fill('2');
    const prepared = mutation(page, '/supplier-offers');
    await quote.getByRole('button', { name: 'Lưu báo giá mới' }).click();
    return data(prepared, 201);
}

async function reorderFlow(page, warehouse, offer, variant) {
    await page.goto(app + '/replenishment');
    await page.getByRole('button', { name: 'Thêm quy tắc' }).click();
    const add = page.getByRole('dialog', { name: 'Quy tắc nhập lại' });
    await add.getByRole('combobox', { name: 'Kho nhập lại' }).click();
    await page.getByRole('option', { name: warehouse.code + ' · ' + warehouse.name }).click();
    await add.getByRole('combobox', { name: 'Báo giá / SKU' }).click();
    await page.getByRole('option', { name: new RegExp('^' + offer.variantId + ' · ' + offer.supplierId) }).click();
    await add.getByRole('spinbutton', { name: 'Ngưỡng nhập' }).fill('1');
    await add.getByRole('spinbutton', { name: 'Nhập tới' }).fill('4');
    await add.getByRole('spinbutton', { name: 'Tồn an toàn' }).fill('1');
    const created = mutation(page, '/reorder-rules');
    await add.getByRole('button', { name: 'Lưu quy tắc' }).click();
    const rule = await data(created, 201);
    assert.equal(rule.mode, 'draft_for_approval');
    const evaluate = mutation(page, '/purchase-suggestions/evaluate');
    await page.getByRole('button', { name: 'Đánh giá nhu cầu nhập' }).click();
    assert.equal((await data(evaluate, 202)).status, 'succeeded');
    const order = mutation(page, '/purchase-orders');
    await rowMatching(page, variant.id).getByRole('button', { name: 'Lập đơn nháp' }).click();
    const draft = await data(order, 201);
    assert.equal(draft.status, 'draft');
    assert.equal(draft.lines[0].quantity, 4);
    return { draft, rule };
}

async function purchaseFlow(page, writer, draft, attest) {
    await page.waitForURL(app + '/purchases');
    const open = () => rowMatching(page, draft.id).getByRole('button', { name: 'Xem chi tiết' }).click();
    const purchase = page.getByRole('dialog', { name: 'Đơn mua ' + draft.id, exact: true });
    await open();
    const path = '/purchase-orders/' + draft.id;
    const request = mutation(page, path + '/request-approval');
    await purchase.getByRole('button', { name: 'Xin phê duyệt' }).click();
    const pending = await data(request, 200);
    await purchase.getByRole('link', { name: new RegExp('^Xem phê duyệt ') }).click();
    await rowMatching(page, draft.id).getByRole('button', { name: 'Xem & quyết định' }).click();
    const decision = page.getByRole('dialog', { name: 'Xem xét phê duyệt' });
    await decision.getByRole('textbox', { name: 'Lý do quyết định' }).fill('Đã đối chiếu đơn mua và phiên bản');
    const approved = mutation(page, '/approvals/' + pending.id + '/decision');
    await decision.getByRole('button', { name: 'Duyệt đúng nội dung này' }).click();
    assert.equal((await data(approved, 200)).status, 'approved');
    await page.goto(app + '/purchases');
    await open();
    await purchase.getByRole('button', { name: attest ? 'Bàn giao thủ công' : 'Gửi đơn mua', exact: true }).click();
    const send = mutation(page, path + '/send');
    const sendDialog = page.getByRole('dialog', { name: attest ? 'Bàn giao đơn mua đã duyệt' : 'Gửi đơn mua đã duyệt' });
    const sendButton = sendDialog.getByRole('button', { name: attest ? 'Tạo việc bàn giao' : 'Gửi đơn mua', exact: true });
    if (attest) await sendDialog.getByText(/Tạo công việc để gửi đúng đơn đã duyệt/).waitFor();
    const capture = attest && process.env.P0_MANUAL_PURCHASE_CAPTURE;
    if (capture) {
        const desktop = page.viewportSize();
        await sendDialog.screenshot({ path: join(capture, 'desktop.png') });
        await page.setViewportSize({ width: 390, height: 844 });
        const buttonBox = await sendButton.boundingBox();
        assert.ok(buttonBox?.width > 0 && buttonBox.x >= 0 && buttonBox.x + buttonBox.width <= 390);
        await sendDialog.screenshot({ path: join(capture, 'mobile.png') });
        await page.setViewportSize(desktop);
    }
    await sendButton.click();
    const accepted = await data(send, 202);
    assert.equal(accepted.status, 'accepted');
    await purchase.getByRole('button', { name: 'Nhà cung cấp đã xác nhận' }).click();
    const received = await data(page.request.get(api + path), 200);
    assert.equal(received.status, attest ? 'unknown' : 'sent');
    const observed = attest ? await attest(received, 'supplier_confirmation', 'MANUAL-' + draft.id) : await writer.procurementEvidence.create({ data: {
        shopId: shop.id, purchaseOrderId: draft.id, kind: 'supplier_confirmation', externalRef: received.externalReference, occurredAt: new Date(),
    } });
    const confirm = page.getByRole('dialog', { name: 'Ghi nhận xác nhận của nhà cung cấp' });
    await confirm.getByRole('textbox', { name: 'Tham chiếu đơn phía nhà cung cấp' }).fill(observed.externalRef);
    await confirm.getByRole('textbox', { name: 'Mã bằng chứng xác nhận' }).fill(observed.id);
    const confirmed = mutation(page, path + '/confirm');
    await confirm.getByRole('button', { name: 'Ghi xác nhận' }).click();
    assert.equal((await data(confirmed, 200)).status, 'confirmed');
    if (attest) assert.equal((await data(page.request.get(api + '/commands/' + accepted.id), 200)).status, 'succeeded');
    await purchase.getByRole('link', { name: 'Nhận hàng theo đơn này' }).click();
}

async function receiveFlow(page, writer, draft, variant, attest) {
    const document = attest ? await attest(await data(page.request.get(api + '/purchase-orders/' + draft.id), 200),
        'goods_receipt', 'DELIVERY-' + draft.id) : await writer.procurementEvidence.create({ data: {
        shopId: shop.id, purchaseOrderId: draft.id, kind: 'goods_receipt', externalRef: 'FIREFOX-' + randomUUID(), occurredAt: new Date(),
    } });
    await page.getByRole('button', { name: 'Tạo phiếu nhận' }).click();
    const create = page.getByRole('dialog', { name: 'Phiếu nhận hàng mới' });
    await create.getByRole('textbox', { name: 'Mã phiếu giao / chứng từ nguồn' }).fill(document.id);
    await create.getByRole('spinbutton', { name: 'Nhận đạt mã biến thể ' + variant.id }).fill('2');
    await create.getByRole('spinbutton', { name: 'Từ chối / hỏng mã biến thể ' + variant.id }).fill('1');
    await create.getByRole('textbox', { name: 'Ghi chú kiểm hàng mã biến thể ' + variant.id }).fill('Một chiếc vỡ vỏ hộp');
    const saved = mutation(page, '/goods-receipts');
    await create.getByRole('button', { name: 'Tạo phiếu nháp' }).click();
    const receipt = await data(saved, 201);
    const row = rowMatching(page, receipt.id);
    await row.getByRole('button', { name: 'Xem / ghi nhận phiếu' }).click();
    const detail = page.getByRole('dialog', { name: 'Phiếu nhận ' + receipt.id, exact: true });
    await detail.getByRole('button', { name: 'Kiểm & ghi nhận vào kho' }).click();
    const posted = mutation(page, '/goods-receipts/' + receipt.id + '/post');
    await page.getByRole('dialog', { name: 'Ghi nhận hàng đã kiểm vào kho' }).getByRole('button', { name: 'Ghi nhận vào kho', exact: true }).click();
    assert.equal((await data(posted, 202)).status, 'succeeded');
    await detail.getByText(/Phiếu đã được ghi nhận/).waitFor();
    return receipt;
}

export async function verifyProcurementFlow(page, session, manualSupplier, runtime) {
    const marker = randomUUID().slice(0, 8);
    const sku = 'BE16-FX-' + marker;
    const headers = () => ({ origin: appOrigin, 'idempotency-key': randomUUID(), 'x-csrf-token': session.csrfToken });
    const post = (path, input) => data(page.request.post(api + path, { data: input, headers: headers() }), 201);
    const { variants: [variant] } = await post('/products', {
        name: sku, description: '', categoryId: null, status: 'active', imageFileIds: [], variants: [
            { sku, name: 'Mẫu kiểm mua', options: {}, active: true, price: { amount: '35', currency: shop.currency } },
        ],
    });
    const warehouse = await post('/warehouses', { code: 'PO-' + marker, name: 'Kho mua Firefox ' + marker, addressLine: 'Địa chỉ thử' });
    const url = readDatabaseUrl(process.env);
    assertFixtureDatabase(url);
    const db = createDatabaseClient(url);
    const writer = manualSupplier ? undefined : fixtureWriter();
    const attest = manualSupplier && ((order, kind, ref) => attestDocument(order, kind, ref, session.user.id, runtime));
    let rule;
    try {
        const date = localAccountingDate(new Date(), shop.timezone);
        const day = new Date(date + 'T00:00:00Z');
        const period = await db.accountingPeriod.findFirst({ where: { shopId: shop.id, startDate: { lte: day }, endDate: { gte: day } } });
        if (period) assert.equal(period.state, 'open');
        else await post('/periods', { startDate: date, endDate: date, reason: 'Kỳ thử nhận hàng Firefox' });
        const offer = await supplierFlow(page, manualSupplier?.name ?? 'NCC Firefox ' + marker, sku, manualSupplier);
        const created = await reorderFlow(page, warehouse, offer, variant);
        rule = created.rule;
        await purchaseFlow(page, writer, created.draft, attest);
        const receipt = await receiveFlow(page, writer, created.draft, variant, attest);
        const balance = await db.stockPosition.findUniqueOrThrow({ where: { shopId_warehouseId_variantId: {
            shopId: shop.id, warehouseId: warehouse.id, variantId: variant.id,
        } } });
        assert.deepEqual([balance.onHand, balance.quarantine, balance.inbound, balance.carryingValue.toFixed()], [2, 1, 1, '26.5']);
        assert.equal(await db.financeJournal.count({ where: { shopId: shop.id, sourceType: 'goods_receipt', sourceId: receipt.id } }), 1);
        console.log('Firefox R44 R45 R46 R38 R47: supplier, offer, reorder, approval, ' +
            (attest ? 'manual handoff, reviewed documents' : 'fixture send') + ', partial receipt and payable.');
    } finally {
        if (rule) {
            const { id, variantId, warehouseId, supplierOfferId, reorderPoint, targetQuantity, safetyStock, mode, budgetPolicyId, version } = rule;
            await data(page.request.put(api + '/reorder-rules/' + id, { headers: headers(), data: {
                variantId, warehouseId, supplierOfferId, reorderPoint, targetQuantity, safetyStock, mode, budgetPolicyId, enabled: false, expectedVersion: version,
            } }), 200);
        }
        await Promise.all([db.$disconnect(), writer?.$disconnect()]);
    }
}
