import { all, MockFailure, num, str, units, type Input } from './database';
import { paymentReviews } from './payment-reviews';

export function requireCloseableShop(input: Input) {
    const scoped = (collection: string) => all(collection, input.shopId);
    const orders = scoped('orders');
    const has = (collection: string, field: string, ...values: string[]) =>
        scoped(collection).some(row => values.includes(str(row[field])));
    const errors: { path: string; code: string; message: string }[] = [];
    function block(condition: boolean, code: string, message: string) {
        if (condition) errors.push({ path: '/status', code, message });
    }
    block(has('orders', 'orderState', 'confirmed'), 'ORDER_PROCESSING', 'Hoàn tất hoặc hủy đơn bán đã xác nhận.');
    block(has('shipments', 'state', 'planned', 'label_pending', 'label_ready', 'handed_over', 'in_transit', 'part_delivered', 'failed', 'returning'),
        'SHIPMENT_PROCESSING', 'Hoàn tất vận đơn đang xử lý.');
    block(has('returns', 'state', 'requested', 'approved', 'awaiting_goods', 'received'), 'RETURN_PROCESSING', 'Kiểm nhận hàng trả đang chờ.');
    block(scoped('stock').some(row => num(row.reserved) > 0), 'STOCK_RESERVED', 'Xử lý các lượt giữ tồn còn hiệu lực.');
    block(has('purchases', 'status', 'sent', 'confirmed', 'part_received'), 'PURCHASE_RECEIVING', 'Xác nhận và nhận hàng cho đơn mua đã gửi.');
    const businessJobs = scoped('jobs').filter(row => row.kind !== 'privacy');
    const businessCommands = scoped('commands').filter(row => row.kind !== 'approvePrivacyRequest');
    const notifications = scoped('notifications').filter(row => row.channel !== 'in_app');
    block(businessJobs.some(row => ['queued', 'running', 'awaiting_confirmation'].includes(str(row.status)))
        || businessCommands.some(row => ['accepted', 'running'].includes(str(row.status)))
        || scoped('workItems').some(row => !['completed', 'cancelled'].includes(str(row.state)))
        || has('messageJobs', 'status', 'queued') || has('purchases', 'status', 'sending')
        || notifications.some(row => row.deliveryStatus === 'queued'),
        'BACKGROUND_WORK', 'Hoàn tất công việc, tác vụ nền hoặc lượt gửi đang chờ.');
    const payments = paymentReviews({ ...input, query: new URLSearchParams({ stage: 'open' }) });
    block(scoped('codSettlements').some(row => row.status !== 'matched')
        || scoped('reconciliations').some(row => row.state !== 'matched')
        || scoped('debts').some(row => units(row.outstandingAmount) !== 0n)
        || payments.some(row => row.kind === 'refund' || (row.verified != null && units(row.verified) !== 0n) || orders.some(order => order.id === row.orderId && order.orderState !== 'draft')),
        'RECONCILIATION', 'Đối soát các khoản thu, COD, công nợ hoặc hoàn tiền còn mở.');
    block(businessCommands.some(row => row.status === 'unknown') || has('purchases', 'status', 'unknown') || has('shipments', 'state', 'unknown')
        || scoped('messages').some(row => row.direction === 'outbound' && row.status === 'unknown') || notifications.some(row => row.deliveryStatus === 'unknown'),
        'EXTERNAL_UNKNOWN', 'Đối chiếu kết quả gửi với nhà cung cấp.');
    if (errors.length) throw new MockFailure(409, 'SHOP_CLOSE_BLOCKED', 'Cần xử lý các mục sau trước khi đóng cửa hàng.', errors);
}
