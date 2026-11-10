import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { startDemoServer } from './session/demo-server.mjs';

let url = '';
let close: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer(); url = server.url; close = server.close; });
test.afterAll(async () => close?.());

async function openHeader(page: Page, width = 1440) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.goto(`${url}/s/shop-demo/shipments`);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('header [aria-label="Dữ liệu mô phỏng"]')).toBeVisible();
}

test('header centers content across responsive breakpoints and preserves touch targets', async ({ page }) => {
    for (const width of [320, 390, 767, 768, 1199, 1200, 1440, 1920]) {
        await openHeader(page, width);
        const metrics = await page.locator('header').evaluate(header => {
            const h = header.getBoundingClientRect(), row = header.firstElementChild!.getBoundingClientRect();
            const controls = [...header.querySelectorAll('.MuiIconButton-root')].filter(element => element.getBoundingClientRect().width > 0);
            return {
                centerOffset: row.top + row.height / 2 - (h.top + h.height / 2),
                height: h.height,
                overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                targets: controls.map(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })),
                controlsFit: controls.every(element => {
                    const r = element.getBoundingClientRect();
                    return r.top >= h.top && r.bottom <= h.bottom && r.left >= h.left && r.right <= h.right;
                }),
            };
        });
        expect(Math.abs(metrics.centerOffset), `vertical center at ${width}px`).toBeLessThanOrEqual(0.5);
        expect(metrics.height).toBeGreaterThanOrEqual(width < 768 ? 56 : 64);
        expect(metrics.overflow).toBe(0);
        expect(metrics.controlsFit).toBe(true);
        expect(metrics.targets.length).toBeGreaterThan(0);
        for (const target of metrics.targets) {
            expect(target.width).toBeGreaterThanOrEqual(44);
            expect(target.height).toBeGreaterThanOrEqual(44);
        }
        await expect(page.getByRole('textbox', { name: 'Tìm trong menu', exact: true })).toBeVisible({ visible: width >= 768 });
    }
});

test('header breadcrumb identifies the current shop and supports keyboard navigation', async ({ page }) => {
    await openHeader(page);
    const breadcrumb = page.getByRole('navigation', { name: 'Đường dẫn hiện tại' });
    const shop = breadcrumb.getByRole('link', { name: 'Joker Studio · Shop mẫu', exact: true });
    await expect(shop).toHaveAttribute('href', '/workspaces');
    await expect(breadcrumb.locator('[aria-current="page"]')).toContainText('Vận đơn');
    await shop.focus();
    await expect(shop).toBeFocused();
    await shop.press('Enter');
    await expect(page).toHaveURL(/\/workspaces$/);
    await page.goBack();
    const notification = page.locator('header').getByRole('link', { name: 'Thông báo', exact: true });
    await expect(notification).toHaveAttribute('href', '/s/shop-demo/notifications');
    await notification.focus();
    await notification.press('Enter');
    await expect(page).toHaveURL(/\/notifications$/);
    await expect(page.locator('main h1')).toBeVisible();
});

test('header menu filter retains empty-state recovery and keyboard focus', async ({ page }) => {
    await openHeader(page);
    const search = page.getByRole('textbox', { name: 'Tìm trong menu', exact: true });
    await expect(search).toHaveAttribute('placeholder', 'Tìm trong menu');
    await search.fill('không-có-màn-hình-này');
    await expect(page.getByText('Không tìm thấy màn hình phù hợp.', { exact: true })).toBeVisible();
    const clear = page.getByRole('button', { name: 'Xóa bộ lọc menu', exact: true });
    await clear.focus();
    await clear.press('Enter');
    await expect(search).toHaveValue('');
    await expect(search).toBeFocused();
    await search.fill('Tồn kho');
    const navigation = page.getByRole('navigation', { name: 'Điều hướng chính', exact: true });
    await expect(navigation.getByRole('link', { name: 'Tồn kho', exact: true })).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Đơn hàng', exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(/\/shipments$/);
});

for (const width of [320, 390]) {
    test(`header preserves demo disclosure, mobile menu and filter recovery at ${width}px`, async ({ page }) => {
        await openHeader(page);
        await page.getByRole('textbox', { name: 'Tìm trong menu', exact: true }).fill('không-có-màn-hình-này');
        await page.setViewportSize({ width, height: 844 });
        await expect(page.locator('header [aria-label="Dữ liệu mô phỏng"]')).toContainText('Demo');
        const menu = page.getByRole('button', { name: 'Mở menu', exact: true });
        await menu.click();
        const navigation = page.getByRole('navigation', { name: 'Điều hướng chính', exact: true }).filter({ visible: true });
        await navigation.getByRole('button', { name: 'Xóa tìm kiếm', exact: true }).click();
        await expect(navigation.getByRole('link', { name: 'Vận đơn & giao hàng', exact: true })).toHaveAttribute('aria-current', 'page');
        await expect(navigation).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(navigation).toBeHidden();
        await expect(menu).toBeFocused();
        expect((await new AxeBuilder({ page }).include('header').analyze()).violations).toEqual([]);
    });
}

test('header reflows long shop names and doubled text without overlap or clipping', async ({ page }) => {
    await openHeader(page);
    await page.locator('header').evaluate(header => {
        const shop = header.querySelector('nav a')!;
        shop.textContent = 'Cửa hàng Nguyễn Thị Minh Châu — Chi nhánh thành phố ' + 'TênCửaHàngRấtDài'.repeat(8);
        const texts = header.querySelectorAll<HTMLElement>('nav a, nav [aria-current], input, .MuiChip-root');
        for (const element of texts) element.style.fontSize = `${Number.parseFloat(getComputedStyle(element).fontSize) * 2}px`;
    });
    for (const width of [768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const metrics = await page.locator('header').evaluate(header => {
            const h = header.getBoundingClientRect();
            const breadcrumb = header.querySelector('nav')!.getBoundingClientRect();
            const tools = header.querySelector('input')!.closest('.MuiStack-root')!.getBoundingClientRect();
            const mode = header.querySelector('.MuiChip-root')!.getBoundingClientRect();
            const modeText = header.querySelector('.MuiChip-label')!.getBoundingClientRect();
            return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                separated: breadcrumb.right <= tools.left,
                contained: breadcrumb.top >= h.top && breadcrumb.bottom <= h.bottom && tools.bottom <= h.bottom,
                modeFits: modeText.height <= mode.height };
        });
        expect(metrics).toEqual({ overflow: 0, separated: true, contained: true, modeFits: true });
    }
    expect((await new AxeBuilder({ page }).include('header').analyze()).violations).toEqual([]);
});
