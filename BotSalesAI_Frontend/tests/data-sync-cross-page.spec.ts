import { test, expect } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let url = '';
let close: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer(); url = server.url; close = server.close; });
test.afterAll(async () => close?.());

test('posted journal refreshes the dashboard across pages without relying on SSE', async ({ page }) => {
    await page.addInitScript(() => {
        class DisconnectedStream {
            onopen = null; onmessage = null; onerror = null;
            close() {}
        }
        Object.defineProperty(window, 'EventSource', { value: DisconnectedStream });
    });
    await page.goto(`${url}/s/shop-demo/overview`);
    await expect(page.getByRole('heading', { name: 'Tổng quan cửa hàng' })).toBeVisible();
    await expect(page.getByText('Doanh thu đã ghi nhận')).toBeVisible();
    await page.getByRole('link', { name: 'Chứng từ & sổ kép', exact: true }).click();
    await page.getByRole('button', { name: 'Tạo bút toán nháp' }).click();
    const editor = page.getByRole('dialog', { name: 'Bút toán nháp' });
    await editor.getByRole('textbox', { name: 'Ngày hiệu lực' }).fill('2026-09-29');
    await editor.getByRole('textbox', { name: 'Mã chứng từ nguồn' }).fill('SYNC-JOURNAL-01');
    for (const [label, option] of [['Tài khoản dòng 1', '111 · Tiền mặt'], ['Tài khoản dòng 2', '511 · Doanh thu bán hàng']]) {
        await editor.getByRole('combobox', { name: label }).click();
        await page.getByRole('option', { name: option, exact: true }).click();
    }
    await editor.getByRole('textbox', { name: 'Nợ dòng 1' }).fill('100000');
    await editor.getByRole('textbox', { name: 'Có dòng 2' }).fill('100000');
    await editor.getByRole('textbox', { name: 'Diễn giải dòng 1' }).fill('Thu tiền');
    await editor.getByRole('textbox', { name: 'Diễn giải dòng 2' }).fill('Doanh thu');
    await editor.getByRole('textbox', { name: 'Lý do' }).fill('Kiểm tra đồng bộ liên trang');
    const created = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/journals'));
    await editor.getByRole('button', { name: 'Lưu nháp' }).click();
    expect((await created).status()).toBe(201);
    const row = page.getByRole('row').filter({ hasText: 'SYNC-JOURNAL-01' });
    await row.getByRole('button', { name: 'Chi tiết' }).click();
    await page.getByRole('dialog', { name: /^Bút toán journal-/ }).getByRole('button', { name: 'Ghi sổ', exact: true }).click();
    const posted = page.waitForResponse(response => response.request().method() === 'POST' && /\/journals\/[^/]+\/post$/.test(new URL(response.url()).pathname));
    await page.getByRole('dialog', { name: 'Ghi sổ bút toán' }).getByRole('button', { name: 'Ghi sổ bút toán', exact: true }).click();
    expect((await posted).status()).toBe(202);
    await expect(page.getByRole('dialog', { name: 'Ghi sổ bút toán' })).toHaveCount(0);
    await page.getByRole('dialog', { name: /^Bút toán journal-/ }).getByRole('button', { name: 'Đóng' }).first().click();
    const dashboard = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/dashboard'));
    await page.getByRole('link', { name: 'Tổng quan', exact: true }).click();
    const response = await dashboard;
    expect((await response.json()).data.recognizedRevenue.amount).toBe('100000');
    await expect(page.getByText('100.000 ₫').first()).toBeVisible();
});
