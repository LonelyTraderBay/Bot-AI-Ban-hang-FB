import { PageSections } from '../../shared/ui/composition';
import { ActionGroup, FormFields, SectionGrid, SurfaceContent } from '../../shared/ui/composition';
import { useEffect, useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { layoutSx } from '../../shared/ui/layout';
import type { AgentRole, WorkItem } from '@botsales/contracts';
import { useApi, usePagedApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { codePointLength, dateTime } from '@/shared/model/format';
import { PageHeader, Panel, Stats, Stat, DataTable, QueryState, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, RouteLink, Amount, DetailLine, ConfirmDialog, LookupLoadMore } from '@/shared/ui/components';

const workItemActions = ['begin', 'complete', 'block', 'reassign'] as const;
type WorkItemAction = typeof workItemActions[number];
const roleNames: Record<AgentRole['kind'], string> = {
    sales_admin: 'Admin bán hàng',
    accountant: 'Kế toán',
    warehouse_buyer: 'Kho & mua hàng',
    supervisor: 'Trưởng nhóm',
};

export function OperationsPage() {
    const { shop, session } = useScope();
    const list = useApi('listWorkItems', { query: useListQuery('listWorkItems') });
    const summary = useApi('getOperationsSummary');
    const claim = useCommand('claimWorkItem', ['listWorkItems', 'listPrepJobs', 'getOperationsSummary']);
    const update = useCommand('updateWorkItem', ['listWorkItems', 'getOperationsSummary']);
    const [item, setItem] = useState<WorkItem | null>(null);
    const [action, setAction] = useState<WorkItemAction>('begin');
    const [reason, setReason] = useState('');
    const [assignee, setAssignee] = useState('');
    const [exceptionsOnly, setExceptionsOnly] = useState(false);
    const canManageMembers = useCan('members.manage');
    const [memberSearchInput, setMemberSearchInput] = useState(''), [memberSearch, setMemberSearch] = useState('');
    useEffect(() => {
        const timer = window.setTimeout(() => setMemberSearch(memberSearchInput.trim()), 250);
        return () => window.clearTimeout(timer);
    }, [memberSearchInput]);
    const members = usePagedApi('listMembers', { query: { status: 'active', q: memberSearch || undefined } }, canManageMembers);
    const availableActions = item?.allowedActions.filter((candidate): candidate is WorkItemAction => workItemActions.includes(candidate as WorkItemAction) && (candidate !== 'reassign' || Boolean(members.data?.data.length || members.hasMore))) || [];
    const workItems = list.data?.data || [];
    const asOf = list.data?.meta.asOf;
    const isException = (task: WorkItem) => {
        if (task.state === 'completed' || task.state === 'cancelled') return false;
        const overdue = Boolean(task.dueAt && asOf && Date.parse(task.dueAt) <= Date.parse(asOf));
        const unclaimed = task.state === 'queued' && !task.assigneeUserId;
        return task.state === 'blocked' || overdue || unclaimed || task.kind === 'payment_mismatch';
    };
    const exceptionItems = workItems.filter(isException);
    const visibleItems = exceptionsOnly ? exceptionItems : workItems;

    return <>
        <PageHeader title="Công việc hôm nay" subtitle="Giao việc → nhận việc → hoàn thành → kiểm tra kết quả." />
        <Alert severity="info" sx={layoutSx.notice.afterGap}>Dữ liệu vận hành và trạng thái dịch vụ đang được mô phỏng; chưa xác minh worker hoặc backend thật.</Alert>
        <QueryState query={summary} pendingProfile="section">
            {summary.data && <Stats>
                <Stat title="Chưa có người nhận" value={summary.data.data.queuedTasks} accent />
                <Stat title="Quá hạn" value={summary.data.data.overdueTasks} />
                <Stat title="Chờ phê duyệt" value={summary.data.data.pendingApprovals} />
                <Stat title="Kết quả chưa rõ" value={summary.data.data.unknownCommands} />
            </Stats>}
        </QueryState>
        <ErrorNotice error={claim.error} />
        <Panel>
            <SurfaceContent bodyMode="insetDivider" data-testid="operation-exceptions">
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={layoutSx.surface.headerFlowGap}>
                    <Box>
                        <Typography fontWeight={visualSx.typography.fontWeight.strong}>Giám sát ngoại lệ</Typography>
                        <Typography variant="body2" color="text.secondary">Quá hạn theo thời điểm API; gồm việc bị chặn, chưa nhận, đến hạn hoặc sai lệch thanh toán. Chỉ lọc trang dữ liệu hiện đang tải.</Typography>
                    </Box>
                    <Button variant={exceptionsOnly ? 'contained' : 'outlined'} aria-pressed={exceptionsOnly} onClick={() => setExceptionsOnly(value => !value)}>
                        {exceptionsOnly ? `Hiện mọi công việc (${workItems.length})` : `Chỉ xem ngoại lệ (${exceptionItems.length})`}
                    </Button>
                </Stack>
                {exceptionsOnly && exceptionItems.length === 0 && <Alert severity="success">Không có ngoại lệ trong trang dữ liệu hiện tại.</Alert>}
            </SurfaceContent>
            <Toolbar operation="listWorkItems" />
            <QueryState query={list} pendingProfile="section">
                {list.data && <>
                    <DataTable rows={visibleItems} rowKey={task => task.id} columns={[
                        {
                            key: 'task', label: 'Công việc', render: task => <Stack>
                                <Typography fontWeight={visualSx.typography.fontWeight.strong}>{task.kind === 'prepare_order' ? 'Chuẩn bị đơn hàng' : task.kind === 'customer_handoff' ? 'Tiếp quản khách hàng' : task.kind === 'payment_mismatch' ? 'Sai lệch thanh toán' : task.kind === 'late_shipment' ? 'Vận đơn quá hạn' : task.kind}</Typography>
                                <Typography variant="caption" color="text.secondary">{task.source.type} · {task.source.id}</Typography>
                            </Stack>,
                        },
                        { key: 'status', label: 'Trạng thái', render: task => <Status value={task.state} /> },
                        { key: 'assigned', label: 'Người nhận', render: task => task.assigneeUserId === session.user.id ? 'Bạn' : task.assigneeUserId || 'Chưa có' },
                        { key: 'due', label: 'Hạn xử lý', render: task => task.dueAt ? dateTime(task.dueAt, shop.timezone) : 'Chưa đặt lịch' },
                        { key: 'reason', label: 'Vướng mắc', render: task => task.blockedReason || '—' },
                        {
                            key: 'actions', label: '', render: task => {
                                const updateActions = task.allowedActions.filter(candidate => workItemActions.includes(candidate as WorkItemAction));
                                return <ActionGroup direction="row" >
                                    <MutationButton permission="operations.claim" allowedActions={task.allowedActions} action="claim" busy={claim.pending} onClick={() => void claim.execute({ path: { resourceId: task.id }, body: { expectedVersion: task.version } }).catch(() => undefined)}>Tôi nhận việc</MutationButton>
                                    {task.kind === 'prepare_order' && <RouteLink to={`/s/${shop.id}/fulfillment`}>Chuẩn bị hàng</RouteLink>}
                                    {task.kind !== 'prepare_order' && updateActions.length > 0 && <MutationButton permission="operations.manage" onClick={() => {
                                        setItem(task);
                                        setReason('');
                                        setAssignee('');
                                        setAction(updateActions[0] as WorkItemAction);
                                        update.clearError();
                                    }}>Cập nhật</MutationButton>}
                                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>Được phép: {task.allowedActions.length ? task.allowedActions.join(' · ') : 'Không có hành động'}</Typography>
                                </ActionGroup>;
                            },
                        },
                    ]} />
                    <Pager page={list.data.page} />
                </>}
            </QueryState>
        </Panel>
        <EditDialog open={!!item} title="Cập nhật công việc" onClose={() => setItem(null)} busy={update.pending} actions={<Button variant="contained" disabled={!item || !availableActions.includes(action) || codePointLength(reason.trim()) < 5 || (action === 'reassign' && !assignee) || update.pending} onClick={async () => {
            if (!item || !availableActions.includes(action)) return;
            try {
                await update.execute({ path: { resourceId: item.id }, body: { expectedVersion: item.version, action, reason, ...(action === 'reassign' ? { assigneeUserId: assignee || null } : {}) } });
                setItem(null);
            }
            catch { /* error stays visible */ }
        }}>Lưu kết quả</Button>}>
            <ErrorNotice error={update.error} />
            <FormFields >
                <Typography>{item?.source.id}</Typography>
                {availableActions.length > 0 && <TextField label="Hành động được phép" select value={availableActions.includes(action) ? action : availableActions[0]} onChange={event => setAction(event.target.value as WorkItemAction)}>
                    {availableActions.map(value => <MenuItem key={value} value={value}>{value === 'begin' ? 'Bắt đầu xử lý' : value === 'complete' ? 'Hoàn thành' : value === 'block' ? 'Báo đang bị chặn' : 'Chuyển người phụ trách'}</MenuItem>)}
                </TextField>}
                {action === 'reassign' && <>
                    <TextField label="Tìm thành viên đang hoạt động" value={memberSearchInput} onChange={event => setMemberSearchInput(event.target.value)} disabled={!canManageMembers} helperText="Tìm kiếm dùng q của listMembers; trang tiếp dùng cursor." />
                    <TextField select label="Người phụ trách" value={assignee} onChange={event => setAssignee(event.target.value)} disabled={!canManageMembers || (members.isPending && !members.data)}>
                        {assignee && !members.data?.data.some(member => member.userId === assignee) && <MenuItem value={assignee}>{assignee}</MenuItem>}
                        {members.data?.data.filter(member => member.status === 'active').map(member => <MenuItem key={member.id} value={member.userId}>{member.userId}</MenuItem>)}
                    </TextField>
                    <LookupLoadMore label="thành viên" loadedCount={members.loadedCount} hasMore={members.hasMore} busy={members.isLoadingMore} onLoadMore={members.loadMore}/>
                    {members.isError && <SurfaceContent ><ErrorNotice error={members.error}/><Button size="small" onClick={() => { void (members.isFetchNextPageError ? members.loadMore() : members.refetch()); }}>Thử lại danh sách thành viên</Button></SurfaceContent>}
                </>}
                <TextField label="Kết quả / lý do" multiline minRows={3} value={reason} onChange={event => setReason(event.target.value)} />
            </FormFields>
        </EditDialog>
    </>;
}

export function ApprovalsPage() {
    const { shop } = useScope();
    const list = useApi('listApprovals', { query: useListQuery('listApprovals') });
    const [delegateRole, setDelegateRole] = useState('warehouse_buyer');
    const [delegateLimit, setDelegateLimit] = useState('300000');
    const [delegationPreview, setDelegationPreview] = useState(false);
    const [approvalId, setApprovalId] = useState<string | null>(null);
    const detail = useApi('getApproval', { path: { resourceId: approvalId || '' } }, Boolean(approvalId));
    const decide = useCommand('decideApproval', ['getApproval', 'listApprovals', 'listPurchaseOrders', 'getOperationsSummary']);
    const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
    const [reason, setReason] = useState('');
    const approval = detail.data?.data;
    const simulatedNow = detail.data?.meta.asOf;
    const expiryVerified = Boolean(simulatedNow);
    const expired = approval ? !simulatedNow || Date.parse(approval.expiresAt) <= Date.parse(simulatedNow) : true;

    return <>
        <PageHeader title="Cần phê duyệt" subtitle="Quyết định gắn với đúng nội dung, phiên bản và hạn hiệu lực — không phải một nút đồng ý chung." />
        <PageSections>
            <Panel title="Xem thử ủy quyền" subtitle="Bản xem trước cục bộ để nghiệm thu giao diện; không cấp quyền hiệu lực." bodyMode="inset">
                <Alert severity="info" sx={layoutSx.notice.afterGap}>Contract hiện chưa có thao tác tạo quy tắc ủy quyền. Hạn mức và phạm vi bên dưới chỉ là dữ liệu mẫu, không thay đổi người duyệt hoặc quyền quyết định.</Alert>
                <FormFields direction={{ xs: 'column', sm: 'row' }}>
                    <TextField select label="Vai trò được ủy quyền" value={delegateRole} onChange={event => { setDelegateRole(event.target.value); setDelegationPreview(false); }} fullWidth>
                        <MenuItem value="warehouse_buyer">Kho & mua hàng</MenuItem>
                        <MenuItem value="accountant">Kế toán</MenuItem>
                        <MenuItem value="supervisor">Trưởng nhóm</MenuItem>
                    </TextField>
                    <TextField label="Hạn mức mẫu (VND)" type="number" value={delegateLimit} onChange={event => { setDelegateLimit(event.target.value); setDelegationPreview(false); }} inputProps={{ min: 1 }} fullWidth />
                </FormFields>
                <ActionGroup direction="column" beforeGap="form">
                    <Button variant="outlined" disabled={!delegateLimit || Number(delegateLimit) < 1} onClick={() => setDelegationPreview(true)}>Tạo bản xem thử</Button>
                </ActionGroup>
                {delegationPreview && <SurfaceContent role="status" data-testid="delegation-preview" beforeGap="surface">
                    <Typography variant="body2">Ủy quyền mô phỏng: {roleNames[delegateRole as AgentRole['kind']] || delegateRole} · tối đa {Number(delegateLimit).toLocaleString('vi-VN')} VND.</Typography>
                    <Typography variant="caption" color="text.secondary">Không ghi API, không nâng scope và không cho phép người nhận tự duyệt quyết định của mình.</Typography>
                </SurfaceContent>}
            </Panel>
            <Panel>
            <Toolbar operation="listApprovals" />
            <QueryState query={list} pendingProfile="section">
                {list.data && <>
                    <DataTable rows={list.data.data} rowKey={entry => entry.id} columns={[
                        { key: 'action', label: 'Nội dung', render: entry => <Stack><Typography fontWeight={visualSx.typography.fontWeight.strong}>{entry.action}</Typography><Typography variant="caption">{entry.resource.type} · {entry.resource.id}</Typography></Stack> },
                        { key: 'amount', label: 'Số tiền', render: entry => <Amount value={entry.amount} /> },
                        { key: 'state', label: 'Trạng thái', render: entry => <Status value={entry.status} /> },
                        { key: 'due', label: 'Hết hạn', render: entry => dateTime(entry.expiresAt, shop.timezone) },
                        {
                            key: 'actions', label: '', render: entry => <MutationButton permission="approvals.decide" disabled={entry.status !== 'pending'} onClick={() => {
                                setApprovalId(entry.id);
                                setReason('');
                                setDecision('approve');
                                decide.clearError();
                            }}>Xem & quyết định</MutationButton>,
                        },
                    ]} />
                    <Pager page={list.data.page} />
                </>}
            </QueryState>
            </Panel>
        </PageSections>
        <EditDialog open={Boolean(approvalId)} title="Xem xét phê duyệt" onClose={() => setApprovalId(null)} busy={decide.pending} actions={<MutationButton permission="approvals.decide" variant="contained" busy={decide.pending} disabled={!approval || detail.isPending || approval.status !== 'pending' || expired || codePointLength(reason.trim()) < 5} onClick={async () => {
            if (!approval || approval.status !== 'pending' || expired) return;
            try {
                await decide.execute({ path: { resourceId: approval.id }, body: { expectedVersion: approval.version, intentHash: approval.intentHash, decision, reason } });
                setApprovalId(null);
            }
            catch { /* keep reason and current approval details visible */ }
        }}>{decision === 'approve' ? 'Duyệt đúng nội dung này' : 'Từ chối'}</MutationButton>}>
            <ErrorNotice error={decide.error} />
            <QueryState query={detail}>
                {approval && <FormFields >
                    <Alert severity="warning">Thay đổi giá, số lượng, đối tượng hoặc quyền có thể làm phê duyệt hết hiệu lực. Im lặng không được coi là đồng ý.</Alert>
                    {!expiryVerified && <Alert severity="error">Không xác minh được thời điểm hiện tại từ API; không thể gửi quyết định an toàn.</Alert>}
                    {expired && <Alert severity="error">Phê duyệt đã hết hạn; cần xin phê duyệt mới trước khi tiếp tục.</Alert>}
                    {approval.status !== 'pending' && <Alert severity="info">Phê duyệt hiện ở trạng thái “{approval.status}”; không thể quyết định lại.</Alert>}
                    <DetailLine label="Hành động">{approval.action}</DetailLine>
                    <DetailLine label="Đối tượng">{approval.resource.type} · {approval.resource.id} · phiên bản {approval.resourceVersion}</DetailLine>
                    <DetailLine label="Chính sách">{approval.policyVersion}</DetailLine>
                    <DetailLine label="Người yêu cầu">{approval.requestedBy}</DetailLine>
                    <DetailLine label="Giá trị"><Amount wrap value={approval.amount} /></DetailLine>
                    <DetailLine label="Hạn hiệu lực">{dateTime(approval.expiresAt, shop.timezone)}</DetailLine>
                    {approval.decidedBy && <DetailLine label="Người quyết định">{approval.decidedBy}</DetailLine>}
                    {approval.decisionReason && <DetailLine label="Lý do đã ghi nhận">{approval.decisionReason}</DetailLine>}
                    <Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>Hash nội dung: {approval.intentHash}</Typography>
                    <TextField label="Quyết định" select value={decision} onChange={event => setDecision(event.target.value as typeof decision)} disabled={approval.status !== 'pending' || expired}>
                        <MenuItem value="approve">Duyệt</MenuItem>
                        <MenuItem value="reject">Từ chối</MenuItem>
                    </TextField>
                    <TextField label="Lý do quyết định" multiline minRows={3} value={reason} onChange={event => setReason(event.target.value)} disabled={approval.status !== 'pending' || expired} />
                </FormFields>}
            </QueryState>
        </EditDialog>
    </>;
}

export function DigestsPage() {
    const { shop } = useScope();
    const list = useApi('listDigests', { query: useListQuery('listDigests') });
    const health = useApi('getOperationsSummary');
    const control = useCommand('controlAutomation', ['listAgentRoles', 'getBotConfig', 'getOperationsSummary']);
    const [stop, setStop] = useState<{ role: AgentRole; action: 'pause' | 'resume' } | null>(null);

    return <>
        <PageHeader title="Bản tin & sức khỏe hệ thống" subtitle="Những việc quan trọng cần chủ shop quyết định; không thay thế người trực thực tế." />
        <Alert severity="info" sx={layoutSx.notice.afterGap}>Đây là dữ liệu mô phỏng. Trạng thái “chưa xác minh” không chứng minh backend, provider hoặc worker đã sẵn sàng.</Alert>
        <SectionGrid columns={{ xs: '1fr', lg: '1.5fr 1fr' }}>
            <Panel title="Bản tin điều hành" bodyMode="inset">
                <QueryState query={list}>
                    <SurfaceContent >
                        {list.data?.data.map(digest => <Box key={digest.id} sx={[layoutSx.detail.relatedItemInset, { border: 1, borderColor: 'divider', borderRadius: visualSx.radius.dialog }]}>
                            <Stack direction="row" justifyContent="space-between" sx={layoutSx.surface.headerFlowGap}><Stack><Typography variant="subtitle2">{dateTime(digest.periodStart, shop.timezone)} → {dateTime(digest.periodEnd, shop.timezone)}</Typography><Typography variant="caption" color="text.secondary">{digest.id} · phiên bản {digest.version}</Typography></Stack><Status value={digest.status} /></Stack>
                            <Typography sx={[layoutSx.surface.sectionBefore, { whiteSpace: 'pre-wrap' }]}>{digest.text}</Typography>
                            <DetailLine label="Thời điểm tạo / cập nhật">{dateTime(digest.createdAt, shop.timezone)} / {dateTime(digest.updatedAt, shop.timezone)}</DetailLine>
                            <DetailLine label="Nguồn công việc">{digest.workItemIds.length ? digest.workItemIds.join(' · ') : 'Không có mục công việc được tham chiếu'}</DetailLine>
                        </Box>)}
                        <Pager page={list.data?.page} />
                    </SurfaceContent>
                </QueryState>
            </Panel>
            <Panel title="Trạng thái phụ thuộc" bodyMode="inset">
                <QueryState query={health}>
                    <Stack>
                        {health.data?.data.health.map(check => <Box key={check.component} sx={layoutSx.page.sectionAfter}>
                            <Stack direction="row" justifyContent="space-between"><Typography>{check.component}</Typography><Status value={check.status} /></Stack>
                            <Typography variant="body2" color="text.secondary" sx={layoutSx.detail.relatedContentGap}>{check.reason || 'Không có ghi chú'}</Typography>
                            <Typography variant="caption">{check.checkedAt ? dateTime(check.checkedAt, shop.timezone) : 'Chưa kiểm tra thực tế'}</Typography>
                        </Box>)}
                    </Stack>
                </QueryState>
                <Alert severity="info" sx={layoutSx.surface.sectionBefore}>Chỉ hiển thị lịch sử bản tin theo hợp đồng hiện hành. Chưa có API tạo/sửa lịch bản tin; không dựng nút lưu lịch giả.</Alert>
            </Panel>
        </SectionGrid>
        <Panel title="Phục hồi & sẵn sàng triển khai" subtitle="Bảng kiểm hiển thị rõ những điều chưa được xác minh trong bản frontend demo." beforeGap={"section"} bodyMode="inset">
            <SurfaceContent  data-testid="readiness-preview">
                <Alert severity="warning">Chưa có nguồn readiness/restore trong API hiện hành. Các mục bên dưới giữ trạng thái chưa xác minh và không thể cấp tín hiệu cho phép phát hành.</Alert>
                {[
                    ['Diễn tập khôi phục bản sao lưu', 'Chưa xác minh'],
                    ['Kiểm tra freshness của artifact và revision', 'Chưa xác minh'],
                    ['Gates triển khai và kết quả CI', 'Chưa xác minh'],
                    ['Môi trường/provider sau khi khôi phục', 'Chưa xác minh'],
                ].map(([criterion, status]) => <Box key={criterion} sx={[layoutSx.detail.valueGap, layoutSx.detail.rowInsetBlock, { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', borderBottom: 1, borderColor: 'divider' }]}>
                    <Typography>{criterion}</Typography>
                    <Typography color="warning.main">{status}</Typography>
                </Box>)}
                <Typography variant="caption" color="text.secondary">Có bản sao lưu không chứng minh đã khôi phục thành công. Không có nút “sẵn sàng” trong chế độ mô phỏng.</Typography>
            </SurfaceContent>
        </Panel>
        <Panel title="Quyền dừng vai trò AI" subtitle="Lệnh được mô phỏng theo version của từng vai trò; tiếp tục không đồng nghĩa hệ thống đã sẵn sàng." beforeGap={"section"} bodyMode="inset">
            <QueryState query={health}>
                <Stack sx={layoutSx.detail.relatedItemGap}>
                    {health.data?.data.roles.map(role => <Box key={role.id} sx={[layoutSx.detail.valueGap, layoutSx.detail.rowInsetBlock, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', borderBottom: 1, borderColor: 'divider' }]}>
                        <Stack><Typography fontWeight={visualSx.typography.fontWeight.semibold}>{roleNames[role.kind]}</Typography><Typography variant="caption" color="text.secondary">Thế hệ {role.generation} · {role.status === 'paused' ? 'Đang tạm dừng' : role.status === 'not_configured' ? 'Chưa cấu hình' : role.status}</Typography></Stack>
                        <MutationButton permission="bot.pause" color={role.status === 'paused' ? 'primary' : 'error'} onClick={() => setStop({ role, action: role.status === 'paused' ? 'resume' : 'pause' })}>{role.status === 'paused' ? 'Kiểm tra điều kiện tiếp tục' : 'Tạm dừng vai trò'}</MutationButton>
                    </Box>)}
                </Stack>
            </QueryState>
            <ErrorNotice error={control.error} />
        </Panel>
        <ConfirmDialog open={Boolean(stop)} title={stop?.action === 'pause' ? 'Tạm dừng vai trò AI' : 'Kiểm tra điều kiện tiếp tục'} description="Lệnh sử dụng đúng version và tăng generation theo mô phỏng. Đây không phải bằng chứng worker đã dừng hoặc provider đã sẵn sàng; tác động bên ngoài đã được nhận không thể thu hồi." requireReason onClose={() => setStop(null)} error={control.error} busy={control.pending} onConfirm={reason => control.execute({ body: { expectedVersion: stop?.role.version || 1, scope: 'role', resourceId: stop?.role.id || null, action: stop?.action || 'pause', reason } })} />
    </>;
}
