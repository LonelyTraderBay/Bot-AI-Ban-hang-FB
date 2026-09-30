import { useState } from 'react';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import type { StockSnapshot } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useCan, useScope } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { dateTime } from '@/shared/model/format';
import { PageHeader, Panel, DataTable, QueryState, Toolbar, Pager, Status, Amount, MutationButton, EditDialog, ErrorNotice, RouteLink } from '@/shared/ui/components';
export function InventoryPage() {
    const { shop } = useScope();
    const canFinance = useCan('finance.read');
    const list = useApi('listStockSnapshots', { query: useListQuery() });
    const adjust = useCommand('createInventoryAdjustment', ['listStockSnapshots', 'listStockMovements', 'getDashboard']);
    const [item, setItem] = useState<StockSnapshot | null>(null), [delta, setDelta] = useState(''), [reason, setReason] = useState(''), [cost, setCost] = useState('');
    const edit = (s: StockSnapshot) => { setItem(s); setDelta(''); setReason(''); setCost(s.unitCost?.amount || ''); adjust.clearError(); };
    return <><PageHeader title="Tồn kho" subtitle="Tồn thực tế, đã giữ cho đơn và số còn có thể bán." actions={<RouteLink to={`/s/${shop.id}/inventory/movements`}>Lịch sử biến động</RouteLink>}/><Alert severity="info" sx={{ mb: 3 }}>Giá trị trên màn hình lấy từ API. Hàng đang về và hàng cách ly không được tính là hàng có thể bán.</Alert><Panel><Toolbar placeholder="Tìm SKU…"/><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={r => r.id} columns={[
        {
            key: 'sku', label: 'SKU / Kho', render: r => <Stack><Typography fontWeight={650}>{r.sku}</Typography><Typography variant="caption" color="text.secondary">{r.warehouseId}</Typography></Stack>
        },
        { key: 'onHand', label: 'Thực tế', align: 'right', render: r => r.onHand }, { key: 'reserved', label: 'Đã giữ', align: 'right', render: r => r.reserved },
        {
            key: 'available', label: 'Có thể bán', align: 'right', render: r => <Typography fontWeight={750} color={r.available <= r.lowStockThreshold ? 'warning.main' : 'text.primary'}>{r.available}</Typography>
        },
        { key: 'threshold', label: 'Ngưỡng cảnh báo', align: 'right', render: r => r.lowStockThreshold }, ...(canFinance ? [{ key: 'cost', label: 'Giá vốn/đơn vị', render: (r: StockSnapshot) => <Amount value={r.unitCost}/> }] : []), { key: 'state', label: 'Tình trạng', render: r => <Status value={r.available <= r.lowStockThreshold ? 'blocked' : 'active'}/> },
        {
            key: 'action', label: '', render: r => <MutationButton permission="inventory.adjust" onClick={() => edit(r)}>Điều chỉnh</MutationButton>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <EditDialog open={!!item} title={`Điều chỉnh ${item?.sku || ''}`} onClose={() => setItem(null)} busy={adjust.pending} actions={<MutationButton permission="inventory.adjust" variant="contained" busy={adjust.pending} disabled={!/^-?\d+$/.test(delta) || Number(delta) === 0 || reason.trim().length < 5} onClick={async () => { if (!item)
        return; try {
        await adjust.execute({ version: item.version, body: {
                variantId: item.variantId, warehouseId: item.warehouseId, quantityDelta: Number(delta), reason: reason.trim(), expectedVersion: item.version, unitCost: canFinance && cost ? { amount: cost, currency: shop.currency } : null
            } });
        setItem(null);
    }
    catch { /* keep values */ } }}>Xác nhận điều chỉnh</MutationButton>}><ErrorNotice error={adjust.error}/><Stack gap={2}><Alert severity="warning">Nhập số tăng (+) hoặc giảm (−), không nhập lại tổng tồn. API sẽ kiểm lại phiên bản và lượng đang giữ.</Alert><TextField label="Thay đổi số lượng" value={delta} onChange={e => setDelta(e.target.value)} inputProps={{ inputMode: 'numeric' }}/><TextField label="Lý do (ít nhất 5 ký tự)" multiline minRows={2} value={reason} onChange={e => setReason(e.target.value)}/>{canFinance && <TextField label={`Giá vốn đơn vị (${shop.currency})`} value={cost} onChange={e => setCost(e.target.value)} inputProps={{ inputMode: 'decimal' }}/>}</Stack></EditDialog></>;
}
export function MovementsPage() { const { shop } = useScope(); const list = useApi('listStockMovements', { query: useListQuery() }); return <><PageHeader title="Lịch sử kho" subtitle="Nhập, giữ, xuất, giải phóng và trả hàng có chứng từ nguồn." actions={<RouteLink to={`/s/${shop.id}/inventory`}>Về tồn kho</RouteLink>}/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={r => r.id} columns={[
    { key: 'date', label: 'Thời gian', render: r => dateTime(r.createdAt, shop.timezone) }, { key: 'kind', label: 'Loại', render: r => <Status value={r.kind}/> }, { key: 'variant', label: 'Biến thể', render: r => r.variantId }, { key: 'quantity', label: 'Tồn ±', align: 'right', render: r => r.quantityDelta }, { key: 'reserved', label: 'Giữ ±', align: 'right', render: r => r.reservedDelta }, { key: 'source', label: 'Nguồn', render: r => r.sourceRef ? `${r.sourceRef.type} · ${r.sourceRef.id}` : 'Điều chỉnh thủ công' }, { key: 'reason', label: 'Lý do', render: r => r.reason }
]}/><Pager page={list.data.page}/></>}</QueryState></Panel></>; }
