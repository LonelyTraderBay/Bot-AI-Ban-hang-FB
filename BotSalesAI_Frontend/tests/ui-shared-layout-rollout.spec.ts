import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let origin: string;
let close: () => Promise<void>;
type DraftSavePage = Window & { releaseOrderDraftSave?: () => void };
test.beforeAll(async () => {
    const server = await startDemoServer();
    origin = server.url;
    close = server.close;
});
test.afterAll(async () => close?.());

test('operational headers use the prototype type scale and compact dialogs preserve the title', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(origin + '/s/shop-demo/orders');
    const heading = page.getByRole('heading', { name: 'Đơn hàng', exact: true });
    await expect(heading).toHaveCSS('font-size', '22px');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(heading).toHaveCSS('font-size', '20px');
    const filter = page.getByRole('button', { name: 'Bộ lọc', exact: true });
    await filter.click();
    const dialog = page.getByRole('dialog', { name: 'Bộ lọc đơn hàng' });
    await expect(dialog).toBeVisible();
    await expect.poll(async () => Math.round((await dialog.boundingBox())!.width)).toBe(358);
    await page.keyboard.press('Escape');
    await expect(filter).toBeFocused();
});

test('the overview fits the activity and cash strip in the first phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + '/s/shop-demo/overview');
    const activity = page.getByRole('heading', { name: 'Tình hình hiện tại', exact: true });
    const pending = page.getByRole('heading', { name: 'Đơn chờ', exact: true });
    const cash = page.getByRole('heading', { name: 'Dòng tiền và doanh thu', exact: true });
    await expect(page.getByText('Doanh thu đã ghi nhận', { exact: true })).toBeVisible();
    expect((await activity.boundingBox())!.y).toBeLessThan((await pending.boundingBox())!.y);
    expect((await pending.boundingBox())!.y).toBeLessThan((await cash.boundingBox())!.y);
    await expect(cash).toBeInViewport();
});

test('desktop navigation collapses to named icon controls and preserves the content edge', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(origin + '/s/shop-demo/overview');
    const nav = page.getByRole('navigation', { name: 'Điều hướng chính' });
    await expect(nav).toBeVisible();
    await page.getByRole('button', { name: 'Thu gọn menu' }).press('Enter');
    const width = () => nav.evaluate(element => element.getBoundingClientRect().width);
    await expect.poll(width).toBeLessThanOrEqual(64);
    await expect(nav.getByRole('link', { name: 'Hộp thư khách hàng' })).toBeVisible();
    await expect(page.locator('main#main-content')).toHaveCSS('padding-left', '8px');
    await page.getByRole('button', { name: 'Mở rộng menu' }).press('Enter');
    await expect.poll(width).toBeGreaterThan(230);
});

test('the inbox draft opener fits its content before expanding into the editor', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(origin + '/s/shop-demo/inbox/cv1');
    const draft = page.getByRole('complementary', { name: 'Đơn đang nhập' });
    const create = draft.getByRole('button', { name: 'Tạo đơn', exact: true });
    for (const width of [1440, 705, 390]) {
        await page.setViewportSize({ width, height: 900 });
        if (width === 705) await page.getByRole('tab', { name: 'Đơn đang nhập', exact: true }).click();
        await expect(create).toBeEnabled();
        const { button, card, face } = await create.evaluate(element => ({
            button: element.getBoundingClientRect().toJSON(),
            card: element.closest('[data-ui-density]')!.getBoundingClientRect().toJSON(),
            face: getComputedStyle(element, '::before').insetBlockStart,
        }));
        expect(button.width).toBeLessThan(card.width / 2);
        expect(button.height).toBe(44);
        expect(face).toBe('6px');
        const inset = card.bottom - button.bottom;
        expect(inset).toBeGreaterThanOrEqual(8);
        expect(inset).toBeLessThan(20);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await create.press('Enter');
    const notes = draft.getByRole('textbox', { name: 'Ghi chú giao hàng' });
    await expect(notes).toBeEditable();
    await expect(draft.getByText('Tạm tính tiền hàng', { exact: true })).toBeVisible();
    await expect(page.getByTestId('inbox-thread')).toBeVisible();
    await expect.poll(() => create.evaluate(element => {
        const footer = element.closest('[data-ui-density]')?.getBoundingClientRect();
        const thread = element.ownerDocument.querySelector('[data-testid="inbox-thread"]')?.getBoundingClientRect();
        if (!footer?.height || !thread?.height) return Number.POSITIVE_INFINITY;
        return Math.abs(footer.bottom - thread.bottom);
    })).toBeLessThan(0.5);
});

test('the inbox claims once then keeps the saved draft when returning from messages', async ({ page }) => {
    await page.setViewportSize({ width: 705, height: 811 });
    await page.goto(origin + '/s/shop-demo/inbox/cv1');
    const draft = page.getByRole('complementary', { name: 'Đơn đang nhập' });
    const inbox = page.getByRole('region', { name: 'Lịch sử tin nhắn' });
    await expect(inbox).toBeVisible();
    const claim = page.waitForResponse(response => response.url().endsWith('/order-draft/access') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Tạo đơn', exact: true }).click();
    expect((await claim).status()).toBe(200);
    const notes = draft.getByRole('textbox', { name: 'Ghi chú giao hàng' });
    await expect(notes).toBeEditable();
    await notes.fill('Giao sau 17 giờ');
    await expect(draft.getByRole('status').filter({ hasText: /^Đã lưu$/ })).toBeVisible();
    for (const width of [705, 390]) {
        await page.setViewportSize({ width, height: 844 });
        await page.getByRole('tab', { name: 'Tin nhắn', exact: true }).click();
        await expect(inbox).toBeVisible();
        const box = await page.getByTestId('inbox-composer-body').boundingBox();
        expect(box && box.y + box.height).toBeLessThan(844);
        await page.getByRole('tab', { name: 'Đơn đang nhập', exact: true }).click();
        await expect(notes).toHaveValue('Giao sau 17 giờ');
        await expect(page.locator('main#main-content')).toHaveCSS('padding-bottom', '8px');
    }
    await page.evaluate(() => {
        const originalFetch = window.fetch.bind(window);
        window.fetch = async (input, init) => {
            const response = await originalFetch(input, init);
            if (init?.method === 'PATCH' && response.url.includes('/order-draft/')) {
                await new Promise<void>(resolve => { (window as DraftSavePage).releaseOrderDraftSave = resolve; });
            }
            return response;
        };
    });
    await notes.fill('Giao sau 18 giờ');
    await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Đơn hàng', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Đang lưu bản đang nhập…' })).toBeVisible();
    await page.waitForFunction(() => typeof (window as DraftSavePage).releaseOrderDraftSave === 'function');
    await page.evaluate(() => (window as DraftSavePage).releaseOrderDraftSave?.());
    await expect(page).toHaveURL(/\/orders$/);
    await page.getByRole('tab', { name: 'Đang nhập', exact: true }).click();
    const saved = page.getByRole('region', { name: 'Đơn đang nhập', exact: true });
    await expect(saved.getByRole('link', { name: 'Mở hội thoại' })).toHaveAttribute('href', '/s/shop-demo/inbox/cv1?view=order-draft');
    await saved.getByRole('link', { name: 'Mở hội thoại' }).click();
    await expect(notes).toHaveValue('Giao sau 18 giờ');
});

test('stock keeps the first column pinned and discloses horizontal scrolling only when needed', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + '/s/shop-demo/inventory');
    const region = page.getByRole('region', { name: 'Tồn kho theo vị trí' });
    await expect(region.getByRole('columnheader').nth(0)).toHaveText('SKU');
    await expect(region.getByRole('columnheader').nth(3)).toHaveText('Khả dụng');
    await expect(region.getByRole('columnheader').nth(4)).toHaveText('Kho');
    await expect(region.getByRole('columnheader').nth(5)).toHaveText('Cập nhật');
    for (const column of [1, 2, 3]) {
        await expect(region.getByRole('columnheader').nth(column)).toHaveCSS('text-align', 'right');
        await expect(region.getByRole('row').nth(1).getByRole('cell').nth(column)).toHaveCSS('text-align', 'right');
    }
    const gap = await region.getByRole('row').nth(1).getByRole('cell').evaluateAll(cells => {
        const available = getComputedStyle(cells[3]);
        const warehouse = getComputedStyle(cells[4]);
        return parseFloat(available.paddingRight) + parseFloat(warehouse.paddingLeft);
    });
    expect(gap).toBe(12);
    await expect(page.getByText('Cuộn ngang để xem đủ cột.')).toBeVisible();
    const geometry = await region.evaluate(element => {
        const cell = element.querySelector('th')!;
        const before = cell.getBoundingClientRect().left;
        element.scrollLeft = 250;
        return { before, after: cell.getBoundingClientRect().left, scrollLeft: element.scrollLeft };
    });
    expect(geometry.scrollLeft).toBeGreaterThan(0);
    expect(geometry.after).toBeCloseTo(geometry.before, 0);
    const filters = page.getByRole('button', { name: 'Bộ lọc', exact: true });
    await filters.click();
    const popup = page.getByRole('dialog', { name: 'Bộ lọc tồn kho' });
    await popup.getByRole('combobox', { name: 'Kho' }).click();
    await page.getByRole('option', { name: /Kho chính/ }).first().click();
    await popup.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
    await expect(page).toHaveURL(url => url.searchParams.get('warehouseId') === 'warehouse-01');
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByText('Cuộn ngang để xem đủ cột.')).toHaveCount(0);
});

test('order filters use a dialog and the primary action keeps a 44px target', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + '/s/shop-demo/orders');
    const create = page.getByRole('button', { name: 'Tạo đơn hàng', exact: true });
    await expect(create).toBeVisible();
    const size = await create.evaluate(element => {
        const face = getComputedStyle(element, '::before');
        return { target: element.getBoundingClientRect().height, top: face.insetBlockStart, bottom: face.insetBlockEnd };
    });
    expect(size).toEqual({ target: 44, top: '6px', bottom: '6px' });
    const button = page.getByRole('button', { name: 'Bộ lọc', exact: true });
    await button.click();
    const popup = page.getByRole('dialog', { name: 'Bộ lọc đơn hàng' });
    await expect(popup).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    await expect(button).toBeFocused();
});

test('ledger exposes a complete document code and copies its source value', async ({ page }) => {
    let copied = '';
    await page.exposeFunction('captureLedgerCopy', (value: string) => { copied = value; });
    await page.addInitScript(() => {
        const adapter = window as Window & { captureLedgerCopy: (value: string) => Promise<void> };
        Object.defineProperty(navigator.clipboard, 'writeText', { value: (value: string) => adapter.captureLedgerCopy(value) });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + '/s/shop-demo/finance/ledger?fromDate=2026-09-29&toDate=2026-09-30');
    const ledger = page.getByRole('region', { name: 'Sổ cái theo chứng từ' });
    await expect(ledger.getByRole('columnheader').nth(1)).toHaveText('Chứng từ');
    await expect(ledger.getByRole('columnheader').nth(4)).toHaveText('Số dư');
    const field = ledger.getByRole('button', { name: /^Mã chứng từ:/ }).first();
    await field.click();
    const dialog = page.getByRole('dialog', { name: 'Mã chứng từ' });
    await expect(dialog).toBeVisible();
    const code = await dialog.getByText(/^seed-journal-/).innerText();
    await dialog.getByRole('button', { name: 'Sao chép', exact: true }).click();
    await expect.poll(() => copied).toBe(code);
    await page.keyboard.press('Escape');
    await expect(field).toBeFocused();
});
