import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { createApp } from '../../../apps/api/dist/app.js';
import { Prisma } from '../../../apps/api/dist/generated/prisma/client.js';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { createContractValidator, schemaFromContract } from '../../../apps/api/dist/http/contracts.js';
import { openapi } from '../../../apps/api/dist/http/contract-source.js';
import { aiJobHandlers } from '../../../apps/api/dist/modules/ai/index.js';
import { localAccountingDate } from '../../../apps/api/dist/modules/finance/index.js';
import { recordStockMovement } from '../../../apps/api/dist/modules/inventory/index.js';
import { dispatchPreparationNotifications, notifyPreparation, publishOperationNotices } from '../../../apps/api/dist/modules/notifications/index.js';
import { publishOwnerDigests } from '../../../apps/api/dist/modules/operations/index.js';
import { refreshOperationExceptions } from '../../../apps/api/dist/modules/operations/exception-rules.js';
import { dispatchPurchases, evaluateAutomaticReorder } from '../../../apps/api/dist/modules/procurement/index.js';
import { readAuthConfig, requireShopAccess } from '../../../apps/api/dist/modules/workspace/index.js';
import { Database } from '../../../apps/api/dist/platform/database/client.js';
import { runJob } from '../../../apps/api/dist/platform/jobs/index.js';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { fixtureWriter, orderConversation, quoteEvidenceFixture } from '../orders/fixtures.mjs';
import { assertFixtureDatabase, fixtureSession } from '../workspace/session-fixture.mjs';

const [shopA, shopB] = fixtureShops;
const { id: shopId, currency, defaultWarehouseId: warehouseId } = shopA;
const validation = createContractValidator(openapi.components.schemas);
const money = amount => ({ amount, currency });
const key = id => ({ shopId_id: { shopId, id } });
let db, admin, app, auth, root, owner, reviewer, foreign, previousRoles, procurementBudget, warehouseRole, unknownOrder;

async function json(response, status, schema) {
    const body = await response.json();
    assert.equal(response.status, status, JSON.stringify(body));
    const validate = validation.compile(schemaFromContract(schema));
    assert.equal(validate(body), true, JSON.stringify(validate.errors));
    return schema === 'Problem' ? body : body.data;
}

function request(path, schema, { method = 'GET', body, status = 200, actor = owner, shop = shopId, version, idem = randomUUID() } = {}) {
    return fetch(root + '/shops/' + shop + '/' + path, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: {
        cookie: actor.cookie, ...(method === 'GET' ? {} : { origin: auth.appOrigin, 'x-csrf-token': actor.csrf, 'idempotency-key': idem,
            ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(version === undefined ? {} : { 'If-Match': '"' + version + '"' }) }),
    } }).then(res => json(res, status, schema));
}
const post = (path, body, schema, options = {}) => request(path, schema, { method: 'POST', body, ...options });
const put = (path, body, schema, options = {}) => request(path, schema, { method: 'PUT', body, ...options });
const patch = (path, body, schema, options = {}) => request(path, schema, { method: 'PATCH', body, ...options });

before(async () => {
    process.env.AI_FIXTURE_ADAPTER = '1';
    process.env.PROCUREMENT_FIXTURE_ADAPTER = '1';
    const url = readDatabaseUrl(process.env);
    assertFixtureDatabase(url);
    auth = readAuthConfig(process.env);
    const database = new Database(url);
    db = database.client;
    admin = fixtureWriter();
    [owner, reviewer, foreign] = await Promise.all(['p0-editor', 'p0-reader', 'p0-editor-b'].map(subject => fixtureSession(db, subject)));
    const where = { shopId_userId: { shopId, userId: reviewer.userId } };
    previousRoles = (await db.membership.findUniqueOrThrow({ where })).roles;
    await db.membership.update({ where, data: { roles: ['manager', 'accountant'], permissionVersion: { increment: 1 } } });
    app = await createApp({ database, auth, quiet: true });
    await app.listen(0, '127.0.0.1');
    root = await app.getUrl() + '/api/v2';
    for (const actor of [owner, reviewer, foreign]) {
        actor.csrf = (await json(await fetch(root + '/session', { headers: { cookie: actor.cookie } }), 200, 'SessionResponse')).csrfToken;
    }
    const fence = await db.shopAutomation.findUniqueOrThrow({ where: { shopId } });
    if (fence.paused) await control('shop', null, 'resume', fence.version);
});

after(async () => {
    if (previousRoles) await db.membership.update({ where: { shopId_userId: { shopId, userId: reviewer.userId } },
        data: { roles: previousRoles, permissionVersion: { increment: 1 } } });
    const ids = [owner, reviewer, foreign].filter(Boolean).map(actor => actor.id);
    if (ids.length) await db.session.updateMany({ where: { id: { in: ids } }, data: { revokedAt: new Date() } });
    await admin?.$disconnect();
    await app?.close();
});

async function connectedAi() {
    const value = await post('integrations/ai', { name: 'BE20 ' + randomUUID(), providerId: 'mock', adapterId: 'mock', modelId: 'synthetic-model',
        endpointUrl: null, credential: 'fixture-' + randomUUID() }, 'AIConnectionResponse', { status: 201 });
    const job = await post('integrations/ai/' + value.id + '/test', undefined, 'JobResponse', { status: 202 });
    await runJob(db, { shopId, id: job.id, sourceOperation: 'testAIConnection' }, aiJobHandlers(auth).get('testAIConnection'),
        async (tx, job, permission) => Boolean(await requireShopAccess(tx, job.actorId, job.shopId, permission)));
    return value.id;
}

function control(scope, resourceId, action, expectedVersion, options = {}) {
    return post('automation-control', { scope, resourceId, action, expectedVersion, reason: 'Kiểm kiểm soát tác động thử nghiệm' },
        options.schema ?? 'CommandResponse', { status: options.status ?? 202, ...options });
}

function askBudget(policy, amount, period, opts = {}) {
    const action = 'budget.change.' + period;
    const intentHash = createHash('sha256').update(JSON.stringify([action, shopId, policy.id, policy.version, amount, currency])).digest('hex');
    return post('approvals', { action, resource: { type: 'budget_policy', id: policy.id }, resourceVersion: policy.version, intentHash,
        reason: 'LIMIT ' + amount + ' ' + currency + '\nBộ ca kiểm ngân sách có xác nhận độc lập' }, opts.schema ?? 'ApprovalResponse', { status: opts.status ?? 201, ...opts });
}

function decide(row, actor = owner, options = {}) {
    return post('approvals/' + row.id + '/decision', { expectedVersion: row.version, intentHash: row.intentHash, decision: 'approve', reason: 'Đã đọc chính xác hạn mức' },
        options.schema ?? 'ApprovalResponse', { actor, ...options });
}

test('SC2-F03 derives exceptions from recurring sources without double opening across workers', async () => {
    const now = new Date();
    const older = minutes => new Date(+now - minutes * 60_000);
    const customer = await admin.customer.create({ data: { shopId, displayName: 'Khách tổng hợp F03' } });
    const { conversation } = await orderConversation(admin, shopId, customer.id);
    await admin.channelConnection.update({ where: key(conversation.channelId),
        data: { status: 'connected', policyVersion: 'F03-fixture', policyVerifiedAt: now } });
    await admin.channelConversation.update({ where: key(conversation.id), data: { lastInboundAt: older(20) } });
    const order = await admin.salesOrder.create({ data: { shopId, warehouseId, customerId: customer.id,
        paymentMethod: 'cod', total: '0', currency, notes: '' } });
    const shipment = await admin.shipment.create({ data: { shopId, warehouseId, orderId: order.id, currency,
        state: 'in_transit', handedOverAt: older(49 * 60), lastEventAt: older(49 * 60) } });
    const prep = await admin.workItem.create({ data: { shopId, kind: 'prepare_order', sourceType: 'order', sourceId: order.id, dueAt: older(10) } });
    const product = await admin.product.create({ data: { shopId, status: 'active', name: 'Hàng kiểm ngưỡng', description: '' } });
    const sku = 'F03-' + randomUUID();
    const variant = await admin.variant.create({ data: { shopId, productId: product.id, sku, skuKey: sku.toLowerCase(),
        name: 'SKU F03', options: {}, priceAmount: '10', priceCurrency: currency, position: 0 } });
    const stock = await admin.stockPosition.create({ data: { shopId, warehouseId, variantId: variant.id, lowStockThreshold: 2 } });

    await Promise.all([refreshOperationExceptions(db, now), refreshOperationExceptions(db, now)]);
    const sources = [conversation.id, shipment.id, stock.id];
    const expected = new Map([[conversation.id, 'customer_handoff'], [shipment.id, 'late_shipment'], [stock.id, 'low_stock']]);
    const automated = () => db.workItem.findMany({ where: { shopId, sourceId: { in: sources }, ruleVersion: { not: null } } });
    const first = await automated();
    assert.equal(first.length, 3);
    for (const row of first) {
        assert.equal(row.kind, expected.get(row.sourceId));
        assert.equal(row.state, 'queued');
        assert.equal(row.ruleVersion, 'operations.exceptions.v1');
    }
    const low = first.find(row => row.kind === 'low_stock');
    await request('work-items/' + low.id, 'Problem', { actor: foreign, status: 404 });
    const unassigned = await request('work-items?kind=prepare_order&assignee=unassigned&exception=active', 'WorkItemListResponse');
    assert.ok(unassigned.some(row => row.id === prep.id));

    const prior = await db.notificationPolicy.findUnique({ where: { shopId } });
    const priorities = { order: 'normal', lateShipment: 'normal', lowStock: 'urgent', paymentMismatch: 'off', operationalError: 'off' };
    const body = {
        enabled: true, timezone: shopA.timezone, expectedVersion: prior?.version ?? 1, maxReminders: 0,
        remindAfterMinutes: 5, primaryUserIds: [owner.userId], fallbackUserIds: [], fallbackChannel: 'none',
        quietHours: { start: '00:00', end: '23:59' }, urgentMayBypassQuietHours: true, eventPriorities: priorities,
    };
    try {
        await put('notification-policy', body, 'Problem', { actor: reviewer, status: 403 });
        const policy = await put('notification-policy', body, 'NotificationPolicyResponse');
        assert.deepEqual(policy.eventPriorities, priorities);
        const checkTime = new Date('2026-11-22T16:58:00.000Z');
        await Promise.all([publishOperationNotices(db, checkTime), publishOperationNotices(db, checkTime)]);
        const notifications = await db.appNotification.findMany({
            where: { shopId, sourceType: 'work_item', sourceId: { in: first.map(row => row.id) } },
            select: { sourceId: true, recipientUserId: true, title: true },
        });
        assert.deepEqual(notifications, [{ sourceId: low.id, recipientUserId: owner.userId, title: 'Khẩn · Tồn kho dưới ngưỡng' }]);
        const outsideQuietHours = new Date(+checkTime + 60_000);
        await admin.workItem.update({ where: key(prep.id), data: { dueAt: new Date(+checkTime + 360_000) } });
        await db.$transaction(tx => notifyPreparation(tx, prep, owner.userId, checkTime));
        const orderAlerts = () => db.appNotification.count({ where: { shopId, workItemId: prep.id, channel: 'in_app' } });
        await dispatchPreparationNotifications(db, undefined, checkTime);
        assert.equal(await orderAlerts(), 0);
        await dispatchPreparationNotifications(db, undefined, outsideQuietHours);
        assert.equal(await orderAlerts(), 1);
    } finally {
        if (prior) {
            const { eventPriorities, version, ...saved } = prior;
            await admin.notificationPolicy.update({ where: { shopId }, data: {
                ...saved, eventPriorities: eventPriorities ?? Prisma.DbNull, version: version + 2,
            } });
        }
        else await admin.notificationPolicy.deleteMany({ where: { shopId } });
    }

    await admin.channelConversation.update({ where: key(conversation.id), data: { status: 'resolved' } });
    await admin.shipment.update({ where: key(shipment.id), data: { state: 'delivered', deliveredAt: now, lastEventAt: now } });
    await admin.stockPosition.update({ where: key(stock.id), data: { lowStockThreshold: 0 } });
    await refreshOperationExceptions(db, now);
    assert.ok((await automated()).every(row => row.state === 'completed'));
    await admin.stockPosition.update({ where: key(stock.id), data: { lowStockThreshold: 2 } });
    await refreshOperationExceptions(db, now);
    assert.equal((await db.workItem.findUniqueOrThrow({ where: key(low.id) })).state, 'completed');
    await refreshOperationExceptions(db, new Date(Date.now() + 31 * 60_000));
    const reopened = await db.workItem.findUniqueOrThrow({ where: key(low.id) });
    assert.equal(reopened.state, 'queued');
    assert.equal(reopened.version, low.version + 2);
    assert.equal((await automated()).length, 3);
    await admin.stockPosition.update({ where: key(stock.id), data: { lowStockThreshold: 0 } });
    await refreshOperationExceptions(db);
});

test('SC2-F01 SC2-F04 SC2-H02 SC2-H03 -- role fences, immutable approved amount and expiry', async () => {
    const roles = await request('agent-roles?limit=100', 'AgentRoleListResponse');
    assert.equal(roles.length, 4);
    for (const role of roles) {
        assert.ok(!role.allowedToolIds.includes('members.manage'));
        assert.ok(!role.allowedToolIds.includes('payment.transfer'));
    }
    const proposed = roles.find(row => row.kind === 'warehouse_buyer');
    const modelConnectionId = await connectedAi();
    const roleRoute = 'agent-roles/' + proposed.id;
    await request(roleRoute, 'Problem', { shop: shopB.id, actor: foreign, status: 404 });
    const assign = { expectedVersion: proposed.version, humanOwnerId: owner.userId, modelConnectionId, policyVersion: proposed.policyVersion };
    await put(roleRoute, { ...assign, humanOwnerId: foreign.userId }, 'Problem', { status: 404 });
    await put(roleRoute, { ...assign, humanOwnerId: reviewer.userId }, 'Problem', { status: 403 });
    await put(roleRoute, { ...assign, policyVersion: 'expired-policy' }, 'Problem', { status: 422 });
    warehouseRole = await put(roleRoute, assign, 'AgentRoleResponse');
    assert.ok(warehouseRole.generation > proposed.generation);
    if (warehouseRole.status === 'paused') {
        await control('role', warehouseRole.id, 'resume', warehouseRole.version);
        warehouseRole = await request(roleRoute, 'AgentRoleResponse');
    }
    assert.equal(warehouseRole.status, 'ready');
    await control('role', warehouseRole.id, 'pause', warehouseRole.version, { actor: reviewer, status: 403, schema: 'Problem' });
    await control('role', warehouseRole.id, 'pause', warehouseRole.version);
    const paused = await request(roleRoute, 'AgentRoleResponse');
    assert.equal(paused.status, 'paused');
    await control('role', paused.id, 'resume', warehouseRole.version, { status: 412, schema: 'Problem' });
    await control('role', paused.id, 'resume', paused.version);
    warehouseRole = await request(roleRoute, 'AgentRoleResponse');

    const budgets = await request('budget-policies?limit=10', 'BudgetPolicyListResponse');
    assert.deepEqual(budgets.map(row => row.kind).sort(), ['ai_usage', 'notification', 'procurement']);
    const budget = budgets.find(row => row.kind === 'procurement');
    const expired = await askBudget(budget, '888', 'daily', { actor: reviewer });
    await admin.approval.update({ where: key(expired.id), data: {
        createdAt: new Date(Date.now() - 3600000), expiresAt: new Date(Date.now() - 15000),
    } });
    await decide(expired, owner, { status: 409, schema: 'Problem' });
    assert.equal((await request('approvals/' + expired.id, 'ApprovalResponse')).status, 'expired');
    const selfAmount = '999.' + BigInt('0x' + randomUUID().replaceAll('-', '').slice(0, 8)).toString() + '1';
    const selfRequested = await askBudget(budget, selfAmount, 'per_order');
    await decide(selfRequested, owner, { status: 409, schema: 'Problem' });
    const waiting = await askBudget(budget, '240', 'daily', { actor: reviewer });
    assert.deepEqual(waiting.amount, money('240'));
    const approved = await decide(waiting);
    assert.notEqual(approved.requestedBy, approved.decidedBy);
    const update = { expectedVersion: budget.version, approvalId: approved.id, limitAmount: money('240'), period: 'daily' };
    await put('budget-policies/' + budget.id, { ...update, limitAmount: money('241') }, 'Problem', { status: 409 });
    const idem = randomUUID();
    procurementBudget = await put('budget-policies/' + budget.id, update, 'BudgetPolicyResponse', { idem });
    assert.equal(procurementBudget.enabled, true);
    assert.equal((await put('budget-policies/' + budget.id, update, 'BudgetPolicyResponse', { idem })).version, procurementBudget.version);
    assert.equal((await request('budget-policies/' + budget.id, 'BudgetPolicyResponse')).approvalId, approved.id);
    assert.equal((await request('approvals/' + approved.id, 'ApprovalResponse')).status, 'consumed');
});

async function product(count = 1, actor = owner, shop = shopA) {
    const stamp = 'BE20-' + randomUUID().slice(0, 12);
    const result = await post('products', { name: stamp, description: '', categoryId: null, status: 'active', imageFileIds: [],
        variants: Array.from({ length: count }, (_, index) => ({ sku: stamp + '-' + index, name: 'Biến thể ' + index, active: true,
            options: {}, price: { amount: '100', currency: shop.currency } })),
    }, 'ProductResponse', { actor, shop: shop.id, status: 201 });
    return result.variants;
}

async function grantAutoPurchase(outcome, maxPerOrder = '120') {
    const [variant] = await product();
    const route = await admin.supplierDispatchRoute.create({ data: { shopId, outcome } });
    const created = await post('suppliers', { name: 'BE20-' + randomUUID(), contactLabel: 'Đầu mối thử nghiệm',
        currency, leadTimeDays: 2, paymentTerms: '', sendMethod: 'approved_adapter', approvedAdapterId: route.id }, 'SupplierResponse', { status: 201 });
    const supplier = await post('suppliers/' + created.id + '/status', { expectedVersion: created.version, status: 'approved',
        reason: 'Đã xác minh adapter tổng hợp' }, 'SupplierResponse');
    const offer = await post('supplier-offers', { supplierId: supplier.id, variantId: variant.id, unitCost: money('30'),
        minimumQuantity: 2, packSize: 2, leadTimeDays: 2, validUntil: null }, 'SupplierOfferResponse', { status: 201 });
    const delegation = await post('purchase-delegations', { agentId: warehouseRole.id, supplierId: supplier.id, warehouseId,
        offerIds: [offer.id], maxPerOrder: money(maxPerOrder), budgetPolicyId: procurementBudget.id,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), }, 'PurchaseDelegationResponse', { status: 201 });
    assert.equal(delegation.status, 'paused');
    const id = delegation.id;
    const current = await patch('purchase-delegations/' + id, { expectedVersion: delegation.version, status: 'active',
        reason: 'Xác minh điều khoản và phạm vi thử' }, 'PurchaseDelegationResponse');
    const baseRule = { variantId: variant.id, warehouseId, supplierOfferId: offer.id, reorderPoint: 1, targetQuantity: 4,
        safetyStock: 1, enabled: true, mode: 'draft_for_approval', budgetPolicyId: null };
    const rule = await post('reorder-rules', baseRule, 'ReorderRuleResponse', { status: 201 });
    await put('reorder-rules/' + rule.id, { ...baseRule, expectedVersion: rule.version, mode: 'auto_send',
        purchaseDelegationId: current.id, budgetPolicyId: procurementBudget.id }, 'ReorderRuleResponse');
    return { current, rule, variant };
}

async function evaluateReorder() {
    const command = await post('purchase-suggestions/evaluate', undefined, 'CommandResponse', { status: 202 });
    assert.equal(command.status, 'succeeded');
}

async function byGrant(id) {
    return db.purchaseDelegationReservation.findMany({ where: { shopId, delegationId: id } });
}

test('SC2-D06 SC2-D07 SC2-F05 SC2-H02 SC2-H04 SC2-H06 -- delegated purchase outcomes preserve budget and authorization audit', async t => {
    const first = await grantAutoPurchase('unknown');
    const second = await grantAutoPurchase('accepted');
    const third = await grantAutoPurchase('accepted', '30');
    assert.ok((await request('purchase-delegations?limit=100', 'PurchaseDelegationListResponse')).some(row => row.id === first.current.id));
    const financialEffects = () => Promise.all([
        db.financeJournal.count({ where: { shopId } }),
        db.paymentEvidence.count({ where: { shopId } }),
    ]);
    const accountingBefore = await financialEffects();
    const at = new Date();
    await Promise.all([evaluateAutomaticReorder(db, auth, at), evaluateAutomaticReorder(db, auth, at)]);
    await evaluateReorder();
    const [a] = await byGrant(first.current.id);
    const [b] = await byGrant(second.current.id);
    assert.equal((await byGrant(first.current.id)).length, 1);
    assert.equal((await byGrant(second.current.id)).length, 1);
    assert.equal(a.status, 'reserved');
    assert.equal(b.status, 'reserved');
    assert.equal(a.amount.toFixed(), '120');
    assert.equal((await byGrant(third.current.id)).length, 0);
    const blocked = await db.purchaseSuggestion.findFirstOrThrow({ where: { shopId, ruleId: third.rule.id } });
    assert.ok(blocked.autoSendReason);

    const auditRows = (grant, action) => db.auditEntry.findMany({
        where: { shopId, action, requestId: grant.commandId, resourceType: 'purchase_order', resourceId: grant.purchaseOrderId },
    });
    const queued = await auditRows(a, 'sendPurchaseOrder');
    assert.equal(queued.length, 1);
    assert.equal(queued[0].actorId, owner.userId);
    assert.equal(queued[0].metadata.actorKind, 'agent', 'Delegated purchase audit identifies the agent separately from the responsible user');
    const [agent, shop, membership, rule, budget, sending] = await Promise.all([
        db.agentRole.findUniqueOrThrow({ where: key(warehouseRole.id) }),
        db.shop.findUniqueOrThrow({ where: { id: shopId } }),
        db.membership.findUniqueOrThrow({ where: { shopId_userId: { shopId, userId: owner.userId } } }),
        db.reorderRule.findUniqueOrThrow({ where: key(first.rule.id), include: { offer: true } }),
        db.budgetPolicy.findUniqueOrThrow({ where: key(a.budgetPolicyId) }),
        db.purchaseOrder.findUniqueOrThrow({ where: key(a.purchaseOrderId), include: { lines: true } }),
    ]);
    assert.deepEqual(queued[0].metadata, {
        origin: 'delegation', actorKind: 'agent', agentId: agent.id, agentKind: 'warehouse_buyer', agentVersion: agent.version,
        permissionVersion: membership.permissionVersion, policyVersion: shop.policyVersion, shopGeneration: a.shopGeneration,
        agentGeneration: a.agentGeneration, delegationId: a.delegationId, delegationVersion: first.current.version,
        delegationGeneration: a.delegationGeneration, reservationId: a.id, budgetPolicyId: a.budgetPolicyId,
        budgetPolicyVersion: a.budgetPolicyVersion, budgetApprovalId: budget.approvalId,
        ruleId: rule.id, ruleVersion: rule.version, offerId: rule.supplierOfferId, offerVersion: rule.offer.version,
        suggestion: { id: sending.suggestionId, available: 0, confirmedInbound: 0, openProposalQuantity: 0,
            quantity: sending.lines[0].quantity, reorderPoint: rule.reorderPoint, safetyStock: rule.safetyStock, targetQuantity: rule.targetQuantity,
            sourceAsOf: a.createdAt.toISOString() },
        intentHash: a.intentHash, resourceVersion: sending.version, amount: sending.total.toFixed(), currency: sending.currency, result: 'queued',
    });
    const pausedSubmission = await auditRows(b, 'sendPurchaseOrder');
    assert.equal(pausedSubmission.length, 1);
    await patch('purchase-delegations/' + second.current.id, { expectedVersion: second.current.version, status: 'paused',
        reason: 'Tạm dừng trước khi adapter nhận lệnh' }, 'PurchaseDelegationResponse');
    await dispatchPurchases(db, auth);
    let reservation = await db.purchaseDelegationReservation.findUniqueOrThrow({ where: key(a.id) });
    assert.equal(reservation.status, 'unknown');
    assert.equal((await db.purchaseDelegationReservation.findUniqueOrThrow({ where: key(b.id) })).status, 'released');
    const command = await request('commands/' + a.commandId, 'CommandResponse');
    assert.equal(command.status, 'unknown');
    assert.equal(command.result, null);
    assert.equal((await request('commands?status=unknown&q=' + a.commandId, 'CommandListResponse'))[0].id, a.commandId);
    unknownOrder = await request('purchase-orders/' + a.purchaseOrderId, 'PurchaseOrderResponse');
    assert.equal(unknownOrder.status, 'unknown');
    assert.equal(unknownOrder.budgetReservationId, a.id);
    assert.ok((await request('purchase-delegation-reservations?limit=100', 'PurchaseDelegationReservationListResponse')).some(row => row.id === a.id));
    await request('purchase-delegation-reservations', 'Problem', { actor: reviewer, status: 403 });

    const path = 'work-items?limit=1&exception=active&kind=recovery&q=' + unknownOrder.id;
    const [work] = await request(path, 'WorkItemListResponse');
    assert.equal(work.source.type, 'purchase_order');
    assert.equal(work.source.id, unknownOrder.id);
    const claimed = await post('work-items/' + work.id + '/claim', { expectedVersion: work.version }, 'WorkItemResponse');
    const updating = 'work-items/' + work.id + '/actions';
    const begin = await post(updating, { expectedVersion: claimed.version, action: 'begin', reason: 'Đối chiếu ý định gửi chưa được xác nhận' }, 'WorkItemResponse');
    assert.equal(begin.state, 'working');
    await post(updating, { expectedVersion: begin.version, action: 'complete', reason: 'Thiếu bằng chứng phản hồi' }, 'Problem', { status: 409 });
    const summary = await request('operations-summary', 'OperationsSummaryResponse');
    assert.ok(summary.unknownCommands >= 1);
    assert.ok(summary.overdueTasks >= 1);
    const reference = 'BE20-PROOF-' + randomUUID();
    const proof = await admin.procurementEvidence.create({ data: { shopId, purchaseOrderId: unknownOrder.id, kind: 'supplier_confirmation',
        externalRef: reference, occurredAt: new Date() } });
    const confirmed = await post('purchase-orders/' + unknownOrder.id + '/confirm', { expectedVersion: unknownOrder.version, externalReference: reference,
        supplierConfirmationRef: proof.id }, 'PurchaseOrderResponse');
    reservation = await db.purchaseDelegationReservation.findUniqueOrThrow({ where: key(a.id) });
    assert.equal(reservation.status, 'consumed');
    assert.equal((await request('commands/' + a.commandId, 'CommandResponse')).status, 'succeeded');
    assert.equal((await request('work-items/' + work.id, 'WorkItemResponse')).state, 'completed');
    assert.deepEqual(await request(path, 'WorkItemListResponse'), []);

    assert.deepEqual(await auditRows(a, 'sendPurchaseOrder'), queued);
    const [confirmAudit] = await db.auditEntry.findMany({ where: { shopId, action: 'confirmPurchaseOrder', resourceId: unknownOrder.id } });
    assert.equal(confirmAudit.actorId, owner.userId);
    assert.equal(confirmAudit.metadata.actorKind, 'user');
    assert.equal(confirmAudit.metadata.permissionVersion, membership.permissionVersion);
    assert.equal(confirmAudit.metadata.version, confirmed.version);
    const auditPath = 'audit?q=' + a.commandId;
    const publicAudit = await request(auditPath, 'AuditEventListResponse');
    assert.deepEqual(publicAudit.map(row => row.action).sort(), ['dispatchPurchaseFixture', 'sendPurchaseOrder']);
    assert.ok(publicAudit.every(row => row.resource.id === a.purchaseOrderId && !Object.hasOwn(row, 'metadata')));
    assert.deepEqual(await request(auditPath, 'AuditEventListResponse', { actor: foreign, shop: shopB.id }), []);
    await request(auditPath, 'Problem', { actor: foreign, status: 404 });

    const fourth = await grantAutoPurchase('accepted');
    await evaluateReorder();
    const [oldGeneration] = await byGrant(fourth.current.id);
    assert.equal(oldGeneration.status, 'reserved');
    const beforeStop = await request('bot/config', 'BotConfigResponse');
    await control('shop', null, 'pause', beforeStop.automationVersion);
    const stopped = await request('bot/config', 'BotConfigResponse');
    assert.equal(stopped.status, 'paused');
    assert.equal(stopped.automationPaused, true);
    assert.equal((await request('dashboard', 'DashboardResponse')).botStatus, 'paused');
    await control('shop', null, 'resume', stopped.automationVersion);
    await dispatchPurchases(db, auth);
    assert.equal((await db.purchaseDelegationReservation.findUniqueOrThrow({ where: key(oldGeneration.id) })).status, 'released');
    assert.equal((await request('commands/' + oldGeneration.commandId, 'CommandResponse')).status, 'failed');

    const revoked = await grantAutoPurchase('accepted');
    await evaluateReorder();
    const [beforeRevocation] = await byGrant(revoked.current.id);
    assert.equal(beforeRevocation.status, 'reserved');
    await patch('purchase-delegations/' + revoked.current.id, { expectedVersion: revoked.current.version, status: 'revoked',
        reason: 'Thu hồi trước khi adapter nhận lệnh' }, 'PurchaseDelegationResponse');
    await dispatchPurchases(db, auth);
    const [afterRevocation] = await byGrant(revoked.current.id);
    assert.equal(afterRevocation.status, 'released');
    assert.equal((await request('commands/' + beforeRevocation.commandId, 'CommandResponse')).status, 'failed');

    const fifth = await grantAutoPurchase('accepted');
    await evaluateReorder();
    const [accepted] = await byGrant(fifth.current.id);
    await dispatchPurchases(db, auth);
    await dispatchPurchases(db, auth);
    assert.equal((await request('commands/' + accepted.commandId, 'CommandResponse')).status, 'succeeded');
    const sixth = await grantAutoPurchase('accepted');
    await evaluateReorder();
    assert.equal((await byGrant(sixth.current.id)).length, 0);
    const blockedByDay = await db.purchaseSuggestion.findFirstOrThrow({ where: { shopId, ruleId: sixth.rule.id } });
    assert.match(blockedByDay.autoSendReason, /hạn mức|ngân sách/i);
    const { _sum } = await db.purchaseDelegationReservation.aggregate({
        where: { shopId, budgetPolicyId: procurementBudget.id, status: { in: ['reserved', 'unknown', 'consumed'] } },
        _sum: { amount: true },
    });
    assert.equal(_sum.amount.toFixed(), '240');
    assert.deepEqual(await financialEffects(), accountingBefore);
    console.log(JSON.stringify({ status: 'SC2_D07_CONCURRENT_REORDER', workerCycles: 2, firstReservations: 1,
        secondReservations: 1, usedDailyBudget: _sum.amount.toFixed(), furtherReservations: 0,
        revokedBeforeDispatch: true, financialEffectsUnchanged: true }));
    assert.deepEqual(await auditRows(b, 'sendPurchaseOrder'), pausedSubmission);
    for (const [grant, status] of [[a, 'unknown'], [b, 'failed'], [oldGeneration, 'failed'], [accepted, 'succeeded']]) {
        const [submission, observation] = await Promise.all([auditRows(grant, 'sendPurchaseOrder'), auditRows(grant, 'dispatchPurchaseFixture')]);
        assert.equal(submission.length, 1);
        assert.equal(observation.length, 1);
        assert.deepEqual(observation[0].metadata, { actorKind: 'system', version: submission[0].metadata.resourceVersion + 1, status, origin: 'delegation',
            delegationId: grant.delegationId, reservationId: grant.id });
    }
    const recoveryWork = sourceId => db.workItem.findUniqueOrThrow({ where: { shopId_kind_sourceType_sourceId: {
        shopId, kind: 'recovery', sourceType: 'purchase_order', sourceId,
    } } });
    await t.test('SC2-F02: a draft after failed dispatch is not supplier confirmation', async () => {
        const order = await request('purchase-orders/' + b.purchaseOrderId, 'PurchaseOrderResponse');
        assert.equal(order.status, 'draft');
        const queued = await recoveryWork(order.id);
        const path = 'work-items/' + queued.id;
        const claimed = await post(path + '/claim', { expectedVersion: queued.version }, 'WorkItemResponse');
        const working = await post(path + '/actions', { expectedVersion: claimed.version, action: 'begin', reason: 'Đối chiếu phản hồi nhà cung cấp' },
            'WorkItemResponse');
        await post(path + '/actions', { expectedVersion: working.version, action: 'complete', reason: 'Chưa có xác nhận nhà cung cấp' },
            'Problem', { status: 409 });
        assert.equal((await recoveryWork(order.id)).state, 'working');
    });
    await t.test('SC2-F02: cancelling a failed purchase closes the same recovery task once', async () => {
        const order = await request('purchase-orders/' + oldGeneration.purchaseOrderId, 'PurchaseOrderResponse');
        assert.equal(order.status, 'draft');
        const queued = await recoveryWork(order.id);
        const path = 'work-items/' + queued.id;
        const claimed = await post(path + '/claim', { expectedVersion: queued.version }, 'WorkItemResponse');
        const payload = { expectedVersion: order.version, reason: 'Dừng đơn nháp sau khi quyền gửi đã đổi' };
        const cancelPath = 'purchase-orders/' + order.id + '/cancel';
        const options = { status: 202, idem: randomUUID() };
        const cancellation = await post(cancelPath, payload, 'CommandResponse', options);
        assert.equal((await post(cancelPath, payload, 'CommandResponse', options)).id, cancellation.id);
        assert.equal((await request('purchase-orders/' + order.id, 'PurchaseOrderResponse')).status, 'cancelled');
        const cancelled = await request(path, 'WorkItemResponse');
        assert.equal(cancelled.state, 'cancelled', 'Cancelling the source must close the recovery task');
        assert.equal(cancelled.version, claimed.version + 1);
        assert.equal(cancelled.assigneeUserId, owner.userId);
        assert.equal(cancelled.dueAt, claimed.dueAt);
        assert.equal((await recoveryWork(order.id)).id, queued.id);
        await request(path, 'Problem', { actor: foreign, shop: shopB.id, status: 404 });
        await post(path + '/actions', { expectedVersion: cancelled.version, action: 'begin', reason: 'Việc đã hủy không mở lại' },
            'Problem', { status: 409 });
        const eventCount = await db.outboxEvent.count({ where: {
            shopId, eventType: 'work_item.updated', AND: [
                { payload: { path: ['resourceId'], equals: cancelled.id } },
                { payload: { path: ['resourceVersion'], equals: cancelled.version } },
            ],
        } });
        assert.equal(eventCount, 1);
        console.log(JSON.stringify({ status: 'SC2_F02_PURCHASE_CANCELLATION', state: cancelled.state, versionIncrement: 1,
            sameWorkItem: true, replayedCommand: true, updateEvents: eventCount, foreignAccess: 404 }));
    });
    console.log(JSON.stringify({ status: 'SC2_H06_PROCUREMENT_AUDIT', agentSnapshot: true, immutable: true, humanConfirmation: true,
        workerOutcomes: ['unknown', 'failed', 'failed', 'succeeded'], duplicateResults: 0, privateMetadataReturned: false, foreignAccess: 404 }));
});

test('SC2-F06 SC2-F07 -- digest preserves local period and worker health expires', async () => {
    const previous = await request('notification-policy', 'NotificationPolicyResponse');
    const input = {
        expectedVersion: previous.version, enabled: true, timezone: shopA.timezone, quietHours: null,
        remindAfterMinutes: 30, maxReminders: 0, primaryUserIds: [owner.userId], fallbackUserIds: [], fallbackChannel: 'none',
        urgentMayBypassQuietHours: false,
    };
    await put('notification-policy', { ...input, primaryUserIds: [] }, 'Problem', { status: 422 });
    const changed = await put('notification-policy', input, 'NotificationPolicyResponse');
    try {
        const last = await db.ownerDigest.findFirst({ where: { shopId }, orderBy: { periodDay: 'desc' }, select: { periodDay: true } });
        const marker = new Date(Math.max(Date.now(), last?.periodDay.getTime() ?? 0) + 48 * 3600000);
        const initialDigestCount = await db.ownerDigest.count({ where: { shopId } });
        await publishOwnerDigests(db, marker, '');
        assert.equal(await db.ownerDigest.count({ where: { shopId } }), initialDigestCount);
        await Promise.all([publishOwnerDigests(db, marker, '0'), publishOwnerDigests(db, marker, '0')]);
        const rows = await request('digests?limit=100', 'DigestListResponse');
        const period = new Date(marker.getTime() - 86400000);
        const current = rows.filter(row => localAccountingDate(new Date(row.periodStart), shopA.timezone) === localAccountingDate(period, shopA.timezone));
        assert.equal(current.length, 1);
        assert.equal((await request('digests/' + current[0].id, 'DigestResponse')).status, 'accepted');
        assert.equal(await db.appNotification.count({ where: { shopId, sourceId: current[0].id, recipientUserId: owner.userId } }), 1);
        await request('digests/' + current[0].id, 'Problem', { actor: foreign, shop: shopB.id, status: 404 });
        const unrelayed = await db.outboxEvent.findFirstOrThrow({ where: { shopId, sequence: null } });
        const workerState = async () => (await request('operations-summary', 'OperationsSummaryResponse')).health
            .find(row => row.component === 'worker').status;
        const setHeartbeat = (checkedAt) => db.workerHealth.upsert({ where: { component: 'jobs' },
            update: { checkedAt, lagMs: 0 }, create: { component: 'jobs', checkedAt, lagMs: 0 } });
        const old = new Date(Date.now() - 120000);
        await db.outboxEvent.update({ where: key(unrelayed.id), data: { availableAt: old } });
        try {
            await setHeartbeat(new Date());
            assert.equal(await workerState(), 'degraded');
            await setHeartbeat(old);
            assert.equal(await workerState(), 'unknown');
        } finally {
            await db.outboxEvent.update({ where: key(unrelayed.id), data: { availableAt: unrelayed.availableAt } });
        }
        console.log(JSON.stringify({ status: 'SC2_F06_F07_DIGEST_HEALTH', missingRecipientRejected: true, missingHourPublished: 0,
            digestRows: current.length, notificationsPerOwner: 1, freshBacklog: 'degraded', staleHeartbeat: 'unknown' }));
    } finally {
        const { enabled, timezone, quietHours, remindAfterMinutes, maxReminders, primaryUserIds, fallbackUserIds, fallbackChannel, urgentMayBypassQuietHours } = previous;
        await put('notification-policy', { expectedVersion: changed.version, enabled, timezone, quietHours, remindAfterMinutes, maxReminders,
            primaryUserIds, fallbackUserIds, fallbackChannel, urgentMayBypassQuietHours }, 'NotificationPolicyResponse');
    }
});

test('SC2-G07 SC2-G08 -- shop-local reporting counts the actual order and net promotion only once', async () => {
    const lines = (await product(2)).map(row => ({ variantId: row.id, quantity: 1 }));
    for (const line of lines) await db.$transaction(tx => recordStockMovement(tx, { shopId, warehouseId, variantId: line.variantId, actorId: owner.userId,
        kind: 'receipt', source: { type: 'fixture_receipt', id: randomUUID() }, reason: 'Sổ kho kiểm báo cáo', delta: { onHand: 3 }, receivedValue: '30',
    }));
    const date = localAccountingDate(new Date(), shopA.timezone);
    const marketingQuery = 'marketing-summary?fromDate=' + date + '&toDate=' + date + '&bucket=week';
    // Other CI suites can leave posted and reversed advertising entries for the same day.
    const before = await request(marketingQuery, 'MarketingSummaryResponse');
    const promo = await post('promotions', { name: 'R53 kiểm xác nhận ' + randomUUID().slice(0, 6), startsOn: date, endsOn: date,
        discountAmount: '10', minMarginPercent: 1, lines }, 'PromotionResponse', { status: 201 });
    await patch('promotions/' + promo.id + '/decision', { action: 'activate', reason: 'Kiểm chứng đầu kỳ theo ngày' },
        'PromotionResponse', { version: promo.version });
    const customer = await post('customers', { displayName: 'Khách kiểm số tổng hợp', phone: '0900000222', email: null, notes: '' },
        'CustomerResponse', { status: 201 });
    const shipping = await post('customers/' + customer.id + '/addresses', { label: 'Mặc định', recipient: 'Khách kiểm', phone: '0900000222',
        line1: 'Địa chỉ thử', ward: null, district: null, province: 'Hà Nội', countryCode: 'VN', postalCode: null,
    }, 'CustomerAddressResponse', { status: 201 });
    const { conversation } = await orderConversation(admin, shopId, customer.id);
    const input = { customerId: customer.id, conversationId: conversation.id, warehouseId, shippingAddressId: shipping.id, notes: '',
        paymentMethod: 'cod', lines, promotionId: promo.id };
    const first = await post('orders', input, 'OrderResponse', { status: 201 });
    await post('orders', input, 'OrderResponse', { status: 201 });
    const offer = await post('orders/' + first.id + '/quote', undefined, 'OrderQuoteResponse');
    const proof = await post('orders/' + first.id + '/customer-confirmations', await quoteEvidenceFixture(admin, offer, conversation), 'CustomerConfirmationResponse');
    const result = await post('orders/' + first.id + '/confirm', { expectedVersion: first.version, quoteId: offer.id, customerConfirmationId: proof.id },
        'CommandResponse', { status: 202 });
    assert.equal(result.status, 'succeeded');
    const summary = await request(marketingQuery, 'MarketingSummaryResponse');
    assert.equal(summary.period.timezone, shopA.timezone);
    assert.equal(summary.trend.length, 1);
    const row = summary.promotionResults.find(row => row.promotionId === promo.id);
    assert.deepEqual({ orders: row.orders, discount: row.discount, netSales: row.netSales }, { orders: 1, discount: money('10'), netSales: money('190') });
    assert.equal(summary.knownAttributedOrders, 0);
    assert.ok(summary.unknownAttributionOrders >= 1);
    assert.deepEqual(summary.actualSpend, before.actualSpend);
    assert.deepEqual(summary.estimatedSpend, before.estimatedSpend);
    const defaults = await request('marketing-summary', 'MarketingSummaryResponse');
    assert.equal(defaults.trend.length, 30);
    const foreignReport = await request('marketing-summary?fromDate=' + date + '&toDate=' + date, 'MarketingSummaryResponse', { shop: shopB.id, actor: foreign });
    assert.ok(!foreignReport.promotionResults.some(row => row.promotionId === promo.id));
    await request('marketing-summary?fromDate=2020-01-01&toDate=2030-01-01', 'Problem', { status: 422 });
    const dashboard = await request('dashboard', 'DashboardResponse');
    assert.ok(dashboard.pendingOrders >= 2);
    const bot = await request('bot/config', 'BotConfigResponse');
    if (bot.status !== 'paused') {
        const command = await post('bot/pause', { expectedVersion: bot.version, reason: 'Dừng bot với quyền phiên hiện hành' }, 'CommandResponse', { status: 202 });
        assert.equal(command.status, 'succeeded');
        assert.equal((await request('bot/config', 'BotConfigResponse')).status, 'paused');
    }
});
