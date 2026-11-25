import { ConflictException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { Command, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { recordAudit } from '../../platform/audit/index.js';
import type { ResourceRef } from '../../platform/commands/index.js';
import { enqueueResourceUpdate, type ResourceEventType } from '../../platform/outbox/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig, type ShopScope } from '../workspace/index.js';

const sources = {
    createAccount: ['account', 'finance.accounts.manage', 'account.updated'],
    updateAccount: ['account', 'finance.accounts.manage', 'account.updated'],
    archiveAccount: ['account', 'finance.accounts.manage', 'account.updated'],
    createAccountingPeriod: ['accounting_period', 'finance.close', 'accounting_period.updated'],
    closeAccountingPeriod: ['accounting_period', 'finance.close', 'accounting_period.updated'],
    reopenAccountingPeriod: ['accounting_period', 'finance.close', 'accounting_period.updated'],
    matchSettlement: ['reconciliation', 'finance.reconcile', 'reconciliation.updated'],
    updateDebtTerms: ['debt', 'finance.reconcile', undefined],
    matchCODSettlement: ['cod_settlement', 'finance.reconcile', undefined],
    createJournal: ['journal', 'finance.post', 'journal.updated'],
    postJournal: ['journal', 'finance.post', undefined],
    reverseJournal: ['journal', 'finance.post', undefined],
    createFinanceEntry: ['finance_entry', 'finance.post', 'finance.updated'],
    updateFinanceEntry: ['finance_entry', 'finance.post', 'finance.updated'],
    postFinanceEntry: ['finance_entry', 'finance.post', 'finance.updated'],
    reverseFinanceEntry: ['finance_entry', 'finance.post', 'finance.updated'],
    createOpeningBalance: ['opening_balance', 'finance.post', 'opening_balance.updated'],
    updateOpeningBalance: ['opening_balance', 'finance.post', 'opening_balance.updated'],
    postOpeningBalance: ['opening_balance', 'finance.post', 'opening_balance.updated'],
    createInventoryAdjustment: ['stock_movement', 'inventory.adjust', undefined],
    payOrder: ['order', 'finance.post', 'order.updated'],
    refundOrder: ['order', 'finance.refund', 'order.updated'],
} as const satisfies Record<string, readonly [string, string, ResourceEventType | undefined]>;
export type FinanceAction = keyof typeof sources;
export const financeCommands = Object.entries(sources).map(([operationId, [resourceType]]) => ({ operationId, resourceType }));

type FinanceRequest = {
    headers: IncomingHttpHeaders; shopId: string; action: FinanceAction; payload: Prisma.InputJsonValue;
    requestId: string; reason?: string;
};
type FinanceResult = { id: string; version?: number; repeat?: boolean };

export class FinanceAccess {
    constructor(readonly db?: PrismaClient, readonly config?: AuthConfig) {}

    read<T>(headers: IncomingHttpHeaders, shopId: string, gather: (tx: Prisma.TransactionClient, scope: ShopScope) => Promise<T>) {
        return readAsSession(this.db, headers, async (tx, actorId) => gather(tx, await requireShopAccess(tx, actorId, shopId, 'finance.read')));
    }

    write<T>(input: FinanceRequest, apply: (tx: Prisma.TransactionClient, scope: ShopScope, commandId: string) => Promise<FinanceResult>,
        outcome: (tx: Prisma.TransactionClient, result: ResourceRef, command: Command) => Promise<T>) {
        const { headers, shopId, action, payload, requestId, reason } = input;
        const [resourceType, permission, eventType] = sources[action];
        return writeShopCommand(this.db, this.config, { headers, shopId, operationId: action, permission, payload },
            async (tx, scope, _config, command) => {
                const record = await apply(tx, scope, command.id);
                if (!record.repeat) {
                    await recordAudit(tx, {
                        shopId, actorId: scope.userId, action, requestId, resourceType, resourceId: record.id,
                        metadata: { ...(record.version ? { version: record.version } : {}), ...(reason ? { reason } : {}) },
                    });
                    if (eventType && record.version) await enqueueResourceUpdate(tx, eventType, { shopId, id: record.id, version: record.version });
                }
                return { type: resourceType, id: record.id };
            }, (tx, _scope, result, command) => {
                if (result.type !== resourceType) throw new ConflictException();
                return outcome(tx, result, command);
            });
    }
}
