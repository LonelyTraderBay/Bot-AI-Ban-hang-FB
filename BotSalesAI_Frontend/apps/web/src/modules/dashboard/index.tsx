import { Link as RouterLink } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Stack, Typography } from '@mui/material';
import ForumRounded from '@mui/icons-material/ForumRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import SmartToyRounded from '@mui/icons-material/SmartToyRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import { colors } from '@botsales/tokens';
import { useApi } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { dateTime } from '@/shared/model/format';
import { Panel, Stats, Stat, QueryState, Status, Amount, DataTable, RouteLink } from '@/shared/ui/components';
export function DashboardPage() {
    const { shop, session } = useScope();
    const dashboard = useApi('getDashboard');
    const canOps = useCan('operations.read');
    const operations = useApi('getOperationsSummary', {}, canOps);
    const canOrders = useCan('orders.read');
    const orders = useApi('listOrders', { query: { limit: 5 } }, canOrders);
    const data = dashboard.data?.data;
    return <><Box sx={{
        border: 1, borderColor: colors.heroBorder, borderRadius: 4, p: { xs: 3, md: 4 }, mb: 3, background: `linear-gradient(115deg, ${colors.heroStart}, ${colors.heroEnd})`
    }}><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={3}><Box><Typography variant="overline" sx={{ letterSpacing: 1.8, color: 'primary.main' }}>KHÔNG GIAN ĐIỀU HÀNH</Typography><Typography component="h1" variant="h3" sx={{ fontSize: { xs: 27, md: 36 }, mt: 1, mb: 1 }}>Chào {session.user.displayName.split(' · ')[0]},<br /><Box component="span" color="text.secondary" sx={{ fontWeight: 400 }}>cửa hàng của bạn hôm nay.</Box></Typography><Typography color="text.secondary" sx={{ maxWidth: 620, mt: 2 }}>Theo dõi việc cần xử lý, tiến độ đơn hàng và đội ngũ AI — tập trung vào những quyết định quan trọng.</Typography></Box><Stack justifyContent="center" gap={1.5}><Button component={RouterLink} to={`/s/${shop.id}/operations`} variant="contained" endIcon={<ArrowForwardRounded />}>Xem việc cần làm</Button><Button component={RouterLink} to={`/s/${shop.id}/orders/new`} variant="outlined">Tạo đơn hàng</Button></Stack></Stack></Box>
 <QueryState query={dashboard}>{data && <><Stats><Stat title="Hội thoại đang mở" value={data.openConversations} note="Khách đang được tiếp nhận" icon={<ForumRounded />}/><Stat title="Đơn chờ xử lý" value={data.pendingOrders} note="Theo trạng thái hiện tại của hệ thống" icon={<ReceiptLongRounded />} accent/><Stat title="Sản phẩm gần hết" value={data.lowStockVariants} note="Cần kiểm tra mức tồn và đơn nhập" icon={<Inventory2Rounded />}/><Stat title="Trợ lý bán hàng" value={<Status value={data.botStatus}/>} note="Trạng thái do API cung cấp" icon={<SmartToyRounded />}/></Stats>
 <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.6fr 1fr' }, gap: 3 }}><Panel title="Đơn hàng gần đây" subtitle="Mở một đơn để xem chuẩn bị, giao hàng và thanh toán." action={<RouteLink to={`/s/${shop.id}/orders`}>Tất cả đơn</RouteLink>}>{canOrders ? <QueryState query={orders}>{orders.data && <DataTable rows={orders.data.data} rowKey={o => o.id} columns={[
            { key: 'id', label: 'Đơn hàng', render: o => <RouteLink to={`/s/${shop.id}/orders/${o.id}`}>{o.id}</RouteLink> }, { key: 'total', label: 'Giá trị', align: 'right', render: o => <Amount value={o.total}/> }, { key: 'status', label: 'Đơn', render: o => <Status value={o.orderState}/> }, { key: 'delivery', label: 'Giao', render: o => <Status value={o.fulfillmentState}/> }
        ]}/>}</QueryState> : <Alert severity="info">Vai trò hiện tại không có quyền xem đơn hàng.</Alert>}</Panel><Panel title="Dòng tiền và doanh thu" subtitle="Hai chỉ số khác nhau; không coi tiền thu là lợi nhuận."><Stack gap={2.5} sx={{ p: 3 }}><Box><Typography color="text.secondary" variant="body2">Doanh thu đã ghi nhận</Typography><Typography variant="h4" sx={{ mt: .5 }}><Amount value={data.recognizedRevenue}/></Typography></Box><Box><Typography color="text.secondary" variant="body2">Tiền đã thu</Typography><Typography variant="h4" sx={{ mt: .5, color: 'primary.main' }}><Amount value={data.cashReceived}/></Typography></Box><RouteLink to={`/s/${shop.id}/finance/profit-loss`}>Xem lợi nhuận</RouteLink></Stack></Panel></Box>
 {canOps && <Panel title="Đội ngũ AI của cửa hàng" subtitle="Bốn vai trò, một hệ thống kiểm soát quyền." sx={{ mt: 3 }} action={<RouteLink to={`/s/${shop.id}/bot/team`}>Quản lý đội ngũ</RouteLink>}><QueryState query={operations}><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 2, p: 3 }}>{operations.data?.data.roles.map((role, i) => <Box key={role.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 3, p: 2 }}><Avatar sx={{
            bgcolor: [colors.selected, colors.infoSurface, colors.successSurface, colors.violetSurface][i % 4], color: [colors.accent, colors.info, colors.success, colors.violet][i % 4], mb: 2
        }}><SmartToyRounded /></Avatar><Typography fontWeight={650} sx={{ mb: 1 }}>{{ sales_admin: 'Admin bán hàng', accountant: 'Kế toán', warehouse_buyer: 'Kho & mua hàng', supervisor: 'Trưởng nhóm' }[role.kind]}</Typography><Status value={role.status}/><Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>{role.allowedToolIds.length} công cụ được giao</Typography></Box>)}</Box></QueryState></Panel>}
 {data.warnings.map((w, i) => <Alert key={i} severity="info" sx={{ mt: 2 }}>{w}</Alert>)}<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>Dữ liệu cập nhật {dateTime(data.asOf, shop.timezone)} · {shop.name}</Typography></>}</QueryState></>;
}
