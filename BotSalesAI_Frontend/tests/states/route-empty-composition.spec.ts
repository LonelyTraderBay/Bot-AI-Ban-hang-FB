import { openDemoControls } from '../session/demo-controls';
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { startDemoServer } from '../session/demo-server.mjs';

type Route = { id: string; path: string; readOperations: string[] };
type RouteManifest = { routes: Route[] };
const routeManifest = JSON.parse(
    readFileSync(new URL('../../../botsales-kit/contracts/route-manifest.json', import.meta.url), 'utf8'),
) as RouteManifest;
const operations = JSON.parse(readFileSync(new URL('../../packages/contracts/src/operations.json', import.meta.url), 'utf8')) as Record<string, { responseSchema?: string }>;
const listRoutes = routeManifest.routes.filter(route => route.path.startsWith('/s/') && route.readOperations.some(operation => operations[operation]?.responseSchema?.endsWith('ListResponse')));
const permissionCatalog = JSON.parse(readFileSync(new URL('../../../botsales-kit/contracts/permission-catalog.json', import.meta.url), 'utf8')) as { rolePresets: Record<string, string[]> };
const roles = Object.keys(permissionCatalog.rolePresets);
const detailIds: Record<string, string> = {
    conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001',
    knowledgeId: 'k1', jobId: 'missing-job',
};


function routePath(path: string) {
    return path
        .replace(':shopId', 'shop-demo')
        .replace(/:([A-Za-z]+)/g, (_, key: string) => detailIds[key] || 'missing');
}

async function chooseMockOption(page: import('@playwright/test').Page, label: string, value: string) {
    if (['Vai trò mô phỏng', 'Trạng thái thử', 'Dataset mô phỏng'].includes(label)) await openDemoControls(page);
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
}

test('empty collection responses render accessible empty states on canonical list routes', async ({ page }) => {
    const server = await startDemoServer();
    const checkedRouteIds: string[] = [];

    try {
        await page.goto(new URL('/s/shop-demo/overview', server.url).toString());
        await openDemoControls(page);
        await expect(page.getByRole('combobox', { name: 'Trạng thái thử' })).toBeVisible();
        await chooseMockOption(page, 'Trạng thái thử', 'Danh sách rỗng (demo)');

        for (const route of listRoutes) {
            await page.evaluate(nextPath => {
                window.history.pushState({}, '', nextPath);
                window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
            }, routePath(route.path));

            const main = page.locator('main#main-content');
            await expect(main, `${route.id} should keep its page visible with empty API results`).toBeVisible();
            if (route.id === 'R29' || route.id === 'R30') {
                const emptyCopy = route.id === 'R29' ? 'Chưa có Page kết nối.' : 'Chưa có kết nối AI.';
                const actionName = route.id === 'R29' ? 'Kết nối Page' : 'Thêm kết nối AI';
                await expect(main.getByRole('status').filter({ hasText: emptyCopy }), `${route.id} should expose an accessible empty card state`).toBeVisible();
                await expect(main.getByRole('button', { name: actionName, exact: true }), `${route.id} should keep the action inside the empty state and avoid a duplicate header action`).toHaveCount(1);
            } else if (route.id === 'R39') {
                await expect(main.getByRole('status').filter({ hasText: 'Chưa có thông báo.' }), `${route.id} should expose a polite empty-state announcement for the card list`).toBeVisible();
            } else if (route.id === 'R26') {
                await expect(main.getByRole('status').filter({ hasText: 'Không có kết nối AI trong danh sách hiện tại' }), `${route.id} should explain the empty connection lookup`).toBeVisible();
            } else if (route.id === 'R52') {
                await expect(main.getByRole('status').filter({ hasText: 'Chưa có bản tin điều hành trong danh sách hiện tại.' }), `${route.id} should announce the empty digest list`).toBeVisible();
            } else if (route.id === 'R58') {
                await expect(main.getByRole('status').filter({ hasText: 'Chưa có tài khoản sổ cái để lọc' }), `${route.id} should explain that the account filter is empty`).toBeVisible();
                await expect(main.getByRole('table', { name: 'Sổ cái theo chứng từ' }).getByRole('row')).toHaveCount(5);
            } else if (route.id === 'R18') {
                await expect(main.getByText('Không tìm thấy khách phù hợp.', { exact: true }), `${route.id} should explain the empty customer lookup`).toBeVisible();
            } else if (['R05', 'R06', 'R10', 'R11'].includes(route.id)) {
                const emptyCopy = route.id === 'R05' ? 'Chưa có hội thoại phù hợp.' : route.id === 'R06' ? 'Chưa có tin nhắn.' : 'Cửa hàng chưa có danh mục.';
                await expect(main.getByRole('status').filter({ hasText: emptyCopy }), `${route.id} should announce the empty route lookup`).toBeVisible();
            } else {
                const emptyCell = main.locator('tbody td[colspan]').first();
                await expect(emptyCell, `${route.id} should announce an empty table rather than render a blank success`).toBeVisible({ timeout: 10_000 });
                await expect(emptyCell.getByRole('status')).toBeVisible();
            }
            checkedRouteIds.push(route.id);
            if (checkedRouteIds.length % 3 === 0)
                console.log(`ROUTE_EMPTY_COMPOSITION_PROGRESS=${checkedRouteIds.length}/${listRoutes.length}`);
        }

        expect(checkedRouteIds).toEqual(listRoutes.map(route => route.id));
        console.log(`ROUTE_EMPTY_COMPOSITION=${checkedRouteIds.length}/${listRoutes.length} RESULT=PASS`);
        console.log(`ROUTE_EMPTY_COMPOSITION_IDS=${checkedRouteIds.join(',')}`);
    } finally {
        await server.close();
    }
});


for (const role of roles) {
    test(`R52 empty digest state is accessible for ${role}`, async ({ page }) => {
        const server = await startDemoServer();
        try {
            await page.goto(new URL('/s/shop-demo/overview', server.url).toString());
            if (role !== 'owner') await chooseMockOption(page, 'Vai trò mô phỏng', role);
            await chooseMockOption(page, 'Trạng thái thử', 'Danh sách rỗng (demo)');
            await page.evaluate(() => { window.history.pushState({}, '', '/s/shop-demo/operations/digests'); window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state })); });
            const main = page.locator('main#main-content');
            await expect(main.getByRole('status').filter({ hasText: 'Chưa có bản tin điều hành trong danh sách hiện tại.' }), `R52 should announce empty digests for ${role}`).toBeVisible();
            console.log(`BROWSER=${test.info().project.name} ROLE_STATE=empty ROLE=${role} ROUTE=R52 RESULT=PASS`);
        } finally { await server.close(); }
    });
}
