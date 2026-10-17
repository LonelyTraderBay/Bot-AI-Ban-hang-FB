import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox } from '@playwright/test';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Usage: node capture-uic02.mjs before|after');
const frontendRoot = path.resolve(here, '../../..');
const repoRoot = path.resolve(frontendRoot, '..');
const tokens = JSON.parse(await readFile(path.join(frontendRoot, 'packages/design-tokens/src/tokens.json'), 'utf8'));
const headSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
const sourceThemeSha256 = createHash('sha256').update(await readFile(path.join(frontendRoot, 'apps/web/src/shared/ui/theme.ts'))).digest('hex');
const hex = tokens.colors.overlay;
const rgba = hex.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
if (!rgba) throw new Error(`Expected an 8-digit overlay token, received ${hex}`);
const expected = `rgba(${parseInt(rgba[1], 16)}, ${parseInt(rgba[2], 16)}, ${parseInt(rgba[3], 16)}, ${Number((parseInt(rgba[4], 16) / 255).toFixed(3))})`;
const output = { phase, headSha, sourceThemeSha256, capturedAt: new Date().toISOString(), nodeVersion: process.version, viewport: { widths: [390, 1440], height: 900 }, token: hex, expectedComputedColor: expected, browsers: [] };
const demo = await startDemoServer();
await mkdir(here, { recursive: true });

async function activeBackdrop(page, selector) {
    const backdrops = page.locator(selector);
    for (let index = await backdrops.count() - 1; index >= 0; index -= 1) {
        const candidate = backdrops.nth(index);
        if (await candidate.isVisible()) {
            await candidate.evaluate(async element => { await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => undefined))); });
            return candidate;
        }
    }
    throw new Error(`No visible backdrop matched ${selector}`);
}

async function styleOf(page, backdropSelector, paperSelector) {
    const backdrop = await activeBackdrop(page, backdropSelector);
    const backdropStyle = await backdrop.evaluate(element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return { className: element.className, backgroundColor: style.backgroundColor, opacity: style.opacity, pointerEvents: style.pointerEvents, width: rect.width, height: rect.height };
    });
    let paper = null;
    if (paperSelector) {
        paper = await page.locator(paperSelector).last().evaluate(element => {
            const style = getComputedStyle(element);
            return { backgroundColor: style.backgroundColor, borderRadius: style.borderRadius, borderColor: style.borderColor };
        });
    }
    return { backdrop: backdropStyle, paper };
}

async function screenshot(page, browserName, width, label) {
    if (browserName === 'chrome') await page.screenshot({ path: path.join(here, `${phase}-${browserName}-${width}-${label}.png`), fullPage: false, animations: 'disabled' });
}

async function runBrowser(browserName, launcher) {
    const browser = await launcher.launch({ headless: true, ...(browserName === 'chrome' ? { channel: 'chrome' } : {}) });
    const browserResult = { name: browserName, version: browser.version(), widths: [] };
    try {
        for (const width of [390, 1440]) {
            const context = await browser.newContext({ viewport: { width, height: 900 } });
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            const viewportResult = { width, observations: {}, interactions: {}, pageErrors: errors };

            await page.goto(new URL('/s/shop-demo/categories', demo.url).toString());
            await page.getByRole('heading', { name: 'Danh mục', exact: true }).waitFor({ state: 'visible' });
            const add = page.getByRole('button', { name: 'Thêm danh mục', exact: true });
            await add.click();
            let editDialog = page.getByRole('dialog', { name: 'Thêm danh mục', exact: true });
            await editDialog.waitFor({ state: 'visible' });
            viewportResult.observations.editDialog = await styleOf(page, '.MuiDialog-root .MuiBackdrop-root:not(.MuiBackdrop-invisible)', '.MuiDialog-paper');
            await screenshot(page, browserName, width, 'edit-dialog');
            await activeBackdrop(page, '.MuiDialog-root .MuiBackdrop-root:not(.MuiBackdrop-invisible)');
            const dialogBox = await editDialog.boundingBox();
            const viewport = page.viewportSize();
            const outsidePoint = { x: Math.min(8, (viewport?.width || width) - 1), y: Math.min(8, (viewport?.height || 900) - 1) };
            const insideDialog = dialogBox && outsidePoint.x >= dialogBox.x && outsidePoint.x <= dialogBox.x + dialogBox.width && outsidePoint.y >= dialogBox.y && outsidePoint.y <= dialogBox.y + dialogBox.height;
            if (insideDialog) throw new Error(`Outside click point was inside the dialog at width ${width}`);
            await page.mouse.click(outsidePoint.x, outsidePoint.y);
            await editDialog.waitFor({ state: 'hidden' });
            viewportResult.interactions.cleanBackdropClosesDialog = true;
            viewportResult.interactions.focusReturnsAfterBackdropClose = await add.evaluate(element => document.activeElement === element);

            await add.click();
            editDialog = page.getByRole('dialog', { name: 'Thêm danh mục', exact: true });
            await editDialog.waitFor({ state: 'visible' });
            const name = editDialog.getByRole('textbox', { name: 'Tên', exact: true });
            await name.fill(`UIC02 draft ${width}`);
            await page.keyboard.press('Escape');
            const draftWarning = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true });
            await draftWarning.waitFor({ state: 'visible' });
            viewportResult.observations.draftWarning = await styleOf(page, '.MuiDialog-root .MuiBackdrop-root:not(.MuiBackdrop-invisible)', '.MuiDialog-paper');
            viewportResult.interactions.draftWarningHasOwnModal = true;
            await draftWarning.getByRole('button', { name: 'Tiếp tục sửa', exact: true }).click();
            viewportResult.interactions.draftSurvivesContinue = await name.inputValue() === `UIC02 draft ${width}`;
            await page.keyboard.press('Escape');
            await page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true }).getByRole('button', { name: 'Bỏ thay đổi', exact: true }).click();
            await editDialog.waitFor({ state: 'hidden' });
            viewportResult.interactions.discardClosesDialog = true;
            viewportResult.interactions.focusReturnsAfterDiscard = await add.evaluate(element => document.activeElement === element);

            await page.goto(new URL('/s/shop-demo/orders/DH-1001', demo.url).toString());
            await page.getByRole('heading', { name: 'Đơn DH-1001', exact: true }).waitFor({ state: 'visible' });
            await page.getByRole('button', { name: 'Hủy đơn', exact: true }).click();
            const confirmDialog = page.getByRole('dialog', { name: 'Hủy đơn hàng', exact: true });
            await confirmDialog.waitFor({ state: 'visible' });
            viewportResult.observations.confirmDialog = await styleOf(page, '.MuiDialog-root .MuiBackdrop-root:not(.MuiBackdrop-invisible)', '.MuiDialog-paper');
            await screenshot(page, browserName, width, 'confirm-dialog');
            const reason = confirmDialog.getByRole('textbox', { name: /Lý do/ });
            const confirm = confirmDialog.getByRole('button', { name: 'Hủy đơn hàng', exact: true });
            viewportResult.interactions.destructiveSubmitInitiallyDisabled = await confirm.isDisabled();
            await reason.fill('Lý do kiểm tra UIC02');
            viewportResult.interactions.destructiveSubmitEnablesWithReason = await confirm.isEnabled();
            await page.keyboard.press('Escape');
            const confirmDraftWarning = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true });
            await confirmDraftWarning.waitFor({ state: 'visible' });
            viewportResult.observations.confirmDraftWarning = await styleOf(page, '.MuiDialog-root .MuiBackdrop-root:not(.MuiBackdrop-invisible)', '.MuiDialog-paper');
            await confirmDraftWarning.getByRole('button', { name: 'Tiếp tục sửa', exact: true }).click();
            viewportResult.interactions.destructiveReasonSurvivesContinue = await reason.inputValue() === 'Lý do kiểm tra UIC02';
            await reason.fill('');
            await confirmDialog.getByRole('button', { name: 'Hủy', exact: true }).click();
            await confirmDialog.waitFor({ state: 'hidden' });
            viewportResult.interactions.destructiveDialogCanBeDismissedWithoutSubmit = true;

            const surfacePage = await context.newPage();
            surfacePage.on('pageerror', error => errors.push(error.message));
            await surfacePage.goto(new URL('/s/shop-demo/overview', demo.url).toString());
            const demoControlToggle = surfacePage.locator('button[aria-controls="mock-tools-controls"]');
            await demoControlToggle.waitFor({ state: 'visible' });

            if (width < 768) {
                const menuButton = surfacePage.locator('button[aria-label="Mở menu"]');
                await menuButton.waitFor({ state: 'visible' });
                await menuButton.click();
                const drawer = surfacePage.locator('.MuiDrawer-root').filter({ has: surfacePage.locator('.MuiDrawer-paper') }).last();
                await drawer.waitFor({ state: 'visible' });
                viewportResult.observations.mobileDrawer = await styleOf(surfacePage, '.MuiDrawer-root .MuiBackdrop-root:not(.MuiBackdrop-invisible)', '.MuiDrawer-paper');
                await screenshot(surfacePage, browserName, width, 'mobile-drawer');
                await surfacePage.keyboard.press('Escape');
                await drawer.waitFor({ state: 'hidden' });
                viewportResult.interactions.drawerClosesOnEscape = true;
                viewportResult.interactions.focusReturnsAfterDrawerClose = await menuButton.evaluate(element => document.activeElement === element);
            }

            if (await demoControlToggle.getAttribute('aria-expanded') !== 'true') await demoControlToggle.click();
            const roleSelect = surfacePage.locator('#mock-tools-controls [role="combobox"]').first();
            await roleSelect.waitFor({ state: 'visible' });
            await roleSelect.click();
            const menuBackdrop = await activeBackdrop(surfacePage, '.MuiBackdrop-root.MuiBackdrop-invisible');
            viewportResult.observations.selectMenu = await menuBackdrop.evaluate(element => {
                const style = getComputedStyle(element);
                return { className: element.className, backgroundColor: style.backgroundColor, opacity: style.opacity, pointerEvents: style.pointerEvents };
            });
            await screenshot(surfacePage, browserName, width, 'select-menu');
            await surfacePage.keyboard.press('Escape');
            await surfacePage.getByRole('listbox').waitFor({ state: 'hidden' });
            viewportResult.interactions.selectMenuClosesOnEscape = true;
            viewportResult.interactions.focusReturnsAfterMenuClose = await roleSelect.evaluate(element => document.activeElement === element);

            viewportResult.pageErrors = [...errors];
            browserResult.widths.push(viewportResult);
            await surfacePage.close();
            await context.close();
        }
    } finally {
        await browser.close();
    }
    output.browsers.push(browserResult);
}

try {
    await runBrowser('chrome', chromium);
    await runBrowser('firefox', firefox);
} finally {
    await demo.close();
}

for (const browser of output.browsers) for (const viewport of browser.widths) {
    viewport.checks = {};
    for (const [name, observation] of Object.entries(viewport.observations)) {
        const actual = observation.backdrop?.backgroundColor ?? observation.backgroundColor;
        viewport.checks[`${name}TokenParity`] = actual === expected;
        if (name === 'selectMenu') viewport.checks[`${name}RemainsTransparent`] = actual === 'rgba(0, 0, 0, 0)';
    }
}

await writeFile(path.join(here, `${phase}.json`), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ phase, token: hex, expectedComputedColor: expected, browsers: output.browsers.map(browser => ({ name: browser.name, version: browser.version, widths: browser.widths.map(viewport => ({ width: viewport.width, checks: viewport.checks, interactions: viewport.interactions, pageErrors: viewport.pageErrors })) })) }, null, 2));
