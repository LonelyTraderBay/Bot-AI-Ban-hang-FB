import path from 'node:path';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

test('Shared consolidation Dashboard primary link respects all eight permission tuples and native anchor interactions', async ({ page, context }, info) => {
    await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
    await expect(page.locator('main h1')).toBeVisible();
    const fixtureUrl = '/@fs/' + path.resolve('tests/design/shared-consolidation-fixture.ts').replaceAll('\\', '/');
    const observations = [];
    for (const ops of [false, true]) for (const orders of [false, true]) for (const create of [false, true]) {
        const tuple = { ops, orders, create };
        await page.evaluate(async ({ url, tuple }) => (await import(/* @vite-ignore */ url)).installDashboardPermissions(tuple), { url: fixtureUrl, tuple });
        const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v2/session');
        await page.evaluate(() => window.dispatchEvent(new Event('online')));
        const response = await refreshed;
        expect(response.status()).toBe(200);
        const membership = (await response.json()).data.memberships.find((row: { shopId: string }) => row.shopId === 'shop-demo');
        expect(membership.permissions.includes('operations.read')).toBe(ops);
        expect(membership.permissions.includes('orders.read')).toBe(orders);
        expect(membership.permissions.includes('orders.write')).toBe(create);
        const primary = page.getByRole('link', { name: /^Xem (việc cần làm|đơn hàng)$/ });
        const createLink = page.getByRole('link', { name: 'Tạo đơn hàng', exact: true });
        await expect(primary).toHaveCount(Number(ops || orders));
        await expect(createLink).toHaveCount(Number(create));
        await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
        if (ops || orders) {
            const label = ops ? 'Xem việc cần làm' : 'Xem đơn hàng';
            const href = `/s/shop-demo/${ops ? 'operations' : 'orders'}`;
            await expect(primary).toHaveText(label);
            await expect(primary).toHaveAttribute('href', href);
            await primary.focus(); await expect(primary).toBeFocused();
            const style = await primary.evaluate(element => {
                const s = getComputedStyle(element), r = element.getBoundingClientRect();
                return { tag: element.tagName, height: r.height, outline: s.outlineStyle, outlineWidth: parseFloat(s.outlineWidth), background: s.backgroundColor };
            });
            expect(style.tag).toBe('A'); expect(style.height).toBeGreaterThanOrEqual(44);
            expect(style.outline).not.toBe('none'); expect(style.outlineWidth).toBeGreaterThanOrEqual(2);
            await primary.hover();
            await expect.poll(() => primary.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(style.background);
            if (create) { await primary.press('Tab'); await expect(createLink).toBeFocused(); }
            if (ops && orders && create) {
                const opened = context.waitForEvent('page');
                await primary.click({ modifiers: ['Control'] });
                const popup = await opened;
                await popup.waitForURL(new URL(href, demoUrl).toString()); await popup.close();
                expect(new URL(page.url()).pathname).toBe('/s/shop-demo/overview');
            }
        }
        if (create) { await expect(createLink).toHaveAttribute('href', '/s/shop-demo/orders/new'); expect((await createLink.boundingBox())!.height).toBeGreaterThanOrEqual(44); }
        observations.push({ ...tuple, primary: ops ? 'operations' : orders ? 'orders' : null, createVisible: create });
    }
    expect(observations).toHaveLength(8);
    expect((await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await info.attach('dashboard-permission-tuples', { body: JSON.stringify(observations), contentType: 'application/json' });
});

test('dashboard hierarchy, CTA targets, and page width hold across supported breakpoints', async ({ page }) => {
    await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
    await expect(page.getByRole('heading', { name: 'Tình hình hiện tại', exact: true })).toBeVisible();
    await expect(page.getByText('Dữ liệu cập nhật', { exact: false })).toBeVisible();

    for (const width of [320, 390, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.getByRole('heading', { name: 'Tình hình hiện tại', exact: true })).toBeVisible();
        await expect(page.getByText('Hội thoại đang mở', { exact: true })).toBeVisible();
        await expect(page.getByText('Đơn chờ xử lý', { exact: true })).toBeVisible();
        await expect(page.getByText('Sản phẩm gần hết', { exact: true })).toBeVisible();
        await expect(page.getByText('Trợ lý bán hàng', { exact: true })).toBeVisible();

        for (const action of [
            page.getByRole('link', { name: 'Xem việc cần làm', exact: true }),
            page.getByRole('link', { name: 'Tạo đơn hàng', exact: true }),
        ]) {
            await expect(action).toBeVisible();
            const target = await action.boundingBox();
            expect(target).not.toBeNull();
            expect(target!.height).toBeGreaterThanOrEqual(44);
        }

        const teamPanel = page.locator('.MuiPaper-outlined').filter({ has: page.getByRole('heading', { name: 'Đội ngũ AI của cửa hàng', exact: true }) }).first();
        const teamStatus = teamPanel.locator('.MuiChip-root').first();
        const statusBounds = await teamStatus.boundingBox();
        const roleCardBounds = await teamStatus.locator('xpath=..').boundingBox();
        expect(statusBounds).not.toBeNull();
        expect(roleCardBounds).not.toBeNull();
        expect(statusBounds!.width).toBeLessThan(roleCardBounds!.width / 2);

        const dimensions = await page.evaluate(() => ({
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(dimensions.clientWidth).toBe(width);
        expect(dimensions.scrollWidth).toBeLessThanOrEqual(width + 1);
    }
});
