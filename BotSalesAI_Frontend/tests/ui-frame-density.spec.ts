import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let server: Awaited<ReturnType<typeof startDemoServer>>;
test.beforeAll(async () => { server = await startDemoServer(); });
test.afterAll(async () => server?.close());

test('independent desktop panels follow their own content height', async ({ page }) => {
    const cases = [
        ['reports/marketing', 'Câu hỏi khách thường hỏi'],
        ['bot/playground', 'Kết quả có nguồn'],
        ['settings/privacy', 'Yêu cầu của khách'],
        ['operations/digests', 'Bản tin điều hành'],
    ];
    const evidence = [];
    for (const width of [1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        for (const [route, title] of cases) {
            await page.goto(server.url + '/s/shop-demo/' + route);
            const panel = page.getByRole('heading', { name: title, exact: true }).locator('xpath=ancestor::*[@data-ui-density][1]');
            await expect(panel).toBeVisible();
            await expect.poll(() => panel.evaluate(el => getComputedStyle(el.parentElement!).alignItems)).toBe('start');
            const geometry = await panel.evaluate(el => {
                const height = el.getBoundingClientRect().height;
                const previous = el.style.alignSelf;
                el.style.alignSelf = 'start';
                const natural = el.getBoundingClientRect().height;
                el.style.alignSelf = previous;
                return { height, natural };
            });
            expect(Math.abs(geometry.height - geometry.natural), title).toBeLessThanOrEqual(2);
            evidence.push({ width, route, ...geometry });
        }
    }
    await test.info().attach('panels.json', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

for (const [route, title, baseline] of [
    ['orders', 'Danh sách đơn hàng', 307],
    ['operations', 'Công việc vận hành', 322],
] as const) {
    test(`mobile cards are at least ten percent shorter on ${route}`, async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(server.url + '/s/shop-demo/' + route);
        const cards = page.getByRole('region', { name: title, exact: true }).getByRole('listitem');
        await expect(cards.first()).toBeVisible();
        const heights = await cards.evaluateAll(nodes => nodes.map(el => el.getBoundingClientRect().height).sort((a, b) => a - b));
        const median = heights[Math.floor(heights.length / 2)];
        expect(median).toBeLessThanOrEqual(baseline * 0.9);
        const summary = cards.first().locator('summary');
        await summary.focus();
        await page.keyboard.press('Enter');
        await expect(cards.first().locator('details')).toHaveAttribute('open', '');
        expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await page.setViewportSize({ width: 320, height: 844 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
        await test.info().attach('mobile-card-median.json', { body: JSON.stringify({ route, median, baseline, heights }), contentType: 'application/json' });
    });
}

test('R09 mobile filter disclosure keeps URL selection when collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(server.url + '/s/shop-demo/products?status=draft');
    const filters = page.getByRole('button', { name: 'Bộ lọc (1)', exact: true });
    const status = page.getByRole('combobox', { name: 'Trạng thái', exact: true });
    await expect(filters).toHaveAttribute('aria-expanded', 'false');
    await expect(status).toBeHidden();
    await filters.press('Enter');
    await expect(status).toBeVisible();
    await status.click();
    await page.getByRole('option', { name: 'Đang bán', exact: true }).click();
    await expect(page).toHaveURL(url => url.searchParams.get('status') === 'active');
    await filters.click();
    await expect(filters).toHaveAttribute('aria-expanded', 'false');
    await page.reload();
    await expect(filters).toHaveAttribute('aria-expanded', 'false');
    await expect(status).toBeHidden();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(filters).toBeHidden();
    await expect(status).toBeVisible();
    await expect(status).toContainText('Đang bán');
});

test('compact KPI grids use the available tracks and reduce mobile height', async ({ page }) => {
    const evidence = [];
    for (const [route, baseline] of [['overview', 408], ['finance', 310], ['finance/profit-loss', 382], ['reports/marketing', 463]] as const) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(server.url + '/s/shop-demo/' + route);
        const grid = page.locator('main [data-ui-stats]');
        await expect(grid).toHaveAttribute('data-ui-stats', 'compact');
        const stats = await grid.evaluate(el => ({ height: el.getBoundingClientRect().height, columns: new Set([...el.children].map(card => card.getBoundingClientRect().x)).size }));
        expect(stats.height, route).toBeLessThanOrEqual(baseline * 0.8);
        expect(stats.columns, route).toBe(2);
        evidence.push({ route, baseline, ...stats });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(server.url + '/s/shop-demo/finance');
    const grid = page.locator('main [data-ui-stats]');
    await expect(grid.locator('[data-ui-stat]')).toHaveCount(3);
    const layout = await grid.evaluate(el => {
        const right = el.lastElementChild!.getBoundingClientRect().right;
        return { leftover: el.getBoundingClientRect().right - right };
    });
    expect(layout.leftover).toBeLessThanOrEqual(1);
    await test.info().attach('kpi-density.json', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('standalone forms and transaction forms have bounded surfaces', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    for (const [route, title, limit] of [
        ['products/new', 'Thông tin bán hàng', 1024],
        ['products/p1', 'Thông tin bán hàng', 1024],
        ['orders/new', 'Khách hàng', 1024],
        ['imports', 'Tệp & ánh xạ', 896],
        ['settings/shop', 'Thông tin cơ sở', 896],
    ] as const) {
        await page.goto(server.url + '/s/shop-demo/' + route);
        const panel = page.getByRole('heading', { name: title, exact: true }).locator('xpath=ancestor::*[@data-ui-density][1]');
        await expect(panel).toBeVisible();
        expect((await panel.boundingBox())!.width, route).toBeLessThanOrEqual(limit + 1);
    }
});

test('short category and warehouse dialogs use compact width and retain draft focus', async ({ page }) => {
    for (const [route, label] of [['categories', 'Thêm danh mục'], ['settings/warehouses', 'Thêm kho']] as const) {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(server.url + '/s/shop-demo/' + route);
        const opener = page.getByRole('button', { name: label, exact: true });
        await opener.click();
        const dialog = page.getByRole('dialog', { name: label, exact: true });
        await expect(dialog).toBeVisible();
        expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(577);
        await page.setViewportSize({ width: 320, height: 568 });
        await expect.poll(async () => (await dialog.boundingBox())!.width).toBeLessThanOrEqual(320);
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(opener).toBeFocused();
    }
});
