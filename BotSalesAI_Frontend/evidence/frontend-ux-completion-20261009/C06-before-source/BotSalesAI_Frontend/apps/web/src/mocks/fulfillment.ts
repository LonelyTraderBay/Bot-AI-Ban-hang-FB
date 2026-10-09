import { all, find, insert, ensure, checkVersion, touch, command, str, strings, num, rows, now, stockFor, move, units, money } from './database';
import type { Input, Row } from './database';
export function fulfillment(op: string, input: Input): Row | undefined {
    const { shopId, body } = input;
    switch (op) {
        case 'claimWorkItem':
        case 'acknowledgeNotification': {
            const notification = op === 'acknowledgeNotification' ? find('notifications', input.id, shopId) : undefined;
            if (notification) {
                checkVersion(notification, input);
                ensure(notification.recipientUserId === input.userId, 'Thông báo dành cho nhân viên khác.', 403);
                ensure(strings(notification.allowedActions).includes('acknowledge'), 'Thông báo không còn cho phép nhận việc.', 409, 'CAPABILITY_UNAVAILABLE');
            }
            const task = find('workItems', notification ? str(notification.workItemId) : input.id, shopId);
            if (!notification)
                checkVersion(task, input);
            ensure(strings(task.allowedActions).includes('claim'), 'Công việc không còn cho phép nhận việc.', 409, 'CAPABILITY_UNAVAILABLE');
            ensure(task.state === 'queued' && !task.assigneeUserId, 'Công việc đã được nhận hoặc không còn hiệu lực.');
            task.state = 'claimed';
            task.assigneeUserId = input.userId;
            task.allowedActions = ['begin', 'block'];
            touch(task);
            if (notification) {
                notification.acknowledgedAt = now();
                notification.openedAt = now();
                notification.allowedActions = [];
                touch(notification);
            }
            const prep = all('prepJobs', shopId).find(p => p.workItemId === task.id);
            if (prep) {
                prep.state = 'claimed';
                prep.assigneeUserId = input.userId;
                touch(prep);
            }
            return task;
        }
        case 'updateWorkItem': {
            const task = find('workItems', input.id, shopId);
            checkVersion(task, input);
            const action = str(body.action);
            const allowedActions = strings(task.allowedActions);
            ensure(allowedActions.includes(action), 'Hành động không còn được phép theo công việc hiện tại.', 409, 'CAPABILITY_UNAVAILABLE');
            ensure(task.state !== 'cancelled' && task.state !== 'completed', 'Công việc đã kết thúc.');
            if (action === 'begin') {
                ensure(task.assigneeUserId === input.userId, 'Bạn chưa nhận việc.');
                ensure(['claimed', 'blocked'].includes(str(task.state)), 'Công việc chưa ở trạng thái có thể bắt đầu.');
                task.state = 'working';
                task.allowedActions = task.kind === 'prepare_order' ? ['block'] : ['complete', 'block'];
            }
            if (action === 'block') {
                ensure(str(body.reason).trim().length >= 5, 'Cần lý do cụ thể.', 422);
                task.state = 'blocked';
                task.blockedReason = body.reason;
                task.allowedActions = ['begin', ...(allowedActions.includes('reassign') ? ['reassign'] : [])];
            }
            if (action === 'complete') {
                ensure(task.kind !== 'prepare_order', 'Việc chuẩn bị chỉ hoàn tất qua luồng bàn giao hàng.');
                ensure(task.state === 'working', 'Chỉ hoàn tất công việc đang xử lý.');
                task.state = 'completed';
                task.allowedActions = [];
            }
            if (action === 'reassign') {
                ensure(all('members', shopId).some(m => m.userId === body.assigneeUserId && m.status === 'active'), 'Người nhận không hợp lệ.', 422);
                task.assigneeUserId = body.assigneeUserId;
                task.state = 'claimed';
                task.allowedActions = ['begin', 'block'];
            }
            return touch(task);
        }
        case 'pickPrepLine': {
            const prep = find('prepJobs', input.id, shopId);
            checkVersion(prep, input);
            ensure(['claimed', 'picking'].includes(str(prep.state)), 'Cần nhận việc trước khi lấy hàng.');
            const task = find('workItems', str(prep.workItemId), shopId);
            ensure(task.assigneeUserId === input.userId, 'Đơn đang do người khác chuẩn bị.', 403);
            const line = rows(prep.lines).find(l => l.orderLineId === body.orderLineId);
            ensure(line, 'Sai dòng hàng.', 422);
            ensure(line.sku === body.scannedSku, 'Mã SKU không khớp.', 422);
            ensure(num(body.pickedQuantity) >= 0 && num(body.pickedQuantity) <= num(line.requiredQuantity), 'Số lượng lấy vượt yêu cầu.', 422);
            line.pickedQuantity = body.pickedQuantity;
            line.hasIssue = !!body.issueReason;
            prep.state = 'picking';
            touch(prep);
            return prep;
        }
        case 'packPrepJob': {
            const prep = find('prepJobs', input.id, shopId);
            checkVersion(prep, input);
            ensure(prep.state === 'picking', 'Chưa lấy hàng.');
            ensure(rows(prep.lines).every(l => l.requiredQuantity === l.pickedQuantity && !l.hasIssue), 'Chưa đủ hàng hoặc còn lỗi kiểm hàng.');
            prep.state = 'packed';
            touch(prep);
            const order = find('orders', str(prep.orderId), shopId);
            order.fulfillmentState = 'packed';
            order.allowedActions = ['handover', 'cancel', 'record_payment'];
            touch(order);
            return prep;
        }
        case 'createShipment': {
            const order = find('orders', str(body.orderId), shopId);
            ensure(order.fulfillmentState === 'packed', 'Chỉ tạo vận đơn sau khi đóng gói.');
            ensure(!all('shipments', shopId).some(s => s.orderId === order.id && s.state !== 'cancelled'), 'Đơn đã có vận đơn.');
            ensure(body.warehouseId === order.warehouseId, 'Kho không khớp đơn.', 422);
            ensure(rows(order.lines).length === (Array.isArray(body.orderLineIds) ? body.orderLineIds.length : 0), 'Mô phỏng này bàn giao toàn bộ dòng của đơn.', 422);
            const shipment = insert('shipments', 'Shipment', shopId, {
                orderId: order.id, warehouseId: order.warehouseId, carrierId: body.carrierId ?? null, trackingCode: null, state: 'planned', shippingFeeQuote: null, shippingFeeActual: null, events: []
            });
            order.shipmentIds = [shipment.id];
            touch(order);
            return shipment;
        }
        case 'handoverShipment': {
            const shipment = find('shipments', input.id, shopId);
            checkVersion(shipment, input);
            ensure(['planned', 'label_ready'].includes(str(shipment.state)), 'Vận đơn không thể bàn giao lần nữa.');
            const order = find('orders', str(shipment.orderId), shopId);
            ensure(order.fulfillmentState === 'packed', 'Đơn chưa đóng gói.');
            for (const line of rows(order.lines)) {
                const stock = stockFor(shopId, str(line.variantId), str(order.warehouseId));
                const cost = stock.unitCost ? units(stock.unitCost) * BigInt(num(line.quantity)) : null;
                line.costSnapshot = cost === null ? null : money(cost);
                move(input, stock, -num(line.quantity), -num(line.quantity), 'fulfillment', 'Bàn giao kiện hàng mô phỏng', { type: 'shipment', id: shipment.id });
            }
            shipment.state = 'handed_over';
            touch(shipment);
            order.fulfillmentState = 'dispatched';
            order.allowedActions = ['record_payment'];
            touch(order);
            const prep = all('prepJobs', shopId).find(p => p.orderId === order.id);
            if (prep) {
                prep.state = 'handed_over';
                touch(prep);
                const task = find('workItems', str(prep.workItemId), shopId);
                task.state = 'completed';
                task.allowedActions = [];
                touch(task);
            }
            return command(shopId, op, { type: 'shipment', id: shipment.id });
        }
        case 'recordShipmentEvent': {
            const shipment = find('shipments', input.id, shopId);
            checkVersion(shipment, input);
            ensure(!rows(shipment.events).some(e => e.externalEventId === body.externalEventId), 'Sự kiện đã tồn tại.');
            const allowed: Record<string, string[]> = {
                handed_over: ['in_transit', 'delivered', 'failed'], in_transit: ['delivered', 'failed'], failed: ['in_transit', 'returning'], returning: ['returned']
            };
            ensure(allowed[str(shipment.state)]?.includes(str(body.eventType)), 'Trạng thái vận chuyển không hợp lệ hoặc sự kiện bị lùi.');
            shipment.events = [...rows(shipment.events), { externalEventId: body.externalEventId, type: body.eventType, occurredAt: body.occurredAt, evidenceRef: body.evidenceRef }];
            shipment.state = body.eventType;
            touch(shipment);
            const order = find('orders', str(shipment.orderId), shopId);
            if (body.eventType === 'delivered') {
                order.fulfillmentState = 'delivered';
                order.orderState = 'completed';
                order.allowedActions = ['request_return', 'record_payment'];
                touch(order);
                if (order.paymentMethod === 'cod')
                    insert('debts', 'DebtItem', shopId, {
                        counterpartyType: 'carrier', counterpartyId: shipment.carrierId || 'manual-carrier', source: { type: 'order', id: order.id }, direction: 'receivable', originalAmount: order.total, outstandingAmount: order.total, dueAt: null, disputed: false
                    });
            }
            return shipment;
        }
        case 'inspectReturn': {
            const r = find('returns', input.id, shopId);
            checkVersion(r, input);
            ensure(!['inspected', 'closed', 'rejected'].includes(str(r.state)), 'Yêu cầu trả đã xử lý.');
            const order = find('orders', str(r.orderId), shopId);
            let refund = 0n;
            for (const inspected of rows(body.lines)) {
                const line = rows(r.lines).find(l => l.orderLineId === inspected.orderLineId);
                ensure(line, 'Dòng trả không hợp lệ.', 422);
                const acceptedQuantity = num(inspected.acceptedQuantity);
                ensure(Number.isInteger(acceptedQuantity) && acceptedQuantity >= 0 && acceptedQuantity <= num(line.quantity), 'Số lượng nhận phải là số nguyên từ 0 đến số lượng đã yêu cầu.', 422);
                const original = rows(order.lines).find(l => l.id === line.orderLineId);
                ensure(original, 'Dòng đơn không tồn tại.');
                line.disposition = inspected.disposition;
                line.reason = inspected.reason;
                if (inspected.disposition === 'sellable' && acceptedQuantity > 0)
                    move(input, stockFor(shopId, str(original.variantId), str(order.warehouseId)), acceptedQuantity, 0, 'return', str(inspected.reason), { type: 'return', id: r.id });
                refund += units(original.unitPrice) * BigInt(acceptedQuantity);
            }
            ensure(rows(r.lines).every(l => l.disposition !== 'pending'), 'Phải kiểm đủ các dòng.');
            r.state = 'inspected';
            r.refundObligation = money(refund);
            touch(r);
            order.fulfillmentState = 'part_returned';
            order.allowedActions = ['request_return', 'request_refund'];
            touch(order);
            return r;
        }
        default: return undefined;
    }
}
