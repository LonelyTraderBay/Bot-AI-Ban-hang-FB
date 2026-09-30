import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { ServiceCase, CustomerWritePatch } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { PageHeader, Panel, DataTable, QueryState, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, RouteLink, DetailLine } from '@/shared/ui/components';
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
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel><EditDialog open={open} title="Thêm khách hàng" onClose={() => setOpen(false)} busy={create.pending} actions={<Button variant="contained" disabled={create.pending} onClick={() => void submit()}>Lưu khách hàng</Button>}><ErrorNotice error={create.error}/><Stack gap={2}>{(['displayName', 'phone', 'email', 'notes'] as const).map((name, i) => <TextField key={name} label={['Tên hiển thị', 'Số liên hệ', 'Email', 'Ghi chú'][i]} {...form.register(name)} error={!!form.formState.errors[name]} helperText={form.formState.errors[name]?.message} multiline={name === 'notes'}/>)}</Stack></EditDialog></>;
}
export function CustomerPage() {
    const { customerId = '' } = useParams();
    const { shop } = useScope();
    const canEdit = useCan('customers.write');
    const customer = useApi('getCustomer', { path: { customerId } });
    const orders = useApi('listOrders', { query: { customerId, limit: 10 } }, useCan('orders.read'));
    const cases = useApi('listServiceCases', { query: { customerId, limit: 10 } });
    const update = useCommand('updateCustomer', ['getCustomer', 'listCustomers']);
    const form = useForm<CustomerFields>({ defaultValues: { displayName: '', phone: '', email: '', notes: '' }, resolver: zodResolver(customerSchema) });
    useEffect(() => { if (customer.data && !form.formState.isDirty) {
        const c = customer.data.data;
        form.reset({ displayName: c.displayName, phone: c.phone || '', email: c.email || '', notes: c.notes });
    } }, [customer.data, form]);
    const save = form.handleSubmit(async (values) => { try {
        await update.execute({
            path: { customerId }, version: customer.data?.data.version, body: customerPatch(values, customer.data?.data.redactedFields || [])
        });
        form.reset(values);
    }
    catch { /* render error */ } });
    return <><PageHeader title={customer.data?.data.displayName || 'Hồ sơ khách hàng'} subtitle="Hồ sơ, đơn hàng và yêu cầu sau bán trên cùng một nguồn." actions={<RouteLink to={`/s/${shop.id}/customers`}>Danh sách khách</RouteLink>}/><QueryState query={customer}>{customer.data && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' }, gap: 3 }}><Panel title="Thông tin"><Stack component="form" onSubmit={save} gap={2} sx={{ p: 3 }}><ErrorNotice error={update.error}/>{customer.data.data.redactedFields.length > 0 && <Alert severity="info">Một số trường bị hạn chế theo quyền. Không dùng dữ liệu bị che để ghi đè thông tin thật.</Alert>}{(['displayName', 'phone', 'email', 'notes'] as const).map((name, i) => <TextField key={name} label={['Tên hiển thị', 'Số liên hệ', 'Email', 'Ghi chú'][i]} {...form.register(name)} error={!!form.formState.errors[name]} helperText={form.formState.errors[name]?.message} disabled={!canEdit || customer.data?.data.redactedFields.includes(name)} multiline={name === 'notes'} minRows={name === 'notes' ? 3 : undefined}/>)}<MutationButton permission="customers.write" type="submit" variant="contained" busy={update.pending}>Lưu thay đổi</MutationButton></Stack></Panel><Stack gap={3}><Panel title="Đơn hàng gần đây"><Stack sx={{ p: 2 }}>{orders.data?.data.map(o => <DetailLine key={o.id} label={o.id}><RouteLink to={`/s/${shop.id}/orders/${o.id}`}>{o.orderState}</RouteLink></DetailLine>)}{!orders.data?.data.length && <Typography color="text.secondary">Chưa có đơn hoặc chưa đủ quyền.</Typography>}</Stack></Panel><Panel title="Yêu cầu hỗ trợ"><Stack sx={{ p: 2 }}>{cases.data?.data.map(c => <DetailLine key={c.id} label={c.summary}><Status value={c.state}/></DetailLine>)}<RouteLink to={`/s/${shop.id}/service-cases?customerId=${customerId}`}>Xem yêu cầu</RouteLink></Stack></Panel></Stack></Box>}</QueryState></>;
}
export function ServiceCasesPage() {
    const { shop } = useScope();
    const list = useApi('listServiceCases', { query: useListQuery() });
    const customers = useApi('listCustomers', { query: { limit: 100 } });
    const create = useCommand('createServiceCase', ['listServiceCases']);
    const change = useCommand('setServiceCaseStatus', ['listServiceCases']);
    const [open, setOpen] = useState(false), [customerId, setCustomerId] = useState(''), [orderId, setOrderId] = useState(''), [kind, setKind] = useState<'question' | 'complaint' | 'return_request' | 'delivery_issue'>('question'), [summary, setSummary] = useState('');
    const [selected, setSelected] = useState<ServiceCase | null>(null), [state, setState] = useState<'assigned' | 'resolved' | 'closed'>('assigned'), [reason, setReason] = useState('');
    return <><PageHeader title="Chăm sóc sau bán" subtitle="Nhận câu hỏi, khiếu nại và yêu cầu đổi trả; không tự hứa hoàn tiền." actions={<MutationButton permission="customers.write" variant="contained" onClick={() => setOpen(true)}>Tạo yêu cầu</MutationButton>}/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={r => r.id} columns={[
        {
            key: 'summary', label: 'Yêu cầu', render: r => <Stack><Typography fontWeight={650}>{r.summary}</Typography><Typography variant="caption">{r.id}</Typography></Stack>
        },
        {
            key: 'customer', label: 'Khách', render: r => <RouteLink to={`/s/${shop.id}/customers/${r.customerId}`}>{customers.data?.data.find(c => c.id === r.customerId)?.displayName || r.customerId}</RouteLink>
        },
        { key: 'type', label: 'Loại', render: r => <Status value={r.kind}/> }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.state}/> },
        {
            key: 'action', label: '', render: r => <MutationButton permission="customers.write" onClick={() => { setSelected(r); setReason(''); }}>Xử lý</MutationButton>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <EditDialog open={open} title="Yêu cầu mới" onClose={() => setOpen(false)} busy={create.pending} actions={<Button variant="contained" disabled={!customerId || !summary.trim() || create.pending} onClick={async () => { try {
        await create.execute({ body: { customerId, orderId: orderId || null, kind, summary } });
        setOpen(false);
        setSummary('');
    }
    catch { /* visible */ } }}>Tạo yêu cầu</Button>}><ErrorNotice error={create.error}/><Stack gap={2}><TextField select label="Khách hàng" value={customerId} onChange={e => setCustomerId(e.target.value)}>{customers.data?.data.map(c => <MenuItem key={c.id} value={c.id}>{c.displayName}</MenuItem>)}</TextField><TextField label="Mã đơn (không bắt buộc)" value={orderId} onChange={e => setOrderId(e.target.value)}/><TextField select label="Loại yêu cầu" value={kind} onChange={e => setKind(e.target.value as typeof kind)}>{['question', 'complaint', 'return_request', 'delivery_issue'].map((v, i) => <MenuItem key={v} value={v}>{['Câu hỏi', 'Khiếu nại', 'Yêu cầu trả hàng', 'Vấn đề giao hàng'][i]}</MenuItem>)}</TextField><TextField label="Nội dung" multiline minRows={3} value={summary} onChange={e => setSummary(e.target.value)}/></Stack></EditDialog>
 <EditDialog open={!!selected} title="Cập nhật yêu cầu" onClose={() => setSelected(null)} busy={change.pending} actions={<Button variant="contained" disabled={!reason.trim() || change.pending} onClick={async () => { if (!selected)
        return; try {
        await change.execute({ path: { resourceId: selected.id }, body: { expectedVersion: selected.version, state, reason } });
        setSelected(null);
    }
    catch { /* visible */ } }}>Cập nhật</Button>}><ErrorNotice error={change.error}/><Stack gap={2}><Typography>{selected?.summary}</Typography><TextField select label="Trạng thái mới" value={state} onChange={e => setState(e.target.value as typeof state)}><MenuItem value="assigned">Đã phân công</MenuItem><MenuItem value="resolved">Đã giải quyết</MenuItem><MenuItem value="closed">Đóng yêu cầu</MenuItem></TextField><TextField label="Kết quả / lý do" multiline minRows={3} value={reason} onChange={e => setReason(e.target.value)}/></Stack></EditDialog></>;
}
function customerPatch(values: CustomerFields, redacted: readonly string[]): CustomerWritePatch { const patch: CustomerWritePatch = {}; if (!redacted.includes('displayName'))
    patch.displayName = values.displayName; if (!redacted.includes('phone'))
    patch.phone = values.phone || null; if (!redacted.includes('email'))
    patch.email = values.email || null; if (!redacted.includes('notes'))
    patch.notes = values.notes; return patch; }
