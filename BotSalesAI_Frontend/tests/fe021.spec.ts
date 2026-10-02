import { test, expect } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

async function gotoDemo(page: import('@playwright/test').Page, route: string) {
    await page.goto(new URL(route, demoUrl).toString());
}

async function chooseOption(page: import('@playwright/test').Page, label: string, value: string | RegExp) {
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
}

async function setDemoRole(page: import('@playwright/test').Page, role: 'owner' | 'viewer' | 'accountant') {
    await chooseOption(page, 'Vai trò mô phỏng', 'viewer');
    if (role !== 'viewer') await chooseOption(page, 'Vai trò mô phỏng', role);
}

test('FE021 dashboard keeps independent panels usable and hides finance fields without finance.read', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/overview');
    await setDemoRole(page, 'viewer');
    await expect(page.getByText('Chỉ hiển thị khi vai trò có finance.read.', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Xem lợi nhuận' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Tình hình hiện tại' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tạo đơn hàng' })).toBeVisible();
    await expect(page.getByText('Dữ liệu cập nhật', { exact: false })).toBeVisible();
});

test('FE021 marketing chart and table match the same synthetic API fixture and preserve missing actual spend', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/overview');
    await setDemoRole(page, 'owner');
    await gotoDemo(page, '/s/shop-demo/reports/marketing');
    const responsePromise = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/marketing-summary'));
    await page.reload();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const envelope = await response.json();
    const reasons = envelope.data.lostSaleReasons as Array<{ reason: string; count: number }>;
    expect(reasons.length).toBeGreaterThan(0);
    await expect(page.getByTestId('marketing-loss-chart')).toBeVisible();
    const table = page.getByRole('table', { name: 'Lý do không chốt đơn' });
    await expect(table.getByRole('row')).toHaveCount(reasons.length + 1);
    for (const reason of reasons) {
        await expect(table.getByText(reason.reason, { exact: true })).toBeVisible();
        await expect(table.getByText(String(reason.count), { exact: true })).toBeVisible();
    }
    expect(envelope.data.actualSpend).toBeNull();
    await expect(page.getByText('Chưa có số thực tế từ API', { exact: true })).toBeVisible();
    await expect(page.getByText('Ước tính không phải số ghi sổ', { exact: true })).toBeVisible();
    await expect(page.getByText('getMarketingSummary không nhận bộ lọc ngày;', { exact: false })).toBeVisible();
});

test('FE021 export uses inclusive shop-local boundaries, safe CSV, API jobs and cursor pagination', async ({ page }) => {
    test.setTimeout(45_000);
    await gotoDemo(page, '/s/shop-demo/overview');
    await setDemoRole(page, 'owner');
    await gotoDemo(page, '/s/shop-demo/reports');
    await expect(page.getByRole('heading', { name: 'Tạo tệp báo cáo' })).toBeVisible();
    await page.getByLabel('Từ ngày').fill('2026-09-29');
    await page.getByLabel('Đến ngày').fill('2026-09-29');

    const exportResponsePromise = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/exports'));
    await page.getByRole('button', { name: 'Tạo tệp báo cáo CSV' }).click();
    const exportResponse = await exportResponsePromise;
    expect(exportResponse.status()).toBe(202);
    const exportEnvelope = await exportResponse.json();
    const exportBody = exportResponse.request().postDataJSON();
    expect(exportBody).toMatchObject({ reportType: 'orders', format: 'csv', timezone: 'Asia/Vientiane', from: '2026-09-28T17:00:00.000Z', to: '2026-09-29T16:59:59.999Z', snapshotAsOf: '2026-09-29T14:00:00.000Z' });
    expect(exportEnvelope.data).toMatchObject({ kind: 'export', status: 'succeeded', total: expect.any(Number) });
    await expect(page.getByRole('link', { name: `Theo dõi công việc ${exportEnvelope.data.id}` })).toBeVisible();

    const csvText = await page.evaluate(async url => await (await fetch(url)).text(), exportEnvelope.data.downloadUrl as string);
    expect(csvText).toContain('"orderId","createdAt","orderState","fulfillmentState","paymentState","totalAmount","currency"');
    expect(csvText).toContain('DH-DEMO-RETURN-02');
    expect(csvText).not.toContain('customerId');
    expect(csvText).not.toContain('shippingAddressId');
    await expect(page.getByRole('link', { name: 'Tải CSV' })).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Tải CSV' }).click();
    expect((await downloadPromise).suggestedFilename()).toBe('botsales-orders-2026-09-29-2026-09-29.csv');
    await expect(page.getByRole('row').filter({ hasText: exportEnvelope.data.id })).toBeVisible();

    const csrf = 'botsales-demo-csrf-not-a-real-secret';
    for (let index = 0; index < 11; index++) {
        const status = await page.evaluate(async ({ csrfToken, requestIndex }) => {
            const response = await fetch('/api/v2/shops/shop-demo/exports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, 'Idempotency-Key': `fe021-page-${requestIndex}` },
                body: JSON.stringify({ reportType: 'orders', format: 'csv', from: '2026-09-28T17:00:00.000Z', to: '2026-09-29T16:59:59.999Z', timezone: 'Asia/Vientiane', snapshotAsOf: '2026-09-29T14:00:00.000Z' }),
            });
            return response.status;
        }, { csrfToken: csrf, requestIndex: index });
        expect(status).toBe(202);
    }
    const pages = await page.evaluate(async () => {
        const first = await (await fetch('/api/v2/shops/shop-demo/jobs?limit=10')).json();
        const nextCursor = encodeURIComponent(first.page.nextCursor as string);
        const second = await (await fetch(`/api/v2/shops/shop-demo/jobs?limit=10&cursor=${nextCursor}`)).json();
        return { first, second };
    });
    expect(pages.first.data.length).toBe(10);
    expect(pages.first.page.total).toBeGreaterThanOrEqual(12);
    expect(pages.first.page.hasMore).toBe(true);
    expect(pages.second.data.length).toBeGreaterThanOrEqual(2);
    expect(pages.second.page.hasMore).toBe(false);
});

test('FE021 mock rejects an export when reports.export lacks the source permission', async ({ page }) => {
    test.setTimeout(45_000);
    await gotoDemo(page, '/s/shop-demo/reports');
    await chooseOption(page, 'Vai trò mô phỏng', 'accountant');
    const denied = await page.evaluate(async (csrfToken) => {
        const response = await fetch('/api/v2/shops/shop-demo/exports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, 'Idempotency-Key': 'fe021-source-permission-denied' },
            body: JSON.stringify({ reportType: 'inventory', format: 'csv', from: '2026-09-28T17:00:00.000Z', to: '2026-09-29T16:59:59.999Z', timezone: 'Asia/Vientiane', snapshotAsOf: '2026-09-29T14:00:00.000Z' }),
        });
        return { status: response.status, contentType: response.headers.get('content-type'), body: await response.text() };
    }, 'botsales-demo-csrf-not-a-real-secret');
    expect(denied.status).toBe(403);
    expect(denied.contentType).toContain('application/json');
    expect(JSON.parse(denied.body).code).toBe('SOURCE_PERMISSION_REQUIRED');
    await expect(page.getByRole('combobox', { name: 'Báo cáo' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Báo cáo' }).click();
    await expect(page.getByRole('option', { name: 'Tồn kho', exact: true })).toHaveCount(0);
});

test('FE021 mock rejects an invalid report timezone before creating an export job', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/reports');
    await expect(page.getByRole('combobox', { name: 'Báo cáo' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Công việc gần đây' })).toBeVisible();
    const result = await page.evaluate(async () => {
        const before = await (await fetch('/api/v2/shops/shop-demo/jobs?limit=10')).json();
        const response = await fetch('/api/v2/shops/shop-demo/exports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'botsales-demo-csrf-not-a-real-secret', 'Idempotency-Key': 'fe021-invalid-timezone' },
            body: JSON.stringify({ reportType: 'orders', format: 'csv', from: '2026-09-28T17:00:00.000Z', to: '2026-09-29T16:59:59.999Z', timezone: 'Mars/OlympusMons', snapshotAsOf: '2026-09-29T14:00:00.000Z' }),
        });
        const body = await response.json();
        const after = await (await fetch('/api/v2/shops/shop-demo/jobs?limit=10')).json();
        return { status: response.status, body, beforeTotal: before.page.total, afterTotal: after.page.total };
    });
    expect(result.status).toBe(422);
    expect(result.body.code).toBe('INVALID_REPORT_TIMEZONE');
    expect(result.afterTotal).toBe(result.beforeTotal);
});

test('FE021 ambiguous export result preserves the selected dates and never exposes a download', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/reports');
    await expect(page.getByRole('combobox', { name: 'Báo cáo' })).toBeVisible();
    await chooseOption(page, 'Trạng thái thử', 'Lỗi truy vấn tiếp');
    await page.getByLabel('Từ ngày').fill('2026-09-28');
    await page.getByLabel('Đến ngày').fill('2026-09-28');
    await page.getByRole('button', { name: 'Tạo tệp báo cáo CSV' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Chưa xác minh được kết quả' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tải CSV' })).toHaveCount(0);
    await expect(page.getByLabel('Từ ngày')).toHaveValue('2026-09-28');
    await expect(page.getByLabel('Đến ngày')).toHaveValue('2026-09-28');
});

test('FE021 empty report and marketing payloads render explicit empty states', async ({ page }) => {
    await gotoDemo(page, '/onboarding');
    await expect(page.getByRole('heading', { name: 'Tạo cửa hàng' })).toBeVisible();
    await page.getByLabel('Tên cửa hàng').fill('Cửa hàng kiểm thử báo cáo trống');
    await page.getByRole('button', { name: 'Tạo cửa hàng' }).click();
    await expect(page.getByRole('heading', { name: 'Tình hình hiện tại' })).toBeVisible();
    const shopId = new URL(page.url()).pathname.split('/')[2];
    expect(shopId).toMatch(/^shop-/);

    await page.getByRole('link', { name: 'Thông tin marketing' }).click();
    await expect(page).toHaveURL(new RegExp(`/s/${shopId}/reports/marketing$`));
    await expect(page.getByText('API chưa cung cấp nhóm lý do để vẽ biểu đồ.', { exact: true })).toBeVisible();
    await expect(page.getByText('Chưa có lý do mất đơn trong payload API.', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Xuất báo cáo' }).click();
    await expect(page).toHaveURL(new RegExp(`/s/${shopId}/reports$`));
    await expect(page.getByText('Chưa có công việc trong trang này.', { exact: true })).toBeVisible();
});

test('FE021 stale export conflict preserves dates and never exposes a download', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/reports');
    await expect(page.getByRole('combobox', { name: 'Báo cáo' })).toBeVisible();
    await chooseOption(page, 'Trạng thái thử', 'Xung đột lần ghi tiếp');
    await page.getByLabel('Từ ngày').fill('2026-09-27');
    await page.getByLabel('Đến ngày').fill('2026-09-28');
    await page.getByRole('button', { name: 'Tạo tệp báo cáo CSV' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Mô phỏng dữ liệu bị thay đổi bởi người khác' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tải CSV' })).toHaveCount(0);
    await expect(page.getByLabel('Từ ngày')).toHaveValue('2026-09-27');
    await expect(page.getByLabel('Đến ngày')).toHaveValue('2026-09-28');
});
