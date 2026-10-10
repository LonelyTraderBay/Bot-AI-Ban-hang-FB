import { openDemoControls } from './session/demo-controls';
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { startDemoServer, startLiveServer } from './session/demo-server.mjs';

type RouteManifest = { routes: Array<{ id: string; path: string }> };
const routes = JSON.parse(readFileSync(new URL('../packages/contracts/src/routes.json', import.meta.url), 'utf8')) as RouteManifest;
const detailIds: Record<string, string> = {
    conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001',
    knowledgeId: 'k1', jobId: 'missing-job',
};
let demoUrl = '';
let liveUrl = '';
let stopDemoServer: (() => Promise<void>) | undefined;
let stopLiveServer: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    stopDemoServer = server.close;
    const liveServer = await startLiveServer();
    liveUrl = liveServer.url;
    stopLiveServer = liveServer.close;
});

test.afterAll(async () => {
    await stopDemoServer?.();
    await stopLiveServer?.();
});

async function gotoDemo(page: import('@playwright/test').Page, path: string) {
    await page.goto(new URL(path, demoUrl).toString());
}

async function chooseMockOption(page: import('@playwright/test').Page, label: string, value: string) {
    if (['Vai trò mô phỏng', 'Trạng thái thử', 'Dataset mô phỏng'].includes(label)) await openDemoControls(page);
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
}

test('catalog create uses the HTTP mock and successful save clears the draft guard', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/products');
    await expect(page.getByRole('heading', { name: 'Sản phẩm', exact: true })).toBeVisible();
    await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Thêm sản phẩm', exact: true }).click();
    await page.getByLabel('Tên sản phẩm', { exact: true }).fill('Sản phẩm kiểm thử');
    await page.getByLabel('SKU', { exact: true }).fill('TEST-001');
    await page.getByLabel(/Giá bán/).fill('150000');
    const createResponse = page.waitForResponse(response => response.request().method() === 'POST'
        && new URL(response.url()).pathname === '/api/v2/shops/shop-demo/products');
    await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
    const created = await createResponse;
    expect(created.status()).toBe(201);
    const createdProduct = (await created.json()).data as { id: string; name: string };
    expect(createdProduct.name).toBe('Sản phẩm kiểm thử');

    await expect(page).toHaveURL(/\/products\/product-/);
    await expect(page).toHaveTitle('Chi tiết sản phẩm · BotSales AI');
    await expect(page.locator('main#main-content')).toBeFocused();
    await expect(page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?' })).toHaveCount(0);
    const listResponse = page.waitForResponse(response => response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/v2/shops/shop-demo/products');
    await page.getByRole('link', { name: 'Danh sách', exact: true }).click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?' })).toHaveCount(0);
    const listed = await listResponse;
    expect(listed.status()).toBe(200);
    expect((await listed.json()).data).toContainEqual(expect.objectContaining(createdProduct));
    await expect(page.getByText('Sản phẩm kiểm thử', { exact: true })).toBeVisible();
});

test('dirty drafts block in-app navigation and preserve input until the user decides', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/products/new');
    const name = page.getByLabel('Tên sản phẩm', { exact: true });
    await name.fill('Bản nháp chưa lưu');
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Danh mục' }).click();

    const dialog = page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }).click();
    await expect(name).toHaveValue('Bản nháp chưa lưu');

    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Danh mục' }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Rời màn hình' }).click();
    await expect(page).toHaveURL(/\/categories$/);
    await expect(page.getByRole('heading', { name: 'Danh mục', exact: true })).toBeVisible();
});

test('all canonical routes render inside the real React demo application', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of routes.routes) {
        const path = route.path
            .replace(':shopId', 'shop-demo')
            .replace(/:([A-Za-z]+)/g, (_, key: string) => detailIds[key] || 'missing');
        await gotoDemo(page, path);
        if (route.path.startsWith('/s/')) {
            const main = page.locator('main#main-content');
            await expect(main, `${route.id} should mount the shop-scoped page`).toBeVisible();
            await expect(main.getByRole('heading').first(), `${route.id} should render page content`).toBeVisible();
            await expect(main.getByRole('heading', { name: 'Không thể mở màn hình', exact: true }), `${route.id} should not fall through to the router error boundary`).toHaveCount(0);
            await expect(page.getByText('Dữ liệu mô phỏng', { exact: true }), `${route.id} should disclose the synthetic data source`).toBeVisible();
        } else {
            const heading = page.getByRole('heading').first();
            await expect(heading, `${route.id} should render its public page content`).toBeVisible();
            await expect(page.getByRole('heading', { name: 'Không thể mở màn hình', exact: true })).toHaveCount(0);
            await expect(page.getByRole('heading', { name: 'Không tìm thấy trang', exact: true })).toHaveCount(0);
        }
        await expect(page.getByText('Chưa khởi động được ứng dụng', { exact: true })).toHaveCount(0);
    }
    expect(errors).toEqual([]);
});

test('switching shops cancels a delayed request and loads only the new shop scope', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/overview');
    await chooseMockOption(page, 'Trạng thái thử', 'Tải chậm');
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Sản phẩm' }).click();
    await expect(page).toHaveURL(/\/shop-demo\/products$/);
    await page.getByRole('link', { name: /Joker Studio/ }).click();
    await expect(page.getByRole('heading', { name: 'Chọn cửa hàng', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Mở cửa hàng' }).nth(1).click();
    await expect(page).toHaveURL(/\/s\/shop-second\/overview$/);
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Sản phẩm' }).click();

    const firstProduct = page.getByRole('link', { name: 'Chi tiết' }).first();
    await expect(firstProduct).toHaveAttribute('href', '/s/shop-second/products/b-p1');
    await page.waitForTimeout(1600);
    await expect(firstProduct).toHaveAttribute('href', '/s/shop-second/products/b-p1');
    await expect(page.locator('a[href="/s/shop-demo/products/p1"]')).toHaveCount(0);
});

test('role changes remove restricted navigation and the route guard explains denied access', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/overview');
    await chooseMockOption(page, 'Vai trò mô phỏng', 'viewer');
    await expect(page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Lợi nhuận' })).toHaveCount(0);

    await page.evaluate(() => {
        window.history.pushState({}, '', '/s/shop-demo/finance/profit-loss');
        window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    });
    await expect(page.getByText(/Bạn không có quyền truy cập màn hình này trong/)).toBeVisible();
    await expect(page.getByText(/Việc kiểm quyền thực thi vẫn thuộc backend/)).toBeVisible();
});

test('deep links survive browser refresh and logout clears the mock session', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/orders/DH-DEMO-PAID-01');
    await expect(page.getByRole('heading', { name: 'Đơn DH-DEMO-PAID-01' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Đơn DH-DEMO-PAID-01' })).toBeVisible();

    const logoutResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v2/auth/logout');
    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    expect((await logoutResponse).status()).toBe(204);
    await expect(page.getByRole('heading', { name: 'Chào mừng trở lại' })).toBeVisible();
    await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toHaveCount(0);
});

test('logout asks before discarding a draft and retains the session when logout fails', async ({ browser }) => {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    try {
        const page = await context.newPage();
        const seed = JSON.parse(readFileSync(new URL('../apps/web/src/mocks/seed.json', import.meta.url), 'utf8'));
        const membership = seed.members.find((item: { shopId: string; userId: string }) => item.shopId === 'shop-demo' && item.userId === 'user-demo');
        const shop = seed.shops.find((item: { id: string }) => item.id === 'shop-demo');
        const session = {
            user: { id: 'user-demo', displayName: 'Tài khoản kiểm thử', email: 'owner@example.test' },
            csrfToken: 'test-only-token-1', expiresAt: '2030-12-31T23:59:59Z', memberships: [membership],
        };
        const envelope = (data: unknown, pageInfo?: object) => JSON.stringify({ data, meta: { requestId: 'logout-test', asOf: '2026-09-30T00:00:00Z' }, ...(pageInfo ? { page: pageInfo } : {}) });
        await page.route(`${liveUrl}/api/v2/**`, async route => {
            const request = route.request();
            const pathname = new URL(request.url()).pathname;
            if (pathname === '/api/v2/session' && request.method() === 'GET')
                return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(session) });
            if (pathname === '/api/v2/session/logout' && request.method() === 'POST') {
                return route.fulfill({
                    status: 503,
                    contentType: 'application/problem+json',
                    body: JSON.stringify({ type: 'about:blank', title: 'Unavailable', status: 503, code: 'TEST_UNAVAILABLE', detail: 'Synthetic logout failure', requestId: 'logout-test' }),
                });
            }
            if (pathname === '/api/v2/shops/shop-demo' && request.method() === 'GET')
                return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(shop) });
            if (pathname === '/api/v2/shops/shop-demo/categories' && request.method() === 'GET')
                return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(seed.categories, { limit: 100, total: seed.categories.length, hasMore: false, nextCursor: null }) });
            if (pathname === '/api/v2/shops/shop-demo/events')
                return route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': test connection\n\n' });
            return route.fulfill({ status: 503, contentType: 'application/problem+json', body: JSON.stringify({ type: 'about:blank', title: 'Unavailable', status: 503, code: 'TEST_UNAVAILABLE', detail: 'Synthetic endpoint not configured', requestId: 'logout-test' }) });
        });

        await page.goto(new URL('/s/shop-demo/products/new', liveUrl).toString());
        const name = page.getByLabel('Tên sản phẩm', { exact: true });
        await name.fill('Bản nháp trước khi đăng xuất');
        const dialog = page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?' });

        await page.getByRole('button', { name: 'Đăng xuất' }).click();
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }).click();
        await expect(name).toHaveValue('Bản nháp trước khi đăng xuất');

        await page.getByRole('button', { name: 'Đăng xuất' }).click();
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Rời màn hình' }).click();
        await expect(page.getByRole('alert').filter({ hasText: 'Chưa xác minh được đăng xuất' })).toBeVisible();
        await expect(name).toHaveValue('Bản nháp trước khi đăng xuất');
        await expect(page.getByText('API thật', { exact: true })).toBeVisible();

        await expect(dialog).toHaveCount(0);
        await expect(page).toHaveURL(/\/s\/shop-demo\/products\/new$/);
    } finally {
        await context.close();
    }
});

test('mobile navigation opens, routes, and closes without viewport overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoDemo(page, '/s/shop-demo/overview');
    await page.getByRole('button', { name: 'Mở menu' }).click();
    const productLink = page.getByRole('link', { name: 'Sản phẩm' }).filter({ visible: true });
    await expect(productLink).toBeVisible();
    await productLink.click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole('heading', { name: 'Sản phẩm', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mở menu' })).toBeVisible();
    const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
});

test('chunk loading errors use the route recovery boundary', async ({ browser }) => {
    test.setTimeout(30_000);
    const context = await browser.newContext({ serviceWorkers: 'block' });
    try {
        const page = await context.newPage();
        const seed = JSON.parse(readFileSync(new URL('../apps/web/src/mocks/seed.json', import.meta.url), 'utf8'));
        const membership = seed.members.find((item: { shopId: string; userId: string }) => item.shopId === 'shop-demo' && item.userId === 'user-demo');
        const session = {
            user: { id: 'user-demo', displayName: 'Tài khoản kiểm thử', email: 'owner@example.test' },
            csrfToken: 'test-only-token-1', expiresAt: '2030-12-31T23:59:59Z', memberships: [membership],
        };
        const envelope = (data: unknown) => JSON.stringify({ data, meta: { requestId: 'test-request', asOf: '2026-09-30T00:00:00Z' } });
        await page.route(`${liveUrl}/api/v2/**`, async route => {
            const pathname = new URL(route.request().url()).pathname;
            if (pathname === '/api/v2/session')
                return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(session) });
            if (pathname === '/api/v2/shops/shop-demo')
                return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(seed.shops.find((shop: { id: string }) => shop.id === 'shop-demo')) });
            if (pathname.endsWith('/events'))
                return route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': test connection\n\n' });
            return route.fulfill({ status: 503, contentType: 'application/problem+json', body: JSON.stringify({ type: 'about:blank', title: 'Unavailable', status: 503, code: 'TEST_UNAVAILABLE', detail: 'Synthetic route-test fixture', requestId: 'test-request' }) });
        });
        let failedChunks = 0;
        await page.route(url => url.href.includes('/src/modules/notifications/'), route => {
            failedChunks += 1;
            return route.abort();
        });
        await page.goto(new URL('/s/shop-demo/overview', liveUrl).toString());
        await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Trung tâm thông báo' }).click();
        await expect(page).toHaveURL(/\/notifications$/);
        await expect(page.getByRole('heading', { name: 'Không thể mở màn hình' })).toBeVisible();
        await expect(page.locator('main#main-content')).toHaveCount(1);
        expect(failedChunks).toBeGreaterThan(0);
        await expect(page.getByText(/Bản nháp chưa gửi không được coi là đã lưu/)).toBeVisible();
    } finally {
        await context.close();
    }
});

test('live mode reports an unavailable session API without enabling mock data', async ({ page }) => {
    await page.goto(new URL('/s/shop-demo/overview', liveUrl).toString());
    await expect(page.getByRole('alert').filter({ hasText: 'Không thể kết nối API phiên đăng nhập' })).toBeVisible();
    await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/không tự chuyển sang dữ liệu mô phỏng/)).toBeVisible();
});
