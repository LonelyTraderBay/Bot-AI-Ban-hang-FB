# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-knowledge-layout.spec.ts >> Knowledge routes R23/R24/R25 fit every supported layout boundary
- Location: tests/ui-knowledge-layout.spec.ts:56:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Chính sách đổi hàng', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Chính sách đổi hàng', exact: true }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Chính sách đổi hàng', exact: true })

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
  - navigation "Đường dẫn hiện tại": Không gian làm việc / Chi tiết kiến thức
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
  - status:
    - progressbar "Đang tải màn hình"
- contentinfo:
  - text: BotSales AI · Graphite Gold · Frontend
  - button "Góp ý màn hình"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { startDemoServer } from './session/demo-server.mjs';
  3  | 
  4  | let demoUrl = '';
  5  | let closeDemo: (() => Promise<void>) | undefined;
  6  | 
  7  | test.beforeAll(async () => {
  8  |     const server = await startDemoServer({ cacheIsolationKey: 'ui028-w17-knowledge-layout' });
  9  |     demoUrl = server.url;
  10 |     closeDemo = server.close;
  11 | });
  12 | 
  13 | test.afterAll(async () => closeDemo?.());
  14 | 
  15 | async function gotoDemo(page: import('@playwright/test').Page, route: string) {
  16 |     await page.goto(new URL(route, demoUrl).toString());
  17 | }
  18 | 
  19 | async function seedPendingFeedbackAndOpenReview(page: import('@playwright/test').Page) {
  20 |     await gotoDemo(page, '/s/shop-demo/inbox/cv1');
  21 |     await page.getByRole('button', { name: /^Đánh giá tin nhắn/ }).first().click();
  22 |     const dialog = page.getByRole('dialog', { name: 'Đánh giá câu trả lời' });
  23 |     await dialog.getByRole('textbox', { name: 'Nội dung đề xuất sửa' }).fill('Kiểm tra điều kiện theo chính sách đã duyệt.');
  24 |     const responseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/feedback'));
  25 |     await dialog.getByRole('button', { name: 'Lưu phản hồi', exact: true }).click();
  26 |     expect((await responseWait).status()).toBe(201);
  27 |     await page.evaluate(() => {
  28 |         window.history.pushState({}, '', '/s/shop-demo/knowledge/review');
  29 |         window.dispatchEvent(new PopStateEvent('popstate'));
  30 |     });
  31 |     await expect(page.getByRole('heading', { name: 'Duyệt phản hồi AI', exact: true })).toBeVisible();
  32 |     await expect(page.getByRole('button', { name: 'Duyệt nội dung', exact: true }).first()).toBeVisible();
  33 | }
  34 | 
  35 | async function expectNoHorizontalOverflow(page: import('@playwright/test').Page, width: number) {
  36 |     const metrics = await page.evaluate(() => ({
  37 |         viewport: document.documentElement.clientWidth,
  38 |         content: document.documentElement.scrollWidth,
  39 |     }));
  40 |     expect(metrics.viewport).toBe(width);
  41 |     expect(metrics.content).toBeLessThanOrEqual(metrics.viewport);
  42 | }
  43 | 
  44 | async function expectDialogFits(page: import('@playwright/test').Page, width: number, height: number) {
  45 |     const dialog = page.getByRole('dialog').first();
  46 |     await expect(dialog).toBeVisible();
  47 |     const bounds = await dialog.boundingBox();
  48 |     expect(bounds).not.toBeNull();
  49 |     expect(bounds!.x).toBeGreaterThanOrEqual(0);
  50 |     expect(bounds!.y).toBeGreaterThanOrEqual(0);
  51 |     expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
  52 |     expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height + 1);
  53 |     await expectNoHorizontalOverflow(page, width);
  54 | }
  55 | 
  56 | test('Knowledge routes R23/R24/R25 fit every supported layout boundary', async ({ page }) => {
  57 |     for (const width of [320, 390, 768, 1280, 1440]) {
  58 |         const height = width < 600 ? 844 : 900;
  59 |         await page.setViewportSize({ width, height });
  60 | 
  61 |         await gotoDemo(page, '/s/shop-demo/knowledge');
  62 |         await expect(page.getByRole('heading', { name: 'Kiến thức cửa hàng', exact: true })).toBeVisible();
  63 |         await expect(page.getByRole('table').first()).toBeVisible();
  64 |         await expectNoHorizontalOverflow(page, width);
  65 | 
  66 |         await gotoDemo(page, '/s/shop-demo/knowledge/k3');
> 67 |         await expect(page.getByRole('heading', { name: 'Chính sách đổi hàng', exact: true })).toBeVisible();
     |                                                                                               ^ Error: expect(locator).toBeVisible() failed
  68 |         await expect(page.getByRole('heading', { name: 'Lịch sử phiên bản', exact: true })).toBeVisible();
  69 |         await expectNoHorizontalOverflow(page, width);
  70 | 
  71 |         await seedPendingFeedbackAndOpenReview(page);
  72 |         await expectNoHorizontalOverflow(page, width);
  73 |     }
  74 | });
  75 | 
  76 | test('Knowledge create, edit, and feedback-review dialogs remain inside mobile and desktop viewports', async ({ page }) => {
  77 |     for (const width of [320, 390, 1280]) {
  78 |         const height = width < 600 ? 844 : 900;
  79 |         await page.setViewportSize({ width, height });
  80 | 
  81 |         await gotoDemo(page, '/s/shop-demo/knowledge');
  82 |         await page.getByRole('button', { name: 'Thêm nguồn kiến thức', exact: true }).click();
  83 |         await page.getByRole('dialog', { name: 'Nguồn kiến thức mới' }).waitFor();
  84 |         await expectDialogFits(page, width, height);
  85 | 
  86 |         await gotoDemo(page, '/s/shop-demo/knowledge/k3');
  87 |         await page.getByRole('button', { name: 'Sửa bản nháp', exact: true }).click();
  88 |         await page.getByRole('dialog', { name: 'Sửa nháp' }).waitFor();
  89 |         await expectDialogFits(page, width, height);
  90 | 
  91 |         await seedPendingFeedbackAndOpenReview(page);
  92 |         await page.getByRole('button', { name: 'Duyệt nội dung', exact: true }).first().click();
  93 |         await page.getByRole('dialog', { name: 'Kiểm tra phản hồi' }).waitFor();
  94 |         await expectDialogFits(page, width, height);
  95 |     }
  96 | });
  97 | 
```