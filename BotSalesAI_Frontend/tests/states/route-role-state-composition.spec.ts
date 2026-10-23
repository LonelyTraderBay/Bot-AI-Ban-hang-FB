import { openDemoControls } from '../session/demo-controls';
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { startDemoServer } from '../session/demo-server.mjs';
import { assertEmptyTable } from '../session/assert-empty-table';

type Route = { id: string; path: string; readPermission: string | null; readOperations: string[]; actions: Array<{ label: string; permission: string | null; operationId: string }> };
type RouteManifest = { routes: Route[] };
type PermissionCatalog = { rolePresets: Record<string, string[]> };
type Operation = { responseSchema?: string };
const routeManifest = JSON.parse(readFileSync(new URL('../../../botsales-kit/contracts/route-manifest.json', import.meta.url), 'utf8')) as RouteManifest;
const permissionCatalog = JSON.parse(readFileSync(new URL('../../../botsales-kit/contracts/permission-catalog.json', import.meta.url), 'utf8')) as PermissionCatalog;
const operations = JSON.parse(readFileSync(new URL('../../packages/contracts/src/operations.json', import.meta.url), 'utf8')) as Record<string, Operation>;
const roles = Object.keys(permissionCatalog.rolePresets);
const privateRoutes = routeManifest.routes.filter(route => route.path.startsWith('/s/'));
const emptyStateRoutes = privateRoutes.filter(route => route.readOperations.some(operation => operations[operation]?.responseSchema?.endsWith('ListResponse')));
const routeSpecificErrorRoutes = privateRoutes.filter(route => route.id !== 'R33');
const detailIds: Record<string, string> = {
    conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001',
    knowledgeId: 'k1', jobId: 'missing-job',
};

function routePath(path: string) {
    return path
        .replace(':shopId', 'shop-demo')
        .replace(/:([A-Za-z]+)/g, (_, key: string) => detailIds[key] || 'missing');
}

function canRead(route: Route, role: string) {
    return route.readPermission === null || permissionCatalog.rolePresets[role].includes(route.readPermission);
}

async function chooseMockOption(page: import('@playwright/test').Page, label: string, value: string) {
    await openDemoControls(page);
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: true }).click({ timeout: 10_000 });
}

async function chooseRole(page: import('@playwright/test').Page, role: string) {
    if (role === 'owner') return;
    await chooseMockOption(page, 'Vai trò mô phỏng', role);
    await expect(page.getByRole('status').filter({ hasText: 'Vai trò mô phỏng đã được áp dụng.' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Vai trò mô phỏng' })).toHaveText(role);
}

async function setRouteReadDelays(page: import('@playwright/test').Page, operations: string[], delayMs: number | null) {
    await page.evaluate(async ({ operations, delayMs }) => {
        const mock = await import('/src/mocks/service.ts');
        for (const operation of operations) mock.setOperationDelay(operation, delayMs);
    }, { operations, delayMs });
}

async function navigateWithinDemo(page: import('@playwright/test').Page, path: string) {
    await page.evaluate(nextPath => {
        window.history.pushState({}, '', nextPath);
        window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    }, routePath(path));
}

let demoUrl = '';
let stopDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    stopDemo = server.close;
});

test.afterAll(async () => {
    await stopDemo?.();
});

test.describe('route read states render under every role allowed by the canonical route contract', () => {
    for (const role of roles) {
        test(`API error and empty states for ${role}`, async ({ page }) => {
            test.setTimeout(600_000);
            const browser = test.info().project.name;
            const readableErrorRoutes = routeSpecificErrorRoutes.filter(route => canRead(route, role));
            const readableEmptyRoutes = emptyStateRoutes.filter(route => canRead(route, role));
            // R37/R52 are readable by every role; use one as bootstrap and verify it from a fresh page.
            const bootstrapRoute = privateRoutes.find(route => route.id === 'R37');
            const secondaryBootstrapRoute = privateRoutes.find(route => route.id === 'R52');
            if (!bootstrapRoute || !secondaryBootstrapRoute || !canRead(bootstrapRoute, role) || !canRead(secondaryBootstrapRoute, role)) throw new Error('R37 and R52 must remain readable by every simulated role.');
            await page.goto(new URL(routePath(bootstrapRoute.path), demoUrl).toString());
            await chooseRole(page, role);
            await chooseMockOption(page, 'Trạng thái thử', 'Lỗi API kéo dài');

            for (const route of readableErrorRoutes.filter(route => route.id !== 'R37')) {
                await navigateWithinDemo(page, route.path);
                const main = page.locator('main#main-content');
                await expect(main, `${route.id} should render its route content for ${role}`).toBeVisible();
                if (route.id === 'R10') {
                    await expect(main.getByRole('alert').filter({ hasText: 'Không tải được danh mục' }), `${route.id} should report the failed category lookup for ${role}`).toBeVisible({ timeout: 10_000 });
                } else {
                    await expect(main.locator('[role="alert"], [role="status"]').filter({ hasText: 'API mô phỏng đang lỗi liên tục' }).first(), `${route.id} should expose the failed read for ${role}`).toBeVisible({ timeout: 10_000 });
                }
                await expect(page.locator('.MuiSnackbar-root').filter({ hasText: /thành công|đã lưu|đã tạo|đã cập nhật|hoàn tất|success/i }), `${route.id} must not claim success for ${role} while the read fails`).toHaveCount(0);
                console.log(`BROWSER=${browser} ROLE_STATE=error ROLE=${role} ROUTE=${route.id} RESULT=PASS`);
            }

            const secondaryPage = await page.context().newPage();
            try {
                await secondaryPage.goto(new URL(routePath(secondaryBootstrapRoute.path), demoUrl).toString());
                await chooseRole(secondaryPage, role);
                await chooseMockOption(secondaryPage, 'Trạng thái thử', 'Lỗi API kéo dài');
                await navigateWithinDemo(secondaryPage, bootstrapRoute.path);
                const bootstrapMain = secondaryPage.locator('main#main-content');
                await expect(bootstrapMain, `R37 should render its route content for ${role}`).toBeVisible();
                await expect(bootstrapMain.locator('[role="alert"], [role="status"]').filter({ hasText: 'API mô phỏng đang lỗi liên tục' }).first(), `R37 should expose the failed read for ${role}`).toBeVisible({ timeout: 10_000 });
                await expect(secondaryPage.locator('.MuiSnackbar-root').filter({ hasText: /thành công|đã lưu|đã tạo|đã cập nhật|hoàn tất|success/i }), `R37 must not claim success for ${role} while the read fails`).toHaveCount(0);
                console.log(`BROWSER=${browser} ROLE_STATE=error ROLE=${role} ROUTE=R37 RESULT=PASS`);
            } finally {
                await secondaryPage.close();
            }

            // Start a clean page so failed error-state queries cannot remain cached when testing empty results.
            const emptyPage = await page.context().newPage();
            try {
                await emptyPage.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
                await chooseRole(emptyPage, role);
                await chooseMockOption(emptyPage, 'Trạng thái thử', 'Danh sách rỗng (demo)');
                for (const route of readableEmptyRoutes) {
                    await navigateWithinDemo(emptyPage, route.path);
                    const main = emptyPage.locator('main#main-content');
                    await expect(main, `${route.id} should render its page for ${role} with empty results`).toBeVisible();
                    if (route.id === 'R29' || route.id === 'R30') {
                        const emptyCopy = route.id === 'R29' ? 'Chưa có Page kết nối.' : 'Chưa có kết nối AI.';
                        const actionName = route.id === 'R29' ? 'Kết nối Page' : 'Thêm kết nối AI';
                        await expect(main.getByRole('status').filter({ hasText: emptyCopy }), `${route.id} should announce its empty card state for ${role}`).toBeVisible();
                        const actionOperationId = route.id === 'R29' ? 'beginChannelConnect' : 'createAIConnection';
                        const action = route.actions.find(candidate => candidate.operationId === actionOperationId);
                        expect(action, `${route.id} should declare the tested action in the canonical route manifest`).toBeTruthy();
                        const roleCanAct = !action?.permission || permissionCatalog.rolePresets[role].includes(action.permission);
                        await expect(main.getByRole('button', { name: actionName, exact: true }), `${route.id} should expose the empty-state action only when ${role} has its canonical permission`)
                            .toHaveCount(roleCanAct ? 1 : 0);
                    } else if (route.id === 'R39') {
                        await expect(main.getByRole('status').filter({ hasText: 'Chưa có thông báo.' }), `${route.id} should announce the empty notification list for ${role}`).toBeVisible();
                    } else if (route.id === 'R26') {
                        await expect(main.getByRole('status').filter({ hasText: 'Không có kết nối AI trong danh sách hiện tại' }), `${route.id} should explain the empty connection lookup for ${role}`).toBeVisible();
                    } else if (route.id === 'R52') {
                        await expect(main.getByRole('status').filter({ hasText: 'Chưa có bản tin điều hành trong danh sách hiện tại.' }), `${route.id} should announce empty digests for ${role}`).toBeVisible();
                    } else if (route.id === 'R58') {
                        await expect(main.getByRole('status').filter({ hasText: 'Chưa có tài khoản sổ cái để lọc' }), `${route.id} should explain the empty account filter for ${role}`).toBeVisible();
                        await expect(main.getByRole('table', { name: 'Sổ cái theo chứng từ' }).getByRole('row')).toHaveCount(5);
                    } else if (route.id === 'R18') {
                        await expect(main.getByText('Không tìm thấy khách phù hợp.', { exact: true }), `${route.id} should explain the empty customer lookup for ${role}`).toBeVisible();
                    } else if (['R05', 'R06', 'R10', 'R11'].includes(route.id)) {
                        const emptyCopy = route.id === 'R05' ? 'Chưa có hội thoại phù hợp.' : route.id === 'R06' ? 'Chưa có tin nhắn.' : 'Cửa hàng chưa có danh mục.';
                        await expect(main.getByRole('status').filter({ hasText: emptyCopy }), `${route.id} should announce the empty lookup for ${role}`).toBeVisible();
                    } else {
                        await assertEmptyTable(main, `${route.id} should announce an empty table for ${role}`);
                    }
                    console.log(`BROWSER=${browser} ROLE_STATE=empty ROLE=${role} ROUTE=${route.id} RESULT=PASS`);
                }
            } finally {
                await emptyPage.close();
            }
        });
    }
});

test.describe('route loading state appears for every readable route with route-owned data', () => {
    for (const role of roles) {
        test(`loading state for ${role}`, async ({ page }) => {
            test.setTimeout(600_000);
            const browser = test.info().project.name;
            const pageErrors: string[] = [];
            page.on('pageerror', error => pageErrors.push(error.message));
            const readableRoutes = privateRoutes.filter(route => canRead(route, role));

            for (const route of readableRoutes) {
                // R39 is also the bootstrap page used to reach the demo controls.
                // Start on the sibling device route so its notification query is cold.
                const setupPath = route.id === 'R39'
                    ? '/s/shop-demo/notifications/devices'
                    : '/s/shop-demo/notifications';
                await page.goto(new URL(setupPath, demoUrl).toString());
                await chooseRole(page, role);
                await chooseMockOption(page, 'Trạng thái thử', 'Tải chậm');
                await setRouteReadDelays(page, route.readOperations, 900);
                await navigateWithinDemo(page, route.path);
                const main = page.locator('main#main-content');
                await expect(main, `${route.id} should render for ${role}`).toBeVisible();
                const loading = main.getByText(/Đang tải/);
                if (route.id === 'R33') {
                    await expect(main.getByRole('heading').first(), `${route.id} should render using the shop snapshot already fetched by Shell`).toBeVisible();
                    await expect(loading, `${route.id} should not start a second route-owned fetch after Shell loaded the shop snapshot`).toHaveCount(0);
                    await setRouteReadDelays(page, route.readOperations, null);
                    console.log(`BROWSER=${browser} ROLE_STATE_NA=loading ROLE=${role} ROUTE=${route.id} REASON=shared-shell-snapshot RESULT=PASS`);
                    continue;
                }
                await expect(loading.first(), `${route.id} should expose at least one pending route read for ${role}`).toBeVisible({ timeout: 10_000 });
                await expect(loading, `${route.id} should leave the pending state after its delayed response for ${role}`).toHaveCount(0, { timeout: 10_000 });
                await expect(main.getByRole('heading').first(), `${route.id} should render page content after loading for ${role}`).toBeVisible();
                if (route.id === 'R14') {
                    await expect(main.getByRole('alert').filter({ hasText: 'Không tìm thấy dữ liệu trong cửa hàng hiện tại.' }), `${route.id} should finish loading with the expected not-found response for the deliberately missing fixture`).toBeVisible();
                }
                await setRouteReadDelays(page, route.readOperations, null);
                const resolved = route.id === 'R14' ? ' OUTCOME=EXPECTED_404' : '';
                console.log(`BROWSER=${browser} ROLE_STATE=loading ROLE=${role} ROUTE=${route.id}${resolved} RESULT=PASS`);
            }
            expect(pageErrors).toEqual([]);
        });
    }
});
