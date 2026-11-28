import { useState } from 'react';
import { Alert, Button, Tab, Tabs, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useListQuery, type ListFilter } from '@/shared/model/filters';
import { dateTime } from '@/shared/model/format';
import { label as businessLabel } from '@/shared/model/labels';
import { useCan, useScope } from '@/shared/model/scope';
import { ActionGroup, PageSections } from '@/shared/ui/composition';
import { DataTable, ErrorNotice, MutationButton, PageHeader, Pager, Panel, QueryState, RouteLink, Status, Toolbar } from '@/shared/ui/components';
import { CommandDetails, commandNames, RelatedResourceLink } from './command-details';

const workKinds = ['prepare_order', 'purchase_review', 'payment_mismatch', 'customer_handoff', 'late_shipment', 'low_stock', 'unmatched_bank', 'recovery'];
const jobKinds = ['import', 'export', 'knowledge_index', 'evaluation', 'privacy', 'connection_test'];
const queueOptionLabels: Record<string, string> = {
    me: 'Của tôi', unassigned: 'Chưa có người nhận', overdue: 'Quá hạn', unscheduled: 'Chưa đặt hạn',
};

function queueFilter(name: string, label: string, options: readonly string[], profile?: Pick<ListFilter, 'pinned' | 'defaultValue'>): ListFilter {
    return { name, label, ...profile, options: options.map(value => ({
        value, label: commandNames[value] ?? queueOptionLabels[value] ?? businessLabel(value),
    })) };
}

const workFilters = [
    queueFilter('kind', 'Loại công việc', workKinds),
    queueFilter('state', 'Trạng thái', ['queued', 'claimed', 'working', 'blocked'], { pinned: true }),
    queueFilter('assignee', 'Người phụ trách', ['me', 'unassigned']),
    queueFilter('due', 'Hạn xử lý', ['overdue', 'unscheduled'], { pinned: true }),
];
const jobFilters = [
    queueFilter('kind', 'Loại tác vụ', jobKinds),
    queueFilter('status', 'Trạng thái', ['failed', 'partial', 'queued', 'running', 'awaiting_confirmation', 'succeeded', 'cancelled'], { pinned: true, defaultValue: 'failed' }),
];
const commandFilters = [
    queueFilter('kind', 'Loại thao tác', Object.keys(commandNames)),
    queueFilter('status', 'Trạng thái', ['unknown', 'failed', 'accepted', 'running', 'succeeded'], { pinned: true, defaultValue: 'unknown' }),
];

export function ExceptionsPage() {
    const { shop } = useScope();
    const canReadJobs = useCan('jobs.read');
    const [params, setParams] = useSearchParams();
    const requested = params.get('view');
    const view = canReadJobs && (requested === 'jobs' || requested === 'commands') ? requested : 'work';
    return <>
        <PageHeader title="Ngoại lệ và tác vụ nền" subtitle="Theo dõi việc cần xử lý, tác vụ lỗi và kết quả cần đối chiếu."
            actions={<RouteLink to={`/s/${shop.id}/operations`}>Công việc hôm nay</RouteLink>} />
        <PageSections>
            {__MOCK__ && <Alert severity="info">Đối chiếu với nhà cung cấp cần kết nối thật. Hàng đợi đang dùng dữ liệu mẫu của cửa hàng.</Alert>}
            {canReadJobs && <Tabs aria-label="Danh sách ngoại lệ" value={view} variant="scrollable" scrollButtons="auto"
                onChange={(_, next: string) => setParams(next === 'work' ? {} : { view: next })}>
                <Tab id="exception-work" aria-controls="exception-content" label="Công việc cần xử lý" value="work" />
                <Tab id="exception-jobs" aria-controls="exception-content" label="Tác vụ nền" value="jobs" />
                <Tab id="exception-commands" aria-controls="exception-content" label="Thao tác cần đối chiếu" value="commands" />
            </Tabs>}
            <div id="exception-content" role={canReadJobs ? 'tabpanel' : undefined}
                aria-labelledby={canReadJobs ? 'exception-' + view : undefined}>
                {view === 'work' ? <WorkQueue /> : view === 'jobs' ? <JobQueue /> : <CommandQueue />}
            </div>
        </PageSections>
    </>;
}

function WorkQueue() {
    const { shop, session } = useScope();
    const query = useListQuery('listWorkItems', 'cursor', workFilters);
    const list = useApi('listWorkItems', { query: { ...query, exception: 'active' } });
    const claim = useCommand('claimWorkItem', ['listWorkItems', 'listPrepJobs', 'getOperationsSummary']);
    return <Panel title="Công việc cần xử lý">
        <Toolbar operation="listWorkItems" placeholder="Mã hoặc hồ sơ"
            filterGroup={{ label: 'Bộ lọc công việc', filters: workFilters }} />
        <ErrorNotice error={claim.error} />
        <QueryState query={list} pendingProfile="section">{list.data && <>
            <DataTable mobile={{ layout: 'cards', titleKey: 'type', summaryKeys: ['state', 'assignee', 'due'], actionKey: 'actions' }} label="Hàng đợi công việc" rows={list.data.data} rowKey={task => task.id}
                empty="Chưa có công việc cần xử lý theo bộ lọc." columns={[
                    { key: 'type', label: 'Công việc', render: task => <>{businessLabel(task.kind)}<Typography variant="caption" display="block">{task.id}</Typography></> },
                    { key: 'state', label: 'Trạng thái', render: task => <Status value={task.state} /> },
                    { key: 'assignee', label: 'Người nhận', render: task => task.assigneeUserId === session.user.id ? 'Bạn' : task.assigneeUserId || 'Chưa có' },
                    { key: 'due', label: 'Hạn xử lý', render: task => task.dueAt ? dateTime(task.dueAt, shop.timezone) : 'Chưa đặt hạn' },
                    { key: 'actions', label: 'Thao tác', render: task => <ActionGroup direction="row">
                        <MutationButton permission="operations.claim" allowedActions={task.allowedActions} action="claim" busy={claim.pending}
                            onClick={() => void claim.execute({ path: { resourceId: task.id }, body: { expectedVersion: task.version } }).catch(() => undefined)}>
                            Tôi nhận việc
                        </MutationButton>
                        <RouteLink to={`/s/${shop.id}/operations?q=${encodeURIComponent(task.id)}`}>Mở công việc</RouteLink>
                        <RelatedResourceLink source={task.source} />
                    </ActionGroup> },
                ]} />
            <Pager page={list.data.page} />
        </>}</QueryState>
    </Panel>;
}

function JobQueue() {
    const { shop } = useScope();
    const query = useListQuery('listJobs', 'cursor', jobFilters);
    const list = useApi('listJobs', { query });
    return <Panel title="Tác vụ nền" subtitle="Dùng mã tác vụ để xem tiến độ, lỗi và kết quả.">
        <Toolbar operation="listJobs" placeholder="Mã tác vụ"
            filterGroup={{ label: 'Bộ lọc tác vụ', filters: jobFilters }} />
        <QueryState query={list} pendingProfile="section">{list.data && <>
            <DataTable mobile={{ layout: 'cards', titleKey: 'type', summaryKeys: ['status', 'errors', 'updated'], actionKey: 'actions' }} label="Tác vụ nền" rows={list.data.data} rowKey={job => job.id}
                empty="Chưa có tác vụ theo bộ lọc." columns={[
                    { key: 'type', label: 'Tác vụ', render: job => <>{businessLabel(job.kind)}<Typography variant="caption" display="block">{job.id}</Typography></> },
                    { key: 'status', label: 'Trạng thái', render: job => <Status value={job.status} /> },
                    { key: 'errors', label: 'Số lỗi', render: job => job.errorCount },
                    { key: 'updated', label: 'Cập nhật', render: job => dateTime(job.updatedAt, shop.timezone) },
                    { key: 'actions', label: 'Thao tác', render: job => <RouteLink to={`/s/${shop.id}/jobs/${encodeURIComponent(job.id)}`}>Mở tác vụ</RouteLink> },
                ]} />
            <Pager page={list.data.page} />
        </>}</QueryState>
    </Panel>;
}

function CommandQueue() {
    const { shop } = useScope();
    const query = useListQuery('listCommands', 'cursor', commandFilters);
    const list = useApi('listCommands', { query });
    const [selected, setSelected] = useState('');
    return <Panel title="Thao tác cần đối chiếu" subtitle="Kiểm tra kết quả theo mã trước khi thực hiện thêm thao tác.">
        <Toolbar operation="listCommands" placeholder="Mã thao tác"
            filterGroup={{ label: 'Bộ lọc thao tác', filters: commandFilters }} />
        <QueryState query={list} pendingProfile="section">{list.data && <>
            <DataTable mobile={{ layout: 'cards', titleKey: 'type', summaryKeys: ['status', 'updated'], actionKey: 'actions' }} label="Hàng đợi thao tác" rows={list.data.data} rowKey={command => command.id}
                empty="Chưa có thao tác theo bộ lọc." columns={[
                    { key: 'type', label: 'Thao tác', render: command => <>{commandNames[command.kind] || 'Thao tác khác'}<Typography variant="caption" display="block">{command.id}</Typography></> },
                    { key: 'status', label: 'Trạng thái', render: command => <Status value={command.status} /> },
                    { key: 'updated', label: 'Cập nhật', render: command => dateTime(command.updatedAt, shop.timezone) },
                    { key: 'actions', label: 'Thao tác', render: command => <Button size="small" onClick={() => setSelected(command.id)}>Chi tiết thao tác</Button> },
                ]} />
            <Pager page={list.data.page} />
        </>}</QueryState>
        {selected && <CommandDetails commandId={selected} close={() => setSelected('')} />}
    </Panel>;
}
