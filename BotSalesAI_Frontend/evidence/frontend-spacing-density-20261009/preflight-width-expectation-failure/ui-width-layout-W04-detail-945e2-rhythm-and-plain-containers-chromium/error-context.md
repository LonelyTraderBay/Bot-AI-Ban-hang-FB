# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-width-layout.spec.ts >> W04 detail rows stay atomic in content rhythm and plain containers
- Location: tests\ui-width-layout.spec.ts:161:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 12
Received: 0
```

# Test source

```ts
  71  | 
  72  | for (const count of [0, 1, 2, 3]) test(`W01 workspace collection handles ${count} visible shops`, async ({ page }, info) => {
  73  |     const observations = [];
  74  |     for (const width of [320, 768, 1280, 1920]) {
  75  |         await ready(page, 'overview', width);
  76  |         // Preserve schema-complete seed objects, only vary this test's visible shop list.
  77  |         await page.evaluate(async count => {
  78  |             const store = await import('/src/mocks/database.ts');
  79  |             const state = structuredClone(store.db);
  80  |             const shop = state.shops[0], membership = state.members[0];
  81  |             state.shops = Array.from({ length: count }, (_, index) => ({ ...shop, id: index ? `shop-width-${index}` : shop.id, name: `Cửa hàng bố cục ${index + 1}` }));
  82  |             state.members = state.shops.map((shop, index) => ({ ...membership, id: `member-width-${index}`, shopId: shop.id }));
  83  |             store.restoreDb(state);
  84  |         }, count);
  85  |         await clientNavigate(page, '/workspaces');
  86  |         await expect(page.getByRole('heading', { name: 'Chọn cửa hàng', exact: true })).toBeVisible();
  87  |         await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root'));
  88  |         if (!count) {
  89  |             await expect(page.locator('main').getByRole('status').filter({ hasText: 'Chưa có cửa hàng.' })).toBeVisible();
  90  |             await expect(page.locator('main').getByRole('link', { name: 'Tạo cửa hàng', exact: true })).toHaveCount(1);
  91  |             await expect(page.locator('main [data-ui-composition="section-grid"]')).toHaveCount(0);
  92  |         } else {
  93  |             const geometry = await gridGeometry(page);
  94  |             expect(geometry.children).toHaveLength(count);
  95  |             const columns = count === 1 || width < 768 ? 1 : 2;
  96  |             expect(geometry.children[0].width * columns + geometry.gap * (columns - 1)).toBeCloseTo(geometry.width, 0);
  97  |             observations.push({ count, width, ...geometry });
  98  |         }
  99  |         await documentFits(page, width);
  100 |     }
  101 |     await info.attach('W01-workspaces', { body: JSON.stringify(observations), contentType: 'application/json' });
  102 | });
  103 | 
  104 | test('W02 full-width form groups fill their panel and retain input/mapping/shipping behavior', async ({ page }, info) => {
  105 |     const observed = [];
  106 |     for (const width of [320, 768, 1280, 1920]) for (const route of ['settings/shop', 'imports', 'shipments']) {
  107 |         await ready(page, route, width);
  108 |         const panel = page.locator('main .MuiPaper-root').filter({ has: page.getByRole('heading', { name: route === 'settings/shop' ? 'Thông tin cơ sở' : route === 'imports' ? 'Tệp & ánh xạ' : 'Xem trước phí & vùng giao hàng', exact: true }) }).first();
  109 |         const geometry = await panel.locator('[data-ui-composition="form-fields"]').first().evaluate(form => {
  110 |             const body = form.closest('.MuiPaper-root')!.lastElementChild!;
  111 |             const style = getComputedStyle(body);
  112 |             return { width: form.getBoundingClientRect().width, available: body.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), maxWidth: getComputedStyle(form).maxWidth };
  113 |         });
  114 |         expect(geometry.width).toBeCloseTo(geometry.available, 0);
  115 |         expect(geometry.maxWidth).toBe('none');
  116 |         if (route === 'settings/shop') {
  117 |             await page.getByRole('textbox', { name: 'Tên cửa hàng', exact: true }).fill('Tên cửa hàng cần giữ');
  118 |             if (width < 1280) await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
  119 |             await page.getByRole('link', { name: 'Sản phẩm', exact: true }).click();
  120 |             await expect(page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?', exact: true })).toBeVisible();
  121 |             await page.getByRole('button', { name: 'Tiếp tục chỉnh sửa', exact: true }).click();
  122 |             await expect(page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?', exact: true })).toHaveCount(0);
  123 |             if (width < 1280) {
  124 |                 await page.keyboard.press('Escape');
  125 |                 await expect(page.locator('.MuiDrawer-modal')).toHaveCount(0);
  126 |             }
  127 |             await expect(page.getByRole('textbox', { name: 'Tên cửa hàng', exact: true })).toHaveValue('Tên cửa hàng cần giữ');
  128 |         } else if (route === 'imports') {
  129 |             await page.getByRole('textbox', { name: 'Tên cột trong tệp', exact: true }).first().fill('sku-width');
  130 |             await page.locator('main').getByRole('button', { name: 'Bỏ', exact: true }).last().click();
  131 |             await page.getByRole('button', { name: 'Thêm cột', exact: true }).click();
  132 |             await expect(page.getByRole('textbox', { name: 'Tên cột trong tệp', exact: true }).first()).toHaveValue('sku-width');
  133 |         } else {
  134 |             await page.getByRole('checkbox', { name: 'Có địa chỉ giao hàng mẫu', exact: true }).uncheck();
  135 |             await expect(page.getByText('Thiếu địa chỉ giao hàng; chưa thể xác định vùng hoặc hiển thị phí.', { exact: true })).toBeVisible();
  136 |         }
  137 |         await documentFits(page, width);
  138 |         observed.push({ route, width, ...geometry });
  139 |     }
  140 |     await info.attach('W02-panel-form-widths', { body: JSON.stringify(observed), contentType: 'application/json' });
  141 | });
  142 | 
  143 | test('W03 notification protection notice occupies the full page row after the two panes', async ({ page }, info) => {
  144 |     const observed = [];
  145 |     for (const width of [320, 768, 1280, 1920]) {
  146 |         await ready(page, 'notifications/devices', width);
  147 |         const geometry = await page.getByTestId('notification-protection-note').evaluate(notice => {
  148 |             const grid = document.querySelector('main [data-ui-composition="section-grid"]')!;
  149 |             const n = notice.getBoundingClientRect(), g = grid.getBoundingClientRect();
  150 |             return { noticeWidth: n.width, gridWidth: g.width, noticeY: n.y, gridBottom: g.bottom, gap: n.y - g.bottom, insideGrid: grid.contains(notice) };
  151 |         });
  152 |         expect(geometry.insideGrid).toBe(false);
  153 |         expect(geometry.noticeWidth).toBeCloseTo(geometry.gridWidth, 0);
  154 |         expect(geometry.gap).toBeCloseTo(24, 0);
  155 |         await documentFits(page, width);
  156 |         observed.push({ width, ...geometry });
  157 |     }
  158 |     await info.attach('W03-notice-widths', { body: JSON.stringify(observed), contentType: 'application/json' });
  159 | });
  160 | 
  161 | test('W04 detail rows stay atomic in content rhythm and plain containers', async ({ page }, info) => {
  162 |     const observed = [];
  163 |     for (const width of [320, 768, 1280, 1920]) {
  164 |         await ready(page, 'integrations/ai', width);
  165 |         const geometry = await page.locator('main').evaluate(main => {
  166 |             const group = [...main.querySelectorAll('[data-ui-composition="surface-content"]')].find(element => element.textContent?.includes('structuredOutput'))!;
  167 |             const slots = [...group.children];
  168 |             return { gap: parseFloat(getComputedStyle(group).gap), childCount: slots.length, slots: slots.map(slot => ({ text: slot.textContent, rowHeight: slot.firstElementChild?.getBoundingClientRect().height, height: slot.getBoundingClientRect().height, y: slot.getBoundingClientRect().y, separators: slot.querySelectorAll('.MuiDivider-root').length })), plain: [...main.querySelectorAll('[data-ui-detail-line]')].filter(slot => slot.parentElement?.getAttribute('data-ui-composition') !== 'surface-content').slice(0, 4).map(slot => ({ height: slot.getBoundingClientRect().height, rowHeight: slot.firstElementChild!.getBoundingClientRect().height, separatorHeight: slot.lastElementChild!.getBoundingClientRect().height })) };
  169 |         });
  170 |         expect(geometry.childCount).toBe(7);
> 171 |         expect(geometry.gap).toBe(12);
      |                              ^ Error: expect(received).toBe(expected) // Object.is equality
  172 |         for (let index = 0; index < geometry.slots.length; index++) {
  173 |             expect(geometry.slots[index].separators).toBe(1);
  174 |             if (index) expect(geometry.slots[index].y - geometry.slots[index - 1].y - geometry.slots[index - 1].height).toBeCloseTo(12, 0);
  175 |         }
  176 |         expect(geometry.plain).toHaveLength(4);
  177 |         for (const row of geometry.plain) expect(row.height).toBeCloseTo(row.rowHeight + row.separatorHeight, 0);
  178 |         await documentFits(page, width);
  179 |         observed.push({ width, ...geometry });
  180 |     }
  181 |     await info.attach('W04-logical-detail-rows', { body: JSON.stringify(observed), contentType: 'application/json' });
  182 | });
  183 | 
```