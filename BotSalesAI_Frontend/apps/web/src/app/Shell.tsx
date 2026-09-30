import { useEffect, useState } from 'react';
import { Link as RouterLink, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Avatar, Box, Button, Chip, Divider, Drawer, IconButton, LinearProgress, List, ListItemButton, ListItemIcon, ListItemText, MenuItem, Paper, Select, Stack, TextField, Tooltip, Typography } from '@mui/material';
import MenuRounded from '@mui/icons-material/MenuRounded';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import ForumRounded from '@mui/icons-material/ForumRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import SmartToyRounded from '@mui/icons-material/SmartToyRounded';
import AccountBalanceWalletRounded from '@mui/icons-material/AccountBalanceWalletRounded';
import NotificationsNoneRounded from '@mui/icons-material/NotificationsNoneRounded';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import SearchRounded from '@mui/icons-material/SearchRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import { routeManifest } from '@botsales/contracts';
import { colors } from '@botsales/tokens';
import { ScopeContext } from '@/shared/model/scope';
import { request, cancelScopeRequests } from '@/shared/api/client';
import { useSession } from './SessionProvider';
import { navigation } from './navigation';
import { ScopeEvents } from './ScopeEvents';
import { CommandRecovery } from './CommandRecovery';
import { FeedbackDialog } from './feedback';
function NavIcon({ kind }: {
    kind: string;
}) { if (kind === 'chat')
    return <ForumRounded fontSize="small"/>; if (['inventory', 'product', 'reorder', 'purchase', 'suppliers'].includes(kind))
    return <Inventory2Rounded fontSize="small"/>; if (['ai', 'play', 'quality', 'knowledge'].includes(kind))
    return <SmartToyRounded fontSize="small"/>; if (['money', 'chart', 'match'].includes(kind))
    return <AccountBalanceWalletRounded fontSize="small"/>; if (['orders', 'receipt', 'book', 'report'].includes(kind))
    return <ReceiptLongRounded fontSize="small"/>; if (kind === 'dashboard')
    return <DashboardRounded fontSize="small"/>; if (kind === 'bell')
    return <NotificationsNoneRounded fontSize="small"/>; return <SettingsOutlined fontSize="small"/>; }
export default function Shell() {
    const { shopId = '' } = useParams();
    const { session, loading, error, refresh, logout, online } = useSession();
    const location = useLocation();
    const cache = useQueryClient();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [feedback, setFeedback] = useState(false);
    const membership = session?.memberships.find(m => m.shopId === shopId && m.status === 'active');
    const shopQuery = useQuery({
        queryKey: ['shop', session?.user.id, shopId, membership?.permissionVersion], queryFn: ({ signal }) => request('getShop', { path: { shopId }, signal }), enabled: !!membership, retry: false
    });
    useEffect(() => { setMobileOpen(false); document.querySelector('main')?.focus(); }, [location.pathname]);
    useEffect(() => { return () => { cancelScopeRequests(); void cache.cancelQueries({ queryKey: ['scope'] }); cache.removeQueries({ queryKey: ['scope'] }); }; }, [shopId, membership?.permissionVersion, cache]);
    if (loading)
        return <LinearProgress />;
    if (!session)
        return <Navigate to={'/login?returnTo=' + encodeURIComponent(location.pathname)} replace/>;
    if (!membership)
        return <Box sx={{ p: 4 }}><Alert severity="error">Bạn không có quyền truy cập cửa hàng này.</Alert><Button component={RouterLink} to="/workspaces">Chọn cửa hàng</Button></Box>;
    if (shopQuery.isPending)
        return <LinearProgress />;
    if (shopQuery.isError || !shopQuery.data)
        return <Box sx={{ p: 4 }}><Alert severity="error">{shopQuery.error?.message || error?.message || 'Không đọc được cửa hàng'}</Alert><Button onClick={() => shopQuery.refetch()}>Thử lại</Button></Box>;
    const shop = shopQuery.data.data;
    const currentRoute = [...routeManifest.routes].sort((a, b) => b.path.length - a.path.length).find(r => new RegExp('^' + r.path.replace(/:[^/]+/g, '[^/]+') + '$').test(location.pathname));
    const hasPermission = (id: string) => { const r = routeManifest.routes.find(r => r.id === id); return !r?.readPermission || membership.permissions.some(p => p === r.readPermission); };
    const menu = <Box sx={{ height: '100%', bgcolor: colors.sidebar, display: 'flex', flexDirection: 'column' }}>
  <Stack direction="row" alignItems="center" gap={1.2} sx={{ px: 2.5, py: 3 }}><Box sx={{ width: 38, height: 38, bgcolor: 'primary.main', color: colors.onAccent, borderRadius: 2, display: 'grid', placeItems: 'center' }}><SmartToyRounded /></Box><Box><Typography sx={{ fontWeight: 800, fontSize: 19 }}>BotSales <Box component="span" color="primary.main">AI</Box></Typography><Typography variant="caption" color="text.secondary">Đội ngũ vận hành cửa hàng</Typography></Box></Stack>
  <Box sx={{ px: 2, mb: 1 }}><Button component={RouterLink} to="/workspaces" variant="outlined" fullWidth sx={{ justifyContent: 'space-between', borderColor: 'divider' }}>{shop.name}<span>⌄</span></Button></Box>
  <Box sx={{ flex: 1, overflowY: 'auto', px: 1.25, pb: 2 }}>{navigation.map(group => { const items = group.items.filter(([id, title]) => hasPermission(id) && (!search || title.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')))); return items.length > 0 && <Box key={group.label} sx={{ mt: 2 }}><Typography sx={{ px: 1.5, color: colors.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, mb: .7 }}>{group.label}</Typography><List disablePadding>{items.map(([id, title, path, icon]) => { const to = `/s/${shopId}/${path}`; const active = location.pathname === to; return <ListItemButton key={id} component={RouterLink} to={to} selected={active} sx={{
        borderRadius: 1.5, py: .8, mb: .3, '&.Mui-selected': { bgcolor: colors.selected, color: 'primary.main' }, '&.Mui-selected:hover': { bgcolor: colors.selected }
    }}><ListItemIcon sx={{ minWidth: 32, color: active ? 'primary.main' : 'text.secondary' }}><NavIcon kind={icon}/></ListItemIcon><ListItemText primary={title} primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 650 : 450 }}/></ListItemButton>; })}</List></Box>; })}</Box>
  <Divider /><Stack direction="row" alignItems="center" spacing={1.1} sx={{ p: 2 }}><Avatar sx={{ width: 32, height: 32, bgcolor: colors.raised, color: 'primary.main' }}>{session.user.displayName[0]}</Avatar><Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" noWrap>{session.user.displayName}</Typography><Typography variant="caption" color="text.secondary">{membership.roles.join(' · ')}</Typography></Box><Tooltip title="Đăng xuất"><IconButton aria-label="Đăng xuất" onClick={() => void logout().catch(() => undefined)}><LogoutRounded fontSize="small"/></IconButton></Tooltip></Stack>
 </Box>;
    return <ScopeContext.Provider value={{ session, shop, membership, online, refreshSession: refresh }}>
 <Box sx={{ display: 'flex', minHeight: '100vh' }}><Box component="nav" aria-label="Điều hướng chính" sx={{ width: { lg: 240 }, flexShrink: 0 }}><Drawer variant="permanent" sx={{ display: { xs: 'none', lg: 'block' }, '& .MuiDrawer-paper': { width: 240, borderColor: 'divider' } }}>{menu}</Drawer><Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ display: { lg: 'none' }, '& .MuiDrawer-paper': { width: 280 } }}>{menu}</Drawer></Box>
 <Box sx={{ minWidth: 0, flex: 1 }}><Paper square component="header" sx={{ position: 'sticky', top: 0, zIndex: 1100, borderBottom: 1, borderColor: 'divider', bgcolor: colors.canvas }}><Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ minHeight: 64, px: { xs: 2, md: 4 } }}>
  <Stack direction="row" alignItems="center" gap={1}><IconButton aria-label="Mở menu" onClick={() => setMobileOpen(true)} sx={{ display: { lg: 'none' } }}><MenuRounded /></IconButton><Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>Không gian làm việc <Box component="span" sx={{ mx: 1 }}> / </Box><Box component="span" color="text.primary">{currentRoute?.title || 'BotSales'}</Box></Typography></Stack>
  <Stack direction="row" alignItems="center" gap={1.5}><TextField size="small" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm màn hình..." inputProps={{ 'aria-label': 'Tìm màn hình' }} sx={{ width: 200, display: { xs: 'none', md: 'block' } }} slotProps={{ input: { startAdornment: <SearchRounded fontSize="small" sx={{ mr: 1, color: 'text.secondary' }}/> } }}/><Chip label={__MOCK__ ? 'Dữ liệu mô phỏng' : 'API thật'} color={__MOCK__ ? 'warning' : 'default'} variant="outlined"/><IconButton component={RouterLink} to={`/s/${shopId}/notifications`} aria-label="Thông báo"><NotificationsNoneRounded /></IconButton><Avatar sx={{ width: 32, height: 32, bgcolor: colors.selected, color: 'primary.main', fontSize: 14 }}>{session.user.displayName[0]}</Avatar></Stack>
 </Stack></Paper>
 {__MOCK__ && <Box sx={{ px: { xs: 2, md: 4 }, pt: 2 }}><Alert severity="info" action={<Button color="inherit" size="small" onClick={() => setFeedback(true)}>Góp ý</Button>}>Frontend review: API được mô phỏng trong bộ nhớ, không gửi tin hoặc đặt hàng thật. Tải lại trang sẽ khởi tạo lại dữ liệu.</Alert><MockTools onChange={refresh}/></Box>}
 <ScopeEvents /><CommandRecovery />
 {!online && <Alert severity="warning" sx={{ m: 2 }}>Đang ngoại tuyến. Dữ liệu đang xem có thể cũ; mọi thao tác ghi bị tạm khóa.</Alert>}
 <Box component="main" id="main-content" tabIndex={-1} sx={{ p: { xs: 2, md: 4 }, outline: 'none', minHeight: '80vh' }}><Outlet key={`${shopId}:${membership.permissionVersion}`}/></Box>
 <Box component="footer" sx={{ px: 4, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', gap: 2 }}><Typography variant="caption" color="text.secondary">BotSales AI · Graphite Gold · Frontend</Typography><Button size="small" onClick={() => setFeedback(true)}>Góp ý màn hình</Button></Box>
 </Box></Box><FeedbackDialog open={feedback} onClose={() => setFeedback(false)}/></ScopeContext.Provider>;
}
function MockTools({ onChange }: {
    onChange: () => Promise<void>;
}) {
    const [role, setRole] = useState('owner');
    const [fault, setFault] = useState('normal');
    async function change(key: string, value: string) {
        if (!__MOCK__)
            return;
        const { setMockControl } = await import('../mocks/control');
        await setMockControl(key, value);
        if (key === 'role')
            await onChange();
    }
    return <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1 }}><Typography variant="caption" color="text.secondary">Thử giao diện:</Typography><Select size="small" value={role} onChange={e => { setRole(e.target.value); void change('role', e.target.value); }} inputProps={{ 'aria-label': 'Vai trò mô phỏng' }} sx={{ fontSize: 12, minWidth: 130, height: 32 }}>{['owner', 'manager', 'sales', 'warehouse', 'accountant', 'bot_admin', 'viewer'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}</Select><Select size="small" value={fault} onChange={e => { setFault(e.target.value); void change('fault', e.target.value); }} inputProps={{ 'aria-label': 'Trạng thái thử' }} sx={{ fontSize: 12, minWidth: 160, height: 32 }}>{[
        ['normal', 'Bình thường'], ['slow', 'Tải chậm'], ['error', 'Lỗi truy vấn tiếp'], ['forbidden', 'Mất quyền truy vấn tiếp'], ['conflict', 'Xung đột lần ghi tiếp'], ['unknown', 'Kết quả ghi chưa rõ']
    ].map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}</Select></Stack>;
}
