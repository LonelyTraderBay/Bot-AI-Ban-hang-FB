# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-integrations-layout.spec.ts >> R29 disconnect and R30 create/edit credential dialogs stay inside mobile and desktop viewports
- Location: tests/ui-integrations-layout.spec.ts:50:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Kết nối Facebook' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Kết nối Facebook' }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Kết nối Facebook' })

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
  1  | import { expect, test } from '@playwright/test';
  2  | import { startDemoServer } from './session/demo-server.mjs';
  3  | 
  4  | let demoUrl = '';
  5  | let closeDemo: (() => Promise<void>) | undefined;
  6  | 
  7  | test.beforeEach(async () => {
  8  |     const server = await startDemoServer();
  9  |     demoUrl = server.url;
  10 |     closeDemo = server.close;
  11 | });
  12 | 
  13 | test.afterEach(async () => closeDemo?.());
  14 | 
  15 | const routes = [
  16 |     { path: '/s/shop-demo/integrations/channels', heading: 'Kết nối Facebook' },
  17 |     { path: '/s/shop-demo/integrations/ai', heading: 'Nhà cung cấp AI' },
  18 | ];
  19 | 
  20 | async function openRoute(page: import('@playwright/test').Page, route: string, heading: string) {
  21 |     await page.goto(new URL(route, demoUrl).toString(), { waitUntil: 'domcontentloaded' });
> 22 |     await expect(page.getByRole('heading', { name: heading })).toBeVisible();
     |                                                                ^ Error: expect(locator).toBeVisible() failed
  23 | }
  24 | 
  25 | async function expectDocumentFits(page: import('@playwright/test').Page, width: number) {
  26 |     await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  27 | }
  28 | 
  29 | async function expectDialogFits(page: import('@playwright/test').Page, width: number, height: number) {
  30 |     const dialog = page.getByRole('dialog').first();
  31 |     await expect(dialog).toBeVisible();
  32 |     const bounds = await dialog.boundingBox();
  33 |     expect(bounds).not.toBeNull();
  34 |     expect(bounds!.x).toBeGreaterThanOrEqual(0);
  35 |     expect(bounds!.y).toBeGreaterThanOrEqual(0);
  36 |     expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
  37 |     expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height + 1);
  38 | }
  39 | 
  40 | test('Integrations routes R29/R30 fit the supported page-width boundaries', async ({ page }) => {
  41 |     for (const width of [320, 390, 768, 1280, 1440]) {
  42 |         await page.setViewportSize({ width, height: 900 });
  43 |         for (const route of routes) {
  44 |             await openRoute(page, route.path, route.heading);
  45 |             await expectDocumentFits(page, width);
  46 |         }
  47 |     }
  48 | });
  49 | 
  50 | test('R29 disconnect and R30 create/edit credential dialogs stay inside mobile and desktop viewports', async ({ page }) => {
  51 |     for (const { width, height } of [
  52 |         { width: 320, height: 844 },
  53 |         { width: 390, height: 844 },
  54 |         { width: 1280, height: 900 },
  55 |     ]) {
  56 |         await page.setViewportSize({ width, height });
  57 | 
  58 |         await openRoute(page, '/s/shop-demo/integrations/channels', 'Kết nối Facebook');
  59 |         await page.getByRole('button', { name: 'Ngắt kết nối' }).first().click();
  60 |         await expect(page.getByRole('dialog', { name: 'Ngắt kết nối Page' })).toBeVisible();
  61 |         await expectDialogFits(page, width, height);
  62 | 
  63 |         await openRoute(page, '/s/shop-demo/integrations/ai', 'Nhà cung cấp AI');
  64 |         await page.getByRole('button', { name: 'Sửa / xoay khóa' }).first().click();
  65 |         const editDialog = page.getByRole('dialog', { name: 'Sửa kết nối / xoay khóa' });
  66 |         await expect(editDialog).toBeVisible();
  67 |         await expectDialogFits(page, width, height);
  68 |         await page.getByRole('button', { name: 'Hủy' }).click();
  69 | 
  70 |         await page.getByRole('button', { name: 'Thêm kết nối AI' }).click();
  71 |         const createDialog = page.getByRole('dialog', { name: 'Kết nối AI mới' });
  72 |         await expect(createDialog).toBeVisible();
  73 |         await expectDialogFits(page, width, height);
  74 |         await expect(createDialog.getByLabel('Khóa API')).toHaveAttribute('type', 'password');
  75 |     }
  76 | });
  77 | 
```