import { expect, test } from '@playwright/test';
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
    { id: 'R01', path: '/login', heading: 'Chào mừng trở lại' },
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
