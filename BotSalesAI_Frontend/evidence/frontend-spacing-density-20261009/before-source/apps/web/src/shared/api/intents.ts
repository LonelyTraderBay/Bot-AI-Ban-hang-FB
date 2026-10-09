import type { OperationId } from '@botsales/contracts';
/** Session-memory command recovery metadata only. No keys, messages, amounts or request bodies. */
export interface UnresolvedIntent {
    intentId: string;
    shopId: string;
    operation: OperationId;
    commandId: string | null;
}
let snapshot: readonly UnresolvedIntent[] = [];
const subscribers = new Set<() => void>();
export const intentSnapshot = () => snapshot;
export function subscribeIntents(fn: () => void) { subscribers.add(fn); return () => { subscribers.delete(fn); }; }
export function rememberUnknown(intent: UnresolvedIntent) { snapshot = [...snapshot.filter(x => x.intentId !== intent.intentId), intent]; for (const fn of subscribers)
    fn(); }
export function resolveObservedIntent(intentId: string) { snapshot = snapshot.filter(x => x.intentId !== intentId); for (const fn of subscribers)
    fn(); }
export const hasUnknownIntent = (shopId: string, operation: OperationId) => snapshot.some(x => x.shopId === shopId && x.operation === operation);
