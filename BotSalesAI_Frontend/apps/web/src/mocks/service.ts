import operationIndex from '../../../../packages/contracts/src/operations.json';
import collections from './collections.json';
import { db, all, first, find, insert, resetDb, restoreDb, ensure, str, num, record, id, now, future, grantedPermissions, audit, MockFailure } from './database';
import type { Row, Input } from './database';
import { catalog } from './catalog';
import { orders } from './orders';
import { fulfillment } from './fulfillment';
import { markDelegatedPurchasesUnknown, procurement } from './procurement';
import { allTimeReportWindow, finance, cashflow, profitLoss } from './finance';
import { auxiliary } from './auxiliary';
import { clearFileState, files, upload } from './files';
import { marketingSummary } from './marketing-report';
import { masters, visibleOrderAddress } from './masters';
import { privacy as privacyOperations, safeConsentChallenge } from './privacy';
import type { EventEnvelope } from '@botsales/contracts';
export { MockFailure };
export const CSRF = 'botsales-demo-csrf-not-a-real-secret';
let loggedIn = true;
let permissionVersion = 1;
let role = 'owner';
const seen = new Map<string, {
    body: string;
    response: unknown;
}>();
export type Fault = 'none' | 'slow' | 'error' | 'error_persistent' | 'error_persistent_all' | 'empty' | 'empty_persistent' | 'stale' | 'unknown' | 'forbidden' | 'budget_exceeded' | 'tool_denied';
let fault: Fault = 'none';
type OperationFailure = { status: number; code: string; message: string };
const operationFailures = new Map<string, OperationFailure>();
const operationDelays = new Map<string, number>();
type ChangeEvent = EventEnvelope;
let eventSequence = 0;
const listeners = new Set<(event: ChangeEvent) => void>();
export function subscribeChanges(listener: (event: ChangeEvent) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
const masterChanges: Record<string, {collection:string;resourceType:string;type:EventEnvelope['type']}> = {
    createOpeningBalance:{collection:'openingBalances',resourceType:'opening_balance',type:'opening_balance.updated'}, updateOpeningBalance:{collection:'openingBalances',resourceType:'opening_balance',type:'opening_balance.updated'}, postOpeningBalance:{collection:'openingBalances',resourceType:'opening_balance',type:'opening_balance.updated'},
    createJournal:{collection:'journals',resourceType:'journal',type:'journal.updated'}, postJournal:{collection:'journals',resourceType:'journal',type:'journal.updated'}, reverseJournal:{collection:'journals',resourceType:'journal',type:'journal.updated'},
    createAccountingPeriod:{collection:'periods',resourceType:'accounting_period',type:'accounting_period.updated'}, closeAccountingPeriod:{collection:'periods',resourceType:'accounting_period',type:'accounting_period.updated'}, reopenAccountingPeriod:{collection:'periods',resourceType:'accounting_period',type:'accounting_period.updated'},
    createWarehouse:{collection:'warehouses',resourceType:'warehouse',type:'warehouse.updated'}, updateWarehouse:{collection:'warehouses',resourceType:'warehouse',type:'warehouse.updated'}, archiveWarehouse:{collection:'warehouses',resourceType:'warehouse',type:'warehouse.updated'},
    createCustomerAddress:{collection:'addresses',resourceType:'customer_address',type:'customer_address.updated'}, updateCustomerAddress:{collection:'addresses',resourceType:'customer_address',type:'customer_address.updated'}, archiveCustomerAddress:{collection:'addresses',resourceType:'customer_address',type:'customer_address.updated'},
    createAccount:{collection:'accounts',resourceType:'account',type:'account.updated'}, updateAccount:{collection:'accounts',resourceType:'account',type:'account.updated'}, archiveAccount:{collection:'accounts',resourceType:'account',type:'account.updated'},
    createCustomerConsentChallenge:{collection:'consentChallenges',resourceType:'consent_challenge',type:'consent_challenge.updated'},
    exchangeConsentChallenge:{collection:'consentChallenges',resourceType:'consent_challenge',type:'consent_challenge.updated'},
    confirmConsentChallenge:{collection:'consentChallenges',resourceType:'consent_challenge',type:'consent_challenge.updated'},
    recordCustomerConsent:{collection:'consents',resourceType:'customer_consent',type:'customer_consent.updated'},
    createPurchaseDelegation:{collection:'purchaseDelegations',resourceType:'purchase_delegation',type:'purchase_delegation.updated'},
    updatePurchaseDelegation:{collection:'purchaseDelegations',resourceType:'purchase_delegation',type:'purchase_delegation.updated'},
    evaluatePurchaseSuggestion:{collection:'suggestions',resourceType:'purchase_suggestion',type:'purchase_suggestion.updated'},
    evaluatePurchaseOrder:{collection:'purchases',resourceType:'purchase_order',type:'purchase.updated'},
    evaluatePurchaseReservation:{collection:'purchaseDelegationReservations',resourceType:'purchase_reservation',type:'purchase_reservation.updated'},
};
function notify(shopId: string, op: string, resourceId: string) {
    const change=masterChanges[op], resource=change ? all(change.collection,shopId).find(row=>row.id===resourceId) : undefined;
    const sequence = ++eventSequence; const event: ChangeEvent = {
    eventId: `mock-${sequence}`, type: resource && change ? change.type : 'resync.required', schemaVersion: 2, shopId, resourceType: resource && change ? change.resourceType : 'shop', resourceId: resource ? str(resource.id) : shopId, resourceVersion: resource ? num(resource.version) : 0, occurredAt: now(), sequence
}; for (const listener of listeners)
    listener(event); }
export function setFault(value: Fault) { fault = value; }
export function setRole(value: string) { ensure(grantedPermissions(value).length > 0, 'Vai trò không có trong catalog.', 422); role = value; permissionVersion++; seen.clear(); }
export function resetService() { resetDb(); clearFileState(); seen.clear(); operationFailures.clear(); operationDelays.clear(); role = 'owner'; permissionVersion++; fault = 'none'; loggedIn = true; }
/** DEV/TEST ONLY. Injects a deterministic failure for one mock API operation. */
export function setOperationFailure(op: string, failure: OperationFailure | null) {
    if (failure)
        operationFailures.set(op, failure);
    else
        operationFailures.delete(op);
}
/** DEV/TEST ONLY. Delays only the response for one mock API operation. */
export function setOperationDelay(op: string, delayMs: number | null) {
    if (delayMs && delayMs > 0)
        operationDelays.set(op, delayMs);
    else
        operationDelays.delete(op);
}
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
    if (op === 'getFile')
        return files(op, input);
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
            shopId, asOf: now(), openConversations: all('conversations', shopId).filter(c => c.status === 'open').length, pendingOrders: all('orders', shopId).filter(o => ['draft', 'confirmed'].includes(str(o.orderState))).length, lowStockVariants: all('stock', shopId).filter(s => num(s.available) <= num(s.lowStockThreshold)).length, botStatus: first('bots', shopId).status, recognizedRevenue: grantedPermissions(role).includes('finance.read') ? profitLoss(shopId, allTimeReportWindow(shopId)).netSales : null, cashReceived: grantedPermissions(role).includes('finance.read') ? cashflow(shopId, allTimeReportWindow(shopId)).receipts : null, warnings: ['Môi trường mô phỏng. Các kết nối ngoài chưa hoạt động.']
        };
    if (op === 'getOperationsSummary')
        return {
            asOf: now(), queuedTasks: all('workItems', shopId).filter(t => t.state === 'queued').length, overdueTasks: all('workItems', shopId).filter(t => t.dueAt && Date.parse(str(t.dueAt)) < Date.parse(now()) && !['completed', 'cancelled'].includes(str(t.state))).length, pendingApprovals: all('approvals', shopId).filter(a => a.status === 'pending').length, unknownCommands: all('commands', shopId).filter(c => c.status === 'unknown').length, roles: all('agentRoles', shopId), health: ['Meta', 'AI provider', 'Worker', 'Thông báo điện thoại'].map(component => ({ component, status: 'unknown', checkedAt: null, expiresAt: null, reason: 'Chưa có backend và kiểm tra tích hợp thật.' }))
        };
    if (op === 'getMarketingSummary')
        return marketingSummary(input);
    if (op === 'getReportSummary')
        return {
            shopId, asOf: now(), availableReports: ['inventory', 'orders', 'cashflow', 'profit_loss'].filter(type => grantedPermissions(role).includes(({ inventory: 'inventory.read', orders: 'orders.read', cashflow: 'finance.read', profit_loss: 'finance.read' } as Record<string, string>)[type] || '')), warnings: ['Dữ liệu mô phỏng trong phiên, không có tài khoản quảng cáo thật.']
        };
    const responseSchema = opMap[op]?.responseSchema;
    const schema = responseSchema?.replace(/ListResponse$|Response$/, '');
    const collection = schema ? schemaToCollection[schema] : undefined;
    if (!collection)
        return undefined;
    if (responseSchema?.endsWith('ListResponse')) {
        let data = all(collection, shopId);
        if (input.path.conversationId)
            data = data.filter(r => r.conversationId === input.path.conversationId);
        if (input.path.knowledgeId)
            data = data.filter(r => r.documentId === input.path.knowledgeId);
        for (const filter of ['status', 'state', 'orderId', 'customerId', 'variantId', 'warehouseId', 'supplierId', 'purchaseOrderId', 'kind', 'mode', 'channelId', 'assignedUserId']) {
            const value = input.query.get(filter);
            if (value)
                data = data.filter(r => (r[filter] ?? r.orderState) === value);
        }
        if (op === 'listProducts' && input.query.has('categoryId'))
            data = data.filter(r => r.categoryId === input.query.get('categoryId'));
        const search = input.query.get('q')?.toLocaleLowerCase('vi');
        if (search)
            data = data.filter(r => JSON.stringify(r).toLocaleLowerCase('vi').includes(search));
        if (fault === 'empty' || fault === 'empty_persistent') {
            if (fault === 'empty')
                fault = 'none';
            return [];
        }
        if (collection === 'stock' && !grantedPermissions(role).includes('finance.read'))
            data = data.map(s => ({ ...s, unitCost: null, carryingValue: null }));
        if (collection === 'consentChallenges')
            data = data.map(safeConsentChallenge);
        return collection === 'orders' ? data.map(order => visibleOrderAddress(order,shopId)) : data;
    }
    const found = find(collection, input.id, shopId);
    return collection === 'orders' ? visibleOrderAddress(found,shopId) : found;
}
let serial: Promise<unknown> = Promise.resolve();
/** Serialize mutation scenarios so the mock itself cannot double-commit concurrent commands. */
export function handle(request: MockRequest): Promise<MockResult> {
    const run = serial.then(() => execute(request));
    serial = run.catch(() => undefined);
    const delayMs = operationDelays.get(request.op) || 0;
    if (!delayMs)
        return run;
    return run.then(result => new Promise<MockResult>(resolve => setTimeout(() => resolve(result), delayMs)));
}
async function execute(request: MockRequest): Promise<MockResult> {
    const meta = opMap[request.op];
    ensure(meta, 'Thao tác không có trong hợp đồng.', 404);
    const headers = Object.fromEntries(Object.entries(request.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    const body = record(request.body);
    const shopId = request.path.shopId || '';
    const key = Object.entries(request.path).filter(([k]) => k !== 'shopId').at(-1)?.[1] || shopId;
    const input: Input = {
        shopId, id: key, path: request.path, query: request.query || new URLSearchParams(), body, version: headers['if-match'] ? Number(headers['if-match'].replaceAll('"', '')) : undefined, userId: 'user-demo', permissions: grantedPermissions(role)
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
        seen.clear();
        clearFileState();
        return { status: 204, data: undefined };
    }
    if (!['exchangeConsentChallenge', 'confirmConsentChallenge'].includes(request.op))
        currentSession();
    if (request.op === 'listShops')
        return { status: 200, data: db.shops || [] };
    if (request.op === 'createShop') {
        const created = insert('shops', 'Shop', '', { ...body, id: id('shop'), defaultWarehouseId: id('warehouse'), policyVersion: 'unconfigured' });
        const newShop = str(created.id);
        insert('warehouses','Warehouse',newShop,{id:created.defaultWarehouseId,code:'MAIN',name:'Kho chính',addressLine:'Chưa thiết lập địa điểm kho',status:'active'});
        for (const account of all('accounts','shop-demo'))
            insert('accounts','Account',newShop,{code:account.code,name:account.name,group:account.group,status:'active',used:false});
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
    if (request.op === 'getFile') {
        const file = find('files', request.path.fileId || '', shopId);
        const purpose = str(file.purpose);
        const readPermission: Record<string, string> = {
            product_image: 'catalog.read', product_import: 'catalog.import', knowledge_source: 'knowledge.read',
            bank_statement: 'finance.read', cod_statement: 'finance.read', conversation_media: 'conversations.read'
        };
        const permission = readPermission[purpose];
        ensure(permission && grantedPermissions(role).includes(permission), 'Bạn không có quyền đọc tệp theo mục đích gốc.', 403, 'FILE_READ_FORBIDDEN');
        if (purpose === 'conversation_media') {
            ensure(file.resourceId, 'Tệp media thiếu phạm vi hội thoại.', 403, 'FILE_SCOPE_MISMATCH');
            find('conversations', str(file.resourceId), shopId);
        }
    }
    const operationFailure = operationFailures.get(request.op);
    if (operationFailure)
        throw new MockFailure(operationFailure.status, operationFailure.code, operationFailure.message);
    if (request.op === 'createExport') {
        const sourcePermission = ({ inventory: 'inventory.read', orders: 'orders.read', cashflow: 'finance.read', profit_loss: 'finance.read' } as Record<string, string>)[str(body.reportType)];
        ensure(sourcePermission && grantedPermissions(role).includes(sourcePermission), 'Bạn không có quyền đọc nguồn dữ liệu của báo cáo này.', 403, 'SOURCE_PERMISSION_REQUIRED');
    }
    if (fault === 'budget_exceeded' && request.op === 'runPlayground') {
        fault = 'none';
        throw new MockFailure(429, 'BUDGET_EXCEEDED', 'Hạn mức AI mô phỏng đã đạt giới hạn; yêu cầu thử không tạo kết quả.');
    }
    if (fault === 'tool_denied' && request.op === 'runPlayground') {
        fault = 'none';
        throw new MockFailure(403, 'TOOL_NOT_ALLOWED', 'Công cụ yêu cầu không thuộc allowedToolIds; không thực thi thao tác.');
    }
    if (request.op === 'uploadFile') {
        const purpose = request.form?.get('purpose');
        ensure(typeof purpose === 'string', 'Cần chỉ định mục đích tải tệp.', 422, 'UPLOAD_PURPOSE_REQUIRED');
        const requiredPermission: Record<string, string> = {
            product_image: 'catalog.write', product_import: 'catalog.import', knowledge_source: 'knowledge.write',
            bank_statement: 'finance.reconcile', cod_statement: 'finance.reconcile', conversation_media: 'conversations.reply'
        };
        const permission = requiredPermission[purpose];
        ensure(permission, 'Mục đích tải tệp không được hỗ trợ.', 422);
        ensure(grantedPermissions(role).includes(permission), 'Bạn không có quyền tải loại tệp này.', 403, 'FORBIDDEN');
    }
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
    if (fault === 'error_persistent_all')
        throw new MockFailure(503, 'SIMULATED_FAILURE', 'API mô phỏng đang lỗi liên tục. Đổi “Trạng thái thử” về bình thường rồi thử lại.');
    if (fault === 'error_persistent' && request.op === 'listDevices')
        throw new MockFailure(503, 'SIMULATED_FAILURE', 'Danh sách thiết bị đang lỗi mô phỏng. Đổi “Thử trạng thái” về bình thường rồi thử tải lại.');
    if (fault === 'stale' && mutating) {
        fault = 'none';
        throw new MockFailure(412, 'STALE_VERSION', 'Mô phỏng dữ liệu bị thay đổi bởi người khác.');
    }
    const dedupeKey = [input.userId, shopId, request.op, headers['idempotency-key'] || ''].join('|');
    const formEntries: Array<[string, string | { name: string; type: string; size: number; sha256: string }]> = [];
    for (const [name, value] of request.form?.entries() || []) {
        if (value instanceof File) {
            const digest = await crypto.subtle.digest('SHA-256', await value.arrayBuffer());
            formEntries.push([name, {
                name: value.name, type: value.type, size: value.size,
                sha256: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
            }]);
        }
        else formEntries.push([name, value]);
    }
    const canonicalBody = JSON.stringify({ path: request.path, body: request.body, form: formEntries });
    const bodyHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalBody))), byte => byte.toString(16).padStart(2, '0')).join('');
    if (mutating && headers['idempotency-key']) {
        const previous = seen.get(dedupeKey);
        if (previous) {
            ensure(previous.body === bodyHash, 'Cùng khóa nhưng nội dung khác.', 409, 'IDEMPOTENCY_CONFLICT');
            return previous.response as MockResult;
        }
    }
    const snapshot = structuredClone(db);
    try {
        let data: unknown = masters(request.op,input);
        if (meta.method === 'GET' && Array.isArray(data) && (fault === 'empty' || fault === 'empty_persistent')) {
            if (fault === 'empty') fault = 'none';
            data = [];
        }
        if (request.op === 'uploadFile') {
            ensure(request.form, 'Thiếu file.', 422);
            data = await upload(input, request.form);
        }
        else if (data === undefined && meta.method === 'GET')
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
            data = await privacyOperations(request.op, input);
        if (data === undefined)
            data = files(request.op, input);
        if (data === undefined)
            throw new MockFailure(501, 'NOT_SIMULATED', `Thao tác ${request.op} chưa được mô phỏng. Giao diện không ghi nhận thành công giả.`);
        const reorderEvents = request.op === 'evaluateReorder' ? {
            suggestionIds: (Array.isArray(record(record(data).result).suggestionIds) ? record(record(data).result).suggestionIds as unknown[] : []).map(str),
            purchaseOrderIds: (Array.isArray(record(record(data).result).purchaseOrderIds) ? record(record(data).result).purchaseOrderIds as unknown[] : []).map(str),
            reservationIds: (Array.isArray(record(record(data).result).reservationIds) ? record(record(data).result).reservationIds as unknown[] : []).map(str),
        } : null;
        if (mutating && !['exchangeConsentChallenge', 'confirmConsentChallenge'].includes(request.op))
            audit(input, request.op, record(data).id ? { type: meta.responseSchema || 'command', id: record(data).id } : null);
        if (meta.responseSchema === 'OrderResponse') data = visibleOrderAddress(record(data),shopId);
        if (meta.responseSchema === 'OrderQuoteResponse') {
            const quote=record(data),order=find('orders',str(quote.orderId),shopId);
            data={...quote,shippingAddressSnapshot:visibleOrderAddress({customerId:order.customerId,shippingAddressSnapshot:quote.shippingAddressSnapshot},shopId).shippingAddressSnapshot};
        }
        const result: MockResult = { status: meta.status, data: meta.status === 204 ? undefined : data };
        if (fault === 'unknown' && mutating && meta.responseSchema === 'CommandResponse') {
            fault = 'none';
            record(data).status = 'unknown';
            if (request.op === 'evaluateReorder') markDelegatedPurchasesUnknown(shopId, record(data));
            result.commandId = str(record(data).id);
        }
        if (mutating) {
            const resultData = record(data);
            const challengeId = str(resultData.challengeId) || str(resultData.id);
            const eventShopId = shopId || str(resultData.shopId) || str(db.consentChallenges?.find(row => row.id === challengeId)?.shopId) || str(db.consents?.find(row => row.id === resultData.consentRecordId)?.shopId);
            if (eventShopId) {
                notify(eventShopId,request.op,meta.responseSchema === 'CommandResponse' ? input.id : challengeId || str(resultData.id));
                if (request.op === 'evaluateReorder') {
                    for (const suggestionId of reorderEvents?.suggestionIds || []) notify(eventShopId, 'evaluatePurchaseSuggestion', suggestionId);
                    for (const purchaseId of reorderEvents?.purchaseOrderIds || []) notify(eventShopId, 'evaluatePurchaseOrder', purchaseId);
                    for (const reservationId of reorderEvents?.reservationIds || []) notify(eventShopId, 'evaluatePurchaseReservation', reservationId);
                }
                if (request.op === 'createPurchaseDelegation' || request.op === 'updatePurchaseDelegation')
                    notify(eventShopId, request.op, str(resultData.id));
                if (request.op === 'confirmConsentChallenge' && resultData.consentRecordId)
                    notify(eventShopId,'recordCustomerConsent',str(resultData.consentRecordId));
            }
        }
        // A batch evaluation can affect many resources; the public Command contract
        // only carries one ResourceRef, so keep its internal event IDs out of the API.
        if (request.op === 'evaluateReorder') record(data).result = null;
        if (mutating && headers['idempotency-key'])
            seen.set(dedupeKey, { body: bodyHash, response: structuredClone(result) });
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
