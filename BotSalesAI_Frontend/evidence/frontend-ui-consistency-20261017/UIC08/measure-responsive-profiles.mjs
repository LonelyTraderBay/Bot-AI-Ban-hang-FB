import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium, firefox } from 'playwright';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';
import { evidenceRunId } from '../../../tests/evidence-run-id.mjs';

const root = process.cwd();
const outputDirectory = 'evidence/frontend-ui-consistency-20261017/UIC08';
const outputPath = path.join(root, outputDirectory, `responsive-profiles-current-${evidenceRunId}.json`);
const screenshotPhase = process.env.BOTSALES_EVIDENCE_PHASE || 'baseline';
const routesPath = 'packages/contracts/src/routes.json';
const routeManifest = JSON.parse(fs.readFileSync(path.join(root, routesPath), 'utf8'));
const detailIds = {
    conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001',
    knowledgeId: 'k1', jobId: 'missing-job',
};
const profiles = [
    { width: 320, height: 480 }, { width: 390, height: 560 }, { width: 767, height: 640 },
    { width: 768, height: 640 }, { width: 1024, height: 720 }, { width: 1279, height: 720 },
    { width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 },
];
const screenshotRoutes = new Set(['R04', 'R06', 'R09', 'R10', 'R49', 'R53']);
const screenshotWidths = new Set([320, 390, 768, 1440, 1920]);
const inputPaths = [
    'evidence/frontend-ui-consistency-20261017/UIC08/measure-responsive-profiles.mjs',
    routesPath,
    'apps/web/src/app/Shell.tsx',
    'apps/web/src/app/tokens.css',
    'apps/web/src/shared/ui/layout.ts',
    'apps/web/src/shared/ui/theme.ts',
    'apps/web/src/shared/ui/visual.ts',
    'apps/web/src/modules/catalog/index.tsx',
    'apps/web/src/modules/inbox/index.tsx',
    'apps/web/src/modules/inbox/conversation-components.tsx',
    'apps/web/src/modules/reports/index.tsx',
    'apps/web/src/modules/finance/index.tsx',
    'tests/ui012-keyboard.spec.ts',
];
const sha256 = value => createHash('sha256').update(value).digest('hex');
const sourceSha256 = Object.fromEntries(inputPaths.map(file => [
    file,
    sha256(fs.readFileSync(path.join(root, file))),
]));

const evidence = {
    schemaVersion: 1,
    task: 'UIC08',
    runId: evidenceRunId,
    screenshotPhase,
    recordedAt: new Date().toISOString(),
    gitHead: process.env.BOTSALES_GIT_HEAD || null,
    sourceState: process.env.BOTSALES_SOURCE_STATE || 'working-tree',
    scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
    routeCount: routeManifest.routes.length,
    profiles,
    inputPaths,
    sourceSha256,
    browsers: [],
    result: 'INCOMPLETE',
};

for (const browserType of [chromium, firefox]) {
    const browserName = browserType.name();
    const server = await startDemoServer({ cacheIsolationKey: `uic08-responsive-${browserName}` });
    const launchOptions = { headless: true };
    if (browserName === 'chromium') launchOptions.channel = 'chrome';
    const browser = await browserType.launch(launchOptions);
    const context = await browser.newContext({ viewport: profiles[0], deviceScaleFactor: 1 });
    const page = await context.newPage();
    const pageErrors = [];
    const browserResult = {
        name: browserName,
        launchChannel: browserName === 'chromium' ? 'chrome' : 'playwright-managed',
        version: browser.version(),
        viewportMatrix: [],
        screenshots: [],
        pageErrors,
        failures: [],
    };
    try {
        for (const route of routeManifest.routes) {
            const routePath = route.path
                .replace(':shopId', 'shop-demo')
                .replace(/:([A-Za-z]+)/g, (_, key) => detailIds[key] || 'missing');
            const routeErrorStart = pageErrors.length;
            const errorListener = error => pageErrors.push({ routeId: route.id, message: error.message });
            page.on('pageerror', errorListener);
            await page.setViewportSize(profiles[0]);
            await page.goto(new URL(routePath, server.url).toString(), { waitUntil: 'domcontentloaded' });
            await page.locator('main#main-content').waitFor({ state: 'visible', timeout: 20_000 });
            await page.locator('main#main-content h1').first().waitFor({ state: 'visible', timeout: 20_000 });
            await page.locator('main .MuiCircularProgress-root, main .MuiLinearProgress-root').first()
                .waitFor({ state: 'detached', timeout: 20_000 }).catch(() => {});
            await page.evaluate(() => document.fonts.ready);

            for (const profile of profiles) {
                await page.setViewportSize(profile);
                await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                const measurement = await page.evaluate(() => {
                    const visible = element => {
                        const style = getComputedStyle(element);
                        return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
                    };
                    const width = document.documentElement.clientWidth;
                    const scrollWidth = document.documentElement.scrollWidth;
                    const scrollRegions = [...document.querySelectorAll('main *')].filter(element => {
                        const style = getComputedStyle(element);
                        return /(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1;
                    }).map(element => ({
                        tag: element.tagName.toLowerCase(),
                        role: element.getAttribute('role'),
                        label: element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || '',
                        overflow: element.scrollWidth - element.clientWidth,
                        clientWidth: element.clientWidth,
                        scrollWidth: element.scrollWidth,
                    }));
                    const controls = [...document.querySelectorAll('a,button,input,select,textarea,[role="button"],[tabindex]')]
                        .filter(element => {
                            if (!visible(element)) return false;
                            const style = getComputedStyle(element);
                            return Number(style.opacity) > 0.05
                                && style.pointerEvents !== 'none'
                                && element.getAttribute('aria-hidden') !== 'true'
                                && element.getAttribute('aria-disabled') !== 'true'
                                && !element.disabled;
                        }).map(element => {
                            const rect = element.getBoundingClientRect();
                            let ancestor = element.parentElement;
                            let scrollOwner = null;
                            while (ancestor && ancestor !== document.body) {
                                const style = getComputedStyle(ancestor);
                                if (/(auto|scroll)/.test(style.overflowX) && ancestor.scrollWidth > ancestor.clientWidth + 1) {
                                    scrollOwner = ancestor;
                                    break;
                                }
                                ancestor = ancestor.parentElement;
                            }
                            return {
                                tag: element.tagName.toLowerCase(),
                                role: element.getAttribute('role'),
                                label: element.getAttribute('aria-label') || element.innerText?.trim().slice(0, 80) || '',
                                x: Math.round(rect.x * 10) / 10,
                                right: Math.round(rect.right * 10) / 10,
                                outsideViewport: rect.left < -1 || rect.right > width + 1,
                                scrollOwner: scrollOwner ? scrollOwner.getAttribute('aria-label') || scrollOwner.id || scrollOwner.tagName.toLowerCase() : null,
                                hitTest: (() => {
                                    const x = rect.left + rect.width / 2;
                                    const y = rect.top + rect.height / 2;
                                    if (x < 0 || x >= width || y < 0 || y >= innerHeight) return null;
                                    let clippingAncestor = element.parentElement;
                                    while (clippingAncestor && clippingAncestor !== document.body) {
                                        const style = getComputedStyle(clippingAncestor);
                                        const bounds = clippingAncestor.getBoundingClientRect();
                                        const clipsX = /(hidden|clip|auto|scroll)/.test(style.overflowX);
                                        const clipsY = /(hidden|clip|auto|scroll)/.test(style.overflowY);
                                        if ((clipsX && (x < bounds.left + clippingAncestor.clientLeft || x > bounds.left + clippingAncestor.clientLeft + clippingAncestor.clientWidth))
                                            || (clipsY && (y < bounds.top + clippingAncestor.clientTop || y > bounds.top + clippingAncestor.clientTop + clippingAncestor.clientHeight))) {
                                            return null;
                                        }
                                        clippingAncestor = clippingAncestor.parentElement;
                                    }
                                    const hit = document.elementFromPoint(x, y);
                                    return {
                                        targetReceivesHit: !!hit && (hit === element || element.contains(hit)),
                                        hitTag: hit?.tagName.toLowerCase() || null,
                                        hitRole: hit?.getAttribute('role') || null,
                                        hitText: hit?.textContent?.trim().slice(0, 80) || '',
                                    };
                                })(),
                            };
                        });
                    const fixedOrSticky = [...document.querySelectorAll('body *')].filter(element => {
                        if (!visible(element)) return false;
                        const position = getComputedStyle(element).position;
                        return position === 'fixed' || position === 'sticky';
                    }).map(element => {
                        const rect = element.getBoundingClientRect();
                        const style = getComputedStyle(element);
                        return {
                            tag: element.tagName.toLowerCase(),
                            role: element.getAttribute('role'),
                            text: element.innerText?.trim().slice(0, 100) || '',
                            position: style.position,
                            zIndex: style.zIndex,
                            bounds: { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom },
                            outsideViewport: rect.left < -1 || rect.right > width + 1 || rect.top < -1 || rect.bottom > innerHeight + 1,
                        };
                    });
                    return {
                        viewport: { width, height: innerHeight, devicePixelRatio, documentScrollY: window.scrollY },
                        document: { clientWidth: width, scrollWidth, horizontalOverflow: Math.max(0, scrollWidth - width) },
                        scrollRegions,
                        controlsOutsideViewport: controls.filter(control => control.outsideViewport),
                        hitTestOcclusions: controls.filter(control => control.hitTest && !control.hitTest.targetReceivesHit),
                        fixedOrSticky,
                    };
                });
                const row = { routeId: route.id, path: routePath, profile, ...measurement };
                browserResult.viewportMatrix.push(row);
                if (measurement.document.horizontalOverflow > 1) browserResult.failures.push({ routeId: route.id, width: profile.width, issue: 'document-horizontally-overflows', observed: measurement.document.horizontalOverflow });
                if (route.id === 'R06' && measurement.viewport.documentScrollY > 1) browserResult.failures.push({ routeId: route.id, width: profile.width, issue: 'conversation-initial-load-scrolls-document', observed: measurement.viewport.documentScrollY });
                const uncontained = measurement.controlsOutsideViewport.filter(control => !control.scrollOwner);
                if (uncontained.length) browserResult.failures.push({ routeId: route.id, width: profile.width, issue: 'interactive-control-outside-viewport', observed: uncontained });
                if (measurement.hitTestOcclusions.length) browserResult.failures.push({ routeId: route.id, width: profile.width, issue: 'interactive-control-occluded-at-hit-target', observed: measurement.hitTestOcclusions });
                if (pageErrors.length > routeErrorStart) browserResult.failures.push({ routeId: route.id, width: profile.width, issue: 'uncaught-page-error', observed: pageErrors.slice(routeErrorStart) });

                if (screenshotRoutes.has(route.id) && screenshotWidths.has(profile.width)) {
                    const screenshotPath = path.join(root, outputDirectory, `${screenshotPhase}-${browserName}-${route.id}-${profile.width}x${profile.height}-${evidenceRunId}.png`);
                    const screenshotBytes = await page.screenshot({ fullPage: false });
                    fs.writeFileSync(screenshotPath, screenshotBytes);
                    browserResult.screenshots.push({
                        routeId: route.id,
                        width: profile.width,
                        height: profile.height,
                        path: path.relative(root, screenshotPath).replaceAll('\\', '/'),
                        sha256: sha256(screenshotBytes),
                    });
                }
            }
            page.off('pageerror', errorListener);
        }
    } finally {
        await context.close();
        await browser.close();
        await server.close();
    }
    evidence.browsers.push(browserResult);
}

evidence.result = evidence.browsers.every(browser => browser.failures.length === 0 && browser.pageErrors.length === 0) ? 'PASS' : 'FAIL';
fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
    task: evidence.task,
    runId: evidence.runId,
    result: evidence.result,
    routeCount: evidence.routeCount,
    viewportRows: evidence.browsers.map(browser => ({ browser: browser.name, version: browser.version, rows: browser.viewportMatrix.length, screenshots: browser.screenshots.length, pageErrors: browser.pageErrors.length, failures: browser.failures.length })),
    failureSample: evidence.browsers.flatMap(browser => browser.failures.slice(0, 10)),
    evidence: path.relative(root, outputPath).replaceAll('\\', '/'),
}, null, 2));
if (evidence.result !== 'PASS') process.exitCode = 1;
