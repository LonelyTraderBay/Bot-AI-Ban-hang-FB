import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

test('FE017 synthetic 422 keeps the knowledge draft fields and shows field errors', async ({ page }) => {
    await page.addInitScript(() => {
        const originalFetch = window.fetch.bind(window);
        Object.assign(window, { __fe017Synthetic422: false });
        window.fetch = (input, init) => {
            const requestUrl = input instanceof Request ? input.url : String(input);
            const method = init?.method || (input instanceof Request ? input.method : 'GET');
            if (new URL(requestUrl, window.location.href).pathname === '/api/v2/shops/shop-demo/knowledge' && method === 'POST') {
                Object.assign(window, { __fe017Synthetic422: true });
                return Promise.resolve(new Response(JSON.stringify({
                    type: 'about:blank',
                    title: 'Dữ liệu chưa hợp lệ',
                    status: 422,
                    code: 'VALIDATION_ERROR',
                    detail: 'Nội dung cần được kiểm tra trước khi lưu.',
                    requestId: 'fe017-request-422',
                    errors: [{ path: 'content', code: 'CONTENT_REVIEW_REQUIRED', message: 'Hãy rà soát nội dung nguồn.' }],
                }), { status: 422, headers: { 'content-type': 'application/problem+json' } }));
            }
            return originalFetch(input, init);
        };
    });

    await page.goto(new URL('/s/shop-demo/knowledge', demoUrl).toString());
    await page.getByRole('button', { name: 'Thêm nguồn kiến thức' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nguồn kiến thức mới' });
    const title = 'Quy trình đổi hàng đã rà soát';
    const content = 'Nội dung tổng hợp cần xác minh thêm trước khi tạo bản nháp.';
    await dialog.getByRole('textbox', { name: 'Tiêu đề' }).fill(title);
    await dialog.getByRole('textbox', { name: 'Nội dung' }).fill(content);

    await dialog.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
    const validationAlert = dialog.getByRole('alert').filter({ hasText: 'Nội dung cần được kiểm tra trước khi lưu.' });
    await expect(validationAlert).toBeVisible();
    expect(await page.evaluate(() => (window as Window & { __fe017Synthetic422: boolean }).__fe017Synthetic422)).toBe(true);
    await expect(dialog.getByRole('textbox', { name: 'Tiêu đề' })).toHaveValue(title);
    await expect(dialog.getByRole('textbox', { name: 'Nội dung' })).toHaveValue(content);
    await expect(validationAlert).toContainText('content: Hãy rà soát nội dung nguồn.');
});
