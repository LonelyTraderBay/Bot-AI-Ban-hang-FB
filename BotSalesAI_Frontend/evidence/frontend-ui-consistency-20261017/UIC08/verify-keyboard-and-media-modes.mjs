import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium, firefox } from 'playwright';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';
import { evidenceRunId } from '../../../tests/evidence-run-id.mjs';

const root = process.cwd();
const outputPath = path.join(root, `evidence/frontend-ui-consistency-20261017/UIC08/keyboard-media-modes-current-${evidenceRunId}.json`);
const inputPaths = ['evidence/frontend-ui-consistency-20261017/UIC08/verify-keyboard-and-media-modes.mjs', 'packages/contracts/src/routes.json', 'apps/web/src/modules/finance/index.tsx', 'apps/web/src/app/bootstrap.css', 'tests/ui012-keyboard.spec.ts'];
const sourceSha256 = Object.fromEntries(inputPaths.map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const evidence = { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', runId: evidenceRunId, gitHead: process.env.BOTSALES_GIT_HEAD || null, sourceState: process.env.BOTSALES_SOURCE_STATE || 'working-tree', inputPaths, sourceSha256, browsers: [], result: 'INCOMPLETE' };
const routeProbes = [
    { id: 'R06', route: '/s/shop-demo/inbox/cv1', label: 'Các bước tư vấn bán hàng mẫu', lastTab: 'Xác nhận' },
    { id: 'R49', route: '/s/shop-demo/finance/reconciliation', label: 'Nhóm đối soát ngân hàng và COD', lastTab: 'Chênh lệch cần xử lý' },
];

for (const browserType of [chromium, firefox]) {
    const server = await startDemoServer({ cacheIsolationKey: `uic08-keyboard-modes-${browserType.name()}` });
    const launchOptions = { headless: true };
    if (browserType.name() === 'chromium') launchOptions.channel = 'chrome';
    const browser = await browserType.launch(launchOptions);
    const context = await browser.newContext({ viewport: { width: 320, height: 480 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const row = { name: browserType.name(), launchChannel: browserType.name() === 'chromium' ? 'chrome' : 'playwright-managed', version: browser.version(), tabs: [], modes: [], pageErrors, failures: [] };
    try {
        for (const probe of routeProbes) {
            await page.setViewportSize({ width: 320, height: 480 });
            await page.goto(new URL(probe.route, server.url).toString(), { waitUntil: 'domcontentloaded' });
            await page.locator('main#main-content h1').first().waitFor({ state: 'visible', timeout: 20_000 });
            const tablist = page.getByRole('tablist').first();
            const tablistCount = await page.getByRole('tablist').count();
            const tabs = page.getByRole('tab');
            const tabCount = await tabs.count();
            if (tablistCount < 1 || tabCount < 2) throw new Error(`${probe.id}: expected an accessible tablist with at least two tabs; observed ${tablistCount} tablists / ${tabCount} tabs.`);
            const tabNames = await tabs.allTextContents();
            const tablistSemantics = await tablist.evaluate(element => ({
                role: element.getAttribute('role'),
                ariaLabel: element.getAttribute('aria-label'),
                labelledBy: element.getAttribute('aria-labelledby'),
                tabIndex: element.tabIndex,
            }));
            const beforeScreenshotPath = path.join(root, `evidence/frontend-ui-consistency-20261017/UIC08/before-keyboard-${probe.id}-${browserType.name()}-320x480-${evidenceRunId}.png`);
            const beforeScreenshotBytes = await page.screenshot({ fullPage: false });
            fs.writeFileSync(beforeScreenshotPath, beforeScreenshotBytes);
            if (probe.label && !(await page.getByRole('tablist', { name: probe.label, exact: true }).count()))
                row.failures.push({ routeId: probe.id, issue: 'labeled-tablist-not-exposed-by-accessible-name', expected: probe.label, observed: tablistSemantics });
            await tabs.first().focus();
            await page.keyboard.press('End');
            const last = page.getByRole('tab', { name: probe.lastTab, exact: true });
            const stateAfterEnd = await page.evaluate(() => {
                const active = document.activeElement;
                const scrollers = [...document.querySelectorAll('.MuiTabs-scroller')].map(item => ({
                    clientWidth: item.clientWidth,
                    scrollWidth: item.scrollWidth,
                    scrollLeft: item.scrollLeft,
                })).filter(item => item.scrollWidth > item.clientWidth + 1);
                const focused = active instanceof HTMLElement ? active : null;
                const rect = focused?.getBoundingClientRect();
                const scroller = focused?.closest('.MuiTabs-scroller');
                const bounds = scroller?.getBoundingClientRect();
                return {
                    focusedText: focused?.textContent?.trim() || '',
                    selected: focused?.getAttribute('aria-selected'),
                    visibleInScroller: !!rect && !!bounds && rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1,
                    horizontalScroll: scrollers,
                };
            });
            await page.keyboard.press('Enter');
            const stateAfterEnter = await page.evaluate(() => {
                const active = document.activeElement;
                const focused = active instanceof HTMLElement ? active : null;
                const rect = focused?.getBoundingClientRect();
                const scroller = focused?.closest('.MuiTabs-scroller');
                const bounds = scroller?.getBoundingClientRect();
                return {
                    focusedText: focused?.textContent?.trim() || '',
                    selected: focused?.getAttribute('aria-selected'),
                    visibleInScroller: !!rect && !!bounds && rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1,
                    horizontalScroll: [...document.querySelectorAll('.MuiTabs-scroller')].map(item => ({
                        clientWidth: item.clientWidth,
                        scrollWidth: item.scrollWidth,
                        scrollLeft: item.scrollLeft,
                    })).filter(item => item.scrollWidth > item.clientWidth + 1),
                };
            });
            const tabEvidence = { routeId: probe.id, viewport: { width: 320, height: 480 }, tablistCount, tabCount, tabNames, tablistSemantics, stateAfterEnd, stateAfterEnter };
            row.tabs.push(tabEvidence);
            if (!stateAfterEnd.focusedText.includes(probe.lastTab)) row.failures.push({ routeId: probe.id, issue: 'End-key-did-not-move-focus-to-last-tab', observed: tabEvidence });
            if (stateAfterEnter.selected !== 'true' || !stateAfterEnter.focusedText.includes(probe.lastTab)) row.failures.push({ routeId: probe.id, issue: 'Enter-did-not-activate-focused-tab', observed: tabEvidence });
            if (stateAfterEnd.horizontalScroll.length && !stateAfterEnd.visibleInScroller)
                row.failures.push({ routeId: probe.id, issue: 'keyboard-focused-tab-is-not-visible-after-horizontal-scroll', observed: tabEvidence });
            if (stateAfterEnter.horizontalScroll.length && !stateAfterEnter.visibleInScroller)
                row.failures.push({ routeId: probe.id, issue: 'keyboard-activated-tab-is-not-visible-after-horizontal-scroll', observed: tabEvidence });
            const afterScreenshotPath = path.join(root, `evidence/frontend-ui-consistency-20261017/UIC08/after-keyboard-${probe.id}-${browserType.name()}-320x480-${evidenceRunId}.png`);
            const afterScreenshotBytes = await page.screenshot({ fullPage: false });
            fs.writeFileSync(afterScreenshotPath, afterScreenshotBytes);
            tabEvidence.screenshots = {
                before: { path: path.relative(root, beforeScreenshotPath).replaceAll('\\', '/'), sha256: createHash('sha256').update(beforeScreenshotBytes).digest('hex') },
                after: { path: path.relative(root, afterScreenshotPath).replaceAll('\\', '/'), sha256: createHash('sha256').update(afterScreenshotBytes).digest('hex') },
            };
        }

        await context.close();
        const modeContext = await browser.newContext({
            viewport: { width: 320, height: 480 },
            deviceScaleFactor: 1,
            reducedMotion: 'reduce',
            forcedColors: 'active',
        });
        const modePage = await modeContext.newPage();
        const modePageErrors = [];
        modePage.on('pageerror', error => modePageErrors.push(error.message));
        await modePage.goto(new URL('/s/shop-demo/products/new', server.url).toString(), { waitUntil: 'domcontentloaded' });
        await modePage.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
        const media = await modePage.evaluate(() => ({
            reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
            forcedColors: matchMedia('(forced-colors: active)').matches,
            rootScrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        }));
        const save = modePage.getByRole('button', { name: 'Lưu sản phẩm', exact: true });
        await save.focus();
        await modePage.keyboard.press('Tab');
        await modePage.keyboard.press('Shift+Tab');
        const focusStyle = await save.evaluate(element => {
            const style = getComputedStyle(element);
            return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineColor: style.outlineColor, transitionDuration: style.transitionDuration, animationDuration: style.animationDuration };
        });
        const modeScreenshotPath = path.join(root, 'evidence/frontend-ui-consistency-20261017/UIC08', `forced-colors-reduced-motion-${browserType.name()}-320x480-${evidenceRunId}.png`);
        await modePage.screenshot({ path: modeScreenshotPath, fullPage: false });
        row.modes.push({ routeId: 'R10', viewport: { width: 320, height: 480 }, devicePixelRatio: await modePage.evaluate(() => devicePixelRatio), media, focusStyle, screenshot: path.relative(root, modeScreenshotPath).replaceAll('\\', '/') });
        if (!media.reducedMotion || !media.forcedColors || media.rootScrollBehavior !== 'auto') row.failures.push({ routeId: 'R10', issue: 'reduced-motion-or-forced-colors-query-not-applied', observed: media });
        if (focusStyle.outlineStyle === 'none' || focusStyle.outlineWidth === '0px' || focusStyle.outlineColor === 'rgba(0, 0, 0, 0)') row.failures.push({ routeId: 'R10', issue: 'forced-colors-keyboard-focus-indicator-missing', observed: focusStyle });
        if (focusStyle.transitionDuration.split(',').some(value => Number.parseFloat(value) > 0) || focusStyle.animationDuration.split(',').some(value => Number.parseFloat(value) > 0)) row.failures.push({ routeId: 'R10', issue: 'reduced-motion-leaves-nonzero-button-motion', observed: focusStyle });
        row.pageErrors.push(...modePageErrors);
        await modeContext.close();
    } finally {
        await context.close();
        await browser.close();
        await server.close();
    }
    if (row.pageErrors.length) row.failures.push({ issue: 'uncaught-page-error', observed: row.pageErrors });
    evidence.browsers.push(row);
}

evidence.result = evidence.browsers.every(browser => browser.failures.length === 0) ? 'PASS' : 'FAIL';
fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: evidence.result, runId: evidence.runId, browsers: evidence.browsers.map(browser => ({ name: browser.name, version: browser.version, tabProbes: browser.tabs.length, mediaProbes: browser.modes.length, pageErrors: browser.pageErrors.length, failures: browser.failures })), evidence: path.relative(root, outputPath).replaceAll('\\', '/') }, null, 2));
if (evidence.result !== 'PASS') process.exitCode = 1;
