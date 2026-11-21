import { useState } from 'react';
import { Button, MenuItem, TextField } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import type { PaymentReview } from '@botsales/contracts';
import { useApi } from '@/shared/api/hooks';
import { useListQuery } from '@/shared/model/filters';
import { dateTime } from '@/shared/model/format';
import { useCan, useScope } from '@/shared/model/scope';
import { ActionGroup, FieldGroup, FormFields } from '@/shared/ui/composition';
import { Amount, DataTable, DetailLine, EditDialog, PageHeader, Pager, Panel, QueryState, RouteLink, Toolbar } from '@/shared/ui/components';

const reviewLabels: Record<PaymentReview['status'], string> = {
    unpaid: 'Chờ xác minh thu', partial: 'Đã xác minh một phần', cod_pending: 'Chờ đối soát COD',
    refund_due: 'Còn phải hoàn', settled: 'Đã xử lý', needs_check: 'Cần đối chiếu dữ liệu',
};

export function PaymentReviewsPage() {
    const { shop, session } = useScope();
    const [params, setParams] = useSearchParams();
    const kind = params.get('kind') === 'refund' ? 'refund' : params.get('kind') === 'collection' ? 'collection' : '';
    const stage = params.get('stage') === 'settled' ? 'settled' : params.get('stage') === 'all' ? 'all' : 'open';
    const updateFilter = (key: 'kind' | 'stage', value: string) => setParams(previous => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        next.delete('cursor');
        return next;
    });
    const query = useListQuery('listPaymentReviews');
    const list = useApi('listPaymentReviews', { query: { ...query, kind: kind || undefined, stage: stage === 'all' ? undefined : stage } });
    const [selected, setSelected] = useState<PaymentReview | null>(null);
    return <>
        <PageHeader title="Xác minh thu tiền và hoàn tiền" subtitle="Theo dõi chứng từ, số còn lại và khoản cần đối chiếu theo đơn."
            actions={<RouteLink to={`/s/${shop.id}/finance/reconciliation`}>Đối soát ngân hàng &amp; COD</RouteLink>} />
        <Panel title="Hàng đợi thu và hoàn tiền" subtitle="Số đã xác minh được lấy từ chứng từ hoặc công nợ đã đối chiếu.">
            <Toolbar operation="listPaymentReviews" placeholder="Tìm mã đơn hoặc chứng từ…" filters={<FieldGroup direction={{ xs: 'column', sm: 'row' }} role="group" aria-label="Bộ lọc thu và hoàn tiền">
                <TextField select label="Loại khoản tiền" value={kind} onChange={event => updateFilter('kind', event.target.value)}>
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="collection">Thu tiền</MenuItem>
                    <MenuItem value="refund">Hoàn tiền</MenuItem>
                </TextField>
                <TextField select label="Tình trạng xử lý" value={stage} onChange={event => updateFilter('stage', event.target.value)}>
                    <MenuItem value="open">Cần xử lý</MenuItem>
                    <MenuItem value="settled">Đã xử lý</MenuItem>
                    <MenuItem value="all">Tất cả</MenuItem>
                </TextField>
            </FieldGroup>} />
            <QueryState query={list} pendingProfile="section">{list.data && <>
                <DataTable label="Hàng đợi thu và hoàn tiền" reflowOnMobile rows={list.data.data} rowKey={row => row.id}
                    empty="Chưa có khoản tiền theo bộ lọc." columns={[
                        { key: 'order', label: 'Đơn hàng', render: row => row.orderId },
                        { key: 'status', label: 'Tình trạng', render: row => `${row.kind === 'refund' ? 'Hoàn tiền' : 'Thu tiền'} · ${reviewLabels[row.status]}` },
                        { key: 'expected', label: 'Phải thu/hoàn', align: 'right', render: row => <Amount value={row.expected} /> },
                        { key: 'verified', label: 'Đã xác minh', align: 'right', render: row => <Amount value={row.verified} /> },
                        { key: 'remaining', label: 'Còn lại', align: 'right', render: row => <Amount value={row.remaining} /> },
                        { key: 'assignee', label: 'Phụ trách', render: row => row.assigneeUserId === session.user.id ? 'Bạn' : row.assigneeUserId ?? 'Chưa phân công' },
                        { key: 'due', label: 'Hạn xử lý', render: row => row.dueAt ? dateTime(row.dueAt, shop.timezone) : 'Chưa đặt hạn' },
                        { key: 'action', label: 'Thao tác', render: row => <Button size="small" onClick={() => setSelected(row)}>Xem chứng từ</Button> },
                    ]} />
                <Pager page={list.data.page} />
            </>}</QueryState>
        </Panel>
        {selected && <PaymentReviewDetails row={list.data?.data.find(row => row.id === selected.id) ?? selected} close={() => setSelected(null)} />}
    </>;
}

function PaymentReviewDetails({ row, close }: { row: PaymentReview; close: () => void }) {
    const { shop } = useScope();
    const canReadOrders = useCan('orders.read');
    const canReadWork = useCan('operations.read');
    const shopPath = `/s/${shop.id}`;
    return <EditDialog open title={`Chứng từ đơn ${row.orderId}`} onClose={close} actions={<Button onClick={close}>Đóng</Button>}>
        <FormFields>
            <DetailLine label="Tình trạng">{reviewLabels[row.status]}</DetailLine>
            <DetailLine label="Phải thu/hoàn"><Amount wrap value={row.expected} /></DetailLine>
            <DetailLine label="Đã xác minh"><Amount wrap value={row.verified} /></DetailLine>
            <DetailLine label="Còn lại"><Amount wrap value={row.remaining} /></DetailLine>
            <DetailLine label="Phiếu đổi trả">{row.returnIds.join(', ') || 'Chưa có'}</DetailLine>
            <DetailLine label="Phiếu thu/chi">{row.financeEntryIds.join(', ') || 'Chưa có'}</DetailLine>
            <DetailLine label="Bút toán">{row.journalIds.join(', ') || 'Chưa có'}</DetailLine>
            <DetailLine label="Giao dịch ngân hàng">{row.bankTransactionIds.join(', ') || 'Chưa liên kết'}</DetailLine>
            <DetailLine label="Đợt đối soát COD">{row.codSettlementIds.join(', ') || 'Chưa liên kết'}</DetailLine>
            <DetailLine label="Mã bằng chứng">{row.references.join(', ') || 'Chưa ghi nhận mã'}</DetailLine>
            <ActionGroup direction="row">
                {canReadOrders && <RouteLink to={`${shopPath}/orders/${encodeURIComponent(row.orderId)}`}>Mở đơn hàng</RouteLink>}
                {canReadOrders && row.returnIds.length > 0 && <RouteLink to={`${shopPath}/returns?orderId=${encodeURIComponent(row.orderId)}`}>Mở phiếu đổi trả</RouteLink>}
                {row.financeEntryIds.length > 0 && <RouteLink to={`${shopPath}/finance/entries?q=${encodeURIComponent(row.financeEntryIds[0] || '')}`}>Mở sổ thu chi</RouteLink>}
                {row.journalIds.length > 0 && <RouteLink to={`${shopPath}/finance/journals?q=${encodeURIComponent(row.journalIds[0] || '')}`}>Mở bút toán</RouteLink>}
                <RouteLink to={`${shopPath}/finance/reconciliation`}>Mở đối soát</RouteLink>
                {canReadWork && row.workItemId && <RouteLink to={`${shopPath}/operations?q=${encodeURIComponent(row.workItemId)}`}>Mở công việc</RouteLink>}
            </ActionGroup>
        </FormFields>
    </EditDialog>;
}
