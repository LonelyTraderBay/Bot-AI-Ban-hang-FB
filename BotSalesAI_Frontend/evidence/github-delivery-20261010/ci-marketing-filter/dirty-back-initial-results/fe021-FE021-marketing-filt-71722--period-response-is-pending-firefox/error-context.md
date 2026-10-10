# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fe021.spec.ts >> FE021 marketing filters preserve edits while the default period response is pending
- Location: tests\fe021.spec.ts:161:5

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  getByLabel('Từ ngày', { exact: true })
Expected: "2026-08-31"
Received: "2026-09-20"
Timeout:  5000ms

Call log:
  - Expect "toHaveValue" getByLabel('Từ ngày', { exact: true }) with timeout 5000ms
  - waiting for getByLabel('Từ ngày', { exact: true })
    14 × locator resolved to <input id="«rl»" type="date" value="2026-09-20" aria-invalid="false" aria-describedby="«rl»-helper-text" class="MuiInputBase-input MuiOutlinedInput-input css-1txw9lp-MuiInputBase-input-MuiOutlinedInput-input"/>
       - unexpected value "2026-09-20"

```

```yaml
- textbox "Từ ngày": 2026-09-20
```

# Test source

```ts
  111 |     expect(reasons.length).toBeGreaterThan(0);
  112 |     await expect(page.getByTestId('marketing-loss-chart')).toBeVisible();
  113 |     await expect(page.getByTestId('marketing-trend-chart')).toBeVisible();
  114 |     await expect(page).toHaveURL(/fromDate=2026-08-31.*toDate=2026-09-29.*bucket=day/);
  115 |     expect(envelope.data.period).toMatchObject({ fromDate: '2026-08-31', toDate: '2026-09-29', bucket: 'day', timezone: 'Asia/Vientiane' });
  116 |     const table = page.getByRole('table', { name: 'Lý do không chốt đơn' });
  117 |     await expect(table.getByRole('row')).toHaveCount(reasons.length + 1);
  118 |     for (const reason of reasons) {
  119 |         const row = table.getByRole('row').filter({ hasText: reason.reason });
  120 |         await expect(row.getByRole('cell', { name: String(reason.count), exact: true })).toBeVisible();
  121 |     }
  122 |     expect(envelope.data.actualSpend).toBeNull();
  123 |     await expect(page.getByText('Kỳ này chưa có số thực tế từ API', { exact: true })).toBeVisible();
  124 |     await expect(page.getByText('Ước tính không phải số ghi sổ', { exact: true })).toBeVisible();
  125 | 
  126 |     await page.getByLabel('Từ ngày').fill('2026-09-18');
  127 |     await page.getByLabel('Đến ngày').fill('2026-09-24');
  128 |     await chooseOption(page, 'Gộp theo', 'Tuần');
  129 |     const filteredResponsePromise = page.waitForResponse(candidate => {
  130 |         const url = new URL(candidate.url());
  131 |         return candidate.request().method() === 'GET'
  132 |             && url.pathname.endsWith('/marketing-summary')
  133 |             && url.searchParams.get('fromDate') === '2026-09-18'
  134 |             && url.searchParams.get('toDate') === '2026-09-24'
  135 |             && url.searchParams.get('bucket') === 'week';
  136 |     });
  137 |     await page.getByRole('button', { name: 'Áp dụng' }).click();
  138 |     const filteredResponse = await filteredResponsePromise;
  139 |     expect(filteredResponse.status()).toBe(200);
  140 |     const filtered = (await filteredResponse.json()).data;
  141 |     expect(filtered).toMatchObject({ knownAttributedOrders: 2, unknownAttributionOrders: 1, estimatedSpend: { amount: '400000', currency: 'VND' }, actualSpend: null });
  142 |     expect(filtered.trend).toHaveLength(2);
  143 |     await expect(page).toHaveURL(/fromDate=2026-09-18.*toDate=2026-09-24.*bucket=week/);
  144 |     await page.reload();
  145 |     await expect(page.getByLabel('Từ ngày')).toHaveValue('2026-09-18');
  146 |     await expect(page.getByRole('combobox', { name: 'Gộp theo' })).toHaveText('Tuần');
  147 | 
  148 |     let marketingRequests = 0;
  149 |     page.on('request', request => {
  150 |         if (new URL(request.url()).pathname.endsWith('/marketing-summary')) marketingRequests++;
  151 |     });
  152 |     const beforeInvalidSubmit = marketingRequests;
  153 |     await page.getByLabel('Từ ngày').fill('2025-10-01');
  154 |     await page.getByLabel('Đến ngày').fill('2026-10-02');
  155 |     await page.getByRole('button', { name: 'Áp dụng' }).click();
  156 |     await expect(page.getByRole('alert').filter({ hasText: 'không được vượt quá 366 ngày' })).toBeVisible();
  157 |     expect(marketingRequests).toBe(beforeInvalidSubmit);
  158 | });
  159 | 
  160 | for (const heldPeriod of ['default', 'canonical'] as const) {
  161 |     test(`FE021 marketing filters preserve edits while the ${heldPeriod} period response is pending`, async ({ page }) => {
  162 |         await page.addInitScript(period => {
  163 |             const state = window as unknown as { marketingPeriodPending?: boolean; releaseMarketingPeriod?: () => void };
  164 |             const nativeFetch = window.fetch.bind(window);
  165 |             const gate = new Promise<void>(resolve => { state.releaseMarketingPeriod = resolve; });
  166 |             window.fetch = async (...args: Parameters<typeof fetch>) => {
  167 |                 const input = args[0];
  168 |                 const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
  169 |                 const response = await nativeFetch(...args);
  170 |                 const canonical = url.searchParams.get('fromDate') === '2026-08-31' && url.searchParams.get('toDate') === '2026-09-29';
  171 |                 if (url.pathname.endsWith('/marketing-summary') && (period === 'canonical' ? canonical : !url.searchParams.has('fromDate'))) {
  172 |                     state.marketingPeriodPending = true;
  173 |                     await gate;
  174 |                 }
  175 |                 return response;
  176 |             };
  177 |         }, heldPeriod);
  178 | 
  179 |         for (const width of [1280, 320]) {
  180 |             await page.setViewportSize({ width, height: 900 });
  181 |             await gotoDemo(page, '/s/shop-demo/reports/marketing');
  182 |             await page.waitForFunction(() => (window as unknown as { marketingPeriodPending?: boolean }).marketingPeriodPending === true);
  183 |             const from = page.getByLabel('Từ ngày', { exact: true });
  184 |             const to = page.getByLabel('Đến ngày', { exact: true });
  185 |             await from.fill('2026-09-18');
  186 |             await to.fill('2026-09-24');
  187 |             await chooseOption(page, 'Gộp theo', 'Tuần');
  188 |             await page.evaluate(() => (window as unknown as { releaseMarketingPeriod: () => void }).releaseMarketingPeriod());
  189 |             await expect(page.getByTestId('marketing-loss-chart')).toBeVisible();
  190 |             await expect(from).toHaveValue('2026-09-18');
  191 |             await expect(to).toHaveValue('2026-09-24');
  192 |             await expect(page.getByRole('combobox', { name: 'Gộp theo' })).toHaveText('Tuần');
  193 | 
  194 |             const filtered = page.waitForResponse(response => {
  195 |                 const url = new URL(response.url());
  196 |                 return response.request().method() === 'GET' && url.pathname.endsWith('/marketing-summary')
  197 |                     && url.searchParams.get('fromDate') === '2026-09-18' && url.searchParams.get('toDate') === '2026-09-24'
  198 |                     && url.searchParams.get('bucket') === 'week';
  199 |             });
  200 |             await page.getByRole('button', { name: 'Áp dụng', exact: true }).click();
  201 |             const result = await filtered;
  202 |             expect(result.status()).toBe(200);
  203 |             expect((await result.json()).data).toMatchObject({
  204 |                 period: { fromDate: '2026-09-18', toDate: '2026-09-24', bucket: 'week' },
  205 |                 knownAttributedOrders: 2, unknownAttributionOrders: 1, actualSpend: null,
  206 |             });
  207 |             await expect(page).toHaveURL(/fromDate=2026-09-18.*toDate=2026-09-24.*bucket=week/);
  208 |             await from.fill('2026-09-20');
  209 |             await to.fill('2026-09-26');
  210 |             await page.goBack();
> 211 |             await expect(from).toHaveValue('2026-08-31');
      |                                ^ Error: expect(locator).toHaveValue(expected) failed
  212 |             await expect(to).toHaveValue('2026-09-29');
  213 |             await page.goForward();
  214 |             await expect(from).toHaveValue('2026-09-18');
  215 |             await expect(page.getByRole('combobox', { name: 'Gộp theo' })).toHaveText('Tuần');
  216 |             await test.info().attach(`marketing-filter-${heldPeriod}-${width}.json`, {
  217 |                 body: JSON.stringify({ heldPeriod, width, fromDate: await from.inputValue(), toDate: await to.inputValue(),
  218 |                     bucket: await page.getByRole('combobox', { name: 'Gộp theo' }).innerText(), url: page.url(), apiStatus: result.status() }),
  219 |                 contentType: 'application/json',
  220 |             });
  221 |         }
  222 |     });
  223 | }
  224 | 
  225 | test('FE021 invalid marketing deep links mark the responsible field and never send the invalid range', async ({ page }) => {
  226 |     let marketingRequests = 0;
  227 |     page.on('request', request => {
  228 |         if (new URL(request.url()).pathname.endsWith('/marketing-summary')) marketingRequests++;
  229 |     });
  230 |     await gotoDemo(page, '/s/shop-demo/reports/marketing?fromDate=2026-10-02&toDate=2026-10-01&bucket=day');
  231 | 
  232 |     const from = page.getByRole('textbox', { name: 'Từ ngày' });
  233 |     await expect(from).toHaveAttribute('aria-invalid', 'true');
  234 |     await expect(page.getByText('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.', { exact: true })).toBeVisible();
  235 |     await expect(page.getByRole('alert').filter({ hasText: 'Bộ lọc trên đường dẫn không hợp lệ.' })).toContainText('Hãy sửa trường được đánh dấu');
  236 |     expect(marketingRequests).toBe(0);
  237 | });
  238 | 
  239 | test('FE021 export uses inclusive shop-local boundaries, safe CSV, API jobs and cursor pagination', async ({ page }) => {
  240 |     test.setTimeout(45_000);
  241 |     await gotoDemo(page, '/s/shop-demo/overview');
  242 |     await setDemoRole(page, 'owner');
  243 |     await gotoDemo(page, '/s/shop-demo/reports');
  244 |     await expect(page.getByRole('heading', { name: 'Tạo tệp báo cáo' })).toBeVisible();
  245 |     await page.getByLabel('Từ ngày').fill('2026-09-29');
  246 |     await page.getByLabel('Đến ngày').fill('2026-09-29');
  247 | 
  248 |     const exportResponsePromise = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/exports'));
  249 |     await page.getByRole('button', { name: 'Tạo tệp báo cáo CSV' }).click();
  250 |     const exportResponse = await exportResponsePromise;
  251 |     expect(exportResponse.status()).toBe(202);
  252 |     const exportEnvelope = await exportResponse.json();
  253 |     const exportBody = exportResponse.request().postDataJSON();
  254 |     expect(exportBody).toMatchObject({ reportType: 'orders', format: 'csv', timezone: 'Asia/Vientiane', from: '2026-09-28T17:00:00.000Z', to: '2026-09-29T16:59:59.999Z', snapshotAsOf: '2026-09-29T14:00:00.000Z' });
  255 |     expect(exportEnvelope.data).toMatchObject({ kind: 'export', status: 'succeeded', total: expect.any(Number) });
  256 |     await expect(page.getByRole('link', { name: `Theo dõi công việc ${exportEnvelope.data.id}` })).toBeVisible();
  257 | 
  258 |     const csvText = await page.evaluate(async url => await (await fetch(url)).text(), exportEnvelope.data.downloadUrl as string);
  259 |     expect(csvText).toContain('"orderId","createdAt","orderState","fulfillmentState","paymentState","totalAmount","currency"');
  260 |     expect(csvText).toContain('DH-DEMO-RETURN-02');
  261 |     expect(csvText).not.toContain('customerId');
  262 |     expect(csvText).not.toContain('shippingAddressId');
  263 |     await expect(page.getByRole('link', { name: 'Tải CSV' })).toBeVisible();
  264 |     const downloadPromise = page.waitForEvent('download');
  265 |     await page.getByRole('link', { name: 'Tải CSV' }).click();
  266 |     expect((await downloadPromise).suggestedFilename()).toBe('botsales-orders-2026-09-29-2026-09-29.csv');
  267 |     await expect(page.getByRole('row').filter({ hasText: exportEnvelope.data.id })).toBeVisible();
  268 | 
  269 |     const csrf = 'botsales-demo-csrf-not-a-real-secret';
  270 |     for (let index = 0; index < 11; index++) {
  271 |         const status = await page.evaluate(async ({ csrfToken, requestIndex }) => {
  272 |             const response = await fetch('/api/v2/shops/shop-demo/exports', {
  273 |                 method: 'POST',
  274 |                 headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, 'Idempotency-Key': `fe021-page-${requestIndex}` },
  275 |                 body: JSON.stringify({ reportType: 'orders', format: 'csv', from: '2026-09-28T17:00:00.000Z', to: '2026-09-29T16:59:59.999Z', timezone: 'Asia/Vientiane', snapshotAsOf: '2026-09-29T14:00:00.000Z' }),
  276 |             });
  277 |             return response.status;
  278 |         }, { csrfToken: csrf, requestIndex: index });
  279 |         expect(status).toBe(202);
  280 |     }
  281 |     const pages = await page.evaluate(async () => {
  282 |         const first = await (await fetch('/api/v2/shops/shop-demo/jobs?limit=10')).json();
  283 |         const nextCursor = encodeURIComponent(first.page.nextCursor as string);
  284 |         const second = await (await fetch(`/api/v2/shops/shop-demo/jobs?limit=10&cursor=${nextCursor}`)).json();
  285 |         return { first, second };
  286 |     });
  287 |     expect(pages.first.data.length).toBe(10);
  288 |     expect(pages.first.page.total).toBeGreaterThanOrEqual(12);
  289 |     expect(pages.first.page.hasMore).toBe(true);
  290 |     expect(pages.second.data.length).toBeGreaterThanOrEqual(2);
  291 |     expect(pages.second.page.hasMore).toBe(false);
  292 | });
  293 | 
  294 | test('FE021 mock rejects an export when reports.export lacks the source permission', async ({ page }) => {
  295 |     test.setTimeout(45_000);
  296 |     await gotoDemo(page, '/s/shop-demo/reports');
  297 |     await chooseOption(page, 'Vai trò mô phỏng', 'accountant');
  298 |     const denied = await page.evaluate(async (csrfToken) => {
  299 |         const response = await fetch('/api/v2/shops/shop-demo/exports', {
  300 |             method: 'POST',
  301 |             headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, 'Idempotency-Key': 'fe021-source-permission-denied' },
  302 |             body: JSON.stringify({ reportType: 'inventory', format: 'csv', from: '2026-09-28T17:00:00.000Z', to: '2026-09-29T16:59:59.999Z', timezone: 'Asia/Vientiane', snapshotAsOf: '2026-09-29T14:00:00.000Z' }),
  303 |         });
  304 |         return { status: response.status, contentType: response.headers.get('content-type'), body: await response.text() };
  305 |     }, 'botsales-demo-csrf-not-a-real-secret');
  306 |     expect(denied.status).toBe(403);
  307 |     expect(denied.contentType).toContain('application/json');
  308 |     expect(JSON.parse(denied.body).code).toBe('SOURCE_PERMISSION_REQUIRED');
  309 |     await expect(page.getByRole('combobox', { name: 'Báo cáo' })).toBeVisible();
  310 |     await page.getByRole('combobox', { name: 'Báo cáo' }).click();
  311 |     await expect(page.getByRole('option', { name: 'Tồn kho', exact: true })).toHaveCount(0);
```