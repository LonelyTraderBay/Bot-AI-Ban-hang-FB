import { useState } from 'react';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { Shipment, ShipmentEventWrite } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useScope } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { dateTime } from '@/shared/model/format';
import { PageHeader, Panel, DataTable, QueryState, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, ConfirmDialog, RouteLink, DetailLine } from '@/shared/ui/components';
export function FulfillmentPage() {
    const { shop } = useScope();
    const query = useListQuery();
    const list = useApi('listPrepJobs', { query });
    const [selected, setSelected] = useState<string | null>(null);
    return <><PageHeader title="Chuẩn bị hàng" subtitle="Nhận việc, lấy đúng SKU, kiểm đủ số lượng rồi đóng gói." actions={<RouteLink to={`/s/${shop.id}/shipments`}>Vận đơn & bàn giao</RouteLink>}/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={p => p.id} columns={[
        { key: 'order', label: 'Đơn hàng', render: p => <RouteLink to={`/s/${shop.id}/orders/${p.orderId}`}>{p.orderId}</RouteLink> }, { key: 'state', label: 'Giai đoạn', render: p => <Status value={p.state}/> },
        {
            key: 'items', label: 'Dòng hàng', render: p => `${p.lines.filter(l => l.requiredQuantity === l.pickedQuantity && !l.hasIssue).length}/${p.lines.length} đã kiểm đủ`
        },
        { key: 'assigned', label: 'Người nhận', render: p => p.assigneeUserId || 'Chưa có' }, { key: 'action', label: '', render: p => <Button variant="outlined" onClick={() => setSelected(p.id)}>Mở phiếu lấy hàng</Button> }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>{selected && <PrepDialog resourceId={selected} onClose={() => setSelected(null)}/>}</>;
}
function PrepDialog({ resourceId, onClose }: {
    resourceId: string;
    onClose: () => void;
}) {
    const { shop, session } = useScope();
    const get = useApi('getPrepJob', { path: { resourceId } });
    const p = get.data?.data;
    const task = useApi('getWorkItem', { path: { resourceId: p?.workItemId || 'pending' } }, !!p);
    const claim = useCommand('claimWorkItem', ['getWorkItem', 'getPrepJob', 'listWorkItems', 'listPrepJobs']);
    const pick = useCommand('pickPrepLine', ['getPrepJob', 'listPrepJobs']);
    const pack = useCommand('packPrepJob', ['getPrepJob', 'listPrepJobs', 'getOrder', 'listOrders']);
    const [scans, setScans] = useState<Record<string, string>>({}), [quantities, setQuantities] = useState<Record<string, string>>({}), [issues, setIssues] = useState<Record<string, string>>({});
    const [packing, setPacking] = useState(false);
    const assigned = task.data?.data.assigneeUserId === session.user.id;
    return <><EditDialog open title={`Phiếu chuẩn bị ${p?.orderId || ''}`} onClose={onClose} busy={pick.pending || claim.pending} actions={<Button onClick={onClose}>Đóng</Button>}><ErrorNotice error={claim.error || pick.error}/><QueryState query={get}>{p && <Stack gap={2}><Stack direction="row" justifyContent="space-between"><Status value={p.state}/><RouteLink to={`/s/${shop.id}/orders/${p.orderId}`}>Chi tiết đơn</RouteLink></Stack>{p.state === 'queued' && <MutationButton permission="operations.claim" variant="contained" busy={claim.pending} disabled={!task.data} onClick={() => { if (task.data)
        void claim.execute({ path: { resourceId: p.workItemId }, body: { expectedVersion: task.data.data.version } }).catch(() => undefined); }}>Tôi nhận chuẩn bị đơn</MutationButton>}{!assigned && p.state !== 'queued' && <Alert severity="info">Phiếu đang do {task.data?.data.assigneeUserId || 'nhân viên khác'} phụ trách.</Alert>}{p.lines.map(line => <Box key={line.orderLineId} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}><Stack direction="row" justifyContent="space-between"><Typography fontWeight={650}>{line.sku}</Typography><Typography>{line.pickedQuantity}/{line.requiredQuantity}</Typography></Stack>{line.hasIssue && <Alert severity="warning" sx={{ mt: 1 }}>Dòng hàng còn vấn đề cần xử lý.</Alert>}<Stack gap={1.5} sx={{ mt: 2 }}><TextField label="Nhập/quét SKU thực tế" value={scans[line.orderLineId] || ''} onChange={e => setScans({ ...scans, [line.orderLineId]: e.target.value })} disabled={!assigned || !['claimed', 'picking'].includes(p.state)}/><TextField label="Số lượng đã lấy" type="number" inputProps={{ min: 0, max: line.requiredQuantity }} value={quantities[line.orderLineId] ?? String(line.pickedQuantity)} onChange={e => setQuantities({ ...quantities, [line.orderLineId]: e.target.value })} disabled={!assigned || !['claimed', 'picking'].includes(p.state)}/><TextField label="Vấn đề phát hiện (để trống khi đạt)" value={issues[line.orderLineId] || ''} onChange={e => setIssues({ ...issues, [line.orderLineId]: e.target.value })} disabled={!assigned || !['claimed', 'picking'].includes(p.state)}/><MutationButton permission="fulfillment.write" busy={pick.pending} disabled={!assigned || !['claimed', 'picking'].includes(p.state) || !scans[line.orderLineId]} onClick={() => void pick.execute({ path: { resourceId }, body: {
            expectedVersion: p.version, orderLineId: line.orderLineId, scannedSku: scans[line.orderLineId] || '', pickedQuantity: Number(quantities[line.orderLineId] ?? line.pickedQuantity), issueReason: issues[line.orderLineId] || null
        } }).catch(() => undefined)}>Xác nhận dòng đã kiểm</MutationButton></Stack></Box>)}<MutationButton permission="fulfillment.write" variant="contained" disabled={!assigned || p.state !== 'picking' || !p.lines.every(l => l.pickedQuantity === l.requiredQuantity && !l.hasIssue)} onClick={() => setPacking(true)}>Xác nhận đã đóng gói</MutationButton>{p.state === 'packed' && <RouteLink to={`/s/${shop.id}/shipments?orderId=${p.orderId}`}>Tạo vận đơn để bàn giao</RouteLink>}<Alert severity="info">Các nút lấy/đóng gói là xác nhận của người thật. Hệ thống không tự nhận công việc vật lý đã hoàn tất.</Alert></Stack>}</QueryState></EditDialog><ConfirmDialog open={packing} title="Hoàn tất đóng gói" description="Bạn đã kiểm đủ SKU, số lượng và đóng gói thực tế?" onClose={() => setPacking(false)} busy={pack.pending} error={pack.error} onConfirm={() => pack.execute({ path: { resourceId }, body: { expectedVersion: p?.version || 1 } })}/></>;
}
export function ShipmentsPage() {
    const { shop } = useScope();
    const list = useApi('listShipments', { query: useListQuery() });
    const orders = useApi('listOrders', { query: { limit: 100 } });
    const create = useCommand('createShipment', ['listShipments', 'listOrders']);
    const handover = useCommand('handoverShipment', ['listShipments', 'listOrders', 'listStockSnapshots', 'listStockMovements', 'listPrepJobs', 'listWorkItems']);
    const event = useCommand('recordShipmentEvent', ['listShipments', 'listOrders', 'listDebtItems', 'getProfitLoss', 'getDashboard']);
    const [open, setOpen] = useState(false), [orderId, setOrder] = useState(''), [carrierId, setCarrier] = useState(''), [selected, setSelected] = useState<Shipment | null>(null), [handoverItem, setHandover] = useState<Shipment | null>(null);
    const [eventType, setEvent] = useState<ShipmentEventWrite['eventType']>('in_transit'), [external, setExternal] = useState(''), [proof, setProof] = useState(''), [occurred, setOccurred] = useState('');
    return <><PageHeader title="Vận đơn & giao hàng" subtitle="Bàn giao hàng, khách nhận hàng và tiền về là ba sự kiện khác nhau." actions={<MutationButton permission="fulfillment.write" variant="contained" onClick={() => setOpen(true)}>Tạo vận đơn</MutationButton>}/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={s => s.id} columns={[
        {
            key: 'id', label: 'Vận đơn', render: s => <Stack><Typography fontWeight={650}>{s.trackingCode || s.id}</Typography><Typography variant="caption">{s.carrierId || 'Giao thủ công'}</Typography></Stack>
        },
        { key: 'order', label: 'Đơn', render: s => <RouteLink to={`/s/${shop.id}/orders/${s.orderId}`}>{s.orderId}</RouteLink> }, { key: 'state', label: 'Trạng thái', render: s => <Status value={s.state}/> },
        {
            key: 'actions', label: '', render: s => <Stack direction="row" flexWrap="wrap"><MutationButton permission="fulfillment.handover" disabled={!['planned', 'label_ready'].includes(s.state)} onClick={() => setHandover(s)}>Bàn giao</MutationButton><MutationButton permission="fulfillment.write" disabled={['planned', 'cancelled', 'returned'].includes(s.state)} onClick={() => { setSelected(s); setExternal(''); setProof(''); setOccurred(new Date().toISOString()); }}>Cập nhật hành trình</MutationButton></Stack>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <EditDialog open={open} title="Tạo vận đơn" onClose={() => setOpen(false)} busy={create.pending} actions={<Button variant="contained" disabled={!orderId || create.pending} onClick={async () => { const o = orders.data?.data.find(o => o.id === orderId); if (!o)
        return; try {
        await create.execute({ body: { orderId, warehouseId: o.warehouseId, carrierId: carrierId || null, orderLineIds: o.lines.map(l => l.id) } });
        setOpen(false);
    }
    catch { /* visible */ } }}>Tạo bản vận chuyển</Button>}><ErrorNotice error={create.error}/><Stack gap={2}><TextField select label="Đơn đã đóng gói" value={orderId} onChange={e => setOrder(e.target.value)}>{orders.data?.data.filter(o => o.fulfillmentState === 'packed').map(o => <MenuItem key={o.id} value={o.id}>{o.id}</MenuItem>)}</TextField><TextField label="Mã đơn vị vận chuyển (trống = thủ công)" value={carrierId} onChange={e => setCarrier(e.target.value)}/><Alert severity="info">Vận đơn/nhãn in của nhà vận chuyển chỉ xuất hiện khi backend có adapter đã được cấp quyền. Không tự tạo mã giao hàng thật.</Alert></Stack></EditDialog>
 <ConfirmDialog open={!!handoverItem} title="Bàn giao kiện hàng" description="Xác nhận đã bàn giao cho người vận chuyển. API sẽ xuất lượng hàng đang giữ, không coi là đã giao thành công." onClose={() => setHandover(null)} busy={handover.pending} error={handover.error} onConfirm={() => handover.execute({ path: { resourceId: handoverItem?.id || '' }, body: { expectedVersion: handoverItem?.version || 1 } })}/>
 <EditDialog open={!!selected} title="Cập nhật hành trình có bằng chứng" onClose={() => setSelected(null)} busy={event.pending} actions={<Button variant="contained" disabled={!external || !proof || !occurred || event.pending} onClick={async () => { if (!selected)
        return; try {
        await event.execute({ path: { resourceId: selected.id }, body: {
                expectedVersion: selected.version, externalEventId: external, eventType, occurredAt: new Date(occurred).toISOString(), evidenceRef: proof
            } });
        setSelected(null);
    }
    catch { /* visible */ } }}>Ghi sự kiện</Button>}><ErrorNotice error={event.error}/><Stack gap={2}><Status value={selected?.state || 'unknown'}/><TextField select label="Sự kiện" value={eventType} onChange={e => setEvent(e.target.value as typeof eventType)}>{['in_transit', 'delivered', 'failed', 'returning', 'returned'].map((v, i) => <MenuItem key={v} value={v}>{['Đang vận chuyển', 'Khách đã nhận hàng', 'Giao thất bại', 'Đang hoàn về', 'Đã hoàn về'][i]}</MenuItem>)}</TextField><TextField label="Mã sự kiện bên vận chuyển" value={external} onChange={e => setExternal(e.target.value)}/><TextField label="Thời gian ISO (có múi giờ)" value={occurred} onChange={e => setOccurred(e.target.value)}/><TextField label="Mã bằng chứng" value={proof} onChange={e => setProof(e.target.value)}/>{selected?.events.map(e => <DetailLine key={e.externalEventId} label={e.type}>{dateTime(e.occurredAt, shop.timezone)}</DetailLine>)}</Stack></EditDialog></>;
}
