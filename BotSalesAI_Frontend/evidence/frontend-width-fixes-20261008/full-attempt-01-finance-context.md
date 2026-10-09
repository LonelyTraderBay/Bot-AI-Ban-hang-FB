# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-finance-layout.spec.ts >> titled Finance Panels keep one 16px header-to-first-content boundary
- Location: tests\ui-finance-layout.spec.ts:62:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Kỳ báo cáo', exact: true }).locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]').locator(':scope > :last-child > .MuiStack-root:first-child')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Kỳ báo cáo', exact: true }).locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]').locator(':scope > :last-child > .MuiStack-root:first-child') with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Kỳ báo cáo', exact: true }).locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]').locator(':scope > :last-child > .MuiStack-root:first-child')

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
- main:
  - heading "Dòng tiền" [level=1]
  - paragraph: Tiền thực thu và thực chi, tách biệt doanh thu và lợi nhuận.
  - link "Sổ thu chi":
    - /url: /s/shop-demo/finance/entries
  - text: Từ ngày
  - textbox "Từ ngày": 2026-09-01
  - text: Đến trước ngày
  - textbox "Đến trước ngày": 2026-10-01
  - alert: Khoảng [Từ, Đến); múi giờ Asia/Vientiane.
  - paragraph: Tiền đã thu
  - text: 249.000 ₫
  - paragraph: Tiền đã chi
  - text: 274.000 ₫
  - paragraph: Biến động tiền thuần
  - text: −25.000 ₫ Không phải số dư tài khoản
  - paragraph: Múi giờ báo cáo
  - text: Asia/Vientiane
  - heading "Kỳ báo cáo" [level=2]
  - paragraph: Từ
  - text: 00:00 1/9/26
  - separator
  - paragraph: Đến (không gồm)
  - text: 00:00 1/10/26
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
  1   | import { expect, test } from '@playwright/test';
  2   | import { startDemoServer } from './session/demo-server.mjs';
  3   | 
  4   | let demoUrl = '';
  5   | let closeDemo: (() => Promise<void>) | undefined;
  6   | 
  7   | test.beforeAll(async () => {
  8   |     const server = await startDemoServer({ cacheIsolationKey: 'ui028-w15-finance-layout' });
  9   |     demoUrl = server.url;
  10  |     closeDemo = server.close;
  11  | });
  12  | 
  13  | test.afterAll(async () => closeDemo?.());
  14  | 
  15  | async function gotoDemo(page: import('@playwright/test').Page, route: string) {
  16  |     await page.goto(new URL(route, demoUrl).toString());
  17  | }
  18  | 
  19  | async function expectDialogWithinViewport(page: import('@playwright/test').Page, dialog: import('@playwright/test').Locator, width: number, height: number) {
  20  |     await expect(dialog).toBeVisible();
  21  |     const bounds = await dialog.boundingBox();
  22  |     expect(bounds).not.toBeNull();
  23  |     expect(bounds!.x).toBeGreaterThanOrEqual(0);
  24  |     expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
  25  |     expect(bounds!.y).toBeGreaterThanOrEqual(0);
  26  |     expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
  27  |     expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  28  | }
  29  | 
  30  | test('Finance R20/R21/R22/R48/R49/R50 route layouts retain shell gutter without horizontal overflow from 320–1440px', async ({ page }) => {
  31  |     const errors: string[] = [];
  32  |     page.on('pageerror', error => errors.push(error.message));
  33  |     const routes = [
  34  |         { id: 'R20', path: '/s/shop-demo/finance', heading: 'Dòng tiền' },
  35  |         { id: 'R21', path: '/s/shop-demo/finance/entries', heading: 'Sổ thu chi' },
  36  |         { id: 'R22', path: '/s/shop-demo/finance/profit-loss', heading: 'Lợi nhuận quản trị' },
  37  |         { id: 'R48', path: '/s/shop-demo/finance/journals', heading: 'Bút toán' },
  38  |         { id: 'R49', path: '/s/shop-demo/finance/reconciliation', heading: 'Đối soát ngân hàng & COD' },
  39  |         { id: 'R50', path: '/s/shop-demo/finance/debts-periods', heading: 'Công nợ & khóa kỳ' },
  40  |     ];
  41  |     const observations: Array<{ route: string; width: number; clientWidth: number; scrollWidth: number }> = [];
  42  | 
  43  |     for (const width of [320, 390, 768, 1280, 1440]) {
  44  |         await page.setViewportSize({ width, height: 900 });
  45  |         for (const route of routes) {
  46  |             await gotoDemo(page, route.path);
  47  |             await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible();
  48  |             await expect(page.locator('main#main-content')).toHaveCSS('padding-left', width >= 768 ? '24px' : '16px');
  49  |             const geometry = await page.evaluate(() => ({
  50  |                 clientWidth: document.documentElement.clientWidth,
  51  |                 scrollWidth: document.documentElement.scrollWidth,
  52  |             }));
  53  |             expect(geometry.scrollWidth, `${route.id} document width at ${width}px`).toBeLessThanOrEqual(geometry.clientWidth);
  54  |             observations.push({ route: route.id, width, ...geometry });
  55  |         }
  56  |     }
  57  | 
  58  |     expect(observations).toHaveLength(30);
  59  |     expect(errors).toEqual([]);
  60  | });
  61  | 
  62  | test('titled Finance Panels keep one 16px header-to-first-content boundary', async ({ page }) => {
  63  |     const pageErrors: string[] = [];
  64  |     page.on('pageerror', error => pageErrors.push(error.message));
  65  |     const cases = [
  66  |         { path: '/s/shop-demo/finance', heading: 'Kỳ báo cáo', hasAction: false, firstContentSelector: '.MuiStack-root', firstContentPaddingTop: 12 },
  67  |         { path: '/s/shop-demo/finance/profit-loss', heading: 'Chi tiết kết quả kinh doanh', hasAction: true, firstContentSelector: '.MuiStack-root', firstContentPaddingTop: 12 },
  68  |         // The mock notice is now first; its MUI inset is separate from the Panel header boundary.
  69  |         { path: '/s/shop-demo/finance/profit-loss', heading: 'Hỏi đáp có nguồn', hasAction: false, firstContentSelector: '.MuiAlert-root[role="alert"]', firstContentPaddingTop: 6 },
  70  |     ];
  71  |     const observations: Array<{ path: string; heading: string; width: number; headerContentBottom: number; firstContentTop: number; gap: number; bodyPaddingTop: number; bodyPaddingInlineStart: number; bodyPaddingBottom: number; firstContentPaddingTop: number; hasAction: boolean }> = [];
  72  | 
  73  |     for (const width of [390, 806, 1440]) {
  74  |         await page.setViewportSize({ width, height: 900 });
  75  |         for (const item of cases) {
  76  |             await gotoDemo(page, item.path);
  77  |             await expect(page).toHaveURL(new RegExp(`${item.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  78  |             const heading = page.getByRole('heading', { name: item.heading, exact: true });
  79  |             await expect(heading).toBeVisible();
  80  |             const panel = heading.locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]');
> 81  |             await expect(panel.locator(`:scope > :last-child > ${item.firstContentSelector}:first-child`)).toBeVisible();
      |                                                                                                            ^ Error: expect(locator).toBeVisible() failed
  82  |             const geometry = await panel.evaluate(element => {
  83  |                 const header = [...element.children].find(child => child.querySelector('h2'));
  84  |                 const body = [...element.children].find(child => child !== header);
  85  |                 const firstContent = body?.firstElementChild;
  86  |                 if (!header || !firstContent) return null;
  87  |                 const headerContentBottom = Math.max(...[...header.children].map(child => child.getBoundingClientRect().bottom));
  88  |                 const firstContentTop = firstContent.getBoundingClientRect().top;
  89  |                 const bodyStyle = getComputedStyle(body!);
  90  |                 const firstContentStyle = getComputedStyle(firstContent);
  91  |                 return {
  92  |                     headerContentBottom,
  93  |                     firstContentTop,
  94  |                     gap: firstContentTop - headerContentBottom,
  95  |                     bodyPaddingTop: Number.parseFloat(bodyStyle.paddingTop),
  96  |                     bodyPaddingInlineStart: Number.parseFloat(bodyStyle.paddingInlineStart),
  97  |                     bodyPaddingBottom: Number.parseFloat(bodyStyle.paddingBottom),
  98  |                     firstContentPaddingTop: Number.parseFloat(firstContentStyle.paddingTop),
  99  |                     hasAction: header!.children.length > 1,
  100 |                 };
  101 |             });
  102 |             expect(geometry, `${item.heading} must expose header and first body content`).not.toBeNull();
  103 |             observations.push({ path: item.path, heading: item.heading, width, ...geometry! });
  104 |         }
  105 |     }
  106 | 
  107 |     await test.info().attach('finance-panel-boundaries.json', {
  108 |         body: JSON.stringify(observations, null, 2),
  109 |         contentType: 'application/json',
  110 |     });
  111 |     expect(observations).toHaveLength(9);
  112 |     expect(pageErrors).toEqual([]);
  113 |     const mismatches = observations.filter(item =>
  114 |         Math.abs(item.gap - 16) > 0.5 ||
  115 |         item.bodyPaddingTop !== 0 ||
  116 |         item.firstContentPaddingTop !== cases.find(testCase => testCase.heading === item.heading)?.firstContentPaddingTop ||
  117 |         item.hasAction !== cases.find(testCase => testCase.heading === item.heading)?.hasAction ||
  118 |         item.bodyPaddingInlineStart !== (item.width < 768 ? 16 : 24) ||
  119 |         item.bodyPaddingBottom !== (item.width < 768 ? 16 : 24),
  120 |     );
  121 |     expect(mismatches, JSON.stringify(observations)).toEqual([]);
  122 | });
  123 | 
  124 | test('Finance report, entry, journal, reconciliation and period dialogs remain in the viewport without submitting', async ({ page }) => {
  125 |     const errors: string[] = [];
  126 |     const writes: string[] = [];
  127 |     page.on('pageerror', error => errors.push(error.message));
  128 |     page.on('request', request => {
  129 |         const url = new URL(request.url());
  130 |         if (url.pathname.startsWith('/api/v2/') && request.method() !== 'GET') writes.push(`${request.method()} ${url.pathname}`);
  131 |     });
  132 | 
  133 |     for (const { width, height } of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  134 |         await page.setViewportSize({ width, height });
  135 | 
  136 |         await gotoDemo(page, '/s/shop-demo/finance/entries');
  137 |         await page.getByRole('button', { name: 'Tạo phiếu', exact: true }).click();
  138 |         let dialog = page.getByRole('dialog', { name: 'Phiếu thu chi mới' });
  139 |         await expect(dialog.getByRole('textbox', { name: /Số tiền/ })).toBeVisible();
  140 |         await expectDialogWithinViewport(page, dialog, width, height);
  141 |         await page.keyboard.press('Escape');
  142 | 
  143 |         await gotoDemo(page, '/s/shop-demo/finance/entries');
  144 |         await page.getByRole('table').getByRole('button', { name: 'Chi tiết', exact: true }).first().click();
  145 |         dialog = page.getByRole('dialog').first();
  146 |         await expect(dialog.getByRole('button', { name: 'Đóng', exact: true }).last()).toBeVisible();
  147 |         await expectDialogWithinViewport(page, dialog, width, height);
  148 | 
  149 |         await gotoDemo(page, '/s/shop-demo/finance/profit-loss');
  150 |         await page.getByRole('button', { name: 'Tạo giải thích mô phỏng', exact: true }).click();
  151 |         await expect(page.getByRole('region', { name: 'Giải thích báo cáo mô phỏng' })).toBeVisible();
  152 | 
  153 |         await gotoDemo(page, '/s/shop-demo/finance/journals');
  154 |         await page.getByRole('button', { name: 'Tạo bút toán nháp', exact: true }).click();
  155 |         dialog = page.getByRole('dialog', { name: 'Bút toán nháp' });
  156 |         await expect(dialog.getByRole('textbox', { name: 'Nợ' }).first()).toBeVisible();
  157 |         await expectDialogWithinViewport(page, dialog, width, height);
  158 |         await page.keyboard.press('Escape');
  159 | 
  160 |         await gotoDemo(page, '/s/shop-demo/finance/reconciliation');
  161 |         await page.getByRole('button', { name: 'Nhập bảng đối soát', exact: true }).click();
  162 |         dialog = page.getByRole('dialog', { name: 'Nhập bảng đối soát' });
  163 |         await expect(dialog.getByRole('textbox', { name: 'Mã đợt nhập duy nhất' })).toBeVisible();
  164 |         await expectDialogWithinViewport(page, dialog, width, height);
  165 |         await page.keyboard.press('Escape');
  166 | 
  167 |         await gotoDemo(page, '/s/shop-demo/finance/reconciliation?tab=cases');
  168 |         const match = page.getByRole('button', { name: 'Ghép giao dịch', exact: true }).first();
  169 |         if (await match.isVisible().catch(() => false)) {
  170 |             await match.click();
  171 |             dialog = page.getByRole('dialog', { name: 'Ghép giao dịch với công nợ' });
  172 |             await expect(dialog.getByRole('textbox', { name: 'Giao dịch ngoài hệ thống' })).toBeVisible();
  173 |             await expectDialogWithinViewport(page, dialog, width, height);
  174 |         }
  175 | 
  176 |         await gotoDemo(page, '/s/shop-demo/finance/debts-periods');
  177 |         const closePeriod = page.getByRole('button', { name: 'Kiểm & khóa kỳ', exact: true }).first();
  178 |         if (await closePeriod.isVisible().catch(() => false)) {
  179 |             await closePeriod.click();
  180 |             dialog = page.getByRole('dialog', { name: 'Khóa kỳ kế toán' });
  181 |             await expect(dialog.getByRole('button', { name: 'Xác nhận', exact: true })).toBeVisible();
```