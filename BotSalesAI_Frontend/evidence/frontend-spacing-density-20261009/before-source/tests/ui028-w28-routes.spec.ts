import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { evidenceRunId } from './evidence-run-id.mjs';
import { startDemoServer } from './session/demo-server.mjs';

type Route = { id: string; path: string; title: string; module: string };
type RouteManifest = { routes: Route[] };

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, '../botsales-kit/contracts/route-manifest.json'), 'utf8')) as RouteManifest;
const detailIds: Record<string, string> = {
    conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001',
    knowledgeId: 'k1', jobId: 'missing-job',
};
const viewports = [{ width: 390, height: 844 }, { width: 1440, height: 900 }] as const;

let demoUrl = '';
let stopDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    stopDemo = server.close;
});

test.afterAll(async () => stopDemo?.());

function routePath(route: Route) {
    return route.path
        .replace(':shopId', 'shop-demo')
        .replace(/:([A-Za-z]+)/g, (_, key: string) => detailIds[key] || 'missing');
}

function profileFor(route: Route) {
    if (!route.path.startsWith('/s/')) return 'public';
    if (route.path.includes('/inbox')) return 'inbox';
    if (route.path.includes('/reports')) return 'report';
    if (route.path.endsWith('/overview')) return 'dashboard';
    if (route.path.includes('/settings/')) return 'settings';
    if (route.path.includes('/new') || route.path.includes('/imports')) return 'form-or-import';
    if (route.path.includes('/:')) return 'detail-or-workflow';
    return 'collection-or-workflow';
}

for (const viewport of viewports) {
    test(`UI028.W28 ${manifest.routes.length} canonical routes render with measured ${viewport.width}px layout geometry`, async ({ page, browserName }) => {
        test.setTimeout(300_000);
        const pageErrors: string[] = [];
        const issues: string[] = [];
        const observations: Array<Record<string, unknown>> = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        await page.setViewportSize(viewport);

        for (const route of manifest.routes) {
            const pathName = routePath(route);
            let headingText = '';
            let geometry: Record<string, number | null> = {};
            try {
                await page.goto(new URL(pathName, demoUrl).toString(), { waitUntil: 'domcontentloaded' });
                const heading = page.getByRole('heading').first();
                await heading.waitFor({ state: 'visible', timeout: 15_000 });
                headingText = (await heading.innerText()).trim();

                if (route.path.startsWith('/s/')) {
                    const main = page.locator('main#main-content');
                    await main.waitFor({ state: 'visible', timeout: 15_000 });
                    await main.getByRole('heading').first().waitFor({ state: 'visible', timeout: 15_000 });
                    await page.locator('[aria-label="Dữ liệu mô phỏng"]').waitFor({ state: 'visible', timeout: 15_000 });
                    if (await page.getByRole('heading', { name: 'Không thể mở màn hình', exact: true }).count())
                        issues.push(`${route.id} ${pathName}: router error boundary rendered`);
                } else if (await page.getByRole('heading', { name: 'Không tìm thấy trang', exact: true }).count()) {
                    issues.push(`${route.id} ${pathName}: public route fell through to not-found`);
                }

                geometry = await page.evaluate(() => {
                    const main = document.querySelector<HTMLElement>('main#main-content');
                    const heading = document.querySelector<HTMLElement>('main#main-content h1, main#main-content [role="heading"][aria-level="1"], h1');
                    const viewportWidth = document.documentElement.clientWidth;
                    const documentWidth = document.documentElement.scrollWidth;
                    if (!main) return { viewportWidth, documentWidth, pageOverflow: documentWidth - viewportWidth, mainPaddingInlineStart: null, mainPaddingInlineEnd: null, headingInsetFromMainContent: null };
                    const mainStyle = getComputedStyle(main);
                    const mainRect = main.getBoundingClientRect();
                    const headingRect = heading?.getBoundingClientRect();
                    const inlineStart = Number.parseFloat(mainStyle.paddingInlineStart) || 0;
                    return {
                        viewportWidth,
                        documentWidth,
                        pageOverflow: documentWidth - viewportWidth,
                        mainPaddingInlineStart: inlineStart,
                        mainPaddingInlineEnd: Number.parseFloat(mainStyle.paddingInlineEnd) || 0,
                        headingInsetFromMainContent: headingRect ? Math.round((headingRect.left - mainRect.left - inlineStart) * 100) / 100 : null,
                    };
                });

                if (route.path.startsWith('/s/')) {
                    const expectedGutter = viewport.width < 768 ? 16 : 24;
                    if (geometry.mainPaddingInlineStart !== expectedGutter || geometry.mainPaddingInlineEnd !== expectedGutter)
                        issues.push(`${route.id} ${pathName}: shell gutter ${geometry.mainPaddingInlineStart}/${geometry.mainPaddingInlineEnd}px, expected ${expectedGutter}px`);
                }
                if (typeof geometry.pageOverflow === 'number' && geometry.pageOverflow > 0)
                    issues.push(`${route.id} ${pathName}: document overflows viewport by ${geometry.pageOverflow}px`);
            } catch (error) {
                issues.push(`${route.id} ${pathName}: ${(error as Error).message}`);
            }
            observations.push({ routeId: route.id, path: pathName, title: route.title, profile: profileFor(route), heading: headingText, rendered: Boolean(headingText), ...geometry });
        }

        const report = {
            schemaVersion: 1,
            task: 'UI028.W28',
            scope: 'Local React Frontend with synthetic MSW; route smoke and shared shell geometry only',
            browser: browserName,
            viewport,
            routeManifest: '../botsales-kit/contracts/route-manifest.json',
            expectedRoutes: manifest.routes.length,
            renderedRoutes: observations.filter(item => item.rendered).length,
            pageErrors,
            issues,
            observations,
        };
        const output = path.join(root, 'evidence/frontend-ui-improvements/UI028/W28', `route-geometry-${browserName}-${viewport.width}-current-${evidenceRunId}.json`);
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        console.log(`[w28-route-geometry] ${JSON.stringify({ browser: browserName, width: viewport.width, routes: report.renderedRoutes, issues: issues.length, pageErrors: pageErrors.length, evidence: path.relative(root, output) })}`);

        expect(manifest.routes).toHaveLength(54);
        expect(report.renderedRoutes).toBe(54);
        expect(issues).toEqual([]);
        expect(pageErrors).toEqual([]);
    });
}
