# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fe013.spec.ts >> FE013.AC01–AC04 stale claim conflict is visible; pick, pack, dispatch and delivery use current API versions once
- Location: tests/fe013.spec.ts:68:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('row').filter({ hasText: 'DH-1001' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('row').filter({ hasText: 'DH-1001' }) with timeout 5000ms
  - waiting for getByRole('row').filter({ hasText: 'DH-1001' })

```

```yaml
- dialog "Rời biểu mẫu chưa lưu?":
  - heading "Rời biểu mẫu chưa lưu?" [level=2]
  - paragraph: Các thay đổi trong biểu mẫu này chưa được lưu. Bạn có thể tiếp tục sửa hoặc bỏ thay đổi.
  - button "Tiếp tục sửa"
  - button "Bỏ thay đổi"
```

# Test source

```ts
  70  |     page.on('request', request => {
  71  |         const url = new URL(request.url());
  72  |         if (url.pathname.includes('/shops/')) calls.push({ method: request.method(), path: url.pathname, body: request.postData(), headers: request.headers() });
  73  |     });
  74  | 
  75  |     await confirmSeedOrder(page);
  76  |     await page.getByRole('link', { name: 'Chuẩn bị đơn' }).click();
  77  |     const prepRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
  78  |     await expect(prepRow).toBeVisible();
  79  |     await chooseOption(page, 'Trạng thái thử', 'Xung đột lần ghi tiếp');
  80  |     await prepRow.getByRole('button', { name: 'Mở phiếu lấy hàng' }).click();
  81  |     const prepDialog = page.getByRole('dialog', { name: 'Phiếu chuẩn bị DH-1001' });
  82  |     await expect(prepDialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' })).toBeVisible();
  83  | 
  84  |     const rejectedClaim = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/claim'));
  85  |     const rejectedClaimRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/claim'));
  86  |     await prepDialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' }).click();
  87  |     const rejectedRequest = await rejectedClaimRequest;
  88  |     expect(JSON.parse(rejectedRequest.postData() || 'null')).toEqual({ expectedVersion: 1 });
  89  |     expect(rejectedRequest.headers()['idempotency-key']).toBeTruthy();
  90  |     expect((await rejectedClaim).status()).toBe(412);
  91  |     await expect(prepDialog.getByRole('alert').filter({ hasText: 'thay đổi bởi người khác' })).toBeVisible();
  92  |     await expect(prepDialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' })).toBeVisible();
  93  |     await expect(prepDialog.getByRole('button', { name: 'Tải lại trạng thái' })).toBeVisible();
  94  |     await prepDialog.getByRole('button', { name: 'Tải lại trạng thái' }).click();
  95  |     await expect(prepDialog.getByRole('button', { name: 'Tải lại trạng thái' })).toHaveCount(0);
  96  |     await prepDialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
  97  |     await chooseOption(page, 'Trạng thái thử', 'Bình thường');
  98  |     await prepRow.getByRole('button', { name: 'Mở phiếu lấy hàng' }).click();
  99  | 
  100 |     const claimRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/claim'));
  101 |     const claimResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/claim'));
  102 |     await prepDialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' }).click();
  103 |     const claimReq = await claimRequest;
  104 |     expect(JSON.parse(claimReq.postData() || 'null')).toEqual({ expectedVersion: 1 });
  105 |     expect(claimReq.headers()['idempotency-key']).toBeTruthy();
  106 |     expect((await claimResponse).status()).toBe(200);
  107 |     await expect(prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' })).toBeVisible();
  108 |     // The claim response precedes query reconciliation; the dialog stays inert until it settles.
  109 |     await expect(prepDialog.getByRole('button', { name: 'Đóng', exact: true }).last()).toBeEnabled();
  110 |     await expect(prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' })).toBeEditable();
  111 | 
  112 |     const wrongSku = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.includes('/prep-jobs/') && new URL(response.url()).pathname.endsWith('/pick'));
  113 |     await prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' }).fill('SKU-SAI');
  114 |     await expect(prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' })).toHaveValue('SKU-SAI');
  115 |     await prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' }).click();
  116 |     expect((await wrongSku).status()).toBe(422);
  117 |     await expect(prepDialog.getByRole('alert').filter({ hasText: 'Mã SKU không khớp' })).toBeVisible();
  118 |     await expect(prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' })).toHaveValue('SKU-SAI');
  119 | 
  120 |     const quantity = prepDialog.getByRole('spinbutton', { name: 'Số lượng đã lấy' });
  121 |     await quantity.fill('1.5');
  122 |     await expect(quantity).toHaveAttribute('aria-invalid', 'true');
  123 |     await expect(prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' })).toBeDisabled();
  124 |     await quantity.fill('0');
  125 |     await prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' }).fill('AO-002');
  126 |     await prepDialog.getByRole('textbox', { name: 'Vấn đề phát hiện (để trống khi đạt)' }).fill('Thiếu hàng khi kiểm thực tế');
  127 |     const partialPick = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/pick'));
  128 |     await prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' }).click();
  129 |     expect((await partialPick).status()).toBe(200);
  130 |     await expect(prepDialog.getByRole('button', { name: 'Đóng', exact: true }).last()).toBeEnabled();
  131 |     await expect(prepDialog.getByText('0/1', { exact: true })).toBeVisible();
  132 |     await expect(prepDialog.getByRole('button', { name: 'Xác nhận đã đóng gói' })).toBeDisabled();
  133 | 
  134 |     await quantity.fill('1');
  135 |     await prepDialog.getByRole('textbox', { name: 'Vấn đề phát hiện (để trống khi đạt)' }).fill('');
  136 |     const completedPick = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/pick'));
  137 |     await prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' }).click();
  138 |     expect((await completedPick).status()).toBe(200);
  139 |     await expect(prepDialog.getByRole('button', { name: 'Xác nhận đã đóng gói' })).toBeEnabled();
  140 | 
  141 |     await prepDialog.getByRole('button', { name: 'Xác nhận đã đóng gói' }).click();
  142 |     const packDialog = page.getByRole('dialog', { name: 'Hoàn tất đóng gói' });
  143 |     const packResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/pack'));
  144 |     await packDialog.getByRole('button', { name: 'Xác nhận đã đóng gói', exact: true }).click();
  145 |     expect((await packResponse).status()).toBe(200);
  146 |     await expect(prepDialog.getByText('Đã đóng gói', { exact: true })).toBeVisible();
  147 |     await prepDialog.getByRole('link', { name: 'Tạo vận đơn để bàn giao' }).click();
  148 |     await page.getByRole('button', { name: 'Tạo vận đơn', exact: true }).click();
  149 |     const createDialog = page.getByRole('dialog', { name: 'Tạo vận đơn' });
  150 |     await expect(createDialog.getByRole('combobox', { name: 'Đơn đã đóng gói' })).toHaveText('DH-1001');
  151 |     const createRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/shipments'));
  152 |     const createResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/shipments'));
  153 |     await createDialog.getByRole('button', { name: 'Tạo bản vận chuyển' }).click();
  154 |     const shipmentCreate = await createRequest;
  155 |     expect(JSON.parse(shipmentCreate.postData() || 'null')).toMatchObject({ orderId: 'DH-1001', warehouseId: 'warehouse-01', carrierId: null, orderLineIds: ['ol-1001'] });
  156 |     expect(shipmentCreate.headers()['idempotency-key']).toBeTruthy();
  157 |     expect((await createResponse).status()).toBe(201);
  158 | 
  159 |     await page.getByRole('button', { name: 'Tạo vận đơn', exact: true }).click();
  160 |     const replay = page.getByRole('dialog', { name: 'Tạo vận đơn' });
  161 |     await replay.getByRole('combobox', { name: 'Đơn đã đóng gói' }).click();
  162 |     await page.getByRole('option', { name: 'DH-1001', exact: true }).click();
  163 |     const duplicateCreate = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/shipments'));
  164 |     await replay.getByRole('button', { name: 'Tạo bản vận chuyển' }).click();
  165 |     expect((await duplicateCreate).status()).toBe(409);
  166 |     await expect(replay.getByRole('alert').filter({ hasText: 'Đơn đã có vận đơn' })).toBeVisible();
  167 |     await replay.getByRole('button', { name: 'Hủy', exact: true }).click();
  168 | 
  169 |     const shipmentRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
> 170 |     await expect(shipmentRow).toBeVisible();
      |                               ^ Error: expect(locator).toBeVisible() failed
  171 |     await shipmentRow.getByRole('button', { name: 'Bàn giao' }).click();
  172 |     const handoverDialog = page.getByRole('dialog', { name: 'Xác nhận bàn giao kiện hàng' });
  173 |     await expect(handoverDialog.getByText('Chưa có sự kiện.', { exact: true })).toBeVisible();
  174 |     const handoverRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/handover'));
  175 |     const handoverResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/handover'));
  176 |     await handoverDialog.getByRole('button', { name: 'Xác nhận bàn giao' }).click();
  177 |     const handoverReq = await handoverRequest;
  178 |     expect(JSON.parse(handoverReq.postData() || 'null')).toMatchObject({ expectedVersion: 1 });
  179 |     expect(handoverReq.headers()['idempotency-key']).toBeTruthy();
  180 |     expect((await handoverResponse).status()).toBe(202);
  181 |     const shipmentDetailDialog = page.getByRole('dialog', { name: 'Chi tiết vận đơn' });
  182 |     await expect(shipmentDetailDialog.getByRole('heading', { name: 'Chi tiết vận đơn' })).toBeVisible();
  183 |     expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/handover'))).toHaveLength(1);
  184 | 
  185 |     await expect(shipmentDetailDialog.getByText('Đã bàn giao', { exact: true })).toBeVisible();
  186 |     await shipmentDetailDialog.getByRole('button', { name: 'Cập nhật hành trình' }).click();
  187 |     const eventDialog = page.getByRole('dialog', { name: 'Cập nhật hành trình có bằng chứng' });
  188 |     await chooseOption(page, 'Sự kiện', 'Khách đã nhận hàng');
  189 |     await eventDialog.getByRole('textbox', { name: 'Mã sự kiện bên vận chuyển' }).fill('carrier-event-delivered-1001');
  190 |     await eventDialog.getByLabel('Thời gian sự kiện').fill('2026-09-29T14:00');
  191 |     await eventDialog.getByRole('textbox', { name: 'Mã bằng chứng' }).fill('proof-delivery-1001');
  192 |     const eventResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/events'));
  193 |     await eventDialog.getByRole('button', { name: 'Ghi sự kiện' }).click();
  194 |     expect((await eventResponse).status()).toBe(200);
  195 |     const deliveredRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
  196 |     await expect(deliveredRow).toContainText('Đã giao');
  197 |     await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toBeVisible();
  198 |     expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/handover'))).toHaveLength(1);
  199 |     await page.getByRole('link', { name: 'Mã đơn: DH-1001', exact: true }).click();
  200 |     await expect(page.getByRole('heading', { name: 'Đơn DH-1001', exact: true })).toBeVisible();
  201 |     await expect(page.getByText('Đã giao', { exact: true })).toBeVisible();
  202 |     await expect(page.getByText('Chưa thu', { exact: true })).toBeVisible();
  203 |     await expect(page.getByRole('link', { name: 'Tạo yêu cầu trả hàng' })).toBeVisible();
  204 |     await expect(page.getByRole('button', { name: 'Ghi nhận tiền đã thu' })).toBeVisible();
  205 | });
  206 | 
  207 | test('FE013.AC03 unknown handover cannot be repeated before command reconciliation', async ({ page }) => {
  208 |     await confirmSeedOrder(page);
  209 |     await page.getByRole('link', { name: 'Chuẩn bị đơn' }).click();
  210 |     const prepRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
  211 |     await expect(prepRow).toBeVisible();
  212 |     await prepRow.getByRole('button', { name: 'Mở phiếu lấy hàng' }).click();
  213 |     const prepDialog = page.getByRole('dialog', { name: 'Phiếu chuẩn bị DH-1001' });
  214 |     const claim = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/claim'));
  215 |     await prepDialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' }).click();
  216 |     expect((await claim).status()).toBe(200);
  217 |     await expect(prepDialog.getByRole('button', { name: 'Đóng', exact: true }).last()).toBeEnabled();
  218 |     await expect(prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' })).toBeEditable();
  219 |     await prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' }).fill('AO-002');
  220 |     await expect(prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' })).toHaveValue('AO-002');
  221 |     await prepDialog.getByRole('spinbutton', { name: 'Số lượng đã lấy' }).fill('1');
  222 |     const pick = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/pick'));
  223 |     await prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' }).click();
  224 |     expect((await pick).status()).toBe(200);
  225 |     await prepDialog.getByRole('button', { name: 'Xác nhận đã đóng gói' }).click();
  226 |     const packDialog = page.getByRole('dialog', { name: 'Hoàn tất đóng gói' });
  227 |     const pack = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/pack'));
  228 |     await packDialog.getByRole('button', { name: 'Xác nhận đã đóng gói', exact: true }).click();
  229 |     expect((await pack).status()).toBe(200);
  230 |     await prepDialog.getByRole('link', { name: 'Tạo vận đơn để bàn giao' }).click();
  231 |     await page.getByRole('button', { name: 'Tạo vận đơn', exact: true }).click();
  232 |     const createDialog = page.getByRole('dialog', { name: 'Tạo vận đơn' });
  233 |     const create = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/shipments'));
  234 |     await createDialog.getByRole('button', { name: 'Tạo bản vận chuyển' }).click();
  235 |     expect((await create).status()).toBe(201);
  236 | 
  237 |     await chooseOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
  238 |     const shipmentRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
  239 |     await expect(shipmentRow).toBeVisible();
  240 |     await shipmentRow.getByRole('button', { name: 'Bàn giao' }).click();
  241 |     const handoverDialog = page.getByRole('dialog', { name: 'Xác nhận bàn giao kiện hàng' });
  242 |     const handoverRequests: string[] = [];
  243 |     page.on('request', request => {
  244 |         if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/handover')) handoverRequests.push(request.postData() || '');
  245 |     });
  246 |     const handover = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/handover'));
  247 |     await handoverDialog.getByRole('button', { name: 'Xác nhận bàn giao' }).click();
  248 |     expect((await handover).status()).toBe(202);
  249 |     await expect(handoverDialog.getByRole('alert').filter({ hasText: 'Mã lệnh cần kiểm tra' })).toBeVisible();
  250 |     await expect(handoverDialog.getByRole('button', { name: 'Xác nhận bàn giao' })).toBeDisabled();
  251 |     expect(handoverRequests).toHaveLength(1);
  252 | });
  253 | 
  254 | test('FE013.AC01 role scope and FE013.AC05 responsive shipment/preparation views remain accessible', async ({ page }) => {
  255 |     await confirmSeedOrder(page);
  256 |     await chooseOption(page, 'Vai trò mô phỏng', 'warehouse');
  257 |     await page.getByRole('link', { name: 'Chuẩn bị hàng', exact: true }).click();
  258 |     const row = page.getByRole('row').filter({ hasText: 'DH-1001' });
  259 |     await expect(row).toBeVisible();
  260 |     await row.getByRole('button', { name: 'Mở phiếu lấy hàng' }).click();
  261 |     const dialog = page.getByRole('dialog', { name: 'Phiếu chuẩn bị DH-1001' });
  262 |     await expect(dialog.getByRole('alert').filter({ hasText: 'không có quyền nhận' })).toBeVisible();
  263 |     await expect(dialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' })).toHaveCount(0);
  264 |     await dialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
  265 | 
  266 |     await chooseOption(page, 'Vai trò mô phỏng', 'owner');
  267 |     await page.getByRole('link', { name: 'Vận đơn & giao hàng', exact: true }).click();
  268 |     const viewportResults = [] as Array<{ width: number; documentWidth: number; viewportWidth: number }>;
  269 |     for (const width of [320, 390, 768, 1440]) {
  270 |         await page.setViewportSize({ width, height: 900 });
```