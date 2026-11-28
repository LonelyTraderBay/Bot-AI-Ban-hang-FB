import { draftEqual, useVersionedDraft } from '@/shared/model/versioned-draft';
import { markDraftClean, useDraftForm } from '@/shared/model/dirty-drafts';
import { DraftConflict } from '@/shared/ui/draft-conflict';
import { layoutSx } from '@/shared/ui/layout';
import { ActionGroup, FieldGroup, FormFields, PageSections, SurfaceContent } from '../../shared/ui/composition';
import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, IconButton, MenuItem, TextField, Typography } from '@mui/material';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import type { Order, OrderDraft } from '@botsales/contracts';
import { tokens } from '@botsales/tokens';
import { useApi, useCommand, usePagedApi } from '@/shared/api/hooks';
import { request } from '@/shared/api/client';
import { useScope, useCan, useCanWrite } from '@/shared/model/scope';
import { codePointLength } from '@/shared/model/format';
import { Amount, DetailLine, Panel, MutationButton, ErrorNotice, LookupLoadMore } from '@/shared/ui/components';
import { DraftNotes, DraftQuantity, invalidDraftQuantity } from './draft-inputs';

export function DraftForm({ initial, onSaved, onBusyChange }: {
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
    const canWriteOrders = useCanWrite('orders.write');
    const [customerSearch, setCustomerSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const customers = usePagedApi('listCustomers', { query: { q: customerSearch.trim() || undefined, limit: 20 } }, canReadCustomers);
    const products = usePagedApi('listProducts', { query: { q: productSearch.trim() || undefined, limit: 20 } }, canReadProducts);
    const promotions = usePagedApi('listPromotions', { query: { effective: 'yes', limit: 20 } }, canReadProducts);
    const create = useCommand('createOrder', ['listOrders', 'getDashboard', 'listPaymentReviews']);
    const update = useCommand('updateOrderDraft', ['getOrder', 'listOrders', 'listPaymentReviews']);
    useEffect(() => { onBusyChange?.(create.pending || update.pending); }, [create.pending, update.pending, onBusyChange]);
    const initialNotes = typeof initial?.notes === 'string' ? initial.notes : '';
    const [customerId, setCustomer] = useState(initial?.customerId || params.get('customerId') || ''), [conversationId, setConversation] = useState(initial?.conversationId || params.get('conversationId') || ''), [warehouse, setWarehouse] = useState(initial?.warehouseId || shop.defaultWarehouseId), [addressId, setAddress] = useState(initial?.shippingAddressId || ''), [method, setMethod] = useState<'cod' | 'prepay'>(initial?.paymentMethod || 'cod'), [notes, setNotes] = useState(initialNotes);
    const [promotionId, setPromotion] = useState(initial ? initial.promotionId ?? '' : params.get('promotionId') ?? '');
    const warehouses = usePagedApi('listWarehouses', { query: { status: 'active', limit: 20 } }, useCan('inventory.read'));
    const addresses = usePagedApi('listCustomerAddresses', { path: { customerId }, query: { status: 'active', limit: 20 } }, !!customerId && canReadCustomers);
    const conv = usePagedApi('listConversations', { query: { customerId: customerId || undefined, limit: 20 } }, canReadConversations && !!customerId);
    const [lines, setLines] = useState(initial?.lines.map(l => ({ key: l.id, variantId: l.variantId, variantLabel: `${l.name} · ${l.sku}`, quantity: String(l.quantity) })) || [{ key: crypto.randomUUID(), variantId: '', variantLabel: '', quantity: '1' }]);
    const variants = products.data?.data.filter(p => p.status === 'active').flatMap(p => p.variants.filter(v => v.active).map(v => ({ ...v, productName: p.name }))) || [];
    const duplicateVariants = new Set(lines.map(l => l.variantId).filter(Boolean)).size !== lines.filter(l => l.variantId).length;
    const valid = !!customerId && !!warehouse.trim() && lines.length > 0 && lines.length <= 100 && lines.every(l => l.variantId && l.quantity && !invalidDraftQuantity(l.quantity)) && !duplicateVariants && codePointLength(notes) <= 2_000 && (initial !== undefined || (canReadCustomers && canReadProducts));
    const body: OrderDraft = { customerId, conversationId: conversationId || null, warehouseId: warehouse,
        lines: lines.map(line => ({ variantId: line.variantId, quantity: Number(line.quantity) })), notes,
        paymentMethod: method, shippingAddressId: addressId || null, ...(promotionId ? { promotionId } : {}) };
    const estimateInput = { shopId: shop.id, draft: { ...body, notes: '' } };
    const estimate = useMutation({ mutationFn: (input: typeof estimateInput) =>
        request('estimateOrderDraft', { path: { shopId: input.shopId }, body: input.draft }) });
    const currentEstimate = valid && draftEqual(estimate.variables, estimateInput);
    const price = currentEstimate ? estimate.data?.data : undefined;
    const showEstimate = !resource && canWriteOrders;
    const chooseVariant = (key: string, variantId: string) => {
        const selected = variants.find(v => v.id === variantId);
        setLines(current => current.map(line => line.key === key ? { ...line, variantId, variantLabel: selected ? `${selected.productName} · ${selected.name} · ${selected.sku}` : line.variantLabel } : line));
    };
    const fresh = useApi('getOrder', { path: { orderId: resource?.id || '' } }, !!resource);
    const current = fresh.data && (!resource || fresh.data.data.version >= resource.version) ? fresh.data.data : resource;
    const values = { customerId, conversationId, warehouse, addressId, notes, promotionId, lines: lines.map(line => ({ variantId: line.variantId, quantity: line.quantity })) };
    const editor = useVersionedDraft({
        identity: `${shop.id}:order:${resource?.id || 'new'}`,
        source: current ? orderSnapshot(current) : undefined,
        draft: values,
        apply: value => {
            setCustomer(value.customerId); setConversation(value.conversationId); setWarehouse(value.warehouse); setAddress(value.addressId); setNotes(value.notes); setPromotion(value.promotionId);
            setLines(existing => value.lines.map(line => ({ ...line, key: existing.find(item => item.variantId === line.variantId)?.key || crypto.randomUUID(), variantLabel: existing.find(item => item.variantId === line.variantId)?.variantLabel || '' })));
        }, refresh: () => fresh.refetch({ throwOnError: true }),
    });
    const [creationBaseline] = useState(() => ({ ...values, addressId, method }));
    const bindDraft = useDraftForm(resource ? editor.dirty : !draftEqual(creationBaseline, { ...values, addressId, method }));
    const formRef = useRef<HTMLFormElement>(null);
    const save = async () => { try {
        let response: Awaited<ReturnType<typeof create.execute>>;
        if (resource) {
            const prepared = editor.prepare(); if (!prepared) return;
            response = await update.execute({ path: { orderId: resource.id }, version: prepared.version, body: {
                ...(prepared.patch.customerId !== undefined ? { customerId: body.customerId } : {}),
                ...(prepared.patch.conversationId !== undefined ? { conversationId: body.conversationId } : {}),
                ...(prepared.patch.warehouse !== undefined ? { warehouseId: body.warehouseId } : {}),
                ...(prepared.patch.addressId !== undefined ? { shippingAddressId: addressId || null } : {}),
                ...(prepared.patch.lines !== undefined ? { lines: body.lines } : {}),
                ...(prepared.patch.notes !== undefined ? { notes: body.notes } : {}),
                ...(prepared.patch.promotionId !== undefined ? { promotionId: promotionId || null } : {}),
            } });
        } else response = await create.execute({ body });
        const clean = editor.committed(orderSnapshot(response.data), values, `${shop.id}:order:${response.data.id}`);
        if (clean) { if (formRef.current) markDraftClean(formRef.current); onSaved(response.data); }
        else setCreated(response.data);
    } catch (error) { editor.failed(error); } };
    const selectedCustomer = customers.data?.data.find(customer => customer.id === customerId);
    const staleLookupNames = [
        customers.isError && customers.data ? 'khách hàng' : undefined,
        products.isError && products.data ? 'sản phẩm' : undefined,
        warehouses.isError && warehouses.data ? 'kho xuất' : undefined,
        addresses.isError && addresses.data ? 'địa chỉ giao hàng' : undefined,
        conv.isError && conv.data ? 'hội thoại' : undefined,
    ].filter((name): name is string => Boolean(name));
    return <Box component="form" ref={form => { const element = form as HTMLFormElement | null; formRef.current = element; bindDraft(element); }} onSubmit={event => { event.preventDefault(); if (valid) void save(); }}><PageSections geometry={{ maxWidth: layoutSx.form.transactionWidth.maxWidth }}>
        <ErrorNotice error={create.error || update.error} fieldLabels={{ customerId: 'Khách hàng', conversationId: 'Hội thoại liên quan', variantId: 'Sản phẩm', quantity: 'Số lượng', warehouseId: 'Kho xuất', shippingAddressId: 'Địa chỉ giao hàng', paymentMethod: 'Thanh toán', promotionId: 'Ưu đãi combo', notes: 'Ghi chú chuẩn bị' }}/><DraftConflict editor={editor} labels={{ customerId: 'Khách hàng', conversationId: 'Hội thoại', warehouse: 'Kho xuất', addressId: 'Địa chỉ giao hàng', notes: 'Ghi chú', promotionId: 'Ưu đãi', lines: 'Dòng đơn hàng' }} busy={create.pending || update.pending}/>
        {staleLookupNames.length > 0 && <Alert severity="warning" role="status">Danh sách {staleLookupNames.join(', ')} đã tải có thể đã cũ. Bản nháp được giữ; hãy thử tải lại trước khi lưu.</Alert>}
        {!canReadCustomers && <Alert severity="warning">Bạn cần quyền customers.read để tìm và tạo đơn với khách hàng. Đơn nháp hiện có vẫn giữ nguyên mã khách.</Alert>}
        {!canReadProducts && <Alert severity="warning">Bạn cần quyền catalog.read để tìm và chọn sản phẩm cho đơn hàng.</Alert>}
        {customers.isError && <ErrorNotice error={customers.error}/>}
        {products.isError && <ErrorNotice error={products.error}/>}
        <Panel title="Khách hàng" bodyMode="inset"><FormFields density="compact">
            <TextField size="small" label="Tìm khách hàng" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} disabled={!canReadCustomers}/>
            <TextField id="order-customer" name="customerId" size="small" select label="Khách hàng" SelectProps={{ displayEmpty: true, SelectDisplayProps: { 'aria-labelledby': 'order-customer-label' } }} value={customerId} onChange={e => { setCustomer(e.target.value); setConversation(''); setAddress(''); }} disabled={!canReadCustomers && !resource} required={canReadCustomers} helperText={canReadCustomers ? (customers.isPending ? 'Đang tải khách hàng…' : customers.data?.data.length === 0 ? 'Không tìm thấy khách phù hợp.' : !customerId ? 'Chọn khách hàng để lưu đơn nháp.' : undefined) : undefined}>
                <MenuItem value="" disabled>Chọn khách hàng</MenuItem>
                {customerId && !selectedCustomer && <MenuItem value={customerId}>Đang giữ mã khách: {customerId}</MenuItem>}
                {customers.data?.data.map(customer => <MenuItem key={customer.id} value={customer.id}>{customer.displayName}</MenuItem>)}
            </TextField>
            <LookupLoadMore label="khách hàng" loadedCount={customers.loadedCount} hasMore={customers.hasMore} busy={customers.isLoadingMore} onLoadMore={customers.loadMore}/>
            <TextField id="order-conversation" name="conversationId" size="small" select label="Hội thoại liên quan" SelectProps={{ displayEmpty: true, SelectDisplayProps: { 'aria-labelledby': 'order-conversation-label' } }} value={conversationId} onChange={e => setConversation(e.target.value)} disabled={!canReadConversations || !customerId} helperText={!canReadConversations ? 'Không có quyền đọc hội thoại; liên kết hội thoại là tùy chọn.' : undefined}>
                <MenuItem value="">Không liên kết</MenuItem>{conv.data?.data.filter(conversation => conversation.customerId === customerId).map(conversation => <MenuItem key={conversation.id} value={conversation.id}>{conversation.displayName} · {conversation.id}</MenuItem>)}
            </TextField>
            <LookupLoadMore label="hội thoại" loadedCount={conv.loadedCount} hasMore={conv.hasMore} busy={conv.isLoadingMore} onLoadMore={conv.loadMore}/>
        </FormFields></Panel>
        <Panel title="Sản phẩm đặt mua" bodyMode="inset" action={<Button startIcon={<AddRounded />} disabled={lines.length >= 100} onClick={() => setLines(current => [...current, { key: crypto.randomUUID(), variantId: '', variantLabel: '', quantity: '1' }])}>Thêm dòng</Button>}>
            <FormFields density="compact">
                <TextField size="small" label="Tìm sản phẩm hoặc SKU" value={productSearch} onChange={e => setProductSearch(e.target.value)} disabled={!canReadProducts}/>
                {lines.map((line, index) => {
                    const selectedVariant = variants.find(variant => variant.id === line.variantId);
                    return <FormFields key={line.key} direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'start' }}>
                        <TextField id={`order-product-${line.key}`} name={`lines.${index}.variantId`} label={`Sản phẩm ${index + 1}`} select fullWidth SelectProps={{ displayEmpty: true, SelectDisplayProps: { 'aria-labelledby': `order-product-${line.key}-label` } }} value={line.variantId} disabled={!canReadProducts && !resource} onChange={event => chooseVariant(line.key, event.target.value)} error={duplicateVariants && !!line.variantId} helperText={duplicateVariants && line.variantId ? 'Không thêm cùng một biến thể hai lần; hãy gộp số lượng vào một dòng.' : undefined}>
                            {line.variantId && !selectedVariant && <MenuItem value={line.variantId}>{line.variantLabel || `Đang giữ biến thể: ${line.variantId}`}</MenuItem>}
                            {variants.map(variant => <MenuItem key={variant.id} value={variant.id} disabled={lines.some(other => other.key !== line.key && other.variantId === variant.id)}>{variant.productName} · {variant.name} · {variant.sku}</MenuItem>)}
                            <MenuItem disabled value="">{products.isPending ? 'Đang tải sản phẩm…' : canReadProducts && variants.length === 0 ? 'Không tìm thấy sản phẩm/biến thể phù hợp' : 'Chọn sản phẩm'}</MenuItem>
                        </TextField>
                        <DraftQuantity name={`lines.${index}.quantity`} value={line.quantity} onChange={quantity => setLines(current => current.map(item => item.key === line.key ? { ...item, quantity } : item))} />
                        <IconButton aria-label={`Bỏ dòng ${index + 1}`} disabled={lines.length === 1} sx={{ alignSelf: 'start' }} onClick={() => setLines(current => current.filter(item => item.key !== line.key))}><DeleteOutlineRounded /></IconButton>
                    </FormFields>;
                })}
                <LookupLoadMore label="sản phẩm" loadedCount={products.loadedCount} hasMore={products.hasMore} busy={products.isLoadingMore} onLoadMore={products.loadMore}/>
                {canReadProducts && <>
                    {promotions.error && <ErrorNotice error={promotions.error} />}
                    <TextField select name="promotionId" label="Ưu đãi combo" value={promotionId} onChange={event => setPromotion(event.target.value)}
                        helperText="API kiểm đủ SKU, tồn kho, hiệu lực và biên lợi nhuận.">
                        <MenuItem value="">Không áp dụng</MenuItem>
                        {promotionId && !promotions.data?.data.some(item => item.id === promotionId) && <MenuItem value={promotionId}>{`Ưu đãi đã chọn · ${promotionId}`}</MenuItem>}
                        {promotions.data?.data.map(item => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                    </TextField>
                    <LookupLoadMore label="ưu đãi" loadedCount={promotions.loadedCount} hasMore={promotions.hasMore} busy={promotions.isLoadingMore} onLoadMore={promotions.loadMore} />
                </>}
                {lines.length >= 100 && <Alert severity="warning">Đơn nháp đạt giới hạn 100 dòng theo hợp đồng.</Alert>}
                <Typography variant="body2" color="text.secondary">Tổng tiền và tồn kho được kiểm tra khi lấy báo giá và xác nhận đơn.</Typography>
            </FormFields>
        </Panel>
        <Panel title="Giao hàng và thanh toán" bodyMode="inset"><FormFields density="compact">
            <FormFields density="compact" direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'start' }}>
                <TextField select name="warehouseId" label="Kho xuất" value={warehouse} onChange={e => setWarehouse(e.target.value)} fullWidth disabled={create.pending || update.pending} sx={{ flex: 1, minWidth: 0 }}>
                    {warehouse && !warehouses.data?.data.some(w => w.id === warehouse) && <MenuItem value={warehouse}>Đang giữ kho {warehouse}</MenuItem>}
                    {warehouses.data?.data.map(w => <MenuItem key={w.id} value={w.id}>{w.code} · {w.name}</MenuItem>)}
                </TextField>
                <TextField id="order-address" name="shippingAddressId" select label="Địa chỉ giao hàng" SelectProps={{ displayEmpty: true, SelectDisplayProps: { 'aria-labelledby': 'order-address-label' } }} value={addressId} onChange={e => setAddress(e.target.value)} fullWidth disabled={!customerId || create.pending || update.pending} sx={{ flex: 1, minWidth: 0 }} helperText="Chỉ dùng địa chỉ thuộc khách đã chọn do API trả về; trường bị che vẫn được bảo vệ.">
                    <MenuItem value="">Chưa chọn địa chỉ</MenuItem>
                    {addressId && !addresses.data?.data.some(a => a.id === addressId) && <MenuItem value={addressId}>Đang giữ địa chỉ {addressId}</MenuItem>}
                    {addresses.data?.data.map(a => <MenuItem key={a.id} value={a.id}>{a.label || `Địa chỉ ${a.id}`} · {a.recipient || 'Người nhận đã che'}</MenuItem>)}
                </TextField>
            </FormFields>
            <ErrorNotice error={warehouses.error || addresses.error}/>
            {addressId && <FieldGroup role="group" aria-label="Thông tin địa chỉ giao hàng">
                <Typography variant="caption" color="text.secondary">Địa chỉ đang chọn</Typography>
                <Typography sx={{overflowWrap:'anywhere'}}>{addresses.data?.data.find(address=>address.id===addressId)?.label || addressId}</Typography>
            </FieldGroup>}
            <LookupLoadMore label="kho xuất" loadedCount={warehouses.loadedCount} hasMore={warehouses.hasMore} busy={warehouses.isLoadingMore} onLoadMore={warehouses.loadMore}/>
            {customerId && <LookupLoadMore label="địa chỉ giao hàng" loadedCount={addresses.loadedCount} hasMore={addresses.hasMore} busy={addresses.isLoadingMore} onLoadMore={addresses.loadMore}/>}
            <Alert severity="info">Đơn xác nhận giữ snapshot địa chỉ của báo giá. Khi địa chỉ đổi trước xác nhận, cần lấy báo giá và khách đồng ý lại.</Alert>
            {resource || create.pending ? <FieldGroup role="group" aria-label="Thanh toán">
                <Typography variant="caption" color="text.secondary">Thanh toán</Typography>
                <Typography sx={{ overflowWrap: 'anywhere' }}>{method === 'cod' ? 'Thu khi giao (COD)' : 'Trả trước, cần xác minh tiền'}</Typography>
            </FieldGroup> : <TextField label="Thanh toán" name="paymentMethod" select value={method} onChange={e => setMethod(e.target.value as typeof method)}><MenuItem value="cod">Thu khi giao (COD)</MenuItem><MenuItem value="prepay">Trả trước, cần xác minh tiền</MenuItem></TextField>}
            <DraftNotes name="notes" value={notes} onChange={setNotes} />
            {showEstimate && <>
                <ActionGroup>
                    <Button type="button" size="small" variant="outlined" disabled={!valid || estimate.isPending || create.pending}
                        onClick={() => estimate.mutate(estimateInput)}>{estimate.isPending ? 'Đang tính dự toán…' : 'Tính dự toán'}</Button>
                </ActionGroup>
                {currentEstimate && <ErrorNotice error={estimate.error} />}
                {price && <SurfaceContent role="status" rhythm="dividedRows">
                    <DetailLine label="Tiền hàng"><Amount value={price.items} wrap /></DetailLine>
                    <DetailLine label="Phí giao dự kiến">{price.shipping ? <Amount value={price.shipping} wrap /> : 'Chưa có giá'}</DetailLine>
                    <DetailLine label={price.shipping ? 'Tạm tính' : 'Tạm tính tiền hàng'}><Amount value={price.total} wrap /></DetailLine>
                </SurfaceContent>}
            </>}
        </FormFields></Panel>
        <Box sx={[!initial && { position: 'sticky', bottom: 0, zIndex: tokens.zIndex.sticky }]}>
            <Panel bodyMode="inset"><ActionGroup justifyContent="flex-end">
                <MutationButton permission="orders.write" variant="contained" appearance="compactFace" busy={create.pending || update.pending} disabled={!valid || !canWriteOrders} type="submit">Lưu đơn nháp</MutationButton>
            </ActionGroup></Panel>
        </Box>
    </PageSections></Box>;
}
function orderSnapshot(order: Order) {
    return { version: order.version, values: { customerId: order.customerId, conversationId: order.conversationId || '', warehouse: order.warehouseId, addressId: order.shippingAddressId || '', notes: typeof order.notes === 'string' ? order.notes : '', promotionId: order.promotionId || '', lines: order.lines.map(line => ({ variantId: line.variantId, quantity: String(line.quantity) })) } };
}

