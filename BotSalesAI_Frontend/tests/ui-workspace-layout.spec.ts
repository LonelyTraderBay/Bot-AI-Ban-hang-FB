import { expect, test } from '@playwright/test';
import { setDemoControl } from './session/demo-controls';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;
let pageErrors: string[] = [];
let apiWrites: string[] = [];
let currentRouteId = '';

test.beforeEach(async ({ page }) => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
    pageErrors = [];
    apiWrites = [];
    currentRouteId = '';
    page.on('pageerror', error => pageErrors.push(`${currentRouteId}: ${error.message}`));
    page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/v2/') && request.method() !== 'GET') {
            apiWrites.push(`${currentRouteId} ${request.method()} ${url.pathname}`);
        }
    });
});

test.afterEach(async () => closeDemo?.());

const routes = [
    { id: 'R01', path: '/login', heading: 'Đăng nhập BotSales AI' },
    { id: 'R02', path: '/workspaces', heading: 'Chọn cửa hàng' },
    { id: 'R03', path: '/onboarding', heading: 'Tạo cửa hàng' },
    { id: 'R32', path: '/s/shop-demo/settings/team', heading: 'Nhân sự & quyền' },
    { id: 'R33', path: '/s/shop-demo/settings/shop', heading: 'Cửa hàng' },
    { id: 'R34', path: '/s/shop-demo/settings/audit', heading: 'Nhật ký' },
    { id: 'R35', path: '/s/shop-demo/settings/privacy', heading: 'Quyền riêng tư' },
    { id: 'R36', path: '/s/shop-demo/jobs/missing-job', heading: 'Công việc missing-job' },
];

async function openRoute(page: import('@playwright/test').Page, route: typeof routes[number]) {
    currentRouteId = route.id;
    await page.goto(new URL(route.path, demoUrl).toString(), { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: route.heading, exact: true }).first()).toBeVisible();
}

async function expectDocumentFits(page: import('@playwright/test').Page, width: number) {
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
}

async function expectDialogFits(page: import('@playwright/test').Page, width: number, height: number) {
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height + 1);
}

test('workspace routes stay within the supported page-width boundaries', async ({ page }) => {
    for (const width of [320, 390, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
        for (const route of routes) {
            await openRoute(page, route);
            await expectDocumentFits(page, width);
        }
    }
    expect(apiWrites).toEqual([]);
    expect(pageErrors).toEqual([]);
});

test('team invite and privacy request dialogs remain usable without submitting', async ({ page }) => {
    for (const { width, height } of [
        { width: 320, height: 844 },
        { width: 390, height: 844 },
        { width: 1280, height: 900 },
    ]) {
        await page.setViewportSize({ width, height });
        await openRoute(page, routes[3]);
        await page.getByRole('button', { name: 'Mời nhân viên', exact: true }).click();
        await expect(page.getByRole('dialog', { name: 'Mời nhân viên' })).toBeVisible();
        await expectDialogFits(page, width, height);
        await page.keyboard.press('Escape');

        await openRoute(page, routes[6]);
        await page.getByRole('button', { name: 'Tạo yêu cầu', exact: true }).click();
        await expect(page.getByRole('dialog', { name: 'Yêu cầu dữ liệu cá nhân' })).toBeVisible();
        await expectDialogFits(page, width, height);
        await page.keyboard.press('Escape');
    }
    expect(apiWrites).toEqual([]);
    expect(pageErrors).toEqual([]);
});

test('shop closure preserves history and settings across both workspace lists', async ({ page }) => {
    await openRoute(page, routes[2]);
    await page.getByRole('textbox', { name: 'Tên cửa hàng' }).fill('Shop lưu trữ');
    await page.getByRole('button', { name: 'Tạo cửa hàng' }).click();
    await expect(page).toHaveURL(/\/s\/shop-\d+\/overview/);
    const shopId = new URL(page.url()).pathname.split('/')[2];
    const settings = page.locator('a[href="/s/' + shopId + '/settings/shop"]').first();
    await settings.click();
    const close = page.getByRole('button', { name: 'Đóng cửa hàng', exact: true });
    await close.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Đóng cửa hàng' });
    await expect(dialog).toContainText('Shop lưu trữ');
    await page.keyboard.press('Escape');
    await expect(close).toBeFocused();
    await close.click();
    await dialog.getByRole('button', { name: 'Đóng cửa hàng', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Tên cửa hàng' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Mở lại cửa hàng' })).toBeVisible();
    await page.locator('header a[href="/workspaces"]').click();
    await expect(page.getByRole('heading', { name: 'Joker Studio · Shop mẫu' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Shop lưu trữ' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Đã đóng', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Shop lưu trữ' })).toBeVisible();
    await page.getByRole('link', { name: 'Xem cửa hàng' }).click();
    await page.locator('a[href="/s/' + shopId + '/settings/audit"]').first().click();
    await expect(page.getByRole('heading', { name: 'Nhật ký' })).toBeVisible();
    await expect(page.getByText('closeShop', { exact: true }).first()).toBeVisible();
    await page.locator('a[href="/s/' + shopId + '/reports"]').first().click();
    await expect(page.getByRole('button', { name: 'Tạo tệp báo cáo CSV' })).toBeDisabled();
    await expect(page.getByText('Vai trò hiện tại không có quyền reports.export.')).toHaveCount(0);
    await settings.click();
    await page.getByRole('button', { name: 'Mở lại cửa hàng' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Mở lại cửa hàng' }).click();
    await expect(close).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Tên cửa hàng' })).toBeEnabled();
    await page.locator('header a[href="/workspaces"]').click();
    await expect(page.getByRole('heading', { name: 'Shop lưu trữ' })).toBeVisible();
    expect(pageErrors).toEqual([]);
});

test('shop closure lists blockers in the dialog and restricts controls to owners', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openRoute(page, routes[4]);
    await page.getByRole('button', { name: 'Đóng cửa hàng', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Đóng cửa hàng' });
    await expectDialogFits(page, 390, 844);
    await dialog.getByRole('button', { name: 'Đóng cửa hàng', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText(/đối soát/i);
    await expect(dialog.getByRole('alert')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await setDemoControl(page, 'role', 'manager');
    await expect(page.getByRole('button', { name: 'Đóng cửa hàng', exact: true })).toHaveCount(0);
    expect(pageErrors).toEqual([]);
});

test('shop closure reconciles version conflicts and writes from a stale tab', async ({ page }) => {
    // The tab misses live events while another session changes its shop.
    await page.addInitScript(() => Object.defineProperty(window, 'EventSource', { value: class { close() {} } }));
    await openRoute(page, routes[2]);
    await page.getByRole('textbox', { name: 'Tên cửa hàng' }).fill('Cửa hàng kiểm phiên bản');
    await page.getByRole('button', { name: 'Tạo cửa hàng' }).click();
    await expect(page).toHaveURL(/\/s\/shop-\d+\/overview/);
    const shopId = new URL(page.url()).pathname.split('/')[2];
    await page.locator('a[href="/s/' + shopId + '/settings/shop"]').first().click();
    await page.getByRole('button', { name: 'Đóng cửa hàng', exact: true }).click();
    const externalChange = (close: boolean, version: number) => page.evaluate(async ({ shopId, close, version }) => {
        const { data: { csrfToken } } = await (await fetch('/api/v2/session')).json();
        const response = await fetch('/api/v2/shops/' + shopId + (close ? '/close' : ''), {
            method: close ? 'POST' : 'PATCH',
            headers: { 'X-CSRF-Token': csrfToken, 'Idempotency-Key': crypto.randomUUID(), 'If-Match': '"' + version + '"',
                ...(!close ? { 'Content-Type': 'application/json' } : {}) },
            body: close ? undefined : JSON.stringify({ name: 'Tên phiên mới' }),
        });
        return { status: response.status, etag: response.headers.get('ETag') };
    }, { shopId, close, version });
    expect(await externalChange(false, 1)).toEqual({ status: 200, etag: '"2"' });
    const dialog = page.getByRole('dialog', { name: 'Đóng cửa hàng' });
    await dialog.getByRole('button', { name: 'Đóng cửa hàng', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Dữ liệu đã đổi');
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    const name = page.getByRole('textbox', { name: 'Tên cửa hàng' });
    await expect(name).toHaveValue('Tên phiên mới');
    await name.fill('Bản sửa từ tab cũ');
    expect(await externalChange(true, 2)).toEqual({ status: 200, etag: '"3"' });
    await page.getByRole('button', { name: 'Lưu cấu hình' }).click();
    await expect(name).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Mở lại cửa hàng' })).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'Cửa hàng đã đóng' }).first()).toBeVisible();
    expect(pageErrors).toEqual([]);
});

async function openFreshShop(page: import('@playwright/test').Page) {
    await openRoute(page, routes[2]);
    await page.getByRole('textbox', { name: 'Tên cửa hàng' }).fill('Shop thử đồng bộ');
    await page.getByRole('button', { name: 'Tạo cửa hàng' }).click();
    await expect(page).toHaveURL(/\/s\/shop-\d+\/overview/);
    return new URL(page.url()).pathname.split('/')[2];
}

function changeShop(page: import('@playwright/test').Page, shopId: string, suffix: string, method: string, version: number, body?: object) {
    return page.evaluate(async args => {
        const { data: { csrfToken } } = await (await fetch('/api/v2/session')).json();
        return (await fetch('/api/v2/shops/' + args.shopId + args.suffix, {
            method: args.method, headers: { 'X-CSRF-Token': csrfToken, 'Idempotency-Key': crypto.randomUUID(),
                'If-Match': '"' + args.version + '"', ...(args.body ? { 'Content-Type': 'application/json' } : {}) },
            body: JSON.stringify(args.body),
        })).status;
    }, { shopId, suffix, method, version, body });
}

test('shop closure refreshes a visible read-only tab and locks shipping fees until reopen', async ({ page }) => {
    await page.clock.install();
    await page.addInitScript(() => Object.defineProperty(window, 'EventSource', { value: class { close() {} } }));
    const shopId = await openFreshShop(page);
    expect(await changeShop(page, shopId, '/shipping-policy', 'PUT', 1, { rules: [{ countryCode: 'VN', province: 'Hà Nội', serviceName: 'Giao thường', amount: '20000' }] })).toBe(200);
    await page.locator('a[href="/s/' + shopId + '/settings/shipping"]').first().click();
    const edit = page.getByRole('button', { name: 'Sửa vùng', exact: true });
    const remove = page.getByRole('button', { name: 'Gỡ vùng', exact: true });
    await remove.click();
    await expect(page.getByRole('dialog', { name: 'Gỡ vùng giao' })).toBeVisible();
    expect(await changeShop(page, shopId, '/close', 'POST', 1)).toBe(200);
    await page.clock.fastForward(31_000);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(edit).toBeDisabled();
    await expect(remove).toBeDisabled();
    await expect(page.getByRole('cell', { name: 'Giao thường', exact: true })).toBeVisible();
    expect(await changeShop(page, shopId, '/reopen', 'POST', 2)).toBe(200);
    await page.clock.fastForward(31_000);
    await expect(edit).toBeEnabled();
    await edit.click();
    const editor = page.getByRole('dialog', { name: 'Sửa vùng giao' });
    const service = editor.getByRole('textbox', { name: 'Tên dịch vụ' });
    await service.fill('Tên dịch vụ đang sửa');
    expect(await changeShop(page, shopId, '/close', 'POST', 3)).toBe(200);
    await page.clock.fastForward(31_000);
    await expect(service).toBeDisabled();
    await expect(service).toHaveValue('Tên dịch vụ đang sửa');
    await expect(editor.getByRole('button', { name: 'Lưu vùng giao' })).toBeDisabled();
    expect(apiWrites.filter(line => /PUT .*shipping-policy$/.test(line))).toHaveLength(1);
});

test('shop closure refreshes the filtered workspace list while it is visible', async ({ page }) => {
    await page.clock.install();
    const shopId = await openFreshShop(page);
    await page.locator('header a[href="/workspaces"]').click();
    const listing = page.getByRole('heading', { name: 'Shop thử đồng bộ' });
    await expect(listing).toBeVisible();
    expect(await changeShop(page, shopId, '/close', 'POST', 1)).toBe(200);
    await page.clock.fastForward(31_000);
    await expect(listing).toHaveCount(0);
});

test('shop closure recovers a lost demo receipt without a second change', async ({ page }) => {
    const shopId = await openFreshShop(page);
    await page.locator('a[href="/s/' + shopId + '/settings/shop"]').first().click();
    await setDemoControl(page, 'fault', 'unknown');
    await page.getByRole('button', { name: 'Đóng cửa hàng', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Đóng cửa hàng' });
    await dialog.getByRole('button', { name: 'Đóng cửa hàng', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Chưa xác minh');
    await dialog.getByRole('button', { name: 'Hủy' }).click();
    const recovery = page.getByRole('button', { name: 'Kiểm tra trạng thái lệnh' });
    await expect(recovery).toBeEnabled();
    await recovery.click();
    await expect(recovery).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mở lại cửa hàng' })).toBeVisible();
    expect(apiWrites.filter(line => line.endsWith('/' + shopId + '/close'))).toHaveLength(1);
    const counts = await page.evaluate(async id => {
        const shop = (await (await fetch('/api/v2/shops/' + id)).json()).data;
        const commands = (await (await fetch('/api/v2/shops/' + id + '/commands?kind=closeShop')).json()).data;
        return { version: shop.version, count: commands.length };
    }, shopId);
    expect(counts).toEqual({ version: 2, count: 1 });
});

test('shop closure keeps a draft through a transient shop refresh and hides it after access loss', async ({ page }) => {
    await page.clock.install();
    await openRoute(page, routes[4]);
    const name = page.getByRole('textbox', { name: 'Tên cửa hàng' });
    const draft = 'Tên đang sửa trên tab';
    await name.fill(draft);
    const failNextPoll = async (status: number) => {
        await page.evaluate(status => {
            const original = window.fetch.bind(window);
            window.fetch = (input, init) => {
                const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
                if (url.pathname !== '/api/v2/shops/shop-demo' || init?.method !== 'GET') return original(input, init);
                window.fetch = original;
                return Promise.resolve(Response.json({ type: 'about:blank', title: 'Lỗi tải shop', status, code: 'HTTP_ERROR',
                    detail: 'Lỗi tải shop ' + status, requestId: 'shop-refresh-test' }, { status }));
            };
        }, status);
        await page.clock.fastForward(21_000);
    };
    await failNextPoll(503);
    await expect(name).toHaveValue(draft);
    const warning = page.getByRole('status').filter({ hasText: 'Chưa cập nhật được trạng thái cửa hàng' });
    await expect(warning).toBeVisible();
    await page.clock.fastForward(21_000);
    await expect(warning).toHaveCount(0);
    await expect(name).toHaveValue(draft);
    await failNextPoll(404);
    await expect(name).toHaveCount(0);
    await expect(page.getByRole('alert')).toContainText('404');
    await failNextPoll(503);
    await expect(page.getByRole('alert')).toContainText('503');
    await expect(name).toHaveCount(0);
});
