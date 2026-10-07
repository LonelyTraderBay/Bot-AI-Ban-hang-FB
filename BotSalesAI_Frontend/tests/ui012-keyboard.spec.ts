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

async function tabUntilFocused(page: import('@playwright/test').Page, target: import('@playwright/test').Locator, limit = 100) {
    for (let index = 0; index < limit; index += 1) {
        if (await target.evaluate(element => element === document.activeElement)) return;
        await page.keyboard.press('Tab');
    }
    await expect(target, `control should be reachable within ${limit} Tab presses`).toBeFocused();
}

async function currentTextContrast(locator: import('@playwright/test').Locator) {
    return locator.evaluate(element => {
        const luminance = (cssColor: string) => {
            const channels = cssColor.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number);
            if (!channels || channels.length !== 3) throw new Error(`Unexpected computed color: ${cssColor}`);
            const [red, green, blue] = channels.map(value => {
                const channel = value / 255;
                return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
            });
            return .2126 * red + .7152 * green + .0722 * blue;
        };
        const foreground = luminance(getComputedStyle(element).color);
        const background = luminance(getComputedStyle(element).backgroundColor);
        const lighter = Math.max(foreground, background);
        const darker = Math.min(foreground, background);
        return (lighter + .05) / (darker + .05);
    });
}

test('UI012 keyboard-only finance edit handles select, discard warning and focus return', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', request => {
        if (request.method() === 'POST') writes.push(new URL(request.url()).pathname);
    });

    await page.goto(new URL('/s/shop-demo/finance/entries', demoUrl).toString());
    const main = page.locator('main#main-content');
    const skipLink = page.getByRole('link', { name: 'Đến nội dung chính', exact: true });
    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page.getByRole('heading', { name: 'Sổ thu chi', exact: true })).toBeVisible();
    await expect(main).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main-content$/);
    await expect(main).toBeFocused();

    const trigger = page.getByRole('button', { name: 'Tạo phiếu', exact: true });
    await tabUntilFocused(page, trigger);
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'Phiếu thu chi mới' });
    await expect(dialog).toBeVisible();
    const kind = dialog.getByRole('combobox', { name: 'Loại phiếu' });
    await tabUntilFocused(page, kind);
    await page.keyboard.press('Enter');
    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await expect(kind).toContainText('Thu tiền');
    await expect(kind).toBeFocused();

    const cancel = dialog.getByRole('button', { name: 'Hủy', exact: true });
    await tabUntilFocused(page, cancel);
    await page.keyboard.press('Enter');
    const discard = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?' });
    await expect(discard).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(discard).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(kind).toContainText('Thu tiền');

    const amount = dialog.getByRole('textbox', { name: 'Số tiền (VND)' });
    await tabUntilFocused(page, amount);
    await page.keyboard.press('Control+A');
    await page.keyboard.type('1250');
    await expect(amount).toHaveValue('1250');

    await tabUntilFocused(page, cancel);
    await page.keyboard.press('Enter');
    await expect(discard).toBeVisible();
    const abandon = discard.getByRole('button', { name: 'Bỏ thay đổi', exact: true });
    await tabUntilFocused(page, abandon);
    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(writes).toEqual([]);
});

test('UI012 keyboard validation focuses the field named by a synthetic 422 response', async ({ page }) => {
    await page.addInitScript(() => {
        const originalFetch = window.fetch.bind(window);
        Object.assign(window, { __ui012Synthetic422: false });
        window.fetch = (input, init) => {
            const requestUrl = input instanceof Request ? input.url : String(input);
            const method = init?.method || (input instanceof Request ? input.method : 'GET');
            if (new URL(requestUrl, window.location.href).pathname === '/api/v2/shops/shop-demo/knowledge' && method === 'POST') {
                Object.assign(window, { __ui012Synthetic422: true });
                return Promise.resolve(new Response(JSON.stringify({
                    type: 'about:blank',
                    title: 'Dữ liệu chưa hợp lệ',
                    status: 422,
                    code: 'VALIDATION_ERROR',
                    detail: 'Nội dung cần được kiểm tra trước khi lưu.',
                    requestId: 'ui012-keyboard-422',
                    errors: [{ path: 'content', code: 'CONTENT_REVIEW_REQUIRED', message: 'Hãy rà soát nội dung nguồn.' }],
                }), { status: 422, headers: { 'content-type': 'application/problem+json' } }));
            }
            return originalFetch(input, init);
        };
    });

    await page.goto(new URL('/s/shop-demo/knowledge', demoUrl).toString());
    const main = page.locator('main#main-content');
    await expect(page.getByRole('heading', { name: 'Kiến thức cửa hàng', exact: true })).toBeVisible();
    const skipLink = page.getByRole('link', { name: 'Đến nội dung chính', exact: true });
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(main).toBeFocused();

    const add = page.getByRole('button', { name: 'Thêm nguồn kiến thức', exact: true });
    await tabUntilFocused(page, add);
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Nguồn kiến thức mới' });
    await expect(dialog).toBeVisible();

    const title = dialog.getByRole('textbox', { name: 'Tiêu đề' });
    const content = dialog.getByRole('textbox', { name: 'Nội dung' });
    await tabUntilFocused(page, title);
    await page.keyboard.type('Quy trình đổi hàng đã rà soát');
    await tabUntilFocused(page, content);
    await page.keyboard.type('Nội dung tổng hợp cần xác minh thêm trước khi tạo bản nháp.');
    const save = dialog.getByRole('button', { name: 'Lưu bản nháp', exact: true });
    await tabUntilFocused(page, save);
    await page.keyboard.press('Enter');

    const alert = dialog.getByRole('alert').filter({ hasText: 'Nội dung cần được kiểm tra trước khi lưu.' });
    await expect(alert).toBeVisible();
    expect(await page.evaluate(() => (window as Window & { __ui012Synthetic422: boolean }).__ui012Synthetic422)).toBe(true);
    await expect(content).toBeFocused();
    await expect(content).toHaveAttribute('aria-invalid', 'true');
    await expect(alert).toContainText('Nội dung: Hãy rà soát nội dung nguồn.');
    await expect(alert).not.toContainText('content:');
});

test('UI012 keyboard activates the CSV chooser and discards its selected file without upload', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', request => {
        if (request.method() === 'POST') writes.push(new URL(request.url()).pathname);
    });
    await page.goto(new URL('/s/shop-demo/finance/reconciliation', demoUrl).toString());
    const main = page.locator('main#main-content');
    await expect(page.getByRole('heading', { name: 'Đối soát ngân hàng & COD', exact: true })).toBeVisible();
    const skipLink = page.getByRole('link', { name: 'Đến nội dung chính', exact: true });
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(main).toBeFocused();

    const trigger = page.getByRole('button', { name: 'Nhập bảng đối soát', exact: true });
    await tabUntilFocused(page, trigger);
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Nhập bảng đối soát' });
    await expect(dialog).toBeVisible();
    const chooseFile = dialog.getByRole('button', { name: 'Chọn CSV', exact: true });
    await tabUntilFocused(page, chooseFile);
    const chooserPromise = page.waitForEvent('filechooser', { timeout: 10_000 });
    await page.keyboard.press('Space');
    const chooser = await chooserPromise;
    await chooser.setFiles({ name: 'ui012-keyboard.csv', mimeType: 'text/csv', buffer: Buffer.from('id,amount\nTX-1,100') });
    await expect(dialog.getByRole('button', { name: 'ui012-keyboard.csv', exact: true })).toBeVisible();

    const cancel = dialog.getByRole('button', { name: 'Hủy', exact: true });
    await tabUntilFocused(page, cancel);
    await page.keyboard.press('Enter');
    const discard = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?' });
    await expect(discard).toBeVisible();
    const abandon = discard.getByRole('button', { name: 'Bỏ thay đổi', exact: true });
    await tabUntilFocused(page, abandon);
    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(writes).toEqual([]);
});

test('UI012 keyboard can reach and horizontally scroll the marketing chart data alternative', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(new URL('/s/shop-demo/reports/marketing', demoUrl).toString());
    const main = page.locator('main#main-content');
    await expect(page.getByRole('heading', { name: 'Thông tin cho marketing', exact: true })).toBeVisible();
    const chart = page.getByRole('img', { name: /Biểu đồ lý do không chốt đơn/ });
    const table = page.getByRole('table', { name: 'Lý do không chốt đơn' });
    const region = page.getByRole('region', { name: 'Lý do không chốt đơn' });
    await expect(chart).toBeVisible();
    await expect(table.getByRole('row').nth(1)).toBeVisible();
    await expect(region).toBeVisible();

    const skipLink = page.getByRole('link', { name: 'Đến nội dung chính', exact: true });
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(main).toBeFocused();
    await tabUntilFocused(page, region);
    await expect(region).toBeFocused();
    const before = await region.evaluate(element => (element as HTMLElement).scrollLeft);
    expect(await region.evaluate(element => (element as HTMLElement).scrollWidth > (element as HTMLElement).clientWidth)).toBe(true);
    await page.keyboard.press('ArrowRight');
    const after = await region.evaluate(element => (element as HTMLElement).scrollLeft);
    expect(after).toBeGreaterThan(before);
    expect(await page.evaluate(() => document.documentElement.scrollLeft)).toBe(0);
});

test('UI012 marketing chart keeps every category label visible beside its data table', async ({ page }) => {
    const expectedLabels = [
        'Không còn đúng kích cỡ',
        'Chưa rõ phí giao hàng',
        'Chưa đủ thông tin sản phẩm',
    ];

    for (const viewport of [{ width: 1280, height: 720 }, { width: 320, height: 860 }]) {
        await page.setViewportSize(viewport);
        await page.goto(new URL('/s/shop-demo/reports/marketing', demoUrl).toString());
        const chart = page.getByRole('img', { name: 'Biểu đồ lý do không chốt đơn, 3 nhóm' });
        const table = page.getByRole('table', { name: 'Lý do không chốt đơn' });
        await expect(chart).toBeVisible();
        await expect(table).toBeVisible();

        const chartLabels = (await chart.locator('svg text').allTextContents()).map(label => label.replace(/\s+/gu, ' ').trim());
        expect(chartLabels).toEqual(expect.arrayContaining(expectedLabels));
        await expect(table.getByRole('row')).toHaveCount(4);

        await chart.scrollIntoViewIfNeeded();
        const chartBounds = await chart.boundingBox();
        expect(chartBounds).not.toBeNull();
        const labelBounds = await chart.locator('svg text').evaluateAll((nodes, labels) => nodes
            .filter(node => labels.includes((node.textContent || '').replace(/\s+/gu, ' ').trim()))
            .map(node => {
                const rect = node.getBoundingClientRect();
                return { x: rect.x, right: rect.right, fontSize: Number.parseFloat(getComputedStyle(node).fontSize) };
            }), expectedLabels);
        expect(labelBounds).toHaveLength(expectedLabels.length);
        for (const bounds of labelBounds) {
            expect(bounds.x).toBeGreaterThanOrEqual(chartBounds!.x);
            expect(bounds.right).toBeLessThanOrEqual(chartBounds!.x + chartBounds!.width);
            expect(bounds.fontSize).toBeGreaterThanOrEqual(14);
        }
        for (let index = 1; index < labelBounds.length; index += 1) {
            expect(labelBounds[index - 1].right).toBeLessThanOrEqual(labelBounds[index].x);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
});

test('UI012 inbox feedback actions identify their message and return focus after Escape', async ({ page }) => {
    const mutationRequests: string[] = [];
    page.on('request', request => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) mutationRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });

    await page.goto(new URL('/s/shop-demo/inbox/cv1', demoUrl).toString());
    const messageList = page.getByTestId('inbox-message-list');
    const actions = messageList.getByRole('button', { name: /^Đánh giá/ });
    await expect(actions).toHaveCount(2);
    const actionNames = await actions.evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label') || button.textContent?.trim() || ''));
    expect(actionNames.every(name => name.startsWith('Đánh giá tin nhắn'))).toBe(true);
    expect(new Set(actionNames).size).toBe(actionNames.length);
    expect(actionNames).toContainEqual(expect.stringContaining('Shop ơi áo thun còn size L không?'));

    await tabUntilFocused(page, actions.first());
    await expect(actions.first()).toBeFocused();
    await page.keyboard.press('Space');
    const dialog = page.getByRole('dialog', { name: /Đánh giá câu trả lời/ });
    await expect(dialog).toBeVisible();
    const ratingField = dialog.getByRole('combobox', { name: /Đánh giá/ });
    await expect(ratingField).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(actions.first()).toBeFocused();
    const focusReturned = await actions.first().evaluate(element => element === document.activeElement);
    expect(mutationRequests).toEqual([]);
    await test.info().attach('ui012-inbox-feedback-actions.json', {
        body: JSON.stringify({ route: '/s/shop-demo/inbox/cv1', actionNames, focusedRatingField: true, focusReturned, mutationRequests }, null, 2),
        contentType: 'application/json',
    });
});

test('UI012 order draft does not announce an untouched required customer as invalid', async ({ page }) => {
    await page.goto(new URL('/s/shop-demo/orders/new', demoUrl).toString());
    await expect(page.getByRole('heading', { name: 'Tạo đơn hàng', exact: true })).toBeVisible();

    const customer = page.getByRole('combobox', { name: 'Khách hàng' });
    await expect(customer).toBeVisible();
    await expect(customer).not.toHaveAttribute('aria-invalid', 'true');
    await expect(customer).toHaveAttribute('aria-required', 'true');
    await expect(customer).not.toHaveClass(/Mui-error/);
    await expect(page.getByText('Chọn khách hàng để lưu đơn nháp.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lưu đơn nháp' })).toBeDisabled();
});

test('UI012 long BotConfig policy literal wraps inside its alert at a 320 CSS-pixel viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(new URL('/s/shop-demo/bot', demoUrl).toString());

    const alert = page.getByRole('alert').filter({ hasText: 'BotConfigWrite' });
    await expect(alert).toBeVisible();
    await expect(alert.getByText('requireHumanOrderConfirmation=true', { exact: true })).toBeVisible();

    const layout = await alert.evaluate(element => {
        const message = element.querySelector<HTMLElement>('.MuiAlert-message');
        if (!message) throw new Error('MUI Alert message container is missing');
        const messageRect = message.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(message);
        const textRects = [...range.getClientRects()]
            .filter(rect => rect.width > 0 && rect.height > 0)
            .map(rect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }));
        return {
            clientWidth: message.clientWidth,
            scrollWidth: message.scrollWidth,
            overflowX: getComputedStyle(message).overflowX,
            messageLeft: messageRect.left,
            messageRight: messageRect.right,
            clippedTextRects: textRects.filter(rect => rect.left < messageRect.left - 1 || rect.right > messageRect.right + 1),
            documentClientWidth: document.documentElement.clientWidth,
            documentScrollWidth: document.documentElement.scrollWidth,
        };
    });

    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
    expect(layout.clippedTextRects).toEqual([]);
    expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.documentClientWidth + 1);
});

test('UI012 dashboard CTA separates hover and pressed feedback while keeping keyboard focus visible', async ({ page }) => {
    await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
    const action = page.getByRole('link', { name: 'Xem việc cần làm', exact: true });
    await expect(action).toBeVisible();

    await action.hover();
    const hoverColor = await action.evaluate(element => getComputedStyle(element).backgroundColor);
    const hoverContrast = await currentTextContrast(action);
    const bounds = await action.boundingBox();
    expect(bounds).not.toBeNull();
    await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
    await page.mouse.down();
    const pressedColor = await action.evaluate(element => getComputedStyle(element).backgroundColor);
    const pressedContrast = await currentTextContrast(action);
    await page.mouse.up();

    expect(hoverColor).toBe('rgb(255, 219, 140)');
    expect(pressedColor).toBe('rgb(223, 174, 79)');
    expect(pressedColor).not.toBe(hoverColor);
    expect(hoverContrast).toBeGreaterThanOrEqual(4.5);
    expect(pressedContrast).toBeGreaterThanOrEqual(4.5);

    await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
    const skipLink = page.getByRole('link', { name: 'Đến nội dung chính', exact: true });
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await tabUntilFocused(page, action);
    await expect(action).toBeFocused();
    expect(await action.evaluate(element => element.matches(':focus-visible'))).toBe(true);
});
