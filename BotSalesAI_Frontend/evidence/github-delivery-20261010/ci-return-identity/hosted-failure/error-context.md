# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend-corrections.spec.ts >> F01 analogous return-inspection draft does not adopt a refetched version without comparison
- Location: tests/frontend-corrections.spec.ts:375:1

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator: getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true }).getByRole('button', { name: 'Áp dụng vào bản nháp' })
Expected: disabled
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeDisabled" getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true }).getByRole('button', { name: 'Áp dụng vào bản nháp' }) with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true }).getByRole('button', { name: 'Áp dụng vào bản nháp' })

```

```yaml
- link "Đến nội dung chính":
  - /url: "#main-content"
- navigation "Điều hướng chính":
  - heading "BotSales AI" [level=6]
  - text: Đội ngũ vận hành cửa hàng
  - link "Joker Studio · Shop mẫu ⌄":
    - /url: /workspaces
  - text: ĐIỀU HÀNH
  - list:
    - listitem:
      - link "Tổng quan":
        - /url: /s/shop-demo/overview
        - paragraph: Tổng quan
    - listitem:
      - link "Công việc hôm nay":
        - /url: /s/shop-demo/operations
        - paragraph: Công việc hôm nay
    - listitem:
      - link "Cần phê duyệt":
        - /url: /s/shop-demo/approvals
        - paragraph: Cần phê duyệt
  - text: BÁN HÀNG
  - list:
    - listitem:
      - link "Hộp thư khách hàng":
        - /url: /s/shop-demo/inbox
        - paragraph: Hộp thư khách hàng
    - listitem:
      - link "Khách hàng":
        - /url: /s/shop-demo/customers
        - paragraph: Khách hàng
    - listitem:
      - link "Đơn hàng":
        - /url: /s/shop-demo/orders
        - paragraph: Đơn hàng
    - listitem:
      - link "Chuẩn bị hàng":
        - /url: /s/shop-demo/fulfillment
        - paragraph: Chuẩn bị hàng
    - listitem:
      - link "Vận đơn & giao hàng":
        - /url: /s/shop-demo/shipments
        - paragraph: Vận đơn & giao hàng
    - listitem:
      - link "Đổi trả":
        - /url: /s/shop-demo/returns
        - paragraph: Đổi trả
    - listitem:
      - link "Chăm sóc sau bán":
        - /url: /s/shop-demo/service-cases
        - paragraph: Chăm sóc sau bán
  - text: HÀNG HÓA
  - list:
    - listitem:
      - link "Sản phẩm":
        - /url: /s/shop-demo/products
        - paragraph: Sản phẩm
    - listitem:
      - link "Danh mục":
        - /url: /s/shop-demo/categories
        - paragraph: Danh mục
    - listitem:
      - link "Nhập dữ liệu":
        - /url: /s/shop-demo/imports
        - paragraph: Nhập dữ liệu
    - listitem:
      - link "Tồn kho":
        - /url: /s/shop-demo/inventory
        - paragraph: Tồn kho
    - listitem:
      - link "Lịch sử kho":
        - /url: /s/shop-demo/inventory/movements
        - paragraph: Lịch sử kho
    - listitem:
      - link "Nhà cung cấp":
        - /url: /s/shop-demo/suppliers
        - paragraph: Nhà cung cấp
    - listitem:
      - link "Đề nghị nhập":
        - /url: /s/shop-demo/replenishment
        - paragraph: Đề nghị nhập
    - listitem:
      - link "Đơn mua hàng":
        - /url: /s/shop-demo/purchases
        - paragraph: Đơn mua hàng
    - listitem:
      - link "Nhận hàng":
        - /url: /s/shop-demo/receipts
        - paragraph: Nhận hàng
  - text: KẾ TOÁN
  - list:
    - listitem:
      - link "Thu chi":
        - /url: /s/shop-demo/finance
        - paragraph: Thu chi
    - listitem:
      - link "Sổ thu chi":
        - /url: /s/shop-demo/finance/entries
        - paragraph: Sổ thu chi
    - listitem:
      - link "Lợi nhuận":
        - /url: /s/shop-demo/finance/profit-loss
        - paragraph: Lợi nhuận
    - listitem:
      - link "Chứng từ & sổ kép":
        - /url: /s/shop-demo/finance/journals
        - paragraph: Chứng từ & sổ kép
    - listitem:
      - link "Tài khoản kế toán":
        - /url: /s/shop-demo/finance/accounts
        - paragraph: Tài khoản kế toán
    - listitem:
      - link "Mở sổ kế toán":
        - /url: /s/shop-demo/finance/opening-balances
        - paragraph: Mở sổ kế toán
    - listitem:
      - link "Sổ cái":
        - /url: /s/shop-demo/finance/ledger
        - paragraph: Sổ cái
    - listitem:
      - link "Cân đối phát sinh":
        - /url: /s/shop-demo/finance/trial-balance
        - paragraph: Cân đối phát sinh
    - listitem:
      - link "Cân đối quản trị":
        - /url: /s/shop-demo/finance/balance-sheet
        - paragraph: Cân đối quản trị
    - listitem:
      - link "Đối soát":
        - /url: /s/shop-demo/finance/reconciliation
        - paragraph: Đối soát
    - listitem:
      - link "Công nợ & khóa kỳ":
        - /url: /s/shop-demo/finance/debts-periods
        - paragraph: Công nợ & khóa kỳ
  - text: ĐỘI NGŨ AI
  - list:
    - listitem:
      - link "Bốn nhân viên AI":
        - /url: /s/shop-demo/bot/team
        - paragraph: Bốn nhân viên AI
    - listitem:
      - link "Cấu hình Admin":
        - /url: /s/shop-demo/bot
        - paragraph: Cấu hình Admin
    - listitem:
      - link "Thử bot":
        - /url: /s/shop-demo/bot/playground
        - paragraph: Thử bot
    - listitem:
      - link "Chất lượng AI":
        - /url: /s/shop-demo/bot/evaluations
        - paragraph: Chất lượng AI
    - listitem:
      - link "Kiến thức cửa hàng":
        - /url: /s/shop-demo/knowledge
        - paragraph: Kiến thức cửa hàng
    - listitem:
      - link "Phản hồi cần duyệt":
        - /url: /s/shop-demo/knowledge/review
        - paragraph: Phản hồi cần duyệt
    - listitem:
      - link "Bản tin & sức khỏe":
        - /url: /s/shop-demo/operations/digests
        - paragraph: Bản tin & sức khỏe
  - text: THÔNG BÁO & BÁO CÁO
  - list:
    - listitem:
      - link "Trung tâm thông báo":
        - /url: /s/shop-demo/notifications
        - paragraph: Trung tâm thông báo
    - listitem:
      - link "Điện thoại & lịch trực":
        - /url: /s/shop-demo/notifications/devices
        - paragraph: Điện thoại & lịch trực
    - listitem:
      - link "Xuất báo cáo":
        - /url: /s/shop-demo/reports
        - paragraph: Xuất báo cáo
    - listitem:
      - link "Thông tin marketing":
        - /url: /s/shop-demo/reports/marketing
        - paragraph: Thông tin marketing
  - text: CÀI ĐẶT
  - list:
    - listitem:
      - link "Kết nối Facebook":
        - /url: /s/shop-demo/integrations/channels
        - paragraph: Kết nối Facebook
    - listitem:
      - link "Nhà cung cấp AI":
        - /url: /s/shop-demo/integrations/ai
        - paragraph: Nhà cung cấp AI
    - listitem:
      - link "Nhân sự & quyền":
        - /url: /s/shop-demo/settings/team
        - paragraph: Nhân sự & quyền
    - listitem:
      - link "Cửa hàng":
        - /url: /s/shop-demo/settings/shop
        - paragraph: Cửa hàng
    - listitem:
      - link "Quản trị kho":
        - /url: /s/shop-demo/settings/warehouses
        - paragraph: Quản trị kho
    - listitem:
      - link "Nhật ký":
        - /url: /s/shop-demo/settings/audit
        - paragraph: Nhật ký
    - listitem:
      - link "Quyền riêng tư":
        - /url: /s/shop-demo/settings/privacy
        - paragraph: Quyền riêng tư
  - separator
  - text: J
  - paragraph: Jokertrader · tài khoản mẫu
  - text: Chủ shop
  - button "Đăng xuất"
- banner:
  - navigation "Đường dẫn hiện tại": Không gian làm việc / Đổi trả và kiểm hàng hoàn
  - textbox "Tìm màn hình":
    - /placeholder: Tìm màn hình...
  - text: Dữ liệu mô phỏng
  - link "Thông báo":
    - /url: /s/shop-demo/notifications
  - text: J
- alert:
  - text: "Frontend review: API được mô phỏng trong bộ nhớ, không gửi tin hoặc đặt hàng thật. Tải lại trang sẽ khởi tạo lại dữ liệu."
  - button "Góp ý"
- button "Công cụ demo"
- text: owner · Bình thường · Dataset mặc định
- main:
  - heading "Đổi và trả hàng" [level=1]
  - paragraph: Nhận lại, kiểm tình trạng, xác định nghĩa vụ hoàn. Không tự cộng hàng chưa kiểm vào tồn bán.
  - button "Tạo yêu cầu trả"
  - region "Yêu cầu đổi trả":
    - table "Yêu cầu đổi trả":
      - rowgroup:
        - row "Yêu cầu Đơn gốc Trạng thái Nghĩa vụ hoàn":
          - columnheader "Yêu cầu"
          - columnheader "Đơn gốc"
          - columnheader "Trạng thái"
          - columnheader "Nghĩa vụ hoàn"
          - columnheader
      - rowgroup:
        - row "returncase-10001 DH-1001 Đã yêu cầu trả Chưa có dữ liệu Kiểm nhận":
          - cell "returncase-10001"
          - cell "DH-1001":
            - link "DH-1001":
              - /url: /s/shop-demo/orders/DH-1001
          - cell "Đã yêu cầu trả"
          - cell "Chưa có dữ liệu"
          - cell "Kiểm nhận":
            - button "Kiểm nhận"
        - row "seed-returncase-10036 DH-DEMO-RETURN-02 Đã kiểm hàng trả 498.000 ₫ Kiểm nhận":
          - cell "seed-returncase-10036"
          - cell "DH-DEMO-RETURN-02":
            - link "DH-DEMO-RETURN-02":
              - /url: /s/shop-demo/orders/DH-DEMO-RETURN-02
          - cell "Đã kiểm hàng trả"
          - cell "498.000 ₫"
          - cell "Kiểm nhận":
            - button "Kiểm nhận" [disabled]
        - row "seed-returncase-10035 DH-DEMO-PAID-01 Đã kiểm hàng trả 249.000 ₫ Kiểm nhận":
          - cell "seed-returncase-10035"
          - cell "DH-DEMO-PAID-01":
            - link "DH-DEMO-PAID-01":
              - /url: /s/shop-demo/orders/DH-DEMO-PAID-01
          - cell "Đã kiểm hàng trả"
          - cell "249.000 ₫"
          - cell "Kiểm nhận":
            - button "Kiểm nhận" [disabled]
  - text: 3 kết quả
  - button "Đầu danh sách" [disabled]
  - button "Trang trước" [disabled]
  - button "Trang tiếp" [disabled]
- contentinfo:
  - text: BotSales AI · Graphite Gold · Frontend
  - button "Góp ý màn hình"
```

# Test source

```ts
  290 |     await expect(page.getByText('Ghi chú không được vượt quá 4.000 ký tự.', { exact: true })).toBeVisible(); expect(writes).toBe(previousWrites);
  291 |     await notes.fill('😀'.repeat(4000));
  292 |     const unicodeRejected = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith('/customers/c1'));
  293 |     await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); expect((await unicodeRejected).status()).toBe(422);
  294 |     await expect(notes).toHaveValue('😀'.repeat(4000));
  295 |     await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationFailure('updateCustomer', null));
  296 |     const accepted = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith('/customers/c1'));
  297 |     await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); expect((await accepted).status()).toBe(200);
  298 |     await expect(notes).toHaveValue('😀'.repeat(4000));
  299 |     expect(await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/customers/c1')).json()).data.notes)).toBe('😀'.repeat(4000));
  300 | });
  301 | 
  302 | test('F05 keeps mode changes and unknown sends, locks another send, and observes recovery-registry completion', async ({ page }) => {
  303 |     await visit(page, 'inbox/cv1'); await page.getByLabel('Ghi chú nội bộ (không gửi khách)').check();
  304 |     await page.getByLabel('Ghi chú cho nhóm').fill('Mode switched while pending');
  305 |     await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationDelay('addInternalNote', 700));
  306 |     const finished = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.includes('/notes'));
  307 |     await page.getByRole('button', { name: 'Lưu ghi chú', exact: true }).click();
  308 |     await page.getByLabel('Ghi chú nội bộ (không gửi khách)').uncheck(); await finished;
  309 |     await expect(page.getByLabel('Nội dung trả lời khách')).toHaveValue('Mode switched while pending');
  310 |     await page.getByLabel('Ghi chú nội bộ (không gửi khách)').check();
  311 |     await page.evaluate(async () => { const service = await import('/src/mocks/service.ts'); service.setOperationDelay('addInternalNote', null); service.setOperationFailure('addInternalNote', { status: 503, code: 'UNAVAILABLE', message: 'Synthetic uncertain result' }); });
  312 |     const unknown = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.includes('/notes'));
  313 |     await page.getByRole('button', { name: 'Lưu ghi chú', exact: true }).click(); expect((await unknown).status()).toBe(503);
  314 |     await expect(page.getByRole('button', { name: 'Lưu ghi chú', exact: true })).toBeDisabled();
  315 |     await page.getByLabel('Ghi chú cho nhóm').fill('Retained unknown draft');
  316 |     await expect(page.getByRole('button', { name: 'Lưu ghi chú', exact: true })).toBeDisabled();
  317 |     await page.evaluate(async () => {
  318 |         const intents = await import('/src/shared/api/intents.ts');
  319 |         const intent = intents.intentSnapshot().find((row: { operation: string }) => row.operation === 'addInternalNote');
  320 |         if (!intent) throw new Error('Missing recovery metadata');
  321 |         (await import('/src/mocks/service.ts')).setOperationFailure('addInternalNote', null);
  322 |         intents.resolveObservedIntent(intent.intentId);
  323 |     });
  324 |     await expect(page.getByRole('button', { name: 'Lưu ghi chú', exact: true })).toBeEnabled();
  325 |     await expect(page.getByLabel('Ghi chú cho nhóm')).toHaveValue('Retained unknown draft');
  326 | });
  327 | 
  328 | test('F01 order editor keeps its original version and compares whole line lists before PATCH', async ({ page }) => {
  329 |     await visit(page, 'orders');
  330 |     const current = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/orders')).json()).data.find((order: { orderState: string }) => order.orderState === 'draft'));
  331 |     expect(current).toBeTruthy(); await visit(page, 'orders/' + current.id);
  332 |     await page.getByRole('button', { name: 'Sửa đơn nháp', exact: true }).click();
  333 |     const editor = page.getByRole('dialog', { name: 'Sửa đơn nháp', exact: true });
  334 |     await editor.getByLabel('Ghi chú chuẩn bị').fill('Local order note');
  335 |     const newWarehouse = await mutate(page, 'warehouses', { code: 'F01-CONCURRENT', name: 'Kho server cùng lúc', addressLine: 'Địa điểm tổng hợp' });
  336 |     expect(newWarehouse.status).toBe(201);
  337 |     const warehouseId = newWarehouse.payload.data.id;
  338 |     expect((await mutate(page, 'orders/' + current.id, { warehouseId }, 'PATCH', current.version)).status).toBe(200);
  339 |     await editor.getByRole('button', { name: 'Lưu đơn nháp', exact: true }).click();
  340 |     const comparison = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
  341 |     await expect(comparison.getByRole('combobox', { name: /^Chọn dữ liệu: Dòng đơn hàng/ })).toBeVisible();
  342 |     await comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' }).click();
  343 |     await expect(editor.getByRole('combobox', { name: /^Kho xuất(?: |$)/ }).locator('..').locator('input')).toHaveValue(warehouseId);
  344 |     const sent = page.waitForRequest(request => request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/orders/' + current.id));
  345 |     await editor.getByRole('button', { name: 'Lưu đơn nháp', exact: true }).click();
  346 |     const request = await sent; expect(request.postDataJSON()).toEqual({ notes: 'Local order note' }); expect(request.headers()['if-match']).toBe(`"${current.version + 1}"`);
  347 |     await expect(editor).not.toBeVisible();
  348 | });
  349 | 
  350 | test('F06 guards added order rows, shop switch, logout and native reload; successful creation leaves no false guard', async ({ page }) => {
  351 |     for (const route of ['orders/new', 'bot/evaluations', 'orders/new']) {
  352 |         await visit(page, route);
  353 |         expect(await page.evaluate(async () => (await fetch('/api/v2/session')).status)).toBe(200);
  354 |     }
  355 |     await page.getByRole('button', { name: 'Thêm dòng', exact: true }).click();
  356 |     const shopLink = page.getByRole('navigation', { name: 'Điều hướng chính' }).locator('a[href="/workspaces"]');
  357 |     const warning = page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?', exact: true });
  358 |     await shopLink.click(); await expect(warning).toBeVisible();
  359 |     await warning.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }).click();
  360 |     await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click(); await expect(warning).toBeVisible();
  361 |     await warning.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }).click();
  362 |     const reloadWarning = page.waitForEvent('dialog', { timeout: 10000 });
  363 |     const reload = page.reload({ timeout: 10000 }).catch(() => undefined);
  364 |     const browserDialog = await reloadWarning; expect(browserDialog.type()).toBe('beforeunload'); await browserDialog.dismiss(); await reload;
  365 |     await expect(page.getByLabel('Sản phẩm 2', { exact: true })).toBeVisible();
  366 |     await page.getByRole('button', { name: /Bỏ dòng/ }).last().click();
  367 |     await page.getByRole('combobox', { name: 'Khách hàng', exact: true }).click(); await page.getByRole('option', { name: 'Linh (khách mẫu)', exact: true }).click();
  368 |     await page.getByRole('combobox', { name: 'Sản phẩm 1', exact: true }).click(); await page.getByRole('option', { name: /Áo mẫu A/ }).first().click();
  369 |     const created = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders'));
  370 |     await page.getByRole('button', { name: 'Lưu đơn nháp', exact: true }).click();
  371 |     const response = await created; const payload = await response.json(); expect(response.status(), JSON.stringify(payload)).toBe(201);
  372 |     await expect(page).toHaveURL(demoUrl + '/s/shop-demo/orders/' + payload.data.id); await expect(warning).not.toBeVisible();
  373 | });
  374 | 
  375 | test('F01 analogous return-inspection draft does not adopt a refetched version without comparison', async ({ page }) => {
  376 |     await visit(page, 'returns');
  377 |     const fixture = await page.evaluate(async () => {
  378 |         const { db } = await import('/src/mocks/database.ts');
  379 |         const order = db.orders.find((item: { id: string; shopId: string; lines: Array<{ id: string }> }) => item.shopId === 'shop-demo' && !db.returns.some((returned: { orderId: string }) => returned.orderId === item.id)); order.fulfillmentState = 'delivered';
  380 |         return { id: order.id, lineId: order.lines[0].id };
  381 |     });
  382 |     const created = await mutate(page, 'returns', { orderId: fixture.id, reason: 'Synthetic received return', lines: [{ orderLineId: fixture.lineId, quantity: 1 }] }); expect(created.status, JSON.stringify(created.payload)).toBe(201);
  383 |     await page.getByRole('button', { name: 'Kiểm nhận', exact: true }).first().click();
  384 |     const editor = page.getByRole('dialog', { name: 'Kiểm nhận hàng trả', exact: true });
  385 |     await expect(editor.getByLabel('Ghi nhận kiểm tra')).toBeVisible(); await editor.getByLabel('Ghi nhận kiểm tra').fill('Local physical inspection');
  386 |     await page.evaluate(async returnId => { const { db } = await import('/src/mocks/database.ts'); const item = db.returns.find((item: { id: string }) => item.id === returnId); item.lines[0].disposition = 'damaged'; item.lines[0].reason = 'Concurrent case note'; item.version++; }, created.payload.data.id);
  387 |     await pulse(page);
  388 |     await editor.getByRole('button', { name: 'Xác nhận kiểm nhận', exact: true }).click();
  389 |     const comparison = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
> 390 |     await expect(comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' })).toBeDisabled();
      |                                                                                    ^ Error: expect(locator).toBeDisabled() failed
  391 |     await comparison.getByRole('combobox').click(); await page.getByRole('option', { name: 'Giữ bản nháp', exact: true }).click();
  392 |     await comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' }).click();
  393 |     const sent = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/inspect'));
  394 |     await editor.getByRole('button', { name: 'Xác nhận kiểm nhận', exact: true }).click();
  395 |     expect((await sent).postDataJSON()).toMatchObject({ expectedVersion: created.payload.data.version + 1, lines: [{ reason: 'Local physical inspection' }] });
  396 |     await expect(editor).not.toBeVisible();
  397 | });
  398 | 
  399 | test('F01 comparison supports keyboard choices, server changes again, axe and 320px reflow with long content', async ({ page }) => {
  400 |     await visit(page, 'customers/c1');
  401 |     await page.getByLabel('Tên khách hàng', { exact: true }).fill('Mine');
  402 |     expect((await mutate(page, 'customers/c1', { displayName: 'Server second', notes: 'LongContent'.repeat(350) }, 'PATCH', 1)).status).toBe(200);
  403 |     await page.getByRole('button', { name: 'Đối chiếu', exact: true }).click();
  404 |     const comparison = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
  405 |     const select = comparison.getByRole('combobox', { name: 'Chọn dữ liệu: Tên khách hàng', exact: true });
  406 |     await select.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Home'); await page.keyboard.press('Enter');
  407 |     await expect(comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' })).toBeEnabled();
  408 |     expect((await mutate(page, 'customers/c1', { displayName: 'Server third' }, 'PATCH', 2)).status).toBe(200);
  409 |     await expect(comparison.getByText('Server third', { exact: true })).toBeVisible();
  410 |     await expect(comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' })).toBeDisabled();
  411 |     await expect.poll(() => comparison.evaluate(element => {
  412 |         for (let current: Element | null = element; current; current = current.parentElement)
  413 |             if (Number(getComputedStyle(current).opacity) !== 1) return false;
  414 |         return true;
  415 |     })).toBe(true);
  416 |     const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  417 |     expect(accessibility.violations).toEqual([]);
  418 |     await page.setViewportSize({ width: 320, height: 800 });
  419 |     const geometry = await comparison.evaluate(element => ({ width: element.getBoundingClientRect().width, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, viewport: window.innerWidth }));
  420 |     expect(geometry.width).toBeLessThanOrEqual(320); expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  421 |     await test.info().attach('comparison-reflow-320.json', { body: JSON.stringify({ geometry, violations: accessibility.violations }), contentType: 'application/json' });
  422 |     await comparison.screenshot({ path: test.info().outputPath('comparison-320.png') });
  423 |     await page.keyboard.press('Escape'); await expect(comparison).not.toBeVisible();
  424 |     await expect(page.getByLabel('Tên khách hàng', { exact: true })).toHaveValue('Mine');
  425 | });
  426 | 
  427 | 
  428 | test('F08 privacy bounds reject invalid days and long jurisdiction before HTTP', async ({ page }) => {
  429 |     await visit(page, 'settings/privacy');
  430 |     const writes: string[] = []; page.on('request', request => { if (request.method() === 'PATCH' && request.url().includes('/privacy/policy')) writes.push(request.url()); });
  431 |     const days = page.getByLabel('Số ngày lưu hội thoại', { exact: true }), note = page.getByLabel('Căn cứ / thị trường áp dụng', { exact: true });
  432 |     for (const value of ['0', '36501', '1.5']) { await days.fill(value); await expect(days).toHaveAttribute('aria-invalid', 'true'); await expect(page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true })).toBeDisabled(); }
  433 |     await days.fill('36500'); await note.fill('n'.repeat(2001)); await expect(note).toHaveAttribute('aria-invalid', 'true');
  434 |     await expect(page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true })).toBeDisabled(); expect(writes).toEqual([]);
  435 |     await note.fill('n'.repeat(2000)); const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().includes('/privacy/policy'));
  436 |     await page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true }).click(); expect((await saved).status()).toBe(200); expect(writes).toHaveLength(1);
  437 |     const savedNotice = page.getByRole('status').filter({ hasText: 'Đã lưu bản nháp chính sách lưu trữ.' });
  438 |     await expect(savedNotice).toBeVisible();
  439 |     await expect(note).toHaveValue('n'.repeat(2000));
  440 |     await expect(page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true })).toBeDisabled();
  441 |     for (const length of [4, 2001]) {
  442 |         await note.fill('😀'.repeat(length)); await expect(note).toHaveAttribute('aria-invalid', 'true');
  443 |         await expect(page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true })).toBeDisabled(); expect(writes).toHaveLength(1);
  444 |     }
  445 |     for (const [index, length] of [5, 2000].entries()) {
  446 |         await note.fill('😀'.repeat(length));
  447 |         await expect(page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true })).toBeEnabled();
  448 |         const unicodeSaved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().includes('/privacy/policy'));
  449 |         await page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true }).click();
  450 |         const response = await unicodeSaved; expect(response.status()).toBe(200); expect((await response.json()).data.jurisdictionNote).toBe('😀'.repeat(length));
  451 |         expect(writes).toHaveLength(index + 2);
  452 |         await expect(savedNotice).toBeVisible();
  453 |         await expect(note).toHaveValue('😀'.repeat(length));
  454 |         await expect(page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true })).toBeDisabled();
  455 |     }
  456 | });
  457 | 
  458 | test('F06 order custom close respects the draft guard and busy editors remain protected', async ({ page }) => {
  459 |     await visit(page, 'orders');
  460 |     const current = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/orders')).json()).data.find((order: { orderState: string }) => order.orderState === 'draft'));
  461 |     await visit(page, 'orders/' + current.id); await page.getByRole('button', { name: 'Sửa đơn nháp', exact: true }).click();
  462 |     const editor = page.getByRole('dialog', { name: 'Sửa đơn nháp', exact: true }); await editor.getByLabel('Ghi chú chuẩn bị').fill('Unsaved order close');
  463 |     await editor.getByRole('button', { name: 'Đóng chỉnh sửa', exact: true }).click();
  464 |     const warning = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true }); await expect(warning).toBeVisible();
  465 |     await warning.getByRole('button', { name: 'Tiếp tục sửa', exact: true }).click(); await expect(editor.getByLabel('Ghi chú chuẩn bị')).toHaveValue('Unsaved order close');
  466 |     await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationDelay('updateOrderDraft', 1200));
  467 |     const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().includes('/orders/'));
  468 |     await editor.getByRole('button', { name: 'Lưu đơn nháp', exact: true }).click(); await expect(editor.getByRole('button', { name: 'Đóng chỉnh sửa', exact: true })).toBeDisabled();
  469 |     await editor.getByLabel('Ghi chú chuẩn bị').fill('Late order change'); await saved; await expect(editor).toBeVisible(); await expect(editor.getByLabel('Ghi chú chuẩn bị')).toHaveValue('Late order change');
  470 | });
  471 | 
```