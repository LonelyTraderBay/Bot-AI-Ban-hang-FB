import { useSearchParams } from 'react-router-dom';
export function useListQuery() {
    const [params] = useSearchParams();
    const query: Record<string, string | number | undefined> = { limit: 20 };
    for (const key of ['q', 'cursor', 'status', 'state', 'orderId', 'customerId', 'variantId', 'warehouseId', 'supplierId', 'purchaseOrderId', 'kind'])
        if (params.has(key))
            query[key] = params.get(key) || undefined;
    return query;
}
