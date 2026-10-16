import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDemoServer } from './session/demo-server.mjs';
import { openDemoControls } from './session/demo-controls';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(await readFile(path.join(frontendRoot, 'packages/design-tokens/src/tokens.json'), 'utf8'));

function computedColor(hex: string) {
    const channels = hex.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})([\da-f]{2})?$/i);
    if (!channels) throw new Error(`Unsupported color token: ${hex}`);
    const red = parseInt(channels[1], 16);
    const green = parseInt(channels[2], 16);
    const blue = parseInt(channels[3], 16);
    if (!channels[4]) return `rgb(${red}, ${green}, ${blue})`;
    const alpha = Number((parseInt(channels[4], 16) / 255).toFixed(3));
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

const expectedBackdrop = computedColor(tokens.colors.overlay);
const expectedPaper = computedColor(tokens.colors.surface);

async function visibleLast(page: Page, selector: string) {
    const matches = page.locator(selector);
    for (let index = await matches.count() - 1; index >= 0; index -= 1) {
        const candidate = matches.nth(index);
        if (await candidate.isVisible()) return candidate;
    }
    throw new Error(`No visible element matched ${selector}`);
}

async function expectVisibleBackdrop(page: Page) {
    const backdrop = await visibleLast(page, '.MuiDialog-root .MuiBackdrop-root:not(.MuiBackdrop-invisible)');
    await expect(backdrop).toHaveCSS('background-color', expectedBackdrop);
}

async function expectDialogPaper(page: Page) {
    const paper = await visibleLast(page, '.MuiDialog-paper');
    await expect(paper).toHaveCSS('background-color', expectedPaper);
    await expect(paper).toHaveCSS('border-radius', `${tokens.radius.dialog}px`);
}

async function exerciseOverlayConsumers(page: Page, width: 390 | 1440, baseUrl: string) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(new URL('/s/shop-demo/categories', baseUrl).toString());
    await expect(page.getByRole('heading', { name: 'Danh mục', exact: true })).toBeVisible();
    const add = page.getByRole('button', { name: 'Thêm danh mục', exact: true });
    await add.click();
    const editDialog = page.getByRole('dialog', { name: 'Thêm danh mục', exact: true });
    await expect(editDialog).toBeVisible();
    await expectVisibleBackdrop(page);
    await expectDialogPaper(page);

    await page.mouse.click(8, 8);
    await expect(editDialog).toBeHidden();
    await expect(add).toBeFocused();

    await add.click();
    const draftDialog = page.getByRole('dialog', { name: 'Thêm danh mục', exact: true });
    const name = draftDialog.getByRole('textbox', { name: 'Tên', exact: true });
    await name.fill(`UIC02 draft ${width}`);
    await page.keyboard.press('Escape');
    const draftWarning = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true });
    await expect(draftWarning).toBeVisible();
    await expectVisibleBackdrop(page);
    await draftWarning.getByRole('button', { name: 'Tiếp tục sửa', exact: true }).click();
    await expect(name).toHaveValue(`UIC02 draft ${width}`);
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true }).getByRole('button', { name: 'Bỏ thay đổi', exact: true }).click();
    await expect(draftDialog).toBeHidden();
    await expect(add).toBeFocused();

    await page.goto(new URL('/s/shop-demo/orders/DH-1001', baseUrl).toString());
    await expect(page.getByRole('heading', { name: 'Đơn DH-1001', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Hủy đơn', exact: true }).click();
    const confirmDialog = page.getByRole('dialog', { name: 'Hủy đơn hàng', exact: true });
    await expect(confirmDialog).toBeVisible();
    await expectVisibleBackdrop(page);
    await expectDialogPaper(page);
    const reason = confirmDialog.getByRole('textbox', { name: /Lý do/ });
    const confirm = confirmDialog.getByRole('button', { name: 'Hủy đơn hàng', exact: true });
    await expect(confirm).toBeDisabled();
    await reason.fill('Lý do kiểm tra UIC02');
    await expect(confirm).toBeEnabled();
    await page.keyboard.press('Escape');
    const confirmDraftWarning = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true });
    await expect(confirmDraftWarning).toBeVisible();
    await expectVisibleBackdrop(page);
    await confirmDraftWarning.getByRole('button', { name: 'Tiếp tục sửa', exact: true }).click();
    await expect(reason).toHaveValue('Lý do kiểm tra UIC02');
    await reason.fill('');
    await confirmDialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    await expect(confirmDialog).toBeHidden();

    const surfacePage = await page.context().newPage();
    await surfacePage.setViewportSize({ width, height: 900 });
    await surfacePage.goto(new URL('/s/shop-demo/overview', baseUrl).toString());
    if (width < 768) {
        const menuButton = surfacePage.getByRole('button', { name: 'Mở menu', exact: true });
        await expect(menuButton).toBeVisible();
        await menuButton.click();
        const drawerBackdrop = await visibleLast(surfacePage, '.MuiDrawer-root .MuiBackdrop-root:not(.MuiBackdrop-invisible)');
        await expect(drawerBackdrop).toHaveCSS('background-color', expectedBackdrop);
        await surfacePage.keyboard.press('Escape');
        await expect(surfacePage.locator('.MuiDrawer-root').last()).toBeHidden();
        await expect(menuButton).toBeFocused();
    }

    await openDemoControls(surfacePage);
    const roleSelect = surfacePage.locator('#mock-tools-controls [role="combobox"]').first();
    await roleSelect.click();
    const selectBackdrop = await visibleLast(surfacePage, '.MuiBackdrop-root.MuiBackdrop-invisible');
    await expect(selectBackdrop).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await surfacePage.keyboard.press('Escape');
    await expect(surfacePage.getByRole('listbox')).toBeHidden();
    await expect(roleSelect).toBeFocused();
    await surfacePage.close();
}

test.describe('UI-CONS-01 shared overlay theme', () => {
    let demoUrl = '';
    let closeDemo: (() => Promise<void>) | undefined;

    test.beforeAll(async () => {
        const demo = await startDemoServer();
        demoUrl = demo.url;
        closeDemo = demo.close;
    });

    test.afterAll(async () => closeDemo?.());

    test('aligns mobile dialog, confirm, Drawer and Select layers with the canonical token', async ({ page }) => {
        await exerciseOverlayConsumers(page, 390, demoUrl);
    });

    test('aligns desktop dialog and Select layers with the canonical token', async ({ page }) => {
        await exerciseOverlayConsumers(page, 1440, demoUrl);
    });
});
