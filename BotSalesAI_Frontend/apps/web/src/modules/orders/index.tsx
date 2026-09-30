import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Divider, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import type { Order, OrderQuote, CustomerConfirmationRequest, CustomerConfirmation, ReturnCase, ReturnInspection } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { dateTime } from '@/shared/model/format';
import { PageHeader, Panel, DataTable, QueryState, Toolbar, Pager, Status, Amount, MutationButton, EditDialog, ErrorNotice, ConfirmDialog, RouteLink, DetailLine } from '@/shared/ui/components';
export function OrdersPage() { const { shop } = useScope(); const navigate = useNavigate(); const list = useApi('listOrders', { query: useListQuery() }); return <><PageHeader title="Đơn hàng" subtitle="Tách riêng trạng thái đơn, giao hàng và thanh toán." actions={<MutationButton permission="orders.write" variant="contained" onClick={() => navigate(`/s/${shop.id}/orders/new`)}>Tạo đơn hàng</MutationButton>}/><Panel><Toolbar placeholder="Tìm mã đơn hoặc khách hàng…"/><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={o => o.id} columns={[
    {
        key: 'id', label: 'Đơn hàng', render: o => <Stack><Typography fontWeight={650}>{o.id}</Typography><Typography variant="caption" color="text.secondary">{dateTime(o.createdAt, shop.timezone)}</Typography></Stack>
    },
    { key: 'customer', label: 'Khách', render: o => o.customerId }, { key: 'total', label: 'Tổng tiền', align: 'right', render: o => <Amount value={o.total}/> }, { key: 'order', label: 'Đơn', render: o => <Status value={o.orderState}/> }, { key: 'shipping', label: 'Giao hàng', render: o => <Status value={o.fulfillmentState}/> }, { key: 'payment', label: 'Tiền', render: o => <Status value={o.paymentState}/> }, { key: 'action', label: '', render: o => <RouteLink to={`/s/${shop.id}/orders/${o.id}`}>Xem đơn</RouteLink> }
]}/><Pager page={list.data.page}/></>}</QueryState></Panel></>; }
function DraftForm({ initial, onSaved }: {
    initial?: Order;
    onSaved: (order: Order) => void;
}) {
    const { shop } = useScope();
    const [params] = useSearchParams();
    const customers = useApi('listCustomers', { query: { limit: 100 } });
    const products = useApi('listProducts', { query: { limit: 100 } });
    const conv = useApi('listConversations', { query: { limit: 100 } }, useCan('conversations.read'));
    const create = useCommand('createOrder', ['listOrders']);
    const update = useCommand('updateOrderDraft', ['getOrder', 'listOrders']);
    const [customerId, setCustomer] = useState(initial?.customerId || params.get('customerId') || ''), [conversationId, setConversation] = useState(initial?.conversationId || params.get('conversationId') || ''), [warehouse, setWarehouse] = useState(initial?.warehouseId || shop.defaultWarehouseId), [addressId, setAddress] = useState(initial?.shippingAddressId || ''), [method, setMethod] = useState<'cod' | 'prepay'>(initial?.paymentMethod || 'cod'), [notes, setNotes] = useState('');
    const [lines, setLines] = useState(initial?.lines.map(l => ({ key: l.id, variantId: l.variantId, quantity: String(l.quantity) })) || [{ key: crypto.randomUUID(), variantId: '', quantity: '1' }]);
    const variants = products.data?.data.filter(p => p.status === 'active').flatMap(p => p.variants.filter(v => v.active).map(v => ({ ...v, productName: p.name }))) || [];
    const valid = !!customerId && !!warehouse && lines.length > 0 && lines.every(l => l.variantId && /^\d+$/.test(l.quantity) && Number(l.quantity) > 0) && new Set(lines.map(l => l.variantId)).size === lines.length;
    const save = async () => { try {
        const base = {
            customerId, conversationId: conversationId || null, warehouseId: warehouse, lines: lines.map(l => ({ variantId: l.variantId, quantity: Number(l.quantity) })), notes
        };
        const response = initial ? await update.execute({ path: { orderId: initial.id }, version: initial.version, body: base }) : await create.execute({ body: { ...base, paymentMethod: method, shippingAddressId: addressId || null } });
        onSaved(response.data);
    }
    catch { /* preserve selections and errors */ } };
    return <Stack gap={3}><ErrorNotice error={create.error || update.error}/><Panel title="Người mua và giao hàng"><Stack gap={2} sx={{ p: 3 }}><TextField select label="Khách hàng" value={customerId} onChange={e => { setCustomer(e.target.value); setConversation(''); }}>{customers.data?.data.map(c => <MenuItem key={c.id} value={c.id}>{c.displayName}</MenuItem>)}</TextField><TextField select label="Hội thoại liên quan" value={conversationId} onChange={e => setConversation(e.target.value)}><MenuItem value="">Không liên kết</MenuItem>{conv.data?.data.filter(c => c.customerId === customerId).map(c => <MenuItem key={c.id} value={c.id}>{c.displayName} · {c.id}</MenuItem>)}</TextField><Stack direction={{ xs: 'column', md: 'row' }} gap={2}><TextField label="Mã kho xuất" value={warehouse} onChange={e => setWarehouse(e.target.value)} fullWidth/><TextField label="Mã địa chỉ đã xác minh" value={addressId} onChange={e => setAddress(e.target.value)} disabled={!!initial} fullWidth helperText="Hợp đồng hiện nhận shippingAddressId từ hệ thống địa chỉ. Không tự coi ghi chú là địa chỉ được xác minh."/></Stack><TextField label="Thanh toán" select value={method} onChange={e => setMethod(e.target.value as typeof method)} disabled={!!initial}><MenuItem value="cod">Thu khi giao (COD)</MenuItem><MenuItem value="prepay">Trả trước, cần xác minh tiền</MenuItem></TextField></Stack></Panel><Panel title="Sản phẩm đặt mua" action={<Button startIcon={<AddRounded />} onClick={() => setLines([...lines, { key: crypto.randomUUID(), variantId: '', quantity: '1' }])}>Thêm dòng</Button>}><Stack gap={2} sx={{ p: 3 }}>{lines.map((line, index) => <Stack key={line.key} direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField label={`Sản phẩm ${index + 1}`} select fullWidth value={line.variantId} onChange={e => setLines(lines.map(l => l.key === line.key ? { ...l, variantId: e.target.value } : l))}>{variants.map(v => <MenuItem key={v.id} value={v.id}>{v.productName} · {v.name} · {v.sku}</MenuItem>)}</TextField><TextField label="Số lượng" value={line.quantity} onChange={e => setLines(lines.map(l => l.key === line.key ? { ...l, quantity: e.target.value } : l))} inputProps={{ inputMode: 'numeric' }} sx={{ minWidth: 100, maxWidth: { sm: 140 } }}/><IconButton aria-label={`Bỏ dòng ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines(lines.filter(l => l.key !== line.key))}><DeleteOutlineRounded /></IconButton></Stack>)}<Alert severity="info">Tổng tiền và khả năng giữ hàng được tính lại bởi API khi lấy báo giá và xác nhận; không tin tổng do trình duyệt tự tính.</Alert><TextField label="Ghi chú chuẩn bị" value={notes} onChange={e => setNotes(e.target.value)} multiline minRows={2}/></Stack></Panel><MutationButton permission="orders.write" variant="contained" busy={create.pending || update.pending} disabled={!valid} onClick={() => void save()}>Lưu đơn nháp</MutationButton></Stack>;
}
export function NewOrderPage() { const { shop } = useScope(); const navigate = useNavigate(); return <><PageHeader title="Tạo đơn hàng" subtitle="Lưu nháp trước, sau đó báo giá và xác nhận khách." actions={<RouteLink to={`/s/${shop.id}/orders`}>Danh sách đơn</RouteLink>}/><DraftForm onSaved={o => navigate(`/s/${shop.id}/orders/${o.id}`)}/></>; }
export function OrderDetailPage({ simulateCustomerConfirmation }: {
    simulateCustomerConfirmation?: (shopId: string, quoteId: string) => Promise<CustomerConfirmationRequest>;
}) {
    const { orderId = '' } = useParams();
    const { shop } = useScope();
    const get = useApi('getOrder', { path: { orderId } });
    const order = get.data?.data;
    const quoteOp = useCommand('quoteOrder', []);
    const record = useCommand('recordCustomerConfirmation', []);
    const confirm = useCommand('confirmOrder', ['getOrder', 'listOrders', 'listStockSnapshots', 'getDashboard', 'listWorkItems', 'listNotifications', 'listPrepJobs']);
    const cancel = useCommand('cancelOrder', ['getOrder', 'listOrders', 'listStockSnapshots', 'listWorkItems', 'listPrepJobs']);
    const pay = useCommand('payOrder', ['getOrder', 'listOrders', 'getCashflow', 'listFinanceEntries']);
    const refund = useCommand('refundOrder', ['getOrder', 'listOrders', 'getCashflow']);
    const [quote, setQuote] = useState<OrderQuote | null>(null), [confirmation, setConfirmation] = useState<CustomerConfirmation | null>(null), [editing, setEditing] = useState(false), [action, setAction] = useState<'cancel' | 'pay' | 'refund' | 'evidence' | null>(null), [error, setError] = useState<Error | null>(null);
    const [hash, setHash] = useState(''), [identity, setIdentity] = useState(''), [messageId, setMessage] = useState(''), [amount, setAmount] = useState(''), [reference, setReference] = useState(''), [evidenceRef, setEvidence] = useState(''), [reason, setReason] = useState('');
    useEffect(() => { if (order && quote && order.version !== quote.orderVersion) {
        setQuote(null);
        setConfirmation(null);
    } }, [order, quote]);
    const collect = async () => { if (!quote)
        return; try {
        const r = await record.execute({ path: { orderId }, body: { quoteId: quote.id, quoteHash: hash, quoteVersion: quote.orderVersion, customerIdentityId: identity, sourceMessageId: messageId } });
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
        setConfirmation(r.data);
    }
    catch (e) {
        setError(e instanceof Error ? e : new Error('Không tạo được bằng chứng mẫu'));
    } };
    return <><PageHeader title={`Đơn ${orderId}`} subtitle="Mọi thay đổi quan trọng kiểm lại phiên bản và điều kiện nghiệp vụ." actions={<RouteLink to={`/s/${shop.id}/orders`}>Danh sách đơn</RouteLink>}/><QueryState query={get}>{order && <>
 <ErrorNotice error={error || quoteOp.error || record.error || confirm.error}/>{editing ? <><DraftForm initial={order} onSaved={() => { setEditing(false); setQuote(null); setConfirmation(null); }}/><Button onClick={() => setEditing(false)}>Đóng chỉnh sửa</Button></> : <>
 <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 3 }}><Status value={order.orderState}/><Status value={order.fulfillmentState}/><Status value={order.paymentState}/><Typography variant="caption" sx={{ alignSelf: 'center' }}>Phiên bản {order.version}</Typography></Stack>
 <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}><Panel title="Sản phẩm trong đơn"><DataTable rows={order.lines} rowKey={l => l.id} columns={[
                {
                    key: 'name', label: 'Sản phẩm / SKU', render: l => <Stack><Typography fontWeight={650}>{l.name}</Typography><Typography variant="caption">{l.sku}</Typography></Stack>
                },
                { key: 'qty', label: 'Số lượng', align: 'right', render: l => l.quantity }, { key: 'price', label: 'Đơn giá', align: 'right', render: l => <Amount value={l.unitPrice}/> }, { key: 'total', label: 'Thành tiền', align: 'right', render: l => <Amount value={l.lineTotal}/> }
            ]}/><Box sx={{ p: 3, textAlign: 'right' }}><Typography color="text.secondary">Tổng từ API</Typography><Typography variant="h4"><Amount value={order.total}/></Typography></Box></Panel><Panel title="Thông tin xử lý"><Box sx={{ px: 3, pb: 2 }}><DetailLine label="Khách"><RouteLink to={`/s/${shop.id}/customers/${order.customerId}`}>{order.customerId}</RouteLink></DetailLine><DetailLine label="Kho">{order.warehouseId}</DetailLine><DetailLine label="Địa chỉ">{order.shippingAddressId || 'Chưa có địa chỉ được xác minh'}</DetailLine><DetailLine label="Thanh toán">{order.paymentMethod === 'cod' ? 'COD' : 'Trả trước'}</DetailLine>{order.conversationId && <RouteLink to={`/s/${shop.id}/inbox/${order.conversationId}`}>Mở hội thoại</RouteLink>}{order.prepTaskId && <RouteLink to={`/s/${shop.id}/fulfillment?orderId=${order.id}`}>Chuẩn bị đơn</RouteLink>}</Box></Panel></Box>
 <Stack direction="row" gap={1.5} flexWrap="wrap" sx={{ mt: 3 }}><MutationButton permission="orders.write" allowedActions={order.allowedActions} action="edit" onClick={() => setEditing(true)}>Sửa đơn nháp</MutationButton><MutationButton permission="orders.write" allowedActions={order.allowedActions} action="quote" variant="contained" busy={quoteOp.pending} onClick={async () => { try {
                const r = await quoteOp.execute({ path: { orderId }, version: order.version });
                setQuote(r.data);
                setConfirmation(null);
                setHash(typeof r.data.quoteHash === 'string' ? r.data.quoteHash : '');
            }
            catch { /* errors visible */ } }}>Lấy báo giá hiện tại</MutationButton><MutationButton permission="orders.write" allowedActions={order.allowedActions} action="cancel" color="error" onClick={() => setAction('cancel')}>Hủy đơn</MutationButton><MutationButton permission="finance.post" allowedActions={order.allowedActions} action="record_payment" onClick={() => { setAmount(order.total?.amount || ''); setReason(''); setReference(''); setEvidence(''); setAction('pay'); }}>Ghi nhận tiền đã thu</MutationButton><MutationButton permission="finance.refund" allowedActions={order.allowedActions} action="request_refund" onClick={() => { setAmount(''); setReason(''); setReference(''); setEvidence(''); setAction('refund'); }}>Ghi nhận khoản đã hoàn</MutationButton>{order.allowedActions.includes('request_return') && <RouteLink to={`/s/${shop.id}/returns?orderId=${order.id}`}>Tạo yêu cầu trả hàng</RouteLink>}</Stack>
 {quote && <Panel title="Báo giá và xác nhận khách" subtitle={`Bản đơn ${quote.orderVersion} · Hết hạn ${dateTime(quote.expiresAt, shop.timezone)}`} sx={{ mt: 3 }}><Stack gap={2} sx={{ p: 3 }}><Typography variant="h5"><Amount value={quote.total}/></Typography>{quote.warnings.map((w, i) => <Alert key={i} severity="info">{w}</Alert>)}<Typography variant="body2">Mã báo giá: {quote.id}</Typography><Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>Hash do server cung cấp: {hash || 'Chưa có. Backend phải cung cấp hash và bằng chứng khách trước khi chốt.'}</Typography>{confirmation ? <Alert severity="success">Đã ghi nhận bằng chứng {confirmation.id}. Xác nhận lại giá/tồn khi chốt đơn.</Alert> : <Stack direction="row" gap={1} flexWrap="wrap"><Button onClick={() => setAction('evidence')}>Nhập bằng chứng xác nhận khách</Button>{simulateCustomerConfirmation && <Button variant="outlined" disabled={record.pending} onClick={() => void mockConfirm()}>Mô phỏng khách đồng ý báo giá</Button>}</Stack>}<MutationButton permission="orders.confirm" variant="contained" disabled={!confirmation} busy={confirm.pending} onClick={async () => { if (!confirmation)
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
 <EditDialog open={action === 'evidence'} title="Bằng chứng xác nhận từ khách" onClose={() => setAction(null)} busy={record.pending} actions={<Button variant="contained" disabled={!/^[a-f0-9]{64}$/.test(hash) || !identity || !messageId || record.pending} onClick={() => void collect()}>Ghi nhận bằng chứng</Button>}><ErrorNotice error={record.error}/><Stack gap={2}><Alert severity="warning">Không dùng lời AI “khách đã đồng ý” để xác nhận. Cần định danh và tin nhắn khách thực sự xác nhận đúng báo giá.</Alert><TextField label="Hash báo giá từ backend" value={hash} onChange={e => setHash(e.target.value)}/><TextField label="Định danh khách" value={identity} onChange={e => setIdentity(e.target.value)}/><TextField label="Mã tin nhắn xác nhận" value={messageId} onChange={e => setMessage(e.target.value)}/></Stack></EditDialog>
 <EditDialog open={action === 'pay' || action === 'refund'} title={action === 'pay' ? 'Ghi nhận tiền đã thu' : 'Ghi nhận tiền đã hoàn'} onClose={() => setAction(null)} busy={pay.pending || refund.pending} actions={<Button variant="contained" disabled={!/^\d+(\.\d{1,4})?$/.test(amount) || !evidenceRef || !reference || reason.trim().length < 5 || pay.pending || refund.pending} onClick={async () => { if (!order)
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
    catch { /* visible */ } }}>Ghi nhận chứng từ</Button>}><ErrorNotice error={pay.error || refund.error}/><Stack gap={2}><Alert severity="warning">Chỉ ghi khoản đã được xác minh. Nút này không chuyển tiền. Ảnh chuyển khoản chưa xác thực không là bằng chứng thanh toán.</Alert><TextField label={`Số tiền (${shop.currency})`} value={amount} onChange={e => setAmount(e.target.value)}/><TextField label="Mã tham chiếu giao dịch" value={reference} onChange={e => setReference(e.target.value)}/><TextField label="Mã chứng từ đã xác minh" value={evidenceRef} onChange={e => setEvidence(e.target.value)}/><TextField label="Lý do" value={reason} onChange={e => setReason(e.target.value)} multiline minRows={2}/></Stack></EditDialog></>;
}
export function ReturnsPage() {
    const { shop } = useScope();
    const [params] = useSearchParams();
    const list = useApi('listReturnCases', { query: useListQuery() });
    const orders = useApi('listOrders', { query: { limit: 100 } });
    const create = useCommand('createReturnCase', ['listReturnCases']);
    const inspect = useCommand('inspectReturn', ['listReturnCases', 'listStockSnapshots', 'getProfitLoss']);
    const [open, setOpen] = useState(false), [orderId, setOrder] = useState(params.get('orderId') || ''), [reason, setReason] = useState(''), [quantities, setQuantities] = useState<Record<string, string>>({});
    const selectedOrder = orders.data?.data.find(o => o.id === orderId);
    const [selected, setSelected] = useState<ReturnCase | null>(null), [inspections, setInspections] = useState<ReturnInspection['lines']>([]);
    const editInspection = (r: ReturnCase) => { setSelected(r); setInspections(r.lines.map(l => ({
        orderLineId: l.orderLineId, acceptedQuantity: l.quantity, disposition: 'quarantined', reason: 'Chờ kiểm tra tình trạng hàng nhận lại'
    }))); };
    return <><PageHeader title="Đổi và trả hàng" subtitle="Nhận lại, kiểm tình trạng, xác định nghĩa vụ hoàn. Không tự cộng hàng chưa kiểm vào tồn bán." actions={<MutationButton permission="orders.return" variant="contained" onClick={() => setOpen(true)}>Tạo yêu cầu trả</MutationButton>}/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={r => r.id} columns={[
        { key: 'id', label: 'Yêu cầu', render: r => r.id }, { key: 'order', label: 'Đơn gốc', render: r => <RouteLink to={`/s/${shop.id}/orders/${r.orderId}`}>{r.orderId}</RouteLink> }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.state}/> }, { key: 'refund', label: 'Nghĩa vụ hoàn', render: r => <Amount value={r.refundObligation}/> },
        {
            key: 'action', label: '', render: r => <MutationButton permission="inventory.adjust" disabled={['inspected', 'closed', 'rejected'].includes(r.state)} onClick={() => editInspection(r)}>Kiểm nhận</MutationButton>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <EditDialog open={open} title="Yêu cầu trả hàng" onClose={() => setOpen(false)} busy={create.pending} actions={<Button variant="contained" disabled={!orderId || reason.trim().length < 5 || !Object.values(quantities).some(q => Number(q) > 0) || create.pending} onClick={async () => { try {
        await create.execute({ body: {
                orderId, reason, lines: Object.entries(quantities).filter(([, q]) => Number(q) > 0).map(([orderLineId, q]) => ({ orderLineId, quantity: Number(q) }))
            } });
        setOpen(false);
        setQuantities({});
    }
    catch { /* visible */ } }}>Tạo yêu cầu</Button>}><ErrorNotice error={create.error}/><Stack gap={2}><TextField label="Đơn hàng đã giao" select value={orderId} onChange={e => { setOrder(e.target.value); setQuantities({}); }}>{orders.data?.data.filter(o => ['delivered', 'part_returned'].includes(o.fulfillmentState)).map(o => <MenuItem key={o.id} value={o.id}>{o.id}</MenuItem>)}</TextField>{selectedOrder?.lines.map(l => <TextField key={l.id} label={`${l.name} (tối đa ${l.quantity})`} type="number" inputProps={{ min: 0, max: l.quantity }} value={quantities[l.id] || '0'} onChange={e => setQuantities({ ...quantities, [l.id]: e.target.value })}/>)}<TextField label="Lý do trả" multiline value={reason} onChange={e => setReason(e.target.value)}/></Stack></EditDialog>
 <EditDialog open={!!selected} title="Kiểm nhận hàng trả" onClose={() => setSelected(null)} busy={inspect.pending} actions={<MutationButton permission="inventory.adjust" variant="contained" busy={inspect.pending} onClick={async () => { if (!selected)
        return; try {
        await inspect.execute({ path: { resourceId: selected.id }, body: { expectedVersion: selected.version, lines: inspections } });
        setSelected(null);
    }
    catch { /* visible */ } }}>Xác nhận kiểm nhận</MutationButton>}><ErrorNotice error={inspect.error}/><Stack gap={2}><Alert severity="warning">Người thật xác nhận đã nhận và kiểm hàng. Chỉ “Bán lại được” mới được bổ sung tồn khả dụng.</Alert>{inspections.map((line, i) => <Stack key={line.orderLineId} gap={1}><Typography>{line.orderLineId}</Typography><TextField label="Số lượng nhận" type="number" value={line.acceptedQuantity} onChange={e => setInspections(inspections.map((l, j) => i === j ? { ...l, acceptedQuantity: Number(e.target.value) } : l))}/><TextField select label="Tình trạng" value={line.disposition} onChange={e => setInspections(inspections.map((l, j) => i === j ? { ...l, disposition: e.target.value as typeof line.disposition } : l))}><MenuItem value="quarantined">Cách ly / chờ xác minh</MenuItem><MenuItem value="sellable">Bán lại được</MenuItem><MenuItem value="damaged">Hư hỏng</MenuItem></TextField><TextField label="Ghi nhận kiểm tra" value={line.reason} onChange={e => setInspections(inspections.map((l, j) => i === j ? { ...l, reason: e.target.value } : l))}/><Divider /></Stack>)}</Stack></EditDialog></>;
}
