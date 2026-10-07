import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { evidenceRunId } from './evidence-run-id.mjs';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer({ cacheIsolationKey: 's12-query-state-profile-layout' });
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

async function setOperationDelay(page: Page, operation: string, delayMs: number | null) {
    await page.evaluate(async ({ operation, delayMs }) => {
        const mock = await import('/src/mocks/service.ts');
        mock.setOperationDelay(operation, delayMs);
    }, { operation, delayMs });
}

async function navigateClientSide(page: Page, pathname: string) {
    await page.evaluate(nextPath => {
        window.history.pushState({}, '', nextPath);
        window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    }, pathname);
}

function sourceFingerprints() {
    const root = process.cwd();
    const files = [
        'tests/ui-query-state-layout.spec.ts',
        'apps/web/src/modules/catalog/index.tsx',
        'apps/web/src/shared/ui/components.tsx',
        'apps/web/src/shared/ui/layout.ts',
        '../botsales-kit/contracts/route-manifest.json',
        'playwright.config.ts',
    ];
    return Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
}

const cases = [
    {
        id: 'R09',
        pathname: '/s/shop-demo/products',
        operation: 'listProducts',
        operationPath: '/shops/shop-demo/products',
        heading: 'Sản phẩm',
        expectedProfile: 'section',
        readySelector: 'table',
    },
    {
        id: 'R11',
        pathname: '/s/shop-demo/products/p1',
        operation: 'getProduct',
        operationPath: '/shops/shop-demo/products/p1',
        heading: 'Thông tin sản phẩm',
        expectedProfile: 'inline',
        readySelector: 'product-form',
    },
] as const;

for (const route of cases) {
    test(`S12 ${route.id} QueryState ${route.expectedProfile} profile preserves pending and ready layout`, async ({ page }, info) => {
        const pageErrors: string[] = [];
        const observations: Array<Record<string, unknown>> = [];
        page.on('pageerror', error => pageErrors.push(error.message));

        for (const width of [390, 806, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            await page.goto(new URL('/s/shop-demo/overview', demoUrl).toString());
            await page.locator('main h1').waitFor({ state: 'visible' });
            await setOperationDelay(page, route.operation, 1500);
            const responsePromise = page.waitForResponse(response => response.request().method() === 'GET'
                && new URL(response.url()).pathname.endsWith(route.operationPath));
            await navigateClientSide(page, route.pathname);
            const targetUrl = new URL(route.pathname, demoUrl).toString();
            await expect(page).toHaveURL(targetUrl);
            await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible();

            const progress = page.getByRole('progressbar', { name: 'Đang tải dữ liệu' });
            const loader = progress.locator('xpath=..');
            await expect(progress).toBeVisible();
            const pendingGeometry = await loader.evaluate(element => {
                const style = getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                return { minHeight: style.minHeight, height: rect.height };
            });
            if (route.expectedProfile === 'section') {
                expect(pendingGeometry.minHeight, `${route.id} ${width}px section profile min-height`).toBe('240px');
                expect(pendingGeometry.height, `${route.id} ${width}px section profile height`).toBeGreaterThanOrEqual(240);
            } else {
                expect(pendingGeometry.minHeight, `${route.id} ${width}px inline profile min-height`).not.toBe('240px');
                expect(pendingGeometry.height, `${route.id} ${width}px inline profile intrinsic height`).toBeLessThan(120);
            }

            const response = await responsePromise;
            expect(response.status(), `${route.id} synthetic ${route.operation} response`).toBe(200);
            await expect(progress).toHaveCount(0);
            if (route.readySelector === 'table') await expect(page.getByRole('table')).toBeVisible();
            else await expect(page.getByRole('textbox', { name: 'Tên sản phẩm' })).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route.id} ${width}px document width`).toBe(width);
            observations.push({ routeId: route.id, pathname: route.pathname, viewport: { width, height: 900 }, profile: route.expectedProfile, pendingGeometry, responseStatus: response.status(), ready: true });
            await setOperationDelay(page, route.operation, null);
        }

        expect(pageErrors, `${route.id} page errors`).toEqual([]);
        const report = {
            schemaVersion: 1,
            step: 'S12',
            capturedAt: new Date().toISOString(),
            result: 'PASS',
            scope: 'Local React Frontend with synthetic MSW; browser pending-to-ready observations for a section and inline QueryState profile.',
            routeId: route.id,
            pathname: route.pathname,
            browser: info.project.name,
            expectedWidths: [390, 806, 1440],
            observations,
            pageErrors,
            sourceFingerprints: sourceFingerprints(),
        };
        const output = path.join(process.cwd(), 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007', `S12-query-state-${route.id}-${info.project.name}-after-profile-${evidenceRunId}.json`);
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        await info.attach(path.basename(output), {
            body: JSON.stringify(report, null, 2),
            contentType: 'application/json',
        });
    });
}
