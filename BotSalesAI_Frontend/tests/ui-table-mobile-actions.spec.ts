import { test, expect } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

const samples = [
    ['finance/entries', 'Chứng từ thu chi', 'Chi tiết', 'Chứng từ', 'Diễn giải'],
    ['suppliers', 'Nhà cung cấp', 'Sửa', 'Cập nhật nhà cung cấp', 'Thanh toán'],
    ['finance/journals', 'Danh sách bút toán', 'Chi tiết', 'Bút toán', undefined],
] as const;

let server: Awaited<ReturnType<typeof startDemoServer>>;

test.beforeAll(async () => {
    server = await startDemoServer({ cacheIsolationKey: 'table-mobile-actions' });
});
test.afterAll(async () => server?.close());

for (const [route, label, actionLabel, dialogTitle, extra] of samples) {
    test(`${route} exposes row actions and supporting fields on mobile`, async ({ page }) => {
        for (const width of [390, 320]) {
            await page.setViewportSize({ width, height: 844 });
            await page.goto(`${server.url}/s/shop-demo/${route}`);
            const region = page.getByRole('region', { name: label, exact: true });
            const action = region.getByRole('button', { name: actionLabel, exact: true }).first();
            await expect(action).toBeAttached();
            const geometry = await region.evaluate((container, name) => {
                const button = [...container.querySelectorAll('button')].find(node => node.textContent?.trim() === name)!;
                const bounds = button.getBoundingClientRect();
                const viewport = container.getBoundingClientRect();
                return {
                    actionWithinRegion: bounds.left >= viewport.left - 1 && bounds.right <= viewport.right + 1,
                    horizontalOverflow: container.scrollWidth - container.clientWidth,
                };
            }, actionLabel);
            expect(geometry.actionWithinRegion, `row action is reachable before horizontal scrolling at ${width}px`).toBe(true);
            expect(geometry.horizontalOverflow).toBeLessThanOrEqual(1);
            const firstCard = region.getByRole('listitem').first();
            const disclosure = firstCard.getByText('Xem thêm thông tin', { exact: true });
            if (extra) {
                await expect(firstCard.getByText(extra, { exact: true })).toBeHidden();
                await disclosure.focus();
                await disclosure.press('Enter');
                await expect(firstCard.getByText(extra, { exact: true })).toBeVisible();
            } else {
                await expect(firstCard.getByText('Nguồn', { exact: true })).toBeVisible();
                await expect(disclosure).toHaveCount(0);
            }
            await action.click();
            const dialog = page.getByRole('dialog', { name: new RegExp(dialogTitle) });
            await expect(dialog).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(dialog).toBeHidden();
            await expect(action).toBeFocused();
        }
        await page.setViewportSize({ width: 1440, height: 900 });
        await expect(page.getByRole('table', { name: label, exact: true })).toBeVisible();
    });
}

test('ledger keeps a keyboard-scrollable comparison table on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(`${server.url}/s/shop-demo/finance/ledger`);
    const region = page.getByRole('region', { name: 'Sổ cái theo chứng từ', exact: true });
    const table = region.getByRole('table');
    await expect(table.getByRole('columnheader', { name: 'Nợ', exact: true })).toBeAttached();
    await expect(table.getByRole('columnheader', { name: 'Có', exact: true })).toBeAttached();
    await region.focus();
    await region.press('ArrowRight');
    await expect.poll(() => region.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test('order cards preserve the order creation date shown in the original row', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${server.url}/s/shop-demo/orders`);
    const region = page.getByRole('region', { name: 'Danh sách đơn hàng', exact: true });
    const createdAt = region.locator('tbody tr').first().getByRole('cell').first().locator('.MuiTypography-caption');
    await expect(createdAt).toBeVisible();
    const label = await createdAt.innerText();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(region.getByRole('listitem').first().getByText(label, { exact: true })).toBeVisible();
});

test('closing row details after a viewport change restores focus to the collection', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${server.url}/s/shop-demo/finance/entries`);
    const region = page.getByRole('region', { name: 'Chứng từ thu chi', exact: true });
    await region.getByRole('button', { name: 'Chi tiết', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: /^Chứng từ/ });
    await expect(dialog).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(region).toBeFocused();
});
