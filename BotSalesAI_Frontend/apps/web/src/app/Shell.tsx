import { ActionGroup } from '../shared/ui/composition';
import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {routeMetadata} from './route-metadata';
import {label} from '../shared/model/labels';
import { Link as RouterLink, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Avatar, Box, Button, Chip, Divider, Drawer, IconButton, LinearProgress, List, ListItem, ListItemButton, ListItemIcon, ListItemText, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
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
import { routeManifest } from '@botsales/contracts';
import { colors, tokens } from '@botsales/tokens';
import { layoutSx } from '@/shared/ui/layout';
import { ScopeContext } from '@/shared/model/scope';
import { request, cancelScopeRequests } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { useSession } from './SessionProvider';
import { navigation } from './navigation';
import { ScopeEvents } from './ScopeEvents';
import { CommandRecovery } from './CommandRecovery';
import { FeedbackDialog } from './feedback';
import { hasUnsavedFormDraft } from './dirty-drafts';
import {DraftNavigationGuard} from './DraftNavigationGuard';
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
    const searchInput = useRef<HTMLInputElement>(null);
    const clearSearch = () => {setSearch('');searchInput.current?.focus();};
    const [feedback, setFeedback] = useState(false);
    const [logoutPending, setLogoutPending] = useState(false);
    const [logoutError, setLogoutError] = useState('');
    const [demoExpanded, setDemoExpanded] = useState(false);
    const [demoRole, setDemoRole] = useState('owner');
    const [demoFault, setDemoFault] = useState('normal');
    const [demoDataset, setDemoDataset] = useState('seed');
    const [demoStatus, setDemoStatus] = useState('');
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
    const shopQuery = useQuery({
        queryKey: ['shop', session?.user.id, shopId, membership?.permissionVersion], queryFn: ({ signal }) => request('getShop', { path: { shopId }, signal }), enabled: !!membership, retry: false
    });
    useEffect(() => { setMobileOpen(false); document.querySelector('main')?.focus(); }, [location.pathname]);
    useEffect(() => { return () => { cancelScopeRequests(); void cache.cancelQueries({ queryKey: ['scope'] }); cache.removeQueries({ queryKey: ['scope'] }); }; }, [shopId, membership?.permissionVersion, cache]);
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
    if (shopQuery.isError || !shopQuery.data)
        return <Box sx={layoutSx.shell.pageFallbackInset}><Stack sx={layoutSx.query.stateGap}><Alert severity="error">{shopQuery.error?.message || error?.message || 'Không đọc được cửa hàng'}</Alert><Button onClick={() => shopQuery.refetch()}>Thử lại</Button></Stack></Box>;
    const shop = shopQuery.data.data;
    const currentRoute = routeMetadata(location.pathname);
    const hasPermission = (id: string) => { const r = routeManifest.routes.find(r => r.id === id); return !r?.readPermission || membership.permissions.some(p => p === r.readPermission); };
    const matchingNavigation = navigation.map(group => ({...group,items:group.items.filter(([id,title])=>hasPermission(id)&&title.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')))}));
    const menu = <Box sx={{ height: '100%', bgcolor: colors.sidebar, display: 'flex', flexDirection: 'column' }}>
  <Stack direction="row" alignItems="center" sx={[layoutSx.navigation.brandGap, layoutSx.navigation.brandInset]}><Box sx={[layoutSx.navigation.brandMarkShape, { width: 38, height: 38, bgcolor: 'primary.main', color: colors.onAccent, display: 'grid', placeItems: 'center' }]}><SmartToyRounded /></Box><Box><Typography variant="h6">BotSales <Box component="span" color="primary.main">AI</Box></Typography><Typography variant="caption" color="text.secondary">Đội ngũ vận hành cửa hàng</Typography></Box></Stack>
  <Box sx={layoutSx.navigation.shopInset}><Button component={RouterLink} to="/workspaces" variant="outlined" fullWidth sx={{ justifyContent: 'space-between', borderColor: 'divider' }}>{shop.name}<span>⌄</span></Button></Box>
  <Box sx={[{ flex: 1, overflowY: 'auto' }, layoutSx.navigation.listInset] }>{matchingNavigation.map(group => { const items = group.items; return items.length > 0 && <Box key={group.label} sx={layoutSx.navigation.groupGap}><Typography variant="overline" sx={[layoutSx.navigation.groupLabelInset, layoutSx.navigation.groupLabelGap, { color: colors.textMuted }]}>{group.label}</Typography><List disablePadding>{items.map(([id, title, path, icon]) => { const to = `/s/${shopId}/${path}`; const active = location.pathname === to; return <ListItem key={id} disablePadding><ListItemButton component={RouterLink} to={to} selected={active} sx={[layoutSx.navigation.itemInsetBlock, layoutSx.navigation.itemGap, layoutSx.navigation.itemShape, { '&.Mui-selected': { bgcolor: colors.selected, color: 'primary.main' }, '&.Mui-selected:hover': { bgcolor: colors.selected }
    }]}><ListItemIcon sx={{ minWidth: 32, color: active ? 'primary.main' : 'text.secondary' }}><NavIcon kind={icon}/></ListItemIcon><ListItemText primary={title} primaryTypographyProps={{ variant: 'body2', fontWeight: active ? 'medium' : 'regular' }}/></ListItemButton></ListItem>; })}</List></Box>; })}{search.trim() && !matchingNavigation.some(group => group.items.length) && <Alert severity="info" action={<Button onClick={clearSearch}>Xóa tìm kiếm</Button>}>Không tìm thấy màn hình phù hợp.</Alert>}</Box>
  <Divider /><Stack direction="row" alignItems="center" sx={[layoutSx.navigation.accountInset, layoutSx.navigation.accountGap]}><Avatar sx={{ width: 32, height: 32, bgcolor: colors.raised, color: 'primary.main' }}>{session.user.displayName[0]}</Avatar><Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{session.user.displayName}</Typography><Typography variant="caption" color="text.secondary">{membership.roles.map(role => label(role)).join(' · ')}</Typography></Box><Tooltip title="Đăng xuất"><IconButton aria-label="Đăng xuất" onClick={requestLogout}><LogoutRounded fontSize="small"/></IconButton></Tooltip></Stack>
 </Box>;
    return <ScopeContext.Provider value={{ session, shop, membership, online, refreshSession: refresh }}>
 <Box sx={{ display: 'flex', minHeight: '100vh' }}><Box component="nav" aria-label="Điều hướng chính" sx={{ width: { lg: 240 }, flexShrink: 0 }}><Drawer variant="permanent" sx={{ display: { xs: 'none', lg: 'block' }, '& .MuiDrawer-paper': { width: 240, borderColor: 'divider' } }}>{menu}</Drawer><Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ display: { lg: 'none' }, '& .MuiDrawer-paper': { width: 280 } }}>{menu}</Drawer></Box>
 <Box sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}><Paper square component="header" sx={[layoutSx.shell.headerHeight, { position: 'sticky', top: 0, zIndex: 1100, borderBottom: 1, borderColor: 'divider', bgcolor: colors.canvas }]}><Stack direction="row" alignItems="center" justifyContent="space-between" sx={layoutSx.page.gutter}>
  <ActionGroup direction="row" alignItems="center" ><IconButton aria-label="Mở menu" onClick={() => setMobileOpen(true)} sx={{ display: { lg: 'none' } }}><MenuRounded /></IconButton><Typography component="nav" aria-label="Đường dẫn hiện tại" variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>Không gian làm việc <Box component="span"> / </Box><Box component="span" color="text.primary">{currentRoute?.title || 'BotSales'}</Box></Typography></ActionGroup>
  <Stack direction="row" alignItems="center" sx={layoutSx.toolbar.controlGap}><TextField inputRef={searchInput} size="small" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm màn hình..." inputProps={{ 'aria-label': 'Tìm màn hình' }} sx={{ width: 200, display: { xs: 'none', md: 'block' } }} slotProps={{ input: { startAdornment: <SearchRounded fontSize="small" sx={[layoutSx.shell.searchIconInset, { color: 'text.secondary' }]}/> } }}/>{search && <IconButton aria-label="Xóa tìm màn hình" onClick={clearSearch}><CloseRounded/></IconButton>}<Chip aria-label={__MOCK__ ? 'Dữ liệu mô phỏng' : 'API thật'} label={<><Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{__MOCK__ ? 'Dữ liệu mô phỏng' : 'API thật'}</Box><Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>{__MOCK__ ? 'Demo' : 'API'}</Box></>} color={__MOCK__ ? 'warning' : 'default'} variant="outlined"/><IconButton component={RouterLink} to={`/s/${shopId}/notifications`} aria-label="Thông báo"><NotificationsNoneRounded /></IconButton><Avatar sx={{ width: 32, height: 32, bgcolor: colors.selected, color: 'primary.main', fontSize: tokens.fontSizes.body }}>{session.user.displayName[0]}</Avatar></Stack>
 </Stack></Paper>
 {__MOCK__ && <Box sx={layoutSx.shell.demoBanner}><Alert severity="info" action={<Button color="inherit" size="small" onClick={() => setFeedback(true)}>Góp ý</Button>}>Frontend review: API được mô phỏng trong bộ nhớ, không gửi tin hoặc đặt hàng thật. Tải lại trang sẽ khởi tạo lại dữ liệu.</Alert><MockTools onChange={refresh} expanded={demoExpanded} setExpanded={setDemoExpanded} role={demoRole} setRole={setDemoRole} fault={demoFault} setFault={setDemoFault} dataset={demoDataset} setDataset={setDemoDataset} datasetStatus={demoStatus} setDatasetStatus={setDemoStatus}/></Box>}
 {logoutError && <Alert severity="error" sx={layoutSx.shell.statusBanner}>{logoutError}</Alert>}<ScopeEvents /><CommandRecovery />
 {!online && <Alert severity="warning" sx={layoutSx.shell.statusBanner}>Đang ngoại tuyến. Dữ liệu đang xem có thể cũ; mọi thao tác ghi bị tạm khóa.</Alert>}
 <Box component="main" id="main-content" tabIndex={-1} sx={[layoutSx.page.gutter, layoutSx.page.contentInsetBlock, layoutSx.shell.mainFill, { outline: 'none' }]}><Outlet key={`${shopId}:${membership.permissionVersion}`}/></Box>
 <Box component="footer" sx={[layoutSx.footer.insetInline, layoutSx.footer.insetBlock, layoutSx.shell.footerContent, { borderTop: 1, borderColor: 'divider' }]}><Typography variant="caption" color="text.secondary">BotSales AI · Graphite Gold · Frontend</Typography><Button size="small" onClick={() => setFeedback(true)}>Góp ý màn hình</Button></Box>
 </Box></Box><DraftNavigationGuard logoutPending={logoutPending} onCancelLogout={() => setLogoutPending(false)} onDiscardLogout={performLogout}/><FeedbackDialog open={feedback} onClose={() => setFeedback(false)}/></ScopeContext.Provider>;
}
function MockTools({ onChange, expanded, setExpanded, role, setRole, fault, setFault, dataset, setDataset, datasetStatus, setDatasetStatus }: {
    onChange: () => Promise<void>;
    expanded: boolean;
    setExpanded: Dispatch<SetStateAction<boolean>>;
    role: string;
    setRole: Dispatch<SetStateAction<string>>;
    fault: string;
    setFault: Dispatch<SetStateAction<string>>;
    dataset: string;
    setDataset: Dispatch<SetStateAction<string>>;
    datasetStatus: string;
    setDatasetStatus: Dispatch<SetStateAction<string>>;
}) {
    async function change(key: string, value: string) {
        if (!__MOCK__)
            return;
        setDatasetStatus('');
        try {
            const { setMockControl } = await import('../mocks/control');
            await setMockControl(key, value);
            if (key === 'role'||key==='dataset')
                await onChange();
            if (key === 'dataset')
                setDatasetStatus(value === 'large-customers' ? 'Đã tải 1.000 khách hàng tổng hợp vào API mô phỏng.' : value==='finance-empty'?'Đã tải shop tổng hợp với sổ và tồn bằng 0; cần mở sổ trước khi sử dụng báo cáo.':'Đã khôi phục dataset mặc định.');
            if (key === 'fault')
                setDatasetStatus('Trạng thái thử đã được áp dụng.');
            if (key === 'role')
                setDatasetStatus('Vai trò mô phỏng đã được áp dụng.');
        }
        catch (error) {
            setDatasetStatus(error instanceof Error ? error.message : 'Không thể đổi bộ dữ liệu mô phỏng.');
        }
    }
    const faultOptions = [
        ['normal', 'Bình thường'], ['slow', 'Tải chậm'], ['error', 'Lỗi truy vấn tiếp'], ['error_persistent', 'Lỗi danh sách thiết bị'], ['error_persistent_all', 'Lỗi API kéo dài'], ['empty_persistent', 'Danh sách rỗng (demo)'], ['forbidden', 'Mất quyền truy vấn tiếp'], ['conflict', 'Xung đột lần ghi tiếp'], ['unknown', 'Kết quả ghi chưa rõ'], ['budget_exceeded', 'Hết hạn mức AI mô phỏng'], ['tool_denied', 'Công cụ bị từ chối']
    ] as const;
    const controlSx = layoutSx.shell.demoControl;
    return <Box sx={layoutSx.shell.demoToolsBefore}>
        <Button aria-controls="mock-tools-controls" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} sx={layoutSx.shell.demoToggle}>
            {expanded ? 'Ẩn công cụ demo' : 'Công cụ demo'}
        </Button>
        {!expanded && <Typography data-testid="mock-tools-summary" variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere' }}>{role} · {faultOptions.find(([value]) => value === fault)?.[1] ?? fault} · {dataset === 'seed' ? 'Dataset mặc định' : dataset==='finance-empty'?'Shop mở sổ mới (tổng hợp)':'1.000 khách hàng tổng hợp'}</Typography>}
        {datasetStatus && !expanded && <Typography role="status" variant="caption" color="text.secondary">{datasetStatus}</Typography>}
        <Stack id="mock-tools-controls" direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} sx={[layoutSx.shell.demoControls, { display: expanded ? 'flex' : 'none' }]}><Typography variant="caption" color="text.secondary">Thử giao diện:</Typography><TextField select size="small" label="Vai trò mô phỏng" value={role} onChange={e => { setRole(e.target.value); void change('role', e.target.value); }} inputProps={{ 'aria-label': 'Vai trò mô phỏng' }} sx={controlSx}>{['owner', 'manager', 'sales', 'warehouse', 'accountant', 'bot_admin', 'viewer'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}</TextField><TextField select size="small" label="Trạng thái thử" value={fault} onChange={e => { setFault(e.target.value); void change('fault', e.target.value); }} inputProps={{ 'aria-label': 'Trạng thái thử' }} sx={controlSx}>{faultOptions.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField><TextField select size="small" label="Dataset mô phỏng" value={dataset} onChange={e => { setDataset(e.target.value); void change('dataset', e.target.value); }} inputProps={{ 'aria-label': 'Dataset mô phỏng' }} sx={controlSx}><MenuItem value="seed">Dataset mặc định</MenuItem><MenuItem value="large-customers">1.000 khách hàng tổng hợp</MenuItem><MenuItem value="finance-empty">Shop mở sổ mới (tổng hợp)</MenuItem></TextField>{datasetStatus && <Typography role="status" variant="caption" color="text.secondary">{datasetStatus}</Typography>}</Stack>
    </Box>;
}
