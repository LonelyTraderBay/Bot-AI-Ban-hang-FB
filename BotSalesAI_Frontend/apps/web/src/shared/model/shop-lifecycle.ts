import type { OperationId } from '@botsales/contracts';

const permittedWhenClosed: ReadonlySet<string> = new Set<OperationId>([
    'closeShop', 'reopenShop', 'revokeMembership', 'createPrivacyRequest', 'approvePrivacyRequest',
]);

export function permitsClosedShopWrite(operation?: string) {
    return operation !== undefined && permittedWhenClosed.has(operation);
}
