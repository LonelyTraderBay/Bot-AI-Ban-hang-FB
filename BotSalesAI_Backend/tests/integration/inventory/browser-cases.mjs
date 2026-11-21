import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
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
    return page.waitForResponse(item => item.request().method() === method && new URL(item.url()).pathname === new URL(api + path).pathname);
}

export async function verifyInventoryFlow(page, actorId, csrfToken) {
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
    } finally {
        await db.$disconnect();
    }
    await page.goto(app + '/inventory?q=' + sku);
    await page.getByRole('heading', { name: 'Tồn kho', exact: true }).waitFor();
    await page.getByRole('row').filter({ hasText: sku }).waitFor();
    await page.goto(app + '/inventory/movements?q=' + sku);
    await page.getByRole('heading', { name: 'Lịch sử kho', exact: true }).waitFor();
    await page.getByRole('row').filter({ hasText: sku }).getByText('Nhập hàng fixture Firefox').waitFor();
    console.log('Firefox dev:live BE-09: R55 warehouse create/patch/archive, R15 stock, R16 movement from PostgreSQL.');
}
