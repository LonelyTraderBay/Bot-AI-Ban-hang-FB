import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer({ cacheIsolationKey: 'ui028-s11-panel-layout' });
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

test('the titled Fulfillment Panel owns its body inset and keeps one 16px header boundary', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const route = new URL('/s/shop-demo/shipments', demoUrl);
    const observations: Array<{ width: number; headerContentBottom: number; firstContentTop: number; gap: number; bodyPaddingTop: number; bodyPaddingInlineStart: number; bodyPaddingBottom: number; firstContentPaddingTop: number }> = [];

    for (const width of [390, 806, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route.toString());
        await expect(page).toHaveURL(route.toString());
        await expect(page.getByRole('heading', { name: 'Vận đơn & giao hàng', exact: true })).toBeVisible();
        const heading = page.getByRole('heading', { name: 'Xem trước phí & vùng giao hàng', exact: true });
        await expect(heading).toBeVisible();
        await expect(page.getByRole('combobox', { name: 'Vùng giao thử' })).toBeVisible();
        await expect(page.getByRole('combobox', { name: 'Kích cỡ kiện thử' })).toBeVisible();

        const geometry = await heading.locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]').evaluate(panel => {
            const header = [...panel.children].find(child => child.querySelector('h2'));
            const body = [...panel.children].find(child => child !== header);
            const firstContent = body?.firstElementChild;
            if (!header || !body || !firstContent) return null;
            const headerContentBottom = Math.max(...[...header.children].map(child => child.getBoundingClientRect().bottom));
            const firstContentTop = firstContent.getBoundingClientRect().top;
            const bodyStyle = getComputedStyle(body);
            const contentStyle = getComputedStyle(firstContent);
            return {
                headerContentBottom,
                firstContentTop,
                gap: firstContentTop - headerContentBottom,
                bodyPaddingTop: Number.parseFloat(bodyStyle.paddingTop),
                bodyPaddingInlineStart: Number.parseFloat(bodyStyle.paddingInlineStart),
                bodyPaddingBottom: Number.parseFloat(bodyStyle.paddingBottom),
                firstContentPaddingTop: Number.parseFloat(contentStyle.paddingTop),
            };
        });
        expect(geometry, 'Panel body and its first content must be rendered').not.toBeNull();
        observations.push({ width, ...geometry! });
    }

    await test.info().attach('fulfillment-panel-boundary.json', {
        body: JSON.stringify(observations, null, 2),
        contentType: 'application/json',
    });
    expect(observations).toHaveLength(3);
    expect(pageErrors).toEqual([]);
    const mismatches = observations.filter(item =>
        Math.abs(item.gap - 16) > 0.5 ||
        item.bodyPaddingTop !== 0 ||
        item.bodyPaddingInlineStart !== (item.width < 768 ? 16 : 24) ||
        item.bodyPaddingBottom !== (item.width < 768 ? 16 : 24) ||
        item.firstContentPaddingTop !== 0,
    );
    expect(mismatches, JSON.stringify(observations)).toEqual([]);
});
