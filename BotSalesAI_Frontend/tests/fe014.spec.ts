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

async function chooseOption(page: import('@playwright/test').Page, label: string, value: string | RegExp) {
    if (['Vai trò mô phỏng', 'Trạng thái thử', 'Dataset mô phỏng'].includes(label)) await openDemoControls(page);
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
}

test('FE014.AC01 multi-line purchase validates MOQ/pack size and binds approval to the created intent', async ({ page }) => {
    const requests: Array<{ path: string; body: string | null; headers: Record<string, string> }> = [];
    page.on('request', request => {
        if (request.method() === 'POST' && new URL(request.url()).pathname.includes('/purchase-orders')) {
            requests.push({ path: new URL(request.url()).pathname, body: request.postData(), headers: request.headers() });
        }
    });

    await gotoDemo(page, '/s/shop-demo/purchases');
    await expect(page.getByRole('heading', { name: 'Đơn mua hàng', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tạo đơn mua', exact: true }).click();
    const draft = page.getByRole('dialog', { name: 'Đơn mua mới' });
    await chooseOption(page, 'Nhà cung cấp đã duyệt', 'Xưởng hàng mẫu');
    await chooseOption(page, 'Báo giá dòng 1', /v-p1/);

    const firstQuantity = draft.getByRole('spinbutton', { name: 'Số lượng dòng 1' });
    await firstQuantity.fill('7');
    await expect(firstQuantity).toHaveAttribute('aria-invalid', 'true');
    await expect(draft.getByRole('button', { name: 'Lưu đơn nháp' })).toBeDisabled();
    await firstQuantity.fill('10');
    await draft.getByRole('button', { name: 'Thêm dòng hàng' }).click();
    await chooseOption(page, 'Báo giá dòng 2', /v-p2/);

    const createRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/purchase-orders'));
    const createResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/purchase-orders'));
    await draft.getByRole('button', { name: 'Lưu đơn nháp' }).click();
    const request = await createRequest;
    const response = await createResponse;
    const body = JSON.parse(request.postData() || 'null');
    expect(response.status()).toBe(201);
    expect(request.headers()['idempotency-key']).toBeTruthy();
    expect(body).toMatchObject({ supplierId: 'supplier-01', warehouseId: 'warehouse-01', suggestionId: null });
    expect(body.lines).toEqual([
        { variantId: 'v-p1', supplierOfferId: 'offer-p1', quantity: 10 },
        { variantId: 'v-p2', supplierOfferId: 'offer-p2', quantity: 5 },
    ]);
    const created = await response.json();
    const purchaseId = (created.data || created).id as string;
    expect(purchaseId).toBeTruthy();
    await expect(page.getByRole('dialog', { name: `Đơn mua ${purchaseId}` })).toBeVisible();
    await expect(page.getByRole('dialog', { name: `Đơn mua ${purchaseId}` }).getByText('1.675.000', { exact: false })).toBeVisible();

    const approvalRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith(`/purchase-orders/${purchaseId}/request-approval`));
    const approvalResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/purchase-orders/${purchaseId}/request-approval`));
    await page.getByRole('button', { name: 'Xin phê duyệt', exact: true }).click();
    const approvalReq = await approvalRequest;
    expect(JSON.parse(approvalReq.postData() || 'null')).toEqual({ expectedVersion: 1 });
    expect((await approvalResponse).status()).toBe(200);
    expect(requests).toHaveLength(2);
    expect(requests[1].headers['idempotency-key']).toBeTruthy();
});

test('FE027.D02 supplier workspace edits the selected contact through its current version and displays MOQ offers', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/suppliers');
    const supplierRow = page.getByRole('table').first().getByRole('row').filter({ hasText: 'Liên hệ giả lập' });
    await expect(supplierRow).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Tối thiểu / Quy cách' })).toBeVisible();
    const detailWait = page.waitForResponse(response => response.request().method() === 'GET' && /\/suppliers\/[^/]+$/.test(new URL(response.url()).pathname));
    await supplierRow.getByRole('button', { name: 'Sửa', exact: true }).click();
    const detail = (await (await detailWait).json()).data;
    const dialog = page.getByRole('dialog', { name: 'Cập nhật nhà cung cấp' });
    await expect(dialog.getByLabel('Tên nhà cung cấp')).toHaveValue('Xưởng hàng mẫu');
    await dialog.getByLabel('Đầu mối liên hệ').fill('FE027 · đầu mối mô phỏng');
    const updateWait = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith(`/suppliers/${detail.id}`));
    await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
    const updateResponse = await updateWait;
    expect(updateResponse.status(), await updateResponse.text()).toBe(200);
    await expect(page.getByRole('table').first().getByRole('row').filter({ hasText: 'Xưởng hàng mẫu' }).getByText('FE027 · đầu mối mô phỏng')).toBeVisible();
});

test('FE014.AC02 approval covers the exact purchase intent; unknown send is blocked from blind retry', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/purchases');
    await page.getByRole('button', { name: 'Tạo đơn mua', exact: true }).click();
    const draft = page.getByRole('dialog', { name: 'Đơn mua mới' });
    await chooseOption(page, 'Nhà cung cấp đã duyệt', 'Xưởng hàng mẫu');
    await chooseOption(page, 'Báo giá dòng 1', 'v-p3 · 230000 VND · MOQ 5 / quy cách 5');
    const createdResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/purchase-orders'));
    await draft.getByRole('button', { name: 'Lưu đơn nháp' }).click();
    const created = await (await createdResponse).json();
    const purchaseId = (created.data || created).id as string;
    const purchaseDialog = page.getByRole('dialog', { name: `Đơn mua ${purchaseId}` });

    const requestedApproval = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/purchase-orders/${purchaseId}/request-approval`));
    await purchaseDialog.getByRole('button', { name: 'Xin phê duyệt', exact: true }).click();
    expect((await requestedApproval).status()).toBe(200);
    await page.getByRole('link', { name: /Xem phê duyệt/ }).click();
    const approvalRow = page.getByRole('row').filter({ hasText: purchaseId });
    await expect(approvalRow).toBeVisible();
    await approvalRow.getByRole('button', { name: 'Xem & quyết định' }).click();
    const approvalDialog = page.getByRole('dialog', { name: 'Xem xét phê duyệt' });
    await approvalDialog.getByRole('textbox', { name: 'Lý do quyết định' }).fill('Duyệt đúng hash và số lượng đơn mua FE014.');
    const decisionRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/decision'));
    const decisionResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/decision'));
    await approvalDialog.getByRole('button', { name: 'Duyệt đúng nội dung này' }).click();
    const decision = await decisionRequest;
    expect(JSON.parse(decision.postData() || 'null')).toMatchObject({ decision: 'approve', reason: 'Duyệt đúng hash và số lượng đơn mua FE014.' });
    expect((await decisionResponse).status()).toBe(200);

    await page.getByRole('link', { name: 'Đơn mua hàng', exact: true }).click();
    const purchaseRow = page.getByRole('row').filter({ hasText: purchaseId });
    await expect(purchaseRow).toBeVisible();
    await purchaseRow.getByRole('button', { name: 'Xem chi tiết' }).click();
    const approvedDialog = page.getByRole('dialog', { name: `Đơn mua ${purchaseId}` });
    await expect(approvedDialog.getByText('Đã duyệt', { exact: true })).toBeVisible();
    await approvedDialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await chooseOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
    await purchaseRow.getByRole('button', { name: 'Xem chi tiết' }).click();
    const approvedAfterFaultDialog = page.getByRole('dialog', { name: `Đơn mua ${purchaseId}` });
    await approvedAfterFaultDialog.getByRole('button', { name: 'Gửi đơn mua' }).click();
    const sendDialog = page.getByRole('dialog', { name: 'Gửi đơn mua đã duyệt' });
    const sendCalls: string[] = [];
    page.on('request', request => {
        if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith(`/purchase-orders/${purchaseId}/send`)) sendCalls.push(request.postData() || '');
    });
    const sentRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith(`/purchase-orders/${purchaseId}/send`));
    const sentResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/purchase-orders/${purchaseId}/send`));
    await sendDialog.getByRole('button', { name: 'Gửi đơn mua', exact: true }).click();
    const sendReq = await sentRequest;
    expect(JSON.parse(sendReq.postData() || 'null')).toMatchObject({ expectedVersion: 3 });
    expect(JSON.parse(sendReq.postData() || 'null').intentHash).toBeTruthy();
    expect((await sentResponse).status()).toBe(202);
    await expect(approvedAfterFaultDialog.getByRole('alert').filter({ hasText: 'Mã lệnh cần kiểm tra' })).toBeVisible();
    await expect(sendDialog).toHaveCount(0);
    await expect(approvedAfterFaultDialog.getByRole('button', { name: 'Gửi đơn mua' })).toHaveCount(0);
    await expect(approvedAfterFaultDialog.getByRole('alert').filter({ hasText: 'Chưa xác minh kết quả gửi' })).toBeVisible();
    expect(sendCalls).toHaveLength(1);
    await approvedAfterFaultDialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
});

test('FE014.S03 auto-send requires an active matching purchase delegation', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/replenishment');
    await page.getByRole('button', { name: 'Thêm quy tắc', exact: true }).click();
    const rule = page.getByRole('dialog', { name: 'Quy tắc nhập lại' });
    await chooseOption(page, 'Báo giá / SKU', /v-p1 · supplier-01/);
    await chooseOption(page, 'Mức tự động', '3 · Tự gửi trong hạn mức');
    await chooseOption(page, 'Ngân sách mua hàng đã duyệt', /budget-2/);
    await expect(rule.getByText(/Không có ủy quyền đang hiệu lực khớp nhà cung cấp, kho, báo giá snapshot và ngân sách/)).toBeVisible();
    await expect(rule.getByRole('combobox', { name: 'Ủy quyền purchase.send' })).toHaveCount(0);
    await rule.getByRole('checkbox', { name: 'Tôi đã kiểm giới hạn, snapshot và phạm vi tự gửi' }).check();
    await expect(rule.getByRole('button', { name: 'Lưu quy tắc' })).toBeDisabled();
    await expect(rule.getByText(/Worker MSW local ghi nhận kết quả xác định/)).toBeVisible();
});

test('FE014.S04 owner manages a paused purchase delegation only after rechecking the buyer role', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/bot/team');
    const buyer = page.getByRole('heading', { name: 'Kho & mua hàng', exact: true }).locator('xpath=ancestor::div[contains(@class,"MuiPaper-root")][1]');
    await buyer.getByRole('button', { name: 'Đề nghị tiếp tục', exact: true }).click();
    const resume = page.getByRole('dialog', { name: 'Kiểm điều kiện để tiếp tục' });
    await resume.getByLabel('Lý do (ít nhất 5 ký tự)').fill('Chủ shop kiểm tra vai trò mua hàng.');
    const resumeWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/automation-control'));
    await resume.getByRole('button', { name: 'Kiểm tra để tiếp tục' }).click();
    expect((await resumeWait).status()).toBe(202);

    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Cần phê duyệt', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Ủy quyền gửi đơn mua', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tạo ủy quyền có giới hạn', exact: true }).click();
    const create = page.getByRole('dialog', { name: 'Tạo ủy quyền mua hàng' });
    await chooseOption(page, 'Vai trò mua hàng chịu trách nhiệm', /agent-2/);
    await chooseOption(page, 'Nhà cung cấp đã duyệt', 'Xưởng hàng mẫu');
    await chooseOption(page, 'Kho đang hoạt động', /warehouse-01|MAIN/);
    await chooseOption(page, 'Báo giá nằm trong phạm vi', /offer-p1/);
    await page.keyboard.press('Escape');
    await chooseOption(page, 'Ngân sách mua hàng đã bật và được duyệt', /budget-2/);
    const createRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/purchase-delegations'));
    const createResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/purchase-delegations'));
    await create.getByRole('button', { name: 'Tạo ở trạng thái tạm dừng' }).click();
    const request = await createRequest;
    const response = await createResponse;
    expect(response.status(), await response.text()).toBe(201);
    expect(request.headers()['idempotency-key']).toBeTruthy();
    expect(request.postDataJSON()).toMatchObject({
        agentId: 'agent-2', supplierId: 'supplier-01', warehouseId: 'warehouse-01', offerIds: ['offer-p1'],
        maxPerOrder: { amount: '300000', currency: 'VND' }, budgetPolicyId: 'budget-2',
    });
    const created = (await response.json()).data;
    expect(created).toMatchObject({ status: 'paused', toolId: 'purchase.send', supplierId: 'supplier-01', warehouseId: 'warehouse-01', budgetPolicyId: 'budget-2' });
    expect(created.offerSnapshots).toEqual([{ supplierOfferId: 'offer-p1', offerVersion: 1, unitCost: { amount: '100000', currency: 'VND' }, minimumQuantity: 5, packSize: 5 }]);

    const grantRow = page.getByRole('table', { name: 'Ủy quyền gửi đơn mua' }).getByRole('row').filter({ hasText: 'Xưởng hàng mẫu' });
    await expect(grantRow).toContainText('Tạm dừng');
    await grantRow.getByRole('button', { name: 'Kích hoạt', exact: true }).click();
    const activate = page.getByRole('dialog', { name: 'Kích hoạt ủy quyền gửi đơn' });
    await activate.getByLabel('Lý do (ít nhất 5 ký tự)').fill('Đã rà lại giới hạn và báo giá.');
    const activateWait = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith(`/purchase-delegations/${created.id}`));
    await activate.getByRole('button', { name: 'Kích hoạt ủy quyền', exact: true }).click();
    const activation = await activateWait;
    expect(activation.status(), await activation.text()).toBe(200);
    await expect(page.getByRole('table', { name: 'Ủy quyền gửi đơn mua' }).getByRole('row').filter({ hasText: 'Xưởng hàng mẫu' })).toContainText('Đang hoạt động');
});

test('FE014.S03 manager without procurement.receive cannot open receipt actions', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/receipts');
    await page.getByRole('button', { name: 'Tạo phiếu nhận', exact: true }).click();
    const draft = page.getByRole('dialog', { name: 'Phiếu nhận hàng mới' });
    await chooseOption(page, 'Đơn mua đã xác nhận', 'seed-purchaseorder-10046');
    await draft.getByRole('textbox', { name: 'Mã phiếu giao / chứng từ nguồn' }).fill('FE014-GR-PERMISSION-01');
    await draft.getByRole('spinbutton', { name: 'Nhận đạt mã biến thể v-p6' }).fill('1');
    const createRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/goods-receipts'));
    const createResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/goods-receipts'));
    await draft.getByRole('button', { name: 'Tạo phiếu nháp' }).click();
    expect((await createResponse).status()).toBe(201);
    const created = await createRequest;
    expect(JSON.parse(created.postData() || 'null')).toMatchObject({ sourceDocumentRef: 'FE014-GR-PERMISSION-01', lines: [{ acceptedQuantity: 1, rejectedQuantity: 0 }] });
    const receipt = page.getByRole('row').filter({ hasText: 'FE014-GR-PERMISSION-01' });
    await expect(receipt).toBeVisible();
    await chooseOption(page, 'Vai trò mô phỏng', 'manager');
    await expect(page.getByRole('navigation', { name: 'Điều hướng chính' }).getByText('Quản lý', { exact: true })).toBeVisible();
    await expect(receipt.getByRole('button', { name: 'Xem / ghi nhận phiếu' })).toHaveCount(0);
});

test('FE014.AC03 partial receipt posts only accepted units to synthetic stock and payable once', async ({ page }) => {
    const receiptCalls: Array<{ method: string; path: string; body: string | null; headers: Record<string, string> }> = [];
    page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.includes('/goods-receipts')) receiptCalls.push({ method: request.method(), path: url.pathname, body: request.postData(), headers: request.headers() });
    });
    await gotoDemo(page, '/s/shop-demo/receipts');
    await page.getByRole('button', { name: 'Tạo phiếu nhận', exact: true }).click();
    const draft = page.getByRole('dialog', { name: 'Phiếu nhận hàng mới' });
    await chooseOption(page, 'Đơn mua đã xác nhận', 'seed-purchaseorder-10046');
    await expect(draft.getByText('Đặt 10 · đã nhận 4 · bị từ chối 0 · còn 6')).toBeVisible();
    const accepted = draft.getByRole('spinbutton', { name: 'Nhận đạt mã biến thể v-p6' });
    const rejected = draft.getByRole('spinbutton', { name: 'Từ chối / hỏng mã biến thể v-p6' });
    await accepted.fill('3');
    await rejected.fill('3');
    await expect(draft.getByRole('button', { name: 'Tạo phiếu nháp' })).toBeDisabled();
    await draft.getByRole('textbox', { name: 'Ghi chú kiểm hàng mã biến thể v-p6' }).fill('Ba sản phẩm lỗi bao bì, từ chối theo kiểm nhận.');
    await draft.getByRole('textbox', { name: 'Mã phiếu giao / chứng từ nguồn' }).fill('FE014-GR-PARTIAL-01');

    const detailRequest = page.waitForRequest(request => request.method() === 'GET' && new URL(request.url()).pathname.endsWith('/purchase-orders/seed-purchaseorder-10046'));
    const createRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/goods-receipts'));
    const createResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/goods-receipts'));
    await draft.getByRole('button', { name: 'Tạo phiếu nháp' }).click();
    await detailRequest;
    const createReq = await createRequest;
    expect(JSON.parse(createReq.postData() || 'null')).toMatchObject({ purchaseOrderId: 'seed-purchaseorder-10046', expectedPurchaseVersion: 6, sourceDocumentRef: 'FE014-GR-PARTIAL-01', lines: [{ purchaseLineId: 'seed-purchase-line-10045', acceptedQuantity: 3, rejectedQuantity: 3, reason: 'Ba sản phẩm lỗi bao bì, từ chối theo kiểm nhận.' }] });
    const createResp = await createResponse;
    expect(createResp.status()).toBe(201);
    const createdReceipt = await createResp.json();
    const receiptId = (createdReceipt.data || createdReceipt).id as string;
    const createdReceiptCall = receiptCalls.find(call => call.method === 'POST' && call.path.endsWith('/goods-receipts'));
    expect(createdReceiptCall?.headers['idempotency-key']).toBeTruthy();

    const receiptRow = page.getByRole('row').filter({ hasText: 'FE014-GR-PARTIAL-01' });
    await expect(receiptRow).toBeVisible();
    await receiptRow.getByRole('button', { name: 'Xem / ghi nhận phiếu' }).click();
    const receiptDialog = page.getByRole('dialog', { name: /Phiếu nhận goodsreceipt/i });
    await expect(receiptDialog.getByRole('button', { name: 'Kiểm & ghi nhận vào kho' })).toBeVisible();
    const postRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.match(/\/goods-receipts\/[^/]+\/post$/));
    const postResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.match(/\/goods-receipts\/[^/]+\/post$/));
    await receiptDialog.getByRole('button', { name: 'Kiểm & ghi nhận vào kho' }).click();
    const confirm = page.getByRole('dialog', { name: 'Ghi nhận hàng đã kiểm vào kho' });
    await confirm.getByRole('button', { name: 'Ghi nhận vào kho', exact: true }).click();
    const postReq = await postRequest;
    expect(JSON.parse(postReq.postData() || 'null')).toEqual({ expectedVersion: 1 });
    expect((await postResponse).status()).toBe(202);
    const postedReceipt = page.getByRole('dialog', { name: /Phiếu nhận goodsreceipt/i });
    await expect(postedReceipt.getByText('Đã ghi sổ', { exact: true })).toBeVisible();
    await expect(postedReceipt.getByRole('button', { name: 'Kiểm & ghi nhận vào kho' })).toHaveCount(0);
    expect(receiptCalls.filter(call => call.method === 'POST' && /\/post$/.test(call.path))).toHaveLength(1);

    await postedReceipt.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await page.getByRole('link', { name: 'Tồn kho', exact: true }).click();
    const stockRow = page.getByRole('row').filter({ hasText: 'MU-006' });
    await expect(stockRow).toBeVisible();
    await expect(stockRow.getByRole('cell').nth(1)).toHaveText('3');
    const debtResponse = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/debts'));
    await page.getByRole('link', { name: 'Công nợ & khóa kỳ', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Công nợ & khóa kỳ', exact: true })).toBeVisible();
    const debts = await (await debtResponse).json();
    const matchingDebts = (debts.data || debts).filter((debt: { source?: { type?: string; id?: string }; direction: string; originalAmount: { amount: string } }) => debt.source?.type === 'goods_receipt' && debt.source.id === receiptId && debt.direction === 'payable');
    expect(matchingDebts).toHaveLength(1);
    expect(matchingDebts[0].originalAmount.amount).toBe('195000');

    await page.setViewportSize({ width: 320, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    await page.setViewportSize({ width: 1440, height: 900 });
    const audit = await new AxeBuilder({ page }).include('main#main-content').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(audit.violations.map(issue => issue.id)).toEqual([]);
});

test('FE014.D03/D04/D07 replenishment uses min-max rules, labels forecast limits, and blocks duplicate proposals', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/replenishment');
    await page.getByRole('tab', { name: 'Quy tắc theo SKU' }).click();
    const ruleRow = page.getByRole('row').filter({ hasText: 'v-p1' });
    await ruleRow.getByRole('button', { name: 'Chỉnh quy tắc' }).click();
    const ruleDialog = page.getByRole('dialog', { name: 'Quy tắc nhập lại' });
    await expect(ruleDialog.getByRole('spinbutton', { name: 'Ngưỡng nhập' })).toHaveValue('2');
    await expect(ruleDialog.getByRole('spinbutton', { name: 'Nhập tới' })).toHaveValue('20');
    await expect(ruleDialog.getByRole('spinbutton', { name: 'Tồn an toàn' })).toHaveValue('2');
    await expect(ruleDialog.getByRole('combobox', { name: 'Mức tự động' })).toContainText('2 · Lập nháp chờ duyệt');
    await ruleDialog.getByRole('button', { name: 'Hủy', exact: true }).click();

    await page.getByRole('tab', { name: 'Đề nghị nhập' }).click();
    const evaluateWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/purchase-suggestions/evaluate'));
    await page.getByRole('button', { name: 'Đánh giá nhu cầu nhập' }).click();
    expect((await evaluateWait).status()).toBe(202);
    const p6 = page.getByRole('row').filter({ hasText: 'v-p6' });
    await expect(p6).toContainText('Quy tắc min-max; đã trừ hàng đang đặt. Không phải dự báo AI.');
    await expect(p6.getByRole('button', { name: 'Lập đơn nháp' })).toBeDisabled();

    const p8 = page.getByRole('row').filter({ hasText: 'v-p8' });
    await expect(p8.getByRole('button', { name: 'Lập đơn nháp' })).toBeEnabled();
    const createWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/purchase-orders'));
    await p8.getByRole('button', { name: 'Lập đơn nháp' }).click();
    expect((await createWait).status()).toBe(201);
    await expect(page).toHaveURL(/\/s\/shop-demo\/purchases$/);

    await page.getByRole('link', { name: 'Đề nghị nhập', exact: true }).click();
    const reevaluateWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/purchase-suggestions/evaluate'));
    await page.getByRole('button', { name: 'Đánh giá nhu cầu nhập' }).click();
    expect((await reevaluateWait).status()).toBe(202);
    const refreshedP8 = page.getByRole('row').filter({ hasText: 'v-p8' });
    await expect(refreshedP8.getByRole('button', { name: 'Lập đơn nháp' })).toBeDisabled();
    await expect(refreshedP8.getByRole('cell').nth(4)).toHaveText('20');
});
