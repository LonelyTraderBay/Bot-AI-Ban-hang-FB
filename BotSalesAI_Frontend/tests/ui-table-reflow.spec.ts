import path from 'node:path';
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
            const table = page.getByRole('table', { name: label, exact: true });
            await expect(table.locator('tbody tr').first()).toBeVisible();
            await page.screenshot({ path: path.join('evidence/ui-table-reflow-20261112', `${process.env.TABLE_CAPTURE || 'after'}-${info.project.name}-${route.replaceAll('/', '-')}-${width}.png`), fullPage: true });
            const geometry = await region.evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth }));
            if (width < 600) expect(geometry.scroll, `${route} ${width}`).toBeLessThanOrEqual(geometry.client + 1);
            expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
            await expect(table.getByRole('columnheader')).toHaveCount(route === 'inventory/movements' ? 9 : 4);
            expect(await table.getByRole('row').count()).toBeGreaterThan(1);
            if (width < 600) {
                const clipped = await region.locator('tbody td').evaluateAll(cells => cells.some(cell => {
                    const a = cell.getBoundingClientRect(), r = cell.closest('[role=region]')!.getBoundingClientRect();
                    return a.left < r.left - 1 || a.right > r.right + 1;
                }));
                expect(clipped).toBe(false);
            }
            if (route === 'inventory/movements') await expect(table.getByText('Áo mẫu A · M · Xanh · DEMO-001').first()).toBeVisible();
            else { await table.getByRole('button', { name: 'Chi tiết nhân sự', exact: true }).first().click(); await expect(page.getByRole('dialog', { name: 'Chi tiết nhân sự' })).toBeVisible(); }
        }
    });
}

