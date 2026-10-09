# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: states\route-empty-composition.spec.ts >> empty collection responses render accessible empty states on canonical list routes
- Location: tests\states\route-empty-composition.spec.ts:29:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('combobox', { name: 'Trạng thái thử' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('combobox', { name: 'Trạng thái thử' }) with timeout 5000ms
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
  - paragraph: Không gian làm việc / Tổng quan
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
  - text: KHÔNG GIAN ĐIỀU HÀNH
  - heading "Chào Jokertrader, cửa hàng của bạn hôm nay." [level=1]
  - paragraph: Theo dõi việc cần xử lý, tiến độ đơn hàng và đội ngũ AI — tập trung vào những quyết định quan trọng.
  - link "Xem việc cần làm":
    - /url: /s/shop-demo/operations
  - link "Tạo đơn hàng":
    - /url: /s/shop-demo/orders/new
  - heading "Tình hình hiện tại" [level=2]
  - paragraph: Các KPI là trạng thái hiện tại do API trả về, không phải dự báo.
  - paragraph: Hội thoại đang mở
  - link "4":
    - /url: /s/shop-demo/inbox
  - text: Trạng thái hiện tại
  - paragraph: Đơn chờ xử lý
  - link "1":
    - /url: /s/shop-demo/orders
  - text: Theo trạng thái hiện tại của API
  - paragraph: Sản phẩm gần hết
  - link "3":
    - /url: /s/shop-demo/inventory
  - text: Theo ngưỡng tồn trong API
  - paragraph: Trợ lý bán hàng
  - text: Tạm dừng Trạng thái do API cung cấp
  - heading "Dòng tiền và doanh thu" [level=2]
  - paragraph: Doanh thu ghi nhận và tiền đã thu là hai chỉ số khác nhau.
  - paragraph: Doanh thu đã ghi nhận
  - heading "498.000 ₫" [level=4]
  - paragraph: Tiền đã thu
  - heading "249.000 ₫" [level=4]
  - link "Xem lợi nhuận":
    - /url: /s/shop-demo/finance/profit-loss
  - heading "Đơn hàng gần đây" [level=2]
  - paragraph: Mở đơn để xem trạng thái chuẩn bị, giao hàng và thanh toán.
  - link "Tất cả đơn":
    - /url: /s/shop-demo/orders
  - region "Đơn hàng gần đây":
    - table "Đơn hàng gần đây":
      - rowgroup:
        - row "Đơn hàng Giá trị Đơn Giao":
          - columnheader "Đơn hàng"
          - columnheader "Giá trị"
          - columnheader "Đơn"
          - columnheader "Giao"
      - rowgroup:
        - row "DH-DEMO-RETURN-02 DH-DEMO-RETURN-02 Sao chép mã đơn hàng 498.000 ₫ Hoàn tất Đã giao":
          - cell "DH-DEMO-RETURN-02 DH-DEMO-RETURN-02 Sao chép mã đơn hàng":
            - link "DH-DEMO-RETURN-02":
              - /url: /s/shop-demo/orders/DH-DEMO-RETURN-02
            - code: DH-DEMO-RETURN-02
            - button "Sao chép mã đơn hàng"
          - cell "498.000 ₫"
          - cell "Hoàn tất"
          - cell "Đã giao"
        - row "DH-DEMO-PAID-01 DH-DEMO-PAID-01 Sao chép mã đơn hàng 249.000 ₫ Hoàn tất Hoàn một phần":
          - cell "DH-DEMO-PAID-01 DH-DEMO-PAID-01 Sao chép mã đơn hàng":
            - link "DH-DEMO-PAID-01":
              - /url: /s/shop-demo/orders/DH-DEMO-PAID-01
            - code: DH-DEMO-PAID-01
            - button "Sao chép mã đơn hàng"
          - cell "249.000 ₫"
          - cell "Hoàn tất"
          - cell "Hoàn một phần"
        - row "DH-1001 DH-1001 Sao chép mã đơn hàng 249.000 ₫ Bản nháp Chưa chuẩn bị":
          - cell "DH-1001 DH-1001 Sao chép mã đơn hàng":
            - link "DH-1001":
              - /url: /s/shop-demo/orders/DH-1001
            - code: DH-1001
            - button "Sao chép mã đơn hàng"
          - cell "249.000 ₫"
          - cell "Bản nháp"
          - cell "Chưa chuẩn bị"
  - heading "Đội ngũ AI của cửa hàng" [level=2]
  - paragraph: Trạng thái vai trò lấy từ API; trạng thái kết nối bên ngoài chưa được xác minh.
  - link "Quản lý đội ngũ":
    - /url: /s/shop-demo/bot/team
  - paragraph: Admin bán hàng
  - text: Tạm dừng 3 công cụ được giao
  - paragraph: Kế toán
  - text: Tạm dừng 2 công cụ được giao
  - paragraph: Kho & mua hàng
  - text: Tạm dừng 2 công cụ được giao
  - paragraph: Trưởng nhóm
  - text: Tạm dừng 2 công cụ được giao
  - heading "Điều khiển trợ lý" [level=2]
  - paragraph: Tạm dừng là thao tác có tác động; cần xác nhận và lý do.
  - text: Tạm dừng
  - button "Bot đã tạm dừng" [disabled]
  - alert: Môi trường mô phỏng. Các kết nối ngoài chưa hoạt động.
  - text: Dữ liệu cập nhật 21:00 29/9/26 · Joker Studio · Shop mẫu
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
  15 | const emptyStateRoutes = new Set(['R07', 'R09', 'R12', 'R17', 'R21', 'R29', 'R30', 'R39', 'R44', 'R48', 'R50']);
  16 | 
  17 | function routePath(path: string) {
  18 |     return path
  19 |         .replace(':shopId', 'shop-demo')
  20 |         .replace(/:([A-Za-z]+)/g, (_, key: string) => detailIds[key] || 'missing');
  21 | }
  22 | 
  23 | async function chooseMockOption(page: import('@playwright/test').Page, label: string, value: string) {
  24 |     if (['Vai trò mô phỏng', 'Trạng thái thử', 'Dataset mô phỏng'].includes(label)) await openDemoControls(page);
  25 |     await page.getByRole('combobox', { name: label }).click();
  26 |     await page.getByRole('option', { name: value, exact: true }).click();
  27 | }
  28 | 
  29 | test('empty collection responses render accessible empty states on canonical list routes', async ({ page }) => {
  30 |     const server = await startDemoServer();
  31 |     const checkedRouteIds: string[] = [];
  32 | 
  33 |     try {
  34 |         await page.goto(new URL('/s/shop-demo/overview', server.url).toString());
> 35 |         await expect(page.getByRole('combobox', { name: 'Trạng thái thử' })).toBeVisible();
     |                                                                              ^ Error: expect(locator).toBeVisible() failed
  36 |         await chooseMockOption(page, 'Trạng thái thử', 'Danh sách rỗng (demo)');
  37 | 
  38 |         for (const route of routeManifest.routes.filter(route => emptyStateRoutes.has(route.id))) {
  39 |             await page.evaluate(nextPath => {
  40 |                 window.history.pushState({}, '', nextPath);
  41 |                 window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  42 |             }, routePath(route.path));
  43 | 
  44 |             const main = page.locator('main#main-content');
  45 |             await expect(main, `${route.id} should keep its page visible with empty API results`).toBeVisible();
  46 |             if (route.id === 'R29' || route.id === 'R30') {
  47 |                 const emptyCopy = route.id === 'R29' ? 'Chưa có Page kết nối.' : 'Chưa có kết nối AI.';
  48 |                 const actionName = route.id === 'R29' ? 'Kết nối Page' : 'Thêm kết nối AI';
  49 |                 await expect(main.getByRole('status').filter({ hasText: emptyCopy }), `${route.id} should expose an accessible empty card state`).toBeVisible();
  50 |                 await expect(main.getByRole('button', { name: actionName, exact: true }), `${route.id} should keep the action inside the empty state and avoid a duplicate header action`).toHaveCount(1);
  51 |             } else if (route.id === 'R39') {
  52 |                 await expect(main.getByRole('status').filter({ hasText: 'Chưa có thông báo.' }), `${route.id} should expose a polite empty-state announcement for the card list`).toBeVisible();
  53 |             } else {
  54 |                 const emptyCell = main.locator('tbody td[colspan]').first();
  55 |                 await expect(emptyCell, `${route.id} should announce an empty table rather than render a blank success`).toBeVisible({ timeout: 10_000 });
  56 |                 await expect(emptyCell.getByRole('status')).toBeVisible();
  57 |             }
  58 |             checkedRouteIds.push(route.id);
  59 |             if (checkedRouteIds.length % 3 === 0)
  60 |                 console.log(`ROUTE_EMPTY_COMPOSITION_PROGRESS=${checkedRouteIds.length}/${emptyStateRoutes.size}`);
  61 |         }
  62 | 
  63 |         expect(new Set(checkedRouteIds).size).toBe(emptyStateRoutes.size);
  64 |         console.log(`ROUTE_EMPTY_COMPOSITION=${checkedRouteIds.length}/${emptyStateRoutes.size} RESULT=PASS`);
  65 |     } finally {
  66 |         await server.close();
  67 |     }
  68 | });
  69 | 
```