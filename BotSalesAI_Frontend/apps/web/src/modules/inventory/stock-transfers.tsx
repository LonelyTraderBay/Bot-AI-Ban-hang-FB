import { useState } from 'react';
import { Alert, Button, TextField } from '@mui/material';
import type { StockTransfer, StockTransferLine } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useListQuery } from '@/shared/model/filters';
import { codePointLength, dateTime } from '@/shared/model/format';
import { useCan, useScope } from '@/shared/model/scope';
import { ActionGroup, FieldGroup, FormFields } from '@/shared/ui/composition';
import { ConfirmDialog, DataTable, DetailLine, EditDialog, ErrorNotice, MutationButton, PageHeader, Pager, Panel, QueryState, RouteLink, Toolbar } from '@/shared/ui/components';
import { StockPositionPicker, WarehouseLookupStatus, WarehousePicker, stockReads, useActiveWarehouses } from './warehouse-forms';
import type { PickedSku } from './warehouse-forms';

const statuses = { draft: 'Bản nháp', in_transit: 'Đang chuyển', completed: 'Đã nhận đủ', closed_short: 'Đã đóng thiếu', cancelled: 'Đã hủy' };
const reads = ['listStockTransfers', ...stockReads] as const;
const remaining = (line: StockTransferLine) => line.quantity - line.received - line.missing;
type TransferTask = 'detail' | 'dispatch' | 'receive' | 'close_short' | 'cancel';

export function StockTransfersPage() {
    const { shop } = useScope();
    const warehouses = useActiveWarehouses();
    const canAdjust = useCan('inventory.adjust');
    const query = useApi('listStockTransfers', { query: useListQuery('listStockTransfers') });
    const change = useCommand('updateStockTransfer', reads);
    const [creating, setCreating] = useState(false);
    const [selected, setSelected] = useState<{ transfer: StockTransfer; task: TransferTask } | null>(null);
    const close = () => { setCreating(false); setSelected(null); };
    const open = (transfer: StockTransfer, task: TransferTask) => { change.clearError(); setSelected({ transfer, task }); };
    const warehouseName = (id: string) => warehouses.data?.data.find(warehouse => warehouse.id === id)?.name ?? id;
    const tooFewWarehouses = Boolean(warehouses.data && warehouses.data.data.length < 2 && !warehouses.hasMore);
    return <>
        <PageHeader title="Phiếu chuyển kho" subtitle="Theo dõi hàng đã xuất, đang chuyển, đã nhận và còn thiếu."
            actions={<MutationButton permission="inventory.adjust" variant="contained" disabled={tooFewWarehouses || !warehouses.data}
                onClick={() => setCreating(true)}>Tạo phiếu chuyển</MutationButton>} />
        <Panel title="Điều chuyển giữa kho" action={<RouteLink to={`/s/${shop.id}/settings/warehouses`}>Quản trị kho</RouteLink>}>
            {tooFewWarehouses && <Alert severity="info">Cần ít nhất hai kho đang hoạt động trong cửa hàng để tạo phiếu.</Alert>}
            <ErrorNotice error={warehouses.error} />
            <Toolbar operation="listStockTransfers" placeholder="Tìm mã phiếu, kho hoặc SKU…" />
            <QueryState query={query} pendingProfile="section">{query.data && <>
                <DataTable label="Danh sách phiếu chuyển kho" reflowOnMobile rows={query.data.data} rowKey={row => row.id} empty="Chưa có phiếu chuyển kho." columns={[
                    { key: 'transfer', label: 'Phiếu', render: row => row.id },
                    { key: 'warehouses', label: 'Kho gửi → Kho nhận', render: row => `${warehouseName(row.fromWarehouseId)} → ${warehouseName(row.toWarehouseId)}` },
                    { key: 'status', label: 'Trạng thái', render: row => statuses[row.status] },
                    { key: 'transit', label: 'Đang chuyển', render: row => row.status === 'in_transit' ? row.lines.reduce((total, line) => total + remaining(line), 0) : 0 },
                    { key: 'time', label: 'Ngày xuất', render: row => row.dispatchedAt ? dateTime(row.dispatchedAt, shop.timezone) : 'Chưa xuất' },
                    { key: 'actions', label: 'Thao tác', render: row => <ActionGroup direction="row">
                        <Button size="small" onClick={() => open(row, 'detail')}>Chi tiết phiếu</Button>
                        {row.status === 'draft' && <>
                            <MutationButton permission="inventory.adjust" onClick={() => open(row, 'dispatch')}>Xuất chuyển kho</MutationButton>
                            <MutationButton permission="inventory.adjust" onClick={() => open(row, 'cancel')}>Hủy phiếu</MutationButton>
                        </>}
                        {row.status === 'in_transit' && <>
                            <MutationButton permission="inventory.adjust" onClick={() => open(row, 'receive')}>Nhận hàng</MutationButton>
                            {canAdjust && <MutationButton permission="warehouses.manage" onClick={() => open(row, 'close_short')}>Đóng phiếu thiếu</MutationButton>}
                        </>}
                    </ActionGroup> },
                ]} />
                <Pager page={query.data.page} />
            </>}</QueryState>
        </Panel>
        {creating && <TransferCreation close={close} />}
        {selected?.task === 'detail' && <TransferDetails transfer={selected.transfer} close={close} />}
        {selected?.task === 'receive' && <TransferReceipt transfer={selected.transfer} close={close} />}
        {selected && (selected.task === 'dispatch' || selected.task === 'close_short' || selected.task === 'cancel') && <ConfirmDialog open
            title={{ dispatch: 'Xuất chuyển kho', close_short: 'Đóng phiếu thiếu', cancel: 'Hủy phiếu chuyển', receive: '', detail: '' }[selected.task]}
            description={selected.task === 'close_short' ? 'Phần đang đi sẽ được ghi thiếu theo lý do và kết thúc phiếu.' : selected.transfer.id}
            requireReason={selected.task === 'close_short'} busy={change.pending} error={change.error} onClose={close} onConfirm={async reason => {
                if (selected.task === 'dispatch' || selected.task === 'close_short' || selected.task === 'cancel')
                    await change.execute({ path: { resourceId: selected.transfer.id }, version: selected.transfer.version,
                        body: { action: selected.task, ...(reason ? { reason } : {}) } });
                close();
            }} />}
    </>;
}

function TransferCreation({ close }: { close: () => void }) {
    const { online } = useScope();
    const warehouses = useActiveWarehouses();
    const create = useCommand('createStockTransfer', ['listStockTransfers']);
    const [fromWarehouseId, setFrom] = useState('');
    const [toWarehouseId, setTo] = useState('');
    const [picked, setPicked] = useState<PickedSku[]>([]);
    const [reason, setReason] = useState('');
    const length = codePointLength(reason.trim());
    const valid = Boolean(fromWarehouseId && toWarehouseId && fromWarehouseId !== toWarehouseId && length >= 5 && length <= 500
        && picked.length > 0 && picked.every(line => /^(?:[1-9][0-9]{0,5}|1000000)$/.test(line.quantity)));
    return <EditDialog open title="Tạo phiếu chuyển" onClose={close} busy={create.pending}
        actions={<Button form="transfer-create" type="submit" variant="contained" disabled={!valid || !online || create.pending}>Lưu phiếu nháp</Button>}>
        <FormFields component="form" id="transfer-create" onSubmit={event => {
            event.preventDefault();
            if (!valid || !online || create.pending) return;
            void create.execute({ body: { fromWarehouseId, toWarehouseId, reason: reason.trim(),
                lines: picked.map(item => ({ variantId: item.id, quantity: Number(item.quantity) })) } }).then(close).catch(() => undefined);
        }}>
            <ErrorNotice error={create.error} />
            <FieldGroup direction={{ xs: 'column', sm: 'row' }}>
                <WarehousePicker label="Kho gửi" value={fromWarehouseId} change={id => { setFrom(id); setPicked([]); }} warehouses={warehouses} exclude={toWarehouseId} />
                <WarehousePicker label="Kho nhận" value={toWarehouseId} change={setTo} warehouses={warehouses} exclude={fromWarehouseId} />
            </FieldGroup>
            <WarehouseLookupStatus warehouses={warehouses} />
            <TextField label="Lý do chuyển kho" value={reason} onChange={event => setReason(event.target.value)} helperText="Nhập từ 5 đến 500 ký tự." />
            <StockPositionPicker key={fromWarehouseId} warehouseId={fromWarehouseId} selected={picked} change={setPicked} withQuantity />
        </FormFields>
    </EditDialog>;
}

function TransferReceipt({ transfer, close }: { transfer: StockTransfer; close: () => void }) {
    const { online } = useScope();
    const receive = useCommand('updateStockTransfer', reads);
    const [quantities, setQuantities] = useState<Record<string, string>>({});
    const pending = transfer.lines.filter(line => remaining(line) > 0);
    const entered = pending.filter(line => quantities[line.variantId]?.trim());
    const valid = entered.length > 0 && entered.every(line => /^[1-9]\d*$/.test(quantities[line.variantId] ?? '')
        && Number(quantities[line.variantId]) <= remaining(line));
    return <EditDialog open title="Nhận hàng chuyển kho" onClose={close} busy={receive.pending}
        actions={<Button form="transfer-receipt" type="submit" variant="contained" disabled={!valid || !online || receive.pending}>Ghi nhận số đã nhận</Button>}>
        <FormFields component="form" id="transfer-receipt" onSubmit={event => {
            event.preventDefault();
            if (!valid || !online || receive.pending) return;
            void receive.execute({ path: { resourceId: transfer.id }, version: transfer.version, body: {
                action: 'receive', lines: entered.map(line => ({ variantId: line.variantId, quantity: Number(quantities[line.variantId]) })),
            } }).then(close).catch(() => undefined);
        }}>
            <ErrorNotice error={receive.error} />
            <Alert severity="info">Chỉ nhập số nhận trong lần này. Phần chưa nhận tiếp tục ở trạng thái đang chuyển.</Alert>
            {pending.map(line => <TextField key={line.variantId} label={`Nhận SKU ${line.sku}`} value={quantities[line.variantId] ?? ''}
                helperText={`Còn đang chuyển ${remaining(line)}`} inputProps={{ inputMode: 'numeric' }}
                onChange={event => setQuantities(previous => ({ ...previous, [line.variantId]: event.target.value }))} />)}
        </FormFields>
    </EditDialog>;
}

function TransferDetails({ transfer, close }: { transfer: StockTransfer; close: () => void }) {
    const { shop } = useScope();
    return <EditDialog open title={`Phiếu ${transfer.id}`} onClose={close} actions={<Button onClick={close}>Đóng</Button>}>
        <FormFields>
            <DetailLine label="Trạng thái">{statuses[transfer.status]}</DetailLine>
            <DetailLine label="Kho gửi">{transfer.fromWarehouseId}</DetailLine>
            <DetailLine label="Kho nhận">{transfer.toWarehouseId}</DetailLine>
            <DetailLine label="Lý do">{transfer.reason}</DetailLine>
            <DetailLine label="Xác nhận thiếu">{transfer.discrepancyReason ?? '—'}</DetailLine>
            <DataTable label="SKU theo phiếu chuyển" reflowOnMobile rows={transfer.lines} rowKey={line => line.variantId} columns={[
                { key: 'sku', label: 'SKU', render: line => line.sku },
                { key: 'target', label: 'Số trên phiếu', render: line => line.quantity },
                { key: 'received', label: 'Đã nhận', render: line => line.received },
                { key: 'transit', label: 'Đang chuyển', render: line => transfer.status === 'in_transit' ? remaining(line) : 0 },
                { key: 'missing', label: 'Đã xác nhận thiếu', render: line => line.missing },
            ]} />
            {transfer.dispatchedAt && <RouteLink to={`/s/${shop.id}/inventory/movements?q=${encodeURIComponent(transfer.id)}`}>Mở lịch sử theo phiếu</RouteLink>}
        </FormFields>
    </EditDialog>;
}
