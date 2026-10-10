import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer({ cacheIsolationKey: 'ui028-w11-orders-layout' });
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

test('Orders R17/R18/R19/R43 preserve responsive page geometry at 320-1440px', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const routes = [
        { id: 'R17', path: '/s/shop-demo/orders', heading: 'Đơn hàng' },
        { id: 'R18', path: '/s/shop-demo/orders/new', heading: 'Tạo đơn hàng' },
        { id: 'R19', path: '/s/shop-demo/orders/DH-1001', heading: 'Đơn DH-1001' },
        { id: 'R43', path: '/s/shop-demo/returns', heading: 'Đổi và trả hàng' },
    ];
    const observations = [];

    for (const width of [320, 390, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of routes) {
            await page.goto(new URL(route.path, demoUrl).toString());
            await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible();
            const main = page.locator('main#main-content');
            await expect(main).toHaveCSS('padding-left', width >= 768 ? '24px' : '16px');
            const geometry = await page.evaluate(() => ({
                clientWidth: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
            }));
            expect(geometry.scrollWidth, `${route.id} document width at ${width}px`).toBeLessThanOrEqual(geometry.clientWidth);
            observations.push({ route: route.id, width, ...geometry });
        }
    }

    expect(observations).toHaveLength(20);
    expect(pageErrors).toEqual([]);
});

test('Orders draft, versioned quote, canonical address snapshot and return dialogs keep their behavior without writes', async ({ page }) => {
    const pageErrors: string[] = [];
    const writes: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
        if (request.method() !== 'POST') return;
        const path = new URL(request.url()).pathname;
        if (/\/shops\/shop-demo\/(orders|returns)(\/|$)/.test(path)) writes.push(path);
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(new URL('/s/shop-demo/orders/new', demoUrl).toString());
    await expect(page.getByText(/Đơn xác nhận giữ snapshot địa chỉ của báo giá/)).toBeVisible();
    await page.getByRole('combobox', { name: 'Khách hàng' }).click();
    await page.getByRole('option', { name: 'Linh (khách mẫu)', exact: true }).click();
    await page.getByRole('combobox', { name: 'Hội thoại liên quan' }).click();
    await page.getByRole('option', { name: 'Linh (khách mẫu) · cv1', exact: true }).click();
    await page.getByRole('combobox', { name: 'Sản phẩm 1' }).click();
    await page.getByRole('option', { name: 'Áo thun Essential · L · Than · AO-002', exact: true }).click();
    await page.getByRole('combobox', { name: 'Địa chỉ giao hàng' }).click();
    await page.getByRole('option', { name: 'Địa chỉ giao hàng mẫu · Linh (khách mẫu)', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Lưu đơn nháp', exact: true })).toBeEnabled();
    expect(writes).toEqual([]);

    const orderDetail = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v2/shops/shop-demo/orders/DH-1001');
    await page.goto(new URL('/s/shop-demo/orders/DH-1001', demoUrl).toString());
    expect((await orderDetail).status()).toBe(200);
    await page.locator('main#main-content').getByRole('progressbar', { name: 'Đang tải dữ liệu', exact: true }).waitFor({ state: 'hidden' });
    await expect(page.getByText('Phiên bản 1', { exact: true })).toBeVisible();
    const quoteResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-1001/quote'));
    await page.getByRole('button', { name: 'Lấy báo giá hiện tại', exact: true }).click();
    expect((await quoteResponse).status()).toBe(200);
    await expect(page.getByText(/Bản đơn 1 · Hết hạn/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng' })).toBeDisabled();
    expect(writes.filter(path => path.endsWith('/orders/DH-1001/confirm'))).toEqual([]);

    for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(new URL('/s/shop-demo/returns?orderId=DH-DEMO-PAID-01', demoUrl).toString());
        await page.getByRole('button', { name: 'Tạo yêu cầu trả', exact: true }).click();
        const requestDialog = page.getByRole('dialog', { name: 'Yêu cầu trả hàng' });
        await expect(requestDialog).toBeVisible();
        const requestBox = await requestDialog.boundingBox();
        expect(requestBox).not.toBeNull();
        expect(requestBox!.x).toBeGreaterThanOrEqual(0);
        expect(requestBox!.x + requestBox!.width).toBeLessThanOrEqual(width);
        await requestDialog.getByRole('textbox', { name: 'Lý do trả' }).fill('Kiểm tra layout của return request');
        const quantity = requestDialog.getByRole('spinbutton', { name: /tối đa 1/ });
        await quantity.fill('1.5');
        await expect(requestDialog.getByRole('button', { name: 'Tạo yêu cầu' })).toBeDisabled();
        await page.keyboard.press('Escape');

        await page.goto(new URL('/s/shop-demo/returns', demoUrl).toString());
        const row = page.getByRole('row').filter({ hasText: 'seed-returncase-10036' });
        await row.getByRole('button', { name: 'Kiểm nhận' }).click();
        const inspectionDialog = page.getByRole('dialog', { name: 'Kiểm nhận hàng trả' });
        await expect(inspectionDialog).toBeVisible();
        const inspectionBox = await inspectionDialog.boundingBox();
        expect(inspectionBox).not.toBeNull();
        expect(inspectionBox!.x).toBeGreaterThanOrEqual(0);
        expect(inspectionBox!.x + inspectionBox!.width).toBeLessThanOrEqual(width);
        await page.keyboard.press('Escape');
    }

    expect(writes.filter(path => path.endsWith('/returns'))).toEqual([]);
    expect(writes.filter(path => path.endsWith('/orders/DH-1001/quote'))).toHaveLength(1);
    expect(writes.filter(path => path.endsWith('/orders/DH-1001/confirm'))).toEqual([]);
    expect(pageErrors).toEqual([]);
});
