# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui008-integration-empty.spec.ts >> UI008 R29 pending channel query stays loading until its response arrives
- Location: tests/ui008-integration-empty.spec.ts:90:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('main#main-content').getByRole('progressbar')
Expected: visible
Error: strict mode violation: locator('main#main-content').getByRole('progressbar') resolved to 4 elements:
    1) <span role="progressbar" aria-label="Đang tải dữ liệu" class="MuiCircularProgress-root MuiCircularProgress-indeterminate MuiCircularProgress-colorPrimary css-1ep0rot-MuiCircularProgress-root">…</span> aka getByRole('progressbar', { name: 'Đang tải dữ liệu' }).first()
    2) <span role="progressbar" aria-label="Đang tải dữ liệu" class="MuiCircularProgress-root MuiCircularProgress-indeterminate MuiCircularProgress-colorPrimary css-1ep0rot-MuiCircularProgress-root">…</span> aka getByRole('progressbar', { name: 'Đang tải dữ liệu' }).nth(1)
    ...

Call log:
  - Expect "toBeVisible" locator('main#main-content').getByRole('progressbar') with timeout 5000ms
  - waiting for locator('main#main-content').getByRole('progressbar')

```

```
Error: page.waitForResponse: Test ended.
```

# Test source

```ts
  1   | import { openDemoControls } from './session/demo-controls';
  2   | import { expect, test } from '@playwright/test';
  3   | import { startDemoServer } from './session/demo-server.mjs';
  4   | import { evidenceRunId } from './evidence-run-id.mjs';
  5   | 
  6   | let demoUrl = '';
  7   | let closeDemo: (() => Promise<void>) | undefined;
  8   | 
  9   | test.beforeAll(async () => {
  10  |     const server = await startDemoServer();
  11  |     demoUrl = server.url;
  12  |     closeDemo = server.close;
  13  | });
  14  | 
  15  | test.afterAll(async () => closeDemo?.());
  16  | 
  17  | async function gotoDemo(page: import('@playwright/test').Page, path: string) {
  18  |     await page.goto(new URL(path, demoUrl).toString());
  19  |     await openDemoControls(page);
  20  |     await expect(page.getByRole('combobox', { name: 'Trạng thái thử' })).toBeVisible();
  21  | }
  22  | 
  23  | async function setFault(page: import('@playwright/test').Page, fault: string) {
  24  |     await page.evaluate(async value => {
  25  |         const mock = await import('/src/mocks/service.ts');
  26  |         mock.setFault(value as 'none' | 'empty_persistent');
  27  |     }, fault);
  28  | }
  29  | 
  30  | async function setOperationFailure(page: import('@playwright/test').Page, failure: { status: number; code: string; message: string } | null) {
  31  |     await page.evaluate(async nextFailure => {
  32  |         const mock = await import('/src/mocks/service.ts');
  33  |         mock.setOperationFailure('listChannels', nextFailure);
  34  |     }, failure);
  35  | }
  36  | 
  37  | async function setOperationDelay(page: import('@playwright/test').Page, delayMs: number | null) {
  38  |     await page.evaluate(async nextDelay => {
  39  |         const mock = await import('/src/mocks/service.ts');
  40  |         mock.setOperationDelay('listChannels', nextDelay);
  41  |     }, delayMs);
  42  | }
  43  | 
  44  | async function chooseMockOption(page: import('@playwright/test').Page, label: string, value: string) {
  45  |     if (['Vai trò mô phỏng', 'Trạng thái thử', 'Dataset mô phỏng'].includes(label)) await openDemoControls(page);
  46  |     await page.getByRole('combobox', { name: label }).click();
  47  |     await page.getByRole('option', { name: value, exact: true }).click();
  48  | }
  49  | 
  50  | async function navigateClientSide(page: import('@playwright/test').Page, path: string) {
  51  |     await page.evaluate(nextPath => {
  52  |         window.history.pushState({}, '', nextPath);
  53  |         window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  54  |     }, path);
  55  | }
  56  | 
  57  | test('UI008 R29 successful empty collection exposes an accessible state and one permission-guarded connect CTA', async ({ page }) => {
  58  |     await gotoDemo(page, '/s/shop-demo/overview');
  59  |     await setFault(page, 'empty_persistent');
  60  |     const channelsResponse = page.waitForResponse(response => response.request().method() === 'GET'
  61  |         && new URL(response.url()).pathname.endsWith('/integrations/channels'));
  62  |     await navigateClientSide(page, '/s/shop-demo/integrations/channels');
  63  |     const response = await channelsResponse;
  64  |     const payload = await response.json() as { data: unknown[] };
  65  | 
  66  |     expect(response.status()).toBe(200);
  67  |     expect(payload.data).toEqual([]);
  68  |     const main = page.locator('main#main-content');
  69  |     const emptyState = main.getByRole('status').filter({ hasText: 'Chưa có Page kết nối.' });
  70  |     await expect(emptyState).toBeVisible();
  71  |     await expect(main.getByRole('button', { name: 'Kết nối Page', exact: true })).toHaveCount(1);
  72  |     await page.screenshot({ path: `evidence/frontend-ui-improvements/UI008/S04-R29-empty-after-${test.info().project.name}-${evidenceRunId}.png`, fullPage: true });
  73  | });
  74  | 
  75  | test('UI008 R29 read-only bot_admin sees the empty state without a manage action', async ({ page }) => {
  76  |     await gotoDemo(page, '/s/shop-demo/overview');
  77  |     await chooseMockOption(page, 'Vai trò mô phỏng', 'bot_admin');
  78  |     await expect(page.getByRole('combobox', { name: 'Vai trò mô phỏng' })).toContainText('bot_admin');
  79  |     await setFault(page, 'empty_persistent');
  80  |     const channelsResponse = page.waitForResponse(response => response.request().method() === 'GET'
  81  |         && new URL(response.url()).pathname.endsWith('/integrations/channels'));
  82  |     await navigateClientSide(page, '/s/shop-demo/integrations/channels');
  83  |     expect((await channelsResponse).status()).toBe(200);
  84  | 
  85  |     const main = page.locator('main#main-content');
  86  |     await expect(main.getByRole('status').filter({ hasText: 'Chưa có Page kết nối.' })).toBeVisible();
  87  |     await expect(main.getByRole('button', { name: 'Kết nối Page', exact: true })).toHaveCount(0);
  88  | });
  89  | 
  90  | test('UI008 R29 pending channel query stays loading until its response arrives', async ({ page }) => {
  91  |     await gotoDemo(page, '/s/shop-demo/overview');
  92  |     await setOperationDelay(page, 900);
> 93  |     const channelsResponse = page.waitForResponse(response => response.request().method() === 'GET'
      |                                   ^ Error: page.waitForResponse: Test ended.
  94  |         && new URL(response.url()).pathname.endsWith('/integrations/channels'));
  95  |     await navigateClientSide(page, '/s/shop-demo/integrations/channels');
  96  | 
  97  |     const main = page.locator('main#main-content');
  98  |     await expect(main.getByRole('progressbar')).toBeVisible();
  99  |     await expect(main.getByText('Chưa có Page kết nối.', { exact: false })).toHaveCount(0);
  100 |     const response = await channelsResponse;
  101 |     expect(response.status()).toBe(200);
  102 |     expect(((await response.json()) as { data: unknown[] }).data.length).toBeGreaterThan(0);
  103 |     await setOperationDelay(page, null);
  104 |     await expect(main.getByRole('progressbar')).toHaveCount(0);
  105 |     await expect(main.getByRole('status').filter({ hasText: 'Chưa có Page kết nối.' })).toHaveCount(0);
  106 | });
  107 | 
  108 | test('UI008 R29 forbidden channel query is not presented as empty or retryable', async ({ page }) => {
  109 |     await gotoDemo(page, '/s/shop-demo/overview');
  110 |     await setOperationFailure(page, { status: 403, code: 'UI008_R29_FORBIDDEN', message: 'UI008_R29_FORBIDDEN' });
  111 |     const channelsResponse = page.waitForResponse(response => response.request().method() === 'GET'
  112 |         && new URL(response.url()).pathname.endsWith('/integrations/channels'));
  113 |     await navigateClientSide(page, '/s/shop-demo/integrations/channels');
  114 |     expect((await channelsResponse).status()).toBe(403);
  115 | 
  116 |     const main = page.locator('main#main-content');
  117 |     await expect(main.getByRole('alert').filter({ hasText: 'UI008_R29_FORBIDDEN' })).toBeVisible();
  118 |     await expect(main.getByRole('status').filter({ hasText: 'Chưa có Page kết nối.' })).toHaveCount(0);
  119 |     await expect(main.getByRole('button', { name: 'Thử lại', exact: true })).toHaveCount(0);
  120 | });
  121 | 
  122 | test('UI008 R29 503 remains an error and recovers through its retry control', async ({ page }) => {
  123 |     await gotoDemo(page, '/s/shop-demo/overview');
  124 |     await setOperationFailure(page, { status: 503, code: 'UI008_R29_UNAVAILABLE', message: 'UI008_R29_UNAVAILABLE' });
  125 |     const failedResponse = page.waitForResponse(response => response.request().method() === 'GET'
  126 |         && response.status() === 503 && new URL(response.url()).pathname.endsWith('/integrations/channels'));
  127 |     await navigateClientSide(page, '/s/shop-demo/integrations/channels');
  128 |     expect((await failedResponse).status()).toBe(503);
  129 | 
  130 |     const main = page.locator('main#main-content');
  131 |     const queryError = main.getByRole('alert').filter({ hasText: 'UI008_R29_UNAVAILABLE' });
  132 |     await expect(queryError).toBeVisible();
  133 |     await expect(main.getByRole('status').filter({ hasText: 'Chưa có Page kết nối.' })).toHaveCount(0);
  134 |     await setOperationFailure(page, null);
  135 |     const retriedResponse = page.waitForResponse(response => response.request().method() === 'GET'
  136 |         && response.status() === 200 && new URL(response.url()).pathname.endsWith('/integrations/channels'));
  137 |     await queryError.getByRole('button', { name: 'Thử lại', exact: true }).click();
  138 |     const response = await retriedResponse;
  139 |     expect(((await response.json()) as { data: unknown[] }).data.length).toBeGreaterThan(0);
  140 |     await expect(queryError).toHaveCount(0);
  141 | });
  142 | 
  143 | test('UI008 R30 successful empty AI connection cards show a first-use state and one add CTA', async ({ page }) => {
  144 |     await gotoDemo(page, '/s/shop-demo/overview');
  145 |     await setFault(page, 'empty_persistent');
  146 |     const connectionsResponse = page.waitForResponse(response => response.request().method() === 'GET'
  147 |         && new URL(response.url()).pathname.endsWith('/integrations/ai'));
  148 |     await navigateClientSide(page, '/s/shop-demo/integrations/ai');
  149 |     const response = await connectionsResponse;
  150 |     const payload = await response.json() as { data: unknown[] };
  151 | 
  152 |     expect(response.status()).toBe(200);
  153 |     expect(payload.data).toEqual([]);
  154 |     const main = page.locator('main#main-content');
  155 |     const emptyState = main.getByRole('status').filter({ hasText: 'Chưa có kết nối AI.' });
  156 |     await expect(emptyState).toBeVisible();
  157 |     await expect(main.getByRole('button', { name: 'Thêm kết nối AI', exact: true })).toHaveCount(1);
  158 |     await page.screenshot({ path: `evidence/frontend-ui-improvements/UI008/S04-R30-empty-after-${test.info().project.name}-${evidenceRunId}.png`, fullPage: true });
  159 | });
  160 | 
  161 | test('UI008 R30 read-only bot_admin sees the empty state without an add action', async ({ page }) => {
  162 |     await gotoDemo(page, '/s/shop-demo/overview');
  163 |     await chooseMockOption(page, 'Vai trò mô phỏng', 'bot_admin');
  164 |     await expect(page.getByRole('combobox', { name: 'Vai trò mô phỏng' })).toContainText('bot_admin');
  165 |     await setFault(page, 'empty_persistent');
  166 |     const connectionsResponse = page.waitForResponse(response => response.request().method() === 'GET'
  167 |         && new URL(response.url()).pathname.endsWith('/integrations/ai'));
  168 |     await navigateClientSide(page, '/s/shop-demo/integrations/ai');
  169 |     expect((await connectionsResponse).status()).toBe(200);
  170 | 
  171 |     const main = page.locator('main#main-content');
  172 |     await expect(main.getByRole('status').filter({ hasText: 'Chưa có kết nối AI.' })).toBeVisible();
  173 |     await expect(main.getByRole('button', { name: 'Thêm kết nối AI', exact: true })).toHaveCount(0);
  174 | });
  175 | 
```