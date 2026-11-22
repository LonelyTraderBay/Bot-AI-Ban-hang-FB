import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { localAccountingDate } from '../../../apps/api/dist/modules/finance/index.js';
import { periodIntent } from '../../../apps/api/dist/modules/finance/period-data.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { appOrigin } from '../../../infra/p0/oidc/tls.mjs';
import { fixtureWriter } from '../orders/fixtures.mjs';
import { deliveredDebt, independentReceipt } from './fixtures.mjs';

const [shop] = fixtureShops;
const app = appOrigin + '/s/' + shop.id;
const api = appOrigin + '/api/v2/shops/' + shop.id;

function postResponse(page, path) {
    const pending = page.waitForResponse(response => response.request().method() === 'POST' && response.url() === api + path)
        .catch(error => { throw new Error(`Chờ POST ${path}: ${error.name}`, { cause: error }); });
    void pending.catch(() => {});
    return pending;
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

        const tomorrow = localAccountingDate(new Date(now.getTime() + 86400000), shop.timezone);
        const reportResponse = page.waitForResponse(result => result.request().method() === 'GET' &&
            result.url().split('?')[0] === api + '/finance/profit-loss');
        await page.goto(app + '/finance/profit-loss?fromDate=' + date + '&toDate=' + tomorrow);
        const report = await payload(reportResponse, 200);
        assert.ok(report.sourceJournalIds.includes(stockJournal.id));
        const writes = [];
        const trackWrite = request => {
            if (request.url().startsWith(api + '/') && !['GET', 'HEAD'].includes(request.method())) writes.push(request.method());
        };
        page.on('request', trackWrite);
        try {
            await page.getByRole('button', { name: 'Giải thích báo cáo', exact: true }).click();
            const explanation = page.getByRole('region', { name: 'Giải thích báo cáo', exact: true });
            await explanation.getByText('Dữ liệu nguồn trong snapshot', { exact: true }).waitFor();
            const journalLinks = explanation.getByRole('link', { name: /^Chứng từ / });
            assert.deepEqual(await journalLinks.allTextContents(), report.sourceJournalIds.map(id => 'Chứng từ ' + id));
            assert.deepEqual(writes, []);
        } finally {
            page.off('request', trackWrite);
        }
    } finally {
        await writer.$disconnect();
    }
    console.log('Firefox dev:live BE-12: R15 adjustment, R19 verified observed receipt, R48 posted journal and R22 source-based explanation.');
}

async function payload(pending, status) {
    const response = await pending;
    assert.equal(response.status(), status);
    return (await response.json()).data;
}

export async function verifyReconciliationFlow(page, csrfToken) {
    const writer = fixtureWriter();
    const headers = () => ({ origin: appOrigin, 'x-csrf-token': csrfToken, 'idempotency-key': randomUUID() });
    const send = (path, data, status) => payload(page.request.post(api + path, { data, headers: headers() }), status);
    const get = path => payload(page.request.get(api + path), 200);
    const localDate = localAccountingDate(new Date(), shop.timezone);
    const day = new Date(localDate + 'T00:00:00Z');
    const ref = 'BANK-FIREFOX-' + randomUUID();
    try {
        const period = await writer.accountingPeriod.findFirst({ where: { shopId: shop.id, startDate: { lte: day }, endDate: { gte: day } } });
        if (period) assert.equal(period.state, 'open');
        else await send('/periods', { startDate: localDate, endDate: localDate, reason: 'Kỳ kiểm đối soát Firefox' }, 201);
        const bankAccount = await writer.financeAccount.findUniqueOrThrow({ where: { shopId_systemKey: { shopId: shop.id, systemKey: 'bank' } } });
        const customer = await writer.customer.create({ data: { shopId: shop.id, displayName: 'Khách thử đối soát Firefox' } });
        const now = new Date();
        const { order } = await deliveredDebt(writer, writer, shop, customer.id, now);
        await independentReceipt(writer, writer, shop, order.id, now, localDate, 'RECEIPT-FIREFOX-' + randomUUID());
        await page.goto(app + '/finance/reconciliation');
        await page.getByRole('button', { name: 'Nhập bảng đối soát', exact: true }).click();
        const statement = page.getByRole('dialog', { name: 'Nhập bảng đối soát', exact: true });
        await statement.getByRole('combobox', { name: 'Tài khoản / đơn vị vận chuyển' }).click();
        await page.getByRole('option', { name: bankAccount.code + ' · ' + bankAccount.name }).click();
        await statement.getByLabel('Tệp CSV').setInputFiles({ name: 'bank-firefox.csv', mimeType: 'text/csv', buffer: Buffer.from(
            'externalTransactionId,amount,currency,direction,occurredAt,referenceText\n' +
            [ref, '249000', shop.currency, 'credit', now.toISOString(), order.id].join(',') + '\n'),
        });
        await statement.getByRole('textbox', { name: 'Mã đợt nhập duy nhất' }).fill(ref);
        const previewed = postResponse(page, '/finance/statement-import-preview');
        await statement.getByRole('button', { name: 'Xem trước bảng đối soát' }).click();
        assert.equal((await payload(previewed, 200)).validRows, 1);
        const queued = postResponse(page, '/bank-transactions/import');
        await statement.getByRole('button', { name: 'Nhập các dòng hợp lệ' }).click();
        const job = await payload(queued, 200);
        await statement.getByRole('link', { name: 'Xem kết quả nhập' }).click();
        await page.getByRole('heading', { name: 'Công việc ' + job.id }).waitFor();
        await page.getByText('1 / 1', { exact: true }).waitFor();
        assert.equal((await get('/jobs/' + job.id)).status, 'succeeded');
        await page.goto(app + '/finance/reconciliation');
        const bankRow = page.getByRole('row').filter({ hasText: ref });
        await bankRow.waitFor();
        const bank = (await get('/bank-transactions')).find(item => item.externalTransactionId === ref);
        const review = (await get('/reconciliation-cases')).find(item => item.transactionId === bank.id);
        const debt = (await get('/debts')).find(item => item.source.id === order.id);
        await page.getByRole('tab', { name: 'Chênh lệch cần xử lý' }).click();
        await page.getByRole('row').filter({ hasText: review.id }).getByRole('button', { name: 'Ghép giao dịch' }).click();
        const match = page.getByRole('dialog', { name: 'Ghép giao dịch với công nợ' });
        await match.getByRole('combobox', { name: 'Khoản công nợ' }).click();
        await page.getByRole('option', { name: new RegExp('^' + debt.id) }).click();
        await match.getByRole('textbox', { name: 'Số tiền phân bổ (' + shop.currency + ')' }).fill('249000');
        await match.getByRole('textbox', { name: 'Lý do' }).fill('Soát khoản thu độc lập từ CSV');
        const posted = postResponse(page, '/reconciliation-cases/' + review.id + '/match');
        await match.getByRole('button', { name: 'Ghi kết quả đối soát' }).click();
        assert.equal((await payload(posted, 202)).status, 'succeeded');
        await page.goto(app + '/finance/payment-reviews?q=' + order.id);
        const result = page.getByRole('row').filter({ hasText: order.id });
        const resolved = (await get('/payment-reviews?kind=collection&stage=open&q=' + order.id))[0];
        assert.equal(resolved?.status, 'needs_check');
        await result.waitFor();
        const text = await result.textContent();
        assert.match(text, /Thu tiền · Cần đối chiếu dữ liệu/u);
        assert.match(text, /299[.,\s]000/u);
        await result.getByRole('button', { name: 'Xem chứng từ' }).click();
        await page.getByRole('dialog', { name: 'Chứng từ đơn ' + order.id }).getByText(ref, { exact: false }).waitFor();
        await verifyPeriodControls(page, writer, send);
        for (const [route, resource] of [
            ['/finance', '/finance/cashflow'], ['/finance/profit-loss', '/finance/profit-loss'], ['/finance/trial-balance', '/finance/trial-balance'],
            ['/finance/balance-sheet', '/finance/balance-sheet'], ['/reports', '/reports'],
        ]) {
            const response = page.waitForResponse(result => result.request().method() === 'GET' && result.url().split('?')[0] === api + resource);
            await page.goto(app + route);
            assert.ok(await payload(response, 200));
        }
    } finally {
        await writer.$disconnect();
    }
    console.log('Firefox BE-17 R49 R50 R65 R20 R22 R31 R59 R60: statement import, bank allocation, review, period lock/reopen and report reads.');
}

async function verifyPeriodControls(page, writer, send) {
    let candidate = new Date(Date.now() - 14 * 86400000);
    while (await writer.accountingPeriod.findFirst({ where: { shopId: shop.id, startDate: { lte: candidate }, endDate: { gte: candidate } } })) {
        candidate = new Date(candidate.getTime() - 86400000);
    }
    const date = localAccountingDate(candidate, shop.timezone);
    const period = await send('/periods', { startDate: date, endDate: date, reason: 'Kiểm khóa kỳ đã qua trên Firefox' }, 201);
    await page.goto(app + '/finance/debts-periods');
    const localized = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeZone: 'UTC' }).format(new Date(date + 'T00:00:00Z'));
    const row = page.getByRole('table', { name: 'Kỳ kế toán' }).getByRole('row').filter({ hasText: localized });
    await row.getByRole('button', { name: 'Kiểm & khóa kỳ' }).click();
    const close = postResponse(page, '/periods/' + period.id + '/close');
    await page.getByRole('dialog', { name: 'Khóa kỳ kế toán' }).getByRole('button', { name: 'Khóa kỳ kế toán', exact: true }).click();
    assert.equal((await payload(close, 202)).status, 'succeeded');
    const closed = await writer.accountingPeriod.findUniqueOrThrow({ where: { shopId_id: { shopId: shop.id, id: period.id } } });
    const approval = await send('/approvals', { action: 'finance.period.reopen', resource: { type: 'accounting_period', id: period.id },
        resourceVersion: closed.version, intentHash: periodIntent(closed), reason: 'Thực hiện đối chiếu kỳ đã khóa trên Firefox' }, 201);
    await send('/approvals/' + approval.id + '/decision', { expectedVersion: approval.version, intentHash: approval.intentHash, decision: 'approve',
        reason: 'Đã kiểm số liệu của kỳ đã khóa' }, 200);
    await row.getByRole('button', { name: 'Mở lại có phê duyệt' }).click();
    const dialog = page.getByRole('dialog', { name: 'Mở lại kỳ đã khóa' });
    await dialog.getByRole('textbox', { name: 'Mã phê duyệt đúng kỳ' }).fill(approval.id);
    await dialog.getByRole('textbox', { name: 'Lý do' }).fill('Đã có phê duyệt và chứng từ đối chiếu');
    const reopen = postResponse(page, '/periods/' + period.id + '/reopen');
    await dialog.getByRole('button', { name: 'Mở lại kỳ', exact: true }).click();
    assert.equal((await payload(reopen, 202)).status, 'succeeded');
}
