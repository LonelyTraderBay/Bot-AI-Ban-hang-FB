import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';
let url = '';
let close: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer({ cacheIsolationKey: 'dialog-heading-a11y' }); url = server.url; close = server.close; });
test.afterAll(async () => close?.());

test('dialog headings exclude the separately named close button', async ({ page }) => {
    for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of [
            { path: 'service-cases', button: 'Chi tiết yêu cầu', title: 'Chi tiết yêu cầu sau bán' },
            { path: 'customers', button: 'Thêm khách hàng', title: 'Thêm khách hàng' },
        ]) {
            await page.goto(`${url}/s/shop-demo/${route.path}`);
            const opener = page.getByRole('button', { name: route.button, exact: true }).first();
            await opener.click();
            const dialog = page.getByRole('dialog', { name: route.title, exact: true });
            await expect(dialog.getByRole('heading', { name: route.title, exact: true })).toBeVisible();
            await expect(dialog.getByRole('button', { name: 'Đóng', exact: true }).first()).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(dialog).toBeHidden();
            await expect(opener).toBeFocused();
        }
    }
});
