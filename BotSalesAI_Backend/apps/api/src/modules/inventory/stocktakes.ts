import { Body, ConflictException, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Prisma, PrismaClient, StocktakeStatus } from '../../generated/prisma/client.js';
import { StocktakeStatus as States } from '../../generated/prisma/enums.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging, validUuid } from '../../http/query.js';
import { envelope, noStore, requireIfMatch, requireVersion, versionedEnvelope } from '../../http/response.js';
import { ExactDecimal, proportionalAmount } from '../../platform/money/index.js';
import { bookBusinessPairs, financeShop, localAccountingDate, lockOpenPeriod } from '../finance/index.js';
import { readAsSession, requireShopAccess, type AuthConfig } from '../workspace/index.js';
import { distinctVariants, requireActiveWarehouses, stockInput, stockKey, stockReason, variantSkus, writeInventoryDocument } from './stock-commands.js';
import { recordStockMovement } from './stock.js';

type Draft = { warehouseId: string; variantIds: string[]; reason: string };
type Update = { action: 'count' | 'submit' | 'rebase' | 'cancel'; counts?: { variantId: string; counted: number }[]; reason?: string };
type Review = { reason: string };
const details = { lines: { orderBy: { position: 'asc' } } } satisfies Prisma.StocktakeInclude;
type Stocktake = Prisma.StocktakeGetPayload<{ include: typeof details }>;

function stocktakeView(record: Stocktake) {
    return {
        ...record, lines: record.lines.map(({ variantId, sku, baselineVersion, expected, reserved, counted }) =>
            ({ variantId, sku, baselineVersion, expected, reserved, counted })),
    };
}

async function stocktakeInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const row = await tx.stocktake.findUnique({ where: stockKey(shopId, id), include: details });
    if (!row) throw new NotFoundException();
    return row;
}

async function positionsAt(tx: Prisma.TransactionClient, shopId: string, warehouseId: string, variantIds: string[]) {
    const rows = await tx.stockPosition.findMany({
        where: { shopId, warehouseId, variantId: { in: variantIds } },
        select: { version: true, variantId: true, onHand: true, reserved: true, carryingValue: true },
    });
    return new Map(rows.map(row => [row.variantId, row]));
}

function lineKey(shopId: string, stocktakeId: string, variantId: string) {
    return { shopId_stocktakeId_variantId: { shopId, stocktakeId, variantId } };
}

export class StocktakeService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'inventory.read');
            const query = listQuery(raw, 'stocktakes');
            if ((query.status && !Object.hasOwn(States, query.status)) || (query.warehouseId && !validUuid(query.warehouseId))) {
                throw new UnprocessableEntityException();
            }
            const page = paging(query, ['stocktakes', shopId, userId, String(scope.permissionVersion), query.warehouseId ?? '']);
            const keyword = { contains: page.keyword, mode: 'insensitive' as const };
            const search = page.keyword ? { OR: [
                { reason: keyword }, { lines: { some: { sku: keyword } } }, ...(query.q && validUuid(query.q) ? [{ id: query.q }] : []),
            ] } : {};
            const result = page.result(await tx.stocktake.findMany({
                where: { shopId, warehouseId: query.warehouseId, status: query.status as StocktakeStatus | undefined,
                    AND: [search, page.after ?? {}] },
                orderBy: page.orderBy, take: page.limit + 1, include: details,
            }));
            return { ...result, data: result.data.map(stocktakeView) };
        });
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: Draft, requestId: string) {
        const reason = stockReason(input.reason);
        return writeInventoryDocument(this.db, this.config, { headers, shopId, operationId: 'createStocktake', payload: input, requestId, reason },
            async (tx, scope) => {
                const { warehouseId } = input;
                await requireActiveWarehouses(tx, shopId, warehouseId);
                const ids = distinctVariants(input.variantIds);
                const skus = await variantSkus(tx, shopId, ids);
                const positions = await positionsAt(tx, shopId, warehouseId, ids);
                const lines = ids.map((variantId, position) => {
                    const balance = positions.get(variantId);
                    return { variantId, position, sku: skus.get(variantId)!, baselineVersion: balance?.version ?? 1,
                        expected: balance?.onHand ?? 0, reserved: balance?.reserved ?? 0 };
                });
                return tx.stocktake.create({ data: {
                    shopId, warehouseId, countedBy: scope.userId, reason, lines: { createMany: { data: lines } },
                } });
            }, async (tx, id) => stocktakeView(await stocktakeInShop(tx, shopId, id)));
    }

    update(headers: IncomingHttpHeaders, shopId: string, id: string, input: Update, requestId: string) {
        const version = requireIfMatch(headers);
        const reason = input.action === 'cancel' || input.reason !== undefined ? stockReason(input.reason) : undefined;
        return writeInventoryDocument(this.db, this.config, { headers, shopId, operationId: 'updateStocktake',
            payload: { id, input, version }, requestId, reason, action: input.action }, async (tx, scope) => {
            const current = await stocktakeInShop(tx, shopId, id);
            requireVersion(current.version, version);
            if (!['counting', 'submitted'].includes(current.status)) throw new ConflictException();
            const where = stockKey(shopId, id);
            const revise = (fields: Prisma.StocktakeUncheckedUpdateInput) => tx.stocktake.update({
                where, data: { ...fields, version: { increment: 1 } },
            });
            if (input.action === 'cancel') return revise({ status: 'cancelled', reviewedBy: scope.userId, reviewReason: reason });
            await requireActiveWarehouses(tx, shopId, current.warehouseId);
            if (input.action === 'count') {
                if (current.status !== 'counting') throw new ConflictException();
                const counts = input.counts ?? [];
                distinctVariants(counts.map(count => count.variantId));
                const ids = new Set(current.lines.map(line => line.variantId));
                for (const { variantId, counted } of counts) {
                    if (!ids.has(variantId) || !Number.isInteger(counted) || counted < 0 || counted > 2147483647) throw new UnprocessableEntityException();
                    await tx.stocktakeLine.update({ where: lineKey(shopId, id, variantId), data: { counted } });
                }
                return revise({ countedBy: scope.userId });
            }
            if (input.counts?.length) throw new UnprocessableEntityException();
            const positions = await positionsAt(tx, shopId, current.warehouseId, current.lines.map(line => line.variantId));
            const changed = current.lines.filter(line => line.baselineVersion !== (positions.get(line.variantId)?.version ?? 1));
            if (input.action === 'submit') {
                if (current.status !== 'counting' || changed.length) throw new ConflictException();
                if (current.lines.some(line => line.counted === null)) throw new UnprocessableEntityException();
                return revise({ status: 'submitted' });
            }
            for (const line of changed) {
                const balance = positions.get(line.variantId);
                await tx.stocktakeLine.update({ where: lineKey(shopId, id, line.variantId), data: {
                    baselineVersion: balance?.version ?? 1, expected: balance?.onHand ?? 0, reserved: balance?.reserved ?? 0, counted: null,
                } });
            }
            return revise({ status: 'counting' });
        }, async tx => stocktakeView(await stocktakeInShop(tx, shopId, id)));
    }

    post(headers: IncomingHttpHeaders, shopId: string, id: string, input: Review, requestId: string) {
        const reason = stockReason(input.reason);
        const version = requireIfMatch(headers);
        return writeInventoryDocument(this.db, this.config, { headers, shopId, operationId: 'postStocktake',
            payload: { id, input, version }, requestId, reason }, async (tx, scope) => {
            const current = await stocktakeInShop(tx, shopId, id);
            requireVersion(current.version, version);
            if (current.status !== 'submitted') throw new ConflictException();
            const { warehouseId } = current;
            await requireActiveWarehouses(tx, shopId, warehouseId);
            const positions = await positionsAt(tx, shopId, warehouseId, current.lines.map(line => line.variantId));
            const at = new Date();
            const { currency, timezone } = await financeShop(tx, shopId);
            await lockOpenPeriod(tx, shopId, localAccountingDate(at, timezone));
            let gains = new ExactDecimal(0);
            let losses = new ExactDecimal(0);
            for (const line of [...current.lines].sort((left, right) => left.variantId.localeCompare(right.variantId))) {
                const balance = positions.get(line.variantId);
                if (line.counted === null || line.baselineVersion !== (balance?.version ?? 1) ||
                    line.counted < (balance?.reserved ?? 0)) throw new ConflictException();
                const delta = line.counted - line.expected;
                if (!delta) continue;
                let receivedValue: string | undefined;
                if (delta > 0) {
                    if (!balance?.onHand) throw new ConflictException();
                    receivedValue = proportionalAmount(balance.carryingValue, 1, balance.onHand).mul(delta).toFixed();
                }
                const movement = await recordStockMovement(tx, {
                    shopId, warehouseId, variantId: line.variantId, actorId: scope.userId, kind: 'adjustment',
                    source: { type: 'stocktake', id, lineId: line.variantId }, reason,
                    delta: { onHand: delta }, expectedVersion: line.baselineVersion, receivedValue,
                });
                if (delta > 0) gains = gains.plus(movement.carryingDelta);
                else losses = losses.minus(movement.carryingDelta);
            }
            await bookBusinessPairs(tx, { shopId, sourceId: id, at, currency, sourceRevision: current.version, reason }, 'stocktake', 'post', [
                { debit: 'inventory', credit: 'inventory_gain', amount: gains, description: 'Ghi nhận thừa qua kiểm kê' },
                { debit: 'inventory_loss', credit: 'inventory', amount: losses, description: 'Ghi nhận thiếu qua kiểm kê' },
            ]);
            return tx.stocktake.update({ where: stockKey(shopId, id), data: {
                status: 'posted', postedAt: at, reviewedBy: scope.userId, reviewReason: reason, version: { increment: 1 },
            } });
        }, async tx => stocktakeView(await stocktakeInShop(tx, shopId, id)));
    }
}

@Controller('shops/:shopId/inventory/stocktakes')
export class StocktakeController {
    constructor(private readonly stocktakes: StocktakeService) {}

    @Get()
    @ContractOperation('listStocktakes')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.stocktakes.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Post()
    @ContractOperation('createStocktake')
    async create(@Param('shopId', idPipe) shopId: string, @Body(stockInput('StocktakeDraft')) input: Draft,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.stocktakes.create(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Patch(':resourceId')
    @ContractOperation('updateStocktake')
    async update(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(stockInput('StocktakeUpdate')) input: Update,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.stocktakes.update(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }

    @Patch(':resourceId/posting')
    @ContractOperation('postStocktake')
    async post(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(stockInput('StocktakePost')) input: Review,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.stocktakes.post(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }
}
