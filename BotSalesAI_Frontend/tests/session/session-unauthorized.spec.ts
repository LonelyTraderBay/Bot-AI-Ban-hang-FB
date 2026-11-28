import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { startLiveServer } from './demo-server.mjs';

let liveUrl = '';
let stopLiveServer: (() => Promise<void>) | undefined;
const unauthenticated = {
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
};

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
        await route.fulfill(unauthenticated);
    });

    await page.goto(new URL('/s/shop-demo/finance/profit-loss', liveUrl).toString());

    await expect(page.getByRole('heading', { name: 'Đăng nhập BotSales AI', exact: true })).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get('returnTo')).toBe('/s/shop-demo/finance/profit-loss');
    await expect(page.getByRole('complementary', { name: 'Công cụ mô phỏng', exact: true })).toHaveCount(0);
    expect(sessionRequests).toBeGreaterThan(0);
});

test('a protected API 401 invalidates a loaded session without a stream event', async ({ page }) => {
    type Seed = { members: Array<Record<string, unknown>>; shops: Array<Record<string, unknown>> };
    const seed = JSON.parse(readFileSync(new URL('../../apps/web/src/mocks/seed.json', import.meta.url), 'utf8')) as Seed;
    const membership = seed.members.find(member => member.shopId === 'shop-demo' && member.userId === 'user-demo');
    const shop = seed.shops.find(value => value.id === 'shop-demo');
    expect(membership).toBeDefined();
    expect(shop).toBeDefined();
    const envelope = (data: unknown) => ({
        status: 200, json: { data, meta: { requestId: 'session-unauthorized-test', asOf: '2026-10-07T00:00:00Z' } },
    });
    await page.route(liveUrl + '/api/v2/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/v2/session') {
            return route.fulfill(envelope({
                user: { id: 'user-demo', displayName: 'Tài khoản kiểm thử', email: 'owner@example.test' },
                csrfToken: 'test-only-session-token', expiresAt: '2030-12-31T23:59:59Z', memberships: [membership],
            }));
        }
        if (path === '/api/v2/shops/shop-demo') return route.fulfill(envelope(shop));
        if (path === '/api/v2/shops/shop-demo/dashboard') return route.fulfill(unauthenticated);
        return route.abort();
    });
    const rejected = page.waitForResponse(response => response.url().endsWith('/api/v2/shops/shop-demo/dashboard') && response.status() === 401);
    await page.goto(liveUrl + '/s/shop-demo/overview');
    await rejected;
    await expect(page.getByRole('heading', { name: 'Đăng nhập BotSales AI', exact: true })).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get('returnTo')).toBe('/s/shop-demo/overview');
    await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toHaveCount(0);
});
