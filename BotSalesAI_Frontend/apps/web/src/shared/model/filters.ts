import { useSearchParams } from 'react-router-dom';
import { operations } from '@botsales/contracts';
import type { QueryApiOptions, QueryOperationId } from '../api/client';

export type ListFilter = {
    name: string;
    label: string;
    options: readonly { value: string; label: string }[];
    defaultValue?: string;
    pinned?: true;
};

export function supportedListFilters(operation: QueryOperationId, filters: readonly ListFilter[]) {
    return filters.filter(filter => operations[operation].queryParameters.some(parameter => parameter.name === filter.name));
}

export function listFilterValue(params: URLSearchParams, filter: ListFilter) {
    return params.get(filter.name) || filter.defaultValue || 'all';
}

/** Use the browser's newest query after history changes but before Router has rerendered. */
export function currentSearchParams(fallback: URLSearchParams, pathname: string): URLSearchParams {
    const browserLocationIsCurrent = typeof window !== 'undefined' && window.location.pathname === pathname;
    return new URLSearchParams(browserLocationIsCurrent ? window.location.search : fallback);
}

export function useListQuery<K extends QueryOperationId>(operation: K, cursorParam = 'cursor', filters?: readonly ListFilter[]): QueryApiOptions<K>['query'] {
    const [params] = useSearchParams();
    const query: Record<string, string | number | undefined> = {};
    for (const parameter of operations[operation].queryParameters) {
        if (parameter.name === 'limit') {
            query.limit = 20;
            continue;
        }
        const filter = filters?.find(candidate => candidate.name === parameter.name);
        if (filter) {
            const value = listFilterValue(params, filter);
            if (value !== 'all') query[parameter.name] = value;
            continue;
        }
        const key = parameter.name === 'cursor' ? cursorParam : parameter.name;
        if (params.has(key))
            query[parameter.name] = params.get(key) || undefined;
    }
    return query as QueryApiOptions<K>['query'];
}
