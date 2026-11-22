import { Body, ConflictException, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { BudgetReservationStatus, Prisma, PurchaseDelegation, PurchaseDelegationReservation, SupplierOffer } from '../../generated/prisma/client.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe } from '../../http/query.js';
import { envelope, noStore, requireVersion, versionedEnvelope } from '../../http/response.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { financeMoney, financeShop, parseMoney, type Money } from '../finance/index.js';
import { budgetInShop, budgetPeriodKey, lockAutomationFence, readAutomationFence, roleInShop, roleIsReady } from '../operations/index.js';
import { requireShopAccess, type AuthConfig } from '../workspace/index.js';
import { ProcurementAccess, procurementInput, procurementKey, procurementText, requireResourceId } from './access.js';
import { requireCurrentPurchaseTerms, requirePurchaseWarehouse, type Purchase } from './purchase-data.js';
import { offerInShop, supplierInShop } from './suppliers.js';

type DelegationCreate = { agentId: string; supplierId: string; warehouseId: string; offerIds: string[]; maxPerOrder: Money; budgetPolicyId: string; expiresAt: string };
type DelegationUpdate = { expectedVersion: number; status: 'active' | 'paused' | 'revoked'; reason: string };
type Snapshot = ReturnType<typeof offerView>;

const offerView = (offer: SupplierOffer) => ({ supplierOfferId: offer.id, offerVersion: offer.version,
    unitCost: financeMoney(offer.unitCost, offer.currency), minimumQuantity: offer.minimumQuantity, packSize: offer.packSize });

export async function delegationInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    requireResourceId(id);
    const row = await tx.purchaseDelegation.findUnique({ where: procurementKey(shopId, id) });
    if (!row) throw new NotFoundException();
    return row;
}

function delegationView(row: PurchaseDelegation, now = new Date()) {
    const { currency, maxPerOrder, status, ...fields } = row;
    return { ...fields, toolId: 'purchase.send', maxPerOrder: financeMoney(maxPerOrder, currency),
        status: status !== 'revoked' && row.expiresAt <= now ? 'expired' : status };
}

function reservationView(row: PurchaseDelegationReservation) {
    const { id, shopId, version, createdAt, updatedAt, delegationId, purchaseOrderId, budgetPolicyId, budgetPolicyVersion,
        delegationGeneration, agentGeneration, intentHash, amount, currency, period, periodKey, status, commandId } = row;
    return { id, shopId, version, createdAt, updatedAt, delegationId, purchaseOrderId, budgetPolicyId, budgetPolicyVersion,
        delegationGeneration, agentGeneration, intentHash, amount: financeMoney(amount, currency), period, periodKey, status, commandId };
}

async function delegationTerms(tx: Prisma.TransactionClient, shopId: string, input: Pick<DelegationCreate, 'agentId' | 'supplierId' | 'warehouseId' | 'offerIds' | 'budgetPolicyId'>,
    now: Date, auth?: AuthConfig) {
    const shop = await financeShop(tx, shopId);
    const agent = await roleInShop(tx, shopId, input.agentId);
    const policy = await budgetInShop(tx, shopId, input.budgetPolicyId);
    if (agent.kind !== 'warehouse_buyer' || !agent.humanOwnerId || !roleIsReady(agent, shop.policyVersion, auth) ||
        policy.kind !== 'procurement' || !policy.limitAmount || !policy.approvalId || policy.currency !== shop.currency) {
        throw new ConflictException('Vai trò mua và ngân sách cần được xác minh.');
    }
    await requirePurchaseWarehouse(tx, shopId, input.warehouseId);
    const supplier = await supplierInShop(tx, shopId, input.supplierId);
    if (supplier.status !== 'approved' || supplier.currency !== shop.currency || supplier.sendMethod !== 'approved_adapter' || !supplier.approvedAdapterId ||
        !await tx.supplierDispatchRoute.findFirst({ where: { shopId, id: supplier.approvedAdapterId, enabled: true }, select: { id: true } })) {
        throw new ConflictException('Nhà cung cấp cần kênh gửi đã phê duyệt.');
    }
    const offers = [];
    for (const id of [...input.offerIds].sort()) {
        const offer = await offerInShop(tx, shopId, id);
        if (offer.supplierId !== supplier.id || offer.currency !== shop.currency || (offer.validUntil && offer.validUntil <= now)) throw new ConflictException();
        offers.push(offerView(offer));
    }
    return { shop, agent, policy, offers, ownerId: agent.humanOwnerId, limitAmount: policy.limitAmount };
}

async function requireDelegationCurrent(tx: Prisma.TransactionClient, row: PurchaseDelegation, auth: AuthConfig | undefined, now: Date) {
    const snapshots = row.offerSnapshots as Snapshot[];
    const checked = await delegationTerms(tx, row.shopId, { ...row, offerIds: snapshots.map(row => row.supplierOfferId) }, now, auth);
    if (row.expiresAt <= now || row.agentGeneration !== checked.agent.generation || row.humanOwnerId !== checked.ownerId ||
        row.budgetPolicyVersion !== checked.policy.version || row.budgetPeriod !== checked.policy.period || row.currency !== checked.shop.currency ||
        snapshots.length !== checked.offers.length || snapshots.some((offer, index) => offer.offerVersion !== checked.offers[index].offerVersion ||
            offer.unitCost.amount !== checked.offers[index].unitCost.amount || offer.unitCost.currency !== checked.offers[index].unitCost.currency ||
            offer.minimumQuantity !== checked.offers[index].minimumQuantity || offer.packSize !== checked.offers[index].packSize)) {
        throw new ConflictException('Phạm vi ủy quyền đã đổi hoặc hết hạn.');
    }
    return checked;
}

export async function requireReorderDelegation(tx: Prisma.TransactionClient, shopId: string, id: string, budgetPolicyId: string, warehouseId: string,
    supplierOfferId: string, now: Date, auth?: AuthConfig) {
    const row = await delegationInShop(tx, shopId, id);
    if (row.status !== 'active' || row.expiresAt <= now || row.budgetPolicyId !== budgetPolicyId || row.warehouseId !== warehouseId ||
        !(row.offerSnapshots as Snapshot[]).some(offer => offer.supplierOfferId === supplierOfferId)) throw new ConflictException();
    return { delegation: row, ...await requireDelegationCurrent(tx, row, auth, now) };
}

type Candidate = { shopId: string; delegationId: string; budgetPolicyId: string; warehouseId: string; supplierOfferId: string; currency: string; total: Prisma.Decimal };
export async function reserveDelegatedTerms(tx: Prisma.TransactionClient, order: Candidate, now: Date, auth?: AuthConfig) {
    const { shopId, delegationId, budgetPolicyId, warehouseId, supplierOfferId, currency, total } = order;
    const fence = await lockAutomationFence(tx, shopId);
    if (fence.paused) throw new ConflictException('Điều phối của shop đã tạm dừng.');
    await tx.$queryRaw`SELECT id FROM budget_policies WHERE shop_id=${shopId}::uuid AND id=${budgetPolicyId}::uuid FOR UPDATE`;
    const checked = await requireReorderDelegation(tx, shopId, delegationId, budgetPolicyId, warehouseId, supplierOfferId, now, auth);
    const { policy, delegation, limitAmount, shop } = checked;
    if (currency !== policy.currency || total.lte(0) || total.gt(delegation.maxPerOrder) || total.gt(limitAmount)) throw new ConflictException('Vượt hạn mức cho đơn mua.');
    const periodKey = budgetPeriodKey(policy.period, now, shop.timezone);
    if (policy.period !== 'per_order') {
        const [usage] = await tx.$queryRaw<{ spent: Prisma.Decimal }[]>`
            SELECT coalesce(sum(amount),0) AS spent FROM purchase_delegation_reservations
            WHERE shop_id=${shopId}::uuid AND budget_policy_id=${budgetPolicyId}::uuid AND currency=${currency}
              AND status IN ('reserved','consumed','unknown')
              AND left((created_at AT TIME ZONE ${shop.timezone})::date::text, ${periodKey.length})=${periodKey}
        `;
        if (new ExactDecimal(usage.spent).plus(total).gt(limitAmount)) throw new ConflictException('Đã đạt ngân sách mua trong kỳ.');
    }
    return { ...checked, shopGeneration: fence.generation, periodKey };
}

export async function requireDispatchDelegation(tx: Prisma.TransactionClient, order: Purchase, reservation: PurchaseDelegationReservation, auth?: AuthConfig,
    now = new Date()) {
    const { shopId, warehouseId, lines, supplierId } = order;
    const { delegationId, budgetPolicyId } = reservation;
    const fence = await lockAutomationFence(tx, shopId);
    if (fence.paused || fence.generation !== reservation.shopGeneration || reservation.status !== 'reserved' ||
        reservation.purchaseOrderId !== order.id || reservation.intentHash !== order.intentHash || !reservation.amount.eq(order.total) ||
        reservation.currency !== order.currency || lines.length !== 1 || !order.suggestionId) throw new ConflictException();
    await tx.$queryRaw`SELECT id FROM purchase_delegations WHERE shop_id=${shopId}::uuid AND id=${delegationId}::uuid FOR SHARE`;
    const rule = await tx.purchaseSuggestion.findUniqueOrThrow({ where: procurementKey(shopId, order.suggestionId), include: { rule: true } });
    if (!rule.rule.enabled || rule.rule.mode !== 'auto_send' || rule.ruleVersion !== rule.rule.version ||
        rule.rule.purchaseDelegationId !== delegationId || rule.rule.budgetPolicyId !== budgetPolicyId) throw new ConflictException();
    const { delegation, policy, agent, shop } = await requireReorderDelegation(tx, shopId, delegationId, budgetPolicyId, warehouseId, lines[0].supplierOfferId, now, auth);
    if (delegation.generation !== reservation.delegationGeneration || delegation.supplierId !== supplierId || agent.generation !== reservation.agentGeneration ||
        policy.version !== reservation.budgetPolicyVersion || policy.period !== reservation.period ||
        budgetPeriodKey(policy.period, now, shop.timezone, order.id) !== reservation.periodKey || order.total.gt(delegation.maxPerOrder)) throw new ConflictException();
    const stock = await tx.stockPosition.findUnique({ where: { shopId_warehouseId_variantId: { shopId, warehouseId, variantId: lines[0].variantId } } });
    if (stock && stock.onHand - stock.reserved > Math.max(rule.rule.reorderPoint, rule.rule.safetyStock)) throw new ConflictException();
    await requireCurrentPurchaseTerms(tx, order, now);
}

export async function recordReservationStatus(tx: Prisma.TransactionClient, row: PurchaseDelegationReservation, status: BudgetReservationStatus) {
    const updated = await tx.purchaseDelegationReservation.update({ where: procurementKey(row.shopId, row.id),
        data: { status, version: { increment: 1 } } });
    await enqueueResourceUpdate(tx, 'purchase_reservation.updated', updated);
    return updated;
}

export class DelegationService extends ProcurementAccess {
    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.listPage(headers, shopId, raw, 'purchase_delegations', async (tx, page) => (await tx.purchaseDelegation.findMany({
            where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1,
        })).map(row => delegationView(row)));
    }

    reservations(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.listPage(headers, shopId, raw, 'purchase_delegation_reservations', async (tx, page, scope) => {
            await requireShopAccess(tx, scope.userId, shopId, 'procurement.delegation.manage');
            return (await tx.purchaseDelegationReservation.findMany({
                where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1,
            })).map(reservationView);
        });
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: DelegationCreate, requestId: string) {
        return this.write({ headers, shopId, operationId: 'createPurchaseDelegation', payload: input, requestId }, async (tx, scope, auth) => {
            const { agentId, supplierId, warehouseId, budgetPolicyId } = input;
            const now = new Date();
            const expiresAt = new Date(input.expiresAt);
            if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now) throw new UnprocessableEntityException();
            const { shop, agent, ownerId, policy, offers, limitAmount } = await delegationTerms(tx, shopId, input, now, auth);
            const maxPerOrder = parseMoney(input.maxPerOrder, shop.currency, true);
            if (maxPerOrder.gt(limitAmount)) throw new UnprocessableEntityException();
            const row = await tx.purchaseDelegation.create({ data: { shopId, agentId, humanOwnerId: ownerId, supplierId, warehouseId,
                offerSnapshots: offers, maxPerOrder, currency: shop.currency, budgetPolicyId, budgetPolicyVersion: policy.version,
                budgetPeriod: policy.period, agentGeneration: agent.generation, expiresAt, lastChangedBy: scope.userId } });
            await enqueueResourceUpdate(tx, 'purchase_delegation.updated', row);
            return row;
        }, async (tx, id) => delegationView(await delegationInShop(tx, shopId, id)));
    }

    update(headers: IncomingHttpHeaders, shopId: string, id: string, input: DelegationUpdate, requestId: string) {
        const reason = procurementText(input.reason, 8);
        return this.write({ headers, shopId, operationId: 'updatePurchaseDelegation', payload: { id, ...input, reason }, requestId, reason }, async (tx, scope, auth) => {
            const row = await delegationInShop(tx, shopId, id);
            requireVersion(row.version, input.expectedVersion);
            if (row.status === 'revoked' || input.status === row.status) throw new ConflictException();
            if (input.status === 'active') {
                if ((await readAutomationFence(tx, shopId)).paused) throw new ConflictException();
                await requireDelegationCurrent(tx, row, auth, new Date());
            }
            const updated = await tx.purchaseDelegation.update({ where: procurementKey(shopId, id), data: {
                status: input.status, lastChangedBy: scope.userId, lastReason: reason, version: { increment: 1 }, generation: { increment: 1 },
            } });
            await enqueueResourceUpdate(tx, 'purchase_delegation.updated', updated);
            return updated;
        }, async tx => delegationView(await delegationInShop(tx, shopId, id)));
    }
}

@Controller('shops/:shopId')
export class DelegationController {
    constructor(private readonly delegations: DelegationService) {}

    @Get('purchase-delegations')
    @ContractOperation('listPurchaseDelegations')
    async list(@Param('shopId', idPipe) shopId: string, @Query() raw: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.delegations.list(request.headers, shopId, raw);
        return { ...envelope(response, data), page };
    }

    @Get('purchase-delegation-reservations')
    @ContractOperation('listPurchaseDelegationReservations')
    async reservations(@Param('shopId', idPipe) shopId: string, @Query() raw: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.delegations.reservations(request.headers, shopId, raw);
        return { ...envelope(response, data), page };
    }

    @Post('purchase-delegations')
    @ContractOperation('createPurchaseDelegation')
    async create(@Param('shopId', idPipe) shopId: string, @Body(procurementInput('PurchaseDelegationCreateRequest')) input: DelegationCreate,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.delegations.create(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Patch('purchase-delegations/:resourceId')
    @ContractOperation('updatePurchaseDelegation')
    async update(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(procurementInput('PurchaseDelegationUpdateRequest')) input: DelegationUpdate,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.delegations.update(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }
}
