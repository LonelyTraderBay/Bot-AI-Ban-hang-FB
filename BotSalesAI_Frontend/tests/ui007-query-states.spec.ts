import { expect, test } from '@playwright/test';
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

async function setOperationFailure(page: import('@playwright/test').Page, op: string, failure: { status: number; code: string; message: string } | null) {
    await page.evaluate(async ({ operation, nextFailure }) => {
        const mock = await import('/src/mocks/service.ts');
        mock.setOperationFailure(operation, nextFailure);
    }, { operation: op, nextFailure: failure });
}

function panel(page: import('@playwright/test').Page, title: string) {
    return page.getByRole('heading', { name: title, exact: true }).locator('xpath=../../..');
}

test('UI007 secondary order query loads independently while the customer profile remains available', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/customers');
    await expect(page.getByRole('heading', { name: 'Khách hàng', exact: true })).toBeVisible();
    await page.evaluate(async () => {
        const mock = await import('/src/mocks/service.ts');
        mock.setOperationDelay('listOrders', 900);
    });
    const orderResponses: number[] = [];
    page.on('response', response => {
        const url = new URL(response.url());
        if (url.pathname.endsWith('/orders') && url.searchParams.get('customerId') === 'c1') orderResponses.push(response.status());
    });
    await page.getByRole('row').filter({ hasText: 'Linh (khách mẫu)' }).getByRole('link', { name: 'Hồ sơ', exact: true }).click();

    const ordersPanel = panel(page, 'Đơn hàng gần đây');
    await expect(page.getByRole('heading', { name: 'Linh (khách mẫu)', exact: true })).toBeVisible();
    await expect(ordersPanel.getByRole('progressbar')).toBeVisible();
    expect(orderResponses).toHaveLength(0);
    const ordersResponse = await page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/orders') && url.searchParams.get('customerId') === 'c1';
    });
    expect(ordersResponse.status()).toBe(200);
    await page.evaluate(async () => {
        const mock = await import('/src/mocks/service.ts');
        mock.setOperationDelay('listOrders', null);
    });
    await expect(ordersPanel.getByRole('link', { name: 'Mở danh sách đơn hàng' })).toBeVisible();
});

test('UI007 order query 503 is isolated from the primary customer query and retries only that query', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/customers');
    await expect(page.getByRole('heading', { name: 'Khách hàng', exact: true })).toBeVisible();
    await setOperationFailure(page, 'listOrders', { status: 503, code: 'UI007_LIST_ORDERS_503', message: 'UI007_LIST_ORDERS_503' });
    await page.getByRole('row').filter({ hasText: 'Linh (khách mẫu)' }).getByRole('link', { name: 'Hồ sơ', exact: true }).click();
    let observeRetryRequests = false;
    const retryRequests: string[] = [];
    page.on('request', request => {
        if (!observeRetryRequests || request.method() !== 'GET') return;
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/v2/shops/shop-demo/')) retryRequests.push(url.pathname);
    });

    const ordersPanel = panel(page, 'Đơn hàng gần đây');
    await expect(page.getByRole('heading', { name: 'Linh (khách mẫu)', exact: true })).toBeVisible();
    await expect(ordersPanel.getByRole('alert').filter({ hasText: 'UI007_LIST_ORDERS_503' })).toBeVisible();
    await expect(ordersPanel.getByText('Chưa có đơn hoặc chưa đủ quyền.')).toHaveCount(0);
    await expect(page.getByText('Một số trường bị ẩn theo quyền. Giá trị đã che sẽ không được gửi lại khi lưu.')).toBeVisible();
    const shipmentsPanel = panel(page, 'Vận đơn liên quan');
    await expect(shipmentsPanel.getByText(/chưa thể đối chiếu vận đơn/i)).toBeVisible();
    await expect(shipmentsPanel.getByText(/Chưa tìm thấy vận đơn/)).toHaveCount(0);

    await setOperationFailure(page, 'listOrders', null);
    const retriedOrders = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && response.status() === 200 && url.pathname.endsWith('/orders') && url.searchParams.get('customerId') === 'c1';
    });
    observeRetryRequests = true;
    await ordersPanel.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await retriedOrders;
    await expect(ordersPanel.getByText('DH-DEMO-PAID-01', { exact: true })).toBeVisible();
    expect(retryRequests).toEqual(['/api/v2/shops/shop-demo/orders']);
});

test('UI007 forbidden order query is an access state and a successful empty query is distinct', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/customers');
    await expect(page.getByRole('heading', { name: 'Khách hàng', exact: true })).toBeVisible();
    await setOperationFailure(page, 'listOrders', { status: 403, code: 'UI007_LIST_ORDERS_403', message: 'UI007_LIST_ORDERS_403' });
    await page.getByRole('row').filter({ hasText: 'Linh (khách mẫu)' }).getByRole('link', { name: 'Hồ sơ', exact: true }).click();
    const ordersPanel = panel(page, 'Đơn hàng gần đây');
    await expect(ordersPanel.getByRole('alert').filter({ hasText: 'UI007_LIST_ORDERS_403' })).toBeVisible();
    await expect(ordersPanel.getByRole('button', { name: 'Thử lại', exact: true })).toHaveCount(0);

    await page.getByRole('link', { name: 'Danh sách khách', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Khách hàng', exact: true })).toBeVisible();
    await setOperationFailure(page, 'listOrders', null);
    await page.getByRole('row').filter({ hasText: 'Minh (khách mẫu)' }).getByRole('link', { name: 'Hồ sơ', exact: true }).click();
    const emptyOrdersPanel = panel(page, 'Đơn hàng gần đây');
    await expect(page.getByRole('heading', { name: 'Minh (khách mẫu)', exact: true })).toBeVisible();
    await expect(emptyOrdersPanel.getByText('Khách hàng này chưa có đơn hàng.', { exact: true })).toBeVisible();
    await expect(emptyOrdersPanel.getByRole('link', { name: 'Mở danh sách đơn hàng' })).toBeVisible();
    await expect(emptyOrdersPanel.getByText(/hiển thị tối đa 10 đơn/)).toBeVisible();
});

test('UI007 supplier and offer failures keep purchase suggestions visible and have operation-specific recovery', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/customers');
    await expect(page.getByRole('heading', { name: 'Khách hàng', exact: true })).toBeVisible();
    await setOperationFailure(page, 'listSupplierOffers', { status: 503, code: 'UI007_OFFERS_503', message: 'UI007_OFFERS_503' });
    await setOperationFailure(page, 'listSuppliers', { status: 403, code: 'UI007_SUPPLIERS_403', message: 'UI007_SUPPLIERS_403' });
    const suggestionResponses: number[] = [];
    page.on('response', response => {
        const url = new URL(response.url());
        if (url.pathname.endsWith('/purchase-suggestions')) suggestionResponses.push(response.status());
    });
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Đề nghị nhập', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Nhập lại hàng', exact: true })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Trạng thái danh sách báo giá' }).getByRole('alert').filter({ hasText: 'UI007_OFFERS_503' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Trạng thái danh sách nhà cung cấp' }).getByRole('alert').filter({ hasText: 'UI007_SUPPLIERS_403' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thử lại danh sách báo giá', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thử lại danh sách nhà cung cấp', exact: true })).toHaveCount(0);
    expect(suggestionResponses).toContain(200);
    await expect(page.getByRole('table', { name: 'Dữ liệu' })).toBeVisible();

    await setOperationFailure(page, 'listSupplierOffers', null);
    let observeRetryRequests = false;
    const retryRequests: string[] = [];
    page.on('request', request => {
        if (!observeRetryRequests || request.method() !== 'GET') return;
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/v2/shops/shop-demo/')) retryRequests.push(url.pathname);
    });
    const offerRetry = page.waitForResponse(response => response.request().method() === 'GET' && response.status() === 200 && new URL(response.url()).pathname.endsWith('/supplier-offers'));
    observeRetryRequests = true;
    await page.getByRole('button', { name: 'Thử lại danh sách báo giá', exact: true }).click();
    await offerRetry;
    await expect(page.getByRole('group', { name: 'Trạng thái danh sách nhà cung cấp' }).getByRole('alert').filter({ hasText: 'UI007_SUPPLIERS_403' })).toBeVisible();
    expect(retryRequests).toEqual(['/api/v2/shops/shop-demo/supplier-offers']);
});

test('UI007 auto-send budget query is lazy, permission-aware, and blocks an unverified budget', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/customers');
    await expect(page.getByRole('heading', { name: 'Khách hàng', exact: true })).toBeVisible();
    await setOperationFailure(page, 'listBudgetPolicies', { status: 403, code: 'UI007_BUDGETS_403', message: 'UI007_BUDGETS_403' });
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Đề nghị nhập', exact: true }).click();
    await page.getByRole('tab', { name: 'Quy tắc theo SKU', exact: true }).click();
    await page.getByRole('button', { name: 'Chỉnh quy tắc', exact: true }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Quy tắc nhập lại' });
    await dialog.getByRole('combobox', { name: 'Mức tự động' }).click();
    const budgetResponse = page.waitForResponse(response => response.request().method() === 'GET' && response.status() === 403 && new URL(response.url()).pathname.endsWith('/budget-policies'));
    await page.getByRole('option', { name: '3 · Tự gửi trong hạn mức', exact: true }).click();
    expect((await budgetResponse).status()).toBe(403);
    await expect(dialog.getByRole('group', { name: 'Trạng thái chính sách ngân sách mua hàng' }).getByRole('alert').filter({ hasText: 'UI007_BUDGETS_403' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Thử lại chính sách ngân sách', exact: true })).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Lưu quy tắc', exact: true })).toBeDisabled();
});
