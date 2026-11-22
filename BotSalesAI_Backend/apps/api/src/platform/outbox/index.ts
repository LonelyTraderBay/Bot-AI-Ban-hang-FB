import type { OutboxEvent, Prisma } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';

const resourceEvents = {
    'warehouse.updated': { resourceType: 'warehouse', permission: 'inventory.read' },
    'message.created': { resourceType: 'message', permission: 'conversations.read' },
    'conversation.updated': { resourceType: 'conversation', permission: 'conversations.read' },
    'knowledge.published': { resourceType: 'knowledge', permission: 'knowledge.read' },
    'bot.config.updated': { resourceType: 'bot_config', permission: 'bot.read' },
    'agent_role.updated': { resourceType: 'agent_role', permission: 'bot.read' },
    'budget.updated': { resourceType: 'budget_policy', permission: 'operations.read' },
    'consent_challenge.updated': { resourceType: 'consent_challenge', permission: 'privacy.manage' },
    'customer_consent.updated': { resourceType: 'customer_consent', permission: 'privacy.manage' },
    'inventory.updated': { resourceType: 'stock_position', permission: 'inventory.read' },
    'order.updated': { resourceType: 'order', permission: 'orders.read' },
    'shipment.updated': { resourceType: 'shipment', permission: 'fulfillment.read' },
    'health.updated': { resourceType: 'channel', permission: 'integrations.read' },
    'account.updated': { resourceType: 'account', permission: 'finance.read' },
    'journal.updated': { resourceType: 'journal', permission: 'finance.read' },
    'finance.updated': { resourceType: 'finance_entry', permission: 'finance.read' },
    'accounting_period.updated': { resourceType: 'accounting_period', permission: 'finance.read' },
    'reconciliation.updated': { resourceType: 'reconciliation', permission: 'finance.read' },
    'opening_balance.updated': { resourceType: 'opening_balance', permission: 'finance.read' },
    'work_item.updated': { resourceType: 'work_item', permission: 'operations.read' },
    'approval.updated': { resourceType: 'approval', permission: 'approvals.read' },
    'purchase.updated': { resourceType: 'purchase_order', permission: 'procurement.read' },
    'receipt.updated': { resourceType: 'goods_receipt', permission: 'procurement.read' },
    'purchase_suggestion.updated': { resourceType: 'purchase_suggestion', permission: 'procurement.read' },
    'purchase_delegation.updated': { resourceType: 'purchase_delegation', permission: 'procurement.read' },
    'purchase_reservation.updated': { resourceType: 'purchase_reservation', permission: 'procurement.delegation.manage' },
    'notification.updated': { resourceType: 'notification', permission: 'notifications.read', recipientOnly: true },
} as const;
export type ResourceEventType = keyof typeof resourceEvents;

export function accessibleResourceEvents(permissions: readonly string[]) {
    return Object.entries(resourceEvents).flatMap(([type, policy]) =>
        permissions.includes(policy.permission) && !('recipientOnly' in policy) ? [type] : []);
}

export function enqueueResourceUpdate(tx: Prisma.TransactionClient, eventType: ResourceEventType,
    resource: { shopId: string; id: string; version: number; recipientUserId?: string }) {
    const { resourceType } = resourceEvents[eventType];
    return tx.outboxEvent.create({
        data: { shopId: resource.shopId, eventType, payload: {
            resourceType, resourceId: resource.id, resourceVersion: resource.version,
            ...(resource.recipientUserId ? { recipientUserId: resource.recipientUserId } : {}),
        } },
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
        message: () => tx.channelMessage.findUnique({ where, select }),
        conversation: () => tx.channelConversation.findUnique({ where, select }),
        knowledge: () => tx.knowledgeDocument.findUnique({ where, select }),
        bot_config: () => tx.botConfig.findUnique({ where: { shopId }, select: { shopId: true } }).then(row => event.resourceId === row?.shopId ? row : null),
        agent_role: () => tx.agentRole.findUnique({ where, select }),
        budget_policy: () => tx.budgetPolicy.findUnique({ where, select }),
        consent_challenge: () => tx.consentChallenge.findUnique({ where, select }),
        customer_consent: () => tx.customerConsent.findUnique({ where, select }),
        stock_position: () => tx.stockPosition.findUnique({ where, select }),
        order: () => tx.salesOrder.findUnique({ where, select }),
        shipment: () => tx.shipment.findUnique({ where, select }),
        channel: () => tx.channelConnection.findUnique({ where, select }),
        account: () => tx.financeAccount.findUnique({ where, select }),
        journal: () => tx.financeJournal.findUnique({ where, select }),
        finance_entry: () => tx.financeEntry.findUnique({ where, select }),
        accounting_period: () => tx.accountingPeriod.findUnique({ where, select }),
        reconciliation: () => tx.reconciliationCase.findUnique({ where, select }),
        opening_balance: () => tx.openingBalance.findUnique({ where, select }),
        work_item: () => tx.workItem.findUnique({ where, select }),
        approval: () => tx.approval.findUnique({ where, select }),
        purchase_order: () => tx.purchaseOrder.findUnique({ where, select }),
        goods_receipt: () => tx.goodsReceipt.findUnique({ where, select }),
        purchase_suggestion: () => tx.purchaseSuggestion.findUnique({ where, select }),
        purchase_delegation: () => tx.purchaseDelegation.findUnique({ where, select }),
        purchase_reservation: () => tx.purchaseDelegationReservation.findUnique({ where, select }),
        notification: () => tx.appNotification.findUnique({ where, select }),
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
