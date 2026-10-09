import { ActionGroup } from '../shared/ui/composition';
import { lazy, Suspense } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation, useRouteError, Link as RouterLink } from 'react-router-dom';
import {RouteMetadata} from './route-metadata';
import { Alert, Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { routeManifest } from '@botsales/contracts';
import type { CustomerConfirmationRequest } from '@botsales/contracts';
import { useScope } from '@/shared/model/scope';
import { useSession } from '@/shared/model/auth';
import { assertSchema } from '@/shared/api/validation';
import Shell from './Shell';
import {DraftNavigationGuard} from './DraftNavigationGuard';
import { layoutSx } from '@/shared/ui/layout';
const LoginPage = lazy(() => import('../modules/workspace').then(m => ({ default: m.LoginPage })));
const WorkspacesPage = lazy(() => import('../modules/workspace').then(m => ({ default: m.WorkspacesPage })));
const OnboardingPage = lazy(() => import('../modules/workspace').then(m => ({ default: m.OnboardingPage })));
const DashboardPage = lazy(() => import('../modules/dashboard').then(m => ({ default: m.DashboardPage })));
const InboxPage = lazy(() => import('../modules/inbox').then(m => ({ default: m.InboxPage })));
const CustomersPage = lazy(() => import('../modules/customers').then(m => ({ default: m.CustomersPage })));
const CustomerPage = lazy(() => import('../modules/customers').then(m => ({ default: m.CustomerPage })));
const ProductsPage = lazy(() => import('../modules/catalog').then(m => ({ default: m.ProductsPage })));
const ProductEditorPage = lazy(() => import('../modules/catalog').then(m => ({ default: m.ProductEditorPage })));
const CategoriesPage = lazy(() => import('../modules/catalog').then(m => ({ default: m.CategoriesPage })));
const ImportsPage = lazy(() => import('../modules/catalog').then(m => ({ default: m.ImportsPage })));
const ImportResultPage = lazy(() => import('../modules/catalog').then(m => ({ default: m.ImportResultPage })));
const InventoryPage = lazy(() => import('../modules/inventory').then(m => ({ default: m.InventoryPage })));
const WarehousesPage = lazy(() => import('../modules/inventory').then(m => ({ default: m.WarehousesPage })));
const AccountsPage = lazy(() => import('../modules/finance').then(m => ({ default: m.AccountsPage })));
const OpeningBalancesPage = lazy(() => import('../modules/finance').then(m => ({ default: m.OpeningBalancesPage })));
const LedgerPage = lazy(() => import('../modules/finance').then(m => ({ default: m.LedgerPage })));
const TrialBalancePage = lazy(() => import('../modules/finance').then(m => ({ default: m.TrialBalancePage })));
const BalanceSheetPage = lazy(() => import('../modules/finance').then(m => ({ default: m.BalanceSheetPage })));
const MovementsPage = lazy(() => import('../modules/inventory').then(m => ({ default: m.MovementsPage })));
const OrdersPage = lazy(() => import('../modules/orders').then(m => ({ default: m.OrdersPage })));
const NewOrderPage = lazy(() => import('../modules/orders').then(m => ({ default: m.NewOrderPage })));
const OrderDetailPage = lazy(() => import('../modules/orders').then(m => ({ default: m.OrderDetailPage })));
const CashflowPage = lazy(() => import('../modules/finance').then(m => ({ default: m.CashflowPage })));
const EntriesPage = lazy(() => import('../modules/finance').then(m => ({ default: m.EntriesPage })));
const ProfitLossPage = lazy(() => import('../modules/finance').then(m => ({ default: m.ProfitLossPage })));
const KnowledgePage = lazy(() => import('../modules/knowledge').then(m => ({ default: m.KnowledgePage })));
const KnowledgeDetailPage = lazy(() => import('../modules/knowledge').then(m => ({ default: m.KnowledgeDetailPage })));
const FeedbackPage = lazy(() => import('../modules/knowledge').then(m => ({ default: m.FeedbackPage })));
const BotConfigPage = lazy(() => import('../modules/bot').then(m => ({ default: m.BotConfigPage })));
const PlaygroundPage = lazy(() => import('../modules/bot').then(m => ({ default: m.PlaygroundPage })));
const EvaluationsPage = lazy(() => import('../modules/bot').then(m => ({ default: m.EvaluationsPage })));
const ChannelsPage = lazy(() => import('../modules/integrations').then(m => ({ default: m.ChannelsPage })));
const AIProvidersPage = lazy(() => import('../modules/integrations').then(m => ({ default: m.AIProvidersPage })));
const ReportsPage = lazy(() => import('../modules/reports').then(m => ({ default: m.ReportsPage })));
const TeamPage = lazy(() => import('../modules/workspace').then(m => ({ default: m.TeamPage })));
const ShopSettingsPage = lazy(() => import('../modules/workspace').then(m => ({ default: m.ShopSettingsPage })));
const AuditPage = lazy(() => import('../modules/workspace').then(m => ({ default: m.AuditPage })));
const PrivacyPage = lazy(() => import('../modules/workspace').then(m => ({ default: m.PrivacyPage })));
const ConsentConfirmationPage = lazy(() => import('../modules/workspace').then(m => ({ default: m.ConsentConfirmationPage })));
const JobPage = lazy(() => import('../modules/workspace').then(m => ({ default: m.JobPage })));
const OperationsPage = lazy(() => import('../modules/operations').then(m => ({ default: m.OperationsPage })));
const ApprovalsPage = lazy(() => import('../modules/operations').then(m => ({ default: m.ApprovalsPage })));
const NotificationsPage = lazy(() => import('../modules/notifications').then(m => ({ default: m.NotificationsPage })));
const DevicesPage = lazy(() => import('../modules/notifications').then(m => ({ default: m.DevicesPage })));
const FulfillmentPage = lazy(() => import('../modules/fulfillment').then(m => ({ default: m.FulfillmentPage })));
const ShipmentsPage = lazy(() => import('../modules/fulfillment').then(m => ({ default: m.ShipmentsPage })));
const ReturnsPage = lazy(() => import('../modules/orders').then(m => ({ default: m.ReturnsPage })));
const SuppliersPage = lazy(() => import('../modules/procurement').then(m => ({ default: m.SuppliersPage })));
const ReplenishmentPage = lazy(() => import('../modules/procurement').then(m => ({ default: m.ReplenishmentPage })));
const PurchasesPage = lazy(() => import('../modules/procurement').then(m => ({ default: m.PurchasesPage })));
const ReceiptsPage = lazy(() => import('../modules/procurement').then(m => ({ default: m.ReceiptsPage })));
const JournalsPage = lazy(() => import('../modules/finance').then(m => ({ default: m.JournalsPage })));
const ReconciliationPage = lazy(() => import('../modules/finance').then(m => ({ default: m.ReconciliationPage })));
const DebtsPage = lazy(() => import('../modules/finance').then(m => ({ default: m.DebtsPage })));
const AgentTeamPage = lazy(() => import('../modules/bot').then(m => ({ default: m.AgentTeamPage })));
const DigestsPage = lazy(() => import('../modules/operations').then(m => ({ default: m.DigestsPage })));
const MarketingPage = lazy(() => import('../modules/reports').then(m => ({ default: m.MarketingPage })));
const ServiceCasesPage = lazy(() => import('../modules/customers').then(m => ({ default: m.ServiceCasesPage })));
async function simulatedConfirmation(shopId: string, quoteId: string): Promise<CustomerConfirmationRequest> {
    if (!__MOCK__)
        throw new Error('Chức năng chỉ dành cho dữ liệu mô phỏng.');
    const { mockCustomerConfirmation } = await import('../mocks/service');
    const result: unknown = mockCustomerConfirmation(shopId, quoteId);
    assertSchema<CustomerConfirmationRequest>('CustomerConfirmationRequest', result);
    return result;
}
function OrderPage() { return <OrderDetailPage simulateCustomerConfirmation={__MOCK__ ? simulatedConfirmation : undefined}/>; }
export const pages: Record<string, ComponentType> = {
    R01: LoginPage,
    R02: WorkspacesPage,
    R03: OnboardingPage,
    R04: DashboardPage,
    R05: InboxPage,
    R06: InboxPage,
    R07: CustomersPage,
    R08: CustomerPage,
    R09: ProductsPage,
    R10: ProductEditorPage,
    R11: ProductEditorPage,
    R12: CategoriesPage,
    R13: ImportsPage,
    R14: ImportResultPage,
    R15: InventoryPage,
    R16: MovementsPage,
    R17: OrdersPage,
    R18: NewOrderPage,
    R19: OrderPage,
    R20: CashflowPage,
    R21: EntriesPage,
    R22: ProfitLossPage,
    R23: KnowledgePage,
    R24: KnowledgeDetailPage,
    R25: FeedbackPage,
    R26: BotConfigPage,
    R27: PlaygroundPage,
    R28: EvaluationsPage,
    R29: ChannelsPage,
    R30: AIProvidersPage,
    R31: ReportsPage,
    R32: TeamPage,
    R33: ShopSettingsPage,
    R34: AuditPage,
    R35: PrivacyPage,
    R36: JobPage,
    R37: OperationsPage,
    R38: ApprovalsPage,
    R39: NotificationsPage,
    R40: DevicesPage,
    R41: FulfillmentPage,
    R42: ShipmentsPage,
    R43: ReturnsPage,
    R44: SuppliersPage,
    R45: ReplenishmentPage,
    R46: PurchasesPage,
    R47: ReceiptsPage,
    R48: JournalsPage,
    R49: ReconciliationPage,
    R50: DebtsPage,
    R51: AgentTeamPage,
    R52: DigestsPage,
    R53: MarketingPage,
    R54: ServiceCasesPage,
    R55: WarehousesPage,
    R56: AccountsPage,
    R57: OpeningBalancesPage,
    R58: LedgerPage,
    R59: TrialBalancePage,
    R60: BalanceSheetPage,
    R61: ConsentConfirmationPage,
};
function Loading({ inset = false }: { inset?: boolean }) {
    const progress = <LinearProgress aria-label="Đang tải màn hình" />;
    return inset
        ? <Box sx={layoutSx.shell.pageFallbackInset} role="status">{progress}</Box>
        : <Box role="status">{progress}</Box>;
}
function PermissionGate({ permission, children }: {
    permission: string | null;
    children: ReactNode;
}) {
    const { membership, shop } = useScope();
    if (permission && !membership.permissions.some(p => p === permission))
        return <Alert severity="warning" action={<Button component={RouterLink} to="/workspaces">Đổi cửa hàng</Button>}>Bạn không có quyền truy cập màn hình này trong {shop.name}. Việc kiểm quyền thực thi vẫn thuộc backend.</Alert>;
    return <>{children}</>;
}
function GlobalGate({ children }: {
    children: ReactNode;
}) { const auth = useSession(); if (auth.loading)
    return <Loading />; if (!auth.session)
    return <Navigate to="/login" replace/>; return <><DraftNavigationGuard/>{children}</>; }
function RouteError() {
    const error = useRouteError();
    const shopScoped = useLocation().pathname.startsWith('/s/');
    const content = <Stack sx={layoutSx.query.stateGap}>
        <Typography component="h1" variant="h5">Không thể mở màn hình</Typography>
        <Alert severity="error">Có lỗi tải hoặc hiển thị. Bản nháp chưa gửi không được coi là đã lưu. {error instanceof Error ? 'Mở nhật ký đã khử dữ liệu nhạy cảm để chẩn đoán.' : ''}</Alert>
        <ActionGroup direction="row" >
            <Button onClick={() => window.location.reload()}>Tải lại</Button>
            <Button component={RouterLink} to="/workspaces">Chọn cửa hàng</Button>
        </ActionGroup>
    </Stack>;
    return shopScoped
        ? <Box component="div" tabIndex={-1} sx={{ outline: 'none' }}>{content}</Box>
        : <Box component="main" id="main-content" tabIndex={-1} sx={[layoutSx.shell.pageFallbackInset, { outline: 'none' }]}>{content}</Box>;
}
function NotFound() { return <Box component="main" id="main-content" tabIndex={-1} sx={[layoutSx.shell.pageFallbackInset, { outline: 'none' }]}><Typography variant="h4" component="h1">Không tìm thấy trang</Typography><Button component={RouterLink} to="/workspaces">Về cửa hàng</Button></Box>; }
export const router = createBrowserRouter([{element:<><RouteMetadata/><Outlet/></>,children:[
    { path: '/', element: <Navigate to="/workspaces" replace/> },
    ...routeManifest.routes.filter(r => !r.path.startsWith('/s/')).map(r => { const Page = pages[r.id]; if (!Page)
        throw new Error('Thiếu màn hình ' + r.id); const page = <Suspense fallback={<Loading inset />}><Page /></Suspense>; return { path: r.path, element: ['R01', 'R61'].includes(r.id) ? page : <GlobalGate>{page}</GlobalGate>, errorElement: <RouteError /> }; }),
    {
        path: '/s/:shopId', element: <Shell />, errorElement: <RouteError />, children: [
            { index: true, element: <Navigate to="overview" replace/> },
            ...routeManifest.routes.filter(r => r.path.startsWith('/s/')).map(r => { const Page = pages[r.id]; if (!Page)
                throw new Error('Thiếu màn hình ' + r.id); return {
                path: r.path.replace('/s/:shopId/', ''), element: <PermissionGate permission={r.readPermission}><Suspense fallback={<Loading />}><Page /></Suspense></PermissionGate>, errorElement: <RouteError />
            }; }),
        ]
    },
    { path: '*', element: <NotFound /> },
]}]);
