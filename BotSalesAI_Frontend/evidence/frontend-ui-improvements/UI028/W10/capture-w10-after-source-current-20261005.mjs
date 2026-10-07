import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const evidenceDir = path.join(root, 'evidence/frontend-ui-improvements/UI028/W10');
const reportPath = path.join(evidenceDir, 'render-after-source-edit-current-20261005.json');
if (fs.existsSync(reportPath)) throw new Error(`Refusing to overwrite render evidence: ${reportPath}`);
const sourceFiles = [
    'apps/web/src/modules/catalog/index.tsx',
    'apps/web/src/modules/catalog/imports.tsx',
    'apps/web/src/modules/catalog/import-file.ts',
    'apps/web/src/shared/ui/layout.ts',
    'apps/web/src/shared/ui/components.tsx',
    'apps/web/src/shared/ui/theme.ts',
    'botsales-kit/design/tokens.json',
    'botsales-kit/contracts/route-manifest.json',
];
const sha256 = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const viewports = [{ width: 390, height: 844 }, { width: 1280, height: 900 }];
const routes = [
    { id: 'R09', path: '/s/shop-demo/products' },
    { id: 'R10', path: '/s/shop-demo/products/new' },
    { id: 'R11', path: '/s/shop-demo/products/p1' },
    { id: 'R12', path: '/s/shop-demo/categories' },
    { id: 'R13', path: '/s/shop-demo/imports' },
];
const browser = await chromium.launch({ headless: true });
const observations = [];
const pageErrors = [];
const workflow = [];

try {
    for (const viewport of viewports) {
        const server = await startDemoServer({ cacheIsolationKey: `ui028-w10-after-${viewport.width}-20261005` });
        try {
            const page = await browser.newPage({ viewport });
            page.on('pageerror', error => pageErrors.push({ route: page.url(), message: error.message }));
            for (const route of routes) {
                await page.goto(new URL(route.path, server.url).toString(), { waitUntil: 'domcontentloaded' });
                await page.locator('#root').waitFor({ state: 'visible' });
                await page.waitForTimeout(500);
                const metrics = await page.evaluate(() => {
                    const rect = selector => {
                        const element = document.querySelector(selector);
                        if (!element) return null;
                        const box = element.getBoundingClientRect();
                        const style = getComputedStyle(element);
                        return {
                            x: box.x, y: box.y, width: box.width, height: box.height,
                            paddingTop: style.paddingTop, paddingRight: style.paddingRight,
                            paddingBottom: style.paddingBottom, paddingLeft: style.paddingLeft,
                            gap: style.gap, display: style.display, minWidth: style.minWidth,
                        };
                    };
                    return {
                        viewport: { width: innerWidth, height: innerHeight },
                        document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
                        main: rect('main#main-content'),
                        pageHeader: rect('main#main-content h1') ?? rect('main#main-content h2'),
                        surfaces: [...document.querySelectorAll('main#main-content .MuiPaper-root')].slice(0, 6).map(element => {
                            const box = element.getBoundingClientRect();
                            const style = getComputedStyle(element);
                            return { x: box.x, y: box.y, width: box.width, height: box.height, padding: style.padding, gap: style.gap };
                        }),
                        visibleHeadings: [...document.querySelectorAll('main h1,main h2')].filter(element => element.getBoundingClientRect().width > 0).slice(0, 8).map(element => element.textContent?.trim()),
                    };
                });
                const screenshot = `after-source-edit-${route.id}-${viewport.width}x${viewport.height}-current-20261005.png`;
                await page.screenshot({ path: path.join(evidenceDir, screenshot), fullPage: true });
                observations.push({ routeId: route.id, route: route.path, viewport, finalUrl: page.url(), metrics, screenshot });
            }

            const csv = [
                'sku,name,price,description,currency',
                'UI028-W10-BASELINE,Sản phẩm baseline W10,123000,Bản xem trước chỉ dùng fixture tổng hợp,VND',
            ].join('\n');
            await page.goto(new URL('/s/shop-demo/imports', server.url).toString(), { waitUntil: 'domcontentloaded' });
            await page.locator('input[type="file"]').setInputFiles({ name: 'ui028-w10-baseline.csv', mimeType: 'text/csv', buffer: Buffer.from(csv, 'utf8') });
            const dryRunResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/shops/shop-demo/imports'));
            await page.getByRole('button', { name: 'Kiểm tra trước khi nhập', exact: true }).click();
            await page.waitForURL(/\/s\/shop-demo\/imports\/job-/);
            const response = await dryRunResponse;
            await page.getByRole('heading', { name: 'Kết quả kiểm tra tệp', exact: true }).waitFor({ state: 'visible' });
            await page.waitForTimeout(350);
            const dryRunBody = await response.request().postDataJSON();
            const metrics = await page.evaluate(() => ({
                viewport: { width: innerWidth, height: innerHeight },
                document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
                main: (() => { const el = document.querySelector('main#main-content'); const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return { x: b.x, y: b.y, width: b.width, height: b.height, padding: s.padding, flex: s.flex }; })(),
                visibleHeadings: [...document.querySelectorAll('main h1,main h2')].filter(element => element.getBoundingClientRect().width > 0).slice(0, 8).map(element => element.textContent?.trim()),
                importRows: document.querySelectorAll('main tbody tr').length,
            }));
            const resultRoute = new URL(page.url()).pathname;
            const screenshot = `after-source-edit-R14-${viewport.width}x${viewport.height}-current-20261005.png`;
            await page.screenshot({ path: path.join(evidenceDir, screenshot), fullPage: true });
            observations.push({ routeId: 'R14', route: '/s/:shopId/imports/:jobId', resultRoute, viewport, metrics, screenshot });
            workflow.push({ viewport: viewport.width, route: resultRoute, dryRunOnly: true, commitRequested: false, mapping: dryRunBody.mapping, duplicateStrategy: dryRunBody.duplicateStrategy, status: response.status() });
            await page.close();
        }
        finally {
            await server.close();
        }
    }

    const result = {
        status: pageErrors.length ? 'AFTER_STATE_CAPTURED_WITH_PAGE_ERRORS' : 'AFTER_STATE_CAPTURED',
        capturedAt: new Date().toISOString(),
        task: 'UI028.W10',
        revision: (await import('node:child_process')).execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
        mode: 'demo', seed: 'default synthetic seed; separate server instance per viewport', browser: `Chromium ${browser.version()}`,
        sourceSha256: Object.fromEntries(sourceFiles.map(file => [file, sha256(file)])),
        viewports, routes: ['R09', 'R10', 'R11', 'R12', 'R13', 'R14'], observations, workflow, pageErrors,
        note: 'Post-edit render. R14 was reached by uploading one valid synthetic CSV and stopping before commit; each viewport used a fresh in-memory demo server.',
    };
    fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ status: result.status, observations: observations.length, pageErrors: pageErrors.length, dryRunOnly: workflow.length, sourceFiles: sourceFiles.length, reportPath }, null, 2));
} finally {
    await browser.close();
}
