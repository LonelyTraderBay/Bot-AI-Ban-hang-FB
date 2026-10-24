import { test, expect } from '@playwright/test';
import { startDemoServer } from './demo-server.mjs';

test('borrowed demo servers retain their owner and isolate mock state by page', async ({ browser }) => {
    const first = await startDemoServer();
    const second = await startDemoServer();
    expect(first.url).toBe(process.env.BOTSALES_SHARED_DEMO_URL);
    expect(second.url).toBe(first.url);
    const one = await browser.newContext();
    const two = await browser.newContext();
    try {
        const page = await one.newPage();
        const other = await two.newPage();
        await page.goto(first.url + '/s/shop-demo/notifications');
        await expect(page.locator('main')).toBeVisible();
        const changed = await page.evaluate(async () => { const mock = await import('/src/mocks/service.ts'); mock.setRole('viewer'); return mock.currentSession(); });
        expect(changed).toMatchObject({ memberships: expect.arrayContaining([expect.objectContaining({ roles: ['viewer'] })]) });
        await first.close();
        await other.goto(second.url + '/s/shop-demo/notifications');
        await expect(other.locator('main')).toBeVisible();
        const role = await other.evaluate(async () => { const mock = await import('/src/mocks/service.ts'); return mock.currentSession(); });
        expect(role).toMatchObject({ memberships: expect.arrayContaining([expect.objectContaining({ roles: ['owner'] })]) });
        expect((await other.request.get(second.url)).ok()).toBe(true);
    } finally {
        await one.close();
        await two.close();
        await second.close();
    }
});
