# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui012-keyboard.spec.ts >> UI012 marketing chart keeps every category label visible beside its data table
- Location: tests/ui012-keyboard.spec.ts:227:1

# Error details

```
Error: locator.scrollIntoViewIfNeeded: Element is not attached to the DOM
Call log:
  - attempting scroll into view action
    - waiting for element to be stable

```

# Test source

```ts
  146 |     await page.keyboard.type('Nội dung tổng hợp cần xác minh thêm trước khi tạo bản nháp.');
  147 |     const save = dialog.getByRole('button', { name: 'Lưu bản nháp', exact: true });
  148 |     await tabUntilFocused(page, save);
  149 |     await page.keyboard.press('Enter');
  150 | 
  151 |     const alert = dialog.getByRole('alert').filter({ hasText: 'Nội dung cần được kiểm tra trước khi lưu.' });
  152 |     await expect(alert).toBeVisible();
  153 |     expect(await page.evaluate(() => (window as Window & { __ui012Synthetic422: boolean }).__ui012Synthetic422)).toBe(true);
  154 |     await expect(content).toBeFocused();
  155 |     await expect(content).toHaveAttribute('aria-invalid', 'true');
  156 |     await expect(alert).toContainText('Nội dung: Hãy rà soát nội dung nguồn.');
  157 |     await expect(alert).not.toContainText('content:');
  158 | });
  159 | 
  160 | test('UI012 keyboard activates the CSV chooser and discards its selected file without upload', async ({ page }) => {
  161 |     const writes: string[] = [];
  162 |     page.on('request', request => {
  163 |         if (request.method() === 'POST') writes.push(new URL(request.url()).pathname);
  164 |     });
  165 |     await page.goto(new URL('/s/shop-demo/finance/reconciliation', demoUrl).toString());
  166 |     const main = page.locator('main#main-content');
  167 |     await expect(page.getByRole('heading', { name: 'Đối soát ngân hàng & COD', exact: true })).toBeVisible();
  168 |     const skipLink = page.getByRole('link', { name: 'Đến nội dung chính', exact: true });
  169 |     await page.keyboard.press('Tab');
  170 |     await expect(skipLink).toBeFocused();
  171 |     await page.keyboard.press('Enter');
  172 |     await expect(main).toBeFocused();
  173 | 
  174 |     const trigger = page.getByRole('button', { name: 'Nhập bảng đối soát', exact: true });
  175 |     await tabUntilFocused(page, trigger);
  176 |     await page.keyboard.press('Enter');
  177 |     const dialog = page.getByRole('dialog', { name: 'Nhập bảng đối soát' });
  178 |     await expect(dialog).toBeVisible();
  179 |     const chooseFile = dialog.getByRole('button', { name: 'Chọn CSV', exact: true });
  180 |     await tabUntilFocused(page, chooseFile);
  181 |     const chooserPromise = page.waitForEvent('filechooser', { timeout: 10_000 });
  182 |     await page.keyboard.press('Space');
  183 |     const chooser = await chooserPromise;
  184 |     await chooser.setFiles({ name: 'ui012-keyboard.csv', mimeType: 'text/csv', buffer: Buffer.from('id,amount\nTX-1,100') });
  185 |     await expect(dialog.getByRole('button', { name: 'ui012-keyboard.csv', exact: true })).toBeVisible();
  186 | 
  187 |     const cancel = dialog.getByRole('button', { name: 'Hủy', exact: true });
  188 |     await tabUntilFocused(page, cancel);
  189 |     await page.keyboard.press('Enter');
  190 |     const discard = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?' });
  191 |     await expect(discard).toBeVisible();
  192 |     const abandon = discard.getByRole('button', { name: 'Bỏ thay đổi', exact: true });
  193 |     await tabUntilFocused(page, abandon);
  194 |     await page.keyboard.press('Enter');
  195 |     await expect(dialog).toHaveCount(0);
  196 |     await expect(trigger).toBeFocused();
  197 |     expect(writes).toEqual([]);
  198 | });
  199 | 
  200 | test('UI012 keyboard can reach and horizontally scroll the marketing chart data alternative', async ({ page }) => {
  201 |     await page.setViewportSize({ width: 320, height: 900 });
  202 |     await page.goto(new URL('/s/shop-demo/reports/marketing', demoUrl).toString());
  203 |     const main = page.locator('main#main-content');
  204 |     await expect(page.getByRole('heading', { name: 'Thông tin cho marketing', exact: true })).toBeVisible();
  205 |     const chart = page.getByRole('img', { name: /Biểu đồ lý do không chốt đơn/ });
  206 |     const table = page.getByRole('table', { name: 'Lý do không chốt đơn' });
  207 |     const region = page.getByRole('region', { name: 'Lý do không chốt đơn' });
  208 |     await expect(chart).toBeVisible();
  209 |     await expect(table.getByRole('row').nth(1)).toBeVisible();
  210 |     await expect(region).toBeVisible();
  211 | 
  212 |     const skipLink = page.getByRole('link', { name: 'Đến nội dung chính', exact: true });
  213 |     await page.keyboard.press('Tab');
  214 |     await expect(skipLink).toBeFocused();
  215 |     await page.keyboard.press('Enter');
  216 |     await expect(main).toBeFocused();
  217 |     await tabUntilFocused(page, region);
  218 |     await expect(region).toBeFocused();
  219 |     const before = await region.evaluate(element => (element as HTMLElement).scrollLeft);
  220 |     expect(await region.evaluate(element => (element as HTMLElement).scrollWidth > (element as HTMLElement).clientWidth)).toBe(true);
  221 |     await page.keyboard.press('ArrowRight');
  222 |     const after = await region.evaluate(element => (element as HTMLElement).scrollLeft);
  223 |     expect(after).toBeGreaterThan(before);
  224 |     expect(await page.evaluate(() => document.documentElement.scrollLeft)).toBe(0);
  225 | });
  226 | 
  227 | test('UI012 marketing chart keeps every category label visible beside its data table', async ({ page }) => {
  228 |     const expectedLabels = [
  229 |         'Không còn đúng kích cỡ',
  230 |         'Chưa rõ phí giao hàng',
  231 |         'Chưa đủ thông tin sản phẩm',
  232 |     ];
  233 | 
  234 |     for (const viewport of [{ width: 1280, height: 720 }, { width: 320, height: 860 }]) {
  235 |         await page.setViewportSize(viewport);
  236 |         await page.goto(new URL('/s/shop-demo/reports/marketing', demoUrl).toString());
  237 |         const chart = page.getByRole('img', { name: 'Biểu đồ lý do không chốt đơn, 3 nhóm' });
  238 |         const table = page.getByRole('table', { name: 'Lý do không chốt đơn' });
  239 |         await expect(chart).toBeVisible();
  240 |         await expect(table).toBeVisible();
  241 | 
  242 |         const chartLabels = (await chart.locator('svg text').allTextContents()).map(label => label.replace(/\s+/gu, ' ').trim());
  243 |         expect(chartLabels).toEqual(expect.arrayContaining(expectedLabels));
  244 |         await expect(table.getByRole('row')).toHaveCount(4);
  245 | 
> 246 |         await chart.scrollIntoViewIfNeeded();
      |                     ^ Error: locator.scrollIntoViewIfNeeded: Element is not attached to the DOM
  247 |         const chartBounds = await chart.boundingBox();
  248 |         expect(chartBounds).not.toBeNull();
  249 |         const labelBounds = await chart.locator('svg text').evaluateAll((nodes, labels) => nodes
  250 |             .filter(node => labels.includes((node.textContent || '').replace(/\s+/gu, ' ').trim()))
  251 |             .map(node => {
  252 |                 const rect = node.getBoundingClientRect();
  253 |                 return { x: rect.x, right: rect.right, y: rect.y, bottom: rect.bottom, fontSize: Number.parseFloat(getComputedStyle(node).fontSize) };
  254 |             }), expectedLabels);
  255 |         expect(labelBounds).toHaveLength(expectedLabels.length);
  256 |         for (const bounds of labelBounds) {
  257 |             expect(bounds.x).toBeGreaterThanOrEqual(chartBounds!.x);
  258 |             expect(bounds.right).toBeLessThanOrEqual(chartBounds!.x + chartBounds!.width);
  259 |             expect(bounds.y).toBeGreaterThanOrEqual(chartBounds!.y);
  260 |             expect(bounds.bottom).toBeLessThanOrEqual(chartBounds!.y + chartBounds!.height);
  261 |             expect(bounds.fontSize).toBeGreaterThanOrEqual(14);
  262 |         }
  263 |         for (let index = 1; index < labelBounds.length; index += 1) {
  264 |             expect(labelBounds[index - 1].right).toBeLessThanOrEqual(labelBounds[index].x);
  265 |         }
  266 |         expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  267 |     }
  268 | });
  269 | 
  270 | test('UI012 inbox feedback actions identify their message and return focus after Escape', async ({ page }) => {
  271 |     const mutationRequests: string[] = [];
  272 |     page.on('request', request => {
  273 |         if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) mutationRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
  274 |     });
  275 | 
  276 |     await page.goto(new URL('/s/shop-demo/inbox/cv1', demoUrl).toString());
  277 |     const messageList = page.getByTestId('inbox-message-list');
  278 |     const actions = messageList.getByRole('button', { name: /^Đánh giá/ });
  279 |     await expect(actions).toHaveCount(2);
  280 |     const actionNames = await actions.evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label') || button.textContent?.trim() || ''));
  281 |     expect(actionNames.every(name => name.startsWith('Đánh giá tin nhắn'))).toBe(true);
  282 |     expect(new Set(actionNames).size).toBe(actionNames.length);
  283 |     expect(actionNames).toContainEqual(expect.stringContaining('Shop ơi áo thun còn size L không?'));
  284 | 
  285 |     await tabUntilFocused(page, actions.first());
  286 |     await expect(actions.first()).toBeFocused();
  287 |     await page.keyboard.press('Space');
  288 |     const dialog = page.getByRole('dialog', { name: /Đánh giá câu trả lời/ });
  289 |     await expect(dialog).toBeVisible();
  290 |     const ratingField = dialog.getByRole('combobox', { name: /Đánh giá/ });
  291 |     await expect(ratingField).toBeFocused();
  292 |     await page.keyboard.press('Escape');
  293 |     await expect(dialog).toHaveCount(0);
  294 |     await expect(actions.first()).toBeFocused();
  295 |     const focusReturned = await actions.first().evaluate(element => element === document.activeElement);
  296 |     expect(mutationRequests).toEqual([]);
  297 |     await test.info().attach('ui012-inbox-feedback-actions.json', {
  298 |         body: JSON.stringify({ route: '/s/shop-demo/inbox/cv1', actionNames, focusedRatingField: true, focusReturned, mutationRequests }, null, 2),
  299 |         contentType: 'application/json',
  300 |     });
  301 | });
  302 | 
  303 | test('UI012 order draft does not announce an untouched required customer as invalid', async ({ page }) => {
  304 |     await page.goto(new URL('/s/shop-demo/orders/new', demoUrl).toString());
  305 |     await expect(page.getByRole('heading', { name: 'Tạo đơn hàng', exact: true })).toBeVisible();
  306 | 
  307 |     const customer = page.getByRole('combobox', { name: 'Khách hàng' });
  308 |     await expect(customer).toBeVisible();
  309 |     await expect(customer).not.toHaveAttribute('aria-invalid', 'true');
  310 |     await expect(customer).toHaveAttribute('aria-required', 'true');
  311 |     await expect(customer).not.toHaveClass(/Mui-error/);
  312 |     await expect(page.getByText('Chọn khách hàng để lưu đơn nháp.', { exact: true })).toBeVisible();
  313 |     await expect(page.getByRole('button', { name: 'Lưu đơn nháp' })).toBeDisabled();
  314 | });
  315 | 
  316 | test('UI012 human-confirmation policy copy wraps inside its alert at a 320 CSS-pixel viewport', async ({ page }) => {
  317 |     await page.setViewportSize({ width: 320, height: 900 });
  318 |     await page.goto(new URL('/s/shop-demo/bot', demoUrl).toString());
  319 | 
  320 |     const alert = page.getByRole('alert').filter({ hasText: 'Đơn do AI đề xuất vẫn cần người có quyền kiểm tra và xác nhận.' });
  321 |     await expect(alert).toBeVisible();
  322 |     await expect(alert).toContainText('Lưu bản nháp không thay đổi cấu hình đang chạy hoặc tự chốt đơn.');
  323 | 
  324 |     const layout = await alert.evaluate(element => {
  325 |         const message = element.querySelector<HTMLElement>('.MuiAlert-message');
  326 |         if (!message) throw new Error('MUI Alert message container is missing');
  327 |         const messageRect = message.getBoundingClientRect();
  328 |         const range = document.createRange();
  329 |         range.selectNodeContents(message);
  330 |         const textRects = [...range.getClientRects()]
  331 |             .filter(rect => rect.width > 0 && rect.height > 0)
  332 |             .map(rect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }));
  333 |         return {
  334 |             clientWidth: message.clientWidth,
  335 |             scrollWidth: message.scrollWidth,
  336 |             overflowX: getComputedStyle(message).overflowX,
  337 |             messageLeft: messageRect.left,
  338 |             messageRight: messageRect.right,
  339 |             clippedTextRects: textRects.filter(rect => rect.left < messageRect.left - 1 || rect.right > messageRect.right + 1),
  340 |             documentClientWidth: document.documentElement.clientWidth,
  341 |             documentScrollWidth: document.documentElement.scrollWidth,
  342 |         };
  343 |     });
  344 | 
  345 |     expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  346 |     expect(layout.clippedTextRects).toEqual([]);
```