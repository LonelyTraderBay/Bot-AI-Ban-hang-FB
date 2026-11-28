import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';
import { setDemoControl } from './session/demo-controls';

let server: Awaited<ReturnType<typeof startDemoServer>>;
const shopPath = '/s/shop-demo';
const period = 'fromDate=2026-09-01&toDate=2026-10-01';

test.beforeAll(async () => {
    server = await startDemoServer({ cacheIsolationKey: 'ui-comparison-parity' });
});
test.afterAll(async () => server?.close());

test('inventory has six columns and keeps SKU, warehouse and update visible at the right edge', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(server.url + shopPath + '/inventory');
    const table = page.getByRole('region', { name: 'Tồn kho theo vị trí' });
    await expect(table.getByRole('columnheader')).toHaveText(['SKU', 'Thực tế', 'Đã giữ', 'Khả dụng', 'Kho', 'Cập nhật']);
    const geometry = await table.evaluate(element => {
        element.scrollLeft = element.scrollWidth;
        const bounds = element.getBoundingClientRect();
        const firstRow = element.querySelector('tbody tr')!;
        const [sku, warehouse, update] = [0, 4, 5].map(index => firstRow.children[index].getBoundingClientRect());
        return {
            scrollLeft: element.scrollLeft,
            skuInset: sku.left - bounds.left,
            warehouseClearance: warehouse.left - sku.right,
            updateInset: bounds.right - update.right,
        };
    });
    expect(geometry.scrollLeft).toBeGreaterThan(0);
    expect(geometry.skuInset).toBeCloseTo(0, 0);
    expect(geometry.warehouseClearance).toBeGreaterThanOrEqual(-1);
    expect(geometry.updateInset).toBeGreaterThanOrEqual(-1);
    await test.info().attach('inventory-right-edge.json', { body: JSON.stringify(geometry), contentType: 'application/json' });
    const row = table.getByRole('row').filter({ hasText: 'DEMO-001' }).first();
    const sku = row.getByRole('button', { name: 'Xem chi tiết SKU DEMO-001', exact: true });
    const update = await row.getByRole('cell').nth(5).innerText();
    await sku.press('Enter');
    const details = page.getByRole('dialog', { name: 'Chi tiết tồn kho' });
    await expect(details.getByText(update, { exact: true })).toBeVisible();
    await expect(details.getByText('Ngưỡng cảnh báo', { exact: true })).toBeVisible();
    await expect(details.getByText('Giá vốn/đơn vị', { exact: true })).toBeVisible();
    await expect(details.getByRole('button', { name: 'Điều chỉnh', exact: true })).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(sku).toBeFocused();

    const main = page.getByRole('main');
    await main.getByRole('link', { name: 'Sổ cái', exact: true }).click();
    await expect(page).toHaveURL(/\/finance\/ledger$/);
    await main.getByRole('link', { name: 'Tồn kho', exact: true }).click();
    await expect(page).toHaveURL(/\/inventory$/);

    await setDemoControl(page, 'role', 'sales');
    await expect(main.getByRole('link', { name: 'Sổ cái', exact: true })).toHaveCount(0);
    await sku.click();
    await expect(details.getByText('Ngưỡng cảnh báo', { exact: true })).toBeVisible();
    await expect(details.getByText('Giá vốn/đơn vị', { exact: true })).toHaveCount(0);
    await expect(details.getByRole('link', { name: 'Mở sản phẩm', exact: true })).toBeVisible();
    await expect(details.getByRole('button', { name: 'Điều chỉnh', exact: true })).toHaveCount(0);
});

test('ledger fits priority columns, keeps its period and copies raw signed decimal amounts', async ({ page }) => {
    let copied = '';
    const apiAmount = '-1234567890123456789.002500';
    await page.exposeFunction('captureComparisonCopy', (value: string) => { copied = value; });
    await page.addInitScript(amount => {
        const adapter = window as Window & { captureComparisonCopy(value: string): Promise<void> };
        Object.defineProperty(navigator.clipboard, 'writeText', { value: (value: string) => adapter.captureComparisonCopy(value) });
        const fetchResponse = window.fetch.bind(window);
        window.fetch = async (input, init) => {
            const response = await fetchResponse(input, init);
            const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
            if (!response.ok || !url.pathname.endsWith('/finance/ledger')) return response;
            const payload = await response.clone().json();
            if (!payload.data?.entries?.[0]) return response;
            payload.data.entries[0].balance.amount = amount;
            return Response.json(payload, { status: response.status, headers: response.headers });
        };
    }, apiAmount);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(server.url + shopPath + '/finance/ledger?' + period);
    const table = page.getByRole('region', { name: 'Sổ cái theo chứng từ' });
    await expect(table.getByRole('columnheader')).toHaveText(['Ngày', 'Chứng từ', 'Nợ', 'Có', 'Số dư', 'Tài khoản', 'Diễn giải']);
    const checks = [];
    for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 844 });
        await expect.poll(async () => (await table.boundingBox())?.y ?? Infinity).toBeLessThan(450);
        const layout = await table.evaluate(element => {
            const tableBounds = element.getBoundingClientRect();
            return { top: tableBounds.top, right: tableBounds.right, balanceRight: element.querySelectorAll('thead th')[4].getBoundingClientRect().right };
        });
        expect(layout.balanceRight).toBeLessThanOrEqual(layout.right);
        for (const label of [/^Nợ:/, /^Có:/]) {
            const target = (await table.getByRole('button', { name: label }).first().boundingBox())!;
            expect(target.width).toBeGreaterThanOrEqual(44);
            expect(target.height).toBeGreaterThanOrEqual(44);
        }
        checks.push({ width, ...layout });
    }
    await test.info().attach('ledger-priority-columns.json', { body: JSON.stringify(checks), contentType: 'application/json' });
    await page.getByRole('button', { name: 'Kỳ và tài khoản', exact: true }).click();
    const filters = page.getByRole('dialog', { name: 'Kỳ và tài khoản' });
    await expect(filters.getByLabel('Từ ngày', { exact: true })).toHaveValue('2026-09-01');
    await expect(filters.getByLabel('Đến trước ngày', { exact: true })).toHaveValue('2026-10-01');
    await expect(filters.getByRole('combobox', { name: 'Tài khoản sổ cái' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Tổng kỳ', exact: true }).click();
    const totals = page.getByRole('dialog', { name: 'Tổng kỳ' });
    await expect(totals.getByText('Số dư đầu khoảng (Nợ − Có)', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    const cell = table.getByRole('button', { name: /^Số dư:/ }).first();
    await cell.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Số dư' });
    await expect(dialog.getByText(`${apiAmount} VND`, { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Sao chép', exact: true }).click();
    await expect.poll(() => copied).toBe(apiAmount);
    await page.keyboard.press('Escape');
    await expect(cell).toBeFocused();

    await page.getByRole('button', { name: 'Kỳ và tài khoản', exact: true }).click();
    await filters.getByRole('combobox', { name: 'Tài khoản sổ cái' }).click();
    const loaded = page.waitForResponse(response => {
        const request = new URL(response.url());
        return request.pathname.endsWith('/finance/ledger') && request.searchParams.has('accountId');
    });
    await page.getByRole('option', { name: /^111 ·/ }).click();
    const query = new URL((await loaded).url()).searchParams;
    expect(query.get('accountId')).toBe('cash');
    expect(query.get('from')).toBe('2026-08-31T17:00:00.000Z');
    expect(query.get('to')).toBe('2026-09-30T17:00:00.000Z');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('main').getByText(/Tài khoản 111$/)).toBeVisible();
    await setDemoControl(page, 'role', 'accountant');
    await expect(page.getByRole('main').getByRole('link', { name: 'Tồn kho', exact: true })).toHaveCount(0);
    await expect(table).toBeVisible();
});

test('trial balance and balance sheet keep account context and show full amounts on narrow screens', async ({ page }) => {
    const reports = [
        { path: '/finance/trial-balance?' + period, table: 'Cân đối phát sinh các tài khoản', columns: ['Tài khoản', 'Đầu kỳ Nợ', 'Đầu kỳ Có'], amount: 'Đầu kỳ Nợ' },
        { path: '/finance/balance-sheet?atDate=2026-09-30', table: 'Tài khoản của báo cáo cân đối quản trị', columns: ['Tài khoản', 'Số dư theo chiều nhóm', 'Nhóm'], amount: 'Số dư theo chiều nhóm' },
    ];
    await page.setViewportSize({ width: 320, height: 844 });
    for (const report of reports) {
        await page.goto(server.url + shopPath + report.path);
        const table = page.getByRole('region', { name: report.table });
        const headers = table.getByRole('columnheader');
        for (const [index, label] of report.columns.entries()) await expect(headers.nth(index)).toHaveText(label);
        await expect(headers.first()).toHaveCSS('position', 'sticky');
        await expect(table.getByRole('row').nth(1).getByRole('cell').nth(1)).toHaveCSS('text-align', 'right');
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
        await table.focus();
        await table.press('ArrowRight');
        await expect.poll(() => table.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
        const amount = table.getByRole('button', { name: new RegExp(`^${report.amount}:`) }).first();
        await amount.press('Enter');
        const value = page.getByRole('dialog', { name: report.amount, exact: true });
        await expect(value.getByText(/^-?\d+(?:\.\d+)? VND$/)).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(amount).toBeFocused();
    }
});
