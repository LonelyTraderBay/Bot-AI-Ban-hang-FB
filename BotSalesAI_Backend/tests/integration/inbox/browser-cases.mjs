import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { readAuthConfig } from '../../../apps/api/dist/modules/workspace/index.js';
import { signMessengerFixtureEvent } from '../../../apps/api/dist/modules/inbox/messenger-fixture.js';
import { localAccountingDate } from '../../../apps/api/dist/modules/finance/index.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { appOrigin } from '../../../infra/p0/oidc/tls.mjs';
import { fixtureWriter } from '../orders/fixtures.mjs';

const [shop] = fixtureShops;
const app = appOrigin + '/s/' + shop.id;
const root = appOrigin + '/api/v2';
const api = root + '/shops/' + shop.id;

export function configureMetaInboundFixture(env, reply = false) {
    const numericId = () => (BigInt('0x' + randomBytes(8).toString('hex')) + 1n).toString();
    const pageId = numericId();
    const senderId = numericId();
    env.META_MESSENGER_APP_SECRET = randomUUID();
    env.META_MESSENGER_VERIFY_TOKEN = randomUUID();
    env.META_MESSENGER_PAGES = JSON.stringify([{ pageId, shopId: shop.id, senderIds: [senderId] }]);
    let accessToken;
    if (reply) {
        accessToken = randomUUID();
        env.META_MESSENGER_GRAPH_VERSION = 'v27.0';
        env.META_MESSENGER_PAGE_TOKENS = JSON.stringify({ [pageId]: accessToken });
    } else {
        delete env.META_MESSENGER_GRAPH_VERSION;
        delete env.META_MESSENGER_PAGE_TOKENS;
    }
    return { pageId, senderId, appSecret: env.META_MESSENGER_APP_SECRET, verifyToken: env.META_MESSENGER_VERIFY_TOKEN, accessToken };
}

function responseFor(page, path, method = 'POST') {
    const pending = page.waitForResponse(response => response.request().method() === method && response.url() === api + path)
        .catch(error => { throw new Error(`Chờ ${method} ${path}: ${error.name}`, { cause: error }); });
    void pending.catch(() => {});
    return pending;
}

async function data(pending, expected = 200) {
    const response = await pending;
    assert.equal(response.status(), expected, new URL(response.url()).pathname);
    return (await response.json()).data;
}

async function waitSucceeded(page, path) {
    for (let attempt = 0; attempt < 30; attempt++) {
        const state = await data(page.request.get(api + path));
        if (state.status === 'succeeded') return state;
        if (['failed', 'cancelled', 'unknown'].includes(state.status)) throw new Error(`Tác vụ ${path} báo ${state.status}`);
        await delay(300);
    }
    throw new Error(`Quá thời gian theo dõi ${path}`);
}

async function uiReply(page, channel, conversation, marker) {
    await page.goto(app + '/inbox?q=' + conversation.id);
    await page.getByRole('link', { name: new RegExp(marker) }).click();
    await page.waitForURL(app + '/inbox/' + conversation.id + '**');
    await page.getByRole('heading', { name: new RegExp(marker) }).waitFor();
    await page.getByRole('button', { name: 'Tiếp quản', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Tiếp quản cuộc trò chuyện' });
    await dialog.getByRole('textbox').fill('Nhận tư vấn trên Firefox');
    const adopted = responseFor(page, '/conversations/' + conversation.id + '/takeover');
    await dialog.getByRole('button', { name: 'Tiếp quản', exact: true }).click();
    assert.equal((await data(adopted, 202)).status, 'succeeded');
    const text = 'Trả lời Firefox ' + marker;
    const message = responseFor(page, '/conversations/' + conversation.id + '/messages');
    await page.getByRole('textbox', { name: 'Nội dung trả lời khách' }).fill(text);
    await page.getByRole('button', { name: 'Gửi trả lời' }).click();
    const queued = await data(message, 202);
    assert.equal(queued.status, 'accepted');
    await page.getByTestId('inbox-message-list').getByText(text, { exact: true }).waitFor();
    const completed = await waitSucceeded(page, '/commands/' + queued.id);
    assert.ok(completed.result.id);
    const sent = await data(page.request.get(api + '/conversations/' + conversation.id + '/messages?q=' + encodeURIComponent(text)));
    assert.equal(sent.length, 1);
    assert.equal(sent[0].id, completed.result.id);
    assert.equal(sent[0].status, 'sent');
    assert.equal(conversation.channelId, channel.id);
    return sent[0];
}

async function approveFeedback(page, post, conversation, message, marker) {
    const feedback = await post('/feedback', { conversationId: conversation.id, messageId: message.id, rating: 'negative',
        correction: 'Đề nghị sửa Firefox ' + marker }, 201);
    await page.goto(app + '/knowledge/review?q=' + encodeURIComponent(marker));
    await page.getByRole('row').filter({ hasText: feedback.messageId }).getByRole('button', { name: 'Duyệt nội dung' }).click();
    const dialog = page.getByRole('dialog', { name: 'Kiểm tra phản hồi' });
    await dialog.getByRole('textbox', { name: 'Nội dung đã loại dữ liệu riêng tư' }).fill('Câu trả lời đã bỏ thông tin riêng tư');
    await dialog.getByRole('textbox', { name: 'Lý do' }).fill('Đã kiểm tra nội dung nguồn Firefox');
    const reviewed = responseFor(page, '/feedback/' + feedback.id + '/review');
    await dialog.getByRole('button', { name: 'Lưu kết quả' }).click();
    assert.equal((await data(reviewed)).status, 'approved');
}

async function knowledgeFlow(page, writer, marker) {
    await page.goto(app + '/knowledge');
    await page.getByRole('button', { name: 'Thêm nguồn kiến thức' }).click();
    const form = page.getByRole('dialog', { name: 'Nguồn kiến thức mới' });
    await form.locator('[name="title"]').fill('Tri thức Firefox ' + marker);
    await form.locator('input[type="file"]').setInputFiles({ name: 'guidance.txt', mimeType: 'text/plain', buffer: Buffer.from('Hướng dẫn đổi trả Firefox ' + marker) });
    const created = responseFor(page, '/knowledge');
    await form.getByRole('button', { name: 'Lưu bản nháp' }).click();
    const draft = await data(created, 201);
    await page.getByRole('link', { name: 'Mở nguồn vừa tạo' }).click();
    await page.getByRole('button', { name: 'Gửi duyệt', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Gửi nguồn kiến thức để duyệt' });
    await review.getByRole('textbox').fill('Lập chỉ mục nguồn riêng tư Firefox');
    const path = '/knowledge/' + draft.id;
    const indexed = responseFor(page, path + '/submit-review');
    await review.getByRole('button', { name: 'Gửi nguồn để duyệt' }).click();
    const job = await data(indexed, 202);
    await waitSucceeded(page, '/jobs/' + job.id);
    await page.reload();
    const publishButton = page.getByRole('button', { name: 'Xuất bản bản đã đánh giá' });
    await publishButton.click();
    const doc = await data(page.request.get(api + path));
    assert.equal(doc.status, 'ready_for_review');
    const evaluation = await writer.evaluation.create({ data: {
        shopId: shop.id, configRevision: 1, datasetVersion: 'fixture-firefox-v1', knowledgeRevisionId: doc.draftRevisionId,
        knowledgeHash: doc.contentHash, policyVersion: (await writer.shop.findUniqueOrThrow({ where: { id: shop.id } })).policyVersion,
        fixture: true, status: 'passed', totalCases: 1, passedCases: 1,
    } });
    const publish = page.getByRole('dialog', { name: 'Xuất bản kiến thức' });
    await publish.getByRole('textbox', { name: 'Mã lần đánh giá đúng phiên bản' }).fill(evaluation.id);
    await publish.getByRole('textbox', { name: 'Lý do xuất bản' }).fill('Đã kiểm bản đúng được lập chỉ mục');
    const published = responseFor(page, path + '/publish');
    await publish.getByRole('button', { name: 'Xuất bản', exact: true }).click();
    assert.equal((await data(published, 202)).status, 'succeeded');
    assert.equal((await data(page.request.get(api + path))).publishedRevisionId, doc.draftRevisionId);
}

async function comboFlow(page, writer, post, conversation, marker) {
    const date = localAccountingDate(new Date(), shop.timezone);
    const day = new Date(date + 'T00:00:00Z');
    const period = await writer.accountingPeriod.findFirst({ where: { shopId: shop.id, startDate: { lte: day }, endDate: { gte: day }, state: 'open' } });
    if (!period) await post('/periods', { startDate: date, endDate: date, reason: 'Kỳ kiểm combo từ hộp thư' }, 201);
    const sku = 'BE18-FX-' + marker;
    const { variants } = await post('/products', {
        name: sku, description: '', categoryId: null, status: 'active', imageFileIds: [],
        variants: [1, 2].map(index => ({ sku: sku + '-' + index, name: 'Mẫu ' + index, options: { mau: String(index) }, active: true,
            price: { amount: '10000', currency: shop.currency } })),
    }, 201);
    for (const variant of variants) {
        const existing = await writer.stockPosition.findUnique({ where: { shopId_warehouseId_variantId: {
            shopId: shop.id, warehouseId: shop.defaultWarehouseId, variantId: variant.id,
        } } });
        await post('/inventory/adjustments', { expectedVersion: existing?.version ?? 1, warehouseId: shop.defaultWarehouseId, variantId: variant.id,
            quantityDelta: 2, reason: 'Mẫu để thử combo trong hội thoại', unitCost: { amount: '2000', currency: shop.currency } }, 202);
    }
    const promo = await post('/promotions', {
        name: 'Combo hộp thư ' + marker, startsOn: date, endsOn: '2099-01-01',
        lines: variants.map(variant => ({ variantId: variant.id, quantity: 1 })), discountAmount: '1000', minMarginPercent: 20,
    }, 201);
    const decision = (state, version) => post('/promotions/' + promo.id + '/decision', { action: state, reason: 'Đối chiếu combo từ hộp thư Firefox' }, 200, 'PATCH', version);
    const active = await decision('activate', promo.version);
    try {
        await page.goto(app + '/inbox/' + conversation.id);
        await page.getByRole('link', { name: 'Kiểm tra trên đơn nháp' }).and(
            page.locator('a[href*="promotionId=' + promo.id + '"]')).click();
        await page.getByRole('textbox', { name: 'Tìm sản phẩm hoặc SKU' }).fill(sku);
        for (const [index, variant] of variants.entries()) {
            if (index) await page.getByRole('button', { name: 'Thêm dòng', exact: true }).click();
            await page.getByRole('combobox', { name: 'Sản phẩm ' + (index + 1) }).click();
            await page.getByRole('option', { name: new RegExp(variant.sku + '$') }).click();
        }
        const ordered = responseFor(page, '/orders');
        await page.getByRole('button', { name: 'Lưu đơn nháp' }).click();
        const order = await data(ordered, 201);
        assert.equal(order.conversationId, conversation.id);
        assert.equal(order.promotionId, promo.id);
        assert.equal(order.total.amount, '19000');
    } finally {
        await decision('pause', active.version);
    }
}

export async function verifyInboxFlow(page, csrf) {
    const writer = fixtureWriter();
    const config = readAuthConfig(process.env);
    const post = (path, input, expected = 200, method = 'POST', version) => data(page.request.fetch(api + path, {
        method, data: input, headers: { origin: appOrigin, 'x-csrf-token': csrf, 'idempotency-key': randomUUID(), ...(version ? { 'if-match': '"' + version + '"' } : {}) },
    }), expected);
    const marker = 'PX-' + randomUUID().slice(0, 8);
    try {
        await page.goto(app + '/integrations/channels');
        const connecting = responseFor(page, '/integrations/channels/connect');
        const authorization = page.waitForResponse(result => result.url().split('?')[0] === root + '/integrations/messenger-fixture/authorize');
        void authorization.catch(() => {});
        await page.getByRole('button', { name: 'Kết nối Page', exact: true }).click();
        const start = await data(connecting);
        assert.equal(new URL(start.authorizationUrl).origin, appOrigin);
        assert.equal((await authorization).status(), 302);
        await page.waitForURL(app + '/integrations/channels');
        const channel = await writer.channelConnection.findUniqueOrThrow({ where: {
            shopId_provider_pageId: { shopId: shop.id, provider: 'messenger', pageId: 'fixture-' + shop.id },
        } });
        assert.equal(channel.status, 'connected');
        const input = { type: 'message', pageId: channel.pageId, generation: channel.generation, eventId: randomUUID(), conversationId: randomUUID(),
            messageId: randomUUID(), senderId: randomUUID(), occurredAt: new Date().toISOString(), displayName: 'Khách ' + marker, text: 'Hỏi hàng Firefox ' + marker };
        await data(page.request.post(root + '/integrations/messenger-fixture/events', {
            data: input, headers: { 'x-botsales-fixture-signature': signMessengerFixtureEvent(config.signingKey, input) },
        }));
        const conversation = await writer.channelConversation.findUniqueOrThrow({ where: {
            shopId_channelId_externalId: { shopId: shop.id, channelId: channel.id, externalId: input.conversationId },
        } });
        const message = await uiReply(page, channel, conversation, marker);
        await comboFlow(page, writer, post, conversation, marker);
        await approveFeedback(page, post, conversation, message, marker);
        await knowledgeFlow(page, writer, marker);
    } finally {
        await writer.$disconnect();
    }
    console.log('Firefox BE-18 R29 R05 R06 R18 R23 R24 R25: fixture authorization, inbox, send, promotion draft, knowledge indexing, publication and feedback review.');
}

const metaWebhook = root + '/integrations/meta/messenger/webhook';

function signedMetaText({ pageId, senderId, appSecret }, text) {
    const mid = randomUUID();
    const body = JSON.stringify({ object: 'page', entry: [{ id: pageId, messaging: [{
        sender: { id: senderId }, recipient: { id: pageId }, timestamp: Date.now(), message: { mid, text },
    }] }] }, null, 2);
    const headers = { 'content-type': 'application/json', 'x-hub-signature-256': 'sha256=' + createHmac('sha256', appSecret).update(body).digest('hex') };
    return { data: body, headers, externalId: 'meta:' + createHash('sha256').update(mid).digest('hex') };
}

async function deliverMetaText(page, { data: body, headers }) {
    for (let attempt = 0; attempt < 2; attempt++) {
        const delivered = await page.request.post(metaWebhook, { data: body, headers });
        assert.equal(delivered.status(), 200);
        assert.equal(await delivered.text(), 'EVENT_RECEIVED');
    }
}

export async function sendMetaQuoteConfirmation(page, fixture, quote) {
    const input = signedMetaText(fixture, '[CONFIRM:' + quote.id + ':' + quote.quoteHash + ']');
    await deliverMetaText(page, input);
    return input.externalId;
}

export async function verifyMetaInboundFlow(page, fixture, onMessageVisible) {
    const { pageId, verifyToken, accessToken } = fixture;
    const challenge = randomUUID();
    const query = new URL(metaWebhook);
    query.searchParams.set('hub.mode', 'subscribe');
    query.searchParams.set('hub.verify_token', verifyToken);
    query.searchParams.set('hub.challenge', challenge);
    const verified = await page.request.get(query.href);
    assert.equal(verified.status(), 200);
    assert.match(verified.headers()['content-type'], /^text\/plain\b/);
    assert.equal(await verified.text(), challenge);

    const text = 'Tin Messenger qua HTTPS ' + randomUUID();
    const input = signedMetaText(fixture, text);
    assert.equal((await page.request.post(metaWebhook, { data: input.data + '\n', headers: input.headers })).status(), 404);
    await deliverMetaText(page, input);

    const channels = await data(page.request.get(api + '/integrations/channels?q=' + pageId));
    assert.equal(channels.length, 1);
    const [channel] = channels;
    assert.equal(channel.externalPageId, pageId);
    assert.deepEqual(channel.capabilities, accessToken ? ['send_text', 'receive_messages'] : ['receive_messages']);
    assert.equal(channel.mediaPolicy, null);
    const conversations = await data(page.request.get(api + '/conversations?channelId=' + channel.id));
    assert.equal(conversations.length, 1);
    const [conversation] = conversations;
    await page.goto(app + '/inbox?q=' + conversation.id);
    await page.getByRole('link', { name: /Liên hệ Messenger/ }).click();
    await page.waitForURL(app + '/inbox/' + conversation.id + '**');
    await page.getByTestId('inbox-message-list').getByText(text, { exact: true }).waitFor();
    await onMessageVisible?.(page, 'messenger-inbox-message');
    await page.getByText(/Không được gửi tin/).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Gửi trả lời' }).isDisabled(), true);
    const messages = await data(page.request.get(api + '/conversations/' + conversation.id + '/messages'));
    assert.equal(messages.length, 1);
    if (accessToken) {
        await uiReply(page, channel, conversation, 'Liên hệ Messenger');
        console.log('Firefox T069 Meta R05 R06: HTTPS webhook, one received message, human takeover and reply through the packaged worker to the local Graph fixture.');
    } else {
        console.log('Firefox T069 Meta R05 R06: HTTPS challenge and signed bytes, duplicate delivery stored once, receive-only inbox.');
    }
    return conversation;
}
