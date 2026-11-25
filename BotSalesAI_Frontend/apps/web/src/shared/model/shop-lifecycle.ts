import type { OperationId } from '@botsales/contracts';

const permittedWhenClosed: ReadonlySet<string> = new Set<OperationId>([
    'closeShop', 'reopenShop', 'revokeMembership', 'createPrivacyRequest', 'approvePrivacyRequest',
]);

export function isShopTransition(op: string): op is 'closeShop' | 'reopenShop' {
    return op === 'closeShop' || op === 'reopenShop';
}

export function permitsClosedShopWrite(operation?: string) {
    return operation !== undefined && permittedWhenClosed.has(operation);
}
