import operationIndex from '../../../../packages/contracts/src/operations.json';
import collections from './collections.json';
import { db, all, first, find, insert, resetDb, restoreDb, ensure, str, num, record, id, now, future, grantedPermissions, audit, MockFailure } from './database';
import type { Row, Input } from './database';
import { catalog } from './catalog';
import { orders } from './orders';
import { fulfillment } from './fulfillment';
import { procurement } from './procurement';
import { finance, cashflow, profitLoss } from './finance';
import { auxiliary } from './auxiliary';
import { files, upload } from './files';
export { MockFailure };
export const CSRF = 'botsales-demo-csrf-not-a-real-secret';
let loggedIn = true;
let permissionVersion = 1;
let role = 'owner';
const seen = new Map<string, {
    body: string;
    response: unknown;
}>();
export type Fault = 'none' | 'slow' | 'error' | 'empty' | 'stale' | 'unknown' | 'forbidden';
let fault: Fault = 'none';
type ChangeEvent = {
    eventId: string;
    type: 'resync.required';
    schemaVersion: number;
    shopId: string;
    resourceType: string;
    resourceId: string;
    resourceVersion: number;
    occurredAt: string;
    sequence: number;
};
let eventSequence = 0;
const listeners = new Set<(event: ChangeEvent) => void>();
export function subscribeChanges(listener: (event: ChangeEvent) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function notify(shopId: string) { const sequence = ++eventSequence; const event: ChangeEvent = {
    eventId: `mock-${sequence}`, type: 'resync.required', schemaVersion: 1, shopId, resourceType: 'shop', resourceId: shopId, resourceVersion: 0, occurredAt: now(), sequence
}; for (const listener of listeners)
    listener(event); }
export function setFault(value: Fault) { fault = value; }
export function setRole(value: string) { ensure(grantedPermissions(value).length > 0, 'Vai trò không có trong catalog.', 422); role = value; permissionVersion++; }
export function resetService() { resetDb(); seen.clear(); role = 'owner'; permissionVersion++; fault = 'none'; loggedIn = true; }
export function currentSession(): Row {
    ensure(loggedIn, 'Phiên đăng nhập đã kết thúc.', 401, 'UNAUTHENTICATED');
    return {
        user: { id: 'user-demo', displayName: 'Jokertrader · tài khoản mẫu', email: 'owner@example.test' }, csrfToken: CSRF, expiresAt: '2030-12-31T23:59:59Z', memberships: (db.members || []).filter(m => m.userId === 'user-demo').map(m => ({ ...m, roles: [role], permissions: grantedPermissions(role), permissionVersion }))
    };
}
const opMap: Record<string, {
    method: string;
    path: string;
    permission: string | null;
    requestSchema: string | null;
    responseSchema: string | null;
    status: number;
    headers: {
        name: string;
        required: boolean;
    }[];
}> = operationIndex;
const schemaToCollection = Object.fromEntries(Object.entries(collections).map(([collection, schema]) => [schema, collection]));
export type MockRequest = {
    op: string;
    path: Record<string, string>;
    query?: URLSearchParams;
    body?: unknown;
    headers?: Record<string, string>;
    origin?: string;
    form?: FormData;
};
export type MockResult = {
    status: number;
    data: unknown;
    commandId?: string;
};
function read(op: string, input: Input): unknown {
    const { shopId } = input;
    if (op === 'getBotConfig')
        return first('bots', shopId);
    if (op === 'getPrivacyPolicy')
        return first('privacyPolicies', shopId);
    if (op === 'getNotificationPolicy')
        return first('notificationPolicies', shopId);
    if (op === 'getBotRevision') {
        const revision = all('botRevisions', shopId).find(r => String(r.revision) === input.path.revisionId || r.id === input.path.revisionId);
        ensure(revision, 'Không có phiên bản cấu hình.', 404);
        return revision;
    }
    if (op === 'listBotRevisions')
        return all('botRevisions', shopId);
    if (op === 'getDashboard')
        return {
            shopId, asOf: now(), openConversations: all('conversations', shopId).filter(c => c.status === 'open').length, pendingOrders: all('orders', shopId).filter(o => ['draft', 'confirmed'].includes(str(o.orderState))).length, lowStockVariants: all('stock', shopId).filter(s => num(s.available) <= num(s.lowStockThreshold)).length, botStatus: first('bots', shopId).status, recognizedRevenue: grantedPermissions(role).includes('finance.read') ? profitLoss(shopId).netSales : null, cashReceived: grantedPermissions(role).includes('finance.read') ? cashflow(shopId).receipts : null, warnings: ['Môi trường mô phỏng. Các kết nối ngoài chưa hoạt động.']
        };
    if (op === 'getOperationsSummary')
        return {
            asOf: now(), queuedTasks: all('workItems', shopId).filter(t => t.state === 'queued').length, overdueTasks: all('workItems', shopId).filter(t => t.dueAt && Date.parse(str(t.dueAt)) < Date.parse(now()) && !['completed', 'cancelled'].includes(str(t.state))).length, pendingApprovals: all('approvals', shopId).filter(a => a.status === 'pending').length, unknownCommands: all('commands', shopId).filter(c => c.status === 'unknown').length, roles: all('agentRoles', shopId), health: ['Meta', 'AI provider', 'Worker', 'Thông báo điện thoại'].map(component => ({ component, status: 'unknown', checkedAt: null, expiresAt: null, reason: 'Chưa có backend và kiểm tra tích hợp thật.' }))
        };
    if (op === 'getMarketingSummary')
        return {
            asOf: now(), knownAttributedOrders: 0, unknownAttributionOrders: all('orders', shopId).length, topQuestions: all('conversations', shopId).map(c => str(c.lastMessagePreview)), lostSaleReasons: [], estimatedSpend: null, actualSpend: null
        };
    if (op === 'getReportSummary')
        return {
            shopId, asOf: now(), availableReports: ['inventory', 'orders', 'cashflow', 'profit_loss'], warnings: ['Dữ liệu mô phỏng trong phiên, không có tài khoản quảng cáo thật.']
        };
    const schema = opMap[op]?.responseSchema?.replace(/ListResponse$|Response$/, '');
    const collection = schema ? schemaToCollection[schema] : undefined;
    if (!collection)
        return undefined;
    if (opMap[op].responseSchema?.endsWith('ListResponse')) {
        let data = all(collection, shopId);
        if (input.path.conversationId)
            data = data.filter(r => r.conversationId === input.path.conversationId);
        if (input.path.knowledgeId)
            data = data.filter(r => r.documentId === input.path.knowledgeId);
        for (const filter of ['status', 'state', 'orderId', 'customerId', 'variantId', 'warehouseId', 'supplierId', 'purchaseOrderId', 'kind']) {
            const value = input.query.get(filter);
            if (value)
                data = data.filter(r => (r[filter] ?? r.orderState) === value);
        }
        const search = input.query.get('q')?.toLocaleLowerCase('vi');
        if (search)
            data = data.filter(r => JSON.stringify(r).toLocaleLowerCase('vi').includes(search));
        if (fault === 'empty') {
            fault = 'none';
            return [];
        }
        if (collection === 'stock' && !grantedPermissions(role).includes('finance.read'))
            data = data.map(s => ({ ...s, unitCost: null }));
        return data;
    }
    return find(collection, input.id, shopId);
}
let serial: Promise<unknown> = Promise.resolve();
/** Serialize mutation scenarios so the mock itself cannot double-commit concurrent commands. */
export function handle(request: MockRequest): Promise<MockResult> {
    const run = serial.then(() => execute(request));
    serial = run.catch(() => undefined);
    return run;
}
async function execute(request: MockRequest): Promise<MockResult> {
    const meta = opMap[request.op];
    ensure(meta, 'Thao tác không có trong hợp đồng.', 404);
    const headers = Object.fromEntries(Object.entries(request.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    const body = record(request.body);
    const shopId = request.path.shopId || '';
    const key = Object.entries(request.path).filter(([k]) => k !== 'shopId').at(-1)?.[1] || shopId;
    const input: Input = {
        shopId, id: key, path: request.path, query: request.query || new URLSearchParams(), body, version: headers['if-match'] ? Number(headers['if-match'].replaceAll('"', '')) : undefined, userId: 'user-demo'
    };
    const mutating = meta.method !== 'GET';
    if (request.op === 'getCsrfToken')
        return { status: 200, data: { csrfToken: CSRF } };
    if (request.op === 'getSession')
        return { status: 200, data: currentSession() };
    if (mutating)
        ensure(headers['x-csrf-token'] === CSRF, 'Mã CSRF không hợp lệ.', 403, 'CSRF_INVALID');
    if (request.op === 'beginLogin') {
        loggedIn = true;
        return { status: 200, data: { authorizationUrl: `${request.origin || 'http://localhost:5173'}/workspaces`, expiresAt: future() } };
    }
    if (request.op === 'logout') {
        loggedIn = false;
        return { status: 204, data: undefined };
    }
    currentSession();
    if (request.op === 'listShops')
        return { status: 200, data: db.shops || [] };
    if (request.op === 'createShop') {
        const created = insert('shops', 'Shop', '', { ...body, id: id('shop'), defaultWarehouseId: id('warehouse'), policyVersion: 'unconfigured' });
        const newShop = str(created.id);
        insert('members', 'Membership', newShop, { userId: input.userId, roles: ['owner'], permissions: grantedPermissions('owner'), permissionVersion: 1, status: 'active' });
        for (const [collection, schema] of [['bots', 'BotConfig'], ['privacyPolicies', 'PrivacyPolicy'], ['notificationPolicies', 'NotificationPolicy']] as const) {
            const example = (db[collection] || [])[0];
            if (example)
                insert(collection, schema, newShop, {
                    ...structuredClone(example), id: id(collection), shopId: newShop, ...(collection === 'bots' ? {
                        status: 'paused', connectionId: null, liveRevision: null, knowledgeRevisionIds: [], instructions: 'Chưa thiết lập', dailyBudget: null
                    } : collection === 'notificationPolicies' ? {
                        enabled: false, primaryUserIds: [], fallbackUserIds: [], fallbackChannel: 'none', quietHours: null, remindAfterMinutes: null, maxReminders: 0, urgentMayBypassQuietHours: false
                    } : { status: 'draft' })
                });
        }
        return { status: 201, data: created };
    }
    if (shopId) {
        find('shops', shopId, shopId);
        ensure((db.members || []).some(m => m.shopId === shopId && m.userId === input.userId && m.status === 'active'), 'Bạn không thuộc cửa hàng.', 403);
    }
    if (meta.permission)
        ensure(grantedPermissions(role).includes(meta.permission), 'Bạn không có quyền thực hiện thao tác này.', 403, 'FORBIDDEN');
    if (fault === 'slow') {
        fault = 'none';
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    if (fault === 'forbidden') {
        fault = 'none';
        throw new MockFailure(403, 'FORBIDDEN', 'Mô phỏng mất quyền của truy vấn này.');
    }
    if (fault === 'error') {
        fault = 'none';
        throw new MockFailure(503, 'SIMULATED_FAILURE', 'Lỗi dịch vụ mô phỏng. Đổi “Thử trạng thái” về bình thường để tiếp tục.');
    }
    if (fault === 'stale' && mutating) {
        fault = 'none';
        throw new MockFailure(412, 'STALE_VERSION', 'Mô phỏng dữ liệu bị thay đổi bởi người khác.');
    }
    const dedupeKey = [input.userId, shopId, request.op, headers['idempotency-key'] || ''].join('|');
    const bodyHash = JSON.stringify({ path: request.path, body: request.body });
    if (mutating && headers['idempotency-key']) {
        const previous = seen.get(dedupeKey);
        if (previous) {
            ensure(previous.body === bodyHash, 'Cùng khóa nhưng nội dung khác.', 409, 'IDEMPOTENCY_CONFLICT');
            return previous.response as MockResult;
        }
    }
    const snapshot = structuredClone(db);
    try {
        let data: unknown;
        if (request.op === 'uploadFile') {
            ensure(request.form, 'Thiếu file.', 422);
            data = await upload(input, request.form);
        }
        else if (meta.method === 'GET')
            data = read(request.op, input);
        if (data === undefined)
            data = catalog(request.op, input);
        if (data === undefined)
            data = await orders(request.op, input);
        if (data === undefined)
            data = fulfillment(request.op, input);
        if (data === undefined)
            data = await procurement(request.op, input);
        if (data === undefined)
            data = finance(request.op, input);
        if (data === undefined)
            data = await auxiliary(request.op, input);
        if (data === undefined)
            data = files(request.op, input);
        if (data === undefined)
            throw new MockFailure(501, 'NOT_SIMULATED', `Thao tác ${request.op} chưa được mô phỏng. Giao diện không ghi nhận thành công giả.`);
        if (mutating)
            audit(input, request.op, record(data).id ? { type: meta.responseSchema || 'command', id: record(data).id } : null);
        const result: MockResult = { status: meta.status, data: meta.status === 204 ? undefined : data };
        if (fault === 'unknown' && mutating && meta.responseSchema === 'CommandResponse') {
            fault = 'none';
            record(data).status = 'unknown';
            result.commandId = str(record(data).id);
        }
        if (mutating && headers['idempotency-key'])
            seen.set(dedupeKey, { body: bodyHash, response: structuredClone(result) });
        if (mutating)
            notify(shopId);
        return result;
    }
    catch (error) {
        restoreDb(snapshot);
        throw error;
    }
}
export function mockCustomerConfirmation(shopId: string, quoteId: string) {
    const quote = find('quotes', quoteId, shopId), order = find('orders', str(quote.orderId), shopId), customer = find('customers', str(order.customerId), shopId);
    ensure(order.conversationId && customer.externalIdentity, 'Cần đơn gắn với một hội thoại mẫu.');
    const message = insert('messages', 'Message', shopId, {
        conversationId: order.conversationId, direction: 'inbound', senderKind: 'customer', text: `[CONFIRM:${quoteId}] Khách mẫu xác nhận đúng bản báo giá này.`, status: 'delivered', clientMessageId: null, sourceEvidence: []
    });
    return {
        quoteId, quoteHash: quote.quoteHash, quoteVersion: quote.orderVersion, customerIdentityId: customer.externalIdentity, sourceMessageId: message.id
    };
}
