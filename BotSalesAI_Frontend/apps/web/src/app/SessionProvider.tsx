import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ResponseOf } from '@botsales/contracts';
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
    const [refreshing, setRefreshing] = useState(false);
    const refreshTask = useRef<Promise<void> | null>(null);
    const sessionGeneration = useRef(0);
    const query = useQuery({ queryKey: ['session'], queryFn: ({ signal }) => request('getSession', { signal }), retry: false, staleTime: 15000 });
    const { refetch } = query;
    const sessionRejected = query.error instanceof ApiError && query.error.status === 401;
    const clearSession = useCallback(() => {
        sessionGeneration.current++;
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
    const refresh = useCallback(() => {
        if (refreshTask.current) return refreshTask.current;
        const prior = cache.getQueryData<ResponseOf<'getSession'>>(['session'])?.data;
        const generation = sessionGeneration.current;
        const scopeQueries = [['scope'], ['shop'], ['shops']];
        setRefreshing(true);
        cancelScopeRequests();
        const revalidate = async () => {
            await Promise.all(scopeQueries.map(queryKey => cache.cancelQueries({ queryKey })));
            const result = await refetch();
            if (generation !== sessionGeneration.current) return;
            if (result.isError || !result.data) {
                clearSession();
                return;
            }
            const current = result.data.data;
            setCsrfToken(current.csrfToken);
            setForcedAnonymous(false);
            const sameScope = prior?.user.id === current.user.id &&
                JSON.stringify(prior.memberships) === JSON.stringify(current.memberships);
            if (sameScope) {
                await Promise.all(scopeQueries.map(queryKey => cache.invalidateQueries({ queryKey })));
            } else {
                scopeQueries.forEach(queryKey => cache.removeQueries({ queryKey }));
            }
        };
        const pending = revalidate().finally(() => {
            refreshTask.current = null;
            setRefreshing(false);
        });
        refreshTask.current = pending;
        return pending;
    }, [cache, clearSession, refetch]);
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
        loading: !forcedAnonymous && query.isPending, error: query.error, refresh, logout, online: online && !refreshing,
    }}>{children}</SessionContext.Provider>;
}
