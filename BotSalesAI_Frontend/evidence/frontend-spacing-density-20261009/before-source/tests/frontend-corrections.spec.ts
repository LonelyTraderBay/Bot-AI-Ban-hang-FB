import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { startDemoServer } from './session/demo-server.mjs';
let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer({ cacheIsolationKey: 'frontend-corrections' }); demoUrl = server.url; closeDemo = server.close; });
test.afterAll(async () => closeDemo?.());
async function visit(page: Page, path: string) { await page.goto(demoUrl + '/s/shop-demo/' + path); await expect(page.locator('main')).toBeVisible(); }
async function mutate(page: Page, path: string, body: unknown, method = 'POST', version?: number) {
    return page.evaluate(async ({ path, body, method, version }) => {
        const response = await fetch('/api/v2/shops/shop-demo/' + path, { method, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'botsales-demo-csrf-not-a-real-secret', 'Idempotency-Key': crypto.randomUUID(), ...(version !== undefined ? { 'If-Match': `"${version}"` } : {}) }, body: JSON.stringify(body) });
        return { status: response.status, payload: await response.json() };
    }, { path, body, method, version });
}
async function pulse(page: Page) { expect((await mutate(page, 'customers', { displayName: 'Synthetic refresh event', phone: null, email: null, notes: '' })).status).toBe(201); }

test('F01 preserves a customer draft, compares three snapshots, and PATCHes only chosen changes', async ({ page }) => {
    await visit(page, 'customers/c1');
    const name = page.getByLabel('Tên khách hàng', { exact: true });
    const notes = page.getByLabel('Ghi chú (không bắt buộc)', { exact: true });
    await expect(name).toHaveValue('Linh (khách mẫu)');
    const originalNotes = await notes.inputValue();
    await name.fill('Local draft');
    const current = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/customers/c1')).json()).data);
    const refetch = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/customers/c1'));
    expect((await mutate(page, 'customers/c1', { notes: 'Concurrent server note' }, 'PATCH', current.version)).status).toBe(200);
    await refetch;
    await expect(name).toHaveValue('Local draft'); await expect(notes).toHaveValue(originalNotes);
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Concurrent server note', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Áp dụng vào bản nháp', exact: true }).click();
    await expect(notes).toHaveValue('Concurrent server note');
    const requested = page.waitForRequest(request => request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/customers/c1'));
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    const request = await requested;
    expect(request.headers()['if-match']).toBe(`"${current.version + 1}"`);
    expect(request.postDataJSON()).toEqual({ displayName: 'Local draft' });
    await expect(page.getByRole('heading', { name: 'Local draft', exact: true })).toBeVisible();
    const stored = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/customers/c1')).json()).data);
    expect(stored.notes).toBe('Concurrent server note');
});

test('F01 requires an explicit choice for a field changed by both editors', async ({ page }) => {
    await visit(page, 'customers/c1');
    await expect(page.getByLabel('Tên khách hàng', { exact: true })).toHaveValue('Linh (khách mẫu)');
    await page.getByLabel('Tên khách hàng', { exact: true }).fill('Mine');
    expect((await mutate(page, 'customers/c1', { displayName: 'Theirs' }, 'PATCH', 1)).status).toBe(200);
    await expect(page.getByRole('button', { name: 'Đối chiếu', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Đối chiếu', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
    const apply = dialog.getByRole('button', { name: 'Áp dụng vào bản nháp', exact: true });
    await expect(apply).toBeDisabled();
    await dialog.getByRole('combobox', { name: 'Chọn dữ liệu: Tên khách hàng', exact: true }).click();
    await page.getByRole('option', { name: 'Giữ bản nháp', exact: true }).click();
    await expect(apply).toBeEnabled(); await apply.click();
    await expect(page.getByLabel('Tên khách hàng', { exact: true })).toHaveValue('Mine');
});

test('F06 detects an order draft and blocks navigation until explicit discard', async ({ page }) => {
    await visit(page, 'orders/new');
    await page.getByLabel('Ghi chú chuẩn bị').fill('Keep this order draft');
    await page.getByRole('link', { name: 'Danh sách đơn', exact: true }).click();
    const warning = page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?', exact: true });
    await expect(warning).toBeVisible();
    await warning.getByRole('button', { name: 'Tiếp tục chỉnh sửa', exact: true }).click();
    await expect(page.getByLabel('Ghi chú chuẩn bị')).toHaveValue('Keep this order draft');
    await page.getByRole('link', { name: 'Danh sách đơn', exact: true }).click();
    await warning.getByRole('button', { name: 'Rời màn hình', exact: true }).click();
    await expect(page).toHaveURL(/\/orders$/);
});

test('F02 retains an unsaved product image through an unrelated refetch', async ({ page }) => {
    await visit(page, 'products/p1');
    await expect(page.getByLabel('Tên sản phẩm')).toHaveValue('Áo mẫu A');
    await page.locator('input[type="file"]').setInputFiles({ name: 'regression.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pWQAAAAASUVORK5CYII=', 'base64') });
    await expect(page.getByText('1 tệp được gắn với sản phẩm', { exact: true })).toBeVisible();
    const refreshed = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/products/p1'));
    await pulse(page); await refreshed;
    await expect(page.getByText('1 tệp được gắn với sản phẩm', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Danh sách', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?', exact: true })).toBeVisible();
});

test('F03 retains notification-policy inputs through a background resync and navigation', async ({ page }) => {
    await visit(page, 'notifications/devices');
    const minutes = page.getByLabel('Nhắc sau (phút), để trống nếu chưa chốt', { exact: true });
    await expect(minutes).toHaveValue(''); await minutes.fill('17');
    const refreshed = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/notification-policy'));
    await pulse(page); await refreshed;
    await expect(minutes).toHaveValue('17');
    await page.getByRole('link', { name: 'Thông báo', exact: true }).first().click();
    await expect(page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?', exact: true })).toBeVisible();
});

test('F05 keeps text typed while a previous internal note is pending', async ({ page }) => {
    await visit(page, 'inbox/cv1');
    await page.getByLabel('Ghi chú nội bộ (không gửi khách)').check();
    const text = page.getByLabel('Ghi chú cho nhóm', { exact: true });
    const submittedText = '😀'.repeat(6000);
    await text.fill(submittedText); await expect(text).toHaveValue(submittedText);
    await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationDelay('addInternalNote', 700));
    const response = page.waitForResponse(result => result.request().method() === 'POST' && new URL(result.url()).pathname.includes('/notes'));
    await page.getByRole('button', { name: 'Lưu ghi chú', exact: true }).click();
    await text.fill('Typed next while pending'); const submittedResponse = await response;
    expect(submittedResponse.status()).toBe(201); expect((await submittedResponse.json()).data.text).toBe(submittedText);
    await expect(page.getByRole('button', { name: 'Lưu ghi chú', exact: true })).toBeEnabled();
    await expect(text).toHaveValue('Typed next while pending');
});

test('F08 validates 4001 customer-note characters at the field and accepts 4000', async ({ page }) => {
    await visit(page, 'customers'); await page.getByRole('button', { name: 'Thêm khách hàng', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Thêm khách hàng', exact: true });
    await dialog.getByLabel('Tên khách hàng', { exact: true }).fill('Note boundary');
    const notes = dialog.getByLabel('Ghi chú (không bắt buộc)', { exact: true });
    await notes.fill('a'.repeat(4001));
    let posted = false;
    page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/customers')) posted = true; });
    await dialog.getByRole('button', { name: 'Lưu khách hàng', exact: true }).click();
    await expect(dialog.getByText('Ghi chú không được vượt quá 4.000 ký tự.', { exact: true })).toBeVisible();
    expect(posted).toBe(false);
    await notes.fill('😀'.repeat(4001));
    await dialog.getByRole('button', { name: 'Lưu khách hàng', exact: true }).click();
    await expect(dialog.getByText('Ghi chú không được vượt quá 4.000 ký tự.', { exact: true })).toBeVisible();
    expect(posted).toBe(false);
    await notes.fill('a'.repeat(4000));
    const response = page.waitForResponse(result => result.request().method() === 'POST' && new URL(result.url()).pathname.endsWith('/customers'));
    await dialog.getByRole('button', { name: 'Lưu khách hàng', exact: true }).click();
    const created = await response;
    expect(created.status()).toBe(201);
    const payload = await created.json();
    expect(payload.data.notes).toBe('a'.repeat(4000));
    await expect(page).toHaveURL(demoUrl + '/s/shop-demo/customers/' + payload.data.id);
    await page.getByRole('link', { name: 'Danh sách khách', exact: true }).click();
    await page.getByRole('button', { name: 'Thêm khách hàng', exact: true }).click();
    await dialog.getByLabel('Tên khách hàng', { exact: true }).fill('Unicode note boundary');
    await notes.fill('😀'.repeat(4000));
    const unicodeResponse = page.waitForResponse(result => result.request().method() === 'POST' && new URL(result.url()).pathname.endsWith('/customers'));
    await dialog.getByRole('button', { name: 'Lưu khách hàng', exact: true }).click();
    const unicodeCreated = await unicodeResponse; expect(unicodeCreated.status()).toBe(201);
    const unicodePayload = await unicodeCreated.json(); expect(unicodePayload.data.notes).toBe('😀'.repeat(4000));
    await expect(page).toHaveURL(demoUrl + '/s/shop-demo/customers/' + unicodePayload.data.id);
});

test('F07 routes the fulfillment footer close through the shared discard guard', async ({ page }) => {
    await visit(page, 'fulfillment');
    await page.getByRole('button', { name: 'Mở phiếu lấy hàng', exact: true }).first().waitFor();
    await page.evaluate(async () => { const { db } = await import('/src/mocks/database.ts'); db.prepJobs.find((row: Record<string, unknown>) => row.shopId === 'shop-demo').state = 'picking'; });
    await page.getByRole('button', { name: 'Mở phiếu lấy hàng', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: /^Phiếu chuẩn bị/ });
    await dialog.getByLabel('Nhập/quét SKU thực tế').fill('Unsaved scan');
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    const warning = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true });
    await expect(warning).toBeVisible();
    await warning.getByRole('button', { name: 'Tiếp tục sửa', exact: true }).click();
    await expect(dialog.getByLabel('Nhập/quét SKU thực tế')).toHaveValue('Unsaved scan');
});

test('F09 refreshes new Inbox messages without refetching the visible product and stock snapshots', async ({ page }) => {
    await page.addInitScript(() => {
        const state = window as unknown as { correctionsSource: EventSource; correctionsSequence?: number };
        const Original = window.EventSource;
        window.EventSource = class extends Original {
            constructor(url: string | URL, options?: EventSourceInit) {
                super(url, options); state.correctionsSource = this;
                this.addEventListener('message', event => { try { state.correctionsSequence = JSON.parse(event.data).sequence; } catch { /* Invalid envelopes are tested separately. */ } });
            }
        };
    });
    await visit(page, 'inbox/cv1');
    await page.getByRole('tab', { name: 'Giá & tồn', exact: true }).click();
    await expect(page.getByRole('table', { name: 'Nguồn giá và tồn trong hộp thư', exact: true })).toBeVisible();
    const requests: string[] = [];
    page.on('request', request => { if (request.method() === 'GET') requests.push(new URL(request.url()).pathname); });
    const refreshed = page.waitForResponse(result => result.request().method() === 'GET' && new URL(result.url()).pathname.endsWith('/messages'));
    await page.evaluate(async () => {
        const { db } = await import('/src/mocks/database.ts');
        const original = db.messages.find((row: Record<string, unknown>) => row.conversationId === 'cv1');
        db.messages.push({ ...original, id: 'message-sse-regression', text: 'Synthetic normal SSE message', createdAt: '2030-01-01T00:00:00Z' });
        const state = window as unknown as { correctionsSource: EventSource; correctionsSequence?: number };
        state.correctionsSource.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ eventId: 'event-sse-regression', type: 'message.created', schemaVersion: 2, shopId: 'shop-demo', resourceType: 'message', resourceId: 'message-sse-regression', resourceVersion: 1, occurredAt: '2030-01-01T00:00:00Z', sequence: (state.correctionsSequence ?? 0) + 1 }) }));
    });
    await refreshed;
    await expect(page.getByText('Synthetic normal SSE message', { exact: true })).toBeVisible();
    expect(requests.filter(path => /\/(products|inventory\/snapshots|customers|orders|shipments|service-cases)(\/|$)/.test(path))).toEqual([]);
    await test.info().attach('F09-request-count.json', { body: JSON.stringify({ requests, unrelatedRequests: 0 }), contentType: 'application/json' });
});

test('F01 shop settings merges a server-only locale change and preserves edits typed during save', async ({ page }) => {
    await visit(page, 'settings/shop');
    const name = page.getByLabel('Tên cửa hàng', { exact: true });
    await expect(name).not.toHaveValue(''); await name.fill('Submitted shop');
    const current = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo')).json()).data);
    const changed = await page.evaluate(async version => {
        const response = await fetch('/api/v2/shops/shop-demo', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'botsales-demo-csrf-not-a-real-secret', 'Idempotency-Key': crypto.randomUUID(), 'If-Match': `"${version}"` }, body: JSON.stringify({ locale: 'en-US' }) });
        return response.status;
    }, current.version);
    expect(changed).toBe(200);
    await page.getByRole('button', { name: 'Lưu cấu hình', exact: true }).click();
    const comparison = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
    await comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' }).click();
    await expect(page.getByLabel('Ngôn ngữ', { exact: true })).toHaveValue('en-US');
    await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationDelay('updateShop', 800));
    const sent = page.waitForRequest(request => request.method() === 'PATCH' && new URL(request.url()).pathname === '/api/v2/shops/shop-demo');
    const completed = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname === '/api/v2/shops/shop-demo');
    await page.getByRole('button', { name: 'Lưu cấu hình', exact: true }).click();
    expect((await sent).postDataJSON()).toEqual({ name: 'Submitted shop' });
    await name.fill('Typed later shop'); await completed;
    await expect(page.getByRole('button', { name: 'Lưu cấu hình', exact: true })).toBeEnabled();
    await expect(name).toHaveValue('Typed later shop');
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: /Tổng quan/ }).click();
    await expect(page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?', exact: true })).toBeVisible();
});

test('F03 privacy policy preserves refetch drafts and compares before applying the newest version', async ({ page }) => {
    await visit(page, 'settings/privacy');
    const days = page.getByLabel('Số ngày lưu hội thoại', { exact: true });
    await days.fill('180');
    const current = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/privacy/policy')).json()).data);
    expect((await mutate(page, 'privacy/policy', { jurisdictionNote: 'Synthetic server jurisdiction' }, 'PATCH', current.version)).status).toBe(200);
    await page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true }).click();
    const comparison = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
    await comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' }).click();
    await expect(days).toHaveValue('180');
    await expect(page.getByLabel('Căn cứ / thị trường áp dụng')).toHaveValue('Synthetic server jurisdiction');
    const sent = page.waitForRequest(request => request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/privacy/policy'));
    await page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true }).click();
    const request = await sent; expect(request.postDataJSON()).toEqual({ chatRetentionDays: 180 });
    expect(request.headers()['if-match']).toBe(`"${current.version + 1}"`);
});

test('F01 category keeps a late edit after saving, and reopens with a clean current baseline', async ({ page }) => {
    await visit(page, 'categories'); await page.getByRole('button', { name: 'Sửa', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Sửa danh mục', exact: true });
    const name = dialog.getByLabel('Tên', { exact: true });
    await expect(name).toBeEnabled(); await name.fill('Submitted category');
    await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationDelay('updateCategory', 800));
    const finished = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.includes('/categories/'));
    await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
    await name.fill('Late category'); await finished;
    await expect(dialog.getByRole('button', { name: 'Lưu', exact: true })).toBeEnabled();
    await expect(dialog).toBeVisible(); await expect(name).toHaveValue('Late category');
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();
    const warning = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true });
    await warning.getByRole('button', { name: 'Bỏ thay đổi', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.getByRole('row').filter({ hasText: 'Submitted category' }).getByRole('button', { name: 'Sửa', exact: true }).click();
    await expect(name).toHaveValue('Submitted category');
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();
    await expect(dialog).not.toBeVisible();
});

test('F01 supplier preserves a concurrent server-only term and PATCHes the local name', async ({ page }) => {
    await visit(page, 'suppliers'); await page.getByRole('button', { name: 'Sửa', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Cập nhật nhà cung cấp', exact: true });
    await expect(dialog.getByLabel('Tên nhà cung cấp', { exact: true })).toBeEnabled();
    const current = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/suppliers')).json()).data[0]);
    await dialog.getByLabel('Tên nhà cung cấp', { exact: true }).fill('Local supplier');
    expect((await mutate(page, 'suppliers/' + current.id, { expectedVersion: current.version, paymentTerms: 'Concurrent terms' }, 'PATCH', current.version)).status).toBe(200);
    await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
    const comparison = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
    await comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' }).click();
    await expect(dialog.getByLabel('Điều kiện thanh toán', { exact: true })).toHaveValue('Concurrent terms');
    const sent = page.waitForRequest(request => request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/suppliers/' + current.id));
    await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
    expect((await sent).postDataJSON()).toEqual({ expectedVersion: current.version + 1, name: 'Local supplier' });
    await expect(dialog).not.toBeVisible();
});

test('F08 customer update enforces 4000/4001 before HTTP and retains a 422 draft', async ({ page }) => {
    await visit(page, 'customers/c1');
    const notes = page.getByLabel('Ghi chú (không bắt buộc)', { exact: true });
    await notes.fill('b'.repeat(4001));
    let writes = 0;
    page.on('request', request => { if (request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/customers/c1')) writes++; });
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await expect(page.getByText('Ghi chú không được vượt quá 4.000 ký tự.', { exact: true })).toBeVisible(); expect(writes).toBe(0);
    await notes.fill('b'.repeat(4000));
    await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationFailure('updateCustomer', { status: 422, code: 'VALIDATION_FAILED', message: 'Synthetic validation rejection' }));
    const rejected = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith('/customers/c1'));
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); expect((await rejected).status()).toBe(422);
    await expect(notes).toHaveValue('b'.repeat(4000));
    const previousWrites = writes;
    await notes.fill('😀'.repeat(4001));
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await expect(page.getByText('Ghi chú không được vượt quá 4.000 ký tự.', { exact: true })).toBeVisible(); expect(writes).toBe(previousWrites);
    await notes.fill('😀'.repeat(4000));
    const unicodeRejected = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith('/customers/c1'));
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); expect((await unicodeRejected).status()).toBe(422);
    await expect(notes).toHaveValue('😀'.repeat(4000));
    await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationFailure('updateCustomer', null));
    const accepted = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith('/customers/c1'));
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); expect((await accepted).status()).toBe(200);
    await expect(notes).toHaveValue('😀'.repeat(4000));
    expect(await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/customers/c1')).json()).data.notes)).toBe('😀'.repeat(4000));
});

test('F05 keeps mode changes and unknown sends, locks another send, and observes recovery-registry completion', async ({ page }) => {
    await visit(page, 'inbox/cv1'); await page.getByLabel('Ghi chú nội bộ (không gửi khách)').check();
    await page.getByLabel('Ghi chú cho nhóm').fill('Mode switched while pending');
    await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationDelay('addInternalNote', 700));
    const finished = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.includes('/notes'));
    await page.getByRole('button', { name: 'Lưu ghi chú', exact: true }).click();
    await page.getByLabel('Ghi chú nội bộ (không gửi khách)').uncheck(); await finished;
    await expect(page.getByLabel('Nội dung trả lời khách')).toHaveValue('Mode switched while pending');
    await page.getByLabel('Ghi chú nội bộ (không gửi khách)').check();
    await page.evaluate(async () => { const service = await import('/src/mocks/service.ts'); service.setOperationDelay('addInternalNote', null); service.setOperationFailure('addInternalNote', { status: 503, code: 'UNAVAILABLE', message: 'Synthetic uncertain result' }); });
    const unknown = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.includes('/notes'));
    await page.getByRole('button', { name: 'Lưu ghi chú', exact: true }).click(); expect((await unknown).status()).toBe(503);
    await expect(page.getByRole('button', { name: 'Lưu ghi chú', exact: true })).toBeDisabled();
    await page.getByLabel('Ghi chú cho nhóm').fill('Retained unknown draft');
    await expect(page.getByRole('button', { name: 'Lưu ghi chú', exact: true })).toBeDisabled();
    await page.evaluate(async () => {
        const intents = await import('/src/shared/api/intents.ts');
        const intent = intents.intentSnapshot().find((row: { operation: string }) => row.operation === 'addInternalNote');
        if (!intent) throw new Error('Missing recovery metadata');
        (await import('/src/mocks/service.ts')).setOperationFailure('addInternalNote', null);
        intents.resolveObservedIntent(intent.intentId);
    });
    await expect(page.getByRole('button', { name: 'Lưu ghi chú', exact: true })).toBeEnabled();
    await expect(page.getByLabel('Ghi chú cho nhóm')).toHaveValue('Retained unknown draft');
});

test('F01 order editor keeps its original version and compares whole line lists before PATCH', async ({ page }) => {
    await visit(page, 'orders');
    const current = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/orders')).json()).data.find((order: { orderState: string }) => order.orderState === 'draft'));
    expect(current).toBeTruthy(); await visit(page, 'orders/' + current.id);
    await page.getByRole('button', { name: 'Sửa đơn nháp', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Sửa đơn nháp', exact: true });
    await editor.getByLabel('Ghi chú chuẩn bị').fill('Local order note');
    expect((await mutate(page, 'orders/' + current.id, { warehouseId: 'warehouse-02' }, 'PATCH', current.version)).status).toBe(200);
    await editor.getByRole('button', { name: 'Lưu đơn nháp', exact: true }).click();
    const comparison = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
    await expect(comparison.getByRole('combobox', { name: /^Chọn dữ liệu: Dòng đơn hàng/ })).toBeVisible();
    await comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' }).click();
    await expect(editor.getByLabel('Mã kho xuất')).toHaveValue('warehouse-02');
    const sent = page.waitForRequest(request => request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/orders/' + current.id));
    await editor.getByRole('button', { name: 'Lưu đơn nháp', exact: true }).click();
    const request = await sent; expect(request.postDataJSON()).toEqual({ notes: 'Local order note' }); expect(request.headers()['if-match']).toBe(`"${current.version + 1}"`);
    await expect(editor).not.toBeVisible();
});

test('F06 guards added order rows, shop switch, logout and native reload; successful creation leaves no false guard', async ({ page }) => {
    for (const route of ['orders/new', 'bot/evaluations', 'orders/new']) {
        await visit(page, route);
        expect(await page.evaluate(async () => (await fetch('/api/v2/session')).status)).toBe(200);
    }
    await page.getByRole('button', { name: 'Thêm dòng', exact: true }).click();
    const shopLink = page.getByRole('navigation', { name: 'Điều hướng chính' }).locator('a[href="/workspaces"]');
    const warning = page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?', exact: true });
    await shopLink.click(); await expect(warning).toBeVisible();
    await warning.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }).click();
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click(); await expect(warning).toBeVisible();
    await warning.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }).click();
    const reloadWarning = page.waitForEvent('dialog', { timeout: 10000 });
    const reload = page.reload({ timeout: 10000 }).catch(() => undefined);
    const browserDialog = await reloadWarning; expect(browserDialog.type()).toBe('beforeunload'); await browserDialog.dismiss(); await reload;
    await expect(page.getByLabel('Sản phẩm 2', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Bỏ dòng/ }).last().click();
    await page.getByRole('combobox', { name: 'Khách hàng', exact: true }).click(); await page.getByRole('option', { name: 'Linh (khách mẫu)', exact: true }).click();
    await page.getByRole('combobox', { name: 'Sản phẩm 1', exact: true }).click(); await page.getByRole('option', { name: /Áo mẫu A/ }).first().click();
    const created = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/orders'));
    await page.getByRole('button', { name: 'Lưu đơn nháp', exact: true }).click();
    const response = await created; const payload = await response.json(); expect(response.status(), JSON.stringify(payload)).toBe(201);
    await expect(page).toHaveURL(demoUrl + '/s/shop-demo/orders/' + payload.data.id); await expect(warning).not.toBeVisible();
});

test('F01 analogous return-inspection draft does not adopt a refetched version without comparison', async ({ page }) => {
    await visit(page, 'returns');
    const fixture = await page.evaluate(async () => {
        const { db } = await import('/src/mocks/database.ts');
        const order = db.orders.find((item: { id: string; shopId: string; lines: Array<{ id: string }> }) => item.shopId === 'shop-demo' && !db.returns.some((returned: { orderId: string }) => returned.orderId === item.id)); order.fulfillmentState = 'delivered';
        return { id: order.id, lineId: order.lines[0].id };
    });
    const created = await mutate(page, 'returns', { orderId: fixture.id, reason: 'Synthetic received return', lines: [{ orderLineId: fixture.lineId, quantity: 1 }] }); expect(created.status, JSON.stringify(created.payload)).toBe(201);
    await page.getByRole('button', { name: 'Kiểm nhận', exact: true }).first().click();
    const editor = page.getByRole('dialog', { name: 'Kiểm nhận hàng trả', exact: true });
    await expect(editor.getByLabel('Ghi nhận kiểm tra')).toBeVisible(); await editor.getByLabel('Ghi nhận kiểm tra').fill('Local physical inspection');
    await page.evaluate(async returnId => { const { db } = await import('/src/mocks/database.ts'); const item = db.returns.find((item: { id: string }) => item.id === returnId); item.lines[0].disposition = 'damaged'; item.lines[0].reason = 'Concurrent case note'; item.version++; }, created.payload.data.id);
    await pulse(page);
    await editor.getByRole('button', { name: 'Xác nhận kiểm nhận', exact: true }).click();
    const comparison = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
    await expect(comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' })).toBeDisabled();
    await comparison.getByRole('combobox').click(); await page.getByRole('option', { name: 'Giữ bản nháp', exact: true }).click();
    await comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' }).click();
    const sent = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/inspect'));
    await editor.getByRole('button', { name: 'Xác nhận kiểm nhận', exact: true }).click();
    expect((await sent).postDataJSON()).toMatchObject({ expectedVersion: created.payload.data.version + 1, lines: [{ reason: 'Local physical inspection' }] });
    await expect(editor).not.toBeVisible();
});

test('F01 comparison supports keyboard choices, server changes again, axe and 320px reflow with long content', async ({ page }) => {
    await visit(page, 'customers/c1');
    await page.getByLabel('Tên khách hàng', { exact: true }).fill('Mine');
    expect((await mutate(page, 'customers/c1', { displayName: 'Server second', notes: 'LongContent'.repeat(350) }, 'PATCH', 1)).status).toBe(200);
    await page.getByRole('button', { name: 'Đối chiếu', exact: true }).click();
    const comparison = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
    const select = comparison.getByRole('combobox', { name: 'Chọn dữ liệu: Tên khách hàng', exact: true });
    await select.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Home'); await page.keyboard.press('Enter');
    await expect(comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' })).toBeEnabled();
    expect((await mutate(page, 'customers/c1', { displayName: 'Server third' }, 'PATCH', 2)).status).toBe(200);
    await expect(comparison.getByText('Server third', { exact: true })).toBeVisible();
    await expect(comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' })).toBeDisabled();
    await expect.poll(() => comparison.evaluate(element => {
        for (let current: Element | null = element; current; current = current.parentElement)
            if (Number(getComputedStyle(current).opacity) !== 1) return false;
        return true;
    })).toBe(true);
    const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    expect(accessibility.violations).toEqual([]);
    await page.setViewportSize({ width: 320, height: 800 });
    const geometry = await comparison.evaluate(element => ({ width: element.getBoundingClientRect().width, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, viewport: window.innerWidth }));
    expect(geometry.width).toBeLessThanOrEqual(320); expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
    await test.info().attach('comparison-reflow-320.json', { body: JSON.stringify({ geometry, violations: accessibility.violations }), contentType: 'application/json' });
    await comparison.screenshot({ path: test.info().outputPath('comparison-320.png') });
    await page.keyboard.press('Escape'); await expect(comparison).not.toBeVisible();
    await expect(page.getByLabel('Tên khách hàng', { exact: true })).toHaveValue('Mine');
});


test('F08 privacy bounds reject invalid days and long jurisdiction before HTTP', async ({ page }) => {
    await visit(page, 'settings/privacy');
    const writes: string[] = []; page.on('request', request => { if (request.method() === 'PATCH' && request.url().includes('/privacy/policy')) writes.push(request.url()); });
    const days = page.getByLabel('Số ngày lưu hội thoại', { exact: true }), note = page.getByLabel('Căn cứ / thị trường áp dụng', { exact: true });
    for (const value of ['0', '36501', '1.5']) { await days.fill(value); await expect(days).toHaveAttribute('aria-invalid', 'true'); await expect(page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true })).toBeDisabled(); }
    await days.fill('36500'); await note.fill('n'.repeat(2001)); await expect(note).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true })).toBeDisabled(); expect(writes).toEqual([]);
    await note.fill('n'.repeat(2000)); const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().includes('/privacy/policy'));
    await page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true }).click(); expect((await saved).status()).toBe(200); expect(writes).toHaveLength(1);
    for (const length of [4, 2001]) {
        await note.fill('😀'.repeat(length)); await expect(note).toHaveAttribute('aria-invalid', 'true');
        await expect(page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true })).toBeDisabled(); expect(writes).toHaveLength(1);
    }
    for (const [index, length] of [5, 2000].entries()) {
        await note.fill('😀'.repeat(length));
        await expect(page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true })).toBeEnabled();
        const unicodeSaved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().includes('/privacy/policy'));
        await page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true }).click();
        const response = await unicodeSaved; expect(response.status()).toBe(200); expect((await response.json()).data.jurisdictionNote).toBe('😀'.repeat(length));
        expect(writes).toHaveLength(index + 2);
        await expect(note).toHaveValue('😀'.repeat(length));
        await expect(page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true })).toBeDisabled();
    }
});

test('F06 order custom close respects the draft guard and busy editors remain protected', async ({ page }) => {
    await visit(page, 'orders');
    const current = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/orders')).json()).data.find((order: { orderState: string }) => order.orderState === 'draft'));
    await visit(page, 'orders/' + current.id); await page.getByRole('button', { name: 'Sửa đơn nháp', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Sửa đơn nháp', exact: true }); await editor.getByLabel('Ghi chú chuẩn bị').fill('Unsaved order close');
    await editor.getByRole('button', { name: 'Đóng chỉnh sửa', exact: true }).click();
    const warning = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true }); await expect(warning).toBeVisible();
    await warning.getByRole('button', { name: 'Tiếp tục sửa', exact: true }).click(); await expect(editor.getByLabel('Ghi chú chuẩn bị')).toHaveValue('Unsaved order close');
    await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationDelay('updateOrderDraft', 1200));
    const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().includes('/orders/'));
    await editor.getByRole('button', { name: 'Lưu đơn nháp', exact: true }).click(); await expect(editor.getByRole('button', { name: 'Đóng chỉnh sửa', exact: true })).toBeDisabled();
    await editor.getByLabel('Ghi chú chuẩn bị').fill('Late order change'); await saved; await expect(editor).toBeVisible(); await expect(editor.getByLabel('Ghi chú chuẩn bị')).toHaveValue('Late order change');
});
