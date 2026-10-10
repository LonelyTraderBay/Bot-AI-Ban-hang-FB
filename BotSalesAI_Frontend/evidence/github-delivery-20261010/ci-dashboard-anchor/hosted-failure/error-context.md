# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-dashboard-layout.spec.ts >> Shared consolidation Dashboard primary link respects all eight permission tuples and native anchor interactions
- Location: tests/ui-dashboard-layout.spec.ts:17:1

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: browserContext.waitForEvent: Test timeout of 180000ms exceeded.
```

# Test source

```ts
  1   | import path from 'node:path';
  2   | import { expect, test } from '@playwright/test';
  3   | import AxeBuilder from '@axe-core/playwright';
  4   | import { startDemoServer } from './session/demo-server.mjs';
  5   | 
  6   | let demoUrl = '';
  7   | let closeDemo: (() => Promise<void>) | undefined;
  8   | 
  9   | test.beforeAll(async () => {
  10  |     const server = await startDemoServer();
  11  |     demoUrl = server.url;
  12  |     closeDemo = server.close;
  13  | });
  14  | 
  15  | test.afterAll(async () => closeDemo?.());
  16  | 
  17  | test('Shared consolidation Dashboard primary link respects all eight permission tuples and native anchor interactions', async ({ page, context }, info) => {
  18  |     await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
  19  |     await expect(page.locator('main h1')).toBeVisible();
  20  |     const fixtureUrl = '/@fs/' + path.resolve('tests/design/shared-consolidation-fixture.ts').replaceAll('\\', '/');
  21  |     const observations = [];
  22  |     for (const ops of [false, true]) for (const orders of [false, true]) for (const create of [false, true]) {
  23  |         const tuple = { ops, orders, create };
  24  |         await page.evaluate(async ({ url, tuple }) => (await import(/* @vite-ignore */ url)).installDashboardPermissions(tuple), { url: fixtureUrl, tuple });
  25  |         const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v2/session');
  26  |         await page.evaluate(() => window.dispatchEvent(new Event('online')));
  27  |         const response = await refreshed;
  28  |         expect(response.status()).toBe(200);
  29  |         const membership = (await response.json()).data.memberships.find((row: { shopId: string }) => row.shopId === 'shop-demo');
  30  |         expect(membership.permissions.includes('operations.read')).toBe(ops);
  31  |         expect(membership.permissions.includes('orders.read')).toBe(orders);
  32  |         expect(membership.permissions.includes('orders.write')).toBe(create);
  33  |         const primary = page.getByRole('link', { name: /^Xem (việc cần làm|đơn hàng)$/ });
  34  |         const createLink = page.getByRole('link', { name: 'Tạo đơn hàng', exact: true });
  35  |         await expect(primary).toHaveCount(Number(ops || orders));
  36  |         await expect(createLink).toHaveCount(Number(create));
  37  |         await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
  38  |         if (ops || orders) {
  39  |             const label = ops ? 'Xem việc cần làm' : 'Xem đơn hàng';
  40  |             const href = `/s/shop-demo/${ops ? 'operations' : 'orders'}`;
  41  |             await expect(primary).toHaveText(label);
  42  |             await expect(primary).toHaveAttribute('href', href);
  43  |             await primary.focus(); await expect(primary).toBeFocused();
  44  |             const style = await primary.evaluate(element => {
  45  |                 const s = getComputedStyle(element), r = element.getBoundingClientRect();
  46  |                 return { tag: element.tagName, height: r.height, outline: s.outlineStyle, outlineWidth: parseFloat(s.outlineWidth), background: s.backgroundColor };
  47  |             });
  48  |             expect(style.tag).toBe('A'); expect(style.height).toBeGreaterThanOrEqual(44);
  49  |             expect(style.outline).not.toBe('none'); expect(style.outlineWidth).toBeGreaterThanOrEqual(2);
  50  |             await primary.hover();
  51  |             await expect.poll(() => primary.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(style.background);
  52  |             if (create) { await primary.press('Tab'); await expect(createLink).toBeFocused(); }
  53  |             if (ops && orders && create) {
> 54  |                 const opened = context.waitForEvent('page');
      |                                        ^ Error: browserContext.waitForEvent: Test timeout of 180000ms exceeded.
  55  |                 await primary.click({ modifiers: ['Control'] });
  56  |                 const popup = await opened;
  57  |                 await popup.waitForURL(new URL(href, demoUrl).toString()); await popup.close();
  58  |                 expect(new URL(page.url()).pathname).toBe('/s/shop-demo/overview');
  59  |             }
  60  |         }
  61  |         if (create) { await expect(createLink).toHaveAttribute('href', '/s/shop-demo/orders/new'); expect((await createLink.boundingBox())!.height).toBeGreaterThanOrEqual(44); }
  62  |         observations.push({ ...tuple, primary: ops ? 'operations' : orders ? 'orders' : null, createVisible: create });
  63  |     }
  64  |     expect(observations).toHaveLength(8);
  65  |     expect((await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  66  |     await info.attach('dashboard-permission-tuples', { body: JSON.stringify(observations), contentType: 'application/json' });
  67  | });
  68  | 
  69  | test('dashboard hierarchy, CTA targets, and page width hold across supported breakpoints', async ({ page }) => {
  70  |     await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
  71  |     await expect(page.getByRole('heading', { name: 'Tình hình hiện tại', exact: true })).toBeVisible();
  72  |     await expect(page.getByText('Dữ liệu cập nhật', { exact: false })).toBeVisible();
  73  | 
  74  |     for (const width of [320, 390, 768, 1280, 1440]) {
  75  |         await page.setViewportSize({ width, height: 900 });
  76  |         await expect(page.getByRole('heading', { name: 'Tình hình hiện tại', exact: true })).toBeVisible();
  77  |         await expect(page.getByText('Hội thoại đang mở', { exact: true })).toBeVisible();
  78  |         await expect(page.getByText('Đơn chờ xử lý', { exact: true })).toBeVisible();
  79  |         await expect(page.getByText('Sản phẩm gần hết', { exact: true })).toBeVisible();
  80  |         await expect(page.getByText('Trợ lý bán hàng', { exact: true })).toBeVisible();
  81  | 
  82  |         for (const action of [
  83  |             page.getByRole('link', { name: 'Xem việc cần làm', exact: true }),
  84  |             page.getByRole('link', { name: 'Tạo đơn hàng', exact: true }),
  85  |         ]) {
  86  |             await expect(action).toBeVisible();
  87  |             const target = await action.boundingBox();
  88  |             expect(target).not.toBeNull();
  89  |             expect(target!.height).toBeGreaterThanOrEqual(44);
  90  |         }
  91  | 
  92  |         const teamPanel = page.locator('.MuiPaper-outlined').filter({ has: page.getByRole('heading', { name: 'Đội ngũ AI của cửa hàng', exact: true }) }).first();
  93  |         const teamStatus = teamPanel.locator('.MuiChip-root').first();
  94  |         const statusBounds = await teamStatus.boundingBox();
  95  |         const roleCardBounds = await teamStatus.locator('xpath=..').boundingBox();
  96  |         expect(statusBounds).not.toBeNull();
  97  |         expect(roleCardBounds).not.toBeNull();
  98  |         expect(statusBounds!.width).toBeLessThan(roleCardBounds!.width / 2);
  99  | 
  100 |         const dimensions = await page.evaluate(() => ({
  101 |             clientWidth: document.documentElement.clientWidth,
  102 |             scrollWidth: document.documentElement.scrollWidth,
  103 |         }));
  104 |         expect(dimensions.clientWidth).toBe(width);
  105 |         expect(dimensions.scrollWidth).toBeLessThanOrEqual(width + 1);
  106 |     }
  107 | });
  108 | 
```