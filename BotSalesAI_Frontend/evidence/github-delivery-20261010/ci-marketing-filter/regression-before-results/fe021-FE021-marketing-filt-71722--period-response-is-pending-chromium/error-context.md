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
Expected: "2026-09-18"
Received: "2026-08-31"
Timeout:  5000ms

Call log:
  - Expect "toHaveValue" getByLabel('Từ ngày', { exact: true }) with timeout 5000ms
  - waiting for getByLabel('Từ ngày', { exact: true })
    13 × locator resolved to <input id="«rl»" type="date" value="2026-08-31" aria-invalid="false" aria-describedby="«rl»-helper-text" class="MuiInputBase-input MuiOutlinedInput-input css-1txw9lp-MuiInputBase-input-MuiOutlinedInput-input"/>
       - unexpected value "2026-08-31"

```

```yaml
- textbox "Từ ngày": 2026-08-31
```

# Test source

```ts
  90  |     await gotoDemo(page, '/s/shop-demo/shipments');
  91  |     const shipments = page.getByRole('table', { name: 'Danh sách vận đơn' });
  92  |     const previewToggle = page.getByRole('button', { name: 'Mở bản xem thử phí giao hàng' });
  93  |     await expect(shipments).toBeVisible();
  94  |     await expect(previewToggle).toBeVisible();
  95  |     expect((await shipments.boundingBox())?.y).toBeLessThan((await previewToggle.boundingBox())?.y ?? Infinity);
  96  |     await previewToggle.click();
  97  |     await expect(page.getByTestId('shipment-fee-preview')).toBeVisible();
  98  |     await page.getByRole('button', { name: 'Ẩn bản xem thử phí giao hàng' }).click();
  99  |     await expect(page.getByTestId('shipment-fee-preview')).toBeHidden();
  100 |     await page.getByRole('button', { name: 'Mở bản xem thử phí giao hàng' }).click();
  101 |     await expect(page.getByTestId('shipment-fee-preview')).toBeVisible();
  102 | });
  103 | 
  104 | test('FE021 marketing filters preserve API-side aggregates, URL context and missing actual spend', async ({ page }) => {
  105 |     const responsePromise = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/marketing-summary'));
  106 |     await gotoDemo(page, '/s/shop-demo/reports/marketing');
  107 |     const response = await responsePromise;
  108 |     expect(response.status()).toBe(200);
  109 |     const envelope = await response.json();
  110 |     const reasons = envelope.data.lostSaleReasons as Array<{ reason: string; count: number }>;
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
> 190 |             await expect(from).toHaveValue('2026-09-18');
      |                                ^ Error: expect(locator).toHaveValue(expected) failed
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
  208 |             await page.goBack();
  209 |             await expect(from).toHaveValue('2026-08-31');
  210 |             await expect(to).toHaveValue('2026-09-29');
  211 |             await page.goForward();
  212 |             await expect(from).toHaveValue('2026-09-18');
  213 |             await expect(page.getByRole('combobox', { name: 'Gộp theo' })).toHaveText('Tuần');
  214 |         }
  215 |     });
  216 | }
  217 | 
  218 | test('FE021 invalid marketing deep links mark the responsible field and never send the invalid range', async ({ page }) => {
  219 |     let marketingRequests = 0;
  220 |     page.on('request', request => {
  221 |         if (new URL(request.url()).pathname.endsWith('/marketing-summary')) marketingRequests++;
  222 |     });
  223 |     await gotoDemo(page, '/s/shop-demo/reports/marketing?fromDate=2026-10-02&toDate=2026-10-01&bucket=day');
  224 | 
  225 |     const from = page.getByRole('textbox', { name: 'Từ ngày' });
  226 |     await expect(from).toHaveAttribute('aria-invalid', 'true');
  227 |     await expect(page.getByText('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.', { exact: true })).toBeVisible();
  228 |     await expect(page.getByRole('alert').filter({ hasText: 'Bộ lọc trên đường dẫn không hợp lệ.' })).toContainText('Hãy sửa trường được đánh dấu');
  229 |     expect(marketingRequests).toBe(0);
  230 | });
  231 | 
  232 | test('FE021 export uses inclusive shop-local boundaries, safe CSV, API jobs and cursor pagination', async ({ page }) => {
  233 |     test.setTimeout(45_000);
  234 |     await gotoDemo(page, '/s/shop-demo/overview');
  235 |     await setDemoRole(page, 'owner');
  236 |     await gotoDemo(page, '/s/shop-demo/reports');
  237 |     await expect(page.getByRole('heading', { name: 'Tạo tệp báo cáo' })).toBeVisible();
  238 |     await page.getByLabel('Từ ngày').fill('2026-09-29');
  239 |     await page.getByLabel('Đến ngày').fill('2026-09-29');
  240 | 
  241 |     const exportResponsePromise = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/exports'));
  242 |     await page.getByRole('button', { name: 'Tạo tệp báo cáo CSV' }).click();
  243 |     const exportResponse = await exportResponsePromise;
  244 |     expect(exportResponse.status()).toBe(202);
  245 |     const exportEnvelope = await exportResponse.json();
  246 |     const exportBody = exportResponse.request().postDataJSON();
  247 |     expect(exportBody).toMatchObject({ reportType: 'orders', format: 'csv', timezone: 'Asia/Vientiane', from: '2026-09-28T17:00:00.000Z', to: '2026-09-29T16:59:59.999Z', snapshotAsOf: '2026-09-29T14:00:00.000Z' });
  248 |     expect(exportEnvelope.data).toMatchObject({ kind: 'export', status: 'succeeded', total: expect.any(Number) });
  249 |     await expect(page.getByRole('link', { name: `Theo dõi công việc ${exportEnvelope.data.id}` })).toBeVisible();
  250 | 
  251 |     const csvText = await page.evaluate(async url => await (await fetch(url)).text(), exportEnvelope.data.downloadUrl as string);
  252 |     expect(csvText).toContain('"orderId","createdAt","orderState","fulfillmentState","paymentState","totalAmount","currency"');
  253 |     expect(csvText).toContain('DH-DEMO-RETURN-02');
  254 |     expect(csvText).not.toContain('customerId');
  255 |     expect(csvText).not.toContain('shippingAddressId');
  256 |     await expect(page.getByRole('link', { name: 'Tải CSV' })).toBeVisible();
  257 |     const downloadPromise = page.waitForEvent('download');
  258 |     await page.getByRole('link', { name: 'Tải CSV' }).click();
  259 |     expect((await downloadPromise).suggestedFilename()).toBe('botsales-orders-2026-09-29-2026-09-29.csv');
  260 |     await expect(page.getByRole('row').filter({ hasText: exportEnvelope.data.id })).toBeVisible();
  261 | 
  262 |     const csrf = 'botsales-demo-csrf-not-a-real-secret';
  263 |     for (let index = 0; index < 11; index++) {
  264 |         const status = await page.evaluate(async ({ csrfToken, requestIndex }) => {
  265 |             const response = await fetch('/api/v2/shops/shop-demo/exports', {
  266 |                 method: 'POST',
  267 |                 headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, 'Idempotency-Key': `fe021-page-${requestIndex}` },
  268 |                 body: JSON.stringify({ reportType: 'orders', format: 'csv', from: '2026-09-28T17:00:00.000Z', to: '2026-09-29T16:59:59.999Z', timezone: 'Asia/Vientiane', snapshotAsOf: '2026-09-29T14:00:00.000Z' }),
  269 |             });
  270 |             return response.status;
  271 |         }, { csrfToken: csrf, requestIndex: index });
  272 |         expect(status).toBe(202);
  273 |     }
  274 |     const pages = await page.evaluate(async () => {
  275 |         const first = await (await fetch('/api/v2/shops/shop-demo/jobs?limit=10')).json();
  276 |         const nextCursor = encodeURIComponent(first.page.nextCursor as string);
  277 |         const second = await (await fetch(`/api/v2/shops/shop-demo/jobs?limit=10&cursor=${nextCursor}`)).json();
  278 |         return { first, second };
  279 |     });
  280 |     expect(pages.first.data.length).toBe(10);
  281 |     expect(pages.first.page.total).toBeGreaterThanOrEqual(12);
  282 |     expect(pages.first.page.hasMore).toBe(true);
  283 |     expect(pages.second.data.length).toBeGreaterThanOrEqual(2);
  284 |     expect(pages.second.page.hasMore).toBe(false);
  285 | });
  286 | 
  287 | test('FE021 mock rejects an export when reports.export lacks the source permission', async ({ page }) => {
  288 |     test.setTimeout(45_000);
  289 |     await gotoDemo(page, '/s/shop-demo/reports');
  290 |     await chooseOption(page, 'Vai trò mô phỏng', 'accountant');
```