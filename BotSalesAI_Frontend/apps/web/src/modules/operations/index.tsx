import {label as businessLabel} from '@/shared/model/labels';
import { PageSections } from '../../shared/ui/composition';
import { ActionGroup, FormFields, SectionGrid, SurfaceContent } from '../../shared/ui/composition';
import { useEffect, useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { layoutSx } from '../../shared/ui/layout';
import type { AgentRole, BudgetPolicy, PurchaseDelegation, PurchaseDelegationReservation, SupplierOffer, WorkItem } from '@botsales/contracts';
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
            <Panel>
            <Toolbar operation="listApprovals" />
            <QueryState query={list} pendingProfile="section">
                {list.data && <>
                    <DataTable label="Yêu cầu phê duyệt" rows={list.data.data} rowKey={entry => entry.id} columns={[
                        { key: 'action', label: 'Nội dung', render: entry => <Stack><Typography fontWeight={visualSx.typography.fontWeight.strong}>{businessLabel(entry.action)}</Typography><Typography variant="caption">{businessLabel(entry.resource.type)} · {entry.action} · Mã đối tượng: {entry.resource.id}</Typography></Stack> },
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
            <PurchaseDelegationsPanel />
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
                    {approval.status !== 'pending' && <Alert severity="info">Phê duyệt hiện ở trạng thái “{businessLabel(approval.status)}”; không thể quyết định lại.</Alert>}
                    <DetailLine label="Hành động">{businessLabel(approval.action)}</DetailLine>
                    <DetailLine label="Đối tượng">{approval.resource.type} · Mã đối tượng: {approval.resource.id} · phiên bản {approval.resourceVersion}</DetailLine>
                    <DetailLine label="Chính sách">{approval.policyVersion}</DetailLine>
                    <DetailLine label="Người yêu cầu">Mã nhân sự: {approval.requestedBy}</DetailLine>
                    <DetailLine label="Giá trị"><Amount wrap value={approval.amount} /></DetailLine>
                    <DetailLine label="Hạn hiệu lực">{dateTime(approval.expiresAt, shop.timezone)}</DetailLine>
                    {approval.decidedBy && <DetailLine label="Người quyết định">Mã nhân sự: {approval.decidedBy}</DetailLine>}
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

function PurchaseDelegationsPanel() {
    const { shop, session } = useScope();
    const canRead = useCan('procurement.read');
    const canManage = useCan('procurement.delegation.manage');
    const grants = useApi('listPurchaseDelegations', { query: { limit: 20 } }, canRead);
    const reservations = useApi('listPurchaseDelegationReservations', { query: { limit: 20 } }, canManage);
    const agents = usePagedApi('listAgentRoles', {}, canManage);
    const suppliers = usePagedApi('listSuppliers', {}, canManage);
    const warehouses = usePagedApi('listWarehouses', { query: { status: 'active' } }, canManage);
    const offers = usePagedApi('listSupplierOffers', {}, canManage);
    const budgets = usePagedApi('listBudgetPolicies', {}, canManage);
    const budgetApprovals = useApi('listApprovals', { query: { limit: 100 } }, canManage);
    const create = useCommand('createPurchaseDelegation', ['listPurchaseDelegations']);
    const update = useCommand('updatePurchaseDelegation', ['listPurchaseDelegations', 'listPurchaseDelegationReservations', 'listReorderRules', 'listPurchaseSuggestions']);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [agentId, setAgentId] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [offerIds, setOfferIds] = useState<string[]>([]);
    const [budgetId, setBudgetId] = useState('');
    const [maxPerOrder, setMaxPerOrder] = useState('');
    const [expiresAt, setExpiresAt] = useState(() => localDateTimeInput(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const [actionGrant, setActionGrant] = useState<PurchaseDelegation | null>(null);
    const [actionStatus, setActionStatus] = useState<'active' | 'paused' | 'revoked'>('paused');
    const readyAgents = agents.data?.data.filter(agent => agent.kind === 'warehouse_buyer' && agent.humanOwnerId === session.user.id) || [];
    const approvedSuppliers = suppliers.data?.data.filter(supplier => supplier.status === 'approved') || [];
    const eligibleOffers = offers.data?.data.filter(offer => offer.supplierId === supplierId) || [];
    const procurementBudgets = budgets.data?.data.filter((budget: BudgetPolicy) => budget.kind === 'procurement' && budget.enabled && !!budget.limitAmount && !!budget.approvalId && !!budgetApprovals.data?.meta.asOf && budgetApprovals.data.data.some(approval => approval.id === budget.approvalId && approval.status === 'approved' && approval.resource.type === 'budget_policy' && approval.resource.id === budget.id && approval.resourceVersion === budget.version && Date.parse(approval.expiresAt) > Date.parse(budgetApprovals.data?.meta.asOf || '')) ) || [];
    const selectedBudget = procurementBudgets.find(budget => budget.id === budgetId);
    const validAmount = /^\d+$/.test(maxPerOrder) && Number(maxPerOrder) > 0 && !!selectedBudget?.limitAmount && Number(maxPerOrder) <= Number(selectedBudget.limitAmount.amount);
    const expiryValid = Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) > Date.now();
    const canCreate = !!agentId && !!supplierId && !!warehouseId && offerIds.length > 0 && !!selectedBudget && validAmount && expiryValid && !create.pending;
    const openCreate = () => {
        setAgentId(readyAgents[0]?.id || '');
        setSupplierId('');
        setWarehouseId(warehouses.data?.data[0]?.id || '');
        setOfferIds([]);
        setBudgetId(procurementBudgets[0]?.id || '');
        setMaxPerOrder('300000');
        setExpiresAt(localDateTimeInput(Date.now() + 7 * 24 * 60 * 60 * 1000));
        create.clearError();
        setDialogOpen(true);
    };
    const saveGrant = async () => {
        if (!canCreate || !selectedBudget) return;
        try {
            await create.execute({ body: {
                agentId, supplierId, warehouseId, offerIds,
                maxPerOrder: { amount: maxPerOrder, currency: shop.currency },
                budgetPolicyId: budgetId, expiresAt: new Date(expiresAt).toISOString(),
            } });
            setDialogOpen(false);
        }
        catch { /* giữ biểu mẫu và lỗi tại chỗ để người dùng sửa hoặc thử lại */ }
    };
    const grantLabel = (grant: PurchaseDelegation) => {
        const agent = agents.data?.data.find(row => row.id === grant.agentId);
        const supplier = suppliers.data?.data.find(row => row.id === grant.supplierId);
        const warehouse = warehouses.data?.data.find(row => row.id === grant.warehouseId);
        return `${agent?.kind ? roleNames[agent.kind] : `Mã vai trò: ${grant.agentId}`} · ${supplier?.name || `Mã nhà cung cấp: ${grant.supplierId}`} · ${warehouse?.name || `Mã kho: ${grant.warehouseId}`}`;
    };

    if (!canRead) return null;
    return <Panel title="Ủy quyền gửi đơn mua" subtitle="Chỉ owner cấp quyền; mỗi ủy quyền giới hạn theo người phụ trách, nhà cung cấp, kho, báo giá, ngân sách, hạn mức và thời hạn.">
        <Alert severity="info" sx={layoutSx.notice.afterGap}>Đây là worker MSW local xác định. Không gọi AI, nhà cung cấp hoặc thanh toán; trạng thái “đã gửi” chỉ là kết quả mô phỏng.</Alert>
        {canManage && <ActionGroup direction="row" beforeGap="form"><MutationButton permission="procurement.delegation.manage" onClick={openCreate}>Tạo ủy quyền có giới hạn</MutationButton></ActionGroup>}
        <QueryState query={grants} pendingProfile="section">{grants.data && <DataTable label="Ủy quyền gửi đơn mua" rows={grants.data.data} rowKey={grant => grant.id} columns={[
            { key: 'scope', label: 'Phạm vi', render: grant => <Stack><Typography fontWeight={visualSx.typography.fontWeight.strong}>{grantLabel(grant)}</Typography><Typography variant="caption">{grant.offerSnapshots.length} báo giá · tối đa {grant.maxPerOrder.amount} {grant.maxPerOrder.currency} / đơn</Typography><Typography variant="caption">Ngân sách · mã chính sách {grant.budgetPolicyId} · {grant.budgetPeriod} · đến {dateTime(grant.expiresAt, shop.timezone)}</Typography></Stack> },
            { key: 'state', label: 'Trạng thái', render: grant => <Status value={Date.parse(grant.expiresAt) <= Date.now() && grant.status === 'active' ? 'expired' : grant.status}/> },
            { key: 'reason', label: 'Lý do gần nhất', render: grant => grant.lastReason || '—' },
            { key: 'actions', label: '', render: grant => <ActionGroup direction="row">
                {grant.status !== 'revoked' && Date.parse(grant.expiresAt) > Date.now() && <MutationButton permission="procurement.delegation.manage" disabled={update.pending} onClick={() => { setActionGrant(grant); setActionStatus(grant.status === 'active' ? 'paused' : 'active'); }}>{grant.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}</MutationButton>}
                {grant.status !== 'revoked' && <MutationButton permission="procurement.delegation.manage" color="error" disabled={update.pending} onClick={() => { setActionGrant(grant); setActionStatus('revoked'); }}>Thu hồi</MutationButton>}
            </ActionGroup> },
        ]}/>}</QueryState>
        <QueryState query={reservations} pendingProfile="section">{reservations.data && <DataTable label="Lịch sử hạn mức mua tự động" rows={reservations.data.data as PurchaseDelegationReservation[]} rowKey={row => row.id} columns={[
            { key: 'purchase', label: 'Đơn mua', render: row => row.purchaseOrderId },
            { key: 'amount', label: 'Số tiền', render: row => <Amount value={row.amount}/> },
            { key: 'period', label: 'Kỳ ngân sách', render: row => row.periodKey },
            { key: 'status', label: 'Đối chiếu', render: row => <Status value={row.status}/> },
        ]}/>}</QueryState>
        <ErrorNotice error={create.error || update.error}/>
        <EditDialog open={dialogOpen} title="Tạo ủy quyền mua hàng" description="Ủy quyền tạo ở trạng thái tạm dừng. Kích hoạt chỉ khả dụng sau khi vai trò, báo giá và ngân sách được kiểm tra lại." onClose={() => setDialogOpen(false)} busy={create.pending} actions={<Button variant="contained" disabled={!canCreate} onClick={() => void saveGrant()}>Tạo ở trạng thái tạm dừng</Button>}>
            <ErrorNotice error={create.error}/>
            <FormFields>
                <TextField select label="Vai trò mua hàng chịu trách nhiệm" value={agentId} onChange={event => setAgentId(event.target.value)}>{readyAgents.map(agent => <MenuItem key={agent.id} value={agent.id}>{roleNames[agent.kind]} · {agent.id} · {agent.status === 'paused' ? 'đang tạm dừng' : agent.status}</MenuItem>)}</TextField>
                {readyAgents.length === 0 && <Typography role="status">Không có vai trò warehouse_buyer do tài khoản hiện tại phụ trách.</Typography>}
                <TextField select label="Nhà cung cấp đã duyệt" value={supplierId} onChange={event => { setSupplierId(event.target.value); setOfferIds([]); }}>{approvedSuppliers.map(supplier => <MenuItem key={supplier.id} value={supplier.id}>{supplier.name}</MenuItem>)}</TextField>
                <TextField select label="Kho đang hoạt động" value={warehouseId} onChange={event => setWarehouseId(event.target.value)}>{warehouses.data?.data.map(warehouse => <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</MenuItem>)}</TextField>
                <TextField select label="Báo giá nằm trong phạm vi" value={offerIds} slotProps={{ select: { multiple: true } }} onChange={event => setOfferIds(typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value)}>{eligibleOffers.map((offer: SupplierOffer) => <MenuItem key={offer.id} value={offer.id}>{offer.id} · Mã biến thể: {offer.variantId} · {offer.unitCost.amount} {offer.unitCost.currency} · MOQ {offer.minimumQuantity}/{offer.packSize}</MenuItem>)}</TextField>
                {budgetApprovals.isPending && <Typography role="status">Đang đối chiếu phê duyệt ngân sách…</Typography>}{budgetApprovals.isError && <ErrorNotice error={budgetApprovals.error}/>}<TextField select label="Ngân sách mua hàng đã bật và được duyệt" value={budgetId} onChange={event => setBudgetId(event.target.value)}>{procurementBudgets.map(budget => <MenuItem key={budget.id} value={budget.id}>{budget.id} · {budget.limitAmount?.amount} {budget.limitAmount?.currency} · {budget.period}</MenuItem>)}</TextField>{!budgetApprovals.isPending && !budgetApprovals.isError && procurementBudgets.length === 0 && <Typography role="status">Không có ngân sách mua hàng đang bật, còn hiệu lực phê duyệt và khớp phiên bản.</Typography>}
                <TextField label="Hạn mức mỗi đơn" type="number" value={maxPerOrder} onChange={event => setMaxPerOrder(event.target.value)} inputProps={{ min: 1, step: 1 }} error={maxPerOrder !== '' && !validAmount} helperText={selectedBudget ? `Không vượt ${selectedBudget.limitAmount?.amount} ${shop.currency}.` : 'Chọn ngân sách đã bật trước.'}/>
                <TextField label="Hết hạn vào" type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} error={expiresAt !== '' && !expiryValid}/>
                <Typography variant="caption">Bản ghi lưu snapshot giá/MOQ/quy cách và phiên bản ngân sách. Mọi thay đổi trong scope sẽ chặn lần gửi tiếp theo.</Typography>
            </FormFields>
        </EditDialog>
        <ConfirmDialog open={!!actionGrant} title={actionStatus === 'revoked' ? 'Thu hồi ủy quyền gửi đơn' : actionStatus === 'active' ? 'Kích hoạt ủy quyền gửi đơn' : 'Tạm dừng ủy quyền gửi đơn'} description={`${actionGrant ? grantLabel(actionGrant) : ''}. Hạn mức ${actionGrant?.maxPerOrder.amount || ''} ${actionGrant?.maxPerOrder.currency || ''}/đơn; hành động áp dụng cho ${actionGrant?.toolId || 'purchase.send'}. Lệnh đã được tiếp nhận không thể bị thu hồi.`} confirmLabel={actionStatus === 'revoked' ? 'Thu hồi ủy quyền' : actionStatus === 'active' ? 'Kích hoạt ủy quyền' : 'Tạm dừng ủy quyền'} requireReason busy={update.pending} error={update.error} onClose={() => setActionGrant(null)} onConfirm={async reason => {
            if (!actionGrant) return;
            try { await update.execute({ path: { resourceId: actionGrant.id }, body: { expectedVersion: actionGrant.version, status: actionStatus, reason } }); setActionGrant(null); }
            catch { /* giữ quyết định và lý do để đối chiếu lỗi/version */ }
        }}/>
    </Panel>;
}

function localDateTimeInput(timestamp: number) {
    const local = new Date(timestamp - new Date(timestamp).getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
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
        <ConfirmDialog open={Boolean(stop)} title={stop?.action === 'pause' ? 'Tạm dừng vai trò AI' : 'Kiểm tra điều kiện tiếp tục'} confirmLabel={stop?.action === "pause" ? "Tạm dừng vai trò" : "Kiểm tra để tiếp tục"} description={`${stop ? roleNames[stop.role.kind] : ""} (${stop?.role.id || ""}) trong ${shop.name}: ${stop?.action === "pause" ? "dừng các tác động chưa được tiếp nhận." : "kiểm điều kiện và chính sách trước khi cho phép tác động mới."} Tác động bên ngoài đã được nhận không thể thu hồi.`} requireReason onClose={() => setStop(null)} error={control.error} busy={control.pending} onConfirm={reason => control.execute({ body: { expectedVersion: stop?.role.version || 1, scope: 'role', resourceId: stop?.role.id || null, action: stop?.action || 'pause', reason } })} />
    </>;
}
