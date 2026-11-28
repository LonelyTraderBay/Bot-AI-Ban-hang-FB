import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, IconButton, MenuItem, TextField, Typography } from '@mui/material';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import type { ConversationOrderDraftValues } from '@botsales/contracts';
import { usePagedApi } from '@/shared/api/hooks';
import { registerDraftFlush, useDraftForm } from '@/shared/model/dirty-drafts';
import { useCan, useScope } from '@/shared/model/scope';
import { ActionGroup, FormFields, SurfaceContent } from '@/shared/ui/composition';
import { Amount, ConfirmDialog, DetailLine, ErrorNotice, LookupLoadMore, Panel, QueryState } from '@/shared/ui/components';
import { layoutSx } from '@/shared/ui/layout';
import { visualSx } from '@/shared/ui/visual';
import { DraftNotes, DraftQuantity, invalidDraftQuantity } from './draft-inputs';
import { completeOrderDraft, useConversationDraft } from './use-conversation-draft';

type Values = ConversationOrderDraftValues;
type Field = NonNullable<Values['lastField']>;
type DraftAccess = 'open' | 'resume';
const emptyRows: NonNullable<Values['lines']> = [{}];

function ConversationDraftFields({ customerId, values, onChange, disabled, selectedVariants, onSelectVariant }: {
    customerId: string; values: Values; onChange: (update: Partial<Values>) => void; disabled: boolean;
    selectedVariants?: { id: string; label: string }[];
    onSelectVariant: (option: { id: string; label: string }) => void;
}) {
    const canReadCatalog = useCan('catalog.read');
    const canReadCustomers = useCan('customers.read');
    const canReadInventory = useCan('inventory.read');
    const [query, setQuery] = useState('');
    const products = usePagedApi('listProducts', { query: { q: query.trim() || undefined, limit: 20 } }, canReadCatalog);
    const warehouses = usePagedApi('listWarehouses', { query: { status: 'active', limit: 20 } }, canReadInventory);
    const addresses = usePagedApi('listCustomerAddresses', { path: { customerId }, query: { status: 'active', limit: 20 } }, canReadCustomers);
    const options = products.data?.data.filter(product => product.status === 'active').flatMap(product =>
        product.variants.filter(variant => variant.active).map(variant => ({ id: variant.id, label: `${product.name} · ${variant.sku}` }))) ?? [];
    const lines = values.lines?.length ? values.lines : emptyRows;
    const lineKey = useId();
    const change = (index: number, patch: Partial<(typeof lines)[number]>, lastField: Field) => {
        const option = patch.variantId && options.find(item => item.id === patch.variantId);
        if (option) onSelectVariant(option);
        onChange({ lastField, lines: lines.map((line, position) => {
            if (position !== index) return line;
            const { variantId, quantity } = { ...line, ...patch };
            return { ...(variantId && { variantId }), ...(quantity && { quantity }) };
        }) });
    };

    return <FormFields density="compact">
        <ActionGroup alignItems="center" justifyContent="space-between">
            <Typography component="h3" variant="body1" fontWeight={visualSx.typography.fontWeight.semibold}>Sản phẩm</Typography>
            <Button size="small" disabled={disabled || lines.length >= 100} onClick={() => onChange({ lines: [...lines, {}], lastField: 'product' })}>Thêm dòng</Button>
        </ActionGroup>
        <Box data-draft-field="product"><TextField size="small" fullWidth label="Tìm sản phẩm hoặc SKU" value={query} onChange={event => setQuery(event.target.value)} disabled={!canReadCatalog || disabled} /></Box>
        <ErrorNotice error={products.error} />
        {!!query.trim() && <Box role="region" aria-label="Kết quả tìm sản phẩm" sx={{ maxHeight: 'min(7rem, 25dvh)', overflowY: 'auto' }}>
            {options.length ? options.map(option => <Button key={option.id} fullWidth size="small" disabled={disabled || lines.some(line => line.variantId === option.id)}
                onClick={() => {
                    const emptyIndex = lines.findIndex(line => !line.variantId);
                    if (emptyIndex >= 0) change(emptyIndex, { variantId: option.id, quantity: 1 }, 'product');
                    else if (lines.length < 100) {
                        onSelectVariant(option);
                        onChange({ lastField: 'product', lines: [...lines, { variantId: option.id, quantity: 1 }] });
                    }
                    setQuery('');
                }}>{option.label}</Button>)
                : !products.isPending && <Typography variant="body2" color="text.secondary">Không tìm thấy sản phẩm phù hợp.</Typography>}
        </Box>}
        {lines.map((line, i) => <FormFields key={`${lineKey}-${i}`} direction="row" alignItems="start" density="compact">
            <TextField size="small" select fullWidth label={`Sản phẩm ${i + 1}`} value={line.variantId || ''} disabled={!canReadCatalog || disabled}
                onChange={event => change(i, { variantId: event.target.value || undefined, quantity: line.quantity ?? 1 }, 'product')} sx={{ minWidth: 0 }}>
                <MenuItem value="">Chọn sản phẩm</MenuItem>
                {line.variantId && !options.some(option => option.id === line.variantId) && <MenuItem value={line.variantId}>{selectedVariants?.find(item => item.id === line.variantId)?.label ?? 'Mặt hàng đã chọn'}</MenuItem>}
                {options.map(option => <MenuItem key={option.id} value={option.id}
                    disabled={lines.some((item, position) => position !== i && item.variantId === option.id)}>{option.label}</MenuItem>)}
                {options.length === 0 && <MenuItem disabled>Không tìm thấy sản phẩm phù hợp</MenuItem>}
            </TextField>
            <Box data-draft-field="quantity" sx={{ width: '6.5em', flexShrink: 0 }}>
                <DraftQuantity compact value={line.quantity?.toString() ?? ''} disabled={disabled}
                    onChange={quantity => { if (!invalidDraftQuantity(quantity)) change(i, { quantity: quantity ? Number(quantity) : undefined }, 'quantity'); }} />
            </Box>
            {lines.length > 1 && <IconButton aria-label={`Bỏ dòng ${i + 1}`} disabled={disabled}
                onClick={() => onChange({ lines: lines.filter((_, position) => position !== i), lastField: 'product' })}><DeleteOutlineRounded /></IconButton>}
        </FormFields>)}
        {products.hasMore && <LookupLoadMore label="sản phẩm" loadedCount={products.loadedCount} hasMore busy={products.isLoadingMore} onLoadMore={products.loadMore} />}
        <Typography component="h3" variant="body1" fontWeight={visualSx.typography.fontWeight.semibold}>Giao hàng và thanh toán</Typography>
        <Box data-draft-field="warehouse"><TextField size="small" select fullWidth label="Kho xuất" value={values.warehouseId || ''} disabled={disabled || !canReadInventory} onChange={event => onChange({ warehouseId: event.target.value, lastField: 'warehouse' })}>
            {values.warehouseId && !warehouses.data?.data.some(item => item.id === values.warehouseId) && <MenuItem value={values.warehouseId}>{values.warehouseId}</MenuItem>}
            {warehouses.data?.data.map(item => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
        </TextField></Box>
        <FormFields direction="row" density="compact" alignItems="start">
            <Box data-draft-field="shippingAddress" sx={{ flex: 1, minWidth: 0 }}><TextField size="small" select fullWidth label="Địa chỉ giao hàng" disabled={disabled || !canReadCustomers}
                value={values.shippingAddressId || ''} onChange={event => onChange({ shippingAddressId: event.target.value || null, lastField: 'shippingAddress' })}>
                <MenuItem value="">Chưa chọn</MenuItem>
                {values.shippingAddressId && !addresses.data?.data.some(item => item.id === values.shippingAddressId) && <MenuItem value={values.shippingAddressId}>{values.shippingAddressId}</MenuItem>}
                {addresses.data?.data.map(item => <MenuItem key={item.id} value={item.id}>{item.label || item.id}</MenuItem>)}
            </TextField></Box>
            <Box data-draft-field="paymentMethod" sx={{ flex: 1, minWidth: 0 }}><TextField size="small" select fullWidth label="Thanh toán" value={values.paymentMethod || ''} disabled={disabled}
                onChange={event => onChange({ paymentMethod: event.target.value as 'cod' | 'prepay', lastField: 'paymentMethod' })}>
                <MenuItem value="cod">COD</MenuItem><MenuItem value="prepay">Trả trước</MenuItem>
            </TextField></Box>
        </FormFields>
        <ErrorNotice error={warehouses.error || addresses.error} />
        <Box data-draft-field="notes"><DraftNotes compact value={values.notes ?? ''} disabled={disabled} onChange={notes => onChange({ notes, lastField: 'notes' })} /></Box>
    </FormFields>;
}

export function ConversationDraftPanel({ conversationId, customerId, customerName, openRequest, onPreviewAccess, fromPreview }: {
    conversationId: string; customerId: string; customerName: string;
    openRequest?: { action: DraftAccess }; onPreviewAccess?: (action: DraftAccess) => void; fromPreview?: boolean;
}) {
    const { shop } = useScope();
    const navigate = useNavigate();
    const draft = useConversationDraft(conversationId, onPreviewAccess ? 'preview' : fromPreview ? 'intent' : 'normal');
    const [confirm, setConfirm] = useState<'convert' | 'discard' | null>(null);
    const [accessMessage, setAccessMessage] = useState<string>();
    const [variantLabels, setVariantLabels] = useState<Record<string, string>>({});
    const previousOpen = useRef<typeof openRequest>(undefined);
    const form = useRef<HTMLFormElement | null>(null);
    const bindDraft = useDraftForm(draft.dirty || draft.unacknowledged);
    const { acquire, pending, receiptReady, save, unacknowledged } = draft;
    const viewData = draft.view.data;
    const remoteDraft = draft.draft;
    const lastField = useRef(remoteDraft?.values.lastField);
    lastField.current = remoteDraft?.values.lastField;
    const canOpen = draft.view.data?.data.canOpen;
    const canAsk = Boolean(onPreviewAccess || receiptReady) && canOpen && draft.online && !draft.pending && !draft.conversionUnconfirmed;
    const shown = draft.draft || draft.unacknowledged;
    const showFooter = draft.editing || draft.conversionUnconfirmed || draft.pending === 'convert';
    const fillPane = Boolean(shown || showFooter);
    const editorReady = Boolean(viewData) && draft.editing;
    const accessPending = pending === 'access' || Boolean(openRequest && openRequest !== previousOpen.current && !draft.editing);

    useEffect(() => {
        if (!openRequest || openRequest === previousOpen.current || draft.view.isFetching || pending || !receiptReady || (!viewData && !draft.view.isError)) return;
        previousOpen.current = openRequest;
        if (draft.editing) {
            setAccessMessage(undefined);
        } else if (draft.view.isError || !canAsk || unacknowledged) {
            setAccessMessage('Chưa thể mở quyền sửa bản đang nhập. Kiểm tra trạng thái hội thoại và thử lại.');
        } else if (openRequest.action === 'open' && remoteDraft) {
            setAccessMessage('Đã có bản đang nhập. Chọn Tiếp tục chỉnh sửa để mở bản đã lưu.');
        } else if (openRequest.action === 'resume' && !remoteDraft) {
            setAccessMessage('Bản đang nhập trước đó không còn. Chọn Tạo đơn để bắt đầu bản mới.');
        } else {
            setAccessMessage(undefined);
            void acquire(openRequest.action).then(granted => {
                if (!granted) setAccessMessage('Chưa thể mở quyền sửa bản đang nhập. Kiểm tra trạng thái hội thoại và thử lại.');
            });
        }
    }, [openRequest, viewData, pending, receiptReady, remoteDraft, unacknowledged, acquire, canAsk, draft.editing, draft.view.isError, draft.view.isFetching]);

    useEffect(() => {
        if (form.current && editorReady) return registerDraftFlush(form.current, save);
    }, [editorReady, save]);

    const leaseEpoch = draft.editing ? draft.draft?.editEpoch : undefined;
    useEffect(() => {
        const field = lastField.current;
        if (leaseEpoch === undefined || !field) return;
        const frame = window.requestAnimationFrame(() => {
            form.current?.querySelector(`[data-draft-field="${field}"]`)?.scrollIntoView({ block: 'nearest' });
        });
        return () => window.cancelAnimationFrame(frame);
        // Only jump when starting to edit, never on each subsequent autosave.
    }, [leaseEpoch]);

    const requestAccess = (action: DraftAccess) => {
        setAccessMessage(undefined);
        if (onPreviewAccess) onPreviewAccess(action);
        else if (unacknowledged) setConfirm('discard');
        else void acquire(action);
    };

    return <Panel title="Đơn đang nhập" subtitle={customerName} bodyMode="flush"
        geometry={{ display: 'flex', flexDirection: 'column', height: fillPane ? '100%' : undefined }}>
        <QueryState query={draft.view}>
            <Box component="form" ref={element => { form.current = element as HTMLFormElement | null; bindDraft(form.current); }} onSubmit={event => event.preventDefault()}
                sx={{ display: 'flex', flexDirection: 'column', flex: fillPane ? '1 1 0' : undefined, minHeight: 0 }}>
                <Box sx={[layoutSx.inbox.paneInset, { flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }]}>
                    <SurfaceContent>
                        {accessPending && <Typography role="status" variant="body2">Đang mở bản đang nhập…</Typography>}
                        {accessMessage && <Alert severity="warning">{accessMessage}</Alert>}
                        {draft.conversionUnconfirmed && <Alert severity="warning">Chưa xác minh kết quả tạo đơn. Kiểm tra lại để tiếp tục với cùng yêu cầu.</Alert>}
                        {!draft.editing && shown && <ActionGroup alignItems="center" justifyContent="space-between">
                            <Typography variant="caption">Chỉ xem</Typography>
                            {canOpen && <Button size="small" variant="outlined" disabled={!canAsk}
                                onClick={() => requestAccess('resume')}>Tiếp tục chỉnh sửa</Button>}
                        </ActionGroup>}
                        {draft.unacknowledged && <Alert severity="warning">Thay đổi trên thiết bị này chưa được lưu. Bản trên máy chủ vẫn giữ lần lưu gần nhất.</Alert>}
                        <ErrorNotice error={draft.error} />
                        {!shown && !draft.conversionUnconfirmed && draft.pending !== 'convert' && <ActionGroup alignItems="center" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">Chưa có bản đang nhập.</Typography>
                            {canOpen && <Button size="small" variant="outlined" sx={layoutSx.actions.compactFace} disabled={!canAsk}
                                onClick={() => requestAccess('open')}>Tạo đơn</Button>}
                        </ActionGroup>}
                        {shown && <>
                            <ConversationDraftFields customerId={customerId} values={draft.values} selectedVariants={viewData?.data.selectedVariants}
                                disabled={!draft.editing || draft.pending === 'convert' || draft.pending === 'discard' || draft.conversionUnconfirmed}
                                onSelectVariant={option => setVariantLabels(current => ({ ...current, [option.id]: option.label }))}
                                onChange={patch => draft.setValues(values => ({ ...values, ...patch }))} />
                            <SurfaceContent rhythm="dividedRows">
                                {draft.estimate?.shipping && <>
                                    <DetailLine label="Tiền hàng"><Amount value={draft.estimate.items} wrap /></DetailLine>
                                    <DetailLine label="Phí giao dự kiến"><Amount value={draft.estimate.shipping} wrap /></DetailLine>
                                </>}
                                <DetailLine label={draft.estimate?.shipping ? 'Tạm tính' : 'Tạm tính tiền hàng'}><Amount value={draft.estimate?.total} wrap /></DetailLine>
                            </SurfaceContent>
                        </>}
                    </SurfaceContent>
                </Box>
                {showFooter && <ActionGroup bodyMode="header" alignItems="center" justifyContent="space-between" flexWrap="wrap" geometry={{ flex: '0 0 auto' }}>
                    <Typography role="status" variant="caption">{draft.pending === 'save' ? 'Đang lưu…'
                        : draft.dirty || !draft.online ? 'Chưa đồng bộ' : draft.draft?.savedAt ? 'Đã lưu' : 'Đang chỉnh sửa'}</Typography>
                    {draft.error && draft.dirty && <Button size="small" onClick={() => void draft.save()}>Lưu lại</Button>}
                    {draft.editing && <Button size="small" onClick={() => setConfirm('discard')} disabled={!draft.online || !!draft.pending || draft.conversionUnconfirmed}>Bỏ bản đang nhập</Button>}
                    <Button size="small" variant="contained" sx={layoutSx.actions.compactFace}
                        disabled={!draft.online || !!draft.pending || (!draft.conversionUnconfirmed && (draft.dirty || !completeOrderDraft(draft.values)))}
                        onClick={() => setConfirm('convert')}>{draft.conversionUnconfirmed ? 'Kiểm tra kết quả tạo đơn' : 'Tạo đơn'}</Button>
                </ActionGroup>}
            </Box>
        </QueryState>
        <ConfirmDialog open={confirm !== null} title={confirm === 'convert' ? 'Xác nhận tạo đơn' : draft.unacknowledged ? 'Mở bản đã đồng bộ' : 'Bỏ bản đang nhập'}
            width={confirm === 'convert' ? 'compact' : 'standard'}
            confirmLabel={confirm === 'convert' ? 'Tạo đơn' : draft.unacknowledged ? 'Mở bản đã lưu' : 'Bỏ bản'}
            onClose={() => setConfirm(null)} busy={draft.pending === 'convert' || draft.pending === 'discard'} error={draft.error}
            description={confirm === 'convert' ? 'Tạo đơn nháp để tiếp tục báo giá và xác nhận với khách.'
                : draft.unacknowledged ? 'Phần chưa đồng bộ trên thiết bị này sẽ được bỏ. Anh sẽ tiếp tục từ bản máy chủ đã lưu.'
                    : 'Nội dung đang nhập của hội thoại này sẽ được bỏ.'}
            summary={confirm === 'convert' && <SurfaceContent rhythm="dividedRows">
                <DetailLine label="Khách hàng">{customerName}</DetailLine>
                <DetailLine label="Sản phẩm">
                    {draft.values.lines?.length ? <SurfaceContent rhythm="dividedRows" role="list">
                        {draft.values.lines.map((line, index) => {
                            const variantId = line.variantId;
                            const label = viewData?.data.selectedVariants?.find(option => option.id === variantId)?.label
                                || (variantId && variantLabels[variantId]) || variantId || `Dòng ${index + 1}`;
                            return <Typography key={`${variantId ?? ''}-${index}`} variant="body2" role="listitem">
                                {label} · {line.quantity ?? 'Chưa rõ số lượng'}
                            </Typography>;
                        })}
                    </SurfaceContent> : 'Chưa có thông tin sản phẩm'}
                </DetailLine>
                <DetailLine label="Tạm tính">{draft.estimate ? <Amount value={draft.estimate.total} wrap /> : 'Chưa có dự toán'}</DetailLine>
            </SurfaceContent>}
            onConfirm={async () => {
                if (draft.unacknowledged) { await draft.acquire('resume'); return; }
                if (!confirm) return;
                const order = await draft.finish(confirm);
                if (order) navigate(`/s/${shop.id}/orders/${order.id}`);
            }} />
    </Panel>;
}
