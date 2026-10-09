import { createContext, useContext } from 'react';
import type { Session } from '@botsales/contracts';
export interface SessionContextValue {
    session: Session | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
    logout: () => Promise<void>;
    online: boolean;
}
export const SessionContext = createContext<SessionContextValue | null>(null);
export function useSession() { const value = useContext(SessionContext); if (!value)
    throw new Error('Missing SessionProvider'); return value; }
