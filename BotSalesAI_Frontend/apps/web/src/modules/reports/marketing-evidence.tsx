import { Typography } from '@mui/material';
import type { MarketingSummary } from '@botsales/contracts';
import { Amount, DataTable, Panel, RouteLink } from '../../shared/ui/components';
import { PageSections } from '../../shared/ui/composition';

export function MarketingEvidence({ summary, shopId }: { summary: MarketingSummary; shopId: string }) {
    const shop = `/s/${shopId}`;
    if (!summary.demandStock && !summary.campaignResults && !summary.actualSpendSources?.length) return null;
    return <PageSections geometry={{ gridColumn: '1 / -1' }} shrinkChildren>
        {summary.demandStock && <Panel title="Nhu cầu và tồn khả dụng"
            subtitle="Tối đa 25 SKU theo số lượng trong đơn đã chốt trong kỳ. Tồn khả dụng được đọc ở kho mặc định tại thời điểm xem.">
            <DataTable mobile={{ layout: 'comparison' }} label="Nhu cầu và tồn khả dụng" rows={summary.demandStock} rowKey={row => row.variantId}
                empty="Chưa có số lượng đã chốt trong kỳ." columns={[
                    { key: 'sku', label: 'SKU', render: row => row.sku },
                    { key: 'ordered', label: 'Đã chốt', align: 'right', render: row => row.orderedUnits },
                    { key: 'available', label: 'Tồn khả dụng', align: 'right', render: row => row.availableUnits ?? 'Chưa có số liệu' },
                    { key: 'source', label: 'Nguồn', render: row => <>
                        <RouteLink to={`${shop}/orders/${row.orderId}`}>Đơn mẫu</RouteLink>{' · '}
                        <RouteLink to={`${shop}/inventory?variantId=${encodeURIComponent(row.variantId)}`}>Xem tồn SKU</RouteLink>
                    </> },
                    { key: 'idea', label: 'Gợi ý nội dung', render: row => row.availableUnits === 0 ? 'Cập nhật thông tin hết hàng cho SKU này.' : '—' },
                ]} />
        </Panel>}
        {summary.campaignResults && <Panel title="Hiệu quả chiến dịch"
            subtitle="Tối đa 50 chiến dịch có hồ sơ quy gán hoặc liên kết chi phí đã duyệt. Số chi được lấy từ sổ quảng cáo.">
            <DataTable mobile={{ layout: 'comparison' }} label="Hiệu quả chiến dịch" rows={summary.campaignResults}
                rowKey={row => row.channel + '/' + row.campaignId} empty="Kỳ này chưa có hồ sơ chiến dịch được duyệt." columns={[
                    { key: 'campaign', label: 'Kênh và mã chiến dịch', render: row => <Typography component="span" sx={{ overflowWrap: 'anywhere' }}>{row.channel} · {row.campaignId}</Typography> },
                    { key: 'known', label: 'Đơn có nguồn', align: 'right', render: row => row.knownOrders },
                    { key: 'estimated', label: 'Đơn quy gán ước tính', align: 'right', render: row => row.estimatedOrders },
                    { key: 'actual', label: 'Chi đã ghi sổ', align: 'right', render: row => <Amount value={row.actualSpend} /> },
                    { key: 'source', label: 'Nguồn mẫu', render: row => <>
                        {row.orderId && <RouteLink to={`${shop}/orders/${row.orderId}`}>Đơn mẫu</RouteLink>}
                        {row.attributionSourceId && <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{row.attributionSourceId}</Typography>}
                        {row.spendJournalId && <RouteLink to={`${shop}/finance/journals?journalId=${encodeURIComponent(row.spendJournalId)}`}>Bút toán mẫu</RouteLink>}
                    </> },
                ]} />
        </Panel>}
        {!!summary.actualSpendSources?.length && <Panel title="Chứng từ chi quảng cáo"
            subtitle="Tối đa 25 chứng từ mẫu theo nhóm chiến dịch và nhóm chưa quy gán.">
            <DataTable mobile={{ layout: 'cards', titleKey: 'campaign', summaryKeys: ['source', 'journal'] }} label="Chứng từ chi quảng cáo" rows={summary.actualSpendSources} rowKey={row => row.journalId} columns={[
                { key: 'campaign', label: 'Kênh và mã chiến dịch', render: row => row.campaignId ?
                    <Typography component="span" sx={{ overflowWrap: 'anywhere' }}>{row.channel} · {row.campaignId}</Typography> : 'Chưa quy gán' },
                { key: 'source', label: 'Mã chứng từ', render: row => <Typography component="span" sx={{ overflowWrap: 'anywhere' }}>{row.sourceId}</Typography> },
                { key: 'journal', label: 'Sổ tài chính', render: row => <RouteLink to={`${shop}/finance/journals?journalId=${encodeURIComponent(row.journalId)}`}>Xem bút toán</RouteLink> },
            ]} />
        </Panel>}
    </PageSections>;
}
