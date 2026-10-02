import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { ServiceCase, CustomerWritePatch } from '@botsales/contracts';
import { useApi, useCommand, usePagedApi } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { dateTime } from '@/shared/model/format';
import { Amount, PageHeader, Panel, DataTable, QueryState, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, RouteLink, DetailLine, LookupLoadMore } from '@/shared/ui/components';
const customerSchema = z.object({
    displayName: z.string().trim().min(1, 'Nhập tên khách').max(160), phone: z.string().max(40), email: z.string().email('Email không hợp lệ').or(z.literal('')), notes: z.string().max(5000)
});
type CustomerFields = z.infer<typeof customerSchema>;
export function CustomersPage() {
    const { shop } = useScope();
    const navigate = useNavigate();
    const list = useApi('listCustomers', { query: useListQuery() });
    const create = useCommand('createCustomer', ['listCustomers']);
    const [open, setOpen] = useState(false);
    const form = useForm<CustomerFields>({ defaultValues: { displayName: '', phone: '', email: '', notes: '' }, resolver: zodResolver(customerSchema) });
    const submit = form.handleSubmit(async (fields) => { try {
        const response = await create.execute({ body: { ...fields, phone: fields.phone || null, email: fields.email || null } });
        setOpen(false);
        form.reset();
        navigate(`/s/${shop.id}/customers/${response.data.id}`);
    }
    catch { /* error stays in dialog */ } });
    return <><PageHeader title="Khách hàng" subtitle="Lịch sử và thông tin theo đúng cửa hàng; không tự gộp khách trùng tên." actions={<MutationButton permission="customers.write" variant="contained" onClick={() => setOpen(true)}>Thêm khách hàng</MutationButton>}/><Panel><Toolbar placeholder="Tìm tên, số liên hệ…"/><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={c => c.id} columns={[
        { key: 'name', label: 'Khách hàng', render: c => <Typography fontWeight={650}>{c.displayName}</Typography> }, { key: 'phone', label: 'Liên hệ', render: c => c.phone || 'Chưa có / bị hạn chế' }, { key: 'email', label: 'Email', render: c => c.email || '—' }, { key: 'note', label: 'Ghi chú', render: c => c.notes || '—' }, { key: 'action', label: '', render: c => <RouteLink to={`/s/${shop.id}/customers/${c.id}`}>Hồ sơ</RouteLink> }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel><EditDialog open={open} title="Thêm khách hàng" onClose={() => setOpen(false)} busy={create.pending} actions={<Button type="submit" form="customer-create-form" variant="contained" disabled={create.pending}>Lưu khách hàng</Button>}><ErrorNotice error={create.error}/><Stack component="form" id="customer-create-form" onSubmit={submit} noValidate gap={2}>{(['displayName', 'phone', 'email', 'notes'] as const).map((name, i) => <TextField key={name} label={['Tên hiển thị', 'Số liên hệ', 'Email', 'Ghi chú'][i]} {...form.register(name)} error={!!form.formState.errors[name]} helperText={form.formState.errors[name]?.message} multiline={name === 'notes'}/>)}</Stack></EditDialog></>;
}
export function CustomerPage() {
    const { customerId = '' } = useParams();
    const { shop } = useScope();
    const canEdit = useCan('customers.write');
    const canReadOrders = useCan('orders.read');
    const canReadShipments = useCan('fulfillment.read');
    const customer = useApi('getCustomer', { path: { customerId } });
    const orders = useApi('listOrders', { query: { customerId, limit: 10 } }, canReadOrders);
    const shipments = useApi('listShipments', { query: { limit: 100 } }, canReadShipments && canReadOrders);
    const cases = useApi('listServiceCases', { query: { limit: 10 } });
    const customerCases = cases.data?.data.filter(item => item.customerId === customerId) ?? [];
    const customerOrderIds = new Set((orders.data?.data ?? []).map(order => order.id));
    const customerShipments = (shipments.data?.data ?? []).filter(shipment => customerOrderIds.has(shipment.orderId));
    const update = useCommand('updateCustomer', ['getCustomer', 'listCustomers']);
    const form = useForm<CustomerFields>({ defaultValues: { displayName: '', phone: '', email: '', notes: '' }, resolver: zodResolver(customerSchema) });
    useEffect(() => { if (customer.data && !form.formState.isDirty) {
        const c = customer.data.data;
        form.reset({ displayName: c.displayName, phone: c.phone || '', email: c.email || '', notes: c.notes ?? '' });
    } }, [customer.data, form]);
    const save = form.handleSubmit(async (values) => { try {
        const current = customer.data?.data;
        if (!current) return;
        await update.execute({
            path: { customerId }, version: current.version, body: customerPatch(values, current.redactedFields)
        });
        form.reset(values);
    }
    catch { /* render error */ } });
    return <><PageHeader title={customer.data?.data.displayName || 'Hồ sơ khách hàng'} subtitle="Hồ sơ, đơn hàng và yêu cầu sau bán trên cùng một nguồn." actions={<RouteLink to={`/s/${shop.id}/customers`}>Danh sách khách</RouteLink>}/><QueryState query={customer}>{customer.data && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' }, gap: 3 }}><Panel title="Thông tin"><Stack component="form" data-draft-clean={!form.formState.isDirty ? 'true' : undefined} onSubmit={save} gap={2} sx={{ p: 3 }}><ErrorNotice error={update.error}/>{customer.data.data.redactedFields.length > 0 && <Alert severity="info">Một số trường bị hạn chế theo quyền. Không dùng dữ liệu bị che để ghi đè thông tin thật.</Alert>}{(['displayName', 'phone', 'email', 'notes'] as const).map((name, i) => <TextField key={name} label={['Tên hiển thị', 'Số liên hệ', 'Email', 'Ghi chú'][i]} {...form.register(name)} error={!!form.formState.errors[name]} helperText={form.formState.errors[name]?.message} disabled={!canEdit || customer.data?.data.redactedFields.includes(name)} multiline={name === 'notes'} minRows={name === 'notes' ? 3 : undefined}/>)}<MutationButton permission="customers.write" type="submit" variant="contained" busy={update.pending}>Lưu thay đổi</MutationButton></Stack></Panel><Stack gap={3}><Panel title="Đơn hàng gần đây"><Stack sx={{ p: 2 }}>{orders.data?.data.map(o => <DetailLine key={o.id} label={o.id}><RouteLink to={`/s/${shop.id}/orders/${o.id}`}>{o.orderState}</RouteLink></DetailLine>)}{!orders.data?.data.length && <Typography color="text.secondary">Chưa có đơn hoặc chưa đủ quyền.</Typography>}</Stack></Panel><Panel title="Vận đơn liên quan">{canReadOrders && canReadShipments ? <QueryState query={shipments}>{shipments.data && <Stack sx={{ p: 2 }} gap={1.5}>{customerShipments.map(item => <Box key={item.id} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}><Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}><Typography fontWeight={650}>{item.trackingCode || item.id}</Typography><Status value={item.state}/></Stack><DetailLine label="Đơn hàng"><RouteLink to={`/s/${shop.id}/orders/${item.orderId}`}>{item.orderId}</RouteLink></DetailLine><DetailLine label="Phí dự kiến"><Amount value={item.shippingFeeQuote}/></DetailLine><DetailLine label="Phí thực tế"><Amount value={item.shippingFeeActual}/></DetailLine>{item.events.at(-1) && <DetailLine label="Cập nhật gần nhất">{item.events.at(-1)?.type} · {dateTime(item.events.at(-1)!.occurredAt, shop.timezone)}</DetailLine>}</Box>)}{customerShipments.length === 0 && <Typography color="text.secondary">Chưa có vận đơn trong danh sách đơn hàng được phép xem.</Typography>}<RouteLink to={`/s/${shop.id}/shipments`}>Mở danh sách vận đơn</RouteLink></Stack>}</QueryState> : <Alert severity="info" sx={{ m: 2 }}>Vai trò hiện tại cần quyền xem đơn hàng và fulfillment.read để đối chiếu vận đơn.</Alert>}</Panel><Panel title="Yêu cầu hỗ trợ"><QueryState query={cases}>{cases.data && <Stack sx={{ p: 2 }}>{customerCases.map(c => <DetailLine key={c.id} label={c.summary}><Status value={c.state}/></DetailLine>)}{customerCases.length === 0 && <Typography color="text.secondary">Không có yêu cầu của khách này trong 10 bản ghi trả về.</Typography>}<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Hợp đồng hiện chưa hỗ trợ lọc yêu cầu theo khách hàng; kết quả 10 bản ghi này chưa đại diện đầy đủ lịch sử.</Typography><RouteLink to={`/s/${shop.id}/service-cases`}>Xem toàn bộ yêu cầu</RouteLink></Stack>}</QueryState></Panel></Stack></Box>}</QueryState></>;
}
export function ServiceCasesPage() {
    const { shop } = useScope();
    const list = useApi('listServiceCases', { query: useListQuery() });
    const customers = usePagedApi('listCustomers', { query: { limit: 20 } });
    const canReadOrders = useCan('orders.read');
    const create = useCommand('createServiceCase', ['listServiceCases']);
    const change = useCommand('setServiceCaseStatus', ['listServiceCases']);
    const [open, setOpen] = useState(false), [customerId, setCustomerId] = useState(''), [orderId, setOrderId] = useState(''), [kind, setKind] = useState<'question' | 'complaint' | 'return_request' | 'delivery_issue'>('question'), [summary, setSummary] = useState('');
    const [selected, setSelected] = useState<ServiceCase | null>(null), [state, setState] = useState<'assigned' | 'resolved' | 'closed'>('assigned'), [reason, setReason] = useState('');
    const relatedOrders = usePagedApi('listOrders', { query: { customerId, limit: 50 } }, Boolean(customerId) && canReadOrders);
    const selectedOrderIsValid = !orderId || relatedOrders.data?.data.some(order => order.id === orderId);

    return <>
        <PageHeader title="Chăm sóc sau bán" subtitle="Nhận câu hỏi, khiếu nại và yêu cầu đổi trả; không tự hứa hoàn tiền." actions={<MutationButton permission="customers.write" variant="contained" onClick={() => setOpen(true)}>Tạo yêu cầu</MutationButton>} />
        <Panel>
            <Toolbar />
            <QueryState query={list}>
                {list.data && <>
                    <DataTable rows={list.data.data} rowKey={item => item.id} columns={[
                        { key: 'summary', label: 'Yêu cầu', render: item => <Stack><Typography fontWeight={650}>{item.summary}</Typography><Typography variant="caption">{item.id}</Typography></Stack> },
                        { key: 'customer', label: 'Khách', render: item => <RouteLink to={`/s/${shop.id}/customers/${item.customerId}`}>{customers.data?.data.find(customer => customer.id === item.customerId)?.displayName || item.customerId}</RouteLink> },
                        { key: 'order', label: 'Đơn liên quan', render: item => item.orderId ? <RouteLink to={`/s/${shop.id}/orders/${item.orderId}`}>{item.orderId}</RouteLink> : 'Chưa liên kết' },
                        { key: 'type', label: 'Loại', render: item => <Status value={item.kind} /> },
                        { key: 'state', label: 'Trạng thái', render: item => <Status value={item.state} /> },
                        { key: 'action', label: '', render: item => <MutationButton permission="customers.write" onClick={() => { setSelected(item); setState(item.state === 'open' ? 'assigned' : item.state); setReason(''); }}>Xử lý</MutationButton> },
                    ]} />
                    <Pager page={list.data.page} />
                </>}
            </QueryState>
        </Panel>
        <EditDialog open={open} title="Yêu cầu mới" onClose={() => setOpen(false)} busy={create.pending} actions={<Button variant="contained" disabled={!customerId || summary.trim().length < 5 || !selectedOrderIsValid || create.pending} onClick={async () => {
            try {
                await create.execute({ body: { customerId, orderId: orderId || null, kind, summary: summary.trim() } });
                setOpen(false);
                setCustomerId('');
                setOrderId('');
                setSummary('');
            }
            catch { /* visible */ }
        }}>Tạo yêu cầu</Button>}>
            <ErrorNotice error={create.error || customers.error || relatedOrders.error} />
            <Stack gap={2}>
                <TextField select label="Khách hàng" value={customerId} onChange={event => { setCustomerId(event.target.value); setOrderId(''); }}>
                    {customers.data?.data.map(customer => <MenuItem key={customer.id} value={customer.id}>{customer.displayName}</MenuItem>)}
                </TextField>
                <LookupLoadMore label="khách hàng" loadedCount={customers.loadedCount} hasMore={customers.hasMore} busy={customers.isLoadingMore} onLoadMore={customers.loadMore} />
                <TextField select label="Đơn hàng liên quan (không bắt buộc)" value={orderId} disabled={!customerId || !canReadOrders || relatedOrders.isPending} onChange={event => setOrderId(event.target.value)} helperText={!canReadOrders ? 'Vai trò này không có quyền xem đơn; có thể tạo yêu cầu không gắn đơn.' : !customerId ? 'Chọn khách hàng trước để lọc đúng đơn của họ.' : relatedOrders.isPending ? 'Đang tải đơn của khách đã chọn…' : relatedOrders.data?.data.length ? 'Chỉ hiển thị đơn thuộc khách hàng đã chọn.' : 'Không có đơn phù hợp; có thể tạo yêu cầu không gắn đơn.'}>
                    <MenuItem value="">Không liên kết đơn</MenuItem>
                    {relatedOrders.data?.data.map(order => <MenuItem key={order.id} value={order.id}>{order.id} · {order.orderState}</MenuItem>)}
                </TextField>
                {customerId && canReadOrders && <LookupLoadMore label="đơn hàng của khách" loadedCount={relatedOrders.loadedCount} hasMore={relatedOrders.hasMore} busy={relatedOrders.isLoadingMore} onLoadMore={relatedOrders.loadMore} />}
                <TextField select label="Loại yêu cầu" value={kind} onChange={event => setKind(event.target.value as typeof kind)}>{['question', 'complaint', 'return_request', 'delivery_issue'].map((value, index) => <MenuItem key={value} value={value}>{['Câu hỏi', 'Khiếu nại', 'Yêu cầu trả hàng', 'Vấn đề giao hàng'][index]}</MenuItem>)}</TextField>
                <TextField label="Nội dung" multiline minRows={3} value={summary} onChange={event => setSummary(event.target.value)} inputProps={{ maxLength: 1000 }} helperText={`${summary.length}/1000`} />
                <Alert severity="info">Yêu cầu chỉ được liên kết với đơn đã tải từ hồ sơ khách đang chọn. Việc tạo case không xác nhận đổi trả hoặc hoàn tiền.</Alert>
            </Stack>
        </EditDialog>
        <EditDialog open={!!selected} title="Cập nhật yêu cầu" onClose={() => setSelected(null)} busy={change.pending} actions={<Button variant="contained" disabled={!reason.trim() || change.pending} onClick={async () => {
            if (!selected) return;
            try {
                await change.execute({ path: { resourceId: selected.id }, body: { expectedVersion: selected.version, state, reason } });
                setSelected(null);
            }
            catch { /* visible */ }
        }}>Cập nhật</Button>}>
            <ErrorNotice error={change.error} />
            <Stack gap={2}>
                <Typography>{selected?.summary}</Typography>
                {selected?.orderId && <RouteLink to={`/s/${shop.id}/orders/${selected.orderId}`}>Mở đơn {selected.orderId}</RouteLink>}
                <TextField select label="Trạng thái mới" value={state} onChange={event => setState(event.target.value as typeof state)}><MenuItem value="assigned">Đã phân công</MenuItem><MenuItem value="resolved">Đã giải quyết</MenuItem><MenuItem value="closed">Đóng yêu cầu</MenuItem></TextField>
                <TextField label="Kết quả / lý do" multiline minRows={3} value={reason} onChange={event => setReason(event.target.value)} inputProps={{ maxLength: 1000 }} />
                <Alert severity="info">Cập nhật case không tạo giao dịch hoàn tiền. Nếu cần đổi/trả, xử lý qua quy trình đơn hàng được cấp quyền.</Alert>
            </Stack>
        </EditDialog>
    </>;
}
function customerPatch(values: CustomerFields, redacted: readonly string[]): CustomerWritePatch { const patch: CustomerWritePatch = {}; if (!redacted.includes('displayName'))
    patch.displayName = values.displayName; if (!redacted.includes('phone'))
    patch.phone = values.phone || null; if (!redacted.includes('email'))
    patch.email = values.email || null; if (!redacted.includes('notes'))
    patch.notes = values.notes; return patch; }
