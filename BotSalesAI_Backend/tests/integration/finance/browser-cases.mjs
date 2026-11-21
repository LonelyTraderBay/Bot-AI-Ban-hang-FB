import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { localAccountingDate } from '../../../apps/api/dist/modules/finance/index.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { appOrigin } from '../../../infra/p0/oidc/tls.mjs';
import { fixtureWriter } from '../orders/fixtures.mjs';

const [shop] = fixtureShops;
const app = appOrigin + '/s/' + shop.id;
const api = appOrigin + '/api/v2/shops/' + shop.id;

function postResponse(page, path) {
    return page.waitForResponse(response => response.request().method() === 'POST' && response.url() === api + path);
}

export async function verifyFinanceFlow(page, csrfToken) {
    const writer = fixtureWriter();
    const date = localAccountingDate(new Date(), shop.timezone);
    const issue = async (path, data) => {
        const response = await page.request.post(api + path, {
            data, headers: { origin: appOrigin, 'x-csrf-token': csrfToken, 'idempotency-key': randomUUID() },
        });
        assert.equal(response.status(), 201);
        return (await response.json()).data;
    };
    try {
        const day = new Date(date + 'T00:00:00Z');
        if (!await writer.accountingPeriod.findFirst({ where: { shopId: shop.id, startDate: { lte: day }, endDate: { gte: day }, state: 'open' } })) {
            await issue('/periods', { startDate: date, endDate: date, reason: 'Chuẩn bị kỳ Firefox' });
        }
        const sku = 'BE12-WEB-' + randomUUID().slice(0, 8);
        const { variants: [variant] } = await issue('/products', {
            name: sku, description: '', categoryId: null, status: 'active', imageFileIds: [],
            variants: [{ sku, name: 'Mặc định', active: true, options: {}, price: { currency: shop.currency, amount: '8300.01' } }],
        });
        await page.goto(app + '/inventory?q=' + sku);
        await page.getByRole('heading', { name: 'Tồn kho', exact: true }).waitFor();
        await page.getByRole('row').filter({ hasText: sku }).getByRole('button', { name: 'Điều chỉnh', exact: true }).click();
        const adjust = page.getByRole('dialog', { name: 'Điều chỉnh ' + sku });
        await adjust.getByRole('textbox', { name: 'Thay đổi số lượng' }).fill('2');
        await adjust.getByRole('textbox', { name: 'Lý do điều chỉnh' }).fill('Đối ứng kho Firefox');
        await adjust.getByRole('textbox', { name: 'Giá vốn đơn vị (VND)' }).fill('15.25');
        const adjusted = postResponse(page, '/inventory/adjustments');
        await adjust.getByRole('button', { name: 'Xác nhận điều chỉnh' }).click();
        const adjustment = await adjusted;
        assert.equal(adjustment.status(), 202);
        const { data: stockReceipt } = await adjustment.json();
        const stockJournal = await writer.financeJournal.findFirstOrThrow({
            where: { shopId: shop.id, sourceType: 'stock_adjustment', sourceId: stockReceipt.result.id }, include: { lines: true },
        });
        assert.equal(stockJournal.lines.find(line => line.debit.gt(0)).debit.toFixed(), '30.5');

        const customer = await issue('/customers', { displayName: 'Khách thanh toán Firefox', phone: '0900000222', email: null, notes: '' });
        const order = await issue('/orders', {
            customerId: customer.id, conversationId: null, warehouseId: shop.defaultWarehouseId, shippingAddressId: null,
            paymentMethod: 'prepay', notes: '', lines: [{ variantId: variant.id, quantity: 1 }],
        });
        const now = new Date();
        const proof = await writer.paymentEvidence.create({ data: {
            shopId: shop.id, orderId: order.id, amount: '8300.01', currency: shop.currency, kind: 'bank_receipt',
            reference: 'BE12-' + randomUUID(), verifiedAt: now, observedAt: now,
        } });
        await page.goto(app + '/orders/' + order.id);
        await page.getByRole('button', { name: 'Ghi nhận tiền đã thu' }).click();
        const payment = page.getByRole('dialog', { name: 'Ghi nhận tiền đã thu' });
        assert.equal(await payment.getByRole('textbox', { name: 'Số tiền (VND)' }).inputValue(), '8300.01');
        await payment.getByRole('textbox', { name: 'Mã tham chiếu giao dịch' }).fill(proof.reference);
        await payment.getByRole('textbox', { name: 'Mã chứng từ đã xác minh' }).fill(proof.id);
        await payment.getByRole('textbox', { name: 'Lý do' }).fill('Ghi nhận giao dịch thử Firefox');
        const recorded = postResponse(page, '/orders/' + order.id + '/pay');
        await payment.getByRole('button', { name: 'Ghi nhận chứng từ' }).click();
        assert.equal((await recorded).status(), 202);
        await payment.waitFor({ state: 'hidden' });
        const saved = await page.request.get(api + '/orders/' + order.id).then(response => response.json());
        assert.equal(saved.data.paymentState, 'verified');
        assert.equal(await writer.financeJournal.count({ where: { shopId: shop.id, sourceType: 'order_payment', sourceId: proof.id } }), 1);
        await page.goto(app + '/finance/journals');
        await page.getByRole('heading', { name: 'Bút toán', exact: true }).waitFor();
        await page.getByRole('row').filter({ hasText: proof.id }).waitFor();
    } finally {
        await writer.$disconnect();
    }
    console.log('Firefox dev:live BE-12: R15 adjustment, R19 verified observed receipt, R48 posted journal.');
}
