import { openDemoControls } from './session/demo-controls';
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

async function gotoDemo(page: import('@playwright/test').Page, route: string) {
    await page.goto(new URL(route, demoUrl).toString());
}

async function chooseOption(page: import('@playwright/test').Page, label: string, value: string) {
    if (['Vai trò mô phỏng', 'Trạng thái thử', 'Dataset mô phỏng'].includes(label)) await openDemoControls(page);
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
}

test('FE017.AC01 demo publishing uses the approved permission and lifecycle substitute without an API allowedActions field', async ({ page }) => {
    const initialResponseWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.startsWith('/api/v2/') && new URL(response.url()).pathname.endsWith('/knowledge/k3'));
    await gotoDemo(page, '/s/shop-demo/knowledge/k3');
    const initialResponse = await initialResponseWait;
    const initial = (await initialResponse.json()).data;
    expect(initial).toMatchObject({ status: 'draft', publishedRevisionId: null, draftRevisionId: 'kr3' });
    expect(initial).not.toHaveProperty('allowedActions');
    await expect(page.getByRole('button', { name: 'Gửi duyệt', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xuất bản bản đã đánh giá', exact: true })).toBeDisabled();

    await page.getByRole('button', { name: 'Gửi duyệt', exact: true }).click();
    const reviewDialog = page.getByRole('dialog', { name: 'Gửi nguồn kiến thức để duyệt' });
    await reviewDialog.getByRole('textbox', { name: /Lý do/ }).fill('Kiểm tra bản nháp FE017 trước khi đánh giá.');
    const reviewRequestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/knowledge/k3/submit-review'));
    const reviewResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/knowledge/k3/submit-review'));
    await reviewDialog.getByRole('button', { name: 'Gửi nguồn để duyệt', exact: true }).click();
    const reviewRequest = await reviewRequestWait;
    expect(JSON.parse(reviewRequest.postData() || 'null')).toEqual({ expectedVersion: initial.version, reason: 'Kiểm tra bản nháp FE017 trước khi đánh giá.' });
    expect((await reviewResponseWait).status()).toBe(202);
    await expect(page.getByText('Chờ duyệt', { exact: true })).toBeVisible();

    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Chất lượng AI' }).click();
    await expect(page).toHaveURL(/\/bot\/evaluations$/);
    await expect(page.getByText(/không đánh giá chất lượng mô hình AI thật/)).toBeVisible();

    await page.getByRole('button', { name: 'Chạy đánh giá', exact: true }).click();
    const evaluationDialog = page.getByRole('dialog', { name: 'Đánh giá cấu hình nháp' });
    await evaluationDialog.getByRole('textbox', { name: 'Phiên bản bộ kiểm thử đã đăng ký' }).fill('FE017-synthetic-dataset-v1');
    await evaluationDialog.getByRole('textbox', { name: 'Mã bản kiến thức (tùy chọn)' }).fill(initial.draftRevisionId);
    const evaluationRequestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/bot/evaluations'));
    const evaluationResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/bot/evaluations'));
    await evaluationDialog.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    const evaluationRequest = await evaluationRequestWait;
    expect(JSON.parse(evaluationRequest.postData() || 'null')).toMatchObject({ knowledgeRevisionId: initial.draftRevisionId, datasetVersion: 'FE017-synthetic-dataset-v1' });
    const evaluationResponse = await evaluationResponseWait;
    expect(evaluationResponse.status()).toBe(202);
    const evaluation = (await evaluationResponse.json()).data;
    expect(evaluation).toMatchObject({ status: 'passed', knowledgeRevisionId: initial.draftRevisionId, mockOnly: true });

    await page.getByRole('dialog', { name: 'Chi tiết đánh giá' }).getByText('Đóng', { exact: true }).click();
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Kiến thức cửa hàng' }).click();
    await page.getByRole('link', { name: 'Chính sách đổi hàng' }).click();
    await expect(page.getByText('Chờ duyệt', { exact: true })).toBeVisible();
    const current = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/knowledge/k3')).json()).data);
    expect(current.draftRevisionId).toBe(initial.draftRevisionId);

    await page.getByRole('button', { name: 'Xuất bản bản đã đánh giá', exact: true }).click();
    const readyDialog = page.getByRole('dialog', { name: 'Xuất bản kiến thức' });
    await readyDialog.getByRole('textbox', { name: 'Mã lần đánh giá đúng phiên bản' }).fill(evaluation.id);
    await readyDialog.getByRole('textbox', { name: 'Lý do xuất bản' }).fill('Đánh giá đạt trên đúng bản kiến thức đã duyệt.');
    const publishRequestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/knowledge/k3/publish'));
    const publishResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/knowledge/k3/publish'));
    await readyDialog.getByRole('button', { name: 'Xuất bản', exact: true }).click();
    const publishRequest = await publishRequestWait;
    expect(JSON.parse(publishRequest.postData() || 'null')).toEqual({ expectedVersion: current.version, evaluationRunId: evaluation.id, revisionId: initial.draftRevisionId, reason: 'Đánh giá đạt trên đúng bản kiến thức đã duyệt.' });
    expect((await publishResponseWait).status()).toBe(202);
    await expect(page.getByText('Đã xuất bản', { exact: true })).toBeVisible();
    const published = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/knowledge/k3')).json()).data);
    expect(published).toMatchObject({ status: 'published', publishedRevisionId: initial.draftRevisionId, draftRevisionId: initial.draftRevisionId });

    await page.getByRole('button', { name: 'Soạn phiên bản mới', exact: true }).click();
    const revisionDialog = page.getByRole('dialog', { name: 'Soạn phiên bản mới' });
    await revisionDialog.getByRole('textbox', { name: 'Tiêu đề' }).fill('Chính sách đổi hàng — bản bổ sung');
    await revisionDialog.getByRole('textbox', { name: 'Nội dung' }).fill('Bản bổ sung mới; bản đã xuất bản vẫn được giữ nguyên.');
    const createRevisionWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/knowledge/k3/revisions'));
    await revisionDialog.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
    expect((await createRevisionWait).status()).toBe(201);
    const afterEdit = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/knowledge/k3')).json()).data);
    expect(afterEdit.status).toBe('draft');
    expect(afterEdit.publishedRevisionId).toBe(initial.draftRevisionId);
    expect(afterEdit.draftRevisionId).not.toBe(initial.draftRevisionId);

    const revisionRow = page.getByRole('row').filter({ hasText: 'Chính sách đổi hàng — bản bổ sung' });
    const detailWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.includes('/revisions/'));
    await revisionRow.getByRole('button', { name: 'Xem / khôi phục nháp' }).click();
    const restoreDialog = page.getByRole('dialog', { name: /Phiên bản #/ });
    await detailWait;
    await expect(restoreDialog.getByText('Bản bổ sung mới; bản đã xuất bản vẫn được giữ nguyên.')).toBeVisible();
    await expect(restoreDialog.getByRole('button', { name: 'Khôi phục thành nháp' })).toBeDisabled();
    await restoreDialog.getByRole('textbox', { name: 'Lý do khôi phục' }).fill('Quay lại phiên bản đã kiểm soát.');
    const restoreRequestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/restore'));
    const restoreResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/restore'));
    await restoreDialog.getByRole('button', { name: 'Khôi phục thành nháp' }).click();
    const restoreRequest = await restoreRequestWait;
    expect(JSON.parse(restoreRequest.postData() || 'null')).toEqual({ expectedVersion: afterEdit.version, reason: 'Quay lại phiên bản đã kiểm soát.' });
    expect((await restoreResponseWait).status()).toBe(201);
    const restored = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/knowledge/k3')).json()).data);
    expect(restored).toMatchObject({ status: 'draft', publishedRevisionId: initial.draftRevisionId });
    expect(restored.draftRevisionId).not.toBe(restored.publishedRevisionId);
});

test('FE017.AC02 knowledge file upload sends canonical purpose and detail reads processing status', async ({ page }) => {
    await page.addInitScript(() => {
        const original = window.fetch.bind(window);
        Object.assign(window, { __fe017MultipartFields: [] as Array<[string, string]> });
        window.fetch = (input, init) => {
            if (init?.body instanceof FormData) {
                const fields = [...init.body.entries()].map(([name, value]) => [name, value instanceof File ? value.name : String(value)] as [string, string]);
                Object.assign(window, { __fe017MultipartFields: fields });
            }
            return original(input, init);
        };
    });
    await gotoDemo(page, '/s/shop-demo/knowledge');
    await page.getByRole('button', { name: 'Thêm nguồn kiến thức' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nguồn kiến thức mới' });
    await dialog.getByRole('textbox', { name: 'Tiêu đề' }).fill('Tệp chính sách mẫu');
    await dialog.locator('input[type="file"]').setInputFiles({ name: 'policy.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 synthetic') });
    const uploadRequestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/uploads'));
    const uploadResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/uploads'));
    const knowledgeResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/knowledge'));
    await dialog.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
    const uploadRequest = await uploadRequestWait;
    expect(new URL(uploadRequest.url()).pathname).toMatch(/\/uploads$/);
    const multipartFields = await page.evaluate(() => (window as Window & { __fe017MultipartFields: Array<[string, string]> }).__fe017MultipartFields);
    expect(multipartFields).toContainEqual(['purpose', 'knowledge_source']);
    const uploadResponse = await uploadResponseWait;
    expect(uploadResponse.status()).toBe(201);
    const file = (await uploadResponse.json()).data;
    const knowledgeResponse = await knowledgeResponseWait;
    expect(knowledgeResponse.status()).toBe(201);
    const knowledge = (await knowledgeResponse.json()).data;
    expect(knowledge).toMatchObject({ sourceKind: 'file', fileId: file.id, status: 'draft', publishedRevisionId: null });
    await expect(page).toHaveURL(/\/s\/shop-demo\/knowledge$/);
    await page.getByRole('link', { name: 'Mở nguồn vừa tạo' }).click();
    await expect(page).toHaveURL(new RegExp(`/knowledge/${knowledge.id}$`));
    await expect(page.getByText(/policy\.pdf/)).toBeVisible();
    await expect(page.getByText('Sẵn sàng', { exact: true })).toBeVisible();
});

test('FE017 price and stock source preview uses canonical product and timestamped inventory APIs', async ({ page }) => {
    const productsWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/products'));
    const snapshotsWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/inventory'));
    await gotoDemo(page, '/s/shop-demo/knowledge');
    const [productsResponse, snapshotsResponse] = await Promise.all([productsWait, snapshotsWait]);
    expect(productsResponse.status()).toBe(200);
    expect(snapshotsResponse.status()).toBe(200);
    expect(new URL(productsResponse.url()).searchParams.get('limit')).toBe('100');
    expect(new URL(snapshotsResponse.url()).searchParams.get('limit')).toBe('100');
    const products = (await productsResponse.json()).data as Array<{ id: string; name: string; status: string; variants: Array<{ id: string; sku: string; name: string; active: boolean; price: { amount: string; currency: string } | null }> }>;
    const snapshots = (await snapshotsResponse.json()).data as Array<{ variantId: string; warehouseId: string; available: number; asOf: string }>;
    const source = products.filter(product => product.status === 'active').flatMap(product => product.variants.filter(variant => variant.active && variant.price).map(variant => ({ product, variant, snapshot: snapshots.find(snapshot => snapshot.variantId === variant.id) }))).find(row => row.snapshot);
    expect(source).toBeTruthy();
    if (!source?.snapshot || !source.variant.price) throw new Error('Seed must include an active priced variant with an inventory snapshot.');

    const groupedAmount = source.variant.price.amount.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const symbol = ({ VND: '₫', LAK: '₭', THB: '฿', USD: 'USD' } as Record<string, string>)[source.variant.price.currency] || source.variant.price.currency;
    const expectedSnapshotTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Vientiane' }).format(new Date(source.snapshot.asOf));
    const row = page.getByRole('row').filter({ hasText: source.product.name }).filter({ hasText: source.variant.sku }).filter({ hasText: source.snapshot.warehouseId });
    await expect(row).toContainText(`${groupedAmount} ${symbol}`);
    await expect(row).toContainText(String(source.snapshot.available));
    await expect(row).toContainText(expectedSnapshotTime);
    await expect(page.getByText(/được truy vấn riêng với nội dung tri thức/)).toBeVisible();
    await page.setViewportSize({ width: 375, height: 812 });
    const sourceTable = page.getByRole('table', { name: 'Nguồn giá và snapshot tồn kho' });
    const sourceRegion = page.getByRole('region', { name: 'Nguồn giá và snapshot tồn kho' });
    await expect(sourceTable).toBeVisible();
    await sourceRegion.focus();
    await expect(sourceRegion).toBeFocused();
    const pageWidth = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(pageWidth.content).toBeLessThanOrEqual(pageWidth.viewport);
});

test('FE017.AC03 missing content, unsupported and oversized files keep creation unavailable', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', request => {
        const pathname = new URL(request.url()).pathname;
        if (request.method() === 'POST' && (pathname.endsWith('/uploads') || pathname.endsWith('/knowledge'))) writes.push(pathname);
    });
    await gotoDemo(page, '/s/shop-demo/knowledge');
    await page.getByRole('button', { name: 'Thêm nguồn kiến thức' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nguồn kiến thức mới' });
    await expect(dialog.getByRole('button', { name: 'Lưu bản nháp', exact: true })).toBeDisabled();
    await dialog.getByRole('textbox', { name: 'Tiêu đề' }).fill('Nguồn thử không hợp lệ');
    await dialog.getByRole('textbox', { name: 'Nội dung' }).fill('Nội dung mẫu có thể giữ lại.');
    const input = dialog.locator('input[type="file"]');
    await input.setInputFiles({ name: 'payload.html', mimeType: 'text/html', buffer: Buffer.from('<img src=x>') });
    await expect(dialog.getByRole('alert').filter({ hasText: 'Chỉ nhận PDF, TXT hoặc CSV' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Lưu bản nháp', exact: true })).toBeDisabled();
    await input.setInputFiles({ name: 'too-large.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 'x') });
    await expect(dialog.getByRole('alert').filter({ hasText: 'vượt giới hạn 5 MB' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Lưu bản nháp', exact: true })).toBeDisabled();
    expect(writes).toEqual([]);
});

test('FE017.AC04 feedback approval creates inert draft content and its first revision only', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/inbox/cv1');
    await page.getByRole('button', { name: /^Đánh giá tin nhắn/ }).first().click();
    const feedbackDialog = page.getByRole('dialog', { name: 'Đánh giá câu trả lời' });
    await feedbackDialog.getByRole('textbox', { name: 'Nội dung đề xuất sửa' }).fill('Nên kiểm tra điều kiện đổi hàng trước khi tư vấn.');
    const feedbackResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/feedback'));
    await feedbackDialog.getByRole('button', { name: 'Lưu phản hồi', exact: true }).click();
    const feedbackResponse = await feedbackResponseWait;
    expect(feedbackResponse.status()).toBe(201);
    const feedback = (await feedbackResponse.json()).data;
    expect(feedback.status).toBe('pending');

    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Phản hồi cần duyệt' }).click();
    await page.getByRole('button', { name: 'Duyệt nội dung' }).click();
    const reviewDialog = page.getByRole('dialog', { name: 'Kiểm tra phản hồi' });
    const inertMarkup = '<img src=x onerror=alert(1)> nội dung đã duyệt';
    await reviewDialog.getByRole('textbox', { name: 'Nội dung đã loại dữ liệu riêng tư' }).fill(inertMarkup);
    await reviewDialog.getByRole('textbox', { name: 'Lý do' }).fill('Đã rà soát và loại thông tin riêng tư.');
    const reviewResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith(`/feedback/${feedback.id}/review`));
    await reviewDialog.getByRole('button', { name: 'Lưu kết quả', exact: true }).click();
    const reviewResponse = await reviewResponseWait;
    expect(reviewResponse.status()).toBe(200);
    expect((await reviewResponse.json()).data).toMatchObject({ status: 'approved', knowledgeDraftId: expect.any(String) });
    await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Kiến thức cửa hàng' }).click();
    const proposedRow = page.getByRole('row').filter({ hasText: 'Đề xuất từ phản hồi' });
    await expect(proposedRow).toBeVisible();
    await proposedRow.getByRole('link', { name: 'Đề xuất từ phản hồi' }).click();
    await expect(page.getByText(inertMarkup, { exact: true })).toBeVisible();
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
    await expect(page.getByRole('main').getByText('Bản nháp', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xuất bản bản đã đánh giá', exact: true })).toBeDisabled();
});

test('FE017.AC05 manager sees knowledge read-only and synthetic API rejects purpose-specific upload and publish', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/knowledge/k3');
    await chooseOption(page, 'Vai trò mô phỏng', 'manager');
    await expect(page.getByRole('combobox', { name: 'Vai trò mô phỏng' })).toContainText('manager');
    await expect(page.getByRole('button', { name: 'Sửa bản nháp', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Gửi duyệt', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Xuất bản bản đã đánh giá', exact: true })).toHaveCount(0);

    const denied = await page.evaluate(async () => {
        const csrfResponse = await fetch('/api/v2/auth/csrf');
        const csrf = (await csrfResponse.json()).data.csrfToken as string;
        const form = new FormData();
        form.append('file', new File(['mock'], 'denied.pdf', { type: 'application/pdf' }));
        form.append('purpose', 'knowledge_source');
        const upload = await fetch('/api/v2/shops/shop-demo/uploads', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf, 'Idempotency-Key': crypto.randomUUID() }, body: form });
        const publish = await fetch('/api/v2/shops/shop-demo/knowledge/k3/publish', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ expectedVersion: 1, evaluationRunId: 'eval-not-authorized', revisionId: 'kr3', reason: 'Permission boundary test.' }) });
        return { upload: upload.status, publish: publish.status };
    });
    expect(denied).toEqual({ upload: 403, publish: 403 });
});

test('FE017.AC06 stale review preserves the reason and explains the conflict', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/knowledge/k3');
    await chooseOption(page, 'Trạng thái thử', 'Xung đột lần ghi tiếp');
    await page.getByRole('button', { name: 'Gửi duyệt', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Gửi nguồn kiến thức để duyệt' });
    const reason = 'Giữ lý do này sau khi phiên bản bị thay đổi.';
    await dialog.getByRole('textbox', { name: /Lý do/ }).fill(reason);
    const responseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/submit-review'));
    await dialog.getByRole('button', { name: 'Gửi nguồn để duyệt', exact: true }).click();
    const response = await responseWait;
    expect(response.status()).toBe(412);
    await expect(dialog.getByRole('textbox', { name: /Lý do/ })).toHaveValue(reason);
    await expect(dialog.getByRole('alert')).toContainText('Mô phỏng dữ liệu bị thay đổi bởi người khác');
});

test('FE027.G02 product content brief edits source, size, warranty, alternatives, and forbidden claims locally', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', request => {
        if (request.method() !== 'GET' && new URL(request.url()).pathname.startsWith('/api/v2/')) writes.push(request.method());
    });
    await gotoDemo(page, '/s/shop-demo/knowledge');
    const editor = page.getByTestId('product-content-preview');
    await editor.getByRole('textbox', { name: 'Điểm nổi bật có nguồn' }).fill('Cotton pha mẫu; kiểm tra nhãn trước khi tư vấn thành phần.');
    await editor.getByRole('textbox', { name: 'Kích cỡ và cách sử dụng' }).fill('Đo theo bảng kích cỡ đã duyệt, chưa tự chọn size.');
    await editor.getByRole('button', { name: 'Lưu bản xem trước (chỉ trên trang này)' }).click();
    const preview = page.getByRole('region', { name: 'Bản xem trước nội dung sản phẩm' });
    await expect(preview).toContainText('Cotton pha mẫu; kiểm tra nhãn trước khi tư vấn thành phần.');
    await expect(preview).toContainText('Đo theo bảng kích cỡ đã duyệt, chưa tự chọn size.');
    await expect(preview).toContainText('Điều không được cam kết');
    await expect(preview).toContainText('Bản xem trước chưa được duyệt');
    expect(writes).toEqual([]);
});

test('FE027.G03 policy revisions keep the published snapshot immutable when a draft changes', async ({ page }) => {
    const detailWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.includes('/api/v2/') && new URL(response.url()).pathname.endsWith('/knowledge/k1'));
    await gotoDemo(page, '/s/shop-demo/knowledge/k1');
    const original = (await (await detailWait).json()).data;
    expect(original.publishedRevisionId).toBeTruthy();
    await page.getByRole('button', { name: 'Soạn phiên bản mới', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Soạn phiên bản mới' });
    await dialog.getByRole('textbox', { name: 'Tiêu đề' }).fill('Chính sách mẫu · bản mới');
    await dialog.getByRole('textbox', { name: 'Nội dung' }).fill('Bản chính sách mới chờ duyệt, không thay lời hứa đã xuất bản.');
    const revisionWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/knowledge/k1/revisions'));
    await dialog.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
    const response = await revisionWait;
    expect(response.status()).toBe(201);
    const revised = (await response.json()).data;
    expect(revised).toMatchObject({ status: 'draft', publishedRevisionId: original.publishedRevisionId });
    expect(revised.draftRevisionId).not.toBe(original.draftRevisionId);
    await expect(page.getByText('Bản nháp', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Bản đã xuất bản', { exact: true })).toBeVisible();
});
