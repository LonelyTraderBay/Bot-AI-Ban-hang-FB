import path from 'node:path';
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

async function seedInboxCursorFixture(page: import('@playwright/test').Page) {
    await gotoDemo(page, '/s/shop-demo/inbox');
    await expect(page.getByRole('heading', { name: 'Hộp thư khách hàng', exact: true })).toBeVisible();
    return page.evaluate(async () => {
        const { db } = await import('/src/mocks/database.ts');
        const conversation = db.conversations.find(item => item.shopId === 'shop-demo');
        const message = db.messages.find(item => item.shopId === 'shop-demo');
        if (!conversation || !message) throw new Error('Inbox seed templates are missing.');
        const conversationCount = 45;
        const messageCount = 105;
        const targetConversationId = 'ui002-conversation-41';
        const conversations = Array.from({ length: conversationCount }, (_, index) => {
            const number = String(index + 1).padStart(2, '0');
            return {
                ...structuredClone(conversation),
                id: `ui002-conversation-${number}`,
                shopId: 'shop-demo',
                displayName: `UI002 Conversation ${number}`,
                mode: 'human',
                assignedUserId: 'user-demo',
                lastMessagePreview: `UI002 message ${messageCount}`,
                unreadCount: 0,
            };
        });
        const messages = Array.from({ length: messageCount }, (_, index) => ({
            ...structuredClone(message),
            id: `ui002-message-${String(index + 1).padStart(3, '0')}`,
            shopId: 'shop-demo',
            conversationId: targetConversationId,
            text: `UI002 message ${index + 1}`,
            createdAt: new Date(Date.parse('2026-09-29T10:00:00Z') + index * 1000).toISOString(),
        }));
        db.conversations = db.conversations.filter(item => item.shopId !== 'shop-demo').concat(conversations);
        db.messages = db.messages.filter(item => item.shopId !== 'shop-demo').concat(messages);
        return {
            conversationCount,
            messageCount,
            targetConversationId,
            seededConversationCount: db.conversations.filter(item => item.shopId === 'shop-demo').length,
        };
    });
}

async function chooseOption(page: import('@playwright/test').Page, label: string, value: string | RegExp) {
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: typeof value === 'string' }).click();
}

test('UI015 mobile demo tools disclose by keyboard and inbox stays within narrow viewports', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoDemo(page, '/s/shop-demo/inbox/cv1');

    await expect(page.getByText('Demo', { exact: true })).toBeVisible();
    await expect(page.locator('[aria-label="Dữ liệu mô phỏng"]')).toBeVisible();
    const disclosure = page.getByRole('button', { name: 'Công cụ demo', exact: true });
    await expect(disclosure).toBeVisible();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('combobox', { name: 'Vai trò mô phỏng' })).toBeHidden();

    await disclosure.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Ẩn công cụ demo', exact: true })).toHaveAttribute('aria-expanded', 'true');
    const roleControl = page.getByRole('combobox', { name: 'Vai trò mô phỏng' });
    await expect(roleControl).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(roleControl).toBeFocused();
    await page.getByRole('button', { name: 'Ẩn công cụ demo', exact: true }).click();
    await expect(roleControl).toBeHidden();

    const composer = page.getByRole('textbox', { name: 'Nội dung trả lời khách' });
    await expect(composer).toBeVisible();
    await expect(page.getByRole('link', { name: 'Danh sách hội thoại' })).toBeVisible();
    await expect(page.getByTestId('inbox-context-panel')).toBeAttached();
    for (const width of [320, 390, 768, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(documentWidth, `document overflow at ${width}px`).toBeLessThanOrEqual(width);
        await expect(composer).toBeVisible();
    }
});

test('FE016 conversation keeps its composer visible while long demo context scrolls independently', async ({ page }, info) => {
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

    await thread.getByRole('checkbox', { name: 'Ghi chú nội bộ (không gửi khách)', exact: true }).check();
    const draft = thread.getByRole('textbox', { name: 'Ghi chú cho nhóm' });
    const value = Array.from({ length: 9 }, (_, index) => `Dòng nháp ${index + 1}`).join('\n');
    await draft.fill(value);
    await page.evaluate(() => {
        for (const element of document.querySelectorAll<HTMLElement>('main *')) {
            element.dataset.originalFontSize = String(Number.parseFloat(getComputedStyle(element).fontSize));
        }
        for (const element of document.querySelectorAll<HTMLElement>('main [data-original-font-size]')) {
            element.style.fontSize = `${Number(element.dataset.originalFontSize) * 2}px`;
        }
    });
    await page.evaluate(() => document.fonts.ready.then(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
    const enlarged = await page.evaluate(() => {
        const thread = document.querySelector<HTMLElement>('[data-testid="inbox-thread"]')!;
        const messages = document.querySelector<HTMLElement>('[data-testid="inbox-message-list"]')!;
        const composer = thread.querySelector<HTMLElement>('form')!;
        return { threadBottom: thread.getBoundingClientRect().bottom, composerBottom: composer.getBoundingClientRect().bottom,
            messageBottom: messages.getBoundingClientRect().bottom, composerTop: composer.getBoundingClientRect().top };
    });
    expect(enlarged.composerBottom).toBeLessThanOrEqual(enlarged.threadBottom + 1);
    expect(enlarged.messageBottom).toBeLessThanOrEqual(enlarged.composerTop + 1);
    await expect(draft).toHaveValue(value);
    const submit = thread.getByRole('button', { name: 'Lưu ghi chú', exact: true });
    await submit.focus();
    await expect(submit).toBeFocused();
    await info.attach('enlarged-composer-focus', { body: JSON.stringify(await thread.evaluate(element => {
        const form = element.querySelector('form')!;
        const button = form.querySelector('button[type="submit"]')!;
        const describe = (node: Element) => {
            const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
            return { y: rect.y, bottom: rect.bottom, height: rect.height, clientHeight: node.clientHeight,
                scrollHeight: node.scrollHeight, scrollTop: node.scrollTop, overflow: style.overflow, flex: style.flex };
        };
        return { thread: describe(element), form: describe(form), button: describe(button) };
    })), contentType: 'application/json' });
    await expect.poll(async () => {
        const reachable = await submit.boundingBox();
        const form = await thread.locator('form').boundingBox();
        return reachable!.y + reachable!.height - form!.y - form!.height;
    }).toBeLessThanOrEqual(1);
    await draft.fill('');
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

test('Shared consolidation Inbox preserves selected filters and composer draft through metadata pending error empty and recovery', async ({ page }, info) => {
    await page.addInitScript(() => {
        const state = window as unknown as { sharedSource: EventSource; sharedSequence?: number };
        const Original = window.EventSource;
        window.EventSource = class extends Original {
            constructor(url: string | URL, options?: EventSourceInit) {
                super(url, options); state.sharedSource = this;
                this.addEventListener('message', event => { try { state.sharedSequence = JSON.parse(event.data).sequence; } catch { /* Other suites own malformed events. */ } });
            }
        };
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await gotoDemo(page, '/s/shop-demo/inbox/cv1?status=open&channelId=fb-01&assignedUserId=user-demo');
    const draft = page.getByRole('textbox', { name: 'Nội dung trả lời khách', exact: true });
    await expect(draft).toBeVisible(); await draft.fill('Bản nháp giữ nguyên khi metadata thay đổi');
    const fixtureUrl = '/@fs/' + path.resolve('tests/design/shared-consolidation-fixture.ts').replaceAll('\\', '/');
    await page.evaluate(async url => { (await import(/* @vite-ignore */ url)).installMetadataBranches(); }, fixtureUrl);
    const results = [];
    for (const mode of ['pending', 'error', 'empty', 'normal'] as const) {
        const before = await page.evaluate(async url => (await import(/* @vite-ignore */ url)).metadataState().reads, fixtureUrl);
        const received = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/conversations/metadata'));
        await page.evaluate(async ({ url, mode }) => {
            (await import(/* @vite-ignore */ url)).setMetadataMode(mode);
            const state = window as unknown as { sharedSource: EventSource; sharedSequence?: number };
            state.sharedSource.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ eventId: crypto.randomUUID(), type: 'resync.required', schemaVersion: 2, shopId: 'shop-demo', resourceType: 'shop', resourceId: 'shop-demo', resourceVersion: 0, occurredAt: '2030-01-01T00:00:00Z', sequence: (state.sharedSequence ?? 0) + 1 }) }));
        }, { url: fixtureUrl, mode });
        await expect.poll(() => page.evaluate(async url => (await import(/* @vite-ignore */ url)).metadataState().reads, fixtureUrl)).toBeGreaterThan(before);
        if (mode === 'pending') {
            await expect.poll(() => page.evaluate(async url => (await import(/* @vite-ignore */ url)).metadataState().pending, fixtureUrl)).toBe(true);
            await expect(draft).toHaveValue('Bản nháp giữ nguyên khi metadata thay đổi');
            await page.evaluate(async url => (await import(/* @vite-ignore */ url)).finishMetadata(), fixtureUrl);
        }
        const response = await received;
        expect(response.status()).toBe(mode === 'error' ? 422 : 200);
        const payload = await response.json();
        if (mode === 'empty') expect(payload.data).toEqual({ channels: [], assignees: [] });
        if (mode === 'normal' || mode === 'pending') expect(payload.data.channels.length).toBeGreaterThan(0);
        await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
        await expect(draft).toHaveValue('Bản nháp giữ nguyên khi metadata thay đổi');
        expect(new URL(page.url()).searchParams.get('channelId')).toBe('fb-01');
        expect(new URL(page.url()).searchParams.get('assignedUserId')).toBe('user-demo');
        results.push({ mode, responseStatus: response.status(), data: payload, draftPreserved: true, selectedKeysPreserved: true });
    }
    const filters = page.getByRole('group', { name: 'Bộ lọc hội thoại', exact: true });
    const status = filters.getByRole('combobox', { name: /^Trạng thái(?: |$)/ });
    await status.focus(); await status.press('Enter');
    await page.getByRole('option', { name: 'Tất cả trạng thái', exact: true }).press('Enter');
    expect(new URL(page.url()).searchParams.has('status')).toBe(false);
    await expect(status).toBeFocused();
    const search = page.getByRole('textbox', { name: 'Tìm kiếm', exact: true });
    await search.fill('Linh'); await search.press('Enter');
    expect(new URL(page.url()).searchParams.get('q')).toBe('Linh');
    await page.getByRole('button', { name: 'Xóa tìm kiếm', exact: true }).click();
    expect(new URL(page.url()).searchParams.has('q')).toBe(false);
    expect(new URL(page.url()).searchParams.get('channelId')).toBe('fb-01');
    await expect(draft).toHaveValue('Bản nháp giữ nguyên khi metadata thay đổi');
    await info.attach('metadata-draft-branches', { body: JSON.stringify(results), contentType: 'application/json' });
    await draft.fill('');
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

test('UI002 inbox list and message cursors stay independent through paging, conversation switch and shop change', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    const requests: Array<{ shopId: string; resource: string; conversationId: string | null; cursor: string | null }> = [];
    const invalidCursorResponses: string[] = [];
    page.on('request', request => {
        if (request.method() !== 'GET') return;
        const url = new URL(request.url());
        const match = url.pathname.match(/\/shops\/([^/]+)\/(conversations(?:\/([^/]+)\/messages)?)/);
        if (match) requests.push({ shopId: match[1] || '', resource: match[2] || '', conversationId: match[3] || null, cursor: url.searchParams.get('cursor') });
    });
    page.on('response', response => {
        if (response.status() === 422 && /\/(conversations|messages)(\/|\?|$)/.test(new URL(response.url()).pathname)) {
            invalidCursorResponses.push(`${response.status()} ${response.url()}`);
        }
    });

    const fixture = await seedInboxCursorFixture(page);
    expect(fixture.seededConversationCount).toBe(fixture.conversationCount);
    await expect(page.getByRole('textbox', { name: 'Tìm kiếm' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Tìm kiếm' }).fill('UI002');
    const firstListResponse = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/conversations') && url.searchParams.get('q') === 'UI002' && !url.searchParams.has('cursor');
    });
    await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    const firstList = await firstListResponse;
    expect(firstList.status()).toBe(200);
    expect((await firstList.json()).page.total).toBe(fixture.conversationCount);
    await expect(page.getByRole('button', { name: 'Trang tiếp', exact: true })).toBeEnabled();

    const secondListResponse = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/conversations') && url.searchParams.get('cursor') === 'ui002-conversation-40';
    });
    await page.getByRole('button', { name: 'Trang tiếp', exact: true }).click();
    expect((await secondListResponse).status()).toBe(200);
    await expect(page.getByRole('link', { name: /UI002 Conversation 41/ })).toBeVisible();
    await test.info().attach('ui002-conversation-page-2.png', { body: await page.screenshot(), contentType: 'image/png' });

    const firstMessageResponse = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith(`/${fixture.targetConversationId}/messages`));
    await page.getByRole('link', { name: /UI002 Conversation 41/ }).click();
    await expect(page).toHaveURL(/listCursor=ui002-conversation-40/);
    expect(new URL(page.url()).searchParams.has('cursor')).toBe(false);
    expect((await firstMessageResponse).status()).toBe(200);
    const pageTwoConversation = page.getByRole('listitem').filter({ hasText: 'UI002 Conversation 41' });
    await expect(pageTwoConversation).toBeVisible();
    const firstPageRequest = requests.find(request => request.shopId === 'shop-demo' && request.resource === 'conversations' && request.cursor === 'ui002-conversation-40');
    expect(firstPageRequest).toBeDefined();

    const requestCountBeforeMessagePaging = requests.length;
    const messagePageTwoResponse = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith(`/${fixture.targetConversationId}/messages`) && new URL(response.url()).searchParams.get('cursor') === 'ui002-message-100');
    await page.getByTestId('inbox-message-list').getByRole('button', { name: 'Trang tiếp', exact: true }).click();
    expect((await messagePageTwoResponse).status()).toBe(200);
    await expect(page).toHaveURL(/listCursor=ui002-conversation-40.*cursor=ui002-message-100|cursor=ui002-message-100.*listCursor=ui002-conversation-40/);
    expect(requests.slice(requestCountBeforeMessagePaging).filter(request => request.shopId === 'shop-demo' && request.resource === 'conversations')).toEqual([]);
    await expect(page.getByTestId('inbox-message-list')).toContainText('UI002 message 105');
    expect(invalidCursorResponses).toEqual([]);
    await test.info().attach('ui002-message-page-2.png', { body: await page.screenshot(), contentType: 'image/png' });

    const nextConversationMessageResponse = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/ui002-conversation-42/messages'));
    await page.getByRole('link', { name: /UI002 Conversation 42/ }).click();
    await expect(page).toHaveURL(/listCursor=ui002-conversation-40/);
    expect(new URL(page.url()).searchParams.has('cursor')).toBe(false);
    expect((await nextConversationMessageResponse).status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'UI002 Conversation 42', exact: true })).toBeVisible();
    expect(invalidCursorResponses).toEqual([]);

    await page.getByRole('link', { name: /Joker Studio/ }).click();
    await expect(page.getByRole('heading', { name: 'Chọn cửa hàng', exact: true })).toBeVisible();
    await page.locator('a[href="/s/shop-second/overview"]').click();
    await page.getByRole('link', { name: 'Hộp thư khách hàng', exact: true }).click();
    await expect(page.getByRole('link', { name: /Linh \(khách mẫu\)/ })).toBeVisible();
    const beforeOtherShopDetail = requests.length;
    const secondShopMessages = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/shop-second/conversations/b-cv1/messages');
    });
    await page.getByRole('link', { name: /Linh \(khách mẫu\)/ }).click();
    expect((await secondShopMessages).status()).toBe(200);
    await expect(page.getByTestId('inbox-thread')).toContainText('b-cv1');
    expect(requests.slice(beforeOtherShopDetail).filter(request => request.shopId === 'shop-second').every(request => request.cursor === null)).toBe(true);
    await expect(page.getByText(/UI002 message/)).toHaveCount(0);
    expect(invalidCursorResponses).toEqual([]);
    await test.info().attach('ui002-shop-scope-requests.json', {
        body: JSON.stringify({ fixture, requests, invalidCursorResponses, assertions: ['45 conversations paged independently from 105 messages', 'list cursor retained through message page and conversation change', 'shop-second Inbox has no shop-demo cursor or data'] }, null, 2),
        contentType: 'application/json',
    });
});

test('UI002 mobile keeps the list page while messages page and Back restores it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedInboxCursorFixture(page);
    await page.getByRole('textbox', { name: 'Tìm kiếm' }).fill('UI002');
    const firstList = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/conversations') && url.searchParams.get('q') === 'UI002' && !url.searchParams.has('cursor');
    });
    await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    expect((await firstList).status()).toBe(200);

    const pageTwoList = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/conversations') && url.searchParams.get('cursor') === 'ui002-conversation-40';
    });
    await page.getByRole('button', { name: 'Trang tiếp', exact: true }).click();
    expect((await pageTwoList).status()).toBe(200);
    await page.getByRole('link', { name: /UI002 Conversation 41/ }).click();
    await expect(page).toHaveURL(/listCursor=ui002-conversation-40/);
    await expect(page.getByRole('heading', { name: 'UI002 Conversation 41', exact: true })).toBeVisible();

    const draft = 'Bản nháp giữ nguyên khi chuyển trang tin nhắn.';
    const composer = page.getByRole('textbox', { name: 'Nội dung trả lời khách' });
    await composer.fill(draft);
    const pageTwoMessages = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/ui002-conversation-41/messages') && url.searchParams.get('cursor') === 'ui002-message-100';
    });
    await page.getByTestId('inbox-message-list').getByRole('button', { name: 'Trang tiếp', exact: true }).click();
    expect((await pageTwoMessages).status()).toBe(200);
    await expect(page).toHaveURL(/listCursor=ui002-conversation-40.*cursor=ui002-message-100|cursor=ui002-message-100.*listCursor=ui002-conversation-40/);
    await expect(composer).toHaveValue(draft);

    await page.getByRole('link', { name: 'Danh sách hội thoại' }).click();
    const leaveDraft = page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?' });
    await expect(leaveDraft).toBeVisible();
    await leaveDraft.getByRole('button', { name: 'Rời màn hình', exact: true }).click();
    await expect(page).toHaveURL(/cursor=ui002-conversation-40/);
    const url = new URL(page.url());
    expect(url.searchParams.get('cursor')).toBe('ui002-conversation-40');
    expect(url.searchParams.has('listCursor')).toBe(false);
    await expect(page.getByRole('link', { name: /UI002 Conversation 41/ })).toBeVisible();
});

test('UI002 Inbox search resets only the list cursor while a message page is open', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    const invalidCursorResponses: string[] = [];
    const requests: Array<{ path: string; cursor: string | null; q: string | null }> = [];
    page.on('request', request => {
        if (request.method() !== 'GET') return;
        const url = new URL(request.url());
        if (/\/shops\/shop-demo\/conversations(?:\/[^/]+\/messages)?$/.test(url.pathname)) {
            requests.push({ path: url.pathname, cursor: url.searchParams.get('cursor'), q: url.searchParams.get('q') });
        }
    });
    page.on('response', response => {
        if (response.status() === 422 && /\/conversations(?:\/[^/]+\/messages)?$/.test(new URL(response.url()).pathname)) invalidCursorResponses.push(response.url());
    });

    await seedInboxCursorFixture(page);
    await page.getByRole('textbox', { name: 'Tìm kiếm' }).fill('UI002');
    const firstList = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/conversations') && url.searchParams.get('q') === 'UI002';
    });
    await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    expect((await firstList).status()).toBe(200);
    const pageTwoList = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/conversations') && url.searchParams.get('cursor') === 'ui002-conversation-40';
    });
    await page.getByRole('button', { name: 'Trang tiếp', exact: true }).click();
    expect((await pageTwoList).status()).toBe(200);
    await page.getByRole('link', { name: /UI002 Conversation 41/ }).click();

    const pageTwoMessages = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/ui002-conversation-41/messages') && url.searchParams.get('cursor') === 'ui002-message-100';
    });
    await page.getByTestId('inbox-message-list').getByRole('button', { name: 'Trang tiếp', exact: true }).click();
    expect((await pageTwoMessages).status()).toBe(200);
    await expect(page.getByTestId('inbox-message-list')).toContainText('UI002 message 105');

    const requestsBeforeFilter = requests.length;
    await page.getByRole('textbox', { name: 'Tìm kiếm' }).fill('UI002 Conversation');
    const filteredList = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/conversations') && url.searchParams.get('q') === 'UI002 Conversation';
    });
    await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    expect((await filteredList).status()).toBe(200);
    const url = new URL(page.url());
    expect(url.searchParams.has('listCursor')).toBe(false);
    expect(url.searchParams.get('cursor')).toBe('ui002-message-100');
    expect(requests.find(request => request.path.endsWith('/conversations') && request.q === 'UI002 Conversation')?.cursor).toBeNull();
    expect(requests.slice(requestsBeforeFilter).filter(request => request.path.endsWith('/ui002-conversation-41/messages')).every(request => request.cursor === 'ui002-message-100')).toBe(true);
    expect(invalidCursorResponses).toEqual([]);
    await expect(page.getByTestId('inbox-message-list')).toContainText('UI002 message 105');
    await test.info().attach('ui002-filter-ownership-requests.json', { body: JSON.stringify({ requests, invalidCursorResponses, finalUrl: page.url() }, null, 2), contentType: 'application/json' });
});

test('UI002 deep link, refresh and mobile Back preserve their own cursors', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const observed: Array<{ path: string; cursor: string | null }> = [];
    const invalid: string[] = [];
    page.on('request', request => {
        if (request.method() !== 'GET') return;
        const url = new URL(request.url());
        if (/\/shops\/shop-demo\/conversations(?:\/[^/]+\/messages)?$/.test(url.pathname)) {
            observed.push({ path: url.pathname, cursor: url.searchParams.get('cursor') });
        }
    });
    page.on('response', response => {
        if (response.status() === 422 && /\/conversations(?:\/[^/]+\/messages)?$/.test(new URL(response.url()).pathname)) invalid.push(response.url());
    });

    const deepLink = '/s/shop-demo/inbox/cv2?listCursor=cv1&cursor=m2';
    const list = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/conversations') && url.searchParams.get('cursor') === 'cv1';
    });
    const messages = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/cv2/messages') && url.searchParams.get('cursor') === 'm2';
    });
    await gotoDemo(page, deepLink);
    expect((await list).status()).toBe(200);
    expect((await messages).status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Minh (khách mẫu)', exact: true })).toBeVisible();

    const priorRequests = observed.length;
    const refreshList = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/conversations') && url.searchParams.get('cursor') === 'cv1';
    });
    const refreshMessages = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/cv2/messages') && url.searchParams.get('cursor') === 'm2';
    });
    await page.reload();
    expect((await refreshList).status()).toBe(200);
    expect((await refreshMessages).status()).toBe(200);
    expect(observed.length).toBeGreaterThan(priorRequests);
    await expect(page).toHaveURL(/listCursor=cv1.*cursor=m2|cursor=m2.*listCursor=cv1/);

    await page.getByRole('link', { name: 'Danh sách hội thoại' }).click();
    await expect(page).toHaveURL(/\/inbox\?cursor=cv1/);
    await expect(page.getByRole('link', { name: 'Minh (khách mẫu)' })).toBeVisible();
    const listUrl = new URL(page.url());
    expect(listUrl.searchParams.get('cursor')).toBe('cv1');
    expect(listUrl.searchParams.has('listCursor')).toBe(false);
    expect(invalid).toEqual([]);
    await test.info().attach('ui002-deeplink-refresh-mobile.json', { body: JSON.stringify({ deepLink, requests: observed, invalid }, null, 2), contentType: 'application/json' });
});

test('UI002 list and message panel errors remain isolated', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await gotoDemo(page, '/s/shop-demo/inbox/cv2');
    await page.evaluate(async () => {
        const { setOperationFailure } = await import('/src/mocks/service.ts');
        setOperationFailure('listConversations', { status: 503, code: 'UI002_LIST_FAILURE', message: 'UI002_LIST_FAILURE' });
    });
    await page.getByRole('textbox', { name: 'Tìm kiếm' }).fill('force-list-error');
    await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'UI002_LIST_FAILURE' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Minh (khách mẫu)', exact: true })).toBeVisible();
    await expect(page.getByTestId('inbox-message-list')).toContainText('Mình muốn đổi size của đơn hàng.');

    await gotoDemo(page, '/s/shop-demo/inbox/cv2');
    await page.evaluate(async () => {
        const { setOperationFailure } = await import('/src/mocks/service.ts');
        setOperationFailure('listMessages', { status: 503, code: 'UI002_MESSAGE_FAILURE', message: 'UI002_MESSAGE_FAILURE' });
    });
    await page.getByRole('link', { name: /Linh \(khách mẫu\)/ }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'UI002_MESSAGE_FAILURE' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Linh (khách mẫu)', exact: true })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'Minh (khách mẫu)' })).toBeVisible();
});

test('UI002 send, invalidation and resync keep both cursors and send only once', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    const calls: Array<{ method: string; path: string; cursor: string | null; body: string | null }> = [];
    const invalidCursorResponses: string[] = [];
    let sendCount = 0;
    page.on('request', request => {
        const url = new URL(request.url());
        if (!url.pathname.includes('/conversations')) return;
        if (request.method() === 'POST' && url.pathname.endsWith('/ui002-conversation-41/messages')) sendCount++;
        calls.push({ method: request.method(), path: url.pathname, cursor: url.searchParams.get('cursor'), body: request.postData() });
    });
    page.on('response', response => {
        if (response.status() === 422 && /\/(conversations|messages)(\/|\?|$)/.test(new URL(response.url()).pathname)) invalidCursorResponses.push(response.url());
    });

    await seedInboxCursorFixture(page);
    await page.getByRole('textbox', { name: 'Tìm kiếm' }).fill('UI002');
    const firstList = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/conversations') && url.searchParams.get('q') === 'UI002';
    });
    await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    expect((await firstList).status()).toBe(200);
    const pageTwoList = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/conversations') && url.searchParams.get('cursor') === 'ui002-conversation-40';
    });
    await page.getByRole('button', { name: 'Trang tiếp', exact: true }).click();
    expect((await pageTwoList).status()).toBe(200);
    await page.getByRole('link', { name: /UI002 Conversation 41/ }).click();
    await expect(page).toHaveURL(/listCursor=ui002-conversation-40/);

    const draft = 'Phản hồi thử sau khi xác nhận đúng cửa hàng.';
    const composer = page.getByRole('textbox', { name: 'Nội dung trả lời khách' });
    await composer.fill(draft);
    const pageTwoMessages = page.waitForResponse(response => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname.endsWith('/ui002-conversation-41/messages') && url.searchParams.get('cursor') === 'ui002-message-100';
    });
    await page.getByTestId('inbox-message-list').getByRole('button', { name: 'Trang tiếp', exact: true }).click();
    expect((await pageTwoMessages).status()).toBe(200);
    await expect(composer).toHaveValue(draft);

    const requestStart = calls.length;
    const sendRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/ui002-conversation-41/messages'));
    const sendResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/ui002-conversation-41/messages'));
    await page.getByRole('button', { name: 'Gửi trả lời', exact: true }).dblclick({ delay: 30 });
    const posted = await sendRequest;
    expect(JSON.parse(posted.postData() || 'null')).toMatchObject({ text: draft, expectedConversationVersion: 1 });
    expect((await sendResponse).status()).toBe(202);
    expect(sendCount).toBe(1);
    await expect(composer).toHaveValue('');
    await expect(page).toHaveURL(/listCursor=ui002-conversation-40.*cursor=ui002-message-100|cursor=ui002-message-100.*listCursor=ui002-conversation-40/);
    await expect.poll(() => calls.slice(requestStart).some(call => call.method === 'GET' && call.path.endsWith('/conversations') && call.cursor === 'ui002-conversation-40')).toBe(true);
    await expect.poll(() => calls.slice(requestStart).some(call => call.method === 'GET' && call.path.endsWith('/ui002-conversation-41/messages') && call.cursor === 'ui002-message-100')).toBe(true);
    expect(calls.filter(call => call.method === 'POST').length).toBe(1);
    expect(invalidCursorResponses).toEqual([]);
    await test.info().attach('ui002-send-resync-requests.json', { body: JSON.stringify({ calls, sendCount, invalidCursorResponses }, null, 2), contentType: 'application/json' });
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
    await page.getByRole('button', { name: /^Đánh giá tin nhắn/ }).first().click();
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
    const sendAgain=page.getByRole('button', { name: 'Gửi trả lời', exact: true });
    await expect(sendAgain).toBeDisabled();
    await sendAgain.evaluate(button=>(button as HTMLButtonElement).click());
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
