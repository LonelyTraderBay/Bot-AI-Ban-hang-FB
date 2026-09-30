import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import type { Feedback, Knowledge, KnowledgeRevision } from '@botsales/contracts';
import { useApi, useCommand } from '../../shared/api/hooks';
import { useScope } from '../../shared/model/scope';
import { useListQuery } from '../../shared/model/filters';
import { dateTime } from '../../shared/model/format';
import { ConfirmDialog, DataTable, DetailLine, EditDialog, ErrorNotice, MutationButton, PageHeader, Pager, Panel, QueryState, RouteLink, Status, Toolbar } from '../../shared/ui/components';
export function KnowledgePage() {
    const { shop } = useScope();
    const nav = useNavigate();
    const list = useApi('listKnowledge', { query: useListQuery() });
    const create = useCommand('createKnowledge', ['listKnowledge']);
    const upload = useCommand('uploadFile', []);
    const [open, setOpen] = useState(false), [title, setTitle] = useState(''), [content, setContent] = useState(''), [file, setFile] = useState<File | null>(null);
    return <><PageHeader title="Kiến thức cửa hàng" subtitle="Tri thức được duyệt riêng với hội thoại khách; giá và tồn luôn lấy từ nghiệp vụ hiện hành." actions={<MutationButton permission="knowledge.write" variant="contained" onClick={() => setOpen(true)}>Thêm nguồn kiến thức</MutationButton>}/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={r => r.id} columns={[
        { key: 'title', label: 'Tài liệu', render: r => <RouteLink to={`/s/${shop.id}/knowledge/${r.id}`}>{r.title}</RouteLink> }, { key: 'source', label: 'Nguồn', render: r => r.sourceKind }, { key: 'revision', label: 'Phiên bản', render: r => r.revision }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.status}/> }, { key: 'published', label: 'Xuất bản', render: r => dateTime(r.publishedAt) }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <EditDialog open={open} title="Nguồn kiến thức mới" onClose={() => setOpen(false)} busy={create.pending || upload.pending} actions={<Button variant="contained" disabled={!title || (!content && !file) || create.pending || upload.pending} onClick={async () => { try {
        let fileId: string | null = null;
        if (file) {
            const fd = new FormData();
            fd.append('file', file);
            fileId = (await upload.execute({ form: fd })).data.id;
        }
        const r = await create.execute({ body: { title, sourceKind: file ? 'file' : 'manual', fileId, content: content || null } });
        setOpen(false);
        nav(`/s/${shop.id}/knowledge/${r.data.id}`);
    }
    catch { /* retain input */ } }}>Lưu bản nháp</Button>}><ErrorNotice error={create.error || upload.error}/><Stack gap={2}><TextField label="Tiêu đề" value={title} onChange={e => setTitle(e.target.value)} inputProps={{ maxLength: 180 }}/><TextField label="Nội dung" multiline minRows={8} value={content} onChange={e => setContent(e.target.value)}/><Button component="label" variant="outlined">{file ? file.name : 'Hoặc tải PDF/tài liệu hỗ trợ'}<input type="file" hidden accept=".pdf,.txt,.csv" onChange={e => setFile(e.target.files?.[0] || null)}/></Button>{file && <Button onClick={() => setFile(null)}>Bỏ tệp</Button>}<Alert severity="info">Tài liệu tải lên không tự trở thành chỉ dẫn đáng tin. Chờ xử lý, duyệt và đánh giá trước xuất bản.</Alert></Stack></EditDialog></>;
}
export function KnowledgeDetailPage() {
    const { shop } = useScope();
    const { knowledgeId = '' } = useParams();
    const get = useApi('getKnowledge', { path: { knowledgeId } });
    const revisions = useApi('listKnowledgeRevisions', { path: { knowledgeId } });
    const update = useCommand('updateKnowledge', ['getKnowledge', 'listKnowledge', 'listKnowledgeRevisions']);
    const createRevision = useCommand('createKnowledgeRevision', ['getKnowledge', 'listKnowledge', 'listKnowledgeRevisions']);
    const review = useCommand('submitKnowledgeReview', ['getKnowledge', 'listKnowledge']);
    const publish = useCommand('publishKnowledge', ['getKnowledge', 'listKnowledge', 'listKnowledgeRevisions']);
    const retire = useCommand('retireKnowledge', ['getKnowledge', 'listKnowledge']);
    const restore = useCommand('restoreKnowledgeRevision', ['getKnowledge', 'listKnowledgeRevisions']);
    const [edit, setEdit] = useState<Knowledge | null>(null), [title, setTitle] = useState(''), [content, setContent] = useState(''), [mode, setMode] = useState<'edit' | 'revision'>('edit'), [action, setAction] = useState<'review' | 'publish' | 'retire' | null>(null), [evalId, setEval] = useState(''), [reason, setReason] = useState(''), [revision, setRevision] = useState<KnowledgeRevision | null>(null);
    const k = get.data?.data;
    return <><PageHeader title={k?.title || 'Chi tiết kiến thức'} subtitle="Lịch sử phiên bản không bị thay bởi nội dung hiện tại." actions={<RouteLink to={`/s/${shop.id}/knowledge`}>Tất cả nguồn</RouteLink>}/><ErrorNotice error={review.error || update.error || createRevision.error}/><QueryState query={get}>{k && <><Panel title="Nội dung & nguồn" action={<Status value={k.status}/>}><Box sx={{ p: 3 }}><DetailLine label="Phiên bản hiện tại">{k.revision}</DetailLine><DetailLine label="Bản đã xuất bản">{k.publishedRevisionId || 'Chưa có'}</DetailLine><DetailLine label="Bản nháp">{k.draftRevisionId || 'Chưa có'}</DetailLine><DetailLine label="Người duyệt">{k.approvedBy || 'Chưa được duyệt'}</DetailLine><Typography sx={{ whiteSpace: 'pre-wrap', my: 3 }}>{k.content || 'Nội dung được xử lý từ tệp; xem trạng thái công việc.'}</Typography>{k.warnings.map(w => <Alert key={w} severity="warning">{w}</Alert>)}<Stack direction="row" gap={1} flexWrap="wrap"><MutationButton permission="knowledge.write" onClick={() => { setEdit(k); setTitle(k.title); setContent(k.content || ''); setMode(k.status === 'published' ? 'revision' : 'edit'); }}>{k.status === 'published' ? 'Soạn phiên bản mới' : 'Sửa bản nháp'}</MutationButton><MutationButton permission="knowledge.write" disabled={k.status === 'published' || k.status === 'processing'} onClick={() => setAction('review')}>Gửi duyệt</MutationButton><MutationButton permission="knowledge.publish" disabled={k.status !== 'ready_for_review'} variant="contained" onClick={() => setAction('publish')}>Xuất bản bản đã đánh giá</MutationButton><MutationButton permission="knowledge.publish" disabled={k.status !== 'published'} onClick={() => setAction('retire')}>Ngừng sử dụng</MutationButton></Stack></Box></Panel><Panel title="Lịch sử phiên bản" sx={{ mt: 3 }}><QueryState query={revisions}><DataTable rows={revisions.data?.data || []} rowKey={r => r.id} columns={[
        { key: 'id', label: 'Phiên bản', render: r => `#${r.revision} · ${r.id}` }, { key: 'title', label: 'Tiêu đề', render: r => r.title }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.status}/> }, { key: 'action', label: '', render: r => <Button onClick={() => setRevision(r)}>Xem / khôi phục nháp</Button> }
    ]}/></QueryState></Panel></>}</QueryState>
 <EditDialog open={!!edit} title={mode === 'revision' ? 'Soạn phiên bản mới' : 'Sửa nháp'} onClose={() => setEdit(null)} busy={update.pending || createRevision.pending} actions={<Button variant="contained" disabled={!title || !content || update.pending || createRevision.pending} onClick={async () => { try {
        const body = { title, content, sourceKind: edit?.sourceKind || 'manual' as const, fileId: edit?.fileId || null };
        if (mode === 'revision')
            await createRevision.execute({ path: { knowledgeId }, version: edit?.version, body });
        else
            await update.execute({ path: { knowledgeId }, version: edit?.version, body });
        setEdit(null);
    }
    catch { /* visible */ } }}>Lưu nháp</Button>}><ErrorNotice error={update.error || createRevision.error}/><Stack gap={2}><TextField label="Tiêu đề" value={title} onChange={e => setTitle(e.target.value)}/><TextField label="Nội dung" multiline minRows={10} value={content} onChange={e => setContent(e.target.value)}/></Stack></EditDialog>
 <ConfirmDialog open={action === 'review'} title="Gửi nguồn kiến thức để duyệt" description="Không xuất bản ngay; API kiểm dữ liệu, phiên bản và quyền." requireReason onClose={() => setAction(null)} error={review.error} busy={review.pending} onConfirm={reason => review.execute({ path: { knowledgeId }, body: { expectedVersion: k?.version || 1, reason } })}/><ConfirmDialog open={action === 'retire'} title="Ngừng sử dụng kiến thức" description="Loại nội dung này khỏi tra cứu tiếp theo, không sửa lịch sử câu trả lời trước đó." requireReason onClose={() => setAction(null)} error={retire.error} busy={retire.pending} onConfirm={reason => retire.execute({ path: { knowledgeId }, body: { expectedVersion: k?.version || 1, reason } })}/>
 <EditDialog open={action === 'publish'} title="Xuất bản kiến thức" onClose={() => setAction(null)} busy={publish.pending} actions={<Button variant="contained" disabled={!evalId || reason.length < 5 || !k?.draftRevisionId || publish.pending} onClick={async () => { try {
        await publish.execute({ path: { knowledgeId }, body: { expectedVersion: k?.version || 1, evaluationRunId: evalId, revisionId: k?.draftRevisionId || '', reason } });
        setAction(null);
    }
    catch { /* visible */ } }}>Xuất bản</Button>}><ErrorNotice error={publish.error}/><Stack gap={2}><TextField label="Mã lần đánh giá đúng phiên bản" value={evalId} onChange={e => setEval(e.target.value)}/><TextField label="Lý do xuất bản" value={reason} onChange={e => setReason(e.target.value)}/><RouteLink to={`/s/${shop.id}/bot/evaluations`}>Xem đánh giá</RouteLink></Stack></EditDialog>
 <EditDialog open={!!revision} title={`Phiên bản #${revision?.revision || ''}`} onClose={() => setRevision(null)} busy={restore.pending} actions={<MutationButton permission="knowledge.write" busy={restore.pending} onClick={async () => { try {
        await restore.execute({ path: { knowledgeId, revisionId: revision?.id || '' }, body: { expectedVersion: k?.version || 1, reason: 'Khôi phục lịch sử thành bản nháp để kiểm tra' } });
        setRevision(null);
    }
    catch { /* visible */ } }}>Khôi phục thành nháp</MutationButton>}><ErrorNotice error={restore.error}/><Typography sx={{ whiteSpace: 'pre-wrap' }}>{revision?.content || 'Nguồn tệp'}</Typography><Alert severity="info" sx={{ mt: 2 }}>Khôi phục không tự đổi bản đang chạy. Cần đánh giá và duyệt lại.</Alert></EditDialog></>;
}
export function FeedbackPage() {
    const list = useApi('listFeedback', { query: useListQuery() });
    const review = useCommand('reviewFeedback', ['listFeedback', 'listKnowledge']);
    const [selected, setSelected] = useState<Feedback | null>(null), [correction, setCorrection] = useState(''), [reason, setReason] = useState(''), [decision, setDecision] = useState<'approve' | 'reject'>('approve');
    return <><PageHeader title="Duyệt phản hồi AI" subtitle="Ẩn thông tin cá nhân, kiểm nội dung sửa, rồi mới tạo tri thức nháp."/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={r => r.id} columns={[
        { key: 'message', label: 'Tin nhắn', render: r => r.messageId }, { key: 'rating', label: 'Đánh giá', render: r => r.rating === 'positive' ? 'Hữu ích' : 'Cần sửa' }, { key: 'correction', label: 'Đề xuất', render: r => r.correction }, { key: 'status', label: 'Trạng thái', render: r => <Status value={r.status}/> },
        {
            key: 'action', label: '', render: r => <MutationButton permission="knowledge.write" disabled={r.status !== 'pending'} onClick={() => { setSelected(r); setCorrection(r.correction); setReason(''); }}>Duyệt nội dung</MutationButton>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel><EditDialog open={!!selected} title="Kiểm tra phản hồi" onClose={() => setSelected(null)} busy={review.pending} actions={<Button variant="contained" disabled={reason.length < 5 || review.pending || (decision === 'approve' && !correction)} onClick={async () => { try {
        await review.execute({ path: { feedbackId: selected?.id || '' }, body: { expectedVersion: selected?.version || 1, decision, reason, redactedCorrection: correction } });
        setSelected(null);
    }
    catch { /* visible */ } }}>Lưu kết quả</Button>}><ErrorNotice error={review.error}/><Stack gap={2}><Stack direction="row" gap={1}><Button variant={decision === 'approve' ? 'contained' : 'outlined'} onClick={() => setDecision('approve')}>Chấp nhận đề xuất</Button><Button color="error" variant={decision === 'reject' ? 'contained' : 'outlined'} onClick={() => setDecision('reject')}>Từ chối</Button></Stack><TextField label="Nội dung đã loại dữ liệu riêng tư" multiline minRows={6} value={correction} onChange={e => setCorrection(e.target.value)}/><TextField label="Lý do" value={reason} onChange={e => setReason(e.target.value)}/><Alert severity="info">Chấp nhận phản hồi chỉ tạo bản nháp, không tự huấn luyện hoặc xuất bản AI.</Alert></Stack></EditDialog></>;
}
