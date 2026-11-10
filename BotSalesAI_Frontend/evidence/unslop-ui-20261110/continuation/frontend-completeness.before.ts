import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { startDemoServer } from './session/demo-server.mjs';

let url = '';
let close: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer({ cacheIsolationKey: 'frontend-completeness' }); url = server.url; close = server.close; });
test.afterAll(async () => close?.());

const details = [
    { id: 'R26', path: '/bot', heading: 'Điều khiển Admin AI', api: '/bot/revisions/', button: 'Xem phiên bản', title: 'Chi tiết phiên bản AI', field: 'instructions' },
    { id: 'R28', path: '/bot/evaluations', heading: 'Đánh giá AI', api: '/bot/evaluations/', button: '', title: 'Chi tiết đánh giá', field: 'datasetVersion' },
    { id: 'R29', path: '/integrations/channels', heading: 'Kết nối Facebook', api: '/integrations/channels/', button: 'Chi tiết kết nối', title: 'Chi tiết kết nối Facebook', field: 'name' },
    { id: 'R30', path: '/integrations/ai', heading: 'Nhà cung cấp AI', api: '/integrations/ai/', button: 'Chi tiết kết nối', title: 'Chi tiết kết nối AI', field: 'name' },
    { id: 'R32', path: '/settings/team', heading: 'Nhân sự & phân quyền', api: '/members/', button: 'Chi tiết nhân sự', title: 'Chi tiết nhân sự', field: 'userId' },
    { id: 'R39', path: '/notifications', heading: 'Trung tâm thông báo', api: '/notifications/', button: 'Chi tiết thông báo', title: 'Chi tiết thông báo', field: 'title' },
    { id: 'R54', path: '/service-cases', heading: 'Chăm sóc sau bán', api: '/service-cases/', button: 'Chi tiết yêu cầu', title: 'Chi tiết yêu cầu sau bán', field: 'summary' },
    { id: 'R37', path: '/operations', heading: 'Công việc hôm nay', api: '/commands/', button: 'Chi tiết thao tác', title: 'Chi tiết trạng thái thao tác', field: 'result' },
] as const;
type Detail = typeof details[number];
type Probe = { calls: number; release?: () => void };
type ProbeWindow = Window & { detailProbe: Probe };

async function interceptDetail(page: Page, detail: Detail, status = 0) {
    await page.addInitScript(({ api, field, status, marker }) => {
        const original = window.fetch.bind(window);
        const probe: Probe = { calls: 0 };
        (window as ProbeWindow).detailProbe = probe;
        window.fetch = async (input, init) => {
            const address = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
            const method = init?.method || (input instanceof Request ? input.method : 'GET');
            const path = new URL(address, location.origin).pathname;
            if (method === 'GET' && path.startsWith('/api/v2/shops/shop-demo' + api) && !path.endsWith('/catalog') && !path.slice(('/api/v2/shops/shop-demo' + api).length).includes('/')) {
                probe.calls++;
                if (status) return new Response(JSON.stringify({ type: 'https://example.test/problems/detail', title: 'Detail unavailable', status, detail: 'DETAIL_FETCH_FAILURE', code: status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'TEMPORARILY_UNAVAILABLE', requestId: 'completion-detail-test' }), { status, headers: { 'Content-Type': 'application/problem+json' } });
                const response = await original(input, init);
                if (!response.ok) return response;
                const body = await response.json();
                body.data[field] = field === 'result' ? { type: 'stock', id: marker } : marker;
                await new Promise<void>(resolve => { probe.release = resolve; });
                return new Response(JSON.stringify(body), { status: response.status, headers: response.headers });
            }
            return original(input, init);
        };
    }, { api: detail.api, field: detail.field, status, marker: 'fetched-' + detail.id });
}

async function openDetail(page: Page, detail: Detail) {
    await page.goto(url + '/s/shop-demo' + detail.path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: detail.heading, exact: true })).toBeVisible();
    await expect(page.locator('main [role="progressbar"]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as ProbeWindow).detailProbe.calls)).toBe(0);
    if (detail.id === 'R28') {
        await page.getByRole('button', { name: 'Chạy đánh giá', exact: true }).click();
        const create = page.getByRole('dialog', { name: 'Đánh giá cấu hình nháp', exact: true });
        await create.getByLabel('Phiên bản bộ kiểm thử đã đăng ký').fill('demo-eval-completion');
        await create.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    } else await page.getByRole('button', { name: detail.button, exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: detail.title, exact: true });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    return dialog;
}

for (const detail of details) {
    test(`Completion ${detail.id} detail waits for GET data, renders fetched fields, closes and fits both viewports`, async ({ page }, testInfo) => {
        await interceptDetail(page, detail);
        for (const width of [390, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            const dialog = await openDetail(page, detail);
            await expect.poll(() => page.evaluate(() => (window as ProbeWindow).detailProbe.calls)).toBe(1);
            await expect(dialog.getByRole('progressbar')).toBeVisible();
            await expect(dialog.getByText('fetched-' + detail.id, { exact: false })).toHaveCount(0);
            await expect.poll(() => page.evaluate(() => typeof (window as ProbeWindow).detailProbe.release)).toBe('function');
            await page.evaluate(() => (window as ProbeWindow).detailProbe.release?.());
            await expect(dialog.getByText('fetched-' + detail.id, { exact: false })).toBeVisible();
            await expect(dialog.getByRole('progressbar')).toHaveCount(0);
            const region = dialog.getByRole('region', { name: detail.title, exact: true });
            await region.focus();
            await expect(region).toBeFocused();
            const scrollBefore = await region.evaluate(element => ({ top: element.scrollTop, height: element.scrollHeight, client: element.clientHeight }));
            if (scrollBefore.height > scrollBefore.client + 1) {
                await page.keyboard.press('End');
                await expect.poll(() => region.evaluate(element => element.scrollTop)).toBeGreaterThan(scrollBefore.top);
            }
            const geometry = await dialog.evaluate(element => ({ width: element.getBoundingClientRect().width, viewport: innerWidth, overflow: element.scrollWidth - element.clientWidth }));
            expect(geometry.width).toBeLessThanOrEqual(geometry.viewport);
            expect(geometry.overflow).toBeLessThanOrEqual(1);
            const axe = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
            expect(axe.violations).toEqual([]);
            await testInfo.attach(`${detail.id}-${width}-detail-observation`, { body: JSON.stringify({ geometry, scrollBefore, scrollAfter: await region.evaluate(element => element.scrollTop), detailRequests: await page.evaluate(() => (window as ProbeWindow).detailProbe.calls), axeViolations: axe.violations.length }), contentType: 'application/json' });
            await page.screenshot({ path: testInfo.outputPath(detail.id + '-' + width + '.png'), fullPage: true });
            await page.keyboard.press('Escape');
            await expect(dialog).toHaveCount(0);
            if (detail.button) await expect(page.getByRole('button', { name: detail.button, exact: true }).first()).toBeFocused();
        }
    });
    for (const status of [403, 404, 503]) {
        test(`Completion ${detail.id} detail handles ${status} without pretending list data is fetched detail`, async ({ page }) => {
            await interceptDetail(page, detail, status);
            const dialog = await openDetail(page, detail);
            await expect(dialog.getByRole('alert').filter({ hasText: 'DETAIL_FETCH_FAILURE' })).toBeVisible({ timeout: 15000 });
            await expect(dialog.getByRole('progressbar')).toHaveCount(0);
            await expect(dialog.getByText('fetched-' + detail.id, { exact: false })).toHaveCount(0);
            if (status !== 503) await expect(dialog.getByRole('button', { name: 'Thử lại', exact: true })).toHaveCount(0);
            else await expect(dialog.getByRole('button', { name: 'Thử lại', exact: true })).toBeVisible();
            await dialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
            await expect(dialog).toHaveCount(0);
        });
    }
}
