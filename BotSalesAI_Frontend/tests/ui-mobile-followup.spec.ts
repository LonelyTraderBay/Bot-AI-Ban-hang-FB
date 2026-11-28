import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';
let url = '', close: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer({ cacheIsolationKey: 'ui-mobile-followup' }); url = server.url; close = server.close; });
test.afterAll(async () => close?.());
for (const width of [320, 390, 1440]) {
    test(`table actions remain usable at ${width}`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: 900 });
        for (const [route, label, action] of [['orders', 'Danh sách đơn hàng', 'Xem đơn'], ['customers', 'Danh sách khách hàng', 'Hồ sơ']] as const) {
            await page.goto(`${url}/s/shop-demo/${route}`);
            const region = page.getByRole('region', { name: label, exact: true });
            await expect(region).toBeVisible();
            const link = region.getByRole('link', { name: action }).first(); await expect(link).toBeVisible();
            if (width < 768) {
                await expect(region.getByRole('list')).toBeVisible();
                const rects = await link.evaluate(node => { const a = node.getBoundingClientRect(), r = node.closest('[data-ui-table-layout]')!.getBoundingClientRect(); return { left: a.left, right: a.right, regionLeft: r.left, regionRight: r.right }; });
                expect(rects.left).toBeGreaterThanOrEqual(rects.regionLeft); expect(rects.right).toBeLessThanOrEqual(rects.regionRight);
                expect(await region.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
            } else {
                await expect(region.getByRole('table')).toBeVisible();
            }
            if (route === 'orders') {
                if (width < 768) {
                    const sample = region.getByRole('listitem').filter({ hasText: 'DH-1001' });
                    await sample.getByText('Xem thêm thông tin', { exact: true }).press('Enter');
                    await expect(sample.getByRole('link', { name: /Linh/ })).toBeVisible();
                } else {
                    await expect(region.getByRole('link', { name: /Linh/ }).first()).toBeVisible();
                }
            }
            await page.screenshot({ path: info.outputPath(`${route}-${width}.png`) });
            await link.focus();
            await link.press('Enter');
            await expect(page).toHaveURL(new RegExp(`/${route}/`));
        }
    });
}
test('order product selector shows its empty prompt and retains its label', async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 900 }); await page.goto(`${url}/s/shop-demo/orders/new`);
    const select = page.getByRole('combobox', { name: 'Sản phẩm 1', exact: true }); await expect(select).toHaveText('Chọn sản phẩm');
    await select.click(); const option = page.getByRole('option').filter({ hasText: /·/ }).first(); await expect(option).toBeVisible(); await option.click();
    await expect(select).not.toHaveText('Chọn sản phẩm'); await page.screenshot({ path: info.outputPath('order-select-390.png') });
});
