# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-finance-layout.spec.ts >> Finance report, entry, journal, reconciliation and period dialogs remain in the viewport without submitting
- Location: tests/ui-finance-layout.spec.ts:129:1

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: page.goto: Test timeout of 180000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:42605/s/shop-demo/finance/debts-periods", waiting until "load"

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
> 16  |     await page.goto(new URL(route, demoUrl).toString());
      |                ^ Error: page.goto: Test timeout of 180000ms exceeded.
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
  62  | test('titled Finance Panels keep one 12px header-to-first-content boundary', async ({ page }) => {
  63  |     const pageErrors: string[] = [];
  64  |     page.on('pageerror', error => pageErrors.push(error.message));
  65  |     const cases = [
  66  |         { path: '/s/shop-demo/finance', heading: 'Kỳ báo cáo', hasAction: false, firstContentSelector: '[data-ui-detail-line]', firstContentPaddingTop: 0, detailRowPaddingTop: 8 },
  67  |         { path: '/s/shop-demo/finance/profit-loss', heading: 'Chi tiết kết quả kinh doanh', hasAction: true, firstContentSelector: '[data-ui-detail-line]', firstContentPaddingTop: 0, detailRowPaddingTop: 8 },
  68  |         // The mock notice is now first; its MUI inset is separate from the Panel header boundary.
  69  |         { path: '/s/shop-demo/finance/profit-loss', heading: 'Hỏi đáp có nguồn', hasAction: false, firstContentSelector: '.MuiAlert-root[role="alert"]', firstContentPaddingTop: 6 },
  70  |     ];
  71  |     const observations: Array<{ path: string; heading: string; width: number; headerContentBottom: number; firstContentTop: number; gap: number; bodyPaddingTop: number; bodyPaddingInlineStart: number; bodyPaddingBottom: number; firstContentPaddingTop: number; detailRowPaddingTop: number | null; detailDividers: number | null; hasAction: boolean }> = [];
  72  | 
  73  |     for (const width of [390, 806, 1440]) {
  74  |         await page.setViewportSize({ width, height: 900 });
  75  |         for (const item of cases) {
  76  |             await gotoDemo(page, item.path);
  77  |             await expect(page).toHaveURL(new RegExp(`${item.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  78  |             const heading = page.getByRole('heading', { name: item.heading, exact: true });
  79  |             await expect(heading).toBeVisible();
  80  |             const panel = heading.locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]');
  81  |             await expect(panel.locator(`:scope > :last-child > ${item.firstContentSelector}:first-child`)).toBeVisible();
  82  |             const geometry = await panel.evaluate(element => {
  83  |                 const header = [...element.children].find(child => child.querySelector('h2'));
  84  |                 const body = [...element.children].find(child => child !== header);
  85  |                 const firstContent = body?.firstElementChild;
  86  |                 if (!header || !firstContent) return null;
  87  |                 const headerContentBottom = Math.max(...[...header.children].map(child => child.getBoundingClientRect().bottom));
  88  |                 const firstContentTop = firstContent.getBoundingClientRect().top;
  89  |                 const bodyStyle = getComputedStyle(body!);
  90  |                 const firstContentStyle = getComputedStyle(firstContent);
  91  |                 const detailRow = firstContent.matches('[data-ui-detail-line]') ? firstContent.firstElementChild : null;
  92  |                 return {
  93  |                     headerContentBottom,
  94  |                     firstContentTop,
  95  |                     gap: firstContentTop - headerContentBottom,
  96  |                     bodyPaddingTop: Number.parseFloat(bodyStyle.paddingTop),
  97  |                     bodyPaddingInlineStart: Number.parseFloat(bodyStyle.paddingInlineStart),
  98  |                     bodyPaddingBottom: Number.parseFloat(bodyStyle.paddingBottom),
  99  |                     firstContentPaddingTop: Number.parseFloat(firstContentStyle.paddingTop),
  100 |                     detailRowPaddingTop: detailRow ? Number.parseFloat(getComputedStyle(detailRow).paddingTop) : null,
  101 |                     detailDividers: detailRow ? firstContent.querySelectorAll('.MuiDivider-root').length : null,
  102 |                     hasAction: header!.children.length > 1,
  103 |                 };
  104 |             });
  105 |             expect(geometry, `${item.heading} must expose header and first body content`).not.toBeNull();
  106 |             observations.push({ path: item.path, heading: item.heading, width, ...geometry! });
  107 |         }
  108 |     }
  109 | 
  110 |     await test.info().attach('finance-panel-boundaries.json', {
  111 |         body: JSON.stringify(observations, null, 2),
  112 |         contentType: 'application/json',
  113 |     });
  114 |     expect(observations).toHaveLength(9);
  115 |     expect(pageErrors).toEqual([]);
  116 |     const mismatches = observations.filter(item =>
```