import { ActionGroup, FormFields } from '../../shared/ui/composition';
import { useEffect, useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { useSearchParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import type { StockMovement, StockSnapshot } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useCan, useScope } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { limitCodePoints, codePointLength, dateTime } from '@/shared/model/format';
import { PageHeader, Panel, DataTable, QueryState, Toolbar, Pager, Status, Amount, MutationButton, EditDialog, ErrorNotice, RouteLink } from '@/shared/ui/components';
import { layoutSx } from '@/shared/ui/layout';

const adjustmentSchema = z.object({
    quantityDelta: z.string().trim().min(1, 'Nhập số lượng cần điều chỉnh').regex(/^-?\d+$/, 'Số lượng phải là số nguyên'),
    reason: z.string().trim().refine(value => codePointLength(value) >= 5, 'Lý do cần ít nhất 5 ký tự').refine(value => codePointLength(value) <= 1000, 'Lý do không được quá 1.000 ký tự'),
    unitCost: z.string().trim().max(60, 'Giá vốn không được quá 60 ký tự').refine(value => !value || /^(0|[1-9]\d*)(\.\d{1,18})?$/.test(value), 'Giá vốn phải là số thập phân không âm, tối đa 18 chữ số lẻ'),
}).superRefine(({ quantityDelta }, context) => {
    const amount = Number(quantityDelta);
    if (!Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > 2_147_483_647)
        context.addIssue({ code: 'custom', path: ['quantityDelta'], message: 'Số điều chỉnh phải khác 0 và nằm trong giới hạn hợp đồng.' });
});
type AdjustmentFields = z.infer<typeof adjustmentSchema>;
const emptyAdjustment: AdjustmentFields = { quantityDelta: '', reason: '', unitCost: '' };

function InventoryFilters({ includeVariant = false }: { includeVariant?: boolean }) {
    const [params, setParams] = useSearchParams();
    const [warehouseId, setWarehouseId] = useState(params.get('warehouseId') || '');
    const [variantId, setVariantId] = useState(params.get('variantId') || '');

    useEffect(() => {
        setWarehouseId(params.get('warehouseId') || '');
        setVariantId(params.get('variantId') || '');
    }, [params]);

    const apply = () => {
        const next = new URLSearchParams(params);
        const filters: Array<[string, string]> = [['warehouseId', warehouseId], ['variantId', includeVariant ? variantId : '']];
        for (const [key, value] of filters) {
            const normalized = value.trim();
            if (normalized) next.set(key, normalized);
            else next.delete(key);
        }
        next.delete('cursor');
        setParams(next);
    };

    const clear = () => {
        setWarehouseId('');
        setVariantId('');
        const next = new URLSearchParams(params);
        next.delete('warehouseId');
        next.delete('variantId');
        next.delete('cursor');
        setParams(next);
    };

    return <FormFields direction={{ xs: 'column', sm: 'row' }}  alignItems={{ sm: 'center' }} flexWrap="wrap">
        <FormFields direction={{ xs: 'column', sm: 'row' }} >
            <TextField size="small" label="Mã kho" value={warehouseId} onChange={event => setWarehouseId(limitCodePoints(event.target.value, 120))}  sx={{ minWidth: { sm: 150 } }}/>
            {includeVariant && <>
                <TextField size="small" label="Mã biến thể" value={variantId} onChange={event => setVariantId(limitCodePoints(event.target.value, 120))}  sx={{ minWidth: { sm: 160 } }}/>
            </>}
        </FormFields>
        <ActionGroup direction="row" >
            <Button type="button" size="small" variant="outlined" onClick={apply}>Áp dụng bộ lọc</Button>
            <Button type="button" size="small" onClick={clear}>Xóa bộ lọc</Button>
        </ActionGroup>
    </FormFields>;
}

export function InventoryPage() {
    const { shop } = useScope();
    const canFinance = useCan('finance.read');
    const canCatalog = useCan('catalog.read');
    const list = useApi('listStockSnapshots', { query: useListQuery('listStockSnapshots') });
    const adjust = useCommand('createInventoryAdjustment', ['listStockSnapshots', 'listStockMovements', 'getDashboard']);
    const [item, setItem] = useState<StockSnapshot | null>(null);
    const [completedCommandId, setCompletedCommandId] = useState('');
    const { control, register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AdjustmentFields>({
        defaultValues: emptyAdjustment,
        resolver: zodResolver(adjustmentSchema),
    });

    const edit = (snapshot: StockSnapshot) => {
        setItem(snapshot);
        setCompletedCommandId('');
        reset({ quantityDelta: '', reason: '', unitCost: canFinance ? snapshot.unitCost?.amount || '' : '' });
        adjust.clearError();
    };
    const close = () => {
        setItem(null);
        reset(emptyAdjustment);
    };
    const submitAdjustment = async (fields: AdjustmentFields) => {
        if (!item) return;
        try {
            const result = await adjust.execute({ version: item.version, body: {
                variantId: item.variantId,
                warehouseId: item.warehouseId,
                quantityDelta: Number(fields.quantityDelta),
                reason: fields.reason.trim(),
                expectedVersion: item.version,
                unitCost: canFinance && fields.unitCost ? { amount: fields.unitCost, currency: shop.currency } : null,
            } });
            setCompletedCommandId(result.data.id);
            close();
        }
        catch { /* Keep the entered values; unknown outcomes stay locked by useCommand recovery. */ }
    };
    const submitting = adjust.pending || isSubmitting;

    return <>
        <PageHeader title="Tồn kho" subtitle="Tồn thực tế, đã giữ cho đơn và số còn có thể bán." actions={<RouteLink to={`/s/${shop.id}/inventory/movements`}>Lịch sử biến động</RouteLink>}/>
        <Alert severity="info" sx={layoutSx.page.sectionAfter}>Snapshot kho do API cung cấp; không cộng hàng đang về hoặc hàng cách ly vào số có thể bán. Kho mặc định: {shop.defaultWarehouseId}.</Alert>
        {completedCommandId && <Alert severity="success" role="status" sx={layoutSx.notice.afterGap}>Điều chỉnh đã được xác nhận. Mã lệnh: {completedCommandId}. Tồn kho và lịch sử đã được tải lại.</Alert>}
        <Panel><Toolbar operation="listStockSnapshots" placeholder="Tìm SKU hoặc mã biến thể…" filters={<InventoryFilters/>}/><QueryState query={list} pendingProfile="section">{list.data && <>
            <DataTable label="Tồn kho theo vị trí" rows={list.data.data} rowKey={row => row.id} columns={[
                { key: 'sku', label: 'SKU / Kho', render: row => <Stack><Typography fontWeight={visualSx.typography.fontWeight.strong}>{row.sku}</Typography><Typography variant="caption" color="text.secondary">{row.warehouseId} · snapshot {dateTime(row.asOf, shop.timezone)}</Typography>{canCatalog && <RouteLink to={`/s/${shop.id}/products?q=${encodeURIComponent(row.sku)}`}>Mở sản phẩm</RouteLink>}</Stack> },
                { key: 'onHand', label: 'Thực tế', align: 'right', render: row => row.onHand },
                { key: 'reserved', label: 'Đã giữ', align: 'right', render: row => row.reserved },
                { key: 'available', label: 'Có thể bán', align: 'right', render: row => <Typography fontWeight={visualSx.typography.fontWeight.display} color={row.available <= row.lowStockThreshold ? 'warning.main' : 'text.primary'}>{row.available}</Typography> },
                { key: 'threshold', label: 'Ngưỡng cảnh báo', align: 'right', render: row => row.lowStockThreshold },
                ...(canFinance ? [{ key: 'cost', label: 'Giá vốn/đơn vị', render: (row: StockSnapshot) => <Amount value={row.unitCost}/> }] : []),
                { key: 'state', label: 'Tình trạng', render: row => <Status value={row.available <= row.lowStockThreshold ? 'blocked' : 'active'}/> },
                { key: 'action', label: '', render: row => <MutationButton permission="inventory.adjust" onClick={() => edit(row)}>Điều chỉnh</MutationButton> },
            ]}/>
            <Pager page={list.data.page}/>
        </>}</QueryState></Panel>
        <EditDialog open={!!item} title={`Điều chỉnh ${item?.sku || ''}`} description="Nhập phần tăng hoặc giảm của vị trí này. Số tồn chỉ đổi sau khi lệnh được xác nhận." onClose={close} busy={submitting} actions={<MutationButton permission="inventory.adjust" variant="contained" busy={submitting} type="button" onClick={() => void handleSubmit(submitAdjustment)()}>Xác nhận điều chỉnh</MutationButton>}>
            <ErrorNotice error={adjust.error}/>
            <FormFields component="form" id="inventory-adjustment-form" noValidate  onSubmit={event => { event.preventDefault(); void handleSubmit(submitAdjustment)(event); }}>
                <Alert severity="warning">API kiểm tra lại phiên bản và lượng đang giữ. Không nhập tổng tồn; không thể giảm thấp hơn lượng đã giữ.</Alert>
                <TextField label="Thay đổi số lượng" inputProps={{ inputMode: 'numeric' }} {...register('quantityDelta')} error={!!errors.quantityDelta} helperText={errors.quantityDelta?.message}/>
                <TextField label="Lý do điều chỉnh" multiline minRows={2} {...register('reason')} error={!!errors.reason} helperText={errors.reason?.message}/>
                {canFinance && <Controller name="unitCost" control={control} render={({ field }) => <TextField {...field} label={`Giá vốn đơn vị (${shop.currency})`} inputProps={{ inputMode: 'decimal' }} error={!!errors.unitCost} helperText={errors.unitCost?.message || 'Để trống nếu không cập nhật giá vốn.'}/>}/>}
            </FormFields>
        </EditDialog>
    </>;
}

export function MovementsPage() {
    const { shop } = useScope();
    const canReadOrders = useCan('orders.read');
    const list = useApi('listStockMovements', { query: useListQuery('listStockMovements') });
    return <>
        <PageHeader title="Lịch sử kho" subtitle="Truy nguyên mỗi thay đổi đến chứng từ và người thực hiện." actions={<RouteLink to={`/s/${shop.id}/inventory`}>Về tồn kho</RouteLink>}/>
        <Panel><Toolbar operation="listStockMovements" placeholder="Tìm SKU, mã biến thể hoặc mã chứng từ…" filters={<InventoryFilters includeVariant/>}/><QueryState query={list} pendingProfile="section">{list.data && <>
            <DataTable label="Lịch sử biến động kho" rows={list.data.data} rowKey={row => row.id} columns={[
                { key: 'date', label: 'Thời gian', render: row => dateTime(row.createdAt, shop.timezone) },
                { key: 'kind', label: 'Loại', render: row => <Status value={row.kind}/> },
                { key: 'variant', label: 'Biến thể', render: row => row.variantId },
                { key: 'warehouse', label: 'Kho', render: row => row.warehouseId },
                { key: 'quantity', label: 'Tồn ±', align: 'right', render: row => row.quantityDelta },
                { key: 'reserved', label: 'Giữ ±', align: 'right', render: row => row.reservedDelta },
                { key: 'source', label: 'Nguồn', render: row => movementSource(row, shop.id, canReadOrders) },
                { key: 'actor', label: 'Người thực hiện', render: row => row.actorId },
                { key: 'reason', label: 'Lý do', render: row => row.reason },
            ]}/>
            <Pager page={list.data.page}/>
        </>}</QueryState></Panel>
    </>;
}

function movementSource(row: StockMovement, shopId: string, canReadOrders: boolean) {
    if (!row.sourceRef) return 'Điều chỉnh thủ công';
    if (row.sourceRef.type === 'order' && canReadOrders)
        return <RouteLink to={`/s/${shopId}/orders/${encodeURIComponent(row.sourceRef.id)}`}>Đơn {row.sourceRef.id}</RouteLink>;
    return `${row.sourceRef.type} · ${row.sourceRef.id}`;
}
