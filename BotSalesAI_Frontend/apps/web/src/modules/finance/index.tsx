import {visualSx} from '@/shared/ui/visual';
import {JournalEditor} from './journal-editor';
import {FinanceEntryEditor,financeEntryClasses as classes} from './entry-editor';
import {StatementDialog} from './statement-import';
import {BookProvenance,CreatePeriodDialog} from './management';
export {OpeningBalancesPage,LedgerPage,TrialBalancePage,BalanceSheetPage} from './management';
import {useReportRange,ReportRangeFields} from './report-range';
import {label as businessLabel} from '@/shared/model/labels';
export { AccountsPage } from './accounts';
import { ActionGroup, FormFields, PageSections, SurfaceContent } from '../../shared/ui/composition';
import { useState, type SyntheticEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import type { AccountingPeriod, CODSettlement, FinanceEntry, Journal, ReconciliationCase } from '@botsales/contracts';
import { useApi, useCommand, usePagedApi } from '../../shared/api/hooks';
import { useScope } from '../../shared/model/scope';
import { useListQuery } from '../../shared/model/filters';
import { codePointLength, dateTime, formatMoney, formatDateOnly } from '@/shared/model/format';
import { Amount, ConfirmDialog, DataTable, DetailLine, EditDialog, ErrorNotice, LookupLoadMore, MutationButton, PageHeader, Pager, Panel, QueryState, RouteLink, Stat, Stats, Status, Toolbar } from '../../shared/ui/components';
import { explainProfitLoss, profitLossQuestions, type ProfitLossQuestionId } from './report-explanations';
import { layoutSx } from '../../shared/ui/layout';

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
    const post = useCommand('postFinanceEntry', ['listFinanceEntries', 'getCashflow', 'getProfitLoss', 'listJournals']);
    const reverse = useCommand('reverseFinanceEntry', ['listFinanceEntries', 'getCashflow', 'getProfitLoss', 'listJournals']);
    const [entryId, setEntryId] = useState<string | null>(null);
    const detail = useApi('getFinanceEntry', { path: { entryId: entryId || '' } }, Boolean(entryId));
    const selectedEntry = detail.data?.data;
    const [editing, setEditing] = useState<FinanceEntry | null>(null), [open, setOpen] = useState(false), [selected, setSelected] = useState<{
        entry: FinanceEntry;
        action: 'post' | 'reverse';
    } | null>(null);
    const [entrySaved,setEntrySaved]=useState(false);
    const begin=(entry:FinanceEntry|null)=>{setEditing(entry);setOpen(true);};
    return <>{entrySaved&&<Alert severity="success" role="status">Đã lưu phiếu nháp.</Alert>}<PageHeader title="Sổ thu chi" subtitle="Phiếu nháp → kiểm tra → ghi sổ. Phiếu đã ghi chỉ điều chỉnh có lịch sử." actions={<MutationButton permission="finance.post" variant="contained" onClick={() => begin(null)}>Tạo phiếu</MutationButton>}/><Panel><Toolbar operation="listFinanceEntries" /><QueryState query={list} pendingProfile="section">{list.data && <><DataTable label="Chứng từ thu chi" rows={list.data.data} rowKey={r => r.id} columns={[
        { key: 'id', label: 'Chứng từ', render: r => <Button onClick={() => setEntryId(r.id)}>{r.id}</Button> }, { key: 'date', label: 'Ngày', render: r => dateTime(r.occurredAt, shop.timezone) }, { key: 'type', label: 'Phân loại', render: r => classes[r.classification] }, { key: 'amount', label: 'Số tiền', render: r => <Amount value={r.amount}/> }, { key: 'note', label: 'Diễn giải', render: r => r.description }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.status}/> },
        {
            key: 'action', label: 'Thao tác', render: r => <Button onClick={() => setEntryId(r.id)}>Chi tiết</Button>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <EditDialog open={Boolean(entryId)} title={selectedEntry ? `Chứng từ ${selectedEntry.id}` : 'Đang tải chứng từ'} onClose={() => setEntryId(null)} actions={<Button onClick={() => setEntryId(null)}>Đóng</Button>}><QueryState query={detail}>{selectedEntry && <Stack sx={layoutSx.query.stateGap}><Status value={selectedEntry.status}/><DetailLine label="Loại">{selectedEntry.kind === 'receipt' ? 'Thu tiền' : 'Chi tiền'}</DetailLine><DetailLine label="Phân loại">{classes[selectedEntry.classification]}</DetailLine><DetailLine label="Số tiền"><Amount wrap value={selectedEntry.amount}/></DetailLine><DetailLine label="Ngày ghi nhận">{dateTime(selectedEntry.occurredAt, shop.timezone)}</DetailLine><DetailLine label="Nguồn">{selectedEntry.sourceRef ? `${selectedEntry.sourceRef.type} / ${selectedEntry.sourceRef.id}` : 'Không có'}</DetailLine><DetailLine label="Diễn giải">{selectedEntry.description}</DetailLine>{selectedEntry.status === 'draft' && <ActionGroup direction="row" ><MutationButton permission="finance.post" onClick={() => begin(selectedEntry)}>Sửa nháp</MutationButton><MutationButton permission="finance.post" onClick={() => setSelected({ entry: selectedEntry, action: 'post' })}>Ghi sổ</MutationButton></ActionGroup>}{selectedEntry.status === 'posted' && !['bank_allocation','cod_settlement','order','order_refund'].includes(selectedEntry.sourceRef?.type||'') && <MutationButton permission="finance.post" onClick={() => setSelected({ entry: selectedEntry, action: 'reverse' })}>Đảo phiếu</MutationButton>}</Stack>}</QueryState></EditDialog>
 {open&&<FinanceEntryEditor key={editing?.id||'new'} initial={editing} onClose={()=>setOpen(false)} onSaved={()=>setEntrySaved(true)}/>}
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
                                    <BookProvenance report={p}/>
                                </Box>
                            </SurfaceContent>}
                        </> : <Alert severity="info">Chức năng giải thích chỉ có bản xem trước mô phỏng. API hiện chưa có operation hỏi đáp báo cáo.</Alert>}
                    </Panel>
                </PageSections>
            </>}
        </QueryState> : <Alert severity="error">Ngày bắt đầu phải trước ngày kết thúc.</Alert>}
    </>;
}
export function JournalsPage() {
    const list = useApi('listJournals', { query: useListQuery('listJournals') });
    const [journalParams,setJournalParams]=useSearchParams();
    const viewId=journalParams.get('journalId');
    const setViewId=(id:string|null)=>{const next=new URLSearchParams(journalParams);if(id)next.set('journalId',id);else next.delete('journalId');setJournalParams(next);};
    const detail = useApi('getJournal', { path: { resourceId: viewId || '' } }, Boolean(viewId));
    const viewedJournal = detail.data?.data;
    const post=useCommand('postJournal',['listJournals','getJournal','getLedger','getTrialBalance','getBalanceSheet','getProfitLoss','getCashflow']),reverse=useCommand('reverseJournal',['listJournals','getJournal','getLedger','getTrialBalance','getBalanceSheet','getProfitLoss','getCashflow']);
    const [open,setOpen]=useState(false),[replacement,setReplacement]=useState<Journal|null>(null),[saved,setSaved]=useState(false),[selected,setSelected]=useState<{journal:Journal;action:'post'|'reverse'}|null>(null);
    return <>{saved&&<Alert severity="success" role="status">Đã lưu bút toán nháp; kiểm lại trước khi ghi.</Alert>}<PageHeader title="Bút toán" subtitle="Sổ kép có chứng từ nguồn, kiểm cân bằng tại API và không sửa bút toán đã ghi." actions={<MutationButton permission="finance.post" variant="contained" onClick={() => {setReplacement(null);setOpen(true);}}>Tạo bút toán nháp</MutationButton>}/><Panel><Toolbar operation="listJournals"/><QueryState query={list} pendingProfile="section">{list.data && <><DataTable label="Danh sách bút toán" rows={list.data.data} rowKey={journal => journal.id} columns={[
        { key: 'id', label: 'Bút toán', render: journal => <Button onClick={() => setViewId(journal.id)}>{journal.id}</Button> },
        { key: 'date', label: 'Ngày hiệu lực', render: journal => formatDateOnly(journal.effectiveDate) },
        { key: 'source', label: 'Nguồn', render: journal => `${businessLabel(journal.sourceType)} / Mã chứng từ: ${journal.sourceId}` },
        { key: 'state', label: 'Trạng thái', render: journal => <Status value={journal.status}/> },
        { key: 'actions', label: '', render: journal => <Button onClick={() => setViewId(journal.id)}>Chi tiết</Button> },
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
    <EditDialog open={Boolean(viewId)} title={viewedJournal ? `Bút toán ${viewedJournal.id}` : 'Đang tải bút toán'} onClose={() => setViewId(null)} actions={<Button onClick={() => setViewId(null)}>Đóng</Button>}><QueryState query={detail}>{viewedJournal && <><Status value={viewedJournal.status}/><DataTable label="Các dòng của bút toán" rows={viewedJournal.lines.map((line, index) => ({ ...line, key: String(index) }))} rowKey={line => line.key} columns={[
        { key: 'account', label: 'Tài khoản', render: line => line.accountId },
        { key: 'debit', label: 'Nợ', render: line => <Amount value={line.debit}/> },
        { key: 'credit', label: 'Có', render: line => <Amount value={line.credit}/> },
        { key: 'note', label: 'Diễn giải', render: line => line.description },
    ]}/><DetailLine label="Chính sách">{viewedJournal.policyVersion}</DetailLine><DetailLine label="Bút toán gốc">{viewedJournal.reversalOf || '—'}</DetailLine>{viewedJournal.status==='reversed'&&!['opening_balance','finance_entry','goods_receipt','shipment_dispatch','order_delivery','return_inspection','stock_adjustment'].includes(viewedJournal.sourceType)&&<MutationButton permission="finance.post" onClick={()=>{setReplacement(viewedJournal);setViewId(null);setOpen(true);}}>Thay thế bút toán</MutationButton>}{viewedJournal.status === 'draft' && <MutationButton permission="finance.post" onClick={() => setSelected({ journal: viewedJournal, action: 'post' })}>Ghi sổ</MutationButton>}{viewedJournal.status === 'posted' && !['opening_balance','finance_entry','goods_receipt','shipment_dispatch','order_delivery','return_inspection','stock_adjustment'].includes(viewedJournal.sourceType) && <MutationButton permission="finance.post" onClick={() => setSelected({ journal: viewedJournal, action: 'reverse' })}>Đảo bút toán</MutationButton>}</>}</QueryState></EditDialog>
    {open&&<JournalEditor key={replacement?.id||'new'} replacement={replacement} onClose={()=>setOpen(false)} onSaved={()=>setSaved(true)}/>}
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
    return <><PageHeader title="Đối soát ngân hàng & COD" subtitle="Khách trả tiền cho đơn vị giao hàng chưa đồng nghĩa tiền đã về shop." actions={<MutationButton permission="finance.reconcile" variant="contained" onClick={() => setImport(true)}>Nhập bảng đối soát</MutationButton>}/><Tabs value={tab} onChange={selectTab} sx={layoutSx.page.sectionAfter} variant="scrollable"><Tab value="bank" label="Ngân hàng"/><Tab value="cod" label="COD"/><Tab value="cases" label="Chênh lệch cần xử lý"/></Tabs><Panel>{tab === 'bank' ? <QueryState query={banks} pendingProfile="section">{banks.data && <><DataTable label="Giao dịch sao kê ngân hàng" rows={banks.data.data} rowKey={row => row.id} empty="Chưa có giao dịch sao kê trong phạm vi đang xem." emptyAction={<Button onClick={() => setImport(true)}>Nhập bảng sao kê</Button>} columns={[
        { key: 'id', label: 'Mã ngoài hệ thống', render: row => row.externalTransactionId },
        { key: 'account', label: 'Tài khoản', render: row => row.accountId },
        { key: 'money', label: 'Số tiền', render: row => <Amount value={row.amount}/> },
        { key: 'direction', label: 'Chiều', render: row => row.direction === 'credit' ? 'Tiền vào' : 'Tiền ra' },
        { key: 'note', label: 'Nội dung', render: row => row.referenceText },
        { key: 'state', label: 'Khớp', render: row => <Status value={row.matchState}/> },
    ]}/><Pager page={banks.data.page} cursorParam="bankCursor"/></>}</QueryState> : tab === 'cod' ? <QueryState query={cod} pendingProfile="section">{cod.data && <><DataTable label="Đợt đối soát COD" rows={cod.data.data} rowKey={row => row.id} empty="Chưa có đợt đối soát COD trong phạm vi đang xem." columns={[
        { key: 'id', label: 'Đợt COD', render: row => row.externalBatchId },
        { key: 'carrier', label: 'Đơn vị giao', render: row => row.carrierId },
        { key: 'gross', label: 'Phải thu', render: row => <Amount value={row.grossDue}/> },
        { key: 'fee', label: 'Phí thực tế', render: row => <Amount value={row.actualFees}/> },
        { key: 'cash', label: 'Đã về ngân hàng', render: row => <Amount value={row.bankReceived}/> },
        { key: 'state', label: 'Trạng thái', render: row => <Status value={row.status}/> },
        { key: 'action', label: '', render: row => <MutationButton permission="finance.reconcile" disabled={row.status === 'matched'} onClick={() => { setSelected(row); setTransaction(''); setFees(row.actualFees.amount); setEvidence(''); }}>Đối chiếu</MutationButton> },
    ]}/><Pager page={cod.data.page} cursorParam="codCursor"/></>}</QueryState> : <QueryState query={cases} pendingProfile="section">{cases.data && <><DataTable label="Hồ sơ ghép và đối chiếu" rows={cases.data.data} rowKey={row => row.id} empty="Chưa có hồ sơ chênh lệch cần xử lý trong phạm vi đang xem." columns={[
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
export function DebtsPage() {
    const { shop } = useScope();
    const [periodOpen,setPeriodOpen]=useState(false),[periodSaved,setPeriodSaved]=useState(false);
    const debts = useApi('listDebtItems', { query: useListQuery('listDebtItems') }), periods = useApi('listAccountingPeriods');
    const close = useCommand('closeAccountingPeriod', ['listAccountingPeriods']);
    const reopen = useCommand('reopenAccountingPeriod', ['listAccountingPeriods']);
    const [selected, setSelected] = useState<AccountingPeriod | null>(null), [approval, setApproval] = useState(''), [reason, setReason] = useState('');
    return <><PageHeader title="Công nợ & khóa kỳ" subtitle="Theo dõi khoản còn phải thu/trả; khóa kỳ chỉ khi các điều kiện được kiểm chứng." actions={<MutationButton permission="finance.close" variant="contained" onClick={()=>setPeriodOpen(true)}>Tạo kỳ kế toán</MutationButton>}/>{periodSaved&&<Alert severity="success" role="status">Đã tạo kỳ kế toán mới.</Alert>}{periodOpen&&<CreatePeriodDialog onClose={()=>setPeriodOpen(false)} onSaved={()=>setPeriodSaved(true)}/>}<Panel title="Công nợ"><QueryState query={debts} pendingProfile="section">{debts.data && <><DataTable label="Công nợ" rows={debts.data.data} rowKey={r => r.id} columns={[
        { key: 'id', label: 'Khoản nợ', render: r => r.id }, { key: 'who', label: 'Đối tượng', render: r => `${r.counterpartyType} / Mã đối tượng: ${r.counterpartyId}` }, { key: 'direction', label: 'Loại', render: r => r.direction === 'receivable' ? 'Phải thu' : 'Phải trả' }, { key: 'original', label: 'Ban đầu', render: r => <Amount value={r.originalAmount}/> }, { key: 'current', label: 'Còn lại', render: r => <Amount value={r.outstandingAmount}/> }, { key: 'due', label: 'Đến hạn', render: r => dateTime(r.dueAt, shop.timezone) }, { key: 'dispute', label: 'Tranh chấp', render: r => r.disputed ? 'Đang giữ xử lý' : 'Không' }
    ]}/><Pager page={debts.data.page}/></>}</QueryState></Panel><Panel title="Kỳ kế toán" beforeGap={"section"}><QueryState query={periods} pendingProfile="section"><DataTable label="Kỳ kế toán" rows={periods.data?.data || []} rowKey={r => r.id} columns={[
        { key: 'period', label: 'Kỳ', render: r => `${formatDateOnly(r.startDate)} → ${formatDateOnly(r.endDate)}` }, { key: 'state', label: 'Trạng thái', render: r => <Status domain="accountingPeriod" value={r.state}/> }, { key: 'issues', label: 'Điều kiện còn thiếu', render: r => r.blockingIssues.join('; ') || 'Xác minh lại tại lúc ghi' },
        {
            key: 'action', label: '', render: r => <MutationButton permission="finance.close" onClick={() => { setSelected(r); setApproval(''); setReason(''); }}>{r.state === 'closed' ? 'Mở lại có phê duyệt' : 'Kiểm & khóa kỳ'}</MutationButton>
        }
    ]}/></QueryState></Panel><ConfirmDialog open={!!selected && selected.state !== 'closed'} title="Khóa kỳ kế toán" confirmLabel="Khóa kỳ kế toán" description={`Kỳ ${selected?.id || ""}, từ ${selected?.startDate || ""} đến ${selected?.endDate || ""}: khóa ghi sổ mới sau khi kiểm chứng từ nháp, sai lệch và COD. Mở lại cần quyền và phê duyệt riêng.`} onClose={() => setSelected(null)} busy={close.pending} error={close.error} onConfirm={() => close.execute({ path: { resourceId: selected?.id || '' }, body: { expectedVersion: selected?.version || 1 } })}/><EditDialog open={selected?.state === 'closed'} title="Mở lại kỳ đã khóa" onClose={() => setSelected(null)} busy={reopen.pending} actions={<Button disabled={!approval || codePointLength(reason) < 5 || reopen.pending} onClick={async () => { try {
        await reopen.execute({ path: { resourceId: selected?.id || '' }, body: { expectedVersion: selected?.version || 1, approvalId: approval, reason } });
        setSelected(null);
    }
    catch { /* visible */ } }}>Mở lại kỳ</Button>}><ErrorNotice error={reopen.error}/><FormFields ><TextField label="Mã phê duyệt đúng kỳ" value={approval} onChange={e => setApproval(e.target.value)}/><TextField label="Lý do" value={reason} onChange={e => setReason(e.target.value)}/></FormFields></EditDialog></>;
}
