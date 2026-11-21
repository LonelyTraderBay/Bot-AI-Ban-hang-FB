import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { URLSearchParams } from 'node:url';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { recordStockMovement } from '../../../apps/api/dist/modules/inventory/index.js';
import { createDatabaseClient } from '../../../apps/api/dist/platform/database/client.js';
import { serializable } from '../../../apps/api/dist/platform/database/transactions.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { appOrigin } from '../../../infra/p0/oidc/tls.mjs';
import { assertFixtureDatabase } from '../workspace/session-fixture.mjs';
import { fixtureWriter, orderConversation, quoteEvidenceFixture } from './fixtures.mjs';

const [shop] = fixtureShops;
const app = appOrigin + '/s/' + shop.id;
const api = appOrigin + '/api/v2/shops/' + shop.id;

function postResponse(page, path) {
    return page.waitForResponse(response => response.request().method() === 'POST' && response.url() === api + path);
}

export async function verifyOrdersFlow(page, actorId, csrfToken) {
    const id = randomUUID().slice(0, 8);
    const sku = 'BE11-LIVE-' + id;
    const mutationHeaders = () => ({ origin: appOrigin, 'x-csrf-token': csrfToken, 'idempotency-key': randomUUID() });
    const post = async (path, data) => {
        const response = await page.request.post(api + path, { data, headers: mutationHeaders() });
        assert.equal(response.status(), 201);
        return (await response.json()).data;
    };
    const customer = await post('/customers', { displayName: 'Khách Firefox ' + id, phone: '0900000123', email: null, notes: '' });
    const address = await post('/customers/' + customer.id + '/addresses', {
        label: 'Địa chỉ ' + id, recipient: 'Người nhận Firefox', phone: '0900000123', line1: 'Địa chỉ giả lập',
        countryCode: 'VN', province: 'Hà Nội', ward: null, district: null, postalCode: null,
    });
    const { variants: [variant] } = await post('/products', {
        name: 'Sản phẩm ' + sku, description: '', categoryId: null, status: 'active', imageFileIds: [],
        variants: [{ sku, name: 'Mặc định', active: true, options: {}, price: { currency: shop.currency, amount: '15000.01' } }],
    });
    const writer = fixtureWriter();
    const url = readDatabaseUrl(process.env);
    assertFixtureDatabase(url);
    const db = createDatabaseClient(url);
    try {
        const { conversation } = await orderConversation(writer, shop.id, customer.id);
        await serializable(db, tx => recordStockMovement(tx, {
            shopId: shop.id, warehouseId: shop.defaultWarehouseId, variantId: variant.id, actorId,
            kind: 'receipt', source: { type: 'fixture_receipt', id: randomUUID() }, reason: 'Nhập hàng cho ca đơn Firefox',
            receivedValue: '5000.005', delta: { onHand: 1 },
        }), true);
        const prior = await page.request.get(api + '/shipping-policy');
        const policy = await page.request.put(api + '/shipping-policy', {
            headers: { ...mutationHeaders(), 'if-match': prior.headers().etag },
            data: { rules: [{ countryCode: 'VN', province: 'Hà Nội', serviceName: 'Giao thử Firefox', amount: '23000' }] },
        });
        assert.equal(policy.status(), 200);
        const params = new URLSearchParams({ customerId: customer.id });
        await page.goto(app + '/orders/new?' + params);
        await page.getByRole('heading', { name: 'Tạo đơn hàng', exact: true }).waitFor();
        await page.getByRole('combobox', { name: 'Hội thoại liên quan' }).click();
        await page.getByRole('option', { name: new RegExp(conversation.id) }).click();
        await page.getByRole('combobox', { name: 'Địa chỉ giao hàng' }).click();
        await page.getByRole('option', { name: new RegExp(address.label) }).click();
        await page.getByRole('textbox', { name: 'Tìm sản phẩm hoặc SKU' }).fill(sku);
        await page.getByRole('combobox', { name: 'Sản phẩm 1', exact: true }).click();
        await page.getByRole('option', { name: new RegExp(sku) }).click();

        const create = postResponse(page, '/orders');
        await page.getByRole('button', { name: 'Lưu đơn nháp', exact: true }).click();
        const draft = await create;
        assert.equal(draft.status(), 201);
        const { data: order } = await draft.json();
        assert.equal(order.conversationId, conversation.id);
        assert.equal(order.shippingAddressId, address.id);
        await page.waitForURL(app + '/orders/' + order.id);

        const quote = postResponse(page, '/orders/' + order.id + '/quote');
        await page.getByRole('button', { name: 'Lấy báo giá hiện tại' }).click();
        const quoted = await quote;
        assert.equal(quoted.status(), 200);
        const { data: offer } = await quoted.json();
        assert.equal(offer.shippingRate.fee.amount, '23000');
        assert.equal(offer.total.amount, '15000.01');
        await page.getByText('Giao thử Firefox', { exact: false }).waitFor();

        const proof = await quoteEvidenceFixture(writer, offer, conversation);
        await page.getByRole('button', { name: 'Nhập bằng chứng xác nhận khách' }).click();
        const dialog = page.getByRole('dialog', { name: 'Bằng chứng xác nhận từ khách' });
        assert.equal(await dialog.getByRole('textbox', { name: 'Hash báo giá từ backend' }).inputValue(), proof.quoteHash);
        await dialog.getByRole('textbox', { name: 'Định danh khách' }).fill(proof.customerIdentityId);
        await dialog.getByRole('textbox', { name: 'Mã tin nhắn xác nhận' }).fill(proof.sourceMessageId);
        const evidence = postResponse(page, '/orders/' + order.id + '/customer-confirmations');
        await dialog.getByRole('button', { name: 'Ghi nhận bằng chứng' }).click();
        assert.equal((await evidence).status(), 200);

        const confirm = postResponse(page, '/orders/' + order.id + '/confirm');
        await page.getByRole('button', { name: 'Xác nhận đơn & giữ hàng' }).click();
        assert.equal((await confirm).status(), 202);
        await page.getByText('Đã xác nhận', { exact: true }).waitFor();
        const current = await page.request.get(api + '/orders/' + order.id).then(response => response.json());
        assert.equal(current.data.fulfillmentState, 'reserved');
        assert.equal(current.data.shippingAddressSnapshot.addressId, address.id);
        assert.equal(await db.stockReservation.count({ where: { shopId: shop.id, orderId: order.id } }), 1);
    } finally {
        await Promise.all([writer.$disconnect(), db.$disconnect()]);
    }
    console.log('Firefox dev:live BE-11: R18 draft, R19 quote, existing inbound evidence, COD confirmation and exactly one stock hold.');
}
