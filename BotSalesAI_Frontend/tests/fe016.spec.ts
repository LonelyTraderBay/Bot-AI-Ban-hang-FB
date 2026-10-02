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

async function chooseOption(page: import('@playwright/test').Page, label: string, value: string | RegExp) {
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: typeof value === 'string' }).click();
}

test('FE016 conversation keeps its composer visible while long demo context scrolls independently', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await gotoDemo(page, '/s/shop-demo/inbox/cv1');

    const thread = page.getByTestId('inbox-thread');
    const context = page.getByTestId('inbox-context-panel');
    await expect(thread.getByRole('textbox', { name: 'Nội dung trả lời khách' })).toBeVisible();
    await expect(context.getByRole('heading', { name: 'Bối cảnh khách hàng' })).toBeVisible();
    await expect(context).toHaveAttribute('tabindex', '0');

    const layout = await page.evaluate(() => {
        const thread = document.querySelector<HTMLElement>('[data-testid="inbox-thread"]');
        const context = document.querySelector<HTMLElement>('[data-testid="inbox-context-panel"]');
        const messages = document.querySelector<HTMLElement>('[data-testid="inbox-message-list"]');
        const composer = thread?.querySelector<HTMLElement>('form');
        if (!thread || !context || !messages || !composer) throw new Error('Inbox layout elements are missing.');
        return {
            threadHeight: thread.getBoundingClientRect().height,
            threadBottom: thread.getBoundingClientRect().bottom,
            composerBottom: composer.getBoundingClientRect().bottom,
            messageHeight: messages.getBoundingClientRect().height,
            contextHeight: context.clientHeight,
            contextScrollHeight: context.scrollHeight,
        };
    });

    expect(layout.threadHeight).toBe(650);
    expect(layout.contextHeight).toBeLessThanOrEqual(650);
    expect(layout.contextScrollHeight).toBeGreaterThan(layout.contextHeight);
    expect(layout.messageHeight).toBeLessThanOrEqual(550);
    expect(layout.composerBottom).toBeLessThanOrEqual(layout.threadBottom + 1);
});

test('FE016.AC01 inbox filters call canonical query fields and remain bookmarked through conversation details', async ({ page }) => {
    const responseWait = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/conversations') && url.searchParams.get('mode') === 'human';
    });
    await gotoDemo(page, '/s/shop-demo/inbox?q=Minh&status=open&mode=human&channelId=fb-01&assignedUserId=user-demo');
    const response = await responseWait;
    const url = new URL(response.url());
    expect(url.searchParams.get('q')).toBe('Minh');
    expect(url.searchParams.get('status')).toBe('open');
    expect(url.searchParams.get('channelId')).toBe('fb-01');
    expect(url.searchParams.get('assignedUserId')).toBe('user-demo');
    expect((await response.json()).data.map((conversation: { id: string }) => conversation.id)).toEqual(['cv2']);
    await expect(page.getByRole('link', { name: /Minh \(khách mẫu\)/ })).toBeVisible();

    const statusFilter = page.locator('[aria-label="Bộ lọc hội thoại"]').getByRole('combobox').first();
    await statusFilter.click();
    await page.getByRole('option', { name: 'Đã giải quyết', exact: true }).click();
    await expect(page).toHaveURL(/status=resolved/);
    await expect(page.getByText('Chưa có hội thoại phù hợp.')).toBeVisible();

    await statusFilter.click();
    await page.getByRole('option', { name: 'Đang mở', exact: true }).click();
    await page.getByRole('link', { name: /Minh \(khách mẫu\)/ }).click();
    await expect(page).toHaveURL(/q=Minh.*status=open.*mode=human.*channelId=fb-01.*assignedUserId=user-demo/);
    await expect(page.getByRole('heading', { name: 'Minh (khách mẫu)' })).toBeVisible();
});

test('FE016.AC01 list cursor is isolated from message cursor and restored on back navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const listWait = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/conversations') && url.searchParams.get('cursor') === 'cv1';
    });
    await gotoDemo(page, '/s/shop-demo/inbox?cursor=cv1');
    const listResponse = await listWait;
    expect((await listResponse.json()).data.map((conversation: { id: string }) => conversation.id)).not.toContain('cv1');
    const messageWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/messages'));
    await page.getByRole('link', { name: /Minh \(khách mẫu\)/ }).click();
    await expect(page).toHaveURL(/listCursor=cv1/);
    const messageResponse = await messageWait;
    expect(new URL(messageResponse.url()).searchParams.has('cursor')).toBe(false);

    await page.getByRole('link', { name: 'Danh sách hội thoại' }).click();
    await expect(page).toHaveURL(/cursor=cv1/);
});

test('FE016.AC01 takeover and reply use current versions and show API send state without claiming delivery', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/inbox/cv1');
    await page.getByRole('button', { name: 'Tiếp quản', exact: true }).click();
    const takeoverDialog = page.getByRole('dialog', { name: 'Tiếp quản cuộc trò chuyện' });
    await takeoverDialog.getByRole('textbox', { name: /Lý do/ }).fill('Khách cần nhân viên hỗ trợ trực tiếp.');
    const takeoverRequestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/takeover'));
    const takeoverResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/takeover'));
    await takeoverDialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    const takeoverRequest = await takeoverRequestWait;
    expect(JSON.parse(takeoverRequest.postData() || 'null')).toMatchObject({ expectedVersion: 1, reason: 'Khách cần nhân viên hỗ trợ trực tiếp.' });
    expect((await takeoverResponseWait).status()).toBe(202);
    await expect(page.getByText(/Nhân viên đang tiếp quản/)).toBeVisible();

    const reply = 'Nhân viên đã nhận yêu cầu đổi size.';
    await page.getByRole('textbox', { name: 'Nội dung trả lời khách' }).fill(reply);
    const sendRequestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/messages'));
    const sendResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/messages'));
    await page.getByRole('button', { name: 'Gửi trả lời', exact: true }).click();
    const sendRequest = await sendRequestWait;
    const sendBody = JSON.parse(sendRequest.postData() || 'null');
    expect(sendBody).toMatchObject({ text: reply, expectedConversationVersion: 2 });
    expect(sendBody.clientMessageId).toBeTruthy();
    expect((await sendResponseWait).status()).toBe(202);
    await expect(page.locator('main').getByText(reply, { exact: true }).last()).toBeVisible();
    await expect(page.getByText(/· sent$/)).toBeVisible();
});

test('FE016.AC02 internal notes render HTML-like text inert and feedback creates only a review draft', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/inbox/cv2');
    const payload = '<img src=x onerror=alert(1)> khách gửi đường dẫn';
    await page.getByRole('checkbox', { name: 'Ghi chú nội bộ (không gửi khách)' }).check();
    await page.getByRole('textbox', { name: 'Ghi chú cho nhóm' }).fill(payload);
    const noteRequestWait = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/notes'));
    const noteResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/notes'));
    await page.getByRole('button', { name: 'Lưu ghi chú', exact: true }).click();
    const noteRequest = await noteRequestWait;
    expect(JSON.parse(noteRequest.postData() || 'null')).toEqual({ text: payload });
    expect((await noteResponseWait).status()).toBe(201);
    await expect(page.getByText(payload, { exact: true })).toBeVisible();
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
    await expect(page.getByText('Ghi chú nội bộ', { exact: true }).last()).toBeVisible();
    await expect(page.getByText(/Ảnh\/tin thoại chỉ bật khi hợp đồng/)).toBeVisible();

    const publishedWrites: string[] = [];
    page.on('request', request => {
        if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/knowledge')) publishedWrites.push(request.url());
    });
    await page.getByRole('button', { name: 'Đánh giá', exact: true }).first().click();
    const feedbackDialog = page.getByRole('dialog', { name: 'Đánh giá câu trả lời' });
    await feedbackDialog.getByRole('textbox', { name: 'Nội dung đề xuất sửa' }).fill('Cần nhân viên xác minh nội dung trước khi duyệt.');
    const feedbackResponseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/feedback'));
    await feedbackDialog.getByRole('button', { name: 'Lưu phản hồi', exact: true }).click();
    const feedbackResponse = await feedbackResponseWait;
    expect(feedbackResponse.status()).toBe(201);
    expect((await feedbackResponse.json()).data).toMatchObject({ status: 'pending', knowledgeDraftId: null });
    expect(publishedWrites).toHaveLength(0);
});

test('FE016.AC03 unknown send keeps the reply draft, exposes command recovery and never blindly resends', async ({ page }) => {
    const sends: string[] = [];
    page.on('request', request => {
        if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/messages')) sends.push(request.postData() || '');
    });
    await gotoDemo(page, '/s/shop-demo/inbox/cv2');
    await chooseOption(page, 'Trạng thái thử', 'Kết quả ghi chưa rõ');
    const reply = 'Tôi sẽ kiểm tra tồn kho và phản hồi sau.';
    const textbox = page.getByRole('textbox', { name: 'Nội dung trả lời khách' });
    await textbox.fill(reply);
    const responseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/messages'));
    await page.getByRole('button', { name: 'Gửi trả lời', exact: true }).click();
    expect((await responseWait).status()).toBe(202);
    await expect(page.getByText('Có 1 thao tác chưa xác minh kết quả')).toBeVisible();
    await expect(textbox).toHaveValue(reply);
    await expect(page.getByText(/Mã lệnh cần kiểm tra/)).toBeVisible();
    await page.getByRole('button', { name: 'Gửi trả lời', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: /chưa xác minh kết quả/ })).toBeVisible();
    expect(sends).toHaveLength(1);
});

test('FE016.AC04 role without customer/order permissions cannot open those cross-module references', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/inbox/cv2');
    await chooseOption(page, 'Vai trò mô phỏng', 'bot_admin');
    await expect(page.getByRole('navigation', { name: 'Điều hướng chính' }).getByText('bot_admin', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Hồ sơ khách' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Tạo đơn từ hội thoại' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tiếp quản', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Gửi trả lời', exact: true })).toBeDisabled();
    await expect(page.getByText('Thông tin khách bị ẩn theo quyền hiện tại.')).toBeVisible();
});

test('FE016.S03 stale takeover preserves reason and reports the version conflict', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/inbox/cv1');
    await chooseOption(page, 'Trạng thái thử', 'Xung đột lần ghi tiếp');
    await page.getByRole('button', { name: 'Tiếp quản', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Tiếp quản cuộc trò chuyện' });
    const reason = 'Khách cần hỗ trợ đối chiếu đơn.';
    await dialog.getByRole('textbox', { name: /Lý do/ }).fill(reason);
    const responseWait = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/takeover'));
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    expect((await responseWait).status()).toBe(412);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: /Lý do/ })).toHaveValue(reason);
    await expect(dialog.getByRole('alert').filter({ hasText: /Mô phỏng dữ liệu bị thay đổi/ })).toBeVisible();
    await expect(page.getByText('Trợ lý tự động')).toBeVisible();
});

test('FE016.B05 cross-sell promotion preview shows sample rules without applying a discount', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', request => {
        if (request.method() !== 'GET' && new URL(request.url()).pathname.startsWith('/api/v2/'))
            writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });
    await gotoDemo(page, '/s/shop-demo/inbox/cv1');
    await page.getByRole('button', { name: 'Xem điều kiện combo mẫu' }).click();
    const preview = page.getByTestId('mock-promotion-preview');
    await expect(preview).toContainText('DEMO-PROMO-01');
    await expect(preview).toContainText('Không áp dụng giảm giá');
    expect(writes).toEqual([]);
});

test('FE016.B08 image and voice preview is synthetic and stays local', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', request => {
        if (request.method() !== 'GET' && new URL(request.url()).pathname.startsWith('/api/v2/'))
            writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });
    await gotoDemo(page, '/s/shop-demo/inbox/cv1');
    await page.getByRole('button', { name: 'Xem mẫu ảnh và tin thoại' }).click();
    const preview = page.getByTestId('mock-media-preview');
    await expect(preview).toContainText('DEMO-MEDIA-IMAGE-01');
    await expect(preview).toContainText('Tin thoại mẫu · 00:08 · chưa phát âm thanh');
    await expect(page.getByRole('textbox', { name: 'Nội dung trả lời khách' })).toBeVisible();
    expect(writes).toEqual([]);
});

test('FE027.B01 industry sales script preview asks for missing facts and stays a local draft', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', request => {
        if (request.method() !== 'GET' && new URL(request.url()).pathname.startsWith('/api/v2/')) writes.push(request.method());
    });
    await gotoDemo(page, '/s/shop-demo/inbox/cv1');
    const preview = page.getByRole('tabpanel', { name: 'Kịch bản tư vấn mẫu' });
    await expect(preview).toContainText('Bạn đang tìm kiểu dáng và dịp sử dụng nào?');
    await expect(preview).toContainText(/thiếu thông tin thì hỏi lại hoặc chuyển nhân viên/i);
    await preview.getByRole('combobox', { name: 'Ngành hàng mẫu' }).click();
    await page.getByRole('option', { name: 'Mỹ phẩm', exact: true }).click();
    await expect(preview).toContainText('Bạn có dị ứng hoặc thành phần cần tránh không?');
    await expect(page.getByText(/không gọi AI và không gửi tin cho khách/)).toBeVisible();
    expect(writes).toEqual([]);
});

test('FE027.B02 inbox price and available stock preview uses current canonical mock reads', async ({ page }) => {
    const productWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/products'));
    const stockWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/inventory'));
    await gotoDemo(page, '/s/shop-demo/inbox/cv1');
    const [productResponse, stockResponse] = await Promise.all([productWait, stockWait]);
    expect(productResponse.status()).toBe(200);
    expect(stockResponse.status()).toBe(200);
    const products = (await productResponse.json()).data as Array<{ id: string; name: string; status: string; variants: Array<{ id: string; sku: string; active: boolean; price: { amount: string } | null }> }>;
    const snapshots = (await stockResponse.json()).data as Array<{ variantId: string; available: number; asOf: string }>;
    const source = products.filter(product => product.status === 'active').flatMap(product => product.variants.filter(variant => variant.active && variant.price).map(variant => ({ product, variant, snapshot: snapshots.find(item => item.variantId === variant.id) }))).find(item => item.variant.price && item.snapshot);
    expect(source).toBeTruthy();
    if (!source?.snapshot) throw new Error('Synthetic inbox catalog source is missing its inventory snapshot.');
    await page.getByRole('tab', { name: 'Giá & tồn' }).click();
    await expect(page.getByText('Dữ liệu chỉ là mock; cần truy vấn lại trước khi xác nhận đơn.', { exact: false })).toBeVisible();
    const table = page.getByRole('table', { name: 'Nguồn giá và tồn trong hộp thư' });
    await expect(table).toBeVisible();
    await expect(table).toContainText(source.product.name);
    await expect(table).toContainText(source.variant.sku);
    await expect(table).toContainText(String(source.snapshot.available));
});

test('FE027.B03 order capture links the active customer and conversation into the manual order form', async ({ page }) => {
    await gotoDemo(page, '/s/shop-demo/inbox/cv1');
    await page.getByRole('tab', { name: 'Tạo đơn' }).click();
    const orderLink = page.getByRole('link', { name: 'Mở biểu mẫu tạo đơn từ hội thoại', exact: true });
    await expect(orderLink).toHaveAttribute('href', '/s/shop-demo/orders/new?customerId=c1&conversationId=cv1');
    await orderLink.click();
    await expect(page).toHaveURL(/\/s\/shop-demo\/orders\/new\?customerId=c1&conversationId=cv1$/);
    await expect(page.getByRole('heading', { name: 'Tạo đơn hàng', exact: true })).toBeVisible();
});

test('FE027.B04 automatic order confirmation stays unavailable until policy and customer evidence exist', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', request => {
        if (request.method() !== 'GET' && new URL(request.url()).pathname.startsWith('/api/v2/')) writes.push(request.method());
    });
    await gotoDemo(page, '/s/shop-demo/inbox/cv1');
    await page.getByRole('tab', { name: 'Xác nhận' }).click();
    await expect(page.getByRole('tabpanel', { name: 'Điều kiện xác nhận đơn' })).toContainText('Bằng chứng xác nhận của khách');
    await expect(page.getByRole('button', { name: 'Tự động xác nhận đơn chưa được hỗ trợ' })).toBeDisabled();
    expect(writes).toEqual([]);
});
