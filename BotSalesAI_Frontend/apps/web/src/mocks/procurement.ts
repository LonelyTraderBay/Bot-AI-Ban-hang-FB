import { all, find, insert, ensure, checkVersion, touch, command, str, num, rows, strings, record, now, future, id, stockFor, move, units, money, assertOpenPeriod } from './database';
import type { Input, Row } from './database';
import { hashValue } from './orders';
import { activeWarehouse } from './masters';
import { carryingValue, setStockValue, postBusinessJournal } from './accounting';

function approvedProcurementBudget(policy: Row, shopId: string) {
    const approval = all('approvals', shopId).find(row => row.id === policy.approvalId);
    return policy.kind === 'procurement' && policy.enabled === true && !!policy.limitAmount && !!approval &&
        approval.action === 'budget.update' && approval.status === 'approved' &&
        record(approval.resource).type === 'budget_policy' && record(approval.resource).id === policy.id &&
        num(approval.resourceVersion) === num(policy.version) && Date.parse(str(approval.expiresAt)) > Date.parse(now());
}

function periodKey(policy: Row, shopId: string, purchaseOrderId: string) {
    if (policy.period === 'per_order') return `per_order:${purchaseOrderId}`;
    const shop = find('shops', shopId, shopId);
    try {
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
            timeZone: str(shop.timezone), year: 'numeric', month: '2-digit', day: '2-digit',
        }).formatToParts(new Date(now())).map(part => [part.type, part.value]));
        const date = `${parts.year}-${parts.month}-${parts.day}`;
        return policy.period === 'daily' ? `daily:${date}` : `monthly:${date.slice(0, 7)}`;
    }
    catch {
        ensure(false, 'Múi giờ cửa hàng không hợp lệ; không thể xác định kỳ ngân sách.', 409, 'BUDGET_TIMEZONE_INVALID');
        return '';
    }
}

function refreshBudgetCounters(policy: Row, shopId: string, currentPeriodKey: string) {
    const reservations = all('purchaseDelegationReservations', shopId).filter(row => row.budgetPolicyId === policy.id && row.periodKey === currentPeriodKey);
    const reserved = reservations.filter(row => ['reserved', 'unknown'].includes(str(row.status))).reduce((sum, row) => sum + units(row.amount), 0n);
    const consumed = reservations.filter(row => row.status === 'consumed').reduce((sum, row) => sum + units(row.amount), 0n);
    const currency = str(record(policy.limitAmount).currency);
    policy.usagePeriodKey = currentPeriodKey;
    policy.reserved = money(reserved, currency);
    policy.consumed = money(consumed, currency);
}

function offerMatchesSnapshot(grant: Row, offer: Row) {
    return rows(grant.offerSnapshots).some(snapshot => snapshot.supplierOfferId === offer.id &&
        num(snapshot.offerVersion) === num(offer.version) &&
        JSON.stringify(snapshot.unitCost) === JSON.stringify(offer.unitCost) &&
        num(snapshot.minimumQuantity) === num(offer.minimumQuantity) && num(snapshot.packSize) === num(offer.packSize));
}

function delegationBlockReason(grant: Row | undefined, rule: Row, offer: Row, policy: Row | undefined, shopId: string) {
    if (!grant) return 'Chưa có ủy quyền purchase.send phù hợp.';
    if (grant.status !== 'active') return 'Ủy quyền đang tạm dừng hoặc đã thu hồi.';
    if (Date.parse(str(grant.expiresAt)) <= Date.parse(now())) return 'Ủy quyền đã hết hạn.';
    const agent = all('agentRoles', shopId).find(row => row.id === grant.agentId);
    if (!agent || agent.kind !== 'warehouse_buyer' || agent.humanOwnerId !== grant.humanOwnerId) return 'Vai trò tác vụ hoặc người chịu trách nhiệm đã đổi.';
    if (['paused', 'degraded'].includes(str(agent.status))) return 'Vai trò AI đang tạm dừng hoặc suy giảm.';
    if (num(agent.generation) !== num(grant.agentGeneration)) return 'Thế hệ vai trò đã đổi; chủ shop cần xác nhận lại ủy quyền.';
    const supplier = all('suppliers', shopId).find(row => row.id === offer.supplierId);
    const warehouse = all('warehouses', shopId).find(row => row.id === rule.warehouseId);
    if (!supplier || supplier.status !== 'approved' || !warehouse || warehouse.status !== 'active') return 'Nhà cung cấp hoặc kho không còn hoạt động.';
    if (grant.supplierId !== record(offer).supplierId || grant.warehouseId !== rule.warehouseId || !offerMatchesSnapshot(grant, offer)) return 'Nhà cung cấp, kho hoặc báo giá đã đổi khỏi phạm vi đã duyệt.';
    if (offer.validUntil && Date.parse(str(offer.validUntil)) <= Date.parse(now())) return 'Báo giá đã hết hiệu lực.';
    if (!policy || !approvedProcurementBudget(policy, shopId)) return 'Ngân sách mua hàng không còn bật hoặc phê duyệt đã hết hiệu lực.';
    if (grant.budgetPolicyId !== policy.id || num(grant.budgetPolicyVersion) !== num(policy.version) || grant.budgetPeriod !== policy.period) return 'Phiên bản/kỳ ngân sách đã đổi; cần xét lại ủy quyền.';
    if (str(record(grant.maxPerOrder).currency) !== str(record(offer.unitCost).currency) || str(record(policy.limitAmount).currency) !== str(record(offer.unitCost).currency)) return 'Đồng tiền của báo giá và ngân sách không khớp.';
    return '';
}

function validateDelegationDraft(body: Row, shopId: string, userId: string) {
    const agent = find('agentRoles', str(body.agentId), shopId);
    ensure(agent.kind === 'warehouse_buyer' && agent.humanOwnerId === userId, 'Chỉ có thể ủy quyền vai trò mua hàng do chính người duyệt chịu trách nhiệm.', 422, 'DELEGATION_AGENT_SCOPE_INVALID');
    const supplier = find('suppliers', str(body.supplierId), shopId);
    ensure(supplier.status === 'approved', 'Nhà cung cấp phải được duyệt trước khi cấp ủy quyền.', 422, 'SUPPLIER_NOT_APPROVED');
    const warehouse = find('warehouses', str(body.warehouseId), shopId);
    ensure(warehouse.status === 'active', 'Kho phải đang hoạt động.', 422, 'WAREHOUSE_INACTIVE');
    const offerIds = strings(body.offerIds);
    ensure(offerIds.length > 0 && new Set(offerIds).size === offerIds.length, 'Chọn ít nhất một báo giá duy nhất.', 422, 'DELEGATION_OFFERS_REQUIRED');
    const offers = offerIds.map(offerId => find('offers', offerId, shopId));
    ensure(offers.every(offer => offer.supplierId === supplier.id && (!offer.validUntil || Date.parse(str(offer.validUntil)) > Date.parse(now()))), 'Báo giá phải thuộc nhà cung cấp và còn hiệu lực.', 422, 'OFFER_OUT_OF_SCOPE');
    const budget = find('budgets', str(body.budgetPolicyId), shopId);
    ensure(approvedProcurementBudget(budget, shopId), 'Cần ngân sách mua hàng đang bật, được duyệt và còn hạn.', 422, 'PROCUREMENT_BUDGET_NOT_APPROVED');
    const maxPerOrder = record(body.maxPerOrder);
    ensure(str(maxPerOrder.currency) === str(record(budget.limitAmount).currency) && units(maxPerOrder) <= units(budget.limitAmount), 'Hạn mức mỗi đơn phải cùng tiền tệ và không vượt tổng ngân sách.', 422, 'DELEGATION_LIMIT_INVALID');
    const expiresAt = Date.parse(str(body.expiresAt));
    ensure(Number.isFinite(expiresAt) && expiresAt > Date.parse(now()), 'Thời hạn ủy quyền phải ở tương lai.', 422, 'DELEGATION_EXPIRY_INVALID');
    return { agent, supplier, warehouse, offers, budget };
}

export function markDelegatedPurchasesUnknown(shopId: string, commandRow: Row) {
    const result = record(commandRow.result);
    for (const purchaseOrderId of strings(result.purchaseOrderIds)) {
        const purchase = all('purchases', shopId).find(row => row.id === purchaseOrderId);
        if (!purchase) continue;
        purchase.status = 'unknown';
        purchase.allowedActions = ['reconcile'];
        touch(purchase);
        const reservation = all('purchaseDelegationReservations', shopId).find(row => row.purchaseOrderId === purchase.id);
        if (!reservation) continue;
        reservation.status = 'unknown';
        reservation.commandId = commandRow.id;
        touch(reservation);
        const policy = all('budgets', shopId).find(row => row.id === reservation.budgetPolicyId);
        if (policy) refreshBudgetCounters(policy, shopId, str(reservation.periodKey));
    }
}

export async function procurement(op: string, input: Input): Promise<Row | undefined> {
    const { shopId, body } = input;
    switch (op) {
        case 'createPurchaseDelegation': {
            const { agent, supplier, warehouse, offers, budget } = validateDelegationDraft(body, shopId, input.userId);
            return insert('purchaseDelegations', 'PurchaseDelegation', shopId, {
                agentId: agent.id,
                humanOwnerId: input.userId,
                toolId: 'purchase.send',
                supplierId: supplier.id,
                warehouseId: warehouse.id,
                offerSnapshots: offers.map(offer => ({ supplierOfferId: offer.id, offerVersion: offer.version, unitCost: offer.unitCost, minimumQuantity: offer.minimumQuantity, packSize: offer.packSize })),
                maxPerOrder: body.maxPerOrder,
                budgetPolicyId: budget.id,
                budgetPolicyVersion: budget.version,
                budgetPeriod: budget.period,
                agentGeneration: agent.generation,
                generation: 1,
                status: 'paused',
                expiresAt: body.expiresAt,
                lastReason: 'Mới tạo; cần người có quyền chủ động kích hoạt sau khi rà giới hạn.',
                lastChangedBy: input.userId,
            });
        }
        case 'updatePurchaseDelegation': {
            const grant = find('purchaseDelegations', input.id, shopId);
            checkVersion(grant, input);
            ensure(['active', 'paused', 'revoked'].includes(str(body.status)), 'Trạng thái ủy quyền không hợp lệ.', 422, 'DELEGATION_STATUS_INVALID');
            ensure(str(body.reason).trim().length >= 8, 'Ghi lý do thay đổi ít nhất 8 ký tự.', 422, 'DELEGATION_REASON_REQUIRED');
            ensure(grant.status !== 'revoked' && grant.status !== 'expired', 'Ủy quyền đã kết thúc và không thể kích hoạt lại.', 409, 'DELEGATION_TERMINAL');
            if (body.status === 'active') {
                ensure(Date.parse(str(grant.expiresAt)) > Date.parse(now()), 'Ủy quyền đã hết hạn; hãy tạo ủy quyền mới.', 409, 'DELEGATION_EXPIRED');
                const agent = find('agentRoles', str(grant.agentId), shopId);
                ensure(agent.kind === 'warehouse_buyer' && agent.humanOwnerId === grant.humanOwnerId && num(agent.generation) === num(grant.agentGeneration), 'Vai trò/người chịu trách nhiệm đã đổi; hãy tạo ủy quyền mới.', 409, 'DELEGATION_AGENT_CHANGED');
                ensure(!['paused', 'degraded'].includes(str(agent.status)), 'Hãy khôi phục vai trò mua hàng trước khi kích hoạt ủy quyền.', 409, 'DELEGATION_AGENT_INACTIVE');
                const offers = rows(grant.offerSnapshots).map(snapshot => find('offers', str(snapshot.supplierOfferId), shopId));
                const budget = find('budgets', str(grant.budgetPolicyId), shopId);
                ensure(approvedProcurementBudget(budget, shopId) && num(budget.version) === num(grant.budgetPolicyVersion) && budget.period === grant.budgetPeriod, 'Ngân sách hoặc kỳ đã đổi; cần tạo ủy quyền theo phiên bản mới.', 409, 'DELEGATION_BUDGET_CHANGED');
                ensure(offers.length > 0 && offers.every(offer => offer.supplierId === grant.supplierId && offerMatchesSnapshot(grant, offer)), 'Báo giá đã đổi khỏi snapshot; cần tạo ủy quyền mới.', 409, 'DELEGATION_OFFER_CHANGED');
                ensure(find('suppliers', str(grant.supplierId), shopId).status === 'approved' && find('warehouses', str(grant.warehouseId), shopId).status === 'active', 'Nhà cung cấp hoặc kho không còn hoạt động.', 409, 'DELEGATION_RESOURCE_INACTIVE');
            }
            if (grant.status === body.status) return grant;
            grant.status = body.status;
            grant.generation = num(grant.generation) + 1;
            grant.lastReason = str(body.reason).trim();
            grant.lastChangedBy = input.userId;
            return touch(grant);
        }
        case 'createSupplier': return insert('suppliers', 'Supplier', shopId, { ...body, status: 'draft' });
        case 'updateSupplier': {
            const s = find('suppliers', input.id, shopId);
            checkVersion(s, input);
            const { expectedVersion: _expectedVersion, ...patch } = body;
            return touch(Object.assign(s, patch));
        }
        case 'setSupplierStatus': {
            const s = find('suppliers', input.id, shopId);
            checkVersion(s, input);
            s.status = body.status;
            return touch(s);
        }
        case 'createSupplierOffer': {
            find('suppliers', str(body.supplierId), shopId);
            return insert('offers', 'SupplierOffer', shopId, body);
        }
        case 'createReorderRule':
        case 'updateReorderRule': {
            activeWarehouse(shopId,str(body.warehouseId));
            const offer = find('offers', str(body.supplierOfferId), shopId);
            ensure(num(body.targetQuantity) >= num(body.reorderPoint), 'Mức nhập tới phải >= điểm nhập lại.', 422);
            if (body.mode === 'auto_send') {
                ensure(body.budgetPolicyId && body.purchaseDelegationId, 'Tự gửi cần ủy quyền và ngân sách mua hàng đã duyệt.', 422, 'DELEGATION_REQUIRED');
                const policy = find('budgets', str(body.budgetPolicyId), shopId);
                const grant = find('purchaseDelegations', str(body.purchaseDelegationId), shopId);
                const reason = delegationBlockReason(grant, { warehouseId: body.warehouseId } as Row, offer, policy, shopId);
                ensure(!reason && grant.budgetPolicyId === policy.id, reason || 'Ngân sách không khớp với ủy quyền.', 422, 'DELEGATION_NOT_ACTIVE');
            }
            const duplicateRule = all('reorderRules', shopId).find(rule => rule.variantId === body.variantId && rule.warehouseId === body.warehouseId && (op === 'createReorderRule' || rule.id !== input.id));
            ensure(!duplicateRule, 'Mỗi biến thể trong một kho chỉ có một quy tắc nhập lại; hãy sửa quy tắc hiện có.', 409, 'DUPLICATE_REORDER_RULE');
            const { expectedVersion, ...data } = body;
            void expectedVersion;
            if (op === 'createReorderRule')
                return insert('reorderRules', 'ReorderRule', shopId, data);
            const rule = find('reorderRules', input.id, shopId);
            checkVersion(rule, input);
            return touch(Object.assign(rule, data));
        }
        case 'evaluateReorder': {
            const purchaseOrderIds: string[] = [];
            const suggestionIds: string[] = [];
            const reservationIds: string[] = [];
            for (const rule of all('reorderRules', shopId).filter(r => r.enabled)) {
                const s = stockFor(shopId, str(rule.variantId), str(rule.warehouseId));
                const offer = find('offers', str(rule.supplierOfferId), shopId);
                const active = all('purchases', shopId).filter(p => p.warehouseId === rule.warehouseId && !['cancelled', 'received'].includes(str(p.status)));
                const incoming = active.filter(p => ['confirmed', 'part_received'].includes(str(p.status))).flatMap(p => rows(p.lines)).filter(l => l.variantId === rule.variantId).reduce((n, l) => n + num(l.quantity) - num(l.receivedQuantity) - num(l.rejectedQuantity), 0);
                const proposed = active.filter(p => !['confirmed', 'part_received'].includes(str(p.status))).flatMap(p => rows(p.lines)).filter(l => l.variantId === rule.variantId).reduce((n, l) => n + num(l.quantity), 0);
                const deficit = num(rule.targetQuantity) - num(s.available) - incoming - proposed;
                const wanted = num(s.available) + incoming <= num(rule.reorderPoint) && deficit > 0 ? Math.ceil(Math.max(deficit, num(offer.minimumQuantity)) / num(offer.packSize)) * num(offer.packSize) : 0;
                const existing = all('suggestions', shopId).find(r => r.variantId === rule.variantId && r.warehouseId === rule.warehouseId);
                const data = {
                    variantId: rule.variantId, warehouseId: rule.warehouseId, supplierOfferId: rule.supplierOfferId, available: s.available, confirmedInbound: incoming, openProposalQuantity: proposed, suggestedQuantity: wanted, reason: 'Quy tắc min-max; đã trừ hàng đang đặt. Không phải dự báo AI.', sourceAsOf: now(), activePurchaseOrderId: active.find(p => rows(p.lines).some(l => l.variantId === rule.variantId))?.id ?? null,
                    purchaseDelegationId: rule.mode === 'auto_send' ? rule.purchaseDelegationId ?? null : null,
                    autoSendStatus: rule.mode === 'auto_send' ? (existing?.autoSendStatus || 'not_attempted') : 'not_attempted',
                    autoSendReason: rule.mode === 'auto_send' ? existing?.autoSendReason || null : null,
                };
                if (rule.mode === 'auto_send' && wanted > 0 && !data.activePurchaseOrderId) {
                    const grant = all('purchaseDelegations', shopId).find(row => row.id === rule.purchaseDelegationId);
                    const policy = all('budgets', shopId).find(row => row.id === rule.budgetPolicyId);
                    let blocked = delegationBlockReason(grant, rule, offer, policy, shopId);
                    const supplier = all('suppliers', shopId).find(row => row.id === offer.supplierId);
                    const currency = str(record(find('shops', shopId, shopId)).currency);
                    const totalUnits = units(offer.unitCost) * BigInt(wanted);
                    const total = money(totalUnits, str(record(offer.unitCost).currency));
                    const purchaseOrderId = id('purchase-order');
                    let currentPeriod = '';
                    if (!blocked && supplier?.currency !== currency) blocked = 'Tiền tệ báo giá không khớp tiền tệ cửa hàng.';
                    if (!blocked && units(total) > units(grant?.maxPerOrder)) blocked = 'Tổng đơn vượt hạn mức mỗi lần được ủy quyền.';
                    if (!blocked && policy) {
                        currentPeriod = periodKey(policy, shopId, purchaseOrderId);
                        const used = all('purchaseDelegationReservations', shopId)
                            .filter(row => row.budgetPolicyId === policy.id && row.periodKey === currentPeriod && ['reserved', 'consumed', 'unknown'].includes(str(row.status)))
                            .reduce((sum, row) => sum + units(row.amount), 0n);
                        if (used + totalUnits > units(policy.limitAmount)) blocked = 'Hạn mức ngân sách của kỳ đã chạm trần.';
                    }
                    if (blocked) {
                        data.autoSendStatus = 'blocked';
                        data.autoSendReason = blocked;
                    }
                    else if (grant && policy) {
                        const lines = [{ id: id('purchase-line'), variantId: offer.variantId, supplierOfferId: offer.id, quantity: wanted, unitCost: offer.unitCost, receivedQuantity: 0, rejectedQuantity: 0 }];
                        const intentHash = await hashValue({ supplierId: supplier?.id, warehouseId: rule.warehouseId, lines, total, purchaseDelegationId: grant.id, delegationGeneration: grant.generation, budgetPolicyVersion: policy.version, agentGeneration: grant.agentGeneration });
                        const purchase = insert('purchases', 'PurchaseOrder', shopId, {
                            id: purchaseOrderId,
                            supplierId: supplier?.id, warehouseId: rule.warehouseId, status: 'sent', lines, total, approvalId: null, intentHash,
                            externalReference: null, budgetReservationId: null, purchaseDelegationId: grant.id,
                            purchaseDelegationGeneration: grant.generation, allowedActions: ['confirm'],
                        });
                        const reservation = insert('purchaseDelegationReservations', 'PurchaseDelegationReservation', shopId, {
                            delegationId: grant.id, purchaseOrderId: purchase.id, budgetPolicyId: policy.id, budgetPolicyVersion: policy.version,
                            delegationGeneration: grant.generation, agentGeneration: grant.agentGeneration, intentHash, amount: total,
                            period: policy.period, periodKey: currentPeriod, status: 'consumed', commandId: null,
                        });
                        purchase.externalReference = `LOCAL-MOCK-${purchase.id}`;
                        purchase.budgetReservationId = reservation.id;
                        data.activePurchaseOrderId = str(purchase.id);
                        data.suggestedQuantity = 0;
                        data.autoSendStatus = 'sent';
                        data.autoSendReason = 'Đã ghi nhận trong MSW local; không gọi nhà cung cấp hoặc dịch vụ thanh toán.';
                        purchaseOrderIds.push(str(purchase.id));
                        reservationIds.push(str(reservation.id));
                        refreshBudgetCounters(policy, shopId, currentPeriod);
                    }
                }
                const suggestion = existing ? touch(Object.assign(existing, data)) : insert('suggestions', 'PurchaseSuggestion', shopId, data);
                suggestionIds.push(str(suggestion.id));
            }
            const result = command(shopId, op, { purchaseOrderIds, suggestionIds, reservationIds });
            return result;
        }
        case 'createPurchaseOrder': {
            activeWarehouse(shopId,str(body.warehouseId));
            const supplier = find('suppliers', str(body.supplierId), shopId);
            ensure(supplier.status === 'approved', 'Nhà cung cấp chưa được duyệt.');
            const currency=str(find('shops',shopId,shopId).currency);
            ensure(supplier.currency===currency,'Chưa hỗ trợ đơn mua khác đồng tiền cơ sở.',422,'CURRENCY_POLICY_REQUIRED');
            if (body.suggestionId) {
                const suggestion = find('suggestions', str(body.suggestionId), shopId);
                ensure(!suggestion.activePurchaseOrderId, 'Đề nghị đã có đơn mua.');
            }
            const lines = rows(body.lines).map(l => {
                const offer = find('offers', str(l.supplierOfferId), shopId);
                ensure(offer.supplierId === supplier.id && offer.variantId === l.variantId, 'Báo giá sai nhà cung cấp/SKU.', 422);
                ensure(record(offer.unitCost).currency === supplier.currency, 'Đơn vị tiền tệ báo giá khác nhà cung cấp.', 422);
                ensure(!offer.validUntil || Date.parse(str(offer.validUntil)) > Date.parse(now()), 'Báo giá đã hết hiệu lực.', 422);
                ensure(num(l.quantity) >= num(offer.minimumQuantity) && num(l.quantity) % num(offer.packSize) === 0, 'Số lượng không đúng MOQ/quy cách.', 422);
                return {
                    id: id('purchase-line'), variantId: l.variantId, supplierOfferId: l.supplierOfferId, quantity: l.quantity, unitCost: offer.unitCost, receivedQuantity: 0, rejectedQuantity: 0
                };
            });
            const total = money(lines.reduce((n, l) => n + units(l.unitCost) * BigInt(num(l.quantity)), 0n),currency);
            const p = insert('purchases', 'PurchaseOrder', shopId, {
                supplierId: supplier.id, warehouseId: body.warehouseId, status: 'draft', lines, total, approvalId: null, intentHash: await hashValue({ supplierId: supplier.id, warehouseId: body.warehouseId, lines, total }), externalReference: null, budgetReservationId: null, allowedActions: ['request_approval', 'cancel']
            });
            if (body.suggestionId) {
                const suggestion = find('suggestions', str(body.suggestionId), shopId);
                suggestion.activePurchaseOrderId = p.id;
                suggestion.suggestedQuantity = 0;
                touch(suggestion);
            }
            return p;
        }
        case 'requestPurchaseApproval': {
            const p = find('purchases', input.id, shopId);
            checkVersion(p, input);
            ensure(p.status === 'draft', 'Đơn không còn nháp.');
            p.status = 'pending_approval';
            touch(p);
            const approval = insert('approvals', 'Approval', shopId, {
                action: 'purchase.send', resource: { type: 'purchase_order', id: p.id }, resourceVersion: p.version, policyVersion: 'synthetic-policy-1', intentHash: p.intentHash, amount: p.total, status: 'pending', expiresAt: future(), requestedBy: input.userId, decidedBy: null, decisionReason: null
            });
            p.approvalId = approval.id;
            p.allowedActions = ['cancel'];
            return approval;
        }
        case 'decideApproval': {
            const a = find('approvals', input.id, shopId);
            checkVersion(a, input);
            ensure(a.status === 'pending' && Date.parse(str(a.expiresAt)) > Date.parse(now()), 'Phê duyệt đã hết hiệu lực.');
            ensure(a.intentHash === body.intentHash, 'Nội dung phê duyệt đã đổi.');
            const resource = record(a.resource);
            const p = resource.type === 'purchase_order' ? find('purchases', str(resource.id), shopId) : undefined;
            if (p)
                ensure(p.version === a.resourceVersion && p.intentHash === a.intentHash, 'Đơn mua đã thay đổi sau khi xin duyệt.');
            a.status = body.decision === 'approve' ? 'approved' : 'rejected';
            a.decidedBy = input.userId;
            a.decisionReason = body.reason;
            touch(a);
            if (p) {
                p.status = a.status === 'approved' ? 'approved' : 'draft';
                p.allowedActions = a.status === 'approved' ? ['send', 'cancel'] : ['request_approval', 'cancel'];
                touch(p);
                a.resourceVersion = p.version;
            }
            return a;
        }
        case 'sendPurchaseOrder': {
            const p = find('purchases', input.id, shopId);
            checkVersion(p, input);
            const a = find('approvals', str(body.approvalId), shopId);
            ensure(p.status === 'approved' && a.status === 'approved' && a.intentHash === body.intentHash && p.intentHash === body.intentHash && a.resourceVersion === p.version, 'Đơn chưa có phê duyệt đúng phiên bản.');
            ensure(Date.parse(str(a.expiresAt)) > Date.parse(now()), 'Phê duyệt hết hạn.');
            p.status = 'sent';
            p.externalReference = `MOCK-${str(p.id)}`;
            p.allowedActions = ['confirm'];
            touch(p);
            a.status = 'consumed';
            touch(a);
            return command(shopId, op, { type: 'purchase_order', id: p.id });
        }
        case 'confirmPurchaseOrder': {
            const p = find('purchases', input.id, shopId);
            checkVersion(p, input);
            ensure(p.status === 'sent', 'Đơn chưa được gửi.');
            p.status = 'confirmed';
            p.externalReference = body.externalReference;
            p.allowedActions = ['receive'];
            touch(p);
            return p;
        }
        case 'cancelPurchaseOrder': {
            const p = find('purchases', input.id, shopId);
            checkVersion(p, input);
            ensure(['draft', 'pending_approval', 'approved'].includes(str(p.status)), 'Đơn đã gửi; cần đối chiếu nhà cung cấp trước hủy.');
            p.status = 'cancelled';
            p.allowedActions = [];
            touch(p);
            return command(shopId, op, { type: 'purchase_order', id: p.id });
        }
        case 'createGoodsReceipt': {
            const p = find('purchases', str(body.purchaseOrderId), shopId);
            ensure(p.version === body.expectedPurchaseVersion, 'Đơn mua đã đổi.', 412, 'STALE_VERSION');
            ensure(['confirmed', 'part_received'].includes(str(p.status)), 'Chưa thể nhận hàng.');
            ensure(!all('receipts', shopId).some(r => r.sourceDocumentRef === body.sourceDocumentRef), 'Chứng từ nhập đã tồn tại.');
            for (const l of rows(body.lines)) {
                const line = rows(p.lines).find(x => x.id === l.purchaseLineId);
                ensure(line, 'Sai dòng mua.', 422);
                ensure(num(l.acceptedQuantity) + num(l.rejectedQuantity) > 0 && num(l.acceptedQuantity) + num(l.rejectedQuantity) <= num(line.quantity) - num(line.receivedQuantity) - num(line.rejectedQuantity), 'Lượng nhập vượt lượng còn lại.', 422);
                ensure(num(l.rejectedQuantity) === 0 || str(l.reason).trim().length > 0, 'Hàng bị từ chối cần có lý do kiểm nhận.', 422);
            }
            return insert('receipts', 'GoodsReceipt', shopId, {
                purchaseOrderId: p.id, warehouseId: p.warehouseId, status: 'draft', lines: body.lines, sourceDocumentRef: body.sourceDocumentRef
            });
        }
        case 'postGoodsReceipt': {
            const receipt = find('receipts', input.id, shopId);
            checkVersion(receipt, input);
            ensure(receipt.status === 'draft', 'Phiếu đã ghi.');
            assertOpenPeriod(shopId);
            const p = find('purchases', str(receipt.purchaseOrderId), shopId);
            let amount = 0n;
            for (const line of rows(receipt.lines)) {
                const original = rows(p.lines).find(l => l.id === line.purchaseLineId);
                ensure(original, 'Sai dòng mua.');
                ensure(num(line.acceptedQuantity) + num(line.rejectedQuantity) <= num(original.quantity) - num(original.receivedQuantity) - num(original.rejectedQuantity), 'Một phiếu khác đã nhận số hàng này.');
                const s = stockFor(shopId, str(original.variantId), str(receipt.warehouseId));
                const count = num(line.acceptedQuantity);
                const oldValue=carryingValue(s);ensure(oldValue!==null,'Tồn cũ chưa có giá vốn; cần đối chiếu trước khi tính bình quân.',409,'COST_NOT_KNOWN');
                const value = units(original.unitCost) * BigInt(count);
                const newCount = num(s.onHand) + count;
                if (count > 0) {
                    setStockValue(s,oldValue+value,newCount,str(record(original.unitCost).currency));
                    move(input, s, count, 0, 'receipt', 'Nhập hàng theo phiếu được kiểm nhận', { type: 'goods_receipt', id: receipt.id });
                }
                original.receivedQuantity = num(original.receivedQuantity) + count;
                original.rejectedQuantity = num(original.rejectedQuantity) + num(line.rejectedQuantity);
                amount += value;
            }
            if (amount > 0n) {
                postBusinessJournal(shopId,'goods_receipt',str(receipt.id),[{code:'156',debit:amount,credit:0n,description:'Hàng đã kiểm nhận'},{code:'331',debit:0n,credit:amount,description:'Phải trả nhà cung cấp'}]);
                insert('debts', 'DebtItem', shopId, {
                    counterpartyType: 'supplier', counterpartyId: p.supplierId, source: { type: 'goods_receipt', id: receipt.id }, direction: 'payable', originalAmount: money(amount,str(record(p.total).currency)), outstandingAmount: money(amount,str(record(p.total).currency)), dueAt: null, disputed: false
                });
            }
            receipt.status = 'posted';
            touch(receipt);
            p.status = rows(p.lines).every(l => num(l.receivedQuantity) + num(l.rejectedQuantity) === num(l.quantity)) ? 'received' : 'part_received';
            touch(p);
            return command(shopId, op, { type: 'goods_receipt', id: receipt.id });
        }
        default: return undefined;
    }
}
