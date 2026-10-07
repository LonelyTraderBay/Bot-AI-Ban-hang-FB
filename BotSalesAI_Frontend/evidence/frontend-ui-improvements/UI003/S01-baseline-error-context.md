# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fe015.spec.ts >> UI003 report timestamps follow the active shop timezone
- Location: tests\fe015.spec.ts:116:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('body')
Timeout: 5000ms
- Expected substring  - 1
+ Received string     + 2

- 00:00 1/9/26
+ Đến nội dung chínhBotSales AIĐội ngũ vận hành cửa hàngJoker Studio · Shop mẫu⌄ĐIỀU HÀNHTổng quanCông việc hôm nayCần phê duyệtBÁN HÀNGHộp thư khách hàngKhách hàngĐơn hàngChuẩn bị hàngVận đơn & giao hàngĐổi trảChăm sóc sau bánHÀNG HÓASản phẩmDanh mụcNhập dữ liệuTồn khoLịch sử khoNhà cung cấpĐề nghị nhậpĐơn mua hàngNhận hàngKẾ TOÁNThu chiSổ thu chiLợi nhuậnChứng từ & sổ képĐối soátCông nợ & khóa kỳĐỘI NGŨ AIBốn nhân viên AICấu hình AdminThử botChất lượng AIKiến thức cửa hàngPhản hồi cần duyệtBản tin & sức khỏeTHÔNG BÁO & BÁO CÁOTrung tâm thông báoĐiện thoại & lịch trựcXuất báo cáoThông tin marketingCÀI ĐẶTKết nối FacebookNhà cung cấp AINhân sự & quyềnCửa hàngNhật kýQuyền riêng tưJJokertrader · tài khoản mẫuownerKhông gian làm việc  / Thu/chi tổng quan​Dữ liệu mô phỏngJFrontend review: API được mô phỏng trong bộ nhớ, không gửi tin hoặc đặt hàng thật. Tải lại trang sẽ khởi tạo lại dữ liệu.Góp ýThử giao diện:Vai trò mô phỏngownerVai trò mô phỏngTrạng thái thửBình thườngTrạng thái thửDataset mô phỏngDataset mặc địnhDataset mô phỏngDòng tiềnTiền thực thu và thực chi, tách biệt doanh thu và lợi nhuận.Sổ thu chiTừ ngàyTừ ngàyĐến trước ngàyĐến trước ngàyKhoảng [Từ, Đến); múi giờ UTC.Tiền đã thu249.000 ₫Tiền đã chi274.000 ₫Biến động tiền thuần−25.000 ₫Không phải số dư tài khoảnMúi giờ báo cáoUTCKỳ báo cáoTừ07:00 1/9/26Đến (không gồm)07:00 1/10/26Dữ liệu tại21:00 29/9/26Số liệu của phiên mô phỏng; không phải số dư tài khoản ngân hàng.BotSales AI · Graphite Gold · FrontendGóp ý màn hình
+

Call log:
  - Expect "toContainText" locator('body') with timeout 5000ms
  - waiting for locator('body')
    14 × locator resolved to <body>…</body>
       - unexpected value "Đến nội dung chínhBotSales AIĐội ngũ vận hành cửa hàngJoker Studio · Shop mẫu⌄ĐIỀU HÀNHTổng quanCông việc hôm nayCần phê duyệtBÁN HÀNGHộp thư khách hàngKhách hàngĐơn hàngChuẩn bị hàngVận đơn & giao hàngĐổi trảChăm sóc sau bánHÀNG HÓASản phẩmDanh mụcNhập dữ liệuTồn khoLịch sử khoNhà cung cấpĐề nghị nhậpĐơn mua hàngNhận hàngKẾ TOÁNThu chiSổ thu chiLợi nhuậnChứng từ & sổ képĐối soátCông nợ & khóa kỳĐỘI NGŨ AIBốn nhân viên AICấu hình AdminThử botChất lượng AIKiến thức cửa hàngPhản hồi cần duyệtBản tin & sức khỏeTHÔNG BÁO & BÁO CÁOTrung tâm thông báoĐiện thoại & lịch trựcXuất báo cáoThông tin marketingCÀI ĐẶTKết nối FacebookNhà cung cấp AINhân sự & quyềnCửa hàngNhật kýQuyền riêng tưJJokertrader · tài khoản mẫuownerKhông gian làm việc  / Thu/chi tổng quan​Dữ liệu mô phỏngJFrontend review: API được mô phỏng trong bộ nhớ, không gửi tin hoặc đặt hàng thật. Tải lại trang sẽ khởi tạo lại dữ liệu.Góp ýThử giao diện:Vai trò mô phỏngownerVai trò mô phỏngTrạng thái thửBình thườngTrạng thái thửDataset mô phỏngDataset mặc địnhDataset mô phỏngDòng tiềnTiền thực thu và thực chi, tách biệt doanh thu và lợi nhuận.Sổ thu chiTừ ngàyTừ ngàyĐến trước ngàyĐến trước ngàyKhoảng [Từ, Đến); múi giờ UTC.Tiền đã thu249.000 ₫Tiền đã chi274.000 ₫Biến động tiền thuần−25.000 ₫Không phải số dư tài khoảnMúi giờ báo cáoUTCKỳ báo cáoTừ07:00 1/9/26Đến (không gồm)07:00 1/10/26Dữ liệu tại21:00 29/9/26Số liệu của phiên mô phỏng; không phải số dư tài khoản ngân hàng.BotSales AI · Graphite Gold · FrontendGóp ý màn hình
"

```

```yaml
- link "Đến nội dung chính":
  - /url: "#main-content"
- navigation "Điều hướng chính":
  - paragraph: BotSales AI
  - text: Đội ngũ vận hành cửa hàng
  - link "Joker Studio · Shop mẫu ⌄":
    - /url: /workspaces
  - paragraph: ĐIỀU HÀNH
  - list:
    - listitem:
      - link "Tổng quan":
        - /url: /s/shop-demo/overview
    - listitem:
      - link "Công việc hôm nay":
        - /url: /s/shop-demo/operations
    - listitem:
      - link "Cần phê duyệt":
        - /url: /s/shop-demo/approvals
  - paragraph: BÁN HÀNG
  - list:
    - listitem:
      - link "Hộp thư khách hàng":
        - /url: /s/shop-demo/inbox
    - listitem:
      - link "Khách hàng":
        - /url: /s/shop-demo/customers
    - listitem:
      - link "Đơn hàng":
        - /url: /s/shop-demo/orders
    - listitem:
      - link "Chuẩn bị hàng":
        - /url: /s/shop-demo/fulfillment
    - listitem:
      - link "Vận đơn & giao hàng":
        - /url: /s/shop-demo/shipments
    - listitem:
      - link "Đổi trả":
        - /url: /s/shop-demo/returns
    - listitem:
      - link "Chăm sóc sau bán":
        - /url: /s/shop-demo/service-cases
  - paragraph: HÀNG HÓA
  - list:
    - listitem:
      - link "Sản phẩm":
        - /url: /s/shop-demo/products
    - listitem:
      - link "Danh mục":
        - /url: /s/shop-demo/categories
    - listitem:
      - link "Nhập dữ liệu":
        - /url: /s/shop-demo/imports
    - listitem:
      - link "Tồn kho":
        - /url: /s/shop-demo/inventory
    - listitem:
      - link "Lịch sử kho":
        - /url: /s/shop-demo/inventory/movements
    - listitem:
      - link "Nhà cung cấp":
        - /url: /s/shop-demo/suppliers
    - listitem:
      - link "Đề nghị nhập":
        - /url: /s/shop-demo/replenishment
    - listitem:
      - link "Đơn mua hàng":
        - /url: /s/shop-demo/purchases
    - listitem:
      - link "Nhận hàng":
        - /url: /s/shop-demo/receipts
  - paragraph: KẾ TOÁN
  - list:
    - listitem:
      - link "Thu chi":
        - /url: /s/shop-demo/finance
    - listitem:
      - link "Sổ thu chi":
        - /url: /s/shop-demo/finance/entries
    - listitem:
      - link "Lợi nhuận":
        - /url: /s/shop-demo/finance/profit-loss
    - listitem:
      - link "Chứng từ & sổ kép":
        - /url: /s/shop-demo/finance/journals
    - listitem:
      - link "Đối soát":
        - /url: /s/shop-demo/finance/reconciliation
    - listitem:
      - link "Công nợ & khóa kỳ":
        - /url: /s/shop-demo/finance/debts-periods
  - paragraph: ĐỘI NGŨ AI
  - list:
    - listitem:
      - link "Bốn nhân viên AI":
        - /url: /s/shop-demo/bot/team
    - listitem:
      - link "Cấu hình Admin":
        - /url: /s/shop-demo/bot
    - listitem:
      - link "Thử bot":
        - /url: /s/shop-demo/bot/playground
    - listitem:
      - link "Chất lượng AI":
        - /url: /s/shop-demo/bot/evaluations
    - listitem:
      - link "Kiến thức cửa hàng":
        - /url: /s/shop-demo/knowledge
    - listitem:
      - link "Phản hồi cần duyệt":
        - /url: /s/shop-demo/knowledge/review
    - listitem:
      - link "Bản tin & sức khỏe":
        - /url: /s/shop-demo/operations/digests
  - paragraph: THÔNG BÁO & BÁO CÁO
  - list:
    - listitem:
      - link "Trung tâm thông báo":
        - /url: /s/shop-demo/notifications
    - listitem:
      - link "Điện thoại & lịch trực":
        - /url: /s/shop-demo/notifications/devices
    - listitem:
      - link "Xuất báo cáo":
        - /url: /s/shop-demo/reports
    - listitem:
      - link "Thông tin marketing":
        - /url: /s/shop-demo/reports/marketing
  - paragraph: CÀI ĐẶT
  - list:
    - listitem:
      - link "Kết nối Facebook":
        - /url: /s/shop-demo/integrations/channels
    - listitem:
      - link "Nhà cung cấp AI":
        - /url: /s/shop-demo/integrations/ai
    - listitem:
      - link "Nhân sự & quyền":
        - /url: /s/shop-demo/settings/team
    - listitem:
      - link "Cửa hàng":
        - /url: /s/shop-demo/settings/shop
    - listitem:
      - link "Nhật ký":
        - /url: /s/shop-demo/settings/audit
    - listitem:
      - link "Quyền riêng tư":
        - /url: /s/shop-demo/settings/privacy
  - separator
  - text: J
  - paragraph: Jokertrader · tài khoản mẫu
  - text: owner
  - button "Đăng xuất"
- banner:
  - paragraph: Không gian làm việc / Thu/chi tổng quan
  - textbox "Tìm màn hình":
    - /placeholder: Tìm màn hình...
  - text: Dữ liệu mô phỏng
  - link "Thông báo":
    - /url: /s/shop-demo/notifications
  - text: J
- alert:
  - text: "Frontend review: API được mô phỏng trong bộ nhớ, không gửi tin hoặc đặt hàng thật. Tải lại trang sẽ khởi tạo lại dữ liệu."
  - button "Góp ý"
- text: "Thử giao diện: Vai trò mô phỏng"
- combobox "Vai trò mô phỏng Vai trò mô phỏng": owner
- text: Trạng thái thử
- combobox "Trạng thái thử Trạng thái thử": Bình thường
- text: Dataset mô phỏng
- combobox "Dataset mô phỏng Dataset mô phỏng": Dataset mặc định
- main:
  - heading "Dòng tiền" [level=1]
  - paragraph: Tiền thực thu và thực chi, tách biệt doanh thu và lợi nhuận.
  - link "Sổ thu chi":
    - /url: /s/shop-demo/finance/entries
  - text: Từ ngày
  - textbox "Từ ngày": 2026-09-01
  - text: Đến trước ngày
  - textbox "Đến trước ngày": 2026-10-01
  - alert: Khoảng [Từ, Đến); múi giờ UTC.
  - paragraph: Tiền đã thu
  - heading "249.000 ₫" [level=4]
  - paragraph: Tiền đã chi
  - heading "274.000 ₫" [level=4]
  - paragraph: Biến động tiền thuần
  - heading "−25.000 ₫" [level=4]
  - text: Không phải số dư tài khoản
  - paragraph: Múi giờ báo cáo
  - heading "UTC" [level=4]
  - heading "Kỳ báo cáo" [level=6]
  - paragraph: Từ
  - text: 07:00 1/9/26
  - separator
  - paragraph: Đến (không gồm)
  - text: 07:00 1/10/26
  - separator
  - paragraph: Dữ liệu tại
  - text: 21:00 29/9/26
  - separator
  - alert: Số liệu của phiên mô phỏng; không phải số dư tài khoản ngân hàng.
- contentinfo:
  - text: BotSales AI · Graphite Gold · Frontend
  - button "Góp ý màn hình"
```

# Test source

```ts
  39  |     return { response, payload };
  40  | }
  41  | 
  42  | async function discardDialogChanges(page: import('@playwright/test').Page, dialog: import('@playwright/test').Locator) {
  43  |     await dialog.getByRole('button', { name: 'Đóng' }).click();
  44  |     const confirmation = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?' });
  45  |     await confirmation.getByRole('button', { name: 'Bỏ thay đổi' }).click();
  46  |     await expect(dialog).toBeHidden();
  47  | }
  48  | 
  49  | test('FE015.AC01 report filters use exact timezone boundaries and mock API aggregates', async ({ page }) => {
  50  |     await gotoDemo(page, '/s/shop-demo/finance');
  51  |     const from = page.getByRole('textbox', { name: 'Từ ngày' });
  52  |     const to = page.getByRole('textbox', { name: 'Đến trước ngày' });
  53  |     await expect(from).toBeVisible();
  54  | 
  55  |     const septemberResponseWait = page.waitForResponse(response => {
  56  |         const url = new URL(response.url());
  57  |         return response.request().method() === 'GET' && url.pathname.endsWith('/finance/cashflow') && url.searchParams.get('from') === '2026-08-31T17:00:00.000Z' && url.searchParams.get('to') === '2026-10-01T17:00:00.000Z';
  58  |     });
  59  |     // Arm the response listener before changing either date so a fast mock
  60  |     // response cannot arrive between the input events and the listener.
  61  |     await from.fill('2026-08-01');
  62  |     await to.fill('2026-12-01');
  63  |     await from.fill('2026-09-01');
  64  |     await to.fill('2026-10-02');
  65  |     const septemberResponse = await septemberResponseWait;
  66  |     expect(septemberResponse.status()).toBe(200);
  67  |     const report = (await septemberResponse.json()).data;
  68  |     expect(report).toMatchObject({ from: '2026-08-31T17:00:00.000Z', to: '2026-10-01T17:00:00.000Z', timezone: 'Asia/Vientiane' });
  69  |     expect(report.receipts.amount).toBe('249000');
  70  |     expect(report.disbursements.amount).toBe('274000');
  71  | 
  72  |     const octoberResponseWait = page.waitForResponse(response => {
  73  |         const url = new URL(response.url());
  74  |         return response.request().method() === 'GET' && url.pathname.endsWith('/finance/cashflow') && url.searchParams.get('from') === '2026-09-30T17:00:00.000Z' && url.searchParams.get('to') === '2026-11-01T17:00:00.000Z';
  75  |     });
  76  |     await to.fill('2026-11-02');
  77  |     await from.fill('2026-10-01');
  78  |     const octoberResponse = await octoberResponseWait;
  79  |     const october = (await octoberResponse.json()).data;
  80  |     expect(october.receipts.amount).toBe('0');
  81  |     expect(october.disbursements.amount).toBe('0');
  82  | 
  83  |     const profitResponseWait = page.waitForResponse(response => {
  84  |         const url = new URL(response.url());
  85  |         return response.request().method() === 'GET' && url.pathname.endsWith('/finance/profit-loss') && url.searchParams.has('from') && url.searchParams.has('to') && url.searchParams.get('timezone') === 'Asia/Vientiane';
  86  |     });
  87  |     await page.getByRole('link', { name: 'Lợi nhuận', exact: true }).click();
  88  |     const profitResponse = await profitResponseWait;
  89  |     expect(profitResponse.status()).toBe(200);
  90  |     const profit = (await profitResponse.json()).data;
  91  |     expect(profit).toHaveProperty('policyVersion', 'synthetic-policy-1');
  92  |     expect(profit).toHaveProperty('asOf');
  93  | });
  94  | 
  95  | test('FE021.E08 report explanation is mock-only, cites the filtered P&L snapshot, and never writes finance data', async ({ page }) => {
  96  |     const writes: string[] = [];
  97  |     page.on('request', request => {
  98  |         const url = new URL(request.url());
  99  |         if (url.pathname.includes('/shops/') && request.method() !== 'GET') writes.push(`${request.method()} ${url.pathname}`);
  100 |     });
  101 |     await gotoDemo(page, '/s/shop-demo/finance/profit-loss');
  102 |     await expect(page.getByRole('heading', { name: 'Lợi nhuận quản trị', exact: true })).toBeVisible();
  103 |     await expect(page.getByRole('heading', { name: 'Hỏi đáp có nguồn', exact: true })).toBeVisible();
  104 |     await expect(page.getByText(/Chế độ mô phỏng: câu trả lời theo mẫu cố định/)).toBeVisible();
  105 | 
  106 |     await page.getByRole('button', { name: 'Tạo giải thích mô phỏng', exact: true }).click();
  107 |     const explanation = page.getByRole('region', { name: 'Giải thích báo cáo mô phỏng' });
  108 |     await expect(explanation).toBeVisible();
  109 |     await expect(explanation).toContainText('Snapshot báo cáo ghi nhận doanh thu thuần');
  110 |     await expect(explanation).toContainText('Khoảng báo cáo');
  111 |     await expect(explanation).toContainText('synthetic-policy-1');
  112 |     await expect(explanation.getByText(/getProfitLoss chưa trả về journal ID/)).toBeVisible();
  113 |     expect(writes).toEqual([]);
  114 | });
  115 | 
  116 | test('UI003 report timestamps follow the active shop timezone', async ({ page }) => {
  117 |     const isolated = await startDemoServer({ cacheIsolationKey: 'fe015-ui003-timezone' });
  118 |     try {
  119 |         await page.goto(new URL('/s/shop-demo/settings/shop', isolated.url).toString());
  120 |         const timezone = page.getByRole('textbox', { name: 'Múi giờ' });
  121 |         await expect(timezone).toHaveValue('Asia/Vientiane');
  122 |         await timezone.fill('UTC');
  123 |         const updateWait = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname === '/api/v2/shops/shop-demo');
  124 |         await page.getByRole('button', { name: 'Lưu cấu hình' }).click();
  125 |         const updateResponse = await updateWait;
  126 |         expect(updateResponse.status()).toBe(200);
  127 |         expect((await updateResponse.json()).data.timezone).toBe('UTC');
  128 |         await expect(page.getByRole('status')).toContainText('Đã lưu cấu hình cửa hàng.');
  129 | 
  130 |         const utcReportWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/finance/cashflow'));
  131 |         await page.evaluate(() => {
  132 |             window.history.pushState({}, '', '/s/shop-demo/finance');
  133 |             window.dispatchEvent(new PopStateEvent('popstate'));
  134 |         });
  135 |         const utcReportResponse = await utcReportWait;
  136 |         expect(utcReportResponse.status()).toBe(200);
  137 |         const utcReport = (await utcReportResponse.json()).data;
  138 |         expect(utcReport.timezone).toBe('UTC');
> 139 |         await expect(page.locator('body')).toContainText(dateTime(utcReport.from, 'UTC'));
      |                                            ^ Error: expect(locator).toContainText(expected) failed
  140 |         await expect(page.locator('body')).toContainText(dateTime(utcReport.to, 'UTC'));
  141 |         await expect(page.locator('body')).toContainText(dateTime(utcReport.asOf, 'UTC'));
  142 | 
  143 |         const vientianeReportWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/finance/cashflow'));
  144 |         await page.evaluate(() => {
  145 |             window.history.pushState({}, '', '/s/shop-second/finance');
  146 |             window.dispatchEvent(new PopStateEvent('popstate'));
  147 |         });
  148 |         const vientianeReportResponse = await vientianeReportWait;
  149 |         expect(vientianeReportResponse.status()).toBe(200);
  150 |         const vientianeReport = (await vientianeReportResponse.json()).data;
  151 |         expect(vientianeReport.timezone).toBe('Asia/Vientiane');
  152 |         await expect(page.locator('body')).toContainText(dateTime(vientianeReport.from, 'Asia/Vientiane'));
  153 |         await expect(page.locator('body')).toContainText(dateTime(vientianeReport.asOf, 'Asia/Vientiane'));
  154 |     }
  155 |     finally {
  156 |         await isolated.close();
  157 |     }
  158 | });
  159 | 
  160 | test('FE015.E02/E03 profit report renders canonical cost, gross-profit and operating-expense values', async ({ page }) => {
  161 |     const writes: string[] = [];
  162 |     page.on('request', request => {
  163 |         if (request.method() !== 'GET' && new URL(request.url()).pathname.includes('/shops/')) writes.push(request.method());
  164 |     });
  165 |     const reportWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.includes('/api/v2/') && new URL(response.url()).pathname.endsWith('/finance/profit-loss'));
  166 |     await gotoDemo(page, '/s/shop-demo/finance/profit-loss');
  167 |     const response = await reportWait;
  168 |     expect(response.status()).toBe(200);
  169 |     const report = (await response.json()).data as {
  170 |         cogs: { amount: string; currency: string };
  171 |         grossProfit: { amount: string; currency: string };
  172 |         shippingExpense: { amount: string; currency: string };
  173 |         platformFees: { amount: string; currency: string };
  174 |         paymentFees: { amount: string; currency: string };
  175 |         aiExpense: { amount: string; currency: string };
  176 |         otherOperatingExpenses: { amount: string; currency: string };
  177 |     };
  178 |     await expect(page.getByRole('heading', { name: 'Lợi nhuận quản trị', exact: true })).toBeVisible();
  179 |     for (const label of ['Giá vốn', 'Lãi gộp', 'Chi phí giao', 'Phí nền tảng', 'Phí thanh toán', 'Chi phí AI', 'Chi phí khác']) {
  180 |         await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  181 |     }
  182 |     for (const amount of [report.cogs, report.grossProfit, report.shippingExpense, report.platformFees, report.paymentFees, report.aiExpense, report.otherOperatingExpenses]) {
  183 |         await expect(page.getByText(formatMoney(amount), { exact: true }).first()).toBeVisible();
  184 |     }
  185 |     expect(writes).toEqual([]);
  186 | });
  187 | 
  188 | test('FE015.AC02 journal rejects unbalanced decimal lines before POST and sends exact money strings', async ({ page }) => {
  189 |     await gotoDemo(page, '/s/shop-demo/finance/journals');
  190 |     await page.getByRole('button', { name: 'Tạo bút toán nháp', exact: true }).click();
  191 |     const dialog = page.getByRole('dialog', { name: 'Bút toán nháp' });
  192 |     await expect(dialog.getByRole('alert').filter({ hasText: 'đang mở' })).toBeVisible();
  193 |     await dialog.getByRole('textbox', { name: 'Loại chứng từ nguồn' }).fill('manual');
  194 |     await dialog.getByRole('textbox', { name: 'Mã chứng từ nguồn' }).fill('FE015-JOURNAL-01');
  195 |     await dialog.getByRole('textbox', { name: 'Ngày hiệu lực' }).fill('2026-09-29');
  196 |     await chooseOption(page, 'Tài khoản dòng 1', 'Tiền mặt · cash (mẫu demo)', dialog);
  197 |     await chooseOption(page, 'Tài khoản dòng 2', 'Doanh thu · sales (mẫu demo)', dialog);
  198 |     await dialog.getByRole('textbox', { name: 'Nợ' }).nth(0).fill('100.25');
  199 |     await dialog.getByRole('textbox', { name: 'Có' }).nth(1).fill('100.24');
  200 |     await dialog.getByRole('textbox', { name: 'Diễn giải dòng' }).nth(0).fill('Thu tiền mẫu');
  201 |     await dialog.getByRole('textbox', { name: 'Diễn giải dòng' }).nth(1).fill('Doanh thu mẫu');
  202 |     await dialog.getByRole('textbox', { name: 'Lý do' }).fill('Ghi nhận bút toán kiểm thử cân bằng.');
  203 |     const save = dialog.getByRole('button', { name: 'Lưu nháp' });
  204 |     await expect(save).toBeDisabled();
  205 |     await expect(dialog.getByRole('alert').filter({ hasText: 'Cần cân bằng' })).toBeVisible();
  206 |     await dialog.getByRole('textbox', { name: 'Có' }).nth(1).fill('100.25');
  207 |     await expect(dialog.getByRole('alert').filter({ hasText: 'Đã cân bằng' })).toBeVisible();
  208 | 
  209 |     const requestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/journals'));
  210 |     const responseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/journals'));
  211 |     await save.click();
  212 |     const request = await requestWait;
  213 |     expect(JSON.parse(request.postData() || 'null')).toEqual({
  214 |         sourceType: 'manual', sourceId: 'FE015-JOURNAL-01', effectiveDate: '2026-09-29',
  215 |         lines: [
  216 |             { accountId: 'cash', debit: { amount: '100.25', currency: 'VND' }, credit: { amount: '0', currency: 'VND' }, description: 'Thu tiền mẫu' },
  217 |             { accountId: 'sales', debit: { amount: '0', currency: 'VND' }, credit: { amount: '100.25', currency: 'VND' }, description: 'Doanh thu mẫu' },
  218 |         ], reason: 'Ghi nhận bút toán kiểm thử cân bằng.',
  219 |     });
  220 |     expect((await responseWait).status()).toBe(201);
  221 | });
  222 | 
  223 | test('FE015.AC02 closed accounting period is visible and disables journal draft creation', async ({ page }) => {
  224 |     await gotoDemo(page, '/s/shop-demo/finance/debts-periods');
  225 |     const period = page.getByRole('row').filter({ hasText: '2026-09-01' });
  226 |     await expect(period).toBeVisible();
  227 |     const closeRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/periods/period-2026-09/close'));
  228 |     const closeResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/periods/period-2026-09/close'));
  229 |     await period.getByRole('button', { name: 'Kiểm & khóa kỳ' }).click();
  230 |     const confirm = page.getByRole('dialog', { name: 'Khóa kỳ kế toán' });
  231 |     await confirm.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  232 |     expect(JSON.parse((await closeRequest).postData() || 'null')).toEqual({ expectedVersion: 1 });
  233 |     expect((await closeResponse).status()).toBe(202);
  234 |     await expect(period.getByText('Đã đóng', { exact: true })).toBeVisible();
  235 | 
  236 |     await page.getByRole('link', { name: 'Chứng từ & sổ kép', exact: true }).click();
  237 |     await page.getByRole('button', { name: 'Tạo bút toán nháp', exact: true }).click();
  238 |     const journal = page.getByRole('dialog', { name: 'Bút toán nháp' });
  239 |     await expect(journal.getByRole('alert').filter({ hasText: 'đã khóa; không thể tạo' })).toBeVisible();
```