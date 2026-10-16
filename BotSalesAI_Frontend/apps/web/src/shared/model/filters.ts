import { useSearchParams } from 'react-router-dom';
import { operations } from '@botsales/contracts';
import type { QueryApiOptions, QueryOperationId } from '../api/client';

/** Use the browser's newest query after history changes but before Router has rerendered. */
export function currentSearchParams(fallback: URLSearchParams, pathname: string): URLSearchParams {
    const browserLocationIsCurrent = typeof window !== 'undefined' && window.location.pathname === pathname;
    return new URLSearchParams(browserLocationIsCurrent ? window.location.search : fallback);
}

export function useListQuery<K extends QueryOperationId>(operation: K, cursorParam = 'cursor'): QueryApiOptions<K>['query'] {
    const [params] = useSearchParams();
    const query: Record<string, string | number | undefined> = {};
    for (const parameter of operations[operation].queryParameters) {
        if (parameter.name === 'limit') {
            query.limit = 20;
            continue;
        }
        const key = parameter.name === 'cursor' ? cursorParam : parameter.name;
        if (params.has(key))
            query[parameter.name] = params.get(key) || undefined;
    }
    return query as QueryApiOptions<K>['query'];
}
