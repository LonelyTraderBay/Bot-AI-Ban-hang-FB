import { label as businessLabel } from '@/shared/model/labels';
import { ActionGroup, FormFields, SectionGrid, SurfaceContent } from '../../shared/ui/composition';
import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { visualSx } from '@/shared/ui/visual';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { layoutSx } from '../../shared/ui/layout';
import type { AgentRole, DigestWorkSummary, HealthCheck, WorkItem } from '@botsales/contracts';
import { useApi, usePagedApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { codePointLength, dateTime } from '@/shared/model/format';
import { PageHeader, Panel, Stats, Stat, DataTable, Empty, QueryState, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, RouteLink, DetailLine, ConfirmDialog, LookupLoadMore } from '@/shared/ui/components';
import { roleNames } from './role-labels';
import { ApprovalsPage as ApprovalsView } from './approvals';
import { CommandDetails, commandNames } from './command-details';
export { ExceptionsPage } from './exceptions';
const workItemActions = ['begin', 'complete', 'block', 'reassign'] as const;
type WorkItemAction = typeof workItemActions[number];
function CommandsPanel() {
    const { shop } = useScope();
    const [params] = useSearchParams();
    const list = useApi('listCommands', { query: { limit: 10, cursor: params.get('commandCursor') || undefined } });
    const [commandId, setCommandId] = useState('');
    return <Panel title="Trạng thái thao tác" beforeGap="section">
        <SurfaceContent bodyMode="inset"><Typography color="text.secondary">Trạng thái do API trả về. Kết quả chưa rõ cần kiểm tra riêng; xem lịch sử không mở khóa thao tác đang chờ đối soát.</Typography></SurfaceContent>
        <QueryState query={list} pendingProfile="section">{list.data && <>
            <DataTable mobile={{ layout: 'cards', titleKey: 'kind', summaryKeys: ['status', 'updated'], actionKey: 'detail' }} label="Trạng thái thao tác" rows={list.data.data} rowKey={command => command.id} empty="Chưa có thao tác được phép xem trong trang này." columns={[
                { key: 'kind', label: 'Thao tác', render: command => commandNames[command.kind] || 'Thao tác khác' },
                { key: 'status', label: 'Trạng thái', render: command => <Status value={command.status}/> },
                { key: 'updated', label: 'Cập nhật', render: command => dateTime(command.updatedAt, shop.timezone) },
                { key: 'detail', label: 'Thao tác', render: command => <Button onClick={() => setCommandId(command.id)}>Chi tiết thao tác</Button> },
            ]}/><Pager page={list.data.page} cursorParam="commandCursor"/>
        </>}</QueryState>
        {commandId && <CommandDetails commandId={commandId} close={() => setCommandId('')} />}
    </Panel>;
}

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
    const canReadCommands = useCan('jobs.read');
    const canClaimWork = useCan('operations.claim');
    const canManageWork = useCan('operations.manage');
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
    const rowActions = (task: WorkItem) => {
        const updateActions = task.allowedActions.filter(candidate => workItemActions.includes(candidate as WorkItemAction));
        const take = canClaimWork && task.allowedActions.includes('claim') ? <MutationButton permission="operations.claim"
            allowedActions={task.allowedActions} action="claim" busy={claim.pending}
            onClick={() => void claim.execute({ path: { resourceId: task.id }, body: { expectedVersion: task.version } }).catch(() => undefined)}>
            Tôi nhận việc
        </MutationButton> : null;
        const prepare = task.kind === 'prepare_order' ? <RouteLink to={`/s/${shop.id}/fulfillment`}>Chuẩn bị hàng</RouteLink> : null;
        const manage = task.kind !== 'prepare_order' && canManageWork && updateActions.length > 0 ? <MutationButton permission="operations.manage"
            onClick={() => {
                setItem(task);
                setReason('');
                setAssignee('');
                setAction(updateActions[0] as WorkItemAction);
                update.clearError();
            }}>Cập nhật</MutationButton> : null;
        const allowed = <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
            Được phép: {task.allowedActions.length ? task.allowedActions.join(' · ') : 'Không có hành động'}
        </Typography>;
        return { take, prepare, manage, allowed };
    };

    return <>
        <PageHeader title="Công việc hôm nay" subtitle="Giao việc → nhận việc → hoàn thành → kiểm tra kết quả."
            actions={<RouteLink to={`/s/${shop.id}/operations/exceptions`}>Ngoại lệ và tác vụ nền</RouteLink>} />
        {__MOCK__ && <Alert severity="info" sx={layoutSx.notice.afterGap}>Dữ liệu vận hành và trạng thái dịch vụ đang được mô phỏng; chưa xác minh worker hoặc backend thật.</Alert>}
        <QueryState query={summary} pendingProfile="section">
            {summary.data && <Stats density="compact" appearance="strip">
                <Stat title="Chưa có người nhận" value={summary.data.data.queuedTasks} accent />
                <Stat title="Quá hạn" value={summary.data.data.overdueTasks} />
                <Stat title="Chờ phê duyệt" value={summary.data.data.pendingApprovals} />
                <Stat title="Kết quả chưa rõ" value={summary.data.data.unknownCommands} />
            </Stats>}
        </QueryState>
        <ErrorNotice error={claim.error} />
        <Panel>
            <Toolbar operation="listWorkItems" />
            <SurfaceContent bodyMode="insetDivider" data-testid="operation-exceptions">
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={layoutSx.surface.headerFlowGap}>
                    <Box>
                        <Typography fontWeight={visualSx.typography.fontWeight.strong}>Giám sát ngoại lệ</Typography>
                        <Typography variant="body2" color="text.secondary">Lọc việc bị chặn, chưa nhận, quá hạn hoặc sai lệch thanh toán trong trang hiện tại.</Typography>
                    </Box>
                    <Button variant={exceptionsOnly ? 'contained' : 'outlined'} aria-pressed={exceptionsOnly} onClick={() => setExceptionsOnly(value => !value)}>
                        {exceptionsOnly ? `Hiện mọi công việc (${workItems.length})` : `Chỉ xem ngoại lệ (${exceptionItems.length})`}
                    </Button>
                </Stack>
                {exceptionsOnly && exceptionItems.length === 0 && <Alert severity="success">Không có ngoại lệ trong trang dữ liệu hiện tại.</Alert>}
            </SurfaceContent>
            <QueryState query={list} pendingProfile="section">
                {list.data && <>
                    <DataTable mobile={{ layout: 'cards', titleKey: 'task', statusKey: 'status', summaryKeys: ['assigned', 'due'], actionKey: 'actions',
                        splitActions: task => {
                            const { take, prepare, manage, allowed } = rowActions(task);
                            const primary = take ?? prepare ?? manage;
                            return { primary, secondary: <ActionGroup>
                                {prepare !== primary && prepare}{manage !== primary && manage}{allowed}
                            </ActionGroup> };
                        },
                    }} label="Công việc vận hành" rows={visibleItems} rowKey={task => task.id} columns={[
                        {
                            key: 'task', label: 'Công việc', render: task => <Stack>
                                <Typography fontWeight={visualSx.typography.fontWeight.strong}>{task.kind === 'prepare_order' ? 'Chuẩn bị đơn hàng' : task.kind === 'customer_handoff' ? 'Tiếp quản khách hàng' : task.kind === 'payment_mismatch' ? 'Sai lệch thanh toán' : task.kind === 'late_shipment' ? 'Vận đơn quá hạn' : businessLabel(task.kind)}</Typography>
                                <Typography variant="caption" color="text.secondary">{task.source.type} · {task.source.id}</Typography>
                            </Stack>,
                        },
                        { key: 'status', label: 'Trạng thái', render: task => <Status value={task.state} /> },
                        { key: 'assigned', label: 'Người nhận', render: task => task.assigneeUserId === session.user.id ? 'Bạn' : task.assigneeUserId || 'Chưa có' },
                        { key: 'due', label: 'Hạn xử lý', render: task => task.dueAt ? dateTime(task.dueAt, shop.timezone) : 'Chưa đặt lịch' },
                        { key: 'reason', label: 'Vướng mắc', render: task => task.blockedReason || '—' },
                        {
                            key: 'actions', label: 'Thao tác', render: task => {
                                const { take, prepare, manage, allowed } = rowActions(task);
                                return <ActionGroup direction="row">{take}{prepare}{manage}{allowed}</ActionGroup>;
                            },
                        },
                    ]} />
                    <Pager page={list.data.page} />
                </>}
            </QueryState>
        </Panel>
        <Panel title="Trạng thái phụ thuộc" beforeGap="section" bodyMode="inset">
            <QueryState query={summary}>
                {summary.data && <HealthChecks checks={summary.data.data.health} />}
            </QueryState>
        </Panel>
        {canReadCommands && <CommandsPanel/>}
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

export function ApprovalsPage() { return <ApprovalsView />; }

const runbooks = {
    database: { title: 'PostgreSQL', steps: 'Kiểm tra kết nối và readiness từ môi trường chạy API. Đối chiếu sự cố với các phép kiểm PostgreSQL và Redis trước khi thử lại thao tác.' },
    worker: { title: 'Worker và hàng đợi', steps: 'Kiểm tra worker, Redis và hàng đợi bền vững. Mở trang ngoại lệ để đối chiếu tác vụ thất bại hoặc chưa rõ trước khi chạy lại.' },
    messenger: { title: 'Messenger', steps: 'Đối chiếu phạm vi trang, webhook có chữ ký và nhật ký tiếp nhận. Kiểm tra riêng quyền gửi và biên nhận nếu lỗi xảy ra khi trả lời.' },
    ai: { title: 'Kết nối AI', steps: 'Mở kết nối AI, kiểm tra quyền truy cập đúng model và đối chiếu kết quả lần kiểm gần nhất. Dùng mã lần chạy để tra cứu phản hồi chưa rõ.' },
    notifications: { title: 'Web Push và Telegram', steps: 'Mở thiết bị thông báo, xác nhận quyền và liên kết của thiết bị rồi chạy phép gửi thử. Kiểm tra đã nhận trên thiết bị trước khi xử lý fallback.' },
    budgets: { title: 'Hạn mức vận hành', steps: 'Đối chiếu hạn mức đã duyệt, số đã dùng và số dự trù theo kỳ. Kiểm tra yêu cầu đang chờ đối soát trước khi xin đổi hạn mức.' },
} satisfies Record<NonNullable<HealthCheck['runbook']>, { title: string; steps: string }>;

function HealthChecks({ checks }: { checks: readonly HealthCheck[] }) {
    const { shop } = useScope();
    const [, setClock] = useState(0);
    const currentTime = Date.now();
    useEffect(() => {
        const expiries = checks.map(check => Date.parse(check.expiresAt ?? '')).filter(expires => expires > currentTime);
        if (!expiries.length) return;
        const timer = window.setTimeout(() => setClock(Date.now()), Math.max(1, Math.min(...expiries) - Date.now()));
        return () => window.clearTimeout(timer);
    }, [checks, currentTime]);
    return <Box role="region" aria-label="Trạng thái phụ thuộc">
        <SurfaceContent>
            {checks.map(check => {
                const label = check.label ?? check.component;
                const expired = check.status !== 'unknown' && (!check.checkedAt || !check.expiresAt ||
                    Date.parse(check.checkedAt) > currentTime || Date.parse(check.expiresAt) <= currentTime);
                const status = expired ? 'unknown' : check.status;
                const reason = expired ? 'Cần kiểm tra lại để xác nhận trạng thái hiện tại.' : check.reason;
                return <Box key={check.component}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={layoutSx.surface.headerFlowGap}>
                        <Typography sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>{label}</Typography><Status value={status} />
                    </Stack>
                    {reason && <Typography variant="body2" color="text.secondary" sx={layoutSx.detail.relatedContentGap}>{reason}</Typography>}
                    <Typography variant="caption" component="div">{check.checkedAt ? dateTime(check.checkedAt, shop.timezone) : 'Chưa kiểm tra thực tế'}</Typography>
                    {check.expiresAt && <Typography variant="caption" component="div">Hết hiệu lực {dateTime(check.expiresAt, shop.timezone)}</Typography>}
                    {check.lagMs !== undefined && <Typography variant="caption" component="div">Chờ {Math.ceil(check.lagMs / 1000)} giây</Typography>}
                    {check.runbook && status !== 'healthy' && <RouteLink to={`/s/${shop.id}/operations/digests#runbook-${check.runbook}`}>Hướng dẫn xử lý {label}</RouteLink>}
                </Box>;
            })}
        </SurfaceContent>
    </Box>;
}

function WorkItemSources({ shopId, ids }: { shopId: string; ids: readonly string[] }) {
    return ids.length
        ? <ActionGroup direction="row">{ids.map(id => <RouteLink key={id} to={`/s/${shopId}/operations?q=${encodeURIComponent(id)}`}>{id}</RouteLink>)}</ActionGroup>
        : 'Không có mục công việc được tham chiếu';
}

const digestGroups = { pending: 'đang chờ xử lý', blocked: 'đang bị chặn', completed: 'đã hoàn tất' } as const;

function DigestSources({ summary }: { summary: DigestWorkSummary }) {
    const { shop } = useScope();
    return <SurfaceContent rhythm="dividedRows">
        {summary.coverage === 'partial' && <Alert severity="warning">Lịch sử công việc của kỳ này còn thiếu.</Alert>}
        {(Object.keys(digestGroups) as Array<keyof typeof digestGroups>).map(group => {
            const { count, workItemIds } = summary[group];
            const label = `${count} công việc ${digestGroups[group]}`;
            return workItemIds.length ? <Box component="details" key={group} sx={layoutSx.detail.rowInsetBlock}>
                <Typography component="summary" sx={{ cursor: 'pointer' }}>{label}</Typography>
                {count > workItemIds.length && <Typography variant="caption">Có liên kết cho {workItemIds.length} công việc gần nhất.</Typography>}
                <WorkItemSources shopId={shop.id} ids={workItemIds} />
            </Box> : <Typography component="div" key={group} sx={layoutSx.detail.rowInsetBlock}>{label}</Typography>;
        })}
    </SurfaceContent>;
}
export function DigestsPage() {
    const { shop } = useScope();
    const { hash } = useLocation();
    const canReadEvaluations = useCan('bot.read');
    const list = useApi('listDigests', { query: useListQuery('listDigests') });
    const health = useApi('getOperationsSummary');
    const control = useCommand('controlAutomation', ['listAgentRoles', 'getBotConfig', 'getOperationsSummary']);
    const [stop, setStop] = useState<{ role: AgentRole; action: 'pause' | 'resume' } | null>(null);

    useEffect(() => {
        if (!hash.startsWith('#runbook-')) return;
        const section = document.getElementById(hash.slice(1));
        section?.scrollIntoView();
        section?.focus({ preventScroll: true });
    }, [hash]);
    return <>
        <PageHeader title="Bản tin & sức khỏe" subtitle="Những việc quan trọng cần chủ shop quyết định; không thay thế người trực thực tế."
            actions={canReadEvaluations && <RouteLink to={`/s/${shop.id}/bot/evaluations`}>Đánh giá chất lượng AI</RouteLink>} />
        {__MOCK__ && <Alert severity="info" sx={layoutSx.notice.afterGap}>Đây là dữ liệu mô phỏng. Trạng thái “chưa xác minh” không chứng minh backend, provider hoặc worker đã sẵn sàng.</Alert>}
        <SectionGrid alignItems="start" columns={{ xs: '1fr', lg: '1.5fr 1fr' }}>
            <Panel title="Bản tin điều hành" bodyMode="inset">
                <QueryState query={list}>
                    <SurfaceContent >
                        {list.data?.data.map(digest => <Box key={digest.id} sx={[layoutSx.detail.relatedItemInset, { border: 1, borderColor: 'divider', borderRadius: visualSx.radius.card }]}>
                            <Stack direction="row" justifyContent="space-between" sx={layoutSx.surface.headerFlowGap}><Stack><Typography component="div" variant="subtitle2">{dateTime(digest.periodStart, shop.timezone)} → {dateTime(digest.periodEnd, shop.timezone)}</Typography><Typography variant="caption" color="text.secondary">{digest.id} · phiên bản {digest.version}</Typography></Stack><Status value={digest.status} density="compact" /></Stack>
                            <Typography sx={[layoutSx.surface.sectionBefore, { whiteSpace: 'pre-wrap' }]}>{digest.text}</Typography>
                            <DetailLine label="Thời điểm tạo / cập nhật">{dateTime(digest.createdAt, shop.timezone)} / {dateTime(digest.updatedAt, shop.timezone)}</DetailLine>
                            {digest.workSummary
                                ? <DigestSources summary={digest.workSummary} />
                                : <DetailLine label="Nguồn công việc">
                                    <WorkItemSources shopId={shop.id} ids={digest.workItemIds} />
                                </DetailLine>}
                        </Box>)}
                        {list.data?.data.length === 0 && <Empty text="Chưa có bản tin điều hành trong danh sách hiện tại."/>}
                        <Pager page={list.data?.page} />
                    </SurfaceContent>
                </QueryState>
            </Panel>
            <Panel title="Trạng thái phụ thuộc" bodyMode="inset">
                <QueryState query={health}>
                    {health.data && <HealthChecks checks={health.data.data.health} />}
                </QueryState>
                <Alert severity="info" sx={layoutSx.surface.sectionBefore}>Chỉ hiển thị lịch sử bản tin theo hợp đồng hiện hành. Chưa có API tạo/sửa lịch bản tin; không dựng nút lưu lịch giả.</Alert>
            </Panel>
        </SectionGrid>
        <Panel title="Hướng dẫn xử lý sự cố" beforeGap="section" bodyMode="inset">
            <SurfaceContent>
                {Object.entries(runbooks).map(([key, entry]) => <Box key={key} id={'runbook-' + key} tabIndex={-1}>
                    <Typography component="h3" variant="subtitle2">{entry.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{entry.steps}</Typography>
                </Box>)}
            </SurfaceContent>
        </Panel>
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
        <ConfirmDialog open={Boolean(stop)} title={stop?.action === 'pause' ? 'Tạm dừng vai trò AI' : 'Kiểm tra điều kiện tiếp tục'} confirmLabel={stop?.action === "pause" ? "Tạm dừng vai trò" : "Kiểm tra để tiếp tục"} description={`${stop ? roleNames[stop.role.kind] : ""} (${stop?.role.id || ""}) trong ${shop.name}: ${stop?.action === "pause" ? "dừng các tác động chưa được tiếp nhận." : "kiểm điều kiện và chính sách trước khi cho phép tác động mới."} Tác động bên ngoài đã được nhận không thể thu hồi.`} requireReason onClose={() => setStop(null)} error={control.error} busy={control.pending} onConfirm={reason => control.execute({ body: { expectedVersion: stop?.role.version || 1, scope: 'role', resourceId: stop?.role.id || null, action: stop?.action || 'pause', reason } })} />
    </>;
}
