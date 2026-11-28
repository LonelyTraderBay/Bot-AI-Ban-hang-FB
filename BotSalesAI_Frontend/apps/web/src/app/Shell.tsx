import { ActionGroup } from '../shared/ui/composition';
import { useEffect, useRef, useState } from 'react';
import {routeDisplayTitle, routeMetadata} from './route-metadata';
import {label} from '../shared/model/labels';
import { Link as RouterLink, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Avatar, Box, Breadcrumbs, Button, Chip, Divider, Drawer, IconButton, LinearProgress, Link, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
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
import CloseRounded from '@mui/icons-material/CloseRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import PeopleRounded from '@mui/icons-material/PeopleRounded';
import LocalShippingRounded from '@mui/icons-material/LocalShippingRounded';
import AssignmentReturnRounded from '@mui/icons-material/AssignmentReturnRounded';
import SupportAgentRounded from '@mui/icons-material/SupportAgentRounded';
import CategoryRounded from '@mui/icons-material/CategoryRounded';
import UploadFileRounded from '@mui/icons-material/UploadFileRounded';
import HistoryRounded from '@mui/icons-material/HistoryRounded';
import AssignmentTurnedInRounded from '@mui/icons-material/AssignmentTurnedInRounded';
import ChecklistRounded from '@mui/icons-material/ChecklistRounded';
import MenuBookRounded from '@mui/icons-material/MenuBookRounded';
import PlayCircleRounded from '@mui/icons-material/PlayCircleRounded';
import FactCheckRounded from '@mui/icons-material/FactCheckRounded';
import FeedbackRounded from '@mui/icons-material/FeedbackRounded';
import MonitorHeartRounded from '@mui/icons-material/MonitorHeartRounded';
import PhoneAndroidRounded from '@mui/icons-material/PhoneAndroidRounded';
import CampaignRounded from '@mui/icons-material/CampaignRounded';
import LinkRounded from '@mui/icons-material/LinkRounded';
import StoreRounded from '@mui/icons-material/StoreRounded';
import SecurityRounded from '@mui/icons-material/SecurityRounded';
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import AssessmentRounded from '@mui/icons-material/AssessmentRounded';
import { routeManifest } from '@botsales/contracts';
import { colors, tokens } from '@botsales/tokens';
import { layoutSx } from '@/shared/ui/layout';
import { ScopeContext } from '@/shared/model/scope';
import { request, cancelScopeRequests } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { useSession } from './SessionProvider';
import { activeNavigationId, navigation } from './navigation';
import { ScopeEvents } from './ScopeEvents';
import { CommandRecovery } from './CommandRecovery';
import { hasUnsavedFormDraft } from './dirty-drafts';
import {DraftNavigationGuard} from './DraftNavigationGuard';
type NavigationIconKind = (typeof navigation)[number]['items'][number][3];
const navigationIcons: Record<NavigationIconKind, typeof SettingsOutlined> = {
    dashboard: DashboardRounded, work: ChecklistRounded, approval: AssignmentTurnedInRounded,
    chat: ForumRounded, people: PeopleRounded, orders: ReceiptLongRounded, inventory: Inventory2Rounded,
    shipping: LocalShippingRounded, return: AssignmentReturnRounded, support: SupportAgentRounded,
    product: Inventory2Rounded, category: CategoryRounded, upload: UploadFileRounded, history: HistoryRounded,
    suppliers: StoreRounded, reorder: Inventory2Rounded, purchase: ReceiptLongRounded, receipt: ReceiptLongRounded,
    money: AccountBalanceWalletRounded, book: MenuBookRounded, chart: AssessmentRounded, match: FactCheckRounded,
    calendar: CalendarMonthRounded, ai: SmartToyRounded, settings: SettingsOutlined, play: PlayCircleRounded,
    quality: FactCheckRounded, knowledge: MenuBookRounded, feedback: FeedbackRounded, health: MonitorHeartRounded,
    bell: NotificationsNoneRounded, phone: PhoneAndroidRounded, report: AssessmentRounded, marketing: CampaignRounded,
    channel: LinkRounded, integration: LinkRounded, store: StoreRounded, security: SecurityRounded,
};
function NavIcon({ kind }: { kind: NavigationIconKind }) {
    const Icon = navigationIcons[kind];
    return <Icon fontSize="small" />;
}
export default function Shell() {
    const { shopId = '' } = useParams();
    const { session, loading, error, refresh, logout, online } = useSession();
    const location = useLocation();
    const cache = useQueryClient();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [menuCompact, setMenuCompact] = useState(false);
    const [search, setSearch] = useState('');
    const searchInput = useRef<HTMLInputElement>(null);
    const menuFocus = useRef<HTMLElement>(null);
    const clearSearch = () => {
        setSearch('');
        if (searchInput.current?.getClientRects().length) searchInput.current.focus();
        else menuFocus.current?.focus();
    };
    const [logoutPending, setLogoutPending] = useState(false);
    const [logoutError, setLogoutError] = useState('');
    async function performLogout() {
        setLogoutPending(false);
        setLogoutError('');
        try {
            await logout();
        }
        catch {
            setLogoutError('Chưa xác minh được đăng xuất. Bản nháp và trạng thái phiên hiện tại vẫn được giữ trên màn hình; kiểm tra kết nối rồi thử lại.');
        }
    }
    function requestLogout() {
        if (hasUnsavedFormDraft()) {
            setLogoutPending(true);
            return;
        }
        void performLogout();
    }
    const membership = session?.memberships.find(m => m.shopId === shopId && m.status === 'active');
    const scopeUserId = session?.user.id;
    const permissionVersion = membership?.permissionVersion;
    const shopQuery = useQuery({
        queryKey: ['shop', session?.user.id, shopId, membership?.permissionVersion],
        queryFn: async ({ signal, queryKey }) => {
            try {
                return await request('getShop', { path: { shopId }, signal });
            } catch (error) {
                // A later failed refresh must not restore a shop whose access was denied.
                if (!signal.aborted && error instanceof ApiError && [403, 404].includes(error.status))
                    cache.setQueryData(queryKey, null);
                throw error;
            }
        },
        enabled: !!membership, retry: false,
        refetchInterval: 20_000, refetchIntervalInBackground: false
    });
    useEffect(() => { setMobileOpen(false); document.querySelector('main')?.focus(); }, [location.pathname]);
    useEffect(() => {
        if (!scopeUserId || !shopId || permissionVersion === undefined) return;
        const queryKey = ['scope', scopeUserId, shopId, permissionVersion];
        return () => {
            cancelScopeRequests();
            void cache.cancelQueries({ queryKey });
            // Let child observers unsubscribe before removing their queries and GC timers.
            queueMicrotask(() => cache.removeQueries({ queryKey, type: 'inactive' }));
        };
    }, [cache, scopeUserId, shopId, permissionVersion]);
    if (loading)
        return <LinearProgress aria-label="Đang tải phiên làm việc" />;
    if (!session) {
        if (error && !(error instanceof ApiError && error.status === 401))
            return <Box sx={layoutSx.shell.centeredFallback}><Stack sx={[layoutSx.query.stateGap, { width: '100%', maxWidth: 560 }]}><Alert severity="error">Không thể kết nối API phiên đăng nhập. Kiểm tra dịch vụ hoặc mạng; ứng dụng không tự chuyển sang dữ liệu mô phỏng.</Alert><Button onClick={() => void refresh()}>Thử lại</Button></Stack></Box>;
        return <Navigate to={'/login?returnTo=' + encodeURIComponent(location.pathname)} replace/>;
    }
    if (!membership)
        return <Box sx={layoutSx.shell.pageFallbackInset}><Stack sx={layoutSx.query.stateGap}><Alert severity="error">Bạn không có quyền truy cập cửa hàng này.</Alert><Button component={RouterLink} to="/workspaces">Chọn cửa hàng</Button></Stack></Box>;
    if (shopQuery.isPending)
        return <LinearProgress aria-label="Đang tải cửa hàng" />;
    const refreshError = shopQuery.error;
    const transientRefresh = refreshError instanceof TypeError || (refreshError instanceof ApiError
        && (refreshError.status >= 500 || refreshError.code === 'REQUEST_TIMEOUT'));
    if (!shopQuery.data || (shopQuery.isError && !transientRefresh))
        return <Box sx={layoutSx.shell.pageFallbackInset}><Stack sx={layoutSx.query.stateGap}><Alert severity="error">{shopQuery.error?.message || error?.message || 'Không đọc được cửa hàng'}</Alert><Button onClick={() => shopQuery.refetch()}>Thử lại</Button></Stack></Box>;
    const shop = shopQuery.data.data;
    const currentRoute = routeMetadata(location.pathname);
    const isConversationWorkspace = currentRoute?.id === 'R06' || currentRoute?.id === 'R05';
    const hasPermission = (id: string) => { const r = routeManifest.routes.find(r => r.id === id); return !r?.readPermission || membership.permissions.some(p => p === r.readPermission); };
    const activeId = activeNavigationId(location.pathname, shopId);
    const matchingNavigation = navigation.map(group => ({...group,items:group.items.filter(([id,title])=>hasPermission(id)&&title.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')))}));
    const desktopWidth = menuCompact ? tokens.layout.sidebarCompact : tokens.layout.sidebarDesktop;
    function menu(compact: boolean) {
        return <Box component="nav" aria-label="Điều hướng chính" ref={menuFocus} tabIndex={-1} sx={{ height: '100%', bgcolor: colors.sidebar, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" alignItems="center" sx={[layoutSx.navigation.brandGap, layoutSx.navigation.brandInset, compact && { justifyContent: 'center' }]}>
                <Box sx={[layoutSx.navigation.brandMarkShape, { width: 38, height: 38, bgcolor: 'primary.main', color: colors.onAccent, display: 'grid', placeItems: 'center', flexShrink: 0 }]}><SmartToyRounded /></Box>
                {!compact && <Box><Typography variant="h6">BotSales <Box component="span" color="primary.main">AI</Box></Typography><Typography variant="caption" color="text.secondary">Đội ngũ vận hành cửa hàng</Typography></Box>}
            </Stack>
            {compact ? <Tooltip title="Chọn cửa hàng"><IconButton component={RouterLink} to="/workspaces" aria-label="Chọn cửa hàng" sx={{ alignSelf: 'center' }}><StoreRounded /></IconButton></Tooltip>
                : <Box sx={layoutSx.navigation.shopInset}><Button component={RouterLink} to="/workspaces" variant="outlined" fullWidth sx={{ justifyContent: 'space-between', borderColor: 'divider' }}>{shop.name}<span>⌄</span></Button></Box>}
            <Box sx={[{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }, layoutSx.navigation.listInset]}>
                {matchingNavigation.filter(group => group.items.length > 0).map(group => <Box key={group.label} sx={layoutSx.navigation.groupGap}>
                    {!compact && <Typography variant="caption" component="div" sx={[layoutSx.navigation.groupLabelInset, layoutSx.navigation.groupLabelGap, { color: colors.textMuted }]}>{group.label}</Typography>}
                    <List disablePadding aria-label={group.label}>{group.items.map(([id, title, path, icon]) => {
                        const to = `/s/${shopId}/${path}`;
                        const active = activeId === id;
                        return <ListItem key={id} disablePadding><Tooltip title={compact ? title : ''} placement="right"><ListItemButton component={RouterLink} to={to} selected={active} aria-label={compact ? title : undefined}
                            aria-current={active ? (location.pathname === to ? 'page' : 'location') : undefined}
                            sx={[layoutSx.navigation.itemInsetBlock, layoutSx.navigation.itemGap, layoutSx.navigation.itemShape, {
                                ...(compact && { justifyContent: 'center', px: 0, minHeight: tokens.layout.touchTarget }),
                                '&.Mui-selected': { bgcolor: colors.selected, color: 'primary.main' }, '&.Mui-selected:hover': { bgcolor: colors.selected },
                            }]}>
                            <ListItemIcon sx={{ minWidth: compact ? 0 : 32, color: active ? 'primary.main' : 'text.secondary' }}><NavIcon kind={icon}/></ListItemIcon>
                            {!compact && <ListItemText primary={title} primaryTypographyProps={{ variant: 'body2', fontWeight: active ? 'medium' : 'regular' }}/>}
                        </ListItemButton></Tooltip></ListItem>;
                    })}</List>
                </Box>)}
                {search.trim() && !matchingNavigation.some(group => group.items.length) && (compact
                    ? <Tooltip title="Xóa tìm kiếm"><IconButton aria-label="Xóa tìm kiếm" onClick={clearSearch}><CloseRounded /></IconButton></Tooltip>
                    : <Alert severity="info" action={<Button onClick={clearSearch}>Xóa tìm kiếm</Button>}>Không tìm thấy màn hình phù hợp.</Alert>)}
            </Box>
            <Divider />
            <Stack direction="row" alignItems="center" sx={[layoutSx.navigation.accountInset, layoutSx.navigation.accountGap, compact && { justifyContent: 'center' }]}>
                {!compact && <><Avatar sx={{ width: 32, height: 32, bgcolor: colors.raised, color: 'primary.main' }}>{session!.user.displayName[0]}</Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{session!.user.displayName}</Typography><Typography variant="caption" color="text.secondary">{membership!.roles.map(role => label(role)).join(' · ')}</Typography></Box></>}
                <Tooltip title="Đăng xuất"><IconButton aria-label="Đăng xuất" onClick={requestLogout}><LogoutRounded fontSize="small"/></IconButton></Tooltip>
            </Stack>
        </Box>;
    }
    return <ScopeContext.Provider value={{ session, shop, membership, online, refreshSession: refresh }}>
 <Box sx={{ display: 'flex', minHeight: '100dvh' }}><Box sx={{ width: { lg: desktopWidth }, flexShrink: 0 }}><Drawer variant="permanent" sx={{ display: { xs: 'none', lg: 'block' }, '& .MuiDrawer-paper': { width: desktopWidth, borderColor: 'divider' } }}>{menu(menuCompact)}</Drawer><Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ display: { lg: 'none' }, '& .MuiDrawer-paper': { width: 280 } }}>{menu(false)}</Drawer></Box>
 <Box sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100dvh', height: isConversationWorkspace ? 'max(32rem, 100dvh)' : undefined }}><Paper square component="header" sx={[layoutSx.shell.headerHeight, { position: 'sticky', top: 0, zIndex: tokens.zIndex.sticky, display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider', bgcolor: colors.canvas }]}><Stack direction="row" alignItems="center" justifyContent="space-between" sx={[layoutSx.page.gutter, { flex: 1, minWidth: 0 }]}>
  <ActionGroup direction="row" alignItems="center" geometry={{ minWidth: 0, flex: 1 }}><IconButton aria-label="Mở menu" onClick={() => setMobileOpen(true)} sx={{ display: { lg: 'none' } }}><MenuRounded /></IconButton><IconButton aria-label={menuCompact ? 'Mở rộng menu' : 'Thu gọn menu'} aria-expanded={!menuCompact} onClick={() => setMenuCompact(compact => !compact)} sx={{ display: { xs: 'none', lg: 'inline-flex' } }}><MenuRounded /></IconButton><Breadcrumbs aria-label="Đường dẫn hiện tại" sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 0, overflowWrap: 'anywhere' }}><Link component={RouterLink} to="/workspaces" color="inherit" underline="hover">{shop.name}</Link><Typography component="span" variant="body2" color="text.primary" aria-current="page">{routeDisplayTitle(currentRoute) || 'BotSales'}</Typography></Breadcrumbs></ActionGroup>
  <Stack direction="row" alignItems="center" sx={[layoutSx.toolbar.controlGap, { flexShrink: 0 }]}><TextField inputRef={searchInput} size="small" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm trong menu" inputProps={{ 'aria-label': 'Tìm trong menu' }} sx={{ width: 200, display: { xs: 'none', md: 'block' } }} slotProps={{ input: { startAdornment: <SearchRounded fontSize="small" sx={[layoutSx.shell.searchIconInset, { color: 'text.secondary' }]}/> } }}/>{search && <IconButton aria-label="Xóa bộ lọc menu" onClick={clearSearch}><CloseRounded/></IconButton>}{!__MOCK__ && <Chip aria-label="API thật" label={<><Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>API thật</Box><Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>API</Box></>} color="default" variant="outlined" sx={{ height: 'auto', minHeight: tokens.space.lg, '& .MuiChip-label': { whiteSpace: 'normal' } }}/>}<IconButton component={RouterLink} to={`/s/${shopId}/notifications`} aria-label="Thông báo"><NotificationsNoneRounded fontSize="small" /></IconButton><Avatar sx={{ width: 32, height: 32, bgcolor: colors.selected, color: 'primary.main', fontSize: tokens.fontSizes.body }}>{session.user.displayName[0]}</Avatar></Stack>
 </Stack></Paper>
 {logoutError && <Alert severity="error" sx={layoutSx.shell.statusBanner}>{logoutError}</Alert>}<ScopeEvents /><CommandRecovery />
 {transientRefresh && <Alert severity="warning" role="status" sx={layoutSx.shell.statusBanner}>Chưa cập nhật được trạng thái cửa hàng. Đang hiển thị dữ liệu gần nhất.</Alert>}
 {shop.status === 'closed' && <Alert severity="info" role="status" sx={layoutSx.shell.statusBanner}>Cửa hàng đã đóng. Bạn có thể xem lại dữ liệu nghiệp vụ.</Alert>}
 {!online && <Alert severity="warning" sx={layoutSx.shell.statusBanner}>Đang ngoại tuyến. Dữ liệu đang xem có thể cũ; mọi thao tác ghi bị tạm khóa.</Alert>}
 <Box component="main" id="main-content" tabIndex={-1} sx={[layoutSx.page.gutter, layoutSx.page.contentInsetBlock, layoutSx.shell.mainFill,
    { outline: 'none' }, isConversationWorkspace && { display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }]}
 ><Outlet key={`${session.user.id}:${shopId}:${membership.permissionVersion}`}/></Box>
 <Box component="footer" sx={[layoutSx.footer.insetInline, layoutSx.footer.insetBlock, { borderTop: 1, borderColor: 'divider' }]}><Typography variant="caption" color="text.secondary">BotSales AI · Graphite Gold · Frontend</Typography></Box>
 </Box></Box><DraftNavigationGuard logoutPending={logoutPending} onCancelLogout={() => setLogoutPending(false)} onDiscardLogout={performLogout}/></ScopeContext.Provider>;
}
