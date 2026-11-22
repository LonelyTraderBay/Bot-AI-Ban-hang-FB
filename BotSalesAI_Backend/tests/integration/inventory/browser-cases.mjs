import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { localAccountingDate } from '../../../apps/api/dist/modules/finance/index.js';
import { recordStockMovement } from '../../../apps/api/dist/modules/inventory/index.js';
import { createDatabaseClient } from '../../../apps/api/dist/platform/database/client.js';
import { serializable } from '../../../apps/api/dist/platform/database/transactions.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { appOrigin } from '../../../infra/p0/oidc/tls.mjs';
import { assertFixtureDatabase } from '../workspace/session-fixture.mjs';

const [shop] = fixtureShops;
const app = appOrigin + '/s/' + shop.id;
const api = appOrigin + '/api/v2/shops/' + shop.id;

function response(page, method, path) {
    const pending = page.waitForResponse(item => item.request().method() === method && new URL(item.url()).pathname === new URL(api + path).pathname);
    void pending.catch(() => {});
    return pending;
}

export async function verifyInventoryFlow(page, actorId, csrfToken, documents = false) {
    const code = 'WEB-' + randomUUID().slice(0, 8).toUpperCase();
    await page.goto(app + '/settings/warehouses');
    await page.getByRole('heading', { name: 'Quản trị kho' }).waitFor();
    await page.getByRole('button', { name: 'Thêm kho', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Mã kho' }).fill(code);
    await dialog.getByRole('textbox', { name: 'Tên kho' }).fill('Kho Firefox ' + code);
    await dialog.getByRole('textbox', { name: 'Địa điểm kho' }).fill('Địa chỉ kiểm thử');
    const post = response(page, 'POST', '/warehouses');
    await dialog.getByRole('button', { name: 'Lưu kho' }).click();
    const created = await post;
    assert.equal(created.status(), 201);
    const { data: warehouse } = await created.json();
    const row = page.getByRole('row').filter({ hasText: code });
    await row.waitFor();
    await row.getByRole('button', { name: 'Sửa kho ' + code, exact: true }).click();
    await dialog.getByRole('textbox', { name: 'Địa điểm kho' }).fill('Địa chỉ đã cập nhật');
    const patch = response(page, 'PATCH', '/warehouses/' + warehouse.id);
    await dialog.getByRole('button', { name: 'Lưu kho' }).click();
    assert.equal((await patch).status(), 200);
    await row.getByText('Địa chỉ đã cập nhật').waitFor();
    await row.getByRole('button', { name: 'Ngừng dùng ' + code, exact: true }).click();
    await dialog.getByRole('textbox', { name: /Lý do/i }).fill('Ngừng kho theo ca kiểm');
    const archive = response(page, 'POST', '/warehouses/' + warehouse.id + '/archive');
    await dialog.getByRole('button', { name: 'Ngừng dùng kho', exact: true }).click();
    assert.equal((await archive).status(), 202);
    await row.getByText('Lịch sử được giữ').waitFor();

    const sku = 'BE09-LIVE-' + randomUUID().slice(0, 8);
    const saved = await page.request.post(api + '/products', {
        headers: { origin: appOrigin, 'idempotency-key': randomUUID(), 'x-csrf-token': csrfToken },
        data: {
            name: 'Sản phẩm kho ' + sku, categoryId: null, description: '', status: 'active', imageFileIds: [],
            variants: [{ sku, name: 'Mặc định', options: {}, price: { amount: '5000', currency: shop.currency }, active: true }],
        },
    });
    assert.equal(saved.status(), 201);
    const { data: { variants: [variant] } } = await saved.json();
    const connection = readDatabaseUrl(process.env);
    assertFixtureDatabase(connection);
    const db = createDatabaseClient(connection);
    try {
        await serializable(db, tx => recordStockMovement(tx, {
            shopId: shop.id, warehouseId: shop.defaultWarehouseId, variantId: variant.id, actorId,
            kind: 'receipt', source: { type: 'fixture_receipt', id: randomUUID() }, reason: 'Nhập hàng fixture Firefox',
            receivedValue: '3050.01', delta: { onHand: 3, quarantine: 1 },
        }), true);
        if (documents) await verifyStockDocuments(page, db, variant, actorId, csrfToken);
    } finally {
        await db.$disconnect();
    }
    await page.goto(app + '/inventory?q=' + sku);
    await page.getByRole('heading', { name: 'Tồn kho', exact: true }).waitFor();
    await page.getByRole('row').filter({ hasText: sku }).first().waitFor();
    await page.goto(app + '/inventory/movements?q=' + sku);
    await page.getByRole('heading', { name: 'Lịch sử kho', exact: true }).waitFor();
    await page.getByRole('row').filter({ hasText: sku }).getByText('Nhập hàng fixture Firefox').waitFor();
    console.log('Firefox dev:live BE-09: R55 warehouse create/patch/archive, R15 stock, R16 movement from PostgreSQL.');
}

async function documentData(pending, status) {
    const completed = await pending;
    assert.equal(completed.status(), status);
    return (await completed.json()).data;
}

async function verifyStockDocuments(page, db, variant, actorId, csrfToken) {
    const { sku } = variant;
    const post = (path, data) => documentData(page.request.post(api + path, {
        data, headers: { origin: appOrigin, 'idempotency-key': randomUUID(), 'x-csrf-token': csrfToken },
    }), 201);
    const warehouse = name => post('/warehouses', { name, code: 'WEB-' + randomUUID().slice(0, 8), addressLine: 'Kho thử Firefox' });
    const from = await warehouse('Kho gửi ' + sku);
    const to = await warehouse('Kho nhận ' + sku);
    await serializable(db, tx => recordStockMovement(tx, {
        shopId: shop.id, warehouseId: from.id, variantId: variant.id, actorId, kind: 'receipt',
        source: { type: 'fixture_receipt', id: randomUUID() }, reason: 'Tồn riêng ca kiểm kê Firefox', receivedValue: '30.03', delta: { onHand: 3 },
    }), true);
    const date = localAccountingDate(new Date(), shop.timezone);
    const day = new Date(date + 'T00:00:00.000Z');
    const existing = await db.accountingPeriod.findFirst({
        where: { shopId: shop.id, startDate: { lte: day }, endDate: { gte: day } },
    });
    if (existing) assert.equal(existing.state, 'open');
    else await post('/periods', { startDate: date, endDate: date, reason: 'Kỳ thử tồn kho qua Firefox' });
    const balance = warehouseId => db.stockPosition.findUniqueOrThrow({
        where: { shopId_warehouseId_variantId: { shopId: shop.id, warehouseId, variantId: variant.id } },
    });
    const selectWarehouse = async (dialog, label, warehouse) => {
        await dialog.getByRole('combobox', { name: label, exact: true }).click();
        await page.getByRole('option', { name: warehouse.name + ' · ' + warehouse.code, exact: true }).click();
    };
    const selectSku = async dialog => {
        await dialog.getByRole('textbox', { name: 'Tìm mã SKU trong kho' }).fill(sku);
        await dialog.getByRole('combobox', { name: 'Thêm SKU từ tồn kho' }).click();
        await page.getByRole('option', { name: new RegExp('^' + sku + ' ·') }).click();
    };
    const confirmPatch = async (row, button, title, path, reason) => {
        await row.getByRole('button', { name: button, exact: true }).click();
        const dialog = page.getByRole('dialog', { name: title });
        if (reason) await dialog.getByRole('textbox', { name: 'Lý do' }).fill(reason);
        const pending = response(page, 'PATCH', path);
        await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
        return documentData(pending, 200);
    };
    await page.goto(app + '/inventory/stocktakes');
    await page.getByRole('button', { name: 'Mở phiên kiểm kê', exact: true }).click();
    const creation = page.getByRole('dialog', { name: 'Mở phiên kiểm kê' });
    await selectWarehouse(creation, 'Kho kiểm kê', from);
    await creation.getByRole('textbox', { name: 'Lý do kiểm kê' }).fill('Đếm thực tế trên Firefox');
    await selectSku(creation);
    const stocktakeCreated = response(page, 'POST', '/inventory/stocktakes');
    await creation.getByRole('button', { name: 'Tạo phiên', exact: true }).click();
    const stocktake = await documentData(stocktakeCreated, 201);
    assert.equal(stocktake.lines[0].expected, 3);
    assert.equal(stocktake.lines[0].counted, null);
    const stocktakePath = '/inventory/stocktakes/' + stocktake.id;
    const stocktakeRow = page.getByRole('row').filter({ hasText: stocktake.id });
    await stocktakeRow.getByRole('button', { name: 'Nhập số đếm', exact: true }).click();
    const count = page.getByRole('dialog', { name: 'Nhập số đếm' });
    await count.getByRole('textbox', { name: 'Số đếm ' + sku, exact: true }).fill('2');
    const counted = response(page, 'PATCH', stocktakePath);
    await count.getByRole('button', { name: 'Lưu số đếm', exact: true }).click();
    assert.equal((await documentData(counted, 200)).lines[0].counted, 2);
    assert.equal((await confirmPatch(stocktakeRow, 'Gửi duyệt', 'Gửi phiên kiểm kê để duyệt', stocktakePath)).status, 'submitted');
    const checked = await confirmPatch(stocktakeRow, 'Duyệt và ghi tồn', 'Duyệt và ghi tồn', stocktakePath + '/posting', 'Đã kiểm tồn thực tế');
    assert.equal(checked.status, 'posted');
    assert.equal((await balance(from.id)).carryingValue.toFixed(), '20.02');
    await page.goto(app + '/inventory/transfers');
    await page.getByRole('button', { name: 'Tạo phiếu chuyển', exact: true }).click();
    const plan = page.getByRole('dialog', { name: 'Tạo phiếu chuyển' });
    await selectWarehouse(plan, 'Kho gửi', from);
    await selectWarehouse(plan, 'Kho nhận', to);
    await plan.getByRole('textbox', { name: 'Lý do chuyển kho' }).fill('Chuyển hai chiếc qua Firefox');
    await selectSku(plan);
    await plan.getByRole('textbox', { name: 'Số lượng chuyển ' + sku, exact: true }).fill('2');
    const created = response(page, 'POST', '/inventory/transfers');
    await plan.getByRole('button', { name: 'Lưu phiếu nháp', exact: true }).click();
    const transfer = await documentData(created, 201);
    assert.equal(transfer.status, 'draft');
    const transferPath = '/inventory/transfers/' + transfer.id;
    const transferRow = page.getByRole('row').filter({ hasText: transfer.id });
    assert.equal((await confirmPatch(transferRow, 'Xuất chuyển kho', 'Xuất chuyển kho', transferPath)).status, 'in_transit');
    assert.equal((await balance(from.id)).transit, 2);
    await transferRow.getByRole('button', { name: 'Nhận hàng', exact: true }).click();
    const reception = page.getByRole('dialog', { name: 'Nhận hàng chuyển kho' });
    await reception.getByRole('textbox', { name: 'Nhận SKU ' + sku, exact: true }).fill('1');
    const received = response(page, 'PATCH', transferPath);
    await reception.getByRole('button', { name: 'Ghi nhận số đã nhận', exact: true }).click();
    assert.equal((await documentData(received, 200)).lines[0].received, 1);
    const final = await confirmPatch(transferRow, 'Đóng phiếu thiếu', 'Đóng phiếu thiếu', transferPath, 'Đã kiểm phần chuyển bị thiếu');
    assert.equal(final.status, 'closed_short');
    assert.equal(final.lines[0].missing, 1);
    assert.equal((await balance(from.id)).transit, 0);
    assert.equal((await balance(to.id)).carryingValue.toFixed(), '10.01');
    console.log('Firefox BE-15 R66 R67: count, approve, dispatch, receive part, close shortage and ledger-backed stock.');
}
