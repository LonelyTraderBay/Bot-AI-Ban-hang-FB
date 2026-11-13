import { label as businessLabel } from '@/shared/model/labels';
import { PageSections } from '../../shared/ui/composition';
import { ActionGroup, FormFields, SurfaceContent } from '../../shared/ui/composition';
import { useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { layoutSx } from '../../shared/ui/layout';
import type { BudgetPolicy, PurchaseDelegation, PurchaseDelegationReservation, SupplierOffer } from '@botsales/contracts';
import { useApi, usePagedApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { codePointLength, dateTime } from '@/shared/model/format';
import { PageHeader, Panel, DataTable, QueryState, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, Amount, DetailLine, ConfirmDialog } from '@/shared/ui/components';
import { roleNames } from './role-labels';

export function ApprovalsPage() {
    const { shop } = useScope();
    const list = useApi('listApprovals', { query: useListQuery('listApprovals') });
    const [approvalId, setApprovalId] = useState<string | null>(null);
    const detail = useApi('getApproval', { path: { resourceId: approvalId || '' } }, Boolean(approvalId));
    const decide = useCommand('decideApproval', ['getApproval', 'listApprovals', 'getPurchaseOrder', 'listPurchaseOrders', 'getOperationsSummary']);
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
                            key: 'actions', label: 'Thao tác', render: entry => <MutationButton permission="approvals.decide" disabled={entry.status !== 'pending'} onClick={() => {
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
        <Box sx={layoutSx.surface.bodyInsetAfterHeader}><SurfaceContent><Alert severity="info">Đây là worker MSW local xác định. Không gọi AI, nhà cung cấp hoặc thanh toán; trạng thái “đã gửi” chỉ là kết quả mô phỏng.</Alert>
        {canManage && <ActionGroup direction="row"><MutationButton permission="procurement.delegation.manage" onClick={openCreate}>Tạo ủy quyền có giới hạn</MutationButton></ActionGroup>}</SurfaceContent></Box>
        <QueryState query={grants} pendingProfile="section">{grants.data && <DataTable label="Ủy quyền gửi đơn mua" rows={grants.data.data} rowKey={grant => grant.id} columns={[
            { key: 'scope', label: 'Phạm vi', render: grant => <Stack><Typography fontWeight={visualSx.typography.fontWeight.strong}>{grantLabel(grant)}</Typography><Typography variant="caption">{grant.offerSnapshots.length} báo giá · tối đa {grant.maxPerOrder.amount} {grant.maxPerOrder.currency} / đơn</Typography><Typography variant="caption">Ngân sách · mã chính sách {grant.budgetPolicyId} · {grant.budgetPeriod} · đến {dateTime(grant.expiresAt, shop.timezone)}</Typography></Stack> },
            { key: 'state', label: 'Trạng thái', render: grant => <Status value={Date.parse(grant.expiresAt) <= Date.now() && grant.status === 'active' ? 'expired' : grant.status}/> },
            { key: 'reason', label: 'Lý do gần nhất', render: grant => grant.lastReason || '—' },
            { key: 'actions', label: 'Thao tác', render: grant => <ActionGroup direction="row">
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

