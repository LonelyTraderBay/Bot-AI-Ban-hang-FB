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
    { path: '/s/shop-demo/operations', heading: 'Công việc hôm nay' },
    { path: '/s/shop-demo/approvals', heading: 'Cần phê duyệt' },
    { path: '/s/shop-demo/operations/digests', heading: 'Bản tin & sức khỏe hệ thống' },
];

async function openRoute(page: import('@playwright/test').Page, route: string, heading: string) {
    await page.goto(new URL(route, demoUrl).toString(), { waitUntil: 'domcontentloaded' });
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

test('R37/R38/R52 Operations routes fit the supported page-width boundaries', async ({ page }) => {
    for (const width of [320, 390, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of routes) {
            await openRoute(page, route.path, route.heading);
            await expectDocumentFits(page, width);
        }
    }
});

test('R52 role-control confirmation stays inside mobile and desktop viewports', async ({ page }) => {
    for (const { width, height } of [
        { width: 320, height: 844 },
        { width: 390, height: 844 },
        { width: 1280, height: 900 },
    ]) {
        await page.setViewportSize({ width, height });
        await openRoute(page, '/s/shop-demo/operations/digests', 'Bản tin & sức khỏe hệ thống');
        await page.getByRole('button', { name: 'Kiểm tra điều kiện tiếp tục', exact: true }).first().click();
        await expect(page.getByRole('dialog', { name: 'Kiểm tra điều kiện tiếp tục' })).toBeVisible();
        await expectDialogFits(page, width, height);
    }
});
