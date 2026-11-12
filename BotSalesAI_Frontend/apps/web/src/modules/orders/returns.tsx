import { useVersionedDraft } from '@/shared/model/versioned-draft';
import { DraftConflict } from '@/shared/ui/draft-conflict';
import { FieldGroup, FormFields } from '../../shared/ui/composition';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Divider, MenuItem, TextField, Typography } from '@mui/material';
import type { ReturnCase, ReturnInspection } from '@botsales/contracts';
import { useApi, useCommand, usePagedApi } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { codePointLength } from '@/shared/model/format';
import { PageHeader, Panel, DataTable, QueryState, Toolbar, Pager, Status, Amount, MutationButton, EditDialog, ErrorNotice, RouteLink, LookupLoadMore } from '@/shared/ui/components';
import { layoutSx } from '@/shared/ui/layout';

export function ReturnsPage() {
    const { shop } = useScope();
    const [params] = useSearchParams();
    const canReadOrders = useCan('orders.read');
    const canCreateReturn = useCan('orders.return');
    const canInspectReturn = useCan('inventory.adjust');
    const list = useApi('listReturnCases', { query: useListQuery('listReturnCases') });
    const [orderSearchInput, setOrderSearchInput] = useState('');
    const [orderSearch, setOrderSearch] = useState('');
    useEffect(() => {
        const timer = window.setTimeout(() => setOrderSearch(orderSearchInput.trim()), 250);
        return () => window.clearTimeout(timer);
    }, [orderSearchInput]);
    const orders = usePagedApi('listOrders', { query: { q: orderSearch || undefined } }, canReadOrders);
    const create = useCommand('createReturnCase', ['listReturnCases']);
    const inspect = useCommand('inspectReturn', ['listReturnCases', 'getReturnCase', 'listStockSnapshots', 'getProfitLoss']);
    const [open, setOpen] = useState(false), [orderId, setOrder] = useState(params.get('orderId') || ''), [reason, setReason] = useState(''), [quantities, setQuantities] = useState<Record<string, string>>({});
    const selectedOrderDetail = useApi('getOrder', { path: { orderId } }, canReadOrders && !!orderId);
    const selectedOrder = orders.data?.data.find(order => order.id === orderId) || selectedOrderDetail.data?.data;
    const [selected, setSelected] = useState<ReturnCase | null>(null), [inspections, setInspections] = useState<ReturnInspection['lines']>([]);
    const selectedReturn = useApi('getReturnCase', { path: { resourceId: selected?.id || '' } }, !!selected && canReadOrders);
    const inspectionCase = selectedReturn.data?.data;
    const inspectionEditor = useVersionedDraft({
        identity: `${shop.id}:return:${selected?.id || 'none'}`,
        source: selected && inspectionCase?.id === selected.id ? returnInspectionSnapshot(inspectionCase) : undefined,
        draft: { lines: inspections }, apply: values => setInspections(values.lines),
        refresh: () => selectedReturn.refetch({ throwOnError: true }),
    });
    const detailsReady = !!selected && !!inspectionCase && inspectionCase.id === selected.id && inspectionEditor.baseline?.identity === `${shop.id}:return:${selected.id}`;
    const editInspection = (r: ReturnCase) => { setSelected(r); setInspections([]); };
    const requestedLines = selectedOrder?.lines.map(line => {
        const quantity = quantities[line.id] ?? '0';
        return {
            orderLineId: line.id,
            quantity,
            invalid: quantity !== '0' && (!/^\d+$/.test(quantity) || Number(quantity) < 1 || Number(quantity) > line.quantity)
        };
    }).filter(line => line.quantity !== '0') || [];
    const createInvalid = !selectedOrder || !['delivered', 'part_returned'].includes(selectedOrder.fulfillmentState) || !reason.trim() || codePointLength(reason) > 1_000 || requestedLines.length === 0 || requestedLines.some(line => line.invalid);
    const inspectionInvalid = !detailsReady || !inspectionCase || inspections.length === 0 || inspections.some(line => {
        const returned = inspectionCase.lines.find(item => item.orderLineId === line.orderLineId)?.quantity ?? 0;
        return !Number.isInteger(line.acceptedQuantity) || line.acceptedQuantity < 0 || line.acceptedQuantity > returned || !line.reason.trim() || codePointLength(line.reason) > 1_000;
    });
    return <>
        <PageHeader title="Đổi và trả hàng" subtitle="Nhận lại, kiểm tình trạng, xác định nghĩa vụ hoàn. Không tự cộng hàng chưa kiểm vào tồn bán." actions={<MutationButton permission="orders.return" variant="contained" disabled={!canReadOrders} onClick={() => setOpen(true)}>Tạo yêu cầu trả</MutationButton>}/>
        {!canReadOrders && <Alert severity="warning" sx={layoutSx.notice.afterGap}>Cần quyền orders.read để chọn đơn gốc và xử lý yêu cầu trả.</Alert>}
        <Panel><Toolbar operation="listReturnCases" /><QueryState query={list} pendingProfile="section">{list.data && <><DataTable label="Yêu cầu đổi trả" rows={list.data.data} rowKey={r => r.id} columns={[
            { key: 'id', label: 'Yêu cầu', render: r => r.id },
            { key: 'order', label: 'Đơn gốc', render: r => <RouteLink to={`/s/${shop.id}/orders/${r.orderId}`}>{r.orderId}</RouteLink> },
            { key: 'state', label: 'Trạng thái', render: r => <Status value={r.state} domain="return"/> },
            { key: 'refund', label: 'Nghĩa vụ hoàn', render: r => <Amount value={r.refundObligation}/> },
            { key: 'action', label: 'Thao tác', render: r => <MutationButton permission="inventory.adjust" disabled={!canInspectReturn || ['inspected', 'closed', 'rejected'].includes(r.state)} onClick={() => editInspection(r)}>Kiểm nhận</MutationButton> }
        ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
        <EditDialog open={open} title="Yêu cầu trả hàng" onClose={() => setOpen(false)} busy={create.pending} actions={<Button variant="contained" disabled={createInvalid || !canReadOrders || !canCreateReturn || create.pending} onClick={async () => {
            try {
                await create.execute({ body: { orderId, reason: reason.trim(), lines: requestedLines.map(line => ({ orderLineId: line.orderLineId, quantity: Number(line.quantity) })) } });
                setOpen(false);
                setQuantities({});
            }
            catch { /* keep user inputs and show the API error */ }
        }}>Tạo yêu cầu</Button>}>
            <ErrorNotice error={create.error}/>
            <FormFields >
                {!canReadOrders && <Alert severity="warning">Không có quyền đọc danh sách đơn.</Alert>}

                <TextField label="Tìm đơn hàng" value={orderSearchInput} onChange={event => setOrderSearchInput(event.target.value)} disabled={!canReadOrders} helperText="Tìm theo mã đơn hoặc khách hàng; truy vấn tìm kiếm do API hỗ trợ." />
                <TextField label="Đơn hàng đã giao" select value={orderId} onChange={event => { setOrder(event.target.value); setQuantities({}); }} disabled={!canReadOrders || (orders.isPending && !orders.data)} helperText="Chỉ đơn đã giao hoặc đang trả một phần. API kiểm tra tổng số lượng còn được trả.">
                    {orderId && !orders.data?.data.some(order => order.id === orderId) && <MenuItem value={orderId}>{selectedOrder?.id || (selectedOrderDetail.isPending ? 'Đang tải đơn đã chọn…' : orderId)}</MenuItem>}
                    {orders.data?.data.filter(order => ['delivered', 'part_returned'].includes(order.fulfillmentState)).map(order => <MenuItem key={order.id} value={order.id}>{order.id}</MenuItem>)}
                </TextField>
                <LookupLoadMore label="đơn hàng" loadedCount={orders.loadedCount} hasMore={orders.hasMore} busy={orders.isLoadingMore} onLoadMore={orders.loadMore}/>
                {orders.isError && <FieldGroup ><ErrorNotice error={orders.error}/><Button size="small" onClick={() => { void (orders.isFetchNextPageError ? orders.loadMore() : orders.refetch()); }}>Thử lại danh sách đơn</Button></FieldGroup>}
                {selectedOrderDetail.isError && <ErrorNotice error={selectedOrderDetail.error}/>}
                {selectedOrder?.lines.map(line => {
                    const field = requestedLines.find(item => item.orderLineId === line.id);
                    return <TextField key={line.id} label={`${line.name} (tối đa ${line.quantity})`} type="number" inputProps={{ min: 0, max: line.quantity, step: 1 }} value={quantities[line.id] ?? '0'} error={!!field?.invalid} helperText={field?.invalid ? `Nhập số nguyên từ 1 đến ${line.quantity}; API kiểm tra các yêu cầu trả trước đó.` : `Số lượng gốc ${line.quantity}; giới hạn còn lại do API quyết định.`} onChange={event => setQuantities(current => ({ ...current, [line.id]: event.target.value }))}/>;
                })}
                <TextField label="Lý do trả" multiline value={reason} onChange={event => setReason(event.target.value)} error={!reason.trim() || codePointLength(reason) > 1_000} helperText={`${codePointLength(reason)}/1.000 ký tự`}/>
            </FormFields>
        </EditDialog>
        <EditDialog allowEditsWhileBusy open={!!selected} title="Kiểm nhận hàng trả" onClose={() => { setSelected(null); setInspections([]); }} busy={inspect.pending} actions={<MutationButton permission="inventory.adjust" variant="contained" disabled={inspectionInvalid || !canInspectReturn} busy={inspect.pending} onClick={async () => {
            if (!selected || !inspectionCase || inspectionInvalid)
                return;
            try {
                const prepared = inspectionEditor.prepare(); if (!prepared) return;
                const submitted = { lines: inspections };
                const result = await inspect.execute({ path: { resourceId: inspectionCase.id }, body: { expectedVersion: prepared.version, lines: inspections } });
                const persisted = { version: result.data.version, values: submitted };
                if (inspectionEditor.committed(persisted, submitted)) { setSelected(null); setInspections([]); }
            }
            catch (error) { inspectionEditor.failed(error); }
        }}>Xác nhận kiểm nhận</MutationButton>}>
            <ErrorNotice error={inspect.error}/>
            <DraftConflict editor={inspectionEditor} labels={{ lines: 'Phương án kiểm nhận từ hồ sơ trả hàng' }} busy={inspect.pending}/>
            <FormFields >
                <Alert severity="warning">Người thật xác nhận đã nhận và kiểm hàng. Chỉ “Bán lại được” mới được bổ sung tồn khả dụng.</Alert>
                {selectedReturn.isPending && <Typography role="status">Đang tải hồ sơ trả hàng mới nhất…</Typography>}
                {selectedReturn.isError && <FieldGroup ><ErrorNotice error={selectedReturn.error}/><Button onClick={() => { void selectedReturn.refetch(); }}>Tải lại hồ sơ</Button></FieldGroup>}
                {detailsReady && inspections.map((line, index) => {
                    const returnedQuantity = inspectionCase.lines.find(item => item.orderLineId === line.orderLineId)?.quantity ?? 0;
                    const invalidQuantity = !Number.isInteger(line.acceptedQuantity) || line.acceptedQuantity < 0 || line.acceptedQuantity > returnedQuantity;
                    return <FieldGroup key={line.orderLineId} >
                        <Typography>{line.orderLineId}</Typography>
                        <TextField label="Số lượng nhận" type="number" inputProps={{ min: 0, max: returnedQuantity, step: 1 }} value={Number.isNaN(line.acceptedQuantity) ? '' : line.acceptedQuantity} error={invalidQuantity} helperText={invalidQuantity ? `Nhập số nguyên từ 0 đến ${returnedQuantity}.` : `Tối đa ${returnedQuantity} theo yêu cầu trả.`} onChange={event => setInspections(current => current.map((item, row) => index === row ? { ...item, acceptedQuantity: event.target.value === '' ? Number.NaN : Number(event.target.value) } : item))}/>
                        <TextField select label="Tình trạng" value={line.disposition} onChange={event => setInspections(current => current.map((item, row) => index === row ? { ...item, disposition: event.target.value as typeof line.disposition } : item))}><MenuItem value="quarantined">Cách ly / chờ xác minh</MenuItem><MenuItem value="sellable">Bán lại được</MenuItem><MenuItem value="damaged">Hư hỏng</MenuItem></TextField>
                        <TextField label="Ghi nhận kiểm tra" value={line.reason} error={!line.reason.trim() || codePointLength(line.reason) > 1_000} helperText={`${codePointLength(line.reason)}/1.000 ký tự`} onChange={event => setInspections(current => current.map((item, row) => index === row ? { ...item, reason: event.target.value } : item))}/>
                        <Divider />
                    </FieldGroup>;
                })}
            </FormFields>
        </EditDialog>
    </>;
}

function returnInspectionSnapshot(item: ReturnCase) {
    const lines: ReturnInspection['lines'] = item.lines.map(line => ({
        orderLineId: line.orderLineId, acceptedQuantity: line.quantity,
        disposition: line.disposition === 'pending' ? 'quarantined' : line.disposition,
        reason: line.disposition === 'pending' ? 'Chờ kiểm tra tình trạng hàng nhận lại' : line.reason,
    }));
    return { version: item.version, values: { lines } };
}
