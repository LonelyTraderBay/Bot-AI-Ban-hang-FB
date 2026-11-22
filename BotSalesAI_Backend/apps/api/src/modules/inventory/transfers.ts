import { Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, Req, Res, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Prisma, PrismaClient, StockTransferStatus } from '../../generated/prisma/client.js';
import { StockTransferStatus as States } from '../../generated/prisma/enums.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging, validUuid } from '../../http/query.js';
import { envelope, noStore, requireIfMatch, requireVersion, versionedEnvelope } from '../../http/response.js';
import { ExactDecimal, proportionalAmount } from '../../platform/money/index.js';
import { bookBusinessPairs, financeShop } from '../finance/index.js';
import { readAsSession, requireShopAccess, type AuthConfig } from '../workspace/index.js';
import { distinctVariants, requireActiveWarehouses, stockInput, stockKey, stockReason, variantSkus, writeInventoryDocument } from './stock-commands.js';
import { recordStockMovement } from './stock.js';

type Units = { variantId: string; quantity: number };
type Draft = { fromWarehouseId: string; toWarehouseId: string; lines: Units[]; reason: string };
type Update = { action: 'dispatch' | 'receive' | 'close_short' | 'cancel'; lines?: Units[]; reason?: string };
const details = { lines: { orderBy: { position: 'asc' } } } satisfies Prisma.StockTransferInclude;
type Transfer = Prisma.StockTransferGetPayload<{ include: typeof details }>;
type Line = Transfer['lines'][number];

function transferView(record: Transfer) {
    return { ...record, lines: record.lines.map(({ variantId, sku, quantity, received, missing }) =>
        ({ variantId, sku, quantity, received, missing })) };
}

async function transferInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const record = await tx.stockTransfer.findUnique({ where: stockKey(shopId, id), include: details });
    if (!record) throw new NotFoundException();
    return record;
}

function lineKey({ shopId, id: transferId }: Transfer, variantId: string) {
    return { shopId_transferId_variantId: { shopId, transferId, variantId } };
}

const remaining = (line: Line) => line.quantity - line.received - line.missing;
const byVariant = (left: Units, right: Units) => left.variantId.localeCompare(right.variantId);

function issuedShare(line: Line, received: number) {
    if (line.issuedValue === null) throw new ConflictException();
    return proportionalAmount(line.issuedValue, received, line.quantity);
}

async function journalTransfer(tx: Prisma.TransactionClient, transfer: Transfer, at: Date,
    action: 'dispatch' | 'receive' | 'close_short', value: Prisma.Decimal, reason: string) {
    const { shopId, id: sourceId, version: sourceRevision } = transfer;
    const { currency } = await financeShop(tx, shopId);
    const [debit, credit, description] = {
        dispatch: ['inventory_transit', 'inventory', 'Xuất giá trị từ kho gửi'],
        receive: ['inventory', 'inventory_transit', 'Nhập giá trị vào kho nhận'],
        close_short: ['inventory_loss', 'inventory_transit', 'Ghi thiếu hàng điều chuyển'],
    }[action];
    await bookBusinessPairs(tx, { shopId, sourceId, at, currency, sourceRevision, reason }, 'stock_transfer', action,
        [{ debit, credit, amount: value, description }]);
}

async function dispatch(tx: Prisma.TransactionClient, transfer: Transfer, actorId: string, at: Date) {
    const { shopId, id, fromWarehouseId, toWarehouseId, reason } = transfer;
    await requireActiveWarehouses(tx, shopId, fromWarehouseId, toWarehouseId);
    let value = new ExactDecimal(0);
    for (const line of [...transfer.lines].sort(byVariant)) {
        const movement = await recordStockMovement(tx, {
            shopId, warehouseId: fromWarehouseId, variantId: line.variantId, actorId, kind: 'transfer_out',
            source: { type: 'stock_transfer', id, lineId: line.variantId }, reason,
            delta: { onHand: -line.quantity, transit: line.quantity },
        });
        const issuedValue = movement.carryingDelta.neg();
        value = value.plus(issuedValue);
        await tx.stockTransferLine.update({ where: lineKey(transfer, line.variantId), data: { issuedValue } });
    }
    await journalTransfer(tx, transfer, at, 'dispatch', value, reason);
    return { status: 'in_transit' as const, dispatchedAt: at };
}

async function receive(tx: Prisma.TransactionClient, transfer: Transfer, actorId: string, items: Units[], at: Date) {
    const { shopId, id, fromWarehouseId, toWarehouseId } = transfer;
    distinctVariants(items.map(line => line.variantId));
    await requireActiveWarehouses(tx, shopId, fromWarehouseId, toWarehouseId);
    const lines = new Map(transfer.lines.map(line => [line.variantId, line]));
    let value = new ExactDecimal(0);
    const reason = 'Nhận hàng điều chuyển';
    for (const { variantId, quantity } of [...items].sort(byVariant)) {
        const line = lines.get(variantId);
        if (!line || !Number.isInteger(quantity) || quantity <= 0 || quantity > remaining(line)) throw new UnprocessableEntityException();
        const received = line.received + quantity;
        const cost = issuedShare(line, received).minus(issuedShare(line, line.received));
        const source = { type: 'stock_transfer', id, lineId: randomUUID() };
        await recordStockMovement(tx, {
            shopId, warehouseId: fromWarehouseId, variantId, actorId, kind: 'transfer_out', source, reason, delta: { transit: -quantity },
        });
        await recordStockMovement(tx, {
            shopId, warehouseId: toWarehouseId, variantId, actorId, kind: 'transfer_in', source, reason,
            delta: { onHand: quantity }, receivedValue: cost.toFixed(),
        });
        await tx.stockTransferLine.update({ where: lineKey(transfer, variantId), data: { received } });
        line.received = received;
        value = value.plus(cost);
    }
    await journalTransfer(tx, transfer, at, 'receive', value, reason);
    return transfer.lines.every(line => remaining(line) === 0) ? { status: 'completed' as const, closedAt: at } : {};
}

async function closeShort(tx: Prisma.TransactionClient, transfer: Transfer, actorId: string, reason: string, at: Date) {
    const { shopId, id, fromWarehouseId } = transfer;
    let value = new ExactDecimal(0);
    for (const line of [...transfer.lines].sort(byVariant)) {
        const missing = remaining(line);
        if (!missing) continue;
        value = value.plus(issuedShare(line, line.quantity).minus(issuedShare(line, line.received)));
        await recordStockMovement(tx, {
            shopId, warehouseId: fromWarehouseId, variantId: line.variantId, actorId, kind: 'transfer_out',
            source: { type: 'stock_transfer', id, lineId: randomUUID() }, reason, delta: { transit: -missing },
        });
        await tx.stockTransferLine.update({ where: lineKey(transfer, line.variantId), data: { missing } });
    }
    await journalTransfer(tx, transfer, at, 'close_short', value, reason);
    return { status: 'closed_short' as const, discrepancyReason: reason, closedAt: at };
}

export class TransfersService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'inventory.read');
            const query = listQuery(raw, 'transfers');
            if (query.status && !Object.hasOwn(States, query.status)) throw new UnprocessableEntityException();
            const page = paging(query, ['transfers', shopId, userId, String(scope.permissionVersion)]);
            const keyword = { contains: page.keyword, mode: 'insensitive' as const };
            const search = page.keyword ? { OR: [
                { reason: keyword }, { lines: { some: { sku: keyword } } }, ...(query.q && validUuid(query.q) ? [{ id: query.q }] : []),
            ] } : {};
            const result = page.result(await tx.stockTransfer.findMany({
                where: { shopId, status: query.status as StockTransferStatus | undefined, AND: [search, page.after ?? {}] },
                orderBy: page.orderBy, take: page.limit + 1, include: details,
            }));
            return { ...result, data: result.data.map(transferView) };
        });
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: Draft, requestId: string) {
        const reason = stockReason(input.reason);
        return writeInventoryDocument(this.db, this.config, {
            headers, shopId, operationId: 'createStockTransfer', payload: input, requestId, reason,
        }, async tx => {
            const { fromWarehouseId, toWarehouseId } = input;
            if (fromWarehouseId === toWarehouseId) throw new UnprocessableEntityException();
            await requireActiveWarehouses(tx, shopId, fromWarehouseId, toWarehouseId);
            const variants = distinctVariants(input.lines.map(line => line.variantId));
            const skus = await variantSkus(tx, shopId, variants);
            const lines = input.lines.map((line, position) => ({ ...line, position, sku: skus.get(line.variantId)! }));
            return tx.stockTransfer.create({ data: {
                shopId, fromWarehouseId, toWarehouseId, reason, lines: { createMany: { data: lines } },
            } });
        }, async (tx, id) => transferView(await transferInShop(tx, shopId, id)));
    }

    update(headers: IncomingHttpHeaders, shopId: string, id: string, input: Update, requestId: string) {
        const version = requireIfMatch(headers);
        const reason = input.action === 'close_short' || input.reason !== undefined ? stockReason(input.reason) : undefined;
        return writeInventoryDocument(this.db, this.config, { headers, shopId, operationId: 'updateStockTransfer',
            payload: { id, input, version }, requestId, reason, action: input.action }, async (tx, scope) => {
            const record = await transferInShop(tx, shopId, id);
            requireVersion(record.version, version);
            const at = new Date();
            const action = input.action;
            const draftAction = action === 'cancel' || action === 'dispatch';
            if (record.status !== (draftAction ? 'draft' : 'in_transit')) throw new ConflictException();
            if (action !== 'receive' && input.lines?.length) throw new UnprocessableEntityException();
            let fields: Prisma.StockTransferUncheckedUpdateInput;
            switch (action) {
                case 'cancel':
                    fields = { status: 'cancelled', closedAt: at };
                    break;
                case 'dispatch':
                    fields = await dispatch(tx, record, scope.userId, at);
                    break;
                case 'receive':
                    fields = await receive(tx, record, scope.userId, input.lines ?? [], at);
                    break;
                case 'close_short':
                    if (!scope.permissions.includes('warehouses.manage')) throw new ForbiddenException();
                    fields = await closeShort(tx, record, scope.userId, stockReason(reason), at);
            }
            return tx.stockTransfer.update({ where: stockKey(shopId, id), data: { ...fields, version: { increment: 1 } } });
        }, async tx => transferView(await transferInShop(tx, shopId, id)));
    }
}

@Controller('shops/:shopId/inventory/transfers')
export class TransfersController {
    constructor(private readonly transfers: TransfersService) {}

    @Get()
    @ContractOperation('listStockTransfers')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.transfers.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Post()
    @ContractOperation('createStockTransfer')
    async create(@Param('shopId', idPipe) shopId: string, @Body(stockInput('StockTransferDraft')) input: Draft,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.transfers.create(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Patch(':resourceId')
    @ContractOperation('updateStockTransfer')
    async update(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(stockInput('StockTransferUpdate')) input: Update,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.transfers.update(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }
}
