import { operations, type OperationId } from '@botsales/contracts';

/** Live recovery keeps a digest and scoped references for the lifetime of the tab. */
export interface UnresolvedIntent {
    intentId: string;
    shopId: string;
    operation: OperationId;
    commandId: string | null;
    actorId?: string;
}
const storageKey = 'botsales.command-recovery.v1';

function loadIntents(): UnresolvedIntent[] {
    try {
        const stored: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '[]');
        return Array.isArray(stored) ? stored.filter((entry): entry is UnresolvedIntent =>
            entry && typeof entry.actorId === 'string' && typeof entry.shopId === 'string'
            && typeof entry.intentId === 'string' && /^[a-f0-9]{64}$/.test(entry.intentId)
            && typeof entry.operation === 'string' && Object.hasOwn(operations, entry.operation)
            && (entry.commandId === null || typeof entry.commandId === 'string')) : [];
    } catch {
        return [];
    }
}

let persisted = __MOCK__ ? [] : loadIntents();
let snapshot: readonly UnresolvedIntent[] = persisted;
const subscribers = new Set<() => void>();
export const intentSnapshot = () => snapshot;
export function subscribeIntents(fn: () => void) { subscribers.add(fn); return () => { subscribers.delete(fn); }; }

function matches(candidate: UnresolvedIntent, expected: UnresolvedIntent | string): boolean {
    if (typeof expected === 'string') return candidate.intentId === expected && !candidate.actorId;
    return candidate.intentId === expected.intentId && candidate.actorId === expected.actorId
        && candidate.shopId === expected.shopId && candidate.operation === expected.operation;
}

function updateStorage(next: UnresolvedIntent[]) {
    persisted = next;
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); }
    catch { /* Recovery remains available in memory when storage is blocked. */ }
}

export async function prepareIntent(actorId: string, shopId: string, operation: OperationId, key: string): Promise<UnresolvedIntent> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
    const intentId = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    return { actorId, shopId, operation, intentId, commandId: null };
}

export function persistIntent(intent: UnresolvedIntent) {
    updateStorage([...persisted.filter(entry => !matches(entry, intent)), intent]);
}

export function rememberUnknown(intent: UnresolvedIntent) {
    if (intent.actorId) persistIntent(intent);
    snapshot = [...snapshot.filter(entry => !matches(entry, intent)), intent];
    for (const fn of subscribers) fn();
}

export function resolveObservedIntent(intent: UnresolvedIntent | string) {
    if (typeof intent !== 'string' && intent.actorId) updateStorage(persisted.filter(entry => !matches(entry, intent)));
    const next = snapshot.filter(entry => !matches(entry, intent));
    if (next.length === snapshot.length) return;
    snapshot = next;
    for (const fn of subscribers) fn();
}

export const intentInScope = (intent: UnresolvedIntent, shopId: string, actorId: string) =>
    intent.shopId === shopId && (__MOCK__ || intent.actorId === actorId);

export const hasUnknownIntent = (shopId: string, operation: OperationId, actorId: string) =>
    snapshot.some(intent => intentInScope(intent, shopId, actorId) && intent.operation === operation);
