import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

type Route = { id: string; path: string; title: string; module: string };
type RouteManifest = { routes: Route[] };

const root = process.cwd();
const artifactRoot = path.join(root, 'apps/web/dist-demo');
const manifest = JSON.parse(fs.readFileSync(path.join(root, '../botsales-kit/contracts/route-manifest.json'), 'utf8')) as RouteManifest;
const detailIds: Record<string, string> = {
    conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001',
    knowledgeId: 'k1', jobId: 'missing-job',
};

function filesUnder(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? filesUnder(file) : [file];
    });
}

function artifactFingerprint() {
    const files = filesUnder(artifactRoot).sort((left, right) => left.localeCompare(right));
    const digest = createHash('sha256');
    for (const file of files) {
        digest.update(path.relative(artifactRoot, file).replaceAll('\\', '/'));
        digest.update('\0');
        digest.update(fs.readFileSync(file));
        digest.update('\0');
    }
    return { sha256: digest.digest('hex'), fileCount: files.length, files: files.map(file => path.relative(artifactRoot, file).replaceAll('\\', '/')) };
}

function routePath(route: Route) {
    return route.path
        .replace(':shopId', 'shop-demo')
        .replace(/:([A-Za-z]+)/g, (_, key: string) => detailIds[key] || 'missing');
}

const fingerprint = artifactFingerprint();

test('built demo artifact loads React and its synthetic API from the isolated Vite preview', async ({ page, browserName }) => {
    const pageErrors: string[] = [];
    const writes: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
        if (request.method() !== 'GET' && new URL(request.url()).pathname.startsWith('/api/')) writes.push(request.method());
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    const sessionPromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v2/session', { timeout: 20_000 });
    const documentResponse = await page.goto('/s/shop-demo/overview', { waitUntil: 'domcontentloaded' });
    const sessionResponse = await sessionPromise;
    expect(new URL(page.url()).port).toBe('4174');
    expect(documentResponse?.status()).toBe(200);
    expect(sessionResponse.status()).toBe(200);
    await expect(page.locator('main#main-content h1').first()).toBeVisible();
    await expect(page.locator('[aria-label="Dữ liệu mô phỏng"]')).toBeVisible();
    const workerResponse = await page.request.get(new URL('/mockServiceWorker.js', page.url()).toString());
    expect(workerResponse.status()).toBe(200);
    const browserAssets = await page.evaluate(() => performance.getEntriesByType('resource')
        .map(resource => new URL(resource.name).pathname)
        .filter(resourcePath => resourcePath.startsWith('/assets/'))
        .sort());
    expect(browserAssets.some(asset => asset.endsWith('.js'))).toBe(true);
    expect(browserAssets.some(asset => asset.endsWith('.css'))).toBe(true);
    expect(pageErrors).toEqual([]);
    expect(writes).toEqual([]);
    console.log(`[built-demo-artifact] ${JSON.stringify({ browser: browserName, baseURL: new URL(page.url()).origin, route: new URL(page.url()).pathname, artifact: fingerprint, browserAssets, sessionStatus: sessionResponse.status(), workerStatus: workerResponse.status(), pageErrors: pageErrors.length, apiWrites: writes.length })}`);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }] as const) {
    test(`built demo serves all ${manifest.routes.length} manifest routes at ${viewport.width}px without shell overflow`, async ({ page, browserName }) => {
        test.setTimeout(300_000);
        const pageErrors: string[] = [];
        const issues: string[] = [];
        const observations: Array<Record<string, unknown>> = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        await page.setViewportSize(viewport);
        expect(new URL(page.url()).port).toBe('4174');

        for (const route of manifest.routes) {
            const pathName = routePath(route);
            let headingText = '';
            let geometry: Record<string, number | null> = {};
            try {
                const response = await page.goto(pathName, { waitUntil: 'domcontentloaded' });
                if (!response || response.status() !== 200) issues.push(`${route.id} ${pathName}: document HTTP ${response?.status() ?? 'missing'}`);
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
            observations.push({ routeId: route.id, path: pathName, title: route.title, module: route.module, heading: headingText, rendered: Boolean(headingText), ...geometry });
        }

        const report = {
            schemaVersion: 1,
            task: 'UI028.W32',
            scope: 'Built local React demo artifact served by isolated Vite preview; synthetic MSW only',
            artifact: fingerprint,
            browser: browserName,
            viewport,
            routeManifest: '../botsales-kit/contracts/route-manifest.json',
            expectedRoutes: manifest.routes.length,
            renderedRoutes: observations.filter(item => item.rendered).length,
            pageErrors,
            issues,
            observations,
        };
        const output = path.join(root, 'evidence/frontend-ui-improvements/UI028/W32', `built-demo-routes-${browserName}-${viewport.width}-current-20261006.json`);
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        console.log(`[built-demo-routes] ${JSON.stringify({ browser: browserName, width: viewport.width, routes: report.renderedRoutes, issues: issues.length, pageErrors: pageErrors.length, artifactSha256: fingerprint.sha256, evidence: path.relative(root, output) })}`);

        expect(manifest.routes).toHaveLength(54);
        expect(report.renderedRoutes).toBe(54);
        expect(issues).toEqual([]);
        expect(pageErrors).toEqual([]);
    });
}
