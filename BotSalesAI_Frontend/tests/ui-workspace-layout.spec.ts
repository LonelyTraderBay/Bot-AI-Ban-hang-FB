import { expect, test } from '@playwright/test';
import { openDemoControls, waitForDemoMenu } from './session/demo-controls';
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
    { id: 'R32', path: '/s/shop-demo/settings/team', heading: 'Nhân sự & phân quyền' },
    { id: 'R33', path: '/s/shop-demo/settings/shop', heading: 'Thiết lập cửa hàng' },
    { id: 'R34', path: '/s/shop-demo/settings/audit', heading: 'Nhật ký hoạt động' },
    { id: 'R35', path: '/s/shop-demo/settings/privacy', heading: 'Quyền riêng tư & vòng đời dữ liệu' },
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
    await expect(page.getByRole('heading', { name: 'Nhật ký hoạt động' })).toBeVisible();
    await expect(page.getByText('closeShop', { exact: true }).first()).toBeVisible();
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
    await openDemoControls(page);
    await page.getByRole('combobox', { name: 'Vai trò mô phỏng' }).click();
    await waitForDemoMenu(page, 'Vai trò mô phỏng');
    await page.getByRole('option', { name: 'manager', exact: true }).click();
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
