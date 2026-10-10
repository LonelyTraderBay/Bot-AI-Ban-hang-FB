# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vertical-slices/fe022-flows.spec.ts >> FE022.VS02 procurement → approval → receipt → stock and payable preserves the purchase identity
- Location: tests/vertical-slices/fe022-flows.spec.ts:92:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Đơn mua hàng', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Đơn mua hàng', exact: true }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Đơn mua hàng', exact: true })

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
  - navigation "Đường dẫn hiện tại": Không gian làm việc / Đơn mua hàng
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
  - status:
    - progressbar "Đang tải màn hình"
- contentinfo:
  - text: BotSales AI · Graphite Gold · Frontend
  - button "Góp ý màn hình"
```

# Test source

```ts
  1   | import { openDemoControls } from '../session/demo-controls';
  2   | import { test, expect } from '@playwright/test';
  3   | import fs from 'node:fs';
  4   | import path from 'node:path';
  5   | import { startDemoServer } from '../session/demo-server.mjs';
  6   | 
  7   | let demoUrl = '';
  8   | let closeDemo: (() => Promise<void>) | undefined;
  9   | 
  10  | test.beforeAll(async () => {
  11  |     const server = await startDemoServer();
  12  |     demoUrl = server.url;
  13  |     closeDemo = server.close;
  14  | });
  15  | 
  16  | test.afterAll(async () => closeDemo?.());
  17  | 
  18  | async function gotoDemo(page: import('@playwright/test').Page, route: string) {
  19  |     await page.goto(new URL(route, demoUrl).toString());
  20  | }
  21  | 
  22  | async function chooseOption(page: import('@playwright/test').Page, label: string, value: string | RegExp, within?: import('@playwright/test').Locator) {
  23  |     if (['Vai trò mô phỏng', 'Trạng thái thử', 'Dataset mô phỏng'].includes(label)) await openDemoControls(page);
  24  |     const scope = within || page;
  25  |     await scope.getByRole('combobox', { name: label }).click();
  26  |     await page.getByRole('option', { name: value, exact: typeof value === 'string' }).click();
  27  | }
  28  | 
  29  | async function readList<T>(page: import('@playwright/test').Page, resource: string): Promise<T[]> {
  30  |     return page.evaluate(async (path) => {
  31  |         const response = await fetch(`/api/v2/shops/shop-demo/${path}?limit=100`);
  32  |         if (!response.ok) throw new Error(`Expected ${path} GET to succeed, got ${response.status}`);
  33  |         const envelope = await response.json();
  34  |         return envelope.data as T[];
  35  |     }, resource);
  36  | }
  37  | 
  38  | test('FE022.VS01 catalog → stock → order → prep keeps product, reservation, and order references linked', async ({ page }) => {
  39  |     await gotoDemo(page, '/s/shop-demo/inventory');
  40  |     const stockRow = page.getByRole('row').filter({ hasText: 'AO-002' });
  41  |     await expect(stockRow).toBeVisible();
  42  |     await stockRow.getByRole('link', { name: 'Mở sản phẩm' }).click();
  43  |     await expect(page).toHaveURL(/\/products\?q=AO-002$/);
  44  |     await expect(page.getByText('Áo thun Essential', { exact: true })).toBeVisible();
  45  | 
  46  |     const before = (await readList<{ variantId: string; onHand: number; reserved: number; available: number }>(page, 'inventory')).find(item => item.variantId === 'v-p2');
  47  |     expect(before).toBeTruthy();
  48  |     await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Đơn hàng' }).click();
  49  |     const orderRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
  50  |     await expect(orderRow).toBeVisible();
  51  |     await orderRow.getByRole('link', { name: 'Xem đơn' }).click();
  52  |     await expect(page.getByRole('heading', { name: 'Đơn DH-1001', exact: true })).toBeVisible();
  53  |     const quote = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-1001/quote'));
  54  |     await page.getByRole('button', { name: 'Lấy báo giá hiện tại' }).click();
  55  |     expect((await quote).status()).toBe(200);
  56  |     const customerConfirmation = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/customer-confirmations'));
  57  |     await page.getByRole('button', { name: 'Mô phỏng khách đồng ý báo giá' }).click();
  58  |     expect((await customerConfirmation).status()).toBe(200);
  59  |     const confirmation = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-1001/confirm'));
  60  |     await page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng' }).click();
  61  |     expect((await confirmation).status()).toBe(202);
  62  |     await expect(page.getByText('Đã xác nhận', { exact: true })).toBeVisible();
  63  | 
  64  |     const after = (await readList<{ variantId: string; onHand: number; reserved: number; available: number }>(page, 'inventory')).find(item => item.variantId === 'v-p2');
  65  |     expect(after).toBeTruthy();
  66  |     expect(after?.onHand).toBe(before?.onHand);
  67  |     expect(after?.reserved).toBe((before?.reserved || 0) + 1);
  68  |     expect(after?.available).toBe((before?.available || 0) - 1);
  69  | 
  70  |     await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Chuẩn bị hàng' }).click();
  71  |     const jobs = await readList<{ id: string; orderId: string; lines: Array<{ sku: string; orderLineId: string }> }>(page, 'prep-jobs');
  72  |     const prep = jobs.find(job => job.orderId === 'DH-1001');
  73  |     expect(prep).toBeTruthy();
  74  |     expect(prep?.lines).toEqual(expect.arrayContaining([expect.objectContaining({ sku: 'AO-002', orderLineId: 'ol-1001' })]));
  75  |     const prepRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
  76  |     await expect(prepRow).toBeVisible();
  77  |     await prepRow.getByRole('button', { name: 'Mở phiếu lấy hàng' }).click();
  78  |     const dialog = page.getByRole('dialog', { name: 'Phiếu chuẩn bị DH-1001' });
  79  |     const claim = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/claim'));
  80  |     await dialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' }).click();
  81  |     expect((await claim).status()).toBe(200);
  82  |     await dialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' }).fill('AO-002');
  83  |     await dialog.getByRole('spinbutton', { name: 'Số lượng đã lấy' }).fill('1');
  84  |     const pick = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/pick'));
  85  |     await dialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' }).click();
  86  |     const picked = await pick;
  87  |     expect(picked.status()).toBe(200);
  88  |     expect(JSON.parse(picked.request().postData() || 'null')).toMatchObject({ orderLineId: 'ol-1001', scannedSku: 'AO-002', pickedQuantity: 1 });
  89  |     await expect(dialog.getByText('1/1', { exact: true })).toBeVisible();
  90  | });
  91  | 
  92  | test('FE022.VS02 procurement → approval → receipt → stock and payable preserves the purchase identity', async ({ page }) => {
  93  |     await gotoDemo(page, '/s/shop-demo/purchases');
> 94  |     await expect(page.getByRole('heading', { name: 'Đơn mua hàng', exact: true })).toBeVisible();
      |                                                                                    ^ Error: expect(locator).toBeVisible() failed
  95  |     const before = (await readList<{ variantId: string; onHand: number }>(page, 'inventory')).find(item => item.variantId === 'v-p1');
  96  |     expect(before).toBeTruthy();
  97  |     await page.getByRole('button', { name: 'Tạo đơn mua', exact: true }).click();
  98  |     const draft = page.getByRole('dialog', { name: 'Đơn mua mới' });
  99  |     await chooseOption(page, 'Nhà cung cấp đã duyệt', 'Xưởng hàng mẫu', draft);
  100 |     await chooseOption(page, 'Báo giá dòng 1', /v-p1/, draft);
  101 |     await draft.getByRole('spinbutton', { name: 'Số lượng dòng 1' }).fill('10');
  102 |     const createPurchase = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/purchase-orders'));
  103 |     await draft.getByRole('button', { name: 'Lưu đơn nháp' }).click();
  104 |     const created = await createPurchase;
  105 |     expect(created.status()).toBe(201);
  106 |     const purchase = (await created.json()).data;
  107 |     const purchaseId = purchase.id as string;
  108 | 
  109 |     const requestApproval = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/purchase-orders/${purchaseId}/request-approval`));
  110 |     await page.getByRole('button', { name: 'Xin phê duyệt', exact: true }).click();
  111 |     expect((await requestApproval).status()).toBe(200);
  112 |     await page.getByRole('link', { name: /Xem phê duyệt/ }).click();
  113 |     const approvalRow = page.getByRole('row').filter({ hasText: purchaseId });
  114 |     await expect(approvalRow).toBeVisible();
  115 |     await approvalRow.getByRole('button', { name: 'Xem & quyết định' }).click();
  116 |     const decisionDialog = page.getByRole('dialog', { name: 'Xem xét phê duyệt' });
  117 |     await decisionDialog.getByRole('textbox', { name: 'Lý do quyết định' }).fill('Duyệt đơn của scenario FE022.');
  118 |     const decision = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/decision'));
  119 |     await decisionDialog.getByRole('button', { name: 'Duyệt đúng nội dung này' }).click();
  120 |     expect((await decision).status()).toBe(200);
  121 | 
  122 |     await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Đơn mua hàng' }).click();
  123 |     const purchaseRow = page.getByRole('row').filter({ hasText: purchaseId });
  124 |     await expect(purchaseRow).toBeVisible();
  125 |     await purchaseRow.getByRole('button', { name: 'Xem chi tiết' }).click();
  126 |     const details = page.getByRole('dialog', { name: `Đơn mua ${purchaseId}` });
  127 |     const sendReady = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/purchase-orders/${purchaseId}/send`));
  128 |     await details.getByRole('button', { name: 'Gửi đơn mua' }).click();
  129 |     await page.getByRole('dialog', { name: 'Gửi đơn mua đã duyệt' }).getByRole('button', { name: 'Gửi đơn mua', exact: true }).click();
  130 |     expect((await sendReady).status()).toBe(202);
  131 |     await expect(details.getByText('Đã gửi', { exact: true })).toBeVisible();
  132 |     await details.getByRole('button', { name: 'Nhà cung cấp đã xác nhận' }).click();
  133 |     const supplierDialog = page.getByRole('dialog', { name: 'Ghi nhận xác nhận của nhà cung cấp' });
  134 |     await supplierDialog.getByRole('textbox', { name: 'Tham chiếu đơn phía nhà cung cấp' }).fill(`FE022-${purchaseId}`);
  135 |     await supplierDialog.getByRole('textbox', { name: 'Mã bằng chứng xác nhận' }).fill(`FE022-PROOF-${purchaseId}`);
  136 |     const supplierConfirmation = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/purchase-orders/${purchaseId}/confirm`));
  137 |     await supplierDialog.getByRole('button', { name: 'Ghi xác nhận' }).click();
  138 |     expect((await supplierConfirmation).status()).toBe(200);
  139 |     await expect(details.getByText('Đã xác nhận', { exact: true })).toBeVisible();
  140 |     await details.getByRole('link', { name: /Nhận hàng theo đơn này/ }).click();
  141 | 
  142 |     await page.getByRole('button', { name: 'Tạo phiếu nhận', exact: true }).click();
  143 |     const receiptDraft = page.getByRole('dialog', { name: 'Phiếu nhận hàng mới' });
  144 |     await chooseOption(page, 'Đơn mua đã xác nhận', purchaseId, receiptDraft);
  145 |     await receiptDraft.getByRole('textbox', { name: 'Mã phiếu giao / chứng từ nguồn' }).fill('FE022-RECEIPT-VS02');
  146 |     await receiptDraft.getByRole('spinbutton', { name: 'Nhận đạt mã biến thể v-p1' }).fill('2');
  147 |     const createReceipt = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/goods-receipts'));
  148 |     await receiptDraft.getByRole('button', { name: 'Tạo phiếu nháp' }).click();
  149 |     const receiptResponse = await createReceipt;
  150 |     expect(receiptResponse.status()).toBe(201);
  151 |     const receipt = (await receiptResponse.json()).data;
  152 |     expect(receipt).toMatchObject({ purchaseOrderId: purchaseId, status: 'draft', sourceDocumentRef: 'FE022-RECEIPT-VS02' });
  153 |     const receiptRow = page.getByRole('row').filter({ hasText: 'FE022-RECEIPT-VS02' });
  154 |     await receiptRow.getByRole('button', { name: 'Xem / ghi nhận phiếu' }).click();
  155 |     const receiptDetails = page.getByRole('dialog', { name: new RegExp(`Phiếu nhận ${receipt.id}`) });
  156 |     await receiptDetails.getByRole('button', { name: 'Kiểm & ghi nhận vào kho' }).click();
  157 |     const post = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/goods-receipts/${receipt.id}/post`));
  158 |     await page.getByRole('dialog', { name: 'Ghi nhận hàng đã kiểm vào kho' }).getByRole('button', { name: 'Ghi nhận vào kho', exact: true }).click();
  159 |     expect((await post).status()).toBe(202);
  160 | 
  161 |     const after = (await readList<{ variantId: string; onHand: number }>(page, 'inventory')).find(item => item.variantId === 'v-p1');
  162 |     expect(after?.onHand).toBe((before?.onHand || 0) + 2);
  163 |     const debts = await readList<{ source?: { type?: string; id?: string }; direction: string; originalAmount: { amount: string } }>(page, 'debts');
  164 |     const payable = debts.find(debt => debt.source?.type === 'goods_receipt' && debt.source.id === receipt.id);
  165 |     expect(payable).toMatchObject({ direction: 'payable', originalAmount: { amount: '200000' } });
  166 | });
  167 | 
  168 | test('FE022.VS03 finance → reconciliation retains bank transaction and partial debt allocation', async ({ page }) => {
  169 |     await gotoDemo(page, '/s/shop-demo/finance');
  170 |     await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Đối soát', exact: true }).click();
  171 |     await page.getByRole('button', { name: 'Nhập bảng đối soát', exact: true }).click();
  172 |     const dialog = page.getByRole('dialog', { name: 'Nhập bảng đối soát' });
  173 |     await dialog.locator('input[type="file"]').setInputFiles({
  174 |         name: 'fe022-bank.csv', mimeType: 'text/csv',
  175 |         buffer: Buffer.from('externalTransactionId,amount,currency,direction,occurredAt,referenceText\nFE022-BANK-01,100000,VND,credit,2026-09-29T13:30:00Z,FE022 vertical reconciliation', 'utf8'),
  176 |     });
  177 |     await chooseOption(page, 'Tài khoản / đơn vị vận chuyển', '112 · Tiền ngân hàng', dialog);
  178 |     await dialog.getByRole('textbox', { name: 'Mã đợt nhập duy nhất' }).fill('FE022-BANK-BATCH-01');
  179 |     const previewResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/finance/statement-import-preview'));
  180 |     await dialog.getByRole('button', { name: 'Xem trước bảng đối soát' }).click();
  181 |     const preview = await previewResponse;
  182 |     expect(preview.status()).toBe(200);
  183 |     expect((await preview.json()).data).toMatchObject({ validRows: 1, invalidRows: 0, validationToken: expect.any(String) });
  184 |     const importResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/bank-transactions/import'));
  185 |     await dialog.getByRole('button', { name: 'Nhập các dòng hợp lệ' }).click();
  186 |     expect((await importResponse).status()).toBe(200);
  187 |     await expect(dialog.getByRole('link', { name: 'Xem kết quả nhập' })).toBeVisible();
  188 |     await dialog.getByRole('button', { name: 'Hủy' }).click();
  189 | 
  190 |     await page.getByRole('tab', { name: 'Chênh lệch cần xử lý' }).click();
  191 |     const caseRow = page.getByRole('row').filter({ hasText: 'FE022-BANK-01' });
  192 |     await expect(caseRow).toBeVisible();
  193 |     const debtBefore = (await readList<{ id: string; outstandingAmount: { amount: string } }>(page, 'debts')).find(debt => debt.id === 'seed-debtitem-10028');
  194 |     expect(debtBefore).toBeTruthy();
```