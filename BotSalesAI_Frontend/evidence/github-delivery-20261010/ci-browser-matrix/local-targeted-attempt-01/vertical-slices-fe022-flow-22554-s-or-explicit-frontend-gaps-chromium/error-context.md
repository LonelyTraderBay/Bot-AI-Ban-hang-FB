# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vertical-slices\fe022-flows.spec.ts >> FE022.S05 route and feature matrix covers canonical IDs with executed cases or explicit frontend gaps
- Location: tests\vertical-slices\fe022-flows.spec.ts:252:1

# Error details

```
Error: expect(received).toMatchObject(expected)

- Expected  - 1
+ Received  + 0

  Object {
    "acceptanceScenarioIds": Array [
      "SC2-F04",
      "SC2-F05",
-     "SC2-D06",
    ],
    "route": "/s/:shopId/approvals",
  }
```

# Test source

```ts
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
  287 |     for (const route of routeManifest.routes) {
  288 |         const row = matrix.find(item => item.routeId === route.id);
> 289 |         expect(row).toMatchObject({ route: route.path, acceptanceScenarioIds: route.acceptanceScenarioIds });
      |                     ^ Error: expect(received).toMatchObject(expected)
  290 |         expect(fs.readFileSync(path.resolve(process.cwd(), row!.source), 'utf8')).toContain(`function ${row!.component}(`);
  291 |         if (sourceOnly) {
  292 |             expect(row).toMatchObject({ state: 'SOURCE_IMPLEMENTED_BROWSER_NOT_REVALIDATED', routeEvidence: { result: 'NOT_RUN' }, journeys: [], featureCoverage: [] });
  293 |             expect(Object.keys(row!.routeEvidence)).toEqual(['result']);
  294 |             continue;
  295 |         }
  296 |         expect(row).toMatchObject({ route: route.path, state: 'BROWSER_ROUTE_RENDERED_WITH_SYNTHETIC_API', acceptanceScenarioIds: route.acceptanceScenarioIds });
  297 |         expect(row?.routeEvidence).toMatchObject({
  298 |             testFile: 'tests/frontend.spec.ts',
  299 |             testTitle: 'all canonical routes render inside the real React demo application',
  300 |             result: 'PASS',
  301 |         });
  302 |         expect(routeSource).toContain(row?.routeEvidence.testTitle || '');
  303 |         expect(fs.existsSync(path.resolve(process.cwd(), row?.routeEvidence.logFile || ''))).toBeTruthy();
  304 |         const expectedFeatures = featureCatalog.features.filter(feature => feature.routeIds.includes(route.id));
  305 |         expect(new Set(row?.featureCoverage.map(feature => feature.featureId))).toEqual(new Set(expectedFeatures.map(feature => feature.id)));
  306 |         for (const feature of row?.featureCoverage || []) {
  307 |             const definition = expectedFeatures.find(item => item.id === feature.featureId);
  308 |             expect(feature.canonicalRouteIds).toEqual(definition?.routeIds);
  309 |             expect(['ROUTE_MOUNT_ONLY', 'PARTIAL_SYNTHETIC_CROSS_MODULE_JOURNEY', 'FRONTEND_INTERACTION_VERIFIED_SYNTHETIC']).toContain(feature.coverage);
  310 |             expect(feature.gap.trim().length).toBeGreaterThan(20);
  311 |             expect(feature.evidenceCases.length).toBeGreaterThan(0);
  312 |             if (feature.coverage === 'FRONTEND_INTERACTION_VERIFIED_SYNTHETIC')
  313 |                 expect(feature.evidenceCases.some(evidence => evidence.id !== 'ROUTE-SMOKE-CANONICAL')).toBeTruthy();
  314 |             for (const evidence of feature.evidenceCases) {
  315 |                 expect(evidence.result).toBe('PASS');
  316 |                 expect(fs.existsSync(path.resolve(process.cwd(), evidence.file))).toBeTruthy();
  317 |                 expect(fs.existsSync(path.resolve(process.cwd(), evidence.logFile))).toBeTruthy();
  318 |                 const source = fs.readFileSync(path.resolve(process.cwd(), evidence.file), 'utf8');
  319 |                 expect(source).toContain(evidence.id === 'ROUTE-SMOKE-CANONICAL' ? evidence.title : evidence.id);
  320 |                 expect(fs.readFileSync(path.resolve(process.cwd(), evidence.logFile), 'utf8')).toContain(evidence.title);
  321 |             }
  322 |             expect(feature.coverage).toBe('FRONTEND_INTERACTION_VERIFIED_SYNTHETIC');
  323 |         }
  324 |     }
  325 |     const mappedIds = new Set(matrix.flatMap(route => route.featureCoverage.map(feature => feature.featureId)));
  326 |     const canonicalIds = new Set(featureCatalog.features.map(feature => feature.id));
  327 |     if (sourceOnly) expect(mappedIds.size).toBe(0);
  328 |     else expect(mappedIds).toEqual(canonicalIds);
  329 |     expect(journeySource).toContain('FE022.VS01');
  330 |     expect(journeySource).toContain('FE022.VS02');
  331 |     expect(journeySource).toContain('FE022.VS03');
  332 |     expect(journeySource).toContain('FE022.VS04');
  333 |     for (const featureId of ['B06', 'C04', 'E08', 'G05', 'F03']) {
  334 |         expect(canonicalIds.has(featureId)).toBeTruthy();
  335 |         if (sourceOnly) continue;
  336 |         const feature = matrix.flatMap(route => route.featureCoverage).find(item => item.featureId === featureId);
  337 |         expect(feature?.coverage).toBe('FRONTEND_INTERACTION_VERIFIED_SYNTHETIC');
  338 |     }
  339 | });
  340 | 
```