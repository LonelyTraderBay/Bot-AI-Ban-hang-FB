import { expect, test } from '@playwright/test';
import { startDemoServer } from './demo-server.mjs';

let demoUrl = '';
let stopDemoServer: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    stopDemoServer = server.close;
});

test.afterAll(async () => {
    await stopDemoServer?.();
});

test('demo startup explains the required setup when the browser blocks Service Workers', async ({ browser }) => {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    try {
        const page = await context.newPage();
        await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());

        await expect(page.getByRole('heading', { name: 'Chưa khởi động được ứng dụng', exact: true })).toBeVisible();
        await expect(page.getByText(/Chạy npm run setup để tạo service worker mô phỏng/)).toBeVisible();
        await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toHaveCount(0);
        await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toHaveCount(0);
    }
    finally {
        await context.close();
    }
});
