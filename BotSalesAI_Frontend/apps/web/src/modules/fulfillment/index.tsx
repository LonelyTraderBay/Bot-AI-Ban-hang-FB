import { ActionGroup, FormFields } from '../../shared/ui/composition';
import { useEffect, useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { ShipmentEventWrite } from '@botsales/contracts';
import { useApi, usePagedApi, useCommand } from '@/shared/api/hooks';
import { useScope } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { dateTime, dateTimeLocalInput, dateTimeLocalToISOString } from '@/shared/model/format';
import { layoutSx } from '@/shared/ui/layout';
import { Amount, PageHeader, Panel, DataTable, QueryState, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, ConfirmDialog, RouteLink, DetailLine, LookupLoadMore } from '@/shared/ui/components';

type ShipmentDialogMode = 'view' | 'handover' | 'event';

const shipmentEventOptions: Array<{ value: ShipmentEventWrite['eventType']; label: string }> = [
    { value: 'in_transit', label: 'Đang vận chuyển' },
    { value: 'delivered', label: 'Khách đã nhận hàng' },
    { value: 'failed', label: 'Giao thất bại' },
    { value: 'returning', label: 'Đang hoàn về' },
    { value: 'returned', label: 'Đã hoàn về' },
];

export function FulfillmentPage() {
    const { shop } = useScope();
    const query = useListQuery('listPrepJobs');
    const list = useApi('listPrepJobs', { query });
    const [selected, setSelected] = useState<string | null>(null);

    return <>
        <PageHeader title="Chuẩn bị hàng" subtitle="Nhận việc, lấy đúng SKU, kiểm đủ số lượng rồi đóng gói." actions={<RouteLink to={`/s/${shop.id}/shipments`}>Vận đơn & bàn giao</RouteLink>} />
        <Panel>
            <Toolbar operation="listPrepJobs" />
            <QueryState query={list} pendingProfile="section">
                {list.data && <>
                    <DataTable rows={list.data.data} rowKey={prep => prep.id} columns={[
                        { key: 'order', label: 'Đơn hàng', render: prep => <RouteLink to={`/s/${shop.id}/orders/${prep.orderId}`}>{prep.orderId}</RouteLink> },
                        { key: 'state', label: 'Giai đoạn', render: prep => <Status value={prep.state} /> },
                        { key: 'items', label: 'Dòng hàng', render: prep => `${prep.lines.filter(line => line.requiredQuantity === line.pickedQuantity && !line.hasIssue).length}/${prep.lines.length} đã kiểm đủ` },
                        { key: 'assigned', label: 'Người nhận', render: prep => prep.assigneeUserId || 'Chưa có' },
                        { key: 'action', label: '', render: prep => <Button variant="outlined" onClick={() => setSelected(prep.id)}>Mở phiếu lấy hàng</Button> },
                    ]} />
                    <Pager page={list.data.page} />
                </>}
            </QueryState>
        </Panel>
        {selected && <PrepDialog resourceId={selected} onClose={() => setSelected(null)} />}
    </>;
}

function PrepDialog({ resourceId, onClose }: { resourceId: string; onClose: () => void }) {
    const { shop, session, membership } = useScope();
    const get = useApi('getPrepJob', { path: { resourceId } });
    const prep = get.data?.data;
    const task = useApi('getWorkItem', { path: { resourceId: prep?.workItemId || 'pending' } }, !!prep);
    const workItem = task.data?.data;
    const claim = useCommand('claimWorkItem', ['getWorkItem', 'getPrepJob', 'listWorkItems', 'listPrepJobs']);
    const pick = useCommand('pickPrepLine', ['getPrepJob', 'listPrepJobs']);
    const pack = useCommand('packPrepJob', ['getPrepJob', 'listPrepJobs', 'getOrder', 'listOrders']);
    const [scans, setScans] = useState<Record<string, string>>({});
    const [quantities, setQuantities] = useState<Record<string, string>>({});
    const [issues, setIssues] = useState<Record<string, string>>({});
    const [packing, setPacking] = useState(false);
    const [draftCommit, setDraftCommit] = useState<{ scope: string; sequence: number }>();
    const assigned = workItem?.assigneeUserId === session.user.id;
    const mayClaim = membership.permissions.includes('operations.claim');

    async function refreshAssignment() {
        await Promise.all([get.refetch(), task.refetch()]);
        claim.resetAfterReconcile();
    }

    return <>
        <EditDialog open title={`Phiếu chuẩn bị ${prep?.orderId || ''}`} onClose={onClose} busy={pick.pending || claim.pending} draftCommit={draftCommit} actions={<Button onClick={onClose}>Đóng</Button>}>
            <ErrorNotice error={claim.error || pick.error || task.error} />
            <QueryState query={get}>
                {prep && <FormFields >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Status value={prep.state} />
                        <RouteLink to={`/s/${shop.id}/orders/${prep.orderId}`}>Chi tiết đơn</RouteLink>
                    </Stack>
                    {prep.state === 'queued' && mayClaim && workItem?.allowedActions.includes('claim') && <MutationButton
                        permission="operations.claim"
                        allowedActions={workItem.allowedActions}
                        action="claim"
                        variant="contained"
                        busy={claim.pending}
                        disabled={!workItem || workItem.state !== 'queued' || !!workItem.assigneeUserId}
                        onClick={() => {
                            if (!workItem) return;
                            void claim.execute({ path: { resourceId: prep.workItemId }, body: { expectedVersion: workItem.version } })
                                .catch(() => undefined);
                        }}
                    >Tôi nhận chuẩn bị đơn</MutationButton>}
                    {prep.state === 'queued' && !mayClaim && <Alert severity="info">Vai trò hiện tại không có quyền nhận công việc chuẩn bị này.</Alert>}
                    {prep.state === 'queued' && mayClaim && workItem && !workItem.allowedActions.includes('claim') && <Alert severity="info">Công việc đã đổi trạng thái hoặc đã có người nhận. Tải lại phiếu để xem người phụ trách mới.</Alert>}
                    {prep.state === 'queued' && claim.error && <Button size="small" onClick={() => void refreshAssignment()}>Tải lại trạng thái</Button>}
                    {!assigned && prep.state !== 'queued' && <Alert severity="info">Phiếu đang do {workItem?.assigneeUserId || prep.assigneeUserId || 'nhân viên khác'} phụ trách.</Alert>}
                    {prep.lines.map(line => {
                        const scan = scans[line.orderLineId] || '';
                        const quantity = quantities[line.orderLineId] ?? String(line.pickedQuantity);
                        const quantityIsValid = /^\d+$/.test(quantity)
                            && Number.isInteger(Number(quantity))
                            && Number(quantity) >= 0
                            && Number(quantity) <= line.requiredQuantity;
                        const issue = issues[line.orderLineId] || '';
                        const canEdit = assigned && ['claimed', 'picking'].includes(prep.state);

                        return <Box key={line.orderLineId} data-draft-scope={line.orderLineId} sx={{ ...layoutSx.surface.inset, border: 1, borderColor: 'divider', borderRadius: visualSx.radius.dialog }}>
                            <Stack direction="row" justifyContent="space-between" sx={layoutSx.surface.headerFlowGap}>
                                <Typography fontWeight={visualSx.typography.fontWeight.strong}>{line.sku}</Typography>
                                <Typography>{line.pickedQuantity}/{line.requiredQuantity}</Typography>
                            </Stack>
                            {line.hasIssue && <Alert severity="warning" sx={layoutSx.notice.contentGap}>Dòng hàng còn vấn đề cần xử lý.</Alert>}
                            <FormFields beforeGap="surface">
                                <TextField label="Nhập/quét SKU thực tế" value={scan} onChange={event => setScans(current => ({ ...current, [line.orderLineId]: event.target.value }))} disabled={!canEdit} inputProps={{ maxLength: 100 }} />
                                <TextField
                                    label="Số lượng đã lấy"
                                    type="number"
                                    inputProps={{ min: 0, max: line.requiredQuantity, step: 1 }}
                                    value={quantity}
                                    error={!quantityIsValid}
                                    helperText={!quantityIsValid ? `Nhập số nguyên từ 0 đến ${line.requiredQuantity}.` : undefined}
                                    onChange={event => setQuantities(current => ({ ...current, [line.orderLineId]: event.target.value }))}
                                    disabled={!canEdit}
                                />
                                <TextField label="Vấn đề phát hiện (để trống khi đạt)" value={issue} onChange={event => setIssues(current => ({ ...current, [line.orderLineId]: event.target.value }))} disabled={!canEdit} inputProps={{ maxLength: 1000 }} />
                                <MutationButton
                                    permission="fulfillment.write"
                                    busy={pick.pending}
                                    disabled={!canEdit || !scan.trim() || !quantityIsValid || issue.length > 1000}
                                    onClick={() => void pick.execute({ path: { resourceId }, body: {
                                        expectedVersion: prep.version,
                                        orderLineId: line.orderLineId,
                                        scannedSku: scan.trim(),
                                        pickedQuantity: Number(quantity),
                                        issueReason: issue.trim() || null,
                                    } }).then(() => setDraftCommit(current => ({ scope: line.orderLineId, sequence: (current?.sequence || 0) + 1 }))).catch(() => undefined)}
                                >Xác nhận dòng đã kiểm</MutationButton>
                            </FormFields>
                        </Box>;
                    })}
                    <MutationButton
                        permission="fulfillment.write"
                        variant="contained"
                        disabled={!assigned || prep.state !== 'picking' || !prep.lines.every(line => line.pickedQuantity === line.requiredQuantity && !line.hasIssue)}
                        onClick={() => setPacking(true)}
                    >Xác nhận đã đóng gói</MutationButton>
                    {prep.state === 'picking' && !prep.lines.every(line => line.pickedQuantity === line.requiredQuantity && !line.hasIssue) && <Alert severity="info">Chưa thể đóng gói: cần lấy đủ từng dòng và xử lý mọi vấn đề trước.</Alert>}
                    {prep.state === 'packed' && <RouteLink to={`/s/${shop.id}/shipments?orderId=${prep.orderId}`}>Tạo vận đơn để bàn giao</RouteLink>}
                    <Alert severity="info">Các nút lấy/đóng gói là xác nhận của người thật. Hệ thống không tự nhận công việc vật lý đã hoàn tất.</Alert>
                </FormFields>}
            </QueryState>
        </EditDialog>
        <ConfirmDialog
            open={packing}
            title="Hoàn tất đóng gói"
            description="Bạn đã kiểm đủ SKU, số lượng và đóng gói thực tế?"
            onClose={() => setPacking(false)}
            busy={pack.pending}
            error={pack.error}
            onConfirm={() => pack.execute({ path: { resourceId }, body: { expectedVersion: prep?.version || 1 } })}
        />
    </>;
}

export function ShipmentsPage() {
    const { shop } = useScope();
    const [searchParams] = useSearchParams();
    const list = useApi('listShipments', { query: useListQuery('listShipments') });
    const [orderSearchInput, setOrderSearchInput] = useState('');
    const [orderSearch, setOrderSearch] = useState('');
    useEffect(() => {
        const timer = window.setTimeout(() => setOrderSearch(orderSearchInput.trim()), 250);
        return () => window.clearTimeout(timer);
    }, [orderSearchInput]);
    const orders = usePagedApi('listOrders', { query: { q: orderSearch || undefined } });
    const create = useCommand('createShipment', ['listShipments', 'listOrders']);
    const handover = useCommand('handoverShipment', ['getShipment', 'listShipments', 'listOrders', 'listStockSnapshots', 'listStockMovements', 'listPrepJobs', 'listWorkItems']);
    const event = useCommand('recordShipmentEvent', ['getShipment', 'listShipments', 'listOrders', 'listDebtItems', 'getProfitLoss', 'getDashboard']);
    const [open, setOpen] = useState(false);
    const [orderId, setOrderId] = useState(() => searchParams.get('orderId') || '');
    const selectedOrderDetail = useApi('getOrder', { path: { orderId } }, !!orderId);
    const selectedOrder = orders.data?.data.find(order => order.id === orderId) || selectedOrderDetail.data?.data;
    const [carrierId, setCarrierId] = useState('');
    const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
    const [dialogMode, setDialogMode] = useState<ShipmentDialogMode>('view');
    const [eventType, setEventType] = useState<ShipmentEventWrite['eventType']>('in_transit');
    const [externalEventId, setExternalEventId] = useState('');
    const [evidenceRef, setEvidenceRef] = useState('');
    const [occurredAt, setOccurredAt] = useState(() => dateTimeLocalInput(new Date(), shop.timezone));
    const detail = useApi('getShipment', { path: { resourceId: selectedShipmentId || 'pending' } }, !!selectedShipmentId);
    const shipment = detail.data?.data;

    function openShipment(id: string, mode: ShipmentDialogMode) {
        setSelectedShipmentId(id);
        setDialogMode(mode);
        setEventType('in_transit');
        setExternalEventId('');
        setEvidenceRef('');
        setOccurredAt(dateTimeLocalInput(new Date(), shop.timezone));
    }

    function closeShipment() {
        setSelectedShipmentId(null);
        setDialogMode('view');
    }

    const occurredAtInstant = dateTimeLocalToISOString(occurredAt, shop.timezone);
    const validOccurrence = occurredAtInstant !== null;
    const duplicateEventId = !!shipment?.events.some(item => item.externalEventId === externalEventId.trim());
    const canRecordEvent = !!shipment
        && !['planned', 'cancelled', 'returned'].includes(shipment.state)
        && externalEventId.trim().length > 0
        && externalEventId.trim().length <= 160
        && evidenceRef.trim().length > 0
        && validOccurrence
        && !duplicateEventId;

    async function submitEvent() {
        if (!shipment || !canRecordEvent || !occurredAtInstant) return;
        await event.execute({ path: { resourceId: shipment.id }, body: {
            expectedVersion: shipment.version,
            externalEventId: externalEventId.trim(),
            eventType,
            occurredAt: occurredAtInstant,
            evidenceRef: evidenceRef.trim(),
        } });
        closeShipment();
    }

    return <>
        <PageHeader title="Vận đơn & giao hàng" subtitle="Bàn giao hàng, khách nhận hàng và tiền về là ba sự kiện khác nhau." actions={<MutationButton permission="fulfillment.write" variant="contained" onClick={() => setOpen(true)}>Tạo vận đơn</MutationButton>} />
        {__MOCK__ ? <ShippingQuotePreview /> : <Panel title="Phí & vùng giao hàng"><Alert severity="info" sx={layoutSx.surface.inset}>API hiện chỉ trả phí báo giá/thực tế nếu đã có trên vận đơn; chưa có operation để kiểm tra vùng giao hoặc xin báo giá mới.</Alert></Panel>}
        <Panel>
            <Toolbar operation="listShipments" />
            <QueryState query={list} pendingProfile="section">
                {list.data && <>
                    <DataTable rows={list.data.data} rowKey={item => item.id} columns={[
                        { key: 'id', label: 'Vận đơn', render: item => <Stack><Typography fontWeight={visualSx.typography.fontWeight.strong}>{item.trackingCode || item.id}</Typography><Typography variant="caption">{item.carrierId || 'Giao thủ công'}</Typography></Stack> },
                        { key: 'order', label: 'Đơn', render: item => <RouteLink to={`/s/${shop.id}/orders/${item.orderId}`}>{item.orderId}</RouteLink> },
                        { key: 'state', label: 'Trạng thái', render: item => <Status value={item.state} /> },
                        { key: 'quote', label: 'Phí báo giá', render: item => <Amount value={item.shippingFeeQuote}/> },
                        { key: 'actual', label: 'Phí thực tế', render: item => <Amount value={item.shippingFeeActual}/> },
                        { key: 'actions', label: '', render: item => <ActionGroup direction="row" >
                            <Button size="small" onClick={() => openShipment(item.id, 'view')}>Chi tiết</Button>
                            <MutationButton permission="fulfillment.handover" disabled={!['planned', 'label_ready'].includes(item.state)} onClick={() => openShipment(item.id, 'handover')}>Bàn giao</MutationButton>
                            <MutationButton permission="fulfillment.write" disabled={['planned', 'cancelled', 'returned'].includes(item.state)} onClick={() => openShipment(item.id, 'event')}>Cập nhật hành trình</MutationButton>
                        </ActionGroup> },
                    ]} />
                    <Pager page={list.data.page} />
                </>}
            </QueryState>
        </Panel>

        <EditDialog
            open={open}
            title="Tạo vận đơn"
            onClose={() => setOpen(false)}
            busy={create.pending}
            actions={<Button variant="contained" disabled={!orderId || create.pending || selectedOrder?.fulfillmentState !== 'packed'} onClick={async () => {
                const order = selectedOrder?.fulfillmentState === 'packed' ? selectedOrder : undefined;
                if (!order) return;
                try {
                    await create.execute({ body: { orderId: order.id, warehouseId: order.warehouseId, carrierId: carrierId.trim() || null, orderLineIds: order.lines.map(line => line.id) } });
                    setOpen(false);
                }
                catch { /* the shared error remains visible and the selection is retained */ }
            }}>Tạo bản vận chuyển</Button>}
        >
            <ErrorNotice error={create.error} />
            <FormFields >
                <TextField label="Tìm đơn hàng" value={orderSearchInput} onChange={event => setOrderSearchInput(event.target.value)} helperText="Tìm theo mã đơn; kết quả tải theo cursor từ API." />
                <TextField select label="Đơn đã đóng gói" value={orderId} onChange={event => setOrderId(event.target.value)} disabled={orders.isPending && !orders.data}>
                    {orderId && !orders.data?.data.some(order => order.id === orderId) && <MenuItem value={orderId}>{selectedOrder?.id || (selectedOrderDetail.isPending ? 'Đang tải đơn đã chọn…' : orderId)}</MenuItem>}
                    {orders.data?.data.filter(order => order.fulfillmentState === 'packed').map(order => <MenuItem key={order.id} value={order.id}>{order.id}</MenuItem>)}
                </TextField>
                <LookupLoadMore label="đơn hàng" loadedCount={orders.loadedCount} hasMore={orders.hasMore} busy={orders.isLoadingMore} onLoadMore={orders.loadMore}/>
                {orders.isError && <ActionGroup direction="column"><ErrorNotice error={orders.error}/><Button size="small" onClick={() => { void (orders.isFetchNextPageError ? orders.loadMore() : orders.refetch()); }}>Thử lại danh sách đơn</Button></ActionGroup>}
                {selectedOrderDetail.isError && <ErrorNotice error={selectedOrderDetail.error}/>}
                {selectedOrder && selectedOrder.fulfillmentState !== 'packed' && <Alert severity="warning">Đơn đã chọn chưa ở trạng thái đã đóng gói nên chưa thể tạo vận đơn.</Alert>}
                <TextField label="Mã đơn vị vận chuyển (trống = thủ công)" value={carrierId} onChange={event => setCarrierId(event.target.value)} inputProps={{ maxLength: 160 }} />
                <Alert severity="info">Vận đơn/nhãn in của nhà vận chuyển chỉ xuất hiện khi backend có adapter đã được cấp quyền. Không tự tạo mã giao hàng thật.</Alert>
            </FormFields>
        </EditDialog>

        <EditDialog
            open={!!selectedShipmentId}
            title={dialogMode === 'handover' ? 'Xác nhận bàn giao kiện hàng' : dialogMode === 'event' ? 'Cập nhật hành trình có bằng chứng' : 'Chi tiết vận đơn'}
            description={dialogMode === 'handover' ? 'Xác nhận đã bàn giao cho người vận chuyển. Việc này xuất lượng hàng đang giữ; không đồng nghĩa khách đã nhận hoặc đã thanh toán.' : undefined}
            onClose={closeShipment}
            busy={handover.pending || event.pending}
            actions={<Stack direction="row" sx={layoutSx.dialog.actionsGap}>
                <Button onClick={dialogMode === 'view' ? closeShipment : () => setDialogMode('view')}>{dialogMode === 'view' ? 'Đóng' : 'Quay lại'}</Button>
                {dialogMode === 'view' && shipment && ['planned', 'label_ready'].includes(shipment.state) && <MutationButton permission="fulfillment.handover" variant="contained" disabled={detail.isLoading} onClick={() => setDialogMode('handover')}>Bàn giao</MutationButton>}
                {dialogMode === 'view' && shipment && !['planned', 'cancelled', 'returned'].includes(shipment.state) && <MutationButton permission="fulfillment.write" onClick={() => setDialogMode('event')}>Cập nhật hành trình</MutationButton>}
                {dialogMode === 'handover' && <MutationButton permission="fulfillment.handover" variant="contained" busy={handover.pending} disabled={!shipment || !['planned', 'label_ready'].includes(shipment.state)} onClick={() => {
                    if (!shipment) return;
                    void handover.execute({ path: { resourceId: shipment.id }, body: { expectedVersion: shipment.version } })
                        .then(() => setDialogMode('view'))
                        .catch(() => undefined);
                }}>Xác nhận bàn giao</MutationButton>}
                {dialogMode === 'event' && <MutationButton permission="fulfillment.write" variant="contained" busy={event.pending} disabled={!canRecordEvent} onClick={() => void submitEvent().catch(() => undefined)}>Ghi sự kiện</MutationButton>}
            </Stack>}
        >
            <ErrorNotice error={detail.error || handover.error || event.error} />
            <QueryState query={detail}>
                {shipment && <Stack>
                    <DetailLine label="Mã vận đơn">{shipment.trackingCode || shipment.id}</DetailLine>
                    <DetailLine label="Đơn hàng"><RouteLink to={`/s/${shop.id}/orders/${shipment.orderId}`}>{shipment.orderId}</RouteLink></DetailLine>
                    <DetailLine label="Đơn vị vận chuyển">{shipment.carrierId || 'Giao thủ công'}</DetailLine>
                    <DetailLine label="Trạng thái"><Status value={shipment.state} /></DetailLine>
                    <DetailLine label="Phí báo giá">{shipment.shippingFeeQuote ? `${shipment.shippingFeeQuote.amount} ${shipment.shippingFeeQuote.currency}` : 'Chưa có'}</DetailLine>
                    <DetailLine label="Phí thực tế">{shipment.shippingFeeActual ? `${shipment.shippingFeeActual.amount} ${shipment.shippingFeeActual.currency}` : 'Chưa có'}</DetailLine>
                    <Typography variant="subtitle2" sx={layoutSx.surface.sectionBefore}>Sự kiện vận chuyển</Typography>
                    {shipment.events.length ? shipment.events.map(item => <DetailLine key={item.externalEventId} label={`${item.type} · ${item.externalEventId}`}>
                        <Stack alignItems="flex-end"><Typography>{dateTime(item.occurredAt, shop.timezone)}</Typography><Typography variant="caption">Bằng chứng: {item.evidenceRef || 'Chưa có'}</Typography></Stack>
                    </DetailLine>) : <Typography color="text.secondary">Chưa có sự kiện.</Typography>}
                    {dialogMode === 'handover' && <Alert severity="warning">Hệ thống ghi nhận bàn giao và xuất hàng đang giữ một lần. Trạng thái giao hàng sẽ chỉ đổi khi có sự kiện vận chuyển riêng.</Alert>}
                    {dialogMode === 'event' && <FormFields beforeGap="surface">
                        <TextField select label="Sự kiện" value={eventType} onChange={change => setEventType(change.target.value as ShipmentEventWrite['eventType'])}>
                            {shipmentEventOptions.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                        </TextField>
                        <TextField label="Mã sự kiện bên vận chuyển" value={externalEventId} onChange={change => setExternalEventId(change.target.value)} inputProps={{ maxLength: 160 }} error={externalEventId.length > 160 || duplicateEventId} helperText={duplicateEventId ? 'Mã sự kiện này đã được ghi nhận.' : externalEventId.length > 160 ? 'Tối đa 160 ký tự.' : undefined} />
                        <TextField label="Thời gian sự kiện" type="datetime-local" value={occurredAt} onChange={change => setOccurredAt(change.target.value)} error={!!occurredAt && !validOccurrence} helperText={!!occurredAt && !validOccurrence ? 'Nhập giờ tồn tại trong múi giờ cửa hàng.' : `Giờ địa phương theo ${shop.timezone}; sẽ chuyển thành instant ISO khi gửi.`} />
                        <TextField label="Mã bằng chứng" value={evidenceRef} onChange={change => setEvidenceRef(change.target.value)} inputProps={{ maxLength: 160 }} />
                        <Alert severity="info">Giao thành công, thất bại, hoàn về và thu tiền là các trạng thái riêng. Mỗi sự kiện cần mã chống trùng và bằng chứng do người xác minh cung cấp.</Alert>
                    </FormFields>}
                </Stack>}
            </QueryState>
        </EditDialog>
    </>;
}

const shippingZones = [
    { id: 'city', label: 'Nội thành (mẫu)', serviceable: true, baseFees: { small: 18000, medium: 24000, large: 32000 } },
    { id: 'regional', label: 'Ngoại tỉnh (mẫu)', serviceable: true, baseFees: { small: 32000, medium: 42000, large: 56000 } },
    { id: 'outside', label: 'Ngoài vùng phục vụ (mẫu)', serviceable: false, baseFees: null },
] as const;

const packageSizes = [
    { id: 'small', label: 'Gọn · 1–2 kg' },
    { id: 'medium', label: 'Vừa · 2–5 kg' },
    { id: 'large', label: 'Lớn · 5–10 kg' },
] as const;

function ShippingQuotePreview() {
    const [zoneId, setZoneId] = useState<(typeof shippingZones)[number]['id']>('city');
    const [sizeId, setSizeId] = useState<(typeof packageSizes)[number]['id']>('small');
    const [addressReady, setAddressReady] = useState(true);
    const [quoteCurrent, setQuoteCurrent] = useState(true);
    const zone = shippingZones.find(item => item.id === zoneId)!;
    const amount = zone.baseFees?.[sizeId];

    return <Panel title="Xem trước phí & vùng giao hàng" subtitle="Bản xem trước UI trong demo; không cập nhật đơn và không gửi yêu cầu tới hãng vận chuyển." bodyMode="inset">
        <FormFields geometry={{maxWidth: 760}}>
            <Alert severity="info">DỮ LIỆU MÔ PHỎNG · Phí dưới đây chỉ minh họa trạng thái giao diện, không phải báo giá cho địa chỉ hoặc hãng vận chuyển thật.</Alert>
            <TextField select label="Vùng giao thử" value={zoneId} onChange={event => setZoneId(event.target.value as typeof zoneId)}>
                {shippingZones.map(item => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}
            </TextField>
            <TextField select label="Kích cỡ kiện thử" value={sizeId} onChange={event => setSizeId(event.target.value as typeof sizeId)}>
                {packageSizes.map(item => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}
            </TextField>
            <FormControlLabel label="Có địa chỉ giao hàng mẫu" control={<Checkbox checked={addressReady} onChange={event => setAddressReady(event.target.checked)} />} />
            <FormControlLabel label="Báo giá mẫu còn hiệu lực" control={<Checkbox checked={quoteCurrent} onChange={event => setQuoteCurrent(event.target.checked)} />} />
            {!addressReady
                ? <Alert severity="warning">Thiếu địa chỉ giao hàng; chưa thể xác định vùng hoặc hiển thị phí.</Alert>
                : !zone.serviceable
                    ? <Alert severity="warning">Vùng mẫu này không được phục vụ; không hiển thị báo giá và không hứa ngày giao.</Alert>
                    : !quoteCurrent
                        ? <Alert severity="warning">Báo giá mẫu đã hết hiệu lực; cần lấy báo giá mới trước khi xác nhận.</Alert>
                        : <Alert severity="success">Ước tính mẫu: {amount?.toLocaleString('vi-VN')} VND · {zone.label} · {packageSizes.find(item => item.id === sizeId)?.label}</Alert>}
            <Typography variant="caption" color="text.secondary">Trong dữ liệu vận đơn, phí báo giá và phí thực tế được trình bày riêng. Bản xem trước này không lưu cấu hình vùng, không xác nhận khả năng giao và không tạo vận đơn.</Typography>
        </FormFields>
    </Panel>;
}
