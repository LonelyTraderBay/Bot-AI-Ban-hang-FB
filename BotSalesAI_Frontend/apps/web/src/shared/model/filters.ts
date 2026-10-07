import { useSearchParams } from 'react-router-dom';
import { operations } from '@botsales/contracts';
import type { QueryApiOptions, QueryOperationId } from '../api/client';

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
