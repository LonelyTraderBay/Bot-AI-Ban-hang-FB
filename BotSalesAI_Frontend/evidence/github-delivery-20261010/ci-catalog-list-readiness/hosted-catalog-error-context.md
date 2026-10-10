# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend.spec.ts >> catalog create uses the HTTP mock and successful save clears the draft guard
- Location: tests/frontend.spec.ts:41:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Sản phẩm kiểm thử', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Sản phẩm kiểm thử', { exact: true }) with timeout 5000ms
  - waiting for getByText('Sản phẩm kiểm thử', { exact: true })

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
      - link "Tài khoản kế toán":
        - /url: /s/shop-demo/finance/accounts
        - paragraph: Tài khoản kế toán
    - listitem:
      - link "Mở sổ kế toán":
        - /url: /s/shop-demo/finance/opening-balances
        - paragraph: Mở sổ kế toán
    - listitem:
      - link "Sổ cái":
        - /url: /s/shop-demo/finance/ledger
        - paragraph: Sổ cái
    - listitem:
      - link "Cân đối phát sinh":
        - /url: /s/shop-demo/finance/trial-balance
        - paragraph: Cân đối phát sinh
    - listitem:
      - link "Cân đối quản trị":
        - /url: /s/shop-demo/finance/balance-sheet
        - paragraph: Cân đối quản trị
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
      - link "Quản trị kho":
        - /url: /s/shop-demo/settings/warehouses
        - paragraph: Quản trị kho
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
  - text: Chủ shop
  - button "Đăng xuất"
- banner:
  - navigation "Đường dẫn hiện tại": Không gian làm việc / Chi tiết sản phẩm
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
  - heading "Thông tin sản phẩm" [level=1]
  - paragraph: Giá theo biến thể. Tồn kho được quản lý ở màn hình riêng.
  - link "Danh sách":
    - /url: /s/shop-demo/products
  - heading "Thông tin bán hàng" [level=2]
  - text: Tên sản phẩm
  - textbox "Tên sản phẩm": Sản phẩm kiểm thử
  - text: Mô tả dùng cho AI tư vấn
  - textbox "Mô tả dùng cho AI tư vấn"
  - text: Tìm danh mục
  - textbox "Tìm danh mục"
  - paragraph: Tìm trên danh sách cửa hàng; có thể tải thêm khi cần.
  - text: Danh mục
  - combobox "Danh mục"
  - text: Đã tải 3 lựa chọn Trạng thái
  - combobox "Trạng thái Bản nháp": Bản nháp
  - heading "Biến thể và giá" [level=2]
  - button "Thêm biến thể"
  - text: SKU
  - textbox "SKU": TEST-001
  - text: Tên / màu / kích cỡ
  - textbox "Tên / màu / kích cỡ": Mặc định
  - text: Giá bán (VND)
  - textbox "Giá bán (VND)": "150000"
  - checkbox "Đang bán" [checked]
  - text: Đang bán
  - button "Xóa biến thể 1" [disabled]
  - heading "Ảnh sản phẩm" [level=2]
  - paragraph: File được kiểm soát qua API upload; không nhúng secret hoặc URL tùy ý.
  - paragraph: 0 tệp được gắn với sản phẩm
  - button "Chọn ảnh"
  - button "Ngừng bán"
  - button "Lưu sản phẩm"
- contentinfo:
  - text: BotSales AI · Graphite Gold · Frontend
  - button "Góp ý màn hình"
```

# Test source

```ts
  1   | import { openDemoControls } from './session/demo-controls';
  2   | import { readFileSync } from 'node:fs';
  3   | import { test, expect } from '@playwright/test';
  4   | import { startDemoServer, startLiveServer } from './session/demo-server.mjs';
  5   | 
  6   | type RouteManifest = { routes: Array<{ id: string; path: string }> };
  7   | const routes = JSON.parse(readFileSync(new URL('../packages/contracts/src/routes.json', import.meta.url), 'utf8')) as RouteManifest;
  8   | const detailIds: Record<string, string> = {
  9   |     conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001',
  10  |     knowledgeId: 'k1', jobId: 'missing-job',
  11  | };
  12  | let demoUrl = '';
  13  | let liveUrl = '';
  14  | let stopDemoServer: (() => Promise<void>) | undefined;
  15  | let stopLiveServer: (() => Promise<void>) | undefined;
  16  | 
  17  | test.beforeAll(async () => {
  18  |     const server = await startDemoServer();
  19  |     demoUrl = server.url;
  20  |     stopDemoServer = server.close;
  21  |     const liveServer = await startLiveServer();
  22  |     liveUrl = liveServer.url;
  23  |     stopLiveServer = liveServer.close;
  24  | });
  25  | 
  26  | test.afterAll(async () => {
  27  |     await stopDemoServer?.();
  28  |     await stopLiveServer?.();
  29  | });
  30  | 
  31  | async function gotoDemo(page: import('@playwright/test').Page, path: string) {
  32  |     await page.goto(new URL(path, demoUrl).toString());
  33  | }
  34  | 
  35  | async function chooseMockOption(page: import('@playwright/test').Page, label: string, value: string) {
  36  |     if (['Vai trò mô phỏng', 'Trạng thái thử', 'Dataset mô phỏng'].includes(label)) await openDemoControls(page);
  37  |     await page.getByRole('combobox', { name: label }).click();
  38  |     await page.getByRole('option', { name: value, exact: true }).click();
  39  | }
  40  | 
  41  | test('catalog create uses the HTTP mock and successful save clears the draft guard', async ({ page }) => {
  42  |     await gotoDemo(page, '/s/shop-demo/products');
  43  |     await expect(page.getByRole('heading', { name: 'Sản phẩm', exact: true })).toBeVisible();
  44  |     await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toBeVisible();
  45  | 
  46  |     await page.getByRole('button', { name: 'Thêm sản phẩm', exact: true }).click();
  47  |     await page.getByLabel('Tên sản phẩm', { exact: true }).fill('Sản phẩm kiểm thử');
  48  |     await page.getByLabel('SKU', { exact: true }).fill('TEST-001');
  49  |     await page.getByLabel(/Giá bán/).fill('150000');
  50  |     await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
  51  | 
  52  |     await expect(page).toHaveURL(/\/products\/product-/);
  53  |     await expect(page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?' })).toHaveCount(0);
  54  |     await page.getByRole('link', { name: 'Danh sách', exact: true }).click();
> 55  |     await expect(page.getByText('Sản phẩm kiểm thử', { exact: true })).toBeVisible();
      |                                                                        ^ Error: expect(locator).toBeVisible() failed
  56  | });
  57  | 
  58  | test('dirty drafts block in-app navigation and preserve input until the user decides', async ({ page }) => {
  59  |     await gotoDemo(page, '/s/shop-demo/products/new');
  60  |     const name = page.getByLabel('Tên sản phẩm', { exact: true });
  61  |     await name.fill('Bản nháp chưa lưu');
  62  |     await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Danh mục' }).click();
  63  | 
  64  |     const dialog = page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?' });
  65  |     await expect(dialog).toBeVisible();
  66  |     await dialog.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }).click();
  67  |     await expect(name).toHaveValue('Bản nháp chưa lưu');
  68  | 
  69  |     await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Danh mục' }).click();
  70  |     await expect(dialog).toBeVisible();
  71  |     await dialog.getByRole('button', { name: 'Rời màn hình' }).click();
  72  |     await expect(page).toHaveURL(/\/categories$/);
  73  |     await expect(page.getByRole('heading', { name: 'Danh mục', exact: true })).toBeVisible();
  74  | });
  75  | 
  76  | test('all canonical routes render inside the real React demo application', async ({ page }) => {
  77  |     const errors: string[] = [];
  78  |     page.on('pageerror', error => errors.push(error.message));
  79  |     for (const route of routes.routes) {
  80  |         const path = route.path
  81  |             .replace(':shopId', 'shop-demo')
  82  |             .replace(/:([A-Za-z]+)/g, (_, key: string) => detailIds[key] || 'missing');
  83  |         await gotoDemo(page, path);
  84  |         if (route.path.startsWith('/s/')) {
  85  |             const main = page.locator('main#main-content');
  86  |             await expect(main, `${route.id} should mount the shop-scoped page`).toBeVisible();
  87  |             await expect(main.getByRole('heading').first(), `${route.id} should render page content`).toBeVisible();
  88  |             await expect(main.getByRole('heading', { name: 'Không thể mở màn hình', exact: true }), `${route.id} should not fall through to the router error boundary`).toHaveCount(0);
  89  |             await expect(page.getByText('Dữ liệu mô phỏng', { exact: true }), `${route.id} should disclose the synthetic data source`).toBeVisible();
  90  |         } else {
  91  |             const heading = page.getByRole('heading').first();
  92  |             await expect(heading, `${route.id} should render its public page content`).toBeVisible();
  93  |             await expect(page.getByRole('heading', { name: 'Không thể mở màn hình', exact: true })).toHaveCount(0);
  94  |             await expect(page.getByRole('heading', { name: 'Không tìm thấy trang', exact: true })).toHaveCount(0);
  95  |         }
  96  |         await expect(page.getByText('Chưa khởi động được ứng dụng', { exact: true })).toHaveCount(0);
  97  |     }
  98  |     expect(errors).toEqual([]);
  99  | });
  100 | 
  101 | test('switching shops cancels a delayed request and loads only the new shop scope', async ({ page }) => {
  102 |     await gotoDemo(page, '/s/shop-demo/overview');
  103 |     await chooseMockOption(page, 'Trạng thái thử', 'Tải chậm');
  104 |     await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Sản phẩm' }).click();
  105 |     await expect(page).toHaveURL(/\/shop-demo\/products$/);
  106 |     await page.getByRole('link', { name: /Joker Studio/ }).click();
  107 |     await expect(page.getByRole('heading', { name: 'Chọn cửa hàng', exact: true })).toBeVisible();
  108 |     await page.getByRole('link', { name: 'Mở cửa hàng' }).nth(1).click();
  109 |     await expect(page).toHaveURL(/\/s\/shop-second\/overview$/);
  110 |     await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Sản phẩm' }).click();
  111 | 
  112 |     const firstProduct = page.getByRole('link', { name: 'Chi tiết' }).first();
  113 |     await expect(firstProduct).toHaveAttribute('href', '/s/shop-second/products/b-p1');
  114 |     await page.waitForTimeout(1600);
  115 |     await expect(firstProduct).toHaveAttribute('href', '/s/shop-second/products/b-p1');
  116 |     await expect(page.locator('a[href="/s/shop-demo/products/p1"]')).toHaveCount(0);
  117 | });
  118 | 
  119 | test('role changes remove restricted navigation and the route guard explains denied access', async ({ page }) => {
  120 |     await gotoDemo(page, '/s/shop-demo/overview');
  121 |     await chooseMockOption(page, 'Vai trò mô phỏng', 'viewer');
  122 |     await expect(page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Lợi nhuận' })).toHaveCount(0);
  123 | 
  124 |     await page.evaluate(() => {
  125 |         window.history.pushState({}, '', '/s/shop-demo/finance/profit-loss');
  126 |         window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  127 |     });
  128 |     await expect(page.getByText(/Bạn không có quyền truy cập màn hình này trong/)).toBeVisible();
  129 |     await expect(page.getByText(/Việc kiểm quyền thực thi vẫn thuộc backend/)).toBeVisible();
  130 | });
  131 | 
  132 | test('deep links survive browser refresh and logout clears the mock session', async ({ page }) => {
  133 |     await gotoDemo(page, '/s/shop-demo/orders/DH-DEMO-PAID-01');
  134 |     await expect(page.getByRole('heading', { name: 'Đơn DH-DEMO-PAID-01' })).toBeVisible();
  135 |     await page.reload();
  136 |     await expect(page.getByRole('heading', { name: 'Đơn DH-DEMO-PAID-01' })).toBeVisible();
  137 | 
  138 |     const logoutResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v2/auth/logout');
  139 |     await page.getByRole('button', { name: 'Đăng xuất' }).click();
  140 |     expect((await logoutResponse).status()).toBe(204);
  141 |     await expect(page.getByRole('heading', { name: 'Chào mừng trở lại' })).toBeVisible();
  142 |     await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toHaveCount(0);
  143 | });
  144 | 
  145 | test('logout asks before discarding a draft and retains the session when logout fails', async ({ browser }) => {
  146 |     const context = await browser.newContext({ serviceWorkers: 'block' });
  147 |     try {
  148 |         const page = await context.newPage();
  149 |         const seed = JSON.parse(readFileSync(new URL('../apps/web/src/mocks/seed.json', import.meta.url), 'utf8'));
  150 |         const membership = seed.members.find((item: { shopId: string; userId: string }) => item.shopId === 'shop-demo' && item.userId === 'user-demo');
  151 |         const shop = seed.shops.find((item: { id: string }) => item.id === 'shop-demo');
  152 |         const session = {
  153 |             user: { id: 'user-demo', displayName: 'Tài khoản kiểm thử', email: 'owner@example.test' },
  154 |             csrfToken: 'test-only-token-1', expiresAt: '2030-12-31T23:59:59Z', memberships: [membership],
  155 |         };
```