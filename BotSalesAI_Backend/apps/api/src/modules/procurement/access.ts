import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { Command, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { recordAudit } from '../../platform/audit/index.js';
import type { CommandRef } from '../../platform/commands/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig, type ShopScope } from '../workspace/index.js';

const actions = {
    createSupplier: ['supplier', 'procurement.write'],
    updateSupplier: ['supplier', 'procurement.write'],
    setSupplierStatus: ['supplier', 'procurement.manage'],
    createSupplierOffer: ['supplier_offer', 'procurement.write'],
    createReorderRule: ['reorder_rule', 'procurement.manage'],
    updateReorderRule: ['reorder_rule', 'procurement.manage'],
    evaluateReorder: ['reorder_evaluation', 'procurement.write'],
    createPurchaseOrder: ['purchase_order', 'procurement.write'],
    requestPurchaseApproval: ['approval', 'procurement.write'],
    sendPurchaseOrder: ['purchase_order', 'procurement.send'],
    confirmPurchaseOrder: ['purchase_order', 'procurement.write'],
    cancelPurchaseOrder: ['purchase_order', 'procurement.write'],
    createGoodsReceipt: ['goods_receipt', 'procurement.write'],
    postGoodsReceipt: ['goods_receipt', 'procurement.receive'],
    createPurchaseDelegation: ['purchase_delegation', 'procurement.delegation.manage'],
    updatePurchaseDelegation: ['purchase_delegation', 'procurement.delegation.manage'],
} as const;
export type ProcurementAction = keyof typeof actions;
export const procurementCommands = Object.entries(actions).map(([operationId, [resourceType]]) => ({ operationId, resourceType }));
export const procurementInput = (name: string) => new SchemaPipe(validator.compile(schemaFromContract(name)));
export const procurementKey = (shopId: string, id: string) => ({ shopId_id: { shopId, id } });

export function requireResourceId(id: string) {
    if (!validUuid(id)) throw new NotFoundException();
}

export function procurementText(input: string, minimum = 0) {
    const value = input.trim();
    if (value.length < minimum || value.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
    return value;
}

export function quantity(value: number, minimum = 0) {
    if (!Number.isInteger(value) || value < minimum || value > 2147483647) throw new UnprocessableEntityException();
    return value;
}

export class ProcurementAccess {
    constructor(protected readonly db?: PrismaClient, protected readonly config?: AuthConfig) {}

    protected read<T>(headers: IncomingHttpHeaders, shopId: string, action: (tx: Prisma.TransactionClient, scope: ShopScope) => Promise<T>) {
        return readAsSession(this.db, headers, async (tx, userId) => action(tx, await requireShopAccess(tx, userId, shopId, 'procurement.read')));
    }

    protected listPage<T extends { id: string; createdAt: Date }>(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>, name: string,
        query: (tx: Prisma.TransactionClient, page: ReturnType<typeof paging>, scope: ShopScope) => Promise<T[]>) {
        return this.read(headers, shopId, async (tx, scope) => {
            const page = paging(listQuery(raw, 'page'), [name, shopId, scope.userId, String(scope.permissionVersion)]);
            return page.result(await query(tx, page, scope));
        });
    }

    protected write<T>(input: { headers: IncomingHttpHeaders; shopId: string; operationId: ProcurementAction; payload: Prisma.InputJsonValue;
        requestId: string; reason?: string; deferred?: boolean },
    apply: (tx: Prisma.TransactionClient, scope: ShopScope, auth: AuthConfig, command: CommandRef) => Promise<{ id: string; version: number }>,
    view: (tx: Prisma.TransactionClient, id: string, scope: ShopScope, command: Command) => Promise<T>) {
        const [resourceType, permission] = actions[input.operationId];
        return writeShopCommand(this.db, this.config, { ...input, permission }, async (tx, scope, auth, command) => {
            const result = await apply(tx, scope, auth, command);
            await recordAudit(tx, {
                shopId: input.shopId, actorId: scope.userId, action: input.operationId, requestId: input.requestId,
                resourceType, resourceId: result.id, metadata: { actorKind: 'user', permissionVersion: scope.permissionVersion,
                    version: result.version, ...(input.reason ? { reason: input.reason } : {}) },
            });
            return { type: resourceType, id: result.id };
        }, async (tx, scope, result, command) => view(tx, result.id, scope, command));
    }
}
