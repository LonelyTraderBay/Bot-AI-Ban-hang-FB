import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { startDemoServer } from '../session/demo-server.mjs';

type Route = { id: string; path: string };
type RouteManifest = { routes: Route[] };
const routeManifest = JSON.parse(
    readFileSync(new URL('../../../botsales-kit/contracts/route-manifest.json', import.meta.url), 'utf8'),
) as RouteManifest;
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
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
}

test('every shop route composes the shared API error state with its page content', async ({ browser }) => {
    test.setTimeout(300_000);
    const server = await startDemoServer();
    const checkedRouteIds: string[] = [];

    try {
        const selectedRouteId = process.env.ROUTE_ERROR_TEST_ID;
        const shopRoutes = routeManifest.routes
            .filter(route => route.path.startsWith('/s/') && (!selectedRouteId || route.id === selectedRouteId));
        expect(shopRoutes).toHaveLength(selectedRouteId ? 1 : 51);

        for (const route of shopRoutes) {
            // Isolate each page's MSW service-worker client. Reusing a context after
            // closing dozens of pages can leave Firefox with stale service-worker clients.
            const context = await browser.newContext();
            const page = await context.newPage();
            try {
                const startingRoute = route.id === 'R39' || route.id === 'R33' ? '/s/shop-demo/overview' : '/s/shop-demo/notifications';
                await page.goto(new URL(startingRoute, server.url).toString());
                await expect(page.getByRole('combobox', { name: 'Trạng thái thử' })).toBeVisible({ timeout: 15_000 });
                await chooseMockOption(page, 'Trạng thái thử', 'Lỗi API kéo dài');
                await page.evaluate(nextPath => {
                    window.history.pushState({}, '', nextPath);
                    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
                }, routePath(route.path));

                const main = page.locator('main#main-content');
                await expect(main).toBeVisible();
                if (route.id === 'R10') {
                    const categoryError = main.getByRole('alert').filter({ hasText: 'Không tải được danh mục' });
                    await expect(categoryError, `${route.id} should explain when category choices cannot load`).toBeVisible({ timeout: 10_000 });
                    await chooseMockOption(page, 'Trạng thái thử', 'Bình thường');
                    await categoryError.getByRole('button', { name: 'Thử lại danh mục' }).click();
                    await expect(categoryError).toHaveCount(0);
                } else if (route.id === 'R33') {
                    await expect(main.getByRole('heading', { name: 'Thiết lập cửa hàng' }), 'R33 uses shop data already loaded by the shared shell').toBeVisible();
                    await chooseMockOption(page, 'Trạng thái thử', 'Bình thường');
                } else {
                    await expect(main.locator('[role="alert"], [role="status"]').filter({ hasText: 'API mô phỏng đang lỗi liên tục' }).first(), `${route.id} ${route.path} should expose the failed read`)
                        .toBeVisible({ timeout: 10_000 });
                    await chooseMockOption(page, 'Trạng thái thử', 'Bình thường');
                }
                if (route.id === 'R10') {
                    await expect(main.getByRole('combobox', { name: 'Danh mục' })).toBeVisible();
                }
                checkedRouteIds.push(route.id);
                if (checkedRouteIds.length % 10 === 0)
                    console.log(`ROUTE_ERROR_COMPOSITION_PROGRESS=${checkedRouteIds.length}/51`);
            } finally {
                await context.close();
            }
        }

        console.log(`ROUTE_ERROR_COMPOSITION=${checkedRouteIds.length}/${shopRoutes.length} RESULT=PASS`);
        expect(new Set(checkedRouteIds).size).toBe(shopRoutes.length);
    } finally {
        await server.close();
    }
});
