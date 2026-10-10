# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-orders-layout.spec.ts >> Orders draft, versioned quote, canonical address snapshot and return dialogs keep their behavior without writes
- Location: tests/ui-orders-layout.spec.ts:46:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Phiên bản 1', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Phiên bản 1', { exact: true }) with timeout 5000ms
  - waiting for getByText('Phiên bản 1', { exact: true })

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
  8   |     const server = await startDemoServer({ cacheIsolationKey: 'ui028-w11-orders-layout' });
  9   |     demoUrl = server.url;
  10  |     closeDemo = server.close;
  11  | });
  12  | 
  13  | test.afterAll(async () => closeDemo?.());
  14  | 
  15  | test('Orders R17/R18/R19/R43 preserve responsive page geometry at 320-1440px', async ({ page }) => {
  16  |     const pageErrors: string[] = [];
  17  |     page.on('pageerror', error => pageErrors.push(error.message));
  18  |     const routes = [
  19  |         { id: 'R17', path: '/s/shop-demo/orders', heading: 'Đơn hàng' },
  20  |         { id: 'R18', path: '/s/shop-demo/orders/new', heading: 'Tạo đơn hàng' },
  21  |         { id: 'R19', path: '/s/shop-demo/orders/DH-1001', heading: 'Đơn DH-1001' },
  22  |         { id: 'R43', path: '/s/shop-demo/returns', heading: 'Đổi và trả hàng' },
  23  |     ];
  24  |     const observations = [];
  25  | 
  26  |     for (const width of [320, 390, 768, 1280, 1440]) {
  27  |         await page.setViewportSize({ width, height: 900 });
  28  |         for (const route of routes) {
  29  |             await page.goto(new URL(route.path, demoUrl).toString());
  30  |             await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible();
  31  |             const main = page.locator('main#main-content');
  32  |             await expect(main).toHaveCSS('padding-left', width >= 768 ? '24px' : '16px');
  33  |             const geometry = await page.evaluate(() => ({
  34  |                 clientWidth: document.documentElement.clientWidth,
  35  |                 scrollWidth: document.documentElement.scrollWidth,
  36  |             }));
  37  |             expect(geometry.scrollWidth, `${route.id} document width at ${width}px`).toBeLessThanOrEqual(geometry.clientWidth);
  38  |             observations.push({ route: route.id, width, ...geometry });
  39  |         }
  40  |     }
  41  | 
  42  |     expect(observations).toHaveLength(20);
  43  |     expect(pageErrors).toEqual([]);
  44  | });
  45  | 
  46  | test('Orders draft, versioned quote, canonical address snapshot and return dialogs keep their behavior without writes', async ({ page }) => {
  47  |     const pageErrors: string[] = [];
  48  |     const writes: string[] = [];
  49  |     page.on('pageerror', error => pageErrors.push(error.message));
  50  |     page.on('request', request => {
  51  |         if (request.method() !== 'POST') return;
  52  |         const path = new URL(request.url()).pathname;
  53  |         if (/\/shops\/shop-demo\/(orders|returns)(\/|$)/.test(path)) writes.push(path);
  54  |     });
  55  | 
  56  |     await page.setViewportSize({ width: 390, height: 844 });
  57  |     await page.goto(new URL('/s/shop-demo/orders/new', demoUrl).toString());
  58  |     await expect(page.getByText(/Đơn xác nhận giữ snapshot địa chỉ của báo giá/)).toBeVisible();
  59  |     await page.getByRole('combobox', { name: 'Khách hàng' }).click();
  60  |     await page.getByRole('option', { name: 'Linh (khách mẫu)', exact: true }).click();
  61  |     await page.getByRole('combobox', { name: 'Hội thoại liên quan' }).click();
  62  |     await page.getByRole('option', { name: 'Linh (khách mẫu) · cv1', exact: true }).click();
  63  |     await page.getByRole('combobox', { name: 'Sản phẩm 1' }).click();
  64  |     await page.getByRole('option', { name: 'Áo thun Essential · L · Than · AO-002', exact: true }).click();
  65  |     await page.getByRole('combobox', { name: 'Địa chỉ giao hàng' }).click();
  66  |     await page.getByRole('option', { name: 'Địa chỉ giao hàng mẫu · Linh (khách mẫu)', exact: true }).click();
  67  |     await expect(page.getByRole('button', { name: 'Lưu đơn nháp', exact: true })).toBeEnabled();
  68  |     expect(writes).toEqual([]);
  69  | 
  70  |     await page.goto(new URL('/s/shop-demo/orders/DH-1001', demoUrl).toString());
> 71  |     await expect(page.getByText('Phiên bản 1', { exact: true })).toBeVisible();
      |                                                                  ^ Error: expect(locator).toBeVisible() failed
  72  |     const quoteResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-1001/quote'));
  73  |     await page.getByRole('button', { name: 'Lấy báo giá hiện tại', exact: true }).click();
  74  |     expect((await quoteResponse).status()).toBe(200);
  75  |     await expect(page.getByText(/Bản đơn 1 · Hết hạn/)).toBeVisible();
  76  |     await expect(page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng' })).toBeDisabled();
  77  |     expect(writes.filter(path => path.endsWith('/orders/DH-1001/confirm'))).toEqual([]);
  78  | 
  79  |     for (const width of [390, 1280]) {
  80  |         await page.setViewportSize({ width, height: 900 });
  81  |         await page.goto(new URL('/s/shop-demo/returns?orderId=DH-DEMO-PAID-01', demoUrl).toString());
  82  |         await page.getByRole('button', { name: 'Tạo yêu cầu trả', exact: true }).click();
  83  |         const requestDialog = page.getByRole('dialog', { name: 'Yêu cầu trả hàng' });
  84  |         await expect(requestDialog).toBeVisible();
  85  |         const requestBox = await requestDialog.boundingBox();
  86  |         expect(requestBox).not.toBeNull();
  87  |         expect(requestBox!.x).toBeGreaterThanOrEqual(0);
  88  |         expect(requestBox!.x + requestBox!.width).toBeLessThanOrEqual(width);
  89  |         await requestDialog.getByRole('textbox', { name: 'Lý do trả' }).fill('Kiểm tra layout của return request');
  90  |         const quantity = requestDialog.getByRole('spinbutton', { name: /tối đa 1/ });
  91  |         await quantity.fill('1.5');
  92  |         await expect(requestDialog.getByRole('button', { name: 'Tạo yêu cầu' })).toBeDisabled();
  93  |         await page.keyboard.press('Escape');
  94  | 
  95  |         await page.goto(new URL('/s/shop-demo/returns', demoUrl).toString());
  96  |         const row = page.getByRole('row').filter({ hasText: 'seed-returncase-10036' });
  97  |         await row.getByRole('button', { name: 'Kiểm nhận' }).click();
  98  |         const inspectionDialog = page.getByRole('dialog', { name: 'Kiểm nhận hàng trả' });
  99  |         await expect(inspectionDialog).toBeVisible();
  100 |         const inspectionBox = await inspectionDialog.boundingBox();
  101 |         expect(inspectionBox).not.toBeNull();
  102 |         expect(inspectionBox!.x).toBeGreaterThanOrEqual(0);
  103 |         expect(inspectionBox!.x + inspectionBox!.width).toBeLessThanOrEqual(width);
  104 |         await page.keyboard.press('Escape');
  105 |     }
  106 | 
  107 |     expect(writes.filter(path => path.endsWith('/returns'))).toEqual([]);
  108 |     expect(writes.filter(path => path.endsWith('/orders/DH-1001/quote'))).toHaveLength(1);
  109 |     expect(writes.filter(path => path.endsWith('/orders/DH-1001/confirm'))).toEqual([]);
  110 |     expect(pageErrors).toEqual([]);
  111 | });
  112 | 
```