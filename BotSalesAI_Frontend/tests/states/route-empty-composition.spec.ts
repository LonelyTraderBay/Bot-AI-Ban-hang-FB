import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { startDemoServer } from '../session/demo-server.mjs';

type Route = { id: string; path: string };
type RouteManifest = { routes: Route[] };
const routeManifest = JSON.parse(
    readFileSync(new URL('../../botsales-kit/contracts/route-manifest.json', import.meta.url), 'utf8'),
) as RouteManifest;
const detailIds: Record<string, string> = {
    conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001',
    knowledgeId: 'k1', jobId: 'missing-job',
};
const emptyStateRoutes = new Set(['R07', 'R09', 'R12', 'R17', 'R21', 'R39', 'R44', 'R48', 'R50']);

function routePath(path: string) {
    return path
        .replace(':shopId', 'shop-demo')
        .replace(/:([A-Za-z]+)/g, (_, key: string) => detailIds[key] || 'missing');
}

async function chooseMockOption(page: import('@playwright/test').Page, label: string, value: string) {
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
}

test('empty collection responses render accessible empty states on canonical list routes', async ({ page }) => {
    const server = await startDemoServer();
    const checkedRouteIds: string[] = [];

    try {
        await page.goto(new URL('/s/shop-demo/overview', server.url).toString());
        await expect(page.getByRole('combobox', { name: 'Trạng thái thử' })).toBeVisible();
        await chooseMockOption(page, 'Trạng thái thử', 'Danh sách rỗng (demo)');

        for (const route of routeManifest.routes.filter(route => emptyStateRoutes.has(route.id))) {
            await page.evaluate(nextPath => {
                window.history.pushState({}, '', nextPath);
                window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
            }, routePath(route.path));

            const main = page.locator('main#main-content');
            await expect(main, `${route.id} should keep its page visible with empty API results`).toBeVisible();
            if (route.id === 'R39') {
                await expect(main.getByRole('status').filter({ hasText: 'Chưa có thông báo.' }), `${route.id} should expose a polite empty-state announcement for the card list`).toBeVisible();
            } else {
                const emptyCell = main.locator('tbody td[colspan]').first();
                await expect(emptyCell, `${route.id} should announce an empty table rather than render a blank success`).toBeVisible({ timeout: 10_000 });
                await expect(emptyCell.getByRole('status')).toBeVisible();
            }
            checkedRouteIds.push(route.id);
            if (checkedRouteIds.length % 3 === 0)
                console.log(`ROUTE_EMPTY_COMPOSITION_PROGRESS=${checkedRouteIds.length}/${emptyStateRoutes.size}`);
        }

        expect(new Set(checkedRouteIds).size).toBe(emptyStateRoutes.size);
        console.log(`ROUTE_EMPTY_COMPOSITION=${checkedRouteIds.length}/${emptyStateRoutes.size} RESULT=PASS`);
    } finally {
        await server.close();
    }
});
