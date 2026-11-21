import { test, expect } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let url = '';
let close: (() => Promise<void>) | undefined;
test.beforeAll(async () => {
    const server = await startDemoServer({ cacheIsolationKey: 'pilot-shipping-exceptions' });
    url = server.url;
    close = server.close;
});
test.afterAll(async () => { await close?.(); });

test('R62 saves a rate through the demo API and R19 displays it on the order quote', async ({ page }) => {
    await page.goto(url + '/s/shop-demo/settings/shop');
    const main = page.locator('main');
    await main.getByRole('link', { name: 'Cấu hình giao hàng' }).click();
    await expect(main.getByRole('heading', { name: 'Cấu hình giao hàng' })).toBeVisible();
    await main.getByRole('button', { name: 'Thêm vùng giao' }).click();
    const dialog = page.getByRole('dialog', { name: 'Thêm vùng giao' });
    await dialog.getByRole('button', { name: 'Lưu vùng giao' }).click();
    await expect(dialog.getByText('Nhập mã gồm hai chữ cái.')).toBeVisible();
    await dialog.getByLabel('Mã quốc gia').fill('vn');
    await dialog.getByLabel('Tỉnh/Thành').fill('Địa bàn mẫu');
    await dialog.getByLabel('Tên dịch vụ').fill('Giao tiêu chuẩn');
    await dialog.getByLabel('Phí dự kiến (VND)').fill('27000');
    const saved = page.waitForResponse(response => response.request().method() === 'PUT' && response.url().endsWith('/shipping-policy'));
    await dialog.getByLabel('Phí dự kiến (VND)').press('Enter');
    expect((await saved).status()).toBe(200);
    await expect(dialog).toHaveCount(0);
    await expect(main.getByText('Đã lưu biểu phí giao hàng.')).toBeVisible();
    await expect(main.getByText('Giao tiêu chuẩn')).toBeVisible();
    const desktop = page.viewportSize()!;
    await page.setViewportSize({ width: 320, height: 840 });
    await expect(main.getByText('Giao tiêu chuẩn')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await page.setViewportSize(desktop);

    await page.getByRole('link', { name: 'Đơn hàng', exact: true }).click();
    await main.locator('a[href="/s/shop-demo/orders/DH-1001"]').click();
    const quoted = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/DH-1001/quote'));
    await main.getByRole('button', { name: 'Lấy báo giá hiện tại' }).click();
    const response = await quoted;
    expect(response.status()).toBe(200);
    expect((await response.json()).data).toMatchObject({
        shippingRate: { serviceName: 'Giao tiêu chuẩn', fee: { amount: '27000', currency: 'VND' } },
    });
    await expect(main.getByText('Phí giao dự kiến', { exact: true })).toBeVisible();
    await expect(main.getByText(/27\.000.*Giao tiêu chuẩn/)).toBeVisible();
});

test('R63 queries server filters and verifies unknown commands without replay at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url + '/s/shop-demo/operations/exceptions');
    await expect(page.getByRole('heading', { name: 'Ngoại lệ và tác vụ nền' })).toBeVisible();
    const work = page.getByRole('table', { name: 'Hàng đợi công việc' });
    await expect(work.getByText('demo-workitem-late-shipment')).toBeVisible();
    await page.getByRole('combobox', { name: 'Loại công việc' }).click();
    const filterRequest = page.waitForResponse(response => {
        const request = new URL(response.url());
        return request.pathname.endsWith('/work-items') && request.searchParams.get('kind') === 'late_shipment';
    });
    await page.getByRole('option', { name: 'Đơn giao chậm' }).click();
    const filtered = await filterRequest;
    expect(new URL(filtered.url()).searchParams.get('exception')).toBe('active');
    expect((await filtered.json()).data).toMatchObject([{ id: 'demo-workitem-late-shipment' }]);
    await expect(work.getByText('demo-workitem-payment-mismatch')).toHaveCount(0);

    await page.getByRole('tab', { name: 'Tác vụ nền' }).click();
    await expect(page.getByText('Chưa có tác vụ theo bộ lọc.')).toBeVisible();
    await page.getByRole('tab', { name: 'Thao tác cần đối chiếu' }).click();
    await expect(page.getByText('seed-command-10079')).toBeVisible();
    await page.getByRole('button', { name: 'Chi tiết thao tác' }).click();
    const detail = page.getByRole('dialog', { name: 'Chi tiết trạng thái thao tác' });
    await expect(detail.getByText(/Kết quả chưa rõ/)).toBeVisible();
    const recheck = page.waitForResponse(response => response.request().method() === 'GET' && response.url().endsWith('/commands/seed-command-10079'));
    await detail.getByRole('button', { name: 'Kiểm tra trạng thái' }).click();
    expect((await recheck).status()).toBe(200);
    await expect(detail.getByRole('button', { name: /gửi lại/i })).toHaveCount(0);
});
