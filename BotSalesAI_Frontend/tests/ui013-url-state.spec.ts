import { test, expect } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

async function gotoDemo(page: import('@playwright/test').Page, path: string) {
    await page.goto(new URL(path, demoUrl).toString());
}

test('UI013 reconciliation tab deep links and survives refresh; malformed tab safely falls back', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/finance/reconciliation?tab=cod&keep=filter');
    const codTab = page.getByRole('tab', { name: 'COD' });
    await expect(codTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Đối soát ngân hàng & COD' })).toBeVisible();

    await page.reload();
    await expect(codTab).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('tab', { name: 'Chênh lệch cần xử lý' }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('cases');
    expect(new URL(page.url()).searchParams.get('keep')).toBe('filter');
    await page.reload();
    await expect(page.getByRole('tab', { name: 'Chênh lệch cần xử lý' })).toHaveAttribute('aria-selected', 'true');

    await gotoDemo(page, '/s/shop-demo/finance/reconciliation?tab=unknown');
    await expect(page.getByRole('tab', { name: 'Ngân hàng' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'COD' })).toHaveAttribute('aria-selected', 'false');
});

test('UI013 finance date range deep link, edit, refresh and Back use shop-local filter state', async ({ page }) => {
    const initial = '/s/shop-demo/finance?fromDate=2026-09-01&toDate=2026-10-01&cursor=stale';
    await gotoDemo(page, initial);
    const from = page.getByLabel('Từ ngày');
    const to = page.getByLabel('Đến trước ngày');
    await expect(from).toHaveValue('2026-09-01');
    await expect(to).toHaveValue('2026-10-01');

    await from.fill('2026-08-01');
    await expect.poll(() => new URL(page.url()).searchParams.get('fromDate')).toBe('2026-08-01');
    expect(new URL(page.url()).searchParams.get('toDate')).toBe('2026-10-01');
    expect(new URL(page.url()).searchParams.has('cursor')).toBe(false);
    await to.fill('2026-10-02');
    await expect.poll(() => new URL(page.url()).searchParams.get('fromDate')).toBe('2026-08-01');
    expect(new URL(page.url()).searchParams.get('toDate')).toBe('2026-10-02');

    await page.reload();
    await expect(from).toHaveValue('2026-08-01');
    await expect(to).toHaveValue('2026-10-02');
    await page.goBack();
    await expect.poll(() => new URL(page.url()).searchParams.get('fromDate')).toBe('2026-08-01');
    await expect.poll(() => new URL(page.url()).searchParams.get('toDate')).toBe('2026-10-01');
    await expect(from).toHaveValue('2026-08-01');
    await expect(to).toHaveValue('2026-10-01');

    await gotoDemo(page, '/s/shop-demo/finance?fromDate=2026-02-31&toDate=bad');
    await expect(from).not.toHaveValue('2026-02-31');
    await expect(to).not.toHaveValue('bad');
    await expect(page.getByText('Ngày bắt đầu phải trước ngày kết thúc.')).toHaveCount(0);
});

test('UI013 report type and export date filters are deep-linkable, refreshable and malformed values fall back safely', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/reports?reportType=cashflow&fromDate=2026-09-01&toDate=2026-09-30');
    const reportType = page.getByRole('combobox', { name: 'Báo cáo' });
    const from = page.getByLabel('Từ ngày');
    const to = page.getByLabel('Đến ngày');
    await expect(reportType).toContainText('Dòng tiền');
    await expect(from).toHaveValue('2026-09-01');
    await expect(to).toHaveValue('2026-09-30');

    await page.reload();
    await expect(reportType).toContainText('Dòng tiền');
    await expect(from).toHaveValue('2026-09-01');
    await page.getByRole('combobox', { name: 'Báo cáo' }).click();
    await page.getByRole('option', { name: 'Tồn kho' }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('reportType')).toBe('inventory');
    await page.goBack();
    await expect.poll(() => new URL(page.url()).searchParams.get('reportType')).toBe('cashflow');
    await expect(reportType).toContainText('Dòng tiền');

    await from.fill('2026-09-05');
    await to.fill('2026-09-06');
    await expect.poll(() => new URL(page.url()).searchParams.get('fromDate')).toBe('2026-09-05');
    expect(new URL(page.url()).searchParams.get('toDate')).toBe('2026-09-06');

    await gotoDemo(page, '/s/shop-demo/reports?reportType=invalid&fromDate=2026-02-31&toDate=bad');
    await expect(reportType).toContainText('Đơn hàng');
    await expect(from).toHaveValue('2026-09-01');
    await expect(to).toHaveValue('2026-09-29');
    await expect.poll(() => new URL(page.url()).searchParams.get('reportType')).toBe('orders');
    expect(new URL(page.url()).searchParams.get('fromDate')).toBe('2026-09-01');
    expect(new URL(page.url()).searchParams.get('toDate')).toBe('2026-09-29');
});
