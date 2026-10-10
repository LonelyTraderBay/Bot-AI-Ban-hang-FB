# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend-corrections.spec.ts >> F08 privacy bounds reject invalid days and long jurisdiction before HTTP
- Location: tests\frontend-corrections.spec.ts:428:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByLabel('Căn cứ / thị trường áp dụng', { exact: true })
Expected: "true"
Received: "false"
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" getByLabel('Căn cứ / thị trường áp dụng', { exact: true }) with timeout 5000ms
  - waiting for getByLabel('Căn cứ / thị trường áp dụng', { exact: true })
    14 × locator resolved to <textarea id="«r16»" aria-invalid="false" aria-describedby="«r16»-helper-text" class="MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputMultiline css-1n5pdcw-MuiInputBase-input-MuiOutlinedInput-input">nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn…</textarea>
       - unexpected value "false"

```

```yaml
- textbox "Căn cứ / thị trường áp dụng": nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn
```

# Test source

```ts
  338 |     expect((await mutate(page, 'orders/' + current.id, { warehouseId }, 'PATCH', current.version)).status).toBe(200);
  339 |     await editor.getByRole('button', { name: 'Lưu đơn nháp', exact: true }).click();
  340 |     const comparison = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
  341 |     await expect(comparison.getByRole('combobox', { name: /^Chọn dữ liệu: Dòng đơn hàng/ })).toBeVisible();
  342 |     await comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' }).click();
  343 |     await expect(editor.getByRole('combobox', { name: /^Kho xuất(?: |$)/ }).locator('..').locator('input')).toHaveValue(warehouseId);
  344 |     const sent = page.waitForRequest(request => request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/orders/' + current.id));
  345 |     await editor.getByRole('button', { name: 'Lưu đơn nháp', exact: true }).click();
  346 |     const request = await sent; expect(request.postDataJSON()).toEqual({ notes: 'Local order note' }); expect(request.headers()['if-match']).toBe(`"${current.version + 1}"`);
  347 |     await expect(editor).not.toBeVisible();
  348 | });
  349 | 
  350 | test('F06 guards added order rows, shop switch, logout and native reload; successful creation leaves no false guard', async ({ page }) => {
  351 |     for (const route of ['orders/new', 'bot/evaluations', 'orders/new']) {
  352 |         await visit(page, route);
  353 |         expect(await page.evaluate(async () => (await fetch('/api/v2/session')).status)).toBe(200);
  354 |     }
  355 |     await page.getByRole('button', { name: 'Thêm dòng', exact: true }).click();
  356 |     const shopLink = page.getByRole('navigation', { name: 'Điều hướng chính' }).locator('a[href="/workspaces"]');
  357 |     const warning = page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?', exact: true });
  358 |     await shopLink.click(); await expect(warning).toBeVisible();
  359 |     await warning.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }).click();
  360 |     await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click(); await expect(warning).toBeVisible();
  361 |     await warning.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }).click();
  362 |     const reloadWarning = page.waitForEvent('dialog', { timeout: 10000 });
  363 |     const reload = page.reload({ timeout: 10000 }).catch(() => undefined);
  364 |     const browserDialog = await reloadWarning; expect(browserDialog.type()).toBe('beforeunload'); await browserDialog.dismiss(); await reload;
  365 |     await expect(page.getByLabel('Sản phẩm 2', { exact: true })).toBeVisible();
  366 |     await page.getByRole('button', { name: /Bỏ dòng/ }).last().click();
  367 |     await page.getByRole('combobox', { name: 'Khách hàng', exact: true }).click(); await page.getByRole('option', { name: 'Linh (khách mẫu)', exact: true }).click();
  368 |     await page.getByRole('combobox', { name: 'Sản phẩm 1', exact: true }).click(); await page.getByRole('option', { name: /Áo mẫu A/ }).first().click();
  369 |     const created = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders'));
  370 |     await page.getByRole('button', { name: 'Lưu đơn nháp', exact: true }).click();
  371 |     const response = await created; const payload = await response.json(); expect(response.status(), JSON.stringify(payload)).toBe(201);
  372 |     await expect(page).toHaveURL(demoUrl + '/s/shop-demo/orders/' + payload.data.id); await expect(warning).not.toBeVisible();
  373 | });
  374 | 
  375 | test('F01 analogous return-inspection draft does not adopt a refetched version without comparison', async ({ page }) => {
  376 |     await visit(page, 'returns');
  377 |     const fixture = await page.evaluate(async () => {
  378 |         const { db } = await import('/src/mocks/database.ts');
  379 |         const order = db.orders.find((item: { id: string; shopId: string; lines: Array<{ id: string }> }) => item.shopId === 'shop-demo' && !db.returns.some((returned: { orderId: string }) => returned.orderId === item.id)); order.fulfillmentState = 'delivered';
  380 |         return { id: order.id, lineId: order.lines[0].id };
  381 |     });
  382 |     const created = await mutate(page, 'returns', { orderId: fixture.id, reason: 'Synthetic received return', lines: [{ orderLineId: fixture.lineId, quantity: 1 }] }); expect(created.status, JSON.stringify(created.payload)).toBe(201);
  383 |     await page.getByRole('button', { name: 'Kiểm nhận', exact: true }).first().click();
  384 |     const editor = page.getByRole('dialog', { name: 'Kiểm nhận hàng trả', exact: true });
  385 |     await expect(editor.getByLabel('Ghi nhận kiểm tra')).toBeVisible(); await editor.getByLabel('Ghi nhận kiểm tra').fill('Local physical inspection');
  386 |     await page.evaluate(async returnId => { const { db } = await import('/src/mocks/database.ts'); const item = db.returns.find((item: { id: string }) => item.id === returnId); item.lines[0].disposition = 'damaged'; item.lines[0].reason = 'Concurrent case note'; item.version++; }, created.payload.data.id);
  387 |     await pulse(page);
  388 |     await editor.getByRole('button', { name: 'Xác nhận kiểm nhận', exact: true }).click();
  389 |     const comparison = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
  390 |     await expect(comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' })).toBeDisabled();
  391 |     await comparison.getByRole('combobox').click(); await page.getByRole('option', { name: 'Giữ bản nháp', exact: true }).click();
  392 |     await comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' }).click();
  393 |     const sent = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/inspect'));
  394 |     await editor.getByRole('button', { name: 'Xác nhận kiểm nhận', exact: true }).click();
  395 |     expect((await sent).postDataJSON()).toMatchObject({ expectedVersion: created.payload.data.version + 1, lines: [{ reason: 'Local physical inspection' }] });
  396 |     await expect(editor).not.toBeVisible();
  397 | });
  398 | 
  399 | test('F01 comparison supports keyboard choices, server changes again, axe and 320px reflow with long content', async ({ page }) => {
  400 |     await visit(page, 'customers/c1');
  401 |     await page.getByLabel('Tên khách hàng', { exact: true }).fill('Mine');
  402 |     expect((await mutate(page, 'customers/c1', { displayName: 'Server second', notes: 'LongContent'.repeat(350) }, 'PATCH', 1)).status).toBe(200);
  403 |     await page.getByRole('button', { name: 'Đối chiếu', exact: true }).click();
  404 |     const comparison = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
  405 |     const select = comparison.getByRole('combobox', { name: 'Chọn dữ liệu: Tên khách hàng', exact: true });
  406 |     await select.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Home'); await page.keyboard.press('Enter');
  407 |     await expect(comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' })).toBeEnabled();
  408 |     expect((await mutate(page, 'customers/c1', { displayName: 'Server third' }, 'PATCH', 2)).status).toBe(200);
  409 |     await expect(comparison.getByText('Server third', { exact: true })).toBeVisible();
  410 |     await expect(comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' })).toBeDisabled();
  411 |     await expect.poll(() => comparison.evaluate(element => {
  412 |         for (let current: Element | null = element; current; current = current.parentElement)
  413 |             if (Number(getComputedStyle(current).opacity) !== 1) return false;
  414 |         return true;
  415 |     })).toBe(true);
  416 |     const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  417 |     expect(accessibility.violations).toEqual([]);
  418 |     await page.setViewportSize({ width: 320, height: 800 });
  419 |     const geometry = await comparison.evaluate(element => ({ width: element.getBoundingClientRect().width, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, viewport: window.innerWidth }));
  420 |     expect(geometry.width).toBeLessThanOrEqual(320); expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  421 |     await test.info().attach('comparison-reflow-320.json', { body: JSON.stringify({ geometry, violations: accessibility.violations }), contentType: 'application/json' });
  422 |     await comparison.screenshot({ path: test.info().outputPath('comparison-320.png') });
  423 |     await page.keyboard.press('Escape'); await expect(comparison).not.toBeVisible();
  424 |     await expect(page.getByLabel('Tên khách hàng', { exact: true })).toHaveValue('Mine');
  425 | });
  426 | 
  427 | 
  428 | test('F08 privacy bounds reject invalid days and long jurisdiction before HTTP', async ({ page }) => {
  429 |     await visit(page, 'settings/privacy');
  430 |     const writes: string[] = []; page.on('request', request => { if (request.method() === 'PATCH' && request.url().includes('/privacy/policy')) writes.push(request.url()); });
  431 |     const days = page.getByLabel('Số ngày lưu hội thoại', { exact: true }), note = page.getByLabel('Căn cứ / thị trường áp dụng', { exact: true });
  432 |     for (const value of ['0', '36501', '1.5']) { await days.fill(value); await expect(days).toHaveAttribute('aria-invalid', 'true'); await expect(page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true })).toBeDisabled(); }
  433 |     await days.fill('36500'); await note.fill('n'.repeat(2001)); await expect(note).toHaveAttribute('aria-invalid', 'true');
  434 |     await expect(page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true })).toBeDisabled(); expect(writes).toEqual([]);
  435 |     await note.fill('n'.repeat(2000)); const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().includes('/privacy/policy'));
  436 |     await page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true }).click(); expect((await saved).status()).toBe(200); expect(writes).toHaveLength(1);
  437 |     for (const length of [4, 2001]) {
> 438 |         await note.fill('😀'.repeat(length)); await expect(note).toHaveAttribute('aria-invalid', 'true');
      |                                                                  ^ Error: expect(locator).toHaveAttribute(expected) failed
  439 |         await expect(page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true })).toBeDisabled(); expect(writes).toHaveLength(1);
  440 |     }
  441 |     for (const [index, length] of [5, 2000].entries()) {
  442 |         await note.fill('😀'.repeat(length));
  443 |         await expect(page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true })).toBeEnabled();
  444 |         const unicodeSaved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().includes('/privacy/policy'));
  445 |         await page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true }).click();
  446 |         const response = await unicodeSaved; expect(response.status()).toBe(200); expect((await response.json()).data.jurisdictionNote).toBe('😀'.repeat(length));
  447 |         expect(writes).toHaveLength(index + 2);
  448 |         await expect(note).toHaveValue('😀'.repeat(length));
  449 |         await expect(page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true })).toBeDisabled();
  450 |     }
  451 | });
  452 | 
  453 | test('F06 order custom close respects the draft guard and busy editors remain protected', async ({ page }) => {
  454 |     await visit(page, 'orders');
  455 |     const current = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/orders')).json()).data.find((order: { orderState: string }) => order.orderState === 'draft'));
  456 |     await visit(page, 'orders/' + current.id); await page.getByRole('button', { name: 'Sửa đơn nháp', exact: true }).click();
  457 |     const editor = page.getByRole('dialog', { name: 'Sửa đơn nháp', exact: true }); await editor.getByLabel('Ghi chú chuẩn bị').fill('Unsaved order close');
  458 |     await editor.getByRole('button', { name: 'Đóng chỉnh sửa', exact: true }).click();
  459 |     const warning = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true }); await expect(warning).toBeVisible();
  460 |     await warning.getByRole('button', { name: 'Tiếp tục sửa', exact: true }).click(); await expect(editor.getByLabel('Ghi chú chuẩn bị')).toHaveValue('Unsaved order close');
  461 |     await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationDelay('updateOrderDraft', 1200));
  462 |     const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().includes('/orders/'));
  463 |     await editor.getByRole('button', { name: 'Lưu đơn nháp', exact: true }).click(); await expect(editor.getByRole('button', { name: 'Đóng chỉnh sửa', exact: true })).toBeDisabled();
  464 |     await editor.getByLabel('Ghi chú chuẩn bị').fill('Late order change'); await saved; await expect(editor).toBeVisible(); await expect(editor.getByLabel('Ghi chú chuẩn bị')).toHaveValue('Late order change');
  465 | });
  466 | 
```