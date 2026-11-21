import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let url = '';
let stop: (() => Promise<void>) | undefined;
test.beforeAll(async () => {
    const server = await startDemoServer({ cacheIsolationKey: 'p1-commerce-inventory' });
    url = server.url;
    stop = server.close;
});
test.afterAll(async () => { await stop?.(); });

const shop = '/s/shop-demo';
const main = (page: Page) => page.locator('main#main-content');
async function choose(page: Page, container: Locator, label: string, option: string | RegExp) {
    await container.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: option }).click();
}
async function confirm(page: Page, title: string, withReason = false) {
    const dialog = page.getByRole('dialog', { name: title, exact: true });
    if (withReason) await dialog.getByLabel(/Lý do/).fill('Đã đối chiếu dữ liệu mẫu');
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(dialog).toHaveCount(0);
}
async function navigateInDemo(page: Page, route: string) {
    await page.evaluate(path => {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    }, shop + route);
}

test('R64 creates and approves a combo that appears in the Inbox and order draft', async ({ page }) => {
    await page.goto(url + shop + '/products/promotions');
    const content = main(page);
    await expect(content.getByText('Chưa có chương trình ưu đãi.')).toBeVisible();
    const catalog = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/shops/shop-demo/products'));
    await content.getByRole('button', { name: 'Tạo ưu đãi', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Tạo ưu đãi', exact: true });
    await editor.getByLabel('Tên ưu đãi').fill('Combo hai SKU');
    await editor.getByLabel('Giảm mỗi đơn (VND)').fill('30000');
    await editor.getByLabel('Biên lợi nhuận tối thiểu (%)').fill('20');
    expect((await catalog).status()).toBe(200);
    await choose(page, editor, 'SKU dòng 1', /DEMO-001/);
    await choose(page, editor, 'SKU dòng 2', /AO-002/);
    const written = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/promotions'));
    await editor.getByRole('button', { name: 'Lưu bản nháp' }).click();
    expect((await written).status()).toBe(201);
    const row = content.getByRole('row', { name: /Combo hai SKU/ });
    await expect(row.getByRole('cell', { name: /Bản nháp/ })).toBeVisible();
    await row.getByRole('button', { name: 'Duyệt bật', exact: true }).click();
    await confirm(page, 'Duyệt bật ưu đãi', true);
    await expect(row.getByRole('cell', { name: /Đang hiệu lực/ })).toBeVisible();
    await navigateInDemo(page, '/inbox/cv1');
    await expect(content.getByText(/Combo hai SKU · giảm/)).toBeVisible();
    await content.getByRole('link', { name: 'Kiểm tra trên đơn nháp' }).click();
    await expect(content.getByRole('combobox', { name: 'Ưu đãi combo' })).toContainText('Combo hai SKU');
    await choose(page, content, 'Sản phẩm 1', /DEMO-001/);
    await content.getByRole('button', { name: 'Thêm dòng', exact: true }).click();
    await choose(page, content, 'Sản phẩm 2', /AO-002/);
    await choose(page, content, 'Địa chỉ giao hàng', /Địa chỉ giao hàng mẫu/);
    const created = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/shops/shop-demo/orders'));
    await content.getByRole('button', { name: 'Lưu đơn nháp' }).click();
    const order = await created;
    expect(order.status()).toBe(201);
    expect((await order.json()).data).toMatchObject({ total: { amount: '369000', currency: 'VND' }, promotion: { name: 'Combo hai SKU' } });
    const quote = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/quote'));
    await content.getByRole('button', { name: 'Lấy báo giá hiện tại' }).click();
    expect((await (await quote).json()).data).toMatchObject({ promotion: { name: 'Combo hai SKU', discount: { amount: '30000', currency: 'VND' } } });
    await expect(content.getByText('Ưu đãi trên báo giá', { exact: true })).toBeVisible();
});

test('R19 loads combo options only when editing a draft', async ({ page }) => {
    const comboRequests: string[] = [];
    const isComboRead = (target: string) => new URL(target).pathname.endsWith('/shops/shop-demo/promotions');
    page.on('request', request => {
        if (request.method() === 'GET' && isComboRead(request.url())) comboRequests.push(request.url());
    });
    await page.goto(url + shop + '/orders/DH-1001');
    const edit = main(page).getByRole('button', { name: 'Sửa đơn nháp', exact: true });
    await expect(edit).toBeEnabled();
    expect(comboRequests).toHaveLength(0);
    const loaded = page.waitForResponse(response => response.request().method() === 'GET' && isComboRead(response.url()));
    await edit.click();
    const response = await loaded;
    expect(response.status()).toBe(200);
    expect(new URL(response.url()).searchParams.get('effective')).toBe('yes');
    expect((await response.json()).data).toEqual([]);
    await expect(page.getByRole('dialog', { name: 'Sửa đơn nháp' }).getByRole('combobox', { name: 'Ưu đãi combo' })).toBeVisible();
});

test('R65 filters refund records and opens their source documents on narrow screens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 850 });
    await page.goto(url + shop + '/finance/payment-reviews');
    const content = main(page);
    await expect(content.getByRole('heading', { name: 'Xác minh thu tiền và hoàn tiền' })).toBeVisible();
    await choose(page, content, 'Loại khoản tiền', 'Hoàn tiền');
    const filtered = page.waitForResponse(response => {
        const target = new URL(response.url());
        return target.pathname.endsWith('/payment-reviews') && target.searchParams.get('stage') === 'settled';
    });
    await choose(page, content, 'Tình trạng xử lý', 'Đã xử lý');
    const reply = await filtered;
    expect(reply.status()).toBe(200);
    expect(new URL(reply.url()).searchParams.get('kind')).toBe('refund');
    const row = content.getByRole('row', { name: /DH-DEMO-PAID-01/ });
    await row.getByRole('button', { name: 'Xem chứng từ' }).click();
    const detail = page.getByRole('dialog', { name: 'Chứng từ đơn DH-DEMO-PAID-01' });
    await expect(detail.getByRole('link', { name: 'Mở đơn hàng' })).toHaveAttribute('href', shop + '/orders/DH-DEMO-PAID-01');
    await expect(detail.getByText('seed-returncase-10035')).toBeVisible();
    await expect(detail.getByText('seed-financeentry-10041')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('R66 counts stock, submits, approves, and links the posted movement', async ({ page }) => {
    await page.goto(url + shop + '/inventory/stocktakes');
    const content = main(page);
    await content.getByRole('button', { name: 'Mở phiên kiểm kê' }).click();
    const form = page.getByRole('dialog', { name: 'Mở phiên kiểm kê' });
    await choose(page, form, 'Kho kiểm kê', /Kho chính/);
    await form.getByLabel('Lý do kiểm kê').fill('Kiểm kê đầu ca mẫu');
    await choose(page, form, 'Thêm SKU từ tồn kho', /DEMO-001/);
    await form.getByRole('button', { name: 'Tạo phiên' }).click();
    await expect(content.getByRole('cell', { name: /Đang kiểm đếm/ })).toBeVisible();
    await content.getByRole('button', { name: 'Nhập số đếm' }).click();
    const counts = page.getByRole('dialog', { name: 'Nhập số đếm' });
    await counts.getByLabel('Số đếm DEMO-001').fill('7');
    await counts.getByRole('button', { name: 'Lưu số đếm' }).click();
    await content.getByRole('button', { name: 'Gửi duyệt' }).click();
    await confirm(page, 'Gửi phiên kiểm kê để duyệt');
    await content.getByRole('button', { name: 'Duyệt và ghi tồn' }).click();
    await confirm(page, 'Duyệt và ghi tồn', true);
    await expect(content.getByRole('cell', { name: /Đã ghi tồn/ })).toBeVisible();
    await content.getByRole('button', { name: 'Chi tiết phiên' }).click();
    const detail = page.getByRole('dialog', { name: /^Phiên stocktake-/ });
    await expect(detail.getByRole('row', { name: /DEMO-001.*8.*7.*-1/ })).toBeVisible();
    await expect(detail.getByRole('link', { name: 'Mở lịch sử theo phiên' })).toHaveAttribute('href', /\/inventory\/movements\?q=stocktake-/);
});

test('R67 keeps outstanding stock in transit after a partial receipt and records the shortage', async ({ page }) => {
    await page.goto(url + shop + '/overview');
    await expect(main(page).getByRole('heading').first()).toBeVisible();
    const created = await page.evaluate(async () => {
        const csrf = await (await fetch('/api/v2/auth/csrf')).json();
        const response = await fetch('/api/v2/shops/shop-demo/warehouses', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-csrf-token': csrf.data.csrfToken, 'idempotency-key': crypto.randomUUID() },
            body: JSON.stringify({ code: 'P1-SECOND', name: 'Kho nhận P1', addressLine: 'Địa chỉ mẫu' }),
        });
        return response.status;
    });
    expect(created).toBe(201);
    await navigateInDemo(page, '/inventory/transfers');
    const content = main(page);
    await content.getByRole('button', { name: 'Tạo phiếu chuyển' }).click();
    const form = page.getByRole('dialog', { name: 'Tạo phiếu chuyển' });
    await choose(page, form, 'Kho gửi', /Kho chính/);
    await choose(page, form, 'Kho nhận', /Kho nhận P1/);
    await form.getByLabel('Lý do chuyển kho').fill('Chuyển hàng cho kho nhận mẫu');
    await choose(page, form, 'Thêm SKU từ tồn kho', /DEMO-001/);
    await form.getByLabel('Số lượng chuyển DEMO-001').fill('3');
    await form.getByRole('button', { name: 'Lưu phiếu nháp' }).click();
    await content.getByRole('button', { name: 'Xuất chuyển kho' }).click();
    await confirm(page, 'Xuất chuyển kho');
    await content.getByRole('button', { name: 'Nhận hàng', exact: true }).click();
    const receipt = page.getByRole('dialog', { name: 'Nhận hàng chuyển kho' });
    await receipt.getByLabel('Nhận SKU DEMO-001').fill('1');
    await receipt.getByRole('button', { name: 'Ghi nhận số đã nhận' }).click();
    await expect(content.getByRole('row', { name: /stocktransfer-.*Đang chuyển.*2/ })).toBeVisible();
    await content.getByRole('button', { name: 'Đóng phiếu thiếu' }).click();
    await confirm(page, 'Đóng phiếu thiếu', true);
    await expect(content.getByRole('cell', { name: /Đã đóng thiếu/ })).toBeVisible();
    await content.getByRole('button', { name: 'Chi tiết phiếu' }).click();
    const detail = page.getByRole('dialog', { name: /^Phiếu stocktransfer-/ });
    await expect(detail.getByRole('row', { name: /DEMO-001.*3.*1.*0.*2/ })).toBeVisible();
    await expect(detail.getByRole('link', { name: 'Mở lịch sử theo phiếu' })).toBeVisible();
});
