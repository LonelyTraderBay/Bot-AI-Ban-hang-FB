import { Body, ConflictException, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { PromotionStatus } from '../../generated/prisma/enums.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging, validUuid } from '../../http/query.js';
import { envelope, noStore, requireIfMatch, requireVersion, versionedEnvelope } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { allocateAmountByValue, ExactDecimal, proportionalAmount } from '../../platform/money/index.js';
import { sellableStockPositions } from '../inventory/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig } from '../workspace/index.js';
import { sellableVariants } from './catalog-service.js';

type Component = { variantId: string; quantity: number };
type PromotionDraft = { name: string; startsOn: string; endsOn: string; lines: Component[]; discountAmount: string; minMarginPercent: number };
type PromotionDecision = { action: 'activate' | 'pause'; reason: string };
type OrderPromotion = { id: string; version: number; name: string; discount: { amount: string; currency: string } };
type EligibleLine = Component & { unitPrice: Prisma.Decimal };
type Action = 'createPromotion' | 'updatePromotion' | 'decidePromotion';
const draftBody = new SchemaPipe(validator.compile(schemaFromContract('PromotionDraft')));
const decisionBody = new SchemaPipe(validator.compile(schemaFromContract('PromotionDecision')));
const resourceType = 'promotion';
export const promotionCommands = ['createPromotion', 'updatePromotion', 'decidePromotion'].map(operationId => ({ operationId, resourceType }));
const key = (shopId: string, id: string) => ({ shopId_id: { shopId, id } });
const visible = { lines: { orderBy: { position: 'asc' }, select: { variantId: true, quantity: true, sku: true, label: true } } } satisfies Prisma.PromotionInclude;
type Promotion = Prisma.PromotionGetPayload<{ include: typeof visible }>;

function dateInShop(timeZone: string, instant = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
    const part = (name: string) => parts.find(entry => entry.type === name)?.value;
    return new Date(part('year') + '-' + part('month') + '-' + part('day') + 'T00:00:00.000Z');
}

function promotionView({ startsOn, endsOn, discountAmount, ...promotion }: Promotion) {
    return { ...promotion, startsOn: startsOn.toISOString().slice(0, 10), endsOn: endsOn.toISOString().slice(0, 10),
        discountAmount: discountAmount.toFixed() };
}

async function promotionInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    return tx.promotion.findUnique({ where: key(shopId, id), include: visible });
}

function calendarDate(value: string) {
    const date = new Date(value + 'T00:00:00.000Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new UnprocessableEntityException();
    return date;
}

async function checkedComponents(tx: Prisma.TransactionClient, shopId: string, components: Component[]) {
    const ids = components.map(line => line.variantId);
    if (ids.length < 2 || new Set(ids).size !== ids.length || ids.some(id => !validUuid(id))) throw new UnprocessableEntityException();
    const variants = new Map((await sellableVariants(tx, shopId, ids)).map(variant => [variant.id, variant]));
    return components.map(({ variantId, quantity }, position) => {
        const variant = variants.get(variantId);
        if (!variant) throw new UnprocessableEntityException();
        return { variantId, quantity, position, sku: variant.sku, label: variant.product.name + ' · ' + variant.name };
    });
}

async function checkedDraft(tx: Prisma.TransactionClient, shopId: string, draft: PromotionDraft) {
    const name = draft.name.trim();
    const startsOn = calendarDate(draft.startsOn);
    const endsOn = calendarDate(draft.endsOn);
    const discountAmount = new ExactDecimal(draft.discountAmount);
    if (!name || name.includes(String.fromCharCode(0)) || endsOn < startsOn || !discountAmount.gt(0)) throw new UnprocessableEntityException();
    return { values: { name, startsOn, endsOn, discountAmount, minMarginPercent: draft.minMarginPercent },
        lines: await checkedComponents(tx, shopId, draft.lines) };
}

export async function evaluateOrderPromotion(tx: Prisma.TransactionClient, input: {
    shopId: string; warehouseId: string; promotionId: string; timezone: string; currency: string; lines: EligibleLine[]; now: Date;
}): Promise<{ snapshot: OrderPromotion; reductions: Map<string, Prisma.Decimal> }> {
    const { shopId, promotionId, timezone, currency, warehouseId } = input;
    if (!validUuid(promotionId)) throw new UnprocessableEntityException();
    const promotion = await promotionInShop(tx, shopId, promotionId);
    if (!promotion) throw new UnprocessableEntityException();
    const today = dateInShop(timezone, input.now);
    if (promotion.status !== 'active' || today < promotion.startsOn || today > promotion.endsOn) throw new ConflictException();
    const items = new Map(input.lines.map(line => [line.variantId, line]));
    const stock = new Map((await sellableStockPositions(tx, shopId, warehouseId, promotion.lines.map(line => line.variantId)))
        .map(position => [position.variantId, position]));
    const matched = promotion.lines.map(line => {
        const ordered = items.get(line.variantId);
        if (!ordered || ordered.quantity < line.quantity) throw new UnprocessableEntityException();
        const position = stock.get(line.variantId);
        if (!position || position.onHand - position.reserved < ordered.quantity || !position.carryingValue.gt(0)) throw new ConflictException();
        return {
            variantId: line.variantId,
            gross: new ExactDecimal(ordered.unitPrice).mul(line.quantity),
            cost: proportionalAmount(position.carryingValue, line.quantity, position.onHand),
        };
    });
    const gross = matched.reduce((sum, line) => sum.plus(line.gross), new ExactDecimal(0));
    const cost = matched.reduce((sum, line) => sum.plus(line.cost), new ExactDecimal(0));
    const net = gross.minus(promotion.discountAmount);
    if (!net.gt(0) || net.minus(cost).mul(100).lt(net.mul(promotion.minMarginPercent))) throw new ConflictException();
    const shares = allocateAmountByValue(promotion.discountAmount, matched.map(line => line.gross));
    return {
        snapshot: { id: promotion.id, version: promotion.version, name: promotion.name,
            discount: { amount: promotion.discountAmount.toFixed(), currency } },
        reductions: new Map(matched.map((line, index) => [line.variantId, shares[index]])),
    };
}

export class PromotionsService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    list(headers: IncomingMessage['headers'], shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'catalog.read');
            const query = listQuery(raw, 'promotions');
            if (query.status && !Object.hasOwn(PromotionStatus, query.status)) throw new UnprocessableEntityException();
            const page = paging(query, ['promotions', shopId, userId, String(scope.permissionVersion), query.effective ?? '']);
            const { timezone } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { timezone: true } });
            const today = dateInShop(timezone);
            const effective = query.effective === 'yes' ? { status: 'active' as const, startsOn: { lte: today }, endsOn: { gte: today } } : {};
            const search = page.keyword ? { OR: [
                { name: { contains: page.keyword, mode: 'insensitive' as const } },
                ...(query.q && validUuid(query.q) ? [{ id: query.q }] : []),
            ] } : {};
            const result = page.result(await tx.promotion.findMany({
                where: {
                    shopId, status: query.status as PromotionStatus | undefined,
                    AND: [effective, search, page.after ?? {}],
                },
                orderBy: page.orderBy, take: page.limit + 1,
                include: visible,
            }));
            return { ...result, data: result.data.map(promotionView) };
        });
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: PromotionDraft, requestId: string) {
        return this.change(headers, shopId, 'createPromotion', input, requestId, async tx => {
            const { values, lines } = await checkedDraft(tx, shopId, input);
            return tx.promotion.create({ data: { shopId, ...values, lines: { createMany: { data: lines } } } });
        });
    }

    update(headers: IncomingHttpHeaders, shopId: string, id: string, input: PromotionDraft, requestId: string) {
        const version = requireIfMatch(headers);
        return this.change(headers, shopId, 'updatePromotion', { id, input, version }, requestId, async tx => {
            const current = await promotionInShop(tx, shopId, id);
            if (!current) throw new NotFoundException();
            requireVersion(current.version, version);
            if (current.status === 'active') throw new ConflictException();
            const { values, lines } = await checkedDraft(tx, shopId, input);
            await tx.promotionLine.deleteMany({ where: { shopId, promotionId: id } });
            await tx.promotionLine.createMany({ data: lines.map(line => ({ ...line, shopId, promotionId: id })) });
            return tx.promotion.update({
                where: key(shopId, id), data: { ...values, status: 'draft', version: { increment: 1 } },
            });
        });
    }

    decide(headers: IncomingHttpHeaders, shopId: string, id: string, input: PromotionDecision, requestId: string) {
        const version = requireIfMatch(headers);
        const reason = input.reason.trim();
        if (reason.length < 5 || reason.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
        return this.change(headers, shopId, 'decidePromotion', { id, input, version }, requestId, async tx => {
            const current = await promotionInShop(tx, shopId, id);
            if (!current) throw new NotFoundException();
            requireVersion(current.version, version);
            const activate = input.action === 'activate';
            if (activate === (current.status === 'active')) throw new ConflictException();
            if (activate) {
                const { timezone } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { timezone: true } });
                if (current.endsOn < dateInShop(timezone) || !current.discountAmount.gt(0)) throw new ConflictException();
                await checkedComponents(tx, shopId, current.lines);
            }
            return tx.promotion.update({
                where: key(shopId, id), data: { status: activate ? 'active' : 'paused', version: { increment: 1 } },
            });
        }, reason);
    }

    private change(headers: IncomingHttpHeaders, shopId: string, operationId: Action, payload: Prisma.InputJsonValue, requestId: string,
        apply: (tx: Prisma.TransactionClient) => Promise<{ id: string; version: number; status: string }>, reason?: string) {
        const permission = operationId === 'decidePromotion' ? 'shop.manage' : 'catalog.write';
        return writeShopCommand(this.db, this.config, { headers, shopId, operationId, permission, payload }, async (tx, scope) => {
            const promo = await apply(tx);
            await recordAudit(tx, { shopId, actorId: scope.userId, action: operationId, requestId,
                resourceType, resourceId: promo.id, metadata: { version: promo.version, status: promo.status, ...(reason ? { reason } : {}) } });
            return { type: resourceType, id: promo.id };
        }, async (tx, _scope, result) => {
            const promotion = await promotionInShop(tx, shopId, result.id);
            if (!promotion) throw new NotFoundException();
            return promotionView(promotion);
        });
    }
}

@Controller('shops/:shopId/promotions')
export class PromotionsController {
    constructor(private readonly promotions: PromotionsService) {}

    @Get()
    @ContractOperation('listPromotions')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.promotions.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Post()
    @ContractOperation('createPromotion')
    async create(@Param('shopId', idPipe) shopId: string, @Body(draftBody) input: PromotionDraft,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.promotions.create(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Patch(':resourceId')
    @ContractOperation('updatePromotion')
    async update(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(draftBody) input: PromotionDraft,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.promotions.update(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }

    @Patch(':resourceId/decision')
    @ContractOperation('decidePromotion')
    async decide(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(decisionBody) input: PromotionDecision,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.promotions.decide(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }
}
