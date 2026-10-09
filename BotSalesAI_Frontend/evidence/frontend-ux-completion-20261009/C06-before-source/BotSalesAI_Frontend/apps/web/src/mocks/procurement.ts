import { all, find, insert, ensure, checkVersion, touch, command, str, num, rows, record, now, future, id, stockFor, move, units, money, zero, assertOpenPeriod } from './database';
import type { Input, Row } from './database';
import { hashValue } from './orders';
import { activeWarehouse } from './masters';
export async function procurement(op: string, input: Input): Promise<Row | undefined> {
    const { shopId, body } = input;
    switch (op) {
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
            find('offers', str(body.supplierOfferId), shopId);
            ensure(num(body.targetQuantity) >= num(body.reorderPoint), 'Mức nhập tới phải >= điểm nhập lại.', 422);
            if (body.mode === 'auto_send') {
                ensure(body.budgetPolicyId, 'Tự gửi đơn cần chính sách ngân sách được duyệt.', 422);
                const policy = find('budgets', str(body.budgetPolicyId), shopId);
                ensure(policy.kind === 'procurement' && policy.enabled && !!policy.limitAmount, 'Tự gửi chỉ dùng chính sách ngân sách mua hàng đang bật và có hạn mức.', 422);
            }
            const { expectedVersion, ...data } = body;
            void expectedVersion;
            if (op === 'createReorderRule')
                return insert('reorderRules', 'ReorderRule', shopId, data);
            const rule = find('reorderRules', input.id, shopId);
            checkVersion(rule, input);
            return touch(Object.assign(rule, data));
        }
        case 'evaluateReorder': {
            for (const rule of all('reorderRules', shopId).filter(r => r.enabled)) {
                const s = stockFor(shopId, str(rule.variantId), str(rule.warehouseId));
                const offer = find('offers', str(rule.supplierOfferId), shopId);
                const active = all('purchases', shopId).filter(p => p.warehouseId === rule.warehouseId && !['cancelled', 'received'].includes(str(p.status)));
                const incoming = active.filter(p => ['confirmed', 'part_received'].includes(str(p.status))).flatMap(p => rows(p.lines)).filter(l => l.variantId === rule.variantId).reduce((n, l) => n + num(l.quantity) - num(l.receivedQuantity) - num(l.rejectedQuantity), 0);
                const proposed = active.filter(p => !['confirmed', 'part_received'].includes(str(p.status))).flatMap(p => rows(p.lines)).filter(l => l.variantId === rule.variantId).reduce((n, l) => n + num(l.quantity), 0);
                const deficit = num(rule.targetQuantity) - num(s.available) - incoming - proposed;
                const wanted = num(s.available) + incoming <= num(rule.reorderPoint) && deficit > 0 ? Math.ceil(Math.max(deficit, num(offer.minimumQuantity)) / num(offer.packSize)) * num(offer.packSize) : 0;
                const data = {
                    variantId: rule.variantId, warehouseId: rule.warehouseId, supplierOfferId: rule.supplierOfferId, available: s.available, confirmedInbound: incoming, openProposalQuantity: proposed, suggestedQuantity: wanted, reason: 'Quy tắc min-max; đã trừ hàng đang đặt. Không phải dự báo AI.', sourceAsOf: now(), activePurchaseOrderId: active.find(p => rows(p.lines).some(l => l.variantId === rule.variantId))?.id ?? null
                };
                const existing = all('suggestions', shopId).find(r => r.variantId === rule.variantId && r.warehouseId === rule.warehouseId);
                if (existing)
                    touch(Object.assign(existing, data));
                else
                    insert('suggestions', 'PurchaseSuggestion', shopId, data);
            }
            return command(shopId, op, null);
        }
        case 'createPurchaseOrder': {
            activeWarehouse(shopId,str(body.warehouseId));
            const supplier = find('suppliers', str(body.supplierId), shopId);
            ensure(supplier.status === 'approved', 'Nhà cung cấp chưa được duyệt.');
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
            const total = money(lines.reduce((n, l) => n + units(l.unitCost) * BigInt(num(l.quantity)), 0n));
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
                const oldValue = s.unitCost ? units(s.unitCost) * BigInt(num(s.onHand)) : 0n;
                const value = units(original.unitCost) * BigInt(count);
                const newCount = num(s.onHand) + count;
                if (count > 0) {
                    s.unitCost = money((oldValue + value) / BigInt(newCount));
                    move(input, s, count, 0, 'receipt', 'Nhập hàng theo phiếu được kiểm nhận', { type: 'goods_receipt', id: receipt.id });
                }
                original.receivedQuantity = num(original.receivedQuantity) + count;
                original.rejectedQuantity = num(original.rejectedQuantity) + num(line.rejectedQuantity);
                amount += value;
            }
            const period = assertOpenPeriod(shopId);
            if (amount > 0n) {
                insert('journals', 'Journal', shopId, {
                    sourceType: 'goods_receipt', sourceId: receipt.id, status: 'posted', effectiveDate: now().slice(0, 10), periodId: period.id, policyVersion: 'synthetic-policy-1', lines: [{ accountId: 'inventory', debit: money(amount), credit: zero(), description: 'Hàng đã nhận' }, { accountId: 'accounts_payable', debit: zero(), credit: money(amount), description: 'Phải trả nhà cung cấp' }], reversalOf: null
                });
                insert('debts', 'DebtItem', shopId, {
                    counterpartyType: 'supplier', counterpartyId: p.supplierId, source: { type: 'goods_receipt', id: receipt.id }, direction: 'payable', originalAmount: money(amount), outstandingAmount: money(amount), dueAt: null, disputed: false
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
