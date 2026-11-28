import { test, expect } from '@playwright/test';
import { startDemoServer } from './demo-server.mjs';
import { setDemoControl } from './demo-controls';
import { holdRouteReads } from './read-barrier';

async function sessionRole(page: import('@playwright/test').Page) {
    return page.evaluate(async () => {
        const response = await fetch('/api/v2/session');
        if (!response.ok) throw new Error('Mock session request failed: ' + response.status);
        const { data } = await response.json();
        return data.memberships.find((membership: { shopId: string }) => membership.shopId === 'shop-demo')?.roles[0];
    });
}

test('built demo borrowers retain their owner and isolate role state between pages', async ({ browser }) => {
    const first = await startDemoServer({ runtime: 'preview' });
    const second = await startDemoServer({ runtime: 'preview' });
    if (process.env.BOTSALES_SHARED_PREVIEW_URL) expect(first.url).toBe(second.url);
    const one = await browser.newContext(), two = await browser.newContext();
    try {
        const page = await one.newPage(), other = await two.newPage();
        await page.goto(first.url + '/s/shop-demo/notifications');
        await setDemoControl(page, 'role', 'viewer');
        expect(await sessionRole(page)).toBe('viewer');
        await first.close();
        await other.goto(second.url + '/s/shop-demo/notifications');
        await expect(other.locator('main h1')).toBeVisible();
        expect(await sessionRole(other)).toBe('owner');
        expect((await other.request.get(second.url)).ok()).toBe(true);
        const scripts = await other.locator('script[src]').evaluateAll(nodes => nodes.map(node => node.getAttribute('src')));
        expect(scripts).toEqual(expect.arrayContaining([expect.stringMatching(/^\/assets\//)]));
        expect(scripts.some(src => /^\/src\//.test(src || ''))).toBe(false);
    } finally {
        await one.close(); await two.close();
        await first.close(); await second.close();
    }
});

test('read barriers hold matched requests only and preserve success and error responses after release', async ({ page }) => {
    const server = await startDemoServer({ runtime: 'preview' });
    try {
        await page.goto(server.url + '/s/shop-demo/notifications');
        await expect(page.locator('main h1')).toBeVisible();
        const barrier = await holdRouteReads(page, ['^/api/v2/shops/shop-demo/jobs/missing-job$']);
        try {
            await page.evaluate(() => {
                Object.assign(window, { barrierProbe: { status: null } });
                void fetch('/api/v2/shops/shop-demo/jobs/missing-job').then(response => {
                    (window as unknown as { barrierProbe: { status: number | null } }).barrierProbe.status = response.status;
                });
            });
            await expect.poll(barrier.entered).toBe(1);
            const unrelated = await page.evaluate(async () => (await fetch('/api/v2/session')).status);
            expect(unrelated).toBe(200);
            expect(await page.evaluate(() => (window as unknown as { barrierProbe: { status: number | null } }).barrierProbe.status)).toBeNull();
        } finally { await barrier.release(); }
        await expect.poll(() => page.evaluate(() => (window as unknown as { barrierProbe: { status: number | null } }).barrierProbe.status)).toBe(404);
        await barrier.release();
        expect(await page.evaluate(async () => (await fetch('/api/v2/session')).status)).toBe(200);
        const success = await holdRouteReads(page, ['^/api/v2/session$']);
        try {
            await page.evaluate(() => {
                (window as unknown as { barrierProbe: { status: number | null } }).barrierProbe.status = null;
                void fetch('/api/v2/session').then(response => {
                    (window as unknown as { barrierProbe: { status: number | null } }).barrierProbe.status = response.status;
                });
            });
            await expect.poll(success.entered).toBe(1);
            expect(await page.evaluate(() => (window as unknown as { barrierProbe: { status: number | null } }).barrierProbe.status)).toBeNull();
        } finally { await success.release(); }
        await expect.poll(() => page.evaluate(() => (window as unknown as { barrierProbe: { status: number | null } }).barrierProbe.status)).toBe(200);
    } finally { await server.close(); }
});
