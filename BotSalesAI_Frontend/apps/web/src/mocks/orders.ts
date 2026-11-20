import { all, find, insert, ensure, checkVersion, touch, command, str, num, rows, now, future, stockFor, move, units, sum, money, record, assertOpenPeriod } from './database';
import type { Input, Row } from './database';
import { pricedLines } from './catalog';
import { postBusinessJournal, fiscalDate } from './accounting';
import { activeWarehouse, addressSnapshot } from './masters';
import { assertShippingQuoteCurrent, shippingRateForQuote } from './shipping-policy';
import { applyPromotion, assertPaidPromotionPrice, assertPromotionQuote } from './promotions';

function pricedOrder(shopId: string, order: Row) {
    return applyPromotion(shopId, str(order.warehouseId), str(order.promotionId), pricedLines(shopId, rows(order.lines)));
}
/** Confirmation hash belongs to the mock server, never computed by the UI as authority. */
export async function hashValue(value: unknown) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
    return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
export async function orders(op: string, input: Input): Promise<Row | undefined> {
    const { shopId, body } = input;
    switch (op) {
        case 'createOrder':
        case 'updateOrderDraft': {
            const existing = op === 'updateOrderDraft' ? find('orders', input.id, shopId) : undefined;
            if (existing) {
                checkVersion(existing, input);
                ensure(existing.orderState === 'draft', 'Chỉ sửa đơn nháp.');
            }
            const data = { ...existing, ...body };
            find('customers', str(data.customerId), shopId);
            activeWarehouse(shopId,str(data.warehouseId));
            if (data.shippingAddressId) addressSnapshot(shopId,str(data.customerId),str(data.shippingAddressId));
            if (data.conversationId)
                ensure(find('conversations', str(data.conversationId), shopId).customerId === data.customerId, 'Hội thoại không thuộc khách đã chọn.', 422);
            ensure(!existing || existing.paymentState === 'unpaid' || !(existing.promotionId || data.promotionId),
                'Đơn có ưu đãi đã được xác minh tiền. Đối chiếu khoản thu trước khi sửa.', 409, 'PAID_PROMOTION_CHANGED');
            const { lines, promotion } = pricedOrder(shopId, data);
            const patch = { ...body, lines, promotion, total: money(sum(lines, 'lineTotal'), str(find('shops', shopId, shopId).currency)), allowedActions: ['edit', 'quote', 'cancel', 'record_payment'] };
            if (existing) {
                existing.customerConfirmationId = null;
                return touch(Object.assign(existing, patch));
            }
            return insert('orders', 'Order', shopId, {
                ...patch, customerId: data.customerId, conversationId: data.conversationId ?? null, warehouseId: data.warehouseId, orderState: 'draft', fulfillmentState: 'unfulfilled', paymentState: 'unpaid', paymentMethod: data.paymentMethod, shippingAddressId: data.shippingAddressId ?? null, notes: data.notes, customerConfirmationId: null, recognitionPolicyVersion: 'synthetic-policy-1', prepTaskId: null, shipmentIds: [], redactedFields: []
            });
        }
        case 'quoteOrder': {
            const order = find('orders', input.id, shopId);
            if (input.version !== undefined)
                checkVersion(order, input);
            ensure(order.orderState === 'draft', 'Chỉ lấy báo giá cho đơn nháp.');
            activeWarehouse(shopId,str(order.warehouseId));
            const shippingAddressSnapshot = order.shippingAddressId ? addressSnapshot(shopId,str(order.customerId),str(order.shippingAddressId)) : null;
            const shippingRate = shippingRateForQuote(shopId, shippingAddressSnapshot);
            const { lines, promotion } = pricedOrder(shopId, order);
            assertPaidPromotionPrice(order, lines);
            const quote = insert('quotes', 'OrderQuote', shopId, {
                orderId: order.id, orderVersion: order.version, lines, promotion, total: money(sum(lines, 'lineTotal'), str(find('shops', shopId, shopId).currency)), shippingAddressSnapshot, shippingRate, expiresAt: future(), warnings: ['Báo giá mô phỏng, chưa gửi khách.']
            });
            quote.quoteHash = await hashValue({ orderId: order.id, orderVersion: order.version, lines, total: quote.total, shippingAddressSnapshot, shippingRate, promotion });
            order.allowedActions = ['edit', 'quote', 'confirm', 'cancel', 'record_payment'];
            return quote;
        }
        case 'recordCustomerConfirmation': {
            const order = find('orders', input.id, shopId), quote = find('quotes', str(body.quoteId), shopId), customer = find('customers', str(order.customerId), shopId);
            ensure(quote.orderId === order.id && quote.orderVersion === order.version && quote.orderVersion === body.quoteVersion, 'Báo giá không còn khớp đơn.');
            ensure(quote.quoteHash === body.quoteHash && Date.parse(str(quote.expiresAt)) > Date.parse(now()), 'Báo giá đã hết hạn hoặc hash khác.');
            assertShippingQuoteCurrent(shopId, quote);
            if (order.promotionId) assertPromotionQuote(order, quote, pricedOrder(shopId, order));
            // The seeded inbound message explicitly serves as synthetic customer evidence; not a live confirmation.
            const message = find('messages', str(body.sourceMessageId), shopId);
            ensure(message.direction === 'inbound' && message.conversationId === order.conversationId, 'Bằng chứng không thuộc hội thoại của đơn.');
            ensure(customer.externalIdentity === body.customerIdentityId, 'Định danh khách không khớp.', 422);
            ensure(str(message.text).includes(`[CONFIRM:${str(quote.id)}]`), 'Chưa có tin nhắn khách xác nhận đúng báo giá. Trong chế độ mẫu, dùng nút mô phỏng xác nhận khách; không dùng lời tư vấn làm bằng chứng.');
            const confirmation = insert('confirmations', 'CustomerConfirmation', shopId, {
                quoteId: quote.id, quoteHash: quote.quoteHash, customerIdentityId: body.customerIdentityId, sourceMessageId: message.id, expiresAt: quote.expiresAt, status: 'valid'
            });
            return confirmation;
        }
        case 'confirmOrder': {
            const order = find('orders', input.id, shopId);
            checkVersion(order, input);
            ensure(order.orderState === 'draft', 'Đơn không ở trạng thái nháp.');
            const quote = find('quotes', str(body.quoteId), shopId), confirmation = find('confirmations', str(body.customerConfirmationId), shopId);
            ensure(quote.orderId === order.id && quote.orderVersion === order.version && confirmation.quoteId === quote.id && confirmation.status === 'valid' && Date.parse(str(confirmation.expiresAt)) > Date.parse(now()), 'Báo giá/xác nhận không hợp lệ.');
            assertShippingQuoteCurrent(shopId, quote);
            ensure(order.shippingAddressId, 'Thiếu địa chỉ giao hàng.', 422);
            const currentAddress = addressSnapshot(shopId,str(order.customerId),str(order.shippingAddressId));
            ensure(record(quote.shippingAddressSnapshot).addressVersion === currentAddress.addressVersion,'Địa chỉ đã đổi sau báo giá; cần báo giá và khách xác nhận lại.',409,'ADDRESS_QUOTE_STALE');
            activeWarehouse(shopId,str(order.warehouseId));
            ensure(order.paymentMethod === 'cod' || order.paymentState === 'verified', 'Đơn trả trước chưa được xác minh tiền.');
            const current = pricedOrder(shopId, order);
            ensure(JSON.stringify(current.lines.map(l => l.unitPrice)) === JSON.stringify(rows(quote.lines).map(l => l.unitPrice)), 'Giá thay đổi, cần báo giá và xác nhận lại.');
            assertPromotionQuote(order, quote, current);
            for (const line of rows(quote.lines)) {
                const s = stockFor(shopId, str(line.variantId), str(order.warehouseId));
                ensure(num(s.available) >= num(line.quantity), 'Không đủ tồn khả dụng.', 409, 'INSUFFICIENT_STOCK');
            }
            for (const line of rows(quote.lines))
                move(input, stockFor(shopId, str(line.variantId), str(order.warehouseId)), 0, num(line.quantity), 'reserve', 'Giữ hàng khi xác nhận đơn', { type: 'order', id: order.id });
            const task = insert('workItems', 'WorkItem', shopId, {
                kind: 'prepare_order', source: { type: 'order', id: order.id }, state: 'queued', assigneeUserId: null, dueAt: null, blockedReason: null, allowedActions: ['claim']
            });
            insert('prepJobs', 'PrepJob', shopId, {
                orderId: order.id, assigneeUserId: null, workItemId: task.id, state: 'queued', lines: rows(quote.lines).map(l => ({ orderLineId: l.id, sku: l.sku, requiredQuantity: l.quantity, pickedQuantity: 0, hasIssue: false }))
            });
            insert('notifications', 'Notification', shopId, {
                workItemId: task.id, source: { type: 'order', id: order.id }, recipientUserId: input.userId, channel: 'in_app', title: `Đơn ${str(order.id)} cần chuẩn bị`, safeBody: `${rows(order.lines).length} mặt hàng cần chuẩn bị.`, deliveryStatus: 'queued', openedAt: null, acknowledgedAt: null, allowedActions: ['acknowledge']
            });
            Object.assign(order, {
                orderState: 'confirmed', fulfillmentState: 'reserved', lines: quote.lines, total: quote.total, shippingAddressSnapshot:quote.shippingAddressSnapshot, shippingRate: quote.shippingRate ?? null, promotion: quote.promotion ?? null, promotionAppliedAt: quote.promotion ? now() : null, customerConfirmationId: confirmation.id, prepTaskId: task.id, allowedActions: ['prepare', 'cancel', 'record_payment']
            });
            touch(order);
            return command(shopId, op, { type: 'order', id: order.id });
        }
        case 'cancelOrder': {
            const order = find('orders', input.id, shopId);
            checkVersion(order, input);
            ensure(['draft', 'confirmed'].includes(str(order.orderState)) && !['dispatched', 'delivered', 'part_delivered'].includes(str(order.fulfillmentState)), 'Đơn đã bàn giao; cần quy trình đổi/trả.');
            ensure(order.paymentState === 'unpaid', 'Đơn đã có tiền: cần xử lý nghĩa vụ hoàn trước.');
            if (order.orderState === 'confirmed')
                for (const line of rows(order.lines))
                    move(input, stockFor(shopId, str(line.variantId), str(order.warehouseId)), 0, -num(line.quantity), 'release', str(body.reason), { type: 'order', id: order.id });
            for (const prep of all('prepJobs', shopId).filter(p => p.orderId === order.id)) {
                prep.state = 'cancelled';
                touch(prep);
            }
            if (order.prepTaskId) {
                const task = find('workItems', str(order.prepTaskId), shopId);
                task.state = 'cancelled';
                task.allowedActions = [];
                touch(task);
            }
            order.orderState = 'cancelled';
            order.allowedActions = [];
            touch(order);
            return command(shopId, op, { type: 'order', id: order.id });
        }
        case 'createReturnCase': {
            const order = find('orders', str(body.orderId), shopId);
            ensure(['delivered', 'part_returned'].includes(str(order.fulfillmentState)), 'Chỉ tạo trả hàng khi đã giao.');
            const lines = rows(body.lines).map(l => {
                const line = rows(order.lines).find(o => o.id === l.orderLineId);
                ensure(line, 'Sai dòng đơn.', 422);
                const requested = all('returns', shopId).filter(r => r.orderId === order.id && r.state !== 'rejected').flatMap(r => rows(r.lines)).filter(x => x.orderLineId === line.id).reduce((n, x) => n + num(x.quantity), 0);
                ensure(num(l.quantity) + requested <= num(line.quantity), 'Số trả vượt số đã giao.', 422);
                return { ...l, reason: body.reason, disposition: 'pending' };
            });
            return insert('returns', 'ReturnCase', shopId, { orderId: order.id, state: 'requested', lines, refundObligation: null });
        }
        case 'payOrder': {
            const order = find('orders', input.id, shopId);
            checkVersion(order, input);
            ensure(order.paymentState === 'unpaid' && order.orderState !== 'cancelled', 'Đơn không còn chờ thu tiền.');
            if (order.orderState === 'draft' && order.promotionId) {
                ensure(sum(pricedOrder(shopId, order).lines, 'lineTotal') === units(order.total),
                    'Số tiền ưu đãi đã đổi. Cập nhật đơn nháp trước khi ghi nhận thu.', 409, 'PAID_PROMOTION_CHANGED');
            }
            ensure(body.evidenceRef && units(body.amount) === units(order.total), 'Cần bằng chứng và số tiền khớp đầy đủ.');
            const entry=insert('financeEntries', 'FinanceEntry', shopId, {
                kind: 'receipt', classification: 'sales_receipt', amount: body.amount, status: 'posted', occurredAt: now(), description: str(body.reason), sourceRef: { type: 'order', id: order.id }, paymentReference: body.reference || null, evidenceRef: body.evidenceRef, reversalOf: null
            });
            ensure(record(body.amount).currency===record(order.total).currency,'Không ghi thu khác đồng tiền đơn.',422,'PAYMENT_CURRENCY');
            const delivered=['delivered','part_returned','returned'].includes(str(order.fulfillmentState)),counterpart=delivered?(order.paymentMethod==='cod'?'138':'131'):'337';
            postBusinessJournal(shopId,'finance_entry',str(entry.id),[{code:body.method==='cash'?'111':'112',debit:units(body.amount),credit:0n,description:'Tiền thu có bằng chứng tổng hợp'},{code:counterpart,debit:0n,credit:units(body.amount),description:delivered?'Giảm phải thu':'Tiền ứng trước, chưa ghi doanh thu'}]);
            for(const debt of all('debts',shopId).filter(d=>record(d.source).type==='order'&&record(d.source).id===order.id)){debt.outstandingAmount=money(0n,str(record(order.total).currency));touch(debt);}
            order.paymentState = 'verified';
            touch(order);
            return command(shopId, op, { type: 'order', id: order.id });
        }
        case 'refundOrder': {
            const order = find('orders', input.id, shopId);
            checkVersion(order, input);
            assertOpenPeriod(shopId,fiscalDate(shopId));
            ensure(order.paymentState === 'verified' || order.paymentState === 'part_refunded', 'Chưa có khoản thu được xác minh để hoàn.');
            const obligations = sum(all('returns', shopId).filter(r => r.orderId === order.id && ['inspected', 'closed'].includes(str(r.state))), 'refundObligation');
            const knownRefunds = all('financeEntries', shopId).filter(e => record(e.sourceRef).type === 'order_refund' && e.kind === 'disbursement' && e.status === 'posted' && !e.reversalOf);
            const previous = knownRefunds.filter(e => record(e.sourceRef).id === order.id);
            const refunded = sum(previous, 'amount'), amount = units(body.amount);
            ensure(body.evidenceRef && body.paymentReference && amount > 0n && refunded + amount <= units(order.total) && refunded + amount <= obligations, 'Cần bằng chứng hoàn và số tiền không vượt nghĩa vụ/tiền đã thu.', 422);
            ensure(!knownRefunds.some(e => e.paymentReference === body.paymentReference), 'Mã hoàn tiền đã ghi nhận.');
            const entry=insert('financeEntries', 'FinanceEntry', shopId, {
                kind: 'disbursement', classification: 'other', amount: body.amount, status: 'posted', occurredAt: now(), description: body.reason, sourceRef: { type: 'order_refund', id: order.id }, paymentReference: body.paymentReference, evidenceRef: body.evidenceRef, reversalOf: null
            });
            ensure(record(body.amount).currency===record(order.total).currency,'Không ghi hoàn khác đồng tiền đơn.',422,'PAYMENT_CURRENCY');
            postBusinessJournal(shopId,'finance_entry',str(entry.id),[{code:'338',debit:amount,credit:0n,description:'Giảm nghĩa vụ hoàn tiền'},{code:'112',debit:0n,credit:amount,description:'Khoản hoàn đã được ghi nhận bằng chứng'}]);
            order.paymentState = refunded + amount === units(order.total) ? 'refunded' : 'part_refunded';
            touch(order);
            return command(shopId, op, { type: 'order', id: order.id });
        }
        default: return undefined;
    }
}
