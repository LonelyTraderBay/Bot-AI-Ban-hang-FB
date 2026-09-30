import { useState } from 'react';
import { Alert, Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ExportRequest } from '@botsales/contracts';
import { colors } from '@botsales/tokens';
import { useApi, useCommand } from '../../shared/api/hooks';
import { useScope } from '../../shared/model/scope';
import { Amount, DataTable, DetailLine, ErrorNotice, MutationButton, PageHeader, Panel, QueryState, RouteLink, Stat, Stats } from '../../shared/ui/components';
export function ReportsPage() {
    const { shop } = useScope();
    const summary = useApi('getReportSummary');
    const run = useCommand('createExport', []);
    const [type, setType] = useState<ExportRequest['reportType']>('orders'), [from, setFrom] = useState('2026-09-01'), [to, setTo] = useState('2026-09-30'), [job, setJob] = useState('');
    return <><PageHeader title="Báo cáo & xuất dữ liệu" subtitle="Xuất theo snapshot của backend, không dùng dữ liệu trang hiện tại để tính tổng."/><QueryState query={summary}><Panel title="Xuất báo cáo CSV"><Box sx={{ p: 3, maxWidth: 680 }}><ErrorNotice error={run.error}/><Stack gap={2}><TextField label="Báo cáo" select value={type} onChange={e => { const v = e.target.value; if (v === 'orders' || v === 'inventory' || v === 'cashflow' || v === 'profit_loss')
        setType(v); }}>{summary.data?.data.availableReports.map(v => <MenuItem value={v} key={v}>{{ inventory: 'Tồn kho', orders: 'Đơn hàng', cashflow: 'Dòng tiền', profit_loss: 'Lợi nhuận' }[v]}</MenuItem>)}</TextField><Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField label="Từ ngày" type="date" value={from} onChange={e => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }}/><TextField label="Đến ngày" type="date" value={to} onChange={e => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }}/></Stack><DetailLine label="Múi giờ">{shop.timezone}</DetailLine><MutationButton permission="reports.export" variant="contained" busy={run.pending} disabled={!summary.data || !from || !to || from > to} onClick={async () => { try {
        const r = await run.execute({ body: {
                reportType: type, format: 'csv', from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z`, timezone: shop.timezone, snapshotAsOf: summary.data?.meta.asOf || new Date().toISOString()
            } });
        setJob(r.data.id);
    }
    catch { /* visible */ } }}>Tạo tệp báo cáo</MutationButton>{job && <RouteLink to={`/s/${shop.id}/jobs/${job}`}>Xem / tải báo cáo</RouteLink>}{summary.data?.data.warnings.map(w => <Alert key={w} severity="info">{w}</Alert>)}<Alert severity="info">Khoảng ngày được gửi dưới dạng mốc UTC, kèm múi giờ báo cáo. Trước tích hợp phải thống nhất ranh giới ngày với backend.</Alert></Stack></Box></Panel></QueryState></>;
}
export function MarketingPage() {
    const data = useApi('getMarketingSummary');
    const m = data.data?.data;
    return <><PageHeader title="Thông tin cho marketing" subtitle="Đề xuất dựa trên dữ liệu; không tự đăng bài hoặc tăng ngân sách quảng cáo."/><QueryState query={data}>{m && <><Stats><Stat title="Đơn có nguồn xác định" value={m.knownAttributedOrders}/><Stat title="Đơn chưa rõ nguồn" value={m.unknownAttributionOrders}/><Stat title="Chi quảng cáo thực tế" value={<Amount value={m.actualSpend}/>}/><Stat title="Chi quảng cáo ước tính" value={<Amount value={m.estimatedSpend}/>} note="Ước tính không phải số ghi sổ"/></Stats><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}><Panel title="Câu hỏi khách thường hỏi"><Stack sx={{ p: 3 }} gap={2}>{m.topQuestions.length ? m.topQuestions.map((q, i) => <Typography key={`${i}-${q}`}>{q}</Typography>) : <Typography color="text.secondary">Chưa đủ dữ liệu.</Typography>}</Stack></Panel><Panel title="Lý do không chốt đơn"><DataTable rows={m.lostSaleReasons} rowKey={r => r.reason} columns={[{ key: 'reason', label: 'Lý do', render: r => r.reason }, { key: 'count', label: 'Số trường hợp', render: r => r.count }]}/>{m.lostSaleReasons.length > 0 && <Box sx={{ height: 260, p: 2 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={m.lostSaleReasons}><CartesianGrid stroke={colors.borderDecorative} vertical={false}/><XAxis dataKey="reason" stroke={colors.textSecondary}/><YAxis allowDecimals={false} stroke={colors.textSecondary}/><Tooltip contentStyle={{ background: colors.raised, color: colors.textPrimary, borderColor: colors.borderDecorative }}/><Bar dataKey="count" name="Số trường hợp" fill={colors.accent} radius={[4, 4, 0, 0]}/></BarChart></ResponsiveContainer></Box>}</Panel></Box><Alert severity="info" sx={{ mt: 3 }}>Không tự gán nguồn cho đơn thiếu dữ liệu. Biểu đồ chỉ trình bày những trường hợp có số đếm do API cung cấp.</Alert></>}</QueryState></>;
}
