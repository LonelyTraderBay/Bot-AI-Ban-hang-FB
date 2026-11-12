import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let url = '';
let close: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer({ cacheIsolationKey: 'service-cases-accessibility' }); url = server.url; close = server.close; });
test.afterAll(async () => close?.());

test('service case details and processing are reachable on narrow screens and retain customer name', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/v2/') && request.method() !== 'GET') writes.push(request.method()); });
    for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${url}/s/shop-demo/service-cases`);
        const row = page.getByRole('region', { name: 'Yêu cầu chăm sóc sau bán' }).getByRole('row').nth(1);
        await expect(row).toBeVisible();
        const customerName = await row.getByRole('cell').nth(1).innerText();
        const detailButton = width < 768 ? row.getByRole('cell').first().getByRole('button', { name: 'Chi tiết yêu cầu', exact: true }) : row.getByRole('button', { name: 'Chi tiết yêu cầu', exact: true });
        await expect(detailButton).toBeInViewport();
        await detailButton.focus();
        await page.keyboard.press('Enter');
        const detail = page.getByRole('dialog', { name: 'Chi tiết yêu cầu sau bán' });
        await expect(detail.getByRole('link', { name: customerName, exact: true })).toBeVisible();
        if (width < 768) {
            await detail.getByRole('button', { name: 'Xử lý', exact: true }).click();
            const processing = page.getByRole('dialog', { name: 'Cập nhật yêu cầu' });
            await expect(processing.getByLabel('Trạng thái mới')).toBeVisible();
            await page.keyboard.press('Escape');
        } else {
            await page.keyboard.press('Escape');
            await expect(detailButton).toBeFocused();
            await row.getByRole('button', { name: 'Xử lý', exact: true }).click();
            await expect(page.getByRole('dialog', { name: 'Cập nhật yêu cầu' })).toBeVisible();
            await page.keyboard.press('Escape');
        }
    }
    expect(writes).toEqual([]);
});

test('service case customer falls back to its ID when the lookup does not contain the customer', async ({ page }) => {
    await page.addInitScript(() => {
        const original = window.fetch.bind(window);
        window.fetch = async (input, init) => {
            const address = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
            const response = await original(input, init);
            if (new URL(address, location.origin).pathname === '/api/v2/shops/shop-demo/customers' && response.ok) {
                const body = await response.json();
                body.data = [];
                return new Response(JSON.stringify(body), { status: response.status, headers: response.headers });
            }
            return response;
        };
    });
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`${url}/s/shop-demo/service-cases`);
    const row = page.getByRole('region', { name: 'Yêu cầu chăm sóc sau bán' }).getByRole('row').nth(1);
    await expect(row.getByRole('cell').nth(1)).toHaveText('c2');
    await row.getByRole('cell').first().getByRole('button', { name: 'Chi tiết yêu cầu' }).click();
    await expect(page.getByRole('dialog', { name: 'Chi tiết yêu cầu sau bán' }).getByRole('link', { name: 'c2', exact: true })).toBeVisible();
});
