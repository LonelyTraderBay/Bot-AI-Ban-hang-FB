# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: states\route-error-composition.spec.ts >> every shop route composes the shared API error state with its page content
- Location: tests\states\route-error-composition.spec.ts:28:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('combobox', { name: 'Trạng thái thử' })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('combobox', { name: 'Trạng thái thử' }) with timeout 15000ms
  - waiting for getByRole('combobox', { name: 'Trạng thái thử' })

```

```yaml
- link "Đến nội dung chính":
  - /url: "#main-content"
- navigation "Điều hướng chính":
  - heading "BotSales AI" [level=6]
  - text: Đội ngũ vận hành cửa hàng
  - link "Joker Studio · Shop mẫu ⌄":
    - /url: /workspaces
  - text: ĐIỀU HÀNH
  - list:
    - listitem:
      - link "Tổng quan":
        - /url: /s/shop-demo/overview
        - paragraph: Tổng quan
    - listitem:
      - link "Công việc hôm nay":
        - /url: /s/shop-demo/operations
        - paragraph: Công việc hôm nay
    - listitem:
      - link "Cần phê duyệt":
        - /url: /s/shop-demo/approvals
        - paragraph: Cần phê duyệt
  - text: BÁN HÀNG
  - list:
    - listitem:
      - link "Hộp thư khách hàng":
        - /url: /s/shop-demo/inbox
        - paragraph: Hộp thư khách hàng
    - listitem:
      - link "Khách hàng":
        - /url: /s/shop-demo/customers
        - paragraph: Khách hàng
    - listitem:
      - link "Đơn hàng":
        - /url: /s/shop-demo/orders
        - paragraph: Đơn hàng
    - listitem:
      - link "Chuẩn bị hàng":
        - /url: /s/shop-demo/fulfillment
        - paragraph: Chuẩn bị hàng
    - listitem:
      - link "Vận đơn & giao hàng":
        - /url: /s/shop-demo/shipments
        - paragraph: Vận đơn & giao hàng
    - listitem:
      - link "Đổi trả":
        - /url: /s/shop-demo/returns
        - paragraph: Đổi trả
    - listitem:
      - link "Chăm sóc sau bán":
        - /url: /s/shop-demo/service-cases
        - paragraph: Chăm sóc sau bán
  - text: HÀNG HÓA
  - list:
    - listitem:
      - link "Sản phẩm":
        - /url: /s/shop-demo/products
        - paragraph: Sản phẩm
    - listitem:
      - link "Danh mục":
        - /url: /s/shop-demo/categories
        - paragraph: Danh mục
    - listitem:
      - link "Nhập dữ liệu":
        - /url: /s/shop-demo/imports
        - paragraph: Nhập dữ liệu
    - listitem:
      - link "Tồn kho":
        - /url: /s/shop-demo/inventory
        - paragraph: Tồn kho
    - listitem:
      - link "Lịch sử kho":
        - /url: /s/shop-demo/inventory/movements
        - paragraph: Lịch sử kho
    - listitem:
      - link "Nhà cung cấp":
        - /url: /s/shop-demo/suppliers
        - paragraph: Nhà cung cấp
    - listitem:
      - link "Đề nghị nhập":
        - /url: /s/shop-demo/replenishment
        - paragraph: Đề nghị nhập
    - listitem:
      - link "Đơn mua hàng":
        - /url: /s/shop-demo/purchases
        - paragraph: Đơn mua hàng
    - listitem:
      - link "Nhận hàng":
        - /url: /s/shop-demo/receipts
        - paragraph: Nhận hàng
  - text: KẾ TOÁN
  - list:
    - listitem:
      - link "Thu chi":
        - /url: /s/shop-demo/finance
        - paragraph: Thu chi
    - listitem:
      - link "Sổ thu chi":
        - /url: /s/shop-demo/finance/entries
        - paragraph: Sổ thu chi
    - listitem:
      - link "Lợi nhuận":
        - /url: /s/shop-demo/finance/profit-loss
        - paragraph: Lợi nhuận
    - listitem:
      - link "Chứng từ & sổ kép":
        - /url: /s/shop-demo/finance/journals
        - paragraph: Chứng từ & sổ kép
    - listitem:
      - link "Đối soát":
        - /url: /s/shop-demo/finance/reconciliation
        - paragraph: Đối soát
    - listitem:
      - link "Công nợ & khóa kỳ":
        - /url: /s/shop-demo/finance/debts-periods
        - paragraph: Công nợ & khóa kỳ
  - text: ĐỘI NGŨ AI
  - list:
    - listitem:
      - link "Bốn nhân viên AI":
        - /url: /s/shop-demo/bot/team
        - paragraph: Bốn nhân viên AI
    - listitem:
      - link "Cấu hình Admin":
        - /url: /s/shop-demo/bot
        - paragraph: Cấu hình Admin
    - listitem:
      - link "Thử bot":
        - /url: /s/shop-demo/bot/playground
        - paragraph: Thử bot
    - listitem:
      - link "Chất lượng AI":
        - /url: /s/shop-demo/bot/evaluations
        - paragraph: Chất lượng AI
    - listitem:
      - link "Kiến thức cửa hàng":
        - /url: /s/shop-demo/knowledge
        - paragraph: Kiến thức cửa hàng
    - listitem:
      - link "Phản hồi cần duyệt":
        - /url: /s/shop-demo/knowledge/review
        - paragraph: Phản hồi cần duyệt
    - listitem:
      - link "Bản tin & sức khỏe":
        - /url: /s/shop-demo/operations/digests
        - paragraph: Bản tin & sức khỏe
  - text: THÔNG BÁO & BÁO CÁO
  - list:
    - listitem:
      - link "Trung tâm thông báo":
        - /url: /s/shop-demo/notifications
        - paragraph: Trung tâm thông báo
    - listitem:
      - link "Điện thoại & lịch trực":
        - /url: /s/shop-demo/notifications/devices
        - paragraph: Điện thoại & lịch trực
    - listitem:
      - link "Xuất báo cáo":
        - /url: /s/shop-demo/reports
        - paragraph: Xuất báo cáo
    - listitem:
      - link "Thông tin marketing":
        - /url: /s/shop-demo/reports/marketing
        - paragraph: Thông tin marketing
  - text: CÀI ĐẶT
  - list:
    - listitem:
      - link "Kết nối Facebook":
        - /url: /s/shop-demo/integrations/channels
        - paragraph: Kết nối Facebook
    - listitem:
      - link "Nhà cung cấp AI":
        - /url: /s/shop-demo/integrations/ai
        - paragraph: Nhà cung cấp AI
    - listitem:
      - link "Nhân sự & quyền":
        - /url: /s/shop-demo/settings/team
        - paragraph: Nhân sự & quyền
    - listitem:
      - link "Cửa hàng":
        - /url: /s/shop-demo/settings/shop
        - paragraph: Cửa hàng
    - listitem:
      - link "Nhật ký":
        - /url: /s/shop-demo/settings/audit
        - paragraph: Nhật ký
    - listitem:
      - link "Quyền riêng tư":
        - /url: /s/shop-demo/settings/privacy
        - paragraph: Quyền riêng tư
  - separator
  - text: J
  - paragraph: Jokertrader · tài khoản mẫu
  - text: owner
  - button "Đăng xuất"
- banner:
  - paragraph: Không gian làm việc / Trung tâm thông báo
  - textbox "Tìm màn hình":
    - /placeholder: Tìm màn hình...
  - text: Dữ liệu mô phỏng
  - link "Thông báo":
    - /url: /s/shop-demo/notifications
  - text: J
- alert:
  - text: "Frontend review: API được mô phỏng trong bộ nhớ, không gửi tin hoặc đặt hàng thật. Tải lại trang sẽ khởi tạo lại dữ liệu."
  - button "Góp ý"
- button "Công cụ demo"
- text: owner · Bình thường · Dataset mặc định
- main:
  - heading "Trung tâm thông báo" [level=1]
  - paragraph: Đã gửi không đồng nghĩa đã đọc. Nhận việc là một xác nhận riêng.
  - link "Điện thoại & lịch trực":
    - /url: /s/shop-demo/notifications/devices
  - heading "Đơn DH-DEMO-PAID-01 cần chuẩn bị" [level=6]
  - paragraph: 1 mặt hàng · Bấm để nhận việc.
  - text: Đang chờ in_app · 21:00 29/9/26 Đã nhận việc lúc 21:00 29/9/26
  - link "Xem đơn":
    - /url: /s/shop-demo/orders/DH-DEMO-PAID-01
  - text: 1 kết quả
  - button "Đầu danh sách" [disabled]
  - button "Trang tiếp" [disabled]
- contentinfo:
  - text: BotSales AI · Graphite Gold · Frontend
  - button "Góp ý màn hình"
```

# Test source

```ts
  1  | import { openDemoControls } from '../session/demo-controls';
  2  | import { readFileSync } from 'node:fs';
  3  | import { test, expect } from '@playwright/test';
  4  | import { startDemoServer } from '../session/demo-server.mjs';
  5  | 
  6  | type Route = { id: string; path: string };
  7  | type RouteManifest = { routes: Route[] };
  8  | const routeManifest = JSON.parse(
  9  |     readFileSync(new URL('../../../botsales-kit/contracts/route-manifest.json', import.meta.url), 'utf8'),
  10 | ) as RouteManifest;
  11 | const detailIds: Record<string, string> = {
  12 |     conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001',
  13 |     knowledgeId: 'k1', jobId: 'missing-job',
  14 | };
  15 | 
  16 | function routePath(path: string) {
  17 |     return path
  18 |         .replace(':shopId', 'shop-demo')
  19 |         .replace(/:([A-Za-z]+)/g, (_, key: string) => detailIds[key] || 'missing');
  20 | }
  21 | 
  22 | async function chooseMockOption(page: import('@playwright/test').Page, label: string, value: string) {
  23 |     if (['Vai trò mô phỏng', 'Trạng thái thử', 'Dataset mô phỏng'].includes(label)) await openDemoControls(page);
  24 |     await page.getByRole('combobox', { name: label }).click();
  25 |     await page.getByRole('option', { name: value, exact: true }).click();
  26 | }
  27 | 
  28 | test('every shop route composes the shared API error state with its page content', async ({ browser }) => {
  29 |     test.setTimeout(300_000);
  30 |     const server = await startDemoServer();
  31 |     const checkedRouteIds: string[] = [];
  32 | 
  33 |     try {
  34 |         const selectedRouteId = process.env.ROUTE_ERROR_TEST_ID;
  35 |         const shopRoutes = routeManifest.routes
  36 |             .filter(route => route.path.startsWith('/s/') && (!selectedRouteId || route.id === selectedRouteId));
  37 |         expect(shopRoutes).toHaveLength(selectedRouteId ? 1 : 51);
  38 | 
  39 |         for (const route of shopRoutes) {
  40 |             // Isolate each page's MSW service-worker client. Reusing a context after
  41 |             // closing dozens of pages can leave Firefox with stale service-worker clients.
  42 |             const context = await browser.newContext();
  43 |             const page = await context.newPage();
  44 |             try {
  45 |                 const startingRoute = route.id === 'R39' || route.id === 'R33' ? '/s/shop-demo/overview' : '/s/shop-demo/notifications';
  46 |                 await page.goto(new URL(startingRoute, server.url).toString());
> 47 |                 await expect(page.getByRole('combobox', { name: 'Trạng thái thử' })).toBeVisible({ timeout: 15_000 });
     |                                                                                      ^ Error: expect(locator).toBeVisible() failed
  48 |                 await chooseMockOption(page, 'Trạng thái thử', 'Lỗi API kéo dài');
  49 |                 await page.evaluate(nextPath => {
  50 |                     window.history.pushState({}, '', nextPath);
  51 |                     window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  52 |                 }, routePath(route.path));
  53 | 
  54 |                 const main = page.locator('main#main-content');
  55 |                 await expect(main).toBeVisible();
  56 |                 if (route.id === 'R10') {
  57 |                     const categoryError = main.getByRole('alert').filter({ hasText: 'Không tải được danh mục' });
  58 |                     await expect(categoryError, `${route.id} should explain when category choices cannot load`).toBeVisible({ timeout: 10_000 });
  59 |                     await chooseMockOption(page, 'Trạng thái thử', 'Bình thường');
  60 |                     await categoryError.getByRole('button', { name: 'Thử lại danh mục' }).click();
  61 |                     await expect(categoryError).toHaveCount(0);
  62 |                 } else if (route.id === 'R33') {
  63 |                     await expect(main.getByRole('heading', { name: 'Thiết lập cửa hàng' }), 'R33 uses shop data already loaded by the shared shell').toBeVisible();
  64 |                     await chooseMockOption(page, 'Trạng thái thử', 'Bình thường');
  65 |                 } else {
  66 |                     await expect(main.locator('[role="alert"], [role="status"]').filter({ hasText: 'API mô phỏng đang lỗi liên tục' }).first(), `${route.id} ${route.path} should expose the failed read`)
  67 |                         .toBeVisible({ timeout: 10_000 });
  68 |                     await chooseMockOption(page, 'Trạng thái thử', 'Bình thường');
  69 |                 }
  70 |                 await expect(page.locator('.MuiSnackbar-root').filter({ hasText: /thành công|đã lưu|đã tạo|đã cập nhật|hoàn tất|success/i }), `${route.id} must not show a success toast while an API read is failing`)
  71 |                     .toHaveCount(0);
  72 |                 if (route.id === 'R10') {
  73 |                     await expect(main.getByRole('combobox', { name: 'Danh mục' })).toBeVisible();
  74 |                 }
  75 |                 checkedRouteIds.push(route.id);
  76 |                 if (checkedRouteIds.length % 10 === 0)
  77 |                     console.log(`ROUTE_ERROR_COMPOSITION_PROGRESS=${checkedRouteIds.length}/51`);
  78 |             } finally {
  79 |                 await context.close();
  80 |             }
  81 |         }
  82 | 
  83 |         console.log(`ROUTE_ERROR_COMPOSITION=${checkedRouteIds.length}/${shopRoutes.length} RESULT=PASS`);
  84 |         expect(new Set(checkedRouteIds).size).toBe(shopRoutes.length);
  85 |     } finally {
  86 |         await server.close();
  87 |     }
  88 | });
  89 | 
```