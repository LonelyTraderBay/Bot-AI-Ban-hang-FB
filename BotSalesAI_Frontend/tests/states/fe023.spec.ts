import { test, expect } from '@playwright/test';
import { startDemoServer } from '../session/demo-server.mjs';

let demoUrl = '';
let stopDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    stopDemo = server.close;
});

test.afterAll(async () => {
    await stopDemo?.();
});

test('FE023.S04 a dirty dialog keeps the form value until the user confirms discard', async ({ page }) => {
    await page.goto(new URL('/s/shop-demo/customers', demoUrl).toString());
    await page.getByRole('button', { name: 'Thêm khách hàng', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Thêm khách hàng' });
    const name = editor.getByRole('textbox', { name: 'Tên khách hàng' });
    await name.fill('Khách hàng đang soạn');
    await editor.getByRole('button', { name: 'Hủy', exact: true }).click();

    const confirm = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Tiếp tục sửa' }).click();
    await expect(name).toHaveValue('Khách hàng đang soạn');

    await editor.getByRole('button', { name: 'Đóng' }).click();
    await page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?' }).getByRole('button', { name: 'Bỏ thay đổi' }).click();
    await expect(page.getByRole('dialog', { name: 'Thêm khách hàng' })).toHaveCount(0);
});

test('FE023.S03 a customer lookup loads the next cursor page without dropping earlier choices', async ({ page }) => {
    await page.goto(new URL('/s/shop-demo/orders', demoUrl).toString());
    await page.getByRole('button', { name: 'Tạo đơn hàng', exact: true }).waitFor();
    const setup = await page.evaluate(async () => {
        const statuses: number[] = [];
        for (let index = 0; index < 21; index++) {
            const response = await fetch('/api/v2/shops/shop-demo/customers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': 'botsales-demo-csrf-not-a-real-secret',
                    'Idempotency-Key': `fe023-customer-page-${index}`,
                },
                body: JSON.stringify({ displayName: `Khách phân trang FE023 ${index + 1}`, phone: null, email: null, notes: '' }),
            });
            statuses.push(response.status);
        }
        const response = await fetch('/api/v2/shops/shop-demo/customers?limit=100');
        const page = await response.json();
        return {
            statuses,
            total: page.page?.total,
            firstChoice: page.data?.[0]?.displayName,
            nextPageChoice: page.data?.[20]?.displayName,
        };
    });
    expect(setup.statuses.every(status => status === 201), `Mock customer setup returned ${JSON.stringify(setup)}`).toBe(true);
    expect(setup.total).toBeGreaterThan(20);
    expect(setup.firstChoice).toBeTruthy();
    expect(setup.nextPageChoice).toBeTruthy();

    await page.getByRole('button', { name: 'Tạo đơn hàng', exact: true }).click();
    await expect(page.getByText('Đã tải 20 lựa chọn')).toBeVisible();
    await page.getByRole('button', { name: 'Tải thêm khách hàng' }).click();
    await expect(page.getByText(`Đã tải ${setup.total} lựa chọn`)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tải thêm khách hàng' })).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Khách hàng' }).click();
    await expect(page.getByRole('option', { name: setup.nextPageChoice, exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: setup.firstChoice, exact: true })).toBeVisible();
});

test('FE023.S04 delayed requests show loading and failed refresh keeps a retry path', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.stack || error.message));
    await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
    await page.getByRole('combobox', { name: 'Trạng thái thử' }).click();
    await page.getByRole('option', { name: 'Tải chậm', exact: true }).click();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Danh mục' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Đang tải dữ liệu' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Danh mục', exact: true })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Đang tải dữ liệu' })).toHaveCount(0);

    await page.getByRole('combobox', { name: 'Trạng thái thử' }).click();
    await page.getByRole('option', { name: 'Lỗi danh sách thiết bị', exact: true }).click();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Điện thoại & lịch trực' }).click();
    const devicesHeading = page.getByRole('heading', { name: 'Điện thoại & lịch trực', exact: true });
    const routeErrorHeading = page.getByRole('heading', { name: 'Không thể mở màn hình', exact: true });
    await Promise.race([devicesHeading.waitFor(), routeErrorHeading.waitFor()]);
    if (await routeErrorHeading.count())
        throw new Error(`Route failed while rendering devices page. Browser errors: ${pageErrors.join('\n') || '(none captured)'}. Route detail: ${await page.getByTestId('route-error-details').textContent() || '(none)'}`);
    await expect(page.getByRole('alert').filter({ hasText: 'Không thể hoàn thành yêu cầu' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Trạng thái thử' }).click();
    await page.getByRole('option', { name: 'Bình thường', exact: true }).click();
    await page.getByRole('button', { name: 'Thử lại' }).first().click();
    await expect(page.getByRole('alert').filter({ hasText: 'Không thể hoàn thành yêu cầu' })).toHaveCount(0);
});

test('FE023 unsaved shop settings are preserved when navigation switches shop scope', async ({ page }) => {
    await page.goto(new URL('/s/shop-demo/settings/shop', demoUrl).toString());
    const name = page.getByRole('textbox', { name: 'Tên cửa hàng' });
    await name.fill('Joker Studio chưa lưu');
    await page.getByRole('link', { name: /Joker Studio/ }).click();
    const confirm = page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }).click();
    await expect(page).toHaveURL(/\/s\/shop-demo\/settings\/shop$/);
    await expect(name).toHaveValue('Joker Studio chưa lưu');

    await page.getByRole('link', { name: /Joker Studio/ }).click();
    await page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?' }).getByRole('button', { name: 'Rời màn hình' }).click();
    await expect(page.getByRole('heading', { name: 'Chọn cửa hàng', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Mở cửa hàng' }).nth(1).click();
    await expect(page).toHaveURL(/\/s\/shop-second\/overview$/);
});

test('FE023 a saved shop form resets its dirty baseline and reports success', async ({ page }) => {
    await page.goto(new URL('/s/shop-demo/settings/shop', demoUrl).toString());
    const savedName = 'Joker Studio FE023 đã lưu';
    const name = page.getByRole('textbox', { name: 'Tên cửa hàng' });
    await name.fill(savedName);
    await page.getByRole('button', { name: 'Lưu cấu hình' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Đã lưu cấu hình cửa hàng.' })).toBeVisible();

    await name.fill('Tên tạm thời');
    await name.fill(savedName);
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Tổng quan' }).click();
    await expect(page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?' })).toHaveCount(0);
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Cửa hàng', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Tên cửa hàng' })).toHaveValue(savedName);
});
