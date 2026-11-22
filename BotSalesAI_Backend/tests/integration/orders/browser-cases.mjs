import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { URLSearchParams } from 'node:url';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { localAccountingDate } from '../../../apps/api/dist/modules/finance/index.js';
import { recordStockMovement } from '../../../apps/api/dist/modules/inventory/index.js';
import { createDatabaseClient } from '../../../apps/api/dist/platform/database/client.js';
import { serializable } from '../../../apps/api/dist/platform/database/transactions.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { appOrigin, issuer } from '../../../infra/p0/oidc/tls.mjs';
import { reviewedEvidenceFixture } from '../helpers/reviewed-evidence-fixture.mjs';
import { sendMetaQuoteConfirmation } from '../inbox/browser-cases.mjs';
import { pushReceiver } from '../notifications/web-push-fixture.mjs';
import { telegramFixtureEnv, telegramStartUpdate } from '../notifications/telegram-fixture.mjs';
import { assertFixtureDatabase } from '../workspace/session-fixture.mjs';
import { fixtureWriter, orderConversation, quoteEvidenceFixture } from './fixtures.mjs';

const [shop] = fixtureShops;
const app = appOrigin + '/s/' + shop.id;
const api = appOrigin + '/api/v2/shops/' + shop.id;

function mutationResponse(page, path, method = 'POST') {
    const response = page.waitForResponse(item => item.request().method() === method && item.url() === api + path);
    void response.catch(() => {});
    return response;
}

export async function verifyOrdersFlow(page, actorId, csrfToken, { fulfillment = false, promotion = false, messenger, runtime } = {}) {
    const id = randomUUID().slice(0, 8);
    const sku = 'BE11-LIVE-' + id;
    const mutationHeaders = () => ({ origin: appOrigin, 'x-csrf-token': csrfToken, 'idempotency-key': randomUUID() });
    const post = async (path, data) => {
        const response = await page.request.post(api + path, { data, headers: mutationHeaders() });
        assert.equal(response.status(), 201);
        return (await response.json()).data;
    };
    const customerId = messenger?.conversation.customerId ??
        (await post('/customers', { displayName: 'Khách Firefox ' + id, phone: '0900000123', email: null, notes: '' })).id;
    const address = await post('/customers/' + customerId + '/addresses', {
        label: 'Địa chỉ ' + id, recipient: 'Người nhận Firefox', phone: '0900000123', line1: 'Địa chỉ giả lập',
        countryCode: 'VN', province: 'Hà Nội', ward: null, district: null, postalCode: null,
    });
    const { variants } = await post('/products', {
        name: 'Sản phẩm ' + sku, description: '', categoryId: null, status: 'active', imageFileIds: [],
        variants: [{ sku, name: 'Mặc định', active: true, options: {}, price: { currency: shop.currency, amount: '15000.01' } },
            ...(promotion ? [{ sku: sku + '-COMBO', name: 'Bổ sung combo', active: true, options: {},
                price: { currency: shop.currency, amount: '5000' } }] : [])],
    });
    const writer = fixtureWriter();
    const url = readDatabaseUrl(process.env);
    assertFixtureDatabase(url);
    const db = createDatabaseClient(url);
    try {
        const conversation = messenger
            ? await db.channelConversation.findUniqueOrThrow({ where: { shopId_id: { shopId: shop.id, id: messenger.conversation.id } } })
            : (await orderConversation(writer, shop.id, customerId)).conversation;
        for (const variant of variants) {
            await serializable(db, tx => recordStockMovement(tx, {
                shopId: shop.id, warehouseId: shop.defaultWarehouseId, variantId: variant.id, actorId,
                kind: 'receipt', source: { type: 'fixture_receipt', id: randomUUID() }, reason: 'Nhập hàng cho ca đơn Firefox',
                receivedValue: '1000.005', delta: { onHand: 1 },
            }), true);
        }
        const offerRule = promotion ? await createBrowserPromotion(page, variants, id) : null;
        const prior = await page.request.get(api + '/shipping-policy');
        const policy = await page.request.put(api + '/shipping-policy', {
            headers: { ...mutationHeaders(), 'if-match': prior.headers().etag },
            data: { rules: [{ countryCode: 'VN', province: 'Hà Nội', serviceName: 'Giao thử Firefox', amount: '23000' }] },
        });
        assert.equal(policy.status(), 200);
        const params = new URLSearchParams({ customerId });
        await page.goto(app + '/orders/new?' + params);
        await page.getByRole('heading', { name: 'Tạo đơn hàng', exact: true }).waitFor();
        await page.getByRole('combobox', { name: 'Hội thoại liên quan' }).click();
        await page.getByRole('option', { name: new RegExp(conversation.id) }).click();
        await page.getByRole('combobox', { name: 'Địa chỉ giao hàng' }).click();
        await page.getByRole('option', { name: new RegExp(address.label) }).click();
        await page.getByRole('textbox', { name: 'Tìm sản phẩm hoặc SKU' }).fill(sku);
        await page.getByRole('combobox', { name: 'Sản phẩm 1', exact: true }).click();
        await page.getByRole('option', { name: new RegExp(sku + '$') }).click();
        if (offerRule) {
            await page.getByRole('button', { name: 'Thêm dòng', exact: true }).click();
            await page.getByRole('combobox', { name: 'Sản phẩm 2', exact: true }).click();
            await page.getByRole('option', { name: new RegExp(variants[1].sku + '$') }).click();
            await page.getByRole('combobox', { name: 'Ưu đãi combo' }).click();
            await page.getByRole('option', { name: offerRule.name }).click();
        }

        const create = mutationResponse(page, '/orders');
        await page.getByRole('button', { name: 'Lưu đơn nháp', exact: true }).click();
        const draft = await create;
        assert.equal(draft.status(), 201);
        const { data: order } = await draft.json();
        assert.equal(order.conversationId, conversation.id);
        assert.equal(order.shippingAddressId, address.id);
        await page.waitForURL(app + '/orders/' + order.id);

        const quote = mutationResponse(page, '/orders/' + order.id + '/quote');
        await page.getByRole('button', { name: 'Lấy báo giá hiện tại' }).click();
        const quoted = await quote;
        assert.equal(quoted.status(), 200);
        const { data: offer } = await quoted.json();
        assert.equal(offer.shippingRate.fee.amount, '23000');
        assert.equal(offer.total.amount, offerRule ? '18999.76' : '15000.01');
        if (offerRule) {
            assert.deepEqual(offer.promotion, { id: offerRule.id, version: offerRule.version,
                name: offerRule.name, discount: { currency: shop.currency, amount: '1000.25' } });
            await page.getByText('Ưu đãi trên báo giá', { exact: true }).waitFor();
        }
        await page.getByText('Giao thử Firefox', { exact: false }).waitFor();

        const proof = messenger ? await messengerQuoteEvidence(page, db, messenger.fixture, offer, conversation)
            : await quoteEvidenceFixture(writer, offer, conversation);
        await page.getByRole('button', { name: 'Nhập bằng chứng xác nhận khách' }).click();
        const dialog = page.getByRole('dialog', { name: 'Bằng chứng xác nhận từ khách' });
        assert.equal(await dialog.getByRole('textbox', { name: 'Hash báo giá từ backend' }).inputValue(), proof.quoteHash);
        await dialog.getByRole('textbox', { name: 'Định danh khách' }).fill(proof.customerIdentityId);
        await dialog.getByRole('textbox', { name: 'Mã tin nhắn xác nhận' }).fill(proof.sourceMessageId);
        const evidence = mutationResponse(page, '/orders/' + order.id + '/customer-confirmations');
        await dialog.getByRole('button', { name: 'Ghi nhận bằng chứng' }).click();
        assert.equal((await evidence).status(), 200);

        const confirm = mutationResponse(page, '/orders/' + order.id + '/confirm');
        await page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng' }).click();
        assert.equal((await confirm).status(), 202);
        await page.getByText('Đã xác nhận', { exact: true }).waitFor();
        const current = await page.request.get(api + '/orders/' + order.id).then(response => response.json());
        assert.equal(current.data.fulfillmentState, 'reserved');
        assert.equal(current.data.shippingAddressSnapshot.addressId, address.id);
        assert.equal(await db.stockReservation.count({ where: { shopId: shop.id, orderId: order.id } }), 1);
        if (messenger) console.log('Firefox T072 R06 R18 R19: signed and replayed Messenger confirmation bound to the same conversation, quote and order.');
        if (fulfillment) await verifyFulfillment(page, db, current.data, sku, actorId, post, runtime);
        if (offerRule) {
            await page.goto(app + '/products/promotions');
            const paused = await decideBrowserPromotion(page, offerRule, 'Tạm dừng');
            assert.equal(paused.status, 'paused');
            await page.goto(app + '/orders/' + order.id);
            await page.getByText('Ưu đãi trên đơn', { exact: true }).waitFor();
            const history = await page.request.get(api + '/orders/' + order.id).then(response => response.json());
            assert.deepEqual(history.data.promotion, offer.promotion);
            assert.deepEqual(history.data.total, offer.total);
            console.log('Firefox BE-14 R64 R18 R19: draft, approval, discount in order and quote, confirmation, pause and preserved historical amount.');
        }
    } finally {
        await Promise.all([writer.$disconnect(), db.$disconnect()]);
    }
    console.log('Firefox dev:live BE-11: R18 draft, R19 quote, existing inbound evidence, COD confirmation and exactly one stock hold.');
}

async function messengerQuoteEvidence(page, db, fixture, offer, conversation) {
    const shopId = shop.id;
    const externalId = await sendMetaQuoteConfirmation(page, fixture, offer);
    const message = await db.channelMessage.findUniqueOrThrow({ where: { shopId_conversationId_externalId: { shopId, conversationId: conversation.id, externalId } } });
    assert.equal(message.origin, 'provider');
    assert.equal(await db.channelEvent.count({ where: { shopId, channelId: conversation.channelId, externalId } }), 1);
    return { quoteId: offer.id, quoteHash: offer.quoteHash, quoteVersion: offer.orderVersion,
        customerIdentityId: conversation.customerIdentityId, sourceMessageId: message.id };
}

async function createBrowserPromotion(page, variants, key) {
    const name = 'Combo Firefox ' + key;
    await page.goto(app + '/products/promotions');
    await page.getByRole('button', { name: 'Tạo ưu đãi', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Tạo ưu đãi' });
    await editor.getByRole('textbox', { name: 'Tên ưu đãi' }).fill(name);
    await editor.getByLabel('Kết thúc').fill('2099-01-01');
    await editor.getByRole('textbox', { name: 'Giảm mỗi đơn (VND)' }).fill('1000.25');
    await editor.getByRole('textbox', { name: 'Biên lợi nhuận tối thiểu (%)' }).fill('20');
    for (const [index, variant] of variants.entries()) {
        await editor.getByRole('textbox', { name: 'Tìm SKU hoặc sản phẩm' }).fill(variant.sku);
        await editor.getByRole('combobox', { name: 'SKU dòng ' + (index + 1) }).click();
        await page.getByRole('option', { name: new RegExp('^' + variant.sku + ' ·') }).click();
    }
    const created = mutationResponse(page, '/promotions');
    await editor.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
    const saved = await responseData(await created, 201);
    assert.equal(saved.status, 'draft');
    assert.deepEqual(saved.lines.map(line => line.variantId), variants.map(variant => variant.id));
    const active = await decideBrowserPromotion(page, saved, 'Duyệt bật');
    assert.equal(active.status, 'active');
    assert.equal(active.version, saved.version + 1);
    return active;
}

async function decideBrowserPromotion(page, promotion, action) {
    await page.getByRole('row').filter({ hasText: promotion.name }).getByRole('button', { name: action, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: action + ' ưu đãi' });
    await dialog.getByRole('textbox', { name: 'Lý do' }).fill('Kiểm hiệu lực combo trên Firefox');
    const decision = mutationResponse(page, '/promotions/' + promotion.id + '/decision', 'PATCH');
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    return responseData(await decision, 200);
}

async function responseData(response, expectedStatus) {
    assert.equal(response.status(), expectedStatus);
    return (await response.json()).data;
}

async function verifyFulfillment(page, db, order, sku, actorId, post, runtime) {
    const stock = () => db.stockPosition.findUniqueOrThrow({ where: { shopId_warehouseId_variantId: {
        shopId: shop.id, warehouseId: order.warehouseId, variantId: order.lines[0].variantId,
    } } });
    const prep = await db.prepJob.findUniqueOrThrow({ where: { shopId_orderId: { shopId: shop.id, orderId: order.id } } });
    const notice = await db.appNotification.findFirstOrThrow({ where: { shopId: shop.id, recipientUserId: actorId, workItemId: prep.workItemId } });
    await page.goto(app + '/notifications');
    await page.getByRole('heading', { name: 'Trung tâm thông báo' }).waitFor();
    await page.getByRole('button', { name: 'Chi tiết thông báo' }).first().click();
    const detail = page.getByRole('dialog', { name: 'Chi tiết thông báo' });
    await detail.getByText(prep.workItemId, { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await detail.waitFor({ state: 'hidden' });
    const ack = mutationResponse(page, '/notifications/' + notice.id + '/acknowledge');
    await page.getByRole('button', { name: 'Xác nhận đã xem' }).first().click();
    assert.ok((await responseData(await ack, 200)).acknowledgedAt);
    assert.equal((await db.workItem.findUniqueOrThrow({ where: { shopId_id: { shopId: shop.id, id: prep.workItemId } } })).state, 'queued');

    await page.goto(app + '/fulfillment');
    const prepRow = page.getByRole('row').filter({ hasText: order.id });
    await prepRow.getByRole('button', { name: 'Mở phiếu lấy hàng' }).click();
    const checklist = page.getByRole('dialog', { name: 'Phiếu chuẩn bị ' + order.id });
    const claimed = mutationResponse(page, '/work-items/' + prep.workItemId + '/claim');
    await checklist.getByRole('button', { name: 'Tôi nhận chuẩn bị đơn' }).click();
    assert.equal((await responseData(await claimed, 200)).assigneeUserId, actorId);
    await checklist.getByRole('textbox', { name: 'Nhập/quét SKU thực tế' }).fill(sku);
    await checklist.getByRole('spinbutton', { name: 'Số lượng đã lấy' }).fill('1');
    const pick = mutationResponse(page, '/prep-jobs/' + prep.id + '/pick');
    await checklist.getByRole('button', { name: 'Xác nhận dòng đã kiểm' }).click();
    assert.equal((await responseData(await pick, 200)).state, 'picking');
    await checklist.getByRole('button', { name: 'Xác nhận đã đóng gói' }).click();
    const pack = mutationResponse(page, '/prep-jobs/' + prep.id + '/pack');
    await page.getByRole('dialog', { name: 'Hoàn tất đóng gói' }).getByRole('button', { name: 'Xác nhận đã đóng gói' }).click();
    assert.equal((await responseData(await pack, 200)).state, 'packed');
    await checklist.getByRole('link', { name: 'Tạo vận đơn để bàn giao' }).click();
    await page.waitForURL(app + '/shipments?orderId=' + order.id);
    await page.getByRole('button', { name: 'Tạo vận đơn' }).click();
    const create = mutationResponse(page, '/shipments');
    await page.getByRole('dialog', { name: 'Tạo vận đơn' }).getByRole('button', { name: 'Tạo bản vận chuyển' }).click();
    const shipment = await responseData(await create, 201);
    assert.equal(shipment.orderId, order.id);
    assert.equal(shipment.shippingFeeQuote.amount, '23000');
    const date = localAccountingDate(new Date(), shop.timezone);
    const day = new Date(date + 'T00:00:00.000Z');
    const period = await db.accountingPeriod.findFirst({
        where: { shopId: shop.id, startDate: { lte: day }, endDate: { gte: day } },
    });
    if (period) assert.equal(period.state, 'open');
    else await post('/periods', { startDate: date, endDate: date, reason: 'Kỳ thử Firefox giao và trả' });
    const shipmentRow = page.getByRole('row').filter({ hasText: shipment.id });
    await shipmentRow.getByRole('button', { name: 'Bàn giao', exact: true }).click();
    const handover = mutationResponse(page, '/shipments/' + shipment.id + '/handover');
    await page.getByRole('dialog', { name: 'Xác nhận bàn giao kiện hàng' }).getByRole('button', { name: 'Xác nhận bàn giao', exact: true }).click();
    assert.deepEqual((await responseData(await handover, 202)).result, { type: 'shipment', id: shipment.id });
    const handed = page.getByRole('dialog', { name: 'Chi tiết vận đơn' });
    await handed.waitFor();
    await handed.getByRole('button', { name: 'Đóng', exact: true }).filter({ hasText: 'Đóng' }).click();
    await handed.waitFor({ state: 'hidden' });
    assert.equal((await stock()).transit, 1);
    const current = await responseData(await page.request.get(api + '/shipments/' + shipment.id), 200);
    const at = new Date();
    const externalEventId = randomUUID();
    const fixture = await reviewedEvidenceFixture('shipment', {
        cwd: runtime, env: { ...process.env, SHIPMENT_MANUAL_SHOPS: shop.id },
        document: 'Synthetic carrier receipt ' + externalEventId,
    });
    let evidenceId;
    try {
        const hash = await fixture.prepare({
            shopId: shop.id, shipmentId: shipment.id, orderId: order.id, reviewerId: actorId, expectedVersion: current.version,
            eventType: 'delivered', occurredAt: at.toISOString(), externalEventId,
        });
        const { stdout } = await fixture.execute(hash);
        evidenceId = JSON.parse(stdout).evidenceId;
    } finally {
        await fixture.close();
    }
    await shipmentRow.getByRole('button', { name: 'Cập nhật hành trình' }).click();
    const event = page.getByRole('dialog', { name: 'Cập nhật hành trình có bằng chứng' });
    await event.getByRole('combobox', { name: 'Sự kiện' }).click();
    await page.getByRole('option', { name: 'Khách đã nhận hàng' }).click();
    await event.getByRole('textbox', { name: 'Mã sự kiện bên vận chuyển' }).fill(externalEventId);
    await event.getByRole('textbox', { name: 'Mã bằng chứng' }).fill(evidenceId);
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: shop.timezone, year: 'numeric', month: '2-digit',
        day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at).map(part => [part.type, part.value]));
    await event.getByLabel('Thời gian sự kiện').fill(parts.year + '-' + parts.month + '-' + parts.day + 'T' + parts.hour + ':' + parts.minute);
    const delivered = mutationResponse(page, '/shipments/' + shipment.id + '/events');
    await event.getByRole('button', { name: 'Ghi sự kiện' }).click();
    assert.equal((await responseData(await delivered, 200)).state, 'delivered');
    assert.equal((await stock()).transit, 0);
    assert.equal(await db.auditEntry.count({
        where: { shopId: shop.id, resourceId: shipment.id, action: 'recordManualShipmentEvidence' },
    }), 1);
    await page.goto(app + '/orders/' + order.id);
    await page.getByRole('link', { name: 'Tạo yêu cầu trả hàng' }).click();
    await page.getByRole('button', { name: 'Tạo yêu cầu trả', exact: true }).click();
    const apply = page.getByRole('dialog', { name: 'Yêu cầu trả hàng' });
    await apply.getByRole('spinbutton').fill('1');
    await apply.getByRole('textbox', { name: 'Lý do trả' }).fill('Khách trả hàng qua Firefox');
    const returned = mutationResponse(page, '/returns');
    await apply.getByRole('button', { name: 'Tạo yêu cầu', exact: true }).click();
    const returnCase = await responseData(await returned, 201);
    assert.equal(returnCase.refundObligation, null);
    assert.equal((await stock()).onHand, 0);
    await page.getByRole('row').filter({ hasText: returnCase.id }).getByRole('button', { name: 'Kiểm nhận' }).click();
    const review = page.getByRole('dialog', { name: 'Kiểm nhận hàng trả' });
    await review.getByRole('combobox', { name: 'Tình trạng' }).click();
    await page.getByRole('option', { name: 'Bán lại được' }).click();
    await review.getByRole('textbox', { name: 'Ghi nhận kiểm tra' }).fill('Đã kiểm và nhập lại hàng đạt');
    const inspected = mutationResponse(page, '/returns/' + returnCase.id + '/inspect');
    await review.getByRole('button', { name: 'Xác nhận kiểm nhận' }).click();
    const inspection = await responseData(await inspected, 200);
    assert.equal(inspection.state, 'inspected');
    assert.equal(inspection.refundObligation.amount, '0');
    assert.equal((await stock()).onHand, 1);
    assert.equal((await db.orderReturn.findUniqueOrThrow({ where: { shopId_id: { shopId: shop.id, id: returnCase.id } } }))
        .receivableCredit.toFixed(), order.total.amount);
    console.log('Firefox R39 R41 R42 R43: notification, claim, checklist, handoff, reviewed carrier evidence, COD receivable and restock.');

    const device = await post('/devices', { deviceName: 'Thiết bị Firefox ' + randomUUID().slice(0, 8),
        endpoint: 'https://push-fixture.invalid/accepted/' + randomUUID(),
        p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString('base64url'), auth: Buffer.alloc(16, 2).toString('base64url'),
    });
    await verifyDeviceTestAndRevocation(page, device);
    const pair = mutationResponse(page, '/telegram-pairing');
    await page.getByRole('button', { name: 'Tạo mã liên kết' }).click();
    const pairing = await responseData(await pair, 200);
    assert.equal(pairing.botUsername, 'BotSalesFixtureBot');
    await page.getByText(/BotSalesFixtureBot/).waitFor();
    console.log('Firefox BE-13 R40: Web Push fixture job over Redis, revocation and local Telegram pairing code.');
}

async function verifyDeviceTestAndRevocation(page, device) {
    await page.goto(app + '/notifications/devices');
    await page.getByRole('heading', { name: 'Điện thoại & lịch trực' }).waitFor();
    const deviceRow = page.getByRole('row').filter({ hasText: device.deviceName });
    const target = device.status === 'active' ? deviceRow.filter({ hasText: 'Đang hoạt động' }) : deviceRow;
    const test = mutationResponse(page, '/devices/' + device.id + '/test');
    await target.getByRole('button', { name: 'Gửi thử', exact: true }).click();
    const command = await responseData(await test, 202);
    let status;
    for (let attempt = 0; attempt < 40; attempt++) {
        status = (await page.request.get(api + '/commands/' + command.id).then(response => response.json())).data.status;
        if (!['accepted', 'running'].includes(status)) break;
        await delay(200);
    }
    assert.equal(status, 'succeeded');
    const active = deviceRow.filter({ hasText: 'Đang hoạt động' });
    await active.getByRole('button', { name: 'Thu hồi', exact: true }).click();
    const revoke = mutationResponse(page, '/devices/' + device.id + '/revoke');
    await page.getByRole('dialog', { name: 'Thu hồi thiết bị' }).getByRole('button', { name: 'Thu hồi thiết bị', exact: true }).click();
    assert.equal((await responseData(await revoke, 200)).status, 'revoked');
}

export async function verifyWebPushFlow(page, csrf) {
    const { subscription } = pushReceiver();
    const response = await page.request.post(api + '/devices', {
        data: { ...subscription, deviceName: 'Web Push Firefox ' + randomUUID().slice(0, 8) },
        headers: { origin: appOrigin, 'x-csrf-token': csrf, 'idempotency-key': randomUUID() },
    });
    const device = await responseData(response, 201);
    assert.equal(device.status, 'pending');
    assert.ok(!JSON.stringify(device).includes(subscription.endpoint));
    await verifyDeviceTestAndRevocation(page, device);
    console.log('Firefox T070 R40: synthetic subscription, encrypted Web Push from the packaged worker and revocation over HTTPS.');
}

export async function configureTelegramBrowserFixture(env) {
    const db = fixtureWriter();
    try {
        const { id: userId } = await db.user.findUniqueOrThrow({
            where: { oidcIssuer_oidcSubject: { oidcIssuer: issuer, oidcSubject: 'p0-editor' } }, select: { id: true },
        });
        const telegramUserId = String(9_000_000_000 + Date.now() % 900_000_000);
        const settings = telegramFixtureEnv([{ shopId: shop.id, userId, telegramUserId }]);
        Object.assign(env, settings);
        return { telegramUserId, settings };
    } finally {
        await db.$disconnect();
    }
}

export async function verifyTelegramBrowserFlow(page, { telegramUserId, settings }) {
    await page.goto(app + '/notifications/devices');
    const start = mutationResponse(page, '/telegram-pairing');
    await page.getByRole('button', { name: 'Tạo mã liên kết' }).click();
    const pairing = await responseData(await start, 200);
    assert.equal(pairing.botUsername, settings.TELEGRAM_BOT_USERNAME);
    const webhook = await page.request.post(appOrigin + '/api/v2/integrations/telegram/updates', {
        data: telegramStartUpdate(1, telegramUserId, pairing.pairingCode),
        headers: { 'x-telegram-bot-api-secret-token': settings.TELEGRAM_WEBHOOK_SECRET },
    });
    assert.equal(webhook.status(), 200);
    const devices = await responseData(await page.request.get(api + '/devices'), 200);
    const device = devices.find(row => row.channel === 'telegram' && row.status === 'active');
    assert.ok(device);
    await verifyDeviceTestAndRevocation(page, device);
    console.log('Firefox T070 R40: pairing code, protected webhook, private Telegram test send and revocation from the packaged runtime.');
}
