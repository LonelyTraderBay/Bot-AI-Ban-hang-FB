import { test, expect } from '@playwright/test';
import { startDemoServer } from './demo-server.mjs';
import { openDemoControls } from './demo-controls';
import { holdRouteReads } from './read-barrier';

test('built demo borrowers retain their owner and isolate role state between pages', async ({ browser }) => {
    const first = await startDemoServer({ runtime: 'preview' });
    const second = await startDemoServer({ runtime: 'preview' });
    if (process.env.BOTSALES_SHARED_PREVIEW_URL) expect(first.url).toBe(second.url);
    const one = await browser.newContext(), two = await browser.newContext();
    try {
        const page = await one.newPage(), other = await two.newPage();
        await page.goto(first.url + '/s/shop-demo/notifications');
        await openDemoControls(page);
        await page.getByRole('combobox', { name: 'Vai trò mô phỏng' }).click();
        await page.getByRole('option', { name: 'viewer', exact: true }).click();
        await expect(page.getByRole('status').filter({ hasText: 'Vai trò mô phỏng đã được áp dụng.' })).toBeVisible();
        await first.close();
        await other.goto(second.url + '/s/shop-demo/notifications');
        await openDemoControls(other);
        await expect(other.getByRole('combobox', { name: 'Vai trò mô phỏng' })).toHaveText('owner');
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
