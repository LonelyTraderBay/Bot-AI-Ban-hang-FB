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

async function chooseOption(page: import('@playwright/test').Page, label: string, value: string | RegExp) {
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
}

async function createPendingPurchaseApproval(page: import('@playwright/test').Page) {
    await gotoDemo(page, '/s/shop-demo/purchases');
    await page.getByRole('button', { name: 'Tạo đơn mua', exact: true }).click();
    const draft = page.getByRole('dialog', { name: 'Đơn mua mới' });
    await chooseOption(page, 'Nhà cung cấp đã duyệt', 'Xưởng hàng mẫu');
    await chooseOption(page, 'Báo giá dòng 1', /v-p1/);
    const createdResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v2/shops/shop-demo/purchase-orders');
    await draft.getByRole('button', { name: 'Lưu đơn nháp', exact: true }).click();
    const created = await (await createdResponse).json();
    const purchaseId = created.data.id as string;
    const purchaseDialog = page.getByRole('dialog', { name: `Đơn mua ${purchaseId}` });
    const approvalResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/purchase-orders/${purchaseId}/request-approval`));
    await purchaseDialog.getByRole('button', { name: 'Xin phê duyệt', exact: true }).click();
    const approvalEnvelope = await (await approvalResponse).json();
    return { purchaseId, approval: approvalEnvelope.data as { id: string; version: number; resourceVersion: number; intentHash: string } };
}

test('FE020.AC01 approval detail is fetched and a changed source resource rejects the stale decision', async ({ page }) => {
    const { purchaseId, approval } = await createPendingPurchaseApproval(page);
    await page.getByRole('link', { name: /Xem phê duyệt/ }).click();
    const row = page.getByRole('row').filter({ hasText: purchaseId });
    await expect(row).toBeVisible();

    const detailWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith(`/approvals/${approval.id}`));
    await row.getByRole('button', { name: 'Xem & quyết định' }).click();
    const detailResponse = await detailWait;
    expect(detailResponse.status()).toBe(200);
    const detail = (await detailResponse.json()).data;
    expect(detail).toMatchObject({ id: approval.id, status: 'pending', intentHash: approval.intentHash, resourceVersion: approval.resourceVersion });
    const dialog = page.getByRole('dialog', { name: 'Xem xét phê duyệt' });
    await expect(dialog.getByText('synthetic-policy-1', { exact: true })).toBeVisible();
    await expect(dialog.getByText(new RegExp(`phiên bản ${approval.resourceVersion}`, 'i'))).toBeVisible();

    const mutations = await page.evaluate(async ({ purchaseId, approvalId, approvalVersion, expectedVersion }) => {
        const csrfEnvelope = await fetch('/api/v2/auth/csrf').then(response => response.json());
        const wrongIntent = await fetch(`/api/v2/shops/shop-demo/approvals/${approvalId}/decision`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfEnvelope.data.csrfToken, 'Idempotency-Key': 'fe020-wrong-approval-intent' },
            body: JSON.stringify({ expectedVersion: approvalVersion, intentHash: '0'.repeat(64), decision: 'approve', reason: 'Thử duyệt payload không khớp.' }),
        });
        const wrongIntentProblem = await wrongIntent.json();
        const response = await fetch(`/api/v2/shops/shop-demo/purchase-orders/${purchaseId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfEnvelope.data.csrfToken, 'Idempotency-Key': 'fe020-stale-source-cancel' },
            body: JSON.stringify({ expectedVersion, reason: 'Nguồn đổi sau khi xin phê duyệt' }),
        });
        return { wrongIntentStatus: wrongIntent.status, wrongIntentProblem, cancelStatus: response.status };
    }, { purchaseId, approvalId: approval.id, approvalVersion: approval.version, expectedVersion: approval.resourceVersion });
    expect(mutations.wrongIntentStatus).toBe(409);
    expect(mutations.wrongIntentProblem.detail).toBe('Nội dung phê duyệt đã đổi.');
    expect(mutations.cancelStatus).toBe(202);

    await dialog.getByRole('textbox', { name: 'Lý do quyết định' }).fill('Không duyệt vì nguồn đã thay đổi sau khi xin duyệt.');
    const decisionRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith(`/approvals/${approval.id}/decision`));
    const decisionResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/approvals/${approval.id}/decision`));
    await dialog.getByRole('button', { name: 'Duyệt đúng nội dung này' }).click();
    const body = (await decisionRequest).postDataJSON();
    expect(body).toMatchObject({ expectedVersion: approval.version, intentHash: approval.intentHash, decision: 'approve' });
    expect((await decisionResponse).status()).toBe(409);
    await expect(dialog.getByRole('alert').filter({ hasText: 'Đơn mua đã thay đổi sau khi xin duyệt.' })).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: 'Lý do quyết định' })).toHaveValue('Không duyệt vì nguồn đã thay đổi sau khi xin duyệt.');
});

test('FE020.AC02/03 work-item actions follow allowedActions and operations health stays explicitly synthetic', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/operations');
    await expect(page.getByText('Dữ liệu vận hành và trạng thái dịch vụ đang được mô phỏng', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cập nhật', exact: true })).toHaveCount(0);
    await expect(page.getByText('Được phép: Không có hành động', { exact: true }).first()).toBeVisible();

    const attempt = await page.evaluate(async () => {
        const csrfEnvelope = await fetch('/api/v2/auth/csrf').then(response => response.json());
        const response = await fetch('/api/v2/shops/shop-demo/work-items/seed-workitem-10009/actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfEnvelope.data.csrfToken, 'Idempotency-Key': 'fe020-forbidden-work-action' },
            body: JSON.stringify({ expectedVersion: 3, action: 'complete', reason: 'Thử hành động không được cấp' }),
        });
        const claim = await fetch('/api/v2/shops/shop-demo/work-items/seed-workitem-10009/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfEnvelope.data.csrfToken, 'Idempotency-Key': 'fe020-forbidden-claim' },
            body: JSON.stringify({ expectedVersion: 3 }),
        });
        return { status: response.status, problem: await response.json(), claimStatus: claim.status, claimProblem: await claim.json() };
    });
    expect(attempt.status).toBe(409);
    expect(attempt.problem.code).toBe('CAPABILITY_UNAVAILABLE');
    expect(attempt.claimStatus).toBe(409);
    expect(attempt.claimProblem.code).toBe('CAPABILITY_UNAVAILABLE');

    await gotoDemo(page, '/s/shop-demo/operations/digests');
    await expect(page.getByText('Bản tin mẫu', { exact: false })).toBeVisible();
    await expect(page.getByText('Đây là dữ liệu mô phỏng.', { exact: false })).toBeVisible();
    await expect(page.getByText('digest-01 · phiên bản 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Không có mục công việc được tham chiếu', { exact: true })).toBeVisible();
    await expect(page.getByText(/Chưa có API tạo\/sửa lịch bản tin/)).toBeVisible();
    await expect(page.getByText('Chưa kiểm tra thực tế', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Tạo lịch bản tin|Lưu lịch bản tin/ })).toHaveCount(0);
    await page.getByLabel('Vai trò mô phỏng').click();
    await page.getByRole('option', { name: 'viewer', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Tạm dừng vai trò' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Kiểm tra điều kiện tiếp tục' })).toHaveCount(0);
    const denied = await page.evaluate(async () => {
        const csrfEnvelope = await fetch('/api/v2/auth/csrf').then(response => response.json());
        const response = await fetch('/api/v2/shops/shop-demo/automation-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfEnvelope.data.csrfToken, 'Idempotency-Key': 'fe020-viewer-control-denied' },
            body: JSON.stringify({ expectedVersion: 1, scope: 'role', resourceId: 'agent-0', action: 'pause', reason: 'Kiểm thử role không có quyền điều khiển.' }),
        });
        return { status: response.status, problem: await response.json() };
    });
    expect(denied.status).toBe(403);
    expect(denied.problem.code).toBe('FORBIDDEN');
});

test('FE020.AC03 role pause control uses the canonical versioned mock and never claims readiness', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/operations/digests');
    await page.getByRole('button', { name: 'Kiểm tra điều kiện tiếp tục' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Kiểm tra điều kiện tiếp tục' });
    await dialog.getByRole('textbox', { name: 'Lý do (ít nhất 5 ký tự)' }).fill('Kiểm tra mô phỏng policy và version hiện tại.');
    const requestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/automation-control'));
    const responseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/automation-control'));
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    const body = (await requestWait).postDataJSON();
    expect(body).toMatchObject({ expectedVersion: 1, scope: 'role', action: 'resume', reason: 'Kiểm tra mô phỏng policy và version hiện tại.' });
    expect(body.resourceId).toBeTruthy();
    expect((await responseWait).status()).toBe(202);
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(/Thế hệ 2 · Chưa cấu hình/).first()).toBeVisible();
    await expect(page.getByText(/healthy|Đã sẵn sàng/)).toHaveCount(0);
});

test('FE020.F03 operations exception filter groups overdue, blocked, and unclaimed synthetic work', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', request => {
        if (request.method() !== 'GET') writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });
    await gotoDemo(page, '/s/shop-demo/operations');
    const panel = page.getByTestId('operation-exceptions');
    await expect(panel).toContainText('Chỉ lọc trang dữ liệu hiện đang tải');
    await panel.getByRole('button', { name: /Chỉ xem ngoại lệ/ }).click();
    const table = page.getByRole('table');
    for (const sourceRef of ['DEMO-SHIPMENT-LATE', 'DEMO-BANK-MISMATCH', 'DEMO-ORDER-UNCLAIMED'])
        await expect(table.getByRole('row').filter({ hasText: sourceRef })).toBeVisible();
    await expect(table.getByRole('row').filter({ hasText: 'DH-DEMO-PAID-01' })).toHaveCount(0);
    await expect(table.getByRole('row')).toHaveCount(4);

    await panel.getByRole('button', { name: /Hiện mọi công việc/ }).click();
    await expect(table.getByRole('row').filter({ hasText: 'DH-DEMO-PAID-01' })).toBeVisible();
    await expect(table.getByRole('row')).toHaveCount(5);
    expect(writes).toEqual([]);
});

test('FE020.F05 delegation rule preview stays local and grants no API approval capability', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', request => {
        if (request.method() !== 'GET' && new URL(request.url()).pathname.startsWith('/api/v2/'))
            writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });
    await gotoDemo(page, '/s/shop-demo/approvals');
    await chooseOption(page, 'Vai trò được ủy quyền', 'Kho & mua hàng');
    await page.getByRole('spinbutton', { name: 'Hạn mức mẫu (VND)' }).fill('450000');
    await page.getByRole('button', { name: 'Tạo bản xem thử' }).click();
    const preview = page.getByTestId('delegation-preview');
    await expect(preview).toContainText('Kho & mua hàng');
    await expect(preview).toContainText('450.000 VND');
    await expect(preview).toContainText('không nâng scope');
    expect(writes).toEqual([]);
});

test('FE020.F06/H01 digest and dependency health panels show synthetic history without claiming workers are ready', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', request => {
        if (request.method() !== 'GET' && new URL(request.url()).pathname.includes('/shops/')) writes.push(request.method());
    });
    const digestsWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.includes('/api/v2/') && new URL(response.url()).pathname.endsWith('/digests'));
    const healthWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.includes('/api/v2/') && new URL(response.url()).pathname.endsWith('/operations-summary'));
    await gotoDemo(page, '/s/shop-demo/operations/digests');
    const [digestsResponse, healthResponse] = await Promise.all([digestsWait, healthWait]);
    expect(digestsResponse.status()).toBe(200);
    expect(healthResponse.status()).toBe(200);
    const digests = (await digestsResponse.json()).data as Array<{ id: string; text: string; status: string }>;
    const summary = (await healthResponse.json()).data as { health: Array<{ component: string; status: string; checkedAt: string | null; reason: string }> };

    await expect(page.getByRole('heading', { name: 'Bản tin & sức khỏe hệ thống', exact: true })).toBeVisible();
    await expect(page.getByText('Đây là dữ liệu mô phỏng.', { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bản tin điều hành', exact: true })).toBeVisible();
    for (const digest of digests) {
        await expect(page.getByText(digest.id, { exact: false })).toBeVisible();
        await expect(page.getByText(digest.text, { exact: true })).toBeVisible();
        expect(digest.status).toBe('draft');
    }
    for (const check of summary.health) {
        expect(check.status).toBe('unknown');
        expect(check.checkedAt).toBeNull();
        await expect(page.getByText(check.component, { exact: true })).toBeVisible();
        await expect(page.getByText(check.reason, { exact: true })).toHaveCount(summary.health.filter(candidate => candidate.reason === check.reason).length);
    }
    await expect(page.getByText('Chưa kiểm tra thực tế', { exact: true })).toHaveCount(summary.health.length);
    await expect(page.getByText(/Chưa có API tạo\/sửa lịch bản tin/)).toBeVisible();
    expect(writes).toEqual([]);
});

test('FE027.H08 restore and release readiness stay unknown without a verified rehearsal or deployment gate', async ({ page }) => {
    const readinessCalls: string[] = [];
    const writes: string[] = [];
    page.on('request', request => {
        const path = new URL(request.url()).pathname;
        if (/\/readiness|\/restore-status/.test(path)) readinessCalls.push(`${request.method()} ${path}`);
        if (request.method() !== 'GET' && path.startsWith('/api/v2/')) writes.push(`${request.method()} ${path}`);
    });
    await gotoDemo(page, '/s/shop-demo/operations/digests');
    const preview = page.getByTestId('readiness-preview');
    await expect(preview).toContainText('Diễn tập khôi phục bản sao lưu');
    await expect(preview).toContainText('Kiểm tra freshness của artifact và revision');
    await expect(preview).toContainText('Gates triển khai và kết quả CI');
    await expect(preview).toContainText('Môi trường/provider sau khi khôi phục');
    await expect(preview.getByText('Chưa xác minh', { exact: true })).toHaveCount(4);
    await expect(preview).toContainText('không thể cấp tín hiệu cho phép phát hành');
    expect(readinessCalls).toEqual([]);
    expect(writes).toEqual([]);
});
