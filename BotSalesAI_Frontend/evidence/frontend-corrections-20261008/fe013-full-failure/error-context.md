# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fe013.spec.ts >> FE013.AC01–AC04 stale claim conflict is visible; pick, pack, dispatch and delivery use current API versions once
- Location: tests\fe013.spec.ts:65:1

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: page.waitForResponse: Test timeout of 180000ms exceeded.
```

```
Error: locator.click: Test timeout of 180000ms exceeded.
Call log:
  - waiting for getByRole('dialog', { name: 'Phiếu chuẩn bị DH-1001' }).getByRole('button', { name: 'Xác nhận dòng đã kiểm' })
    - locator resolved to <button disabled tabindex="-1" type="button" class="MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium MuiButton-colorPrimary MuiButton-disableElevation Mui-disabled MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium MuiButton-colorPrimary MuiButton-disableElevation css-z9f412">Xác nhận dòng đã kiểm</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    351 × waiting for element to be visible, enabled and stable
        - element is not enabled
      - retrying click action
        - waiting 500ms

```

# Test source

```ts
  8   | test.beforeAll(async () => {
  9   |     const server = await startDemoServer();
  10  |     demoUrl = server.url;
  11  |     closeDemo = server.close;
  12  | });
  13  | 
  14  | test.afterAll(async () => closeDemo?.());
  15  | 
  16  | async function gotoDemo(page: import('@playwright/test').Page, path: string) {
  17  |     await page.goto(new URL(path, demoUrl).toString());
  18  | }
  19  | 
  20  | async function chooseOption(page: import('@playwright/test').Page, label: string, value: string) {
  21  |     await page.getByRole('combobox', { name: label }).click();
  22  |     await page.getByRole('option', { name: value, exact: true }).click();
  23  | }
  24  | 
  25  | async function confirmSeedOrder(page: import('@playwright/test').Page) {
  26  |     await gotoDemo(page, '/s/shop-demo/orders/DH-1001');
  27  |     await expect(page.getByRole('heading', { name: 'Đơn DH-1001', exact: true })).toBeVisible();
  28  |     const quote = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-1001/quote'));
  29  |     await page.getByRole('button', { name: 'Lấy báo giá hiện tại' }).click();
  30  |     expect((await quote).status()).toBe(200);
  31  |     const consent = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/customer-confirmations'));
  32  |     await page.getByRole('button', { name: 'Mô phỏng khách đồng ý báo giá' }).click();
  33  |     expect((await consent).status()).toBe(200);
  34  |     const confirmation = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-1001/confirm'));
  35  |     await page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng' }).click();
  36  |     expect((await confirmation).status()).toBe(202);
  37  |     await expect(page.getByRole('link', { name: 'Chuẩn bị đơn' })).toBeVisible();
  38  | }
  39  | 
  40  | test('FE013.C04 shipping preview distinguishes missing address, unserviceable zone, and expired mock quote', async ({ page }) => {
  41  |     const writes: string[] = [];
  42  |     page.on('request', request => {
  43  |         const url = new URL(request.url());
  44  |         if (url.pathname.includes('/shops/') && request.method() !== 'GET') writes.push(`${request.method()} ${url.pathname}`);
  45  |     });
  46  |     await gotoDemo(page, '/s/shop-demo/shipments');
  47  |     await expect(page.getByRole('heading', { name: 'Vận đơn & giao hàng', exact: true })).toBeVisible();
  48  |     await expect(page.getByRole('heading', { name: 'Xem trước phí & vùng giao hàng', exact: true })).toBeVisible();
  49  |     await expect(page.getByText(/DỮ LIỆU MÔ PHỎNG/)).toBeVisible();
  50  |     await expect(page.getByText(/Ước tính mẫu:.*VND/)).toBeVisible();
  51  | 
  52  |     await chooseOption(page, 'Vùng giao thử', 'Ngoài vùng phục vụ (mẫu)');
  53  |     await expect(page.getByText(/không được phục vụ; không hiển thị báo giá/)).toBeVisible();
  54  |     await expect(page.getByText(/Ước tính mẫu:/)).toHaveCount(0);
  55  | 
  56  |     await chooseOption(page, 'Vùng giao thử', 'Nội thành (mẫu)');
  57  |     await page.getByRole('checkbox', { name: 'Báo giá mẫu còn hiệu lực' }).uncheck();
  58  |     await expect(page.getByText(/Báo giá mẫu đã hết hiệu lực/)).toBeVisible();
  59  |     await page.getByRole('checkbox', { name: 'Báo giá mẫu còn hiệu lực' }).check();
  60  |     await page.getByRole('checkbox', { name: 'Có địa chỉ giao hàng mẫu' }).uncheck();
  61  |     await expect(page.getByText(/Thiếu địa chỉ giao hàng/)).toBeVisible();
  62  |     expect(writes).toEqual([]);
  63  | });
  64  | 
  65  | test('FE013.AC01–AC04 stale claim conflict is visible; pick, pack, dispatch and delivery use current API versions once', async ({ page }) => {
  66  |     const calls: Array<{ method: string; path: string; body: string | null; headers: Record<string, string> }> = [];
  67  |     page.on('request', request => {
  68  |         const url = new URL(request.url());
  69  |         if (url.pathname.includes('/shops/')) calls.push({ method: request.method(), path: url.pathname, body: request.postData(), headers: request.headers() });
  70  |     });
  71  | 
  72  |     await confirmSeedOrder(page);
  73  |     await page.getByRole('link', { name: 'Chuẩn bị đơn' }).click();
  74  |     const prepRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
  75  |     await expect(prepRow).toBeVisible();
  76  |     await chooseOption(page, 'Trạng thái thử', 'Xung đột lần ghi tiếp');
  77  |     await prepRow.getByRole('button', { name: 'Mở phiếu lấy hàng' }).click();
  78  |     const prepDialog = page.getByRole('dialog', { name: 'Phiếu chuẩn bị DH-1001' });
  79  |     await expect(prepDialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' })).toBeVisible();
  80  | 
  81  |     const rejectedClaim = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/claim'));
  82  |     const rejectedClaimRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/claim'));
  83  |     await prepDialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' }).click();
  84  |     const rejectedRequest = await rejectedClaimRequest;
  85  |     expect(JSON.parse(rejectedRequest.postData() || 'null')).toEqual({ expectedVersion: 1 });
  86  |     expect(rejectedRequest.headers()['idempotency-key']).toBeTruthy();
  87  |     expect((await rejectedClaim).status()).toBe(412);
  88  |     await expect(prepDialog.getByRole('alert').filter({ hasText: 'thay đổi bởi người khác' })).toBeVisible();
  89  |     await expect(prepDialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' })).toBeVisible();
  90  |     await expect(prepDialog.getByRole('button', { name: 'Tải lại trạng thái' })).toBeVisible();
  91  |     await prepDialog.getByRole('button', { name: 'Tải lại trạng thái' }).click();
  92  |     await expect(prepDialog.getByRole('button', { name: 'Tải lại trạng thái' })).toHaveCount(0);
  93  |     await prepDialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
  94  |     await chooseOption(page, 'Trạng thái thử', 'Bình thường');
  95  |     await prepRow.getByRole('button', { name: 'Mở phiếu lấy hàng' }).click();
  96  | 
  97  |     const claimRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/claim'));
  98  |     const claimResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/claim'));
  99  |     await prepDialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' }).click();
  100 |     const claimReq = await claimRequest;
  101 |     expect(JSON.parse(claimReq.postData() || 'null')).toEqual({ expectedVersion: 1 });
  102 |     expect(claimReq.headers()['idempotency-key']).toBeTruthy();
  103 |     expect((await claimResponse).status()).toBe(200);
  104 |     await expect(prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' })).toBeVisible();
  105 | 
  106 |     const wrongSku = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.includes('/prep-jobs/') && new URL(response.url()).pathname.endsWith('/pick'));
  107 |     await prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' }).fill('SKU-SAI');
> 108 |     await prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' }).click();
      |                                                                             ^ Error: locator.click: Test timeout of 180000ms exceeded.
  109 |     expect((await wrongSku).status()).toBe(422);
  110 |     await expect(prepDialog.getByRole('alert').filter({ hasText: 'Mã SKU không khớp' })).toBeVisible();
  111 |     await expect(prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' })).toHaveValue('SKU-SAI');
  112 | 
  113 |     const quantity = prepDialog.getByRole('spinbutton', { name: 'Số lượng đã lấy' });
  114 |     await quantity.fill('1.5');
  115 |     await expect(quantity).toHaveAttribute('aria-invalid', 'true');
  116 |     await expect(prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' })).toBeDisabled();
  117 |     await quantity.fill('0');
  118 |     await prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' }).fill('AO-002');
  119 |     await prepDialog.getByRole('textbox', { name: 'Vấn đề phát hiện (để trống khi đạt)' }).fill('Thiếu hàng khi kiểm thực tế');
  120 |     const partialPick = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/pick'));
  121 |     await prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' }).click();
  122 |     expect((await partialPick).status()).toBe(200);
  123 |     await expect(prepDialog.getByText('0/1', { exact: true })).toBeVisible();
  124 |     await expect(prepDialog.getByRole('button', { name: 'Xác nhận đã đóng gói' })).toBeDisabled();
  125 | 
  126 |     await quantity.fill('1');
  127 |     await prepDialog.getByRole('textbox', { name: 'Vấn đề phát hiện (để trống khi đạt)' }).fill('');
  128 |     const completedPick = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/pick'));
  129 |     await prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' }).click();
  130 |     expect((await completedPick).status()).toBe(200);
  131 |     await expect(prepDialog.getByRole('button', { name: 'Xác nhận đã đóng gói' })).toBeEnabled();
  132 | 
  133 |     await prepDialog.getByRole('button', { name: 'Xác nhận đã đóng gói' }).click();
  134 |     const packDialog = page.getByRole('dialog', { name: 'Hoàn tất đóng gói' });
  135 |     const packResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/pack'));
  136 |     await packDialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  137 |     expect((await packResponse).status()).toBe(200);
  138 |     await expect(prepDialog.getByText('Đã đóng gói', { exact: true })).toBeVisible();
  139 |     await prepDialog.getByRole('link', { name: 'Tạo vận đơn để bàn giao' }).click();
  140 |     await page.getByRole('button', { name: 'Tạo vận đơn', exact: true }).click();
  141 |     const createDialog = page.getByRole('dialog', { name: 'Tạo vận đơn' });
  142 |     await expect(createDialog.getByRole('combobox', { name: 'Đơn đã đóng gói' })).toHaveText('DH-1001');
  143 |     const createRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/shipments'));
  144 |     const createResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/shipments'));
  145 |     await createDialog.getByRole('button', { name: 'Tạo bản vận chuyển' }).click();
  146 |     const shipmentCreate = await createRequest;
  147 |     expect(JSON.parse(shipmentCreate.postData() || 'null')).toMatchObject({ orderId: 'DH-1001', warehouseId: 'warehouse-01', carrierId: null, orderLineIds: ['ol-1001'] });
  148 |     expect(shipmentCreate.headers()['idempotency-key']).toBeTruthy();
  149 |     expect((await createResponse).status()).toBe(201);
  150 | 
  151 |     await page.getByRole('button', { name: 'Tạo vận đơn', exact: true }).click();
  152 |     const replay = page.getByRole('dialog', { name: 'Tạo vận đơn' });
  153 |     await replay.getByRole('combobox', { name: 'Đơn đã đóng gói' }).click();
  154 |     await page.getByRole('option', { name: 'DH-1001', exact: true }).click();
  155 |     const duplicateCreate = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/shipments'));
  156 |     await replay.getByRole('button', { name: 'Tạo bản vận chuyển' }).click();
  157 |     expect((await duplicateCreate).status()).toBe(409);
  158 |     await expect(replay.getByRole('alert').filter({ hasText: 'Đơn đã có vận đơn' })).toBeVisible();
  159 |     await replay.getByRole('button', { name: 'Hủy', exact: true }).click();
  160 | 
  161 |     const shipmentRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
  162 |     await expect(shipmentRow).toBeVisible();
  163 |     await shipmentRow.getByRole('button', { name: 'Bàn giao' }).click();
  164 |     const handoverDialog = page.getByRole('dialog', { name: 'Xác nhận bàn giao kiện hàng' });
  165 |     await expect(handoverDialog.getByText('Chưa có sự kiện.', { exact: true })).toBeVisible();
  166 |     const handoverRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/handover'));
  167 |     const handoverResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/handover'));
  168 |     await handoverDialog.getByRole('button', { name: 'Xác nhận bàn giao' }).click();
  169 |     const handoverReq = await handoverRequest;
  170 |     expect(JSON.parse(handoverReq.postData() || 'null')).toMatchObject({ expectedVersion: 1 });
  171 |     expect(handoverReq.headers()['idempotency-key']).toBeTruthy();
  172 |     expect((await handoverResponse).status()).toBe(202);
  173 |     const shipmentDetailDialog = page.getByRole('dialog', { name: 'Chi tiết vận đơn' });
  174 |     await expect(shipmentDetailDialog.getByRole('heading', { name: 'Chi tiết vận đơn' })).toBeVisible();
  175 |     expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/handover'))).toHaveLength(1);
  176 | 
  177 |     await expect(shipmentDetailDialog.getByText('Đã bàn giao', { exact: true })).toBeVisible();
  178 |     await shipmentDetailDialog.getByRole('button', { name: 'Cập nhật hành trình' }).click();
  179 |     const eventDialog = page.getByRole('dialog', { name: 'Cập nhật hành trình có bằng chứng' });
  180 |     await chooseOption(page, 'Sự kiện', 'Khách đã nhận hàng');
  181 |     await eventDialog.getByRole('textbox', { name: 'Mã sự kiện bên vận chuyển' }).fill('carrier-event-delivered-1001');
  182 |     await eventDialog.getByRole('textbox', { name: 'Mã bằng chứng' }).fill('proof-delivery-1001');
  183 |     const eventResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/events'));
  184 |     await eventDialog.getByRole('button', { name: 'Ghi sự kiện' }).click();
  185 |     expect((await eventResponse).status()).toBe(200);
  186 |     const deliveredRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
  187 |     await expect(deliveredRow).toContainText('Đã giao');
  188 |     await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toBeVisible();
  189 |     expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/handover'))).toHaveLength(1);
  190 |     await page.getByRole('link', { name: 'DH-1001', exact: true }).click();
  191 |     await expect(page.getByRole('heading', { name: 'Đơn DH-1001', exact: true })).toBeVisible();
  192 |     await expect(page.getByText('Đã giao', { exact: true })).toBeVisible();
  193 |     await expect(page.getByText('Chưa thu', { exact: true })).toBeVisible();
  194 |     await expect(page.getByRole('link', { name: 'Tạo yêu cầu trả hàng' })).toBeVisible();
  195 |     await expect(page.getByRole('button', { name: 'Ghi nhận tiền đã thu' })).toBeVisible();
  196 | });
  197 | 
  198 | test('FE013.AC03 unknown handover cannot be repeated before command reconciliation', async ({ page }) => {
  199 |     await confirmSeedOrder(page);
  200 |     await page.getByRole('link', { name: 'Chuẩn bị đơn' }).click();
  201 |     const prepRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
  202 |     await expect(prepRow).toBeVisible();
  203 |     await prepRow.getByRole('button', { name: 'Mở phiếu lấy hàng' }).click();
  204 |     const prepDialog = page.getByRole('dialog', { name: 'Phiếu chuẩn bị DH-1001' });
  205 |     const claim = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/claim'));
  206 |     await prepDialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' }).click();
  207 |     expect((await claim).status()).toBe(200);
  208 |     await prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' }).fill('AO-002');
```