import type { OutboxEvent, Prisma } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';

const resourceEvents = {
    'warehouse.updated': { resourceType: 'warehouse', permission: 'inventory.read' },
    'order.updated': { resourceType: 'order', permission: 'orders.read' },
    'account.updated': { resourceType: 'account', permission: 'finance.read' },
    'journal.updated': { resourceType: 'journal', permission: 'finance.read' },
    'finance.updated': { resourceType: 'finance_entry', permission: 'finance.read' },
    'accounting_period.updated': { resourceType: 'accounting_period', permission: 'finance.read' },
    'opening_balance.updated': { resourceType: 'opening_balance', permission: 'finance.read' },
} as const;
export type ResourceEventType = keyof typeof resourceEvents;

export function accessibleResourceEvents(permissions: readonly string[]) {
    return Object.entries(resourceEvents).flatMap(([type, policy]) => (permissions.includes(policy.permission) ? [type] : []));
}

export function enqueueResourceUpdate(tx: Prisma.TransactionClient, eventType: ResourceEventType,
    resource: { shopId: string; id: string; version: number }) {
    const { resourceType } = resourceEvents[eventType];
    return tx.outboxEvent.create({
        data: { shopId: resource.shopId, eventType, payload: { resourceType, resourceId: resource.id, resourceVersion: resource.version } },
    });
}

export function outboxResource(event: Pick<OutboxEvent, 'eventType' | 'commandId' | 'jobId' | 'payload'>) {
    if (event.eventType === 'command.updated' && event.commandId) return { resourceType: 'command', resourceId: event.commandId } as const;
    if (event.eventType === 'job.updated' && event.jobId) return { resourceType: 'job', resourceId: event.jobId } as const;
    if (!Object.hasOwn(resourceEvents, event.eventType) || event.commandId || event.jobId ||
        !event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) return null;
    const { resourceId, resourceType, resourceVersion } = event.payload;
    const policy = resourceEvents[event.eventType as ResourceEventType];
    if (resourceType !== policy.resourceType || typeof resourceId !== 'string' || !validUuid(resourceId) ||
        typeof resourceVersion !== 'number' || !Number.isSafeInteger(resourceVersion) || resourceVersion < 1) return null;
    return { resourceType, resourceId, resourceVersion };
}

export async function verifyEventResource(tx: Prisma.TransactionClient, shopId: string, event: NonNullable<ReturnType<typeof outboxResource>>) {
    const where = { shopId_id: { shopId, id: event.resourceId } };
    const select = { id: true };
    const resource = event.resourceType;
    if (resource === 'command' || resource === 'job') return;
    const record = await {
        warehouse: () => tx.warehouse.findUnique({ where, select }),
        order: () => tx.salesOrder.findUnique({ where, select }),
        account: () => tx.financeAccount.findUnique({ where, select }),
        journal: () => tx.financeJournal.findUnique({ where, select }),
        finance_entry: () => tx.financeEntry.findUnique({ where, select }),
        accounting_period: () => tx.accountingPeriod.findUnique({ where, select }),
        opening_balance: () => tx.openingBalance.findUnique({ where, select }),
    }[resource]?.();
    if (!record) throw new Error('Unknown event resource');
}

export function enqueueCommandUpdate(tx: Prisma.TransactionClient, command: { shopId: string; id: string }) {
    return tx.outboxEvent.create({
        data: {
            shopId: command.shopId, commandId: command.id, eventType: 'command.updated',
            payload: { resourceType: 'command', resourceId: command.id },
        },
    });
}

export function enqueueJobUpdate(tx: Prisma.TransactionClient, job: { shopId: string; id: string }) {
    return tx.outboxEvent.create({
        data: {
            shopId: job.shopId, jobId: job.id, eventType: 'job.updated',
            payload: { resourceType: 'job', resourceId: job.id },
        },
    });
}
