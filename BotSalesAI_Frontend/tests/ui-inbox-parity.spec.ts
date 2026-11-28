import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

test('desktop Inbox previews the first filtered result and creates a draft only after a click', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const writes: Array<{ method: string; path: string; action?: string }> = [];
    page.on('request', request => {
        const path = new URL(request.url()).pathname;
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && path.includes('/conversations/')) {
            writes.push({ method: request.method(), path, action: request.postDataJSON()?.action });
        }
    });

    await page.goto('/s/shop-demo/inbox?q=Minh');
    const thread = page.getByTestId('inbox-thread');
    await expect(thread.getByRole('heading', { name: 'Minh (khách mẫu)' })).toBeVisible();
    await expect(page).toHaveURL(/\/inbox\?q=Minh$/);
    await expect(thread.getByRole('link', { name: 'Mở hội thoại' })).toHaveAttribute('href', '/s/shop-demo/inbox/cv2?q=Minh');
    await expect(thread.getByRole('textbox')).toHaveCount(0);
    await expect(thread.getByRole('button', { name: /Đánh giá|Tiếp quản|Trả lại bot|Giải quyết/ })).toHaveCount(0);

    const search = page.getByPlaceholder('Tìm hội thoại…');
    await search.fill('Linh');
    await search.press('Enter');
    await expect(thread.getByRole('heading', { name: 'Linh (khách mẫu)' })).toBeVisible();
    const draft = page.getByRole('complementary', { name: 'Đơn đang nhập' });
    const create = draft.getByRole('button', { name: 'Tạo đơn', exact: true });
    await expect(create).toBeEnabled();
    expect(writes).toEqual([]);

    await create.click();
    await expect(page).toHaveURL(/\/inbox\/cv1\?q=Linh$/);
    await expect(draft.getByRole('textbox', { name: 'Ghi chú giao hàng' })).toBeEditable();
    await expect(draft.getByRole('status').filter({ hasText: /^Đã lưu$/ })).toBeVisible();
    const writeAccess = { method: 'POST', path: '/api/v2/shops/shop-demo/conversations/cv1/order-draft/access' };
    expect(writes.filter(write => write.method === 'POST')).toEqual([{ ...writeAccess, action: 'open' }]);
    const writesBeforePreview = writes.slice();

    await page.goBack();
    await expect(page).toHaveURL(/\/inbox\?q=Linh$/);
    await expect(draft.getByText('Chỉ xem', { exact: true })).toBeVisible();
    await expect(draft.getByRole('textbox', { name: 'Ghi chú giao hàng' })).toBeDisabled();
    expect(writes).toEqual(writesBeforePreview);

    await page.getByRole('link', { name: /Linh \(khách mẫu\)/ }).click();
    await expect(page).toHaveURL(/\/inbox\/cv1\?q=Linh$/);
    await expect(draft.getByRole('textbox', { name: 'Ghi chú giao hàng' })).toBeEditable();
    expect(writes).toEqual([...writesBeforePreview, { ...writeAccess, action: 'renew' }]);
});

type PreviewStream = Window & { publishInboxEvent?: (payload: Record<string, unknown>) => void };

test('realtime can reorder the desktop queue without switching the preview', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
        const state = window as PreviewStream;
        class ControlledStream {
            onmessage?: (event: MessageEvent) => void;
            constructor() {
                state.publishInboxEvent = payload => this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(payload) }));
            }
            close() {}
        }
        Object.defineProperty(window, 'EventSource', { value: ControlledStream });
    });
    const server = await startDemoServer({ runtime: 'dev' });
    try {
        await page.goto(new URL('/s/shop-demo/inbox', server.url).toString());
        const identity = page.getByTestId('inbox-thread').getByRole('heading').first();
        await expect(identity).toBeVisible();
        const currentName = await identity.textContent();
        const queue = page.getByTestId('inbox-list-pane');
        await page.waitForFunction(() => Boolean((window as PreviewStream).publishInboxEvent));
        await page.evaluate(async () => {
            const { db } = await import('/src/mocks/database.ts');
            const state = window as PreviewStream;
            const template = db.conversations.find((row: { id: string }) => row.id === 'cv1');
            const future = '2030-01-02T00:00:00Z';
            db.conversations.unshift({ ...template, id: 'cv-preview-new', createdAt: future, updatedAt: future, displayName: 'Khách xếp đầu mới' });
            state.publishInboxEvent?.({
                eventId: 'event-inbox-preview-order', type: 'conversation.updated', schemaVersion: 2, shopId: 'shop-demo',
                resourceType: 'conversation', resourceId: 'cv-preview-new', resourceVersion: 1, occurredAt: future, sequence: 1,
            });
        });
        await expect(queue.getByRole('link').first()).toContainText('Khách xếp đầu mới');
        await expect(identity).toHaveText(currentName!);

        const pinnedHref = await queue.locator('[aria-current="true"]').getAttribute('href');
        const pinnedId = pinnedHref?.split('/').at(-1);
        await page.evaluate(async id => {
            const { db } = await import('/src/mocks/database.ts');
            const index = db.conversations.findIndex((row: { id: string }) => row.id === id);
            db.conversations.splice(index, 1);
            (window as PreviewStream).publishInboxEvent?.({
                eventId: 'event-inbox-preview-removal', type: 'conversation.updated', schemaVersion: 2, shopId: 'shop-demo',
                resourceType: 'conversation', resourceId: id, resourceVersion: 2, occurredAt: '2030-01-02T00:00:00Z', sequence: 2,
            });
        }, pinnedId);
        await expect(identity).toHaveText('Khách xếp đầu mới');

        await queue.getByRole('link', { name: /Khách xếp đầu mới/ }).click();
        await expect(page).toHaveURL(/\/inbox\/cv-preview-new$/);
        await expect(identity).toHaveText('Khách xếp đầu mới');
    } finally {
        await server.close();
    }
});

test('narrow Inbox starts with the list and keeps the composer and reading area visible', async ({ page }, info) => {
    const measurements = [];
    for (const width of [390, 705]) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto('/s/shop-demo/inbox?q=Hà');
        await expect(page.getByTestId('inbox-thread')).toHaveCount(0);
        await expect(page.getByText('Chọn một cuộc trò chuyện để xem lịch sử, tiếp quản và tạo đơn.')).toBeHidden();
        const filtersToggle = page.getByRole('button', { name: 'Bộ lọc', exact: true });
        const filters = page.getByRole('group', { name: 'Bộ lọc hội thoại' });
        await expect(filtersToggle).toHaveAttribute('aria-expanded', 'false');
        await expect(filters).toBeHidden();
        await filtersToggle.click();
        await expect(filters.getByRole('combobox')).toHaveCount(4);
        await filtersToggle.click();
        await page.getByRole('link', { name: /Hà \(khách mẫu\)/ }).click();
        await expect(page.getByText('Đã hết thời hạn trả lời trên kênh này.')).toBeVisible();
        const reading = page.getByRole('region', { name: 'Lịch sử tin nhắn' });
        await expect(reading).toBeVisible();
        await expect.poll(async () => (await reading.boundingBox())?.height ?? 0).toBeGreaterThan(180);
        const submit = page.getByRole('button', { name: 'Gửi trả lời' });
        await expect(submit).toBeDisabled();
        await expect(submit).toBeInViewport({ ratio: 1 });
        measurements.push({ width, reading: await reading.boundingBox(), reply: await submit.boundingBox() });
        await page.getByRole('tab', { name: 'Đơn đang nhập', exact: true }).click();
        await expect(page.getByRole('tabpanel', { name: 'Đơn đang nhập' }).getByRole('complementary', { name: 'Đơn đang nhập' })).toBeVisible();
        await page.getByRole('tab', { name: 'Tin nhắn', exact: true }).click();
        await expect(page.getByRole('tabpanel', { name: 'Tin nhắn' }).getByRole('region', { name: 'Lịch sử tin nhắn' })).toBeVisible();
    }
    await info.attach('narrow-inbox-geometry', { body: JSON.stringify(measurements), contentType: 'application/json' });
});

test('keyboard Tạo đơn focuses its tab and reports a changed permission to edit', async ({ page }) => {
    await page.setViewportSize({ width: 705, height: 844 });
    await page.addInitScript(() => {
        const original = window.fetch.bind(window);
        window.fetch = async (input, init) => {
            const response = await original(input, init);
            const url = new URL(input instanceof Request ? input.url : input, window.location.href);
            if (url.pathname.endsWith('/conversations/cv1/order-draft') && response.ok) {
                const result = await response.json();
                return Response.json({ ...result, data: { ...result.data, canOpen: false } });
            }
            return response;
        };
    });
    await page.goto('/s/shop-demo/inbox/cv1');
    const create = page.getByTestId('inbox-thread').getByRole('button', { name: 'Tạo đơn', exact: true });
    await create.press('Enter');
    const draftTab = page.getByRole('tab', { name: 'Đơn đang nhập' });
    await expect(draftTab).toBeFocused();
    await expect(draftTab).toHaveAttribute('aria-selected', 'true');
    const draftPane = page.getByRole('tabpanel', { name: 'Đơn đang nhập' });
    await expect(draftPane).toHaveAttribute('id', (await draftTab.getAttribute('aria-controls'))!);
    await expect(draftPane.getByRole('alert')).toHaveText('Chưa thể mở quyền sửa bản đang nhập. Kiểm tra trạng thái hội thoại và thử lại.');
});

for (const estimateAvailable of [true, false]) {
    test(`draft conversion dialog shows the customer and quantities with estimate ${estimateAvailable ? 'available' : 'unavailable'}`, async ({ page }) => {
        if (!estimateAvailable) await page.addInitScript(() => {
            const original = window.fetch.bind(window);
            window.fetch = (input, init) => {
                const url = new URL(input instanceof Request ? input.url : input, window.location.href);
                if (/\/order-draft\/[^/]+\/estimate$/.test(url.pathname)) return Promise.resolve(new Response(null, { status: 503 }));
                return original(input, init);
            };
        });
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/s/shop-demo/inbox/cv1');
        const draft = page.getByRole('complementary', { name: 'Đơn đang nhập' });
        const create = draft.getByRole('button', { name: 'Tạo đơn', exact: true });
        await create.click();
        await draft.getByRole('textbox', { name: 'Tìm sản phẩm hoặc SKU' }).fill('AO-002');
        const product = draft.getByRole('button', { name: 'Áo thun Essential · AO-002' });
        await product.click();
        await draft.getByRole('textbox', { name: 'Số lượng' }).fill('2');
        if (estimateAvailable) {
            const subtotal = draft.locator('[data-ui-detail-line]').filter({ hasText: 'Tạm tính tiền hàng' });
            await expect(subtotal).toContainText('498.000');
        }
        await create.click();
        const dialog = page.getByRole('dialog', { name: 'Xác nhận tạo đơn' });
        await expect(dialog.getByText('Linh (khách mẫu)', { exact: true })).toBeVisible();
        await expect(dialog.getByRole('listitem')).toHaveText('Áo thun Essential · AO-002 · 2');
        await expect(dialog.getByText(estimateAvailable ? /498\.000/ : 'Chưa có dự toán')).toBeVisible();
        await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
        await expect(dialog).toBeHidden();
        await expect(create).toBeFocused();
    });
}
