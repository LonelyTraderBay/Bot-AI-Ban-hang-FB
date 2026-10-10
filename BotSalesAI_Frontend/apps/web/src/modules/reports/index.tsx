import { ActionGroup, FormFields, PageSections, SectionGrid } from '../../shared/ui/composition';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Text, Tooltip, XAxis, YAxis } from 'recharts';
import type { ExportRequest, Job, MarketingBucket } from '@botsales/contracts';
import { colors, tokens } from '@botsales/tokens';
import { useApi, useCommand } from '../../shared/api/hooks';
import { useScope, useCan } from '../../shared/model/scope';
import { dateTime, formatDateOnly, isValidDateOnly } from '../../shared/model/format';
import { Amount, DataTable, DetailLine, ErrorNotice, PageHeader, Panel, Pager, QueryState, RouteLink, Stat, Stats, Status } from '../../shared/ui/components';
import { layoutSx } from '../../shared/ui/layout';
import { authorizedDownloadHref, dateInTimezone, reportDateBoundary, reportFilename } from './report-utils';

const reportLabels: Record<ExportRequest['reportType'], string> = {
    inventory: 'Tồn kho', orders: 'Đơn hàng', cashflow: 'Dòng tiền', profit_loss: 'Lợi nhuận',
};
const sourcePermissions: Record<ExportRequest['reportType'], string> = {
    inventory: 'inventory.read', orders: 'orders.read', cashflow: 'finance.read', profit_loss: 'finance.read',
};

function MarketingReasonTick({ x = 0, y = 0, width = 0, visibleTicksCount = 1, payload }: { x?: number; y?: number; width?: number; visibleTicksCount?: number; payload?: { value?: unknown } }) {
    const value = typeof payload?.value === 'string' ? payload.value.trim() : '';
    const categoryLabelInset = 8;
    const labelWidth = Math.max(1, width / Math.max(1, visibleTicksCount) - categoryLabelInset);
    return <Text x={x} y={y} dy={12} width={labelWidth} breakAll verticalAnchor="start" textAnchor="middle" fill={colors.textSecondary}
        style={{ fontSize: tokens.fontSizes.body, fontFamily: tokens.fontFamily }}>{value}</Text>;
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
    const [params, setParams] = useSearchParams();
    const search = params.toString();
    const fromParam = params.get('fromDate') || '';
    const toParam = params.get('toDate') || '';
    const bucketParam = params.get('bucket') || 'day';
    const hasDateFilter = params.has('fromDate') || params.has('toDate');
    const appliedError = marketingRangeError(fromParam, toParam, bucketParam, !hasDateFilter);
    const query = appliedError ? undefined : {
        ...(params.has('fromDate') ? { fromDate: fromParam } : {}),
        ...(params.has('toDate') ? { toDate: toParam } : {}),
        ...(params.has('bucket') ? { bucket: bucketParam as MarketingBucket } : {}),
    };
    const data = useApi('getMarketingSummary', query && Object.keys(query).length ? { query } : undefined, !appliedError);
    const m = data.data?.data;
    const marketingPeriod = m?.period;
    const [draft, setDraft] = useState({ fromDate: fromParam, toDate: toParam, bucket: bucketParam });
    const [showFilterError, setShowFilterError] = useState(false);
    const fromRef = useRef<HTMLInputElement>(null);
    const toRef = useRef<HTMLInputElement>(null);
    const bucketRef = useRef<HTMLInputElement>(null);
    const draftError = marketingRangeError(draft.fromDate, draft.toDate, draft.bucket, false);
    const visibleFilterError = showFilterError ? draftError : appliedError;

    useEffect(() => {
        if (marketingPeriod) {
            setDraft({ fromDate: marketingPeriod.fromDate, toDate: marketingPeriod.toDate, bucket: marketingPeriod.bucket });
            const next = new URLSearchParams({ fromDate: marketingPeriod.fromDate, toDate: marketingPeriod.toDate, bucket: marketingPeriod.bucket });
            if (next.toString() !== search) setParams(next, { replace: true });
        }
    }, [marketingPeriod, search, setParams]);

    useEffect(() => {
        const current = new URLSearchParams(search);
        if (!current.has('fromDate') && !current.has('toDate')) return;
        setDraft({ fromDate: current.get('fromDate') || '', toDate: current.get('toDate') || '', bucket: current.get('bucket') || 'day' });
        setShowFilterError(false);
    }, [search]);

    const applyFilter = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setShowFilterError(true);
        if (draftError) {
            const target = draftError.field === 'fromDate' ? fromRef.current : draftError.field === 'toDate' ? toRef.current : bucketRef.current;
            target?.focus();
            return;
        }
        const next = new URLSearchParams({ fromDate: draft.fromDate, toDate: draft.toDate, bucket: draft.bucket });
        setShowFilterError(false);
        setParams(next);
    };

    return <>
        <PageHeader title="Thông tin cho marketing" subtitle="Đề xuất chỉ đọc; trang không tự đăng nội dung hoặc thay đổi ngân sách." />
        {__MOCK__ && <Alert severity="warning" sx={layoutSx.notice.afterGap}>Số liệu mẫu do API mô phỏng tổng hợp; chưa kết nối tài khoản quảng cáo hoặc nguồn phân bổ thật.</Alert>}
        <Panel title="Khoảng thời gian báo cáo" subtitle={`Ngày được tính theo lịch ${shop.timezone} của cửa hàng.`} bodyMode="inset" afterGap="section">
            <FormFields component="form" onSubmit={applyFilter} data-testid="marketing-range-form">
                <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'flex-end' }} sx={layoutSx.toolbar.controlGap}>
                    <TextField inputRef={fromRef} type="date" label="Từ ngày" value={draft.fromDate} onChange={event => setDraft(value => ({ ...value, fromDate: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} error={visibleFilterError?.field === 'fromDate'} helperText={visibleFilterError?.field === 'fromDate' ? visibleFilterError.message : 'Ngày bắt đầu, tính cả ngày đã chọn.'} />
                    <TextField inputRef={toRef} type="date" label="Đến ngày" value={draft.toDate} onChange={event => setDraft(value => ({ ...value, toDate: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} error={visibleFilterError?.field === 'toDate'} helperText={visibleFilterError?.field === 'toDate' ? visibleFilterError.message : 'Tối đa 366 ngày, tính cả hai đầu.'} />
                    <TextField inputRef={bucketRef} select label="Gộp theo" value={draft.bucket} onChange={event => setDraft(value => ({ ...value, bucket: event.target.value }))} error={visibleFilterError?.field === 'bucket'} helperText={visibleFilterError?.field === 'bucket' ? visibleFilterError.message : 'Chọn ngày, tuần hoặc tháng.'}>
                        <MenuItem value="day">Ngày</MenuItem><MenuItem value="week">Tuần</MenuItem><MenuItem value="month">Tháng</MenuItem>
                    </TextField>
                    <Button type="submit" variant="contained">Áp dụng</Button>
                </Stack>
                {showFilterError && draftError && <Alert severity="error" role="alert">{draftError.message}</Alert>}
            </FormFields>
        </Panel>
        {appliedError ? <Alert severity="error" role="alert"><strong>Bộ lọc trên đường dẫn không hợp lệ.</strong> Hãy sửa trường được đánh dấu trước khi áp dụng.</Alert> : <QueryState query={data} pendingProfile="section">{m && <>
            <Stats>
                <Stat title="Đơn có nguồn xác định" value={m.knownAttributedOrders} note="Được API tổng hợp trong kỳ" />
                <Stat title="Đơn chưa rõ nguồn" value={m.unknownAttributionOrders} note="Giữ riêng, không tự gán nguồn" />
                <Stat title="Chi quảng cáo thực tế" value={<Amount wrap value={m.actualSpend} />} note={m.actualSpend ? 'API cung cấp số thực tế' : 'Kỳ này chưa có số thực tế từ API'} />
                <Stat title="Chi quảng cáo ước tính" value={<Amount wrap value={m.estimatedSpend} />} note="Ước tính không phải số ghi sổ" />
            </Stats>
            <Stack data-testid="marketing-as-of" sx={[layoutSx.report.contextGap, layoutSx.page.sectionAfter]}>
                {m.period && <Typography variant="body2">Kỳ {formatDateOnly(m.period.fromDate)} – {formatDateOnly(m.period.toDate)} · gộp theo {m.period.bucket === 'day' ? 'ngày' : m.period.bucket === 'week' ? 'tuần' : 'tháng'}</Typography>}
                <Typography variant="caption" color="text.secondary">Cập nhật {dateTime(m.asOf, m.period?.timezone || shop.timezone)} · {shop.name} · múi giờ {m.period?.timezone || shop.timezone}</Typography>
            </Stack>
            <SectionGrid data-testid="marketing-sections-grid" columns={{ xs: '1fr', lg: '1fr 1fr' }}>
                <Panel title="Đơn theo thời gian" subtitle="Số đơn có nguồn xác định và chưa rõ nguồn do API tổng hợp.">
                    <Box role="img" aria-label={`Số đơn theo ${m.period?.bucket || 'kỳ'} trong khoảng đã chọn`} data-testid="marketing-trend-chart" sx={[{ height: 280 }, layoutSx.report.chartViewportInset]}>
                        {m.trend?.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={m.trend} accessibilityLayer>
                            <CartesianGrid stroke={colors.borderDecorative} vertical={false} />
                            <XAxis dataKey="fromDate" stroke={colors.textSecondary} interval={Math.max(0, Math.ceil(m.trend.length / 7) - 1)} tickFormatter={value => formatDateOnly(String(value))} />
                            <YAxis allowDecimals={false} stroke={colors.textSecondary} />
                            <Tooltip labelFormatter={value => formatDateOnly(String(value))} contentStyle={{ background: colors.raised, color: colors.textPrimary, borderColor: colors.borderDecorative }} />
                            <Legend />
                            <Bar dataKey="knownAttributedOrders" name="Có nguồn xác định" fill={colors.accent} radius={[3, 3, 0, 0]} />
                            <Bar dataKey="unknownAttributionOrders" name="Chưa rõ nguồn" fill={colors.textSecondary} radius={[3, 3, 0, 0]} />
                        </BarChart></ResponsiveContainer> : <Typography color="text.secondary" sx={layoutSx.report.emptyStateInset}>API chưa có bucket dữ liệu trong kỳ đã chọn.</Typography>}
                    </Box>
                    <DataTable label="Tổng hợp marketing theo kỳ" rows={m.trend || []} rowKey={point => point.fromDate} empty="Chưa có dữ liệu theo kỳ trong khoảng này." columns={[
                        { key: 'range', label: 'Khoảng ngày', render: point => `${formatDateOnly(point.fromDate)} – ${formatDateOnly(point.toDate)}` },
                        { key: 'known', label: 'Có nguồn', align: 'right', render: point => point.knownAttributedOrders },
                        { key: 'unknown', label: 'Chưa rõ nguồn', align: 'right', render: point => point.unknownAttributionOrders },
                        { key: 'estimated', label: 'Chi ước tính', align: 'right', render: point => <Amount value={point.estimatedSpend} /> },
                        { key: 'actual', label: 'Chi thực tế', align: 'right', render: point => <Amount value={point.actualSpend} /> },
                    ]} />
                </Panel>
                <Panel title="Câu hỏi khách thường hỏi" subtitle="Các mục do API tổng hợp cung cấp.">
                    <Box data-testid="marketing-question-surface" sx={layoutSx.report.listSurfaceInset}>
                        <Stack component="ul" data-testid="marketing-top-questions" sx={[{ m: 0, p: 0 }, layoutSx.report.listMarkerInset, layoutSx.report.listItemGap]}>
                            {m.topQuestions.length ? m.topQuestions.map((question, index) => <Typography component="li" key={`${index}-${question}`}>{question}</Typography>) : <Typography component="li" color="text.secondary">Chưa có thống kê câu hỏi trong kỳ đã chọn.</Typography>}
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
                        </BarChart></ResponsiveContainer> : <Typography color="text.secondary" sx={layoutSx.report.emptyStateInset}>Chưa có lý do mất đơn trong kỳ này.</Typography>}
                    </Box>
                    <DataTable rows={m.lostSaleReasons} rowKey={reason => reason.reason} label="Lý do không chốt đơn" empty="Chưa có lý do mất đơn trong kỳ đã chọn." columns={[
                        { key: 'reason', label: 'Lý do', render: reason => reason.reason },
                        { key: 'count', label: 'Số trường hợp', align: 'right', render: reason => reason.count },
                    ]} />
                </Panel>
            </SectionGrid>
            <Alert severity="info" sx={layoutSx.page.sectionBefore}>Không tự gán nguồn cho đơn thiếu dữ liệu, không ghi chi ước tính thành chi thực tế và không tự đăng nội dung hoặc tăng ngân sách.</Alert>
        </>}</QueryState>}
    </>;
}

function marketingRangeError(fromDate: string, toDate: string, bucket: string, allowDefault: boolean): { field: 'fromDate' | 'toDate' | 'bucket'; message: string } | null {
    if (!['day', 'week', 'month'].includes(bucket)) return { field: 'bucket', message: 'Chọn nhóm ngày, tuần hoặc tháng.' };
    if (allowDefault && !fromDate && !toDate) return null;
    if (!isValidDateOnly(fromDate)) return { field: 'fromDate', message: 'Nhập ngày bắt đầu hợp lệ.' };
    if (!isValidDateOnly(toDate)) return { field: 'toDate', message: 'Nhập ngày kết thúc hợp lệ.' };
    if (fromDate > toDate) return { field: 'fromDate', message: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' };
    const days = Math.floor((Date.parse(`${toDate}T00:00:00.000Z`) - Date.parse(`${fromDate}T00:00:00.000Z`)) / (24 * 60 * 60 * 1000)) + 1;
    if (days > 366) return { field: 'toDate', message: 'Khoảng báo cáo không được vượt quá 366 ngày.' };
    return null;
}
