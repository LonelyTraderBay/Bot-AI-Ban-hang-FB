import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';
import { setDemoControl, waitForDemoMenu } from './session/demo-controls';

let server: Awaited<ReturnType<typeof startDemoServer>>;
const orderId = 'd97dc9be-dcee-4d98-957b-3766450a4368';

test.beforeAll(async () => { server = await startDemoServer({ runtime: 'dev' }); });
test.afterAll(async () => server?.close());

test('R17 keeps dense desktop rows and primary order information on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${server.url}/s/shop-demo/orders`);
    const main = page.getByRole('main');
    const region = main.getByRole('region', { name: 'Danh sách đơn hàng' });
    const rows = region.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    const heights = await rows.evaluateAll(items => items.slice(0, 3).map(row => row.getBoundingClientRect().height));
    expect(heights).toHaveLength(3);
    for (const height of heights) {
        expect(height).toBeGreaterThanOrEqual(44);
        expect(height).toBeLessThanOrEqual(48);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const h1 = main.getByRole('heading', { level: 1 });
    const create = main.getByRole('button', { name: 'Tạo đơn hàng' });
    const card = region.getByRole('listitem').first();
    await expect(card.getByText('Giao hàng', { exact: true })).toBeVisible();
    await expect(card.getByText('Thanh toán', { exact: true })).toBeVisible();
    const titleBox = (await h1.boundingBox())!;
    const createBox = (await create.boundingBox())!;
    expect(createBox.height).toBeGreaterThanOrEqual(44);
    expect(Math.abs(titleBox.y + titleBox.height / 2 - createBox.y - createBox.height / 2)).toBeLessThanOrEqual(1);
    await main.getByRole('tab', { name: 'Đang nhập' }).click();
    await expect(page).toHaveURL(/\?tab=drafts$/);
    await expect(main.getByRole('region', { name: 'Đơn đang nhập' })).toBeVisible();
});

test('R18 shows products and leaves the draft submission within reach on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${server.url}/s/shop-demo/orders/new`);
    const main = page.getByRole('main');
    const products = main.getByRole('heading', { name: 'Sản phẩm đặt mua' });
    const product = main.getByRole('combobox', { name: 'Sản phẩm 1' });
    const submit = main.getByRole('button', { name: 'Lưu đơn nháp' });
    await expect(products).toBeInViewport();
    await expect(submit).toBeInViewport({ ratio: 1 });
    await expect(submit).toBeDisabled();
    expect(await product.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.bottom - 2));
    })).toBe(true);

    await main.getByRole('combobox', { name: 'Khách hàng', exact: true }).click();
    await page.getByRole('option', { name: 'Linh (khách mẫu)', exact: true }).click();
    await product.click();
    await page.getByRole('option', { name: 'Áo thun Essential · L · Than · AO-002', exact: true }).click();
    await expect(submit).toBeEnabled();
    await expect(submit).toBeInViewport({ ratio: 1 });
    const delivery = main.getByRole('heading', { name: 'Giao hàng và thanh toán' });
    expect((await products.boundingBox())!.y).toBeLessThan((await delivery.boundingBox())!.y);
    await expect(main.getByText('Tạm tính', { exact: true })).toHaveCount(0);
});

test('R19 links to its conversation and reveals and copies the full server order ID', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: {
        writeText: async (value: string) => sessionStorage.setItem('copied-order-id', value),
    } }));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${server.url}/s/shop-demo/overview`);
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
    await page.evaluate(async id => {
        const database = '/src/mocks/database.ts';
        const { find, insert } = await import(database);
        insert('orders', 'Order', 'shop-demo', { ...find('orders', 'DH-1001', 'shop-demo'), id });
    }, orderId);
    await page.getByRole('button', { name: 'Mở menu' }).click();
    await page.getByRole('link', { name: 'Đơn hàng', exact: true }).click();
    const order = page.getByRole('region', { name: 'Danh sách đơn hàng' }).getByRole('listitem').filter({ hasText: orderId });
    await order.getByRole('link', { name: 'Xem đơn', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${orderId}$`));

    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('Chi tiết đơn hàng');
    const conversation = main.getByRole('link', { name: 'Mở hội thoại' });
    await expect(conversation).toHaveAttribute('href', '/s/shop-demo/inbox/cv1');
    await expect(conversation).toBeInViewport();
    const statuses = main.getByRole('region', { name: 'Trạng thái đơn hàng' });
    for (const label of ['Đơn hàng', 'Giao hàng', 'Thanh toán']) await expect(statuses.getByText(label, { exact: true })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Giá trị đơn hàng' })).toBeVisible();
    await main.getByRole('button', { name: 'Xem mã đơn hàng' }).press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Mã đơn hàng' });
    await expect(dialog.getByText(orderId, { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Sao chép mã đơn hàng' }).click();
    await expect(dialog.getByRole('status')).toHaveText('Đã sao chép mã đơn hàng.');
    expect(await page.evaluate(() => sessionStorage.getItem('copied-order-id'))).toBe(orderId);
    await page.keyboard.press('Escape');
    await expect(main.getByRole('button', { name: 'Xem mã đơn hàng' })).toBeFocused();
    await conversation.click();
    await expect(page).toHaveURL(/\/inbox\/cv1$/);
    await page.goBack();
    await expect(conversation).toBeVisible();
    await setDemoControl(page, 'role', 'warehouse');
    await expect(main.getByRole('link', { name: 'Mở hội thoại' })).toHaveCount(0);
});

test('R18 focuses the visible control for a server field error and preserves the draft', async ({ page }) => {
    await page.addInitScript(() => {
        const fetchFromBrowser = window.fetch.bind(window);
        window.fetch = (input, init) => {
            const url = new URL(input instanceof Request ? input.url : String(input), location.href);
            const method = init?.method || (input instanceof Request ? input.method : 'GET');
            if (url.pathname !== '/api/v2/shops/shop-demo/orders' || method !== 'POST') return fetchFromBrowser(input, init);
            return Promise.resolve(new Response(JSON.stringify({
                type: 'about:blank', title: 'Dữ liệu chưa hợp lệ', status: 422,
                code: 'VALIDATION_ERROR', detail: 'Cần kiểm tra lại sản phẩm.', requestId: 'r18-field-error',
                errors: [{ path: '/lines/0/variantId', code: 'VARIANT_INVALID', message: 'Sản phẩm không còn khả dụng.' }],
            }), { status: 422, headers: { 'content-type': 'application/problem+json' } }));
        };
    });
    await page.goto(`${server.url}/s/shop-demo/orders/new`);
    const customer = page.getByRole('combobox', { name: 'Khách hàng', exact: true });
    await customer.click();
    await page.getByRole('option', { name: 'Linh (khách mẫu)', exact: true }).click();
    const product = page.getByRole('combobox', { name: 'Sản phẩm 1', exact: true });
    await product.click();
    await page.getByRole('option', { name: 'Áo thun Essential · L · Than · AO-002', exact: true }).click();
    await page.getByRole('button', { name: 'Lưu đơn nháp' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Sản phẩm không còn khả dụng.' })).toBeVisible();
    await expect(product).toBeFocused();
    await expect(product).toHaveAttribute('aria-invalid', 'true');
    await expect(product).toHaveText('Áo thun Essential · L · Than · AO-002');
});

test('R17 sends both state filters to the API, restores them from the URL and clears them together', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${server.url}/s/shop-demo/orders`);
    const orders = page.getByRole('region', { name: 'Danh sách đơn hàng' });
    await expect(orders.getByRole('listitem')).toHaveCount(3);
    await page.getByRole('button', { name: 'Bộ lọc', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Bộ lọc đơn hàng' });
    await dialog.getByRole('combobox', { name: 'Giao hàng', exact: true }).click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.getByRole('option', { name: 'Đã giao', exact: true }).click();
    await dialog.getByRole('combobox', { name: 'Thanh toán', exact: true }).click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.getByRole('option', { name: 'Đã xác minh', exact: true }).click();
    const filtered = page.waitForResponse(response => {
        const url = new URL(response.url());
        return url.pathname.endsWith('/shops/shop-demo/orders') && url.searchParams.get('fulfillmentState') === 'delivered' && url.searchParams.get('paymentState') === 'verified';
    });
    await dialog.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
    expect((await filtered).status()).toBe(200);
    await expect(orders.getByRole('listitem')).toHaveCount(1);
    await expect(orders.getByRole('listitem')).toContainText('DH-DEMO-RETURN-02');
    await page.reload();
    await expect(orders.getByRole('listitem')).toHaveCount(1);
    await page.getByRole('button', { name: 'Bộ lọc (2)', exact: true }).click();
    await dialog.getByRole('button', { name: 'Đặt lại bộ lọc' }).click();
    await expect(orders.getByRole('listitem')).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Bộ lọc', exact: true })).toBeFocused();
});

test('R18 estimates current inputs through the API and removes an obsolete estimate without saving', async ({ page }) => {
    const creates: string[] = [];
    page.on('request', request => {
        if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/shops/shop-demo/orders')) creates.push(request.url());
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${server.url}/s/shop-demo/orders/new`);
    const compute = page.getByRole('button', { name: 'Tính dự toán', exact: true });
    await expect(compute).toBeDisabled();
    await page.getByRole('combobox', { name: 'Khách hàng', exact: true }).click();
    await waitForDemoMenu(page, 'Khách hàng *');
    await page.getByRole('option', { name: 'Linh (khách mẫu)', exact: true }).click();
    await page.getByRole('combobox', { name: 'Sản phẩm 1', exact: true }).click();
    await waitForDemoMenu(page, 'Sản phẩm 1');
    await page.getByRole('option', { name: 'Áo thun Essential · L · Than · AO-002', exact: true }).click();
    const quantity = page.getByRole('textbox', { name: 'Số lượng', exact: true });
    await quantity.fill('2');
    const first = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/orders/estimate'));
    await compute.click();
    const response = await first;
    expect(response.status()).toBe(200);
    expect(response.request().postDataJSON().lines[0].quantity).toBe(2);
    await expect(page.getByRole('status').filter({ hasText: 'Tạm tính tiền hàng' })).toContainText('498.000');
    await quantity.fill('3');
    await expect(page.getByText('Tạm tính tiền hàng', { exact: true })).toHaveCount(0);
    await compute.click();
    await expect(page.getByRole('status').filter({ hasText: 'Tạm tính tiền hàng' })).toContainText('747.000');
    expect(creates).toEqual([]);
    await expect(page.getByRole('button', { name: 'Lưu đơn nháp' })).toBeEnabled();
});
