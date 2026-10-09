import { ActionGroup, FormFields, SectionGrid, SurfaceContent } from '../../shared/ui/composition';
import { useState } from 'react';
import { Alert, Box, Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { AgentRole, BotConfig, BotRevision, BudgetPolicy, Evaluation, PlaygroundResult } from '@botsales/contracts';
import { useApi, useCommand } from '../../shared/api/hooks';
import { useScope } from '../../shared/model/scope';
import { useListQuery } from '../../shared/model/filters';
import { codePointLength, dateTime } from '@/shared/model/format';
import { layoutSx } from '../../shared/ui/layout';
import { Amount, ConfirmDialog, DataTable, DetailLine, EditDialog, ErrorNotice, MutationButton, PageHeader, Pager, Panel, QueryState, RouteLink, Status, Toolbar } from '../../shared/ui/components';
export function BotConfigPage() {
    const { shop } = useScope();
    const get = useApi('getBotConfig');
    const connections = useApi('listAIConnections', {}, true);
    const versions = useApi('listBotRevisions');
    const update = useCommand('updateBotDraft', ['getBotConfig', 'listBotRevisions']);
    const publish = useCommand('publishBotConfig', ['getBotConfig']);
    const pause = useCommand('pauseBot', ['getBotConfig']);
    const restore = useCommand('restoreBotRevision', ['getBotConfig', 'listBotRevisions']);
    const b = get.data?.data;
    const [editing, setEdit] = useState<BotConfig | null>(null), [instructions, setInstructions] = useState(''), [connection, setConnection] = useState(''), [budget, setBudget] = useState(''), [steps, setSteps] = useState('4'), [knowledge, setKnowledge] = useState(''), [action, setAction] = useState<'publish' | 'pause' | null>(null), [evalId, setEval] = useState(''), [reason, setReason] = useState(''), [restoreVersion, setRestore] = useState<BotRevision | null>(null);
    return <><PageHeader title="Điều khiển Admin AI" subtitle="Tách cấu hình đang chạy và cấu hình đang soạn. Không bật tự động chỉ vì lưu prompt." actions={<RouteLink to={`/s/${shop.id}/bot/playground`}>Thử bot</RouteLink>}/><QueryState query={get} pendingProfile="section">{b && <Panel title="Cấu hình hiện hành" action={<Status value={b.status}/>} bodyMode="inset"><Box><DetailLine label="Bản nháp">{b.draftRevision}</DetailLine><DetailLine label="Bản đang chạy">{b.liveRevision || 'Chưa có'}</DetailLine><DetailLine label="Kết nối AI">{b.connectionId || 'Chưa chọn'}</DetailLine><DetailLine label="Giới hạn chi phí mỗi ngày"><Amount wrap value={b.dailyBudget}/></DetailLine><DetailLine label="Giới hạn bước công cụ">{b.maxToolSteps}</DetailLine><DetailLine label="Xuất bản lúc">{dateTime(b.publishedAt, shop.timezone)}</DetailLine><Typography sx={[layoutSx.page.sectionBefore, layoutSx.page.sectionAfter, { whiteSpace: 'pre-wrap' }]}>{b.instructions || 'Chưa có chỉ dẫn.'}</Typography><Alert severity="info">Hợp đồng BotConfigWrite hiện khóa <Box component="code" sx={{ overflowWrap: 'anywhere' }}>requireHumanOrderConfirmation=true</Box>. Quyền tự chốt đơn theo chính sách nghiệp vụ do backend quản lý riêng, không bật bằng cách đổi boolean ở đây.</Alert><ActionGroup direction="row" beforeGap="form"><MutationButton permission="bot.configure" onClick={() => { setEdit(b); setInstructions(b.instructions); setConnection(b.connectionId || ''); setBudget(b.dailyBudget?.amount || ''); setSteps(String(b.maxToolSteps)); setKnowledge(b.knowledgeRevisionIds.join('\n')); }}>Sửa bản nháp</MutationButton><MutationButton permission="bot.publish" variant="contained" onClick={() => setAction('publish')}>Duyệt & xuất bản</MutationButton><MutationButton permission="bot.publish" color="error" onClick={() => setAction('pause')}>Tạm dừng bot</MutationButton></ActionGroup></Box></Panel>}</QueryState><Panel title="Các phiên bản" beforeGap={"section"}><QueryState query={versions} pendingProfile="section"><DataTable rows={versions.data?.data || []} rowKey={r => `${r.id}-${r.revision}`} columns={[
        { key: 'revision', label: 'Phiên bản', render: r => `#${r.revision}` }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.status}/> }, { key: 'updated', label: 'Cập nhật', render: r => dateTime(r.updatedAt, shop.timezone) },
        {
            key: 'action', label: '', render: r => <MutationButton permission="bot.configure" onClick={() => setRestore(r)}>Khôi phục vào nháp</MutationButton>
        }
    ]}/></QueryState></Panel>
 <EditDialog open={!!editing} title="Cấu hình bản nháp" onClose={() => setEdit(null)} busy={update.pending} actions={<Button variant="contained" disabled={!editing || !instructions || !connection || !budget || update.pending} onClick={async () => { if (!editing)
        return; try {
        await update.execute({ version: editing.version, body: {
                connectionId: connection, instructions, knowledgeRevisionIds: knowledge.split(/\s+/).filter(Boolean), maxToolSteps: Number(steps), dailyBudget: { amount: budget, currency: shop.currency }, requireHumanOrderConfirmation: true
            } });
        setEdit(null);
    }
    catch { /* visible */ } }}>Lưu nháp</Button>}><ErrorNotice error={update.error}/><FormFields ><TextField label="Kết nối AI" select value={connection} onChange={e => setConnection(e.target.value)}>{connections.data?.data.map(c => <MenuItem key={c.id} value={c.id}>{c.name} · {c.status}</MenuItem>)}</TextField><TextField label="Chỉ dẫn tư vấn đã duyệt" multiline minRows={8} value={instructions} onChange={e => setInstructions(e.target.value)}/><TextField label="Mã phiên bản kiến thức (mỗi dòng một mã)" multiline minRows={3} value={knowledge} onChange={e => setKnowledge(e.target.value)}/><TextField label={`Ngân sách ngày (${shop.currency})`} value={budget} onChange={e => setBudget(e.target.value)}/><TextField type="number" label="Số bước công cụ tối đa" value={steps} inputProps={{ min: 0, max: 20 }} onChange={e => setSteps(e.target.value)}/></FormFields></EditDialog>
 <EditDialog open={action === 'publish'} title="Xuất bản cấu hình đã đánh giá" onClose={() => setAction(null)} busy={publish.pending} actions={<Button variant="contained" disabled={!evalId || codePointLength(reason) < 5 || publish.pending} onClick={async () => { try {
        await publish.execute({ body: { expectedVersion: b?.version || 1, draftRevision: b?.draftRevision || 1, evaluationRunId: evalId, reason } });
        setAction(null);
    }
    catch { /* visible */ } }}>Xuất bản</Button>}><ErrorNotice error={publish.error}/><FormFields ><TextField label="Mã lần đánh giá đúng bản nháp" value={evalId} onChange={e => setEval(e.target.value)}/><TextField label="Lý do" value={reason} onChange={e => setReason(e.target.value)}/><RouteLink to={`/s/${shop.id}/bot/evaluations`}>Xem kết quả kiểm thử</RouteLink></FormFields></EditDialog>
 <ConfirmDialog open={action === 'pause'} title="Tạm dừng Admin AI" description="Dừng các tác động chưa gửi. Tin nhắn đã được nhà cung cấp nhận không thể thu hồi bằng nút này." requireReason onClose={() => setAction(null)} busy={pause.pending} error={pause.error} onConfirm={reason => pause.execute({ body: { expectedVersion: b?.version || 1, reason } })}/><ConfirmDialog open={!!restoreVersion} title="Khôi phục bản cũ vào nháp" description="Không đổi bản đang chạy; phải kiểm thử và duyệt lại trước xuất bản." requireReason onClose={() => setRestore(null)} busy={restore.pending} error={restore.error} onConfirm={reason => restore.execute({ path: { revisionId: String(restoreVersion?.revision || 1) }, body: { expectedVersion: b?.version || 1, reason } })}/></>;
}
export function PlaygroundPage() {
    const config = useApi('getBotConfig');
    const run = useCommand('runPlayground', []);
    const [text, setText] = useState(''), [customer, setCustomer] = useState(''), [result, setResult] = useState<PlaygroundResult | null>(null);
    return <><PageHeader title="Phòng thử bot" subtitle="Thử cấu hình hiện tại mà không gửi tin cho khách hàng."/><SectionGrid columns={{ xs: '1fr', lg: '1fr 1fr' }}><Panel title="Câu hỏi thử" bodyMode="inset"><Box component="form" onSubmit={async (e) => { e.preventDefault(); try {
        const r = await run.execute({ body: { configRevision: config.data?.data.draftRevision || 1, text, customerContextId: customer || null } });
        setResult(r.data);
    }
    catch { /* visible */ } }}><ErrorNotice error={run.error}/><QueryState query={config}>{config.data?.data && <Alert severity="info">Phòng thử dùng bản nháp #{config.data.data.draftRevision} · {config.data.data.status === 'active' ? `đang chạy bản #${config.data.data.liveRevision || 'chưa có'}` : 'cấu hình bot đang tạm dừng'}. Nội dung thử không gửi ra ngoài.</Alert>}</QueryState><FormFields beforeGap="surface"><TextField label="Nội dung khách hỏi" multiline minRows={9} value={text} onChange={e => setText(e.target.value)}/><TextField label="Mã khách để thử ngữ cảnh (tùy chọn)" value={customer} onChange={e => setCustomer(e.target.value)}/><MutationButton permission="bot.configure" type="submit" variant="contained" busy={run.pending} disabled={!text.trim() || !config.data}>Chạy thử</MutationButton></FormFields></Box></Panel><Panel title="Kết quả có nguồn" bodyMode="inset"><Box>{result ? <><Typography sx={{ whiteSpace: 'pre-wrap' }}>{result.text}</Typography><DetailLine label="Phiên bản cấu hình">{result.configRevision}</DetailLine><DetailLine label="Độ trễ">{result.latencyMs} ms</DetailLine><DetailLine label="Chi phí ước tính"><Amount wrap value={result.estimatedCost}/></DetailLine><DetailLine label="Token vào / ra">{result.inputTokens ?? 'Chưa rõ'} / {result.outputTokens ?? 'Chưa rõ'}</DetailLine><DetailLine label="Gửi ra ngoài">Không</DetailLine><Typography variant="subtitle2" sx={layoutSx.surface.sectionBefore}>Nguồn</Typography>{result.sources.length > 0 && <Stack direction="row" sx={[layoutSx.code.inlineGap, { flexWrap: 'wrap' }]}>{result.sources.map(s => <Chip key={s.type + s.id} label={`${s.type} / ${s.id}`} />)}</Stack>}{result.warnings.map(w => <Alert key={w} severity="warning" sx={layoutSx.surface.sectionBefore}>{w}</Alert>)}</> : <Typography color="text.secondary">Chạy câu hỏi để xem câu trả lời, nguồn và cảnh báo. Không có điểm chất lượng tự tạo.</Typography>}</Box></Panel></SectionGrid></>;
}
export function EvaluationsPage() {
    const { shop } = useScope();
    const list = useApi('listEvaluations', { query: useListQuery('listEvaluations') });
    const bot = useApi('getBotConfig');
    const create = useCommand('createEvaluation', ['listEvaluations']);
    const [open, setOpen] = useState(false), [dataset, setDataset] = useState(''), [knowledge, setKnowledge] = useState(''), [selected, setSelected] = useState<Evaluation | null>(null);
    return <><PageHeader title="Đánh giá AI" subtitle="Kết quả gắn cấu hình, dữ liệu kiểm thử và phiên bản kiến thức." actions={<MutationButton permission="bot.configure" variant="contained" onClick={() => setOpen(true)}>Chạy đánh giá</MutationButton>}/>{__MOCK__ && <Alert severity="warning" sx={layoutSx.notice.afterGap}>Chế độ mô phỏng chỉ kiểm quy trình, không đánh giá chất lượng mô hình AI thật.</Alert>}<Panel><Toolbar operation="listEvaluations" /><QueryState query={list} pendingProfile="section"><DataTable rows={list.data?.data || []} rowKey={r => r.id} columns={[
        { key: 'id', label: 'Lần đánh giá', render: r => <Button onClick={() => setSelected(r)}>{r.id}</Button> }, { key: 'config', label: 'Bản cấu hình', render: r => r.configRevision }, { key: 'dataset', label: 'Bộ kiểm thử', render: r => r.datasetVersion }, { key: 'count', label: 'Đạt / tổng', render: r => `${r.passedCases} / ${r.totalCases}` }, { key: 'critical', label: 'Lỗi trọng yếu', render: r => r.criticalFailures }, { key: 'state', label: 'Trạng thái', render: r => <Status value={r.status}/> }
    ]}/></QueryState><Pager page={list.data?.page}/></Panel>
 <EditDialog open={open} title="Đánh giá cấu hình nháp" onClose={() => setOpen(false)} busy={create.pending} actions={<Button variant="contained" disabled={!dataset || !bot.data || create.pending} onClick={async () => { try {
        const r = await create.execute({ body: { configRevision: bot.data?.data.draftRevision || 1, datasetVersion: dataset, knowledgeRevisionId: knowledge || null } });
        setSelected(r.data);
        setOpen(false);
    }
    catch { /* visible */ } }}>Bắt đầu</Button>}><ErrorNotice error={create.error}/><FormFields ><TextField label="Phiên bản bộ kiểm thử đã đăng ký" value={dataset} onChange={e => setDataset(e.target.value)}/><TextField label="Mã bản kiến thức (tùy chọn)" value={knowledge} onChange={e => setKnowledge(e.target.value)}/><Alert severity="info">Mã bộ kiểm thử phải do backend xác minh. Không tự gọi tỷ lệ 100% là chứng nhận chất lượng.</Alert></FormFields></EditDialog><EditDialog open={!!selected} title="Chi tiết đánh giá" onClose={() => setSelected(null)} actions={<Button onClick={() => setSelected(null)}>Đóng</Button>}>{selected && <><DetailLine label="Mã">{selected.id}</DetailLine><DetailLine label="Bộ dữ liệu">{selected.datasetVersion}</DetailLine><DetailLine label="Bản cấu hình">{selected.configRevision}</DetailLine><DetailLine label="Kết quả"><Status value={selected.status}/></DetailLine><DetailLine label="Số ca">{selected.passedCases} / {selected.totalCases}</DetailLine><DetailLine label="Lỗi trọng yếu">{selected.criticalFailures}</DetailLine>{selected.reportJobId && <RouteLink to={`/s/${shop.id}/jobs/${selected.reportJobId}`}>Báo cáo chi tiết</RouteLink>}</>}</EditDialog></>;
}
const roleNames = { sales_admin: 'Admin bán hàng', accountant: 'Kế toán', warehouse_buyer: 'Kho & mua hàng', supervisor: 'Trưởng nhóm' };
export function AgentTeamPage() {
    const { shop } = useScope();
    const roles = useApi('listAgentRoles');
    const budgets = useApi('listBudgetPolicies');
    const update = useCommand('updateAgentRole', ['listAgentRoles', 'getOperationsSummary']);
    const control = useCommand('controlAutomation', ['listAgentRoles', 'getBotConfig', 'getOperationsSummary']);
    const budgetUpdate = useCommand('updateBudgetPolicy', ['listBudgetPolicies']);
    const [editing, setEditing] = useState<AgentRole | null>(null), [owner, setOwner] = useState(''), [connection, setConnection] = useState(''), [policy, setPolicy] = useState(''), [stop, setStop] = useState<{
        role: AgentRole;
        action: 'pause' | 'resume';
    } | null>(null), [budget, setBudget] = useState<BudgetPolicy | null>(null), [amount, setAmount] = useState(''), [approval, setApproval] = useState('');
    return <><PageHeader title="Đội ngũ AI" subtitle="Bốn vai trò trên cùng nền điều phối, quyền và người chịu trách nhiệm rõ ràng."/><QueryState query={roles} pendingProfile="section"><SectionGrid columns={{ xs: '1fr', md: 'repeat(2,1fr)' }}>{roles.data?.data.map(r => <Panel key={r.id} title={roleNames[r.kind]} action={<Status value={r.status}/>} bodyMode="inset"><Box><DetailLine label="Người chịu trách nhiệm">{r.humanOwnerId || 'Chưa giao'}</DetailLine><DetailLine label="Chính sách">{r.policyVersion}</DetailLine><DetailLine label="Thế hệ tác vụ">{r.generation}</DetailLine><Stack direction="row" sx={[layoutSx.code.inlineGap, layoutSx.surface.sectionBefore, layoutSx.notice.afterGap, { flexWrap: 'wrap' }]}>{r.allowedToolIds.map(tool => <Chip key={tool} label={tool}/>)}</Stack><ActionGroup direction="row" ><MutationButton permission="bot.configure" onClick={() => { setEditing(r); setOwner(r.humanOwnerId || ''); setConnection(r.modelConnectionId || ''); setPolicy(r.policyVersion); }}>Phân công</MutationButton><MutationButton permission="bot.pause" color={r.status === 'paused' ? 'primary' : 'error'} onClick={() => setStop({ role: r, action: r.status === 'paused' ? 'resume' : 'pause' })}>{r.status === 'paused' ? 'Đề nghị tiếp tục' : 'Tạm dừng'}</MutationButton></ActionGroup></Box></Panel>)}</SectionGrid></QueryState><Panel title="Ngân sách được giao" beforeGap={"section"}><QueryState query={budgets} pendingProfile="section"><DataTable rows={budgets.data?.data || []} rowKey={b => b.id} columns={[
        { key: 'kind', label: 'Loại', render: b => b.kind }, { key: 'limit', label: 'Giới hạn', render: b => <Amount value={b.limitAmount}/> }, { key: 'used', label: 'Đã dùng', render: b => <Amount value={b.consumed}/> }, { key: 'reserved', label: 'Đã cam kết', render: b => <Amount value={b.reserved}/> }, { key: 'state', label: 'Áp dụng', render: b => b.enabled ? 'Đã bật' : 'Chưa bật' },
        {
            key: 'action', label: '', render: b => <MutationButton permission="operations.manage" onClick={() => { setBudget(b); setAmount(b.limitAmount?.amount || ''); setApproval(''); }}>Đổi có phê duyệt</MutationButton>
        }
    ]}/></QueryState></Panel>
 <Panel title="Chi phí AI & dự phòng nhà cung cấp" beforeGap={"section"} bodyMode="inset">
    <SurfaceContent  data-testid="provider-failover-preview">
        <Alert severity="info">Chi phí trong phòng thử là ước tính mô phỏng. Chỉ dùng provider dự phòng đã được phê duyệt; demo không chuyển dữ liệu khách sang provider khác.</Alert>
        <DetailLine label="Ngân sách token / kênh">Theo chính sách và hạn mức do hệ thống trả về; không dùng chung với ngân sách mua hàng.</DetailLine>
        <DetailLine label="Provider dự phòng">Chưa có trạng thái failover được xác minh trong dữ liệu frontend.</DetailLine>
        <DetailLine label="Khi hết hạn mức">Dừng câu trả lời tự động và chuyển nhân viên xử lý; không âm thầm đổi provider.</DetailLine>
    </SurfaceContent>
 </Panel>
 <EditDialog open={!!editing} title="Giao trách nhiệm và cấu hình vai trò" onClose={() => setEditing(null)} busy={update.pending} actions={<Button variant="contained" disabled={!owner || !connection || !policy || update.pending} onClick={async () => { try {
        await update.execute({ path: { resourceId: editing?.id || '' }, body: { expectedVersion: editing?.version || 1, humanOwnerId: owner, modelConnectionId: connection, policyVersion: policy } });
        setEditing(null);
    }
    catch { /* visible */ } }}>Lưu phân công</Button>}><ErrorNotice error={update.error}/><FormFields ><TextField label="Mã nhân sự chịu trách nhiệm" value={owner} onChange={e => setOwner(e.target.value)}/><TextField label="Mã kết nối AI" value={connection} onChange={e => setConnection(e.target.value)}/><TextField label="Phiên bản chính sách đã duyệt" value={policy} onChange={e => setPolicy(e.target.value)}/><Alert severity="info">Công cụ được phép do backend trả về; không sửa quyền qua prompt.</Alert></FormFields></EditDialog>
 <ConfirmDialog open={!!stop} title={stop?.action === 'pause' ? 'Tạm dừng vai trò' : 'Kiểm điều kiện để tiếp tục'} description="Kiểm thế hệ tác vụ và chính sách trước tác động mới. Không thu hồi được tác động đã được dịch vụ ngoài nhận." requireReason onClose={() => setStop(null)} error={control.error} busy={control.pending} onConfirm={reason => control.execute({ body: { expectedVersion: stop?.role.version || 1, scope: 'role', resourceId: stop?.role.id || null, action: stop?.action || 'pause', reason } })}/>
 <EditDialog open={!!budget} title="Đổi giới hạn được duyệt" onClose={() => setBudget(null)} busy={budgetUpdate.pending} actions={<Button variant="contained" disabled={!amount || !approval || budgetUpdate.pending} onClick={async () => { try {
        await budgetUpdate.execute({ path: { resourceId: budget?.id || '' }, body: {
                expectedVersion: budget?.version || 1, limitAmount: { amount, currency: shop.currency }, period: budget?.period || 'daily', approvalId: approval
            } });
        setBudget(null);
    }
    catch { /* visible */ } }}>Áp dụng giới hạn</Button>}><ErrorNotice error={budgetUpdate.error}/><FormFields ><TextField label={`Giới hạn (${shop.currency})`} value={amount} onChange={e => setAmount(e.target.value)}/><TextField label="Mã phê duyệt đúng nội dung" value={approval} onChange={e => setApproval(e.target.value)}/></FormFields></EditDialog></>;
}
