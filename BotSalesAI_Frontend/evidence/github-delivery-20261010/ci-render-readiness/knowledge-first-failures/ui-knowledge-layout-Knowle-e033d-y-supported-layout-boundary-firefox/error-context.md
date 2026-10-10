# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-knowledge-layout.spec.ts >> Knowledge routes R23/R24/R25 fit every supported layout boundary
- Location: tests\ui-knowledge-layout.spec.ts:67:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 304
```

```
Error: page.waitForResponse: Test ended.
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { startDemoServer } from './session/demo-server.mjs';
  3   | 
  4   | let demoUrl = '';
  5   | let closeDemo: (() => Promise<void>) | undefined;
  6   | 
  7   | test.beforeAll(async () => {
  8   |     const server = await startDemoServer({ cacheIsolationKey: 'ui028-w17-knowledge-layout' });
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
  19  | async function gotoKnowledgeDetail(page: import('@playwright/test').Page) {
  20  |     const detailResponse = page.waitForResponse(response => response.request().method() === 'GET'
  21  |         && new URL(response.url()).pathname.endsWith('/knowledge/k3'));
> 22  |     const revisionsResponse = page.waitForResponse(response => response.request().method() === 'GET'
      |                                    ^ Error: page.waitForResponse: Test ended.
  23  |         && new URL(response.url()).pathname.endsWith('/knowledge/k3/revisions'));
  24  |     await gotoDemo(page, '/s/shop-demo/knowledge/k3');
  25  |     expect((await detailResponse).status()).toBe(200);
  26  |     expect((await revisionsResponse).status()).toBe(200);
  27  |     await page.getByRole('progressbar', { name: 'Đang tải màn hình', exact: true }).waitFor({ state: 'hidden' });
  28  | }
  29  | 
  30  | async function seedPendingFeedbackAndOpenReview(page: import('@playwright/test').Page) {
  31  |     await gotoDemo(page, '/s/shop-demo/inbox/cv1');
  32  |     await page.getByRole('button', { name: /^Đánh giá tin nhắn/ }).first().click();
  33  |     const dialog = page.getByRole('dialog', { name: 'Đánh giá câu trả lời' });
  34  |     await dialog.getByRole('textbox', { name: 'Nội dung đề xuất sửa' }).fill('Kiểm tra điều kiện theo chính sách đã duyệt.');
  35  |     const responseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/feedback'));
  36  |     await dialog.getByRole('button', { name: 'Lưu phản hồi', exact: true }).click();
  37  |     expect((await responseWait).status()).toBe(201);
  38  |     await page.evaluate(() => {
  39  |         window.history.pushState({}, '', '/s/shop-demo/knowledge/review');
  40  |         window.dispatchEvent(new PopStateEvent('popstate'));
  41  |     });
  42  |     await expect(page.getByRole('heading', { name: 'Duyệt phản hồi AI', exact: true })).toBeVisible();
  43  |     await expect(page.getByRole('button', { name: 'Duyệt nội dung', exact: true }).first()).toBeVisible();
  44  | }
  45  | 
  46  | async function expectNoHorizontalOverflow(page: import('@playwright/test').Page, width: number) {
  47  |     const metrics = await page.evaluate(() => ({
  48  |         viewport: document.documentElement.clientWidth,
  49  |         content: document.documentElement.scrollWidth,
  50  |     }));
  51  |     expect(metrics.viewport).toBe(width);
  52  |     expect(metrics.content).toBeLessThanOrEqual(metrics.viewport);
  53  | }
  54  | 
  55  | async function expectDialogFits(page: import('@playwright/test').Page, width: number, height: number) {
  56  |     const dialog = page.getByRole('dialog').first();
  57  |     await expect(dialog).toBeVisible();
  58  |     const bounds = await dialog.boundingBox();
  59  |     expect(bounds).not.toBeNull();
  60  |     expect(bounds!.x).toBeGreaterThanOrEqual(0);
  61  |     expect(bounds!.y).toBeGreaterThanOrEqual(0);
  62  |     expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
  63  |     expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height + 1);
  64  |     await expectNoHorizontalOverflow(page, width);
  65  | }
  66  | 
  67  | test('Knowledge routes R23/R24/R25 fit every supported layout boundary', async ({ page }) => {
  68  |     for (const width of [320, 390, 768, 1280, 1440]) {
  69  |         const height = width < 600 ? 844 : 900;
  70  |         await page.setViewportSize({ width, height });
  71  | 
  72  |         await gotoDemo(page, '/s/shop-demo/knowledge');
  73  |         await expect(page.getByRole('heading', { name: 'Kiến thức cửa hàng', exact: true })).toBeVisible();
  74  |         await expect(page.getByRole('table').first()).toBeVisible();
  75  |         await expectNoHorizontalOverflow(page, width);
  76  | 
  77  |         await gotoKnowledgeDetail(page);
  78  |         await expect(page.getByRole('heading', { name: 'Chính sách đổi hàng', exact: true })).toBeVisible();
  79  |         await expect(page.getByRole('heading', { name: 'Lịch sử phiên bản', exact: true })).toBeVisible();
  80  |         await expectNoHorizontalOverflow(page, width);
  81  | 
  82  |         await seedPendingFeedbackAndOpenReview(page);
  83  |         await expectNoHorizontalOverflow(page, width);
  84  |     }
  85  | });
  86  | 
  87  | test('Knowledge create, edit, and feedback-review dialogs remain inside mobile and desktop viewports', async ({ page }) => {
  88  |     for (const width of [320, 390, 1280]) {
  89  |         const height = width < 600 ? 844 : 900;
  90  |         await page.setViewportSize({ width, height });
  91  | 
  92  |         await gotoDemo(page, '/s/shop-demo/knowledge');
  93  |         await page.getByRole('button', { name: 'Thêm nguồn kiến thức', exact: true }).click();
  94  |         await page.getByRole('dialog', { name: 'Nguồn kiến thức mới' }).waitFor();
  95  |         await expectDialogFits(page, width, height);
  96  | 
  97  |         await gotoKnowledgeDetail(page);
  98  |         await page.getByRole('button', { name: 'Sửa bản nháp', exact: true }).click();
  99  |         await page.getByRole('dialog', { name: 'Sửa nháp' }).waitFor();
  100 |         await expectDialogFits(page, width, height);
  101 | 
  102 |         await seedPendingFeedbackAndOpenReview(page);
  103 |         await page.getByRole('button', { name: 'Duyệt nội dung', exact: true }).first().click();
  104 |         await page.getByRole('dialog', { name: 'Kiểm tra phản hồi' }).waitFor();
  105 |         await expectDialogFits(page, width, height);
  106 |     }
  107 | });
  108 | 
```