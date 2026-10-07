import { ActionGroup, FormFields, PageSections, SectionGrid } from '../../shared/ui/composition';
import { useEffect, useMemo, useRef, useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ExportRequest, Job } from '@botsales/contracts';
import { colors, tokens } from '@botsales/tokens';
import { useApi, useCommand } from '../../shared/api/hooks';
import { useScope, useCan } from '../../shared/model/scope';
import { dateTime, isValidDateOnly } from '../../shared/model/format';
import { Amount, DataTable, DetailLine, ErrorNotice, PageHeader, Panel, Pager, QueryState, RouteLink, Stat, Stats, Status } from '../../shared/ui/components';
import { layoutSx } from '../../shared/ui/layout';
import { authorizedDownloadHref, dateInTimezone, reportDateBoundary, reportFilename } from './report-utils';

const reportLabels: Record<ExportRequest['reportType'], string> = {
    inventory: 'Tồn kho', orders: 'Đơn hàng', cashflow: 'Dòng tiền', profit_loss: 'Lợi nhuận',
};
const sourcePermissions: Record<ExportRequest['reportType'], string> = {
    inventory: 'inventory.read', orders: 'orders.read', cashflow: 'finance.read', profit_loss: 'finance.read',
};

function MarketingReasonTick({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value?: unknown } }) {
    const value = typeof payload?.value === 'string' ? payload.value.trim() : '';
    const lines: string[] = [];
    let line = '';
    for (const word of value.split(/\s+/u).filter(Boolean)) {
        const pieces = [...word];
        while (pieces.length) {
            const piece = pieces.splice(0, 8).join('');
            const candidate = line ? `${line} ${piece}` : piece;
            if (line && [...candidate].length > 8) {
                lines.push(line);
                line = piece;
            } else {
                line = candidate;
            }
        }
    }
    if (line) lines.push(line);

    return <text x={x} y={y} dy={12} textAnchor="middle" fill={colors.textSecondary} fontSize={tokens.fontSizes.body}>
        {lines.map((text, index) => <tspan key={`${index}-${text}`} x={x} dy={index ? 14 : 0}>{text}{index < lines.length - 1 ? ' ' : ''}</tspan>)}
    </text>;
}

export function ReportsPage() {
    const { shop } = useScope();
    const [params, setParams] = useSearchParams();
    const latestParams = useRef(new URLSearchParams(params));
    const pendingSearch = useRef<string | null>(null);
    useEffect(() => {
        const committedSearch = params.toString();
        if (pendingSearch.current !== null && pendingSearch.current !== committedSearch) return;
        latestParams.current = new URLSearchParams(params);
        pendingSearch.current = null;
    }, [params]);
    const summary = useApi('getReportSummary');
    const canReadJobs = useCan('jobs.read');
    const jobs = useApi('listJobs', { query: { limit: 10, cursor: params.get('cursor') || undefined } }, canReadJobs);
    const run = useCommand('createExport', ['listJobs']);
    const requestedType = params.get('reportType');
    const type: ExportRequest['reportType'] = requestedType === 'inventory' || requestedType === 'cashflow' || requestedType === 'profit_loss' ? requestedType : 'orders';
    const snapshotAsOf = summary.data?.data.asOf;
    const defaultRange = useMemo(() => {
        if (!snapshotAsOf) return null;
        try {
            const currentDate = dateInTimezone(snapshotAsOf, shop.timezone);
            return { fromDate: `${currentDate.slice(0, 7)}-01`, toDate: currentDate };
        }
        catch { return null; }
    }, [shop.timezone, snapshotAsOf]);
    const fromValue = params.get('fromDate');
    const toValue = params.get('toDate');
    const readReportDate = (key: 'fromDate' | 'toDate', value: string | null) => {
        if (isValidDateOnly(value)) return value;
        if (params.has(key) && value === '') return '';
        return defaultRange?.[key] || '';
    };
    const from = readReportDate('fromDate', fromValue);
    const to = readReportDate('toDate', toValue);
    const setReportParam = (key: 'reportType' | 'fromDate' | 'toDate', value: string) => {
        const next = new URLSearchParams(latestParams.current);
        if (key === 'reportType') next.set(key, value);
        else next.set(key, isValidDateOnly(value) ? value : '');
        latestParams.current = next;
        pendingSearch.current = next.toString();
        setParams(next, { flushSync: true });
    };
    const [rangeError, setRangeError] = useState('');
    const [lastExport, setLastExport] = useState<{ job: Job; type: ExportRequest['reportType']; from: string; to: string } | null>(null);
    const canExportReports = useCan('reports.export');
    const canExportSource = useCan(sourcePermissions[type]);
    const availableReports = summary.data?.data.availableReports || [];
    const reportAvailable = availableReports.includes(type);

    useEffect(() => {
        if (!snapshotAsOf) return;
        if (!defaultRange) {
            setRangeError('Múi giờ cửa hàng hoặc mốc thời gian báo cáo không hợp lệ.');
            return;
        }
        try {
            const next = new URLSearchParams(latestParams.current);
            let changed = false;
            if (requestedType !== 'inventory' && requestedType !== 'cashflow' && requestedType !== 'profit_loss' && requestedType !== 'orders') {
                next.set('reportType', 'orders');
                changed = true;
            }
            if (!params.has('fromDate') || (fromValue && !isValidDateOnly(fromValue))) {
                next.set('fromDate', defaultRange.fromDate);
                changed = true;
            }
            if (!params.has('toDate') || (toValue && !isValidDateOnly(toValue))) {
                next.set('toDate', defaultRange.toDate);
                changed = true;
            }
            if (changed) {
                latestParams.current = next;
                pendingSearch.current = next.toString();
                setParams(next, { replace: true, flushSync: true });
            }
        }
        catch { setRangeError('Múi giờ cửa hàng hoặc mốc thời gian báo cáo không hợp lệ.'); }
    }, [defaultRange, params, requestedType, fromValue, toValue, setParams, snapshotAsOf]);

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
        <SectionGrid data-testid="reports-main-layout" columns={{ xs: 'minmax(0, 1fr)', xl: 'minmax(0, 1.2fr) minmax(0, .8fr)' }} alignItems={'start'} geometry={{minWidth: 0}}>
            <PageSections data-testid="reports-page-sections" >
                <QueryState query={summary} pendingProfile="section">
                    {summary.data && <Panel title="Tạo tệp báo cáo" subtitle="Ngày được hiểu theo múi giờ cửa hàng và gửi thành mốc thời gian rõ ràng." bodyMode="inset">
                        <FormFields data-testid="reports-export-form-layout" geometry={{maxWidth: 760}}>
                            <ErrorNotice error={run.error} />
                            {rangeError && <Alert severity="error" role="alert">{rangeError}</Alert>}
                            <TextField label="Báo cáo" select value={type} onChange={event => {
                                const value = event.target.value;
                                if (value === 'orders' || value === 'inventory' || value === 'cashflow' || value === 'profit_loss') setReportParam('reportType', value);
                                setLastExport(null);
                            }}>
                                {availableReports.map(report => <MenuItem value={report} key={report}>{reportLabels[report]}</MenuItem>)}
                            </TextField>
                            {availableReports.length === 0 && <Alert severity="info">Vai trò hiện tại chưa có loại báo cáo khả dụng.</Alert>}
                            <FormFields data-testid="reports-date-filters" direction={{ xs: 'column', sm: 'row' }} >
                                <TextField label="Từ ngày" type="date" value={from} onChange={event => setReportParam('fromDate', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                                <TextField label="Đến ngày" type="date" value={to} onChange={event => setReportParam('toDate', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                            </FormFields>
                            <DetailLine label="Múi giờ">{shop.timezone}</DetailLine>
                            <DetailLine label="Snapshot API">{snapshotAsOf ? dateTime(snapshotAsOf, shop.timezone) : 'Chưa có snapshot'}</DetailLine>
                            {!canExportReports && <Alert severity="warning">Vai trò hiện tại không có quyền reports.export.</Alert>}
                            {canExportReports && !canExportSource && <Alert severity="warning">Quyền xuất không thay thế quyền đọc nguồn {sourcePermissions[type]}; loại báo cáo này chưa thể xuất.</Alert>}
                            {canExportReports && canExportSource && !reportAvailable && availableReports.length > 0 && <Alert severity="warning">API không liệt kê loại báo cáo này cho vai trò hiện tại.</Alert>}
                            <Button variant="contained" onClick={handleExport} disabled={!canExportReports || !canExportSource || !reportAvailable || !snapshotAsOf || !from || !to || from > to || run.pending}>
                                {run.pending ? 'Đang tạo snapshot…' : 'Tạo tệp báo cáo CSV'}
                            </Button>
                            {lastExport && <ActionGroup direction={{ xs: 'column', sm: 'row' }}  alignItems={{ xs: 'stretch', sm: 'center' }}>
                                <RouteLink to={`/s/${shop.id}/jobs/${lastExport.job.id}`}>Theo dõi công việc {lastExport.job.id}</RouteLink>
                                {lastDownload && <Link data-testid="reports-export-download" component="a" href={lastDownload} download={reportFilename(lastExport.type, lastExport.from, lastExport.to)} underline="none" sx={[layoutSx.actions.linkTarget, { border: 1, borderColor: 'divider', borderRadius: visualSx.radius.control, color: 'text.primary', fontWeight: visualSx.typography.fontWeight.semibold, '&:hover': { bgcolor: 'action.hover', textDecoration: 'none' }, '&:focus-visible': { outline: `${tokens.focusRing.width}px solid`, outlineColor: 'primary.light', outlineOffset: tokens.focusRing.controlOffset } }]}>Tải CSV</Link>}
                                {lastExport.job.status !== 'succeeded' && <Alert severity={lastExport.job.status === 'partial' || lastExport.job.status === 'failed' ? 'warning' : 'info'}>Tệp chỉ được tải khi công việc xác nhận succeeded.</Alert>}
                                {lastExport.job.status === 'succeeded' && lastExport.job.downloadUrl && !lastDownload && <Alert severity="warning">URL tải không hợp lệ hoặc chưa thuộc HTTPS/nguồn hiện tại.</Alert>}
                            </ActionGroup>}
                            {summary.data.data.warnings.map((warning, index) => <Alert key={`${index}-${warning}`} severity="info">{warning}</Alert>)}
                            <Alert severity="info">API hiện chỉ trả danh sách loại báo cáo và thời điểm snapshot; bộ lọc ngày áp dụng cho lệnh xuất. Không có series hoặc tổng số liệu để giao diện tự suy ra.</Alert>
                        </FormFields>
                    </Panel>}
                </QueryState>
                {canReadJobs ? <QueryState query={jobs} pendingProfile="section">
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
            </PageSections>
            <Panel title="Phạm vi dữ liệu" subtitle="Chỉ những gì API cung cấp mới được trình bày như số liệu." bodyMode="inset">
                <Stack sx={layoutSx.report.contextGap}>
                    <Typography color="text.secondary">Báo cáo dòng, biểu đồ và tổng hợp theo khoảng ngày chưa có trong getReportSummary. Frontend không cộng dữ liệu phân trang để tạo KPI thay thế.</Typography>
                    <Typography color="text.secondary">Trạng thái export được lấy riêng từ listJobs; URL tải chỉ được mở sau khi API trả về công việc hoàn tất.</Typography>
                    <RouteLink to={`/s/${shop.id}/reports/marketing`}>Xem thông tin marketing</RouteLink>
                </Stack>
            </Panel>
        </SectionGrid>
    </>;
}

export function MarketingPage() {
    const { shop } = useScope();
    const data = useApi('getMarketingSummary');
    const m = data.data?.data;
    return <>
        <PageHeader title="Thông tin cho marketing" subtitle="Đề xuất chỉ đọc; trang không tự đăng nội dung hoặc thay đổi ngân sách." />
        <QueryState query={data} pendingProfile="section">{m && <>
            {__MOCK__ && <Alert severity="warning" sx={layoutSx.notice.afterGap}>Số liệu minh họa từ fixture API tổng hợp; không phải dữ liệu quảng cáo hoặc phân bổ nguồn thật.</Alert>}
            <Stats>
                <Stat title="Đơn có nguồn xác định" value={m.knownAttributedOrders} note="Theo trường knownAttributedOrders của API" />
                <Stat title="Đơn chưa rõ nguồn" value={m.unknownAttributionOrders} note="Giữ riêng, không tự gán nguồn" />
                <Stat title="Chi quảng cáo thực tế" value={<Amount value={m.actualSpend} />} note={m.actualSpend ? 'API cung cấp số thực tế' : 'Chưa có số thực tế từ API'} />
                <Stat title="Chi quảng cáo ước tính" value={<Amount value={m.estimatedSpend} />} note="Ước tính không phải số ghi sổ" />
            </Stats>
            <Stack data-testid="marketing-as-of" sx={[layoutSx.report.contextGap, layoutSx.page.sectionAfter]}>
                <Alert severity="info">getMarketingSummary không nhận bộ lọc ngày; không thể lọc chuỗi này theo kỳ ở frontend.</Alert>
                <Typography variant="caption" color="text.secondary">Cập nhật {dateTime(m.asOf, shop.timezone)} · {shop.name} · múi giờ {shop.timezone}</Typography>
            </Stack>
            <SectionGrid data-testid="marketing-sections-grid" columns={{ xs: '1fr', lg: '1fr 1fr' }}>
                <Panel title="Câu hỏi khách thường hỏi" subtitle="Các mục do API tổng hợp cung cấp.">
                    <Box data-testid="marketing-question-surface" sx={layoutSx.report.listSurfaceInset}>
                        <Stack component="ul" data-testid="marketing-top-questions" sx={[{ m: 0, p: 0 }, layoutSx.report.listMarkerInset, layoutSx.report.listItemGap]}>
                            {m.topQuestions.length ? m.topQuestions.map((question, index) => <Typography component="li" key={`${index}-${question}`}>{question}</Typography>) : <Typography component="li" color="text.secondary">Chưa đủ dữ liệu.</Typography>}
                        </Stack>
                    </Box>
                </Panel>
                <Panel title="Lý do không chốt đơn" subtitle="Biểu đồ và bảng dùng cùng một payload API.">
                    <Box role="img" aria-label={`Biểu đồ lý do không chốt đơn, ${m.lostSaleReasons.length} nhóm`} data-testid="marketing-loss-chart" sx={[{ height: 260 }, layoutSx.report.chartViewportInset]}>
                        {m.lostSaleReasons.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={m.lostSaleReasons} accessibilityLayer>
                            <CartesianGrid stroke={colors.borderDecorative} vertical={false} />
                            <XAxis dataKey="reason" stroke={colors.textSecondary} interval={0} height={64} tick={<MarketingReasonTick />} />
                            <YAxis allowDecimals={false} stroke={colors.textSecondary} />
                            <Tooltip contentStyle={{ background: colors.raised, color: colors.textPrimary, borderColor: colors.borderDecorative }} />
                            <Bar dataKey="count" name="Số trường hợp" fill={colors.accent} radius={[4, 4, 0, 0]} />
                        </BarChart></ResponsiveContainer> : <Typography color="text.secondary" sx={layoutSx.report.emptyStateInset}>API chưa cung cấp nhóm lý do để vẽ biểu đồ.</Typography>}
                    </Box>
                    <DataTable rows={m.lostSaleReasons} rowKey={reason => reason.reason} label="Lý do không chốt đơn" empty="Chưa có lý do mất đơn trong payload API." columns={[
                        { key: 'reason', label: 'Lý do', render: reason => reason.reason },
                        { key: 'count', label: 'Số trường hợp', align: 'right', render: reason => reason.count },
                    ]} />
                </Panel>
            </SectionGrid>
            <Alert severity="info" sx={layoutSx.page.sectionBefore}>Không tự gán nguồn cho đơn thiếu dữ liệu, không ghi chi ước tính thành chi thực tế và không tự đăng nội dung hoặc tăng ngân sách.</Alert>
        </>}</QueryState>
    </>;
}
