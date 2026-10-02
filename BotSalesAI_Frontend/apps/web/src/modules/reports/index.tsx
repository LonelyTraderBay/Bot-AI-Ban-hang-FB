import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ExportRequest, Job } from '@botsales/contracts';
import { colors } from '@botsales/tokens';
import { useApi, useCommand } from '../../shared/api/hooks';
import { useScope, useCan } from '../../shared/model/scope';
import { dateTime } from '../../shared/model/format';
import { Amount, DataTable, DetailLine, ErrorNotice, PageHeader, Panel, Pager, QueryState, RouteLink, Stat, Stats, Status } from '../../shared/ui/components';
import { authorizedDownloadHref, dateInTimezone, reportDateBoundary, reportFilename } from './report-utils';

const reportLabels: Record<ExportRequest['reportType'], string> = {
    inventory: 'Tồn kho', orders: 'Đơn hàng', cashflow: 'Dòng tiền', profit_loss: 'Lợi nhuận',
};
const sourcePermissions: Record<ExportRequest['reportType'], string> = {
    inventory: 'inventory.read', orders: 'orders.read', cashflow: 'finance.read', profit_loss: 'finance.read',
};

export function ReportsPage() {
    const { shop } = useScope();
    const [params] = useSearchParams();
    const summary = useApi('getReportSummary');
    const canReadJobs = useCan('jobs.read');
    const jobs = useApi('listJobs', { query: { limit: 10, cursor: params.get('cursor') || undefined } }, canReadJobs);
    const run = useCommand('createExport', ['listJobs']);
    const [type, setType] = useState<ExportRequest['reportType']>('orders');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [rangeError, setRangeError] = useState('');
    const [lastExport, setLastExport] = useState<{ job: Job; type: ExportRequest['reportType']; from: string; to: string } | null>(null);
    const canExportReports = useCan('reports.export');
    const canExportSource = useCan(sourcePermissions[type]);
    const availableReports = summary.data?.data.availableReports || [];
    const reportAvailable = availableReports.includes(type);
    const snapshotAsOf = summary.data?.data.asOf;

    useEffect(() => {
        if (!snapshotAsOf) return;
        try {
            const currentDate = dateInTimezone(snapshotAsOf, shop.timezone);
            setFrom(current => current || `${currentDate.slice(0, 7)}-01`);
            setTo(current => current || currentDate);
        }
        catch { setRangeError('Múi giờ cửa hàng hoặc mốc thời gian báo cáo không hợp lệ.'); }
    }, [shop.timezone, snapshotAsOf]);

    const submit = async () => {
        setRangeError('');
        try {
            if (!snapshotAsOf || !from || !to) throw new RangeError('Chưa có snapshot hoặc khoảng ngày đầy đủ.');
            const request = {
                reportType: type,
                format: 'csv',
                from: reportDateBoundary(from, 'start', shop.timezone),
                to: reportDateBoundary(to, 'end', shop.timezone),
                timezone: shop.timezone,
                snapshotAsOf,
            } satisfies ExportRequest;
            setLastExport(null);
            const response = await run.execute({ body: request });
            setLastExport({ job: response.data, type, from, to });
        }
        catch (error) {
            if (error instanceof RangeError) setRangeError(error.message);
        }
    };
    const handleExport = () => { void submit(); };

    const lastDownload = lastExport?.job.status === 'succeeded' && lastExport.job.downloadUrl
        ? authorizedDownloadHref(lastExport.job.downloadUrl, location.origin, __MOCK__)
        : null;

    return <>
        <PageHeader title="Báo cáo & xuất dữ liệu" subtitle="Xuất snapshot do API tạo; số liệu tổng hợp không được tính từ một trang danh sách." />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.2fr) minmax(320px, .8fr)' }, gap: 3, alignItems: 'start' }}>
            <Stack gap={3}>
                <QueryState query={summary}>
                    {summary.data && <Panel title="Tạo tệp báo cáo" subtitle="Ngày được hiểu theo múi giờ cửa hàng và gửi thành mốc thời gian rõ ràng.">
                        <Stack gap={2} sx={{ p: 3, maxWidth: 760 }}>
                            <ErrorNotice error={run.error} />
                            {rangeError && <Alert severity="error" role="alert">{rangeError}</Alert>}
                            <TextField label="Báo cáo" select value={type} onChange={event => {
                                const value = event.target.value;
                                if (value === 'orders' || value === 'inventory' || value === 'cashflow' || value === 'profit_loss') setType(value);
                                setLastExport(null);
                            }}>
                                {availableReports.map(report => <MenuItem value={report} key={report}>{reportLabels[report]}</MenuItem>)}
                            </TextField>
                            {availableReports.length === 0 && <Alert severity="info">Vai trò hiện tại chưa có loại báo cáo khả dụng.</Alert>}
                            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                                <TextField label="Từ ngày" type="date" value={from} onChange={event => setFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                                <TextField label="Đến ngày" type="date" value={to} onChange={event => setTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                            </Stack>
                            <DetailLine label="Múi giờ">{shop.timezone}</DetailLine>
                            <DetailLine label="Snapshot API">{snapshotAsOf ? dateTime(snapshotAsOf, shop.timezone) : 'Chưa có snapshot'}</DetailLine>
                            {!canExportReports && <Alert severity="warning">Vai trò hiện tại không có quyền reports.export.</Alert>}
                            {canExportReports && !canExportSource && <Alert severity="warning">Quyền xuất không thay thế quyền đọc nguồn {sourcePermissions[type]}; loại báo cáo này chưa thể xuất.</Alert>}
                            {canExportReports && canExportSource && !reportAvailable && availableReports.length > 0 && <Alert severity="warning">API không liệt kê loại báo cáo này cho vai trò hiện tại.</Alert>}
                            <Button variant="contained" onClick={handleExport} disabled={!canExportReports || !canExportSource || !reportAvailable || !snapshotAsOf || !from || !to || from > to || run.pending}>
                                {run.pending ? 'Đang tạo snapshot…' : 'Tạo tệp báo cáo CSV'}
                            </Button>
                            {lastExport && <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                                <RouteLink to={`/s/${shop.id}/jobs/${lastExport.job.id}`}>Theo dõi công việc {lastExport.job.id}</RouteLink>
                                {lastDownload && <Link component="a" href={lastDownload} download={reportFilename(lastExport.type, lastExport.from, lastExport.to)} underline="none" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', px: 2, py: .75, border: 1, borderColor: 'divider', borderRadius: 1, color: 'text.primary', fontWeight: 600, '&:hover': { bgcolor: 'action.hover', textDecoration: 'none' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.light', outlineOffset: 2 } }}>Tải CSV</Link>}
                                {lastExport.job.status !== 'succeeded' && <Alert severity={lastExport.job.status === 'partial' || lastExport.job.status === 'failed' ? 'warning' : 'info'}>Tệp chỉ được tải khi công việc xác nhận succeeded.</Alert>}
                                {lastExport.job.status === 'succeeded' && lastExport.job.downloadUrl && !lastDownload && <Alert severity="warning">URL tải không hợp lệ hoặc chưa thuộc HTTPS/nguồn hiện tại.</Alert>}
                            </Stack>}
                            {summary.data.data.warnings.map((warning, index) => <Alert key={`${index}-${warning}`} severity="info">{warning}</Alert>)}
                            <Alert severity="info">API hiện chỉ trả danh sách loại báo cáo và thời điểm snapshot; bộ lọc ngày áp dụng cho lệnh xuất. Không có series hoặc tổng số liệu để giao diện tự suy ra.</Alert>
                        </Stack>
                    </Panel>}
                </QueryState>
                {canReadJobs ? <QueryState query={jobs}>
                    {jobs.data && <Panel title="Công việc gần đây" subtitle="Trạng thái và tiến độ lấy từ API; trang hiện tại có thể chứa nhiều loại công việc.">
                        <DataTable rows={jobs.data.data} rowKey={job => job.id} label="Công việc gần đây" empty="Chưa có công việc trong trang này." columns={[
                            { key: 'id', label: 'Mã công việc', render: job => <RouteLink to={`/s/${shop.id}/jobs/${job.id}`}>{job.id}</RouteLink> },
                            { key: 'kind', label: 'Loại', render: job => <Status value={job.kind} /> },
                            { key: 'status', label: 'Trạng thái', render: job => <Status value={job.status} /> },
                            { key: 'progress', label: 'Tiến độ', align: 'right', render: job => `${job.completed} / ${job.total ?? 'Chưa biết'}` },
                            { key: 'updatedAt', label: 'Cập nhật', render: job => dateTime(job.updatedAt, shop.timezone) },
                        ]} />
                        <Pager page={jobs.data.page} />
                    </Panel>}
                </QueryState> : <Alert severity="info">Vai trò hiện tại không có jobs.read; trạng thái công việc được ẩn theo quyền.</Alert>}
            </Stack>
            <Panel title="Phạm vi dữ liệu" subtitle="Chỉ những gì API cung cấp mới được trình bày như số liệu.">
                <Stack gap={2} sx={{ p: 3 }}>
                    <Typography color="text.secondary">Báo cáo dòng, biểu đồ và tổng hợp theo khoảng ngày chưa có trong getReportSummary. Frontend không cộng dữ liệu phân trang để tạo KPI thay thế.</Typography>
                    <Typography color="text.secondary">Trạng thái export được lấy riêng từ listJobs; URL tải chỉ được mở sau khi API trả về công việc hoàn tất.</Typography>
                    <RouteLink to={`/s/${shop.id}/reports/marketing`}>Xem thông tin marketing</RouteLink>
                </Stack>
            </Panel>
        </Box>
    </>;
}

export function MarketingPage() {
    const { shop } = useScope();
    const data = useApi('getMarketingSummary');
    const m = data.data?.data;
    return <>
        <PageHeader title="Thông tin cho marketing" subtitle="Đề xuất chỉ đọc; trang không tự đăng nội dung hoặc thay đổi ngân sách." />
        <QueryState query={data}>{m && <>
            {__MOCK__ && <Alert severity="warning" sx={{ mb: 2 }}>Số liệu minh họa từ fixture API tổng hợp; không phải dữ liệu quảng cáo hoặc phân bổ nguồn thật.</Alert>}
            <Stats>
                <Stat title="Đơn có nguồn xác định" value={m.knownAttributedOrders} note="Theo trường knownAttributedOrders của API" />
                <Stat title="Đơn chưa rõ nguồn" value={m.unknownAttributionOrders} note="Giữ riêng, không tự gán nguồn" />
                <Stat title="Chi quảng cáo thực tế" value={<Amount value={m.actualSpend} />} note={m.actualSpend ? 'API cung cấp số thực tế' : 'Chưa có số thực tế từ API'} />
                <Stat title="Chi quảng cáo ước tính" value={<Amount value={m.estimatedSpend} />} note="Ước tính không phải số ghi sổ" />
            </Stats>
            <Stack gap={2} sx={{ mb: 3 }}>
                <Alert severity="info">getMarketingSummary không nhận bộ lọc ngày; không thể lọc chuỗi này theo kỳ ở frontend.</Alert>
                <Typography variant="caption" color="text.secondary">Cập nhật {dateTime(m.asOf, shop.timezone)} · {shop.name} · múi giờ {shop.timezone}</Typography>
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
                <Panel title="Câu hỏi khách thường hỏi" subtitle="Các mục do API tổng hợp cung cấp.">
                    <Stack component="ul" sx={{ m: 0, p: 3, pl: 5 }} gap={1.5}>
                        {m.topQuestions.length ? m.topQuestions.map((question, index) => <Typography component="li" key={`${index}-${question}`}>{question}</Typography>) : <Typography component="li" color="text.secondary">Chưa đủ dữ liệu.</Typography>}
                    </Stack>
                </Panel>
                <Panel title="Lý do không chốt đơn" subtitle="Biểu đồ và bảng dùng cùng một payload API.">
                    <Box role="img" aria-label={`Biểu đồ lý do không chốt đơn, ${m.lostSaleReasons.length} nhóm`} data-testid="marketing-loss-chart" sx={{ height: 260, p: 2 }}>
                        {m.lostSaleReasons.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={m.lostSaleReasons} accessibilityLayer>
                            <CartesianGrid stroke={colors.borderDecorative} vertical={false} />
                            <XAxis dataKey="reason" stroke={colors.textSecondary} />
                            <YAxis allowDecimals={false} stroke={colors.textSecondary} />
                            <Tooltip contentStyle={{ background: colors.raised, color: colors.textPrimary, borderColor: colors.borderDecorative }} />
                            <Bar dataKey="count" name="Số trường hợp" fill={colors.accent} radius={[4, 4, 0, 0]} />
                        </BarChart></ResponsiveContainer> : <Typography color="text.secondary" sx={{ p: 3 }}>API chưa cung cấp nhóm lý do để vẽ biểu đồ.</Typography>}
                    </Box>
                    <DataTable rows={m.lostSaleReasons} rowKey={reason => reason.reason} label="Lý do không chốt đơn" empty="Chưa có lý do mất đơn trong payload API." columns={[
                        { key: 'reason', label: 'Lý do', render: reason => reason.reason },
                        { key: 'count', label: 'Số trường hợp', align: 'right', render: reason => reason.count },
                    ]} />
                </Panel>
            </Box>
            <Alert severity="info" sx={{ mt: 3 }}>Không tự gán nguồn cho đơn thiếu dữ liệu, không ghi chi ước tính thành chi thực tế và không tự đăng nội dung hoặc tăng ngân sách.</Alert>
        </>}</QueryState>
    </>;
}
