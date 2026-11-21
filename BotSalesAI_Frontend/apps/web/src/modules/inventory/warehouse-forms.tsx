import { useState } from 'react';
import { Button, MenuItem, TextField, Typography } from '@mui/material';
import { usePagedApi } from '@/shared/api/hooks';
import { useCan } from '@/shared/model/scope';
import { FieldGroup, FormFields } from '@/shared/ui/composition';
import { ErrorNotice, LookupLoadMore } from '@/shared/ui/components';

export type PickedSku = { id: string; sku: string; quantity: string };

export const stockReads = ['listStockSnapshots', 'listStockMovements', 'listJournals', 'getLedger',
    'getTrialBalance', 'getBalanceSheet', 'getProfitLoss', 'getDashboard'] as const;

export function useActiveWarehouses() {
    const canRead = useCan('inventory.read');
    return usePagedApi('listWarehouses', { query: { status: 'active', limit: 20 } }, canRead);
}

export function WarehousePicker({ label, value, change, warehouses, exclude }: {
    label: string;
    value: string;
    change: (id: string) => void;
    warehouses: ReturnType<typeof useActiveWarehouses>;
    exclude?: string;
}) {
    const options = warehouses.data?.data.filter(warehouse => warehouse.id !== exclude) ?? [];
    return <TextField select fullWidth label={label} value={value} onChange={event => change(event.target.value)}>
        <MenuItem value="">Chọn kho</MenuItem>
        {value && !options.some(warehouse => warehouse.id === value) && <MenuItem value={value}>{value}</MenuItem>}
        {options.map(warehouse => <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.name} · {warehouse.code}</MenuItem>)}
    </TextField>;
}

export function WarehouseLookupStatus({ warehouses }: { warehouses: ReturnType<typeof useActiveWarehouses> }) {
    return <>
        <ErrorNotice error={warehouses.error} />
        <LookupLoadMore label="kho" hasMore={warehouses.hasMore} loadedCount={warehouses.loadedCount} busy={warehouses.isLoadingMore}
            onLoadMore={() => void warehouses.loadMore()} />
    </>;
}

export function StockPositionPicker({ warehouseId, selected, change, withQuantity = false }: {
    warehouseId: string;
    selected: PickedSku[];
    change: (value: PickedSku[]) => void;
    withQuantity?: boolean;
}) {
    const [search, setSearch] = useState('');
    const stocks = usePagedApi('listStockSnapshots', { query: { warehouseId, q: search.trim() || undefined, limit: 20 } }, Boolean(warehouseId));
    const options = stocks.data?.data.filter(stock => !selected.some(item => item.id === stock.variantId)) ?? [];
    return <FormFields density="compact">
        <ErrorNotice error={stocks.error} />
        <TextField label="Tìm mã SKU trong kho" disabled={!warehouseId} value={search} onChange={event => setSearch(event.target.value)} />
        <TextField select label="Thêm SKU từ tồn kho" value="" disabled={!warehouseId || selected.length >= 100} onChange={event => {
            const stock = options.find(item => item.variantId === event.target.value);
            if (stock) change([...selected, { id: stock.variantId, sku: stock.sku, quantity: '1' }]);
        }}>
            <MenuItem value="" disabled>{stocks.isFetching ? 'Đang tải SKU…' : options.length ? 'Chọn SKU' : 'Chưa có SKU phù hợp'}</MenuItem>
            {options.map(stock => <MenuItem key={stock.variantId} value={stock.variantId}>{stock.sku} · khả dụng {stock.available}</MenuItem>)}
        </TextField>
        {warehouseId && <LookupLoadMore label="SKU" hasMore={stocks.hasMore} loadedCount={stocks.loadedCount} busy={stocks.isLoadingMore}
            onLoadMore={() => void stocks.loadMore()} />}
        {selected.map(item => <FieldGroup key={item.id} direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Typography>{item.sku}</Typography>
            {withQuantity && <TextField label={`Số lượng chuyển ${item.sku}`} value={item.quantity} inputProps={{ inputMode: 'numeric' }}
                onChange={event => change(selected.map(selection => selection.id === item.id ? { ...selection, quantity: event.target.value } : selection))} />}
            <Button onClick={() => change(selected.filter(selection => selection.id !== item.id))}>Bỏ {item.sku}</Button>
        </FieldGroup>)}
    </FormFields>;
}
