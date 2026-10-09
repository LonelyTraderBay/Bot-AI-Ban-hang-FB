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

test('FE012.AC01 searchable customer and product pickers submit contract-shaped draft and reject fractional quantity', async ({ page }) => {
    const calls = observeShopRequests(page);
    await gotoDemo(page, '/s/shop-demo/orders/new');
    await expect(page.getByRole('heading', { name: 'Tạo đơn hàng', exact: true })).toBeVisible();

    const customerSearch = page.waitForRequest(request => {
        const url = new URL(request.url());
        return request.method() === 'GET' && url.pathname.endsWith('/customers') && url.searchParams.get('q') === 'Linh';
    });
    await page.getByRole('textbox', { name: 'Tìm khách hàng' }).fill('Linh');
    await customerSearch;
    await chooseOption(page, 'Khách hàng', 'Linh (khách mẫu)');
    await chooseOption(page, 'Hội thoại liên quan', 'Linh (khách mẫu) · cv1');

    const productSearch = page.waitForRequest(request => {
        const url = new URL(request.url());
        return request.method() === 'GET' && url.pathname.endsWith('/products') && url.searchParams.get('q') === 'AO-002';
    });
    await page.getByRole('textbox', { name: 'Tìm sản phẩm hoặc SKU' }).fill('AO-002');
    await productSearch;
    await chooseOption(page, 'Sản phẩm 1', 'Áo thun Essential · L · Than · AO-002');

    const quantity = page.getByRole('textbox', { name: 'Số lượng' });
    await quantity.fill('1.5');
    const save = page.getByRole('button', { name: 'Lưu đơn nháp' });
    await expect(quantity).toHaveAttribute('aria-invalid', 'true');
    await expect(save).toBeDisabled();
    expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/orders'))).toHaveLength(0);

    await quantity.fill('2');
    const createRequest = page.waitForRequest(request => request.method() === 'POST' && request.url().includes('/api/v2/shops/shop-demo/orders'));
    await save.click();
    const request = await createRequest;
    const body = JSON.parse(request.postData() || 'null');
    expect(body).toEqual({
        customerId: 'c1', conversationId: 'cv1', warehouseId: 'warehouse-01',
        lines: [{ variantId: 'v-p2', quantity: 2 }], notes: '', paymentMethod: 'cod', shippingAddressId: null,
    });
    expect(request.headers()['idempotency-key']).toBeTruthy();
    await expect(page.getByRole('heading', { name: /^Đơn order-/ })).toBeVisible();
    await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toBeVisible();

    const orderId = new URL(page.url()).pathname.split('/').pop() || '';
    const quoteResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/orders/${orderId}/quote`));
    await page.getByRole('button', { name: 'Lấy báo giá hiện tại' }).click();
    const quote = await (await quoteResponse).json();
    expect(quote.data.orderVersion).toBe(1);
    const customerConfirmation = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/customer-confirmations'));
    await page.getByRole('button', { name: 'Mô phỏng khách đồng ý báo giá' }).click();
    await customerConfirmation;
    const missingAddress = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/orders/${orderId}/confirm`));
    await page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng' }).click();
    expect((await missingAddress).status()).toBe(422);
    await expect(page.getByRole('alert').filter({ hasText: 'Thiếu địa chỉ giao hàng' })).toBeVisible();
    await expect(page.getByText('Chưa có địa chỉ được xác minh', { exact: true })).toBeVisible();
    await expect(page.getByText('Bản nháp', { exact: true })).toBeVisible();
});

test('FE012 demo address choice is labeled synthetic and completes the mock order flow', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/orders/new');
    await expect(page.getByText(/Địa chỉ mẫu chỉ phục vụ nghiệm thu giao diện/)).toBeVisible();
    await chooseOption(page, 'Khách hàng', 'Linh (khách mẫu)');
    await chooseOption(page, 'Hội thoại liên quan', 'Linh (khách mẫu) · cv1');
    await chooseOption(page, 'Sản phẩm 1', 'Áo thun Essential · L · Than · AO-002');
    await chooseOption(page, 'Địa chỉ giao hàng (mẫu demo)', 'Địa chỉ mẫu · shop-demo (chỉ dùng trong demo)');

    const createResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders'));
    await page.getByRole('button', { name: 'Lưu đơn nháp' }).click();
    const created = await createResponse;
    expect(created.status()).toBe(201);
    expect(JSON.parse(created.request().postData() || 'null').shippingAddressId).toBe('address-synthetic');

    await expect(page.getByRole('heading', { name: /^Đơn order-/ })).toBeVisible();
    const orderId = new URL(page.url()).pathname.split('/').pop() || '';
    const quoteResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/orders/${orderId}/quote`));
    await page.getByRole('button', { name: 'Lấy báo giá hiện tại' }).click();
    const quote = await quoteResponse;
    expect((await quote.json()).data.orderVersion).toBe(1);
    const confirmationResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/customer-confirmations'));
    await page.getByRole('button', { name: 'Mô phỏng khách đồng ý báo giá' }).click();
    await confirmationResponse;
    const confirmResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/orders/${orderId}/confirm`));
    await page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng' }).click();
    expect((await confirmResponse).status()).toBe(202);
    await expect(page.getByText('Đã xác nhận', { exact: true })).toBeVisible({ timeout: 15000 });
});

test('FE012.AC01 editing lines invalidates quote and customer consent; a new quote is required before confirmation', async ({ page }) => {
    const calls = observeShopRequests(page);
    await gotoDemo(page, '/s/shop-demo/orders/DH-1001');
    await expect(page.getByRole('heading', { name: 'Đơn DH-1001', exact: true })).toBeVisible();

    const firstQuoteResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-1001/quote'));
    await page.getByRole('button', { name: 'Lấy báo giá hiện tại' }).click();
    const firstQuoteEnvelope = await (await firstQuoteResponse).json();
    const firstQuoteId = firstQuoteEnvelope.data.id as string;
    await page.getByRole('button', { name: 'Mô phỏng khách đồng ý báo giá' }).click();
    const firstConfirmation = await page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/customer-confirmations'));
    expect((await firstConfirmation.json()).data.quoteId).toBe(firstQuoteId);
    await expect(page.getByText(/Đã ghi nhận bằng chứng/)).toBeVisible();

    await page.getByRole('button', { name: 'Sửa đơn nháp' }).click();
    await page.getByRole('textbox', { name: 'Số lượng' }).fill('2');
    const updateResponse = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith('/orders/DH-1001'));
    await page.getByRole('button', { name: 'Lưu đơn nháp' }).click();
    expect((await updateResponse).status()).toBe(200);
    await expect(page.getByText(`Mã báo giá: ${firstQuoteId}`, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng' })).toHaveCount(0);

    const secondQuoteResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-1001/quote'));
    await page.getByRole('button', { name: 'Lấy báo giá hiện tại' }).click();
    const secondQuoteEnvelope = await (await secondQuoteResponse).json();
    const secondQuote = secondQuoteEnvelope.data;
    expect(secondQuote.id).not.toBe(firstQuoteId);
    expect(secondQuote.orderVersion).toBeGreaterThan(firstQuoteEnvelope.data.orderVersion);

    await page.getByRole('button', { name: 'Mô phỏng khách đồng ý báo giá' }).click();
    const confirmationResponse = await page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/customer-confirmations'));
    const confirmation = (await confirmationResponse.json()).data;
    expect(confirmation.quoteId).toBe(secondQuote.id);

    await chooseOption(page, 'Trạng thái thử', 'Tải chậm');
    const confirmRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/orders/DH-1001/confirm'));
    const confirmResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-1001/confirm'));
    await page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng' }).click();
    await expect(page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng' })).toBeDisabled();
    await expect(page.getByText('Bản nháp', { exact: true })).toBeVisible();
    await expect(page.getByText('Đã xác nhận', { exact: true })).toHaveCount(0);
    // Firefox surfaces service-worker requests after the mock's 1.5s delay; assert
    // the pending UI before waiting for that event so this checks no optimistic success.
    await confirmRequest;
    const accepted = await confirmResponse;
    expect(accepted.status()).toBe(202);
    expect(JSON.parse(accepted.request().postData() || 'null')).toMatchObject({ expectedVersion: secondQuote.orderVersion, quoteId: secondQuote.id, customerConfirmationId: confirmation.id });

    await expect(page.getByText('Đã xác nhận', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Đã giữ hàng', { exact: true })).toBeVisible();
    expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/orders/DH-1001/confirm'))).toHaveLength(1);

    await page.getByRole('link', { name: 'Tồn kho', exact: true }).click();
    await page.getByRole('textbox', { name: 'Tìm kiếm' }).fill('AO-002');
    await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    const stockRow = page.getByRole('row').filter({ hasText: 'AO-002' });
    await expect(stockRow.getByRole('cell').nth(2)).toHaveText('2');
    expect(calls.some(call => call.method === 'GET' && call.path.includes('/inventory'))).toBeTruthy();
});

test('FE012.AC03 mock stale-version 412 preserves draft fields and does not show success', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/orders/DH-1001');
    await chooseOption(page, 'Trạng thái thử', 'Xung đột lần ghi tiếp');
    await expect(page.getByRole('status').filter({ hasText: 'Trạng thái thử đã được áp dụng.' })).toBeVisible();
    await page.getByRole('button', { name: 'Sửa đơn nháp' }).click();
    const staleNotes = page.getByRole('textbox', { name: 'Ghi chú chuẩn bị' });
    await staleNotes.fill('Bản chỉnh sửa cần giữ lại khi có xung đột');
    const staleSave = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith('/orders/DH-1001'));
    await page.getByRole('button', { name: 'Lưu đơn nháp' }).click();
    expect((await staleSave).status()).toBe(412);
    const comparison=page.getByRole('dialog',{name:'Đối chiếu thay đổi',exact:true});
    await expect(comparison).toBeVisible();
    await expect(comparison.getByText('Bản chỉnh sửa cần giữ lại khi có xung đột',{exact:true})).toBeVisible();
    await comparison.getByRole('button',{name:'Áp dụng vào bản nháp',exact:true}).click();
    await expect(staleNotes).toHaveValue('Bản chỉnh sửa cần giữ lại khi có xung đột');
});

test('FE012.AC03 offline state blocks quote mutation while retaining the loaded draft', async ({ page }) => {
    const calls = observeShopRequests(page);
    await gotoDemo(page, '/s/shop-demo/orders/DH-1001');
    await expect(page.getByRole('heading', { name: 'Đơn DH-1001', exact: true })).toBeVisible();
    await page.context().setOffline(true);
    const quote = page.getByRole('button', { name: 'Lấy báo giá hiện tại' });
    await expect(quote).toBeDisabled();
    expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/orders/DH-1001/quote'))).toHaveLength(0);
    await expect(page.getByText('Bản nháp', { exact: true })).toBeVisible();
    await page.context().setOffline(false);
});

test('FE012.AC03 unknown confirm outcome blocks duplicate writes until shared command recovery is available', async ({ page, browserName }) => {
    const calls = observeShopRequests(page);
    if (browserName === 'firefox') {
        // Playwright Firefox does not implement Chromium's clipboard permission grant.
        // Keep this engine's test focused on the copy control calling the browser API.
        await page.addInitScript(() => {
            let clipboardText = '';
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: {
                    writeText: async (value: string) => { clipboardText = value; },
                    readText: async () => clipboardText,
                },
            });
        });
    }
    await gotoDemo(page, '/s/shop-demo/orders/DH-1001');
    await page.getByRole('button', { name: 'Lấy báo giá hiện tại' }).click();
    await expect(page.getByRole('button', { name: 'Mô phỏng khách đồng ý báo giá' })).toBeVisible();
    await page.getByRole('button', { name: 'Mô phỏng khách đồng ý báo giá' }).click();
    await expect(page.getByText(/Đã ghi nhận bằng chứng/)).toBeVisible();
    await chooseOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');

    const unknownResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-1001/confirm'));
    await page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng' }).click();
    const unknownResult = await unknownResponse;
    expect(unknownResult.status()).toBe(202);
    const unknownCommand = (await unknownResult.json()).data;
    expect(unknownCommand.status).toBe('unknown');
    await expect(page.getByRole('alert').filter({ hasText: 'Chưa xác minh được kết quả' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Mã lệnh cần kiểm tra/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kiểm tra trạng thái lệnh' })).toBeVisible();
    if (browserName !== 'firefox')
        await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Sao chép mã lệnh' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Đã sao chép mã lệnh.' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(unknownCommand.id);
    expect(calls.find(call => call.method === 'POST' && call.path.endsWith('/orders/DH-1001/confirm'))?.headers['idempotency-key']).toBeTruthy();
    const recoveryResponse = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith(`/commands/${unknownCommand.id}`));
    await page.getByRole('button', { name: 'Kiểm tra trạng thái lệnh' }).click();
    expect((await recoveryResponse).status()).toBe(200);
    await expect(page.getByText('Backend chưa xác minh kết quả. Thao tác tương ứng tiếp tục bị khóa.')).toBeVisible();
    expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/orders/DH-1001/confirm'))).toHaveLength(1);
    await expect(page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng' })).toHaveCount(0);
});

test('FE012.AC03 quote and customer confirmation expiration disable confirmation using API time', async ({ page }) => {
    const calls = observeShopRequests(page);
    await gotoDemo(page, '/s/shop-demo/orders/DH-1001');
    const quoteResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-1001/quote'));
    await page.getByRole('button', { name: 'Lấy báo giá hiện tại' }).click();
    const quote = await (await quoteResponse).json();
    expect(quote.data.expiresAt).toBeTruthy();
    const customerConfirmation = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/customer-confirmations'));
    await page.getByRole('button', { name: 'Mô phỏng khách đồng ý báo giá' }).click();
    await customerConfirmation;
    const confirm = page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng' });
    await expect(confirm).toBeEnabled();

    await page.clock.setFixedTime(new Date('2035-01-01T00:00:00.000Z'));
    await expect(page.getByRole('alert').filter({ hasText: 'Báo giá đã hết hạn' })).toBeVisible();
    await expect(confirm).toBeDisabled();
    await expect(page.getByText(/Bằng chứng khách đã hết hạn hoặc bị thay thế/)).toBeVisible();
    expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/orders/DH-1001/confirm'))).toHaveLength(0);
});

test('FE012.AC03 returns reject fractional/over-original quantities locally and preserve data on cumulative mock rejection', async ({ page }) => {
    const calls = observeShopRequests(page);
    await gotoDemo(page, '/s/shop-demo/returns?orderId=DH-DEMO-PAID-01');
    await page.getByRole('button', { name: 'Tạo yêu cầu trả' }).click();
    const dialog = page.getByRole('dialog', { name: 'Yêu cầu trả hàng' });
    const quantity = dialog.getByRole('spinbutton', { name: /tối đa 1/ });
    await dialog.getByRole('textbox', { name: 'Lý do trả' }).fill('Khách đổi ý trong thời hạn mẫu');

    await quantity.fill('1.5');
    await expect(dialog.getByRole('button', { name: 'Tạo yêu cầu' })).toBeDisabled();
    expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/returns'))).toHaveLength(0);
    await quantity.fill('2');
    await expect(dialog.getByRole('button', { name: 'Tạo yêu cầu' })).toBeDisabled();
    await quantity.fill('1');
    const returnResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/returns'));
    await dialog.getByRole('button', { name: 'Tạo yêu cầu' }).click();
    const rejected = await returnResponse;
    expect(rejected.status()).toBe(422);
    await expect(dialog.getByRole('alert').filter({ hasText: 'Số trả vượt số đã giao' })).toBeVisible();
    await expect(quantity).toHaveValue('1');
    await expect(dialog.getByRole('textbox', { name: 'Lý do trả' })).toHaveValue('Khách đổi ý trong thời hạn mẫu');
    expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/returns'))).toHaveLength(1);
});

test('FE012.AC04 return inspection loads the current case and applies accepted partial quantity to mock stock and refund', async ({ page }) => {
    const calls = observeShopRequests(page);
    const returnId = 'seed-returncase-10036';
    await gotoDemo(page, '/s/shop-demo/returns');
    const row = page.getByRole('row').filter({ hasText: returnId });
    const detailResponse = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith(`/returns/${returnId}`));
    await row.getByRole('button', { name: 'Kiểm nhận' }).click();
    expect((await detailResponse).status()).toBe(200);

    const dialog = page.getByRole('dialog', { name: 'Kiểm nhận hàng trả' });
    const acceptedQuantity = dialog.getByRole('spinbutton', { name: 'Số lượng nhận' });
    await expect(acceptedQuantity).toHaveValue('2');
    await acceptedQuantity.fill('1');
    await dialog.getByRole('combobox', { name: 'Tình trạng' }).click();
    await page.getByRole('option', { name: 'Bán lại được', exact: true }).click();
    const inspectRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith(`/returns/${returnId}/inspect`));
    const inspectResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/returns/${returnId}/inspect`));
    await dialog.getByRole('button', { name: 'Xác nhận kiểm nhận' }).click();
    const request = await inspectRequest;
    expect(JSON.parse(request.postData() || '{}')).toMatchObject({
        expectedVersion: 1,
        lines: [{ orderLineId: 'seed-ol-return-02', acceptedQuantity: 1, disposition: 'sellable' }],
    });
    const response = await inspectResponse;
    expect(response.status()).toBe(200);
    expect((await response.json()).data).toMatchObject({ state: 'inspected', refundObligation: { amount: '249000', currency: 'VND' } });
    await expect(dialog).toBeHidden();
    expect(calls.filter(call => call.method === 'POST' && call.path.endsWith(`/returns/${returnId}/inspect`))).toHaveLength(1);

    await row.getByRole('link', { name: 'DH-DEMO-RETURN-02', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Đơn DH-DEMO-RETURN-02', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ghi nhận khoản đã hoàn' }).click();
    const refundDialog = page.getByRole('dialog', { name: 'Ghi nhận tiền đã hoàn' });
    await refundDialog.getByRole('textbox', { name: 'Số tiền (VND)' }).fill('498000');
    await refundDialog.getByRole('textbox', { name: 'Mã tham chiếu giao dịch' }).fill('synthetic-refund-over-limit');
    await refundDialog.getByRole('textbox', { name: 'Mã chứng từ đã xác minh' }).fill('synthetic-refund-evidence');
    await refundDialog.getByRole('textbox', { name: 'Lý do' }).fill('Hoàn theo nghĩa vụ đã kiểm tra');
    const overRefund = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-DEMO-RETURN-02/refund'));
    await refundDialog.getByRole('button', { name: 'Ghi nhận chứng từ' }).click();
    expect((await overRefund).status()).toBe(422);
    await expect(refundDialog.getByRole('alert').filter({ hasText: 'Cần bằng chứng hoàn' })).toBeVisible();
    await expect(refundDialog.getByRole('textbox', { name: 'Số tiền (VND)' })).toHaveValue('498000');

    await refundDialog.getByRole('textbox', { name: 'Số tiền (VND)' }).fill('249000');
    await refundDialog.getByRole('textbox', { name: 'Mã tham chiếu giao dịch' }).fill('synthetic-refund-partial-01');
    const refundRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/orders/DH-DEMO-RETURN-02/refund'));
    const refundResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-DEMO-RETURN-02/refund'));
    await refundDialog.getByRole('button', { name: 'Ghi nhận chứng từ' }).click();
    expect(JSON.parse((await refundRequest).postData() || '{}')).toMatchObject({ expectedVersion: 3, amount: { amount: '249000', currency: 'VND' }, evidenceRef: 'synthetic-refund-evidence' });
    expect((await refundResponse).status()).toBe(202);
    await expect(page.getByText('Hoàn tiền một phần', { exact: true })).toBeVisible();
});

test('FE012.AC03 handed-over order routes to returns and exposes no ordinary cancel action', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/orders/DH-DEMO-PAID-01');
    await expect(page.getByRole('heading', { name: 'Đơn DH-DEMO-PAID-01', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hủy đơn' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Tạo yêu cầu trả hàng' })).toBeVisible();
});

test('FE012.AC05 order drafting remains usable without horizontal page overflow and passes focused axe checks', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/orders/new');
    for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.getByRole('heading', { name: 'Tạo đơn hàng', exact: true })).toBeVisible();
        const overflowsViewport = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(overflowsViewport, `order draft overflows at ${width}px`).toBe(false);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
});
