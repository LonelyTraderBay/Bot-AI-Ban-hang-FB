import { createContext, useContext } from 'react';
import type { Membership, Session, Shop } from '@botsales/contracts';
export interface Scope {
    session: Session;
    shop: Shop;
    membership: Membership;
    online: boolean;
    refreshSession: () => Promise<void>;
}
export const ScopeContext = createContext<Scope | null>(null);
export function useScope() {
    const scope = useContext(ScopeContext);
    if (!scope)
        throw new Error('Shop scope chưa khởi tạo');
    return scope;
}
export function useCan(permission: string | null, actions?: string[], action?: string) {
    const { membership } = useScope();
    return (permission === null || membership.permissions.includes(permission as Membership['permissions'][number])) && (!actions || !action || actions.includes(action));
}
