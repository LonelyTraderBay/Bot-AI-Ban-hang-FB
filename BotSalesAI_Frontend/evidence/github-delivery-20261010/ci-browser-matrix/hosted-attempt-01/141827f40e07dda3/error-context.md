# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: artifacts/demo-preview.spec.ts >> a thousand synthetic customers remain API-paginated in the built demo artifact
- Location: tests/artifacts/demo-preview.spec.ts:104:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: getByRole('status')
Expected: "Đã tải 1.000 khách hàng tổng hợp vào API mô phỏng."
Error: strict mode violation: getByRole('status') resolved to 6 elements:
    1) <span role="status" class="MuiTypography-root MuiTypography-caption css-1nw296c">Đã tải 1.000 khách hàng tổng hợp vào API mô phỏng.</span> aka getByText('Đã tải 1.000 khách hàng tổng')
    2) <div role="status" aria-live="polite" class="MuiStack-root css-16enuio">…</div> aka getByRole('status').nth(1)
    3) <div role="status" class="MuiBox-root css-0">Đang tải số liệu tài chính…</div> aka getByText('Đang tải số liệu tài chính…')
    4) <div role="status" aria-live="polite" class="MuiStack-root css-16enuio">…</div> aka getByRole('status').nth(3)
    5) <div role="status" aria-live="polite" class="MuiStack-root css-16enuio">…</div> aka getByRole('status').nth(4)
    6) <div role="status" aria-live="polite" class="MuiStack-root css-s8lgwd">…</div> aka getByRole('status').nth(5)

Call log:
  - Expect "toHaveText" getByRole('status') with timeout 5000ms
  - waiting for getByRole('status')

```

# Test source

```ts
  10  | const root = process.cwd();
  11  | const webRoot = path.join(root, 'apps/web');
  12  | let server: PreviewServer | undefined;
  13  | let baseUrl = '';
  14  | 
  15  | function filesUnder(directory: string): string[] {
  16  |     return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  17  |         const file = path.join(directory, entry.name);
  18  |         return entry.isDirectory() ? filesUnder(file) : [file];
  19  |     });
  20  | }
  21  | 
  22  | test.beforeAll(async () => {
  23  |     server = await preview({
  24  |         configFile: path.join(webRoot, 'vite.config.ts'),
  25  |         root: webRoot,
  26  |         mode: 'demo',
  27  |         logLevel: 'error',
  28  |         build: { outDir: 'dist-demo' },
  29  |         preview: { host: '127.0.0.1', port: 0, strictPort: false },
  30  |     });
  31  |     const address = server.httpServer.address();
  32  |     if (!address || typeof address === 'string') throw new Error('The demo artifact preview did not expose a local port.');
  33  |     baseUrl = `http://127.0.0.1:${address.port}`;
  34  | });
  35  | 
  36  | test.afterAll(async () => {
  37  |     await server?.close();
  38  | });
  39  | 
  40  | test('the built demo artifact serves the React UI and synthetic API through preview', async ({ page, browserName }) => {
  41  |     const sessionResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v2/session', { timeout: 15_000 });
  42  |     await page.goto(`${baseUrl}/s/shop-demo/overview`);
  43  |     const response = await sessionResponse;
  44  |     expect(response.status()).toBe(200);
  45  |     await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toBeVisible();
  46  |     await expect(page.locator('main h1').first()).toBeVisible();
  47  | 
  48  |     const browserMetrics = await page.evaluate(() => {
  49  |         const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  50  |         const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  51  |         const scripts = resources.filter(resource => new URL(resource.name).pathname.endsWith('.js'));
  52  |         return {
  53  |             browser: navigator.userAgent,
  54  |             viewport: { width: innerWidth, height: innerHeight },
  55  |             route: location.pathname,
  56  |             domContentLoadedMs: Math.round(navigation?.domContentLoadedEventEnd ?? 0),
  57  |             loadEventMs: Math.round(navigation?.loadEventEnd ?? 0),
  58  |             scriptCount: scripts.length,
  59  |             scriptTransferBytes: scripts.reduce((total, resource) => total + resource.transferSize, 0),
  60  |             scriptAssets: scripts.map(resource => ({
  61  |                 file: new URL(resource.name).pathname.split('/').pop() || '',
  62  |                 transferBytes: resource.transferSize,
  63  |                 decodedBytes: resource.decodedBodySize,
  64  |                 durationMs: Math.round(resource.duration),
  65  |             })),
  66  |         };
  67  |     });
  68  |     const demoAssets = filesUnder(path.join(webRoot, 'dist-demo', 'assets'))
  69  |         .filter(file => file.endsWith('.js'))
  70  |         .map(file => {
  71  |             const content = fs.readFileSync(file);
  72  |             return { file: path.relative(root, file).replaceAll('\\', '/'), bytes: content.length, gzipBytes: gzipSync(content).length };
  73  |         });
  74  |     const initialGzipBytes = browserMetrics.scriptAssets.reduce((total, asset) => total + (demoAssets.find(file => path.basename(file.file) === asset.file)?.gzipBytes ?? 0), 0);
  75  |     const largestGzipBytes = Math.max(...demoAssets.map(asset => asset.gzipBytes));
  76  |     expect(initialGzipBytes).toBeLessThanOrEqual(500 * 1024);
  77  |     expect(largestGzipBytes).toBeLessThanOrEqual(200 * 1024);
  78  |     const report = {
  79  |         scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  80  |         artifact: 'apps/web/dist-demo',
  81  |         browserMetrics,
  82  |         bundles: {
  83  |             javascriptFiles: demoAssets.length,
  84  |             totalBytes: demoAssets.reduce((total, asset) => total + asset.bytes, 0),
  85  |             totalGzipBytes: demoAssets.reduce((total, asset) => total + asset.gzipBytes, 0),
  86  |             initialRouteGzipBytes: initialGzipBytes,
  87  |             proposedBudgets: { initialRouteGzipKiB: 500, largestChunkGzipKiB: 200, basis: 'Local demo preview limits for the measured Chromium artifact; not a backend or platform SLO.' },
  88  |             largest: demoAssets.sort((a, b) => b.bytes - a.bytes).slice(0, 5),
  89  |         },
  90  |         observedApi: { path: '/api/v2/session', status: response.status(), servedBy: 'MSW in the built demo artifact' },
  91  |         dataSource: 'synthetic-msw',
  92  |     };
  93  |     const evidenceDir = path.join(root, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007');
  94  |     const output = path.join(evidenceDir, `S19-demo-preview-metrics-${browserName}-${evidenceRunId}.json`);
  95  |     fs.mkdirSync(path.dirname(output), { recursive: true });
  96  |     fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  97  |     const screenshot = path.join(evidenceDir, `S19-demo-preview-overview-${browserName}-${evidenceRunId}.png`);
  98  |     fs.mkdirSync(path.dirname(screenshot), { recursive: true });
  99  |     if (fs.existsSync(screenshot)) throw new Error(`Refusing to overwrite existing evidence ${screenshot}`);
  100 |     await page.screenshot({ path: screenshot, fullPage: true });
  101 |     console.log(`[artifact-preview] ${JSON.stringify(report)}`);
  102 | });
  103 | 
  104 | test('a thousand synthetic customers remain API-paginated in the built demo artifact', async ({ page, browserName }) => {
  105 |     await page.goto(`${baseUrl}/s/shop-demo/overview`);
  106 |     await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toBeVisible();
  107 |     await openDemoControls(page);
  108 |     await page.getByRole('combobox', { name: 'Dataset mô phỏng' }).click();
  109 |     await page.getByRole('option', { name: '1.000 khách hàng tổng hợp' }).click();
> 110 |     await expect(page.getByRole('status')).toHaveText('Đã tải 1.000 khách hàng tổng hợp vào API mô phỏng.');
      |                                            ^ Error: expect(locator).toHaveText(expected) failed
  111 | 
  112 |     const customersResponsePromise = page.waitForResponse(response => new URL(response.url()).pathname.startsWith('/api/v2/shops/shop-demo/customers'));
  113 |     const startedAt = Date.now();
  114 |     await page.getByRole('link', { name: 'Khách hàng', exact: true }).click();
  115 |     const response = await customersResponsePromise;
  116 |     expect(response.status()).toBe(200);
  117 |     const envelope = await response.json() as { data: Array<{ id: string }>; page: { limit: number; total: number; hasMore: boolean; nextCursor: string | null } };
  118 |     console.log(`[large-dataset-api] ${JSON.stringify({ url: response.url(), count: envelope.data.length, page: envelope.page, firstIds: envelope.data.slice(0, 3).map(customer => customer.id) })}`);
  119 |     const renderedRows = page.getByRole('table').getByRole('row');
  120 |     await expect(renderedRows).toHaveCount(21);
  121 |     await expect(page.locator('a[href*="perf-customer-"]').first()).toBeVisible();
  122 | 
  123 |     const report = {
  124 |         scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  125 |         artifact: 'apps/web/dist-demo',
  126 |         datasetId: 'FE025-LARGE-CUSTOMERS-1000-V1',
  127 |         generatedRows: 1000,
  128 |         firstPageIds: envelope.data.map(customer => customer.id),
  129 |         api: { status: response.status(), pageLimit: envelope.page.limit, total: envelope.page.total, hasMore: envelope.page.hasMore, nextCursor: envelope.page.nextCursor },
  130 |         domRowsIncludingHeader: await renderedRows.count(),
  131 |         firstPageReadyMs: Date.now() - startedAt,
  132 |         browser: await page.evaluate(() => navigator.userAgent),
  133 |         viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight })),
  134 |         note: 'Synthetic customer identities only; the React screen renders one API page and exposes the next cursor instead of mounting the full collection.',
  135 |     };
  136 |     expect(envelope.page).toMatchObject({ limit: 20, total: 1004, hasMore: true });
  137 |     const output = path.join(root, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007', `S19-demo-large-dataset-${browserName}-${evidenceRunId}.json`);
  138 |     fs.mkdirSync(path.dirname(output), { recursive: true });
  139 |     fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  140 |     console.log(`[large-dataset-preview] ${JSON.stringify(report)}`);
  141 | });
  142 | 
  143 | test('the production artifact contains neither the mock worker asset nor MSW fixtures/runtime', () => {
  144 |     const productionRoot = path.join(webRoot, 'dist');
  145 |     const files = filesUnder(productionRoot);
  146 |     expect(files.some(file => path.basename(file) === 'mockServiceWorker.js')).toBe(false);
  147 |     const bundles = files.filter(file => file.endsWith('.js')).map(file => fs.readFileSync(file, 'utf8')).join('\n');
  148 |     for (const marker of ['setupWorker(', 'DEMO-NOT-A-REAL-PAIRING', 'Joker Studio', 'shop-second'])
  149 |         expect(bundles).not.toContain(marker);
  150 |     expect(bundles).not.toContain('service worker mô phỏng');
  151 | });
  152 | 
```