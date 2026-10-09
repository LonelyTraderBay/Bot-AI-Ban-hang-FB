# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fe016.spec.ts >> FE016 conversation keeps its composer visible while long demo context scrolls independently
- Location: tests\fe016.spec.ts:101:1

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 990.84375
Received:    998.390625
```

# Test source

```ts
  31  |         const conversations = Array.from({ length: conversationCount }, (_, index) => {
  32  |             const number = String(index + 1).padStart(2, '0');
  33  |             return {
  34  |                 ...structuredClone(conversation),
  35  |                 id: `ui002-conversation-${number}`,
  36  |                 shopId: 'shop-demo',
  37  |                 displayName: `UI002 Conversation ${number}`,
  38  |                 mode: 'human',
  39  |                 assignedUserId: 'user-demo',
  40  |                 lastMessagePreview: `UI002 message ${messageCount}`,
  41  |                 unreadCount: 0,
  42  |             };
  43  |         });
  44  |         const messages = Array.from({ length: messageCount }, (_, index) => ({
  45  |             ...structuredClone(message),
  46  |             id: `ui002-message-${String(index + 1).padStart(3, '0')}`,
  47  |             shopId: 'shop-demo',
  48  |             conversationId: targetConversationId,
  49  |             text: `UI002 message ${index + 1}`,
  50  |             createdAt: new Date(Date.parse('2026-09-29T10:00:00Z') + index * 1000).toISOString(),
  51  |         }));
  52  |         db.conversations = db.conversations.filter(item => item.shopId !== 'shop-demo').concat(conversations);
  53  |         db.messages = db.messages.filter(item => item.shopId !== 'shop-demo').concat(messages);
  54  |         return {
  55  |             conversationCount,
  56  |             messageCount,
  57  |             targetConversationId,
  58  |             seededConversationCount: db.conversations.filter(item => item.shopId === 'shop-demo').length,
  59  |         };
  60  |     });
  61  | }
  62  | 
  63  | async function chooseOption(page: import('@playwright/test').Page, label: string, value: string | RegExp) {
  64  |     await page.getByRole('combobox', { name: label }).click();
  65  |     await page.getByRole('option', { name: value, exact: typeof value === 'string' }).click();
  66  | }
  67  | 
  68  | test('UI015 mobile demo tools disclose by keyboard and inbox stays within narrow viewports', async ({ page }) => {
  69  |     await page.setViewportSize({ width: 390, height: 844 });
  70  |     await gotoDemo(page, '/s/shop-demo/inbox/cv1');
  71  | 
  72  |     await expect(page.getByText('Demo', { exact: true })).toBeVisible();
  73  |     await expect(page.locator('[aria-label="Dữ liệu mô phỏng"]')).toBeVisible();
  74  |     const disclosure = page.getByRole('button', { name: 'Công cụ demo', exact: true });
  75  |     await expect(disclosure).toBeVisible();
  76  |     await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  77  |     await expect(page.getByRole('combobox', { name: 'Vai trò mô phỏng' })).toBeHidden();
  78  | 
  79  |     await disclosure.focus();
  80  |     await page.keyboard.press('Enter');
  81  |     await expect(page.getByRole('button', { name: 'Ẩn công cụ demo', exact: true })).toHaveAttribute('aria-expanded', 'true');
  82  |     const roleControl = page.getByRole('combobox', { name: 'Vai trò mô phỏng' });
  83  |     await expect(roleControl).toBeVisible();
  84  |     await page.keyboard.press('Tab');
  85  |     await expect(roleControl).toBeFocused();
  86  |     await page.getByRole('button', { name: 'Ẩn công cụ demo', exact: true }).click();
  87  |     await expect(roleControl).toBeHidden();
  88  | 
  89  |     const composer = page.getByRole('textbox', { name: 'Nội dung trả lời khách' });
  90  |     await expect(composer).toBeVisible();
  91  |     await expect(page.getByRole('link', { name: 'Danh sách hội thoại' })).toBeVisible();
  92  |     await expect(page.getByTestId('inbox-context-panel')).toBeAttached();
  93  |     for (const width of [320, 390, 768, 1280]) {
  94  |         await page.setViewportSize({ width, height: 844 });
  95  |         const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  96  |         expect(documentWidth, `document overflow at ${width}px`).toBeLessThanOrEqual(width);
  97  |         await expect(composer).toBeVisible();
  98  |     }
  99  | });
  100 | 
  101 | test('FE016 conversation keeps its composer visible while long demo context scrolls independently', async ({ page }) => {
  102 |     await page.setViewportSize({ width: 1600, height: 900 });
  103 |     await gotoDemo(page, '/s/shop-demo/inbox/cv1');
  104 | 
  105 |     const thread = page.getByTestId('inbox-thread');
  106 |     const context = page.getByTestId('inbox-context-panel');
  107 |     await expect(thread.getByRole('textbox', { name: 'Nội dung trả lời khách' })).toBeVisible();
  108 |     await expect(context.getByRole('heading', { name: 'Bối cảnh khách hàng' })).toBeVisible();
  109 |     await expect(context).toHaveAttribute('tabindex', '0');
  110 | 
  111 |     const layout = await page.evaluate(() => {
  112 |         const thread = document.querySelector<HTMLElement>('[data-testid="inbox-thread"]');
  113 |         const context = document.querySelector<HTMLElement>('[data-testid="inbox-context-panel"]');
  114 |         const messages = document.querySelector<HTMLElement>('[data-testid="inbox-message-list"]');
  115 |         const composer = thread?.querySelector<HTMLElement>('form');
  116 |         if (!thread || !context || !messages || !composer) throw new Error('Inbox layout elements are missing.');
  117 |         return {
  118 |             threadHeight: thread.getBoundingClientRect().height,
  119 |             threadBottom: thread.getBoundingClientRect().bottom,
  120 |             composerBottom: composer.getBoundingClientRect().bottom,
  121 |             messageHeight: messages.getBoundingClientRect().height,
  122 |             contextHeight: context.clientHeight,
  123 |             contextScrollHeight: context.scrollHeight,
  124 |         };
  125 |     });
  126 | 
  127 |     expect(layout.threadHeight).toBe(650);
  128 |     expect(layout.contextHeight).toBeLessThanOrEqual(650);
  129 |     expect(layout.contextScrollHeight).toBeGreaterThan(layout.contextHeight);
  130 |     expect(layout.messageHeight).toBeLessThanOrEqual(550);
> 131 |     expect(layout.composerBottom).toBeLessThanOrEqual(layout.threadBottom + 1);
      |                                   ^ Error: expect(received).toBeLessThanOrEqual(expected)
  132 | });
  133 | 
  134 | test('FE016.AC01 inbox filters call canonical query fields and remain bookmarked through conversation details', async ({ page }) => {
  135 |     const responseWait = page.waitForResponse(response => {
  136 |         const url = new URL(response.url());
  137 |         return response.request().method() === 'GET' && url.pathname.endsWith('/conversations') && url.searchParams.get('mode') === 'human';
  138 |     });
  139 |     await gotoDemo(page, '/s/shop-demo/inbox?q=Minh&status=open&mode=human&channelId=fb-01&assignedUserId=user-demo');
  140 |     const response = await responseWait;
  141 |     const url = new URL(response.url());
  142 |     expect(url.searchParams.get('q')).toBe('Minh');
  143 |     expect(url.searchParams.get('status')).toBe('open');
  144 |     expect(url.searchParams.get('channelId')).toBe('fb-01');
  145 |     expect(url.searchParams.get('assignedUserId')).toBe('user-demo');
  146 |     expect((await response.json()).data.map((conversation: { id: string }) => conversation.id)).toEqual(['cv2']);
  147 |     await expect(page.getByRole('link', { name: /Minh \(khách mẫu\)/ })).toBeVisible();
  148 | 
  149 |     const statusFilter = page.locator('[aria-label="Bộ lọc hội thoại"]').getByRole('combobox').first();
  150 |     await statusFilter.click();
  151 |     await page.getByRole('option', { name: 'Đã giải quyết', exact: true }).click();
  152 |     await expect(page).toHaveURL(/status=resolved/);
  153 |     await expect(page.getByText('Chưa có hội thoại phù hợp.')).toBeVisible();
  154 | 
  155 |     await statusFilter.click();
  156 |     await page.getByRole('option', { name: 'Đang mở', exact: true }).click();
  157 |     await page.getByRole('link', { name: /Minh \(khách mẫu\)/ }).click();
  158 |     await expect(page).toHaveURL(/q=Minh.*status=open.*mode=human.*channelId=fb-01.*assignedUserId=user-demo/);
  159 |     await expect(page.getByRole('heading', { name: 'Minh (khách mẫu)' })).toBeVisible();
  160 | });
  161 | 
  162 | test('Shared consolidation Inbox preserves selected filters and composer draft through metadata pending error empty and recovery', async ({ page }, info) => {
  163 |     await page.addInitScript(() => {
  164 |         const state = window as unknown as { sharedSource: EventSource; sharedSequence?: number };
  165 |         const Original = window.EventSource;
  166 |         window.EventSource = class extends Original {
  167 |             constructor(url: string | URL, options?: EventSourceInit) {
  168 |                 super(url, options); state.sharedSource = this;
  169 |                 this.addEventListener('message', event => { try { state.sharedSequence = JSON.parse(event.data).sequence; } catch { /* Other suites own malformed events. */ } });
  170 |             }
  171 |         };
  172 |     });
  173 |     await page.setViewportSize({ width: 1440, height: 1000 });
  174 |     await gotoDemo(page, '/s/shop-demo/inbox/cv1?status=open&channelId=fb-01&assignedUserId=user-demo');
  175 |     const draft = page.getByRole('textbox', { name: 'Nội dung trả lời khách', exact: true });
  176 |     await expect(draft).toBeVisible(); await draft.fill('Bản nháp giữ nguyên khi metadata thay đổi');
  177 |     const fixtureUrl = '/@fs/' + path.resolve('tests/design/shared-consolidation-fixture.ts').replaceAll('\\', '/');
  178 |     await page.evaluate(async url => { (await import(/* @vite-ignore */ url)).installMetadataBranches(); }, fixtureUrl);
  179 |     const results = [];
  180 |     for (const mode of ['pending', 'error', 'empty', 'normal'] as const) {
  181 |         const before = await page.evaluate(async url => (await import(/* @vite-ignore */ url)).metadataState().reads, fixtureUrl);
  182 |         const received = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/conversations/metadata'));
  183 |         await page.evaluate(async ({ url, mode }) => {
  184 |             (await import(/* @vite-ignore */ url)).setMetadataMode(mode);
  185 |             const state = window as unknown as { sharedSource: EventSource; sharedSequence?: number };
  186 |             state.sharedSource.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ eventId: crypto.randomUUID(), type: 'resync.required', schemaVersion: 2, shopId: 'shop-demo', resourceType: 'shop', resourceId: 'shop-demo', resourceVersion: 0, occurredAt: '2030-01-01T00:00:00Z', sequence: (state.sharedSequence ?? 0) + 1 }) }));
  187 |         }, { url: fixtureUrl, mode });
  188 |         await expect.poll(() => page.evaluate(async url => (await import(/* @vite-ignore */ url)).metadataState().reads, fixtureUrl)).toBeGreaterThan(before);
  189 |         if (mode === 'pending') {
  190 |             await expect.poll(() => page.evaluate(async url => (await import(/* @vite-ignore */ url)).metadataState().pending, fixtureUrl)).toBe(true);
  191 |             await expect(draft).toHaveValue('Bản nháp giữ nguyên khi metadata thay đổi');
  192 |             await page.evaluate(async url => (await import(/* @vite-ignore */ url)).finishMetadata(), fixtureUrl);
  193 |         }
  194 |         const response = await received;
  195 |         expect(response.status()).toBe(mode === 'error' ? 422 : 200);
  196 |         const payload = await response.json();
  197 |         if (mode === 'empty') expect(payload.data).toEqual({ channels: [], assignees: [] });
  198 |         if (mode === 'normal' || mode === 'pending') expect(payload.data.channels.length).toBeGreaterThan(0);
  199 |         await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
  200 |         await expect(draft).toHaveValue('Bản nháp giữ nguyên khi metadata thay đổi');
  201 |         expect(new URL(page.url()).searchParams.get('channelId')).toBe('fb-01');
  202 |         expect(new URL(page.url()).searchParams.get('assignedUserId')).toBe('user-demo');
  203 |         results.push({ mode, responseStatus: response.status(), data: payload, draftPreserved: true, selectedKeysPreserved: true });
  204 |     }
  205 |     const filters = page.getByRole('group', { name: 'Bộ lọc hội thoại', exact: true });
  206 |     const status = filters.getByRole('combobox', { name: /^Trạng thái(?: |$)/ });
  207 |     await status.focus(); await status.press('Enter');
  208 |     await page.getByRole('option', { name: 'Tất cả trạng thái', exact: true }).press('Enter');
  209 |     expect(new URL(page.url()).searchParams.has('status')).toBe(false);
  210 |     await expect(status).toBeFocused();
  211 |     const search = page.getByRole('textbox', { name: 'Tìm kiếm', exact: true });
  212 |     await search.fill('Linh'); await search.press('Enter');
  213 |     expect(new URL(page.url()).searchParams.get('q')).toBe('Linh');
  214 |     await page.getByRole('button', { name: 'Xóa tìm kiếm', exact: true }).click();
  215 |     expect(new URL(page.url()).searchParams.has('q')).toBe(false);
  216 |     expect(new URL(page.url()).searchParams.get('channelId')).toBe('fb-01');
  217 |     await expect(draft).toHaveValue('Bản nháp giữ nguyên khi metadata thay đổi');
  218 |     await info.attach('metadata-draft-branches', { body: JSON.stringify(results), contentType: 'application/json' });
  219 |     await draft.fill('');
  220 | });
  221 | 
  222 | test('FE016.AC01 list cursor is isolated from message cursor and restored on back navigation', async ({ page }) => {
  223 |     await page.setViewportSize({ width: 390, height: 844 });
  224 |     const listWait = page.waitForResponse(response => {
  225 |         const url = new URL(response.url());
  226 |         return response.request().method() === 'GET' && url.pathname.endsWith('/conversations') && url.searchParams.get('cursor') === 'cv1';
  227 |     });
  228 |     await gotoDemo(page, '/s/shop-demo/inbox?cursor=cv1');
  229 |     const listResponse = await listWait;
  230 |     expect((await listResponse.json()).data.map((conversation: { id: string }) => conversation.id)).not.toContain('cv1');
  231 |     const messageWait = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/messages'));
```