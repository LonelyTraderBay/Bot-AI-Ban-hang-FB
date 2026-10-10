# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui012-keyboard.spec.ts >> UI012 marketing chart keeps every category label visible beside its data table
- Location: tests/ui012-keyboard.spec.ts:227:1

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 158.6171875
Received:    163.44790649414062
```

# Test source

```ts
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
  246 |         await chart.scrollIntoViewIfNeeded();
  247 |         const chartBounds = await chart.boundingBox();
  248 |         expect(chartBounds).not.toBeNull();
  249 |         const labelBounds = await chart.locator('svg text').evaluateAll((nodes, labels) => nodes
  250 |             .filter(node => labels.includes((node.textContent || '').replace(/\s+/gu, ' ').trim()))
  251 |             .map(node => {
  252 |                 const rect = node.getBoundingClientRect();
  253 |                 return { x: rect.x, right: rect.right, fontSize: Number.parseFloat(getComputedStyle(node).fontSize) };
  254 |             }), expectedLabels);
  255 |         expect(labelBounds).toHaveLength(expectedLabels.length);
  256 |         for (const bounds of labelBounds) {
  257 |             expect(bounds.x).toBeGreaterThanOrEqual(chartBounds!.x);
  258 |             expect(bounds.right).toBeLessThanOrEqual(chartBounds!.x + chartBounds!.width);
  259 |             expect(bounds.fontSize).toBeGreaterThanOrEqual(14);
  260 |         }
  261 |         for (let index = 1; index < labelBounds.length; index += 1) {
> 262 |             expect(labelBounds[index - 1].right).toBeLessThanOrEqual(labelBounds[index].x);
      |                                                  ^ Error: expect(received).toBeLessThanOrEqual(expected)
  263 |         }
  264 |         expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  265 |     }
  266 | });
  267 | 
  268 | test('UI012 inbox feedback actions identify their message and return focus after Escape', async ({ page }) => {
  269 |     const mutationRequests: string[] = [];
  270 |     page.on('request', request => {
  271 |         if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) mutationRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
  272 |     });
  273 | 
  274 |     await page.goto(new URL('/s/shop-demo/inbox/cv1', demoUrl).toString());
  275 |     const messageList = page.getByTestId('inbox-message-list');
  276 |     const actions = messageList.getByRole('button', { name: /^Đánh giá/ });
  277 |     await expect(actions).toHaveCount(2);
  278 |     const actionNames = await actions.evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label') || button.textContent?.trim() || ''));
  279 |     expect(actionNames.every(name => name.startsWith('Đánh giá tin nhắn'))).toBe(true);
  280 |     expect(new Set(actionNames).size).toBe(actionNames.length);
  281 |     expect(actionNames).toContainEqual(expect.stringContaining('Shop ơi áo thun còn size L không?'));
  282 | 
  283 |     await tabUntilFocused(page, actions.first());
  284 |     await expect(actions.first()).toBeFocused();
  285 |     await page.keyboard.press('Space');
  286 |     const dialog = page.getByRole('dialog', { name: /Đánh giá câu trả lời/ });
  287 |     await expect(dialog).toBeVisible();
  288 |     const ratingField = dialog.getByRole('combobox', { name: /Đánh giá/ });
  289 |     await expect(ratingField).toBeFocused();
  290 |     await page.keyboard.press('Escape');
  291 |     await expect(dialog).toHaveCount(0);
  292 |     await expect(actions.first()).toBeFocused();
  293 |     const focusReturned = await actions.first().evaluate(element => element === document.activeElement);
  294 |     expect(mutationRequests).toEqual([]);
  295 |     await test.info().attach('ui012-inbox-feedback-actions.json', {
  296 |         body: JSON.stringify({ route: '/s/shop-demo/inbox/cv1', actionNames, focusedRatingField: true, focusReturned, mutationRequests }, null, 2),
  297 |         contentType: 'application/json',
  298 |     });
  299 | });
  300 | 
  301 | test('UI012 order draft does not announce an untouched required customer as invalid', async ({ page }) => {
  302 |     await page.goto(new URL('/s/shop-demo/orders/new', demoUrl).toString());
  303 |     await expect(page.getByRole('heading', { name: 'Tạo đơn hàng', exact: true })).toBeVisible();
  304 | 
  305 |     const customer = page.getByRole('combobox', { name: 'Khách hàng' });
  306 |     await expect(customer).toBeVisible();
  307 |     await expect(customer).not.toHaveAttribute('aria-invalid', 'true');
  308 |     await expect(customer).toHaveAttribute('aria-required', 'true');
  309 |     await expect(customer).not.toHaveClass(/Mui-error/);
  310 |     await expect(page.getByText('Chọn khách hàng để lưu đơn nháp.', { exact: true })).toBeVisible();
  311 |     await expect(page.getByRole('button', { name: 'Lưu đơn nháp' })).toBeDisabled();
  312 | });
  313 | 
  314 | test('UI012 human-confirmation policy copy wraps inside its alert at a 320 CSS-pixel viewport', async ({ page }) => {
  315 |     await page.setViewportSize({ width: 320, height: 900 });
  316 |     await page.goto(new URL('/s/shop-demo/bot', demoUrl).toString());
  317 | 
  318 |     const alert = page.getByRole('alert').filter({ hasText: 'Đơn do AI đề xuất vẫn cần người có quyền kiểm tra và xác nhận.' });
  319 |     await expect(alert).toBeVisible();
  320 |     await expect(alert).toContainText('Lưu bản nháp không thay đổi cấu hình đang chạy hoặc tự chốt đơn.');
  321 | 
  322 |     const layout = await alert.evaluate(element => {
  323 |         const message = element.querySelector<HTMLElement>('.MuiAlert-message');
  324 |         if (!message) throw new Error('MUI Alert message container is missing');
  325 |         const messageRect = message.getBoundingClientRect();
  326 |         const range = document.createRange();
  327 |         range.selectNodeContents(message);
  328 |         const textRects = [...range.getClientRects()]
  329 |             .filter(rect => rect.width > 0 && rect.height > 0)
  330 |             .map(rect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }));
  331 |         return {
  332 |             clientWidth: message.clientWidth,
  333 |             scrollWidth: message.scrollWidth,
  334 |             overflowX: getComputedStyle(message).overflowX,
  335 |             messageLeft: messageRect.left,
  336 |             messageRight: messageRect.right,
  337 |             clippedTextRects: textRects.filter(rect => rect.left < messageRect.left - 1 || rect.right > messageRect.right + 1),
  338 |             documentClientWidth: document.documentElement.clientWidth,
  339 |             documentScrollWidth: document.documentElement.scrollWidth,
  340 |         };
  341 |     });
  342 | 
  343 |     expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  344 |     expect(layout.clippedTextRects).toEqual([]);
  345 |     expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.documentClientWidth + 1);
  346 | });
  347 | 
  348 | test('UI012 dashboard CTA separates hover and pressed feedback while keeping keyboard focus visible', async ({ page }) => {
  349 |     await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
  350 |     const action = page.getByRole('link', { name: 'Xem việc cần làm', exact: true });
  351 |     await expect(action).toBeVisible();
  352 | 
  353 |     await action.hover();
  354 |     const hoverColor = await action.evaluate(element => getComputedStyle(element).backgroundColor);
  355 |     const hoverContrast = await currentTextContrast(action);
  356 |     const bounds = await action.boundingBox();
  357 |     expect(bounds).not.toBeNull();
  358 |     await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  359 |     await page.mouse.down();
  360 |     const pressedColor = await action.evaluate(element => getComputedStyle(element).backgroundColor);
  361 |     const pressedContrast = await currentTextContrast(action);
  362 |     await page.mouse.up();
```