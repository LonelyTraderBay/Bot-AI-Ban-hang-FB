import { beforeEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import type { Order, OrderQuote, ShippingRateRule, WorkItem } from '@botsales/contracts';
import { db } from '../src/mocks/database';
import { CSRF, handle, mockCustomerConfirmation, resetService, setRole } from '../src/mocks/service';
import { assertSchema } from '../src/shared/api/validation';

const shopId = 'shop-demo';
const rate: ShippingRateRule = { countryCode: 'VN', province: 'Địa bàn mẫu', serviceName: 'Giao tiêu chuẩn', amount: '25000' };
let sequence = 0;

const read = (op: string, query = '', shop = shopId) =>
    handle({ op, path: { shopId: shop }, query: new URLSearchParams(query) });
const write = (op: string, body: Record<string, unknown>, path: Record<string, string> = {}, version?: number) =>
    handle({ op, path: { shopId, ...path }, body, headers: {
        'x-csrf-token': CSRF, 'idempotency-key': `pilot-test-${++sequence}`,
        ...(version === undefined ? {} : { 'if-match': String(version) }),
    } });
const save = (version: number, ...rules: ShippingRateRule[]) => write('updateShippingPolicy', { rules }, {}, version);

beforeEach(() => { vi.stubGlobal('crypto', webcrypto); resetService(); });

it('stores a versioned rule per shop and rejects duplicate zones, lost updates, and unauthorized writes', async () => {
    expect((await read('getShippingPolicy')).data).toEqual({ shopId, version: 1, rules: [] });
    const result = await save(1, rate);
    assertSchema('ShippingPolicy', result.data);
    expect(result.data).toEqual({ shopId, version: 2, rules: [rate] });
    expect((await read('getShippingPolicy', '', 'shop-second')).data).toEqual({ shopId: 'shop-second', version: 1, rules: [] });
    await expect(save(1, rate)).rejects.toMatchObject({ status: 412 });
    await expect(save(2, rate, { ...rate, province: '  ĐỊA BÀN  MẪU ' })).rejects.toMatchObject({ code: 'DUPLICATE_SHIPPING_ZONE' });
    expect((await read('getShippingPolicy')).data).toEqual(result.data);
    setRole('viewer');
    await expect(read('getShippingPolicy')).rejects.toMatchObject({ status: 403 });
    await expect(save(2)).rejects.toMatchObject({ status: 403 });
});

it('uses the configured address zone, requires fresh confirmation, and carries the fixed rate into the shipment', async () => {
    const order = (await write('createOrder', {
        customerId: 'c1', conversationId: 'cv1', warehouseId: 'warehouse-01', shippingAddressId: 'address-synthetic',
        paymentMethod: 'cod', notes: '', lines: [{ variantId: 'v-p1', quantity: 1 }],
    })).data as Order;
    const quote = async () => (await write('quoteOrder', {}, { orderId: order.id })).data as OrderQuote;
    const approve = async (priced: OrderQuote) => {
        const evidence = mockCustomerConfirmation(shopId, priced.id);
        const confirmation = (await write('recordCustomerConfirmation', evidence, { orderId: order.id })).data as { id: string };
        return () => write('confirmOrder', {
            expectedVersion: order.version, quoteId: priced.id, customerConfirmationId: confirmation.id,
        }, { orderId: order.id }, order.version);
    };
    await save(1, { ...rate, countryCode: 'LA' });
    await expect(quote()).rejects.toMatchObject({ code: 'SHIPPING_ZONE_UNAVAILABLE' });
    await save(2, rate);
    const quoted = await quote();
    assertSchema('OrderQuote', quoted);
    expect(quoted.total.amount).toBe('150000');
    expect(quoted.shippingRate).toMatchObject({ policyVersion: 3, fee: { amount: '25000', currency: 'VND' } });
    const confirmOldQuote = await approve(quoted);
    await save(3, { ...rate, amount: '30000' });
    await expect(confirmOldQuote()).rejects.toMatchObject({ code: 'SHIPPING_QUOTE_STALE' });
    const fresh = await quote();
    const confirmFreshQuote = await approve(fresh);
    await confirmFreshQuote();
    await save(4, { ...rate, amount: '50000' });
    const confirmed = db.orders.find(row => row.id === order.id);
    expect(confirmed).toMatchObject({ orderState: 'confirmed', shippingRate: fresh.shippingRate });
    const prep = db.prepJobs.find(row => row.orderId === order.id);
    const task = db.workItems.find(row => row.id === prep?.workItemId);
    if (!prep || !task) throw new Error('Expected the confirmed order to have a preparation task.');
    await write('claimWorkItem', { expectedVersion: task.version }, { resourceId: String(task.id) }, Number(task.version));
    const [line] = prep.lines as { orderLineId: string; sku: string }[];
    await write('pickPrepLine', {
        expectedVersion: prep.version, orderLineId: line.orderLineId, scannedSku: line.sku, pickedQuantity: 1, issueReason: null,
    }, { resourceId: String(prep.id) }, Number(prep.version));
    await write('packPrepJob', { expectedVersion: prep.version }, { resourceId: String(prep.id) }, Number(prep.version));
    const shipment = await write('createShipment', {
        orderId: order.id, warehouseId: order.warehouseId, carrierId: null, orderLineIds: [line.orderLineId],
    });
    expect(shipment.data).toMatchObject({ shippingFeeQuote: { amount: '30000', currency: 'VND' }, shippingFeeActual: null });
});

it('filters the entire scoped work list before paginating and filters commands by kind and status', async () => {
    const late = db.workItems.find(row => row.kind === 'late_shipment');
    if (!late) throw new Error('Missing seeded exception.');
    db.workItems.push(...Array.from({ length: 25 }, (_, index) => ({
        ...late, id: `newer-normal-task-${index}`, kind: 'prepare_order', dueAt: null, state: 'working', assigneeUserId: 'user-demo',
        createdAt: '2026-10-01T15:00:00.000Z',
    })));
    db.workItems.push({ ...late, id: 'foreign-late', shopId: 'shop-second' });
    const page = await read('listWorkItems', 'exception=active&kind=late_shipment&limit=1');
    expect((page.data as WorkItem[]).map(row => row.id)).toEqual([late.id]);
    const overdue = await read('listWorkItems', 'exception=active&due=overdue');
    expect(overdue.data).toContainEqual(expect.objectContaining({ id: late.id }));
    const unassigned = await read('listWorkItems', 'exception=active&assignee=unassigned');
    expect(unassigned.data).toContainEqual(expect.objectContaining({ id: 'demo-workitem-unclaimed-order' }));
    expect(unassigned.data).not.toContainEqual(expect.objectContaining({ id: late.id }));
    const commandPage = await read('listCommands', 'kind=createInventoryAdjustment&status=unknown');
    expect(commandPage.data).toEqual([expect.objectContaining({ id: 'seed-command-10079', status: 'unknown' })]);
    setRole('viewer');
    await expect(read('listCommands', 'status=unknown')).rejects.toMatchObject({ status: 403 });
});
