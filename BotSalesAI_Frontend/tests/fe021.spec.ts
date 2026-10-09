import { openDemoControls } from './session/demo-controls';
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
    if (['Vai trò mô phỏng', 'Trạng thái thử', 'Dataset mô phỏng'].includes(label)) await openDemoControls(page);
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
    if (label === 'Vai trò mô phỏng') {
        await expect(page.getByRole('status').filter({ hasText: 'Vai trò mô phỏng đã được áp dụng.' })).toBeVisible();
    }
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
    await expect(page.getByRole('link', { name: 'Xem việc cần làm', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tạo đơn hàng', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Tất cả đơn', exact: true })).toBeVisible();
    await expect(page.getByText('Dữ liệu cập nhật', { exact: false })).toBeVisible();
});

test('FE021 timezone and privacy validation waits for interaction and blocks invalid writes', async ({ page }) => {
    let mutationRequests = 0;
    page.on('request', request => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) mutationRequests++;
    });

    await gotoDemo(page, '/onboarding');
    await page.getByLabel('Tên cửa hàng').fill('Cửa hàng timezone kiểm thử');
    const onboardingTimezone = page.getByLabel('Múi giờ');
    await onboardingTimezone.fill('Mars/OlympusMons');
    await onboardingTimezone.blur();
    await expect(onboardingTimezone).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Nhập múi giờ hợp lệ, ví dụ Asia/Vientiane.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tạo cửa hàng' }).click();
    expect(mutationRequests).toBe(0);

    await gotoDemo(page, '/s/shop-demo/settings/shop');
    const settingsTimezone = page.getByLabel('Múi giờ');
    await settingsTimezone.fill('Mars/OlympusMons');
    await page.getByRole('button', { name: 'Lưu cấu hình' }).click();
    await expect(settingsTimezone).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Ngôn ngữ giao diện')).toBeDisabled();
    expect(mutationRequests).toBe(0);

    await gotoDemo(page, '/s/shop-demo/settings/privacy');
    const retentionDays = page.getByLabel('Số ngày lưu hội thoại');
    await expect(retentionDays).toHaveValue('');
    await expect(retentionDays).not.toHaveAttribute('aria-invalid', 'true');
    await retentionDays.fill('0');
    await retentionDays.blur();
    await expect(retentionDays).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Nhập số nguyên từ 1 đến 36.500 ngày.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Lưu bản nháp chính sách' }).click();
    expect(mutationRequests).toBe(0);
});

test('FE021 approval and shipment work queues appear before sample previews', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/approvals');
    const approvals = page.getByRole('table', { name: 'Yêu cầu phê duyệt' });
    const delegationPreview = page.getByText('Ủy quyền gửi đơn mua', { exact: true }).last();
    await expect(approvals).toBeVisible();
    await expect(delegationPreview).toBeVisible();
    expect((await approvals.boundingBox())?.y).toBeLessThan((await delegationPreview.boundingBox())?.y ?? Infinity);

    await gotoDemo(page, '/s/shop-demo/shipments');
    const shipments = page.getByRole('table', { name: 'Danh sách vận đơn' });
    const previewToggle = page.getByRole('button', { name: 'Mở bản xem thử phí giao hàng' });
    await expect(shipments).toBeVisible();
    await expect(previewToggle).toBeVisible();
    expect((await shipments.boundingBox())?.y).toBeLessThan((await previewToggle.boundingBox())?.y ?? Infinity);
    await previewToggle.click();
    await expect(page.getByTestId('shipment-fee-preview')).toBeVisible();
    await page.getByRole('button', { name: 'Ẩn bản xem thử phí giao hàng' }).click();
    await expect(page.getByTestId('shipment-fee-preview')).toBeHidden();
    await page.getByRole('button', { name: 'Mở bản xem thử phí giao hàng' }).click();
    await expect(page.getByTestId('shipment-fee-preview')).toBeVisible();
});

test('FE021 marketing filters preserve API-side aggregates, URL context and missing actual spend', async ({ page }) => {
    const responsePromise = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/marketing-summary'));
    await gotoDemo(page, '/s/shop-demo/reports/marketing');
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const envelope = await response.json();
    const reasons = envelope.data.lostSaleReasons as Array<{ reason: string; count: number }>;
    expect(reasons.length).toBeGreaterThan(0);
    await expect(page.getByTestId('marketing-loss-chart')).toBeVisible();
    await expect(page.getByTestId('marketing-trend-chart')).toBeVisible();
    await expect(page).toHaveURL(/fromDate=2026-08-31.*toDate=2026-09-29.*bucket=day/);
    expect(envelope.data.period).toMatchObject({ fromDate: '2026-08-31', toDate: '2026-09-29', bucket: 'day', timezone: 'Asia/Vientiane' });
    const table = page.getByRole('table', { name: 'Lý do không chốt đơn' });
    await expect(table.getByRole('row')).toHaveCount(reasons.length + 1);
    for (const reason of reasons) {
        const row = table.getByRole('row').filter({ hasText: reason.reason });
        await expect(row.getByRole('cell', { name: String(reason.count), exact: true })).toBeVisible();
    }
    expect(envelope.data.actualSpend).toBeNull();
    await expect(page.getByText('Kỳ này chưa có số thực tế từ API', { exact: true })).toBeVisible();
    await expect(page.getByText('Ước tính không phải số ghi sổ', { exact: true })).toBeVisible();

    await page.getByLabel('Từ ngày').fill('2026-09-18');
    await page.getByLabel('Đến ngày').fill('2026-09-24');
    await chooseOption(page, 'Gộp theo', 'Tuần');
    const filteredResponsePromise = page.waitForResponse(candidate => {
        const url = new URL(candidate.url());
        return candidate.request().method() === 'GET'
            && url.pathname.endsWith('/marketing-summary')
            && url.searchParams.get('fromDate') === '2026-09-18'
            && url.searchParams.get('toDate') === '2026-09-24'
            && url.searchParams.get('bucket') === 'week';
    });
    await page.getByRole('button', { name: 'Áp dụng' }).click();
    const filteredResponse = await filteredResponsePromise;
    expect(filteredResponse.status()).toBe(200);
    const filtered = (await filteredResponse.json()).data;
    expect(filtered).toMatchObject({ knownAttributedOrders: 2, unknownAttributionOrders: 1, estimatedSpend: { amount: '400000', currency: 'VND' }, actualSpend: null });
    expect(filtered.trend).toHaveLength(2);
    await expect(page).toHaveURL(/fromDate=2026-09-18.*toDate=2026-09-24.*bucket=week/);
    await page.reload();
    await expect(page.getByLabel('Từ ngày')).toHaveValue('2026-09-18');
    await expect(page.getByRole('combobox', { name: 'Gộp theo' })).toHaveText('Tuần');

    let marketingRequests = 0;
    page.on('request', request => {
        if (new URL(request.url()).pathname.endsWith('/marketing-summary')) marketingRequests++;
    });
    const beforeInvalidSubmit = marketingRequests;
    await page.getByLabel('Từ ngày').fill('2025-10-01');
    await page.getByLabel('Đến ngày').fill('2026-10-02');
    await page.getByRole('button', { name: 'Áp dụng' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'không được vượt quá 366 ngày' })).toBeVisible();
    expect(marketingRequests).toBe(beforeInvalidSubmit);
});

test('FE021 invalid marketing deep links mark the responsible field and never send the invalid range', async ({ page }) => {
    let marketingRequests = 0;
    page.on('request', request => {
        if (new URL(request.url()).pathname.endsWith('/marketing-summary')) marketingRequests++;
    });
    await gotoDemo(page, '/s/shop-demo/reports/marketing?fromDate=2026-10-02&toDate=2026-10-01&bucket=day');

    const from = page.getByRole('textbox', { name: 'Từ ngày' });
    await expect(from).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.', { exact: true })).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'Bộ lọc trên đường dẫn không hợp lệ.' })).toContainText('Hãy sửa trường được đánh dấu');
    expect(marketingRequests).toBe(0);
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
    await expect(page.getByText('Chưa có lý do mất đơn trong kỳ này.', { exact: true })).toBeVisible();
    await expect(page.getByText('Chưa có lý do mất đơn trong kỳ đã chọn.', { exact: true })).toBeVisible();

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
