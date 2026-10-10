# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vertical-slices\fe022-flows.spec.ts >> FE022.VS03 finance → reconciliation retains bank transaction and partial debt allocation
- Location: tests\vertical-slices\fe022-flows.spec.ts:168:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 202
Received: 200
```

# Test source

```ts
  86  |     const picked = await pick;
  87  |     expect(picked.status()).toBe(200);
  88  |     expect(JSON.parse(picked.request().postData() || 'null')).toMatchObject({ orderLineId: 'ol-1001', scannedSku: 'AO-002', pickedQuantity: 1 });
  89  |     await expect(dialog.getByText('1/1', { exact: true })).toBeVisible();
  90  | });
  91  | 
  92  | test('FE022.VS02 procurement → approval → receipt → stock and payable preserves the purchase identity', async ({ page }) => {
  93  |     await gotoDemo(page, '/s/shop-demo/purchases');
  94  |     await expect(page.getByRole('heading', { name: 'Đơn mua hàng', exact: true })).toBeVisible();
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
> 186 |     expect((await importResponse).status()).toBe(202);
      |                                             ^ Error: expect(received).toBe(expected) // Object.is equality
  187 |     await expect(dialog.getByRole('link', { name: 'Xem kết quả nhập' })).toBeVisible();
  188 |     await dialog.getByRole('button', { name: 'Hủy' }).click();
  189 | 
  190 |     await page.getByRole('tab', { name: 'Chênh lệch cần xử lý' }).click();
  191 |     const caseRow = page.getByRole('row').filter({ hasText: 'FE022-BANK-01' });
  192 |     await expect(caseRow).toBeVisible();
  193 |     const debtBefore = (await readList<{ id: string; outstandingAmount: { amount: string } }>(page, 'debts')).find(debt => debt.id === 'seed-debtitem-10028');
  194 |     expect(debtBefore).toBeTruthy();
  195 |     await caseRow.getByRole('button', { name: 'Ghép giao dịch' }).click();
  196 |     const matchDialog = page.getByRole('dialog', { name: 'Ghép giao dịch với công nợ' });
  197 |     await chooseOption(page, 'Khoản công nợ', /seed-debtitem-10028/, matchDialog);
  198 |     await matchDialog.getByRole('textbox', { name: 'Số tiền phân bổ (VND)' }).fill('50000');
  199 |     await matchDialog.getByRole('textbox', { name: 'Lý do' }).fill('Ghép một phần trong scenario FE022.');
  200 |     const matchResponse = page.waitForResponse(response => response.request().method() === 'POST' && /\/reconciliation-cases\/[^/]+\/match$/.test(new URL(response.url()).pathname));
  201 |     await matchDialog.getByRole('button', { name: 'Ghi kết quả đối soát' }).click();
  202 |     expect((await matchResponse).status()).toBe(202);
  203 |     const transactions = await readList<{ id: string; externalTransactionId: string; matchState: string }>(page, 'bank-transactions');
  204 |     const imported = transactions.find(transaction => transaction.externalTransactionId === 'FE022-BANK-01');
  205 |     expect(imported).toMatchObject({ matchState: 'suggested' });
  206 |     const debts = await readList<{ id: string; outstandingAmount: { amount: string } }>(page, 'debts');
  207 |     expect(Number(debts.find(debt => debt.id === 'seed-debtitem-10028')?.outstandingAmount.amount)).toBe(Number(debtBefore?.outstandingAmount.amount) - 50000);
  208 | });
  209 | 
  210 | test('FE022.VS04 inbox → knowledge draft → bot evaluation preserves feedback and revision source IDs', async ({ page }) => {
  211 |     await gotoDemo(page, '/s/shop-demo/inbox/cv1');
  212 |     await page.getByRole('button', { name: /^Đánh giá tin nhắn/ }).first().click();
  213 |     const feedbackDialog = page.getByRole('dialog', { name: 'Đánh giá câu trả lời' });
  214 |     await feedbackDialog.getByRole('textbox', { name: 'Nội dung đề xuất sửa' }).fill('Xác minh điều kiện đổi hàng trước khi tư vấn.');
  215 |     const feedbackResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/feedback'));
  216 |     await feedbackDialog.getByRole('button', { name: 'Lưu phản hồi' }).click();
  217 |     const feedbackResponseResult = await feedbackResponse;
  218 |     expect(feedbackResponseResult.status()).toBe(201);
  219 |     const feedback = await feedbackResponseResult.json();
  220 |     expect(feedback.data.status).toBe('pending');
  221 | 
  222 |     await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Phản hồi cần duyệt' }).click();
  223 |     await page.getByRole('button', { name: 'Duyệt nội dung' }).click();
  224 |     const review = page.getByRole('dialog', { name: 'Kiểm tra phản hồi' });
  225 |     await review.getByRole('textbox', { name: 'Nội dung đã loại dữ liệu riêng tư' }).fill('Đã xác minh chính sách đổi hàng trong dữ liệu mẫu.');
  226 |     await review.getByRole('textbox', { name: 'Lý do' }).fill('Chấp nhận trong kịch bản frontend mô phỏng.');
  227 |     const reviewResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/feedback/${feedback.data.id}/review`));
  228 |     await review.getByRole('button', { name: 'Lưu kết quả' }).click();
  229 |     const reviewed = (await (await reviewResponse).json()).data;
  230 |     expect(reviewed).toMatchObject({ id: feedback.data.id, status: 'approved', knowledgeDraftId: expect.any(String) });
  231 | 
  232 |     await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Kiến thức cửa hàng' }).click();
  233 |     const draftRow = page.getByRole('row').filter({ hasText: 'Đề xuất từ phản hồi' });
  234 |     await expect(draftRow).toBeVisible();
  235 |     await draftRow.getByRole('link', { name: 'Đề xuất từ phản hồi' }).click();
  236 |     const detailResponse = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith(`/knowledge/${reviewed.knowledgeDraftId}`));
  237 |     const detail = (await (await detailResponse).json()).data;
  238 |     expect(detail).toMatchObject({ id: reviewed.knowledgeDraftId, status: 'draft', sourceKind: 'feedback' });
  239 |     await expect(page.getByText('Đã xác minh chính sách đổi hàng trong dữ liệu mẫu.', { exact: true })).toBeVisible();
  240 | 
  241 |     await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Chất lượng AI' }).click();
  242 |     await page.getByRole('button', { name: 'Chạy đánh giá', exact: true }).click();
  243 |     const evaluationDialog = page.getByRole('dialog', { name: 'Đánh giá cấu hình nháp' });
  244 |     await evaluationDialog.getByRole('textbox', { name: 'Phiên bản bộ kiểm thử đã đăng ký' }).fill('FE022-synthetic-dataset-v1');
  245 |     await evaluationDialog.getByRole('textbox', { name: 'Mã bản kiến thức (tùy chọn)' }).fill(detail.draftRevisionId);
  246 |     const evaluationResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/bot/evaluations'));
  247 |     await evaluationDialog.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
  248 |     const evaluation = (await (await evaluationResponse).json()).data;
  249 |     expect(evaluation).toMatchObject({ status: 'passed', knowledgeRevisionId: detail.draftRevisionId, mockOnly: true });
  250 | });
  251 | 
  252 | test('FE022.S05 route and feature matrix covers canonical IDs with executed cases or explicit frontend gaps', async () => {
  253 |     const readJson = <T,>(relative: string): T => JSON.parse(fs.readFileSync(path.resolve(process.cwd(), relative), 'utf8')) as T;
  254 |     const routeManifest = readJson<{ routes: Array<{ id: string; path: string; acceptanceScenarioIds: string[] }> }>('../botsales-kit/contracts/route-manifest.json');
  255 |     const featureCatalog = readJson<{ features: Array<{ id: string; title: string; scenarioId: string; routeIds: string[] }> }>('../botsales-kit/contracts/feature-catalog.json');
  256 |     const matrix = readJson<Array<{
  257 |         routeId: string;
  258 |         route: string;
  259 |         source: string;
  260 |         component: string;
  261 |         state: string;
  262 |         journeys: unknown[];
  263 |         routeEvidence: { testFile: string; testTitle: string; result: string; logFile: string };
  264 |         acceptanceScenarioIds: string[];
  265 |         featureCoverage: Array<{
  266 |             featureId: string;
  267 |             canonicalRouteIds: string[];
  268 |             coverage: string;
  269 |             gap: string;
  270 |             evidenceCases: Array<{ id: string; file: string; title: string; result: string; logFile: string }>;
  271 |         }>;
  272 |     }>>('docs/route-implementation.json');
  273 |     const routeSource = fs.readFileSync(path.resolve(process.cwd(), 'tests/frontend.spec.ts'), 'utf8');
  274 |     const journeySource = fs.readFileSync(path.resolve(process.cwd(), 'tests/vertical-slices/fe022-flows.spec.ts'), 'utf8');
  275 |     expect(routeManifest.routes.length).toBeGreaterThan(0);
  276 |     expect(featureCatalog.features.length).toBeGreaterThan(0);
  277 |     expect(matrix).toHaveLength(routeManifest.routes.length);
  278 |     expect(new Set(matrix.map(route => route.routeId))).toEqual(new Set(routeManifest.routes.map(route => route.id)));
  279 |     expect(new Set(routeManifest.routes.map(route => route.id)).size).toBe(routeManifest.routes.length);
  280 |     expect(new Set(featureCatalog.features.map(feature => feature.id)).size).toBe(featureCatalog.features.length);
  281 |     const sourceOnly = matrix.every(row => row.state === 'SOURCE_IMPLEMENTED_BROWSER_NOT_REVALIDATED');
  282 |     for (const feature of featureCatalog.features) {
  283 |         expect(feature.routeIds.length).toBeGreaterThan(0);
  284 |         expect(feature.routeIds.every(id => routeManifest.routes.some(route => route.id === id))).toBe(true);
  285 |     }
  286 | 
```