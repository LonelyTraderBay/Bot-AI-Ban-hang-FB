import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

test('dashboard hierarchy, CTA targets, and page width hold across supported breakpoints', async ({ page }) => {
    await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
    await expect(page.getByRole('heading', { name: 'Tình hình hiện tại', exact: true })).toBeVisible();
    await expect(page.getByText('Dữ liệu cập nhật', { exact: false })).toBeVisible();

    for (const width of [320, 390, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.getByRole('heading', { name: 'Tình hình hiện tại', exact: true })).toBeVisible();
        await expect(page.getByText('Hội thoại đang mở', { exact: true })).toBeVisible();
        await expect(page.getByText('Đơn chờ xử lý', { exact: true })).toBeVisible();
        await expect(page.getByText('Sản phẩm gần hết', { exact: true })).toBeVisible();
        await expect(page.getByText('Trợ lý bán hàng', { exact: true })).toBeVisible();

        for (const action of [
            page.getByRole('link', { name: 'Xem việc cần làm', exact: true }),
            page.getByRole('link', { name: 'Tạo đơn hàng', exact: true }),
        ]) {
            await expect(action).toBeVisible();
            const target = await action.boundingBox();
            expect(target).not.toBeNull();
            expect(target!.height).toBeGreaterThanOrEqual(44);
        }

        const teamPanel = page.locator('.MuiPaper-outlined').filter({ has: page.getByRole('heading', { name: 'Đội ngũ AI của cửa hàng', exact: true }) }).first();
        const teamStatus = teamPanel.locator('.MuiChip-root').first();
        const statusBounds = await teamStatus.boundingBox();
        const roleCardBounds = await teamStatus.locator('xpath=..').boundingBox();
        expect(statusBounds).not.toBeNull();
        expect(roleCardBounds).not.toBeNull();
        expect(statusBounds!.width).toBeLessThan(roleCardBounds!.width / 2);

        const dimensions = await page.evaluate(() => ({
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(dimensions.clientWidth).toBe(width);
        expect(dimensions.scrollWidth).toBeLessThanOrEqual(width + 1);
    }
});
