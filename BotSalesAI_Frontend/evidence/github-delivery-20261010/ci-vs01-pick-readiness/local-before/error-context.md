# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vertical-slices\fe022-flows.spec.ts >> FE022.VS01 catalog → stock → order → prep keeps product, reservation, and order references linked
- Location: tests\vertical-slices\fe022-flows.spec.ts:38:1

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
    - locator resolved to <button disabled tabindex="-1" type="button" class="MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium MuiButton-colorPrimary MuiButton-disableElevation Mui-disabled MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium MuiButton-colorPrimary MuiButton-disableElevation css-3rosp-MuiButtonBase-root-MuiButton-root">Xác nhận dòng đã kiểm</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    339 × waiting for element to be visible, enabled and stable
        - element is not enabled
      - retrying click action
        - waiting 500ms

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
> 85  |     await dialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' }).click();
      |                                                                         ^ Error: locator.click: Test timeout of 180000ms exceeded.
  86  |     const picked = await pick;
  87  |     expect(picked.status()).toBe(200);
  88  |     expect(JSON.parse(picked.request().postData() || 'null')).toMatchObject({ orderLineId: 'ol-1001', scannedSku: 'AO-002', pickedQuantity: 1 });
  89  |     await expect(dialog.getByText('1/1', { exact: true })).toBeVisible();
  90  | });
  91  | 
  92  | test('FE022.VS02 procurement → approval → receipt → stock and payable preserves the purchase identity', async ({ page }) => {
  93  |     const purchaseList = page.waitForResponse(response => response.request().method() === 'GET'
  94  |         && new URL(response.url()).pathname === '/api/v2/shops/shop-demo/purchase-orders');
  95  |     await gotoDemo(page, '/s/shop-demo/purchases');
  96  |     expect((await purchaseList).status()).toBe(200);
  97  |     await page.getByRole('progressbar', { name: 'Đang tải màn hình', exact: true }).waitFor({ state: 'hidden' });
  98  |     await expect(page.getByRole('heading', { name: 'Đơn mua hàng', exact: true })).toBeVisible();
  99  |     const before = (await readList<{ variantId: string; onHand: number }>(page, 'inventory')).find(item => item.variantId === 'v-p1');
  100 |     expect(before).toBeTruthy();
  101 |     await page.getByRole('button', { name: 'Tạo đơn mua', exact: true }).click();
  102 |     const draft = page.getByRole('dialog', { name: 'Đơn mua mới' });
  103 |     await chooseOption(page, 'Nhà cung cấp đã duyệt', 'Xưởng hàng mẫu', draft);
  104 |     await chooseOption(page, 'Báo giá dòng 1', /v-p1/, draft);
  105 |     await draft.getByRole('spinbutton', { name: 'Số lượng dòng 1' }).fill('10');
  106 |     const createPurchase = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/purchase-orders'));
  107 |     await draft.getByRole('button', { name: 'Lưu đơn nháp' }).click();
  108 |     const created = await createPurchase;
  109 |     expect(created.status()).toBe(201);
  110 |     const purchase = (await created.json()).data;
  111 |     const purchaseId = purchase.id as string;
  112 | 
  113 |     const requestApproval = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/purchase-orders/${purchaseId}/request-approval`));
  114 |     await page.getByRole('button', { name: 'Xin phê duyệt', exact: true }).click();
  115 |     expect((await requestApproval).status()).toBe(200);
  116 |     await page.getByRole('link', { name: /Xem phê duyệt/ }).click();
  117 |     const approvalRow = page.getByRole('row').filter({ hasText: purchaseId });
  118 |     await expect(approvalRow).toBeVisible();
  119 |     await approvalRow.getByRole('button', { name: 'Xem & quyết định' }).click();
  120 |     const decisionDialog = page.getByRole('dialog', { name: 'Xem xét phê duyệt' });
  121 |     await decisionDialog.getByRole('textbox', { name: 'Lý do quyết định' }).fill('Duyệt đơn của scenario FE022.');
  122 |     const decision = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/decision'));
  123 |     await decisionDialog.getByRole('button', { name: 'Duyệt đúng nội dung này' }).click();
  124 |     expect((await decision).status()).toBe(200);
  125 | 
  126 |     await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Đơn mua hàng' }).click();
  127 |     const purchaseRow = page.getByRole('row').filter({ hasText: purchaseId });
  128 |     await expect(purchaseRow).toBeVisible();
  129 |     await purchaseRow.getByRole('button', { name: 'Xem chi tiết' }).click();
  130 |     const details = page.getByRole('dialog', { name: `Đơn mua ${purchaseId}` });
  131 |     const sendReady = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/purchase-orders/${purchaseId}/send`));
  132 |     await details.getByRole('button', { name: 'Gửi đơn mua' }).click();
  133 |     await page.getByRole('dialog', { name: 'Gửi đơn mua đã duyệt' }).getByRole('button', { name: 'Gửi đơn mua', exact: true }).click();
  134 |     expect((await sendReady).status()).toBe(202);
  135 |     await expect(details.getByText('Đã gửi', { exact: true })).toBeVisible();
  136 |     await details.getByRole('button', { name: 'Nhà cung cấp đã xác nhận' }).click();
  137 |     const supplierDialog = page.getByRole('dialog', { name: 'Ghi nhận xác nhận của nhà cung cấp' });
  138 |     await supplierDialog.getByRole('textbox', { name: 'Tham chiếu đơn phía nhà cung cấp' }).fill(`FE022-${purchaseId}`);
  139 |     await supplierDialog.getByRole('textbox', { name: 'Mã bằng chứng xác nhận' }).fill(`FE022-PROOF-${purchaseId}`);
  140 |     const supplierConfirmation = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/purchase-orders/${purchaseId}/confirm`));
  141 |     await supplierDialog.getByRole('button', { name: 'Ghi xác nhận' }).click();
  142 |     expect((await supplierConfirmation).status()).toBe(200);
  143 |     await expect(details.getByText('Đã xác nhận', { exact: true })).toBeVisible();
  144 |     await details.getByRole('link', { name: /Nhận hàng theo đơn này/ }).click();
  145 | 
  146 |     await page.getByRole('button', { name: 'Tạo phiếu nhận', exact: true }).click();
  147 |     const receiptDraft = page.getByRole('dialog', { name: 'Phiếu nhận hàng mới' });
  148 |     await chooseOption(page, 'Đơn mua đã xác nhận', purchaseId, receiptDraft);
  149 |     await receiptDraft.getByRole('textbox', { name: 'Mã phiếu giao / chứng từ nguồn' }).fill('FE022-RECEIPT-VS02');
  150 |     await receiptDraft.getByRole('spinbutton', { name: 'Nhận đạt mã biến thể v-p1' }).fill('2');
  151 |     const createReceipt = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/goods-receipts'));
  152 |     await receiptDraft.getByRole('button', { name: 'Tạo phiếu nháp' }).click();
  153 |     const receiptResponse = await createReceipt;
  154 |     expect(receiptResponse.status()).toBe(201);
  155 |     const receipt = (await receiptResponse.json()).data;
  156 |     expect(receipt).toMatchObject({ purchaseOrderId: purchaseId, status: 'draft', sourceDocumentRef: 'FE022-RECEIPT-VS02' });
  157 |     const receiptRow = page.getByRole('row').filter({ hasText: 'FE022-RECEIPT-VS02' });
  158 |     await receiptRow.getByRole('button', { name: 'Xem / ghi nhận phiếu' }).click();
  159 |     const receiptDetails = page.getByRole('dialog', { name: new RegExp(`Phiếu nhận ${receipt.id}`) });
  160 |     await receiptDetails.getByRole('button', { name: 'Kiểm & ghi nhận vào kho' }).click();
  161 |     const post = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/goods-receipts/${receipt.id}/post`));
  162 |     await page.getByRole('dialog', { name: 'Ghi nhận hàng đã kiểm vào kho' }).getByRole('button', { name: 'Ghi nhận vào kho', exact: true }).click();
  163 |     expect((await post).status()).toBe(202);
  164 | 
  165 |     const after = (await readList<{ variantId: string; onHand: number }>(page, 'inventory')).find(item => item.variantId === 'v-p1');
  166 |     expect(after?.onHand).toBe((before?.onHand || 0) + 2);
  167 |     const debts = await readList<{ source?: { type?: string; id?: string }; direction: string; originalAmount: { amount: string } }>(page, 'debts');
  168 |     const payable = debts.find(debt => debt.source?.type === 'goods_receipt' && debt.source.id === receipt.id);
  169 |     expect(payable).toMatchObject({ direction: 'payable', originalAmount: { amount: '200000' } });
  170 | });
  171 | 
  172 | test('FE022.VS03 finance → reconciliation retains bank transaction and partial debt allocation', async ({ page }) => {
  173 |     await gotoDemo(page, '/s/shop-demo/finance');
  174 |     await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Đối soát', exact: true }).click();
  175 |     await page.getByRole('button', { name: 'Nhập bảng đối soát', exact: true }).click();
  176 |     const dialog = page.getByRole('dialog', { name: 'Nhập bảng đối soát' });
  177 |     await dialog.locator('input[type="file"]').setInputFiles({
  178 |         name: 'fe022-bank.csv', mimeType: 'text/csv',
  179 |         buffer: Buffer.from('externalTransactionId,amount,currency,direction,occurredAt,referenceText\nFE022-BANK-01,100000,VND,credit,2026-09-29T13:30:00Z,FE022 vertical reconciliation', 'utf8'),
  180 |     });
  181 |     await chooseOption(page, 'Tài khoản / đơn vị vận chuyển', '112 · Tiền ngân hàng', dialog);
  182 |     await dialog.getByRole('textbox', { name: 'Mã đợt nhập duy nhất' }).fill('FE022-BANK-BATCH-01');
  183 |     const previewResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/finance/statement-import-preview'));
  184 |     await dialog.getByRole('button', { name: 'Xem trước bảng đối soát' }).click();
  185 |     const preview = await previewResponse;
```