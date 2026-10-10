# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fe021.spec.ts >> FE021 timezone and privacy validation waits for interaction and blocks invalid writes
- Location: tests/fe021.spec.ts:46:1

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: locator.click: Test timeout of 180000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Lưu bản nháp chính sách' })
    - locator resolved to <button disabled tabindex="-1" type="submit" class="MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary MuiButton-sizeMedium MuiButton-containedSizeMedium MuiButton-colorPrimary MuiButton-disableElevation Mui-disabled MuiButton-root MuiButton-contained MuiButton-containedPrimary MuiButton-sizeMedium MuiButton-containedSizeMedium MuiButton-colorPrimary MuiButton-disableElevation css-memtyh-MuiButtonBase-root-MuiButton-root">Lưu bản nháp chính sách</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    347 × waiting for element to be visible, enabled and stable
        - element is not enabled
      - retrying click action
        - waiting 500ms

```

# Test source

```ts
  1   | import { openDemoControls } from './session/demo-controls';
  2   | import { test, expect } from '@playwright/test';
  3   | import { startDemoServer } from './session/demo-server.mjs';
  4   | 
  5   | let demoUrl = '';
  6   | let closeDemo: (() => Promise<void>) | undefined;
  7   | 
  8   | test.beforeAll(async () => {
  9   |     const server = await startDemoServer();
  10  |     demoUrl = server.url;
  11  |     closeDemo = server.close;
  12  | });
  13  | 
  14  | test.afterAll(async () => closeDemo?.());
  15  | 
  16  | async function gotoDemo(page: import('@playwright/test').Page, route: string) {
  17  |     await page.goto(new URL(route, demoUrl).toString());
  18  | }
  19  | 
  20  | async function chooseOption(page: import('@playwright/test').Page, label: string, value: string | RegExp) {
  21  |     if (['Vai trò mô phỏng', 'Trạng thái thử', 'Dataset mô phỏng'].includes(label)) await openDemoControls(page);
  22  |     await page.getByRole('combobox', { name: label }).click();
  23  |     await page.getByRole('option', { name: value, exact: true }).click();
  24  |     if (label === 'Vai trò mô phỏng') {
  25  |         await expect(page.getByRole('status').filter({ hasText: 'Vai trò mô phỏng đã được áp dụng.' })).toBeVisible();
  26  |     }
  27  | }
  28  | 
  29  | async function setDemoRole(page: import('@playwright/test').Page, role: 'owner' | 'viewer' | 'accountant') {
  30  |     await chooseOption(page, 'Vai trò mô phỏng', 'viewer');
  31  |     if (role !== 'viewer') await chooseOption(page, 'Vai trò mô phỏng', role);
  32  | }
  33  | 
  34  | test('FE021 dashboard keeps independent panels usable and hides finance fields without finance.read', async ({ page }) => {
  35  |     await gotoDemo(page, '/s/shop-demo/overview');
  36  |     await setDemoRole(page, 'viewer');
  37  |     await expect(page.getByText('Chỉ hiển thị khi vai trò có finance.read.', { exact: true })).toBeVisible();
  38  |     await expect(page.getByRole('link', { name: 'Xem lợi nhuận' })).toHaveCount(0);
  39  |     await expect(page.getByRole('heading', { name: 'Tình hình hiện tại' })).toBeVisible();
  40  |     await expect(page.getByRole('link', { name: 'Xem việc cần làm', exact: true })).toBeVisible();
  41  |     await expect(page.getByRole('link', { name: 'Tạo đơn hàng', exact: true })).toHaveCount(0);
  42  |     await expect(page.getByRole('link', { name: 'Tất cả đơn', exact: true })).toBeVisible();
  43  |     await expect(page.getByText('Dữ liệu cập nhật', { exact: false })).toBeVisible();
  44  | });
  45  | 
  46  | test('FE021 timezone and privacy validation waits for interaction and blocks invalid writes', async ({ page }) => {
  47  |     let mutationRequests = 0;
  48  |     page.on('request', request => {
  49  |         if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) mutationRequests++;
  50  |     });
  51  | 
  52  |     await gotoDemo(page, '/onboarding');
  53  |     await page.getByLabel('Tên cửa hàng').fill('Cửa hàng timezone kiểm thử');
  54  |     const onboardingTimezone = page.getByLabel('Múi giờ');
  55  |     await onboardingTimezone.fill('Mars/OlympusMons');
  56  |     await onboardingTimezone.blur();
  57  |     await expect(onboardingTimezone).toHaveAttribute('aria-invalid', 'true');
  58  |     await expect(page.getByText('Nhập múi giờ hợp lệ, ví dụ Asia/Vientiane.', { exact: true })).toBeVisible();
  59  |     await page.getByRole('button', { name: 'Tạo cửa hàng' }).click();
  60  |     expect(mutationRequests).toBe(0);
  61  | 
  62  |     await gotoDemo(page, '/s/shop-demo/settings/shop');
  63  |     const settingsTimezone = page.getByLabel('Múi giờ');
  64  |     await settingsTimezone.fill('Mars/OlympusMons');
  65  |     await page.getByRole('button', { name: 'Lưu cấu hình' }).click();
  66  |     await expect(settingsTimezone).toHaveAttribute('aria-invalid', 'true');
  67  |     await expect(page.getByLabel('Ngôn ngữ giao diện')).toBeDisabled();
  68  |     expect(mutationRequests).toBe(0);
  69  | 
  70  |     await gotoDemo(page, '/s/shop-demo/settings/privacy');
  71  |     const retentionDays = page.getByLabel('Số ngày lưu hội thoại');
  72  |     await expect(retentionDays).toHaveValue('');
  73  |     await expect(retentionDays).not.toHaveAttribute('aria-invalid', 'true');
  74  |     await retentionDays.fill('0');
  75  |     await retentionDays.blur();
  76  |     await expect(retentionDays).toHaveAttribute('aria-invalid', 'true');
  77  |     await expect(page.getByText('Nhập số nguyên từ 1 đến 36.500 ngày.', { exact: true })).toBeVisible();
> 78  |     await page.getByRole('button', { name: 'Lưu bản nháp chính sách' }).click();
      |                                                                         ^ Error: locator.click: Test timeout of 180000ms exceeded.
  79  |     expect(mutationRequests).toBe(0);
  80  | });
  81  | 
  82  | test('FE021 approval and shipment work queues appear before sample previews', async ({ page }) => {
  83  |     await gotoDemo(page, '/s/shop-demo/approvals');
  84  |     const approvals = page.getByRole('table', { name: 'Yêu cầu phê duyệt' });
  85  |     const delegationPreview = page.getByText('Ủy quyền gửi đơn mua', { exact: true }).last();
  86  |     await expect(approvals).toBeVisible();
  87  |     await expect(delegationPreview).toBeVisible();
  88  |     expect((await approvals.boundingBox())?.y).toBeLessThan((await delegationPreview.boundingBox())?.y ?? Infinity);
  89  | 
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
  160 | test('FE021 invalid marketing deep links mark the responsible field and never send the invalid range', async ({ page }) => {
  161 |     let marketingRequests = 0;
  162 |     page.on('request', request => {
  163 |         if (new URL(request.url()).pathname.endsWith('/marketing-summary')) marketingRequests++;
  164 |     });
  165 |     await gotoDemo(page, '/s/shop-demo/reports/marketing?fromDate=2026-10-02&toDate=2026-10-01&bucket=day');
  166 | 
  167 |     const from = page.getByRole('textbox', { name: 'Từ ngày' });
  168 |     await expect(from).toHaveAttribute('aria-invalid', 'true');
  169 |     await expect(page.getByText('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.', { exact: true })).toBeVisible();
  170 |     await expect(page.getByRole('alert').filter({ hasText: 'Bộ lọc trên đường dẫn không hợp lệ.' })).toContainText('Hãy sửa trường được đánh dấu');
  171 |     expect(marketingRequests).toBe(0);
  172 | });
  173 | 
  174 | test('FE021 export uses inclusive shop-local boundaries, safe CSV, API jobs and cursor pagination', async ({ page }) => {
  175 |     test.setTimeout(45_000);
  176 |     await gotoDemo(page, '/s/shop-demo/overview');
  177 |     await setDemoRole(page, 'owner');
  178 |     await gotoDemo(page, '/s/shop-demo/reports');
```