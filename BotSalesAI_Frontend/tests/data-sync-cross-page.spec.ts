import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let url = '';
let close: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer(); url = server.url; close = server.close; });
test.afterAll(async () => close?.());

async function disconnectEvents(page: Page) {
    await page.addInitScript(() => {
        class DisconnectedStream {
            onopen = null; onmessage = null; onerror = null;
            close() {}
        }
        Object.defineProperty(window, 'EventSource', { value: DisconnectedStream });
    });
}

// Keep previously loaded queries fresh until explicitly invalidated; no SSE can mask omissions.
async function keepQueriesFreshWithoutEvents(page: Page) {
    await disconnectEvents(page);
    await page.addInitScript(() => { const fixed = Date.now(); Date.now = () => fixed; });
}

test('return inspection refreshes dashboard, order and stock history without SSE', async ({ page }) => {
    await keepQueriesFreshWithoutEvents(page);
    await page.goto(`${url}/s/shop-demo/returns`);
    const row = page.getByRole('row').filter({ hasText: 'seed-returncase-10036' });
    await expect(row.getByRole('button', { name: 'Kiểm nhận' })).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Điều hướng chính' });
    await nav.getByRole('link', { name: 'Tổng quan', exact: true }).click();
    const revenue = page.getByText('Doanh thu đã ghi nhận', { exact: true }).locator('..');
    await expect(revenue).toContainText('0 ₫');
    await page.goBack();
    await nav.getByRole('link', { name: 'Lịch sử kho', exact: true }).click();
    const history = page.getByRole('table', { name: 'Lịch sử biến động kho' });
    await expect(history).toBeVisible();
    await expect(history).not.toContainText('seed-returncase-10036');
    await page.goBack();
    await row.getByRole('link', { name: 'DH-DEMO-RETURN-02', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Đơn DH-DEMO-RETURN-02' })).toBeVisible();
    await expect(page.getByText('Đã giao', { exact: true })).toBeVisible();
    await page.goBack();
    await row.getByRole('button', { name: 'Kiểm nhận' }).click();
    const dialog = page.getByRole('dialog', { name: 'Kiểm nhận hàng trả' });
    await dialog.getByRole('spinbutton', { name: 'Số lượng nhận' }).fill('1');
    await dialog.getByRole('combobox', { name: 'Tình trạng' }).click();
    await page.getByRole('option', { name: 'Bán lại được', exact: true }).click();
    const inspected = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/returns/seed-returncase-10036/inspect'));
    await dialog.getByRole('button', { name: 'Xác nhận kiểm nhận' }).click();
    expect((await inspected).status()).toBe(200);
    await expect(dialog).toBeHidden();
    await row.getByRole('link', { name: 'DH-DEMO-RETURN-02', exact: true }).click();
    await expect(page.getByText('Hoàn một phần', { exact: true })).toBeVisible();
    await nav.getByRole('link', { name: 'Tổng quan', exact: true }).click();
    await expect(revenue).toContainText('−249.000 ₫');
    await nav.getByRole('link', { name: 'Lịch sử kho', exact: true }).click();
    await expect(history).toContainText('seed-returncase-10036');
});

test('approval refreshes the cached purchase detail without SSE', async ({ page }) => {
    await keepQueriesFreshWithoutEvents(page);
    await page.goto(`${url}/s/shop-demo/purchases`);
    await page.getByRole('button', { name: 'Tạo đơn mua', exact: true }).click();
    const draft = page.getByRole('dialog', { name: 'Đơn mua mới' });
    await draft.getByRole('combobox', { name: 'Nhà cung cấp đã duyệt' }).click();
    await page.getByRole('option', { name: 'Xưởng hàng mẫu', exact: true }).click();
    await draft.getByRole('combobox', { name: 'Báo giá dòng 1' }).click();
    await page.getByRole('option', { name: /v-p1/ }).click();
    await draft.getByRole('spinbutton', { name: 'Số lượng dòng 1' }).fill('10');
    const created = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/purchase-orders'));
    await draft.getByRole('button', { name: 'Lưu đơn nháp' }).click();
    const purchase = (await (await created).json()).data;
    const requested = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/purchase-orders/${purchase.id}/request-approval`));
    await page.getByRole('button', { name: 'Xin phê duyệt', exact: true }).click();
    expect((await requested).status()).toBe(200);
    await page.getByRole('link', { name: /Xem phê duyệt/ }).click();
    await page.getByRole('row').filter({ hasText: purchase.id }).getByRole('button', { name: 'Xem & quyết định' }).click();
    const dialog = page.getByRole('dialog', { name: 'Xem xét phê duyệt' });
    await dialog.getByLabel('Lý do quyết định').fill('Kiểm tra đồng bộ đơn mua');
    const decided = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/decision'));
    await dialog.getByRole('button', { name: 'Duyệt đúng nội dung này' }).click();
    expect((await decided).status()).toBe(200);
    await expect(dialog).toBeHidden();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Đơn mua hàng' }).click();
    await page.getByRole('row').filter({ hasText: purchase.id }).getByRole('button', { name: 'Xem chi tiết' }).click();
    const details = page.getByRole('dialog', { name: `Đơn mua ${purchase.id}` });
    await expect(details.getByText('Đã duyệt', { exact: true })).toBeVisible();
    await expect(details.getByRole('button', { name: 'Gửi đơn mua' })).toBeVisible();
});

test('posted goods receipt refreshes stock history and ledger without SSE', async ({ page }) => {
    await keepQueriesFreshWithoutEvents(page);
    await page.goto(`${url}/s/shop-demo/receipts`);
    await page.getByRole('button', { name: 'Tạo phiếu nhận', exact: true }).click();
    const draft = page.getByRole('dialog', { name: 'Phiếu nhận hàng mới' });
    await draft.getByRole('combobox', { name: 'Đơn mua đã xác nhận' }).click();
    await page.getByRole('option', { name: 'seed-purchaseorder-10046', exact: true }).click();
    await draft.getByRole('spinbutton', { name: 'Nhận đạt mã biến thể v-p6' }).fill('3');
    await draft.getByRole('textbox', { name: 'Mã phiếu giao / chứng từ nguồn' }).fill('SYNC-RECEIPT-01');
    const created = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/goods-receipts'));
    await draft.getByRole('button', { name: 'Tạo phiếu nháp' }).click();
    const receipt = (await (await created).json()).data;
    await expect(draft).toBeHidden();
    const row = page.getByRole('row').filter({ hasText: 'SYNC-RECEIPT-01' });
    await expect(row).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Điều hướng chính' });
    await nav.getByRole('link', { name: 'Sổ cái', exact: true }).click();
    await page.getByLabel('Từ ngày', { exact: true }).fill('2026-09-01');
    const loadedLedger = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/finance/ledger'));
    await page.getByLabel('Đến trước ngày', { exact: true }).fill('2026-10-01');
    expect((await loadedLedger).status()).toBe(200);
    await expect(page.getByRole('table', { name: 'Sổ cái theo chứng từ' })).toBeVisible();
    await nav.getByRole('link', { name: 'Nhận hàng', exact: true }).click();
    await expect(row).toBeVisible();
    await nav.getByRole('link', { name: 'Lịch sử kho', exact: true }).click();
    const history = page.getByRole('table', { name: 'Lịch sử biến động kho' });
    await expect(history).toBeVisible();
    await expect(history).not.toContainText(receipt.id);
    await page.goBack();
    await row.getByRole('button', { name: 'Xem / ghi nhận phiếu' }).click();
    const details = page.getByRole('dialog', { name: `Phiếu nhận ${receipt.id}` });
    await details.getByRole('button', { name: 'Kiểm & ghi nhận vào kho' }).click();
    const confirm = page.getByRole('dialog', { name: 'Ghi nhận hàng đã kiểm vào kho' });
    const posted = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/goods-receipts/${receipt.id}/post`));
    await confirm.getByRole('button', { name: 'Ghi nhận vào kho', exact: true }).click();
    expect((await posted).status()).toBe(202);
    await expect(confirm).toBeHidden();
    await expect(details.getByText('Đã ghi sổ', { exact: true })).toBeVisible();
    await details.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    const journalId = await page.evaluate(async id => {
        const response = await fetch('/api/v2/shops/shop-demo/journals?limit=100');
        const body = await response.json();
        return body.data.find((journal: { sourceType: string; sourceId: string }) => journal.sourceType === 'goods_receipt' && journal.sourceId === id)?.id as string | undefined;
    }, receipt.id);
    expect(journalId).toBeTruthy();
    await nav.getByRole('link', { name: 'Lịch sử kho', exact: true }).click();
    await expect(history).toContainText(receipt.id);
    await nav.getByRole('link', { name: 'Sổ cái', exact: true }).click();
    await page.getByLabel('Từ ngày', { exact: true }).fill('2026-09-01');
    await page.getByLabel('Đến trước ngày', { exact: true }).fill('2026-10-01');
    await expect(page.getByRole('table', { name: 'Sổ cái theo chứng từ' })).toContainText(journalId!);
});

test('finance entry detail follows posting and reversal without SSE', async ({ page }) => {
    await disconnectEvents(page);
    await page.goto(`${url}/s/shop-demo/finance/entries`);
    await page.getByRole('button', { name: 'Tạo phiếu', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Phiếu thu chi mới' });
    await editor.getByLabel('Số tiền (VND)').fill('10000');
    await editor.getByLabel('Thời điểm ISO 8601').fill('2026-09-29T14:00:00Z');
    await editor.getByLabel('Diễn giải', { exact: true }).fill('Kiểm tra đồng bộ phiếu');
    const created = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/finance/entries'));
    await editor.getByRole('button', { name: 'Lưu nháp' }).click();
    const entry = (await (await created).json()).data;
    await expect(editor).toBeHidden();
    await page.getByRole('row').filter({ hasText: entry.id }).getByRole('button', { name: 'Chi tiết', exact: true }).click();
    const detail = page.getByRole('dialog', { name: `Chứng từ ${entry.id}` });
    await detail.getByRole('button', { name: 'Ghi sổ', exact: true }).click();
    const post = page.getByRole('dialog', { name: 'Ghi sổ phiếu đã kiểm' });
    await post.getByLabel('Lý do (ít nhất 5 ký tự)').fill('Kiểm tra đồng bộ phiếu');
    const posted = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/finance/entries/${entry.id}/post`));
    await post.getByRole('button', { name: 'Ghi sổ phiếu', exact: true }).click();
    expect((await posted).status()).toBe(202);
    await expect(post).toBeHidden();
    await expect(detail.getByRole('button', { name: 'Đảo phiếu', exact: true })).toBeVisible();
    await expect(detail.getByRole('button', { name: 'Ghi sổ', exact: true })).toHaveCount(0);
    await detail.getByRole('button', { name: 'Đảo phiếu', exact: true }).click();
    const reverse = page.getByRole('dialog', { name: 'Đảo phiếu đã ghi' });
    await reverse.getByLabel('Lý do (ít nhất 5 ký tự)').fill('Đối chiếu việc đảo phiếu');
    const reversed = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/finance/entries/${entry.id}/reverse`));
    await reverse.getByRole('button', { name: 'Đảo phiếu', exact: true }).click();
    expect((await reversed).status()).toBe(202);
    await expect(reverse).toBeHidden();
    await expect(detail.getByRole('button', { name: 'Đảo phiếu', exact: true })).toHaveCount(0);
    await expect(detail).toContainText('Đã đảo');
});

test('resolved conversation updates dashboard count without SSE', async ({ page }) => {
    await disconnectEvents(page);
    await page.goto(`${url}/s/shop-demo/inbox/cv1`);
    await expect(page.getByRole('button', { name: 'Giải quyết', exact: true })).toBeEnabled();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Tổng quan', exact: true }).click();
    const count = page.locator('main a[href="/s/shop-demo/inbox"]');
    await expect(count).toHaveText('4');
    await page.goBack();
    await page.getByRole('button', { name: 'Giải quyết', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Đánh dấu đã giải quyết' });
    await dialog.getByLabel('Lý do (ít nhất 5 ký tự)').fill('Kiểm tra đồng bộ hội thoại');
    const result = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/resolve'));
    await dialog.getByRole('button', { name: 'Đánh dấu đã giải quyết', exact: true }).click();
    expect((await result).status()).toBe(202);
    await expect(dialog).toBeHidden();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Tổng quan', exact: true }).click();
    await expect(count).toHaveText('3');
});

test('cancelled order updates dashboard count without SSE', async ({ page }) => {
    await disconnectEvents(page);
    await page.goto(`${url}/s/shop-demo/orders/DH-1001`);
    await expect(page.getByRole('button', { name: 'Hủy đơn', exact: true })).toBeEnabled();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Tổng quan', exact: true }).click();
    const count = page.locator('main a[href="/s/shop-demo/orders"]').first();
    await expect(count).toHaveText('1');
    await page.goBack();
    await page.getByRole('button', { name: 'Hủy đơn', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Hủy đơn hàng' });
    await dialog.getByLabel('Lý do (ít nhất 5 ký tự)').fill('Kiểm tra đồng bộ đơn hàng');
    const result = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/cancel'));
    await dialog.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).click();
    expect((await result).status()).toBe(202);
    await expect(dialog).toBeHidden();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Tổng quan', exact: true }).click();
    await expect(count).toHaveText('0');
});

test('created order updates dashboard count without SSE', async ({ page }) => {
    await disconnectEvents(page);
    await page.goto(`${url}/s/shop-demo/overview`);
    const count = page.locator('main a[href="/s/shop-demo/orders"]').first();
    await expect(count).toHaveText('1');
    await page.getByRole('link', { name: 'Tạo đơn hàng', exact: true }).click();
    await page.getByRole('combobox', { name: 'Khách hàng', exact: true }).click();
    await page.getByRole('option', { name: 'Linh (khách mẫu)', exact: true }).click();
    await page.getByRole('combobox', { name: 'Sản phẩm 1', exact: true }).click();
    await page.getByRole('option', { name: 'Áo thun Essential · L · Than · AO-002', exact: true }).click();
    const created = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders'));
    await page.getByRole('button', { name: 'Lưu đơn nháp', exact: true }).click();
    expect((await created).status()).toBe(201);
    await expect(page.getByRole('heading', { name: /^Đơn order-/ })).toBeVisible();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Tổng quan', exact: true }).click();
    await expect(count).toHaveText('2');
});

test('posted receipt updates dashboard and ledger without SSE', async ({ page }) => {
    await disconnectEvents(page);
    await page.goto(`${url}/s/shop-demo/finance/ledger?fromDate=2026-09-01&toDate=2026-10-01`);
    await expect(page.getByRole('heading', { name: 'Sổ cái', exact: true })).toBeVisible();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Sổ thu chi', exact: true }).click();
    await page.getByRole('button', { name: 'Tạo phiếu', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Phiếu thu chi mới' });
    await editor.getByRole('combobox', { name: 'Loại phiếu' }).click();
    await page.getByRole('option', { name: 'Thu tiền', exact: true }).click();
    await editor.getByRole('combobox', { name: 'Phân loại' }).click();
    await page.getByRole('option', { name: 'Thu bán hàng', exact: true }).click();
    await editor.getByLabel('Số tiền (VND)').fill('10000');
    await editor.getByLabel('Thời điểm ISO 8601').fill('2026-09-29T14:00:00Z');
    await editor.getByLabel('Diễn giải', { exact: true }).fill('Thu bán hàng kiểm tra liên trang');
    const created = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/finance/entries'));
    await editor.getByRole('button', { name: 'Lưu nháp' }).click();
    const entry = (await (await created).json()).data;
    await expect(editor).toBeHidden();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Tổng quan', exact: true }).click();
    await expect(page.getByText('Doanh thu đã ghi nhận')).toBeVisible();
    await page.goBack();
    await page.getByRole('row').filter({ hasText: entry.id }).getByRole('button', { name: 'Chi tiết', exact: true }).click();
    const detail = page.getByRole('dialog', { name: `Chứng từ ${entry.id}` });
    await detail.getByRole('button', { name: 'Ghi sổ', exact: true }).click();
    const post = page.getByRole('dialog', { name: 'Ghi sổ phiếu đã kiểm' });
    await post.getByLabel('Lý do (ít nhất 5 ký tự)').fill('Ghi sổ để kiểm tra báo cáo');
    await post.getByRole('button', { name: 'Ghi sổ phiếu', exact: true }).click();
    await expect(post).toBeHidden();
    await expect(detail.getByRole('button', { name: 'Đảo phiếu', exact: true })).toBeVisible();
    await detail.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Tổng quan', exact: true }).click();
    await expect(page.getByText('10.000 ₫', { exact: true })).toHaveCount(2);
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Sổ cái', exact: true }).click();
    await page.getByLabel('Từ ngày', { exact: true }).fill('2026-09-01');
    await page.getByLabel('Đến trước ngày', { exact: true }).fill('2026-10-01');
    await expect(page.getByRole('table', { name: 'Sổ cái theo chứng từ' })).toContainText('Thu bán hàng kiểm tra liên trang');
});

test('order payment updates dashboard cash and finance entries without SSE', async ({ page }) => {
    await disconnectEvents(page);
    await page.goto(`${url}/s/shop-demo/orders/DH-1001`);
    await page.getByRole('button', { name: 'Lấy báo giá hiện tại' }).click();
    await page.getByRole('button', { name: 'Mô phỏng khách đồng ý báo giá' }).click();
    const confirmed = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-1001/confirm'));
    await page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng' }).click();
    expect((await confirmed).status()).toBe(202);
    await expect(page.getByRole('button', { name: 'Ghi nhận tiền đã thu' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Tổng quan', exact: true }).click();
    const cash = page.getByText('Tiền đã thu', { exact: true }).locator('..');
    await expect(cash).toContainText('0 ₫');
    await page.goBack();
    await page.getByRole('button', { name: 'Ghi nhận tiền đã thu' }).click();
    const dialog = page.getByRole('dialog', { name: 'Ghi nhận tiền đã thu' });
    await dialog.getByLabel('Mã tham chiếu giao dịch').fill('SYNC-PAYMENT-01');
    await dialog.getByLabel('Mã chứng từ đã xác minh').fill('SYNC-EVIDENCE-01');
    await dialog.getByLabel('Lý do').fill('Kiểm tra đồng bộ thanh toán');
    const paid = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-1001/pay'));
    await dialog.getByRole('button', { name: 'Ghi nhận chứng từ' }).click();
    expect((await paid).status()).toBe(202);
    await expect(dialog).toBeHidden();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Tổng quan', exact: true }).click();
    await expect(cash).toContainText('249.000 ₫');
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Sổ thu chi', exact: true }).click();
    await expect(page.getByRole('table', { name: 'Chứng từ thu chi' })).toContainText('Kiểm tra đồng bộ thanh toán');
});

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
