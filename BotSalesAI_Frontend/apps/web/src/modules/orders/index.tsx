import { useListReturn } from '@/shared/model/list-return';
import { ActionGroup, FormFields, SectionGrid } from '../../shared/ui/composition';
import { useEffect, useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import type { OrderQuote, CustomerConfirmationRequest, CustomerConfirmation } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { codePointLength, dateTime } from '@/shared/model/format';
import { PageHeader, Panel, DataTable, QueryState, Toolbar, Pager, Status, Amount, MutationButton, EditDialog, ErrorNotice, ConfirmDialog, RouteLink, DetailLine } from '@/shared/ui/components';
import { layoutSx } from '@/shared/ui/layout';
import { DraftForm } from './draft-form';
import { ReturnsPage as ReturnsView } from './returns';
function OrderCustomerName({ customerId }: { customerId: string }) {
    const customer = useApi('getCustomer', { path: { customerId } });
    return <>{customer.data?.data.displayName || `Mã khách hàng: ${customerId}`}</>;
}
export function OrdersPage() { const { shop } = useScope(); const navigate = useNavigate(); const canReadCustomers = useCan('customers.read'); const list = useApi('listOrders', { query: useListQuery('listOrders') }); return <><PageHeader title="Đơn hàng" subtitle="Tách riêng trạng thái đơn, giao hàng và thanh toán." actions={<MutationButton permission="orders.write" variant="contained" onClick={() => navigate(`/s/${shop.id}/orders/new`)}>Tạo đơn hàng</MutationButton>}/><Panel><Toolbar operation="listOrders" placeholder="Tìm mã đơn hoặc khách hàng…"/><QueryState query={list} pendingProfile="section">{list.data && <><DataTable pinActionOnMobile label="Danh sách đơn hàng" rows={list.data.data} rowKey={o => o.id} columns={[
    {
        key: 'id', label: 'Đơn hàng', render: o => <Stack><Typography fontWeight={visualSx.typography.fontWeight.strong}>{o.id}</Typography><Typography variant="caption" color="text.secondary">{dateTime(o.createdAt, shop.timezone)}</Typography></Stack>
    },
    { key: 'customer', label: 'Khách', render: o => canReadCustomers ? <RouteLink to={`/s/${shop.id}/customers/${encodeURIComponent(o.customerId)}`}><OrderCustomerName customerId={o.customerId}/></RouteLink> : `Mã khách hàng: ${o.customerId}` }, { key: 'total', label: 'Tổng tiền', align: 'right', render: o => <Amount value={o.total}/> }, { key: 'order', label: 'Đơn', render: o => <Status value={o.orderState}/> }, { key: 'shipping', label: 'Giao hàng', render: o => <Status value={o.fulfillmentState}/> }, { key: 'payment', label: 'Tiền', render: o => <Status value={o.paymentState}/> }, { key: 'action', label: 'Thao tác', render: o => <RouteLink to={`/s/${shop.id}/orders/${o.id}`}>Xem đơn</RouteLink> }
]}/><Pager page={list.data.page}/></>}</QueryState></Panel></>; }
export function NewOrderPage() { const { shop } = useScope(); const navigate = useNavigate(); return <><PageHeader title="Tạo đơn hàng" subtitle="Lưu nháp trước, sau đó báo giá và xác nhận khách." actions={<RouteLink to={`/s/${shop.id}/orders`}>Danh sách đơn</RouteLink>}/><DraftForm onSaved={o => navigate(`/s/${shop.id}/orders/${o.id}`)}/></>; }
export function OrderDetailPage({ simulateCustomerConfirmation }: {
    simulateCustomerConfirmation?: (shopId: string, quoteId: string) => Promise<CustomerConfirmationRequest>;
}) {
    const { orderId = '' } = useParams();
    const { shop } = useScope();
    const listHref=useListReturn(`/s/${shop.id}/orders`);
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
    return <><PageHeader title={`Đơn ${orderId}`} subtitle="Mọi thay đổi quan trọng kiểm lại phiên bản và điều kiện nghiệp vụ." actions={<RouteLink to={listHref}>Danh sách đơn</RouteLink>}/><QueryState query={get} pendingProfile="section">{order && <>
 <ErrorNotice error={error || quoteOp.error || record.error || confirm.error}/>{editing ? <EditDialog allowEditsWhileBusy open title="Sửa đơn nháp" busy={editBusy} onClose={() => setEditing(false)} actions={({ requestClose, busy }) => <Button disabled={busy} onClick={requestClose}>Đóng chỉnh sửa</Button>}><DraftForm initial={order} onBusyChange={setEditBusy} onSaved={() => { setEditBusy(false); setEditing(false); setQuote(null); setConfirmation(null); }}/></EditDialog> : <>
 <ActionGroup direction="row" afterGap="section"><Status value={order.orderState}/><Status value={order.fulfillmentState}/><Status value={order.paymentState}/><Typography variant="caption" sx={{ alignSelf: 'center' }}>Phiên bản {order.version}</Typography></ActionGroup>
 <SectionGrid columns={{ xs: '1fr', lg: '2fr 1fr' }}><Panel title="Sản phẩm trong đơn"><DataTable label="Sản phẩm trong đơn" rows={order.lines} rowKey={l => l.id} columns={[
                {
                    key: 'name', label: 'Sản phẩm / SKU', render: l => <Stack><Typography fontWeight={visualSx.typography.fontWeight.strong}>{l.name}</Typography><Typography variant="caption">{l.sku}</Typography></Stack>
                },
                { key: 'qty', label: 'Số lượng', align: 'right', render: l => l.quantity }, { key: 'price', label: 'Đơn giá', align: 'right', render: l => <Amount value={l.unitPrice}/> }, { key: 'total', label: 'Thành tiền', align: 'right', render: l => <Amount value={l.lineTotal}/> }
            ]}/><Box sx={[layoutSx.surface.inset, { textAlign: 'right' }]}><Typography color="text.secondary">Tổng từ API</Typography><Typography component="div" variant="h4"><Amount wrap value={order.total}/></Typography></Box></Panel><Panel title="Thông tin xử lý" bodyMode="inset"><Box><DetailLine label="Khách"><RouteLink to={`/s/${shop.id}/customers/${order.customerId}`}>Mã khách hàng: {order.customerId}</RouteLink></DetailLine><DetailLine label="Kho">Mã kho: {order.warehouseId}</DetailLine><DetailLine label="Địa chỉ">{order.shippingAddressSnapshot ? [order.shippingAddressSnapshot.label, order.shippingAddressSnapshot.recipient, order.shippingAddressSnapshot.line1, order.shippingAddressSnapshot.province].filter(Boolean).join(' · ') : (order.shippingAddressId ? `Mã địa chỉ: ${order.shippingAddressId}` : 'Chưa có địa chỉ được xác minh')}</DetailLine><DetailLine label="Thanh toán">{order.paymentMethod === 'cod' ? 'COD' : 'Trả trước'}</DetailLine>{order.conversationId && <RouteLink to={`/s/${shop.id}/inbox/${order.conversationId}`}>Mở hội thoại</RouteLink>}{order.prepTaskId && <RouteLink to={`/s/${shop.id}/fulfillment`}>Chuẩn bị đơn</RouteLink>}</Box></Panel></SectionGrid>
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
 <ConfirmDialog open={action === 'cancel'} title="Hủy đơn hàng" confirmLabel="Hủy đơn hàng" description={`Đơn ${orderId}: hủy xử lý mới và giải phóng lượng hàng giữ khi đủ điều kiện. Lịch sử và chứng từ đã ghi được giữ; tác động đã tiếp nhận phải được đối chiếu.`} requireReason onClose={() => setAction(null)} busy={cancel.pending} error={cancel.error} onConfirm={reason => cancel.execute({ path: { orderId }, version: order?.version, body: { expectedVersion: order?.version || 1, reason } })}/>
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
export function ReturnsPage() { return <ReturnsView />; }
