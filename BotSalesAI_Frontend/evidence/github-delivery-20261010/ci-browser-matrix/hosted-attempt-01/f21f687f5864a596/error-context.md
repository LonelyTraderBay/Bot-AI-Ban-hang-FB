# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-panel-layout.spec.ts >> the titled Fulfillment Panel owns its body inset and keeps one 12px header boundary
- Location: tests/ui-panel-layout.spec.ts:15:1

# Error details

```
Error: [{"width":390,"headerContentBottom":744.890625,"firstContentTop":756.890625,"gap":12,"bodyPaddingTop":0,"bodyPaddingInlineStart":12,"bodyPaddingBottom":12,"firstContentPaddingTop":6},{"width":806,"headerContentBottom":727.890625,"firstContentTop":739.890625,"gap":12,"bodyPaddingTop":0,"bodyPaddingInlineStart":16,"bodyPaddingBottom":16,"firstContentPaddingTop":6},{"width":1440,"headerContentBottom":638.890625,"firstContentTop":650.890625,"gap":12,"bodyPaddingTop":0,"bodyPaddingInlineStart":16,"bodyPaddingBottom":16,"firstContentPaddingTop":6}]

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 32

- Array []
+ Array [
+   Object {
+     "bodyPaddingBottom": 12,
+     "bodyPaddingInlineStart": 12,
+     "bodyPaddingTop": 0,
+     "firstContentPaddingTop": 6,
+     "firstContentTop": 756.890625,
+     "gap": 12,
+     "headerContentBottom": 744.890625,
+     "width": 390,
+   },
+   Object {
+     "bodyPaddingBottom": 16,
+     "bodyPaddingInlineStart": 16,
+     "bodyPaddingTop": 0,
+     "firstContentPaddingTop": 6,
+     "firstContentTop": 739.890625,
+     "gap": 12,
+     "headerContentBottom": 727.890625,
+     "width": 806,
+   },
+   Object {
+     "bodyPaddingBottom": 16,
+     "bodyPaddingInlineStart": 16,
+     "bodyPaddingTop": 0,
+     "firstContentPaddingTop": 6,
+     "firstContentTop": 650.890625,
+     "gap": 12,
+     "headerContentBottom": 638.890625,
+     "width": 1440,
+   },
+ ]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { startDemoServer } from './session/demo-server.mjs';
  3  | 
  4  | let demoUrl = '';
  5  | let closeDemo: (() => Promise<void>) | undefined;
  6  | 
  7  | test.beforeAll(async () => {
  8  |     const server = await startDemoServer({ cacheIsolationKey: 'ui028-s11-panel-layout' });
  9  |     demoUrl = server.url;
  10 |     closeDemo = server.close;
  11 | });
  12 | 
  13 | test.afterAll(async () => closeDemo?.());
  14 | 
  15 | test('the titled Fulfillment Panel owns its body inset and keeps one 12px header boundary', async ({ page }) => {
  16 |     const pageErrors: string[] = [];
  17 |     page.on('pageerror', error => pageErrors.push(error.message));
  18 |     const route = new URL('/s/shop-demo/shipments', demoUrl);
  19 |     const observations: Array<{ width: number; headerContentBottom: number; firstContentTop: number; gap: number; bodyPaddingTop: number; bodyPaddingInlineStart: number; bodyPaddingBottom: number; firstContentPaddingTop: number }> = [];
  20 | 
  21 |     for (const width of [390, 806, 1440]) {
  22 |         await page.setViewportSize({ width, height: 900 });
  23 |         await page.goto(route.toString());
  24 |         await expect(page).toHaveURL(route.toString());
  25 |         await expect(page.getByRole('heading', { name: 'Vận đơn & giao hàng', exact: true })).toBeVisible();
  26 |         await page.getByRole('button', { name: 'Mở bản xem thử phí giao hàng', exact: true }).click();
  27 |         const heading = page.getByRole('heading', { name: 'Xem thử phí và vùng giao hàng', exact: true });
  28 |         await expect(heading).toBeVisible();
  29 |         await expect(page.getByRole('combobox', { name: 'Vùng giao thử' })).toBeVisible();
  30 |         await expect(page.getByRole('combobox', { name: 'Kích cỡ kiện thử' })).toBeVisible();
  31 | 
  32 |         const geometry = await heading.locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]').evaluate(panel => {
  33 |             const header = [...panel.children].find(child => child.querySelector('h2'));
  34 |             const body = [...panel.children].find(child => child !== header);
  35 |             const firstContent = body?.firstElementChild;
  36 |             if (!header || !body || !firstContent) return null;
  37 |             const headerContentBottom = Math.max(...[...header.children].map(child => child.getBoundingClientRect().bottom));
  38 |             const firstContentTop = firstContent.getBoundingClientRect().top;
  39 |             const bodyStyle = getComputedStyle(body);
  40 |             const contentStyle = getComputedStyle(firstContent);
  41 |             return {
  42 |                 headerContentBottom,
  43 |                 firstContentTop,
  44 |                 gap: firstContentTop - headerContentBottom,
  45 |                 bodyPaddingTop: Number.parseFloat(bodyStyle.paddingTop),
  46 |                 bodyPaddingInlineStart: Number.parseFloat(bodyStyle.paddingInlineStart),
  47 |                 bodyPaddingBottom: Number.parseFloat(bodyStyle.paddingBottom),
  48 |                 firstContentPaddingTop: Number.parseFloat(contentStyle.paddingTop),
  49 |             };
  50 |         });
  51 |         expect(geometry, 'Panel body and its first content must be rendered').not.toBeNull();
  52 |         observations.push({ width, ...geometry! });
  53 |     }
  54 | 
  55 |     await test.info().attach('fulfillment-panel-boundary.json', {
  56 |         body: JSON.stringify(observations, null, 2),
  57 |         contentType: 'application/json',
  58 |     });
  59 |     expect(observations).toHaveLength(3);
  60 |     expect(pageErrors).toEqual([]);
  61 |     const mismatches = observations.filter(item =>
  62 |         Math.abs(item.gap - 12) > 0.5 ||
  63 |         item.bodyPaddingTop !== 0 ||
  64 |         item.bodyPaddingInlineStart !== (item.width < 768 ? 12 : 16) ||
  65 |         item.bodyPaddingBottom !== (item.width < 768 ? 12 : 16) ||
  66 |         item.firstContentPaddingTop !== 0,
  67 |     );
> 68 |     expect(mismatches, JSON.stringify(observations)).toEqual([]);
     |                                                      ^ Error: [{"width":390,"headerContentBottom":744.890625,"firstContentTop":756.890625,"gap":12,"bodyPaddingTop":0,"bodyPaddingInlineStart":12,"bodyPaddingBottom":12,"firstContentPaddingTop":6},{"width":806,"headerContentBottom":727.890625,"firstContentTop":739.890625,"gap":12,"bodyPaddingTop":0,"bodyPaddingInlineStart":16,"bodyPaddingBottom":16,"firstContentPaddingTop":6},{"width":1440,"headerContentBottom":638.890625,"firstContentTop":650.890625,"gap":12,"bodyPaddingTop":0,"bodyPaddingInlineStart":16,"bodyPaddingBottom":16,"firstContentPaddingTop":6}]
  69 | });
  70 | 
```