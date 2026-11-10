import { test, expect } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let url = '';
let close: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer(); url = server.url; close = server.close; });
test.afterAll(async () => close?.());

test('navigation keeps the most specific section selected on detail pages', async ({ page }) => {
    const cases = [
        ['/s/shop-demo/inbox/cv1', 'Hộp thư khách hàng'],
        ['/s/shop-demo/products/p1', 'Sản phẩm'],
        ['/s/shop-demo/inventory/movements', 'Lịch sử kho'],
        ['/s/shop-demo/finance/entries', 'Sổ thu chi'],
        ['/s/shop-demo/bot/playground', 'Thử bot'],
    ];
    for (const [path, label] of cases) {
        await page.goto(new URL(path, url).toString());
        const nav = page.getByRole('navigation', { name: 'Điều hướng chính' });
        const link = nav.getByRole('link', { name: label, exact: true });
        await expect(link).toHaveClass(/Mui-selected/);
        await expect(nav.locator('[aria-current]')).toHaveCount(1);
    }
});

test('mobile menu shows the selected detail section', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(new URL('/s/shop-demo/products/p1', url).toString());
    await page.getByRole('button', { name: 'Mở menu' }).click();
    const nav = page.getByRole('navigation', { name: 'Điều hướng chính' }).filter({ visible: true });
    await expect(nav.getByRole('link', { name: 'Sản phẩm', exact: true })).toHaveAttribute('aria-current', 'location');
});
