import { ActionGroup, SectionGrid, SurfaceContent } from '../../shared/ui/composition';
import { useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Link, Stack, Typography } from '@mui/material';
import ForumRounded from '@mui/icons-material/ForumRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import SmartToyRounded from '@mui/icons-material/SmartToyRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import { colors, tokens } from '@botsales/tokens';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { dateTime } from '@/shared/model/format';
import { Amount, ConfirmDialog, CopyableCode, DataTable, Empty, MutationButton, Panel, QueryState, RouteLink, Stat, Stats, Status } from '@/shared/ui/components';
import { layoutSx } from '@/shared/ui/layout';

const agentRoleNames: Record<string, string> = {
    sales_admin: 'Admin bán hàng',
    accountant: 'Kế toán',
    warehouse_buyer: 'Kho & mua hàng',
    supervisor: 'Trưởng nhóm',
};

export function dashboardGreetingName(displayName: string | null | undefined) {
    return displayName?.split(' · ')[0]?.trim() || 'bạn';
}

export function dashboardAgentRoleLabel(kind: string | null | undefined) {
    return kind ? agentRoleNames[kind] || 'Vai trò chưa có nhãn' : 'Vai trò chưa có nhãn';
}

export function DashboardPage() {
    const { shop, session } = useScope();
    const dashboard = useApi('getDashboard');
    const canFinance = useCan('finance.read');
    const canOps = useCan('operations.read');
    const operations = useApi('getOperationsSummary', {}, canOps);
    const canOrders = useCan('orders.read');
    const canCreateOrder = useCan('orders.write');
    const orders = useApi('listOrders', { query: { limit: 5 } }, canOrders);
    const canPauseBot = useCan('bot.publish');
    const bot = useApi('getBotConfig', {}, canPauseBot);
    const pause = useCommand('pauseBot', ['getDashboard', 'getBotConfig']);
    const [pauseOpen, setPauseOpen] = useState(false);
    const data = dashboard.data?.data;
    const botConfig = bot.data?.data;
    const greetingName = dashboardGreetingName(session.user.displayName);
    const primaryAction = canOps
        ? { label: 'Xem việc cần làm', to: `/s/${shop.id}/operations` }
        : canOrders ? { label: 'Xem đơn hàng', to: `/s/${shop.id}/orders` } : null;

    return <>
        <Box sx={[layoutSx.dashboard.groupInset, layoutSx.pageHeader.afterGap, { border: 1, borderColor: colors.heroBorder, borderRadius: visualSx.radius.hero, background: `linear-gradient(115deg, ${colors.heroStart}, ${colors.heroEnd})` }]}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" sx={layoutSx.dashboard.sectionGap}>
                <Box>
                    <Typography variant="overline" sx={{ letterSpacing: visualSx.typography.letterSpacing.dashboardOverline, color: 'primary.main' }}>KHÔNG GIAN ĐIỀU HÀNH</Typography>
                    <Typography component="h1" variant="h3" sx={[layoutSx.dashboard.heroTitleFlow, { fontSize: visualSx.typography.dashboardTitle.fontSize, overflowWrap: 'anywhere' }]}>Chào {greetingName},<br /><Box component="span" color="text.secondary" sx={{ fontWeight: visualSx.typography.fontWeight.regular }}>cửa hàng của bạn hôm nay.</Box></Typography>
                    <Typography color="text.secondary" sx={[layoutSx.dashboard.heroDescriptionGap, { maxWidth: 620 }]}>Theo dõi việc cần xử lý, tiến độ đơn hàng và đội ngũ AI — tập trung vào những quyết định quan trọng.</Typography>
                </Box>
                {(canOps || canOrders || canCreateOrder) && <ActionGroup direction="column" density="comfortable" justifyContent="center">
                    {primaryAction && <Link component={RouterLink} to={primaryAction.to} underline="none" sx={[layoutSx.dashboard.actionTarget, { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: visualSx.radius.dialog, bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: visualSx.typography.fontWeight.strong, '&:hover': { bgcolor: 'primary.light', textDecoration: 'none' }, '&:active': { bgcolor: 'primary.dark' }, '&:focus-visible': { outline: `${tokens.focusRing.width}px solid`, outlineColor: 'primary.light', outlineOffset: tokens.focusRing.controlOffset } }]}>{primaryAction.label} <ArrowForwardRounded fontSize="small" /></Link>}
                    {canCreateOrder && <Link component={RouterLink} to={`/s/${shop.id}/orders/new`} underline="none" sx={[layoutSx.dashboard.actionTarget, { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 1, borderColor: 'divider', borderRadius: visualSx.radius.dialog, color: 'text.primary', fontWeight: visualSx.typography.fontWeight.strong, '&:hover': { bgcolor: 'action.hover', textDecoration: 'none' }, '&:focus-visible': { outline: `${tokens.focusRing.width}px solid`, outlineColor: 'primary.light', outlineOffset: tokens.focusRing.controlOffset } }]}>Tạo đơn hàng</Link>}
                </ActionGroup>}
            </Stack>
        </Box>

        <Panel title="Tình hình hiện tại" subtitle="Các KPI là trạng thái hiện tại do API trả về, không phải dự báo." afterGap={"section"}>
            <QueryState query={dashboard} pendingProfile="section">
                {data && <Stats>
                    <Stat title="Hội thoại đang mở" value={<Link component={RouterLink} to={`/s/${shop.id}/inbox`} underline="hover" color="inherit">{data.openConversations}</Link>} note="Trạng thái hiện tại" icon={<ForumRounded />} />
                    <Stat title="Đơn chờ xử lý" value={<Link component={RouterLink} to={`/s/${shop.id}/orders`} underline="hover" color="inherit">{data.pendingOrders}</Link>} note="Theo trạng thái hiện tại của API" icon={<ReceiptLongRounded />} accent />
                    <Stat title="Sản phẩm gần hết" value={<Link component={RouterLink} to={`/s/${shop.id}/inventory`} underline="hover" color="inherit">{data.lowStockVariants}</Link>} note="Theo ngưỡng tồn trong API" icon={<Inventory2Rounded />} />
                    <Stat title="Trợ lý bán hàng" value={<Status value={data.botStatus} />} note="Trạng thái do API cung cấp" icon={<SmartToyRounded />} />
                </Stats>}
            </QueryState>
        </Panel>

        <Box sx={[layoutSx.dashboard.sectionGap, { display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.6fr 1fr' }, alignItems: 'start' }]}>

            <Panel title="Dòng tiền và doanh thu" subtitle="Doanh thu ghi nhận và tiền đã thu là hai chỉ số khác nhau." bodyMode="inset">
                {canFinance ? data ? <SurfaceContent >
                    <Box><Typography color="text.secondary" variant="body2">Doanh thu đã ghi nhận</Typography><Typography variant="h4" sx={layoutSx.dashboard.metricValueGap}><Amount wrap value={data.recognizedRevenue} /></Typography></Box>
                    <Box><Typography color="text.secondary" variant="body2">Tiền đã thu</Typography><Typography variant="h4" sx={[layoutSx.dashboard.metricValueGap, { color: 'primary.main' }]}><Amount wrap value={data.cashReceived} /></Typography></Box>
                    <RouteLink to={`/s/${shop.id}/finance/profit-loss`}>Xem lợi nhuận</RouteLink>
                </SurfaceContent> : dashboard.isPending ? <Box role="status">Đang tải số liệu tài chính…</Box> : <Alert severity="warning" action={<Button onClick={() => void dashboard.refetch()}>Thử lại</Button>}>Không thể tải số liệu tài chính. Dữ liệu của các khu vực khác vẫn dùng được.</Alert>
                    : <Alert severity="info">Chỉ hiển thị khi vai trò có finance.read.</Alert>}
            </Panel>

            <Panel title="Đơn hàng gần đây" subtitle="Mở đơn để xem trạng thái chuẩn bị, giao hàng và thanh toán." action={canOrders ? <RouteLink to={`/s/${shop.id}/orders`}>Tất cả đơn</RouteLink> : undefined} bodyMode={canOrders ? 'flush' : 'inset'} geometry={{ gridColumn: { xs: 'auto', xl: '1 / -1' } }}>
                {canOrders ? <QueryState query={orders} pendingProfile="section">{orders.data && <DataTable rows={orders.data.data} rowKey={order => order.id} label="Đơn hàng gần đây" columns={[
                    { key: 'id', label: 'Đơn hàng', render: order => <Stack direction="row" alignItems="center" sx={layoutSx.code.inlineGap} flexWrap="wrap"><RouteLink to={`/s/${shop.id}/orders/${order.id}`}>{order.id}</RouteLink><CopyableCode value={order.id} label="mã đơn hàng" /></Stack> },
                    { key: 'total', label: 'Giá trị', align: 'right', render: order => <Amount value={order.total} /> },
                    { key: 'status', label: 'Đơn', render: order => <Status value={order.orderState} /> },
                    { key: 'delivery', label: 'Giao', render: order => <Status value={order.fulfillmentState} /> },
                ]} />}</QueryState> : <Alert severity="info">Vai trò hiện tại không có orders.read.</Alert>}
            </Panel>

            {canOps && <Panel title="Đội ngũ AI của cửa hàng" subtitle="Trạng thái vai trò lấy từ API; trạng thái kết nối bên ngoài chưa được xác minh." action={<RouteLink to={`/s/${shop.id}/bot/team`}>Quản lý đội ngũ</RouteLink>} bodyMode="inset" geometry={{ gridColumn: { xs: 'auto', xl: '1 / -1' } }}>
                <QueryState query={operations} pendingProfile="section">{operations.data?.data.roles.length ? <SectionGrid rhythm="content" columns={{ xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }}>{operations.data.data.roles.map((role, index) => <SurfaceContent key={role.id} alignItems="flex-start" bodyMode="compactOutlined">
                    <Avatar sx={{ bgcolor: [colors.selected, colors.infoSurface, colors.successSurface, colors.violetSurface][index % 4], color: [colors.accent, colors.info, colors.success, colors.violet][index % 4] }}><SmartToyRounded /></Avatar>
                    <Box><Typography fontWeight={visualSx.typography.fontWeight.strong}>{dashboardAgentRoleLabel(role.kind)}</Typography>{!agentRoleNames[role.kind] && role.kind && <CopyableCode value={role.kind} label="mã vai trò" />}{!role.kind && <Typography variant="caption" color="text.secondary">API chưa cung cấp mã vai trò.</Typography>}</Box>
                    <Status value={role.status} />
                    <Typography variant="caption" color="text.secondary">{role.allowedToolIds.length} công cụ được giao</Typography>
                </SurfaceContent>)}</SectionGrid> : <Empty text="API chưa trả vai trò điều hành." />}</QueryState>
            </Panel>}

            {canPauseBot && <Panel title="Điều khiển trợ lý" subtitle="Tạm dừng là thao tác có tác động; cần xác nhận và lý do." bodyMode="inset" geometry={{ gridColumn: { xs: 'auto', xl: '1 / -1' } }}>
                <QueryState query={bot}>{botConfig && <ActionGroup direction={{ xs: 'column', sm: 'row' }} density="comfortable" alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <Status value={botConfig.status} />
                    <MutationButton permission="bot.publish" variant="outlined" color="error" busy={pause.pending} disabled={botConfig.status === 'paused'} onClick={() => setPauseOpen(true)}>{botConfig.status === 'paused' ? 'Bot đã tạm dừng' : 'Tạm dừng bot'}</MutationButton>
                    {pause.error && <Alert severity="error">{pause.error.message}</Alert>}
                </ActionGroup>}</QueryState>
            </Panel>}
        </Box>

        {data && <Stack sx={layoutSx.dashboard.footerFlow}>
            {data.warnings.map((warning, index) => <Alert key={`${index}-${warning}`} severity="info">{warning}</Alert>)}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Dữ liệu cập nhật {dateTime(data.asOf, shop.timezone)} · {shop.name}</Typography>
        </Stack>}
        <ConfirmDialog open={pauseOpen} title="Tạm dừng trợ lý bán hàng" confirmLabel="Tạm dừng trợ lý" description={`Trợ lý bán hàng ${botConfig?.id || ""} trong ${shop.name}: các tác động chưa gửi sẽ dừng. Tin nhắn nhà cung cấp đã nhận không thể thu hồi.`} requireReason busy={pause.pending} error={pause.error} onClose={() => setPauseOpen(false)} onConfirm={reason => pause.execute({ body: { expectedVersion: botConfig?.version || 1, reason } })} />
    </>;
}
