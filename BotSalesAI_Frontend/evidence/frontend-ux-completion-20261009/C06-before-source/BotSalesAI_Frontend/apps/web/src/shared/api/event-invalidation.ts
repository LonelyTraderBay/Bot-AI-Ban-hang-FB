import type { EventEnvelope } from '@botsales/contracts';
import type { QueryOperationId } from './client';

const inboxReads: readonly QueryOperationId[] = [
    'listMessages', 'getConversation', 'listConversations', 'getInboxMetadata',
    'getDashboard', 'getReportSummary', 'getMarketingSummary', 'getOperationsSummary',
    'listWorkItems', 'listDigests', 'listNotifications',
];
const warehouseReads: readonly QueryOperationId[] = ['listWarehouses', 'getWarehouse', 'listStockSnapshots', 'listStockMovements', 'listReorderRules', 'listPurchaseSuggestions', 'listPurchaseOrders', 'getPurchaseOrder', 'listOrders', 'getOrder'];
const addressReads: readonly QueryOperationId[] = ['listCustomerAddresses', 'getCustomerAddress', 'getCustomer', 'listCustomers', 'listOrders', 'getOrder'];
const accountReads: readonly QueryOperationId[] = ['listAccounts', 'getAccount', 'listJournals', 'getJournal', 'getProfitLoss', 'getCashflow'];
/** Known resource relationships are narrowed; malformed and unknown events request full resync. */
export function eventInvalidations(event: EventEnvelope): readonly QueryOperationId[] | null {
    if (event.schemaVersion !== 2) return null;
    if (event.type === 'message.created' && event.resourceType === 'message') return inboxReads;
    if (event.type === 'conversation.updated' && event.resourceType === 'conversation') return inboxReads;
    if (event.type === 'warehouse.updated' && event.resourceType === 'warehouse') return warehouseReads;
    if (event.type === 'customer_address.updated' && event.resourceType === 'customer_address') return addressReads;
    if (event.type === 'account.updated' && event.resourceType === 'account') return accountReads;
    return null;
}
