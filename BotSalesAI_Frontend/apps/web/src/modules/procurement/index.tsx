import { useEffect, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import type { Supplier, SupplierOffer, ReorderRule, GoodsReceipt } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { UnknownResultError } from '@/shared/api/errors';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { dateTime } from '@/shared/model/format';
import { intentSnapshot, subscribeIntents } from '@/shared/api/intents';
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
    const [hydratedSupplierId, setHydratedSupplierId] = useState<string | null>(null);
    const supplierDetailId = edit?.id || statusItem?.id || '';
    const supplierDetail = useApi('getSupplier', { path: { resourceId: supplierDetailId } }, !!supplierDetailId);
    useEffect(() => {
        const current = supplierDetail.data?.data;
        if (!edit?.id || !current || supplierDetail.isFetching || current.id !== edit.id || hydratedSupplierId === current.id) return;
        setName(current.name);
        setContact(current.contactLabel);
        setLead(String(current.leadTimeDays));
        setTerms(current.paymentTerms);
        setMethod(current.sendMethod);
        setAdapter(current.approvedAdapterId || '');
        setHydratedSupplierId(current.id);
    }, [edit?.id, hydratedSupplierId, supplierDetail.data?.data, supplierDetail.isFetching]);
    const supplierFormValid = !!name.trim() && name.trim().length <= 160 && !!contact.trim() && contact.trim().length <= 200 && Number.isInteger(Number(lead)) && Number(lead) >= 0 && terms.length <= 500 && (method === 'manual' || !!adapter.trim());
    const offerFormValid = !!variant && /^(0|[1-9]\d*)(\.\d{1,4})?$/.test(cost) && Number.isInteger(Number(minimum)) && Number(minimum) >= 1 && Number.isInteger(Number(pack)) && Number(pack) >= 1 && Number.isInteger(Number(lead)) && Number(lead) >= 0;
    const open = (s: Supplier | null) => { setEdit(s); setHydratedSupplierId(null); setName(s?.name || ''); setContact(s?.contactLabel || ''); setLead(String(s?.leadTimeDays ?? 3)); setTerms(s?.paymentTerms || ''); setMethod(s?.sendMethod || 'manual'); setAdapter(s?.approvedAdapterId || ''); };
    return <><PageHeader title="Nhà cung cấp hàng hóa" subtitle="Tách biệt với nhà cung cấp AI. Mua hàng chỉ trong điều kiện và quyền đã duyệt." actions={<MutationButton permission="procurement.write" variant="contained" onClick={() => open(null)}>Thêm nhà cung cấp</MutationButton>}/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={s => s.id} columns={[
        {
            key: 'name', label: 'Nhà cung cấp', render: s => <Stack><Typography fontWeight={650}>{s.name}</Typography><Typography variant="caption">{s.contactLabel}</Typography></Stack>
        },
        { key: 'lead', label: 'Thời gian giao', render: s => `${s.leadTimeDays} ngày` }, { key: 'terms', label: 'Thanh toán', render: s => s.paymentTerms }, { key: 'state', label: 'Trạng thái', render: s => <Status value={s.status}/> },
        {
            key: 'actions', label: '', render: s => <Stack direction="row" flexWrap="wrap"><MutationButton permission="procurement.write" onClick={() => open(s)}>Sửa</MutationButton><MutationButton permission="procurement.write" onClick={() => { setOfferSupplier(s); setVariant(''); setCost(''); setMinimum('1'); setPack('1'); setLead(String(s.leadTimeDays)); }}>Thêm báo giá</MutationButton><MutationButton permission="procurement.manage" onClick={() => { setStatusItem(s); setReason(''); setStatusValue(s.status === 'approved' ? 'suspended' : 'approved'); }}>Duyệt / tạm dừng</MutationButton></Stack>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <Panel title="Báo giá sản phẩm" subtitle="Giá vốn, lượng tối thiểu, quy cách và hiệu lực được quản lý riêng." sx={{ mt: 3 }}><QueryState query={offers}>{offers.data && <DataTable rows={offers.data.data} rowKey={o => o.id} columns={[
        { key: 'supplier', label: 'Nhà cung cấp', render: o => list.data?.data.find(s => s.id === o.supplierId)?.name || o.supplierId },
        {
            key: 'sku', label: 'Biến thể', render: o => products.data?.data.flatMap(p => p.variants).find(v => v.id === o.variantId)?.sku || o.variantId
        },
        { key: 'cost', label: 'Đơn giá', render: o => <Amount value={o.unitCost}/> }, { key: 'moq', label: 'Tối thiểu / Quy cách', render: o => `${o.minimumQuantity} / ${o.packSize}` }, { key: 'date', label: 'Hiệu lực tới', render: o => o.validUntil ? dateTime(o.validUntil, shop.timezone) : 'Chưa quy định' }
    ]}/>}</QueryState></Panel>
 <EditDialog open={edit !== undefined} title={edit ? 'Cập nhật nhà cung cấp' : 'Nhà cung cấp mới'} onClose={() => setEdit(undefined)} busy={create.pending || update.pending} actions={<Button variant="contained" disabled={!supplierFormValid || create.pending || update.pending || (!!edit?.id && (!supplierDetail.data || supplierDetail.isLoading))} onClick={async () => { try {
        const body = {
            name: name.trim(), contactLabel: contact.trim(), currency: edit?.currency || shop.currency, leadTimeDays: Number(lead), paymentTerms: terms.trim(), sendMethod: method, approvedAdapterId: method === 'approved_adapter' ? adapter.trim() : null
        };
        if (edit) {
            const current = supplierDetail.data?.data;
            if (!current) return;
            const { currency, ...patch } = body;
            void currency;
            await update.execute({ path: { resourceId: current.id }, version: current.version, body: { ...patch, expectedVersion: current.version } });
        }
        else
            await create.execute({ body });
        setEdit(undefined);
    }
    catch { /* preserve */ } }}>Lưu</Button>}><ErrorNotice error={create.error || update.error || supplierDetail.error}/><Stack gap={2}><TextField label="Tên nhà cung cấp" value={name} onChange={e => setName(e.target.value)} inputProps={{ maxLength: 160 }}/><TextField label="Đầu mối liên hệ" value={contact} onChange={e => setContact(e.target.value)} inputProps={{ maxLength: 200 }}/><TextField label="Thời gian giao (ngày)" type="number" value={lead} onChange={e => setLead(e.target.value)} inputProps={{ min: 0, step: 1 }}/><TextField label="Điều kiện thanh toán" value={terms} onChange={e => setTerms(e.target.value)} multiline inputProps={{ maxLength: 500 }}/><TextField label="Cách gửi đơn" select value={method} onChange={e => setMethod(e.target.value as typeof method)}><MenuItem value="manual">Thủ công, có xác nhận</MenuItem><MenuItem value="approved_adapter">Adapter đã được duyệt</MenuItem></TextField>{method === 'approved_adapter' && <TextField label="Mã adapter đã được duyệt" value={adapter} onChange={e => setAdapter(e.target.value)}/>}<Alert severity="info">Tạo hồ sơ không tự cấp quyền mua hoặc thanh toán.</Alert></Stack></EditDialog>
 <EditDialog open={!!statusItem} title="Đổi trạng thái nhà cung cấp" onClose={() => setStatusItem(null)} busy={status.pending} actions={<Button variant="contained" disabled={reason.trim().length < 5 || status.pending || !supplierDetail.data || supplierDetail.isLoading} onClick={async () => { const current = supplierDetail.data?.data; if (!current)
        return; try {
        await status.execute({ path: { resourceId: current.id }, version: current.version, body: { expectedVersion: current.version, status: statusValue, reason: reason.trim() } });
        setStatusItem(null);
    }
    catch { /* visible */ } }}>Xác nhận</Button>}><ErrorNotice error={status.error || supplierDetail.error}/><Stack gap={2}><Typography>{supplierDetail.data?.data.name || statusItem?.name}</Typography><TextField label="Trạng thái" select value={statusValue} onChange={e => setStatusValue(e.target.value as typeof statusValue)}><MenuItem value="approved">Duyệt nhà cung cấp</MenuItem><MenuItem value="suspended">Tạm dừng</MenuItem><MenuItem value="archived">Ngừng sử dụng</MenuItem></TextField><TextField label="Lý do" value={reason} onChange={e => setReason(e.target.value)} multiline inputProps={{ maxLength: 1000 }}/></Stack></EditDialog>
 <EditDialog open={!!offerSupplier} title={`Báo giá — ${offerSupplier?.name || ''}`} onClose={() => setOfferSupplier(null)} busy={addOffer.pending} actions={<Button variant="contained" disabled={!offerFormValid || addOffer.pending} onClick={async () => { if (!offerSupplier)
        return; try {
        await addOffer.execute({ body: {
                supplierId: offerSupplier.id, variantId: variant, unitCost: { amount: cost, currency: offerSupplier.currency }, minimumQuantity: Number(minimum), packSize: Number(pack), leadTimeDays: Number(lead), validUntil: null
            } });
        setOfferSupplier(null);
    }
    catch { /* visible */ } }}>Lưu báo giá mới</Button>}><ErrorNotice error={addOffer.error}/><Stack gap={2}><TextField label="Biến thể" select value={variant} onChange={e => setVariant(e.target.value)}>{products.data?.data.flatMap(p => p.variants.map(v => <MenuItem key={v.id} value={v.id}>{p.name} · {v.name} · {v.sku}</MenuItem>))}</TextField><TextField label="Giá nhập đơn vị" value={cost} onChange={e => setCost(e.target.value)}/><Stack direction="row" gap={2}><TextField label="Lượng tối thiểu" type="number" value={minimum} onChange={e => setMinimum(e.target.value)} inputProps={{ min: 1, step: 1 }}/><TextField label="Bội số đóng gói" type="number" value={pack} onChange={e => setPack(e.target.value)} inputProps={{ min: 1, step: 1 }}/></Stack><TextField label="Thời gian giao (ngày)" type="number" value={lead} onChange={e => setLead(e.target.value)} inputProps={{ min: 0, step: 1 }}/></Stack></EditDialog></>;
}
export function ReplenishmentPage() {
    const { shop } = useScope();
    const navigate = useNavigate();
    const suggestions = useApi('listPurchaseSuggestions', { query: useListQuery() });
    const rules = useApi('listReorderRules', { query: { limit: 100 } });
    const offers = useApi('listSupplierOffers', { query: { limit: 100 } });
    const suppliers = useApi('listSuppliers', { query: { limit: 100 } });
    const budgets = useApi('listBudgetPolicies', {}, useCan('operations.read'));
    const evaluate = useCommand('evaluateReorder', ['listPurchaseSuggestions']);
    const purchase = useCommand('createPurchaseOrder', ['listPurchaseOrders', 'listPurchaseSuggestions']);
    const create = useCommand('createReorderRule', ['listReorderRules']);
    const update = useCommand('updateReorderRule', ['listReorderRules']);
    const [tab, setTab] = useState(0), [edit, setEdit] = useState<ReorderRule | null | undefined>(), [offerId, setOffer] = useState(''), [reorder, setReorder] = useState('5'), [target, setTarget] = useState('20'), [safety, setSafety] = useState('3'), [mode, setMode] = useState<ReorderRule['mode']>('draft_for_approval'), [enabled, setEnabled] = useState(true), [budget, setBudget] = useState(''), [autoAck, setAutoAck] = useState(false);
    const approvedSupplierIds = new Set(suppliers.data?.data.filter(supplier => supplier.status === 'approved').map(supplier => supplier.id) || []);
    const eligibleOffers = offers.data?.data.filter(offer => approvedSupplierIds.has(offer.supplierId) && offerIsCurrent(offer)) || [];
    const ruleFormValid = !!offerId && Number.isInteger(Number(reorder)) && Number(reorder) >= 0 && Number.isInteger(Number(target)) && Number(target) >= Number(reorder) && Number.isInteger(Number(safety)) && Number(safety) >= 0 && (mode !== 'auto_send' || (!!budget && autoAck));
    const open = (r: ReorderRule | null) => { setEdit(r); setOffer(r?.supplierOfferId || ''); setReorder(String(r?.reorderPoint ?? 5)); setTarget(String(r?.targetQuantity ?? 20)); setSafety(String(r?.safetyStock ?? 3)); setMode(r?.mode || 'draft_for_approval'); setEnabled(r?.enabled ?? true); setBudget(r?.budgetPolicyId || ''); setAutoAck(false); };
    return <><PageHeader title="Nhập lại hàng" subtitle="Trừ hàng đã đặt trước khi đề xuất mua thêm. Tự gửi đơn chỉ khi được bật và đủ hạn mức." actions={<><MutationButton permission="procurement.manage" onClick={() => open(null)}>Thêm quy tắc</MutationButton><MutationButton permission="procurement.write" variant="contained" busy={evaluate.pending} onClick={() => void evaluate.execute().catch(() => undefined)}>Đánh giá nhu cầu nhập</MutationButton></>}/><ErrorNotice error={evaluate.error || purchase.error}/><Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ mb: 2 }}><Tab label="Đề nghị nhập"/><Tab label="Quy tắc theo SKU"/></Tabs>{tab === 0 ? <Panel><Toolbar /><QueryState query={suggestions}>{suggestions.data && <><DataTable rows={suggestions.data.data} rowKey={r => r.id} columns={[
        { key: 'sku', label: 'Biến thể', render: r => r.variantId }, { key: 'supplier', label: 'Nhà cung cấp', render: r => suppliers.data?.data.find(supplier => supplier.id === offers.data?.data.find(offer => offer.id === r.supplierOfferId)?.supplierId)?.name || 'Chưa xác minh nhà cung cấp' }, { key: 'available', label: 'Có thể bán', align: 'right', render: r => r.available }, { key: 'incoming', label: 'Đang về', align: 'right', render: r => r.confirmedInbound }, { key: 'proposed', label: 'Đã đề xuất', align: 'right', render: r => r.openProposalQuantity },
        {
            key: 'qty', label: 'Nên nhập', align: 'right', render: r => <Typography color="primary.main" fontWeight={700}>{r.suggestedQuantity}</Typography>
        },
        { key: 'reason', label: 'Căn cứ', render: r => r.reason },
        {
            key: 'action', label: '', render: r => <MutationButton permission="procurement.write" disabled={!!r.activePurchaseOrderId || r.suggestedQuantity <= 0 || !eligibleOffers.some(offer => offer.id === r.supplierOfferId)} busy={purchase.pending} onClick={async () => { const o = eligibleOffers.find(o => o.id === r.supplierOfferId); if (!o)
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
 <EditDialog open={edit !== undefined} title="Quy tắc nhập lại" onClose={() => setEdit(undefined)} busy={create.pending || update.pending} actions={<Button variant="contained" disabled={!ruleFormValid || create.pending || update.pending} onClick={async () => { const o = eligibleOffers.find(o => o.id === offerId); if (!o)
        return; const body = {
        variantId: o.variantId, warehouseId: edit?.warehouseId || shop.defaultWarehouseId, supplierOfferId: offerId, reorderPoint: Number(reorder), targetQuantity: Number(target), safetyStock: Number(safety), mode, enabled, budgetPolicyId: budget || null
    }; try {
        if (edit)
            await update.execute({ path: { resourceId: edit.id }, body: { ...body, expectedVersion: edit.version } });
        else
            await create.execute({ body });
        setEdit(undefined);
    }
    catch { /* visible */ } }}>Lưu quy tắc</Button>}><ErrorNotice error={create.error || update.error}/><Stack gap={2}><TextField label="Báo giá / SKU" select value={offerId} onChange={e => setOffer(e.target.value)}>{eligibleOffers.map(o => <MenuItem key={o.id} value={o.id}>{o.variantId} · {o.supplierId} · {o.unitCost.amount} {o.unitCost.currency} · MOQ {o.minimumQuantity} / quy cách {o.packSize}</MenuItem>)}</TextField><Stack direction="row" gap={1}><TextField label="Ngưỡng nhập" type="number" value={reorder} onChange={e => setReorder(e.target.value)} inputProps={{ min: 0, step: 1 }}/><TextField label="Nhập tới" type="number" value={target} onChange={e => setTarget(e.target.value)} inputProps={{ min: Math.max(0, Number(reorder) || 0), step: 1 }} error={Number.isFinite(Number(target)) && Number(target) < Number(reorder)}/><TextField label="Tồn an toàn" type="number" value={safety} onChange={e => setSafety(e.target.value)} inputProps={{ min: 0, step: 1 }}/></Stack><TextField label="Mức tự động" select value={mode} onChange={e => setMode(e.target.value as typeof mode)}><MenuItem value="notify_only">1 · Chỉ cảnh báo</MenuItem><MenuItem value="draft_for_approval">2 · Lập nháp chờ duyệt</MenuItem><MenuItem value="auto_send">3 · Tự gửi trong hạn mức</MenuItem></TextField>{mode === 'auto_send' && <><Alert severity="warning">Không bao gồm quyền chuyển tiền. Backend phải kiểm nhà cung cấp, giá, lượng, ngân sách và chính sách trước mỗi lần gửi.</Alert><TextField label="Ngân sách mua hàng đã duyệt" select value={budget} onChange={e => setBudget(e.target.value)}>{budgets.data?.data.filter(b => b.kind === 'procurement' && b.enabled && b.limitAmount).map(b => <MenuItem key={b.id} value={b.id}>{b.id} · {b.limitAmount?.amount} {b.limitAmount?.currency}</MenuItem>)}</TextField><FormControlLabel label="Tôi hiểu phạm vi tự gửi và đã kiểm chính sách" control={<Checkbox checked={autoAck} onChange={e => setAutoAck(e.target.checked)}/>} /></>}<FormControlLabel label="Bật quy tắc" control={<Checkbox checked={enabled} onChange={e => setEnabled(e.target.checked)}/>} /></Stack></EditDialog></>;
}
type PurchaseDraftLine = { key: number; supplierOfferId: string; quantity: string };

function quantityMatchesOffer(quantity: string, offer: SupplierOffer | undefined) {
    const value = Number(quantity);
    return !!offer && Number.isInteger(value) && value >= offer.minimumQuantity && value % offer.packSize === 0;
}

function offerIsCurrent(offer: SupplierOffer) {
    return !offer.validUntil || Date.parse(offer.validUntil) > Date.now();
}

export function PurchasesPage() {
    const { shop } = useScope();
    const list = useApi('listPurchaseOrders', { query: useListQuery() });
    const suppliers = useApi('listSuppliers', { query: { limit: 100 } });
    const offers = useApi('listSupplierOffers', { query: { limit: 100 } });
    const create = useCommand('createPurchaseOrder', ['listPurchaseOrders']);
    const [open, setOpen] = useState(false), [supplierId, setSupplierId] = useState(''), [poLines, setPoLines] = useState<PurchaseDraftLine[]>([{ key: 1, supplierOfferId: '', quantity: '1' }]), [nextLineKey, setNextLineKey] = useState(2), [selected, setSelected] = useState<string | null>(null), [draftCommit, setDraftCommit] = useState<{ scope: string | null; sequence: number }>();
    const selectedSupplier = suppliers.data?.data.find(supplier => supplier.id === supplierId);
    const availableOffers = offers.data?.data.filter(offer => offer.supplierId === supplierId && offer.unitCost.currency === selectedSupplier?.currency && offerIsCurrent(offer)) || [];
    const canCreate = !!selectedSupplier && selectedSupplier.status === 'approved' && poLines.length > 0 && poLines.every(line => quantityMatchesOffer(line.quantity, availableOffers.find(offer => offer.id === line.supplierOfferId))) && new Set(poLines.map(line => line.supplierOfferId)).size === poLines.length && !create.pending;
    const startPurchase = () => {
        setSupplierId('');
        setPoLines([{ key: 1, supplierOfferId: '', quantity: '1' }]);
        setNextLineKey(2);
        setOpen(true);
    };
    const selectSupplier = (nextSupplierId: string) => {
        setSupplierId(nextSupplierId);
        setPoLines([{ key: 1, supplierOfferId: '', quantity: '1' }]);
        setNextLineKey(2);
    };
    const selectOffer = (key: number, supplierOfferId: string) => {
        const offer = availableOffers.find(item => item.id === supplierOfferId);
        const quantity = offer ? String(Math.ceil(offer.minimumQuantity / offer.packSize) * offer.packSize) : '1';
        setPoLines(lines => lines.map(line => line.key === key ? { ...line, supplierOfferId, quantity } : line));
    };
    const submit = async () => {
        if (!canCreate || !selectedSupplier) return;
        const lines = poLines.map(line => {
            const offer = availableOffers.find(item => item.id === line.supplierOfferId);
            if (!offer) throw new Error('Báo giá không còn khả dụng. Tải lại danh sách trước khi lập đơn.');
            return { variantId: offer.variantId, supplierOfferId: offer.id, quantity: Number(line.quantity) };
        });
        try {
            const result = await create.execute({ body: { supplierId: selectedSupplier.id, warehouseId: shop.defaultWarehouseId, suggestionId: null, lines } });
            setDraftCommit(previous => ({ scope: null, sequence: (previous?.sequence || 0) + 1 }));
            setOpen(false);
            setSelected(result.data.id);
        }
        catch { /* keep the complete draft visible after API rejection */ }
    };
    return <><PageHeader title="Đơn mua hàng" subtitle="Duyệt đúng nội dung trước khi gửi. Kết quả gửi chưa rõ phải đối chiếu, không gửi lại mù quáng." actions={<MutationButton permission="procurement.write" variant="contained" onClick={startPurchase}>Tạo đơn mua</MutationButton>}/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={p => p.id} columns={[
        { key: 'id', label: 'Đơn mua', render: p => <Typography fontWeight={650}>{p.id}</Typography> }, { key: 'supplier', label: 'Nhà cung cấp', render: p => suppliers.data?.data.find(s => s.id === p.supplierId)?.name || p.supplierId }, { key: 'total', label: 'Tổng cam kết', render: p => <Amount value={p.total}/> }, { key: 'status', label: 'Trạng thái', render: p => <Status value={p.status}/> }, { key: 'ref', label: 'Tham chiếu', render: p => p.externalReference || 'Chưa gửi' }, { key: 'action', label: '', render: p => <Button onClick={() => setSelected(p.id)}>Xem chi tiết</Button> }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
    <EditDialog open={open} title="Đơn mua mới" onClose={() => setOpen(false)} busy={create.pending} draftCommit={draftCommit} actions={<Button variant="contained" disabled={!canCreate} onClick={() => void submit()}>Lưu đơn nháp</Button>}>
        <ErrorNotice error={create.error}/><Stack gap={2}>
            <TextField label="Nhà cung cấp đã duyệt" select value={supplierId} onChange={event => selectSupplier(event.target.value)}>{suppliers.data?.data.filter(supplier => supplier.status === 'approved').map(supplier => <MenuItem key={supplier.id} value={supplier.id}>{supplier.name}</MenuItem>)}</TextField>
            {!suppliers.data?.data.some(supplier => supplier.status === 'approved') && <Alert severity="warning">Chưa có nhà cung cấp được duyệt để lập đơn.</Alert>}
            {poLines.map((line, index) => {
                const lineOffer = availableOffers.find(offer => offer.id === line.supplierOfferId);
                const choices = availableOffers.filter(offer => !poLines.some(other => other.key !== line.key && other.supplierOfferId === offer.id));
                return <Box key={line.key} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1}>
                        <Typography fontWeight={650}>Dòng hàng {index + 1}</Typography>
                        {poLines.length > 1 && <Button color="inherit" onClick={() => setPoLines(lines => lines.filter(item => item.key !== line.key))}>Xóa dòng {index + 1}</Button>}
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} sx={{ mt: 1 }}>
                        <TextField fullWidth label={`Báo giá dòng ${index + 1}`} select value={line.supplierOfferId} onChange={event => selectOffer(line.key, event.target.value)}>
                            {choices.map(offer => <MenuItem key={offer.id} value={offer.id}>{offer.variantId} · {offer.unitCost.amount} {offer.unitCost.currency} · MOQ {offer.minimumQuantity} / quy cách {offer.packSize}</MenuItem>)}
                        </TextField>
                        <TextField label={`Số lượng dòng ${index + 1}`} type="number" value={line.quantity} onChange={event => setPoLines(lines => lines.map(item => item.key === line.key ? { ...item, quantity: event.target.value } : item))} inputProps={{ min: lineOffer?.minimumQuantity || 1, step: lineOffer?.packSize || 1 }} error={!!lineOffer && !!line.quantity && !quantityMatchesOffer(line.quantity, lineOffer)} helperText={lineOffer ? `Số nguyên, tối thiểu ${lineOffer.minimumQuantity} và bội số ${lineOffer.packSize}.` : 'Chọn báo giá cùng nhà cung cấp.'}/>
                    </Stack>
                </Box>;
            })}
            <Button disabled={!supplierId || !availableOffers.some(offer => !poLines.some(line => line.supplierOfferId === offer.id))} onClick={() => { setPoLines(lines => [...lines, { key: nextLineKey, supplierOfferId: '', quantity: '1' }]); setNextLineKey(key => key + 1); }}>Thêm dòng hàng</Button>
            <Alert severity="info">Giá theo từng báo giá đã chọn; tổng cam kết chính thức do API trả về và được gắn vào nội dung xin duyệt.</Alert>
        </Stack>
    </EditDialog>{selected && <PurchaseDialog resourceId={selected} onClose={() => setSelected(null)}/>}</>;
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
    const [action, setAction] = useState<'send' | 'cancel' | 'confirm' | null>(null), [external, setExternal] = useState(''), [proof, setProof] = useState(''), [draftCommit, setDraftCommit] = useState<{ scope: string | null; sequence: number }>();
    const unresolvedSend = useSyncExternalStore(subscribeIntents, intentSnapshot, intentSnapshot).some(intent => intent.shopId === shop.id && intent.operation === 'sendPurchaseOrder');
    const sendPurchase = async () => {
        try {
            return await send.execute({ path: { resourceId }, body: { expectedVersion: p?.version || 1, approvalId: p?.approvalId || '', intentHash: p?.intentHash || '' } });
        }
        catch (error) {
            if (error instanceof UnknownResultError) setAction(null);
            throw error;
        }
    };
    return <><EditDialog open title={`Đơn mua ${resourceId}`} onClose={onClose} actions={<Button onClick={onClose}>Đóng</Button>}><ErrorNotice error={approval.error || send.error}/><QueryState query={get}>{p && <Stack gap={2}><Status value={p.status}/><DetailLine label="Nhà cung cấp">{p.supplierId}</DetailLine><DetailLine label="Tổng cam kết"><Amount value={p.total}/></DetailLine><DataTable rows={p.lines} rowKey={l => l.id} columns={[
        { key: 'sku', label: 'Biến thể', render: l => l.variantId }, { key: 'qty', label: 'Đặt', render: l => l.quantity }, { key: 'received', label: 'Đã nhận', render: l => l.receivedQuantity }, { key: 'cost', label: 'Đơn giá', render: l => <Amount value={l.unitCost}/> }
    ]}/><Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>Hash nội dung: {p.intentHash}</Typography><Stack direction="row" gap={1} flexWrap="wrap"><MutationButton permission="procurement.write" allowedActions={p.allowedActions} action="request_approval" busy={approval.pending} onClick={() => void approval.execute({ path: { resourceId }, body: { expectedVersion: p.version } }).catch(() => undefined)}>Xin phê duyệt</MutationButton><MutationButton permission="procurement.send" allowedActions={p.allowedActions} action="send" variant="contained" disabled={unresolvedSend} onClick={() => setAction('send')}>Gửi đơn mua</MutationButton><MutationButton permission="procurement.write" allowedActions={p.allowedActions} action="confirm" onClick={() => setAction('confirm')}>Nhà cung cấp đã xác nhận</MutationButton><MutationButton permission="procurement.write" allowedActions={p.allowedActions} action="cancel" color="error" onClick={() => setAction('cancel')}>Hủy đơn</MutationButton></Stack>{p.approvalId && <RouteLink to={`/s/${shop.id}/approvals`}>Xem phê duyệt {p.approvalId}</RouteLink>}{['confirmed', 'part_received'].includes(p.status) && <RouteLink to={`/s/${shop.id}/receipts?purchaseOrderId=${p.id}`}>Nhận hàng theo đơn này</RouteLink>}{(p.status === 'unknown' || unresolvedSend) && <Alert severity="warning">Chưa xác minh kết quả gửi. Không gửi lại; hãy kiểm tra trạng thái lệnh trước khi tiếp tục.</Alert>}</Stack>}</QueryState></EditDialog>
 <ConfirmDialog open={action === 'send' && !unresolvedSend} title="Gửi đơn mua đã duyệt" description="Chỉ gửi đúng nội dung được duyệt. Quyền mua hàng không cho phép tự chuyển tiền." onClose={() => setAction(null)} error={send.error} busy={send.pending} onConfirm={sendPurchase}/><ConfirmDialog open={action === 'cancel'} title="Hủy đơn mua" description="Chỉ hủy trong giai đoạn và điều kiện được API cho phép." requireReason onClose={() => setAction(null)} error={cancel.error} busy={cancel.pending} onConfirm={reason => cancel.execute({ path: { resourceId }, body: { expectedVersion: p?.version || 1, reason } })}/>
 <EditDialog open={action === 'confirm'} title="Ghi nhận xác nhận của nhà cung cấp" onClose={() => setAction(null)} busy={confirm.pending} draftCommit={draftCommit} actions={<Button variant="contained" disabled={!external || !proof || confirm.pending} onClick={async () => { try {
        await confirm.execute({ path: { resourceId }, body: { expectedVersion: p?.version || 1, externalReference: external, supplierConfirmationRef: proof } });
        setDraftCommit(previous => ({ scope: null, sequence: (previous?.sequence || 0) + 1 }));
        setAction(null);
    }
    catch { /* visible */ } }}>Ghi xác nhận</Button>}><ErrorNotice error={confirm.error}/><Stack gap={2}><TextField label="Tham chiếu đơn phía nhà cung cấp" value={external} onChange={e => setExternal(e.target.value)}/><TextField label="Mã bằng chứng xác nhận" value={proof} onChange={e => setProof(e.target.value)}/></Stack></EditDialog></>;
}
export function ReceiptsPage() {
    const list = useApi('listGoodsReceipts', { query: useListQuery() });
    const orders = useApi('listPurchaseOrders', { query: { limit: 100 } });
    const [open, setOpen] = useState(false), [orderId, setOrderId] = useState(''), [document, setDocument] = useState(''), [quantities, setQuantities] = useState<Record<string, { accepted: string; rejected: string; reason: string }>>({}), [selectedId, setSelectedId] = useState<string | null>(null), [confirmPost, setConfirmPost] = useState(false);
    const purchaseOrder = useApi('getPurchaseOrder', { path: { resourceId: orderId } }, !!orderId);
    const order = purchaseOrder.data?.data;
    const receiptDetail = useApi('getGoodsReceipt', { path: { resourceId: selectedId || '' } }, !!selectedId);
    const receipt: GoodsReceipt | undefined = receiptDetail.data?.data;
    const create = useCommand('createGoodsReceipt', ['listGoodsReceipts']);
    const post = useCommand('postGoodsReceipt', ['getGoodsReceipt', 'getPurchaseOrder', 'listGoodsReceipts', 'listPurchaseOrders', 'listStockSnapshots', 'listDebtItems', 'listJournals']);
    const receiptLines = order?.lines.flatMap(line => {
        const input = quantities[line.id] || { accepted: '0', rejected: '0', reason: '' };
        const accepted = Number(input.accepted || 0), rejected = Number(input.rejected || 0);
        return accepted + rejected > 0 ? [{ purchaseLineId: line.id, acceptedQuantity: accepted, rejectedQuantity: rejected, reason: input.reason.trim() }] : [];
    }) || [];
    const receiptLinesValid = !!order && receiptLines.length > 0 && receiptLines.every(input => {
        const original = order.lines.find(line => line.id === input.purchaseLineId);
        const remaining = original ? original.quantity - original.receivedQuantity - original.rejectedQuantity : 0;
        return Number.isInteger(input.acceptedQuantity) && input.acceptedQuantity >= 0 && Number.isInteger(input.rejectedQuantity) && input.rejectedQuantity >= 0 && input.acceptedQuantity + input.rejectedQuantity <= remaining && (input.rejectedQuantity === 0 || !!input.reason) && input.reason.length <= 1000;
    });
    const createValid = !!order && ['confirmed', 'part_received'].includes(order.status) && document.trim().length > 0 && document.trim().length <= 160 && receiptLinesValid && !create.pending;
    const createReceipt = async () => {
        if (!createValid || !order) return;
        try {
            await create.execute({ body: { purchaseOrderId: order.id, expectedPurchaseVersion: order.version, sourceDocumentRef: document.trim(), lines: receiptLines } });
            setOpen(false);
            setOrderId('');
            setDocument('');
            setQuantities({});
        }
        catch { /* retain checked quantities and document after API rejection */ }
    };
    const postReceipt = async () => {
        if (!receipt || receipt.status !== 'draft') return;
        try {
            await post.execute({ path: { resourceId: receipt.id }, body: { expectedVersion: receipt.version } });
            setConfirmPost(false);
        }
        catch { /* leave the dialog and user intent visible for reconciliation */ }
    };
    return <><PageHeader title="Nhận hàng" subtitle="Nhận từng phần, ghi hàng đạt/hỏng; chỉ hàng đạt làm tăng tồn và công nợ mô phỏng." actions={<MutationButton permission="procurement.write" variant="contained" onClick={() => { setOrderId(''); setDocument(''); setQuantities({}); setOpen(true); }}>Tạo phiếu nhận</MutationButton>}/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={r => r.id} columns={[
        { key: 'id', label: 'Phiếu nhận', render: r => r.id }, { key: 'po', label: 'Đơn mua', render: r => r.purchaseOrderId }, { key: 'source', label: 'Chứng từ nguồn', render: r => r.sourceDocumentRef }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.status}/> },
        {
            key: 'action', label: '', render: r => <MutationButton permission="procurement.receive" disabled={r.status !== 'draft'} onClick={() => { setConfirmPost(false); setSelectedId(r.id); }}>Xem / ghi nhận phiếu</MutationButton>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
    <EditDialog open={open} title="Phiếu nhận hàng mới" onClose={() => setOpen(false)} busy={create.pending} actions={<Button variant="contained" disabled={!createValid} onClick={() => void createReceipt()}>Tạo phiếu nháp</Button>}>
        <ErrorNotice error={create.error}/><Stack gap={2}>
            <TextField label="Đơn mua đã xác nhận" select value={orderId} onChange={event => { setOrderId(event.target.value); setQuantities({}); }}>
                {orders.data?.data.filter(item => ['confirmed', 'part_received'].includes(item.status)).map(item => <MenuItem key={item.id} value={item.id}>{item.id}</MenuItem>)}
            </TextField>
            <TextField label="Mã phiếu giao / chứng từ nguồn" value={document} onChange={event => setDocument(event.target.value)} inputProps={{ maxLength: 160 }}/>
            {orderId && <QueryState query={purchaseOrder}>{order && <Stack gap={2}>
                {order.lines.map(line => {
                    const input = quantities[line.id] || { accepted: '0', rejected: '0', reason: '' };
                    const remaining = line.quantity - line.receivedQuantity - line.rejectedQuantity;
                    const invalid = !!input.accepted && !Number.isInteger(Number(input.accepted)) || !!input.rejected && !Number.isInteger(Number(input.rejected)) || Number(input.accepted || 0) + Number(input.rejected || 0) > remaining || (Number(input.rejected || 0) > 0 && !input.reason.trim());
                    return <Box key={line.id} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                        <Typography fontWeight={650}>{line.variantId}</Typography>
                        <Typography variant="caption">Đặt {line.quantity} · đã nhận {line.receivedQuantity} · bị từ chối {line.rejectedQuantity} · còn {remaining}</Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} sx={{ my: 1.5 }}>
                            <TextField label={`Nhận đạt ${line.variantId}`} type="number" value={input.accepted} onChange={event => setQuantities(previous => ({ ...previous, [line.id]: { ...input, accepted: event.target.value } }))} inputProps={{ min: 0, max: remaining, step: 1 }} error={invalid}/>
                            <TextField label={`Từ chối / hỏng ${line.variantId}`} type="number" value={input.rejected} onChange={event => setQuantities(previous => ({ ...previous, [line.id]: { ...input, rejected: event.target.value } }))} inputProps={{ min: 0, max: remaining, step: 1 }} error={invalid}/>
                        </Stack>
                        <TextField label={`Ghi chú kiểm hàng ${line.variantId}`} fullWidth value={input.reason} onChange={event => setQuantities(previous => ({ ...previous, [line.id]: { ...input, reason: event.target.value } }))} inputProps={{ maxLength: 1000 }} error={invalid && Number(input.rejected || 0) > 0} helperText={Number(input.rejected || 0) > 0 && !input.reason.trim() ? 'Cần ghi rõ lý do hàng bị từ chối.' : undefined}/>
                    </Box>;
                })}
            </Stack>}</QueryState>}
        </Stack>
    </EditDialog>
    <EditDialog open={!!selectedId} title={`Phiếu nhận ${selectedId || ''}`} onClose={() => { setConfirmPost(false); setSelectedId(null); }} busy={post.pending} actions={<Stack direction="row" gap={1}>
        <Button onClick={() => { setConfirmPost(false); setSelectedId(null); }}>Đóng</Button>
        {receipt?.status === 'draft' && <MutationButton permission="procurement.receive" variant="contained" busy={post.pending} disabled={receiptDetail.isLoading} onClick={() => setConfirmPost(true)}>Kiểm & ghi nhận vào kho</MutationButton>}
    </Stack>}>
        <ErrorNotice error={receiptDetail.error || post.error}/><QueryState query={receiptDetail}>{receipt && <Stack gap={1}>
            <DetailLine label="Đơn mua">{receipt.purchaseOrderId}</DetailLine>
            <DetailLine label="Chứng từ nguồn">{receipt.sourceDocumentRef}</DetailLine>
            <DetailLine label="Trạng thái"><Status value={receipt.status}/></DetailLine>
            <DataTable rows={receipt.lines} rowKey={line => line.purchaseLineId} columns={[
                { key: 'line', label: 'Dòng đơn mua', render: line => line.purchaseLineId },
                { key: 'accepted', label: 'Nhận đạt', align: 'right', render: line => line.acceptedQuantity },
                { key: 'rejected', label: 'Từ chối', align: 'right', render: line => line.rejectedQuantity },
                { key: 'reason', label: 'Lý do', render: line => line.reason || '—' },
            ]}/>
            {receipt.status === 'posted' && <Alert severity="success">Phiếu đã được ghi nhận. Ghi sổ kho/công nợ không thể gửi lại từ trạng thái này.</Alert>}
        </Stack>}</QueryState>
    </EditDialog>
    <ConfirmDialog open={confirmPost && !!selectedId && receipt?.status === 'draft'} title="Ghi nhận hàng đã kiểm vào kho" description={`Phiếu ${receipt?.id || ''}: ${receipt?.lines.map(line => `${line.acceptedQuantity} nhận đạt, ${line.rejectedQuantity} từ chối`).join('; ') || ''}. Chỉ lượng đạt tăng tồn và công nợ mô phỏng; API kiểm lại version và chống ghi trùng.`} onClose={() => setConfirmPost(false)} busy={post.pending} error={post.error} onConfirm={postReceipt}/></>;
}
