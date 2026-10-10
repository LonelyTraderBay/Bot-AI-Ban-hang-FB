import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeEach(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterEach(async () => closeDemo?.());

const routes = [
    { path: '/s/shop-demo/integrations/channels', heading: 'Kết nối Facebook' },
    { path: '/s/shop-demo/integrations/ai', heading: 'Nhà cung cấp AI' },
];

async function openRoute(page: import('@playwright/test').Page, route: string, heading: string) {
    const initial = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === route.replace('/s/', '/api/v2/shops/'));
    const catalog = route === '/s/shop-demo/integrations/ai' ? page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v2/shops/shop-demo/integrations/ai/catalog') : undefined;
    await page.goto(new URL(route, demoUrl).toString(), { waitUntil: 'domcontentloaded' });
    expect((await initial).status()).toBe(200);
    if (catalog) expect((await catalog).status()).toBe(200);
    await page.getByRole('progressbar', { name: 'Đang tải màn hình', exact: true }).waitFor({ state: 'hidden' });
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
}

async function expectDocumentFits(page: import('@playwright/test').Page, width: number) {
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
}

async function expectDialogFits(page: import('@playwright/test').Page, width: number, height: number) {
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height + 1);
}

test('Integrations routes R29/R30 fit the supported page-width boundaries', async ({ page }) => {
    for (const width of [320, 390, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of routes) {
            await openRoute(page, route.path, route.heading);
            await expectDocumentFits(page, width);
        }
    }
});

test('R29 disconnect and R30 create/edit credential dialogs stay inside mobile and desktop viewports', async ({ page }) => {
    for (const { width, height } of [
        { width: 320, height: 844 },
        { width: 390, height: 844 },
        { width: 1280, height: 900 },
    ]) {
        await page.setViewportSize({ width, height });

        await openRoute(page, '/s/shop-demo/integrations/channels', 'Kết nối Facebook');
        await page.getByRole('button', { name: 'Ngắt kết nối' }).first().click();
        await expect(page.getByRole('dialog', { name: 'Ngắt kết nối Page' })).toBeVisible();
        await expectDialogFits(page, width, height);

        await openRoute(page, '/s/shop-demo/integrations/ai', 'Nhà cung cấp AI');
        await page.getByRole('button', { name: 'Sửa / xoay khóa' }).first().click();
        const editDialog = page.getByRole('dialog', { name: 'Sửa kết nối / xoay khóa' });
        await expect(editDialog).toBeVisible();
        await expectDialogFits(page, width, height);
        await page.getByRole('button', { name: 'Hủy' }).click();

        await page.getByRole('button', { name: 'Thêm kết nối AI' }).click();
        const createDialog = page.getByRole('dialog', { name: 'Kết nối AI mới' });
        await expect(createDialog).toBeVisible();
        await expectDialogFits(page, width, height);
        await expect(createDialog.getByLabel('Khóa API')).toHaveAttribute('type', 'password');
    }
});
