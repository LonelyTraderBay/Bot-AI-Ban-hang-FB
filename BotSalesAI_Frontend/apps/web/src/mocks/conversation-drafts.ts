import { all, checkVersion, ensure, find, insert, money, now, num, record, str, sum, touch, type Input, type Row } from './database';
import { orders, pricedOrder } from './orders';

const collection = 'conversationOrderDrafts';
function view(row: Row, showNotes = true) {
    const { id, shopId, conversationId, version, editEpoch, values, savedAt, editExpiresAt } = row;
    const { notes, ...visible } = record(values);
    return { id, shopId, conversationId, version, editEpoch, values: { ...visible, ...(showNotes && notes !== undefined && { notes }) }, savedAt, editExpiresAt };
}

export async function conversationDraftOperations(op: string, input: Input) {
    const { shopId, body, userId, permissions = [], path } = input;
    ensure(permissions.includes('orders.read') && permissions.includes('conversations.read'), 'Thiếu quyền xem bản đang nhập.', 403);
    const active = all(collection, shopId).filter(row => row.state === 'active');
    const canWrite = permissions.includes('orders.write') && permissions.includes('conversations.reply');
    if (op === 'listConversationOrderDrafts') return active.filter(row => row.savedAt).map(row => {
        const conversation = find('conversations', str(row.conversationId), shopId);
        return { id: row.id, conversationId: row.conversationId, savedAt: row.savedAt,
            customerName: permissions.includes('customers.read') ? conversation.displayName : null, assigneeId: conversation.assignedUserId };
    });
    const conversation = find('conversations', path.conversationId ?? '', shopId);
    const row = active.find(item => item.conversationId === conversation.id);
    const shop = find('shops', shopId, shopId);
    const assigned = conversation.mode === 'human' && conversation.assignedUserId === userId;
    const canOpen = canWrite && shop.status !== 'closed' && conversation.status === 'open'
        && (assigned || (conversation.assignedUserId === null && permissions.includes('conversations.assign')));
    if (op === 'getConversationOrderDraft') return { draft: row ? view(row, permissions.includes('orders.write')) : null, canOpen };
    if (op === 'estimateConversationOrderDraft') {
        ensure(row && row.id === path.draftId, 'Không có bản đang nhập.', 404);
        const { lines } = pricedOrder(shopId, record(row.values));
        const items = money(sum(lines, 'lineTotal'), str(shop.currency));
        return { version: row.version, items, shipping: null, total: items };
    }
    ensure(canOpen, 'Hội thoại hiện thuộc quyền xử lý của nhân viên khác.');
    const tabId = str(body.tabId);
    const ownsLease = row && row.tabId === tabId && Date.parse(str(row.editExpiresAt)) > Date.now() && row.assigneeId === conversation.assignedUserId;
    const expires = () => new Date(Date.now() + 60_000).toISOString();
    if (op === 'accessConversationOrderDraft' && body.action !== 'renew') {
        if (body.action === 'resume') ensure(row && row.id === body.draftId && row.editEpoch === body.editEpoch, 'Bản đang nhập đã đổi.');
        if (body.action === 'open' && !conversation.assignedUserId) {
            Object.assign(conversation, { assignedUserId: userId, mode: 'human', unreadCount: 0 });
            touch(conversation);
        }
        ensure(conversation.assignedUserId === userId, 'Hội thoại chưa được nhận.');
        ensure(!row || !row.tabId || ownsLease || body.action === 'resume' || Date.parse(str(row.editExpiresAt)) <= Date.now(), 'Bản nháp đang được sửa.');
        const draft = row ?? insert(collection, 'ConversationOrderDraft', shopId, { conversationId: conversation.id, values: {}, state: 'active' });
        Object.assign(draft, { tabId, assigneeId: userId, editExpiresAt: expires(), editEpoch: ownsLease ? draft.editEpoch : num(draft.editEpoch) + 1 });
        return view(draft);
    }
    ensure(row && ownsLease && row.editEpoch === body.editEpoch && row.id === (path.draftId || body.draftId), 'Quyền sửa đã chuyển.');
    checkVersion(row, input);
    if (op === 'accessConversationOrderDraft') {
        row.editExpiresAt = expires();
        return view(row);
    }
    if (op === 'saveConversationOrderDraft') {
        Object.assign(row, { values: body.values, version: num(row.version) + 1, savedAt: now() });
        return view(row);
    }
    const convert = op === 'convertConversationOrderDraft';
    const order = convert ? await orders('createOrder', { ...input, body: {
        notes: '', shippingAddressId: null, ...record(row.values), customerId: conversation.customerId, conversationId: conversation.id,
    } }) : null;
    Object.assign(row, { state: convert ? 'converted' : 'discarded', values: {}, tabId: null, editExpiresAt: null });
    return order;
}
