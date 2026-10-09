import {label as businessLabel} from '@/shared/model/labels';
import { ActionGroup, FormFields, PageSections, SurfaceContent } from '../../shared/ui/composition';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import type { AccountingPeriod, CODSettlement, FinanceEntry, FinanceEntryWrite, Journal, JournalLine, ReconciliationCase } from '@botsales/contracts';
import { useApi, useCommand, usePagedApi } from '../../shared/api/hooks';
import { useScope } from '../../shared/model/scope';
import { useListQuery } from '../../shared/model/filters';
import { codePointLength, dateOnlyInTimezone, dateOnlyStartOfDayToISOString, dateTime, formatMoney, isValidDateOnly } from '@/shared/model/format';
import { Amount, ConfirmDialog, DataTable, DetailLine, EditDialog, ErrorNotice, LookupLoadMore, MutationButton, PageHeader, Pager, Panel, QueryState, RouteLink, Stat, Stats, Status, Toolbar } from '../../shared/ui/components';
import { explainProfitLoss, profitLossQuestions, type ProfitLossQuestionId } from './report-explanations';
import { demoJournalAccounts } from './demo-account-preview';
import { layoutSx } from '../../shared/ui/layout';

function previousMonthRange(timezone: string) {
    const [yearText = '', monthText = ''] = dateOnlyInTimezone(new Date(), timezone).split('-');
    const year = Number(yearText), month = Number(monthText);
    const end = new Date(Date.UTC(year, month - 1, 1));
    const start = new Date(Date.UTC(year, month - 2, 1));
    const dateOnly = (value: Date) => value.toISOString().slice(0, 10);
    return { from: dateOnly(start), to: dateOnly(end) };
}
function useReportRange(timezone: string) {
    const [params, setParams] = useSearchParams();
    const latestParams = useRef(new URLSearchParams(params));
    const pendingSearch = useRef<string | null>(null);
    useEffect(() => {
        const committedSearch = params.toString();
        if (pendingSearch.current !== null && pendingSearch.current !== committedSearch) return;
        latestParams.current = new URLSearchParams(params);
        pendingSearch.current = null;
    }, [params]);
    const defaults = previousMonthRange(timezone);
    const readDate = (key: 'fromDate' | 'toDate') => {
        if (!params.has(key)) return defaults[key === 'fromDate' ? 'from' : 'to'];
        const value = params.get(key);
        return value === '' ? '' : isValidDateOnly(value) ? value : defaults[key === 'fromDate' ? 'from' : 'to'];
    };
    const readDateFrom = (source: URLSearchParams, key: 'fromDate' | 'toDate') => {
        if (!source.has(key)) return defaults[key === 'fromDate' ? 'from' : 'to'];
        const value = source.get(key);
        return value === '' ? '' : isValidDateOnly(value) ? value : defaults[key === 'fromDate' ? 'from' : 'to'];
    };
    const range = { from: readDate('fromDate'), to: readDate('toDate') };
    const valid = isValidDateOnly(range.from) && isValidDateOnly(range.to) && range.from < range.to;
    const setDate = (key: 'fromDate' | 'toDate', value: string) => {
        const next = new URLSearchParams(latestParams.current);
        next.delete('cursor');
        const from = key === 'fromDate' ? (isValidDateOnly(value) ? value : '') : readDateFrom(next, 'fromDate');
        const to = key === 'toDate' ? (isValidDateOnly(value) ? value : '') : readDateFrom(next, 'toDate');
        next.set('fromDate', from);
        next.set('toDate', to);
        latestParams.current = next;
        pendingSearch.current = next.toString();
        setParams(next, { flushSync: true });
    };
    return {
        range,
        setFrom: (from: string) => setDate('fromDate', from),
        setTo: (to: string) => setDate('toDate', to),
        valid,
        query: {
            from: valid ? dateOnlyStartOfDayToISOString(range.from, timezone) : '',
            to: valid ? dateOnlyStartOfDayToISOString(range.to, timezone) : '',
            timezone,
        },
    };
}
function ReportRangeFields({ range, timezone, setFrom, setTo }: { range: { from: string; to: string }; timezone: string; setFrom: (value: string) => void; setTo: (value: string) => void }) {
    return <FormFields direction={{ xs: 'column', sm: 'row' }} afterGap="section">
        <TextField type="date" label="Từ ngày" value={range.from} onChange={event => setFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }}/>
        <TextField type="date" label="Đến trước ngày" value={range.to} onChange={event => setTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }}/>
        <Alert severity="info" sx={{ alignItems: 'center' }}>Khoảng [Từ, Đến); múi giờ {timezone}.</Alert>
    </FormFields>;
}
function decimalUnits(value: string): bigint | null {
    if (!/^\d+(\.\d{1,4})?$/.test(value)) return null;
    const [whole = '', fraction = ''] = value.split('.');
    if (!whole) return null;
    return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, '0'));
}
function hasOutstandingBalance(value: string) {
    const amount = decimalUnits(value);
    return amount !== null && amount > 0n;
}
function decimalText(value: bigint) {
    const fraction = (value % 10000n).toString().padStart(4, '0').replace(/0+$/, '');
    return `${value / 10000n}${fraction ? `.${fraction}` : ''}`;
}
function journalLineError(line: JournalLine) {
    const debit = decimalUnits(line.debit.amount), credit = decimalUnits(line.credit.amount);
    if (!line.accountId.trim()) return 'Nhập mã tài khoản được cấp trong hệ thống.';
    if (debit === null || credit === null) return 'Số tiền dùng tối đa 4 chữ số thập phân.';
    if (debit === 0n && credit === 0n) return 'Mỗi dòng phải có số Nợ hoặc Có lớn hơn 0.';
    if (debit > 0n && credit > 0n) return 'Một dòng chỉ được có Nợ hoặc Có.';
    if (!line.description.trim()) return 'Nhập diễn giải cho dòng.';
    return '';
}
export function CashflowPage() {
    const { shop } = useScope();
    const report = useReportRange(shop.timezone);
    const data = useApi('getCashflow', { query: report.query }, report.valid);
    const c = data.data?.data;
    return <><PageHeader title="Dòng tiền" subtitle="Tiền thực thu và thực chi, tách biệt doanh thu và lợi nhuận." actions={<RouteLink to={`/s/${shop.id}/finance/entries`}>Sổ thu chi</RouteLink>}/><ReportRangeFields range={report.range} timezone={shop.timezone} setFrom={report.setFrom} setTo={report.setTo}/>{report.valid ? <QueryState query={data} pendingProfile="section">{c && <><Stats><Stat title="Tiền đã thu" value={<Amount wrap value={c.receipts}/>}/><Stat title="Tiền đã chi" value={<Amount wrap value={c.disbursements}/>}/><Stat title="Biến động tiền thuần" value={<Amount wrap value={c.netCashMovement}/>} accent note="Không phải số dư tài khoản"/><Stat title="Múi giờ báo cáo" value={c.timezone}/></Stats><Panel title="Kỳ báo cáo" bodyMode="inset"><DetailLine label="Từ">{dateTime(c.from, shop.timezone)}</DetailLine><DetailLine label="Đến (không gồm)">{dateTime(c.to, shop.timezone)}</DetailLine><DetailLine label="Dữ liệu tại">{dateTime(c.asOf, shop.timezone)}</DetailLine>{c.warnings.map(w => <Alert key={w} severity="info" sx={layoutSx.surface.sectionBefore}>{w}</Alert>)}</Panel></>}</QueryState> : <Alert severity="error">Ngày bắt đầu phải trước ngày kết thúc.</Alert>}</>;
}
export function EntriesPage() {
    const { shop } = useScope();
    const list = useApi('listFinanceEntries', { query: useListQuery('listFinanceEntries') });
    const create = useCommand('createFinanceEntry', ['listFinanceEntries']);
    const update = useCommand('updateFinanceEntry', ['listFinanceEntries']);
    const post = useCommand('postFinanceEntry', ['listFinanceEntries', 'getCashflow', 'getProfitLoss', 'listJournals']);
    const reverse = useCommand('reverseFinanceEntry', ['listFinanceEntries', 'getCashflow', 'getProfitLoss', 'listJournals']);
    const [entryId, setEntryId] = useState<string | null>(null);
    const detail = useApi('getFinanceEntry', { path: { entryId: entryId || '' } }, Boolean(entryId));
    const selectedEntry = detail.data?.data;
    const [editing, setEditing] = useState<FinanceEntry | null>(null), [open, setOpen] = useState(false), [selected, setSelected] = useState<{
        entry: FinanceEntry;
        action: 'post' | 'reverse';
    } | null>(null);
    const [kind, setKind] = useState<FinanceEntryWrite['kind']>('disbursement'), [classification, setClassification] = useState<FinanceEntryWrite['classification']>('operating_expense'), [amount, setAmount] = useState(''), [occurredAt, setOccurredAt] = useState('2026-09-29T14:00:00Z'), [description, setDescription] = useState('');
    const begin = (entry: FinanceEntry | null) => { setEditing(entry); setKind(entry?.kind || 'disbursement'); setClassification(entry?.classification || 'operating_expense'); setAmount(entry?.amount.amount || ''); setOccurredAt(entry?.occurredAt || new Date().toISOString()); setDescription(entry?.description || ''); setOpen(true); };
    const classes: Record<FinanceEntryWrite['classification'], string> = {
        sales_receipt: 'Thu bán hàng', inventory_purchase: 'Mua tồn kho', shipping: 'Vận chuyển', platform_fee: 'Phí nền tảng', payment_fee: 'Phí thanh toán', ai_expense: 'Chi phí AI', operating_expense: 'Chi phí vận hành', capital: 'Góp vốn', loan_principal: 'Gốc vay', transfer: 'Chuyển nội bộ', other: 'Khác'
    };
    return <><PageHeader title="Sổ thu chi" subtitle="Phiếu nháp → kiểm tra → ghi sổ. Phiếu đã ghi chỉ điều chỉnh có lịch sử." actions={<MutationButton permission="finance.post" variant="contained" onClick={() => begin(null)}>Tạo phiếu</MutationButton>}/><Panel><Toolbar operation="listFinanceEntries" /><QueryState query={list} pendingProfile="section">{list.data && <><DataTable label="Chứng từ thu chi" rows={list.data.data} rowKey={r => r.id} columns={[
        { key: 'id', label: 'Chứng từ', render: r => <Button onClick={() => setEntryId(r.id)}>{r.id}</Button> }, { key: 'date', label: 'Ngày', render: r => dateTime(r.occurredAt, shop.timezone) }, { key: 'type', label: 'Phân loại', render: r => classes[r.classification] }, { key: 'amount', label: 'Số tiền', render: r => <Amount value={r.amount}/> }, { key: 'note', label: 'Diễn giải', render: r => r.description }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.status}/> },
        {
            key: 'action', label: 'Thao tác', render: r => <Button onClick={() => setEntryId(r.id)}>Chi tiết</Button>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <EditDialog open={Boolean(entryId)} title={selectedEntry ? `Chứng từ ${selectedEntry.id}` : 'Đang tải chứng từ'} onClose={() => setEntryId(null)} actions={<Button onClick={() => setEntryId(null)}>Đóng</Button>}><QueryState query={detail}>{selectedEntry && <Stack sx={layoutSx.query.stateGap}><Status value={selectedEntry.status}/><DetailLine label="Loại">{selectedEntry.kind === 'receipt' ? 'Thu tiền' : 'Chi tiền'}</DetailLine><DetailLine label="Phân loại">{classes[selectedEntry.classification]}</DetailLine><DetailLine label="Số tiền"><Amount wrap value={selectedEntry.amount}/></DetailLine><DetailLine label="Ngày ghi nhận">{dateTime(selectedEntry.occurredAt, shop.timezone)}</DetailLine><DetailLine label="Nguồn">{selectedEntry.sourceRef ? `${selectedEntry.sourceRef.type} / ${selectedEntry.sourceRef.id}` : 'Không có'}</DetailLine><DetailLine label="Diễn giải">{selectedEntry.description}</DetailLine>{selectedEntry.status === 'draft' && <ActionGroup direction="row" ><MutationButton permission="finance.post" onClick={() => begin(selectedEntry)}>Sửa nháp</MutationButton><MutationButton permission="finance.post" onClick={() => setSelected({ entry: selectedEntry, action: 'post' })}>Ghi sổ</MutationButton></ActionGroup>}{selectedEntry.status === 'posted' && <MutationButton permission="finance.post" onClick={() => setSelected({ entry: selectedEntry, action: 'reverse' })}>Đảo phiếu</MutationButton>}</Stack>}</QueryState></EditDialog>
 <EditDialog open={open} title={editing ? 'Sửa phiếu nháp' : 'Phiếu thu chi mới'} onClose={() => setOpen(false)} busy={create.pending || update.pending} actions={<Button variant="contained" disabled={create.pending || update.pending || !/^\d+(\.\d{1,4})?$/.test(amount) || codePointLength(description.trim()) < 5} onClick={async () => { const body: FinanceEntryWrite = { kind, classification, amount: { amount, currency: shop.currency }, occurredAt, description, sourceRef: editing?.sourceRef || null }; try {
        if (editing)
            await update.execute({ path: { entryId: editing.id }, version: editing.version, body });
        else
            await create.execute({ body });
        setOpen(false);
    }
    catch { /* keep form and error */ } }}>Lưu nháp</Button>}><ErrorNotice error={create.error || update.error}/><FormFields ><TextField select label="Loại phiếu" value={kind} onChange={e => setKind(e.target.value === 'receipt' ? 'receipt' : 'disbursement')}><MenuItem value="receipt">Thu tiền</MenuItem><MenuItem value="disbursement">Chi tiền</MenuItem></TextField><TextField select label="Phân loại" value={classification} onChange={e => { const v = e.target.value; if (v in classes)
        setClassification(v as FinanceEntryWrite['classification']); }}>{Object.entries(classes).map(([v, t]) => <MenuItem key={v} value={v}>{t}</MenuItem>)}</TextField><TextField label={`Số tiền (${shop.currency})`} value={amount} onChange={e => setAmount(e.target.value)} inputProps={{ inputMode: 'decimal' }}/><TextField label="Thời điểm ISO 8601" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} helperText="Ví dụ 2026-09-29T14:00:00Z; không tự suy múi giờ từ máy."/><TextField label="Diễn giải" multiline minRows={2} value={description} onChange={e => setDescription(e.target.value)}/><Alert severity="info">Tiền mua hàng tồn kho không tự trở thành toàn bộ chi phí trong lợi nhuận.</Alert></FormFields></EditDialog>
 <ConfirmDialog open={!!selected} title={selected?.action === 'post' ? 'Ghi sổ phiếu đã kiểm' : 'Đảo phiếu đã ghi'} confirmLabel={selected?.action === "post" ? "Ghi sổ phiếu" : "Đảo phiếu"} description={`${selected?.entry.id || ''} · ${formatMoney(selected?.entry.amount)}. Không chuyển tiền thực tế qua chức năng này.`} requireReason onClose={() => setSelected(null)} busy={post.pending || reverse.pending} error={post.error || reverse.error} onConfirm={reason => selected?.action === 'post' ? post.execute({ path: { entryId: selected.entry.id }, body: { expectedVersion: selected.entry.version, reason } }) : reverse.execute({ path: { entryId: selected?.entry.id || '' }, body: { expectedVersion: selected?.entry.version || 1, reason } })}/></>;
}
export function ProfitLossPage() {
    const { shop } = useScope();
    const report = useReportRange(shop.timezone);
    const data = useApi('getProfitLoss', { query: report.query }, report.valid);
    const p = data.data?.data;
    const [question, setQuestion] = useState<ProfitLossQuestionId>('summary');
    const [generatedKey, setGeneratedKey] = useState('');
    const currentKey = p ? `${report.range.from}|${report.range.to}|${p.asOf}|${question}` : '';
    const explanation = p && generatedKey === currentKey ? explainProfitLoss(p, question) : null;
    return <>
        <PageHeader title="Lợi nhuận quản trị" subtitle="Số liệu do API tổng hợp từ nguồn giao dịch, không tính từ trang danh sách đang mở." />
        <ReportRangeFields range={report.range} timezone={shop.timezone} setFrom={value => { setGeneratedKey(''); report.setFrom(value); }} setTo={value => { setGeneratedKey(''); report.setTo(value); }} />
        {report.valid ? <QueryState query={data} pendingProfile="section">
            {p && <>
                <Stats>
                    <Stat title="Doanh thu thuần" value={<Amount wrap value={p.netSales} />} />
                    <Stat title="Giá vốn" value={<Amount wrap value={p.cogs} />} />
                    <Stat title="Lãi gộp" value={<Amount wrap value={p.grossProfit} />} accent />
                    <Stat title="Lợi nhuận vận hành" value={<Amount wrap value={p.operatingProfit} />} note="Chưa có chứng nhận kế toán pháp định" />
                </Stats>
                <PageSections>
                    <Panel title="Chi tiết kết quả kinh doanh" action={<Status value={p.completeness} />} bodyMode="inset">
                        {[
                            ['Doanh thu gộp', p.grossSales], ['Giảm giá', p.discounts], ['Hàng bán trả lại', p.salesReturns], ['Doanh thu thuần', p.netSales], ['Giá vốn', p.cogs], ['Thu phí giao', p.shippingIncome], ['Chi phí giao', p.shippingExpense], ['Phí nền tảng', p.platformFees], ['Phí thanh toán', p.paymentFees], ['Chi phí AI', p.aiExpense], ['Chi phí khác', p.otherOperatingExpenses],
                        ].map(([title, value]) => <DetailLine key={String(title)} label={String(title)}><Amount wrap value={typeof value === 'object' ? value : null} /></DetailLine>)}
                        <DetailLine label="Chính sách">{p.policyVersion}</DetailLine>
                        <DetailLine label="Dữ liệu tại">{dateTime(p.asOf, shop.timezone)}</DetailLine>
                        {p.warnings.map(warning => <Alert key={warning} severity="warning" sx={layoutSx.surface.sectionBefore}>{warning}</Alert>)}
                    </Panel>
                    <Panel title="Hỏi đáp có nguồn" subtitle="Giải thích giới hạn theo đúng snapshot đang hiển thị." bodyMode="inset">
                        {__MOCK__ ? <>
                            <Alert severity="info" sx={layoutSx.notice.afterGap}>Chế độ mô phỏng: câu trả lời theo mẫu cố định, chỉ đọc dữ liệu P&L API tổng hợp này; không gọi AI và không ghi sổ.</Alert>
                            <FormFields>
                                <TextField select label="Câu hỏi về báo cáo" value={question} onChange={event => { setQuestion(event.target.value as ProfitLossQuestionId); setGeneratedKey(''); }}>
                                    {profitLossQuestions.map(item => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}
                                </TextField>
                            </FormFields>
                            <ActionGroup direction="column" beforeGap="form">
                                <Button variant="contained" onClick={() => setGeneratedKey(currentKey)} disabled={!currentKey}>Tạo giải thích mô phỏng</Button>
                            </ActionGroup>
                            {explanation && <SurfaceContent beforeGap="surface">
                                <Box role="region" aria-label="Giải thích báo cáo mô phỏng" data-testid="profit-loss-explanation" sx={{ ...layoutSx.surface.inset, border: 1, borderColor: 'divider', borderRadius: visualSx.radius.control }}>
                                    <Typography sx={layoutSx.notice.afterGap}>{explanation.answer}</Typography>
                                    <Typography variant="subtitle2" sx={layoutSx.report.subheadingAfterGap}>Dữ liệu nguồn trong snapshot</Typography>
                                    {explanation.sources.map(source => <DetailLine key={source.label} label={source.label}>{source.value}</DetailLine>)}
                                    {explanation.warnings.map((warning, index) => <Alert key={`${index}-${warning}`} severity="warning" sx={layoutSx.notice.contentGap}>{warning}</Alert>)}
                                    <Alert severity="info" sx={layoutSx.surface.sectionBefore}>Hợp đồng getProfitLoss chưa trả về journal ID để drill-down; giao diện không tạo liên kết nguồn giả.</Alert>
                                </Box>
                            </SurfaceContent>}
                        </> : <Alert severity="info">Chức năng giải thích chỉ có bản xem trước mô phỏng. API hiện chưa có operation hỏi đáp báo cáo.</Alert>}
                    </Panel>
                </PageSections>
            </>}
        </QueryState> : <Alert severity="error">Ngày bắt đầu phải trước ngày kết thúc.</Alert>}
    </>;
}
function JournalAccountField({ index, value, onChange }: { index: number; value: string; onChange: (accountId: string) => void }) {
    if (__MOCK__) return <TextField select label={`Tài khoản dòng ${index}`} fullWidth value={value} error={!value.trim()} helperText={value ? 'Tài khoản tổng hợp chỉ dùng nghiệm thu UI; không xác thực với sơ đồ kế toán thật.' : 'Chọn tài khoản mẫu để hoàn tất luồng demo.'} onChange={event => onChange(event.target.value)}>
        <MenuItem value="">Chọn tài khoản mẫu</MenuItem>
        {demoJournalAccounts.map(account => <MenuItem key={account.id} value={account.id}>{account.label}</MenuItem>)}
    </TextField>;
    return <TextField label={`Tài khoản dòng ${index}`} fullWidth value={value} error={!value.trim()} helperText={!value.trim() ? 'Nhập ID do hệ thống cấp; UI không tự tạo danh mục tài khoản.' : ''} onChange={event => onChange(event.target.value)}/>;
}

export function JournalsPage() {
    const { shop } = useScope();
    const list = useApi('listJournals', { query: useListQuery('listJournals') });
    const [viewId, setViewId] = useState<string | null>(null);
    const detail = useApi('getJournal', { path: { resourceId: viewId || '' } }, Boolean(viewId));
    const viewedJournal = detail.data?.data;
    const periods = useApi('listAccountingPeriods');
    const create = useCommand('createJournal', ['listJournals']);
    const post = useCommand('postJournal', ['listJournals']);
    const reverse = useCommand('reverseJournal', ['listJournals']);
    const [open, setOpen] = useState(false), [selected, setSelected] = useState<{ journal: Journal; action: 'post' | 'reverse' } | null>(null), [sourceType, setSourceType] = useState('manual'), [sourceId, setSourceId] = useState(''), [date, setDate] = useState(() => dateOnlyInTimezone(new Date(), shop.timezone)), [reason, setReason] = useState('');
    const newLine = (): JournalLine => ({ accountId: '', debit: { amount: '0', currency: shop.currency }, credit: { amount: '0', currency: shop.currency }, description: '' });
    const [lines, setLines] = useState<JournalLine[]>([newLine(), newLine()]);
    const lineErrors = lines.map(journalLineError);
    const debitTotal = lines.reduce((total, line) => total + (decimalUnits(line.debit.amount) ?? 0n), 0n);
    const creditTotal = lines.reduce((total, line) => total + (decimalUnits(line.credit.amount) ?? 0n), 0n);
    const period = periods.data?.data.find(item => date >= item.startDate && date <= item.endDate);
    const periodOpen = period?.state === 'open';
    const balanced = lines.length >= 2 && lineErrors.every(error => !error) && debitTotal === creditTotal && debitTotal > 0n;
    return <><PageHeader title="Bút toán" subtitle="Sổ kép có chứng từ nguồn, kiểm cân bằng tại API và không sửa bút toán đã ghi." actions={<MutationButton permission="finance.post" variant="contained" onClick={() => setOpen(true)}>Tạo bút toán nháp</MutationButton>}/><Panel><Toolbar operation="listJournals"/><QueryState query={list} pendingProfile="section">{list.data && <><DataTable label="Danh sách bút toán" rows={list.data.data} rowKey={journal => journal.id} columns={[
        { key: 'id', label: 'Bút toán', render: journal => <Button onClick={() => setViewId(journal.id)}>{journal.id}</Button> },
        { key: 'date', label: 'Ngày hiệu lực', render: journal => journal.effectiveDate },
        { key: 'source', label: 'Nguồn', render: journal => `${businessLabel(journal.sourceType)} / ${journal.sourceId}` },
        { key: 'state', label: 'Trạng thái', render: journal => <Status value={journal.status}/> },
        { key: 'actions', label: '', render: journal => <Button onClick={() => setViewId(journal.id)}>Chi tiết</Button> },
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
    <EditDialog open={Boolean(viewId)} title={viewedJournal ? `Bút toán ${viewedJournal.id}` : 'Đang tải bút toán'} onClose={() => setViewId(null)} actions={<Button onClick={() => setViewId(null)}>Đóng</Button>}><QueryState query={detail}>{viewedJournal && <><Status value={viewedJournal.status}/><DataTable label="Các dòng của bút toán" rows={viewedJournal.lines.map((line, index) => ({ ...line, key: String(index) }))} rowKey={line => line.key} columns={[
        { key: 'account', label: 'Tài khoản', render: line => line.accountId },
        { key: 'debit', label: 'Nợ', render: line => <Amount value={line.debit}/> },
        { key: 'credit', label: 'Có', render: line => <Amount value={line.credit}/> },
        { key: 'note', label: 'Diễn giải', render: line => line.description },
    ]}/><DetailLine label="Chính sách">{viewedJournal.policyVersion}</DetailLine><DetailLine label="Bút toán gốc">{viewedJournal.reversalOf || '—'}</DetailLine>{viewedJournal.status === 'draft' && <MutationButton permission="finance.post" onClick={() => setSelected({ journal: viewedJournal, action: 'post' })}>Ghi sổ</MutationButton>}{viewedJournal.status === 'posted' && <MutationButton permission="finance.post" onClick={() => setSelected({ journal: viewedJournal, action: 'reverse' })}>Đảo bút toán</MutationButton>}</>}</QueryState></EditDialog>
    <EditDialog open={open} title="Bút toán nháp" onClose={() => setOpen(false)} busy={create.pending} actions={<Button variant="contained" disabled={!sourceId.trim() || codePointLength(reason.trim()) < 5 || create.pending || !balanced || !periodOpen} onClick={async () => { try { await create.execute({ body: { sourceType, sourceId, effectiveDate: date, lines, reason } }); setOpen(false); } catch { /* visible */ } }}>Lưu nháp</Button>}><ErrorNotice error={create.error}/><FormFields ><Alert severity="info">{__MOCK__ ? 'Danh mục dưới đây là dữ liệu tổng hợp để nghiệm thu giao diện, không phải sơ đồ kế toán đã xác minh.' : 'Contract hiện chưa có API danh mục tài khoản; chỉ dùng mã tài khoản do hệ thống cấp.'}</Alert><TextField label="Loại chứng từ nguồn" value={sourceType} onChange={event => setSourceType(event.target.value)}/><TextField label="Mã chứng từ nguồn" value={sourceId} onChange={event => setSourceId(event.target.value)}/><TextField type="date" label="Ngày hiệu lực" value={date} onChange={event => setDate(event.target.value)} slotProps={{ inputLabel: { shrink: true }}}/>{periods.isPending ? <Alert severity="info">Đang tải trạng thái kỳ kế toán…</Alert> : <Alert severity={periodOpen ? 'success' : 'warning'}>{period ? periodOpen ? `Kỳ ${period.startDate} – ${period.endDate} đang mở.` : `Kỳ ${period.startDate} – ${period.endDate} đã khóa; không thể tạo bút toán cho ngày này.` : 'Chưa có kỳ kế toán cấu hình cho ngày hiệu lực.'}</Alert>}{lines.map((line, index) => <Box key={index} sx={{ ...layoutSx.surface.inset, border: 1, borderColor: lineErrors[index] ? 'error.main' : 'divider', borderRadius: visualSx.radius.dialog }}><JournalAccountField index={index + 1} value={line.accountId} onChange={accountId => setLines(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, accountId } : item))}/><Stack direction="row" sx={layoutSx.form.pairedFields}>{(['debit', 'credit'] as const).map(side => <TextField key={side} label={side === 'debit' ? 'Nợ' : 'Có'} value={line[side].amount} error={decimalUnits(line[side].amount) === null || (side === 'debit' ? decimalUnits(line.credit.amount) : decimalUnits(line.debit.amount)) === null} helperText={decimalUnits(line[side].amount) === null ? 'Dùng số thập phân tối đa 4 chữ số.' : ''} inputProps={{ inputMode: 'decimal' }} onChange={event => setLines(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [side]: { amount: event.target.value, currency: shop.currency } } : item))}/>)}</Stack><TextField label="Diễn giải dòng" fullWidth value={line.description} error={!line.description.trim()} helperText={!line.description.trim() ? 'Bắt buộc nhập diễn giải.' : ''} onChange={event => setLines(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))}/>{lineErrors[index] && <Alert severity="warning" sx={layoutSx.notice.contentGap}>{lineErrors[index]}</Alert>}<Button disabled={lines.length <= 2} onClick={() => setLines(current => current.filter((_, itemIndex) => itemIndex !== index))}>Bỏ dòng</Button></Box>)}<Button onClick={() => setLines(current => [...current, newLine()])}>Thêm dòng</Button><Alert severity={balanced ? 'success' : 'warning'}>Tổng Nợ {decimalText(debitTotal)} {shop.currency} · Tổng Có {decimalText(creditTotal)} {shop.currency}{balanced ? ' · Đã cân bằng' : ' · Cần cân bằng và mỗi dòng chỉ có một bên'}</Alert><TextField label="Lý do" value={reason} onChange={event => setReason(event.target.value)}/></FormFields></EditDialog>
    <ConfirmDialog open={!!selected} title={selected?.action === 'post' ? 'Ghi sổ bút toán' : 'Đảo bút toán'} confirmLabel={selected?.action === "post" ? "Ghi sổ bút toán" : "Đảo bút toán"} description={`Bút toán ${selected?.journal.id || ""}: ${selected?.action === "post" ? "ghi vào sổ sau khi kiểm kỳ, cân bằng và nguồn chứng từ; bản đã ghi không được sửa trực tiếp." : "tạo bút toán đảo, giữ nguyên chứng từ gốc và lịch sử."}`} requireReason={selected?.action === 'reverse'} onClose={() => setSelected(null)} error={post.error || reverse.error} busy={post.pending || reverse.pending} onConfirm={confirmReason => selected?.action === 'post' ? post.execute({ path: { resourceId: selected.journal.id }, body: { expectedVersion: selected.journal.version } }) : reverse.execute({ path: { resourceId: selected?.journal.id || '' }, body: { expectedVersion: selected?.journal.version || 1, reason: confirmReason } })}/></>;
}

export function ReconciliationPage() {
    const { shop } = useScope();
    const [params, setParams] = useSearchParams();
    const requestedTab = params.get('tab');
    const tab = requestedTab === 'cod' || requestedTab === 'cases' ? requestedTab : 'bank';
    const banks = useApi('listBankTransactions', { query: useListQuery('listBankTransactions', 'bankCursor') });
    const cod = useApi('listCODSettlements', { query: useListQuery('listCODSettlements', 'codCursor') });
    const cases = useApi('listReconciliationCases', { query: useListQuery('listReconciliationCases', 'caseCursor') });
    const match = useCommand('matchCODSettlement', ['listCODSettlements', 'listBankTransactions', 'listDebtItems', 'getCashflow']);
    const matchBank = useCommand('matchSettlement', ['listReconciliationCases', 'listBankTransactions', 'listDebtItems']);
    const [selected, setSelected] = useState<CODSettlement | null>(null), [caseItem, setCase] = useState<ReconciliationCase | null>(null), [transaction, setTransaction] = useState(''), [fees, setFees] = useState('0'), [evidence, setEvidence] = useState(''), [resourceId, setResource] = useState(''), [allocation, setAllocation] = useState(''), [reason, setReason] = useState(''), [importOpen, setImport] = useState(false);
    const bankChoices = usePagedApi('listBankTransactions', {}, Boolean(selected));
    const caseBank = useApi('getBankTransaction', { path: { resourceId: caseItem?.transactionId || '' } }, Boolean(caseItem));
    const debtChoices = usePagedApi('listDebtItems', {}, Boolean(caseItem));
    const selectedBank = caseItem ? caseBank.data?.data : bankChoices.data?.data.find(item => item.id === transaction);
    const selectedDebt = debtChoices.data?.data.find(item => item.id === resourceId);
    const feeUnits = decimalUnits(fees), allocationUnits = decimalUnits(allocation);
    const codMatchValid = Boolean(selected && selectedBank && feeUnits !== null && feeUnits >= 0n && feeUnits <= (decimalUnits(selected.grossDue.amount) ?? -1n) && (decimalUnits(selected.grossDue.amount) ?? -1n) - feeUnits === decimalUnits(selectedBank.amount.amount) && evidence.trim());
    const bankMatchValid = Boolean(caseItem && selectedBank && selectedDebt && !selectedDebt.disputed && allocationUnits !== null && allocationUnits > 0n && allocationUnits <= (decimalUnits(caseItem.difference.amount) ?? -1n) && allocationUnits <= (decimalUnits(selectedDebt.outstandingAmount.amount) ?? -1n) && selectedDebt.outstandingAmount.currency === selectedBank.amount.currency && ((selectedBank.direction === 'credit') === (selectedDebt.direction === 'receivable')) && codePointLength(reason.trim()) >= 5);
    const selectTab = (_event: SyntheticEvent, value: 'bank' | 'cod' | 'cases') => {
        const next = new URLSearchParams(params);
        if (value === 'bank') next.delete('tab');
        else next.set('tab', value);
        setParams(next, { replace: true, flushSync: true });
    };
    return <><PageHeader title="Đối soát ngân hàng & COD" subtitle="Khách trả tiền cho đơn vị giao hàng chưa đồng nghĩa tiền đã về shop." actions={<MutationButton permission="finance.reconcile" variant="contained" onClick={() => setImport(true)}>Nhập bảng đối soát</MutationButton>}/><Tabs value={tab} onChange={selectTab} sx={layoutSx.page.sectionAfter} variant="scrollable"><Tab value="bank" label="Ngân hàng"/><Tab value="cod" label="COD"/><Tab value="cases" label="Chênh lệch cần xử lý"/></Tabs><Panel>{tab === 'bank' ? <QueryState query={banks} pendingProfile="section">{banks.data && <><DataTable label="Giao dịch sao kê ngân hàng" rows={banks.data.data} rowKey={row => row.id} columns={[
        { key: 'id', label: 'Mã ngoài hệ thống', render: row => row.externalTransactionId },
        { key: 'account', label: 'Tài khoản', render: row => row.accountId },
        { key: 'money', label: 'Số tiền', render: row => <Amount value={row.amount}/> },
        { key: 'direction', label: 'Chiều', render: row => row.direction === 'credit' ? 'Tiền vào' : 'Tiền ra' },
        { key: 'note', label: 'Nội dung', render: row => row.referenceText },
        { key: 'state', label: 'Khớp', render: row => <Status value={row.matchState}/> },
    ]}/><Pager page={banks.data.page} cursorParam="bankCursor"/></>}</QueryState> : tab === 'cod' ? <QueryState query={cod} pendingProfile="section">{cod.data && <><DataTable label="Đợt đối soát COD" rows={cod.data.data} rowKey={row => row.id} columns={[
        { key: 'id', label: 'Đợt COD', render: row => row.externalBatchId },
        { key: 'carrier', label: 'Đơn vị giao', render: row => row.carrierId },
        { key: 'gross', label: 'Phải thu', render: row => <Amount value={row.grossDue}/> },
        { key: 'fee', label: 'Phí thực tế', render: row => <Amount value={row.actualFees}/> },
        { key: 'cash', label: 'Đã về ngân hàng', render: row => <Amount value={row.bankReceived}/> },
        { key: 'state', label: 'Trạng thái', render: row => <Status value={row.status}/> },
        { key: 'action', label: '', render: row => <MutationButton permission="finance.reconcile" disabled={row.status === 'matched'} onClick={() => { setSelected(row); setTransaction(''); setFees(row.actualFees.amount); setEvidence(''); }}>Đối chiếu</MutationButton> },
    ]}/><Pager page={cod.data.page} cursorParam="codCursor"/></>}</QueryState> : <QueryState query={cases} pendingProfile="section">{cases.data && <><DataTable label="Hồ sơ ghép và đối chiếu" rows={cases.data.data} rowKey={row => row.id} columns={[
        { key: 'id', label: 'Mã', render: row => row.id },
        { key: 'transaction', label: 'Giao dịch', render: row => banks.data?.data.find(transaction => transaction.id === row.transactionId)?.externalTransactionId || row.transactionId },
        { key: 'state', label: 'Trạng thái', render: row => <Status value={row.state}/> },
        { key: 'reason', label: 'Cần xử lý', render: row => row.reason },
        { key: 'action', label: '', render: row => <MutationButton permission="finance.reconcile" disabled={row.state === 'matched'} onClick={() => { setCase(row); setTransaction(row.transactionId); setResource(''); setAllocation(''); setReason(''); }}>Ghép giao dịch</MutationButton> },
    ]}/><Pager page={cases.data.page} cursorParam="caseCursor"/></>}</QueryState>}</Panel>
    <EditDialog open={!!selected} title="Ghép tiền COD" onClose={() => setSelected(null)} busy={match.pending} actions={<Button variant="contained" disabled={!codMatchValid || match.pending} onClick={async () => { try { await match.execute({ path: { resourceId: selected?.id || '' }, body: { expectedVersion: selected?.version || 1, bankTransactionId: transaction, actualFees: { amount: fees, currency: shop.currency }, feeEvidenceRef: evidence, reason: 'Đối chiếu bảng COD và giao dịch ngân hàng' } }); setSelected(null); } catch { /* visible */ } }}>Xác nhận khớp</Button>}><ErrorNotice error={match.error}/><QueryState query={bankChoices}>{bankChoices.data && <FormFields ><TextField select label="Mã giao dịch ngân hàng" value={transaction} onChange={event => setTransaction(event.target.value)}><MenuItem value="">Chọn giao dịch chưa ghép</MenuItem>{bankChoices.data.data.filter(item => item.direction === 'credit' && item.matchState === 'unmatched' && item.amount.currency === selected?.grossDue.currency).map(item => <MenuItem key={item.id} value={item.id}>{item.externalTransactionId} · {formatMoney(item.amount)}</MenuItem>)}</TextField><LookupLoadMore label="giao dịch ngân hàng" loadedCount={bankChoices.loadedCount} hasMore={bankChoices.hasMore} busy={bankChoices.isLoadingMore} onLoadMore={bankChoices.loadMore}/><TextField label={`Phí thực tế (${shop.currency})`} value={fees} error={feeUnits === null} helperText={selectedBank && feeUnits !== null && !codMatchValid ? 'Tiền về + phí phải bằng khoản COD và cần chứng từ phí.' : 'Nhập phí theo chứng từ; khoản fee đã khấu trừ không phải chi tiền thêm.'} onChange={event => setFees(event.target.value)} inputProps={{ inputMode: 'decimal' }}/><TextField label="Mã chứng từ phí" value={evidence} onChange={event => setEvidence(event.target.value)}/><Alert severity="warning">Không xác nhận thanh toán bằng ảnh chuyển khoản. Tổng tiền về và phí phải khớp khoản COD.</Alert></FormFields>}</QueryState></EditDialog>
    <EditDialog open={!!caseItem} title="Ghép giao dịch với công nợ" onClose={() => setCase(null)} busy={matchBank.pending} actions={<Button variant="contained" disabled={!bankMatchValid || matchBank.pending} onClick={async () => { try { await matchBank.execute({ path: { resourceId: caseItem?.id || '' }, body: { expectedVersion: caseItem?.version || 1, transactionId: transaction, allocations: [{ resource: { type: 'debt', id: resourceId }, amount: { amount: allocation, currency: shop.currency } }], reason } }); setCase(null); } catch { /* keep form and error */ } }}>Ghi kết quả đối soát</Button>}><ErrorNotice error={matchBank.error}/><QueryState query={caseBank}>{caseBank.data && <QueryState query={debtChoices}>{debtChoices.data && <FormFields ><TextField label="Giao dịch ngoài hệ thống" value={caseBank.data.data.externalTransactionId} InputProps={{ readOnly: true }}/><TextField select label="Khoản công nợ" value={resourceId} onChange={event => setResource(event.target.value)}><MenuItem value="">Chọn khoản nợ chưa tranh chấp</MenuItem>{debtChoices.data.data.filter(item => !item.disputed && hasOutstandingBalance(item.outstandingAmount.amount) && item.outstandingAmount.currency === selectedBank?.amount.currency && ((selectedBank?.direction === 'credit') === (item.direction === 'receivable'))).map(item => <MenuItem key={item.id} value={item.id}>{item.id} · {item.direction === 'receivable' ? 'Phải thu' : 'Phải trả'} · {formatMoney(item.outstandingAmount)}</MenuItem>)}</TextField><LookupLoadMore label="công nợ" loadedCount={debtChoices.loadedCount} hasMore={debtChoices.hasMore} busy={debtChoices.isLoadingMore} onLoadMore={debtChoices.loadMore}/><TextField label={`Số tiền phân bổ (${shop.currency})`} value={allocation} error={allocation !== '' && allocationUnits === null} helperText={allocationUnits !== null && allocationUnits > 0n && !bankMatchValid ? 'Số tiền vượt chênh lệch/khoản nợ, khác tiền tệ hoặc thiếu lý do.' : ''} onChange={event => setAllocation(event.target.value)} inputProps={{ inputMode: 'decimal' }}/><TextField label="Lý do" value={reason} onChange={event => setReason(event.target.value)}/></FormFields>}</QueryState>}</QueryState></EditDialog>
    {importOpen && <StatementDialog onClose={() => setImport(false)}/>}</>;
}
function StatementDialog({ onClose }: {
    onClose: () => void;
}) {
    const { shop } = useScope();
    const upload = useCommand('uploadFile', []), bank = useCommand('importBankStatement', ['listBankTransactions', 'listReconciliationCases']), cod = useCommand('importCODStatement', ['listCODSettlements']);
    const [kind, setKind] = useState('bank'), [file, setFile] = useState<File | null>(null), [account, setAccount] = useState(''), [batch, setBatch] = useState(''), [format, setFormat] = useState('botsales-csv-v1'), [jobId, setJob] = useState(''), [draftCommit, setDraftCommit] = useState<{ scope: string | null; sequence: number }>();
    const fileInput = useRef<HTMLInputElement>(null);
    return <EditDialog open title="Nhập bảng đối soát" onClose={onClose} busy={upload.pending || bank.pending || cod.pending} draftCommit={draftCommit} actions={jobId ? <RouteLink to={`/s/${shop.id}/jobs/${jobId}`}>Xem kết quả nhập</RouteLink> : <Button variant="contained" disabled={!__MOCK__ || !file || !account || !batch || upload.pending || bank.pending || cod.pending} onClick={async () => { if (!file || !__MOCK__)
        return; try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('purpose', kind === 'bank' ? 'bank_statement' : 'cod_statement');
        const f = await upload.execute({ form: fd });
        const body = { fileId: f.data.id, accountOrCarrierId: account, formatId: format, sourceBatchId: batch };
        const result = kind === 'bank' ? await bank.execute({ body }) : await cod.execute({ body });
        setJob(result.data.id);
        setDraftCommit(previous => ({ scope: null, sequence: (previous?.sequence || 0) + 1 }));
    }
    catch { /* visible */ } }}>Kiểm tra và nhập</Button>}><ErrorNotice error={upload.error || bank.error || cod.error}/><FormFields >{!__MOCK__ && <Alert severity="warning">Hợp đồng upload hiện chưa có mục đích cho tệp đối soát. Luồng này chỉ chạy trong MSW demo.</Alert>}<TextField select label="Loại bảng" value={kind} onChange={e => setKind(e.target.value)}><MenuItem value="bank">Ngân hàng</MenuItem><MenuItem value="cod">COD</MenuItem></TextField><Button variant="outlined" onClick={() => fileInput.current?.click()}>{file ? file.name : 'Chọn CSV'}</Button><input ref={fileInput} hidden type="file" accept=".csv,text/csv" aria-label="Tệp CSV" onChange={e => setFile(e.target.files?.[0] || null)}/><TextField label="Mã tài khoản / đơn vị vận chuyển" value={account} onChange={e => setAccount(e.target.value)}/><TextField label="Mã đợt nhập duy nhất" value={batch} onChange={e => setBatch(e.target.value)}/><TextField label="Mã định dạng được backend hỗ trợ" value={format} onChange={e => setFormat(e.target.value)}/><Alert severity="info">Mẫu CSV và định dạng mô phỏng nằm trong samples/. Định dạng ngân hàng thật phải được backend xác nhận; nhập không đồng nghĩa đối soát xong.</Alert></FormFields></EditDialog>;
}
export function DebtsPage() {
    const { shop } = useScope();
    const debts = useApi('listDebtItems', { query: useListQuery('listDebtItems') }), periods = useApi('listAccountingPeriods');
    const close = useCommand('closeAccountingPeriod', ['listAccountingPeriods']);
    const reopen = useCommand('reopenAccountingPeriod', ['listAccountingPeriods']);
    const [selected, setSelected] = useState<AccountingPeriod | null>(null), [approval, setApproval] = useState(''), [reason, setReason] = useState('');
    return <><PageHeader title="Công nợ & khóa kỳ" subtitle="Theo dõi khoản còn phải thu/trả; khóa kỳ chỉ khi các điều kiện được kiểm chứng."/><Panel title="Công nợ"><QueryState query={debts} pendingProfile="section">{debts.data && <><DataTable label="Công nợ" rows={debts.data.data} rowKey={r => r.id} columns={[
        { key: 'id', label: 'Khoản nợ', render: r => r.id }, { key: 'who', label: 'Đối tượng', render: r => `${r.counterpartyType} / ${r.counterpartyId}` }, { key: 'direction', label: 'Loại', render: r => r.direction === 'receivable' ? 'Phải thu' : 'Phải trả' }, { key: 'original', label: 'Ban đầu', render: r => <Amount value={r.originalAmount}/> }, { key: 'current', label: 'Còn lại', render: r => <Amount value={r.outstandingAmount}/> }, { key: 'due', label: 'Đến hạn', render: r => dateTime(r.dueAt, shop.timezone) }, { key: 'dispute', label: 'Tranh chấp', render: r => r.disputed ? 'Đang giữ xử lý' : 'Không' }
    ]}/><Pager page={debts.data.page}/></>}</QueryState></Panel><Panel title="Kỳ kế toán" beforeGap={"section"}><QueryState query={periods} pendingProfile="section"><DataTable label="Kỳ kế toán" rows={periods.data?.data || []} rowKey={r => r.id} columns={[
        { key: 'period', label: 'Kỳ', render: r => `${r.startDate} → ${r.endDate}` }, { key: 'state', label: 'Trạng thái', render: r => <Status domain="accountingPeriod" value={r.state}/> }, { key: 'issues', label: 'Điều kiện còn thiếu', render: r => r.blockingIssues.join('; ') || 'Xác minh lại tại lúc ghi' },
        {
            key: 'action', label: '', render: r => <MutationButton permission="finance.close" onClick={() => { setSelected(r); setApproval(''); setReason(''); }}>{r.state === 'closed' ? 'Mở lại có phê duyệt' : 'Kiểm & khóa kỳ'}</MutationButton>
        }
    ]}/></QueryState></Panel><ConfirmDialog open={!!selected && selected.state !== 'closed'} title="Khóa kỳ kế toán" confirmLabel="Khóa kỳ kế toán" description={`Kỳ ${selected?.id || ""}, từ ${selected?.startDate || ""} đến ${selected?.endDate || ""}: khóa ghi sổ mới sau khi kiểm chứng từ nháp, sai lệch và COD. Mở lại cần quyền và phê duyệt riêng.`} onClose={() => setSelected(null)} busy={close.pending} error={close.error} onConfirm={() => close.execute({ path: { resourceId: selected?.id || '' }, body: { expectedVersion: selected?.version || 1 } })}/><EditDialog open={selected?.state === 'closed'} title="Mở lại kỳ đã khóa" onClose={() => setSelected(null)} busy={reopen.pending} actions={<Button disabled={!approval || codePointLength(reason) < 5 || reopen.pending} onClick={async () => { try {
        await reopen.execute({ path: { resourceId: selected?.id || '' }, body: { expectedVersion: selected?.version || 1, approvalId: approval, reason } });
        setSelected(null);
    }
    catch { /* visible */ } }}>Mở lại kỳ</Button>}><ErrorNotice error={reopen.error}/><FormFields ><TextField label="Mã phê duyệt đúng kỳ" value={approval} onChange={e => setApproval(e.target.value)}/><TextField label="Lý do" value={reason} onChange={e => setReason(e.target.value)}/></FormFields></EditDialog></>;
}
