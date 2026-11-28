import { ActionGroup, PageSections, SectionGrid, SurfaceContent } from '../../shared/ui/composition';
import { useId, useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Link, Stack, Typography } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import { tokens } from '@botsales/tokens';
import type { DashboardOrderRow } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan, useCanWrite } from '@/shared/model/scope';
import { dateTime } from '@/shared/model/format';
import { Amount, ConfirmDialog, CopyableCode, DataTable, Empty, MutationButton, PageHeader, Panel, QueryState, RouteLink, Stat, Stats, Status } from '@/shared/ui/components';
import { layoutSx } from '@/shared/ui/layout';

const agentRoleNames: Record<string, string> = {
    sales_admin: 'Admin bán hàng',
    accountant: 'Kế toán',
    warehouse_buyer: 'Kho & mua hàng',
    supervisor: 'Trưởng nhóm',
};

export function dashboardAgentRoleLabel(kind: string | null | undefined) {
    return kind ? agentRoleNames[kind] || 'Vai trò chưa có nhãn' : 'Vai trò chưa có nhãn';
}

function OrderSummary({ query, rows, completed = false }: { query: Parameters<typeof QueryState>[0]['query']; rows?: DashboardOrderRow[]; completed?: boolean }) {
    const { shop } = useScope();
    const detailId = useId();
    const list = `/s/${shop.id}/orders`;
    return <Panel title={completed ? 'Đơn đã hoàn tất' : 'Đơn chờ'}
        action={<RouteLink to={completed ? `${list}?status=completed` : list}>Xem danh sách</RouteLink>}>
        <QueryState query={query}>{rows?.length ? <SurfaceContent rhythm="dividedRows">{rows.map(row => {
            const description = `${detailId}-${row.id}`;
            return <Box key={row.id} sx={[layoutSx.dashboard.summaryRowInset, { borderTop: 1, borderColor: 'divider' }]}>
                <ActionGroup alignItems="center" flexWrap="wrap">
                    <ActionGroup alignItems="center" flexWrap="nowrap" geometry={{ minWidth: 0, flex: '1 1 9em' }}>
                        <Link component={RouterLink} to={`${list}/${encodeURIComponent(row.id)}`} aria-label={row.id} aria-describedby={description}
                            title={row.id} sx={{ minWidth: 0, minHeight: tokens.layout.touchTarget, display: 'grid', alignContent: 'center' }}>
                            <Typography component="span" variant="body2" sx={{ overflowWrap: 'anywhere' }}>{row.id}</Typography>
                            {row.customerName && <Typography component="span" variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{row.customerName}</Typography>}
                        </Link>
                        <CopyableCode value={row.id} label="mã đơn hàng" showValue={false} />
                    </ActionGroup>
                    <Box id={description} sx={{ display: 'contents' }}>
                        <Status value={row.fulfillmentState} density="compact" />
                        <Amount value={row.total} wrap />
                    </Box>
                </ActionGroup>
            </Box>;
        })}</SurfaceContent> : <SurfaceContent bodyMode="inset"><Typography color="text.secondary">{completed ? 'Chưa có đơn hoàn tất.' : 'Chưa có đơn chờ.'}</Typography></SurfaceContent>}</QueryState>
    </Panel>;
}

export function DashboardPage() {
    const { shop } = useScope();
    const dashboard = useApi('getDashboard');
    const canFinance = useCan('finance.read');
    const canOps = useCan('operations.read');
    const operations = useApi('getOperationsSummary', {}, canOps);
    const canOrders = useCan('orders.read');
    const canInventory = useCan('inventory.read');
    const canCreateOrder = useCanWrite('orders.write');
    const canPauseBot = useCanWrite('bot.publish');
    const bot = useApi('getBotConfig', {}, canPauseBot);
    const pause = useCommand('pauseBot', ['getDashboard', 'getBotConfig']);
    const [pauseOpen, setPauseOpen] = useState(false);
    const data = dashboard.data?.data;
    const botConfig = bot.data?.data;
    const primaryAction = canOps
        ? { label: 'Xem việc cần làm', to: `/s/${shop.id}/operations` }
        : canOrders ? { label: 'Xem đơn hàng', to: `/s/${shop.id}/orders` } : null;

    return <PageSections>
        <PageHeader title="Tổng quan" subtitle={data ? `Dữ liệu cập nhật ${dateTime(data.asOf, shop.timezone)}` : undefined}
            actions={(canOps || canOrders || canCreateOrder) && <ActionGroup alignItems="center">
                    {primaryAction && <Link component={RouterLink} to={primaryAction.to} underline="none" sx={[layoutSx.dashboard.actionTarget, { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: visualSx.radius.control, bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: visualSx.typography.fontWeight.strong, '&:hover': { bgcolor: 'primary.light', textDecoration: 'none' }, '&:active': { bgcolor: 'primary.dark' }, '&:focus-visible': { outline: `${tokens.focusRing.width}px solid`, outlineColor: 'primary.light', outlineOffset: tokens.focusRing.controlOffset } }]}>{primaryAction.label} <ArrowForwardRounded fontSize="small" /></Link>}
                    {canCreateOrder && <Link component={RouterLink} to={`/s/${shop.id}/orders/new`} underline="none" sx={[layoutSx.dashboard.actionTarget, { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 1, borderColor: 'divider', borderRadius: visualSx.radius.control, color: 'text.primary', fontWeight: visualSx.typography.fontWeight.strong, '&:hover': { bgcolor: 'action.hover', textDecoration: 'none' }, '&:focus-visible': { outline: `${tokens.focusRing.width}px solid`, outlineColor: 'primary.light', outlineOffset: tokens.focusRing.controlOffset } }]}>Tạo đơn hàng</Link>}
                </ActionGroup>} />

        <SectionGrid rhythm="content" columns={{ xs: 'minmax(0, 1fr)', lg: canOrders ? 'minmax(0, 5fr) minmax(0, 6fr)' : 'minmax(0, 1fr)' }} alignItems="start">
        <Panel title="Tình hình hiện tại" bodyMode="inset">
            <QueryState query={dashboard} pendingProfile="section">
                {data && <Stats afterGap="none" density="compact" appearance="strip">
                    <Stat title="Hội thoại đang mở" value={<Link component={RouterLink} to={`/s/${shop.id}/inbox`} underline="hover" color="inherit">{data.openConversations}</Link>} />
                    <Stat title="Đơn chờ xử lý" value={<Link component={RouterLink} to={`/s/${shop.id}/orders`} underline="hover" color="inherit">{data.pendingOrders}</Link>} accent />
                    <Stat title="Sản phẩm gần hết" value={<Link component={RouterLink} to={`/s/${shop.id}/inventory`} underline="hover" color="inherit">{data.lowStockVariants}</Link>} note="Theo ngưỡng tồn đã đặt" />
                    <Stat title="Trợ lý bán hàng" value={<Status value={data.botStatus} />} valueRole="text" />
                </Stats>}
            </QueryState>
        </Panel>
        {canOrders && <OrderSummary query={dashboard} rows={data?.pendingOrderRows} />}
        </SectionGrid>

            <Panel bodyMode="inset">
                <SectionGrid rhythm="content" columns={{ xs: '1fr', md: 'minmax(12rem,auto) minmax(0,1fr)' }} alignItems="center">
                    <ActionGroup justifyContent="space-between" alignItems="center">
                        <Typography component="h2" variant="h6" sx={{ fontSize: visualSx.typography.panelTitle }}>Dòng tiền và doanh thu</Typography>
                        {canFinance && <RouteLink to={`/s/${shop.id}/finance/profit-loss`}>Xem lợi nhuận</RouteLink>}
                    </ActionGroup>
                {canFinance ? data ? (
                    <SectionGrid rhythm="content" columns={{ xs: 'repeat(2,minmax(0,1fr))' }} shrinkChildren>
                        <ActionGroup justifyContent="space-between" alignItems="center"><Typography color="text.secondary" variant="body2">Doanh thu đã ghi nhận</Typography><Typography component="div" variant="h6"><Amount wrap value={data.recognizedRevenue} /></Typography></ActionGroup>
                        <ActionGroup justifyContent="space-between" alignItems="center"><Typography color="text.secondary" variant="body2">Tiền đã thu</Typography><Typography component="div" variant="h6" color="primary.main"><Amount wrap value={data.cashReceived} /></Typography></ActionGroup>
                    </SectionGrid>
                ) : dashboard.isPending ? <Box role="status">Đang tải số liệu tài chính…</Box> : <Alert severity="warning" action={<Button onClick={() => void dashboard.refetch()}>Thử lại</Button>}>Không thể tải số liệu tài chính. Dữ liệu của các khu vực khác vẫn dùng được.</Alert>
                    : <Alert severity="info">Vai trò hiện tại không có quyền xem số liệu tài chính.</Alert>}
                </SectionGrid>
            </Panel>

            {(canOrders || canInventory) && <SectionGrid rhythm="content" columns={{ xs: 'minmax(0, 1fr)', lg: canOrders && canInventory ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)' }} alignItems="start">
                {canOrders && <OrderSummary query={dashboard} completed rows={data?.completedOrderRows} />}
                {canInventory && <Panel title="Tồn kho khả dụng" action={<RouteLink to={`/s/${shop.id}/inventory`}>Xem tồn kho</RouteLink>}>
                    <QueryState query={dashboard} pendingProfile="section"><DataTable label="Tồn kho khả dụng" mobile={{ layout: 'comparison', appearance: 'grid' }} rows={data?.availableStockRows ?? []} rowKey={row => row.id} columns={[
                        { key: 'sku', label: 'SKU', width: 96, render: row => <RouteLink to={`/s/${shop.id}/inventory?q=${encodeURIComponent(row.sku)}`}>{row.sku}</RouteLink> },
                        { key: 'onHand', label: 'Thực tế', align: 'right', width: 58, render: row => row.onHand },
                        { key: 'reserved', label: 'Đã giữ', align: 'right', width: 58, render: row => row.reserved },
                        { key: 'available', label: 'Khả dụng', align: 'right', width: 76, render: row => row.available },
                    ]} /></QueryState>
                </Panel>}
            </SectionGrid>}

            {canOps && <Panel title="Đội ngũ AI của cửa hàng" subtitle="Trạng thái kết nối bên ngoài chưa được xác minh" action={<RouteLink to={`/s/${shop.id}/bot/team`}>Quản lý đội ngũ</RouteLink>} bodyMode="inset" geometry={{ gridColumn: { xs: 'auto', xl: '1 / -1' } }}>
                <QueryState query={operations} pendingProfile="section">{operations.data?.data.roles.length ? <SectionGrid rhythm="content" columns={{ xs: 'repeat(auto-fit,minmax(min(100%,11em),1fr))', lg: 'repeat(4,minmax(0,1fr))' }}>{operations.data.data.roles.map(role => <SurfaceContent key={role.id} alignItems="flex-start" bodyMode="compactOutlined">
                    <Box><Typography fontWeight={visualSx.typography.fontWeight.strong}>{dashboardAgentRoleLabel(role.kind)}</Typography>{!agentRoleNames[role.kind] && role.kind && <CopyableCode value={role.kind} label="mã vai trò" />}{!role.kind && <Typography variant="caption" color="text.secondary">API chưa cung cấp mã vai trò.</Typography>}</Box>
                    <Status value={role.status} />
                    <Typography variant="caption" color="text.secondary">{role.allowedToolIds.length} công cụ được giao</Typography>
                </SurfaceContent>)}</SectionGrid> : <Empty text="API chưa trả vai trò điều hành." />}</QueryState>
            </Panel>}

            {canPauseBot && <Panel title="Điều khiển trợ lý" subtitle="Tạm dừng là thao tác có tác động; cần xác nhận và lý do." bodyMode="inset" geometry={{ gridColumn: { xs: 'auto', xl: '1 / -1' } }}>
                <QueryState query={bot}>{botConfig && <ActionGroup density="comfortable" alignItems="center">
                    <Status value={botConfig.status} />
                    <MutationButton permission="bot.publish" variant="outlined" color="error" busy={pause.pending} disabled={botConfig.status === 'paused'} onClick={() => setPauseOpen(true)}>{botConfig.status === 'paused' ? 'Bot đã tạm dừng' : 'Tạm dừng bot'}</MutationButton>
                    {pause.error && <Alert severity="error">{pause.error.message}</Alert>}
                </ActionGroup>}</QueryState>
            </Panel>}

        {data && <Stack sx={layoutSx.dashboard.footerFlow}>
            {data.warnings.map((warning, index) => <Alert key={`${index}-${warning}`} severity="info">{warning}</Alert>)}
        </Stack>}
        <ConfirmDialog open={pauseOpen} title="Tạm dừng trợ lý bán hàng" confirmLabel="Tạm dừng trợ lý" description={`Trợ lý bán hàng ${botConfig?.id || ""} trong ${shop.name}: các tác động chưa gửi sẽ dừng. Tin nhắn nhà cung cấp đã nhận không thể thu hồi.`} requireReason busy={pause.pending} error={pause.error} onClose={() => setPauseOpen(false)} onConfirm={reason => pause.execute({ body: { expectedVersion: botConfig?.version || 1, reason } })} />
    </PageSections>;
}
