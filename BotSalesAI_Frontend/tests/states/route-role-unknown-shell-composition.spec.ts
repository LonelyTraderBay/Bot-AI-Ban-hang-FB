import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { openDemoControls } from '../session/demo-controls';
import { startDemoServer } from '../session/demo-server.mjs';

type Route = { id: string; path: string; title: string; readPermission: string | null; actions: Array<{ operationId: string; permission: string | null }> };
type PermissionCatalog = { rolePresets: Record<string, string[]> };
type OperationIndex = Record<string, { responseSchema?: string }>;
const routeManifest = JSON.parse(readFileSync(new URL('../../../botsales-kit/contracts/route-manifest.json', import.meta.url), 'utf8')) as { routes: Route[] };
const permissionCatalog = JSON.parse(readFileSync(new URL('../../../botsales-kit/contracts/permission-catalog.json', import.meta.url), 'utf8')) as PermissionCatalog;
const operationIndex = JSON.parse(readFileSync(new URL('../../packages/contracts/src/operations.json', import.meta.url), 'utf8')) as OperationIndex;
const roles = Object.keys(permissionCatalog.rolePresets);
const detailIds: Record<string, string> = {
    conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001', knowledgeId: 'k1', jobId: 'missing-job',
};

function routePath(path: string) {
    return path.replace(':shopId', 'shop-demo').replace(/:([A-Za-z]+)/g, (_, key: string) => detailIds[key] || 'missing');
}

function readableCommandRoutes(role: string) {
    const permissions = permissionCatalog.rolePresets[role];
    return routeManifest.routes.flatMap(route => {
        if (!route.path.startsWith('/s/') || (route.readPermission && !permissions.includes(route.readPermission))) return [];
        const action = route.actions.find(item => (!item.permission || permissions.includes(item.permission))
            && operationIndex[item.operationId]?.responseSchema === 'CommandResponse');
        return action ? [{ route, operation: action.operationId }] : [];
    });
}

let demoUrl = '';
let stopDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer({ runtime: 'dev' });
    demoUrl = server.url;
    stopDemo = server.close;
});

test.afterAll(async () => stopDemo?.());

async function chooseRole(page: import('@playwright/test').Page, role: string) {
    if (role === 'owner') return;
    await openDemoControls(page);
    await page.getByRole('combobox', { name: 'Vai trò mô phỏng' }).click();
    await page.getByRole('option', { name: role, exact: true }).click();
}

test.describe('unknown command recovery shell renders for each readable route and permitted action role', () => {
    for (const role of roles) {
        test(`unresolved command recovery shell for ${role}`, async ({ page }) => {
            test.setTimeout(300_000);
            const browser = test.info().project.name;
            const pageErrors: string[] = [];
            page.on('pageerror', error => pageErrors.push(error.message));
            await page.goto(new URL('/s/shop-demo/notifications', demoUrl).toString());
            await chooseRole(page, role);
            const commandRoutes = readableCommandRoutes(role);
            if (commandRoutes.length === 0) {
                const readableRoutes = routeManifest.routes.filter(route => route.path.startsWith('/s/')
                    && (!route.readPermission || permissionCatalog.rolePresets[role].includes(route.readPermission)));
                expect(readableRoutes.length, `${role} should still have readable routes`).toBeGreaterThan(0);
                expect(readableRoutes.some(route => route.actions.some(action => (!action.permission || permissionCatalog.rolePresets[role].includes(action.permission))
                    && operationIndex[action.operationId]?.responseSchema === 'CommandResponse'))).toBe(false);
                console.log(`BROWSER=${browser} ROLE_UNKNOWN_SHELL_NA=${role} READABLE_ROUTES=${readableRoutes.length} REASON=no-permitted-command-on-readable-routes RESULT=PASS`);
                expect(pageErrors).toEqual([]);
                return;
            }

            for (const { route, operation } of commandRoutes) {
                const pathname = routePath(route.path);
                await page.evaluate(nextPath => {
                    window.history.pushState({}, '', nextPath);
                    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
                }, pathname);
                const main = page.locator('main#main-content');
                await expect.poll(() => new URL(page.url()).pathname).toBe(pathname);
                await expect.poll(() => page.title()).toBe(`${route.title} · BotSales AI`);
                await expect(main.getByRole('heading').first(), `${route.id} should render before adding recovery state`).toBeVisible();

                const intentId = `uic07-${role}-${route.id}`;
                await page.evaluate(async ({ intentId, operation }) => {
                    const { rememberUnknown } = await import('/src/shared/api/intents.ts');
                    rememberUnknown({ intentId, commandId: `cmd-${intentId}`, shopId: 'shop-demo', operation: operation as never });
                }, { intentId, operation });
                const recovery = page.getByRole('alert').filter({ hasText: 'Có 1 thao tác chưa xác minh kết quả' });
                await expect(recovery, `${route.id} should display shared command recovery for ${role}`).toBeVisible();
                await expect(recovery).toContainText(`${operation} · mã đối chiếu ${intentId}`);
                await expect(main.getByRole('heading').first()).toBeVisible();
                console.log(`BROWSER=${browser} ROLE_STATE=command_unknown_shell ROLE=${role} ROUTE=${route.id} OPERATION=${operation} RESULT=PASS`);

                await page.evaluate(async intentId => {
                    const { resolveObservedIntent } = await import('/src/shared/api/intents.ts');
                    resolveObservedIntent(intentId);
                }, intentId);
                await expect(recovery).toHaveCount(0);
            }

            expect(pageErrors).toEqual([]);
            console.log(`ROLE_UNKNOWN_SHELL_COMPOSITION=${role}:${commandRoutes.length}/${commandRoutes.length} RESULT=PASS`);
        });
    }
});
