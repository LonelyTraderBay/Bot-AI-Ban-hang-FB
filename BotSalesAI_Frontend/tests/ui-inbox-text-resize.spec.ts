import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';
let url = '';
let close: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer({ cacheIsolationKey: 'inbox-resize' }); url = server.url; close = server.close; });
test.afterAll(async () => close?.());

test('conversation names and message previews wrap at enlarged text sizes', async ({ page }) => {
    for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${url}/s/shop-demo/inbox${width > 900 ? '/cv1' : ''}`);
        const first = page.getByRole('link', { name: /Linh \(khách mẫu\)/ }).first();
        await expect(first).toBeVisible();
        await page.addStyleTag({ content: 'main .MuiListItemButton-root p { font-size: 28px !important; }' });
        const text = first.locator('p');
        await expect(text).toHaveCount(2);
        for (const element of await text.all()) {
            const size = await element.evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth, whiteSpace: getComputedStyle(node).whiteSpace }));
            expect(size.whiteSpace).not.toBe('nowrap');
            expect(size.scroll).toBeLessThanOrEqual(size.client + 1);
        }
        await first.focus();
        await expect(first).toBeFocused();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
});
