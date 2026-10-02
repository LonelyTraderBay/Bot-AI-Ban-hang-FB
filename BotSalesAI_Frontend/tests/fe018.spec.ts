import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeEach(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterEach(async () => closeDemo?.());

async function gotoDemo(page: import('@playwright/test').Page, route: string) {
    await page.goto(new URL(route, demoUrl).toString());
}

async function chooseMockOption(page: import('@playwright/test').Page, label: string, option: string) {
    await page.getByRole('combobox').nth(label === 'Vai trò mô phỏng' ? 0 : 1).click();
    await page.getByRole('option', { name: option, exact: true }).click();
}

async function navigateToBotConfig(page: import('@playwright/test').Page) {
    await page.getByRole('link', { name: 'Cấu hình Admin' }).click();
    await expect(page.getByRole('heading', { name: 'Điều khiển Admin AI' })).toBeVisible();
}

async function navigateToBotTeam(page: import('@playwright/test').Page) {
    await page.getByRole('link', { name: 'Bốn nhân viên AI' }).click();
    await expect(page.getByRole('heading', { name: 'Đội ngũ AI' })).toBeVisible();
}

async function createEvaluation(page: import('@playwright/test').Page, datasetVersion = 'fe018-synthetic-dataset') {
    await gotoDemo(page, '/s/shop-demo/bot/evaluations');
    await expect(page.getByRole('alert').filter({ hasText: 'không đánh giá chất lượng mô hình AI thật' })).toBeVisible();
    await page.getByRole('button', { name: 'Chạy đánh giá' }).click();
    const dialog = page.getByRole('dialog', { name: 'Đánh giá cấu hình nháp' });
    await dialog.getByLabel('Phiên bản bộ kiểm thử đã đăng ký').fill(datasetVersion);
    const requestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/bot/evaluations'));
    const responseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/bot/evaluations'));
    await dialog.getByRole('button', { name: 'Bắt đầu' }).click();
    const request = await requestWait;
    const response = await responseWait;
    const envelope = await response.json();
    expect(response.status()).toBe(202);
    expect(request.postDataJSON()).toEqual({ configRevision: 1, datasetVersion, knowledgeRevisionId: null });
    expect(envelope.data).toMatchObject({ configRevision: 1, datasetVersion, status: 'passed', totalCases: 1, passedCases: 1, criticalFailures: 0, mockOnly: true });
    await page.getByRole('dialog', { name: 'Chi tiết đánh giá' }).getByRole('button', { name: 'Đóng' }).last().click();
    return envelope.data.id as string;
}

async function saveDraft(page: import('@playwright/test').Page, instructions: string) {
    await page.getByRole('button', { name: 'Sửa bản nháp' }).click();
    const dialog = page.getByRole('dialog', { name: 'Cấu hình bản nháp' });
    await dialog.getByLabel('Chỉ dẫn tư vấn đã duyệt').fill(instructions);
    const requestWait = page.waitForRequest(request => request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/bot/config'));
    const responseWait = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith('/bot/config'));
    await dialog.getByRole('button', { name: 'Lưu nháp' }).click();
    return { dialog, request: await requestWait, response: await responseWait };
}

async function readApi<T>(page: import('@playwright/test').Page, path: string): Promise<T> {
    return page.evaluate(async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`GET ${url} returned ${response.status}`);
        return (await response.json()).data;
    }, path);
}

test('FE018.S01 maps routes and operations to the canonical OpenAPI permissions', () => {
    const root = process.cwd();
    const manifest = JSON.parse(readFileSync(join(root, 'botsales-kit/contracts/route-manifest.json'), 'utf8')) as {
        routes: Array<{ id: string; module: string; readPermission: string; actions: Array<{ operationId: string; permission: string }> }>;
    };
    const openapi = JSON.parse(readFileSync(join(root, 'botsales-kit/contracts/openapi.json'), 'utf8')) as {
        paths: Record<string, Record<string, { operationId?: string; 'x-permission'?: string }>>;
    };
    const byId = new Map(Object.values(openapi.paths).flatMap(methods => Object.values(methods)).filter(op => op.operationId).map(op => [op.operationId, op]));
    for (const id of ['R26', 'R27', 'R28', 'R51']) {
        const route = manifest.routes.find(candidate => candidate.id === id);
        expect(route?.module).toBe('bot');
        for (const action of route?.actions || []) expect(byId.get(action.operationId)?.['x-permission']).toBe(action.permission);
    }
    expect(byId.get('updateBudgetPolicy')?.['x-permission']).toBe('operations.manage');
});

test('FE018.AC01/04 draft saves use the contract version and keep human order confirmation locked after a conflict', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/bot');
    await expect(page.getByText('Hợp đồng BotConfigWrite hiện khóa requireHumanOrderConfirmation=true.')).toBeVisible();
    await page.getByRole('button', { name: 'Sửa bản nháp' }).click();
    const dialog = page.getByRole('dialog', { name: 'Cấu hình bản nháp' });
    const instructions = 'Chỉ tư vấn theo dữ liệu mẫu đã duyệt; không tự chốt đơn.';
    await dialog.getByLabel('Chỉ dẫn tư vấn đã duyệt').fill(instructions);
    const requestWait = page.waitForRequest(request => request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/bot/config'));
    const responseWait = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith('/bot/config'));
    await dialog.getByRole('button', { name: 'Lưu nháp' }).click();
    const request = await requestWait;
    const response = await responseWait;
    expect(request.headers()['if-match']).toBe('"1"');
    expect(request.postDataJSON()).toMatchObject({ instructions, requireHumanOrderConfirmation: true });
    expect(response.status()).toBe(200);
    expect((await response.json()).data).toMatchObject({ draftRevision: 2, version: 2, instructions, requireHumanOrderConfirmation: true });

    await chooseMockOption(page, 'Trạng thái thử', 'Xung đột lần ghi tiếp');
    await page.getByRole('button', { name: 'Sửa bản nháp' }).click();
    const staleDialog = page.getByRole('dialog', { name: 'Cấu hình bản nháp' });
    const edited = 'Bản sửa phải được giữ lại khi máy chủ báo xung đột.';
    await staleDialog.getByLabel('Chỉ dẫn tư vấn đã duyệt').fill(edited);
    const staleResponseWait = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith('/bot/config'));
    await staleDialog.getByRole('button', { name: 'Lưu nháp' }).click();
    const staleResponse = await staleResponseWait;
    expect(staleResponse.status()).toBe(412);
    await expect(staleDialog.getByRole('alert').filter({ hasText: 'Mô phỏng dữ liệu bị thay đổi bởi người khác.' })).toBeVisible();
    await expect(staleDialog.getByLabel('Chỉ dẫn tư vấn đã duyệt')).toHaveValue(edited);
    expect(await readApi<{ instructions: string; draftRevision: number }>(page, '/api/v2/shops/shop-demo/bot/config')).toMatchObject({ instructions, draftRevision: 2 });
});

test('FE018.AC03 evaluation is synthetic, revision-bound, and cannot publish a stale draft', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/bot');
    const evaluationId = await createEvaluation(page);
    await navigateToBotConfig(page);
    const changed = await saveDraft(page, 'Cấu hình mới hơn lần đánh giá cũ.');
    expect(changed.response.status()).toBe(200);
    expect(changed.request.postDataJSON()).toMatchObject({ requireHumanOrderConfirmation: true });

    await page.getByRole('button', { name: 'Duyệt & xuất bản' }).click();
    const dialog = page.getByRole('dialog', { name: 'Xuất bản cấu hình đã đánh giá' });
    await dialog.getByLabel('Mã lần đánh giá đúng bản nháp').fill(evaluationId);
    await dialog.getByLabel('Lý do').fill('Đánh giá cũ không áp dụng');
    const requestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/bot/config/publish'));
    const responseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/bot/config/publish'));
    await dialog.getByRole('button', { name: 'Xuất bản' }).click();
    const request = await requestWait;
    const response = await responseWait;
    expect(request.postDataJSON()).toMatchObject({ expectedVersion: 2, draftRevision: 2, evaluationRunId: evaluationId, reason: 'Đánh giá cũ không áp dụng' });
    expect(response.status()).toBe(409);
    await expect(dialog.getByRole('alert').filter({ hasText: 'Đánh giá không khớp bản nháp.' })).toBeVisible();
    await expect(dialog.getByLabel('Mã lần đánh giá đúng bản nháp')).toHaveValue(evaluationId);
    expect(await readApi<{ status: string; draftRevision: number; liveRevision: number | null }>(page, '/api/v2/shops/shop-demo/bot/config')).toMatchObject({ status: 'paused', draftRevision: 2, liveRevision: null });
});

test('FE018.AC01/04 successful publish is tied to the tested revision and pause explains its boundary', async ({ page }) => {
    const evaluationId = await createEvaluation(page);
    await navigateToBotConfig(page);
    await page.getByRole('button', { name: 'Duyệt & xuất bản' }).click();
    const publishDialog = page.getByRole('dialog', { name: 'Xuất bản cấu hình đã đánh giá' });
    await publishDialog.getByLabel('Mã lần đánh giá đúng bản nháp').fill(evaluationId);
    await publishDialog.getByLabel('Lý do').fill('Đã kiểm tra bản nháp');
    const publishRequestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/bot/config/publish'));
    const publishResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/bot/config/publish'));
    await publishDialog.getByRole('button', { name: 'Xuất bản' }).click();
    const publishRequest = await publishRequestWait;
    const publishResponse = await publishResponseWait;
    expect(publishRequest.postDataJSON()).toEqual({ expectedVersion: 1, draftRevision: 1, evaluationRunId: evaluationId, reason: 'Đã kiểm tra bản nháp' });
    expect(publishResponse.status()).toBe(202);
    await expect.poll(async () => (await readApi<{ status: string; liveRevision: number | null; requireHumanOrderConfirmation: boolean }>(page, '/api/v2/shops/shop-demo/bot/config'))).toMatchObject({ status: 'active', liveRevision: 1, requireHumanOrderConfirmation: true });

    await page.getByRole('button', { name: 'Tạm dừng bot' }).click();
    const pauseDialog = page.getByRole('dialog', { name: 'Tạm dừng Admin AI' });
    await expect(pauseDialog).toContainText('Tin nhắn đã được nhà cung cấp nhận không thể thu hồi');
    await pauseDialog.getByLabel('Lý do (ít nhất 5 ký tự)').fill('Dừng kiểm thử');
    const pauseRequestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/bot/pause'));
    const pauseResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/bot/pause'));
    await pauseDialog.getByRole('button', { name: 'Xác nhận' }).click();
    const pauseRequest = await pauseRequestWait;
    const pauseResponse = await pauseResponseWait;
    expect(pauseRequest.postDataJSON()).toEqual({ expectedVersion: 2, reason: 'Dừng kiểm thử' });
    expect(pauseResponse.status()).toBe(202);
    await expect.poll(async () => (await readApi<{ status: string; liveRevision: number | null }>(page, '/api/v2/shops/shop-demo/bot/config'))).toMatchObject({ status: 'paused', liveRevision: 1 });
});

test('FE018.AC03 playground sends no external message and preserves unknown cost and token values', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/bot/playground');
    const prompt = 'Khách mẫu hỏi sản phẩm có phù hợp không?';
    await page.getByLabel('Nội dung khách hỏi').fill(prompt);
    const requestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/bot/playground'));
    const responseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/bot/playground'));
    await page.getByRole('button', { name: 'Chạy thử' }).click();
    const request = await requestWait;
    const response = await responseWait;
    const result = (await response.json()).data;
    expect(response.status()).toBe(200);
    expect(request.postDataJSON()).toEqual({ configRevision: 1, text: prompt, customerContextId: null });
    expect(result).toMatchObject({ configRevision: 1, estimatedCost: null, inputTokens: null, outputTokens: null, externalMessageSent: false });
    expect(result.text).toContain('[Mô phỏng, không gọi AI]');
    expect(result.warnings).toContain('Đây là kiểm tra giao diện, không đo chất lượng mô hình AI.');
    await expect(page.getByText('[Mô phỏng, không gọi AI]', { exact: false })).toBeVisible();
    await expect(page.getByText('Gửi ra ngoài', { exact: true }).locator('..')).toContainText('Không');
    await expect(page.getByRole('alert').filter({ hasText: 'không đo chất lượng mô hình AI' })).toBeVisible();
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth) + 1);
});

test('FE018.S03 synthetic budget and tool denials retain the prompt and never show a generated answer', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/bot/playground');
    const prompt = 'Kiểm tra tình huống dừng an toàn trong sandbox.';
    const input = page.getByLabel('Nội dung khách hỏi');
    await input.fill(prompt);
    await chooseMockOption(page, 'Trạng thái thử', 'Hết hạn mức AI mô phỏng');
    const budgetWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/bot/playground'));
    await page.getByRole('button', { name: 'Chạy thử' }).click();
    const budgetResponse = await budgetWait;
    expect(budgetResponse.status()).toBe(429);
    expect(await budgetResponse.json()).toMatchObject({ code: 'BUDGET_EXCEEDED', status: 429 });
    await expect(page.getByRole('alert').filter({ hasText: 'Hạn mức AI mô phỏng đã đạt giới hạn' })).toBeVisible();
    await expect(input).toHaveValue(prompt);
    await expect(page.getByText('Chạy câu hỏi để xem câu trả lời, nguồn và cảnh báo. Không có điểm chất lượng tự tạo.')).toBeVisible();

    await chooseMockOption(page, 'Trạng thái thử', 'Công cụ bị từ chối');
    const toolWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/bot/playground'));
    await page.getByRole('button', { name: 'Chạy thử' }).click();
    const toolResponse = await toolWait;
    expect(toolResponse.status()).toBe(403);
    expect(await toolResponse.json()).toMatchObject({ code: 'TOOL_NOT_ALLOWED', status: 403 });
    await expect(page.getByRole('alert').filter({ hasText: 'không thuộc allowedToolIds' })).toBeVisible();
    await expect(input).toHaveValue(prompt);
    await expect(page.getByText('Chạy câu hỏi để xem câu trả lời, nguồn và cảnh báo. Không có điểm chất lượng tự tạo.')).toBeVisible();
});

test('FE027.H03 budget and provider failover preview refuses silent provider switching on exhaustion', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', request => {
        if (request.method() !== 'GET' && new URL(request.url()).pathname.startsWith('/api/v2/')) writes.push(request.method());
    });
    await gotoDemo(page, '/s/shop-demo/bot/team');
    const preview = page.getByTestId('provider-failover-preview');
    await expect(preview).toContainText('Chi phí trong phòng thử là ước tính mô phỏng');
    await expect(preview).toContainText('Provider dự phòng');
    await expect(preview).toContainText('Chưa có trạng thái failover được xác minh');
    await expect(preview).toContainText('không âm thầm đổi provider');
    expect(writes).toEqual([]);
});

test('FE018.AC02 role kill switch is versioned, preserves API tools, and does not pause the whole bot', async ({ page }) => {
    const evaluationId = await createEvaluation(page);
    await navigateToBotConfig(page);
    await page.getByRole('button', { name: 'Duyệt & xuất bản' }).click();
    const publishDialog = page.getByRole('dialog', { name: 'Xuất bản cấu hình đã đánh giá' });
    await publishDialog.getByLabel('Mã lần đánh giá đúng bản nháp').fill(evaluationId);
    await publishDialog.getByLabel('Lý do').fill('Thiết lập bot đang chạy');
    const publishResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/bot/config/publish'));
    await publishDialog.getByRole('button', { name: 'Xuất bản' }).click();
    expect((await publishResponseWait).status()).toBe(202);
    await navigateToBotTeam(page);
    const before = await readApi<Array<{ id: string; version: number; status: string; allowedToolIds: string[] }>>(page, '/api/v2/shops/shop-demo/agent-roles');
    expect(before[0]).toMatchObject({ id: 'agent-0', status: 'paused', allowedToolIds: ['catalog.read', 'quote.create', 'order.draft'] });
    expect(before[0].allowedToolIds).not.toContain('orders.confirm');

    await page.getByRole('button', { name: 'Đề nghị tiếp tục' }).first().click();
    const resumeDialog = page.getByRole('dialog', { name: 'Kiểm điều kiện để tiếp tục' });
    await resumeDialog.getByLabel('Lý do (ít nhất 5 ký tự)').fill('Kiểm thử tiếp tục');
    const resumeRequestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/automation-control'));
    const resumeResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/automation-control'));
    await resumeDialog.getByRole('button', { name: 'Xác nhận' }).click();
    const resumeRequest = await resumeRequestWait;
    expect(resumeRequest.postDataJSON()).toMatchObject({ expectedVersion: 1, scope: 'role', resourceId: 'agent-0', action: 'resume', reason: 'Kiểm thử tiếp tục' });
    expect((await resumeResponseWait).status()).toBe(202);
    await expect(page.getByRole('button', { name: 'Tạm dừng' }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Tạm dừng' }).first().click();
    const pauseDialog = page.getByRole('dialog', { name: 'Tạm dừng vai trò' });
    await pauseDialog.getByLabel('Lý do (ít nhất 5 ký tự)').fill('Dừng riêng vai trò');
    const pauseRequestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/automation-control'));
    const pauseResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/automation-control'));
    await pauseDialog.getByRole('button', { name: 'Xác nhận' }).click();
    const pauseRequest = await pauseRequestWait;
    expect(pauseRequest.postDataJSON()).toMatchObject({ expectedVersion: 2, scope: 'role', resourceId: 'agent-0', action: 'pause', reason: 'Dừng riêng vai trò' });
    expect((await pauseResponseWait).status()).toBe(202);
    const afterRoles = await readApi<Array<{ id: string; status: string; allowedToolIds: string[] }>>(page, '/api/v2/shops/shop-demo/agent-roles');
    const afterBot = await readApi<{ status: string; liveRevision: number | null }>(page, '/api/v2/shops/shop-demo/bot/config');
    expect(afterRoles[0]).toMatchObject({ id: 'agent-0', status: 'paused', allowedToolIds: before[0].allowedToolIds });
    expect(afterBot).toMatchObject({ status: 'active', liveRevision: 1 });
});

test('FE018.AC02 expired, wrong-scope, and matching approvals produce honest budget results', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/bot/team');
    await page.getByRole('button', { name: 'Đổi có phê duyệt' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Đổi giới hạn được duyệt' });
    const amount = dialog.getByLabel('Giới hạn (VND)');
    const approval = dialog.getByLabel('Mã phê duyệt đúng nội dung');
    await amount.fill('350000');
    const attempt = async (approvalId: string) => {
        await approval.fill(approvalId);
        const requestWait = page.waitForRequest(request => request.method() === 'PUT' && new URL(request.url()).pathname.endsWith('/budget-policies/budget-0'));
        const responseWait = page.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname.endsWith('/budget-policies/budget-0'));
        await dialog.getByRole('button', { name: 'Áp dụng giới hạn' }).click();
        return { request: await requestWait, response: await responseWait };
    };
    const wrongScope = await attempt('seed-approval-10049');
    expect(wrongScope.request.postDataJSON()).toMatchObject({ expectedVersion: 1, limitAmount: { amount: '350000', currency: 'VND' }, approvalId: 'seed-approval-10049' });
    expect(wrongScope.response.status()).toBe(409);
    await expect(dialog.getByRole('alert').filter({ hasText: 'Phê duyệt đã hết hạn, sai phiên bản hoặc không thuộc hạn mức này.' })).toBeVisible();
    const expired = await attempt('demo-budget-expired');
    expect(expired.response.status()).toBe(409);
    const unchanged = await readApi<Array<{ id: string; limitAmount: { amount: string } }>>(page, '/api/v2/shops/shop-demo/budget-policies');
    expect(unchanged.find(item => item.id === 'budget-0')).toMatchObject({ limitAmount: { amount: '300000' } });
    await expect(amount).toHaveValue('350000');
    const valid = await attempt('demo-budget-valid');
    expect(valid.response.status()).toBe(200);
    expect((await valid.response.json()).data).toMatchObject({ id: 'budget-0', version: 2, limitAmount: { amount: '350000', currency: 'VND' } });
});

test('FE018.AC05 manager and bot-admin roles cannot use operations outside their canonical permissions', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/bot');
    await chooseMockOption(page, 'Vai trò mô phỏng', 'manager');
    await expect(page.getByRole('button', { name: 'Sửa bản nháp' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Duyệt & xuất bản' })).toHaveCount(0);
    const deniedDraft = await page.evaluate(async () => {
        const response = await fetch('/api/v2/shops/shop-demo/bot/config', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'botsales-demo-csrf-not-a-real-secret', 'Idempotency-Key': 'fe018-manager-write', 'If-Match': '"1"' },
            body: JSON.stringify({ instructions: 'Không được phép' }),
        });
        return response.status;
    });
    expect(deniedDraft).toBe(403);
    expect(await readApi<{ instructions: string; draftRevision: number }>(page, '/api/v2/shops/shop-demo/bot/config')).toMatchObject({ draftRevision: 1 });

    await chooseMockOption(page, 'Vai trò mô phỏng', 'bot_admin');
    await navigateToBotTeam(page);
    await expect(page.getByRole('button', { name: 'Đổi có phê duyệt' })).toHaveCount(0);
    const deniedBudget = await page.evaluate(async () => {
        const response = await fetch('/api/v2/shops/shop-demo/budget-policies/budget-0', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'botsales-demo-csrf-not-a-real-secret', 'Idempotency-Key': 'fe018-bot-admin-budget' },
            body: JSON.stringify({ expectedVersion: 1, limitAmount: { amount: '350000', currency: 'VND' }, period: 'daily', approvalId: 'demo-budget-valid' }),
        });
        return response.status;
    });
    expect(deniedBudget).toBe(403);
    const unchanged = await readApi<Array<{ id: string; limitAmount: { amount: string } }>>(page, '/api/v2/shops/shop-demo/budget-policies');
    expect(unchanged.find(item => item.id === 'budget-0')).toMatchObject({ limitAmount: { amount: '300000' } });
});

test('FE018.AC05 unknown role command stays unresolved and does not claim successful resumption', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/bot/team');
    await chooseMockOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
    await page.getByRole('button', { name: 'Đề nghị tiếp tục' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Kiểm điều kiện để tiếp tục' });
    await dialog.getByLabel('Lý do (ít nhất 5 ký tự)').fill('Lệnh cần đối soát');
    const responseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/automation-control'));
    await dialog.getByRole('button', { name: 'Xác nhận' }).click();
    const response = await responseWait;
    expect(response.status()).toBe(202);
    expect((await response.json()).data.status).toBe('unknown');
    await expect(dialog.getByRole('alert')).toContainText('Chưa xác minh được kết quả');
    await expect(dialog).toBeVisible();
    expect(await readApi<Array<{ id: string; status: string }>>(page, '/api/v2/shops/shop-demo/agent-roles')).toContainEqual(expect.objectContaining({ id: 'agent-0', status: 'not_configured' }));
});
