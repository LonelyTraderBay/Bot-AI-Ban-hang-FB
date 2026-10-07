import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const evidenceDir = path.join(root, 'evidence/frontend-ui-improvements/UI028/W09');
const stage = process.argv[2] || 'baseline-before-source-edit';
if (!/^[a-z0-9-]+$/i.test(stage)) throw new Error('Pass a simple alphanumeric stage name.');
const sourceFiles = [
    'apps/web/src/app/Shell.tsx',
    'apps/web/src/app/bootstrap.css',
    'apps/web/src/app/tokens.css',
    'apps/web/src/app/router.tsx',
    'apps/web/src/app/feedback.tsx',
    'apps/web/src/app/ScopeEvents.tsx',
    'apps/web/src/app/CommandRecovery.tsx',
    'apps/web/src/shared/ui/layout.ts',
    'apps/web/src/shared/ui/theme.ts',
    'botsales-kit/design/tokens.json',
];
const sha256 = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const server = await startDemoServer({ cacheIsolationKey: 'ui028-w09-baseline-20261005' });
const browser = await chromium.launch({ headless: true });
const pageErrors = [];

try {
    const observations = [];
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
        const page = await browser.newPage({ viewport });
        page.on('pageerror', error => pageErrors.push({ route: page.url(), message: error.message }));
        for (const route of ['/s/shop-demo/overview', '/s/shop-demo/imports', '/workspaces']) {
            await page.goto(new URL(route, server.url).toString(), { waitUntil: 'domcontentloaded' });
            await page.locator('#root').waitFor({ state: 'visible' });
            await page.waitForTimeout(700);
            const metrics = await page.evaluate(() => {
                const measure = selector => {
                    const element = document.querySelector(selector);
                    if (!element) return null;
                    const rect = element.getBoundingClientRect();
                    const style = getComputedStyle(element);
                    return {
                        x: rect.x, y: rect.y, width: rect.width, height: rect.height,
                        paddingTop: style.paddingTop, paddingRight: style.paddingRight,
                        paddingBottom: style.paddingBottom, paddingLeft: style.paddingLeft,
                        minHeight: style.minHeight, flex: style.flex, display: style.display,
                    };
                };
                return {
                    viewport: { width: innerWidth, height: innerHeight },
                    document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
                    header: measure('header'), headerContent: measure('header > .MuiStack-root'), demoBanner: measure('header + div .MuiAlert-root'),
                    main: measure('main#main-content'), footer: measure('footer'), nav: measure('nav'),
                    mockToolsButton: [...document.querySelectorAll('button')].find(button => button.textContent?.includes('Công cụ demo'))?.getBoundingClientRect().toJSON() ?? null,
                    visibleHeadings: [...document.querySelectorAll('h1,h2')].filter(element => element.getBoundingClientRect().width > 0).slice(0, 8).map(element => element.textContent?.trim()),
                };
            });
            const safeRoute = route.replaceAll('/', '-').replace(/^-/, '');
            const screenshot = `${stage}-${safeRoute}-${viewport.width}x${viewport.height}-current-20261005.png`;
            await page.screenshot({ path: path.join(evidenceDir, screenshot), fullPage: true });
            observations.push({ route, viewport, finalUrl: page.url(), title: await page.title(), metrics, screenshot });
        }
        await page.close();
    }
    const result = {
        stage,
        status: pageErrors.length
            ? `${stage === 'baseline-before-source-edit' ? 'BASELINE' : 'AFTER_STATE'}_CAPTURED_WITH_PAGE_ERRORS`
            : stage === 'baseline-before-source-edit' ? 'BASELINE_CAPTURED' : 'AFTER_STATE_CAPTURED',
        capturedAt: new Date().toISOString(),
        revision: (await import('node:child_process')).execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
        mode: 'demo', seed: 'default synthetic seed', browser: `Chromium ${browser.version()}`,
        sourceSha256: Object.fromEntries(sourceFiles.map(file => [file, sha256(file)])),
        observations,
        pageErrors,
    };
    const reportName = stage === 'baseline-before-source-edit' ? 'baseline-before-source-edit-current-20261005.json' : `render-${stage}-current-20261005.json`;
    const reportPath = path.join(evidenceDir, reportName);
    if (fs.existsSync(reportPath)) throw new Error(`Refusing to overwrite existing evidence: ${reportName}`);
    fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify({ status: result.status, observations: observations.length, pageErrors: pageErrors.length, sourceFiles: sourceFiles.length }));
} finally {
    await browser.close();
    await server.close();
}
