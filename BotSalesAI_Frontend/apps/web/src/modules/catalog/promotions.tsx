import { useState } from 'react';
import { Alert, Button, MenuItem, TextField, Typography } from '@mui/material';
import type { Promotion, PromotionDraft } from '@botsales/contracts';
import { useApi, useCommand, usePagedApi } from '@/shared/api/hooks';
import { useCan, useScope } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { codePointLength, dateOnlyInTimezone, formatDateOnly, isValidDateOnly } from '@/shared/model/format';
import { ActionGroup, FieldGroup, FormFields } from '@/shared/ui/composition';
import { Amount, ConfirmDialog, DataTable, DetailLine, EditDialog, ErrorNotice, LookupLoadMore, MutationButton, PageHeader, Pager, Panel, QueryState, RouteLink, Toolbar } from '@/shared/ui/components';

const titles = { draft: 'Bản nháp', active: 'Đã duyệt bật', paused: 'Tạm dừng' };
const updates = ['listPromotions', 'getMarketingSummary'] as const;
type Selection = { mode: 'detail' | 'edit' | 'activate' | 'pause'; item: Promotion };

function effectiveLabel(item: Promotion, today: string) {
    if (item.status !== 'active') return titles[item.status];
    if (item.startsOn > today) return 'Chưa đến ngày áp dụng';
    return item.endsOn < today ? 'Hết hiệu lực' : 'Đang hiệu lực';
}

export function PromotionsPage() {
    const { shop } = useScope();
    const result = useApi('listPromotions', { query: useListQuery('listPromotions') });
    const decision = useCommand('decidePromotion', updates);
    const [creating, setCreating] = useState(false);
    const [selection, setSelection] = useState<Selection | null>(null);
    const asOf = result.data?.meta.asOf;
    const today = dateOnlyInTimezone(asOf ? new Date(asOf) : new Date(), shop.timezone);
    const close = () => { setCreating(false); setSelection(null); };
    const open = (item: Promotion, mode: Selection['mode']) => { decision.clearError(); setSelection({ mode, item }); };
    return <>
        <PageHeader title="Ưu đãi và combo" subtitle="Chọn các SKU phải có trong đơn, mức giảm và thời gian áp dụng."
            actions={<MutationButton permission="catalog.write" variant="contained" disabled={!asOf} onClick={() => setCreating(true)}>Tạo ưu đãi</MutationButton>} />
        <Panel title="Chương trình ưu đãi" action={<RouteLink to={`/s/${shop.id}/products`}>Sản phẩm</RouteLink>}>
            <Toolbar operation="listPromotions" placeholder="Tìm tên hoặc mã ưu đãi…" />
            <QueryState query={result} pendingProfile="section">{result.data && <>
                <DataTable label="Chương trình ưu đãi" reflowOnMobile rows={result.data.data} rowKey={item => item.id}
                    empty="Chưa có chương trình ưu đãi." columns={[
                        { key: 'name', label: 'Chương trình', render: item => item.name },
                        { key: 'status', label: 'Trạng thái', render: item => effectiveLabel(item, today) },
                        { key: 'dates', label: 'Ngày áp dụng', render: item => `${formatDateOnly(item.startsOn)} – ${formatDateOnly(item.endsOn)}` },
                        { key: 'amount', label: 'Giảm mỗi đơn', align: 'right', render: item => <Amount value={{ amount: item.discountAmount, currency: shop.currency }} /> },
                        { key: 'actions', label: 'Thao tác', render: item => <ActionGroup direction="row">
                            <Button size="small" onClick={() => open(item, 'detail')}>Chi tiết</Button>
                            {item.status !== 'active' && <MutationButton permission="catalog.write" onClick={() => open(item, 'edit')}>Sửa ưu đãi</MutationButton>}
                            {item.status === 'active'
                                ? <MutationButton permission="shop.manage" onClick={() => open(item, 'pause')}>Tạm dừng</MutationButton>
                                : <MutationButton permission="shop.manage" disabled={item.endsOn < today} onClick={() => open(item, 'activate')}>Duyệt bật</MutationButton>}
                        </ActionGroup> },
                    ]} />
                <Pager page={result.data.page} />
            </>}</QueryState>
        </Panel>
        {(creating || selection?.mode === 'edit') && <PromotionEditor initial={selection?.item} today={today} onClose={close} />}
        {selection?.mode === 'detail' && <EditDialog open title={selection.item.name} onClose={close} actions={<Button onClick={close}>Đóng</Button>}>
            <DetailLine label="Phiên bản">{selection.item.version}</DetailLine>
            <DetailLine label="Biên tối thiểu">{selection.item.minMarginPercent}%</DetailLine>
            <DataTable label="Thành phần combo" rows={selection.item.lines} rowKey={line => line.variantId} columns={[
                { key: 'product', label: 'SKU / Sản phẩm', render: line => `${line.sku} · ${line.label}` },
                { key: 'quantity', label: 'Số lượng tối thiểu', align: 'right', render: line => line.quantity },
            ]} />
        </EditDialog>}
        {selection && (selection.mode === 'activate' || selection.mode === 'pause') && <ConfirmDialog open
            title={selection.mode === 'activate' ? 'Duyệt bật ưu đãi' : 'Tạm dừng ưu đãi'}
            description={`${selection.item.name} · phiên bản ${selection.item.version}`} requireReason
            busy={decision.pending} error={decision.error} onClose={close} onConfirm={async reason => {
                const action = selection.mode === 'activate' ? 'activate' : 'pause';
                await decision.execute({ path: { resourceId: selection.item.id }, version: selection.item.version, body: { action, reason } });
                close();
            }} />}
    </>;
}

type DraftLine = { key: string; variantId: string; label: string; quantity: string };

function PromotionEditor({ initial, today, onClose }: { initial?: Promotion; today: string; onClose: () => void }) {
    const { shop, online } = useScope();
    const canRead = useCan('catalog.read');
    const create = useCommand('createPromotion', updates);
    const update = useCommand('updatePromotion', updates);
    const [name, setName] = useState(initial?.name ?? '');
    const [startsOn, setStart] = useState(initial?.startsOn ?? today);
    const [endsOn, setEnd] = useState(initial?.endsOn ?? today);
    const [discountAmount, setDiscount] = useState(initial?.discountAmount ?? '');
    const [margin, setMargin] = useState(String(initial?.minMarginPercent ?? 0));
    const blank = () => ({ key: crypto.randomUUID(), variantId: '', label: '', quantity: '1' });
    const [lines, setLines] = useState<DraftLine[]>(() => initial
        ? initial.lines.map(line => ({ key: line.variantId, variantId: line.variantId, label: `${line.sku} · ${line.label}`, quantity: String(line.quantity) }))
        : [blank(), blank()]);
    const [search, setSearch] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const products = usePagedApi('listProducts', { query: { status: 'active', q: search.trim() || undefined, limit: 20 } }, canRead);
    const options = (products.data?.data ?? []).flatMap(product => product.variants.filter(variant => variant.active)
        .map(variant => ({ id: variant.id, label: `${variant.sku} · ${product.name} · ${variant.name}` })));
    const updateLine = (key: string, patch: Partial<DraftLine>) => setLines(current => current.map(line => line.key === key ? { ...line, ...patch } : line));
    const busy = create.pending || update.pending;
    const valid = name.trim() && codePointLength(name.trim()) <= 120 && isValidDateOnly(startsOn) && isValidDateOnly(endsOn) && startsOn <= endsOn
        && /^(0|[1-9][0-9]{0,11})(\.[0-9]{1,4})?$/.test(discountAmount.trim()) && Number(discountAmount) > 0
        && /^\d{1,2}$/.test(margin) && lines.length >= 2 && new Set(lines.map(line => line.variantId)).size === lines.length
        && lines.every(line => line.variantId && /^(?:[1-9][0-9]{0,5}|1000000)$/.test(line.quantity));
    const canWrite = useCan('catalog.write');
    const submit = async () => {
        setSubmitted(true);
        if (!valid || busy || !online || !canWrite) return;
        const body: PromotionDraft = { name: name.trim(), startsOn, endsOn, discountAmount: discountAmount.trim(),
            minMarginPercent: Number(margin), lines: lines.map(line => ({ variantId: line.variantId, quantity: Number(line.quantity) })) };
        try {
            if (initial) await update.execute({ path: { resourceId: initial.id }, version: initial.version, body });
            else await create.execute({ body });
            onClose();
        } catch { /* ErrorNotice preserves the entered draft. */ }
    };
    return <EditDialog open title={initial ? 'Sửa ưu đãi' : 'Tạo ưu đãi'} onClose={onClose} busy={busy}
        actions={<Button type="submit" form="promotion-editor" variant="contained" disabled={busy || !online || !canWrite}>Lưu bản nháp</Button>}>
        <FormFields component="form" id="promotion-editor" noValidate onSubmit={event => { event.preventDefault(); void submit(); }}>
            <ErrorNotice error={create.error || update.error || products.error} />
            {submitted && !valid && <Alert severity="warning">Kiểm tra tên, ngày, số tiền, biên lợi nhuận và ít nhất hai SKU khác nhau.</Alert>}
            <TextField required label="Tên ưu đãi" value={name} onChange={event => setName(event.target.value)} />
            <FieldGroup direction={{ xs: 'column', sm: 'row' }}>
                <TextField label="Bắt đầu" type="date" value={startsOn} onChange={event => setStart(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField label="Kết thúc" type="date" value={endsOn} onChange={event => setEnd(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </FieldGroup>
            <FieldGroup direction={{ xs: 'column', sm: 'row' }}>
                <TextField label={`Giảm mỗi đơn (${shop.currency})`} value={discountAmount} onChange={event => setDiscount(event.target.value)} inputProps={{ inputMode: 'decimal' }} />
                <TextField label="Biên lợi nhuận tối thiểu (%)" value={margin} onChange={event => setMargin(event.target.value)} inputProps={{ inputMode: 'numeric' }} helperText="Tính trên giá combo sau giảm." />
            </FieldGroup>
            <TextField label="Tìm SKU hoặc sản phẩm" value={search} onChange={event => setSearch(event.target.value)} />
            {products.isPending && <Typography role="status">Đang tải sản phẩm…</Typography>}
            <LookupLoadMore hasMore={products.hasMore} busy={products.isLoadingMore} loadedCount={products.loadedCount}
                onLoadMore={() => void products.loadMore()} label="sản phẩm" />
            {lines.map((line, index) => <FieldGroup key={line.key} direction={{ xs: 'column', sm: 'row' }}>
                <TextField select label={`SKU dòng ${index + 1}`} value={line.variantId} fullWidth
                    onChange={event => updateLine(line.key, { variantId: event.target.value, label: options.find(option => option.id === event.target.value)?.label ?? '' })}>
                    <MenuItem value="">Chọn SKU</MenuItem>
                    {line.variantId && !options.some(option => option.id === line.variantId) && <MenuItem value={line.variantId}>{line.label}</MenuItem>}
                    {options.map(option => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
                </TextField>
                <TextField label={`Số lượng dòng ${index + 1}`} value={line.quantity} onChange={event => updateLine(line.key, { quantity: event.target.value })} inputProps={{ inputMode: 'numeric' }} />
                {lines.length > 2 && <Button type="button" onClick={() => setLines(current => current.filter(item => item.key !== line.key))}>Bỏ dòng {index + 1}</Button>}
            </FieldGroup>)}
            <ActionGroup direction="row"><Button type="button" disabled={lines.length >= 30} onClick={() => setLines(current => [...current, blank()])}>Thêm SKU</Button></ActionGroup>
        </FormFields>
    </EditDialog>;
}
