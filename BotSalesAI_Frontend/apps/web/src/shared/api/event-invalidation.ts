import type { EventEnvelope } from '@botsales/contracts';
import type { QueryOperationId } from './client';

const inboxReads: readonly QueryOperationId[] = [
    'listMessages', 'getConversation', 'listConversations', 'getInboxMetadata',
    'getDashboard', 'getReportSummary', 'getMarketingSummary', 'getOperationsSummary',
    'listWorkItems', 'listDigests', 'listNotifications',
];
const warehouseReads: readonly QueryOperationId[] = ['listWarehouses', 'getWarehouse', 'listStockSnapshots', 'listStockMovements', 'listReorderRules', 'listPurchaseSuggestions', 'listPurchaseOrders', 'getPurchaseOrder', 'listOrders', 'getOrder'];
const addressReads: readonly QueryOperationId[] = ['listCustomerAddresses', 'getCustomerAddress', 'getCustomer', 'listCustomers', 'listOrders', 'getOrder'];
const accountReads: readonly QueryOperationId[] = ['listAccounts', 'getAccount', 'listJournals', 'getJournal', 'getProfitLoss', 'getCashflow', 'getLedger', 'getTrialBalance', 'getBalanceSheet'];
const journalReads:readonly QueryOperationId[] = ['listJournals','getJournal','listFinanceEntries','getFinanceEntry','getLedger','getTrialBalance','getBalanceSheet','getCashflow','getProfitLoss'];
const openingReads:readonly QueryOperationId[] = [...journalReads,'listOpeningBalances','getOpeningBalance','listStockSnapshots','getShop'];
const purchaseReads: readonly QueryOperationId[] = ['listPurchaseOrders', 'getPurchaseOrder', 'listPurchaseSuggestions', 'listReorderRules'];
/** Known resource relationships are narrowed; malformed and unknown events request full resync. */
export function eventInvalidations(event: EventEnvelope): readonly QueryOperationId[] | null {
    if (event.schemaVersion !== 2) return null;
    if (event.type === 'message.created' && event.resourceType === 'message') return inboxReads;
    if (event.type === 'conversation.updated' && event.resourceType === 'conversation') return inboxReads;
    if (event.type === 'warehouse.updated' && event.resourceType === 'warehouse') return warehouseReads;
    if (event.type === 'customer_address.updated' && event.resourceType === 'customer_address') return addressReads;
    if (event.type === 'account.updated' && event.resourceType === 'account') return accountReads;
    if (event.type === 'consent_challenge.updated' && event.resourceType === 'consent_challenge') return ['listCustomerConsentChallenges'];
    if (event.type === 'customer_consent.updated' && event.resourceType === 'customer_consent') return ['listCustomerConsents'];
    if (event.type === 'purchase_delegation.updated' && event.resourceType === 'purchase_delegation') return ['listPurchaseDelegations', 'listPurchaseDelegationReservations', 'listReorderRules', 'listPurchaseSuggestions'];
    if (event.type === 'purchase_reservation.updated' && event.resourceType === 'purchase_reservation') return ['listPurchaseDelegationReservations', 'listBudgetPolicies', ...purchaseReads];
    if (event.type === 'purchase_suggestion.updated' && event.resourceType === 'purchase_suggestion') return ['listPurchaseSuggestions'];
    if (event.type === 'purchase.updated' && event.resourceType === 'purchase_order') return purchaseReads;
    if(event.type==='journal.updated'&&event.resourceType==='journal')return journalReads;
    if(event.type==='opening_balance.updated'&&event.resourceType==='opening_balance')return openingReads;
    if(event.type==='accounting_period.updated'&&event.resourceType==='accounting_period')return ['listAccountingPeriods',...journalReads];
    return null;
}
