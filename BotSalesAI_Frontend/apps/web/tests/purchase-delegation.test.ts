import { beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { assertSchema } from '../src/shared/api/validation';
import { db } from '../src/mocks/database';
import { CSRF, handle, resetService, setFault, setRole } from '../src/mocks/service';

let requestNumber = 0;
const headers = () => ({ 'x-csrf-token': CSRF, 'idempotency-key': `delegation-test-${++requestNumber}` });
const request = (op: string, body: Record<string, unknown> = {}, shopId = 'shop-demo', resourceId?: string) => handle({ op, path: { shopId, ...(resourceId ? { resourceId } : {}) }, body, headers: headers() });
const row = (value: unknown) => value as Record<string, unknown>;

async function activateBuyerRole() {
    await request('controlAutomation', {
        expectedVersion: 1, scope: 'role', resourceId: 'agent-2', action: 'resume', reason: 'Bật worker mô phỏng để kiểm thử có kiểm soát.',
    });
}

async function createGrant(maxAmount = '5000000', offerIds = ['offer-p1']) {
    const created = await request('createPurchaseDelegation', {
        agentId: 'agent-2', supplierId: 'supplier-01', warehouseId: 'warehouse-01', offerIds,
        maxPerOrder: { amount: maxAmount, currency: 'VND' }, budgetPolicyId: 'budget-2',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    assertSchema('PurchaseDelegation', created.data);
    return row(created.data);
}

async function activateGrant(grant: Record<string, unknown>) {
    return request('updatePurchaseDelegation', {
        expectedVersion: grant.version, status: 'active', reason: 'Đã rà soát phạm vi, giá và hạn mức.',
    }, 'shop-demo', String(grant.id));
}

async function configureAutoSendRule(grantId: string, variantId = 'v-p1', offerId = 'offer-p1', reorderPoint = 10, targetQuantity = 20) {
    const rule = db.reorderRules.find(item => item.shopId === 'shop-demo' && item.variantId === variantId && item.warehouseId === 'warehouse-01');
    if (!rule) throw new Error(`Missing ${variantId} reorder rule fixture.`);
    return request('updateReorderRule', {
        variantId, warehouseId: 'warehouse-01', supplierOfferId: offerId,
        reorderPoint, targetQuantity, safetyStock: 0, mode: 'auto_send', enabled: true,
        budgetPolicyId: 'budget-2', purchaseDelegationId: grantId, expectedVersion: rule.version,
    }, 'shop-demo', String(rule.id));
}

beforeEach(() => {
    vi.stubGlobal('crypto', webcrypto);
    resetService();
    requestNumber = 0;
});

describe('bounded purchase.send delegation', () => {
    it('creates paused grants and refuses activation while the worker role is paused', async () => {
        const grant = await createGrant();
        expect(grant.status).toBe('paused');
        await expect(activateGrant(grant)).rejects.toMatchObject({ status: 409, code: 'DELEGATION_AGENT_INACTIVE' });
    });

    it('blocks amounts above the per-order cap without creating a purchase or reservation', async () => {
        await activateBuyerRole();
        const grant = await createGrant('1');
        expect((await activateGrant(grant)).status).toBe(200);
        expect((await configureAutoSendRule(String(grant.id))).status).toBe(200);
        await request('evaluateReorder');

        const suggestion = db.suggestions.find(item => item.shopId === 'shop-demo' && item.variantId === 'v-p1' && item.warehouseId === 'warehouse-01');
        expect(suggestion?.autoSendStatus).toBe('blocked');
        expect(String(suggestion?.autoSendReason)).toContain('vượt hạn mức');
        expect(db.purchases.some(item => item.purchaseDelegationId === grant.id)).toBe(false);
        expect(db.purchaseDelegationReservations.some(item => item.delegationId === grant.id)).toBe(false);
    });

    it('serializes concurrent evaluation and retains an unknown order/reservation instead of retrying it', async () => {
        await activateBuyerRole();
        const grant = await createGrant();
        expect((await activateGrant(grant)).status).toBe(200);
        expect((await configureAutoSendRule(String(grant.id))).status).toBe(200);

        const concurrent = await Promise.all([request('evaluateReorder'), request('evaluateReorder')]);
        expect(concurrent).toHaveLength(2);
        expect(db.purchases.filter(item => item.purchaseDelegationId === grant.id)).toHaveLength(1);
        expect(db.purchaseDelegationReservations.filter(item => item.delegationId === grant.id)).toHaveLength(1);

        resetService();
        requestNumber = 0;
        await activateBuyerRole();
        const unknownGrant = await createGrant();
        expect((await activateGrant(unknownGrant)).status).toBe(200);
        expect((await configureAutoSendRule(String(unknownGrant.id))).status).toBe(200);
        setFault('unknown');
        const unknown = await request('evaluateReorder');
        expect(row(unknown.data).status).toBe('unknown');
        const purchase = db.purchases.find(item => item.purchaseDelegationId === unknownGrant.id);
        const reservation = db.purchaseDelegationReservations.find(item => item.delegationId === unknownGrant.id);
        expect(purchase?.status).toBe('unknown');
        expect(purchase?.allowedActions).toEqual(['reconcile']);
        expect(reservation?.status).toBe('unknown');
        expect(db.budgets.find(item => item.id === 'budget-2')?.reserved).toEqual(reservation?.amount);

        await request('evaluateReorder');
        expect(db.purchases.filter(item => item.purchaseDelegationId === unknownGrant.id)).toHaveLength(1);
        expect(db.purchaseDelegationReservations.filter(item => item.delegationId === unknownGrant.id)).toHaveLength(1);
    });

    it('blocks manager writes and cross-shop references, then rechecks budget and offer snapshots', async () => {
        setRole('manager');
        await expect(request('createPurchaseDelegation', { agentId: 'agent-2' })).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });

        setRole('owner');
        await expect(request('createPurchaseDelegation', {
            agentId: 'agent-2', supplierId: 'supplier-01', warehouseId: 'warehouse-01', offerIds: ['offer-p1'],
            maxPerOrder: { amount: '100000', currency: 'VND' }, budgetPolicyId: 'budget-2', expiresAt: new Date(Date.now() + 86400000).toISOString(),
        }, 'shop-second')).rejects.toMatchObject({ status: 404 });

        await activateBuyerRole();
        const grant = await createGrant();
        expect((await activateGrant(grant)).status).toBe(200);
        expect((await configureAutoSendRule(String(grant.id))).status).toBe(200);
        const policy = db.budgets.find(item => item.id === 'budget-2');
        if (!policy) throw new Error('Missing procurement budget fixture.');
        policy.version += 1;
        await request('evaluateReorder');
        const suggestion = db.suggestions.find(item => item.shopId === 'shop-demo' && item.variantId === 'v-p1' && item.warehouseId === 'warehouse-01');
        expect(suggestion?.autoSendStatus).toBe('blocked');
        expect(String(suggestion?.autoSendReason)).toContain('Ngân sách');
        expect(db.purchases.some(item => item.purchaseDelegationId === grant.id)).toBe(false);

        resetService();
        requestNumber = 0;
        await activateBuyerRole();
        const offerGrant = await createGrant();
        await activateGrant(offerGrant);
        await configureAutoSendRule(String(offerGrant.id));
        const offer = db.offers.find(item => item.id === 'offer-p1');
        if (!offer) throw new Error('Missing supplier offer fixture.');
        offer.version += 1;
        await request('evaluateReorder');
        const changedOfferSuggestion = db.suggestions.find(item => item.shopId === 'shop-demo' && item.variantId === 'v-p1' && item.warehouseId === 'warehouse-01');
        expect(changedOfferSuggestion?.autoSendStatus).toBe('blocked');
        expect(String(changedOfferSuggestion?.autoSendReason)).toContain('báo giá');
        expect(db.purchases.some(item => item.purchaseDelegationId === offerGrant.id)).toBe(false);
    });

    it('does not reactivate a revoked grant', async () => {
        await activateBuyerRole();
        const grant = await createGrant();
        const activated = row((await activateGrant(grant)).data);
        const revoked = await request('updatePurchaseDelegation', {
            expectedVersion: activated.version, status: 'revoked', reason: 'Chủ shop thu hồi sau khi rà soát phạm vi.',
        }, 'shop-demo', String(activated.id));
        const revokedRow = row(revoked.data);
        await expect(request('updatePurchaseDelegation', {
            expectedVersion: revokedRow.version, status: 'active', reason: 'Thử kích hoạt lại ủy quyền cũ.',
        }, 'shop-demo', String(revokedRow.id))).rejects.toMatchObject({ status: 409, code: 'DELEGATION_TERMINAL' });
    });

    it('rechecks agent generation and refuses a new order after the role is paused', async () => {
        await activateBuyerRole();
        const grant = await createGrant();
        await activateGrant(grant);
        await configureAutoSendRule(String(grant.id));
        const agent = db.agentRoles.find(item => item.id === 'agent-2');
        if (!agent) throw new Error('Missing buyer role fixture.');
        await request('controlAutomation', {
            expectedVersion: agent.version, scope: 'role', resourceId: agent.id, action: 'pause', reason: 'Tạm dừng trước khi worker gửi đơn mới.',
        });
        await request('evaluateReorder');
        const suggestion = db.suggestions.find(item => item.shopId === 'shop-demo' && item.variantId === 'v-p1' && item.warehouseId === 'warehouse-01');
        expect(suggestion?.autoSendStatus).toBe('blocked');
        expect(String(suggestion?.autoSendReason)).toContain('đang tạm dừng');
        expect(db.purchases.some(item => item.purchaseDelegationId === grant.id)).toBe(false);
        const currentGrant = db.purchaseDelegations.find(item => item.id === grant.id);
        if (!currentGrant) throw new Error('Missing grant after role pause.');
        await expect(request('updatePurchaseDelegation', {
            expectedVersion: currentGrant.version, status: 'active', reason: 'Thử giữ quyền sau khi agent đổi thế hệ.',
        }, 'shop-demo', String(currentGrant.id))).rejects.toMatchObject({ status: 409, code: 'DELEGATION_AGENT_CHANGED' });
    });

    it('reserves the period budget atomically across different SKU rules', async () => {
        await activateBuyerRole();
        const grant = await createGrant('4900000', ['offer-p1', 'offer-p8']);
        await activateGrant(grant);
        await configureAutoSendRule(String(grant.id), 'v-p1', 'offer-p1', 10, 20);
        await configureAutoSendRule(String(grant.id), 'v-p8', 'offer-p8', 3, 20);
        await request('evaluateReorder');

        expect(db.purchases.filter(item => item.purchaseDelegationId === grant.id)).toHaveLength(1);
        const secondSku = db.suggestions.find(item => item.shopId === 'shop-demo' && item.variantId === 'v-p8' && item.warehouseId === 'warehouse-01');
        expect(secondSku?.autoSendStatus).toBe('blocked');
        expect(String(secondSku?.autoSendReason)).toContain('Hạn mức ngân sách');
        const policy = db.budgets.find(item => item.id === 'budget-2');
        expect(policy?.consumed).toEqual(db.purchaseDelegationReservations.find(item => item.delegationId === grant.id)?.amount);
    });
});
