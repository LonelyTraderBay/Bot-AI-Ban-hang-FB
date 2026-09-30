import { useState } from 'react';
import { Alert, Box, Button, MenuItem, Stack, Tab, Tabs, TextField } from '@mui/material';
import type { AccountingPeriod, CODSettlement, FinanceEntry, FinanceEntryWrite, Journal, JournalLine, ReconciliationCase } from '@botsales/contracts';
import { useApi, useCommand } from '../../shared/api/hooks';
import { useScope } from '../../shared/model/scope';
import { useListQuery } from '../../shared/model/filters';
import { dateTime, formatMoney } from '../../shared/model/format';
import { Amount, ConfirmDialog, DataTable, DetailLine, EditDialog, ErrorNotice, MutationButton, PageHeader, Pager, Panel, QueryState, RouteLink, Stat, Stats, Status, Toolbar } from '../../shared/ui/components';
export function CashflowPage() {
    const { shop } = useScope();
    const data = useApi('getCashflow', { query: useListQuery() });
    const c = data.data?.data;
    return <><PageHeader title="Dòng tiền" subtitle="Tiền thực thu và thực chi, tách biệt doanh thu và lợi nhuận." actions={<RouteLink to={`/s/${shop.id}/finance/entries`}>Sổ thu chi</RouteLink>}/><QueryState query={data}>{c && <><Stats><Stat title="Tiền đã thu" value={<Amount value={c.receipts}/>}/><Stat title="Tiền đã chi" value={<Amount value={c.disbursements}/>}/><Stat title="Biến động tiền thuần" value={<Amount value={c.netCashMovement}/>} accent note="Không phải số dư tài khoản"/><Stat title="Múi giờ báo cáo" value={c.timezone}/></Stats><Panel title="Kỳ báo cáo"><Box sx={{ p: 3 }}><DetailLine label="Từ">{dateTime(c.from)}</DetailLine><DetailLine label="Đến">{dateTime(c.to)}</DetailLine><DetailLine label="Dữ liệu tại">{dateTime(c.asOf)}</DetailLine>{c.warnings.map(w => <Alert key={w} severity="info" sx={{ mt: 2 }}>{w}</Alert>)}</Box></Panel></>}</QueryState></>;
}
export function EntriesPage() {
    const { shop } = useScope();
    const list = useApi('listFinanceEntries', { query: useListQuery() });
    const create = useCommand('createFinanceEntry', ['listFinanceEntries']);
    const update = useCommand('updateFinanceEntry', ['listFinanceEntries']);
    const post = useCommand('postFinanceEntry', ['listFinanceEntries', 'getCashflow', 'getProfitLoss', 'listJournals']);
    const reverse = useCommand('reverseFinanceEntry', ['listFinanceEntries', 'getCashflow', 'getProfitLoss', 'listJournals']);
    const [editing, setEditing] = useState<FinanceEntry | null>(null), [open, setOpen] = useState(false), [selected, setSelected] = useState<{
        entry: FinanceEntry;
        action: 'post' | 'reverse';
    } | null>(null);
    const [kind, setKind] = useState<FinanceEntryWrite['kind']>('disbursement'), [classification, setClassification] = useState<FinanceEntryWrite['classification']>('operating_expense'), [amount, setAmount] = useState(''), [occurredAt, setOccurredAt] = useState('2026-09-29T14:00:00Z'), [description, setDescription] = useState('');
    const begin = (entry: FinanceEntry | null) => { setEditing(entry); setKind(entry?.kind || 'disbursement'); setClassification(entry?.classification || 'operating_expense'); setAmount(entry?.amount.amount || ''); setOccurredAt(entry?.occurredAt || new Date().toISOString()); setDescription(entry?.description || ''); setOpen(true); };
    const classes: Record<FinanceEntryWrite['classification'], string> = {
        sales_receipt: 'Thu bán hàng', inventory_purchase: 'Mua tồn kho', shipping: 'Vận chuyển', platform_fee: 'Phí nền tảng', payment_fee: 'Phí thanh toán', ai_expense: 'Chi phí AI', operating_expense: 'Chi phí vận hành', capital: 'Góp vốn', loan_principal: 'Gốc vay', transfer: 'Chuyển nội bộ', other: 'Khác'
    };
    return <><PageHeader title="Sổ thu chi" subtitle="Phiếu nháp → kiểm tra → ghi sổ. Phiếu đã ghi chỉ điều chỉnh có lịch sử." actions={<MutationButton permission="finance.post" variant="contained" onClick={() => begin(null)}>Tạo phiếu</MutationButton>}/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={r => r.id} columns={[
        { key: 'id', label: 'Chứng từ', render: r => r.id }, { key: 'date', label: 'Ngày', render: r => dateTime(r.occurredAt) }, { key: 'type', label: 'Phân loại', render: r => classes[r.classification] }, { key: 'amount', label: 'Số tiền', render: r => <Amount value={r.amount}/> }, { key: 'note', label: 'Diễn giải', render: r => r.description }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.status}/> },
        {
            key: 'action', label: 'Thao tác', render: r => <Stack direction="row" gap={1}>{r.status === 'draft' ? <><MutationButton permission="finance.post" onClick={() => begin(r)}>Sửa</MutationButton><MutationButton permission="finance.post" onClick={() => setSelected({ entry: r, action: 'post' })}>Ghi sổ</MutationButton></> : r.status === 'posted' ? <MutationButton permission="finance.post" onClick={() => setSelected({ entry: r, action: 'reverse' })}>Đảo phiếu</MutationButton> : null}</Stack>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <EditDialog open={open} title={editing ? 'Sửa phiếu nháp' : 'Phiếu thu chi mới'} onClose={() => setOpen(false)} busy={create.pending || update.pending} actions={<Button variant="contained" disabled={create.pending || update.pending || !/^\d+(\.\d{1,4})?$/.test(amount) || description.trim().length < 5} onClick={async () => { const body: FinanceEntryWrite = { kind, classification, amount: { amount, currency: shop.currency }, occurredAt, description, sourceRef: editing?.sourceRef || null }; try {
        if (editing)
            await update.execute({ path: { entryId: editing.id }, version: editing.version, body });
        else
            await create.execute({ body });
        setOpen(false);
    }
    catch { /* keep form and error */ } }}>Lưu nháp</Button>}><ErrorNotice error={create.error || update.error}/><Stack gap={2}><TextField select label="Loại phiếu" value={kind} onChange={e => setKind(e.target.value === 'receipt' ? 'receipt' : 'disbursement')}><MenuItem value="receipt">Thu tiền</MenuItem><MenuItem value="disbursement">Chi tiền</MenuItem></TextField><TextField select label="Phân loại" value={classification} onChange={e => { const v = e.target.value; if (v in classes)
        setClassification(v as FinanceEntryWrite['classification']); }}>{Object.entries(classes).map(([v, t]) => <MenuItem key={v} value={v}>{t}</MenuItem>)}</TextField><TextField label={`Số tiền (${shop.currency})`} value={amount} onChange={e => setAmount(e.target.value)} inputProps={{ inputMode: 'decimal' }}/><TextField label="Thời điểm ISO 8601" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} helperText="Ví dụ 2026-09-29T14:00:00Z; không tự suy múi giờ từ máy."/><TextField label="Diễn giải" multiline minRows={2} value={description} onChange={e => setDescription(e.target.value)}/><Alert severity="info">Tiền mua hàng tồn kho không tự trở thành toàn bộ chi phí trong lợi nhuận.</Alert></Stack></EditDialog>
 <ConfirmDialog open={!!selected} title={selected?.action === 'post' ? 'Ghi sổ phiếu đã kiểm' : 'Đảo phiếu đã ghi'} description={`${selected?.entry.id || ''} · ${formatMoney(selected?.entry.amount)}. Không chuyển tiền thực tế qua chức năng này.`} requireReason onClose={() => setSelected(null)} busy={post.pending || reverse.pending} error={post.error || reverse.error} onConfirm={reason => selected?.action === 'post' ? post.execute({ path: { entryId: selected.entry.id }, body: { expectedVersion: selected.entry.version, reason } }) : reverse.execute({ path: { entryId: selected?.entry.id || '' }, body: { expectedVersion: selected?.entry.version || 1, reason } })}/></>;
}
export function ProfitLossPage() {
    const data = useApi('getProfitLoss', { query: useListQuery() });
    const p = data.data?.data;
    return <><PageHeader title="Lợi nhuận quản trị" subtitle="Số liệu do API tổng hợp từ nguồn giao dịch, không tính từ trang danh sách đang mở."/><QueryState query={data}>{p && <><Stats><Stat title="Doanh thu thuần" value={<Amount value={p.netSales}/>}/><Stat title="Giá vốn" value={<Amount value={p.cogs}/>}/><Stat title="Lãi gộp" value={<Amount value={p.grossProfit}/>} accent/><Stat title="Lợi nhuận vận hành" value={<Amount value={p.operatingProfit}/>} note="Chưa có chứng nhận kế toán pháp định"/></Stats><Panel title="Chi tiết kết quả kinh doanh" action={<Status value={p.completeness}/>}><Box sx={{ p: 3 }}>{[
        ['Doanh thu gộp', p.grossSales], ['Giảm giá', p.discounts], ['Hàng bán trả lại', p.salesReturns], ['Doanh thu thuần', p.netSales], ['Giá vốn', p.cogs], ['Thu phí giao', p.shippingIncome], ['Chi phí giao', p.shippingExpense], ['Phí nền tảng', p.platformFees], ['Phí thanh toán', p.paymentFees], ['Chi phí AI', p.aiExpense], ['Chi phí khác', p.otherOperatingExpenses]
    ].map(([t, v]) => <DetailLine key={String(t)} label={String(t)}><Amount value={typeof v === 'object' ? v : null}/></DetailLine>)}<DetailLine label="Chính sách">{p.policyVersion}</DetailLine><DetailLine label="Dữ liệu tại">{dateTime(p.asOf)}</DetailLine>{p.warnings.map(w => <Alert key={w} severity="warning" sx={{ mt: 2 }}>{w}</Alert>)}</Box></Panel></>}</QueryState></>;
}
export function JournalsPage() {
    const { shop } = useScope();
    const list = useApi('listJournals', { query: useListQuery() });
    const create = useCommand('createJournal', ['listJournals']);
    const post = useCommand('postJournal', ['listJournals']);
    const reverse = useCommand('reverseJournal', ['listJournals']);
    const [open, setOpen] = useState(false), [view, setView] = useState<Journal | null>(null), [selected, setSelected] = useState<{
        journal: Journal;
        action: 'post' | 'reverse';
    } | null>(null), [sourceType, setSourceType] = useState('manual'), [sourceId, setSourceId] = useState(''), [date, setDate] = useState('2026-09-29'), [reason, setReason] = useState('');
    const newLine = (): JournalLine => ({ accountId: '', debit: { amount: '0', currency: shop.currency }, credit: { amount: '0', currency: shop.currency }, description: '' });
    const [lines, setLines] = useState<JournalLine[]>([newLine(), newLine()]);
    return <><PageHeader title="Bút toán" subtitle="Sổ kép có chứng từ nguồn, kiểm cân bằng tại API và không sửa bút toán đã ghi." actions={<MutationButton permission="finance.post" variant="contained" onClick={() => setOpen(true)}>Tạo bút toán nháp</MutationButton>}/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={r => r.id} columns={[
        { key: 'id', label: 'Bút toán', render: r => <Button onClick={() => setView(r)}>{r.id}</Button> }, { key: 'date', label: 'Ngày hiệu lực', render: r => r.effectiveDate }, { key: 'source', label: 'Nguồn', render: r => `${r.sourceType} / ${r.sourceId}` }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.status}/> },
        {
            key: 'actions', label: '', render: r => r.status === 'draft' ? <MutationButton permission="finance.post" onClick={() => setSelected({ journal: r, action: 'post' })}>Ghi sổ</MutationButton> : r.status === 'posted' ? <MutationButton permission="finance.post" onClick={() => setSelected({ journal: r, action: 'reverse' })}>Đảo bút toán</MutationButton> : null
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <EditDialog open={!!view} title={`Bút toán ${view?.id || ''}`} onClose={() => setView(null)} actions={<Button onClick={() => setView(null)}>Đóng</Button>}>{view && <><Status value={view.status}/><DataTable rows={view.lines.map((l, i) => ({ ...l, key: String(i) }))} rowKey={l => l.key} columns={[
        { key: 'account', label: 'Tài khoản', render: l => l.accountId }, { key: 'debit', label: 'Nợ', render: l => <Amount value={l.debit}/> }, { key: 'credit', label: 'Có', render: l => <Amount value={l.credit}/> }, { key: 'note', label: 'Diễn giải', render: l => l.description }
    ]}/><DetailLine label="Chính sách">{view.policyVersion}</DetailLine><DetailLine label="Bút toán gốc">{view.reversalOf || '—'}</DetailLine></>}</EditDialog>
 <EditDialog open={open} title="Bút toán nháp" onClose={() => setOpen(false)} busy={create.pending} actions={<Button variant="contained" disabled={!sourceId || !reason || create.pending || lines.some(l => !l.accountId)} onClick={async () => { try {
        await create.execute({ body: { sourceType, sourceId, effectiveDate: date, lines, reason } });
        setOpen(false);
    }
    catch { /* visible */ } }}>Lưu nháp</Button>}><ErrorNotice error={create.error}/><Stack gap={2}><Alert severity="info">Dùng mã tài khoản trong danh mục của backend. Hợp đồng hiện tại chưa có API danh mục tài khoản để chọn tự động.</Alert><TextField label="Loại chứng từ nguồn" value={sourceType} onChange={e => setSourceType(e.target.value)}/><TextField label="Mã chứng từ nguồn" value={sourceId} onChange={e => setSourceId(e.target.value)}/><TextField type="date" label="Ngày hiệu lực" value={date} onChange={e => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }}/>{lines.map((l, i) => <Box key={i} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}><TextField label={`Tài khoản dòng ${i + 1}`} fullWidth value={l.accountId} onChange={e => setLines(lines.map((v, j) => j === i ? { ...v, accountId: e.target.value } : v))}/><Stack direction="row" gap={1} sx={{ my: 1.5 }}>{(['debit', 'credit'] as const).map(k => <TextField key={k} label={k === 'debit' ? 'Nợ' : 'Có'} value={l[k].amount} onChange={e => setLines(lines.map((v, j) => j === i ? { ...v, [k]: { amount: e.target.value, currency: shop.currency } } : v))}/>)}</Stack><TextField label="Diễn giải dòng" fullWidth value={l.description} onChange={e => setLines(lines.map((v, j) => j === i ? { ...v, description: e.target.value } : v))}/><Button disabled={lines.length <= 2} onClick={() => setLines(lines.filter((_, j) => j !== i))}>Bỏ dòng</Button></Box>)}<Button onClick={() => setLines([...lines, newLine()])}>Thêm dòng</Button><TextField label="Lý do" value={reason} onChange={e => setReason(e.target.value)}/></Stack></EditDialog>
 <ConfirmDialog open={!!selected} title={selected?.action === 'post' ? 'Ghi sổ bút toán' : 'Đảo bút toán'} description="Backend kiểm kỳ, cân bằng, quyền và chứng từ trùng trước khi ghi." requireReason={selected?.action === 'reverse'} onClose={() => setSelected(null)} error={post.error || reverse.error} busy={post.pending || reverse.pending} onConfirm={reason => selected?.action === 'post' ? post.execute({ path: { resourceId: selected.journal.id }, body: { expectedVersion: selected.journal.version } }) : reverse.execute({ path: { resourceId: selected?.journal.id || '' }, body: { expectedVersion: selected?.journal.version || 1, reason } })}/></>;
}
export function ReconciliationPage() {
    const { shop } = useScope();
    const [tab, setTab] = useState(0);
    const banks = useApi('listBankTransactions', { query: useListQuery() });
    const cod = useApi('listCODSettlements', { query: useListQuery() });
    const cases = useApi('listReconciliationCases', { query: useListQuery() });
    const match = useCommand('matchCODSettlement', ['listCODSettlements', 'listBankTransactions', 'listDebtItems', 'getCashflow']);
    const matchBank = useCommand('matchSettlement', ['listReconciliationCases', 'listBankTransactions', 'listDebtItems']);
    const [selected, setSelected] = useState<CODSettlement | null>(null), [caseItem, setCase] = useState<ReconciliationCase | null>(null), [transaction, setTransaction] = useState(''), [fees, setFees] = useState('0'), [evidence, setEvidence] = useState(''), [resourceId, setResource] = useState(''), [allocation, setAllocation] = useState(''), [reason, setReason] = useState(''), [importOpen, setImport] = useState(false);
    return <><PageHeader title="Đối soát ngân hàng & COD" subtitle="Khách trả tiền cho đơn vị giao hàng chưa đồng nghĩa tiền đã về shop." actions={<MutationButton permission="finance.reconcile" variant="contained" onClick={() => setImport(true)}>Nhập bảng đối soát</MutationButton>}/><Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ mb: 2 }} variant="scrollable"><Tab label="Ngân hàng"/><Tab label="COD"/><Tab label="Chênh lệch cần xử lý"/></Tabs><Panel>{tab === 0 ? <QueryState query={banks}>{banks.data && <><DataTable rows={banks.data.data} rowKey={r => r.id} columns={[
        { key: 'id', label: 'Mã ngoài hệ thống', render: r => r.externalTransactionId }, { key: 'account', label: 'Tài khoản', render: r => r.accountId }, { key: 'money', label: 'Số tiền', render: r => <Amount value={r.amount}/> }, { key: 'direction', label: 'Chiều', render: r => r.direction === 'credit' ? 'Tiền vào' : 'Tiền ra' }, { key: 'note', label: 'Nội dung', render: r => r.referenceText }, { key: 'state', label: 'Khớp', render: r => <Status value={r.matchState}/> }
    ]}/><Pager page={banks.data.page}/></>}</QueryState> : tab === 1 ? <QueryState query={cod}>{cod.data && <><DataTable rows={cod.data.data} rowKey={r => r.id} columns={[
        { key: 'id', label: 'Đợt COD', render: r => r.externalBatchId }, { key: 'carrier', label: 'Đơn vị giao', render: r => r.carrierId }, { key: 'gross', label: 'Phải thu', render: r => <Amount value={r.grossDue}/> }, { key: 'fee', label: 'Phí thực tế', render: r => <Amount value={r.actualFees}/> }, { key: 'cash', label: 'Đã về ngân hàng', render: r => <Amount value={r.bankReceived}/> }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.status}/> },
        {
            key: 'action', label: '', render: r => <MutationButton permission="finance.reconcile" disabled={r.status === 'matched'} onClick={() => { setSelected(r); setTransaction(''); setFees(r.actualFees.amount); setEvidence(''); }}>Đối chiếu</MutationButton>
        }
    ]}/><Pager page={cod.data.page}/></>}</QueryState> : <QueryState query={cases}>{cases.data && <><DataTable rows={cases.data.data} rowKey={r => r.id} columns={[
        { key: 'id', label: 'Mã', render: r => r.id }, { key: 'transaction', label: 'Giao dịch', render: r => r.transactionId }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.state}/> }, { key: 'reason', label: 'Cần xử lý', render: r => r.reason },
        {
            key: 'action', label: '', render: r => <MutationButton permission="finance.reconcile" disabled={r.state === 'matched'} onClick={() => setCase(r)}>Ghép giao dịch</MutationButton>
        }
    ]}/><Pager page={cases.data.page}/></>}</QueryState>}</Panel>
 <EditDialog open={!!selected} title="Ghép tiền COD" onClose={() => setSelected(null)} busy={match.pending} actions={<Button variant="contained" disabled={!transaction || !evidence || match.pending} onClick={async () => { try {
        await match.execute({ path: { resourceId: selected?.id || '' }, body: {
                expectedVersion: selected?.version || 1, bankTransactionId: transaction, actualFees: { amount: fees, currency: shop.currency }, feeEvidenceRef: evidence, reason: 'Đối chiếu bảng COD và giao dịch ngân hàng'
            } });
        setSelected(null);
    }
    catch { /* visible */ } }}>Xác nhận khớp</Button>}><ErrorNotice error={match.error}/><Stack gap={2}><TextField label="Mã giao dịch ngân hàng" value={transaction} onChange={e => setTransaction(e.target.value)}/><TextField label={`Phí thực tế (${shop.currency})`} value={fees} onChange={e => setFees(e.target.value)}/><TextField label="Mã chứng từ phí" value={evidence} onChange={e => setEvidence(e.target.value)}/><Alert severity="warning">Không xác nhận thanh toán bằng ảnh chuyển khoản. Tổng tiền về và phí phải khớp khoản COD.</Alert></Stack></EditDialog>
 <EditDialog open={!!caseItem} title="Ghép giao dịch với công nợ" onClose={() => setCase(null)} busy={matchBank.pending} actions={<Button variant="contained" disabled={!transaction || !resourceId || !allocation || !reason || matchBank.pending} onClick={async () => { try {
        await matchBank.execute({ path: { resourceId: caseItem?.id || '' }, body: {
                expectedVersion: caseItem?.version || 1, transactionId: transaction, allocations: [{ resource: { type: 'debt', id: resourceId }, amount: { amount: allocation, currency: shop.currency } }], reason
            } });
        setCase(null);
    }
    catch { /* visible */ } }}>Ghi kết quả đối soát</Button>}><ErrorNotice error={matchBank.error}/><Stack gap={2}><TextField label="Mã giao dịch ngân hàng" value={transaction} onChange={e => setTransaction(e.target.value)}/><TextField label="Mã khoản công nợ" value={resourceId} onChange={e => setResource(e.target.value)}/><TextField label="Số tiền phân bổ" value={allocation} onChange={e => setAllocation(e.target.value)}/><TextField label="Lý do" value={reason} onChange={e => setReason(e.target.value)}/></Stack></EditDialog>
 {importOpen && <StatementDialog onClose={() => setImport(false)}/>}</>;
}
function StatementDialog({ onClose }: {
    onClose: () => void;
}) {
    const { shop } = useScope();
    const upload = useCommand('uploadFile', []), bank = useCommand('importBankStatement', ['listBankTransactions', 'listReconciliationCases']), cod = useCommand('importCODStatement', ['listCODSettlements']);
    const [kind, setKind] = useState('bank'), [file, setFile] = useState<File | null>(null), [account, setAccount] = useState(''), [batch, setBatch] = useState(''), [format, setFormat] = useState('botsales-csv-v1'), [jobId, setJob] = useState('');
    return <EditDialog open title="Nhập bảng đối soát" onClose={onClose} busy={upload.pending || bank.pending || cod.pending} actions={jobId ? <RouteLink to={`/s/${shop.id}/jobs/${jobId}`}>Xem kết quả nhập</RouteLink> : <Button variant="contained" disabled={!file || !account || !batch || upload.pending || bank.pending || cod.pending} onClick={async () => { if (!file)
        return; try {
        const fd = new FormData();
        fd.append('file', file);
        const f = await upload.execute({ form: fd });
        const body = { fileId: f.data.id, accountOrCarrierId: account, formatId: format, sourceBatchId: batch };
        const result = kind === 'bank' ? await bank.execute({ body }) : await cod.execute({ body });
        setJob(result.data.id);
    }
    catch { /* visible */ } }}>Kiểm tra và nhập</Button>}><ErrorNotice error={upload.error || bank.error || cod.error}/><Stack gap={2}><TextField select label="Loại bảng" value={kind} onChange={e => setKind(e.target.value)}><MenuItem value="bank">Ngân hàng</MenuItem><MenuItem value="cod">COD</MenuItem></TextField><Button component="label" variant="outlined">{file ? file.name : 'Chọn CSV'}<input hidden type="file" accept=".csv,text/csv" onChange={e => setFile(e.target.files?.[0] || null)}/></Button><TextField label="Mã tài khoản / đơn vị vận chuyển" value={account} onChange={e => setAccount(e.target.value)}/><TextField label="Mã đợt nhập duy nhất" value={batch} onChange={e => setBatch(e.target.value)}/><TextField label="Mã định dạng được backend hỗ trợ" value={format} onChange={e => setFormat(e.target.value)}/><Alert severity="info">Mẫu CSV và định dạng mô phỏng nằm trong samples/. Định dạng ngân hàng thật phải được backend xác nhận; nhập không đồng nghĩa đối soát xong.</Alert></Stack></EditDialog>;
}
export function DebtsPage() {
    const debts = useApi('listDebtItems', { query: useListQuery() }), periods = useApi('listAccountingPeriods');
    const close = useCommand('closeAccountingPeriod', ['listAccountingPeriods']);
    const reopen = useCommand('reopenAccountingPeriod', ['listAccountingPeriods']);
    const [selected, setSelected] = useState<AccountingPeriod | null>(null), [approval, setApproval] = useState(''), [reason, setReason] = useState('');
    return <><PageHeader title="Công nợ & khóa kỳ" subtitle="Theo dõi khoản còn phải thu/trả; khóa kỳ chỉ khi các điều kiện được kiểm chứng."/><Panel title="Công nợ"><QueryState query={debts}>{debts.data && <><DataTable rows={debts.data.data} rowKey={r => r.id} columns={[
        { key: 'id', label: 'Khoản nợ', render: r => r.id }, { key: 'who', label: 'Đối tượng', render: r => `${r.counterpartyType} / ${r.counterpartyId}` }, { key: 'direction', label: 'Loại', render: r => r.direction === 'receivable' ? 'Phải thu' : 'Phải trả' }, { key: 'original', label: 'Ban đầu', render: r => <Amount value={r.originalAmount}/> }, { key: 'current', label: 'Còn lại', render: r => <Amount value={r.outstandingAmount}/> }, { key: 'due', label: 'Đến hạn', render: r => dateTime(r.dueAt) }, { key: 'dispute', label: 'Tranh chấp', render: r => r.disputed ? 'Đang giữ xử lý' : 'Không' }
    ]}/><Pager page={debts.data.page}/></>}</QueryState></Panel><Panel title="Kỳ kế toán" sx={{ mt: 3 }}><QueryState query={periods}><DataTable rows={periods.data?.data || []} rowKey={r => r.id} columns={[
        { key: 'period', label: 'Kỳ', render: r => `${r.startDate} → ${r.endDate}` }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.state}/> }, { key: 'issues', label: 'Điều kiện còn thiếu', render: r => r.blockingIssues.join('; ') || 'Xác minh lại tại lúc ghi' },
        {
            key: 'action', label: '', render: r => <MutationButton permission="finance.close" onClick={() => { setSelected(r); setApproval(''); setReason(''); }}>{r.state === 'closed' ? 'Mở lại có phê duyệt' : 'Kiểm & khóa kỳ'}</MutationButton>
        }
    ]}/></QueryState></Panel><ConfirmDialog open={!!selected && selected.state !== 'closed'} title="Khóa kỳ kế toán" description="Backend kiểm lại chứng từ nháp, sai lệch, COD và quyền trước khi khóa; không xóa sai lệch để vượt kiểm tra." onClose={() => setSelected(null)} busy={close.pending} error={close.error} onConfirm={() => close.execute({ path: { resourceId: selected?.id || '' }, body: { expectedVersion: selected?.version || 1 } })}/><EditDialog open={selected?.state === 'closed'} title="Mở lại kỳ đã khóa" onClose={() => setSelected(null)} busy={reopen.pending} actions={<Button disabled={!approval || reason.length < 5 || reopen.pending} onClick={async () => { try {
        await reopen.execute({ path: { resourceId: selected?.id || '' }, body: { expectedVersion: selected?.version || 1, approvalId: approval, reason } });
        setSelected(null);
    }
    catch { /* visible */ } }}>Mở lại kỳ</Button>}><ErrorNotice error={reopen.error}/><Stack gap={2}><TextField label="Mã phê duyệt đúng kỳ" value={approval} onChange={e => setApproval(e.target.value)}/><TextField label="Lý do" value={reason} onChange={e => setReason(e.target.value)}/></Stack></EditDialog></>;
}
