import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { validUuid } from '../../http/query.js';
import { recordAudit } from '../../platform/audit/index.js';
import { writeShopCommand, type AuthConfig, type ShopScope } from '../workspace/index.js';
import { lockWarehouse } from './stock.js';

const sources = {
    createStocktake: ['stocktake', 'inventory.adjust'],
    updateStocktake: ['stocktake', 'inventory.adjust'],
    postStocktake: ['stocktake', 'warehouses.manage'],
    createStockTransfer: ['stock_transfer', 'inventory.adjust'],
    updateStockTransfer: ['stock_transfer', 'inventory.adjust'],
} as const;
export const stockCommands = Object.entries(sources).map(([operationId, [resourceType]]) => ({ operationId, resourceType }));
export const stockInput = (name: string) => new SchemaPipe(validator.compile(schemaFromContract(name)));
export const stockKey = (shopId: string, id: string) => ({ shopId_id: { shopId, id } });

export function stockReason(value: string | undefined) {
    const reason = value?.trim() ?? '';
    if (reason.length < 5 || reason.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
    return reason;
}

export function distinctVariants(variantIds: string[]) {
    if (!variantIds.length || new Set(variantIds).size !== variantIds.length ||
        variantIds.some(id => !validUuid(id))) throw new UnprocessableEntityException();
    return variantIds;
}

export async function variantSkus(tx: Prisma.TransactionClient, shopId: string, variantIds: string[]) {
    const rows = await tx.variant.findMany({
        where: { shopId, id: { in: variantIds }, archivedAt: null, product: { status: { not: 'archived' } } },
        select: { id: true, sku: true },
    });
    if (rows.length !== variantIds.length) throw new UnprocessableEntityException();
    return new Map(rows.map(row => [row.id, row.sku]));
}

export async function requireActiveWarehouses(tx: Prisma.TransactionClient, shopId: string, ...warehouseIds: string[]) {
    for (const id of warehouseIds.sort()) {
        if ((await lockWarehouse(tx, shopId, id)).status !== 'active') throw new ConflictException();
    }
}

export function writeInventoryDocument<T>(db: PrismaClient | undefined, config: AuthConfig | undefined, input: {
    headers: IncomingHttpHeaders; shopId: string; operationId: keyof typeof sources; payload: Prisma.InputJsonValue;
    requestId: string; reason?: string; action?: string;
}, apply: (tx: Prisma.TransactionClient, scope: ShopScope) => Promise<{ id: string; version: number; status: string }>,
    read: (tx: Prisma.TransactionClient, id: string) => Promise<T>) {
    const { operationId, shopId, requestId } = input;
    const [resourceType, permission] = sources[operationId];
    return writeShopCommand(db, config, { ...input, permission }, async (tx, scope) => {
        const row = await apply(tx, scope);
        await recordAudit(tx, {
            shopId, actorId: scope.userId, action: operationId, requestId, resourceType, resourceId: row.id,
            metadata: { version: row.version, status: row.status, ...(input.reason ? { reason: input.reason } : {}),
                ...(input.action ? { action: input.action } : {}) },
        });
        return { type: resourceType, id: row.id };
    }, async (tx, _scope, result) => read(tx, result.id));
}
