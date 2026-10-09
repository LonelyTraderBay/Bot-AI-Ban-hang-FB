import { expect, test } from '@playwright/test';
import { startLiveServer } from './demo-server.mjs';

let liveUrl = '';
let stopLiveServer: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startLiveServer();
    liveUrl = server.url;
    stopLiveServer = server.close;
});

test.afterAll(async () => {
    await stopLiveServer?.();
});

test('expired live session redirects to login and preserves the requested shop route', async ({ page }) => {
    let sessionRequests = 0;
    await page.route(url => new URL(url.href).pathname === '/api/v2/session', async route => {
        sessionRequests += 1;
        await route.fulfill({
            status: 401,
            contentType: 'application/problem+json',
            body: JSON.stringify({
                type: 'about:blank',
                title: 'Unauthenticated',
                status: 401,
                code: 'UNAUTHENTICATED',
                detail: 'Phiên đã hết hạn.',
                requestId: 'session-unauthorized-test',
            }),
        });
    });

    await page.goto(new URL('/s/shop-demo/finance/profit-loss', liveUrl).toString());

    await expect(page.getByRole('heading', { name: 'Chào mừng trở lại', exact: true })).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get('returnTo')).toBe('/s/shop-demo/finance/profit-loss');
    await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toHaveCount(0);
    expect(sessionRequests).toBeGreaterThan(0);
});
