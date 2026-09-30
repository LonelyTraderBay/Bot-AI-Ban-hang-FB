import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { request, cancelScopeRequests, setCsrfToken } from '@/shared/api/client';
import { SessionContext } from '@/shared/model/auth';
export { useSession } from '@/shared/model/auth';
export function SessionProvider({ children }: {
    children: ReactNode;
}) {
    const cache = useQueryClient();
    const [online, setOnline] = useState(navigator.onLine);
    const query = useQuery({ queryKey: ['session'], queryFn: ({ signal }) => request('getSession', { signal }), retry: false, staleTime: 15000 });
    const { refetch } = query;
    useEffect(() => { if (query.data)
        setCsrfToken(query.data.data.csrfToken); }, [query.data]);
    const refresh = useCallback(async () => { cancelScopeRequests(); await cache.cancelQueries({ queryKey: ['scope'] }); cache.removeQueries({ queryKey: ['scope'] }); cache.removeQueries({ queryKey: ['shop'] }); await refetch(); }, [cache, refetch]);
    useEffect(() => { const off = () => setOnline(false); const on = () => { setOnline(true); void refresh(); }; const changed = () => { if (document.visibilityState === 'visible' && navigator.onLine)
        void refetch(); }; window.addEventListener('offline', off); window.addEventListener('online', on); document.addEventListener('visibilitychange', changed); return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on); document.removeEventListener('visibilitychange', changed); }; }, [refresh, refetch]);
    const logout = useCallback(async () => { await request('logout'); cancelScopeRequests(); setCsrfToken(''); cache.clear(); window.location.assign('/login'); }, [cache]);
    return <SessionContext.Provider value={{ session: query.data?.data || null, loading: query.isPending, error: query.error, refresh, logout, online }}>{children}</SessionContext.Provider>;
}
