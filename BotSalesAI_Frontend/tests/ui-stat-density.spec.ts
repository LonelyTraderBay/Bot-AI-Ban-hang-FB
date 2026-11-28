import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';
import { setDemoControl } from './session/demo-controls';

let server: Awaited<ReturnType<typeof startDemoServer>>;
test.beforeAll(async () => { server = await startDemoServer({ runtime: 'dev' }); });
test.afterAll(async () => server?.close());
test.use({ viewport: { width: 390, height: 844 } });

test('stat sizes distinguish money, unavailable data and report metadata', async ({ page }) => {
    await page.goto(server.url + '/s/shop-demo/finance');
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '20px');
    await expect(main.getByText('Tiền đã thu', { exact: true }).locator('../..').getByText('0 ₫')).toHaveCSS('font-size', '24px');
    const period = main.getByRole('heading', { name: 'Kỳ báo cáo' }).locator('xpath=ancestor::*[@data-ui-density]');
    await expect(period.getByText('Múi giờ báo cáo', { exact: true })).toHaveCSS('font-size', '14px');
    await page.goto(server.url + '/s/shop-demo/finance/profit-loss');
    const cost = main.locator('[data-ui-stat]').filter({ has: page.getByText('Giá vốn', { exact: true }) });
    const unavailable = cost.getByText('Chưa có dữ liệu', { exact: true });
    await expect(unavailable).toHaveCSS('font-size', '14px');
});

test('R37 exposes search and the first work item on the initial mobile screen', async ({ page }) => {
    await page.goto(server.url + '/s/shop-demo/operations');
    await expect(page.getByRole('textbox', { name: 'Tìm kiếm', exact: true })).toBeInViewport({ ratio: 1 });
    const work = page.getByRole('region', { name: 'Công việc vận hành' });
    await expect(work.getByRole('listitem').first()).toBeInViewport();
    await page.getByRole('button', { name: 'Chỉ xem ngoại lệ', exact: false }).click();
    await expect(page.getByRole('button', { name: 'Hiện mọi công việc', exact: false })).toHaveAttribute('aria-pressed', 'true');
});

test('R63 foldable filters preserve URL state and the first result shows before scrolling', async ({ page }) => {
    await page.goto(server.url + '/s/shop-demo/operations/exceptions');
    const filters = page.getByRole('button', { name: /^Bộ lọc/ });
    const kind = page.getByRole('combobox', { name: 'Loại công việc' });
    await expect(filters).toHaveAttribute('aria-expanded', 'false');
    await expect(kind).toBeHidden();
    const work = page.getByRole('region', { name: 'Hàng đợi công việc' });
    await expect(work.getByRole('listitem').first()).toBeInViewport();
    await filters.focus();
    await page.keyboard.press('Enter');
    await expect(filters).toHaveAttribute('aria-expanded', 'true');
    await kind.click();
    await page.getByRole('option', { name: 'Chuẩn bị đơn', exact: true }).click();
    await expect(page).toHaveURL(url => url.searchParams.get('kind') === 'prepare_order');
    await filters.click();
    await expect(filters).toHaveText('Bộ lọc (1)');
    await expect(kind).toBeHidden();
    await page.reload();
    await expect(filters).toHaveText('Bộ lọc (1)');
    await expect(kind).toBeHidden();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole('combobox', { name: 'Hạn xử lý', exact: true })).toBeVisible();
    await expect(kind).toBeHidden();
    await filters.click();
    await expect(kind).toBeVisible();
    await kind.press('Escape');
    await expect(filters).toBeFocused();
    await expect(kind).toBeHidden();
});

for (const [view, endpoint, initial, kind] of [
    ['jobs', '/jobs', 'failed', 'Loại tác vụ'],
    ['commands', '/commands', 'unknown', 'Loại thao tác'],
] as const) {
    test(`R63 ${view} keeps its own default, all selection, search and reset`, async ({ page }) => {
        const request = (status: string | null) => page.waitForResponse(response => {
            const url = new URL(response.url());
            return url.pathname.endsWith(endpoint) && url.searchParams.get('status') === status;
        }, { timeout: 30_000 });
        const defaults = request(initial);
        const url = `${server.url}/s/shop-demo/operations/exceptions?view=${view}&q=demo&cursor=old&unsupported=ignored`;
        await page.goto(url);
        const initialRequest = new URL((await defaults).url());
        expect(initialRequest.searchParams.has('unsupported')).toBe(false);
        const filters = page.getByRole('button', { name: /^Bộ lọc/ });
        await expect(filters).toHaveText('Bộ lọc (1)');
        await expect(page.getByText(/^Trạng thái:/)).toBeVisible();
        await expect(page.getByRole('combobox', { name: kind })).toBeHidden();
        await filters.click();
        await page.getByRole('combobox', { name: 'Trạng thái', exact: true }).click();
        const all = request(null);
        await page.getByRole('option', { name: 'Tất cả', exact: true }).click();
        const allRequest = new URL((await all).url());
        expect(allRequest.searchParams.get('q')).toBe('demo');
        expect(allRequest.searchParams.has('cursor')).toBe(false);
        await expect(page).toHaveURL(url => url.searchParams.get('view') === view && url.searchParams.get('status') === 'all');
        const allAfterReload = request(null);
        await page.reload();
        await allAfterReload;
        await expect(filters).toHaveText('Bộ lọc');
        await filters.click();
        const reset = request(initial);
        await page.getByRole('button', { name: 'Đặt lại bộ lọc' }).click();
        expect((await reset).status()).toBe(200);
        await expect(filters).toBeFocused();
        await expect(filters).toHaveText('Bộ lọc (1)');
        await page.setViewportSize({ width: 1440, height: 900 });
        await expect(page.getByRole('combobox', { name: 'Trạng thái', exact: true })).toBeVisible();
        await expect(page.getByRole('combobox', { name: kind })).toBeVisible();
        await expect(page.getByText(/^Trạng thái:/)).toHaveCount(0);
    });
}

test('R63 hides Jobs and Commands for roles without jobs.read', async ({ page }) => {
    await page.goto(server.url + '/s/shop-demo/operations/exceptions?view=commands');
    await expect(page.getByRole('tab', { name: 'Thao tác cần đối chiếu' })).toBeVisible();
    await setDemoControl(page, 'role', 'viewer');
    await expect(page.getByRole('heading', { name: 'Công việc cần xử lý' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Tác vụ nền' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Thao tác cần đối chiếu' })).toHaveCount(0);
});

test('R04 renders one KPI strip with accessible links and responsive columns', async ({ page }) => {
    await page.goto(server.url + '/s/shop-demo/overview');
    const strip = page.locator('[data-ui-stats-appearance="strip"]');
    const metrics = strip.locator('[data-ui-stat]');
    await expect(metrics).toHaveCount(4);
    await expect(strip.getByRole('link')).toHaveCount(3);
    await expect(strip.getByText('Theo ngưỡng tồn đã đặt')).toBeVisible();
    await expect(strip.getByText('Trợ lý bán hàng', { exact: true })).toBeVisible();
    for (const [width, count] of [[320, 1], [390, 2], [1440, 2]]) {
        await page.setViewportSize({ width, height: 900 });
        await expect.poll(() => strip.evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length)).toBe(count);
        expect(await strip.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    }
    const firstLink = strip.getByRole('link').first();
    await firstLink.focus();
    await expect(firstLink).toBeFocused();
    await firstLink.press('Enter');
    await expect(page).toHaveURL(/\/inbox$/);
});

test('R37 keeps the primary action visible and moves secondary work links into details', async ({ page }) => {
    await page.goto(server.url + '/s/shop-demo/overview');
    await expect(page.getByRole('link', { name: 'Xem việc cần làm' })).toBeVisible();
    await page.evaluate(async () => {
        const { find } = await import('/src/mocks/database.ts');
        find('workItems', 'demo-workitem-unclaimed-order', 'shop-demo').allowedActions = ['claim'];
    });
    await page.getByRole('link', { name: 'Xem việc cần làm' }).click();
    const card = page.getByRole('region', { name: 'Công việc vận hành' }).getByRole('listitem')
        .filter({ hasText: 'DEMO-ORDER-UNCLAIMED' });
    await expect(card.getByRole('button', { name: 'Tôi nhận việc' })).toBeVisible();
    await expect(card.getByText('Hạn xử lý', { exact: true })).toBeVisible();
    await expect(card.getByRole('link', { name: 'Chuẩn bị hàng' })).toBeHidden();
    const summary = card.getByText('Xem thêm thông tin', { exact: true });
    await summary.focus();
    await summary.press('Enter');
    const prepare = card.getByRole('link', { name: 'Chuẩn bị hàng' });
    await expect(prepare).toBeVisible();
    await expect(card.getByText('Vướng mắc', { exact: true })).toBeVisible();
    await expect(card.getByText(/^Được phép:/)).toBeVisible();
    await prepare.click();
    await expect(page).toHaveURL(/\/fulfillment$/);
});

for (const [route, table] of [
    ['ledger', 'Sổ cái theo chứng từ'],
    ['trial-balance', 'Cân đối phát sinh các tài khoản'],
    ['balance-sheet', 'Tài khoản của báo cáo cân đối quản trị'],
]) {
    test(`R58–R60 ${route} shows the start of the comparison table on mobile`, async ({ page }) => {
        await page.goto(server.url + '/s/shop-demo/finance/' + route);
        const region = page.getByRole('region', { name: table, exact: true });
        await expect(region.getByRole('table')).toBeInViewport();
        const heading = page.getByRole('main').getByRole('heading', { level: 1 });
        await expect(heading).toHaveCSS('font-size', '20px');
        await page.setViewportSize({ width: 320, height: 844 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    });
}
