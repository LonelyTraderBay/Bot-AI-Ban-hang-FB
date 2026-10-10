import { openDemoControls } from './session/demo-controls';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
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

async function chooseOption(page: import('@playwright/test').Page, label: string, value: string) {
    if (['Vai trò mô phỏng', 'Trạng thái thử', 'Dataset mô phỏng'].includes(label)) await openDemoControls(page);
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
}

async function confirmSeedOrder(page: import('@playwright/test').Page) {
    await gotoDemo(page, '/s/shop-demo/orders/DH-1001');
    await expect(page.getByRole('heading', { name: 'Đơn DH-1001', exact: true })).toBeVisible();
    const quote = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-1001/quote'));
    await page.getByRole('button', { name: 'Lấy báo giá hiện tại' }).click();
    expect((await quote).status()).toBe(200);
    const consent = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/customer-confirmations'));
    await page.getByRole('button', { name: 'Mô phỏng khách đồng ý báo giá' }).click();
    expect((await consent).status()).toBe(200);
    const confirmation = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders/DH-1001/confirm'));
    await page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng' }).click();
    expect((await confirmation).status()).toBe(202);
    await expect(page.getByRole('link', { name: 'Chuẩn bị đơn' })).toBeVisible();
}

test('FE013.C04 shipping preview distinguishes missing address, unserviceable zone, and expired mock quote', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.includes('/shops/') && request.method() !== 'GET') writes.push(`${request.method()} ${url.pathname}`);
    });
    await gotoDemo(page, '/s/shop-demo/shipments');
    await expect(page.getByRole('heading', { name: 'Vận đơn & giao hàng', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Mở bản xem thử phí giao hàng', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Xem thử phí và vùng giao hàng', exact: true })).toBeVisible();
    await expect(page.getByText(/DỮ LIỆU MÔ PHỎNG/)).toBeVisible();
    await expect(page.getByText(/Ước tính mẫu:.*VND/)).toBeVisible();

    await chooseOption(page, 'Vùng giao thử', 'Ngoài vùng phục vụ (mẫu)');
    await expect(page.getByText(/không được phục vụ; không hiển thị báo giá/)).toBeVisible();
    await expect(page.getByText(/Ước tính mẫu:/)).toHaveCount(0);

    await chooseOption(page, 'Vùng giao thử', 'Nội thành (mẫu)');
    await page.getByRole('checkbox', { name: 'Báo giá mẫu còn hiệu lực' }).uncheck();
    await expect(page.getByText(/Báo giá mẫu đã hết hiệu lực/)).toBeVisible();
    await page.getByRole('checkbox', { name: 'Báo giá mẫu còn hiệu lực' }).check();
    await page.getByRole('checkbox', { name: 'Có địa chỉ giao hàng mẫu' }).uncheck();
    await expect(page.getByText(/Thiếu địa chỉ giao hàng/)).toBeVisible();
    expect(writes).toEqual([]);
});

test('FE013.AC01–AC04 stale claim conflict is visible; pick, pack, dispatch and delivery use current API versions once', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: string | null; headers: Record<string, string> }> = [];
    page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.includes('/shops/')) calls.push({ method: request.method(), path: url.pathname, body: request.postData(), headers: request.headers() });
    });

    await confirmSeedOrder(page);
    await page.getByRole('link', { name: 'Chuẩn bị đơn' }).click();
    const prepRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
    await expect(prepRow).toBeVisible();
    await chooseOption(page, 'Trạng thái thử', 'Xung đột lần ghi tiếp');
    await prepRow.getByRole('button', { name: 'Mở phiếu lấy hàng' }).click();
    const prepDialog = page.getByRole('dialog', { name: 'Phiếu chuẩn bị DH-1001' });
    await expect(prepDialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' })).toBeVisible();

    const rejectedClaim = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/claim'));
    const rejectedClaimRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/claim'));
    await prepDialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' }).click();
    const rejectedRequest = await rejectedClaimRequest;
    expect(JSON.parse(rejectedRequest.postData() || 'null')).toEqual({ expectedVersion: 1 });
    expect(rejectedRequest.headers()['idempotency-key']).toBeTruthy();
    expect((await rejectedClaim).status()).toBe(412);
    await expect(prepDialog.getByRole('alert').filter({ hasText: 'thay đổi bởi người khác' })).toBeVisible();
    await expect(prepDialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' })).toBeVisible();
    await expect(prepDialog.getByRole('button', { name: 'Tải lại trạng thái' })).toBeVisible();
    await prepDialog.getByRole('button', { name: 'Tải lại trạng thái' }).click();
    await expect(prepDialog.getByRole('button', { name: 'Tải lại trạng thái' })).toHaveCount(0);
    await prepDialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await chooseOption(page, 'Trạng thái thử', 'Bình thường');
    await prepRow.getByRole('button', { name: 'Mở phiếu lấy hàng' }).click();

    const claimRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/claim'));
    const claimResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/claim'));
    await prepDialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' }).click();
    const claimReq = await claimRequest;
    expect(JSON.parse(claimReq.postData() || 'null')).toEqual({ expectedVersion: 1 });
    expect(claimReq.headers()['idempotency-key']).toBeTruthy();
    expect((await claimResponse).status()).toBe(200);
    await expect(prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' })).toBeVisible();
    // The claim response precedes query reconciliation; the dialog stays inert until it settles.
    await expect(prepDialog.getByRole('button', { name: 'Đóng', exact: true }).last()).toBeEnabled();
    await expect(prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' })).toBeEditable();

    const wrongSku = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.includes('/prep-jobs/') && new URL(response.url()).pathname.endsWith('/pick'));
    await prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' }).fill('SKU-SAI');
    await expect(prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' })).toHaveValue('SKU-SAI');
    await prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' }).click();
    expect((await wrongSku).status()).toBe(422);
    await expect(prepDialog.getByRole('alert').filter({ hasText: 'Mã SKU không khớp' })).toBeVisible();
    await expect(prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' })).toHaveValue('SKU-SAI');

    const quantity = prepDialog.getByRole('spinbutton', { name: 'Số lượng đã lấy' });
    await quantity.fill('1.5');
    await expect(quantity).toHaveAttribute('aria-invalid', 'true');
    await expect(prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' })).toBeDisabled();
    await quantity.fill('0');
    await prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' }).fill('AO-002');
    await prepDialog.getByRole('textbox', { name: 'Vấn đề phát hiện (để trống khi đạt)' }).fill('Thiếu hàng khi kiểm thực tế');
    const partialPick = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/pick'));
    await prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' }).click();
    expect((await partialPick).status()).toBe(200);
    await expect(prepDialog.getByRole('button', { name: 'Đóng', exact: true }).last()).toBeEnabled();
    await expect(prepDialog.getByText('0/1', { exact: true })).toBeVisible();
    await expect(prepDialog.getByRole('button', { name: 'Xác nhận đã đóng gói' })).toBeDisabled();

    await quantity.fill('1');
    await prepDialog.getByRole('textbox', { name: 'Vấn đề phát hiện (để trống khi đạt)' }).fill('');
    const completedPick = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/pick'));
    await prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' }).click();
    expect((await completedPick).status()).toBe(200);
    await expect(prepDialog.getByRole('button', { name: 'Xác nhận đã đóng gói' })).toBeEnabled();

    await prepDialog.getByRole('button', { name: 'Xác nhận đã đóng gói' }).click();
    const packDialog = page.getByRole('dialog', { name: 'Hoàn tất đóng gói' });
    const packResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/pack'));
    await packDialog.getByRole('button', { name: 'Xác nhận đã đóng gói', exact: true }).click();
    expect((await packResponse).status()).toBe(200);
    await expect(prepDialog.getByText('Đã đóng gói', { exact: true })).toBeVisible();
    await prepDialog.getByRole('link', { name: 'Tạo vận đơn để bàn giao' }).click();
    await page.getByRole('button', { name: 'Tạo vận đơn', exact: true }).click();
    const createDialog = page.getByRole('dialog', { name: 'Tạo vận đơn' });
    await expect(createDialog.getByRole('combobox', { name: 'Đơn đã đóng gói' })).toHaveText('DH-1001');
    const createRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/shipments'));
    const createResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/shipments'));
    await createDialog.getByRole('button', { name: 'Tạo bản vận chuyển' }).click();
    const shipmentCreate = await createRequest;
    expect(JSON.parse(shipmentCreate.postData() || 'null')).toMatchObject({ orderId: 'DH-1001', warehouseId: 'warehouse-01', carrierId: null, orderLineIds: ['ol-1001'] });
    expect(shipmentCreate.headers()['idempotency-key']).toBeTruthy();
    expect((await createResponse).status()).toBe(201);

    await page.getByRole('button', { name: 'Tạo vận đơn', exact: true }).click();
    const replay = page.getByRole('dialog', { name: 'Tạo vận đơn' });
    await replay.getByRole('combobox', { name: 'Đơn đã đóng gói' }).click();
    await page.getByRole('option', { name: 'DH-1001', exact: true }).click();
    const duplicateCreate = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/shipments'));
    await replay.getByRole('button', { name: 'Tạo bản vận chuyển' }).click();
    expect((await duplicateCreate).status()).toBe(409);
    await expect(replay.getByRole('alert').filter({ hasText: 'Đơn đã có vận đơn' })).toBeVisible();
    await replay.getByRole('textbox', { name: 'Mã đơn vị vận chuyển (trống = thủ công)', exact: true }).fill('carrier-demo');
    await replay.getByRole('button', { name: 'Hủy', exact: true }).click();
    const discardDuplicate = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true });
    await expect(discardDuplicate).toBeVisible();
    await discardDuplicate.getByRole('button', { name: 'Bỏ thay đổi', exact: true }).click();
    await expect(replay).toBeHidden();

    const shipmentRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
    await expect(shipmentRow).toBeVisible();
    await shipmentRow.getByRole('button', { name: 'Bàn giao' }).click();
    const handoverDialog = page.getByRole('dialog', { name: 'Xác nhận bàn giao kiện hàng' });
    await expect(handoverDialog.getByText('Chưa có sự kiện.', { exact: true })).toBeVisible();
    const handoverRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/handover'));
    const handoverResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/handover'));
    await handoverDialog.getByRole('button', { name: 'Xác nhận bàn giao' }).click();
    const handoverReq = await handoverRequest;
    expect(JSON.parse(handoverReq.postData() || 'null')).toMatchObject({ expectedVersion: 1 });
    expect(handoverReq.headers()['idempotency-key']).toBeTruthy();
    expect((await handoverResponse).status()).toBe(202);
    const shipmentDetailDialog = page.getByRole('dialog', { name: 'Chi tiết vận đơn' });
    await expect(shipmentDetailDialog.getByRole('heading', { name: 'Chi tiết vận đơn' })).toBeVisible();
    expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/handover'))).toHaveLength(1);

    await expect(shipmentDetailDialog.getByText('Đã bàn giao', { exact: true })).toBeVisible();
    await shipmentDetailDialog.getByRole('button', { name: 'Cập nhật hành trình' }).click();
    const eventDialog = page.getByRole('dialog', { name: 'Cập nhật hành trình có bằng chứng' });
    await chooseOption(page, 'Sự kiện', 'Khách đã nhận hàng');
    await eventDialog.getByRole('textbox', { name: 'Mã sự kiện bên vận chuyển' }).fill('carrier-event-delivered-1001');
    await eventDialog.getByLabel('Thời gian sự kiện').fill('2026-09-29T14:00');
    await eventDialog.getByRole('textbox', { name: 'Mã bằng chứng' }).fill('proof-delivery-1001');
    const eventResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/events'));
    await eventDialog.getByRole('button', { name: 'Ghi sự kiện' }).click();
    expect((await eventResponse).status()).toBe(200);
    const deliveredRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
    await expect(deliveredRow).toContainText('Đã giao');
    await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toBeVisible();
    expect(calls.filter(call => call.method === 'POST' && call.path.endsWith('/handover'))).toHaveLength(1);
    await page.getByRole('link', { name: 'Mã đơn: DH-1001', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Đơn DH-1001', exact: true })).toBeVisible();
    await expect(page.getByText('Đã giao', { exact: true })).toBeVisible();
    await expect(page.getByText('Chưa thu', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tạo yêu cầu trả hàng' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ghi nhận tiền đã thu' })).toBeVisible();
});

test('FE013.AC03 unknown handover cannot be repeated before command reconciliation', async ({ page }) => {
    await confirmSeedOrder(page);
    await page.getByRole('link', { name: 'Chuẩn bị đơn' }).click();
    const prepRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
    await expect(prepRow).toBeVisible();
    await prepRow.getByRole('button', { name: 'Mở phiếu lấy hàng' }).click();
    const prepDialog = page.getByRole('dialog', { name: 'Phiếu chuẩn bị DH-1001' });
    const claim = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/claim'));
    await prepDialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' }).click();
    expect((await claim).status()).toBe(200);
    await expect(prepDialog.getByRole('button', { name: 'Đóng', exact: true }).last()).toBeEnabled();
    await expect(prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' })).toBeEditable();
    await prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' }).fill('AO-002');
    await expect(prepDialog.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' })).toHaveValue('AO-002');
    await prepDialog.getByRole('spinbutton', { name: 'Số lượng đã lấy' }).fill('1');
    const pick = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/pick'));
    await prepDialog.getByRole('button', { name: 'Xác nhận dòng đã kiểm' }).click();
    expect((await pick).status()).toBe(200);
    await prepDialog.getByRole('button', { name: 'Xác nhận đã đóng gói' }).click();
    const packDialog = page.getByRole('dialog', { name: 'Hoàn tất đóng gói' });
    const pack = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/pack'));
    await packDialog.getByRole('button', { name: 'Xác nhận đã đóng gói', exact: true }).click();
    expect((await pack).status()).toBe(200);
    await prepDialog.getByRole('link', { name: 'Tạo vận đơn để bàn giao' }).click();
    await page.getByRole('button', { name: 'Tạo vận đơn', exact: true }).click();
    const createDialog = page.getByRole('dialog', { name: 'Tạo vận đơn' });
    const create = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/shipments'));
    await createDialog.getByRole('button', { name: 'Tạo bản vận chuyển' }).click();
    expect((await create).status()).toBe(201);

    await chooseOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
    const shipmentRow = page.getByRole('row').filter({ hasText: 'DH-1001' });
    await expect(shipmentRow).toBeVisible();
    await shipmentRow.getByRole('button', { name: 'Bàn giao' }).click();
    const handoverDialog = page.getByRole('dialog', { name: 'Xác nhận bàn giao kiện hàng' });
    const handoverRequests: string[] = [];
    page.on('request', request => {
        if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/handover')) handoverRequests.push(request.postData() || '');
    });
    const handover = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/handover'));
    await handoverDialog.getByRole('button', { name: 'Xác nhận bàn giao' }).click();
    expect((await handover).status()).toBe(202);
    await expect(handoverDialog.getByRole('alert').filter({ hasText: 'Mã lệnh cần kiểm tra' })).toBeVisible();
    await expect(handoverDialog.getByRole('button', { name: 'Xác nhận bàn giao' })).toBeDisabled();
    expect(handoverRequests).toHaveLength(1);
});

test('FE013.AC01 role scope and FE013.AC05 responsive shipment/preparation views remain accessible', async ({ page }) => {
    await confirmSeedOrder(page);
    await chooseOption(page, 'Vai trò mô phỏng', 'warehouse');
    await page.getByRole('link', { name: 'Chuẩn bị hàng', exact: true }).click();
    const row = page.getByRole('row').filter({ hasText: 'DH-1001' });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Mở phiếu lấy hàng' }).click();
    const dialog = page.getByRole('dialog', { name: 'Phiếu chuẩn bị DH-1001' });
    await expect(dialog.getByRole('alert').filter({ hasText: 'không có quyền nhận' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();

    await chooseOption(page, 'Vai trò mô phỏng', 'owner');
    await page.getByRole('link', { name: 'Vận đơn & giao hàng', exact: true }).click();
    const viewportResults = [] as Array<{ width: number; documentWidth: number; viewportWidth: number }>;
    for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        viewportResults.push(await page.evaluate(() => ({ width: window.innerWidth, documentWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth })));
    }
    expect(viewportResults.map(view => [view.width, view.documentWidth <= view.viewportWidth])).toEqual([[320, true], [390, true], [768, true], [1440, true]]);
    await page.setViewportSize({ width: 1440, height: 900 });
    const audit = await new AxeBuilder({ page }).include('main#main-content').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(audit.violations.map(issue => issue.id)).toEqual([]);
    await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toBeVisible();
});
