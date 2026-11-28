import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';
let url = '', close: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer({ cacheIsolationKey: 'table-reflow-20261112' }); url = server.url; close = server.close; });
test.afterAll(async () => close?.());
for (const [route, label] of [['inventory/movements', 'Lịch sử biến động kho'], ['settings/team', 'Nhân sự và quyền truy cập']] as const) {
    test(`${route} reflows without horizontal scrolling`, async ({ page }, info) => {
        for (const width of [320, 390, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            await page.goto(`${url}/s/shop-demo/${route}`);
            const region = page.getByRole('region', { name: label, exact: true });
            if (width < 768) {
                await expect(region.getByRole('listitem').first()).toBeVisible();
                await expect(region.getByRole('table')).toHaveCount(0);
            } else {
                const table = region.getByRole('table', { name: label, exact: true });
                await expect(table.locator('tbody tr').first()).toBeVisible();
                await expect(table.getByRole('columnheader')).toHaveCount(route === 'inventory/movements' ? 9 : 4);
            }
            await page.screenshot({ path: info.outputPath(`${width}.png`), fullPage: true });
            const geometry = await region.evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth }));
            if (width < 600) expect(geometry.scroll, `${route} ${width}`).toBeLessThanOrEqual(geometry.client + 1);
            expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
            if (width < 600) {
                const clipped = await region.getByRole('listitem').evaluateAll(cards => cards.some(cell => {
                    const a = cell.getBoundingClientRect(), r = cell.closest('[data-ui-table-layout="cards"]')!.getBoundingClientRect();
                    return a.left < r.left - 1 || a.right > r.right + 1;
                }));
                expect(clipped).toBe(false);
            }
            if (route === 'inventory/movements') await expect(region.getByText('Áo mẫu A · M · Xanh · DEMO-001').first()).toBeVisible();
            else { await region.getByRole('button', { name: 'Chi tiết nhân sự', exact: true }).first().click(); await expect(page.getByRole('dialog', { name: 'Chi tiết nhân sự' })).toBeVisible(); }
        }
    });
}

