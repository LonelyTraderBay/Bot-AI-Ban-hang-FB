import { ActionGroup, FormFields, PageSections, SurfaceContent } from '../../shared/ui/composition';
import { useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import type { Feedback, Knowledge, KnowledgeRevision, Product, StockSnapshot } from '@botsales/contracts';
import { useApi, useCommand } from '../../shared/api/hooks';
import { useCan, useScope } from '../../shared/model/scope';
import { useListQuery } from '../../shared/model/filters';
import { dateTime } from '../../shared/model/format';
import { Amount, ConfirmDialog, DataTable, DetailLine, EditDialog, ErrorNotice, MutationButton, PageHeader, Pager, Panel, QueryState, RouteLink, Status, Toolbar } from '../../shared/ui/components';
import { layoutSx } from '../../shared/ui/layout';

type CurrentSourceRow = {
    key: string;
    product: Product;
    variant: Product['variants'][number];
    snapshot: StockSnapshot | null;
};

function CurrentCatalogSources() {
    const { shop } = useScope();
    const canReadCatalog = useCan('catalog.read');
    const canReadInventory = useCan('inventory.read');
    const products = useApi('listProducts', { query: { limit: 100 } }, canReadCatalog);
    const snapshots = useApi('listStockSnapshots', { query: { limit: 100 } }, canReadInventory);
    const canViewSources = canReadCatalog && canReadInventory;
    const rows = (products.data?.data || [])
        .filter(product => product.status === 'active')
        .flatMap<CurrentSourceRow>(product => product.variants.filter(variant => variant.active).flatMap<CurrentSourceRow>(variant => {
            const matchingSnapshots = (snapshots.data?.data || []).filter(snapshot => snapshot.variantId === variant.id);
            return matchingSnapshots.length
                ? matchingSnapshots.map(snapshot => ({ key: `${variant.id}:${snapshot.warehouseId}`, product, variant, snapshot }))
                : [{ key: `${variant.id}:missing`, product, variant, snapshot: null }];
        }));

    return <Panel title="Nguồn dữ liệu giá và tồn" subtitle="Giá lấy từ danh mục sản phẩm; số lượng lấy từ snapshot kho theo từng biến thể." bodyMode="inset">
        <SurfaceContent >
            <Alert severity="info">Nguồn API được truy vấn riêng với nội dung tri thức. Trong chế độ demo, đây là dữ liệu tổng hợp; thời điểm snapshot được hiển thị để người nghiệm thu đối chiếu.</Alert>
            {!canViewSources
                ? <Alert severity="warning">Cần quyền xem sản phẩm và tồn kho để đối chiếu nguồn giá/tồn hiện hành.</Alert>
                : <QueryState query={products} pendingProfile="section">{products.data && <QueryState query={snapshots} pendingProfile="section">{snapshots.data && <>
                    <DataTable label="Nguồn giá và snapshot tồn kho" rows={rows} rowKey={row => row.key} empty="Chưa có biến thể đang bán để đối chiếu." columns={[
                        { key: 'product', label: 'Sản phẩm / biến thể', render: row => <Stack><RouteLink to={`/s/${shop.id}/products/${row.product.id}`}>{row.product.name}</RouteLink><Typography variant="caption" color="text.secondary">{row.variant.name}</Typography></Stack> },
                        { key: 'sku', label: 'SKU', render: row => row.variant.sku },
                        { key: 'price', label: 'Giá bán', align: 'right', render: row => <Amount value={row.variant.price}/> },
                        { key: 'warehouse', label: 'Kho', render: row => row.snapshot?.warehouseId || 'Chưa có snapshot' },
                        { key: 'available', label: 'Có thể bán', align: 'right', render: row => row.snapshot?.available ?? 'Chưa có snapshot' },
                        { key: 'asOf', label: 'Thời điểm snapshot', render: row => row.snapshot ? dateTime(row.snapshot.asOf, shop.timezone) : 'Chưa ghi nhận' },
                    ]}/>
                    <Typography variant="caption" color="text.secondary">Bản đối chiếu giới hạn ở 100 sản phẩm và 100 snapshot đầu tiên. Mở Sản phẩm hoặc Tồn kho để tra cứu đầy đủ.</Typography>
                    <ActionGroup direction={{ xs: 'column', sm: 'row' }} density="comfortable">
                        <RouteLink to={`/s/${shop.id}/products`}>Mở danh sách sản phẩm</RouteLink>
                        <RouteLink to={`/s/${shop.id}/inventory`}>Mở danh sách tồn kho</RouteLink>
                    </ActionGroup>
                </>}</QueryState>}</QueryState>}
        </SurfaceContent>
    </Panel>;
}

type ProductContentFields = {
    productName: string;
    features: string;
    sizeUse: string;
    warranty: string;
    alternatives: string;
    forbiddenPromises: string;
    sourceOwner: string;
};
const sampleProductContent: ProductContentFields = {
    productName: 'Áo thun cotton basic · nội dung mẫu',
    features: 'Cotton mềm, cổ tròn, đường may cơ bản. Xác minh thành phần từ nhãn trước khi tư vấn.',
    sizeUse: 'Hỏi chiều cao/cân nặng và đối chiếu bảng kích cỡ đã duyệt; không tự chọn size thay khách.',
    warranty: 'Chính sách bảo hành/đổi hàng chưa được xác minh trong hợp đồng demo.',
    alternatives: 'Áo thun cổ tròn SKU SP-TS-02 · chỉ là gợi ý mẫu, kiểm tra giá và tồn hiện hành trước khi gửi.',
    forbiddenPromises: 'Không hứa hiệu quả y tế, chất liệu chưa có chứng từ hoặc giao hàng trước ngày xác nhận.',
    sourceOwner: 'Nhóm sản phẩm · mẫu chưa được chủ nguồn xác nhận',
};
const productContentFields: Array<{ key: keyof ProductContentFields; label: string }> = [
    { key: 'features', label: 'Điểm nổi bật có nguồn' },
    { key: 'sizeUse', label: 'Kích cỡ và cách sử dụng' },
    { key: 'warranty', label: 'Bảo hành / đổi trả' },
    { key: 'alternatives', label: 'Sản phẩm thay thế' },
    { key: 'forbiddenPromises', label: 'Điều không được cam kết' },
    { key: 'sourceOwner', label: 'Chủ nguồn nội dung' },
];
function ProductContentMockPreview() {
    const [draft, setDraft] = useState<ProductContentFields>({ ...sampleProductContent });
    const [preview, setPreview] = useState<ProductContentFields | null>(null);
    const valid = draft.productName.trim().length > 0 && draft.features.trim().length > 0 && draft.sourceOwner.trim().length > 0;
    const hasChanges = !preview || Object.keys(draft).some(key => draft[key as keyof ProductContentFields] !== preview[key as keyof ProductContentFields]);
    return <Panel title="Nội dung sản phẩm · xem trước cục bộ" subtitle="Các thuộc tính mẫu chưa có trong DTO sản phẩm hiện hành." bodyMode="inset">
        <FormFields  data-testid="product-content-preview">
            <Alert severity="info">Bạn có thể rà soát nội dung, kích cỡ, bảo hành, sản phẩm thay thế và điều không được hứa. “Lưu bản xem trước” chỉ giữ state trong trang này; không gửi API và sẽ mất khi tải lại.</Alert>
            <TextField label="Tên sản phẩm mẫu" value={draft.productName} onChange={event => setDraft(current => ({ ...current, productName: event.target.value }))} inputProps={{ maxLength: 180 }} />
            {productContentFields.map(field => <TextField key={field.key} label={field.label} value={draft[field.key]} onChange={event => setDraft(current => ({ ...current, [field.key]: event.target.value }))} multiline minRows={field.key === 'features' || field.key === 'forbiddenPromises' ? 2 : 1} inputProps={{ maxLength: 1000 }} />)}
            <Button variant="outlined" disabled={!valid || !hasChanges} onClick={() => setPreview({ ...draft })}>Lưu bản xem trước (chỉ trên trang này)</Button>
            {preview && <Box role="region" aria-label="Bản xem trước nội dung sản phẩm" sx={[layoutSx.surface.inset, { border: 1, borderColor: 'divider', borderRadius: visualSx.radius.dialog }]}>
                <Typography variant="subtitle1" fontWeight={visualSx.typography.fontWeight.bold}>{preview.productName}</Typography>
                {productContentFields.map(field => <DetailLine key={field.key} label={field.label}>{preview[field.key] || 'Chưa có thông tin mẫu'}</DetailLine>)}
                <Alert severity="warning" sx={layoutSx.notice.contentGap}>Bản xem trước chưa được duyệt; không dùng làm lời hứa bán hàng hoặc dữ liệu đã lưu.</Alert>
            </Box>}
        </FormFields>
    </Panel>;
}

export function KnowledgePage() {
    const { t } = useTranslation();
    const { shop } = useScope();
    const list = useApi('listKnowledge', { query: useListQuery('listKnowledge') });
    const create = useCommand('createKnowledge', ['listKnowledge']);
    const upload = useCommand('uploadFile', []);
    const fieldLabels = { title: t('knowledge.form.title'), content: t('knowledge.form.content') };
    const [open, setOpen] = useState(false), [title, setTitle] = useState(''), [content, setContent] = useState(''), [file, setFile] = useState<File | null>(null), [fileError, setFileError] = useState(''), [uploadedFileId, setUploadedFileId] = useState<string | null>(null), [createdId, setCreatedId] = useState('');
    const openCreate = () => { setTitle(''); setContent(''); setFile(null); setFileError(''); setUploadedFileId(null); setCreatedId(''); setOpen(true); };
    return <><PageHeader title="Kiến thức cửa hàng" subtitle="Tri thức được duyệt riêng với hội thoại khách; giá và tồn lấy từ nguồn nghiệp vụ hiện hành." actions={<MutationButton permission="knowledge.write" variant="contained" onClick={openCreate}>Thêm nguồn kiến thức</MutationButton>}/>{createdId && <Alert severity="success" role="status" sx={layoutSx.notice.afterGap}>Bản nháp đã được tạo, chưa xuất bản. <RouteLink to={`/s/${shop.id}/knowledge/${createdId}`}>Mở nguồn vừa tạo</RouteLink></Alert>}<Panel><Toolbar operation="listKnowledge" /><QueryState query={list} pendingProfile="section">{list.data && <><DataTable rows={list.data.data} rowKey={r => r.id} columns={[
        { key: 'title', label: 'Tài liệu', render: r => <RouteLink to={`/s/${shop.id}/knowledge/${r.id}`}>{r.title}</RouteLink> }, { key: 'source', label: 'Nguồn', render: r => r.sourceKind }, { key: 'revision', label: 'Phiên bản', render: r => r.revision }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.status}/> }, { key: 'published', label: 'Xuất bản', render: r => dateTime(r.publishedAt, shop.timezone) }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel><PageSections beforeGap="section"><ProductContentMockPreview/><CurrentCatalogSources/></PageSections>
 <EditDialog open={open} title="Nguồn kiến thức mới" onClose={() => setOpen(false)} busy={create.pending || upload.pending} actions={<Button variant="contained" disabled={!title.trim() || (!content.trim() && !file) || Boolean(fileError) || create.pending || upload.pending} onClick={async () => { try {
        let fileId: string | null = file ? uploadedFileId : null;
        if (file) {
            if (!fileId) {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('purpose', 'knowledge_source');
                fileId = (await upload.execute({ form: fd })).data.id;
                setUploadedFileId(fileId);
            }
        }
        const r = await create.execute({ body: { title: title.trim(), sourceKind: file ? 'file' : 'manual', fileId, content: content.trim() || null } });
        setCreatedId(r.data.id);
        setOpen(false);
    }
    catch { /* retain input and uploaded file ID for a safe retry */ } }}>Lưu bản nháp</Button>}><ErrorNotice error={create.error || upload.error} fieldLabels={fieldLabels}/><FormFields ><TextField name="title" label={t('knowledge.form.title')} value={title} onChange={e => setTitle(e.target.value)} inputProps={{ maxLength: 180 }}/><TextField name="content" label={t('knowledge.form.content')} multiline minRows={8} value={content} onChange={e => setContent(e.target.value)} inputProps={{ maxLength: 100000 }}/><Button component="label" variant="outlined">{file ? file.name : 'Hoặc tải PDF/tài liệu hỗ trợ'}<input type="file" hidden accept=".pdf,.txt,.csv" onChange={e => { const input = e.currentTarget; const next = input.files?.[0] || null; const allowed = ['application/pdf', 'text/plain', 'text/csv']; if (next && next.size > 5 * 1024 * 1024) { setFileError('Tệp vượt giới hạn 5 MB của bản mô phỏng.'); setFile(null); setUploadedFileId(null); input.value = ''; return; } if (next && !allowed.includes(next.type) && !next.name.toLowerCase().endsWith('.csv')) { setFileError('Chỉ nhận PDF, TXT hoặc CSV theo luồng tri thức.'); setFile(null); setUploadedFileId(null); input.value = ''; return; } setFileError(''); setUploadedFileId(null); setFile(next); }}/></Button>{file && <Button onClick={() => { setFile(null); setFileError(''); setUploadedFileId(null); }}>Bỏ tệp</Button>}{fileError && <Alert severity="error">{fileError}</Alert>}<Alert severity="info">Tệp chỉ là nguồn chưa tin cậy; bản tải lên không tự trở thành chỉ dẫn hay xuất bản. Cần kiểm tra, duyệt và đánh giá đúng phiên bản.</Alert></FormFields></EditDialog></>;
}
export function KnowledgeDetailPage() {
    const { shop } = useScope();
    const { knowledgeId = '' } = useParams();
    const [revision, setRevision] = useState<KnowledgeRevision | null>(null);
    const get = useApi('getKnowledge', { path: { knowledgeId } });
    const file = useApi('getFile', { path: { fileId: get.data?.data.fileId || '' } }, Boolean(get.data?.data.fileId));
    const revisions = useApi('listKnowledgeRevisions', { path: { knowledgeId } });
    const revisionDetail = useApi('getKnowledgeRevision', { path: { knowledgeId, revisionId: revision?.id || '' } }, Boolean(revision));
    const update = useCommand('updateKnowledge', ['getKnowledge', 'listKnowledge', 'listKnowledgeRevisions']);
    const createRevision = useCommand('createKnowledgeRevision', ['getKnowledge', 'listKnowledge', 'listKnowledgeRevisions']);
    const review = useCommand('submitKnowledgeReview', ['getKnowledge', 'listKnowledge']);
    const publish = useCommand('publishKnowledge', ['getKnowledge', 'listKnowledge', 'listKnowledgeRevisions']);
    const retire = useCommand('retireKnowledge', ['getKnowledge', 'listKnowledge']);
    const restore = useCommand('restoreKnowledgeRevision', ['getKnowledge', 'listKnowledgeRevisions']);
    const [edit, setEdit] = useState<Knowledge | null>(null), [title, setTitle] = useState(''), [content, setContent] = useState(''), [mode, setMode] = useState<'edit' | 'revision'>('edit'), [action, setAction] = useState<'review' | 'publish' | 'retire' | null>(null), [evalId, setEval] = useState(''), [reason, setReason] = useState(''), [restoreReason, setRestoreReason] = useState('');
    const k = get.data?.data;
    return <><PageHeader title={k?.title || 'Chi tiết kiến thức'} subtitle="Lịch sử phiên bản không bị thay bởi nội dung hiện tại." actions={<RouteLink to={`/s/${shop.id}/knowledge`}>Tất cả nguồn</RouteLink>}/><ErrorNotice error={file.error || review.error || update.error || createRevision.error || revisionDetail.error}/><QueryState query={get} pendingProfile="section">{k && <><Panel title="Nội dung & nguồn" action={<Status value={k.status}/>} bodyMode="inset"><Box><DetailLine label="Phiên bản hiện tại">{k.revision}</DetailLine><DetailLine label="Bản đã xuất bản">{k.publishedRevisionId || 'Chưa có'}</DetailLine><DetailLine label="Bản nháp">{k.draftRevisionId || 'Chưa có'}</DetailLine><DetailLine label="Người duyệt">{k.approvedBy || 'Chưa được duyệt'}</DetailLine>{k.fileId && <DetailLine label="Tệp nguồn">{file.isPending ? 'Đang tải trạng thái tệp…' : file.data ? <>{file.data.data.name} · <Status value={file.data.data.status}/></> : 'Chưa tải được trạng thái tệp.'}</DetailLine>}<Typography sx={[layoutSx.surface.sectionBefore, layoutSx.notice.afterGap, { whiteSpace: 'pre-wrap' }]}>{k.content || 'Nội dung được xử lý từ tệp; xem trạng thái công việc.'}</Typography>{k.warnings.map(w => <Alert key={w} severity="warning">{w}</Alert>)}<ActionGroup direction="row" ><MutationButton permission="knowledge.write" onClick={() => { setEdit(k); setTitle(k.title); setContent(k.content || ''); setMode(k.status === 'published' ? 'revision' : 'edit'); }}>{k.status === 'published' ? 'Soạn phiên bản mới' : 'Sửa bản nháp'}</MutationButton><MutationButton permission="knowledge.write" disabled={k.status === 'published' || k.status === 'processing'} onClick={() => setAction('review')}>Gửi duyệt</MutationButton><MutationButton permission="knowledge.publish" disabled={k.status !== 'ready_for_review'} variant="contained" onClick={() => setAction('publish')}>Xuất bản bản đã đánh giá</MutationButton><MutationButton permission="knowledge.publish" disabled={k.status !== 'published'} onClick={() => setAction('retire')}>Ngừng sử dụng</MutationButton></ActionGroup></Box></Panel><Panel title="Lịch sử phiên bản" beforeGap={"section"}><QueryState query={revisions} pendingProfile="section"><DataTable rows={revisions.data?.data || []} rowKey={r => r.id} columns={[
        { key: 'id', label: 'Phiên bản', render: r => `#${r.revision} · ${r.id}` }, { key: 'title', label: 'Tiêu đề', render: r => r.title }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.status}/> }, { key: 'action', label: '', render: r => <Button onClick={() => { setRestoreReason(''); setRevision(r); }}>Xem / khôi phục nháp</Button> }
    ]}/></QueryState></Panel></>}</QueryState>
 <EditDialog open={!!edit} title={mode === 'revision' ? 'Soạn phiên bản mới' : 'Sửa nháp'} onClose={() => setEdit(null)} busy={update.pending || createRevision.pending} actions={<Button variant="contained" disabled={!edit || !title.trim() || !content.trim() || update.pending || createRevision.pending} onClick={async () => { if (!edit)
        return; try {
        const body = { title: title.trim(), content: content.trim(), sourceKind: edit.sourceKind || 'manual' as const, fileId: edit.fileId || null };
        if (mode === 'revision')
            await createRevision.execute({ path: { knowledgeId }, version: edit.version, body });
        else
            await update.execute({ path: { knowledgeId }, version: edit.version, body });
        setEdit(null);
    }
    catch { /* visible */ } }}>Lưu nháp</Button>}><ErrorNotice error={update.error || createRevision.error}/><FormFields ><TextField label="Tiêu đề" value={title} onChange={e => setTitle(e.target.value)}/><TextField label="Nội dung" multiline minRows={10} value={content} onChange={e => setContent(e.target.value)}/></FormFields></EditDialog>
 <ConfirmDialog open={action === 'review'} title="Gửi nguồn kiến thức để duyệt" description="Không xuất bản ngay; API kiểm dữ liệu, phiên bản và quyền." requireReason onClose={() => setAction(null)} error={review.error} busy={review.pending} onConfirm={reason => review.execute({ path: { knowledgeId }, body: { expectedVersion: k?.version || 1, reason } })}/><ConfirmDialog open={action === 'retire'} title="Ngừng sử dụng kiến thức" description="Loại nội dung này khỏi tra cứu tiếp theo, không sửa lịch sử câu trả lời trước đó." requireReason onClose={() => setAction(null)} error={retire.error} busy={retire.pending} onConfirm={reason => retire.execute({ path: { knowledgeId }, body: { expectedVersion: k?.version || 1, reason } })}/>
 <EditDialog open={action === 'publish'} title="Xuất bản kiến thức" onClose={() => setAction(null)} busy={publish.pending} actions={<Button variant="contained" disabled={!evalId.trim() || reason.trim().length < 5 || !k?.draftRevisionId || publish.pending} onClick={async () => { try {
        await publish.execute({ path: { knowledgeId }, body: { expectedVersion: k?.version || 1, evaluationRunId: evalId.trim(), revisionId: k?.draftRevisionId || '', reason: reason.trim() } });
        setAction(null);
    }
    catch { /* visible */ } }}>Xuất bản</Button>}><ErrorNotice error={publish.error}/><FormFields ><TextField label="Mã lần đánh giá đúng phiên bản" value={evalId} onChange={e => setEval(e.target.value)}/><TextField label="Lý do xuất bản" value={reason} onChange={e => setReason(e.target.value)}/><RouteLink to={`/s/${shop.id}/bot/evaluations`}>Xem đánh giá</RouteLink></FormFields></EditDialog>
 <EditDialog open={!!revision} title={`Phiên bản #${revision?.revision || ''}`} onClose={() => { setRevision(null); setRestoreReason(''); }} busy={restore.pending} actions={<MutationButton permission="knowledge.write" busy={restore.pending} disabled={restoreReason.trim().length < 5} onClick={async () => { try {
        await restore.execute({ path: { knowledgeId, revisionId: revision?.id || '' }, body: { expectedVersion: k?.version || 1, reason: restoreReason.trim() } });
        setRevision(null);
        setRestoreReason('');
    }
    catch { /* visible */ } }}>Khôi phục thành nháp</MutationButton>}><ErrorNotice error={restore.error || revisionDetail.error}/>{revisionDetail.isPending ? <Typography role="status">Đang tải nội dung phiên bản…</Typography> : <Typography sx={{ whiteSpace: 'pre-wrap' }}>{revisionDetail.data?.data.content || 'Nguồn tệp'}</Typography>}<TextField label="Lý do khôi phục" value={restoreReason} onChange={e => setRestoreReason(e.target.value)} inputProps={{ maxLength: 1000 }} helperText="Tối thiểu 5 ký tự; bản đã xuất bản không bị sửa."/><Alert severity="info" sx={layoutSx.notice.contentGap}>Khôi phục tạo bản nháp mới, không tự đổi bản đang chạy. Cần đánh giá và duyệt lại.</Alert></EditDialog></>;
}
export function FeedbackPage() {
    const list = useApi('listFeedback', { query: useListQuery('listFeedback') });
    const review = useCommand('reviewFeedback', ['listFeedback', 'listKnowledge']);
    const [selected, setSelected] = useState<Feedback | null>(null), [correction, setCorrection] = useState(''), [reason, setReason] = useState(''), [decision, setDecision] = useState<'approve' | 'reject'>('approve');
    return <><PageHeader title="Duyệt phản hồi AI" subtitle="Ẩn thông tin cá nhân, kiểm nội dung sửa, rồi mới tạo tri thức nháp."/><Panel><Toolbar operation="listFeedback" /><QueryState query={list} pendingProfile="section">{list.data && <><DataTable rows={list.data.data} rowKey={r => r.id} columns={[
        { key: 'message', label: 'Tin nhắn', render: r => r.messageId }, { key: 'rating', label: 'Đánh giá', render: r => r.rating === 'positive' ? 'Hữu ích' : 'Cần sửa' }, { key: 'correction', label: 'Đề xuất', render: r => r.correction }, { key: 'status', label: 'Trạng thái', render: r => <Status value={r.status}/> },
        {
            key: 'action', label: '', render: r => <MutationButton permission="knowledge.write" disabled={r.status !== 'pending'} onClick={() => { setSelected(r); setCorrection(r.correction); setReason(''); }}>Duyệt nội dung</MutationButton>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel><EditDialog open={!!selected} title="Kiểm tra phản hồi" onClose={() => setSelected(null)} busy={review.pending} actions={<Button variant="contained" disabled={reason.trim().length < 5 || review.pending || (decision === 'approve' && !correction.trim())} onClick={async () => { try {
        await review.execute({ path: { feedbackId: selected?.id || '' }, body: { expectedVersion: selected?.version || 1, decision, reason: reason.trim(), redactedCorrection: correction.trim() } });
        setSelected(null);
    }
    catch { /* visible */ } }}>Lưu kết quả</Button>}><ErrorNotice error={review.error}/><FormFields ><ActionGroup direction="row" ><Button variant={decision === 'approve' ? 'contained' : 'outlined'} onClick={() => setDecision('approve')}>Chấp nhận đề xuất</Button><Button color="error" variant={decision === 'reject' ? 'contained' : 'outlined'} onClick={() => setDecision('reject')}>Từ chối</Button></ActionGroup><TextField label="Nội dung đã loại dữ liệu riêng tư" multiline minRows={6} value={correction} onChange={e => setCorrection(e.target.value)} inputProps={{ maxLength: 10000 }} helperText="Kiểm tra và tự loại PII trước khi chấp nhận; nội dung này được lưu vào bản nháp."/><TextField label="Lý do" value={reason} onChange={e => setReason(e.target.value)} inputProps={{ maxLength: 2000 }}/><Alert severity="info">Chấp nhận phản hồi chỉ tạo bản nháp và revision; không tự huấn luyện hoặc xuất bản AI.</Alert></FormFields></EditDialog></>;
}
