// Adapted from UI028/W30/capture-actual-browser-zoom-200-current-20261006.mjs; separate outputs and current source hashes; no historical evidence is overwritten.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';

const root = process.cwd();
const outputPath = path.join(root, 'evidence/frontend-ui-improvements/shared-composition-20261006/browser-zoom-200.json');
const sourceInputs = [...JSON.parse(fs.readFileSync('evidence/frontend-ui-improvements/shared-composition-20261006/final-source-audit.json','utf8')).sourceHashes.map(row=>row.file), 'apps/web/src/app/bootstrap.css', 'apps/web/src/app/tokens.css', 'botsales-kit/design/tokens.json', 'botsales-kit/contracts/route-manifest.json', 'evidence/frontend-ui-improvements/shared-composition-20261006/capture-browser-zoom.mjs'];
const scenarios = [
    { id: 'form-error-short', path: '/s/shop-demo/products/new' },
    { id: 'mobile-menu-long-label', path: '/s/shop-demo/overview' },
    { id: 'report-long-id', path: '/s/shop-demo/reports/marketing' },
    { id: 'inbox-long-composer', path: '/s/shop-demo/inbox/cv1' },
    { id: 'dialog-long-reason', path: '/s/shop-demo/inbox/cv1' },
];

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
    if (scenario.id === 'form-error-short') {
        await page.getByRole('textbox', { name: 'Tên sản phẩm' }).fill(`Tên sản phẩm tổng hợp ${'Bản thử dài '.repeat(10)}`);
        await page.getByRole('textbox', { name: 'SKU' }).fill(`SKU-${'IDENTIFIER-VERY-LONG-'.repeat(8)}`);
        await page.getByRole('textbox', { name: 'Giá bán (VND)' }).fill('0');
        await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
        const error = page.getByText('Giá phải lớn hơn 0', { exact: true });
        await error.waitFor({ state: 'visible', timeout: 8_000 });
        await error.evaluate(element => { element.textContent += ` · mã lỗi ${'PRICE-VALIDATION-IDENTIFIER-'.repeat(6)}`; });
        return { targets: ['main h1', 'input[name="name"]', 'input[name="variants.0.sku"]', 'button[type="submit"]'], focusTarget: 'button[type="submit"]' };
    }
    if (scenario.id === 'mobile-menu-long-label') {
        await page.getByRole('button', { name: 'Mở menu' }).click();
        const link = page.getByRole('link', { name: 'Sản phẩm', exact: true }).filter({ visible: true });
        await link.waitFor({ state: 'visible', timeout: 8_000 });
        await page.waitForTimeout(500);
        await link.evaluate(element => {
            element.dataset.w30LongLabel = 'true';
            element.append(document.createTextNode(` ${'Danh mục sản phẩm nhãn dài '.repeat(8)} ID-${'NAV-LONG-'.repeat(8)}`));
        });
        return { targets: ['[data-w30-long-label="true"]', 'main h1'], focusTarget: '[data-w30-long-label="true"]' };
    }
    if (scenario.id === 'report-long-id') {
        await page.locator('main#main-content').evaluate(element => {
            const node = document.createElement('p');
            node.dataset.w30LongId = 'true';
            node.textContent = `Mã công việc xuất ${'JOB-2026-IDENTIFIER-'.repeat(12)}`;
            element.prepend(node);
        });
        return { targets: ['[data-w30-long-id="true"]', 'main h1', 'button'], focusTarget: 'button' };
    }
    if (scenario.id === 'inbox-long-composer') {
        const composer = page.getByRole('textbox', { name: 'Nội dung trả lời khách' });
        await composer.fill(`Nội dung trả lời khách hàng tổng hợp. ${'Giải thích chi tiết về trạng thái đơn hàng, lựa chọn giao nhận và bước tiếp theo. '.repeat(20)}`);
        return { targets: ['textarea', 'button[type="submit"]', 'main h1'], focusTarget: 'textarea' };
    }
    await page.getByRole('button', { name: 'Tiếp quản', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Tiếp quản cuộc trò chuyện' });
    await dialog.waitFor({ state: 'visible', timeout: 8_000 });
    await dialog.getByRole('textbox', { name: /Lý do/ }).fill(`Lý do tổng hợp để kiểm tra reflow. ${'Mã hội thoại CV-2026-'.repeat(14)}`);
    return { targets: ['[role="dialog"]', '[role="dialog"] textarea', '[role="dialog"] button'], focusTarget: '[role="dialog"] textarea' };
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
const focusPoint = activeRect && activeRect.right>0 && activeRect.x<innerWidth && activeRect.bottom>0 && activeRect.y<innerHeight ? { x:(Math.max(0,activeRect.x)+Math.min(innerWidth,activeRect.right))/2, y:(Math.max(0,activeRect.y)+Math.min(innerHeight,activeRect.bottom))/2 } : null;
        const focusHit = focusPoint && document.elementFromPoint(focusPoint.x,focusPoint.y);
        const focusHitTest = { point:focusPoint, received:Boolean(active && focusHit && (active===focusHit || active.contains(focusHit))), hitTag:focusHit?.tagName || null };
        const dialog = document.querySelector('[role="dialog"]');
        return {
            viewport: {
                width: innerWidth,
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
            textClips,
            dialog: dialog ? describe(dialog) : null,
            activeFocus: active && activeStyle && activeRect ? {
                tag: active.tagName.toLowerCase(),
                role: active.getAttribute('role'),
                label: active.getAttribute('aria-label') || active.innerText?.slice(0, 80) || '',
                outlineStyle: activeStyle.outlineStyle,
                outlineWidth: activeStyle.outlineWidth,
                outlineColor: activeStyle.outlineColor,
                boxShadow: activeStyle.boxShadow,
                hitTest: focusHitTest,
                bounds: { x: activeRect.x, right: activeRect.right, y: activeRect.y, bottom: activeRect.bottom },
            } : null,
        };
    }, selectors);
}

const evidence = {
    schemaVersion: 1,
    task: 'SHARED-COMPOSITION-SPC-051-20261006',
    recordedAt: new Date().toISOString(),
    scope: 'Isolated Chromium with local React demo and synthetic MSW; no backend or persistent app writes',
    sourceSha256: Object.fromEntries(sourceInputs.map(relative => [relative, createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex')])),
    method: {
        browser: 'Playwright-bundled Chromium full browser, headless, fresh temporary profile',
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
        headless: true,
        channel: 'chromium',
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
        await page.locator('main h1').waitFor({ state: 'visible', timeout: 15_000 });
        await page.waitForFunction(()=>!document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
        const tabId = await tabIdFor(worker, server.url);
        const startingZoom = await worker.evaluate(async id => chrome.tabs.getZoom(id), tabId);
        if (startingZoom !== 1) {
            await worker.evaluate(async id => chrome.tabs.setZoom(id, 1), tabId);
            await page.waitForTimeout(150);
        }
        const before = await worker.evaluate(async id => chrome.tabs.getZoom(id), tabId);
        const defaultViewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, devicePixelRatio }));
        const zoomResult = await worker.evaluate(async ({ id, factor }) => {
            await chrome.tabs.setZoom(id, factor);
            return { zoom: await chrome.tabs.getZoom(id), tabUrl: (await chrome.tabs.get(id)).url };
        }, { id: tabId, factor: 2 });
        await page.waitForTimeout(150);
        const baseline = await page.evaluate(() => ({
            cssViewport: { width: innerWidth, height: innerHeight },
            devicePixelRatio,
            documentWidth: document.documentElement.scrollWidth,
        }));
        const fixture = await prepare(page, scenario);
        await page.locator(fixture.focusTarget).first().focus();
        await page.keyboard.press('Tab');
        await page.evaluate(()=>document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
        await page.waitForTimeout(600);
        const measurements = await measure(page, fixture.targets);
        const issues = [];
        if (before !== 1) issues.push(`Expected unzoomed baseline 1.0; observed ${before}.`);
        if (zoomResult.zoom !== 2) issues.push(`Browser tab zoom API reported ${zoomResult.zoom}; expected 2.0.`);
        if (zoomResult.tabUrl !== url) issues.push(`Zoom applied to unexpected tab URL ${zoomResult.tabUrl}.`);
        if (baseline.cssViewport.width >= 1280 || baseline.devicePixelRatio <= 1)
            issues.push('Browser zoom did not reduce CSS viewport and increase devicePixelRatio as expected.');
        if (measurements.viewport.pageOverflow > 1) issues.push(`Document horizontal overflow: ${measurements.viewport.pageOverflow}px.`);
        const scenarioWrites = writeRequests.slice(writeRequestStart);
        const scenarioPageErrors = pageErrors.slice(pageErrorStart);
        if (scenarioWrites.length) issues.push(`Unexpected non-read HTTP requests: ${scenarioWrites.length}.`);
        for (const target of measurements.targets) {
            if (!target.found) issues.push(`Stress target missing after browser zoom: ${target.selector}.`);
            else if (target.x < -1 || target.right > measurements.viewport.width + 1)
                issues.push(`Target extends horizontally past the viewport: ${target.selector} (${target.x}..${target.right}).`);
        }
        if (!measurements.activeFocus || ((measurements.activeFocus.outlineStyle === 'none' || measurements.activeFocus.outlineWidth === '0px') && measurements.activeFocus.boxShadow === 'none'))
            issues.push('Keyboard focus indicator was not measurable after actual browser zoom.');
        if (!measurements.activeFocus?.hitTest.received) issues.push('Keyboard focus target is not the receiver at its visible viewport point.');
        if (measurements.textClips.length) issues.push(`Potential clipped text elements: ${measurements.textClips.length}.`);
        const screenshotPath = path.join(path.dirname(outputPath), `browser-zoom-200-${scenario.id}.png`);
        // Native tab zoom changes the visual viewport independently of Playwright emulation.
        // Capture the compositor viewport directly, without Playwright's document clip rectangle.
        const cdp = await context.newCDPSession(page);
        const shot = await cdp.send('Page.captureScreenshot', { format:'png', fromSurface:true, captureBeyondViewport:false });
        await cdp.detach();
        const screenshotBytes = Buffer.from(shot.data,'base64');
        fs.writeFileSync(screenshotPath,screenshotBytes);
        evidence.scenarios.push({
            screenshot: { path: path.relative(root,screenshotPath).replaceAll('\\\\','/'), sha256: createHash('sha256').update(screenshotBytes).digest('hex') },
            id: scenario.id,
            route: scenario.path,
            browserZoom: { startingZoom, before, requested: 2, reported: zoomResult.zoom, tabUrl: zoomResult.tabUrl },
            defaultViewport,
            renderedAfterZoom: baseline,
            measurements,
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
    evidence.sourceHashesStable = sourceInputs.every(file=>createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')===evidence.sourceSha256[file]);
    if (!evidence.sourceHashesStable) evidence.result='FAIL_SOURCE_DRIFT';
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
