# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fe013.spec.ts >> FE013.AC01–AC04 stale claim conflict is visible; pick, pack, dispatch and delivery use current API versions once
- Location: tests\fe013.spec.ts:68:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true }) with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true })

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
  - navigation "Đường dẫn hiện tại": Không gian làm việc / Vận đơn và giao hàng
  - textbox "Tìm màn hình":
    - /placeholder: Tìm màn hình...
  - text: Dữ liệu mô phỏng
  - link "Thông báo":
    - /url: /s/shop-demo/notifications
  - text: J
- alert:
  - text: "Frontend review: API được mô phỏng trong bộ nhớ, không gửi tin hoặc đặt hàng thật. Tải lại trang sẽ khởi tạo lại dữ liệu."
  - button "Góp ý"
- button "Ẩn công cụ demo" [expanded]
- text: "Thử giao diện: Vai trò mô phỏng"
- combobox "Vai trò mô phỏng Vai trò mô phỏng": owner
- text: Trạng thái thử
- combobox "Trạng thái thử Trạng thái thử": Bình thường
- text: Dataset mô phỏng
- combobox "Dataset mô phỏng Dataset mô phỏng": Dataset mặc định
- status: Trạng thái thử đã được áp dụng.
- main:
  - heading "Vận đơn & giao hàng" [level=1]
  - paragraph: Bàn giao hàng, khách nhận hàng và tiền về là ba sự kiện khác nhau.
  - button "Tạo vận đơn"
  - region "Danh sách vận đơn":
    - table "Danh sách vận đơn":
      - rowgroup:
        - row "Vận đơn Đơn Trạng thái Phí báo giá Phí thực tế":
          - columnheader "Vận đơn"
          - columnheader "Đơn"
          - columnheader "Trạng thái"
          - columnheader "Phí báo giá"
          - columnheader "Phí thực tế"
          - columnheader
      - rowgroup:
        - 'row "shipment-10023 Giao thủ công Mã đơn: DH-1001 Dự kiến Chưa có dữ liệu Chưa có dữ liệu Chi tiết Bàn giao Cập nhật hành trình"':
          - cell "shipment-10023 Giao thủ công":
            - paragraph: shipment-10023
            - text: Giao thủ công
          - 'cell "Mã đơn: DH-1001"':
            - 'link "Mã đơn: DH-1001"':
              - /url: /s/shop-demo/orders/DH-1001
          - cell "Dự kiến"
          - cell "Chưa có dữ liệu"
          - cell "Chưa có dữ liệu"
          - cell "Chi tiết Bàn giao Cập nhật hành trình":
            - button "Chi tiết"
            - button "Bàn giao"
            - button "Cập nhật hành trình" [disabled]
        - 'row "seed-shipment-10021 Mã đơn vị vận chuyển: carrier-demo Mã đơn: DH-DEMO-PAID-01 Đã giao Chưa có dữ liệu Chưa có dữ liệu Chi tiết Bàn giao Cập nhật hành trình"':
          - 'cell "seed-shipment-10021 Mã đơn vị vận chuyển: carrier-demo"':
            - paragraph: seed-shipment-10021
            - text: "Mã đơn vị vận chuyển: carrier-demo"
          - 'cell "Mã đơn: DH-DEMO-PAID-01"':
            - 'link "Mã đơn: DH-DEMO-PAID-01"':
              - /url: /s/shop-demo/orders/DH-DEMO-PAID-01
          - cell "Đã giao"
          - cell "Chưa có dữ liệu"
          - cell "Chưa có dữ liệu"
          - cell "Chi tiết Bàn giao Cập nhật hành trình":
            - button "Chi tiết"
            - button "Bàn giao" [disabled]
            - button "Cập nhật hành trình"
  - text: 2 kết quả
  - button "Đầu danh sách" [disabled]
  - button "Trang trước" [disabled]
  - button "Trang tiếp" [disabled]
  - heading "Xem thử phí và vùng giao hàng" [level=2]
  - paragraph: Mở khi cần kiểm tra giao diện mẫu; nội dung này không xác nhận khả năng giao hoặc tạo vận đơn.
  - button "Mở bản xem thử phí giao hàng"
- contentinfo:
  - text: BotSales AI · Graphite Gold · Frontend
  - button "Góp ý màn hình"
```

# Test source

```ts
  69  |     const calls: Array<{ method: string; path: string; body: string | null; headers: Record<string, string> }> = [];
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
  168 |     const discardDuplicate = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true });
> 169 |     await expect(discardDuplicate).toBeVisible();
      |                                    ^ Error: expect(locator).toBeVisible() failed
  170 |     await discardDuplicate.getByRole('button', { name: 'Bỏ thay đổi', exact: true }).click();
  171 |     await expect(replay).toBeHidden();
  172 | 
  173 |     const shipmentRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
  174 |     await expect(shipmentRow).toBeVisible();
  175 |     await shipmentRow.getByRole('button', { name: 'Bàn giao' }).click();
  176 |     const handoverDialog = page.getByRole('dialog', { name: 'Xác nhận bàn giao kiện hàng' });
  177 |     await expect(handoverDialog.getByText('Chưa có sự kiện.', { exact: true })).toBeVisible();
  178 |     const handoverRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/handover'));
  179 |     const handoverResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/handover'));
  180 |     await handoverDialog.getByRole('button', { name: 'Xác nhận bàn giao' }).click();
  181 |     const handoverReq = await handoverRequest;
  182 |     expect(JSON.parse(handoverReq.postData() || 'null')).toMatchObject({ expectedVersion: 1 });
  183 |     expect(handoverReq.headers()['idempotency-key']).toBeTruthy();
  184 |     expect((await handoverResponse).status()).toBe(202);
  185 |     const shipmentDetailDialog = page.getByRole('dialog', { name: 'Chi tiết vận đơn' });
  186 |     await expect(shipmentDetailDialog.getByRole('heading', { name: 'Chi tiết vận đơn' })).toBeVisible();
  187 |     expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/handover'))).toHaveLength(1);
  188 | 
  189 |     await expect(shipmentDetailDialog.getByText('Đã bàn giao', { exact: true })).toBeVisible();
  190 |     await shipmentDetailDialog.getByRole('button', { name: 'Cập nhật hành trình' }).click();
  191 |     const eventDialog = page.getByRole('dialog', { name: 'Cập nhật hành trình có bằng chứng' });
  192 |     await chooseOption(page, 'Sự kiện', 'Khách đã nhận hàng');
  193 |     await eventDialog.getByRole('textbox', { name: 'Mã sự kiện bên vận chuyển' }).fill('carrier-event-delivered-1001');
  194 |     await eventDialog.getByLabel('Thời gian sự kiện').fill('2026-09-29T14:00');
  195 |     await eventDialog.getByRole('textbox', { name: 'Mã bằng chứng' }).fill('proof-delivery-1001');
  196 |     const eventResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/events'));
  197 |     await eventDialog.getByRole('button', { name: 'Ghi sự kiện' }).click();
  198 |     expect((await eventResponse).status()).toBe(200);
  199 |     const deliveredRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
  200 |     await expect(deliveredRow).toContainText('Đã giao');
  201 |     await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toBeVisible();
  202 |     expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/handover'))).toHaveLength(1);
  203 |     await page.getByRole('link', { name: 'Mã đơn: DH-1001', exact: true }).click();
  204 |     await expect(page.getByRole('heading', { name: 'Đơn DH-1001', exact: true })).toBeVisible();
  205 |     await expect(page.getByText('Đã giao', { exact: true })).toBeVisible();
  206 |     await expect(page.getByText('Chưa thu', { exact: true })).toBeVisible();
  207 |     await expect(page.getByRole('link', { name: 'Tạo yêu cầu trả hàng' })).toBeVisible();
  208 |     await expect(page.getByRole('button', { name: 'Ghi nhận tiền đã thu' })).toBeVisible();
  209 | });
  210 | 
  211 | test('FE013.AC03 unknown handover cannot be repeated before command reconciliation', async ({ page }) => {
  212 |     await confirmSeedOrder(page);
  213 |     await page.getByRole('link', { name: 'Chuẩn bị đơn' }).click();
  214 |     const prepRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
  215 |     await expect(prepRow).toBeVisible();
  216 |     await prepRow.getByRole('button', { name: 'Mở phiếu lấy hàng' }).click();
  217 |     const prepDialog = page.getByRole('dialog', { name: 'Phiếu chuẩn bị DH-1001' });
  218 |     const claim = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/claim'));
  219 |     await prepDialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' }).click();
  220 |     expect((await claim).status()).toBe(200);
  221 |     await expect(prepDialog.getByRole('button', { name: 'Đóng', exact: true }).last()).toBeEnabled();
  222 |     await expect(prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' })).toBeEditable();
  223 |     await prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' }).fill('AO-002');
  224 |     await expect(prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' })).toHaveValue('AO-002');
  225 |     await prepDialog.getByRole('spinbutton', { name: 'Số lượng đã lấy' }).fill('1');
  226 |     const pick = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/pick'));
  227 |     await prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' }).click();
  228 |     expect((await pick).status()).toBe(200);
  229 |     await prepDialog.getByRole('button', { name: 'Xác nhận đã đóng gói' }).click();
  230 |     const packDialog = page.getByRole('dialog', { name: 'Hoàn tất đóng gói' });
  231 |     const pack = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/pack'));
  232 |     await packDialog.getByRole('button', { name: 'Xác nhận đã đóng gói', exact: true }).click();
  233 |     expect((await pack).status()).toBe(200);
  234 |     await prepDialog.getByRole('link', { name: 'Tạo vận đơn để bàn giao' }).click();
  235 |     await page.getByRole('button', { name: 'Tạo vận đơn', exact: true }).click();
  236 |     const createDialog = page.getByRole('dialog', { name: 'Tạo vận đơn' });
  237 |     const create = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/shipments'));
  238 |     await createDialog.getByRole('button', { name: 'Tạo bản vận chuyển' }).click();
  239 |     expect((await create).status()).toBe(201);
  240 | 
  241 |     await chooseOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
  242 |     const shipmentRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
  243 |     await expect(shipmentRow).toBeVisible();
  244 |     await shipmentRow.getByRole('button', { name: 'Bàn giao' }).click();
  245 |     const handoverDialog = page.getByRole('dialog', { name: 'Xác nhận bàn giao kiện hàng' });
  246 |     const handoverRequests: string[] = [];
  247 |     page.on('request', request => {
  248 |         if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/handover')) handoverRequests.push(request.postData() || '');
  249 |     });
  250 |     const handover = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/handover'));
  251 |     await handoverDialog.getByRole('button', { name: 'Xác nhận bàn giao' }).click();
  252 |     expect((await handover).status()).toBe(202);
  253 |     await expect(handoverDialog.getByRole('alert').filter({ hasText: 'Mã lệnh cần kiểm tra' })).toBeVisible();
  254 |     await expect(handoverDialog.getByRole('button', { name: 'Xác nhận bàn giao' })).toBeDisabled();
  255 |     expect(handoverRequests).toHaveLength(1);
  256 | });
  257 | 
  258 | test('FE013.AC01 role scope and FE013.AC05 responsive shipment/preparation views remain accessible', async ({ page }) => {
  259 |     await confirmSeedOrder(page);
  260 |     await chooseOption(page, 'Vai trò mô phỏng', 'warehouse');
  261 |     await page.getByRole('link', { name: 'Chuẩn bị hàng', exact: true }).click();
  262 |     const row = page.getByRole('row').filter({ hasText: 'DH-1001' });
  263 |     await expect(row).toBeVisible();
  264 |     await row.getByRole('button', { name: 'Mở phiếu lấy hàng' }).click();
  265 |     const dialog = page.getByRole('dialog', { name: 'Phiếu chuẩn bị DH-1001' });
  266 |     await expect(dialog.getByRole('alert').filter({ hasText: 'không có quyền nhận' })).toBeVisible();
  267 |     await expect(dialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' })).toHaveCount(0);
  268 |     await dialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
  269 | 
```