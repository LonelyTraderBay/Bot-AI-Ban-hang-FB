import path from 'node:path';
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
            if (width < 600) {
                const rects = await link.evaluate(node => { const a = node.getBoundingClientRect(), r = node.closest('[role=region]')!.getBoundingClientRect(); return { left: a.left, right: a.right, regionLeft: r.left, regionRight: r.right }; });
                expect(rects.left).toBeGreaterThanOrEqual(rects.regionLeft); expect(rects.right).toBeLessThanOrEqual(rects.regionRight);
                await region.focus(); const before = await region.evaluate(node => node.scrollLeft); await page.keyboard.press('ArrowRight');
                await expect.poll(() => region.evaluate(node => node.scrollLeft)).toBeGreaterThan(before);
            }
            if (route === 'orders') await expect(region.getByRole('link', { name: /Linh/ }).first()).toBeVisible();
            await page.screenshot({ path: path.join('evidence/ui-mobile-followup-20261110', `${info.project.name}-${route}-${width}.png`) });
            await link.click(); await expect(page).toHaveURL(new RegExp(`/${route}/`));
        }
    });
}
test('order product selector shows its empty prompt and retains its label', async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 900 }); await page.goto(`${url}/s/shop-demo/orders/new`);
    const select = page.getByRole('combobox', { name: 'Sản phẩm 1', exact: true }); await expect(select).toHaveText('Chọn sản phẩm');
    await select.click(); const option = page.getByRole('option').filter({ hasText: /·/ }).first(); await expect(option).toBeVisible(); await option.click();
    await expect(select).not.toHaveText('Chọn sản phẩm'); await page.screenshot({ path: path.join('evidence/ui-mobile-followup-20261110', `${info.project.name}-order-select-390.png`) });
});
