# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-inventory-layout.spec.ts >> Inventory R15/R16 preserve shared gutter and contain table overflow at 320-1440px
- Location: tests/ui-inventory-layout.spec.ts:15:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Tồn kho', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Tồn kho', exact: true }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Tồn kho', exact: true })

```

```yaml
- link "Đến nội dung chính":
  - /url: "#main-content"
- navigation "Điều hướng chính"
- banner:
  - button "Mở menu"
  - text: Demo
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
  1   | import { expect, test } from '@playwright/test';
  2   | import { startDemoServer } from './session/demo-server.mjs';
  3   | 
  4   | let demoUrl = '';
  5   | let closeDemo: (() => Promise<void>) | undefined;
  6   | 
  7   | test.beforeAll(async () => {
  8   |     const server = await startDemoServer({ cacheIsolationKey: 'ui028-w12-inventory-layout' });
  9   |     demoUrl = server.url;
  10  |     closeDemo = server.close;
  11  | });
  12  | 
  13  | test.afterAll(async () => closeDemo?.());
  14  | 
  15  | test('Inventory R15/R16 preserve shared gutter and contain table overflow at 320-1440px', async ({ page }) => {
  16  |     const pageErrors: string[] = [];
  17  |     page.on('pageerror', error => pageErrors.push(error.message));
  18  |     const routes = [
  19  |         { id: 'R15', path: '/s/shop-demo/inventory', heading: 'Tồn kho', region: 'Tồn kho theo vị trí' },
  20  |         { id: 'R16', path: '/s/shop-demo/inventory/movements', heading: 'Lịch sử kho', region: 'Lịch sử biến động kho' },
  21  |     ];
  22  |     const observations = [];
  23  | 
  24  |     for (const width of [320, 390, 768, 1280, 1440]) {
  25  |         await page.setViewportSize({ width, height: 900 });
  26  |         for (const route of routes) {
  27  |             await page.goto(new URL(route.path, demoUrl).toString());
> 28  |             await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible();
      |                                                                                           ^ Error: expect(locator).toBeVisible() failed
  29  |             await expect(page.getByRole('table', { name: route.region })).toBeVisible();
  30  |             await expect(page.locator('main#main-content')).toHaveCSS('padding-left', width >= 768 ? '24px' : '16px');
  31  |             const geometry = await page.evaluate(() => ({
  32  |                 clientWidth: document.documentElement.clientWidth,
  33  |                 scrollWidth: document.documentElement.scrollWidth,
  34  |             }));
  35  |             expect(geometry.scrollWidth, `${route.id} page width at ${width}px`).toBeLessThanOrEqual(geometry.clientWidth);
  36  |             const tableRegion = page.getByRole('region', { name: route.region });
  37  |             const tableGeometry = await tableRegion.evaluate(element => ({
  38  |                 clientWidth: element.clientWidth,
  39  |                 scrollWidth: element.scrollWidth,
  40  |             }));
  41  |             expect(tableGeometry.clientWidth, `${route.id} table region width at ${width}px`).toBeLessThanOrEqual(width);
  42  |             if (width < 768) expect(tableGeometry.scrollWidth, `${route.id} table can scroll at ${width}px`).toBeGreaterThan(tableGeometry.clientWidth);
  43  |             observations.push({ route: route.id, width, ...geometry, tableRegion: tableGeometry });
  44  |         }
  45  |     }
  46  | 
  47  |     expect(observations).toHaveLength(10);
  48  |     expect(pageErrors).toEqual([]);
  49  | });
  50  | 
  51  | test('Inventory filters reset cursor and preserve other URL state; adjustment validation sends no command', async ({ page }) => {
  52  |     const pageErrors: string[] = [];
  53  |     const writes: string[] = [];
  54  |     page.on('pageerror', error => pageErrors.push(error.message));
  55  |     page.on('request', request => {
  56  |         if (request.method() !== 'POST') return;
  57  |         const url = new URL(request.url());
  58  |         if (url.pathname.includes('/shops/shop-demo/')) writes.push(url.pathname);
  59  |     });
  60  | 
  61  |     await page.setViewportSize({ width: 390, height: 844 });
  62  |     const staleInventoryCursor = 'w12-stale-cursor-probe';
  63  |     const inventoryCursorRequest = page.waitForRequest(request => request.method() === 'GET' && new URL(request.url()).searchParams.get('cursor') === staleInventoryCursor);
  64  |     await page.goto(new URL(`/s/shop-demo/inventory?cursor=${staleInventoryCursor}&preserve=keep`, demoUrl).toString());
  65  |     await page.getByRole('combobox', { name: 'Kho', exact: true }).waitFor({ state: 'visible' });
  66  |     await inventoryCursorRequest;
  67  | 
  68  |     await page.getByRole('combobox', { name: 'Kho', exact: true }).click();
  69  |     await page.getByRole('option', { name: 'MAIN · Kho chính · dữ liệu tổng hợp', exact: true }).click();
  70  |     const filteredRequest = page.waitForRequest(request => request.method() === 'GET' && new URL(request.url()).searchParams.get('warehouseId') === 'warehouse-01');
  71  |     await page.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true }).click();
  72  |     const request = await filteredRequest;
  73  |     const appliedQuery = new URL(request.url()).searchParams;
  74  |     expect(appliedQuery.get('warehouseId')).toBe('warehouse-01');
  75  |     expect(appliedQuery.has('cursor')).toBe(false);
  76  |     await expect(page).toHaveURL(/preserve=keep/);
  77  |     await expect(page).not.toHaveURL(/cursor=/);
  78  |     await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click();
  79  |     await expect(page).toHaveURL(/preserve=keep/);
  80  |     await expect(page).not.toHaveURL(/warehouseId=/);
  81  |     await expect(page).not.toHaveURL(/cursor=/);
  82  | 
  83  |     const staleMovementCursor = 'w12-stale-cursor-probe';
  84  |     const movementCursorRequest = page.waitForRequest(request => request.method() === 'GET' && new URL(request.url()).searchParams.get('cursor') === staleMovementCursor);
  85  |     await page.goto(new URL(`/s/shop-demo/inventory/movements?cursor=${staleMovementCursor}&preserve=keep`, demoUrl).toString());
  86  |     await page.getByRole('textbox', { name: 'Mã biến thể' }).waitFor({ state: 'visible' });
  87  |     await movementCursorRequest;
  88  |     await page.getByRole('combobox', { name: 'Kho', exact: true }).click();
  89  |     await page.getByRole('option', { name: 'MAIN · Kho chính · dữ liệu tổng hợp', exact: true }).click();
  90  |     await page.getByRole('textbox', { name: 'Mã biến thể' }).fill('v-p1');
  91  |     const movementFilterRequest = page.waitForRequest(request => {
  92  |         const query = new URL(request.url()).searchParams;
  93  |         return request.method() === 'GET' && new URL(request.url()).pathname.endsWith('/inventory/movements') && query.get('warehouseId') === 'warehouse-01' && query.get('variantId') === 'v-p1';
  94  |     });
  95  |     await page.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true }).click();
  96  |     const movementRequest = await movementFilterRequest;
  97  |     const movementQuery = new URL(movementRequest.url()).searchParams;
  98  |     expect(movementQuery.get('warehouseId')).toBe('warehouse-01');
  99  |     expect(movementQuery.get('variantId')).toBe('v-p1');
  100 |     expect(movementQuery.has('kind')).toBe(false);
  101 |     expect(movementQuery.has('cursor')).toBe(false);
  102 |     await expect(page).toHaveURL(/preserve=keep/);
  103 |     await expect(page).toHaveURL(/warehouseId=warehouse-01/);
  104 |     await expect(page).toHaveURL(/variantId=v-p1/);
  105 |     await expect(page).not.toHaveURL(/cursor=/);
  106 | 
  107 |     for (const width of [390, 1280]) {
  108 |         await page.setViewportSize({ width, height: 844 });
  109 |         await page.goto(new URL('/s/shop-demo/inventory', demoUrl).toString());
  110 |         await page.getByRole('button', { name: 'Điều chỉnh', exact: true }).first().click();
  111 |         const dialog = page.getByRole('dialog');
  112 |         await expect(dialog).toBeVisible();
  113 |         const box = await dialog.boundingBox();
  114 |         expect(box).not.toBeNull();
  115 |         expect(box!.x).toBeGreaterThanOrEqual(0);
  116 |         expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  117 |         await dialog.getByRole('textbox', { name: 'Thay đổi số lượng' }).fill('0');
  118 |         await dialog.getByRole('textbox', { name: 'Lý do điều chỉnh' }).fill('Kiểm tra layout kho');
  119 |         await dialog.getByRole('button', { name: 'Xác nhận điều chỉnh', exact: true }).click();
  120 |         await expect(dialog.getByText(/Số điều chỉnh phải khác 0/)).toBeVisible();
  121 |         expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  122 |     }
  123 | 
  124 |     expect(writes).toEqual([]);
  125 |     expect(pageErrors).toEqual([]);
  126 | });
  127 | 
```