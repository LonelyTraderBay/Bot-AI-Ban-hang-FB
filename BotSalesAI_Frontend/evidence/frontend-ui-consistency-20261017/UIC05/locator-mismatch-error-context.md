# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-overlay-theme.spec.ts >> UI-CONS-01 shared overlay theme >> aligns mobile dialog, confirm, Drawer and Select layers with the canonical token
- Location: tests\ui-overlay-theme.spec.ts:188:5

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: locator.fill: Test timeout of 180000ms exceeded.
Call log:
  - waiting for getByRole('dialog', { name: 'Thêm danh mục', exact: true }).getByRole('textbox', { name: 'Tên danh mục', exact: true })

```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | import { readFile } from 'node:fs/promises';
  3   | import path from 'node:path';
  4   | import { fileURLToPath } from 'node:url';
  5   | import { startDemoServer } from './session/demo-server.mjs';
  6   | import { openDemoControls } from './session/demo-controls';
  7   | 
  8   | const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  9   | const tokens = JSON.parse(await readFile(path.join(frontendRoot, 'packages/design-tokens/src/tokens.json'), 'utf8'));
  10  | 
  11  | function computedColor(hex: string) {
  12  |     const channels = hex.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})([\da-f]{2})?$/i);
  13  |     if (!channels) throw new Error(`Unsupported color token: ${hex}`);
  14  |     const red = parseInt(channels[1], 16);
  15  |     const green = parseInt(channels[2], 16);
  16  |     const blue = parseInt(channels[3], 16);
  17  |     if (!channels[4]) return `rgb(${red}, ${green}, ${blue})`;
  18  |     const alpha = Number((parseInt(channels[4], 16) / 255).toFixed(3));
  19  |     return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  20  | }
  21  | 
  22  | const expectedBackdrop = computedColor(tokens.colors.overlay);
  23  | const expectedPaper = computedColor(tokens.colors.surface);
  24  | 
  25  | async function visibleLast(page: Page, selector: string) {
  26  |     const matches = page.locator(selector);
  27  |     for (let index = await matches.count() - 1; index >= 0; index -= 1) {
  28  |         const candidate = matches.nth(index);
  29  |         if (await candidate.isVisible()) return candidate;
  30  |     }
  31  |     throw new Error(`No visible element matched ${selector}`);
  32  | }
  33  | 
  34  | async function expectVisibleBackdrop(page: Page) {
  35  |     const backdrop = await visibleLast(page, '.MuiDialog-root .MuiBackdrop-root:not(.MuiBackdrop-invisible)');
  36  |     await expect(backdrop).toHaveCSS('background-color', expectedBackdrop);
  37  | }
  38  | 
  39  | async function expectDialogPaper(page: Page) {
  40  |     const paper = await visibleLast(page, '.MuiDialog-paper');
  41  |     const dialogRoot = await visibleLast(page, '.MuiDialog-root');
  42  |     await expect(dialogRoot).toHaveCSS('z-index', String(tokens.zIndex.modal));
  43  |     await expect(paper).toHaveCSS('background-color', expectedPaper);
  44  |     await expect(paper).toHaveCSS('border-radius', `${tokens.radius.dialog}px`);
  45  | }
  46  | 
  47  | async function exerciseOverlayConsumers(page: Page, width: 390 | 1440, baseUrl: string) {
  48  |     await page.setViewportSize({ width, height: 900 });
  49  |     await page.goto(new URL('/s/shop-demo/categories', baseUrl).toString());
  50  |     await expect(page.getByRole('heading', { name: 'Danh mục', exact: true })).toBeVisible();
  51  |     const add = page.getByRole('button', { name: 'Thêm danh mục', exact: true });
  52  |     await expect(add).toHaveCSS('background-color', computedColor(tokens.colors.accent));
  53  |     await add.hover();
  54  |     await expect(add).toHaveCSS('background-color', computedColor(tokens.colors.accentHover));
  55  |     await page.mouse.down();
  56  |     await expect(add).toHaveCSS('background-color', computedColor(tokens.colors.accentPressed));
  57  |     await page.mouse.up();
  58  |     const editDialog = page.getByRole('dialog', { name: 'Thêm danh mục', exact: true });
  59  |     await expect(editDialog).toBeVisible();
  60  |     const disabledSave = editDialog.getByRole('button', { name: 'Lưu', exact: true });
  61  |     await expect(disabledSave).toBeDisabled();
  62  |     await expect(disabledSave).toHaveCSS('background-color', computedColor(tokens.colors.raised));
  63  |     await expect(disabledSave).toHaveCSS('color', computedColor(tokens.colors.textPrimary));
  64  |     await expect(disabledSave).toHaveCSS('opacity', '1');
  65  |     await expectVisibleBackdrop(page);
  66  |     await expectDialogPaper(page);
  67  | 
  68  |     await page.mouse.click(8, 8);
  69  |     await expect(editDialog).toBeHidden();
  70  |     await expect(add).toBeFocused();
  71  | 
  72  |     await add.click();
  73  |     const draftDialog = page.getByRole('dialog', { name: 'Thêm danh mục', exact: true });
  74  |     const name = draftDialog.getByRole('textbox', { name: 'Tên', exact: true });
  75  |     await name.fill(`UIC02 draft ${width}`);
  76  |     await page.keyboard.press('Escape');
  77  |     const draftWarning = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true });
  78  |     await expect(draftWarning).toBeVisible();
  79  |     await expectVisibleBackdrop(page);
  80  |     await draftWarning.getByRole('button', { name: 'Tiếp tục sửa', exact: true }).click();
  81  |     await expect(name).toHaveValue(`UIC02 draft ${width}`);
  82  |     await page.keyboard.press('Escape');
  83  |     await page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true }).getByRole('button', { name: 'Bỏ thay đổi', exact: true }).click();
  84  |     await expect(draftDialog).toBeHidden();
  85  |     await expect(add).toBeFocused();
  86  | 
  87  |     await add.click();
  88  |     const successDialog = page.getByRole('dialog', { name: 'Thêm danh mục', exact: true });
> 89  |     await successDialog.getByRole('textbox', { name: 'Tên danh mục', exact: true }).fill(`UIC05 theme ${width}`);
      |                                                                                     ^ Error: locator.fill: Test timeout of 180000ms exceeded.
  90  |     await successDialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  91  |     const successMessage = page.getByRole('status').filter({ hasText: `Đã lưu danh mục “UIC05 theme ${width}”.` });
  92  |     await expect(successMessage).toBeVisible();
  93  |     await expect(successMessage).toHaveCSS('background-color', computedColor(tokens.colors.successSurface));
  94  |     await expect(successMessage).toHaveCSS('color', computedColor(tokens.colors.success));
  95  | 
  96  |     await page.goto(new URL('/s/shop-demo/orders/DH-1001', baseUrl).toString());
  97  |     await expect(page.getByRole('heading', { name: 'Đơn DH-1001', exact: true })).toBeVisible();
  98  |     await page.getByRole('button', { name: 'Hủy đơn', exact: true }).click();
  99  |     const confirmDialog = page.getByRole('dialog', { name: 'Hủy đơn hàng', exact: true });
  100 |     await expect(confirmDialog).toBeVisible();
  101 |     await expectVisibleBackdrop(page);
  102 |     await expectDialogPaper(page);
  103 |     const reason = confirmDialog.getByRole('textbox', { name: /Lý do/ });
  104 |     const confirm = confirmDialog.getByRole('button', { name: 'Hủy đơn hàng', exact: true });
  105 |     await expect(confirm).toBeDisabled();
  106 |     await reason.fill('Lý do kiểm tra UIC02');
  107 |     await expect(confirm).toBeEnabled();
  108 |     await page.keyboard.press('Escape');
  109 |     const confirmDraftWarning = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true });
  110 |     await expect(confirmDraftWarning).toBeVisible();
  111 |     await expectVisibleBackdrop(page);
  112 |     await confirmDraftWarning.getByRole('button', { name: 'Tiếp tục sửa', exact: true }).click();
  113 |     await expect(reason).toHaveValue('Lý do kiểm tra UIC02');
  114 |     await reason.fill('');
  115 |     await confirmDialog.getByRole('button', { name: 'Hủy', exact: true }).click();
  116 |     await expect(confirmDialog).toBeHidden();
  117 | 
  118 |     const surfacePage = await page.context().newPage();
  119 |     await surfacePage.setViewportSize({ width, height: 900 });
  120 |     await surfacePage.goto(new URL('/s/shop-demo/overview', baseUrl).toString());
  121 |     await expect(surfacePage.getByRole('heading', { level: 1 })).toContainText('cửa hàng của bạn hôm nay.');
  122 |     const expectedLayers = Object.fromEntries(Object.entries(tokens.zIndex).map(([name, value]) => [name, String(value)]));
  123 |     const shellLayers = await surfacePage.evaluate(expected => {
  124 |         const root = getComputedStyle(document.documentElement);
  125 |         const header = document.querySelector('header');
  126 |         const skipLink = document.querySelector('.skip-link');
  127 |         if (!header || !skipLink) throw new Error('Không tìm thấy header hoặc skip-link trong app shell.');
  128 |         return {
  129 |             variables: Object.fromEntries(Object.keys(expected).map(name => [name, root.getPropertyValue(`--z-index-${name}`).trim()])),
  130 |             header: getComputedStyle(header).zIndex,
  131 |             skipLink: getComputedStyle(skipLink).zIndex,
  132 |         };
  133 |     }, expectedLayers);
  134 |     expect(shellLayers.variables).toEqual(expectedLayers);
  135 |     expect(shellLayers.header).toBe(String(tokens.zIndex.sticky));
  136 |     expect(shellLayers.skipLink).toBe(String(tokens.zIndex.tooltip));
  137 |     const skipLink = surfacePage.locator('.skip-link');
  138 |     await surfacePage.keyboard.press('Tab');
  139 |     await expect(skipLink).toBeFocused();
  140 |     await expect(skipLink).toHaveCSS('top', '12px');
  141 |     await expect(skipLink).toBeVisible();
  142 |     await surfacePage.keyboard.press('Tab');
  143 |     if (width < 768) {
  144 |         const menuButton = surfacePage.getByRole('button', { name: 'Mở menu', exact: true });
  145 |         await expect(menuButton).toBeVisible();
  146 |         await expect(menuButton).toBeFocused();
  147 |         await surfacePage.keyboard.press('Enter');
  148 |         await expect(await visibleLast(surfacePage, '.MuiDrawer-root')).toHaveCSS('z-index', String(tokens.zIndex.drawer));
  149 |         const drawerBackdrop = await visibleLast(surfacePage, '.MuiDrawer-root .MuiBackdrop-root:not(.MuiBackdrop-invisible)');
  150 |         await expect(drawerBackdrop).toHaveCSS('background-color', expectedBackdrop);
  151 |         await surfacePage.keyboard.press('Escape');
  152 |         await expect(surfacePage.locator('.MuiDrawer-root').last()).toBeHidden();
  153 |         await expect(menuButton).toBeFocused();
  154 |     }
  155 | 
  156 |     if (width >= 768) {
  157 |         const logout = surfacePage.getByRole('button', { name: 'Đăng xuất', exact: true });
  158 |         await logout.focus();
  159 |         const tooltip = surfacePage.getByRole('tooltip', { name: 'Đăng xuất', exact: true });
  160 |         await expect(tooltip).toBeVisible();
  161 |         await expect(await visibleLast(surfacePage, '.MuiTooltip-popper')).toHaveCSS('z-index', String(tokens.zIndex.tooltip));
  162 |     }
  163 | 
  164 |     await openDemoControls(surfacePage);
  165 |     const roleSelect = surfacePage.locator('#mock-tools-controls [role="combobox"]').first();
  166 |     await roleSelect.click();
  167 |     await expect(await visibleLast(surfacePage, '.MuiPopover-root')).toHaveCSS('z-index', String(tokens.zIndex.modal));
  168 |     const selectBackdrop = await visibleLast(surfacePage, '.MuiBackdrop-root.MuiBackdrop-invisible');
  169 |     await expect(selectBackdrop).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  170 |     await surfacePage.keyboard.press('Escape');
  171 |     await expect(surfacePage.getByRole('listbox')).toBeHidden();
  172 |     await expect(roleSelect).toBeFocused();
  173 |     await surfacePage.close();
  174 | }
  175 | 
  176 | test.describe('UI-CONS-01 shared overlay theme', () => {
  177 |     let demoUrl = '';
  178 |     let closeDemo: (() => Promise<void>) | undefined;
  179 | 
  180 |     test.beforeAll(async () => {
  181 |         const demo = await startDemoServer();
  182 |         demoUrl = demo.url;
  183 |         closeDemo = demo.close;
  184 |     });
  185 | 
  186 |     test.afterAll(async () => closeDemo?.());
  187 | 
  188 |     test('aligns mobile dialog, confirm, Drawer and Select layers with the canonical token', async ({ page }) => {
  189 |         await exerciseOverlayConsumers(page, 390, demoUrl);
```