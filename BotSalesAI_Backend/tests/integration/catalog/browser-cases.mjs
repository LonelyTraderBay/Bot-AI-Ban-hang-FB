import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createDatabaseClient } from '../../../apps/api/dist/platform/database/client.js';
import { fixtureCategory, fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { appOrigin } from '../../../infra/p0/oidc/tls.mjs';
import { dropCreateResponse } from '../helpers/lost-response.mjs';
import { assertFixtureDatabase } from '../workspace/session-fixture.mjs';

const [shop] = fixtureShops;
const app = appOrigin + '/s/' + shop.id;
const api = appOrigin + '/api/v2/shops/' + shop.id;

function getResponse(page, url) {
    const expected = new URL(url);
    return page.waitForResponse(response => {
        const actual = new URL(response.url());
        return response.request().method() === 'GET' && response.status() === 200
            && actual.origin === expected.origin && actual.pathname === expected.pathname
            && [...expected.searchParams].every(([key, value]) => actual.searchParams.get(key) === value);
    });
}

async function fillProduct(page, sku) {
    await page.getByRole('heading', { name: 'Thêm sản phẩm', exact: true }).waitFor();
    await page.getByRole('textbox', { name: 'Tên sản phẩm', exact: true }).fill('SKU kiểm tra ' + sku);
    await page.getByRole('textbox', { name: 'SKU', exact: true }).fill(sku);
    await page.getByRole('textbox', { name: 'Giá bán (VND)', exact: true }).fill('12345.6789');
    await page.getByRole('combobox', { name: 'Danh mục', exact: true }).click();
    await page.getByRole('option', { name: fixtureCategory.name, exact: true }).click();
}

export async function verifyCatalogFlow(page, restartApi, liveEvents) {
    await page.getByText(shop.name, { exact: true }).waitFor();
    const overview = getResponse(page, api + '/dashboard');
    const events = page.waitForResponse(response => response.url() === api + '/events');
    await page.getByRole('link', { name: 'Mở cửa hàng', exact: true }).click();
    assert.equal((await (await overview).json()).data.botStatus, 'unconfigured');
    await page.getByRole('heading', { name: 'Tổng quan cửa hàng' }).waitFor();
    const stream = await events;
    assert.ok(stream.status() === 200 || stream.status() === 404);
    if (stream.status() === 404) {
        assert.equal(liveEvents, false);
        await page.getByText(/Mất cập nhật trực tiếp/).waitFor();
        console.log('Firefox dev:live P0: SSE unavailable notice shown. Reads remain available.');
    } else assert.match(await stream.headerValue('content-type'), /^text\/event-stream/);

    await page.goto(app + '/products');
    await page.getByRole('heading', { name: 'Sản phẩm', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Thêm sản phẩm', exact: true }).click();
    const sku = 'BE07-LIVE-' + randomUUID().slice(0, 8);
    await fillProduct(page, sku);
    const post = page.waitForResponse(response => response.request().method() === 'POST' && response.url() === api + '/products');
    await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
    const created = await post;
    assert.equal(created.status(), 201);
    const { data: product } = await created.json();
    await page.waitForURL(app + '/products/' + product.id);
    await page.getByRole('heading', { name: 'Thông tin sản phẩm', exact: true }).waitFor();
    const persisted = await page.request.get(api + '/products/' + product.id);
    assert.equal(persisted.status(), 200);
    assert.deepEqual((await persisted.json()).data, product);
    assert.equal(product.variants[0].sku, sku);
    if (liveEvents) {
        const key = created.request().headers()['idempotency-key'];
        const q = createHash('sha256').update(key).digest('hex');
        const read = await page.request.get(api + '/commands?kind=createProduct&limit=1&q=' + q);
        assert.equal(read.status(), 200);
        const { data: [command] } = await read.json();
        assert.deepEqual(command.result, { type: 'product', id: product.id });
        await page.waitForFunction(id => globalThis.receivedCommandEvents.includes(id), command.id);
        console.log('Firefox dev:live BE-10: native EventSource received the committed SKU command on its message channel.');
    }

    const list = getResponse(page, api + '/products?q=' + sku);
    await page.goto(app + '/products?q=' + sku);
    assert.ok((await (await list).json()).data.some(item => item.id === product.id));
    await restartApi();
    const listAfterRestart = getResponse(page, api + '/products?q=' + sku);
    await page.reload();
    assert.equal((await (await listAfterRestart).json()).data[0].id, product.id);
    const detailAfterRestart = getResponse(page, api + '/products/' + product.id);
    await page.getByRole('link', { name: 'Chi tiết', exact: true }).click();
    assert.equal((await (await detailAfterRestart).json()).data.variants[0].sku, sku);

    const lostSku = 'BE07-LOST-' + randomUUID().slice(0, 8);
    await page.goto(app + '/products/new');
    const attempt = await dropCreateResponse(page, api + '/products');
    await fillProduct(page, lostSku);
    await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
    const { status, resourceId, key } = await attempt.received;
    assert.equal(status, 201);
    assert.ok(resourceId && key);
    const unresolved = page.getByText('Có 1 thao tác chưa xác minh kết quả', { exact: true });
    await unresolved.waitFor();
    page.on('dialog', dialog => dialog.accept());
    await page.reload();
    await unresolved.waitFor();
    const lookup = page.waitForResponse(response => {
        const url = new URL(response.url());
        return url.origin + url.pathname === api + '/commands' && url.searchParams.get('kind') === 'createProduct';
    });
    await page.getByRole('button', { name: 'Kiểm tra trạng thái lệnh', exact: true }).click();
    const response = await lookup;
    assert.equal(response.status(), 200);
    assert.equal(new URL(response.url()).searchParams.get('q'), createHash('sha256').update(key).digest('hex'));
    const { data: [command] } = await response.json();
    assert.equal(command.status, 'succeeded');
    assert.deepEqual(command.result, { type: 'product', id: resourceId });
    await unresolved.waitFor({ state: 'hidden' });
    assert.equal(attempt.writes(), 1);

    const connection = readDatabaseUrl(process.env);
    assertFixtureDatabase(connection);
    const db = createDatabaseClient(connection);
    try {
        assert.equal(await db.product.count({ where: { shopId: shop.id, variants: { some: { sku: lostSku } } } }), 1);
        assert.equal(await db.variant.count({ where: { shopId: shop.id, sku: lostSku } }), 1);
        assert.equal(await db.command.count({ where: { shopId: shop.id, operationId: 'createProduct', idempotencyKey: key } }), 1);
        assert.equal(await db.outboxEvent.count({ where: { shopId: shop.id, commandId: command.id } }), 1);
        assert.equal(await db.auditEntry.count({ where: { shopId: shop.id, action: 'createProduct', resourceId } }), 1);
    } finally {
        await db.$disconnect();
    }
    console.log('Firefox dev:live P0-08: R01-R02-R04-R09-R10-R11, create 201, SKU detail/list persisted after API restart.');
    console.log('Firefox dev:live P0-07: lost createProduct response recovered after reload. One POST, product, variant, command, audit and outbox.');
}

export async function verifyImportFlow(page, before) {
    const phase = before ? 'before' : 'after';
    const evidence = 'test-results/backend/be08';
    mkdirSync(evidence, { recursive: true });
    const snapshots = [];
    const capture = async (route, control) => {
        for (const [size, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
            await page.setViewportSize({ width, height });
            await control.waitFor();
            const bounds = await control.boundingBox();
            assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width);
            const overflow = await page.evaluate(() => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth);
            assert.equal(overflow, false);
            const file = phase + '-' + route + '-' + size + '.png';
            await page.screenshot({ path: evidence + '/' + file });
            snapshots.push({ route, size, bounds, file });
        }
    };

    const list = getResponse(page, api + '/jobs?sort=-createdAt');
    await page.goto(app + '/imports');
    await page.getByRole('heading', { name: 'Nhập dữ liệu sản phẩm' }).waitFor();
    await list;
    const file = page.locator('input[type=file]');
    assert.equal((await file.getAttribute('accept')).includes('.xlsx'), !before);
    await capture('R13', page.getByRole('button', { name: before ? 'Chọn CSV UTF-8' : 'Chọn CSV hoặc XLSX' }));
    await page.setViewportSize({ width: 1440, height: 900 });
    const sku = 'BE08-LIVE-' + randomUUID().slice(0, 8);
    const contents = 'sku,name,price,description,currency\n' + sku + ',Sản phẩm mới,15000,Mẫu,VND\nBAD,Sai giá,0,Mẫu,VND\n';
    await file.setInputFiles({ name: 'products.csv', mimeType: 'text/csv', buffer: Buffer.from(contents) });
    const previewPost = page.waitForResponse(response => response.url() === api + '/imports' && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Kiểm tra trước khi nhập' }).click();
    const admitted = await previewPost;
    assert.equal(admitted.status(), 202);
    const { data: preview } = await admitted.json();
    await page.waitForURL(app + '/imports/' + preview.id);
    const confirm = page.getByRole('button', { name: 'Xác nhận nhập các dòng hợp lệ' });
    await page.getByRole('row').filter({ hasText: 'Kiểm tra SKU, tên, giá dương' }).waitFor();
    await capture('R14', confirm);
    assert.equal(await confirm.isEnabled(), true);
    await confirm.click();
    const commitPost = page.waitForResponse(response => response.url() === api + '/imports/' + preview.id + '/commit' && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Nhập các dòng hợp lệ', exact: true }).click();
    assert.equal((await commitPost).status(), 202);
    await page.getByText('Hoàn thành một phần', { exact: true }).waitFor();
    assert.equal(await confirm.isDisabled(), true);
    const products = await page.request.get(api + '/products?q=' + sku).then(response => response.json());
    assert.equal(products.data.length, 1);
    assert.equal(products.data[0].variants[0].sku, sku);

    if (!before) {
        await page.goto(app + '/imports');
        const xlsxType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        await page.locator('input[type=file]').setInputFiles({
            name: 'invalid.xlsx', mimeType: xlsxType, buffer: Buffer.from('Invalid spreadsheet'),
        });
        await page.getByRole('button', { name: 'Kiểm tra trước khi nhập' }).click();
        await page.getByRole('alert').filter({ hasText: 'Máy chủ chưa chấp nhận tệp này' }).waitFor();
        const xlsx = readFileSync(new URL('./products-fixture.xlsx', import.meta.url));
        await page.locator('input[type=file]').setInputFiles({
            name: 'products.xlsx', mimeType: xlsxType, buffer: xlsx,
        });
        await page.getByRole('button', { name: 'products.xlsx', exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Kiểm tra trước khi nhập' }).isEnabled(), true);
    }
    writeFileSync(evidence + '/' + phase + '-browser-measurements.json', JSON.stringify({ snapshots }, null, 2) + '\n');
    console.log('Firefox dev:live BE-08 ' + phase + ': R13 and R14 at 1440 and 390 px, CSV preview and partial commit, one SKU.');
}
