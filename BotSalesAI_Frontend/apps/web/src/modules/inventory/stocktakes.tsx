import { useState } from 'react';
import { Alert, Button, TextField } from '@mui/material';
import type { Stocktake } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useListQuery } from '@/shared/model/filters';
import { useScope } from '@/shared/model/scope';
import { codePointLength, dateTime } from '@/shared/model/format';
import { ActionGroup, FormFields } from '@/shared/ui/composition';
import { ConfirmDialog, DataTable, DetailLine, EditDialog, ErrorNotice, MutationButton, PageHeader, Pager, Panel, QueryState, RouteLink, Toolbar } from '@/shared/ui/components';
import { StockPositionPicker, WarehouseLookupStatus, WarehousePicker, stockReads, useActiveWarehouses } from './warehouse-forms';
import type { PickedSku } from './warehouse-forms';

const statuses = { counting: 'Đang kiểm đếm', submitted: 'Chờ duyệt', posted: 'Đã ghi tồn', cancelled: 'Đã hủy' };
const reads = ['listStocktakes', ...stockReads] as const;
type Task = 'detail' | 'count' | 'submit' | 'rebase' | 'post' | 'cancel';

export function StocktakesPage() {
    const { shop } = useScope();
    const warehouses = useActiveWarehouses();
    const query = useApi('listStocktakes', { query: useListQuery('listStocktakes') });
    const edit = useCommand('updateStocktake', reads);
    const post = useCommand('postStocktake', reads);
    const [creating, setCreating] = useState(false);
    const [selected, setSelected] = useState<{ session: Stocktake; task: Task } | null>(null);
    const close = () => { setCreating(false); setSelected(null); };
    const select = (session: Stocktake, task: Task) => {
        edit.clearError(); post.clearError(); setSelected({ session, task });
    };
    const confirm = async (reason: string) => {
        if (!selected) return;
        const { session, task } = selected;
        const target = { path: { resourceId: session.id }, version: session.version };
        if (task === 'post') await post.execute({ ...target, body: { reason } });
        if (task === 'submit' || task === 'rebase' || task === 'cancel')
            await edit.execute({ ...target, body: { action: task, ...(reason ? { reason } : {}) } });
        close();
    };
    return <>
        <PageHeader title="Phiên kiểm kê kho" subtitle="Lưu mốc tồn, nhập số đếm và duyệt chênh lệch theo phiên."
            actions={<MutationButton permission="inventory.adjust" variant="contained" onClick={() => setCreating(true)}>Mở phiên kiểm kê</MutationButton>} />
        <Panel title="Các phiên kiểm kê" action={<RouteLink to={`/s/${shop.id}/inventory`}>Tồn kho</RouteLink>}>
            <Toolbar operation="listStocktakes" placeholder="Tìm mã phiên, kho hoặc SKU…" />
            <QueryState query={query} pendingProfile="section">{query.data && <>
                <DataTable label="Các phiên kiểm kê" rows={query.data.data} rowKey={session => session.id} reflowOnMobile
                    empty="Chưa có phiên kiểm kê." columns={[
                        { key: 'session', label: 'Phiên', render: session => session.id },
                        { key: 'warehouse', label: 'Kho', render: session => warehouses.data?.data.find(item => item.id === session.warehouseId)?.name ?? session.warehouseId },
                        { key: 'state', label: 'Trạng thái', render: session => statuses[session.status] },
                        { key: 'items', label: 'Đã đếm', render: session => `${session.lines.filter(line => line.counted !== null).length}/${session.lines.length} SKU` },
                        { key: 'updated', label: 'Cập nhật', render: session => dateTime(session.updatedAt, shop.timezone) },
                        { key: 'actions', label: 'Thao tác', render: session => <ActionGroup direction="row">
                            <Button size="small" onClick={() => select(session, 'detail')}>Chi tiết phiên</Button>
                            {session.status === 'counting' && <>
                                <MutationButton permission="inventory.adjust" onClick={() => select(session, 'count')}>Nhập số đếm</MutationButton>
                                <MutationButton permission="inventory.adjust" disabled={session.lines.some(line => line.counted === null)}
                                    onClick={() => select(session, 'submit')}>Gửi duyệt</MutationButton>
                            </>}
                            {session.status === 'submitted' && <MutationButton permission="warehouses.manage" onClick={() => select(session, 'post')}>Duyệt và ghi tồn</MutationButton>}
                            {['counting', 'submitted'].includes(session.status) && <>
                                <MutationButton permission="inventory.adjust" onClick={() => select(session, 'rebase')}>Cập nhật mốc tồn</MutationButton>
                                <MutationButton permission="inventory.adjust" onClick={() => select(session, 'cancel')}>Hủy phiên</MutationButton>
                            </>}
                        </ActionGroup> },
                    ]} />
                <Pager page={query.data.page} />
            </>}</QueryState>
        </Panel>
        {creating && <StocktakeCreation close={close} />}
        {selected?.task === 'count' && <StocktakeCounts session={selected.session} close={close} />}
        {selected?.task === 'detail' && <StocktakeDetails session={selected.session} close={close} />}
        {selected && ['submit', 'rebase', 'post', 'cancel'].includes(selected.task) && <ConfirmDialog open
            title={{ submit: 'Gửi phiên kiểm kê để duyệt', rebase: 'Cập nhật mốc tồn', post: 'Duyệt và ghi tồn', cancel: 'Hủy phiên kiểm kê', count: '', detail: '' }[selected.task]}
            description={selected.task === 'rebase' ? 'Dòng có tồn thay đổi sẽ lấy mốc mới và cần được đếm lại.' : selected.session.id}
            requireReason={selected.task === 'post' || selected.task === 'cancel'} busy={edit.pending || post.pending}
            error={edit.error || post.error} onClose={close} onConfirm={confirm} />}
    </>;
}

function StocktakeCreation({ close }: { close: () => void }) {
    const { online } = useScope();
    const warehouses = useActiveWarehouses();
    const create = useCommand('createStocktake', ['listStocktakes']);
    const [warehouseId, setWarehouse] = useState('');
    const [selected, setSelected] = useState<PickedSku[]>([]);
    const [reason, setReason] = useState('');
    const valid = Boolean(warehouseId && selected.length && codePointLength(reason.trim()) >= 5 && codePointLength(reason.trim()) <= 500);
    return <EditDialog open title="Mở phiên kiểm kê" description="API ghi lại số tồn và lượng đang giữ của các SKU đã chọn."
        onClose={close} busy={create.pending} actions={<Button form="stocktake-create" type="submit" variant="contained" disabled={!valid || !online || create.pending}>Tạo phiên</Button>}>
        <FormFields component="form" id="stocktake-create" onSubmit={event => {
            event.preventDefault();
            if (valid && online && !create.pending) void create.execute({ body: { warehouseId, reason: reason.trim(), variantIds: selected.map(item => item.id) } })
                .then(close).catch(() => undefined);
        }}>
            <ErrorNotice error={create.error} />
            <WarehousePicker label="Kho kiểm kê" value={warehouseId} change={id => { setWarehouse(id); setSelected([]); }} warehouses={warehouses} />
            <WarehouseLookupStatus warehouses={warehouses} />
            <TextField label="Lý do kiểm kê" value={reason} onChange={event => setReason(event.target.value)} helperText="Nhập từ 5 đến 500 ký tự." />
            <StockPositionPicker key={warehouseId} warehouseId={warehouseId} selected={selected} change={setSelected} />
        </FormFields>
    </EditDialog>;
}

function StocktakeCounts({ session, close }: { session: Stocktake; close: () => void }) {
    const { online } = useScope();
    const edit = useCommand('updateStocktake', reads);
    const [counts, setCounts] = useState<Record<string, string>>(() => Object.fromEntries(session.lines.map(line => [
        line.variantId, line.counted === null ? '' : String(line.counted),
    ])));
    const entered = session.lines.flatMap(line => counts[line.variantId]?.trim() ? [{ variantId: line.variantId, counted: Number(counts[line.variantId]) }] : []);
    const valid = entered.length > 0 && entered.every(line => /^(0|[1-9]\d*)$/.test(counts[line.variantId] ?? '') && Number.isSafeInteger(line.counted));
    return <EditDialog open title="Nhập số đếm" onClose={close} busy={edit.pending}
        actions={<Button form="stocktake-counts" type="submit" variant="contained" disabled={!valid || !online || edit.pending}>Lưu số đếm</Button>}>
        <FormFields component="form" id="stocktake-counts" onSubmit={event => {
            event.preventDefault();
            if (valid && online && !edit.pending) void edit.execute({
                path: { resourceId: session.id }, version: session.version, body: { action: 'count', counts: entered },
            }).then(close).catch(() => undefined);
        }}>
            <ErrorNotice error={edit.error} />
            <Alert severity="info">Nhập số nguyên từ 0. Dòng chưa đếm có thể để trống và lưu phần đã nhập.</Alert>
            {session.lines.map(line => <TextField key={line.variantId} label={`Số đếm ${line.sku}`} value={counts[line.variantId] ?? ''}
                helperText={`Mốc tồn ${line.expected} · đã giữ ${line.reserved}`} inputProps={{ inputMode: 'numeric' }}
                onChange={event => setCounts(values => ({ ...values, [line.variantId]: event.target.value }))} />)}
        </FormFields>
    </EditDialog>;
}

function StocktakeDetails({ session, close }: { session: Stocktake; close: () => void }) {
    const { shop } = useScope();
    return <EditDialog open title={`Phiên ${session.id}`} onClose={close} actions={<Button onClick={close}>Đóng</Button>}>
        <FormFields>
            <DetailLine label="Trạng thái">{statuses[session.status]}</DetailLine>
            <DetailLine label="Kho">{session.warehouseId}</DetailLine>
            <DetailLine label="Lý do">{session.reason}</DetailLine>
            <DetailLine label="Kết quả duyệt">{session.reviewReason ?? 'Chưa có'}</DetailLine>
            <DataTable label="Số liệu kiểm kê" reflowOnMobile rows={session.lines} rowKey={line => line.variantId} columns={[
                { key: 'sku', label: 'SKU', render: line => line.sku },
                { key: 'expected', label: 'Mốc tồn', render: line => line.expected },
                { key: 'counted', label: 'Số đếm', render: line => line.counted ?? 'Chưa đếm' },
                { key: 'difference', label: 'Chênh lệch', render: line => line.counted === null ? '—' : line.counted - line.expected },
            ]} />
            {session.status === 'posted' && <RouteLink to={`/s/${shop.id}/inventory/movements?q=${encodeURIComponent(session.id)}`}>Mở lịch sử theo phiên</RouteLink>}
        </FormFields>
    </EditDialog>;
}
