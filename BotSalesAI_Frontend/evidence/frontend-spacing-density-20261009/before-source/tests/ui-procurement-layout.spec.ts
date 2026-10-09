import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer({ cacheIsolationKey: 'ui028-w13-procurement-layout' });
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

async function gotoDemo(page: import('@playwright/test').Page, route: string) {
    await page.goto(new URL(route, demoUrl).toString());
}

async function chooseOption(page: import('@playwright/test').Page, label: string, value: string | RegExp, within?: import('@playwright/test').Locator) {
    const scope = within || page;
    await scope.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: typeof value === 'string' }).click();
}

async function expectDialogWithinViewport(page: import('@playwright/test').Page, dialog: import('@playwright/test').Locator, width: number) {
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
}

test('Procurement R44-R47 preserve shared page gutter and contain responsive tables at 320-1440px', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const routes = [
        { id: 'R44', path: '/s/shop-demo/suppliers', heading: 'Nhà cung cấp hàng hóa' },
        { id: 'R45', path: '/s/shop-demo/replenishment', heading: 'Nhập lại hàng' },
        { id: 'R46', path: '/s/shop-demo/purchases', heading: 'Đơn mua hàng' },
        { id: 'R47', path: '/s/shop-demo/receipts', heading: 'Nhận hàng' },
    ];
    const observations = [];

    for (const width of [320, 390, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of routes) {
            await gotoDemo(page, route.path);
            await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible();
            await expect(page.getByRole('table').first()).toBeVisible();
            await expect(page.locator('main#main-content')).toHaveCSS('padding-left', width >= 768 ? '24px' : '16px');
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

test('Procurement supplier, offer, rule, purchase and receipt dialogs fit narrow and desktop viewports without writes', async ({ page }) => {
    const pageErrors: string[] = [];
    const writes: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
        if (request.method() !== 'POST') return;
        const url = new URL(request.url());
        if (/\/shops\/shop-demo\/(suppliers|supplier-offers|reorder-rules|purchase-orders|goods-receipts)(\/|$)/.test(url.pathname)) writes.push(url.pathname);
    });

    for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 900 });

        await gotoDemo(page, '/s/shop-demo/suppliers');
        await page.getByRole('button', { name: 'Thêm nhà cung cấp', exact: true }).click();
        await expectDialogWithinViewport(page, page.getByRole('dialog', { name: 'Nhà cung cấp mới' }), width);
        await page.keyboard.press('Escape');
        const supplier = page.getByRole('table').first().getByRole('row').filter({ hasText: 'Xưởng hàng mẫu' });
        await supplier.getByRole('button', { name: 'Thêm báo giá', exact: true }).click();
        await expectDialogWithinViewport(page, page.getByRole('dialog', { name: /Báo giá — Xưởng hàng mẫu/ }), width);
        await page.keyboard.press('Escape');

        await gotoDemo(page, '/s/shop-demo/replenishment');
        await page.getByRole('button', { name: 'Thêm quy tắc', exact: true }).click();
        const rule = page.getByRole('dialog', { name: 'Quy tắc nhập lại' });
        await expectDialogWithinViewport(page, rule, width);
        await chooseOption(page, 'Báo giá / SKU', /v-p1 · supplier-01/, rule);
        await expect(rule.getByRole('button', { name: 'Lưu quy tắc' })).toBeEnabled();
        await page.keyboard.press('Escape');

        await gotoDemo(page, '/s/shop-demo/purchases');
        await page.getByRole('button', { name: 'Tạo đơn mua', exact: true }).click();
        const purchase = page.getByRole('dialog', { name: 'Đơn mua mới' });
        await expectDialogWithinViewport(page, purchase, width);
        await chooseOption(page, 'Nhà cung cấp đã duyệt', 'Xưởng hàng mẫu', purchase);
        await chooseOption(page, 'Báo giá dòng 1', /v-p1/, purchase);
        await expect(purchase.getByRole('spinbutton', { name: 'Số lượng dòng 1' })).toHaveValue('5');
        await expect(purchase.getByRole('button', { name: 'Lưu đơn nháp' })).toBeEnabled();
        await page.keyboard.press('Escape');

        await gotoDemo(page, '/s/shop-demo/receipts');
        await page.getByRole('button', { name: 'Tạo phiếu nhận', exact: true }).click();
        const receipt = page.getByRole('dialog', { name: 'Phiếu nhận hàng mới' });
        await expectDialogWithinViewport(page, receipt, width);
        await chooseOption(page, 'Đơn mua đã xác nhận', 'seed-purchaseorder-10046', receipt);
        await expect(receipt.getByText('Đặt 10 · đã nhận 4 · bị từ chối 0 · còn 6')).toBeVisible();
        await expect(receipt.getByRole('spinbutton', { name: 'Nhận đạt v-p6' })).toBeVisible();
        await page.keyboard.press('Escape');
    }

    expect(writes).toEqual([]);
    expect(pageErrors).toEqual([]);
});
