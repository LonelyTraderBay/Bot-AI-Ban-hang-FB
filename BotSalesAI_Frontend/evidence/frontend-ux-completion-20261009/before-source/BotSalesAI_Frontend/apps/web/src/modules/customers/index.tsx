import { markDraftClean, useDraftForm } from '@/shared/model/dirty-drafts';
import { ActionGroup, FormFields, PageSections, SectionGrid } from '../../shared/ui/composition';
import { useMemo, useRef, useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { Customer, ServiceCase, CustomerWritePatch } from '@botsales/contracts';
import { useVersionedDraft } from '@/shared/model/versioned-draft';
import { DraftConflict } from '@/shared/ui/draft-conflict';
import { useApi, useCommand, usePagedApi } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { limitCodePoints, codePointLength, dateTime } from '@/shared/model/format';
import { Amount, PageHeader, Panel, DataTable, QueryState, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, RouteLink, DetailLine, LookupLoadMore } from '@/shared/ui/components';
import { layoutSx } from '@/shared/ui/layout';
const customerFormFields = [
    { name: 'displayName', labelKey: 'customers.form.customerName', multiline: false },
    { name: 'phone', labelKey: 'customers.form.phone', multiline: false },
    { name: 'email', labelKey: 'customers.form.email', multiline: false },
    { name: 'notes', labelKey: 'customers.form.notes', multiline: true },
] as const;
function createCustomerSchema(copy: {
    nameRequired: string;
    nameMax: string;
    phoneMax: string;
    emailFormat: string;
    notesMax: string;
}) {
    return z.object({
        displayName: z.string().trim().min(1, copy.nameRequired).refine(value => codePointLength(value) <= 160, copy.nameMax),
        phone: z.string().refine(value => codePointLength(value) <= 40, copy.phoneMax),
        email: z.string().email(copy.emailFormat).or(z.literal('')),
        notes: z.string().refine(value => codePointLength(value) <= 4000, copy.notesMax),
    });
}
type CustomerFields = z.infer<ReturnType<typeof createCustomerSchema>>;
function useCustomerCopy() {
    const { t } = useTranslation();
    const schema = useMemo(() => createCustomerSchema({
        nameRequired: t('customers.validation.nameRequired'),
        nameMax: t('customers.validation.nameMax'),
        phoneMax: t('customers.validation.phoneMax'),
        emailFormat: t('customers.validation.emailFormat'),
        notesMax: t('customers.validation.notesMax'),
    }), [t]);
    return { t, schema };
}
export function CustomersPage() {
    const { t, schema } = useCustomerCopy();
    const { shop } = useScope();
    const navigate = useNavigate();
    const list = useApi('listCustomers', { query: useListQuery('listCustomers') });
    const create = useCommand('createCustomer', ['listCustomers']);
    const [open, setOpen] = useState(false);
    const form = useForm<CustomerFields>({ defaultValues: { displayName: '', phone: '', email: '', notes: '' }, resolver: zodResolver(schema) });
    const createForm = useRef<HTMLFormElement>(null);
    const submit = form.handleSubmit(async (fields) => { try {
        const response = await create.execute({ body: { ...fields, phone: fields.phone || null, email: fields.email || null } });
        if (createForm.current) {
            markDraftClean(createForm.current);
            const dialog = createForm.current.closest<HTMLElement>('[role="dialog"]');
            if (dialog) { dialog.dataset.draftClean = 'true'; delete dialog.dataset.draftDirty; }
        }
        setOpen(false);
        form.reset();
        navigate(`/s/${shop.id}/customers/${response.data.id}`);
    }
    catch { /* error stays in dialog */ } });
    return <><PageHeader title={t('customers.list.title')} subtitle={t('customers.list.subtitle')} actions={<MutationButton permission="customers.write" variant="contained" onClick={() => setOpen(true)}>{t('customers.list.addAction')}</MutationButton>}/><Panel><Toolbar operation="listCustomers" placeholder={t('customers.list.searchPlaceholder')} cursorParam="cursor"/><QueryState query={list} pendingProfile="section">{list.data && <><DataTable label={t('customers.list.tableLabel')} empty={t('customers.list.empty')} rows={list.data.data} rowKey={c => c.id} columns={[
        { key: 'name', label: t('customers.list.customerColumn'), render: c => <Typography fontWeight={visualSx.typography.fontWeight.strong}>{c.displayName}</Typography> }, { key: 'phone', label: t('customers.list.contactColumn'), render: c => c.phone || t('customers.list.contactUnavailable') }, { key: 'email', label: t('customers.list.emailColumn'), render: c => c.email || '—' }, { key: 'note', label: t('customers.list.notesColumn'), render: c => c.notes || '—' }, { key: 'action', label: '', render: c => <RouteLink to={`/s/${shop.id}/customers/${c.id}`}>{t('customers.list.profileAction')}</RouteLink> }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel><EditDialog open={open} title={t('customers.form.createTitle')} onClose={() => setOpen(false)} busy={create.pending} actions={<Button type="submit" form="customer-create-form" variant="contained" disabled={create.pending}>{t('customers.form.createAction')}</Button>}><ErrorNotice error={create.error}/><FormFields component="form" ref={createForm} id="customer-create-form" onSubmit={submit} noValidate >{customerFormFields.map(field => <TextField key={field.name} label={t(field.labelKey)} disabled={create.pending} {...form.register(field.name)} error={!!form.formState.errors[field.name]} helperText={form.formState.errors[field.name]?.message} multiline={field.multiline}/>)}</FormFields></EditDialog></>;
}
export function CustomerPage() {
    const { t, schema } = useCustomerCopy();
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
    const form = useForm<CustomerFields>({ defaultValues: { displayName: '', phone: '', email: '', notes: '' }, resolver: zodResolver(schema) });
    useWatch({ control: form.control });
    const editor = useVersionedDraft({
        identity: `${shop.id}:customer:${customerId}`,
        source: customer.data ? customerSnapshot(customer.data.data) : undefined,
        draft: form.getValues(),
        apply: (values, baseline) => {
            form.reset(baseline);
            for (const key of Object.keys(values) as (keyof CustomerFields)[]) form.setValue(key, values[key], { shouldDirty: true });
        },
        refresh: () => customer.refetch({ throwOnError: true }),
    });
    const draftForm = useDraftForm(editor.dirty);
    const save = form.handleSubmit(async (values) => {
        const submitted = form.getValues();
        try {
            const prepared = editor.prepare();
            if (!prepared) return;
            const response = await update.execute({
                path: { customerId }, version: prepared.version, body: customerPatch(Object.fromEntries(Object.keys(prepared.patch).map(key => [key, values[key as keyof CustomerFields]])), customer.data?.data.redactedFields || [])
            });
            editor.committed(customerSnapshot(response.data), submitted);
        }
        catch (error) { editor.failed(error); }
    });
    return <>
        <PageHeader title={customer.data?.data.displayName || t('customers.detail.fallbackTitle')} subtitle={t('customers.detail.subtitle')} actions={<RouteLink to={'/s/' + shop.id + '/customers'}>{t('customers.detail.listAction')}</RouteLink>}/>
        <QueryState query={customer} pendingProfile="section">
            {customer.data && <SectionGrid columns={{ xs: '1fr', lg: '1.2fr 1fr' }}>
                <Panel title={t('customers.detail.information')} bodyMode="inset">
                    <FormFields component="form" ref={draftForm} data-draft-clean={!editor.dirty ? 'true' : undefined} onSubmit={save} >
                        <ErrorNotice error={update.error}/>
                        <DraftConflict editor={editor} labels={{ displayName: 'Tên khách hàng', phone: 'Điện thoại', email: 'Email', notes: 'Ghi chú' }} busy={update.pending}/>
                        {customer.data.data.redactedFields.length > 0 && <Alert severity="info">{t('customers.detail.redactedNotice')}</Alert>}
                        {customerFormFields.map(field => <TextField key={field.name} label={t(field.labelKey)} {...form.register(field.name)} error={!!form.formState.errors[field.name]} helperText={form.formState.errors[field.name]?.message} disabled={!canEdit || customer.data?.data.redactedFields.includes(field.name)} multiline={field.multiline} minRows={field.multiline ? 3 : undefined}/>)}
                        <MutationButton permission="customers.write" type="submit" variant="contained" busy={update.pending} disabled={!editor.dirty}>{t('customers.form.saveAction')}</MutationButton>
                    </FormFields>
                </Panel>
                <PageSections >
                    <Panel title={t('customers.detail.recentOrders')} bodyMode="inset">
                        <Stack>
                            {canReadOrders
                                ? <QueryState query={orders}>
                                    {orders.data && <>
                                        {orders.data.data.map(order => <DetailLine key={order.id} label={order.id}><RouteLink to={'/s/' + shop.id + '/orders/' + order.id}>{order.orderState}</RouteLink></DetailLine>)}
                                        {orders.data.data.length === 0 && <Typography color="text.secondary">{t('customers.detail.noOrders')}</Typography>}
                                        <Typography variant="caption" color="text.secondary">{t('customers.detail.orderPreviewLimit')}</Typography>
                                        <RouteLink to={'/s/' + shop.id + '/orders'}>{t('customers.detail.openOrders')}</RouteLink>
                                    </>}
                                </QueryState>
                                : <Alert severity="info" role="status">{t('customers.detail.shipmentPermission')}</Alert>}
                        </Stack>
                    </Panel>
                    <Panel title={t('customers.detail.relatedShipments')} bodyMode="inset">
                        {canReadOrders && canReadShipments
                            ? <QueryState query={shipments}>
                                {shipments.data && <Stack sx={layoutSx.detail.relatedItemGap}>
                                    {orders.isPending && !orders.data && <Typography role="status">{t('customers.detail.ordersLoading')}</Typography>}
                                    {orders.isError && !orders.data && <Alert severity="info" role="status">{t('customers.detail.ordersUnavailable')}</Alert>}
                                    {orders.data && <>
                                        {customerShipments.map(item => <Box key={item.id} sx={[layoutSx.detail.relatedItemInset, { border: 1, borderColor: 'divider', borderRadius: visualSx.radius.control }]}>
                                            <ActionGroup direction="row" justifyContent="space-between" alignItems="center" ><Typography fontWeight={visualSx.typography.fontWeight.strong}>{item.trackingCode || item.id}</Typography><Status value={item.state}/></ActionGroup>
                                            <DetailLine label="Đơn hàng"><RouteLink to={'/s/' + shop.id + '/orders/' + item.orderId}>{item.orderId}</RouteLink></DetailLine>
                                            <DetailLine label="Phí dự kiến"><Amount wrap value={item.shippingFeeQuote}/></DetailLine>
                                            <DetailLine label="Phí thực tế"><Amount wrap value={item.shippingFeeActual}/></DetailLine>
                                            {item.events.at(-1) && <DetailLine label="Cập nhật gần nhất">{item.events.at(-1)?.type} · {dateTime(item.events.at(-1)!.occurredAt, shop.timezone)}</DetailLine>}
                                        </Box>)}
                                        {customerShipments.length === 0 && <Typography color="text.secondary">{t('customers.detail.noShipments')}</Typography>}
                                        <Typography variant="caption" color="text.secondary">{t('customers.detail.shipmentPreviewLimit')}</Typography>
                                    </>}
                                    <RouteLink to={'/s/' + shop.id + '/shipments'}>{t('customers.detail.openShipments')}</RouteLink>
                                </Stack>}
                            </QueryState>
                            : <Alert severity="info">{t('customers.detail.shipmentPermission')}</Alert>}
                    </Panel>
                    <Panel title={t('customers.detail.supportCases')} bodyMode="inset">
                        <QueryState query={cases}>
                            {cases.data && <Stack>
                                {customerCases.map(item => <DetailLine key={item.id} label={item.summary}><Status value={item.state}/></DetailLine>)}
                                {customerCases.length === 0 && <Typography color="text.secondary">{t('customers.detail.noSupportCases')}</Typography>}
                                <Typography variant="caption" color="text.secondary" sx={layoutSx.detail.relatedContentGap}>{t('customers.detail.supportCasesLimit')}</Typography>
                                <RouteLink to={'/s/' + shop.id + '/service-cases'}>{t('customers.detail.openSupportCases')}</RouteLink>
                            </Stack>}
                        </QueryState>
                    </Panel>
                </PageSections>
            </SectionGrid>}
        </QueryState>
    </>;
}
export function ServiceCasesPage() {
    const { shop } = useScope();
    const list = useApi('listServiceCases', { query: useListQuery('listServiceCases') });
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
            <Toolbar operation="listServiceCases" />
            <QueryState query={list} pendingProfile="section">
                {list.data && <>
                    <DataTable rows={list.data.data} rowKey={item => item.id} columns={[
                        { key: 'summary', label: 'Yêu cầu', render: item => <Stack><Typography fontWeight={visualSx.typography.fontWeight.strong}>{item.summary}</Typography><Typography variant="caption">{item.id}</Typography></Stack> },
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
        <EditDialog open={open} title="Yêu cầu mới" onClose={() => setOpen(false)} busy={create.pending} actions={<Button variant="contained" disabled={!customerId || codePointLength(summary.trim()) < 5 || !selectedOrderIsValid || create.pending} onClick={async () => {
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
            <FormFields >
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
                <TextField label="Nội dung" multiline minRows={3} value={summary} onChange={event => setSummary(limitCodePoints(event.target.value, 1000))}  helperText={`${codePointLength(summary)}/1000`} />
                <Alert severity="info">Yêu cầu chỉ được liên kết với đơn đã tải từ hồ sơ khách đang chọn. Việc tạo case không xác nhận đổi trả hoặc hoàn tiền.</Alert>
            </FormFields>
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
            <FormFields >
                <Typography>{selected?.summary}</Typography>
                {selected?.orderId && <RouteLink to={`/s/${shop.id}/orders/${selected.orderId}`}>Mở đơn {selected.orderId}</RouteLink>}
                <TextField select label="Trạng thái mới" value={state} onChange={event => setState(event.target.value as typeof state)}><MenuItem value="assigned">Đã phân công</MenuItem><MenuItem value="resolved">Đã giải quyết</MenuItem><MenuItem value="closed">Đóng yêu cầu</MenuItem></TextField>
                <TextField label="Kết quả / lý do" multiline minRows={3} value={reason} onChange={event => setReason(limitCodePoints(event.target.value, 1000))}  />
                <Alert severity="info">Cập nhật case không tạo giao dịch hoàn tiền. Nếu cần đổi/trả, xử lý qua quy trình đơn hàng được cấp quyền.</Alert>
            </FormFields>
        </EditDialog>
    </>;
}
function customerSnapshot(customer: Customer) {
    return { version: customer.version, values: { displayName: customer.displayName, phone: customer.phone || '', email: customer.email || '', notes: customer.notes || '' }, hidden: customer.redactedFields.filter((key): key is keyof CustomerFields => ['displayName', 'phone', 'email', 'notes'].includes(key)) };
}
function customerPatch(values: Partial<CustomerFields>, redacted: readonly string[]): CustomerWritePatch { const patch: CustomerWritePatch = {}; if (values.displayName !== undefined && !redacted.includes('displayName'))
    patch.displayName = values.displayName; if (values.phone !== undefined && !redacted.includes('phone'))
    patch.phone = values.phone || null; if (values.email !== undefined && !redacted.includes('email'))
    patch.email = values.email || null; if (values.notes !== undefined && !redacted.includes('notes'))
    patch.notes = values.notes; return patch; }
