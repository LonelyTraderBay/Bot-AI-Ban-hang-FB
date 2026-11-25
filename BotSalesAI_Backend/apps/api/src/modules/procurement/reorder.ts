import { Body, ConflictException, Controller, Get, HttpCode, NotFoundException, Param, Post, Put, Query, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Prisma, PrismaClient, ReorderMode } from '../../generated/prisma/client.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe } from '../../http/query.js';
import { envelope, noStore, requireVersion, versionedEnvelope } from '../../http/response.js';
import { commandDto } from '../../platform/commands/index.js';
import { serializable } from '../../platform/database/transactions.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import type { AuthConfig } from '../workspace/index.js';
import { ProcurementAccess, procurementInput, procurementKey, quantity, requireResourceId } from './access.js';
import { queueDelegatedPurchase } from './auto-reorder.js';
import { delegationInShop, requireReorderDelegation } from './delegations.js';
import { openPurchases, receiving, remainingToReceive, requirePurchaseWarehouse } from './purchase-data.js';
import { purchaseFixtureEnabled } from './purchases.js';
import { offerInShop } from './suppliers.js';

type Rule = { variantId: string; warehouseId: string; supplierOfferId: string; reorderPoint: number; targetQuantity: number; safetyStock: number;
    mode: ReorderMode; enabled: boolean; budgetPolicyId: string | null; purchaseDelegationId?: string | null };
type VersionedRule = Rule & { expectedVersion: number };
const suggestions = {
    rule: { select: { purchaseDelegationId: true } },
    purchases: { where: { status: { in: [...openPurchases] } }, select: { id: true, budgetReservations: {
        where: { status: { not: 'released' } }, select: { status: true }, orderBy: { createdAt: 'desc' }, take: 1,
    } }, orderBy: { createdAt: 'desc' }, take: 1 },
} satisfies Prisma.PurchaseSuggestionInclude;

async function ruleInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    requireResourceId(id);
    const rule = await tx.reorderRule.findUnique({ where: procurementKey(shopId, id) });
    if (!rule) throw new NotFoundException();
    return rule;
}

function suggestionView(row: Prisma.PurchaseSuggestionGetPayload<{ include: typeof suggestions }>) {
    const { shopId, id, version, createdAt, updatedAt, variantId, warehouseId, supplierOfferId,
        available, confirmedInbound, openProposalQuantity, suggestedQuantity, reason, sourceAsOf, autoSendReason } = row;
    const reservation = row.purchases[0]?.budgetReservations[0];
    const autoSendStatus = reservation?.status === 'consumed' ? 'sent' : reservation?.status === 'unknown' ? 'unknown' :
        autoSendReason ? 'blocked' : 'not_attempted';
    return { shopId, id, version, createdAt, updatedAt, variantId, warehouseId, supplierOfferId, available, confirmedInbound,
        openProposalQuantity, suggestedQuantity, reason, sourceAsOf, activePurchaseOrderId: row.purchases[0]?.id ?? null,
        purchaseDelegationId: row.rule.purchaseDelegationId, autoSendStatus, autoSendReason };
}

async function checkedRule(tx: Prisma.TransactionClient, shopId: string, input: Rule, auth: AuthConfig, id?: string) {
    const { budgetPolicyId, purchaseDelegationId = null } = input;
    if (input.mode === 'auto_send') {
        if (!id || !budgetPolicyId || !purchaseDelegationId) throw new UnprocessableEntityException('Cần lưu quy tắc trước khi bổ sung ủy quyền tự gửi.');
        if (input.enabled) await requireReorderDelegation(tx, shopId, purchaseDelegationId, budgetPolicyId, input.warehouseId, input.supplierOfferId, new Date(), auth);
        else if ((await delegationInShop(tx, shopId, purchaseDelegationId)).budgetPolicyId !== budgetPolicyId) throw new UnprocessableEntityException();
    } else if (budgetPolicyId !== null || purchaseDelegationId) {
        throw new UnprocessableEntityException();
    }
    const { variantId, warehouseId, supplierOfferId, mode, enabled } = input;
    const reorderPoint = quantity(input.reorderPoint);
    const targetQuantity = quantity(input.targetQuantity);
    const safetyStock = quantity(input.safetyStock);
    if (targetQuantity < Math.max(reorderPoint, safetyStock)) throw new UnprocessableEntityException();
    await requirePurchaseWarehouse(tx, shopId, warehouseId);
    const offer = await offerInShop(tx, shopId, supplierOfferId);
    if (offer.variantId !== variantId) throw new UnprocessableEntityException();
    if (await tx.reorderRule.findFirst({
        where: { shopId, variantId, warehouseId, id: id ? { not: id } : undefined }, select: { id: true },
    })) throw new ConflictException();
    return {
        variantId, warehouseId, supplierOfferId, reorderPoint, targetQuantity, safetyStock, mode, enabled, budgetPolicyId, purchaseDelegationId,
    };
}

const position = (warehouseId: string, variantId: string) => warehouseId + ':' + variantId;

async function evaluate(tx: Prisma.TransactionClient, shopId: string, at: Date, auth?: AuthConfig, automaticOnly = false) {
    const rules = await tx.reorderRule.findMany({
        where: { shopId, enabled: true, ...(automaticOnly ? { mode: 'auto_send' } : {}) }, include: { warehouse: { select: { status: true } },
            variant: { select: { archivedAt: true, product: { select: { status: true } } } },
            offer: { include: { supplier: { select: { status: true, currency: true } } } } },
        orderBy: [{ warehouseId: 'asc' }, { variantId: 'asc' }],
    });
    const pairs = rules.map(({ warehouseId, variantId }) => ({ warehouseId, variantId }));
    if (!pairs.length) return 0;
    const currency = (await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { currency: true } })).currency;
    const stock = await tx.stockPosition.findMany({
        where: { shopId, OR: pairs }, select: { warehouseId: true, variantId: true, onHand: true, reserved: true },
    });
    const availableByPosition = new Map(stock.map(row => [position(row.warehouseId, row.variantId), row.onHand - row.reserved]));
    const activeLines = await tx.purchaseOrderLine.findMany({
        where: { shopId, variantId: { in: [...new Set(pairs.map(row => row.variantId))] },
            purchaseOrder: { status: { in: [...openPurchases] }, warehouseId: { in: [...new Set(pairs.map(row => row.warehouseId))] } } },
        select: { variantId: true, quantity: true, receivedQuantity: true, rejectedQuantity: true,
            purchaseOrder: { select: { status: true, warehouseId: true } } },
    });
    const totals = new Map<string, { confirmedInbound: number; openProposalQuantity: number }>();
    const receivingStatuses = new Set<string>(receiving);
    for (const line of activeLines) {
        const key = position(line.purchaseOrder.warehouseId, line.variantId);
        const total = totals.get(key) ?? { confirmedInbound: 0, openProposalQuantity: 0 };
        if (receivingStatuses.has(line.purchaseOrder.status)) total.confirmedInbound += remainingToReceive(line);
        else total.openProposalQuantity += remainingToReceive(line);
        totals.set(key, total);
    }
    for (const rule of rules) {
        const { variantId, warehouseId, supplierOfferId, offer, reorderPoint, targetQuantity, safetyStock } = rule;
        const sign = position(warehouseId, variantId);
        const available = availableByPosition.get(sign) ?? 0;
        const { confirmedInbound, openProposalQuantity } = totals.get(sign) ?? { confirmedInbound: 0, openProposalQuantity: 0 };
        const current = available + confirmedInbound;
        const deficit = targetQuantity - current - openProposalQuantity;
        const validSource = rule.warehouse.status === 'active' && !rule.variant.archivedAt && rule.variant.product.status !== 'archived' &&
            offer.supplier.status === 'approved' && offer.supplier.currency === currency && offer.currency === currency &&
            (!offer.validUntil || offer.validUntil > at);
        const wanted = validSource && current <= Math.max(reorderPoint, safetyStock) && deficit > 0
            ? Math.ceil(Math.max(deficit, offer.minimumQuantity) / offer.packSize) * offer.packSize : 0;
        const values = {
            ruleId: rule.id, ruleVersion: rule.version, supplierOfferId, available,
            confirmedInbound: Math.min(confirmedInbound, 2147483647), openProposalQuantity: Math.min(openProposalQuantity, 2147483647),
            suggestedQuantity: wanted <= 2147483647 ? wanted : 0, sourceAsOf: at,
            ...(rule.mode !== 'auto_send' || wanted > 0 ? { autoSendReason: null } : {}),
            reason: !validSource ? 'Kho, SKU hoặc báo giá chưa đủ điều kiện' : wanted > 2147483647 ?
                'Số lượng theo quy cách vượt khả năng ghi nhận' : 'Quy tắc min-max theo tồn khả dụng, hàng đã xác nhận và đơn mua đang mở.',
        };
        const stored = await tx.purchaseSuggestion.upsert({
            where: { shopId_warehouseId_variantId: { shopId, warehouseId, variantId } },
            create: { shopId, warehouseId, variantId, ...values }, update: { ...values, version: { increment: 1 } },
        });
        await enqueueResourceUpdate(tx, 'purchase_suggestion.updated', stored);
        if (rule.mode === 'auto_send' && stored.suggestedQuantity > 0) await queueDelegatedPurchase(tx, rule, stored, offer, at, auth);
    }
    return rules.length;
}

export async function evaluateAutomaticReorder(db: PrismaClient, auth?: AuthConfig, now = new Date()) {
    if (!purchaseFixtureEnabled(auth)) return;
    const threshold = new Date(now.getTime() - 60000);
    const shops = await db.reorderRule.findMany({ where: { enabled: true, mode: 'auto_send', suggestions: { none: { sourceAsOf: { gt: threshold } } } },
        select: { shopId: true }, distinct: ['shopId'], orderBy: { shopId: 'asc' }, take: 20 });
    for (const { shopId } of shops) await serializable(db, tx => evaluate(tx, shopId, now, auth, true), true);
}

export class ReorderService extends ProcurementAccess {
    rules(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.listPage(headers, shopId, raw, 'reorder-rules', (tx, page) => tx.reorderRule.findMany({
            where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1,
        }));
    }

    rule(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, tx => ruleInShop(tx, shopId, id));
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: Rule, requestId: string) {
        return this.write({ headers, shopId, operationId: 'createReorderRule', payload: input, requestId }, async (tx, _scope, auth) =>
            tx.reorderRule.create({ data: { shopId, ...await checkedRule(tx, shopId, input, auth) } }), (tx, id) => ruleInShop(tx, shopId, id));
    }

    update(headers: IncomingHttpHeaders, shopId: string, id: string, input: VersionedRule, requestId: string) {
        return this.write({ headers, shopId, operationId: 'updateReorderRule', payload: { id, input }, requestId }, async (tx, _scope, auth) => {
            const current = await ruleInShop(tx, shopId, id);
            requireVersion(current.version, input.expectedVersion);
            const values = await checkedRule(tx, shopId, input, auth, id);
            return tx.reorderRule.update({ where: procurementKey(shopId, id), data: { ...values, version: { increment: 1 } } });
        }, tx => ruleInShop(tx, shopId, id));
    }

    listSuggestions(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.listPage(headers, shopId, raw, 'purchase-suggestions', async (tx, page) => (await tx.purchaseSuggestion.findMany({
            where: { shopId, rule: { enabled: true }, ...page.after }, orderBy: page.orderBy, take: page.limit + 1, include: suggestions,
        })).map(suggestionView));
    }

    getSuggestion(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async tx => {
            requireResourceId(id);
            const row = await tx.purchaseSuggestion.findUnique({ where: procurementKey(shopId, id), include: suggestions });
            if (!row) throw new NotFoundException();
            return suggestionView(row);
        });
    }

    evaluate(headers: IncomingHttpHeaders, shopId: string, requestId: string) {
        return this.write({ headers, shopId, operationId: 'evaluateReorder', payload: {}, requestId }, async (tx, _scope, auth, command) => {
            const at = new Date();
            const ruleCount = await evaluate(tx, shopId, at, auth);
            await tx.reorderEvaluation.create({ data: { shopId, id: command.id, evaluatedAt: at, ruleCount } });
            return { id: command.id, version: 1 };
        }, async (_tx, _id, _scope, command) => commandDto(command, 'reorder_evaluation'));
    }
}

@Controller('shops/:shopId')
export class ReorderController {
    constructor(private readonly reorder: ReorderService) {}

    @Get('reorder-rules')
    @ContractOperation('listReorderRules')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.reorder.rules(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('reorder-rules/:resourceId')
    @ContractOperation('getReorderRule')
    async get(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.reorder.rule(request.headers, shopId, id));
    }

    @Post('reorder-rules')
    @ContractOperation('createReorderRule')
    async create(@Param('shopId', idPipe) shopId: string, @Body(procurementInput('ReorderRuleCreate')) input: Rule,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.reorder.create(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Put('reorder-rules/:resourceId')
    @ContractOperation('updateReorderRule')
    async update(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(procurementInput('ReorderRuleWrite')) input: VersionedRule,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.reorder.update(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }

    @Get('purchase-suggestions')
    @ContractOperation('listPurchaseSuggestions')
    async listSuggestions(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.reorder.listSuggestions(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('purchase-suggestions/:resourceId')
    @ContractOperation('getPurchaseSuggestion')
    async getSuggestion(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.reorder.getSuggestion(request.headers, shopId, id));
    }

    @Post('purchase-suggestions/evaluate')
    @HttpCode(202)
    @ContractOperation('evaluateReorder')
    async evaluate(@Param('shopId', idPipe) shopId: string, @Req() request: IncomingMessage,
        @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.reorder.evaluate(request.headers, shopId, String(response.getHeader('X-Request-Id'))));
    }
}
