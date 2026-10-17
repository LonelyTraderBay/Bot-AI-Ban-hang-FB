import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { openDemoControls } from '../session/demo-controls';
import { startDemoServer } from '../session/demo-server.mjs';

type Route = { id: string; path: string; readPermission: string | null; readOperations: string[]; actions: Array<{ label: string; permission: string | null; operationId: string }> };
type Operation = { responseSchema?: string };
type PermissionCatalog = { rolePresets: Record<string, string[]> };
const routeManifest = JSON.parse(readFileSync(new URL('../../../botsales-kit/contracts/route-manifest.json', import.meta.url), 'utf8')) as { routes: Route[] };
const operations = JSON.parse(readFileSync(new URL('../../packages/contracts/src/operations.json', import.meta.url), 'utf8')) as Record<string, Operation>;
const permissionCatalog = JSON.parse(readFileSync(new URL('../../../botsales-kit/contracts/permission-catalog.json', import.meta.url), 'utf8')) as PermissionCatalog;
const roles = Object.keys(permissionCatalog.rolePresets);
const listRoutes = routeManifest.routes.filter(route => route.path.startsWith('/s/') && route.readOperations.some(operation => operations[operation]?.responseSchema?.endsWith('ListResponse')));
const detailIds: Record<string, string> = { conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001', knowledgeId: 'k1', jobId: 'missing-job' };

function routePath(path: string) {
    return path.replace(':shopId', 'shop-demo').replace(/:([A-Za-z]+)/g, (_, key: string) => detailIds[key] || 'missing');
}
function canRead(route: Route, role: string) {
    return route.readPermission === null || permissionCatalog.rolePresets[role].includes(route.readPermission);
}
async function chooseMockOption(page: import('@playwright/test').Page, label: string, value: string) {
    await openDemoControls(page);
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
}
async function assertEmptyRoute(page: import('@playwright/test').Page, route: Route, role: string) {
    const main = page.locator('main#main-content');
    await expect(main, `${route.id} should render an empty-list result for ${role}`).toBeVisible();
    if (route.id === 'R29' || route.id === 'R30') {
        const emptyCopy = route.id === 'R29' ? 'Chưa có Page kết nối.' : 'Chưa có kết nối AI.';
        const actionName = route.id === 'R29' ? 'Kết nối Page' : 'Thêm kết nối AI';
        await expect(main.getByRole('status').filter({ hasText: emptyCopy })).toBeVisible();
        const operationId = route.id === 'R29' ? 'beginChannelConnect' : 'createAIConnection';
        const action = route.actions.find(candidate => candidate.operationId === operationId);
        expect(action, `${route.id} action must be declared by the canonical route manifest`).toBeTruthy();
        const roleCanAct = !action?.permission || permissionCatalog.rolePresets[role].includes(action.permission);
        await expect(main.getByRole('button', { name: actionName, exact: true })).toHaveCount(roleCanAct ? 1 : 0);
    } else if (route.id === 'R39') {
        await expect(main.getByRole('status').filter({ hasText: 'Chưa có thông báo.' })).toBeVisible();
    } else if (route.id === 'R26') {
        await expect(main.getByRole('status').filter({ hasText: 'Không có kết nối AI trong danh sách hiện tại' })).toBeVisible();
    } else if (route.id === 'R52') {
        await expect(main.getByRole('status').filter({ hasText: 'Chưa có bản tin điều hành trong danh sách hiện tại.' })).toBeVisible();
    } else if (route.id === 'R58') {
        await expect(main.getByRole('status').filter({ hasText: 'Chưa có tài khoản sổ cái để lọc' })).toBeVisible();
        await expect(main.getByRole('table', { name: 'Sổ cái theo chứng từ' }).getByRole('row')).toHaveCount(5);
    } else if (route.id === 'R18') {
        await expect(main.getByText('Không tìm thấy khách phù hợp.', { exact: true })).toBeVisible();
    } else if (['R05', 'R06', 'R10', 'R11'].includes(route.id)) {
        const emptyCopy = route.id === 'R05' ? 'Chưa có hội thoại phù hợp.' : route.id === 'R06' ? 'Chưa có tin nhắn.' : 'Cửa hàng chưa có danh mục.';
        await expect(main.getByRole('status').filter({ hasText: emptyCopy })).toBeVisible();
    } else {
        const emptyCell = main.locator('tbody td[colspan]').first();
        await expect(emptyCell, `${route.id} should announce an empty table for ${role}`).toBeVisible({ timeout: 10_000 });
        await expect(emptyCell.getByRole('status')).toBeVisible();
    }
}

for (const role of roles) {
    test(`empty list state composition for ${role}`, async ({ page }) => {
        test.setTimeout(600_000);
        const server = await startDemoServer();
        try {
            await page.goto(new URL('/s/shop-demo/overview', server.url).toString());
            if (role !== 'owner') await chooseMockOption(page, 'Vai trò mô phỏng', role);
            await chooseMockOption(page, 'Trạng thái thử', 'Danh sách rỗng (demo)');
            const readableRoutes = listRoutes.filter(route => canRead(route, role));
            for (const route of readableRoutes) {
                await page.evaluate(nextPath => { window.history.pushState({}, '', nextPath); window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state })); }, routePath(route.path));
                await assertEmptyRoute(page, route, role);
                console.log(`BROWSER=${test.info().project.name} ROLE_STATE=empty ROLE=${role} ROUTE=${route.id} RESULT=PASS`);
            }
            console.log(`ROLE_EMPTY_LIST_COMPOSITION=${role}:${readableRoutes.length}/${listRoutes.filter(route => canRead(route, role)).length} RESULT=PASS`);
        } finally { await server.close(); }
    });
}