import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer({ cacheIsolationKey: 'ui028-w16-customers-layout' });
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

async function gotoDemo(page: import('@playwright/test').Page, route: string) {
    await page.goto(new URL(route, demoUrl).toString());
}

async function expectDialogWithinViewport(page: import('@playwright/test').Page, dialog: import('@playwright/test').Locator, width: number, height: number) {
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
}

test('Customers R07/R08/R54 layouts fit the shell at every responsive boundary', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const routes = [
        { id: 'R07', path: '/s/shop-demo/customers', heading: 'Khách hàng' },
        { id: 'R08', path: '/s/shop-demo/customers/c1', heading: 'Linh (khách mẫu)' },
        { id: 'R54', path: '/s/shop-demo/service-cases', heading: 'Chăm sóc sau bán' },
    ];
    const observations: Array<{ route: string; width: number; clientWidth: number; scrollWidth: number }> = [];

    for (const width of [320, 390, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of routes) {
            await gotoDemo(page, route.path);
            await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible();
            await expect(page.locator('main#main-content')).toHaveCSS('padding-left', width >= 768 ? '24px' : '16px');
            const geometry = await page.evaluate(() => ({
                clientWidth: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
            }));
            expect(geometry.scrollWidth, `${route.id} document width at ${width}px`).toBeLessThanOrEqual(geometry.clientWidth);
            observations.push({ route: route.id, width, ...geometry });
        }
    }

    expect(observations).toHaveLength(15);
    expect(errors).toEqual([]);
});

test('Customer create and service-case dialogs stay in the viewport without submitting', async ({ page }) => {
    const errors: string[] = [];
    const writes: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/v2/') && request.method() !== 'GET') writes.push(`${request.method()} ${url.pathname}`);
    });

    for (const { width, height } of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
        await page.setViewportSize({ width, height });

        await gotoDemo(page, '/s/shop-demo/customers');
        await page.getByRole('button', { name: 'Thêm khách hàng', exact: true }).click();
        let dialog = page.getByRole('dialog', { name: 'Thêm khách hàng' });
        await expect(dialog.getByLabel('Tên khách hàng')).toBeVisible();
        await expectDialogWithinViewport(page, dialog, width, height);
        await page.keyboard.press('Escape');

        await gotoDemo(page, '/s/shop-demo/service-cases');
        await page.getByRole('button', { name: 'Tạo yêu cầu', exact: true }).click();
        dialog = page.getByRole('dialog', { name: 'Yêu cầu mới' });
        await expect(dialog.getByLabel('Khách hàng')).toBeVisible();
        await expect(dialog.getByLabel('Nội dung')).toBeVisible();
        await expectDialogWithinViewport(page, dialog, width, height);
        await page.keyboard.press('Escape');

        await page.getByRole('button', { name: 'Xử lý', exact: true }).first().click();
        dialog = page.getByRole('dialog', { name: 'Cập nhật yêu cầu' });
        await expect(dialog.getByLabel('Trạng thái mới')).toBeVisible();
        await expect(dialog.getByLabel('Kết quả / lý do')).toBeVisible();
        await expectDialogWithinViewport(page, dialog, width, height);
        await page.keyboard.press('Escape');
    }

    expect(errors).toEqual([]);
    expect(writes).toEqual([]);
});
