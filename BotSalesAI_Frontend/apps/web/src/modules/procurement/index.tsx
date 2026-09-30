import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import type { Supplier, ReorderRule, GoodsReceipt } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { dateTime } from '@/shared/model/format';
import { PageHeader, Panel, DataTable, QueryState, Toolbar, Pager, Status, Amount, MutationButton, EditDialog, ErrorNotice, ConfirmDialog, RouteLink, DetailLine } from '@/shared/ui/components';
export function SuppliersPage() {
    const { shop } = useScope();
    const list = useApi('listSuppliers', { query: useListQuery() });
    const offers = useApi('listSupplierOffers', { query: { limit: 100 } });
    const products = useApi('listProducts', { query: { limit: 100 } });
    const create = useCommand('createSupplier', ['listSuppliers']);
    const update = useCommand('updateSupplier', ['listSuppliers']);
    const status = useCommand('setSupplierStatus', ['listSuppliers']);
    const addOffer = useCommand('createSupplierOffer', ['listSupplierOffers']);
    const [edit, setEdit] = useState<Supplier | null | undefined>(), [name, setName] = useState(''), [contact, setContact] = useState(''), [lead, setLead] = useState('3'), [terms, setTerms] = useState(''), [method, setMethod] = useState<'manual' | 'approved_adapter'>('manual'), [adapter, setAdapter] = useState('');
    const [statusItem, setStatusItem] = useState<Supplier | null>(null), [statusValue, setStatusValue] = useState<'approved' | 'suspended' | 'archived'>('approved'), [reason, setReason] = useState('');
    const [offerSupplier, setOfferSupplier] = useState<Supplier | null>(null), [variant, setVariant] = useState(''), [cost, setCost] = useState(''), [minimum, setMinimum] = useState('1'), [pack, setPack] = useState('1');
    const open = (s: Supplier | null) => { setEdit(s); setName(s?.name || ''); setContact(s?.contactLabel || ''); setLead(String(s?.leadTimeDays ?? 3)); setTerms(s?.paymentTerms || ''); setMethod(s?.sendMethod || 'manual'); setAdapter(s?.approvedAdapterId || ''); };
    return <><PageHeader title="Nhà cung cấp hàng hóa" subtitle="Tách biệt với nhà cung cấp AI. Mua hàng chỉ trong điều kiện và quyền đã duyệt." actions={<MutationButton permission="procurement.write" variant="contained" onClick={() => open(null)}>Thêm nhà cung cấp</MutationButton>}/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={s => s.id} columns={[
        {
            key: 'name', label: 'Nhà cung cấp', render: s => <Stack><Typography fontWeight={650}>{s.name}</Typography><Typography variant="caption">{s.contactLabel}</Typography></Stack>
        },
        { key: 'lead', label: 'Thời gian giao', render: s => `${s.leadTimeDays} ngày` }, { key: 'terms', label: 'Thanh toán', render: s => s.paymentTerms }, { key: 'state', label: 'Trạng thái', render: s => <Status value={s.status}/> },
        {
            key: 'actions', label: '', render: s => <Stack direction="row" flexWrap="wrap"><MutationButton permission="procurement.write" onClick={() => open(s)}>Sửa</MutationButton><MutationButton permission="procurement.write" onClick={() => { setOfferSupplier(s); setVariant(''); setCost(''); }}>Thêm báo giá</MutationButton><MutationButton permission="procurement.manage" onClick={() => { setStatusItem(s); setReason(''); setStatusValue('approved'); }}>Duyệt / tạm dừng</MutationButton></Stack>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <Panel title="Báo giá sản phẩm" subtitle="Giá vốn, lượng tối thiểu, quy cách và hiệu lực được quản lý riêng." sx={{ mt: 3 }}><QueryState query={offers}>{offers.data && <DataTable rows={offers.data.data} rowKey={o => o.id} columns={[
        { key: 'supplier', label: 'Nhà cung cấp', render: o => list.data?.data.find(s => s.id === o.supplierId)?.name || o.supplierId },
        {
            key: 'sku', label: 'Biến thể', render: o => products.data?.data.flatMap(p => p.variants).find(v => v.id === o.variantId)?.sku || o.variantId
        },
        { key: 'cost', label: 'Đơn giá', render: o => <Amount value={o.unitCost}/> }, { key: 'moq', label: 'Tối thiểu / Quy cách', render: o => `${o.minimumQuantity} / ${o.packSize}` }, { key: 'date', label: 'Hiệu lực tới', render: o => o.validUntil ? dateTime(o.validUntil, shop.timezone) : 'Chưa quy định' }
    ]}/>}</QueryState></Panel>
 <EditDialog open={edit !== undefined} title={edit ? 'Cập nhật nhà cung cấp' : 'Nhà cung cấp mới'} onClose={() => setEdit(undefined)} busy={create.pending || update.pending} actions={<Button variant="contained" disabled={!name.trim() || !contact.trim() || create.pending || update.pending} onClick={async () => { try {
        const body = {
            name, contactLabel: contact, currency: edit?.currency || shop.currency, leadTimeDays: Number(lead), paymentTerms: terms, sendMethod: method, approvedAdapterId: adapter || null
        };
        if (edit) {
            const { currency, ...patch } = body;
            void currency;
            await update.execute({ path: { resourceId: edit.id }, version: edit.version, body: patch });
        }
        else
            await create.execute({ body });
        setEdit(undefined);
    }
    catch { /* preserve */ } }}>Lưu</Button>}><ErrorNotice error={create.error || update.error}/><Stack gap={2}><TextField label="Tên nhà cung cấp" value={name} onChange={e => setName(e.target.value)}/><TextField label="Đầu mối liên hệ" value={contact} onChange={e => setContact(e.target.value)}/><TextField label="Thời gian giao (ngày)" type="number" value={lead} onChange={e => setLead(e.target.value)}/><TextField label="Điều kiện thanh toán" value={terms} onChange={e => setTerms(e.target.value)} multiline/><TextField label="Cách gửi đơn" select value={method} onChange={e => setMethod(e.target.value as typeof method)}><MenuItem value="manual">Thủ công, có xác nhận</MenuItem><MenuItem value="approved_adapter">Adapter đã được duyệt</MenuItem></TextField>{method === 'approved_adapter' && <TextField label="Mã adapter đã được duyệt" value={adapter} onChange={e => setAdapter(e.target.value)}/>}<Alert severity="info">Tạo hồ sơ không tự cấp quyền mua hoặc thanh toán.</Alert></Stack></EditDialog>
 <EditDialog open={!!statusItem} title="Đổi trạng thái nhà cung cấp" onClose={() => setStatusItem(null)} busy={status.pending} actions={<Button variant="contained" disabled={reason.trim().length < 5 || status.pending} onClick={async () => { if (!statusItem)
        return; try {
        await status.execute({ path: { resourceId: statusItem.id }, body: { expectedVersion: statusItem.version, status: statusValue, reason } });
        setStatusItem(null);
    }
    catch { /* visible */ } }}>Xác nhận</Button>}><ErrorNotice error={status.error}/><Stack gap={2}><Typography>{statusItem?.name}</Typography><TextField label="Trạng thái" select value={statusValue} onChange={e => setStatusValue(e.target.value as typeof statusValue)}><MenuItem value="approved">Duyệt nhà cung cấp</MenuItem><MenuItem value="suspended">Tạm dừng</MenuItem><MenuItem value="archived">Ngừng sử dụng</MenuItem></TextField><TextField label="Lý do" value={reason} onChange={e => setReason(e.target.value)} multiline/></Stack></EditDialog>
 <EditDialog open={!!offerSupplier} title={`Báo giá — ${offerSupplier?.name || ''}`} onClose={() => setOfferSupplier(null)} busy={addOffer.pending} actions={<Button variant="contained" disabled={!variant || !/^\d+(\.\d{1,4})?$/.test(cost) || addOffer.pending} onClick={async () => { if (!offerSupplier)
        return; try {
        await addOffer.execute({ body: {
                supplierId: offerSupplier.id, variantId: variant, unitCost: { amount: cost, currency: offerSupplier.currency }, minimumQuantity: Number(minimum), packSize: Number(pack), leadTimeDays: Number(lead), validUntil: null
            } });
        setOfferSupplier(null);
    }
    catch { /* visible */ } }}>Lưu báo giá mới</Button>}><ErrorNotice error={addOffer.error}/><Stack gap={2}><TextField label="Biến thể" select value={variant} onChange={e => setVariant(e.target.value)}>{products.data?.data.flatMap(p => p.variants.map(v => <MenuItem key={v.id} value={v.id}>{p.name} · {v.name} · {v.sku}</MenuItem>))}</TextField><TextField label="Giá nhập đơn vị" value={cost} onChange={e => setCost(e.target.value)}/><Stack direction="row" gap={2}><TextField label="Lượng tối thiểu" type="number" value={minimum} onChange={e => setMinimum(e.target.value)}/><TextField label="Bội số đóng gói" type="number" value={pack} onChange={e => setPack(e.target.value)}/></Stack><TextField label="Thời gian giao (ngày)" type="number" value={lead} onChange={e => setLead(e.target.value)}/></Stack></EditDialog></>;
}
export function ReplenishmentPage() {
    const { shop } = useScope();
    const navigate = useNavigate();
    const suggestions = useApi('listPurchaseSuggestions', { query: useListQuery() });
    const rules = useApi('listReorderRules', { query: { limit: 100 } });
    const offers = useApi('listSupplierOffers', { query: { limit: 100 } });
    const budgets = useApi('listBudgetPolicies', {}, useCan('operations.read'));
    const evaluate = useCommand('evaluateReorder', ['listPurchaseSuggestions']);
    const purchase = useCommand('createPurchaseOrder', ['listPurchaseOrders', 'listPurchaseSuggestions']);
    const create = useCommand('createReorderRule', ['listReorderRules']);
    const update = useCommand('updateReorderRule', ['listReorderRules']);
    const [tab, setTab] = useState(0), [edit, setEdit] = useState<ReorderRule | null | undefined>(), [offerId, setOffer] = useState(''), [reorder, setReorder] = useState('5'), [target, setTarget] = useState('20'), [safety, setSafety] = useState('3'), [mode, setMode] = useState<ReorderRule['mode']>('draft_for_approval'), [enabled, setEnabled] = useState(true), [budget, setBudget] = useState(''), [autoAck, setAutoAck] = useState(false);
    const open = (r: ReorderRule | null) => { setEdit(r); setOffer(r?.supplierOfferId || ''); setReorder(String(r?.reorderPoint ?? 5)); setTarget(String(r?.targetQuantity ?? 20)); setSafety(String(r?.safetyStock ?? 3)); setMode(r?.mode || 'draft_for_approval'); setEnabled(r?.enabled ?? true); setBudget(r?.budgetPolicyId || ''); setAutoAck(false); };
    return <><PageHeader title="Nhập lại hàng" subtitle="Trừ hàng đã đặt trước khi đề xuất mua thêm. Tự gửi đơn chỉ khi được bật và đủ hạn mức." actions={<><MutationButton permission="procurement.manage" onClick={() => open(null)}>Thêm quy tắc</MutationButton><MutationButton permission="procurement.write" variant="contained" busy={evaluate.pending} onClick={() => void evaluate.execute().catch(() => undefined)}>Đánh giá nhu cầu nhập</MutationButton></>}/><ErrorNotice error={evaluate.error || purchase.error}/><Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ mb: 2 }}><Tab label="Đề nghị nhập"/><Tab label="Quy tắc theo SKU"/></Tabs>{tab === 0 ? <Panel><Toolbar /><QueryState query={suggestions}>{suggestions.data && <><DataTable rows={suggestions.data.data} rowKey={r => r.id} columns={[
        { key: 'sku', label: 'Biến thể', render: r => r.variantId }, { key: 'available', label: 'Có thể bán', align: 'right', render: r => r.available }, { key: 'incoming', label: 'Đang về', align: 'right', render: r => r.confirmedInbound }, { key: 'proposed', label: 'Đã đề xuất', align: 'right', render: r => r.openProposalQuantity },
        {
            key: 'qty', label: 'Nên nhập', align: 'right', render: r => <Typography color="primary.main" fontWeight={700}>{r.suggestedQuantity}</Typography>
        },
        { key: 'reason', label: 'Căn cứ', render: r => r.reason },
        {
            key: 'action', label: '', render: r => <MutationButton permission="procurement.write" disabled={!!r.activePurchaseOrderId || r.suggestedQuantity <= 0 || !offers.data} busy={purchase.pending} onClick={async () => { const o = offers.data?.data.find(o => o.id === r.supplierOfferId); if (!o)
                return; try {
                await purchase.execute({ body: {
                        supplierId: o.supplierId, warehouseId: r.warehouseId, suggestionId: r.id, lines: [{ variantId: r.variantId, supplierOfferId: o.id, quantity: r.suggestedQuantity }]
                    } });
                navigate(`/s/${shop.id}/purchases`);
            }
            catch { /* visible */ } }}>Lập đơn nháp</MutationButton>
        }
    ]}/><Pager page={suggestions.data.page}/></>}</QueryState></Panel> : <Panel><QueryState query={rules}>{rules.data && <DataTable rows={rules.data.data} rowKey={r => r.id} columns={[
        { key: 'sku', label: 'Biến thể', render: r => r.variantId }, { key: 'threshold', label: 'Ngưỡng / Mục tiêu', render: r => `${r.reorderPoint} / ${r.targetQuantity}` }, { key: 'safety', label: 'Tồn an toàn', render: r => r.safetyStock }, { key: 'mode', label: 'Mức tự động', render: r => <Status value={r.mode}/> }, { key: 'enabled', label: 'Bật', render: r => r.enabled ? 'Có' : 'Chưa bật' },
        {
            key: 'edit', label: '', render: r => <MutationButton permission="procurement.manage" onClick={() => open(r)}>Chỉnh quy tắc</MutationButton>
        }
    ]}/>}</QueryState></Panel>}
 <EditDialog open={edit !== undefined} title="Quy tắc nhập lại" onClose={() => setEdit(undefined)} busy={create.pending || update.pending} actions={<Button variant="contained" disabled={!offerId || (mode === 'auto_send' && (!budget || !autoAck)) || create.pending || update.pending} onClick={async () => { const o = offers.data?.data.find(o => o.id === offerId); if (!o)
        return; const body = {
        variantId: o.variantId, warehouseId: edit?.warehouseId || shop.defaultWarehouseId, supplierOfferId: offerId, reorderPoint: Number(reorder), targetQuantity: Number(target), safetyStock: Number(safety), mode, enabled, budgetPolicyId: budget || null
    }; try {
        if (edit)
            await update.execute({ path: { resourceId: edit.id }, body: { ...body, expectedVersion: edit.version } });
        else
            await create.execute({ body });
        setEdit(undefined);
    }
    catch { /* visible */ } }}>Lưu quy tắc</Button>}><ErrorNotice error={create.error || update.error}/><Stack gap={2}><TextField label="Báo giá / SKU" select value={offerId} onChange={e => setOffer(e.target.value)}>{offers.data?.data.map(o => <MenuItem key={o.id} value={o.id}>{o.variantId} · {o.supplierId} · {o.unitCost.amount} {o.unitCost.currency}</MenuItem>)}</TextField><Stack direction="row" gap={1}><TextField label="Ngưỡng nhập" type="number" value={reorder} onChange={e => setReorder(e.target.value)}/><TextField label="Nhập tới" type="number" value={target} onChange={e => setTarget(e.target.value)}/><TextField label="Tồn an toàn" type="number" value={safety} onChange={e => setSafety(e.target.value)}/></Stack><TextField label="Mức tự động" select value={mode} onChange={e => setMode(e.target.value as typeof mode)}><MenuItem value="notify_only">1 · Chỉ cảnh báo</MenuItem><MenuItem value="draft_for_approval">2 · Lập nháp chờ duyệt</MenuItem><MenuItem value="auto_send">3 · Tự gửi trong hạn mức</MenuItem></TextField>{mode === 'auto_send' && <><Alert severity="warning">Không bao gồm quyền chuyển tiền. Backend phải kiểm nhà cung cấp, giá, lượng, ngân sách và chính sách trước mỗi lần gửi.</Alert><TextField label="Ngân sách mua hàng đã duyệt" select value={budget} onChange={e => setBudget(e.target.value)}>{budgets.data?.data.filter(b => b.kind === 'procurement' && b.enabled && b.limitAmount).map(b => <MenuItem key={b.id} value={b.id}>{b.id} · {b.limitAmount?.amount} {b.limitAmount?.currency}</MenuItem>)}</TextField><FormControlLabel label="Tôi hiểu phạm vi tự gửi và đã kiểm chính sách" control={<Checkbox checked={autoAck} onChange={e => setAutoAck(e.target.checked)}/>}/></>}<FormControlLabel label="Bật quy tắc" control={<Checkbox checked={enabled} onChange={e => setEnabled(e.target.checked)}/>}/></Stack></EditDialog></>;
}
export function PurchasesPage() {
    const { shop } = useScope();
    const list = useApi('listPurchaseOrders', { query: useListQuery() });
    const suppliers = useApi('listSuppliers', { query: { limit: 100 } });
    const offers = useApi('listSupplierOffers', { query: { limit: 100 } });
    const create = useCommand('createPurchaseOrder', ['listPurchaseOrders']);
    const [open, setOpen] = useState(false), [supplier, setSupplier] = useState(''), [offerId, setOffer] = useState(''), [quantity, setQty] = useState('1'), [selected, setSelected] = useState<string | null>(null);
    return <><PageHeader title="Đơn mua hàng" subtitle="Duyệt đúng nội dung trước khi gửi. Kết quả gửi chưa rõ phải đối chiếu, không gửi lại mù quáng." actions={<MutationButton permission="procurement.write" variant="contained" onClick={() => setOpen(true)}>Tạo đơn mua</MutationButton>}/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={p => p.id} columns={[
        { key: 'id', label: 'Đơn mua', render: p => <Typography fontWeight={650}>{p.id}</Typography> }, { key: 'supplier', label: 'Nhà cung cấp', render: p => suppliers.data?.data.find(s => s.id === p.supplierId)?.name || p.supplierId }, { key: 'total', label: 'Tổng cam kết', render: p => <Amount value={p.total}/> }, { key: 'status', label: 'Trạng thái', render: p => <Status value={p.status}/> }, { key: 'ref', label: 'Tham chiếu', render: p => p.externalReference || 'Chưa gửi' }, { key: 'action', label: '', render: p => <Button onClick={() => setSelected(p.id)}>Xem chi tiết</Button> }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel><EditDialog open={open} title="Đơn mua mới" onClose={() => setOpen(false)} busy={create.pending} actions={<Button variant="contained" disabled={!offerId || !supplier || Number(quantity) <= 0 || create.pending} onClick={async () => { const o = offers.data?.data.find(o => o.id === offerId); if (!o)
        return; try {
        const r = await create.execute({ body: {
                supplierId: supplier, warehouseId: shop.defaultWarehouseId, suggestionId: null, lines: [{ variantId: o.variantId, supplierOfferId: o.id, quantity: Number(quantity) }]
            } });
        setOpen(false);
        setSelected(r.data.id);
    }
    catch { /* visible */ } }}>Lưu nháp</Button>}><ErrorNotice error={create.error}/><Stack gap={2}><TextField label="Nhà cung cấp đã duyệt" select value={supplier} onChange={e => { setSupplier(e.target.value); setOffer(''); }}>{suppliers.data?.data.filter(s => s.status === 'approved').map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</TextField><TextField label="Báo giá sản phẩm" select value={offerId} onChange={e => { setOffer(e.target.value); const o = offers.data?.data.find(o => o.id === e.target.value); setQty(String(o?.minimumQuantity || 1)); }}>{offers.data?.data.filter(o => o.supplierId === supplier).map(o => <MenuItem key={o.id} value={o.id}>{o.variantId} · {o.unitCost.amount} {o.unitCost.currency}</MenuItem>)}</TextField><TextField label="Số lượng theo quy cách nhà cung cấp" type="number" value={quantity} onChange={e => setQty(e.target.value)}/><Alert severity="info">Giá và tổng đơn do API xác nhận lại theo báo giá hiện hành.</Alert></Stack></EditDialog>{selected && <PurchaseDialog resourceId={selected} onClose={() => setSelected(null)}/>}</>;
}
function PurchaseDialog({ resourceId, onClose }: {
    resourceId: string;
    onClose: () => void;
}) {
    const { shop } = useScope();
    const get = useApi('getPurchaseOrder', { path: { resourceId } });
    const p = get.data?.data;
    const approval = useCommand('requestPurchaseApproval', ['getPurchaseOrder', 'listPurchaseOrders', 'listApprovals']);
    const send = useCommand('sendPurchaseOrder', ['getPurchaseOrder', 'listPurchaseOrders', 'listApprovals']);
    const confirm = useCommand('confirmPurchaseOrder', ['getPurchaseOrder', 'listPurchaseOrders']);
    const cancel = useCommand('cancelPurchaseOrder', ['getPurchaseOrder', 'listPurchaseOrders', 'listPurchaseSuggestions']);
    const [action, setAction] = useState<'send' | 'cancel' | 'confirm' | null>(null), [external, setExternal] = useState(''), [proof, setProof] = useState('');
    return <><EditDialog open title={`Đơn mua ${resourceId}`} onClose={onClose} actions={<Button onClick={onClose}>Đóng</Button>}><ErrorNotice error={approval.error}/><QueryState query={get}>{p && <Stack gap={2}><Status value={p.status}/><DetailLine label="Nhà cung cấp">{p.supplierId}</DetailLine><DetailLine label="Tổng cam kết"><Amount value={p.total}/></DetailLine><DataTable rows={p.lines} rowKey={l => l.id} columns={[
        { key: 'sku', label: 'Biến thể', render: l => l.variantId }, { key: 'qty', label: 'Đặt', render: l => l.quantity }, { key: 'received', label: 'Đã nhận', render: l => l.receivedQuantity }, { key: 'cost', label: 'Đơn giá', render: l => <Amount value={l.unitCost}/> }
    ]}/><Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>Hash nội dung: {p.intentHash}</Typography><Stack direction="row" gap={1} flexWrap="wrap"><MutationButton permission="procurement.write" allowedActions={p.allowedActions} action="request_approval" busy={approval.pending} onClick={() => void approval.execute({ path: { resourceId }, body: { expectedVersion: p.version } }).catch(() => undefined)}>Xin phê duyệt</MutationButton><MutationButton permission="procurement.send" allowedActions={p.allowedActions} action="send" variant="contained" onClick={() => setAction('send')}>Gửi đơn mua</MutationButton><MutationButton permission="procurement.write" allowedActions={p.allowedActions} action="confirm" onClick={() => setAction('confirm')}>Nhà cung cấp đã xác nhận</MutationButton><MutationButton permission="procurement.write" allowedActions={p.allowedActions} action="cancel" color="error" onClick={() => setAction('cancel')}>Hủy đơn</MutationButton></Stack>{p.approvalId && <RouteLink to={`/s/${shop.id}/approvals`}>Xem phê duyệt {p.approvalId}</RouteLink>}{['confirmed', 'part_received'].includes(p.status) && <RouteLink to={`/s/${shop.id}/receipts?purchaseOrderId=${p.id}`}>Nhận hàng theo đơn này</RouteLink>}{p.status === 'unknown' && <Alert severity="warning">Chưa xác minh kết quả gửi. Không tạo/gửi đơn khác; cần đối chiếu tham chiếu ở nhà cung cấp.</Alert>}</Stack>}</QueryState></EditDialog>
 <ConfirmDialog open={action === 'send'} title="Gửi đơn mua đã duyệt" description="Chỉ gửi đúng nội dung được duyệt. Quyền mua hàng không cho phép tự chuyển tiền." onClose={() => setAction(null)} error={send.error} busy={send.pending} onConfirm={() => send.execute({ path: { resourceId }, body: { expectedVersion: p?.version || 1, approvalId: p?.approvalId || '', intentHash: p?.intentHash || '' } })}/><ConfirmDialog open={action === 'cancel'} title="Hủy đơn mua" description="Chỉ hủy trong giai đoạn và điều kiện được API cho phép." requireReason onClose={() => setAction(null)} error={cancel.error} busy={cancel.pending} onConfirm={reason => cancel.execute({ path: { resourceId }, body: { expectedVersion: p?.version || 1, reason } })}/>
 <EditDialog open={action === 'confirm'} title="Ghi nhận xác nhận của nhà cung cấp" onClose={() => setAction(null)} busy={confirm.pending} actions={<Button variant="contained" disabled={!external || !proof || confirm.pending} onClick={async () => { try {
        await confirm.execute({ path: { resourceId }, body: { expectedVersion: p?.version || 1, externalReference: external, supplierConfirmationRef: proof } });
        setAction(null);
    }
    catch { /* visible */ } }}>Ghi xác nhận</Button>}><ErrorNotice error={confirm.error}/><Stack gap={2}><TextField label="Tham chiếu đơn phía nhà cung cấp" value={external} onChange={e => setExternal(e.target.value)}/><TextField label="Mã bằng chứng xác nhận" value={proof} onChange={e => setProof(e.target.value)}/></Stack></EditDialog></>;
}
export function ReceiptsPage() {
    const list = useApi('listGoodsReceipts', { query: useListQuery() });
    const orders = useApi('listPurchaseOrders', { query: { limit: 100 } });
    const create = useCommand('createGoodsReceipt', ['listGoodsReceipts']);
    const post = useCommand('postGoodsReceipt', ['listGoodsReceipts', 'listPurchaseOrders', 'listStockSnapshots', 'listDebtItems', 'listJournals']);
    const [open, setOpen] = useState(false), [orderId, setOrder] = useState(''), [document, setDocument] = useState(''), [quantities, setQuantities] = useState<Record<string, {
        accepted: string;
        rejected: string;
        reason: string;
    }>>({}), [selected, setSelected] = useState<GoodsReceipt | null>(null);
    const order = orders.data?.data.find(o => o.id === orderId);
    return <><PageHeader title="Nhận hàng" subtitle="Nhận từng phần, ghi thiếu/hỏng và tạo công nợ theo hàng thực nhận." actions={<MutationButton permission="procurement.write" variant="contained" onClick={() => setOpen(true)}>Tạo phiếu nhận</MutationButton>}/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={r => r.id} columns={[
        { key: 'id', label: 'Phiếu nhận', render: r => r.id }, { key: 'po', label: 'Đơn mua', render: r => r.purchaseOrderId }, { key: 'source', label: 'Chứng từ nguồn', render: r => r.sourceDocumentRef }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.status}/> },
        {
            key: 'action', label: '', render: r => <MutationButton permission="procurement.receive" disabled={r.status !== 'draft'} onClick={() => setSelected(r)}>Kiểm & ghi nhận vào kho</MutationButton>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <EditDialog open={open} title="Phiếu nhận hàng mới" onClose={() => setOpen(false)} busy={create.pending} actions={<Button variant="contained" disabled={!order || !document || create.pending || !Object.values(quantities).some(q => Number(q.accepted) + Number(q.rejected) > 0)} onClick={async () => { if (!order)
        return; try {
        await create.execute({ body: {
                purchaseOrderId: orderId, expectedPurchaseVersion: order.version, sourceDocumentRef: document, lines: Object.entries(quantities).filter(([, q]) => Number(q.accepted) + Number(q.rejected) > 0).map(([purchaseLineId, q]) => ({ purchaseLineId, acceptedQuantity: Number(q.accepted), rejectedQuantity: Number(q.rejected), reason: q.reason }))
            } });
        setOpen(false);
    }
    catch { /* visible */ } }}>Tạo phiếu nháp</Button>}><ErrorNotice error={create.error}/><Stack gap={2}><TextField label="Đơn mua đã xác nhận" select value={orderId} onChange={e => { setOrder(e.target.value); const o = orders.data?.data.find(o => o.id === e.target.value); setQuantities(Object.fromEntries(o?.lines.map(l => [l.id, { accepted: '0', rejected: '0', reason: '' }]) || [])); }}>{orders.data?.data.filter(o => ['confirmed', 'part_received'].includes(o.status)).map(o => <MenuItem key={o.id} value={o.id}>{o.id}</MenuItem>)}</TextField><TextField label="Mã phiếu giao / chứng từ nguồn" value={document} onChange={e => setDocument(e.target.value)}/>{order?.lines.map(l => { const q = quantities[l.id] || { accepted: '0', rejected: '0', reason: '' }; return <Box key={l.id} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}><Typography fontWeight={650}>{l.variantId}</Typography><Typography variant="caption">Còn {l.quantity - l.receivedQuantity - l.rejectedQuantity} đơn vị chưa nhận</Typography><Stack direction="row" gap={1} sx={{ my: 1.5 }}><TextField label="Nhận đạt" type="number" value={q.accepted} onChange={e => setQuantities({ ...quantities, [l.id]: { ...q, accepted: e.target.value } })}/><TextField label="Từ chối / hỏng" type="number" value={q.rejected} onChange={e => setQuantities({ ...quantities, [l.id]: { ...q, rejected: e.target.value } })}/></Stack><TextField label="Ghi chú kiểm hàng" fullWidth value={q.reason} onChange={e => setQuantities({ ...quantities, [l.id]: { ...q, reason: e.target.value } })}/></Box>; })}</Stack></EditDialog>
 <ConfirmDialog open={!!selected} title="Ghi nhận hàng đã kiểm vào kho" description={`Phiếu ${selected?.id || ''}: ${selected?.lines.map(l => `${l.acceptedQuantity} nhận đạt, ${l.rejectedQuantity} từ chối`).join('; ') || ''}. Bạn đã kiểm hàng thực tế? API kiểm lại lượng còn nhận, kỳ kế toán và chống ghi trùng.`} onClose={() => setSelected(null)} busy={post.pending} error={post.error} onConfirm={() => post.execute({ path: { resourceId: selected?.id || '' }, body: { expectedVersion: selected?.version || 1 } })}/></>;
}
