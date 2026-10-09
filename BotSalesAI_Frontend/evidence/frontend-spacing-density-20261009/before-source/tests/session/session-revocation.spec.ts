import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { startLiveServer } from './demo-server.mjs';

type Seed = { members: Array<Record<string, unknown>>; shops: Array<Record<string, unknown>> };
const seed = JSON.parse(readFileSync(new URL('../../apps/web/src/mocks/seed.json', import.meta.url), 'utf8')) as Seed;
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

test('session.revoked SSE closes the stream and clears the active shop session', async ({ page }) => {
    const membership = seed.members.find(member => member.shopId === 'shop-demo' && member.userId === 'user-demo' && member.status === 'active');
    const shop = seed.shops.find(candidate => candidate.id === 'shop-demo');
    expect(membership).toBeDefined();
    expect(shop).toBeDefined();

    let sessionReads = 0;
    let eventRequests = 0;
    let revoked = false;
    let releaseRevocation!: () => void;
    const revocationGate = new Promise<void>(resolve => { releaseRevocation = resolve; });
    const session = {
        user: { id: 'user-demo', displayName: 'Tài khoản kiểm thử', email: 'owner@example.test' },
        csrfToken: 'test-only-session-token',
        expiresAt: '2030-12-31T23:59:59Z',
        memberships: [membership],
    };
    const envelope = (data: unknown) => JSON.stringify({ data, meta: { requestId: 'session-revocation-test', asOf: '2026-10-07T00:00:00Z' } });
    const event = {
        eventId: 'session-revoked-event-1',
        type: 'session.revoked',
        schemaVersion: 1,
        shopId: 'shop-demo',
        resourceType: 'session',
        resourceId: 'test-session',
        resourceVersion: 2,
        occurredAt: '2026-10-07T00:00:00Z',
        sequence: 1,
    };

    await page.route(`${liveUrl}/api/v2/**`, async route => {
        const request = route.request();
        const pathname = new URL(request.url()).pathname;
        if (pathname === '/api/v2/session' && request.method() === 'GET') {
            sessionReads += 1;
            if (!revoked)
                return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(session) });
            return route.fulfill({
                status: 401,
                contentType: 'application/problem+json',
                body: JSON.stringify({ type: 'about:blank', title: 'Unauthenticated', status: 401, code: 'UNAUTHENTICATED', detail: 'Phiên đã bị thu hồi.', requestId: 'session-revocation-test' }),
            });
        }
        if (pathname === '/api/v2/shops/shop-demo' && request.method() === 'GET')
            return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(shop) });
        if (pathname === '/api/v2/shops/shop-demo/events') {
            eventRequests += 1;
            await revocationGate;
            revoked = true;
            return route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' }, body: `data: ${JSON.stringify(event)}\n\n` });
        }
        return route.fulfill({ status: 503, contentType: 'application/problem+json', body: JSON.stringify({ type: 'about:blank', title: 'Unavailable', status: 503, code: 'TEST_UNAVAILABLE', detail: 'Synthetic endpoint not configured', requestId: 'session-revocation-test' }) });
    });

    await page.goto(new URL('/s/shop-demo/overview', liveUrl).toString());
    try {
        await expect(page.getByText('API thật', { exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: /Chào .*cửa hàng của bạn hôm nay/ })).toBeVisible();
    }
    finally {
        releaseRevocation();
    }
    await expect(page.getByRole('heading', { name: 'Chào mừng trở lại', exact: true })).toBeVisible({ timeout: 15000 });
    await expect.poll(() => sessionReads).toBeGreaterThanOrEqual(2);
    await expect.poll(() => eventRequests).toBeGreaterThanOrEqual(1);
    expect(eventRequests).toBeLessThanOrEqual(2);
    expect(new URL(page.url()).pathname).toBe('/login');
    expect(new URL(page.url()).searchParams.get('returnTo')).toBe('/s/shop-demo/overview');
});
