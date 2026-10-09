import type { EventEnvelope } from '@botsales/contracts';
import type { QueryOperationId } from './client';

const inboxReads: readonly QueryOperationId[] = [
    'listMessages', 'getConversation', 'listConversations', 'getInboxMetadata',
    'getDashboard', 'getReportSummary', 'getMarketingSummary', 'getOperationsSummary',
    'listWorkItems', 'listDigests', 'listNotifications',
];
/** Only proven Inbox relationships are narrowed. Other events keep authoritative full resync. */
export function eventInvalidations(event: EventEnvelope): readonly QueryOperationId[] | null {
    if (event.type === 'message.created' && event.resourceType === 'message') return inboxReads;
    if (event.type === 'conversation.updated' && event.resourceType === 'conversation') return inboxReads;
    return null;
}
