import { label as businessLabel } from '@/shared/model/labels';
import { ActionGroup, FormFields, SectionGrid, SurfaceContent } from '../../shared/ui/composition';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { visualSx } from '@/shared/ui/visual';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { layoutSx } from '../../shared/ui/layout';
import type { AgentRole, WorkItem } from '@botsales/contracts';
import { useApi, usePagedApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { codePointLength, dateTime } from '@/shared/model/format';
import { PageHeader, Panel, Stats, Stat, DataTable, Empty, QueryState, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, RouteLink, DetailLine, ConfirmDialog, LookupLoadMore } from '@/shared/ui/components';
import { roleNames } from './role-labels';
import { ApprovalsPage as ApprovalsView } from './approvals';
const workItemActions = ['begin', 'complete', 'block', 'reassign'] as const;
type WorkItemAction = typeof workItemActions[number];
const commandNames: Record<string, string> = {
    createInventoryAdjustment: 'Điều chỉnh tồn kho', postFinanceEntry: 'Ghi nhận thu chi', postGoodsReceipt: 'Nhận hàng',
    sendPurchaseOrder: 'Gửi đơn mua', refundOrder: 'Hoàn tiền', payOrder: 'Ghi nhận thanh toán', handoverShipment: 'Bàn giao vận đơn', confirmOrder: 'Xác nhận đơn',
};
function CommandsPanel() {
    const { shop } = useScope();
    const [params] = useSearchParams();
    const list = useApi('listCommands', { query: { limit: 10, cursor: params.get('commandCursor') || undefined } });
    const [commandId, setCommandId] = useState('');
    const detail = useApi('getCommand', { path: { commandId } }, Boolean(commandId));
    return <Panel title="Trạng thái thao tác" beforeGap="section">
        <SurfaceContent bodyMode="inset"><Typography color="text.secondary">Trạng thái do API trả về. Kết quả chưa rõ cần kiểm tra riêng; xem lịch sử không mở khóa thao tác đang chờ đối soát.</Typography></SurfaceContent>
        <QueryState query={list} pendingProfile="section">{list.data && <>
            <DataTable label="Trạng thái thao tác" rows={list.data.data} rowKey={command => command.id} empty="Chưa có thao tác được phép xem trong trang này." columns={[
                { key: 'kind', label: 'Thao tác', render: command => commandNames[command.kind] || 'Thao tác khác' },
                { key: 'status', label: 'Trạng thái', render: command => <Status value={command.status}/> },
                { key: 'updated', label: 'Cập nhật', render: command => dateTime(command.updatedAt, shop.timezone) },
                { key: 'detail', label: 'Thao tác', render: command => <Button onClick={() => setCommandId(command.id)}>Chi tiết thao tác</Button> },
            ]}/><Pager page={list.data.page} cursorParam="commandCursor"/>
        </>}</QueryState>
        <EditDialog open={!!commandId} title="Chi tiết trạng thái thao tác" onClose={() => setCommandId('')} actions={<ActionGroup direction="row"><Button disabled={detail.isFetching} onClick={() => void detail.refetch()}>Kiểm tra trạng thái</Button><Button onClick={() => setCommandId('')}>Đóng</Button></ActionGroup>}>
            <QueryState query={detail}>{detail.data && <SurfaceContent>
                <DetailLine label="Mã thao tác">{detail.data.data.id}</DetailLine><DetailLine label="Thao tác">{commandNames[detail.data.data.kind] || 'Thao tác khác'}</DetailLine>
                <DetailLine label="Trạng thái"><Status value={detail.data.data.status}/></DetailLine><DetailLine label="Cập nhật">{dateTime(detail.data.data.updatedAt, shop.timezone)}</DetailLine>
                <DetailLine label="Đối tượng kết quả">{detail.data.data.result ? detail.data.data.result.type + ' · ' + detail.data.data.result.id : 'Chưa có kết quả được xác minh'}</DetailLine>
                {detail.data.data.status === 'unknown' && <Alert severity="warning">Kết quả chưa rõ. Không gửi lại hoặc coi là thất bại chỉ dựa vào thời gian chờ.</Alert>}
                {detail.data.data.problem && <Alert severity="error">Thao tác có lỗi; đối chiếu mã thao tác trong quy trình xử lý được cấp quyền.</Alert>}
            </SurfaceContent>}</QueryState>
        </EditDialog>
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
                    <DataTable label="Công việc vận hành" rows={visibleItems} rowKey={task => task.id} columns={[
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
                        {list.data?.data.map(digest => <Box key={digest.id} sx={[layoutSx.detail.relatedItemInset, { border: 1, borderColor: 'divider', borderRadius: visualSx.radius.card }]}>
                            <Stack direction="row" justifyContent="space-between" sx={layoutSx.surface.headerFlowGap}><Stack><Typography component="div" variant="subtitle2">{dateTime(digest.periodStart, shop.timezone)} → {dateTime(digest.periodEnd, shop.timezone)}</Typography><Typography variant="caption" color="text.secondary">{digest.id} · phiên bản {digest.version}</Typography></Stack><Status value={digest.status} /></Stack>
                            <Typography sx={[layoutSx.surface.sectionBefore, { whiteSpace: 'pre-wrap' }]}>{digest.text}</Typography>
                            <DetailLine label="Thời điểm tạo / cập nhật">{dateTime(digest.createdAt, shop.timezone)} / {dateTime(digest.updatedAt, shop.timezone)}</DetailLine>
                            <DetailLine label="Nguồn công việc">{digest.workItemIds.length ? digest.workItemIds.join(' · ') : 'Không có mục công việc được tham chiếu'}</DetailLine>
                        </Box>)}
                        {list.data?.data.length === 0 && <Empty text="Chưa có bản tin điều hành trong danh sách hiện tại."/>}
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
        <ConfirmDialog open={Boolean(stop)} title={stop?.action === 'pause' ? 'Tạm dừng vai trò AI' : 'Kiểm tra điều kiện tiếp tục'} confirmLabel={stop?.action === "pause" ? "Tạm dừng vai trò" : "Kiểm tra để tiếp tục"} description={`${stop ? roleNames[stop.role.kind] : ""} (${stop?.role.id || ""}) trong ${shop.name}: ${stop?.action === "pause" ? "dừng các tác động chưa được tiếp nhận." : "kiểm điều kiện và chính sách trước khi cho phép tác động mới."} Tác động bên ngoài đã được nhận không thể thu hồi.`} requireReason onClose={() => setStop(null)} error={control.error} busy={control.pending} onConfirm={reason => control.execute({ body: { expectedVersion: stop?.role.version || 1, scope: 'role', resourceId: stop?.role.id || null, action: stop?.action || 'pause', reason } })} />
    </>;
}
