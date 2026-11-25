import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { request, cancelScopeRequests, setCsrfToken, subscribeSessionInvalidation } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { SessionContext } from '@/shared/model/auth';
export { useSession } from '@/shared/model/auth';
export function SessionProvider({ children }: {
    children: ReactNode;
}) {
    const cache = useQueryClient();
    const [online, setOnline] = useState(navigator.onLine);
    const [forcedAnonymous, setForcedAnonymous] = useState(false);
    const query = useQuery({ queryKey: ['session'], queryFn: ({ signal }) => request('getSession', { signal }), retry: false, staleTime: 15000 });
    const { refetch } = query;
    const sessionRejected = query.error instanceof ApiError && query.error.status === 401;
    const clearSession = useCallback(() => {
        setForcedAnonymous(true);
        cancelScopeRequests();
        setCsrfToken('');
        cache.clear();
    }, [cache]);
    useEffect(() => subscribeSessionInvalidation(clearSession), [clearSession]);
    useEffect(() => {
        if (sessionRejected && query.data) clearSession();
        else if (!forcedAnonymous && query.data) setCsrfToken(query.data.data.csrfToken);
    }, [clearSession, forcedAnonymous, query.data, sessionRejected]);
    const refresh = useCallback(async () => {
        cancelScopeRequests();
        await Promise.all([
            cache.cancelQueries({ queryKey: ['scope'] }),
            cache.cancelQueries({ queryKey: ['shop'] }),
            cache.cancelQueries({ queryKey: ['shops'] }),
        ]);
        cache.removeQueries({ queryKey: ['scope'] });
        cache.removeQueries({ queryKey: ['shop'] });
        cache.removeQueries({ queryKey: ['shops'] });
        const result = await refetch();
        if (result.isError || !result.data) {
            setCsrfToken('');
            setForcedAnonymous(true);
            return;
        }
        setCsrfToken(result.data.data.csrfToken);
        setForcedAnonymous(false);
    }, [cache, refetch]);
    useEffect(() => {
        const off = () => setOnline(false);
        const on = () => { setOnline(true); void refresh(); };
        const changed = () => {
            if (document.visibilityState === 'visible' && navigator.onLine)
                void refresh();
        };
        window.addEventListener('offline', off);
        window.addEventListener('online', on);
        document.addEventListener('visibilitychange', changed);
        return () => {
            window.removeEventListener('offline', off);
            window.removeEventListener('online', on);
            document.removeEventListener('visibilitychange', changed);
        };
    }, [refresh]);
    const logout = useCallback(async () => {
        if (query.data)
            setCsrfToken(query.data.data.csrfToken);
        await request('logout');
        clearSession();
    }, [clearSession, query.data]);
    return <SessionContext.Provider value={{
        session: forcedAnonymous || sessionRejected ? null : query.data?.data ?? null,
        loading: !forcedAnonymous && query.isPending, error: query.error, refresh, logout, online,
    }}>{children}</SessionContext.Provider>;
}
