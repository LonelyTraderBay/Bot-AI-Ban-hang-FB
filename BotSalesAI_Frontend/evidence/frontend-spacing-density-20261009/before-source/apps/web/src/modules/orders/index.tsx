import { draftEqual, useVersionedDraft } from '@/shared/model/versioned-draft';
import { markDraftClean, useDraftForm } from '@/shared/model/dirty-drafts';
import { DraftConflict } from '@/shared/ui/draft-conflict';
import { ActionGroup, FieldGroup, FormFields, PageSections, SectionGrid } from '../../shared/ui/composition';
import { useEffect, useRef, useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Divider, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import type { Order, OrderQuote, CustomerConfirmationRequest, CustomerConfirmation, ReturnCase, ReturnInspection } from '@botsales/contracts';
import { useApi, useCommand, usePagedApi } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { codePointLength, limitCodePoints, dateTime } from '@/shared/model/format';
import { PageHeader, Panel, DataTable, QueryState, Toolbar, Pager, Status, Amount, MutationButton, EditDialog, ErrorNotice, ConfirmDialog, RouteLink, DetailLine, LookupLoadMore } from '@/shared/ui/components';
import { layoutSx } from '@/shared/ui/layout';
import { getDemoAddressOptions } from './demo-address-preview';
export function OrdersPage() { const { shop } = useScope(); const navigate = useNavigate(); const list = useApi('listOrders', { query: useListQuery('listOrders') }); return <><PageHeader title="Đơn hàng" subtitle="Tách riêng trạng thái đơn, giao hàng và thanh toán." actions={<MutationButton permission="orders.write" variant="contained" onClick={() => navigate(`/s/${shop.id}/orders/new`)}>Tạo đơn hàng</MutationButton>}/><Panel><Toolbar operation="listOrders" placeholder="Tìm mã đơn hoặc khách hàng…"/><QueryState query={list} pendingProfile="section">{list.data && <><DataTable rows={list.data.data} rowKey={o => o.id} columns={[
    {
        key: 'id', label: 'Đơn hàng', render: o => <Stack><Typography fontWeight={visualSx.typography.fontWeight.strong}>{o.id}</Typography><Typography variant="caption" color="text.secondary">{dateTime(o.createdAt, shop.timezone)}</Typography></Stack>
    },
    { key: 'customer', label: 'Khách', render: o => o.customerId }, { key: 'total', label: 'Tổng tiền', align: 'right', render: o => <Amount value={o.total}/> }, { key: 'order', label: 'Đơn', render: o => <Status value={o.orderState}/> }, { key: 'shipping', label: 'Giao hàng', render: o => <Status value={o.fulfillmentState}/> }, { key: 'payment', label: 'Tiền', render: o => <Status value={o.paymentState}/> }, { key: 'action', label: '', render: o => <RouteLink to={`/s/${shop.id}/orders/${o.id}`}>Xem đơn</RouteLink> }
]}/><Pager page={list.data.page}/></>}</QueryState></Panel></>; }
function DraftForm({ initial, onSaved, onBusyChange }: {
    initial?: Order;
    onSaved: (order: Order) => void;
    onBusyChange?: (busy: boolean) => void;
}) {
    const { shop } = useScope();
    const [params] = useSearchParams();
    const [created, setCreated] = useState<Order | null>(null);
    const resource = initial || created;
    const canReadCustomers = useCan('customers.read');
    const canReadProducts = useCan('catalog.read');
    const canReadConversations = useCan('conversations.read');
    const canWriteOrders = useCan('orders.write');
    const [customerSearch, setCustomerSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const customers = usePagedApi('listCustomers', { query: { q: customerSearch.trim() || undefined, limit: 20 } }, canReadCustomers);
    const products = usePagedApi('listProducts', { query: { q: productSearch.trim() || undefined, limit: 20 } }, canReadProducts);
    const create = useCommand('createOrder', ['listOrders']);
    const update = useCommand('updateOrderDraft', ['getOrder', 'listOrders']);
    useEffect(() => { onBusyChange?.(create.pending || update.pending); }, [create.pending, update.pending, onBusyChange]);
    const initialNotes = typeof initial?.notes === 'string' ? initial.notes : '';
    const [customerId, setCustomer] = useState(initial?.customerId || params.get('customerId') || ''), [conversationId, setConversation] = useState(initial?.conversationId || params.get('conversationId') || ''), [warehouse, setWarehouse] = useState(initial?.warehouseId || shop.defaultWarehouseId), [addressId, setAddress] = useState(initial?.shippingAddressId || ''), [method, setMethod] = useState<'cod' | 'prepay'>(initial?.paymentMethod || 'cod'), [notes, setNotes] = useState(initialNotes);
    const conv = usePagedApi('listConversations', { query: { customerId: customerId || undefined, limit: 20 } }, canReadConversations && !!customerId);
    const [lines, setLines] = useState(initial?.lines.map(l => ({ key: l.id, variantId: l.variantId, variantLabel: `${l.name} · ${l.sku}`, quantity: String(l.quantity) })) || [{ key: crypto.randomUUID(), variantId: '', variantLabel: '', quantity: '1' }]);
    const variants = products.data?.data.filter(p => p.status === 'active').flatMap(p => p.variants.filter(v => v.active).map(v => ({ ...v, productName: p.name }))) || [];
    const lineQuantityError = (value: string) => value.length > 0 && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 1_000_000);
    const duplicateVariants = new Set(lines.map(l => l.variantId).filter(Boolean)).size !== lines.filter(l => l.variantId).length;
    const valid = !!customerId && !!warehouse.trim() && lines.length > 0 && lines.length <= 100 && lines.every(l => l.variantId && !lineQuantityError(l.quantity)) && !duplicateVariants && codePointLength(notes) <= 2_000 && (initial !== undefined || (canReadCustomers && canReadProducts));
    const chooseVariant = (key: string, variantId: string) => {
        const selected = variants.find(v => v.id === variantId);
        setLines(current => current.map(line => line.key === key ? { ...line, variantId, variantLabel: selected ? `${selected.productName} · ${selected.name} · ${selected.sku}` : line.variantLabel } : line));
    };
    const fresh = useApi('getOrder', { path: { orderId: resource?.id || '' } }, !!resource);
    const current = fresh.data && (!resource || fresh.data.data.version >= resource.version) ? fresh.data.data : resource;
    const values = { customerId, conversationId, warehouse, notes, lines: lines.map(line => ({ variantId: line.variantId, quantity: line.quantity })) };
    const editor = useVersionedDraft({
        identity: `${shop.id}:order:${resource?.id || 'new'}`,
        source: current ? orderSnapshot(current) : undefined,
        draft: values,
        apply: value => {
            setCustomer(value.customerId); setConversation(value.conversationId); setWarehouse(value.warehouse); setNotes(value.notes);
            setLines(existing => value.lines.map(line => ({ ...line, key: existing.find(item => item.variantId === line.variantId)?.key || crypto.randomUUID(), variantLabel: existing.find(item => item.variantId === line.variantId)?.variantLabel || '' })));
        }, refresh: () => fresh.refetch({ throwOnError: true }),
    });
    const [creationBaseline] = useState(() => ({ ...values, addressId, method }));
    const bindDraft = useDraftForm(resource ? editor.dirty : !draftEqual(creationBaseline, { ...values, addressId, method }));
    const formRef = useRef<HTMLFormElement>(null);
    const save = async () => { try {
        const body = { customerId, conversationId: conversationId || null, warehouseId: warehouse, lines: lines.map(line => ({ variantId: line.variantId, quantity: Number(line.quantity) })), notes };
        let response: Awaited<ReturnType<typeof create.execute>>;
        if (resource) {
            const prepared = editor.prepare(); if (!prepared) return;
            response = await update.execute({ path: { orderId: resource.id }, version: prepared.version, body: {
                ...(prepared.patch.customerId !== undefined ? { customerId: body.customerId } : {}),
                ...(prepared.patch.conversationId !== undefined ? { conversationId: body.conversationId } : {}),
                ...(prepared.patch.warehouse !== undefined ? { warehouseId: body.warehouseId } : {}),
                ...(prepared.patch.lines !== undefined ? { lines: body.lines } : {}),
                ...(prepared.patch.notes !== undefined ? { notes: body.notes } : {}),
            } });
        } else response = await create.execute({ body: { ...body, paymentMethod: method, shippingAddressId: addressId || null } });
        const clean = editor.committed(orderSnapshot(response.data), values, `${shop.id}:order:${response.data.id}`);
        if (clean) { if (formRef.current) markDraftClean(formRef.current); onSaved(response.data); }
        else setCreated(response.data);
    } catch (error) { editor.failed(error); } };
    const selectedCustomer = customers.data?.data.find(customer => customer.id === customerId);
    return <Box component="form" ref={form => { const element = form as HTMLFormElement | null; formRef.current = element; bindDraft(element); }} onSubmit={event => { event.preventDefault(); if (valid) void save(); }}><PageSections >
        <ErrorNotice error={create.error || update.error}/><DraftConflict editor={editor} labels={{ customerId: 'Khách hàng', conversationId: 'Hội thoại', warehouse: 'Kho xuất', notes: 'Ghi chú', lines: 'Dòng đơn hàng' }} busy={create.pending || update.pending}/>
        {!canReadCustomers && <Alert severity="warning">Bạn cần quyền customers.read để tìm và tạo đơn với khách hàng. Đơn nháp hiện có vẫn giữ nguyên mã khách.</Alert>}
        {!canReadProducts && <Alert severity="warning">Bạn cần quyền catalog.read để tìm và chọn sản phẩm cho đơn hàng.</Alert>}
        {customers.isError && <ErrorNotice error={customers.error}/>}
        {products.isError && <ErrorNotice error={products.error}/>}
        <Panel title="Người mua và giao hàng" bodyMode="inset"><FormFields >
            <TextField label="Tìm khách hàng" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} disabled={!canReadCustomers} helperText="Tìm qua listCustomers với q; chỉ chọn mã do API trả về."/>
            <TextField select label="Khách hàng" value={customerId} onChange={e => { setCustomer(e.target.value); setConversation(''); }} disabled={!canReadCustomers && !resource} required={canReadCustomers} helperText={canReadCustomers ? (customers.isPending ? 'Đang tải khách hàng…' : customers.data?.data.length === 0 ? 'Không tìm thấy khách phù hợp.' : !customerId ? 'Chọn khách hàng để lưu đơn nháp.' : undefined) : undefined}>
                {customerId && !selectedCustomer && <MenuItem value={customerId}>Đang giữ mã khách: {customerId}</MenuItem>}
                {customers.data?.data.map(customer => <MenuItem key={customer.id} value={customer.id}>{customer.displayName}</MenuItem>)}
            </TextField>
            <LookupLoadMore label="khách hàng" loadedCount={customers.loadedCount} hasMore={customers.hasMore} busy={customers.isLoadingMore} onLoadMore={customers.loadMore}/>
            <TextField select label="Hội thoại liên quan" value={conversationId} onChange={e => setConversation(e.target.value)} disabled={!canReadConversations || !customerId} helperText={!canReadConversations ? 'Không có quyền đọc hội thoại; liên kết hội thoại là tùy chọn.' : undefined}>
                <MenuItem value="">Không liên kết</MenuItem>{conv.data?.data.filter(conversation => conversation.customerId === customerId).map(conversation => <MenuItem key={conversation.id} value={conversation.id}>{conversation.displayName} · {conversation.id}</MenuItem>)}
            </TextField>
            <LookupLoadMore label="hội thoại" loadedCount={conv.loadedCount} hasMore={conv.hasMore} busy={conv.isLoadingMore} onLoadMore={conv.loadMore}/>
            <FormFields direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'start' }}>
                <TextField label="Mã kho xuất" value={warehouse} onChange={e => setWarehouse(e.target.value)} fullWidth sx={{ flex: 1, minWidth: 0 }}/>
                {resource || create.pending ? <FieldGroup role="group" aria-label={__MOCK__ ? 'Địa chỉ giao hàng (mẫu demo)' : 'Mã địa chỉ đã xác minh'} geometry={{ flex: 1, minWidth: 0, width: '100%' }}>
                    <Typography variant="caption" color="text.secondary">{__MOCK__ ? 'Địa chỉ giao hàng (mẫu demo)' : 'Mã địa chỉ đã xác minh'}</Typography>
                    <Typography sx={{ overflowWrap: 'anywhere' }}>{(__MOCK__ ? getDemoAddressOptions(shop.id).find(address => address.id === addressId)?.label : undefined) || addressId || 'Chưa chọn địa chỉ'}</Typography>
                    <Typography variant="caption" color="text.secondary">Địa chỉ được giữ nguyên khi chỉnh sửa đơn nháp.</Typography>
                </FieldGroup> : __MOCK__ ? <TextField select label="Địa chỉ giao hàng (mẫu demo)" value={addressId} onChange={e => setAddress(e.target.value)} fullWidth sx={{ flex: 1, minWidth: 0 }} helperText="Lựa chọn tổng hợp để kiểm thử luồng đơn hàng.">
                    <MenuItem value="">Chưa chọn địa chỉ</MenuItem>
                    {getDemoAddressOptions(shop.id).map(address => <MenuItem key={address.id} value={address.id}>{address.label}</MenuItem>)}
                </TextField> : <TextField label="Mã địa chỉ đã xác minh" value={addressId} onChange={e => setAddress(e.target.value)} fullWidth sx={{ flex: 1, minWidth: 0 }} helperText="Nhập ID do hệ thống địa chỉ cung cấp."/>}
            </FormFields>
            {__MOCK__ ? <Alert severity="info">Địa chỉ mẫu chỉ phục vụ nghiệm thu giao diện. Dữ liệu demo không đại diện địa chỉ thật và không xác minh địa chỉ với khách hàng.</Alert> : <Alert severity="info">Contract frontend chưa có API CRUD địa chỉ giao hàng; chỉ sử dụng ID do hệ thống địa chỉ cung cấp.</Alert>}
            {resource || create.pending ? <FieldGroup role="group" aria-label="Thanh toán">
                <Typography variant="caption" color="text.secondary">Thanh toán</Typography>
                <Typography sx={{ overflowWrap: 'anywhere' }}>{method === 'cod' ? 'Thu khi giao (COD)' : 'Trả trước, cần xác minh tiền'}</Typography>
            </FieldGroup> : <TextField label="Thanh toán" select value={method} onChange={e => setMethod(e.target.value as typeof method)}><MenuItem value="cod">Thu khi giao (COD)</MenuItem><MenuItem value="prepay">Trả trước, cần xác minh tiền</MenuItem></TextField>}
        </FormFields></Panel>
        <Panel title="Sản phẩm đặt mua" bodyMode="inset" subtitle="Bộ chọn tìm kiếm từ API; giá và tồn kho chỉ được chốt khi lấy báo giá." action={<Button startIcon={<AddRounded />} disabled={lines.length >= 100} onClick={() => setLines(current => [...current, { key: crypto.randomUUID(), variantId: '', variantLabel: '', quantity: '1' }])}>Thêm dòng</Button>}>
            <FormFields >
                <TextField label="Tìm sản phẩm hoặc SKU" value={productSearch} onChange={e => setProductSearch(e.target.value)} disabled={!canReadProducts} helperText="Tìm từ listProducts với q; biến thể không hoạt động không được chọn."/>
                {lines.map((line, index) => {
                    const selectedVariant = variants.find(variant => variant.id === line.variantId);
                    const quantityInvalid = lineQuantityError(line.quantity);
                    return <FormFields key={line.key} direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'start' }}>
                        <TextField label={`Sản phẩm ${index + 1}`} select fullWidth value={line.variantId} disabled={!canReadProducts && !resource} onChange={event => chooseVariant(line.key, event.target.value)} error={duplicateVariants && !!line.variantId} helperText={duplicateVariants && line.variantId ? 'Không thêm cùng một biến thể hai lần; hãy gộp số lượng vào một dòng.' : undefined}>
                            {line.variantId && !selectedVariant && <MenuItem value={line.variantId}>{line.variantLabel || `Đang giữ biến thể: ${line.variantId}`}</MenuItem>}
                            {variants.map(variant => <MenuItem key={variant.id} value={variant.id} disabled={lines.some(other => other.key !== line.key && other.variantId === variant.id)}>{variant.productName} · {variant.name} · {variant.sku}</MenuItem>)}
                            {canReadProducts && !products.isPending && variants.length === 0 && !line.variantId && <MenuItem disabled value="">Không tìm thấy sản phẩm/biến thể phù hợp</MenuItem>}
                        </TextField>
                        <TextField label="Số lượng" value={line.quantity} onChange={event => setLines(current => current.map(item => item.key === line.key ? { ...item, quantity: event.target.value } : item))} error={quantityInvalid} helperText={quantityInvalid ? 'Nhập số nguyên từ 1 đến 1.000.000.' : 'Số lượng nguyên theo hợp đồng.'} inputProps={{ inputMode: 'numeric', 'aria-invalid': quantityInvalid }} sx={{ minWidth: 100, maxWidth: { sm: 180 } }}/>
                        <IconButton aria-label={`Bỏ dòng ${index + 1}`} disabled={lines.length === 1} sx={{ alignSelf: 'start' }} onClick={() => setLines(current => current.filter(item => item.key !== line.key))}><DeleteOutlineRounded /></IconButton>
                    </FormFields>;
                })}
                <LookupLoadMore label="sản phẩm" loadedCount={products.loadedCount} hasMore={products.hasMore} busy={products.isLoadingMore} onLoadMore={products.loadMore}/>
                {lines.length >= 100 && <Alert severity="warning">Đơn nháp đạt giới hạn 100 dòng theo hợp đồng.</Alert>}
                <Alert severity="info">Tổng tiền và khả năng giữ hàng được tính lại bởi API khi lấy báo giá và xác nhận; không tin tổng do trình duyệt tự tính.</Alert>
                <TextField label="Ghi chú chuẩn bị" value={notes} onChange={e => setNotes(limitCodePoints(e.target.value, 2000))} error={codePointLength(notes) > 2_000} helperText={`${codePointLength(notes)}/2.000 ký tự`} multiline minRows={2} />
            </FormFields>
        </Panel>
        <MutationButton permission="orders.write" variant="contained" busy={create.pending || update.pending} disabled={!valid || !canWriteOrders} type="submit">Lưu đơn nháp</MutationButton>
    </PageSections></Box>;
}
export function NewOrderPage() { const { shop } = useScope(); const navigate = useNavigate(); return <><PageHeader title="Tạo đơn hàng" subtitle="Lưu nháp trước, sau đó báo giá và xác nhận khách." actions={<RouteLink to={`/s/${shop.id}/orders`}>Danh sách đơn</RouteLink>}/><DraftForm onSaved={o => navigate(`/s/${shop.id}/orders/${o.id}`)}/></>; }
export function OrderDetailPage({ simulateCustomerConfirmation }: {
    simulateCustomerConfirmation?: (shopId: string, quoteId: string) => Promise<CustomerConfirmationRequest>;
}) {
    const { orderId = '' } = useParams();
    const { shop } = useScope();
    const get = useApi('getOrder', { path: { orderId } });
    const order = get.data?.data;
    const quoteOp = useCommand('quoteOrder', ['getOrder']);
    const record = useCommand('recordCustomerConfirmation', []);
    const confirm = useCommand('confirmOrder', ['getOrder', 'listOrders', 'listStockSnapshots', 'getDashboard', 'listWorkItems', 'listNotifications', 'listPrepJobs']);
    const cancel = useCommand('cancelOrder', ['getOrder', 'listOrders', 'listStockSnapshots', 'listWorkItems', 'listPrepJobs']);
    const pay = useCommand('payOrder', ['getOrder', 'listOrders', 'getCashflow', 'listFinanceEntries']);
    const refund = useCommand('refundOrder', ['getOrder', 'listOrders', 'getCashflow']);
    const [quote, setQuote] = useState<OrderQuote | null>(null), [confirmation, setConfirmation] = useState<CustomerConfirmation | null>(null), [editing, setEditing] = useState(false), [action, setAction] = useState<'cancel' | 'pay' | 'refund' | 'evidence' | null>(null), [error, setError] = useState<Error | null>(null);
    const [editBusy, setEditBusy] = useState(false);
    const [hash, setHash] = useState(''), [identity, setIdentity] = useState(''), [messageId, setMessage] = useState(''), [amount, setAmount] = useState(''), [reference, setReference] = useState(''), [evidenceRef, setEvidence] = useState(''), [reason, setReason] = useState('');
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [serverOffsetMs, setServerOffsetMs] = useState(0);
    const synchronizeApiTime = (asOf: string) => {
        const apiTime = Date.parse(asOf);
        if (Number.isFinite(apiTime))
            setServerOffsetMs(apiTime - nowMs);
    };
    useEffect(() => {
        if (!quote)
            return;
        const timer = window.setInterval(() => setNowMs(Date.now()), 1_000);
        return () => window.clearInterval(timer);
    }, [quote]);
    const effectiveNowMs = nowMs + serverOffsetMs;
    const quoteExpired = !!quote && Date.parse(quote.expiresAt) <= effectiveNowMs;
    const confirmationExpired = !!confirmation && (confirmation.status !== 'valid' || Date.parse(confirmation.expiresAt) <= effectiveNowMs);
    useEffect(() => { if (order && quote && order.version !== quote.orderVersion) {
        setQuote(null);
        setConfirmation(null);
    } }, [order, quote]);
    const collect = async () => { if (!quote)
        return; try {
        const r = await record.execute({ path: { orderId }, body: { quoteId: quote.id, quoteHash: hash, quoteVersion: quote.orderVersion, customerIdentityId: identity, sourceMessageId: messageId } });
        synchronizeApiTime(r.meta.asOf);
        setConfirmation(r.data);
        setAction(null);
    }
    catch { /* keep form */ } };
    const mockConfirm = async () => { if (!quote || !simulateCustomerConfirmation)
        return; try {
        const evidence = await simulateCustomerConfirmation(shop.id, quote.id);
        setHash(evidence.quoteHash);
        setIdentity(evidence.customerIdentityId);
        setMessage(evidence.sourceMessageId);
        const r = await record.execute({ path: { orderId }, body: evidence });
        synchronizeApiTime(r.meta.asOf);
        setConfirmation(r.data);
    }
    catch (e) {
        setError(e instanceof Error ? e : new Error('Không tạo được bằng chứng mẫu'));
    } };
    return <><PageHeader title={`Đơn ${orderId}`} subtitle="Mọi thay đổi quan trọng kiểm lại phiên bản và điều kiện nghiệp vụ." actions={<RouteLink to={`/s/${shop.id}/orders`}>Danh sách đơn</RouteLink>}/><QueryState query={get} pendingProfile="section">{order && <>
 <ErrorNotice error={error || quoteOp.error || record.error || confirm.error}/>{editing ? <EditDialog allowEditsWhileBusy open title="Sửa đơn nháp" busy={editBusy} onClose={() => setEditing(false)} actions={({ requestClose, busy }) => <Button disabled={busy} onClick={requestClose}>Đóng chỉnh sửa</Button>}><DraftForm initial={order} onBusyChange={setEditBusy} onSaved={() => { setEditBusy(false); setEditing(false); setQuote(null); setConfirmation(null); }}/></EditDialog> : <>
 <ActionGroup direction="row" afterGap="section"><Status value={order.orderState}/><Status value={order.fulfillmentState}/><Status value={order.paymentState}/><Typography variant="caption" sx={{ alignSelf: 'center' }}>Phiên bản {order.version}</Typography></ActionGroup>
 <SectionGrid columns={{ xs: '1fr', lg: '2fr 1fr' }}><Panel title="Sản phẩm trong đơn"><DataTable rows={order.lines} rowKey={l => l.id} columns={[
                {
                    key: 'name', label: 'Sản phẩm / SKU', render: l => <Stack><Typography fontWeight={visualSx.typography.fontWeight.strong}>{l.name}</Typography><Typography variant="caption">{l.sku}</Typography></Stack>
                },
                { key: 'qty', label: 'Số lượng', align: 'right', render: l => l.quantity }, { key: 'price', label: 'Đơn giá', align: 'right', render: l => <Amount value={l.unitPrice}/> }, { key: 'total', label: 'Thành tiền', align: 'right', render: l => <Amount value={l.lineTotal}/> }
            ]}/><Box sx={[layoutSx.surface.inset, { textAlign: 'right' }]}><Typography color="text.secondary">Tổng từ API</Typography><Typography variant="h4"><Amount wrap value={order.total}/></Typography></Box></Panel><Panel title="Thông tin xử lý" bodyMode="inset"><Box><DetailLine label="Khách"><RouteLink to={`/s/${shop.id}/customers/${order.customerId}`}>{order.customerId}</RouteLink></DetailLine><DetailLine label="Kho">{order.warehouseId}</DetailLine><DetailLine label="Địa chỉ">{order.shippingAddressId || 'Chưa có địa chỉ được xác minh'}</DetailLine><DetailLine label="Thanh toán">{order.paymentMethod === 'cod' ? 'COD' : 'Trả trước'}</DetailLine>{order.conversationId && <RouteLink to={`/s/${shop.id}/inbox/${order.conversationId}`}>Mở hội thoại</RouteLink>}{order.prepTaskId && <RouteLink to={`/s/${shop.id}/fulfillment`}>Chuẩn bị đơn</RouteLink>}</Box></Panel></SectionGrid>
 <ActionGroup direction="row" beforeGap="form"><MutationButton permission="orders.write" allowedActions={order.allowedActions} action="edit" onClick={() => setEditing(true)}>Sửa đơn nháp</MutationButton><MutationButton permission="orders.write" allowedActions={order.allowedActions} action="quote" variant="contained" busy={quoteOp.pending} onClick={async () => { try {
                const r = await quoteOp.execute({ path: { orderId }, version: order.version });
                synchronizeApiTime(r.meta.asOf);
                setQuote(r.data);
                setConfirmation(null);
                setHash(typeof r.data.quoteHash === 'string' ? r.data.quoteHash : '');
            }
            catch { /* errors visible */ } }}>Lấy báo giá hiện tại</MutationButton><MutationButton permission="orders.write" allowedActions={order.allowedActions} action="cancel" color="error" onClick={() => setAction('cancel')}>Hủy đơn</MutationButton><MutationButton permission="finance.post" allowedActions={order.allowedActions} action="record_payment" onClick={() => { setAmount(order.total?.amount || ''); setReason(''); setReference(''); setEvidence(''); setAction('pay'); }}>Ghi nhận tiền đã thu</MutationButton><MutationButton permission="finance.refund" allowedActions={order.allowedActions} action="request_refund" onClick={() => { setAmount(''); setReason(''); setReference(''); setEvidence(''); setAction('refund'); }}>Ghi nhận khoản đã hoàn</MutationButton>{order.allowedActions.includes('request_return') && <RouteLink to={`/s/${shop.id}/returns?orderId=${order.id}`}>Tạo yêu cầu trả hàng</RouteLink>}</ActionGroup>
 {quote && <Panel title="Báo giá và xác nhận khách" subtitle={`Bản đơn ${quote.orderVersion} · Hết hạn ${dateTime(quote.expiresAt, shop.timezone)}`} bodyMode="inset" beforeGap="section"><Stack sx={layoutSx.query.stateGap}><Typography variant="h5"><Amount wrap value={quote.total}/></Typography>{quote.warnings.map((w, i) => <Alert key={i} severity="info">{w}</Alert>)}<Typography variant="body2">Mã báo giá: {quote.id}</Typography><Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>Hash do server cung cấp: {hash || 'Chưa có. Backend phải cung cấp hash và bằng chứng khách trước khi chốt.'}</Typography>{quoteExpired && <Alert severity="warning">Báo giá đã hết hạn. Lấy báo giá mới và xác nhận lại với khách trước khi chốt.</Alert>}{confirmation ? <Alert severity={confirmationExpired ? 'warning' : 'success'}>{confirmationExpired ? 'Bằng chứng khách đã hết hạn hoặc bị thay thế. Cần ghi nhận xác nhận cho báo giá hiện tại.' : `Đã ghi nhận bằng chứng ${confirmation.id}. Xác nhận lại giá/tồn khi chốt đơn.`}</Alert> : <ActionGroup direction="row" ><Button onClick={() => setAction('evidence')}>Nhập bằng chứng xác nhận khách</Button>{simulateCustomerConfirmation && <Button variant="outlined" disabled={record.pending} onClick={() => void mockConfirm()}>Mô phỏng khách đồng ý báo giá</Button>}</ActionGroup>}<MutationButton permission="orders.confirm" allowedActions={order.allowedActions} action="confirm" variant="contained" disabled={!confirmation || quoteExpired || confirmationExpired} busy={confirm.pending} onClick={async () => { if (!confirmation || quoteExpired || confirmationExpired)
                return; try {
                await confirm.execute({
                    path: { orderId }, version: order.version, body: { expectedVersion: order.version, quoteId: quote.id, customerConfirmationId: confirmation.id }
                });
                setQuote(null);
                setConfirmation(null);
            }
            catch { /* visible */ } }}>Xác nhận đơn & giữ hàng</MutationButton></Stack></Panel>}
 </>}</>}</QueryState>
 <ConfirmDialog open={action === 'cancel'} title="Hủy đơn hàng" description="API sẽ kiểm giai đoạn xử lý và giải phóng lượng hàng giữ khi được phép." requireReason onClose={() => setAction(null)} busy={cancel.pending} error={cancel.error} onConfirm={reason => cancel.execute({ path: { orderId }, version: order?.version, body: { expectedVersion: order?.version || 1, reason } })}/>
 <EditDialog open={action === 'evidence'} title="Bằng chứng xác nhận từ khách" onClose={() => setAction(null)} busy={record.pending} actions={<Button variant="contained" disabled={!/^[a-f0-9]{64}$/.test(hash) || !identity || !messageId || record.pending} onClick={() => void collect()}>Ghi nhận bằng chứng</Button>}><ErrorNotice error={record.error}/><FormFields ><Alert severity="warning">Không dùng lời AI “khách đã đồng ý” để xác nhận. Cần định danh và tin nhắn khách thực sự xác nhận đúng báo giá.</Alert><TextField label="Hash báo giá từ backend" value={hash} onChange={e => setHash(e.target.value)}/><TextField label="Định danh khách" value={identity} onChange={e => setIdentity(e.target.value)}/><TextField label="Mã tin nhắn xác nhận" value={messageId} onChange={e => setMessage(e.target.value)}/></FormFields></EditDialog>
 <EditDialog open={action === 'pay' || action === 'refund'} title={action === 'pay' ? 'Ghi nhận tiền đã thu' : 'Ghi nhận tiền đã hoàn'} onClose={() => setAction(null)} busy={pay.pending || refund.pending} actions={<Button variant="contained" disabled={!/^\d+(\.\d{1,4})?$/.test(amount) || !evidenceRef || !reference || codePointLength(reason.trim()) < 5 || pay.pending || refund.pending} onClick={async () => { if (!order)
        return; try {
        if (action === 'pay')
            await pay.execute({
                path: { orderId }, version: order.version, body: {
                    expectedVersion: order.version, amount: { amount, currency: shop.currency }, method: 'bank_transfer', reference, reason, evidenceRef
                }
            });
        else
            await refund.execute({
                path: { orderId }, version: order.version, body: { expectedVersion: order.version, amount: { amount, currency: shop.currency }, reason, paymentReference: reference, evidenceRef }
            });
        setAction(null);
    }
    catch { /* visible */ } }}>Ghi nhận chứng từ</Button>}><ErrorNotice error={pay.error || refund.error}/><FormFields ><Alert severity="warning">Chỉ ghi khoản đã được xác minh. Nút này không chuyển tiền. Ảnh chuyển khoản chưa xác thực không là bằng chứng thanh toán.</Alert><TextField label={`Số tiền (${shop.currency})`} value={amount} onChange={e => setAmount(e.target.value)}/><TextField label="Mã tham chiếu giao dịch" value={reference} onChange={e => setReference(e.target.value)}/><TextField label="Mã chứng từ đã xác minh" value={evidenceRef} onChange={e => setEvidence(e.target.value)}/><TextField label="Lý do" value={reason} onChange={e => setReason(e.target.value)} multiline minRows={2}/></FormFields></EditDialog></>;
}
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
        <Panel><Toolbar operation="listReturnCases" /><QueryState query={list} pendingProfile="section">{list.data && <><DataTable rows={list.data.data} rowKey={r => r.id} columns={[
            { key: 'id', label: 'Yêu cầu', render: r => r.id },
            { key: 'order', label: 'Đơn gốc', render: r => <RouteLink to={`/s/${shop.id}/orders/${r.orderId}`}>{r.orderId}</RouteLink> },
            { key: 'state', label: 'Trạng thái', render: r => <Status value={r.state}/> },
            { key: 'refund', label: 'Nghĩa vụ hoàn', render: r => <Amount value={r.refundObligation}/> },
            { key: 'action', label: '', render: r => <MutationButton permission="inventory.adjust" disabled={!canInspectReturn || ['inspected', 'closed', 'rejected'].includes(r.state)} onClick={() => editInspection(r)}>Kiểm nhận</MutationButton> }
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

function orderSnapshot(order: Order) {
    return { version: order.version, values: { customerId: order.customerId, conversationId: order.conversationId || '', warehouse: order.warehouseId, notes: typeof order.notes === 'string' ? order.notes : '', lines: order.lines.map(line => ({ variantId: line.variantId, quantity: String(line.quantity) })) } };
}

function returnInspectionSnapshot(item: ReturnCase) {
    const lines: ReturnInspection['lines'] = item.lines.map(line => ({
        orderLineId: line.orderLineId, acceptedQuantity: line.quantity,
        disposition: line.disposition === 'pending' ? 'quarantined' : line.disposition,
        reason: line.disposition === 'pending' ? 'Chờ kiểm tra tình trạng hàng nhận lại' : line.reason,
    }));
    return { version: item.version, values: { lines } };
}
