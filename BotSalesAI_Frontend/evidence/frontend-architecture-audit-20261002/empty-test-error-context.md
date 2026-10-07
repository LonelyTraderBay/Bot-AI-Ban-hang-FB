# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: states\route-empty-composition.spec.ts >> empty collection responses render accessible empty states on canonical list routes
- Location: tests\states\route-empty-composition.spec.ts:27:1

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
```

# Test source

```ts
  1  | import { readFileSync } from 'node:fs';
  2  | import { test, expect } from '@playwright/test';
  3  | import { startDemoServer } from '../session/demo-server.mjs';
  4  | 
  5  | type Route = { id: string; path: string };
  6  | type RouteManifest = { routes: Route[] };
  7  | const routeManifest = JSON.parse(
  8  |     readFileSync(new URL('../../botsales-kit/contracts/route-manifest.json', import.meta.url), 'utf8'),
  9  | ) as RouteManifest;
  10 | const detailIds: Record<string, string> = {
  11 |     conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001',
  12 |     knowledgeId: 'k1', jobId: 'missing-job',
  13 | };
  14 | const emptyStateRoutes = new Set(['R07', 'R09', 'R12', 'R17', 'R21', 'R39', 'R44', 'R48', 'R50']);
  15 | 
  16 | function routePath(path: string) {
  17 |     return path
  18 |         .replace(':shopId', 'shop-demo')
  19 |         .replace(/:([A-Za-z]+)/g, (_, key: string) => detailIds[key] || 'missing');
  20 | }
  21 | 
  22 | async function chooseMockOption(page: import('@playwright/test').Page, label: string, value: string) {
  23 |     await page.getByRole('combobox', { name: label }).click();
  24 |     await page.getByRole('option', { name: value, exact: true }).click();
  25 | }
  26 | 
  27 | test('empty collection responses render accessible empty states on canonical list routes', async ({ page }) => {
  28 |     const server = await startDemoServer();
  29 |     const checkedRouteIds: string[] = [];
  30 | 
  31 |     try {
  32 |         await page.goto(new URL('/s/shop-demo/overview', server.url).toString());
> 33 |         await expect(page.getByRole('combobox', { name: 'Trạng thái thử' })).toBeVisible();
     |                                                                              ^ Error: expect(locator).toBeVisible() failed
  34 |         await chooseMockOption(page, 'Trạng thái thử', 'Danh sách rỗng (demo)');
  35 | 
  36 |         for (const route of routeManifest.routes.filter(route => emptyStateRoutes.has(route.id))) {
  37 |             await page.evaluate(nextPath => {
  38 |                 window.history.pushState({}, '', nextPath);
  39 |                 window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  40 |             }, routePath(route.path));
  41 | 
  42 |             const main = page.locator('main#main-content');
  43 |             await expect(main, `${route.id} should keep its page visible with empty API results`).toBeVisible();
  44 |             if (route.id === 'R39') {
  45 |                 await expect(main.getByRole('status').filter({ hasText: 'Chưa có thông báo.' }), `${route.id} should expose a polite empty-state announcement for the card list`).toBeVisible();
  46 |             } else {
  47 |                 const emptyCell = main.locator('tbody td[colspan]').first();
  48 |                 await expect(emptyCell, `${route.id} should announce an empty table rather than render a blank success`).toBeVisible({ timeout: 10_000 });
  49 |                 await expect(emptyCell.getByRole('status')).toBeVisible();
  50 |             }
  51 |             checkedRouteIds.push(route.id);
  52 |             if (checkedRouteIds.length % 3 === 0)
  53 |                 console.log(`ROUTE_EMPTY_COMPOSITION_PROGRESS=${checkedRouteIds.length}/${emptyStateRoutes.size}`);
  54 |         }
  55 | 
  56 |         expect(new Set(checkedRouteIds).size).toBe(emptyStateRoutes.size);
  57 |         console.log(`ROUTE_EMPTY_COMPOSITION=${checkedRouteIds.length}/${emptyStateRoutes.size} RESULT=PASS`);
  58 |     } finally {
  59 |         await server.close();
  60 |     }
  61 | });
  62 | 
```