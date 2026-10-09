import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { evidenceRunId } from '../../tests/evidence-run-id.mjs';
import { startDemoServer } from '../../tests/session/demo-server.mjs';

const root = process.cwd();
const outputPath = path.join(root, `evidence/frontend-width-fixes-20261008/actual-browser-zoom-200-current-${evidenceRunId}.json`);
const sourceInputs = ["apps/web/src/app/bootstrap.css","apps/web/src/app/CommandRecovery.tsx","apps/web/src/app/dirty-drafts.ts","apps/web/src/app/feedback.tsx","apps/web/src/app/i18n.ts","apps/web/src/app/locales/vi/customers.ts","apps/web/src/app/locales/vi/knowledge.ts","apps/web/src/app/navigation.ts","apps/web/src/app/router.tsx","apps/web/src/app/ScopeEvents.tsx","apps/web/src/app/SessionProvider.tsx","apps/web/src/app/Shell.tsx","apps/web/src/app/tokens.css","apps/web/src/main.tsx","apps/web/src/mocks/auxiliary.ts","apps/web/src/mocks/browser.ts","apps/web/src/mocks/catalog.ts","apps/web/src/mocks/collections.json","apps/web/src/mocks/control.ts","apps/web/src/mocks/database.ts","apps/web/src/mocks/files.ts","apps/web/src/mocks/finance.ts","apps/web/src/mocks/fulfillment.ts","apps/web/src/mocks/handlers.ts","apps/web/src/mocks/marketing-fixture.ts","apps/web/src/mocks/orders.ts","apps/web/src/mocks/procurement.ts","apps/web/src/mocks/seed.json","apps/web/src/mocks/service.ts","apps/web/src/modules/bot/index.tsx","apps/web/src/modules/catalog/import-file.ts","apps/web/src/modules/catalog/imports.tsx","apps/web/src/modules/catalog/index.tsx","apps/web/src/modules/customers/index.tsx","apps/web/src/modules/dashboard/index.tsx","apps/web/src/modules/finance/demo-account-preview.ts","apps/web/src/modules/finance/index.tsx","apps/web/src/modules/finance/report-explanations.ts","apps/web/src/modules/fulfillment/index.tsx","apps/web/src/modules/inbox/conversation-components.tsx","apps/web/src/modules/inbox/index.tsx","apps/web/src/modules/integrations/index.tsx","apps/web/src/modules/inventory/index.tsx","apps/web/src/modules/knowledge/index.tsx","apps/web/src/modules/notifications/index.tsx","apps/web/src/modules/notifications/push-capabilities.ts","apps/web/src/modules/operations/index.tsx","apps/web/src/modules/orders/demo-address-preview.ts","apps/web/src/modules/orders/index.tsx","apps/web/src/modules/procurement/index.tsx","apps/web/src/modules/reports/index.tsx","apps/web/src/modules/reports/report-utils.ts","apps/web/src/modules/workspace/index.tsx","apps/web/src/shared/api/client.ts","apps/web/src/shared/api/client.type-contracts.ts","apps/web/src/shared/api/errors.ts","apps/web/src/shared/api/event-invalidation.ts","apps/web/src/shared/api/hooks.ts","apps/web/src/shared/api/intents.ts","apps/web/src/shared/api/validation.ts","apps/web/src/shared/model/auth.ts","apps/web/src/shared/model/dirty-drafts.ts","apps/web/src/shared/model/download.ts","apps/web/src/shared/model/filters.ts","apps/web/src/shared/model/format.ts","apps/web/src/shared/model/labels.ts","apps/web/src/shared/model/scope.tsx","apps/web/src/shared/model/versioned-draft.ts","apps/web/src/shared/ui/components.tsx","apps/web/src/shared/ui/composition.tsx","apps/web/src/shared/ui/draft-conflict.tsx","apps/web/src/shared/ui/layout.ts","apps/web/src/shared/ui/README.md","apps/web/src/shared/ui/theme.ts","apps/web/src/shared/ui/visual.ts","apps/web/src/vite-env.d.ts","tests/ui-component-layout.spec.ts","evidence/frontend-width-fixes-20261008/width-native-fixture.tsx","../botsales-kit/contracts/route-manifest.json","../botsales-kit/design/tokens.json","evidence/frontend-width-fixes-20261008/capture-component-browser-zoom.mjs"];
const scenarios = [{"id":"ai","path":"/s/shop-demo/integrations/ai"},{"id":"workspaces","path":"/workspaces"},{"id":"import","path":"/s/shop-demo/imports"},{"id":"shop","path":"/s/shop-demo/settings/shop"},{"id":"shipping","path":"/s/shop-demo/shipments"},{"id":"devices","path":"/s/shop-demo/notifications/devices"},{"id":"detail-long","path":"/s/shop-demo/integrations/ai"}];

function createZoomExtension(folder) {
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'manifest.json'), JSON.stringify({
        manifest_version: 3,
        name: 'UI028 isolated browser zoom evidence',
        version: '1.0.0',
        permissions: ['tabs'],
        host_permissions: ['http://127.0.0.1/*'],
        background: { service_worker: 'service-worker.js' },
    }, null, 2));
    fs.writeFileSync(path.join(folder, 'service-worker.js'), `
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    const tab = await chrome.tabs.get(request.tabId);
    if (request.zoomFactor !== undefined) await chrome.tabs.setZoom(request.tabId, request.zoomFactor);
    sendResponse({ zoom: await chrome.tabs.getZoom(request.tabId), url: tab.url });
  })().catch(error => sendResponse({ error: String(error) }));
  return true;
});
`);
}

async function extensionWorker(context) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
        const worker = context.serviceWorkers().find(candidate => candidate.url().startsWith('chrome-extension://'));
        if (worker) return worker;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('The isolated Chromium zoom extension service worker did not start.');
}

async function tabIdFor(worker, origin) {
    const id = await worker.evaluate(async base => {
        const tabs = await chrome.tabs.query({ url: `${base}/*` });
        return tabs.find(tab => tab.active)?.id ?? tabs[0]?.id ?? null;
    }, origin);
    if (!id) throw new Error(`Could not resolve the isolated app tab for ${origin}.`);
    return id;
}

async function prepare(page, scenario) {
    await page.waitForFunction(() => !!document.querySelector('main h1') && !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
    await page.evaluate(async ({ moduleUrl, caseId }) => (await import(moduleUrl)).prepareNativeScenario(caseId), { moduleUrl: "/@fs/C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/evidence/frontend-width-fixes-20261008/width-native-fixture.tsx", caseId: scenario.id });
    return { targets: ['[data-native-target="true"]'], focusTarget: '[data-native-focus="true"]' };
}

async function measure(page, selectors) {
    return page.evaluate(targets => {
        const describe = element => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
                x: Math.round(rect.x * 100) / 100,
                y: Math.round(rect.y * 100) / 100,
                width: Math.round(rect.width * 100) / 100,
                height: Math.round(rect.height * 100) / 100,
                right: Math.round(rect.right * 100) / 100,
                bottom: Math.round(rect.bottom * 100) / 100,
                scrollWidth: element.scrollWidth,
                clientWidth: element.clientWidth,
                scrollHeight: element.scrollHeight,
                clientHeight: element.clientHeight,
                overflowX: style.overflowX,
                overflowY: style.overflowY,
                fontSize: style.fontSize,
                textLength: element.innerText?.length || element.value?.length || 0,
            };
        };
        const targetGeometry = targets.map(selector => {
            const element = document.querySelector(selector);
            return { selector, found: Boolean(element), ...(element ? describe(element) : {}) };
        });
        const stressedNavigationLink = document.querySelector('[data-w30-long-label="true"]');
        const stressedNavigationLabel = stressedNavigationLink?.querySelector('.MuiListItemText-primary');
        const stressedNavigationItem = stressedNavigationLink?.closest('li');
        const followingNavigationItem = stressedNavigationItem?.nextElementSibling;
        const linkRect = stressedNavigationLink?.getBoundingClientRect();
        const labelRect = stressedNavigationLabel?.getBoundingClientRect();
        const followingRect = followingNavigationItem?.getBoundingClientRect();
        const navigationLabelLayout = stressedNavigationLink && stressedNavigationLabel && linkRect && labelRect && followingRect ? {
            labelContainedByLink: labelRect.top >= linkRect.top - 1 && labelRect.bottom <= linkRect.bottom + 1,
            directTextChild: [...stressedNavigationLink.childNodes].some(node => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())),
            labelFollowingOverlap: Math.max(0, Math.min(labelRect.bottom, followingRect.bottom) - Math.max(labelRect.top, followingRect.top)),
            linkFollowingOverlap: Math.max(0, Math.min(linkRect.bottom, followingRect.bottom) - Math.max(linkRect.top, followingRect.top)),
        } : null;
        const viewportWidth = document.documentElement.clientWidth;
        const documentWidth = document.documentElement.scrollWidth;
        const textClips = [...document.querySelectorAll('main *, nav *, [role="dialog"] *')]
            .filter(element => {
                if (element.tagName === 'LEGEND') return false;
                const rect = element.getBoundingClientRect();
                if (!rect.width || !rect.height || !element.innerText?.trim()) return false;
                const style = getComputedStyle(element);
                return (['hidden', 'clip'].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 2)
                    || (['hidden', 'clip'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 2);
            })
            .slice(0, 20)
            .map(element => ({ tag: element.tagName.toLowerCase(), role: element.getAttribute('role'), text: (element.innerText || '').slice(0, 100), ...describe(element) }));
        const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const activeStyle = active ? getComputedStyle(active) : null;
        const activeRect = active?.getBoundingClientRect();
        const dialog = document.querySelector('[role="dialog"]');
        return {
            toolbarGeometry: (() => {
    const button = document.querySelector('[data-native-target="true"]');
    if (!button) return null;
    const rect = button.getBoundingClientRect(), style = getComputedStyle(button), range = document.createRange();
    range.selectNodeContents(button);
    const clone = button.cloneNode(true);
    Object.assign(clone.style, { height: 'auto', width: rect.width + 'px', position: 'fixed', visibility: 'hidden', alignSelf: 'start' });
    button.parentElement.append(clone); const naturalHeight = clone.getBoundingClientRect().height; clone.remove();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return { buttonHeight: rect.height, naturalHeight, centerHitsButton: !!hit && button.contains(hit) };
})(),
            viewport: {
                url: location.href, width: innerWidth,
                height: innerHeight,
                clientWidth: viewportWidth,
                documentWidth,
                pageOverflow: documentWidth - viewportWidth,
                scrollHeight: document.documentElement.scrollHeight,
                scrollY,
                devicePixelRatio,
                visualViewportScale: visualViewport.scale,
            },
            targets: targetGeometry,
            navigationLabelLayout,
            textClips,
            dialog: dialog ? describe(dialog) : null,
            activeFocus: active && activeStyle && activeRect ? {
                tag: active.tagName.toLowerCase(),
                role: active.getAttribute('role'),
                label: active.getAttribute('aria-label') || active.innerText?.slice(0, 80) || '',
                paintedOwner: (() => {
              const owner = active.closest('.MuiOutlinedInput-root.Mui-focused')?.querySelector('fieldset');
              if (!owner) return null;
              const style = getComputedStyle(owner), bounds = owner.getBoundingClientRect();
              return { tag: owner.tagName, borderWidth: style.borderTopWidth, borderColor: style.borderTopColor, borderStyle: style.borderTopStyle, bounds: bounds.toJSON(), valid: bounds.width > 0 && bounds.height > 0 && style.borderTopStyle === 'solid' && parseFloat(style.borderTopWidth) >= 2 && style.borderTopColor === "rgb(246, 200, 95)" };
            })(), outlineStyle: activeStyle.outlineStyle,
                outlineWidth: activeStyle.outlineWidth,
                outlineColor: activeStyle.outlineColor,
                boxShadow: activeStyle.boxShadow,
                bounds: { x: activeRect.x, right: activeRect.right, y: activeRect.y, bottom: activeRect.bottom },
            } : null,
        };
    }, selectors);
}

const evidence = {
    schemaVersion: 1,
    task: 'S16.Width',
    recordedAt: new Date().toISOString(),
    scope: 'Isolated Chromium with local React demo and synthetic MSW; no backend or persistent app writes',
    sourceSha256: Object.fromEntries(sourceInputs.map(relative => [relative, createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex')])),
    method: {
        browser: 'Playwright-bundled Chromium, headed, fresh temporary profile',
        mechanism: 'Temporary Manifest V3 extension calls chrome.tabs.setZoom(tabId, 2) and independently reads chrome.tabs.getZoom(tabId)',
        baselineViewport: { width: 1280, height: 720 },
        targetZoomFactor: 2,
        note: 'The browser zoom setting is changed through Chromium tab zoom, not CSS/device emulation. CSS viewport and devicePixelRatio are measured from the rendered page after the browser reports zoom factor 2.',
    },
    scenarios: [],
    result: 'INCOMPLETE',
};

let server;
let context;
let temporaryRoot;
try {
    server = await startDemoServer({ cacheIsolationKey: 'w30-actual-browser-zoom' });
    temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ui028-actual-browser-zoom-'));
    const extensionPath = path.join(temporaryRoot, 'extension');
    createZoomExtension(extensionPath);
    context = await chromium.launchPersistentContext(path.join(temporaryRoot, 'profile'), {
        headless: false,
        viewport: { width: 1280, height: 720 },
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--no-first-run',
            '--no-default-browser-check',
        ],
    });
    const worker = await extensionWorker(context);
    const page = context.pages()[0] ?? await context.newPage();
    page.on('dialog', dialog => { void dialog.accept(); });
    const pageErrors = [];
    const writeRequests = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method().toUpperCase())) {
            writeRequests.push({ method: request.method(), url: request.url() });
        }
    });
    evidence.method.browserVersion = context.browser().version();

    for (const scenario of scenarios) {
        const writeRequestStart = writeRequests.length;
        const pageErrorStart = pageErrors.length;
        const url = new URL(scenario.path, server.url).toString();
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading').first().waitFor({ state: 'visible', timeout: 15_000 });
        const tabId = await tabIdFor(worker, server.url);
        const startingZoom = await worker.evaluate(async id => chrome.tabs.getZoom(id), tabId);
        if (startingZoom !== 1) {
            await worker.evaluate(async id => chrome.tabs.setZoom(id, 1), tabId);
            await page.waitForTimeout(150);
        }
        const before = await worker.evaluate(async id => chrome.tabs.getZoom(id), tabId);
        const defaultViewport = await page.evaluate(() => ({ url: location.href, width: innerWidth, height: innerHeight, devicePixelRatio }));
        const zoomResult = await worker.evaluate(async ({ id, factor }) => {
            await chrome.tabs.setZoom(id, factor);
            return { zoom: await chrome.tabs.getZoom(id), tabUrl: (await chrome.tabs.get(id)).url };
        }, { id: tabId, factor: 2 });
        await page.waitForTimeout(150);
        const baseline = await page.evaluate(() => ({
            cssViewport: { url: location.href, width: innerWidth, height: innerHeight },
            devicePixelRatio,
            documentWidth: document.documentElement.scrollWidth,
        }));
        const fixture = await prepare(page, scenario);
        await page.locator(fixture.focusTarget).first().focus();
        const focusedScreenshotPath = path.join(root, `evidence/frontend-width-fixes-20261008/actual-browser-zoom-200-${scenario.id}-focused-${evidenceRunId}.png`);
        const focusedScreenshotBytes = await page.screenshot({ fullPage: false });
        fs.writeFileSync(focusedScreenshotPath, focusedScreenshotBytes);
        await page.keyboard.press('Tab');
        const measurements = await measure(page, fixture.targets);
        const screenshotPath = path.join(root, `evidence/frontend-width-fixes-20261008/actual-browser-zoom-200-${scenario.id}-after-tab-${evidenceRunId}.png`);
        const screenshotBytes = await page.screenshot({ fullPage: false });
        const issues = [];
        if (before !== 1) issues.push(`Expected unzoomed baseline 1.0; observed ${before}.`);
        if (zoomResult.zoom !== 2) issues.push(`Browser tab zoom API reported ${zoomResult.zoom}; expected 2.0.`);
        if (zoomResult.tabUrl !== url) issues.push(`Zoom applied to unexpected tab URL ${zoomResult.tabUrl}.`);
        if (baseline.cssViewport.width >= 1280 || baseline.devicePixelRatio <= 1)
            issues.push('Browser zoom did not reduce CSS viewport and increase devicePixelRatio as expected.');
        if (measurements.viewport.pageOverflow > 1) issues.push(`Document horizontal overflow: ${measurements.viewport.pageOverflow}px.`);
        const scenarioWrites = writeRequests.slice(writeRequestStart);
        const scenarioPageErrors = pageErrors.slice(pageErrorStart);
        if (scenarioWrites.length !== 0) issues.push(`Unexpected non-read HTTP requests: ${scenarioWrites.length}.`);
        for (const target of measurements.targets) {
            if (!target.found) issues.push(`Stress target missing after browser zoom: ${target.selector}.`);
            else if (target.x < -1 || target.right > measurements.viewport.width + 1)
                issues.push(`Target extends horizontally past the viewport: ${target.selector} (${target.x}..${target.right}).`);
        }
        if (!measurements.activeFocus || ((measurements.activeFocus.outlineStyle === 'none' || measurements.activeFocus.outlineWidth === '0px') && measurements.activeFocus.boxShadow === 'none' && !measurements.activeFocus.paintedOwner?.valid))
            issues.push('Keyboard focus indicator was not measurable after actual browser zoom.');
        if (measurements.textClips.length) issues.push(`Potential clipped text elements: ${measurements.textClips.length}.`);
        if (measurements.navigationLabelLayout && (!measurements.navigationLabelLayout.labelContainedByLink
            || measurements.navigationLabelLayout.directTextChild
            || measurements.navigationLabelLayout.labelFollowingOverlap > 1
            || measurements.navigationLabelLayout.linkFollowingOverlap > 1))
            issues.push(`Long navigation label geometry is invalid: ${JSON.stringify(measurements.navigationLabelLayout)}.`);
        fs.writeFileSync(screenshotPath, screenshotBytes);
        fs.writeFileSync(focusedScreenshotPath, focusedScreenshotBytes);
        evidence.scenarios.push({
            id: scenario.id,
            route: scenario.path,
            browserZoom: { startingZoom, before, requested: 2, reported: zoomResult.zoom, tabUrl: zoomResult.tabUrl },
            defaultViewport,
            renderedAfterZoom: baseline,
            measurements,
            focusedScreenshot: { path: path.relative(root, focusedScreenshotPath).replaceAll('\\', '/'), sha256: createHash('sha256').update(focusedScreenshotBytes).digest('hex') },
            screenshotAfterTab: { path: path.relative(root, screenshotPath).replaceAll('\\', '/'), sha256: createHash('sha256').update(screenshotBytes).digest('hex') },
            writeRequests: scenarioWrites,
            pageErrors: scenarioPageErrors,
            issues,
            result: issues.length === 0 && scenarioPageErrors.length === 0 ? 'PASS' : 'FAIL',
        });
    }
    const failed = evidence.scenarios.filter(item => item.result !== 'PASS');
    evidence.result = failed.length === 0 ? 'PASS' : 'FAIL';
} catch (error) {
    evidence.result = 'ERROR';
    evidence.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
} finally {
    if (context) await context.close();
    if (server) await server.close();
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
    if (temporaryRoot) {
        const tempBase = path.resolve(os.tmpdir());
        const tempTarget = path.resolve(temporaryRoot);
        if (path.dirname(tempTarget) !== tempBase || !path.basename(tempTarget).startsWith('ui028-actual-browser-zoom-'))
            throw new Error(`Refusing to remove unexpected temporary profile path: ${tempTarget}`);
        fs.rmSync(tempTarget, { recursive: true, force: true });
    }
}

console.log(JSON.stringify({
    result: evidence.result,
    scenarios: evidence.scenarios.map(({ id, route, result, browserZoom, renderedAfterZoom, issues, pageErrors }) => ({ id, route, result, browserZoom, renderedAfterZoom, issues, pageErrors })),
    error: evidence.error,
    evidence: path.relative(root, outputPath),
}, null, 2));
if (evidence.result !== 'PASS') process.exitCode = 1;
