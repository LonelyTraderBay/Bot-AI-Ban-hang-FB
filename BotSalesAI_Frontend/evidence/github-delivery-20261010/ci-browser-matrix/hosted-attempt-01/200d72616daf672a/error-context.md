# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vertical-slices/fe022-flows.spec.ts >> FE022.S05 route and feature matrix covers canonical IDs with executed cases or explicit frontend gaps
- Location: tests/vertical-slices/fe022-flows.spec.ts:246:1

# Error details

```
Error: expect(received).toMatchObject(expected)

- Expected  - 1
+ Received  + 1

@@ -13,7 +13,7 @@
      "SC-011",
      "SC-054",
      "SC-055",
    ],
    "route": "/login",
-   "state": "BROWSER_ROUTE_RENDERED_WITH_SYNTHETIC_API",
+   "state": "SOURCE_IMPLEMENTED_BROWSER_NOT_REVALIDATED",
  }
```

# Test source

```ts
  173 |     await dialog.locator('input[type="file"]').setInputFiles({
  174 |         name: 'fe022-bank.csv', mimeType: 'text/csv',
  175 |         buffer: Buffer.from('externalTransactionId,amount,currency,direction,occurredAt,referenceText\nFE022-BANK-01,100000,VND,credit,2026-09-29T13:30:00Z,FE022 vertical reconciliation', 'utf8'),
  176 |     });
  177 |     await dialog.getByRole('textbox', { name: 'Tài khoản / đơn vị vận chuyển' }).fill('bank-fixture-01');
  178 |     await dialog.getByRole('textbox', { name: 'Mã đợt nhập duy nhất' }).fill('FE022-BANK-BATCH-01');
  179 |     const importResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/bank-transactions/import'));
  180 |     await dialog.getByRole('button', { name: 'Kiểm tra và nhập' }).click();
  181 |     expect((await importResponse).status()).toBe(200);
  182 |     await dialog.getByRole('button', { name: 'Hủy' }).click();
  183 | 
  184 |     await page.getByRole('tab', { name: 'Chênh lệch cần xử lý' }).click();
  185 |     const caseRow = page.getByRole('row').filter({ hasText: 'FE022-BANK-01' });
  186 |     await expect(caseRow).toBeVisible();
  187 |     const debtBefore = (await readList<{ id: string; outstandingAmount: { amount: string } }>(page, 'debts')).find(debt => debt.id === 'seed-debtitem-10028');
  188 |     expect(debtBefore).toBeTruthy();
  189 |     await caseRow.getByRole('button', { name: 'Ghép giao dịch' }).click();
  190 |     const matchDialog = page.getByRole('dialog', { name: 'Ghép giao dịch với công nợ' });
  191 |     await chooseOption(page, 'Khoản công nợ', /seed-debtitem-10028/, matchDialog);
  192 |     await matchDialog.getByRole('textbox', { name: 'Số tiền phân bổ (VND)' }).fill('50000');
  193 |     await matchDialog.getByRole('textbox', { name: 'Lý do' }).fill('Ghép một phần trong scenario FE022.');
  194 |     const matchResponse = page.waitForResponse(response => response.request().method() === 'POST' && /\/reconciliation-cases\/[^/]+\/match$/.test(new URL(response.url()).pathname));
  195 |     await matchDialog.getByRole('button', { name: 'Ghi kết quả đối soát' }).click();
  196 |     expect((await matchResponse).status()).toBe(202);
  197 |     const transactions = await readList<{ id: string; externalTransactionId: string; matchState: string }>(page, 'bank-transactions');
  198 |     const imported = transactions.find(transaction => transaction.externalTransactionId === 'FE022-BANK-01');
  199 |     expect(imported).toMatchObject({ matchState: 'suggested' });
  200 |     const debts = await readList<{ id: string; outstandingAmount: { amount: string } }>(page, 'debts');
  201 |     expect(Number(debts.find(debt => debt.id === 'seed-debtitem-10028')?.outstandingAmount.amount)).toBe(Number(debtBefore?.outstandingAmount.amount) - 50000);
  202 | });
  203 | 
  204 | test('FE022.VS04 inbox → knowledge draft → bot evaluation preserves feedback and revision source IDs', async ({ page }) => {
  205 |     await gotoDemo(page, '/s/shop-demo/inbox/cv1');
  206 |     await page.getByRole('button', { name: /^Đánh giá tin nhắn/ }).first().click();
  207 |     const feedbackDialog = page.getByRole('dialog', { name: 'Đánh giá câu trả lời' });
  208 |     await feedbackDialog.getByRole('textbox', { name: 'Nội dung đề xuất sửa' }).fill('Xác minh điều kiện đổi hàng trước khi tư vấn.');
  209 |     const feedbackResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/feedback'));
  210 |     await feedbackDialog.getByRole('button', { name: 'Lưu phản hồi' }).click();
  211 |     const feedbackResponseResult = await feedbackResponse;
  212 |     expect(feedbackResponseResult.status()).toBe(201);
  213 |     const feedback = await feedbackResponseResult.json();
  214 |     expect(feedback.data.status).toBe('pending');
  215 | 
  216 |     await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Phản hồi cần duyệt' }).click();
  217 |     await page.getByRole('button', { name: 'Duyệt nội dung' }).click();
  218 |     const review = page.getByRole('dialog', { name: 'Kiểm tra phản hồi' });
  219 |     await review.getByRole('textbox', { name: 'Nội dung đã loại dữ liệu riêng tư' }).fill('Đã xác minh chính sách đổi hàng trong dữ liệu mẫu.');
  220 |     await review.getByRole('textbox', { name: 'Lý do' }).fill('Chấp nhận trong kịch bản frontend mô phỏng.');
  221 |     const reviewResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/feedback/${feedback.data.id}/review`));
  222 |     await review.getByRole('button', { name: 'Lưu kết quả' }).click();
  223 |     const reviewed = (await (await reviewResponse).json()).data;
  224 |     expect(reviewed).toMatchObject({ id: feedback.data.id, status: 'approved', knowledgeDraftId: expect.any(String) });
  225 | 
  226 |     await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Kiến thức cửa hàng' }).click();
  227 |     const draftRow = page.getByRole('row').filter({ hasText: 'Đề xuất từ phản hồi' });
  228 |     await expect(draftRow).toBeVisible();
  229 |     await draftRow.getByRole('link', { name: 'Đề xuất từ phản hồi' }).click();
  230 |     const detailResponse = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith(`/knowledge/${reviewed.knowledgeDraftId}`));
  231 |     const detail = (await (await detailResponse).json()).data;
  232 |     expect(detail).toMatchObject({ id: reviewed.knowledgeDraftId, status: 'draft', sourceKind: 'feedback' });
  233 |     await expect(page.getByText('Đã xác minh chính sách đổi hàng trong dữ liệu mẫu.', { exact: true })).toBeVisible();
  234 | 
  235 |     await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Chất lượng AI' }).click();
  236 |     await page.getByRole('button', { name: 'Chạy đánh giá', exact: true }).click();
  237 |     const evaluationDialog = page.getByRole('dialog', { name: 'Đánh giá cấu hình nháp' });
  238 |     await evaluationDialog.getByRole('textbox', { name: 'Phiên bản bộ kiểm thử đã đăng ký' }).fill('FE022-synthetic-dataset-v1');
  239 |     await evaluationDialog.getByRole('textbox', { name: 'Mã bản kiến thức (tùy chọn)' }).fill(detail.draftRevisionId);
  240 |     const evaluationResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/bot/evaluations'));
  241 |     await evaluationDialog.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
  242 |     const evaluation = (await (await evaluationResponse).json()).data;
  243 |     expect(evaluation).toMatchObject({ status: 'passed', knowledgeRevisionId: detail.draftRevisionId, mockOnly: true });
  244 | });
  245 | 
  246 | test('FE022.S05 route and feature matrix covers canonical IDs with executed cases or explicit frontend gaps', async () => {
  247 |     const readJson = <T,>(relative: string): T => JSON.parse(fs.readFileSync(path.resolve(process.cwd(), relative), 'utf8')) as T;
  248 |     const routeManifest = readJson<{ routes: Array<{ id: string; path: string; acceptanceScenarioIds: string[] }> }>('../botsales-kit/contracts/route-manifest.json');
  249 |     const featureCatalog = readJson<{ features: Array<{ id: string; title: string; scenarioId: string; routeIds: string[] }> }>('../botsales-kit/contracts/feature-catalog.json');
  250 |     const matrix = readJson<Array<{
  251 |         routeId: string;
  252 |         route: string;
  253 |         state: string;
  254 |         routeEvidence: { testFile: string; testTitle: string; result: string; logFile: string };
  255 |         acceptanceScenarioIds: string[];
  256 |         featureCoverage: Array<{
  257 |             featureId: string;
  258 |             canonicalRouteIds: string[];
  259 |             coverage: string;
  260 |             gap: string;
  261 |             evidenceCases: Array<{ id: string; file: string; title: string; result: string; logFile: string }>;
  262 |         }>;
  263 |     }>>('docs/route-implementation.json');
  264 |     const routeSource = fs.readFileSync(path.resolve(process.cwd(), 'tests/frontend.spec.ts'), 'utf8');
  265 |     const journeySource = fs.readFileSync(path.resolve(process.cwd(), 'tests/vertical-slices/fe022-flows.spec.ts'), 'utf8');
  266 |     expect(routeManifest.routes.length).toBeGreaterThan(0);
  267 |     expect(featureCatalog.features.length).toBeGreaterThan(0);
  268 |     expect(matrix).toHaveLength(routeManifest.routes.length);
  269 |     expect(new Set(matrix.map(route => route.routeId))).toEqual(new Set(routeManifest.routes.map(route => route.id)));
  270 | 
  271 |     for (const route of routeManifest.routes) {
  272 |         const row = matrix.find(item => item.routeId === route.id);
> 273 |         expect(row).toMatchObject({ route: route.path, state: 'BROWSER_ROUTE_RENDERED_WITH_SYNTHETIC_API', acceptanceScenarioIds: route.acceptanceScenarioIds });
      |                     ^ Error: expect(received).toMatchObject(expected)
  274 |         expect(row?.routeEvidence).toMatchObject({
  275 |             testFile: 'tests/frontend.spec.ts',
  276 |             testTitle: 'all canonical routes render inside the real React demo application',
  277 |             result: 'PASS',
  278 |         });
  279 |         expect(routeSource).toContain(row?.routeEvidence.testTitle || '');
  280 |         expect(fs.existsSync(path.resolve(process.cwd(), row?.routeEvidence.logFile || ''))).toBeTruthy();
  281 |         const expectedFeatures = featureCatalog.features.filter(feature => feature.routeIds.includes(route.id));
  282 |         expect(new Set(row?.featureCoverage.map(feature => feature.featureId))).toEqual(new Set(expectedFeatures.map(feature => feature.id)));
  283 |         for (const feature of row?.featureCoverage || []) {
  284 |             const definition = expectedFeatures.find(item => item.id === feature.featureId);
  285 |             expect(feature.canonicalRouteIds).toEqual(definition?.routeIds);
  286 |             expect(['ROUTE_MOUNT_ONLY', 'PARTIAL_SYNTHETIC_CROSS_MODULE_JOURNEY', 'FRONTEND_INTERACTION_VERIFIED_SYNTHETIC']).toContain(feature.coverage);
  287 |             expect(feature.gap.trim().length).toBeGreaterThan(20);
  288 |             expect(feature.evidenceCases.length).toBeGreaterThan(0);
  289 |             if (feature.coverage === 'FRONTEND_INTERACTION_VERIFIED_SYNTHETIC')
  290 |                 expect(feature.evidenceCases.some(evidence => evidence.id !== 'ROUTE-SMOKE-CANONICAL')).toBeTruthy();
  291 |             for (const evidence of feature.evidenceCases) {
  292 |                 expect(evidence.result).toBe('PASS');
  293 |                 expect(fs.existsSync(path.resolve(process.cwd(), evidence.file))).toBeTruthy();
  294 |                 expect(fs.existsSync(path.resolve(process.cwd(), evidence.logFile))).toBeTruthy();
  295 |                 const source = fs.readFileSync(path.resolve(process.cwd(), evidence.file), 'utf8');
  296 |                 expect(source).toContain(evidence.id === 'ROUTE-SMOKE-CANONICAL' ? evidence.title : evidence.id);
  297 |                 expect(fs.readFileSync(path.resolve(process.cwd(), evidence.logFile), 'utf8')).toContain(evidence.title);
  298 |             }
  299 |             expect(feature.coverage).toBe('FRONTEND_INTERACTION_VERIFIED_SYNTHETIC');
  300 |         }
  301 |     }
  302 |     const mappedIds = new Set(matrix.flatMap(route => route.featureCoverage.map(feature => feature.featureId)));
  303 |     expect(mappedIds).toEqual(new Set(featureCatalog.features.map(feature => feature.id)));
  304 |     expect(journeySource).toContain('FE022.VS01');
  305 |     expect(journeySource).toContain('FE022.VS02');
  306 |     expect(journeySource).toContain('FE022.VS03');
  307 |     expect(journeySource).toContain('FE022.VS04');
  308 |     expect(mappedIds.has('B06')).toBeTruthy();
  309 |     expect(mappedIds.has('C04')).toBeTruthy();
  310 |     expect(mappedIds.has('E08')).toBeTruthy();
  311 |     for (const featureId of ['B06', 'C04', 'E08', 'G05', 'F03']) {
  312 |         const feature = matrix.flatMap(route => route.featureCoverage).find(item => item.featureId === featureId);
  313 |         expect(feature?.coverage).toBe('FRONTEND_INTERACTION_VERIFIED_SYNTHETIC');
  314 |     }
  315 | });
  316 | 
```