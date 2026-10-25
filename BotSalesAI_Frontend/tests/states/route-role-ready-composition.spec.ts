import { openDemoControls, waitForDemoMenu, navigateDemoAndRead } from '../session/demo-controls';
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { startDemoServer } from '../session/demo-server.mjs';

// Each role has its own page/context, clock and response map; only the server is shared.
test.describe.configure({ mode: 'parallel' });

type Route = { id: string; path: string; title: string; readPermission: string | null; readOperations: string[] };
type RouteManifest = { routes: Route[] };
type PermissionCatalog = { rolePresets: Record<string, string[]> };
type OperationIndex = Record<string, { path: string }>;
const routeManifest = JSON.parse(readFileSync(new URL('../../../botsales-kit/contracts/route-manifest.json', import.meta.url), 'utf8')) as RouteManifest;
const permissionCatalog = JSON.parse(readFileSync(new URL('../../../botsales-kit/contracts/permission-catalog.json', import.meta.url), 'utf8')) as PermissionCatalog;
const operationIndex = JSON.parse(readFileSync(new URL('../../packages/contracts/src/operations.json', import.meta.url), 'utf8')) as OperationIndex;
const roles = Object.keys(permissionCatalog.rolePresets);
const privateRoutes = routeManifest.routes.filter(route => route.path.startsWith('/s/'));
const noSeedJobRoutes = new Set(['R14', 'R36']);
const operationPathPatterns = Object.fromEntries(Object.entries(operationIndex).map(([operation, spec]) => [
    operation,
    new RegExp(`${spec.path.split('/').map(segment => segment.startsWith('{') && segment.endsWith('}') ? '[^/]+' : segment).join('/')}$`),
]));
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

async function chooseRole(page: import('@playwright/test').Page, role: string) {
    if (role === 'owner') return;
    await openDemoControls(page);
    await page.getByRole('combobox', { name: 'Vai trò mô phỏng' }).click();
    await waitForDemoMenu(page, 'Vai trò mô phỏng');
    await page.getByRole('option', { name: role, exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Vai trò mô phỏng đã được áp dụng.' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Vai trò mô phỏng' })).toHaveText(role);
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

test.describe('ready route content renders for every role granted read access by the canonical contract', () => {
    for (const role of roles) {
        test(`ready route content for ${role}`, async ({ page }) => {
            test.setTimeout(600_000);
            // A real shop-midnight rollover changes date-based query keys between the two walks.
            // Keep timers advancing from a stable midday fixture so staleTime still expires.
            await page.clock.install({ time: new Date('2026-10-23T05:00:00Z') });
            const browser = test.info().project.name;
            const browserVersion = page.context().browser()?.version() || 'unknown';
            console.log(`BROWSER=${browser} VERSION=${browserVersion}`);
            const pageErrors: string[] = [];
            page.on('pageerror', error => pageErrors.push(error.message));
            const operationStatuses = new Map<string, number>();
            page.on('response', response => {
                const pathname = new URL(response.url()).pathname;
                const operation = Object.entries(operationPathPatterns).find(([, pattern]) => pattern.test(pathname))?.[0];
                if (operation) operationStatuses.set(operation, response.status());
            });
            const readableRoutes = privateRoutes.filter(route => canRead(route, role));
            const loadedRouteLocations = new Map<string, string>();
            const bootstrap = privateRoutes.find(route => route.id === 'R39');
            if (!bootstrap || !operationPathPatterns[bootstrap.readOperations[0]]) throw new Error('Missing canonical notifications bootstrap.');
            const bootstrapRead = await navigateDemoAndRead(page, new URL(routePath(bootstrap.path), demoUrl).toString(),
                response => response.request().method() === 'GET'
                    && operationPathPatterns[bootstrap.readOperations[0]].test(new URL(response.url()).pathname));
            expect(bootstrapRead.status()).toBe(200);
            expect(await bootstrapRead.finished()).toBeNull();
            await chooseRole(page, role);
            await openDemoControls(page);
            await page.getByRole('combobox', { name: 'Trạng thái thử' }).click();
            await waitForDemoMenu(page, 'Trạng thái thử');
            await page.getByRole('option', { name: 'Bình thường', exact: true }).click();

            for (const route of readableRoutes) {
                // Marketing normalizes its URL from the first response, then loads a second query.
                const normalizedMarketingRead = route.id === 'R53' ? page.waitForResponse(response => {
                    const url = new URL(response.url());
                    return operationPathPatterns.getMarketingSummary.test(url.pathname)
                        && ['fromDate', 'toDate', 'bucket'].every(key => url.searchParams.has(key))
                        && response.status() === 200;
                }) : undefined;
                await page.evaluate(nextPath => {
                    window.history.pushState({}, '', nextPath);
                    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
                }, routePath(route.path));
                const main = page.locator('main#main-content');
                await expect(main, `${route.id} should render for ${role}`).toBeVisible();
                await expect(main.getByRole('heading').first(), `${route.id} should expose route content for ${role}`).toBeVisible();
                await expect.poll(() => new URL(page.url()).pathname, { message: `${route.id} should become the active router location for ${role}` }).toBe(routePath(route.path));
                await expect.poll(() => page.title(), { message: `${route.id} should update canonical route metadata for ${role}` }).toBe(`${route.title} · BotSales AI`);
                const primaryOperation = route.readOperations[0];
                await expect.poll(() => operationStatuses.has(primaryOperation), { message: `${route.id} should complete ${primaryOperation} before state changes for ${role}` }).toBe(true);
                await expect(main.getByText(/Đang tải/), `${route.id} should settle its visible loading state for ${role}`).toHaveCount(0, { timeout: 10_000 });
                await expect(main.getByRole('heading', { name: 'Không thể mở màn hình', exact: true }), `${route.id} should not fall through to the route error boundary for ${role}`).toHaveCount(0);
                if (normalizedMarketingRead) {
                    expect(await (await normalizedMarketingRead).finished()).toBeNull();
                    await expect(main.getByTestId('marketing-as-of')).toBeVisible();
                    const loadedUrl = new URL(page.url());
                    loadedRouteLocations.set(route.id, loadedUrl.pathname + loadedUrl.search);
                }
                const primaryStatus = operationStatuses.get(primaryOperation);
                if (primaryStatus === 200) {
                    console.log(`BROWSER=${browser} ROLE_STATE=success ROLE=${role} ROUTE=${route.id} RESULT=PASS`);
                }
                else if (noSeedJobRoutes.has(route.id) && primaryOperation === 'getJob' && primaryStatus === 404) {
                    console.log(`BROWSER=${browser} ROLE_STATE_NA=success ROLE=${role} ROUTE=${route.id} REASON=mock-no-resource-404 RESULT=PASS`);
                }
                else {
                    throw new Error(`${route.id} expected a successful primary read for ${role}; ${primaryOperation} returned HTTP ${primaryStatus}`);
                }
            }
            expect(pageErrors).toEqual([]);
            const readyRoutes = readableRoutes.filter(route => !noSeedJobRoutes.has(route.id));
            const noSeedRoutes = readableRoutes.filter(route => noSeedJobRoutes.has(route.id));
            console.log(`ROLE_READY_COMPOSITION=${role}:${readyRoutes.length}/${readyRoutes.length} RESULT=PASS`);
            if (noSeedRoutes.length)
                console.log(`ROLE_READY_NOT_APPLICABLE=${role}:${noSeedRoutes.map(route => route.id).join(',')} REASON=mock-no-resource-404`);

            const routeOwnedData = readableRoutes.filter(route => route.id !== 'R33' && !noSeedJobRoutes.has(route.id));
            await openDemoControls(page);
            await page.getByRole('combobox', { name: 'Trạng thái thử' }).click();
            await waitForDemoMenu(page, 'Trạng thái thử');
            await page.getByRole('option', { name: 'Lỗi API kéo dài', exact: true }).click();
            await expect(page.getByRole('status').filter({ hasText: 'Trạng thái thử đã được áp dụng.' })).toBeVisible();
            // useApi owns a 5-second staleTime; let every cached route query cross it before remounting.
            await page.clock.fastForward(5_200);
            for (const route of routeOwnedData) {
                await page.evaluate(nextPath => {
                    window.history.pushState({}, '', nextPath);
                    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
                }, loadedRouteLocations.get(route.id) || routePath(route.path));
                const main = page.locator('main#main-content');
                await expect.poll(() => page.title(), { message: `${route.id} should remain the active route while showing stale data for ${role}` }).toBe(`${route.title} · BotSales AI`);
                await expect(main.getByRole('heading').first(), `${route.id} should retain its loaded content for ${role}`).toBeVisible();
                await expect(main.getByText(/có thể đã cũ/i).first(), `${route.id} should explain when retained data may be stale for ${role}`).toBeVisible({ timeout: 15_000 });
                console.log(`BROWSER=${browser} ROLE_STATE=stale_or_offline ROLE=${role} ROUTE=${route.id} RESULT=PASS`);
            }
            if (role === 'owner' && readableRoutes.some(route => route.id === 'R33'))
                console.log(`BROWSER=${browser} ROLE_STATE_NA=stale_or_offline ROLE=owner ROUTE=R33 REASON=shared-shell-snapshot RESULT=PASS`);
            for (const route of readableRoutes.filter(route => noSeedJobRoutes.has(route.id))) {
                const status = operationStatuses.get(route.readOperations[0]);
                if (status !== 404) throw new Error(`${route.id} requires a seeded job for stale data; expected fixture HTTP 404, received ${status}`);
                console.log(`BROWSER=${browser} ROLE_STATE_NA=stale_or_offline ROLE=${role} ROUTE=${route.id} REASON=mock-no-resource-404 RESULT=PASS`);
            }
            expect(pageErrors).toEqual([]);
        });
    }
});
