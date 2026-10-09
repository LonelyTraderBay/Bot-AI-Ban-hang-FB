import { openDemoControls } from './session/demo-controls';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

async function gotoDemo(page: import('@playwright/test').Page, path: string) {
    await page.goto(new URL(path, demoUrl).toString());
}

async function chooseOption(page: import('@playwright/test').Page, label: string, value: string) {
    if (['Vai trò mô phỏng', 'Trạng thái thử', 'Dataset mô phỏng'].includes(label)) await openDemoControls(page);
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
}

type ObservedRequest = { method: string; path: string; body: string | null; headers: Record<string, string> };
function observeShopRequests(page: import('@playwright/test').Page) {
    const requests: ObservedRequest[] = [];
    page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.includes('/shops')) requests.push({ method: request.method(), path: url.pathname + url.search, body: request.postData(), headers: request.headers() });
    });
    return requests;
}

test('FE011.AC01 snapshot drives stock totals and the SKU opens its catalog result', async ({ page }) => {
    const calls = observeShopRequests(page);
    await gotoDemo(page, '/s/shop-demo/inventory');
    await expect(page.getByRole('heading', { name: 'Tồn kho', exact: true })).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'Kho mặc định: warehouse-01' })).toBeVisible();
    const row = page.getByRole('row').filter({ hasText: 'DEMO-001' });
    await expect(row.getByRole('cell').nth(1)).toHaveText('8');
    await expect(row.getByRole('cell').nth(2)).toHaveText('0');
    await expect(row.getByRole('cell').nth(3)).toHaveText('8');
    await expect(row).toContainText('snapshot');
    await expect(row.getByRole('link', { name: 'Mở sản phẩm' })).toHaveAttribute('href', '/s/shop-demo/products?q=DEMO-001');
    expect(calls.some(call => call.method === 'GET' && call.path === '/api/v2/shops/shop-demo')).toBeTruthy();
    expect(calls.some(call => call.method === 'GET' && call.path.startsWith('/api/v2/shops/shop-demo/inventory?'))).toBeTruthy();

    await row.getByRole('link', { name: 'Mở sản phẩm' }).click();
    await expect(page).toHaveURL(/\/s\/shop-demo\/products\?q=DEMO-001/);
    await expect(page.getByText('Áo mẫu A', { exact: true })).toBeVisible();
});

test('FE011.AC02 adjustment validates, waits for mock confirmation, and reconciles movement history once', async ({ page }) => {
    const calls = observeShopRequests(page);
    await gotoDemo(page, '/s/shop-demo/inventory');
    await chooseOption(page, 'Trạng thái thử', 'Tải chậm');
    const row = page.getByRole('row').filter({ hasText: 'DEMO-001' });
    await row.getByRole('button', { name: 'Điều chỉnh' }).click();
    const dialog = page.getByRole('dialog', { name: 'Điều chỉnh DEMO-001' });
    await dialog.getByLabel('Thay đổi số lượng').fill('0');
    await dialog.getByLabel('Lý do điều chỉnh').fill('Kiểm kê FE011');
    await dialog.getByRole('button', { name: 'Xác nhận điều chỉnh' }).click();
    await expect(dialog.getByText('Số điều chỉnh phải khác 0 và nằm trong giới hạn hợp đồng.')).toBeVisible();
    expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/inventory/adjustments'))).toHaveLength(0);

    await dialog.getByLabel('Thay đổi số lượng').fill('2');
    const mutationRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/inventory/adjustments'));
    await dialog.getByRole('button', { name: 'Xác nhận điều chỉnh' }).click();
    const submit = dialog.getByRole('button', { name: 'Xác nhận điều chỉnh' });
    await mutationRequest;
    await expect(submit).toBeDisabled();
    await expect(page.getByRole('status').filter({ hasText: 'Điều chỉnh đã được xác nhận' })).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'Điều chỉnh đã được xác nhận' })).toBeVisible({ timeout: 15000 });
    await expect(row.getByRole('cell').nth(1)).toHaveText('10');

    const adjustmentCalls = calls.filter(call => call.method === 'POST' && call.path.endsWith('/inventory/adjustments'));
    expect(adjustmentCalls).toHaveLength(1);
    expect(adjustmentCalls[0].headers['idempotency-key']).toBeTruthy();
    expect(adjustmentCalls[0].headers['x-csrf-token']).toBeTruthy();
    expect(JSON.parse(adjustmentCalls[0].body || 'null')).toMatchObject({ variantId: 'v-p1', warehouseId: 'warehouse-01', quantityDelta: 2, reason: 'Kiểm kê FE011', expectedVersion: 1, unitCost: { amount: '100000', currency: 'VND' } });

    await page.getByRole('link', { name: 'Lịch sử biến động' }).click();
    await expect(page.getByRole('heading', { name: 'Lịch sử kho', exact: true })).toBeVisible();
    const movement = page.getByRole('row').filter({ hasText: 'Kiểm kê FE011' });
    await expect(movement).toContainText('Điều chỉnh tồn');
    await expect(movement.locator('[title="adjustment"]')).toContainText('Điều chỉnh tồn');
    await expect(movement).toContainText('2');
    await expect(movement).toContainText('user-demo');
    expect(calls.some(call => call.method === 'GET' && call.path.startsWith('/api/v2/shops/shop-demo/inventory/movements'))).toBeTruthy();
});

test('FE011.AC03 conflict and insufficient stock preserve the draft and never update optimistically', async ({ page }) => {
    const calls = observeShopRequests(page);
    await gotoDemo(page, '/s/shop-demo/inventory');
    await chooseOption(page, 'Trạng thái thử', 'Xung đột lần ghi tiếp');
    const row = page.getByRole('row').filter({ hasText: 'DEMO-001' });
    await row.getByRole('button', { name: 'Điều chỉnh' }).click();
    const dialog = page.getByRole('dialog', { name: 'Điều chỉnh DEMO-001' });
    await dialog.getByLabel('Thay đổi số lượng').fill('1');
    await dialog.getByLabel('Lý do điều chỉnh').fill('Kiểm kê xung đột');
    await dialog.getByRole('button', { name: 'Xác nhận điều chỉnh' }).click();
    await expect(dialog.getByRole('alert').filter({ hasText: 'dữ liệu bị thay đổi bởi người khác' })).toBeVisible();
    await expect(dialog.getByLabel('Thay đổi số lượng')).toHaveValue('1');

    await dialog.getByLabel('Thay đổi số lượng').fill('-100');
    await dialog.getByRole('button', { name: 'Xác nhận điều chỉnh' }).click();
    const insufficientStock = dialog.getByRole('alert').filter({ hasText: 'Điều chỉnh vượt tồn hiện có.' });
    await expect(insufficientStock).toBeVisible();
    await expect(insufficientStock).not.toContainText('Tải lại dữ liệu mới nhất');
    await expect(dialog.getByLabel('Thay đổi số lượng')).toHaveValue('-100');
    await expect(dialog).toHaveAttribute('data-draft-dirty', 'true');
    expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/inventory/adjustments'))).toHaveLength(2);
    await dialog.getByRole('button', { name: 'Hủy' }).click();
    const discardDialog = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?' });
    await expect(discardDialog).toBeVisible();
    await discardDialog.getByRole('button', { name: 'Bỏ thay đổi' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row.getByRole('cell').nth(1)).toHaveText('8');
    await expect(page.getByText('Kiểm kê xung đột', { exact: true })).toHaveCount(0);
});

test('FE011.AC03 forbidden adjustment retains user input and shows no success state', async ({ page }) => {
    const calls = observeShopRequests(page);
    await gotoDemo(page, '/s/shop-demo/inventory');
    await chooseOption(page, 'Trạng thái thử', 'Mất quyền truy vấn tiếp');
    const row = page.getByRole('row').filter({ hasText: 'DEMO-001' });
    await row.getByRole('button', { name: 'Điều chỉnh' }).click();
    const dialog = page.getByRole('dialog', { name: 'Điều chỉnh DEMO-001' });
    await dialog.getByLabel('Thay đổi số lượng').fill('1');
    await dialog.getByLabel('Lý do điều chỉnh').fill('Thử mất quyền');
    await dialog.getByRole('button', { name: 'Xác nhận điều chỉnh' }).click();
    await expect(dialog.getByRole('alert').filter({ hasText: 'Mô phỏng mất quyền' })).toBeVisible();
    await expect(dialog.getByLabel('Lý do điều chỉnh')).toHaveValue('Thử mất quyền');
    await expect(page.getByRole('status').filter({ hasText: 'Điều chỉnh đã được xác nhận' })).toHaveCount(0);
    expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/inventory/adjustments'))).toHaveLength(1);
});

test('FE011.AC03 unknown command blocks duplicate submission until shared recovery reconciles it', async ({ page }) => {
    const calls = observeShopRequests(page);
    await gotoDemo(page, '/s/shop-demo/inventory');
    await chooseOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
    const row = page.getByRole('row').filter({ hasText: 'DEMO-001' });
    await row.getByRole('button', { name: 'Điều chỉnh' }).click();
    const dialog = page.getByRole('dialog', { name: 'Điều chỉnh DEMO-001' });
    await dialog.getByLabel('Thay đổi số lượng').fill('1');
    await dialog.getByLabel('Lý do điều chỉnh').fill('Chưa rõ kết quả');
    await dialog.getByRole('button', { name: 'Xác nhận điều chỉnh' }).click();
    await expect(dialog.getByRole('alert').filter({ hasText: 'Chưa xác minh được kết quả' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/thao tác chưa xác minh kết quả/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Xác nhận điều chỉnh' }).click();
    await expect(dialog.getByRole('alert').filter({ hasText: 'Chưa xác minh được kết quả' })).toBeVisible();
    expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/inventory/adjustments'))).toHaveLength(1);
    await expect(page.getByRole('status').filter({ hasText: 'Điều chỉnh đã được xác nhận' })).toHaveCount(0);
});

test('FE011.AC04 movement contract filters are URL-backed and history exposes actor and permission-gated source', async ({ page }) => {
    const calls = observeShopRequests(page);
    await gotoDemo(page, '/s/shop-demo/inventory/movements?cursor=stale-movement&preserve=keep');
    await expect(page.getByRole('heading', { name: 'Lịch sử kho', exact: true })).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'Cursor không còn phù hợp' })).toBeVisible();
    await expect(page.getByLabel('Loại biến động')).toHaveCount(0);
    await chooseOption(page, 'Kho', 'MAIN · Kho chính · dữ liệu tổng hợp');
    await page.getByLabel('Mã biến thể').fill('v-p1');
    const filteredRequest = page.waitForRequest(request => {
        const url = new URL(request.url());
        return request.method() === 'GET' && url.pathname.endsWith('/inventory/movements') && url.searchParams.get('warehouseId') === 'warehouse-01' && url.searchParams.get('variantId') === 'v-p1';
    });
    await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
    await expect(page).toHaveURL(/warehouseId=warehouse-01/);
    await expect(page).toHaveURL(/variantId=v-p1/);
    await expect(page).toHaveURL(/preserve=keep/);
    await expect(page).not.toHaveURL(/cursor=/);
    await expect(page).not.toHaveURL(/kind=/);
    await expect(page.getByRole('row').filter({ hasText: 'user-demo' }).first()).toBeVisible();
    const filtered = new URL((await filteredRequest).url());
    expect(filtered.searchParams.get('warehouseId')).toBe('warehouse-01');
    expect(filtered.searchParams.get('variantId')).toBe('v-p1');
    expect(filtered.searchParams.has('kind')).toBe(false);
    expect(filtered.searchParams.has('cursor')).toBe(false);
    await expect(page.getByRole('button', { name: 'Xóa bộ lọc' })).toBeVisible();
    expect(calls.some(call => call.method === 'GET' && call.path.includes('/inventory/movements') && new URLSearchParams(call.path.split('?')[1]).has('kind'))).toBe(false);
});

test('FE011.AC05 inventory reflows at mobile widths, passes axe, and restores keyboard focus after adjustment dialog', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/inventory');
    for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.getByRole('region', { name: 'Tồn kho theo vị trí' })).toBeVisible();
        const overflowsViewport = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(overflowsViewport, `inventory page overflows at ${width}px`).toBe(false);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);

    const trigger = page.getByRole('row').filter({ hasText: 'DEMO-001' }).getByRole('button', { name: 'Điều chỉnh' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: /Điều chỉnh DEMO-001/ });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Tab');
    await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))), { timeout: 3000 }).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
});

test('FE011.AC03 unknown shop scope shows no stock from another shop', async ({ page }) => {
    await gotoDemo(page, '/s/shop-outside/inventory');
    await expect(page.getByText('Bạn không có quyền truy cập cửa hàng này.', { exact: true })).toBeVisible();
    await expect(page.getByText('DEMO-001', { exact: true })).toHaveCount(0);
});
