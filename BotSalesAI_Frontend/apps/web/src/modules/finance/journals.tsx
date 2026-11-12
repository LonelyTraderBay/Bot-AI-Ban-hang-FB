import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button } from '@mui/material';
import type { Journal } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useListQuery } from '@/shared/model/filters';
import { label as businessLabel } from '@/shared/model/labels';
import { formatDateOnly } from '@/shared/model/format';
import { Amount, ConfirmDialog, DataTable, DetailLine, EditDialog, MutationButton, PageHeader, Pager, Panel, QueryState, Status, Toolbar } from '@/shared/ui/components';
import { JournalEditor } from './journal-editor';

export function JournalsPage() {
    const list = useApi('listJournals', { query: useListQuery('listJournals') });
    const [journalParams,setJournalParams]=useSearchParams();
    const viewId=journalParams.get('journalId');
    const setViewId=(id:string|null)=>{const next=new URLSearchParams(journalParams);if(id)next.set('journalId',id);else next.delete('journalId');setJournalParams(next);};
    const detail = useApi('getJournal', { path: { resourceId: viewId || '' } }, Boolean(viewId));
    const viewedJournal = detail.data?.data;
    const post=useCommand('postJournal',['listJournals','getJournal','getLedger','getTrialBalance','getBalanceSheet','getProfitLoss','getCashflow','getDashboard']),reverse=useCommand('reverseJournal',['listJournals','getJournal','getLedger','getTrialBalance','getBalanceSheet','getProfitLoss','getCashflow','getDashboard']);
    const [open,setOpen]=useState(false),[replacement,setReplacement]=useState<Journal|null>(null),[saved,setSaved]=useState(false),[selected,setSelected]=useState<{journal:Journal;action:'post'|'reverse'}|null>(null);
    return <>{saved&&<Alert severity="success" role="status">Đã lưu bút toán nháp; kiểm lại trước khi ghi.</Alert>}<PageHeader title="Bút toán" subtitle="Sổ kép có chứng từ nguồn, kiểm cân bằng tại API và không sửa bút toán đã ghi." actions={<MutationButton permission="finance.post" variant="contained" onClick={() => {setReplacement(null);setOpen(true);}}>Tạo bút toán nháp</MutationButton>}/><Panel><Toolbar operation="listJournals"/><QueryState query={list} pendingProfile="section">{list.data && <><DataTable label="Danh sách bút toán" rows={list.data.data} rowKey={journal => journal.id} columns={[
        { key: 'id', label: 'Bút toán', render: journal => <Button onClick={() => setViewId(journal.id)}>{journal.id}</Button> },
        { key: 'date', label: 'Ngày hiệu lực', render: journal => formatDateOnly(journal.effectiveDate) },
        { key: 'source', label: 'Nguồn', render: journal => `${businessLabel(journal.sourceType)} / Mã chứng từ: ${journal.sourceId}` },
        { key: 'state', label: 'Trạng thái', render: journal => <Status value={journal.status}/> },
        { key: 'actions', label: 'Thao tác', render: journal => <Button onClick={() => setViewId(journal.id)}>Chi tiết</Button> },
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

