import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Link, Stack, Typography } from '@mui/material';
import ForumRounded from '@mui/icons-material/ForumRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import SmartToyRounded from '@mui/icons-material/SmartToyRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import { colors } from '@botsales/tokens';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { dateTime } from '@/shared/model/format';
import { Amount, ConfirmDialog, DataTable, Empty, MutationButton, Panel, QueryState, RouteLink, Stat, Stats, Status } from '@/shared/ui/components';

export function DashboardPage() {
    const { shop, session } = useScope();
    const dashboard = useApi('getDashboard');
    const canFinance = useCan('finance.read');
    const canOps = useCan('operations.read');
    const operations = useApi('getOperationsSummary', {}, canOps);
    const canOrders = useCan('orders.read');
    const orders = useApi('listOrders', { query: { limit: 5 } }, canOrders);
    const canPauseBot = useCan('bot.publish');
    const bot = useApi('getBotConfig', {}, canPauseBot);
    const pause = useCommand('pauseBot', ['getDashboard', 'getBotConfig']);
    const [pauseOpen, setPauseOpen] = useState(false);
    const data = dashboard.data?.data;
    const botConfig = bot.data?.data;

    return <>
        <Box sx={{ border: 1, borderColor: colors.heroBorder, borderRadius: 4, p: { xs: 3, md: 4 }, mb: 3, background: `linear-gradient(115deg, ${colors.heroStart}, ${colors.heroEnd})` }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={3}>
                <Box>
                    <Typography variant="overline" sx={{ letterSpacing: 1.8, color: 'primary.main' }}>KHÔNG GIAN ĐIỀU HÀNH</Typography>
                    <Typography component="h1" variant="h3" sx={{ fontSize: { xs: 27, md: 36 }, mt: 1, mb: 1 }}>Chào {session.user.displayName.split(' · ')[0]},<br /><Box component="span" color="text.secondary" sx={{ fontWeight: 400 }}>cửa hàng của bạn hôm nay.</Box></Typography>
                    <Typography color="text.secondary" sx={{ maxWidth: 620, mt: 2 }}>Theo dõi việc cần xử lý, tiến độ đơn hàng và đội ngũ AI — tập trung vào những quyết định quan trọng.</Typography>
                </Box>
                <Stack justifyContent="center" gap={1.5}>
                    <Link component={RouterLink} to={`/s/${shop.id}/operations`} underline="none" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 1, px: 2, py: 1.25, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 650, '&:hover': { bgcolor: 'primary.dark', textDecoration: 'none' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.light', outlineOffset: 2 } }}>Xem việc cần làm <ArrowForwardRounded fontSize="small" /></Link>
                    <Link component={RouterLink} to={`/s/${shop.id}/orders/new`} underline="none" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 1, px: 2, py: 1.25, border: 1, borderColor: 'divider', borderRadius: 2, color: 'text.primary', fontWeight: 650, '&:hover': { bgcolor: 'action.hover', textDecoration: 'none' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.light', outlineOffset: 2 } }}>Tạo đơn hàng</Link>
                </Stack>
            </Stack>
        </Box>

        <Panel title="Tình hình hiện tại" subtitle="Các KPI là trạng thái hiện tại do API trả về, không phải dự báo." sx={{ mb: 3 }}>
            <QueryState query={dashboard}>
                {data && <Stats>
                    <Stat title="Hội thoại đang mở" value={<Link component={RouterLink} to={`/s/${shop.id}/inbox`} underline="hover" color="inherit">{data.openConversations}</Link>} note="Trạng thái hiện tại" icon={<ForumRounded />} />
                    <Stat title="Đơn chờ xử lý" value={<Link component={RouterLink} to={`/s/${shop.id}/orders`} underline="hover" color="inherit">{data.pendingOrders}</Link>} note="Theo trạng thái hiện tại của API" icon={<ReceiptLongRounded />} accent />
                    <Stat title="Sản phẩm gần hết" value={<Link component={RouterLink} to={`/s/${shop.id}/inventory`} underline="hover" color="inherit">{data.lowStockVariants}</Link>} note="Theo ngưỡng tồn trong API" icon={<Inventory2Rounded />} />
                    <Stat title="Trợ lý bán hàng" value={<Status value={data.botStatus} />} note="Trạng thái do API cung cấp" icon={<SmartToyRounded />} />
                </Stats>}
            </QueryState>
        </Panel>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.6fr 1fr' }, gap: 3, alignItems: 'start' }}>

            <Panel title="Dòng tiền và doanh thu" subtitle="Doanh thu ghi nhận và tiền đã thu là hai chỉ số khác nhau.">
                {canFinance ? data ? <Stack gap={2.5} sx={{ p: 3 }}>
                    <Box><Typography color="text.secondary" variant="body2">Doanh thu đã ghi nhận</Typography><Typography variant="h4" sx={{ mt: .5 }}><Amount value={data.recognizedRevenue} /></Typography></Box>
                    <Box><Typography color="text.secondary" variant="body2">Tiền đã thu</Typography><Typography variant="h4" sx={{ mt: .5, color: 'primary.main' }}><Amount value={data.cashReceived} /></Typography></Box>
                    <RouteLink to={`/s/${shop.id}/finance/profit-loss`}>Xem lợi nhuận</RouteLink>
                </Stack> : dashboard.isPending ? <Box role="status" sx={{ p: 3 }}>Đang tải số liệu tài chính…</Box> : <Alert severity="warning" action={<Button onClick={() => void dashboard.refetch()}>Thử lại</Button>}>Không thể tải số liệu tài chính. Dữ liệu của các khu vực khác vẫn dùng được.</Alert>
                    : <Alert severity="info" sx={{ m: 2 }}>Chỉ hiển thị khi vai trò có finance.read.</Alert>}
            </Panel>

            <Panel title="Đơn hàng gần đây" subtitle="Mở đơn để xem trạng thái chuẩn bị, giao hàng và thanh toán." action={<RouteLink to={`/s/${shop.id}/orders`}>Tất cả đơn</RouteLink>} sx={{ gridColumn: { xs: 'auto', xl: '1 / -1' } }}>
                {canOrders ? <QueryState query={orders}>{orders.data && <DataTable rows={orders.data.data} rowKey={order => order.id} label="Đơn hàng gần đây" columns={[
                    { key: 'id', label: 'Đơn hàng', render: order => <RouteLink to={`/s/${shop.id}/orders/${order.id}`}>{order.id}</RouteLink> },
                    { key: 'total', label: 'Giá trị', align: 'right', render: order => <Amount value={order.total} /> },
                    { key: 'status', label: 'Đơn', render: order => <Status value={order.orderState} /> },
                    { key: 'delivery', label: 'Giao', render: order => <Status value={order.fulfillmentState} /> },
                ]} />}</QueryState> : <Alert severity="info" sx={{ m: 2 }}>Vai trò hiện tại không có orders.read.</Alert>}
            </Panel>

            {canOps && <Panel title="Đội ngũ AI của cửa hàng" subtitle="Trạng thái vai trò lấy từ API; trạng thái kết nối bên ngoài chưa được xác minh." action={<RouteLink to={`/s/${shop.id}/bot/team`}>Quản lý đội ngũ</RouteLink>} sx={{ gridColumn: { xs: 'auto', xl: '1 / -1' } }}>
                <QueryState query={operations}>{operations.data?.data.roles.length ? <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 2, p: 3 }}>{operations.data.data.roles.map((role, index) => <Box key={role.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 3, p: 2 }}>
                    <Avatar sx={{ bgcolor: [colors.selected, colors.infoSurface, colors.successSurface, colors.violetSurface][index % 4], color: [colors.accent, colors.info, colors.success, colors.violet][index % 4], mb: 2 }}><SmartToyRounded /></Avatar>
                    <Typography fontWeight={650} sx={{ mb: 1 }}>{({ sales_admin: 'Admin bán hàng', accountant: 'Kế toán', warehouse_buyer: 'Kho & mua hàng', supervisor: 'Trưởng nhóm' } as Record<string, string>)[role.kind] || role.kind}</Typography>
                    <Status value={role.status} />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>{role.allowedToolIds.length} công cụ được giao</Typography>
                </Box>)}</Box> : <Empty text="API chưa trả vai trò điều hành." />}</QueryState>
            </Panel>}

            {canPauseBot && <Panel title="Điều khiển trợ lý" subtitle="Tạm dừng là thao tác có tác động; cần xác nhận và lý do." sx={{ gridColumn: { xs: 'auto', xl: '1 / -1' } }}>
                <QueryState query={bot}>{botConfig && <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ p: 3 }}>
                    <Status value={botConfig.status} />
                    <MutationButton permission="bot.publish" variant="outlined" color="error" busy={pause.pending} disabled={botConfig.status === 'paused'} onClick={() => setPauseOpen(true)}>{botConfig.status === 'paused' ? 'Bot đã tạm dừng' : 'Tạm dừng bot'}</MutationButton>
                    {pause.error && <Alert severity="error">{pause.error.message}</Alert>}
                </Stack>}</QueryState>
            </Panel>}
        </Box>

        {data?.warnings.map((warning, index) => <Alert key={`${index}-${warning}`} severity="info" sx={{ mt: 2 }}>{warning}</Alert>)}
        {data && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>Dữ liệu cập nhật {dateTime(data.asOf, shop.timezone)} · {shop.name}</Typography>}
        <ConfirmDialog open={pauseOpen} title="Tạm dừng trợ lý bán hàng" description="Các tác động chưa gửi sẽ dừng. Tin nhắn nhà cung cấp đã nhận không thể thu hồi." requireReason busy={pause.pending} error={pause.error} onClose={() => setPauseOpen(false)} onConfirm={reason => pause.execute({ body: { expectedVersion: botConfig?.version || 1, reason } })} />
    </>;
}
