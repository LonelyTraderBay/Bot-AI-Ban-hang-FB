import { beforeEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import type { Order, OrderQuote, PaymentReview, Promotion, Stocktake, StockTransfer, Warehouse } from '@botsales/contracts';
import { all, db, record, rows, stockFor, sum, units } from '../src/mocks/database';
import { CSRF, handle, mockCustomerConfirmation, resetService, setFault, setRole } from '../src/mocks/service';
import { assertSchema } from '../src/shared/api/validation';

const shopId = 'shop-demo';
const warehouseId = 'warehouse-01';
const products = [{ variantId: 'v-p1', quantity: 1 }, { variantId: 'v-p2', quantity: 1 }];
const draft = { customerId: 'c1', conversationId: 'cv1', warehouseId, shippingAddressId: 'address-synthetic', paymentMethod: 'cod', notes: '', lines: products };
const reason = 'Thao tác kiểm thử có chứng từ';
const currency = 'VND';
let serial = 0;

async function write<T>(op: string, body: Record<string, unknown>, options: { id?: string; orderId?: string; version?: number; key?: string } = {}) {
    const { id, orderId, version, key } = options;
    const result = await handle({
        op, path: { shopId, ...(id ? { resourceId: id } : {}), ...(orderId ? { orderId } : {}) }, body,
        headers: { 'x-csrf-token': CSRF, 'idempotency-key': key ?? `p1-${++serial}`, ...(version === undefined ? {} : { 'if-match': String(version) }) },
    });
    return structuredClone(result.data) as T;
}

async function list<T>(op: string, query = '', scope = shopId) {
    const result = await handle({ op, path: { shopId: scope }, query: new URLSearchParams(query) });
    return result.data as T[];
}

beforeEach(() => { vi.stubGlobal('crypto', webcrypto); resetService(); });

it('approves an eligible combo, stores its exact quote discount, rejects stale approval, and reports confirmed sales', async () => {
    setRole('manager');
    const record = await write<Promotion>('createPromotion', {
        name: 'Combo P1', startsOn: '2026-09-29', endsOn: '2026-10-02', lines: products, discountAmount: '30000', minMarginPercent: 20,
    });
    assertSchema('Promotion', record);
    expect(await list<Promotion>('listPromotions', 'effective=yes')).toEqual([]);
    await expect(write('decidePromotion', { action: 'activate', reason }, { id: record.id, version: 1 })).rejects.toMatchObject({ status: 403 });
    setRole('owner');
    let active = await write<Promotion>('decidePromotion', { action: 'activate', reason }, { id: record.id, version: 1 });
    expect(await list('listPromotions', 'effective=yes', 'shop-second')).toEqual([]);
    expect(await list('listPromotions', 'effective=yes')).toEqual([active]);
    await expect(write('createOrder', { ...draft, promotionId: active.id, lines: [products[0]] })).rejects.toMatchObject({ code: 'PROMOTION_INELIGIBLE' });
    const order = await write<Order>('createOrder', { ...draft, promotionId: active.id });
    expect(order.total).toEqual({ amount: '369000', currency });
    const quoteOrder = () => write<OrderQuote>('quoteOrder', {}, { orderId: order.id });
    const quote = await quoteOrder();
    assertSchema('OrderQuote', quote);
    expect(quote.promotion).toMatchObject({ id: active.id, version: active.version, discount: { amount: '30000', currency } });
    expect(quote.lines.reduce((total, line) => total + units(line.discount), 0n)).toBe(units('30000'));
    const confirm = async (quote: OrderQuote) => {
        const evidence = mockCustomerConfirmation(shopId, quote.id);
        const verified = await write<{ id: string }>('recordCustomerConfirmation', evidence, { orderId: order.id });
        return () => write('confirmOrder', { expectedVersion: order.version, quoteId: quote.id, customerConfirmationId: verified.id }, { orderId: order.id, version: order.version });
    };
    const first = await confirm(quote);
    const paused = await write<Promotion>('decidePromotion', { action: 'pause', reason }, { id: active.id, version: active.version });
    await expect(first()).rejects.toMatchObject({ code: 'PROMOTION_INACTIVE' });
    active = await write<Promotion>('decidePromotion', { action: 'activate', reason }, { id: active.id, version: paused.version });
    await expect(first()).rejects.toMatchObject({ code: 'PROMOTION_QUOTE_STALE' });
    await (await confirm(await quoteOrder()))();
    expect(all('orders', shopId).find(item => item.id === order.id)).toMatchObject({ promotion: { id: active.id, version: active.version } });
    const report = await handle({ op: 'getMarketingSummary', path: { shopId } });
    expect(report.data).toMatchObject({ promotionResults: [{ promotionId: active.id, orders: 1, discount: { amount: '30000' } }] });
    const delivered = all('orders', shopId).find(item => item.id === order.id)!;
    delivered.fulfillmentState = 'delivered';
    const original = rows(delivered.lines)[0]!;
    const requested = await write<{ id: string; version: number }>('createReturnCase', {
        orderId: order.id, reason, lines: [{ orderLineId: original.id, quantity: 1, reason }],
    });
    const inspected = await write<{ refundObligation: object }>('inspectReturn', {
        expectedVersion: requested.version, lines: [{ orderLineId: original.id, acceptedQuantity: 1, disposition: 'quarantined', reason }],
    }, { id: requested.id, version: requested.version });
    expect(inspected.refundObligation).toEqual(original.lineTotal);
});

it('rejects a combo below approved margin and keeps an expired programme out of effective reads', async () => {
    const draftPromotion = await write<Promotion>('createPromotion', {
        name: 'Giảm quá mức', startsOn: '2026-09-29', endsOn: '2026-09-30', lines: products, discountAmount: '170000', minMarginPercent: 10,
    });
    await write('decidePromotion', { action: 'activate', reason }, { id: draftPromotion.id, version: draftPromotion.version });
    await expect(write('createOrder', { ...draft, promotionId: draftPromotion.id })).rejects.toMatchObject({ code: 'PROMOTION_MARGIN' });
    const variant = rows(db.products.find(item => item.id === 'p1')?.variants)[0]!;
    variant.price = { amount: '150000', currency: 'LAK' };
    await expect(write('createOrder', { ...draft, promotionId: draftPromotion.id })).rejects.toMatchObject({ code: 'PROMOTION_CURRENCY' });
    const stored = db.promotions.find(row => row.id === draftPromotion.id)!;
    stored.endsOn = '2026-09-28';
    expect(await list('listPromotions', 'effective=yes')).toEqual([]);
    await expect(write('createOrder', { ...draft, promotionId: draftPromotion.id })).rejects.toMatchObject({ code: 'PROMOTION_INACTIVE' });
});

it('projects collection and refund evidence by order and exposes conflicts without inventing balances', async () => {
    const order = await write<Order>('createOrder', { ...draft, paymentMethod: 'prepay' });
    let reviews = await list<PaymentReview>('listPaymentReviews', `kind=collection&stage=open&q=${order.id}`);
    expect(reviews).toMatchObject([{ orderId: order.id, status: 'unpaid', verified: { amount: '0' }, remaining: { amount: '399000' } }]);
    await write('payOrder', { expectedVersion: order.version, amount: order.total, method: 'bank_transfer', reference: 'P1-RECEIPT', evidenceRef: 'P1-EVIDENCE', reason }, { orderId: order.id, version: order.version });
    reviews = await list<PaymentReview>('listPaymentReviews', `kind=collection&stage=settled&q=${order.id}`);
    assertSchema('PaymentReview', reviews[0]);
    expect(reviews).toMatchObject([{ status: 'settled', references: ['P1-RECEIPT', 'P1-EVIDENCE'], remaining: { amount: '0' } }]);
    expect(reviews[0]?.journalIds).toHaveLength(1);
    expect(await list('listPaymentReviews', `q=${order.id}`, 'shop-second')).toEqual([]);
    const samples = await list<PaymentReview>('listPaymentReviews', 'q=DH-DEMO-PAID-01');
    expect(samples).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: 'collection', status: 'needs_check', remaining: null }),
        expect.objectContaining({ kind: 'refund', status: 'settled', remaining: { amount: '0', currency } }),
    ]));
    setFault('empty');
    expect(await list('listPaymentReviews', 'q=DH-DEMO-PAID-01')).toEqual([]);
    expect(await list('listPaymentReviews', 'q=DH-DEMO-PAID-01')).toEqual(samples);
    setFault('empty_persistent');
    expect(await list('listPaymentReviews')).toEqual([]);
    expect(await list('listOrders')).toEqual([]);
    setRole('viewer');
    await expect(list('listPaymentReviews')).rejects.toMatchObject({ status: 403 });
});

it('requires recount after stock changes and posts only the approved difference once', async () => {
    const created = await write<Stocktake>('createStocktake', { warehouseId, variantIds: ['v-p1', 'v-p2'], reason });
    assertSchema('Stocktake', created);
    const change = (session: Stocktake, action: string, counts?: object[]) =>
        write<Stocktake>('updateStocktake', { action, ...(counts ? { counts } : {}) }, { id: session.id, version: session.version });
    const initialCount = await change(created, 'count', [{ variantId: 'v-p1', counted: 5 }, { variantId: 'v-p2', counted: 24 }]);
    const submitted = await change(initialCount, 'submit');
    const stock = stockFor(shopId, 'v-p1', warehouseId);
    await write('createInventoryAdjustment', { warehouseId, variantId: 'v-p1', quantityDelta: -1, unitCost: null, reason, expectedVersion: stock.version }, { version: Number(stock.version) });
    const post = (session: Stocktake) => write<Stocktake>('postStocktake', { reason }, { id: session.id, version: session.version });
    await expect(post(submitted)).rejects.toMatchObject({ code: 'STOCKTAKE_BASELINE_STALE' });
    const rebased = await change(submitted, 'rebase');
    expect(rebased.lines).toMatchObject([{ expected: 7, counted: null }, { expected: 24, counted: 24 }]);
    const counted = await change(rebased, 'count', [{ variantId: 'v-p1', counted: 6 }]);
    const ready = await change(counted, 'submit');
    setRole('warehouse');
    await expect(post(ready)).rejects.toMatchObject({ status: 403 });
    setRole('owner');
    const posted = await post(ready);
    expect(posted.status).toBe('posted');
    expect(stockFor(shopId, 'v-p1', warehouseId).onHand).toBe(6);
    const movements = all('movements', shopId).filter(row => record(row.sourceRef).id === posted.id);
    expect(movements).toMatchObject([{ quantityDelta: -1, kind: 'adjustment' }]);
    expect(all('journals', shopId)).toEqual(expect.arrayContaining([expect.objectContaining({ sourceId: movements[0]?.id })]));
    await expect(post(posted)).rejects.toMatchObject({ status: 409 });
});

it('holds transferred units in transit, receives a subset, blocks duplicate/oversize receipts, and accounts for shortages', async () => {
    const target = await write<Warehouse>('createWarehouse', { code: 'P1-DEST', name: 'Kho nhận P1', addressLine: 'Địa chỉ mẫu' });
    await expect(write('createStockTransfer', { fromWarehouseId: warehouseId, toWarehouseId: warehouseId, lines: products, reason })).rejects.toMatchObject({ code: 'TRANSFER_WAREHOUSE' });
    await expect(write('createStockTransfer', { fromWarehouseId: warehouseId, toWarehouseId: 'b-warehouse-01', lines: products, reason })).rejects.toMatchObject({ status: 404 });
    const draftTransfer = await write<StockTransfer>('createStockTransfer', { fromWarehouseId: warehouseId, toWarehouseId: target.id, lines: [{ variantId: 'v-p1', quantity: 4 }], reason });
    const change = (transfer: StockTransfer, action: string, extra: Record<string, unknown> = {}, key?: string) =>
        write<StockTransfer>('updateStockTransfer', { action, ...extra }, { id: transfer.id, version: transfer.version, key });
    const sent = await change(draftTransfer, 'dispatch', {}, 'dispatch-once');
    expect((await change(draftTransfer, 'dispatch', {}, 'dispatch-once')).id).toBe(sent.id);
    assertSchema('StockTransfer', sent);
    expect(stockFor(shopId, 'v-p1', warehouseId).onHand).toBe(4);
    expect(stockFor(shopId, 'v-p1', target.id).onHand).toBe(0);
    const half = await change(sent, 'receive', { lines: [{ variantId: 'v-p1', quantity: 2 }] });
    expect(half).toMatchObject({ status: 'in_transit', lines: [{ received: 2, missing: 0 }] });
    await expect(change(sent, 'receive', { lines: [{ variantId: 'v-p1', quantity: 1 }] })).rejects.toMatchObject({ status: 412 });
    await expect(change(half, 'receive', { lines: [{ variantId: 'v-p1', quantity: 3 }] })).rejects.toMatchObject({ code: 'TRANSFER_RECEIPT' });
    setRole('warehouse');
    await expect(change(half, 'close_short', { reason })).rejects.toMatchObject({ status: 403 });
    setRole('owner');
    const closed = await change(half, 'close_short', { reason });
    expect(closed).toMatchObject({ status: 'closed_short', discrepancyReason: reason, lines: [{ quantity: 4, received: 2, missing: 2 }] });
    expect(stockFor(shopId, 'v-p1', target.id)).toMatchObject({ onHand: 2, carryingValue: { amount: '200000', currency } });
    const journals = all('journals', shopId).filter(row => String(row.sourceId).startsWith(draftTransfer.id));
    expect(journals.map(row => row.sourceType).sort()).toEqual(['transfer_dispatch', 'transfer_receipt', 'transfer_short']);
    const inTransitAccount = all('accounts', shopId).find(row => row.code === '157')?.id;
    const postings = journals.flatMap(row => row.lines as Record<string, unknown>[]).filter(row => row.accountId === inTransitAccount);
    expect(sum(postings, 'debit')).toBe(sum(postings, 'credit'));
    await expect(change(closed, 'receive', { lines: [{ variantId: 'v-p1', quantity: 1 }] })).rejects.toMatchObject({ status: 409 });
});
