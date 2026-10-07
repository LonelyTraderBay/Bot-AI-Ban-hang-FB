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
    { path: '/s/shop-demo/bot', heading: 'Điều khiển Admin AI' },
    { path: '/s/shop-demo/bot/playground', heading: 'Phòng thử bot' },
    { path: '/s/shop-demo/bot/evaluations', heading: 'Đánh giá AI' },
    { path: '/s/shop-demo/bot/team', heading: 'Đội ngũ AI' },
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

test('Bot routes R26/R27/R28/R51 fit the supported page-width boundaries', async ({ page }) => {
    for (const width of [320, 390, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of routes) {
            await openRoute(page, route.path, route.heading);
            await expectDocumentFits(page, width);
        }
    }
});

test('Bot config, evaluation, role and budget dialogs stay inside mobile and desktop viewports', async ({ page }) => {
    for (const { width, height } of [
        { width: 320, height: 844 },
        { width: 390, height: 844 },
        { width: 1280, height: 900 },
    ]) {
        await page.setViewportSize({ width, height });

        await openRoute(page, '/s/shop-demo/bot', 'Điều khiển Admin AI');
        await page.getByRole('button', { name: 'Sửa bản nháp' }).click();
        await expect(page.getByRole('dialog', { name: 'Cấu hình bản nháp' })).toBeVisible();
        await expectDialogFits(page, width, height);

        await openRoute(page, '/s/shop-demo/bot/evaluations', 'Đánh giá AI');
        await page.getByRole('button', { name: 'Chạy đánh giá' }).click();
        await expect(page.getByRole('dialog', { name: 'Đánh giá cấu hình nháp' })).toBeVisible();
        await expectDialogFits(page, width, height);

        await openRoute(page, '/s/shop-demo/bot/team', 'Đội ngũ AI');
        await page.getByRole('button', { name: 'Phân công' }).first().click();
        await expect(page.getByRole('dialog', { name: 'Giao trách nhiệm và cấu hình vai trò' })).toBeVisible();
        await expectDialogFits(page, width, height);

        await openRoute(page, '/s/shop-demo/bot/team', 'Đội ngũ AI');
        await page.getByRole('button', { name: 'Đổi có phê duyệt' }).first().click();
        await expect(page.getByRole('dialog', { name: 'Đổi giới hạn được duyệt' })).toBeVisible();
        await expectDialogFits(page, width, height);
    }
});
