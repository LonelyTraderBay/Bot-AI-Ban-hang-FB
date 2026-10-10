# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-toolbar-layout.spec.ts >> Shared Toolbar and demo tools keep labels clear when text doubles
- Location: tests/ui-toolbar-layout.spec.ts:33:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('main h1')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('main h1') with timeout 5000ms
  - waiting for locator('main h1')

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
  - navigation "Đường dẫn hiện tại": Không gian làm việc / Hộp thư
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
  1   | import path from 'node:path';
  2   | import { expect, test } from '@playwright/test';
  3   | import type { Page } from '@playwright/test';
  4   | import AxeBuilder from '@axe-core/playwright';
  5   | import { toolbarImpact } from './design/toolbar-impact.mjs';
  6   | import { startDemoServer } from './session/demo-server.mjs';
  7   | import { ownedLabelGeometry } from './design/owned-label-geometry.mjs';
  8   | 
  9   | const impact = toolbarImpact(path.resolve('.'));
  10  | let demoUrl = '';
  11  | let closeDemo: (() => Promise<void>) | undefined;
  12  | test.beforeAll(async () => { const server = await startDemoServer({ cacheIsolationKey: 'toolbar-regression' }); demoUrl = server.url; closeDemo = server.close; });
  13  | test.afterAll(async () => closeDemo?.());
  14  | 
  15  | async function ready(page: Page, route: string) {
  16  |     await page.goto(demoUrl + route);
  17  |     await expect(page).toHaveURL(demoUrl + route);
> 18  |     await expect(page.locator('main h1')).toBeVisible();
      |                                           ^ Error: expect(locator).toBeVisible() failed
  19  |     await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
  20  | }
  21  | async function searchGeometry(page: Page) {
  22  |     return page.getByRole('textbox', { name: 'Tìm kiếm', exact: true }).evaluate(input => {
  23  |         const form = input.closest('form')!;
  24  |         const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  25  |         const style = getComputedStyle(button), range = document.createRange();
  26  |         range.selectNodeContents(button);
  27  |         const naturalHeight = Math.max(parseFloat(style.minHeight), range.getBoundingClientRect().height +
  28  |             parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth));
  29  |         return { buttonHeight: button.getBoundingClientRect().height, naturalHeight, formHeight: form.getBoundingClientRect().height };
  30  |     });
  31  | }
  32  | 
  33  | test('Shared Toolbar and demo tools keep labels clear when text doubles', async ({ page }, info) => {
  34  |     const observations = [];
  35  |     for (const width of [320, 390, 1280, 1440]) {
  36  |         await page.setViewportSize({ width, height: 1000 });
  37  |         await ready(page, '/s/shop-demo/inbox');
  38  |         await page.locator('button[aria-controls="mock-tools-controls"]').click();
  39  |         // Deterministic layout stress; native Firefox text zoom is verified separately.
  40  |         await page.evaluate(() => {
  41  |             const sizes = [...document.querySelectorAll<HTMLElement>('*')].map(element => [element, parseFloat(getComputedStyle(element).fontSize)] as const);
  42  |             for (const [element, size] of sizes) if (Number.isFinite(size)) element.style.fontSize = `${size * 2}px`;
  43  |         });
  44  |         const labels = await page.evaluate(ownedLabelGeometry);
  45  |         observations.push({ width, labels });
  46  |         await info.attach(`doubled-labels-${width}`, { body: JSON.stringify(labels), contentType: 'application/json' });
  47  |         expect(labels.filter(label => label.owner === 'demo-tools')).toHaveLength(3);
  48  |         expect(labels.filter(label => label.owner === 'toolbar')).toHaveLength(1);
  49  |         expect(labels.filter(label => label.overlaps || label.outsideField)).toEqual([]);
  50  |         for (const label of labels) {
  51  |             expect(label.labelPosition).toBe('static');
  52  |             expect(label.labelTransform).toBe('none');
  53  |             expect(label.fieldBounds.height).toBeLessThanOrEqual(label.naturalHeight + 1);
  54  |             expect(label.legends.every(width => width <= 1)).toBe(true);
  55  |         }
  56  |         expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  57  |     }
  58  |     await info.attach('doubled-text-label-layout', { body: JSON.stringify(observations), contentType: 'application/json' });
  59  | });
  60  | 
  61  | test('Toolbar geometry: multiline category lookup cannot stretch the search button', async ({ page }, info) => {
  62  |     await page.setViewportSize({ width: 1440, height: 900 });
  63  |     await ready(page, '/s/shop-demo/products');
  64  |     await expect(page.getByText('Đã tải 3 lựa chọn', { exact: true })).toBeVisible();
  65  |     const geometry = await searchGeometry(page);
  66  |     await info.attach('toolbar-geometry', { body: JSON.stringify(geometry), contentType: 'application/json' });
  67  |     expect(geometry.buttonHeight).toBeLessThanOrEqual(geometry.naturalHeight + 1);
  68  |     const primary = page.getByRole('textbox', { name: 'Tìm kiếm', exact: true }).locator('xpath=ancestor::form');
  69  |     await expect(primary.getByRole('combobox', { name: 'Trạng thái', exact: true })).toBeVisible();
  70  |     await expect(primary.getByRole('textbox', { name: 'Tìm danh mục', exact: true })).toHaveCount(0);
  71  |     const filters = page.getByRole('group', { name: 'Bộ lọc danh mục', exact: true });
  72  |     await expect(filters).toBeVisible();
  73  |     const search = await primary.boundingBox(), secondary = await filters.boundingBox();
  74  |     expect(secondary!.y).toBeGreaterThanOrEqual(search!.y + search!.height);
  75  |     expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
  76  | });
  77  | 
  78  | test('Shared consolidation Inbox filters share Toolbar ownership and stay outside search across pane widths', async ({ page }, info) => {
  79  |     test.setTimeout(180_000);
  80  |     const observations = [];
  81  |     for (const width of [320, 390, 768, 1280, 1440]) for (const route of ['inbox', 'inbox/cv1']) {
  82  |         await page.setViewportSize({ width, height: 1000 });
  83  |         await ready(page, `/s/shop-demo/${route}`);
  84  |         const filters = page.locator('[aria-label="Bộ lọc hội thoại"]');
  85  |         await expect(filters).toHaveAttribute('data-ui-composition', 'field-group');
  86  |         await expect(filters).toHaveAttribute('role', 'group');
  87  |         await expect(filters.getByRole('combobox', { includeHidden: true })).toHaveCount(4);
  88  |         const hiddenList = route.includes('/') && width < 1280;
  89  |         if (hiddenList) {
  90  |             await expect(filters).toBeHidden();
  91  |         } else {
  92  |             await expect(filters).toBeVisible();
  93  |             const geometry = await filters.evaluate(element => {
  94  |                 const toolbar = element.parentElement!;
  95  |                 const form = toolbar.querySelector('form')!;
  96  |                 const box = (node: Element) => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
  97  |                 const controls = [...element.querySelectorAll('.MuiTextField-root')].map(box);
  98  |                 return { outsideForm: !element.closest('form'), sharedParent: form.parentElement === toolbar,
  99  |                     filter: box(element), form: box(form), controls, gap: parseFloat(getComputedStyle(toolbar).rowGap),
  100 |                     inset: { left: parseFloat(getComputedStyle(element).paddingLeft), top: parseFloat(getComputedStyle(element).paddingTop) },
  101 |                     scrollWidth: document.documentElement.scrollWidth };
  102 |             });
  103 |             expect(geometry.outsideForm).toBe(true);
  104 |             expect(geometry.sharedParent).toBe(true);
  105 |             expect(geometry.inset).toEqual({ left: 0, top: 0 });
  106 |             expect(Math.abs(geometry.filter.left - geometry.form.left)).toBeLessThanOrEqual(0.5);
  107 |             expect(Math.abs(geometry.filter.right - geometry.form.right)).toBeLessThanOrEqual(0.5);
  108 |             expect(Math.abs(geometry.filter.top - geometry.form.bottom - geometry.gap)).toBeLessThanOrEqual(0.5);
  109 |             for (const control of geometry.controls) {
  110 |                 expect(control.left).toBeGreaterThanOrEqual(geometry.filter.left - 0.5);
  111 |                 expect(control.right).toBeLessThanOrEqual(geometry.filter.right + 0.5);
  112 |             }
  113 |             expect(geometry.scrollWidth).toBeLessThanOrEqual(width);
  114 |             observations.push({ route, width, hiddenList, geometry });
  115 |         }
  116 |         if (width === 320 || width === 1440) expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
  117 |     }
  118 |     await info.attach('inbox-filter-ownership', { body: JSON.stringify(observations), contentType: 'application/json' });
```