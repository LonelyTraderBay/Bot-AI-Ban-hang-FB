import {
    Body, ConflictException, Controller, Get, HttpCode, Module, NotFoundException, Param, Patch, Post,
    Query, Req, Res, UnprocessableEntityException, type DynamicModule,
} from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { Prisma, type PrismaClient, type Warehouse, type WarehouseStatus } from '../../generated/prisma/client.js';
import { StockMovementKind } from '../../generated/prisma/enums.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging, validUuid } from '../../http/query.js';
import { envelope, noStore, requireIfMatch, requireVersion, versionedEnvelope } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { commandDto, type ResourceRef } from '../../platform/commands/index.js';
import { proportionalAmount } from '../../platform/money/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig } from '../workspace/index.js';
import { lockWarehouse, requireWarehouseClear } from './stock.js';
import { StocktakeController, StocktakeService } from './stocktakes.js';
import { TransfersController, TransfersService } from './transfers.js';

export { createDefaultStockPositions, recordStockMovement, requireVariantsClear, lockWarehouse } from './stock.js';
export { sellableAvailability, sellableStockPositions } from './stock.js';
export { expireStockReservations, reserveStock, settleStockReservation } from './reservations.js';
export { stockCommands } from './stock-commands.js';

export const warehouseCommands = ['createWarehouse', 'updateWarehouse', 'archiveWarehouse'].map(operationId => ({ operationId, resourceType: 'warehouse' }));
type WarehouseInput = { code: string; name: string; addressLine: string };
type WarehouseArchive = { expectedVersion: number; reason: string };
const warehouseWrite = new SchemaPipe(validator.compile(schemaFromContract('WarehouseWrite')));
const warehousePatch = new SchemaPipe(validator.compile(schemaFromContract('WarehouseWritePatch')));
const archiveInput = new SchemaPipe(validator.compile(schemaFromContract('VersionedReason')));

async function warehouseInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const warehouse = await tx.warehouse.findUnique({ where: { shopId_id: { shopId, id } } });
    if (!warehouse) throw new NotFoundException();
    return warehouse;
}

function warehouseData({ code, name, addressLine }: WarehouseInput) {
    const result = { code: code.trim().normalize('NFC').toUpperCase(), name: name.trim(), addressLine: addressLine.trim() };
    if (result.code.length > 40 || Object.values(result).some(value => !value || value.includes(String.fromCharCode(0)))) {
        throw new UnprocessableEntityException();
    }
    return result;
}

async function checkCode(tx: Prisma.TransactionClient, shopId: string, code: string, id?: string) {
    if (await tx.warehouse.findFirst({
        where: { shopId, code: { equals: code, mode: 'insensitive' }, ...(id ? { id: { not: id } } : {}) }, select: { id: true },
    })) throw new ConflictException();
}

class InventoryService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    snapshots(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'inventory.read');
            const query = listQuery(raw, 'inventory');
            if (query.status && !['in_stock', 'out_of_stock'].includes(query.status)) throw new UnprocessableEntityException();
            const page = paging(query, ['stock', shopId, userId, String(scope.permissionVersion), query.warehouseId ?? '', query.variantId ?? '']);
            const q = query.q?.trim();
            const search = page.keyword ? { OR: [
                { variant: { sku: { contains: page.keyword, mode: 'insensitive' as const } } },
                ...(q && validUuid(q) ? [{ variantId: q }] : []),
            ] } : {};
            const filter = query.status === 'in_stock' ? { onHand: { gt: tx.stockPosition.fields.reserved } }
                : query.status === 'out_of_stock' ? { onHand: { equals: tx.stockPosition.fields.reserved } } : {};
            const result = page.result(await tx.stockPosition.findMany({
                where: {
                    shopId, warehouseId: query.warehouseId, variantId: query.variantId, ...filter,
                    warehouse: { status: 'active' }, variant: { archivedAt: null, product: { status: { not: 'archived' } } },
                    AND: [search, page.after ?? {}],
                },
                orderBy: page.orderBy, take: page.limit + 1,
                include: { variant: { select: { sku: true } }, warehouse: { select: { shop: { select: { currency: true } } } } },
            }));
            const canViewCost = scope.permissions.includes('finance.read');
            return { ...result, data: result.data.map(({ variant, warehouse, carryingValue: value, ...row }) => {
                const { currency } = warehouse.shop;
                const costing = canViewCost && row.onHand > 0;
                return {
                    ...row, sku: variant.sku, asOf: row.updatedAt, available: row.onHand - row.reserved,
                    carryingValue: costing ? { currency, amount: value.toFixed() } : null,
                    unitCost: costing ? { currency, amount: proportionalAmount(value, 1, row.onHand).toFixed() } : null,
                };
            }) };
        });
    }

    movements(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'inventory.read');
            const query = listQuery(raw, 'inventory');
            if (query.status && !Object.hasOwn(StockMovementKind, query.status)) throw new UnprocessableEntityException();
            const page = paging(query, ['movements', shopId, userId, String(scope.permissionVersion), query.warehouseId ?? '', query.variantId ?? '']);
            const q = query.q?.trim();
            const search = page.keyword ? { OR: [
                { sku: { contains: page.keyword, mode: 'insensitive' as const } },
                ...(q && validUuid(q) ? [{ variantId: q }, { sourceId: q }] : []),
            ] } : {};
            const result = page.result(await tx.stockMovement.findMany({
                where: {
                    shopId, warehouseId: query.warehouseId, variantId: query.variantId,
                    kind: query.status as StockMovementKind | undefined, AND: [search, page.after ?? {}],
                },
                orderBy: page.orderBy, take: page.limit + 1,
                select: {
                    id: true, shopId: true, sku: true, variantId: true, warehouseId: true, actorId: true, kind: true,
                    reason: true, quantityDelta: true, reservedDelta: true, quarantineDelta: true, transitDelta: true, inboundDelta: true,
                    sourceType: true, sourceId: true, createdAt: true,
                },
            }));
            return { ...result, data: result.data.map(({ sourceType, sourceId, ...row }) => ({
                ...row, sourceRef: { type: sourceType, id: sourceId },
            })) };
        });
    }

    warehouses(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'inventory.read');
            const query = listQuery(raw);
            if (query.status && !['active', 'archived'].includes(query.status)) throw new UnprocessableEntityException();
            const page = paging(query, ['warehouses', shopId, userId, String(scope.permissionVersion)]);
            const contains = { contains: page.keyword, mode: 'insensitive' as const };
            return page.result(await tx.warehouse.findMany({
                where: {
                    shopId, status: query.status as WarehouseStatus | undefined,
                    AND: [page.keyword ? { OR: [{ code: contains }, { name: contains }] } : {}, page.after ?? {}],
                },
                orderBy: page.orderBy, take: page.limit + 1,
            }));
        });
    }

    warehouse(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            await requireShopAccess(tx, userId, shopId, 'inventory.read');
            return warehouseInShop(tx, shopId, id);
        });
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: WarehouseInput, requestId: string) {
        return this.change(headers, shopId, 'createWarehouse', input, requestId, async tx => {
            const data = warehouseData(input);
            await checkCode(tx, shopId, data.code);
            return tx.warehouse.create({ data: { ...data, shopId } });
        }, (tx, result) => warehouseInShop(tx, shopId, result.id));
    }

    update(headers: IncomingHttpHeaders, shopId: string, id: string, patch: Partial<WarehouseInput>, requestId: string) {
        const version = requireIfMatch(headers);
        return this.change(headers, shopId, 'updateWarehouse', { id, patch, version }, requestId, async tx => {
            const current = await warehouseInShop(tx, shopId, id);
            requireVersion(current.version, version);
            if (current.status !== 'active') throw new ConflictException();
            const data = warehouseData({ ...current, ...patch });
            await checkCode(tx, shopId, data.code, id);
            return tx.warehouse.update({
                where: { shopId_id: { shopId, id } }, data: { ...data, version: { increment: 1 } },
            });
        }, (tx, result) => warehouseInShop(tx, shopId, result.id));
    }

    archive(headers: IncomingHttpHeaders, shopId: string, id: string, input: WarehouseArchive, requestId: string) {
        const reason = input.reason.trim();
        if (reason.length < 3 || reason.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
        return this.change(headers, shopId, 'archiveWarehouse', { id, input }, requestId, async tx => {
            await lockWarehouse(tx, shopId, id, true);
            const current = await warehouseInShop(tx, shopId, id);
            requireVersion(current.version, input.expectedVersion);
            const { defaultWarehouseId } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { defaultWarehouseId: true } });
            if (current.status !== 'active' || defaultWarehouseId === id) throw new ConflictException();
            await requireWarehouseClear(tx, shopId, id);
            return tx.warehouse.update({
                where: { shopId_id: { shopId, id } }, data: { status: 'archived', version: { increment: 1 } },
            });
        }, async (_tx, _result, command) => commandDto(command, 'warehouse'), reason);
    }

    private change<T>(headers: IncomingHttpHeaders, shopId: string, action: string, payload: Prisma.InputJsonValue, requestId: string,
        apply: (tx: Prisma.TransactionClient) => Promise<Warehouse>,
        read: (tx: Prisma.TransactionClient, result: ResourceRef, command: Parameters<typeof commandDto>[0]) => Promise<T>, reason?: string) {
        return writeShopCommand(this.db, this.config, { headers, shopId, permission: 'warehouses.manage', operationId: action, payload },
            async (tx, scope) => {
                const warehouse = await apply(tx);
                await recordAudit(tx, {
                    shopId, actorId: scope.userId, action, requestId, resourceType: 'warehouse', resourceId: warehouse.id,
                    metadata: { version: warehouse.version, ...(reason ? { reason } : {}) },
                });
                await enqueueResourceUpdate(tx, 'warehouse.updated', warehouse);
                return { type: 'warehouse', id: warehouse.id };
            }, (tx, _scope, result, command) => {
                if (result.type !== 'warehouse') throw new ConflictException();
                return read(tx, result, command);
            });
    }
}

@Controller('shops/:shopId')
class InventoryController {
    constructor(private readonly inventory: InventoryService) {}

    @Get('inventory')
    @ContractOperation('listStockSnapshots')
    async snapshots(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.inventory.snapshots(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('inventory/movements')
    @ContractOperation('listStockMovements')
    async movements(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.inventory.movements(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('warehouses')
    @ContractOperation('listWarehouses')
    async warehouses(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.inventory.warehouses(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('warehouses/:warehouseId')
    @ContractOperation('getWarehouse')
    async warehouse(@Param('shopId', idPipe) shopId: string, @Param('warehouseId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.inventory.warehouse(request.headers, shopId, id));
    }

    @Post('warehouses')
    @ContractOperation('createWarehouse')
    async create(@Param('shopId', idPipe) shopId: string, @Body(warehouseWrite) input: WarehouseInput,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.inventory.create(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Patch('warehouses/:warehouseId')
    @ContractOperation('updateWarehouse')
    async patch(@Param('shopId', idPipe) shopId: string, @Param('warehouseId', idPipe) id: string, @Body(warehousePatch) input: Partial<WarehouseInput>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.inventory.update(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post('warehouses/:warehouseId/archive')
    @HttpCode(202)
    @ContractOperation('archiveWarehouse')
    async archive(@Param('shopId', idPipe) shopId: string, @Param('warehouseId', idPipe) id: string, @Body(archiveInput) input: WarehouseArchive,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.inventory.archive(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }
}

@Module({})
class InventoryModule {}

export function inventoryModule(db?: PrismaClient, config?: AuthConfig): DynamicModule {
    return {
        module: InventoryModule, controllers: [InventoryController, StocktakeController, TransfersController],
        providers: [
            { provide: InventoryService, useFactory: () => new InventoryService(db, config) },
            { provide: StocktakeService, useFactory: () => new StocktakeService(db, config) },
            { provide: TransfersService, useFactory: () => new TransfersService(db, config) },
        ],
    };
}
