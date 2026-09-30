import { useState } from 'react';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { WorkItem, Approval } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { dateTime } from '@/shared/model/format';
import { PageHeader, Panel, Stats, Stat, DataTable, QueryState, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, RouteLink, Amount, DetailLine } from '@/shared/ui/components';
export function OperationsPage() {
    const { shop, session } = useScope();
    const list = useApi('listWorkItems', { query: useListQuery() });
    const summary = useApi('getOperationsSummary');
    const claim = useCommand('claimWorkItem', ['listWorkItems', 'listPrepJobs', 'getOperationsSummary']);
    const update = useCommand('updateWorkItem', ['listWorkItems', 'getOperationsSummary']);
    const [item, setItem] = useState<WorkItem | null>(null), [action, setAction] = useState<'begin' | 'complete' | 'block' | 'reassign'>('begin'), [reason, setReason] = useState(''), [assignee, setAssignee] = useState('');
    const members = useApi('listMembers', { query: { limit: 100 } }, useCan('members.manage'));
    return <><PageHeader title="Công việc hôm nay" subtitle="Giao việc → nhận việc → hoàn thành → kiểm tra kết quả."/>{summary.data && <Stats><Stat title="Chưa có người nhận" value={summary.data.data.queuedTasks} accent/><Stat title="Quá hạn" value={summary.data.data.overdueTasks}/><Stat title="Chờ phê duyệt" value={summary.data.data.pendingApprovals}/><Stat title="Kết quả chưa rõ" value={summary.data.data.unknownCommands}/></Stats>}<ErrorNotice error={claim.error}/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={t => t.id} columns={[
        {
            key: 'task', label: 'Công việc', render: t => <Stack><Typography fontWeight={650}>{t.kind === 'prepare_order' ? 'Chuẩn bị đơn hàng' : t.kind === 'customer_handoff' ? 'Tiếp quản khách hàng' : t.kind === 'payment_mismatch' ? 'Đối soát sai lệch' : t.kind}</Typography><Typography variant="caption" color="text.secondary">{t.source.type} · {t.source.id}</Typography></Stack>
        },
        { key: 'status', label: 'Trạng thái', render: t => <Status value={t.state}/> }, { key: 'assigned', label: 'Người nhận', render: t => t.assigneeUserId === session.user.id ? 'Bạn' : t.assigneeUserId || 'Chưa có' }, { key: 'due', label: 'Hạn xử lý', render: t => t.dueAt ? dateTime(t.dueAt, shop.timezone) : 'Chưa đặt lịch' }, { key: 'reason', label: 'Vướng mắc', render: t => t.blockedReason || '—' },
        {
            key: 'actions', label: '', render: t => <Stack direction="row" flexWrap="wrap"><MutationButton permission="operations.claim" allowedActions={t.allowedActions} action="claim" busy={claim.pending} onClick={() => void claim.execute({ path: { resourceId: t.id }, body: { expectedVersion: t.version } }).catch(() => undefined)}>Tôi nhận việc</MutationButton>{t.kind === 'prepare_order' ? <RouteLink to={`/s/${shop.id}/fulfillment?orderId=${t.source.id}`}>Chuẩn bị hàng</RouteLink> : <MutationButton permission="operations.manage" disabled={['completed', 'cancelled'].includes(t.state)} onClick={() => { setItem(t); setReason(''); setAction('begin'); }}>Cập nhật</MutationButton>}</Stack>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <EditDialog open={!!item} title="Cập nhật công việc" onClose={() => setItem(null)} busy={update.pending} actions={<Button variant="contained" disabled={reason.trim().length < 5 || update.pending} onClick={async () => { if (!item)
        return; try {
        await update.execute({ path: { resourceId: item.id }, body: { expectedVersion: item.version, action, reason, ...(action === 'reassign' ? { assigneeUserId: assignee || null } : {}) } });
        setItem(null);
    }
    catch { /* error */ } }}>Lưu kết quả</Button>}><ErrorNotice error={update.error}/><Stack gap={2}><Typography>{item?.source.id}</Typography><TextField label="Hành động" select value={action} onChange={e => setAction(e.target.value as typeof action)}><MenuItem value="begin">Bắt đầu xử lý</MenuItem><MenuItem value="complete">Hoàn thành</MenuItem><MenuItem value="block">Đang bị chặn</MenuItem><MenuItem value="reassign">Chuyển người phụ trách</MenuItem></TextField>{action === 'reassign' && <TextField select label="Người phụ trách" value={assignee} onChange={e => setAssignee(e.target.value)}>{members.data?.data.filter(m => m.status === 'active').map(m => <MenuItem key={m.id} value={m.userId}>{m.userId}</MenuItem>)}</TextField>}<TextField label="Kết quả / lý do" multiline minRows={3} value={reason} onChange={e => setReason(e.target.value)}/></Stack></EditDialog></>;
}
export function ApprovalsPage() {
    const { shop } = useScope();
    const list = useApi('listApprovals', { query: useListQuery() });
    const decide = useCommand('decideApproval', ['listApprovals', 'listPurchaseOrders', 'getOperationsSummary']);
    const [item, setItem] = useState<Approval | null>(null), [decision, setDecision] = useState<'approve' | 'reject'>('approve'), [reason, setReason] = useState('');
    return <><PageHeader title="Cần phê duyệt" subtitle="Quyết định gắn với đúng nội dung, phiên bản và hạn hiệu lực — không phải một nút đồng ý chung."/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={a => a.id} columns={[
        {
            key: 'action', label: 'Nội dung', render: a => <Stack><Typography fontWeight={650}>{a.action}</Typography><Typography variant="caption">{a.resource.type} · {a.resource.id}</Typography></Stack>
        },
        { key: 'amount', label: 'Số tiền', render: a => <Amount value={a.amount}/> }, { key: 'state', label: 'Trạng thái', render: a => <Status value={a.status}/> }, { key: 'due', label: 'Hết hạn', render: a => dateTime(a.expiresAt, shop.timezone) },
        {
            key: 'actions', label: '', render: a => <MutationButton permission="approvals.decide" disabled={a.status !== 'pending'} onClick={() => { setItem(a); setReason(''); setDecision('approve'); }}>Xem & quyết định</MutationButton>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <EditDialog open={!!item} title="Xem xét phê duyệt" onClose={() => setItem(null)} busy={decide.pending} actions={<MutationButton permission="approvals.decide" variant="contained" busy={decide.pending} disabled={reason.trim().length < 5} onClick={async () => { if (!item)
        return; try {
        await decide.execute({ path: { resourceId: item.id }, body: { expectedVersion: item.version, intentHash: item.intentHash, decision, reason } });
        setItem(null);
    }
    catch { /* keep reason */ } }}>{decision === 'approve' ? 'Duyệt đúng nội dung này' : 'Từ chối'}</MutationButton>}><ErrorNotice error={decide.error}/><Stack gap={2}><Alert severity="warning">Thay đổi giá, số lượng, đối tượng hoặc quyền có thể làm phê duyệt hết hiệu lực. Im lặng không được coi là đồng ý.</Alert><DetailLine label="Hành động">{item?.action}</DetailLine><DetailLine label="Đối tượng">{item?.resource.id} · v{item?.resourceVersion}</DetailLine><DetailLine label="Giá trị"><Amount value={item?.amount}/></DetailLine><Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>Hash: {item?.intentHash}</Typography><TextField label="Quyết định" select value={decision} onChange={e => setDecision(e.target.value as typeof decision)}><MenuItem value="approve">Duyệt</MenuItem><MenuItem value="reject">Từ chối</MenuItem></TextField><TextField label="Lý do quyết định" multiline minRows={3} value={reason} onChange={e => setReason(e.target.value)}/></Stack></EditDialog></>;
}
export function DigestsPage() {
    const { shop } = useScope();
    const list = useApi('listDigests', { query: useListQuery() });
    const health = useApi('getOperationsSummary');
    return <><PageHeader title="Bản tin & sức khỏe hệ thống" subtitle="Những việc quan trọng cần chủ shop quyết định; không thay thế người trực thực tế."/><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, gap: 3 }}><Panel title="Bản tin điều hành"><QueryState query={list}><Stack gap={2} sx={{ p: 3 }}>{list.data?.data.map(d => <Box key={d.id} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}><Stack direction="row" justifyContent="space-between"><Typography variant="subtitle2">{dateTime(d.periodStart, shop.timezone)} → {dateTime(d.periodEnd, shop.timezone)}</Typography><Status value={d.status}/></Stack><Typography sx={{ whiteSpace: 'pre-wrap', mt: 2 }}>{d.text}</Typography><Typography variant="caption" color="text.secondary">{d.workItemIds.length} công việc được tham chiếu</Typography></Box>)}<Pager page={list.data?.page}/></Stack></QueryState></Panel><Panel title="Trạng thái phụ thuộc"><QueryState query={health}><Stack sx={{ p: 3 }}>{health.data?.data.health.map(h => <Box key={h.component} sx={{ mb: 3 }}><Stack direction="row" justifyContent="space-between"><Typography>{h.component}</Typography><Status value={h.status}/></Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{h.reason || 'Không có ghi chú'}</Typography><Typography variant="caption">{h.checkedAt ? dateTime(h.checkedAt, shop.timezone) : 'Chưa kiểm tra thực tế'}</Typography></Box>)}</Stack></QueryState><Alert severity="info" sx={{ m: 2 }}>Chỉ hiển thị lịch sử bản tin theo hợp đồng hiện hành. Chưa có API tạo/sửa lịch bản tin; không dựng nút lưu lịch giả.</Alert></Panel></Box></>;
}
