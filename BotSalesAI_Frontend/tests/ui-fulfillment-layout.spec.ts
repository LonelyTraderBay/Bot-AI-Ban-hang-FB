import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer({ cacheIsolationKey: 'ui028-w14-fulfillment-layout' });
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

test('Fulfillment R41/R42 preserve shell gutter and contain responsive route layouts from 320-1440px', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const routes = [
        { id: 'R41', path: '/s/shop-demo/fulfillment', heading: 'Chuẩn bị hàng' },
        { id: 'R42', path: '/s/shop-demo/shipments', heading: 'Vận đơn & giao hàng' },
    ];
    const observations: Array<{ route: string; width: number; clientWidth: number; scrollWidth: number }> = [];

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

    expect(observations).toHaveLength(10);
    expect(pageErrors).toEqual([]);
});

test('Fulfillment prep, shipment-create, detail and event dialogs fit mobile and desktop without submitting', async ({ page }) => {
    const pageErrors: string[] = [];
    const writes: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/v2/') && request.method() !== 'GET') writes.push(`${request.method()} ${url.pathname}`);
    });

    for (const { width, height } of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
        await page.setViewportSize({ width, height });
        await gotoDemo(page, '/s/shop-demo/fulfillment');
        await page.getByRole('button', { name: 'Mở phiếu lấy hàng' }).first().click();
        const prepDialog = page.getByRole('dialog');
        await prepDialog.waitFor();
        await expect(prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' }).first()).toBeVisible();
        await expectDialogWithinViewport(page, prepDialog, width, height);
        await page.keyboard.press('Escape');

        await gotoDemo(page, '/s/shop-demo/shipments');
        await page.getByRole('button', { name: 'Tạo vận đơn', exact: true }).click();
        const createDialog = page.getByRole('dialog', { name: 'Tạo vận đơn' });
        await expect(createDialog.getByRole('textbox', { name: 'Tìm đơn hàng' })).toBeVisible();
        await expect(createDialog.getByRole('combobox', { name: 'Đơn đã đóng gói' })).toBeVisible();
        await expectDialogWithinViewport(page, createDialog, width, height);
        await page.keyboard.press('Escape');

        await page.getByRole('table').first().getByRole('button', { name: 'Chi tiết' }).first().click();
        const detailDialog = page.getByRole('dialog', { name: 'Chi tiết vận đơn' });
        await expect(detailDialog.getByText('Sự kiện vận chuyển', { exact: true })).toBeVisible();
        await expectDialogWithinViewport(page, detailDialog, width, height);
        await detailDialog.getByRole('button', { name: 'Cập nhật hành trình', exact: true }).click();
        const eventDialog = page.getByRole('dialog', { name: 'Cập nhật hành trình có bằng chứng' });
        await expect(eventDialog.getByRole('textbox', { name: 'Mã sự kiện bên vận chuyển' })).toBeVisible();
        await expect(eventDialog.getByRole('textbox', { name: 'Thời gian sự kiện' })).toBeVisible();
        await expectDialogWithinViewport(page, eventDialog, width, height);
        await page.keyboard.press('Escape');
    }

    expect(writes).toEqual([]);
    expect(pageErrors).toEqual([]);
});
