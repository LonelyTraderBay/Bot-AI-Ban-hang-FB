import { openDemoControls } from './session/demo-controls';
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

type Route = { id: string; path: string; readPermission: string | null };
type RouteManifest = { routes: Route[] };
type PermissionCatalog = { rolePresets: Record<string, string[]> };

const routeManifest = JSON.parse(readFileSync(new URL('../../botsales-kit/contracts/route-manifest.json', import.meta.url), 'utf8')) as RouteManifest;
const permissionCatalog = JSON.parse(readFileSync(new URL('../../botsales-kit/contracts/permission-catalog.json', import.meta.url), 'utf8')) as PermissionCatalog;
const privateRoutes = routeManifest.routes.filter(route => route.path.startsWith('/s/'));
const roles = Object.keys(permissionCatalog.rolePresets);
const detailIds: Record<string, string> = {
    conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001',
    knowledgeId: 'k1', jobId: 'missing-job',
};

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

async function chooseRole(page: import('@playwright/test').Page, role: string) {
    await openDemoControls(page);
    await page.getByRole('combobox', { name: 'Vai trò mô phỏng' }).click();
    await page.getByRole('option', { name: role, exact: true }).click();
}

function routePath(path: string) {
    return path
        .replace(':shopId', 'shop-demo')
        .replace(/:([A-Za-z]+)/g, (_, key: string) => detailIds[key] || 'missing');
}

test('route read access matches canonical permissions for every demo role', async ({ page }) => {
    expect(privateRoutes.length).toBeGreaterThan(0);
    expect(roles.length).toBeGreaterThan(0);

    let checks = 0;
    const deniedMessage = page.getByText(/Bạn không có quyền truy cập màn hình này trong .+\. Việc kiểm quyền thực thi vẫn thuộc backend\./);

    for (const role of roles) {
        await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
        await openDemoControls(page);
        await expect(page.getByRole('combobox', { name: 'Vai trò mô phỏng' })).toBeVisible();
        if (role !== 'owner')
            await chooseRole(page, role);
        const permissions = permissionCatalog.rolePresets[role];

        for (const route of privateRoutes) {
            const expectedDenied = Boolean(route.readPermission && !permissions.includes(route.readPermission));
            const path = routePath(route.path);
            await page.evaluate(nextPath => {
                window.history.pushState({}, '', nextPath);
                window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
            }, path);

            if (expectedDenied)
                await expect(deniedMessage).toBeVisible();
            else
                await expect(deniedMessage).toHaveCount(0);

            checks += 1;
        }
    }

    console.log(`ROUTE_ROLE_MATRIX_CASES=${checks} ROLES=${roles.length} PRIVATE_ROUTES=${privateRoutes.length} RESULT=PASS`);
    expect(checks).toBe(privateRoutes.length * roles.length);
});
