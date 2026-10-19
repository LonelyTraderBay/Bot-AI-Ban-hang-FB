import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { evidenceRunId } from '../../../../tests/evidence-run-id.mjs';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const root = process.cwd();
const outputPath = path.join(root, `evidence/frontend-ui-improvements/UI028/W30/actual-browser-zoom-200-current-${evidenceRunId}.json`);
const sourceInputs = [
    '../botsales-kit/contracts/route-manifest.json',
    'apps/web/src/app/Shell.tsx',
    'apps/web/src/app/tokens.css',
    'apps/web/src/modules/catalog/index.tsx',
    'apps/web/src/modules/inbox/index.tsx',
    'apps/web/src/modules/reports/index.tsx',
    'tests/ui028-w30-stress.spec.ts',
    'tests/evidence-run-id.mjs',
    'evidence/frontend-ui-improvements/UI028/W30/design-contract-pre-stress-current-20261006.md',
    'evidence/frontend-ui-improvements/UI028/W30/capture-actual-browser-zoom-200-current-20261006.mjs',
];
const scenarios = [
    { id: 'form-error-short', path: '/s/shop-demo/products/new' },
    { id: 'mobile-menu-long-label', path: '/s/shop-demo/overview' },
    { id: 'report-long-id', path: '/s/shop-demo/reports/marketing' },
    { id: 'inbox-long-composer', path: '/s/shop-demo/inbox/cv1' },
    { id: 'dialog-long-reason', path: '/s/shop-demo/inbox/cv1' },
];

async function setDefaultPageZoom(settingsPage, factor) {
    await settingsPage.goto('chrome://settings/appearance', { waitUntil: 'domcontentloaded' });
    const control = settingsPage.locator('#zoomLevel');
    await control.waitFor({ state: 'visible', timeout: 10_000 });
    const before = await control.inputValue();
    if (before !== String(factor)) await control.selectOption(String(factor));
    await settingsPage.waitForTimeout(300);
    const value = await control.inputValue();
    const label = (await control.locator(`option[value="${factor}"]`).innerText()).trim();
    if (value !== String(factor)) throw new Error(`Chrome Settings read back page zoom ${value}; expected ${factor}.`);
    return { before, value, label, settingsRoute: settingsPage.url() };
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
            const label = element.querySelector('.MuiListItemText-primary');
            if (!label) throw new Error('Navigation primary label was not rendered in its text container.');
            element.dataset.w30LongLabel = 'true';
            label.textContent = `Sản phẩm ${'Danh mục sản phẩm nhãn dài '.repeat(8)} ID-${'NAV-LONG-'.repeat(8)}`;
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
        return { targets: ['[data-w30-long-id="true"]', 'main h1', 'button[aria-label="Mở menu"]'], focusTarget: 'button[aria-label="Mở menu"]' };
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

async function settleVisuals(page) {
    await page.evaluate(async () => {
        await document.fonts.ready;
        const deadline = performance.now() + 2_000;
        await new Promise(resolve => {
            const check = () => {
                const running = document.getAnimations({ subtree: true }).filter(animation =>
                    animation.playState === 'running' && Number.isFinite(animation.effect?.getComputedTiming().endTime));
                if (running.length === 0 || performance.now() >= deadline) resolve();
                else requestAnimationFrame(check);
            };
            requestAnimationFrame(check);
        });
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
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
            navigationLabelLayout,
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
                bounds: { x: activeRect.x, right: activeRect.right, y: activeRect.y, bottom: activeRect.bottom },
            } : null,
        };
    }, selectors);
}

const evidence = {
    schemaVersion: 1,
    task: 'UI028.W30',
    recordedAt: new Date().toISOString(),
    scope: 'Isolated Chromium with local React demo and synthetic MSW; no backend or persistent app writes',
    sourceSha256: Object.fromEntries(sourceInputs.map(relative => [relative, createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex')])),
    method: {
        browser: 'Google Chrome stable, headed, fresh temporary profile',
        mechanism: 'The native Page zoom select in chrome://settings/appearance is set and read back through the browser Settings UI; the app viewport and devicePixelRatio are measured after navigation.',
        baselineViewport: { width: 1280, height: 720 },
        targetZoomFactor: 2,
        note: 'This changes Chrome native Page zoom, not CSS zoom, emulated viewport, device scale, or injected font size. No extension is installed.',
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
    context = await chromium.launchPersistentContext(path.join(temporaryRoot, 'profile'), {
        channel: 'chrome',
        headless: false,
        viewport: { width: 1280, height: 720 },
    });
    const page = context.pages()[0] ?? await context.newPage();
    const settingsPage = await context.newPage();
    const pageErrors = [];
    const writeRequests = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method().toUpperCase())) {
            writeRequests.push({ method: request.method(), url: request.url() });
        }
    });
    evidence.method.browserVersion = context.browser().version();
    evidence.method.initialPageZoom = await setDefaultPageZoom(settingsPage, 1);

    for (const scenario of scenarios) {
        const writeRequestStart = writeRequests.length;
        const pageErrorStart = pageErrors.length;
        const url = new URL(scenario.path, server.url).toString();
        const baselineZoomSetting = await setDefaultPageZoom(settingsPage, 1);
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading').first().waitFor({ state: 'visible', timeout: 15_000 });
        const startingZoom = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, devicePixelRatio }));
        const defaultViewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, devicePixelRatio }));
        const baselineScreenshotPath = path.join(root, `evidence/frontend-ui-improvements/UI028/W30/actual-browser-zoom-100-${scenario.id}-baseline-${evidenceRunId}.png`);
        const baselineScreenshotBytes = await page.screenshot({ fullPage: false });
        fs.writeFileSync(baselineScreenshotPath, baselineScreenshotBytes);
        const zoomResult = await setDefaultPageZoom(settingsPage, 2);
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading').first().waitFor({ state: 'visible', timeout: 15_000 });
        await page.waitForTimeout(150);
        const baseline = await page.evaluate(() => ({
            cssViewport: { width: innerWidth, height: innerHeight },
            devicePixelRatio,
            documentWidth: document.documentElement.scrollWidth,
            route: location.pathname,
        }));
        const fixture = await prepare(page, scenario);
        await settleVisuals(page);
        const focusTarget = page.locator(fixture.focusTarget).first();
        await focusTarget.focus();
        await settleVisuals(page);
        const focusedTarget = await focusTarget.evaluate(element => {
            const bounds = element.getBoundingClientRect();
            const visible = {
                left: Math.max(bounds.left, 0),
                top: Math.max(bounds.top, 0),
                right: Math.min(bounds.right, innerWidth),
                bottom: Math.min(bounds.bottom, innerHeight),
            };
            let ancestor = element.parentElement;
            while (ancestor && ancestor !== document.documentElement) {
                const style = getComputedStyle(ancestor);
                const clip = ancestor.getBoundingClientRect();
                if (/(hidden|clip|auto|scroll)/.test(style.overflowX)) {
                    visible.left = Math.max(visible.left, clip.left + ancestor.clientLeft);
                    visible.right = Math.min(visible.right, clip.left + ancestor.clientLeft + ancestor.clientWidth);
                }
                if (/(hidden|clip|auto|scroll)/.test(style.overflowY)) {
                    visible.top = Math.max(visible.top, clip.top + ancestor.clientTop);
                    visible.bottom = Math.min(visible.bottom, clip.top + ancestor.clientTop + ancestor.clientHeight);
                }
                ancestor = ancestor.parentElement;
            }
            const visibleWidth = Math.max(0, visible.right - visible.left);
            const visibleHeight = Math.max(0, visible.bottom - visible.top);
            const visibleArea = visibleWidth * visibleHeight;
            const x = visibleArea > 0 ? (visible.left + visible.right) / 2 : 0;
            const y = visibleArea > 0 ? (visible.top + visible.bottom) / 2 : 0;
            const hit = visibleArea > 0 ? document.elementFromPoint(x, y) : null;
            return {
                active: document.activeElement === element,
                visibleArea,
                visibleBounds: visibleArea > 0 ? visible : null,
                bounds: { x: bounds.x, y: bounds.y, right: bounds.right, bottom: bounds.bottom },
                receivesPointerAtVisibleCenter: Boolean(hit && (hit === element || element.contains(hit))),
                hitTag: hit?.tagName.toLowerCase() || null,
                hitRole: hit?.getAttribute('role') || null,
                hitText: hit?.textContent?.trim().slice(0, 80) || '',
            };
        });
        const focusedScreenshotPath = path.join(root, `evidence/frontend-ui-improvements/UI028/W30/actual-browser-zoom-200-${scenario.id}-focused-${evidenceRunId}.png`);
        const focusedScreenshotBytes = await page.screenshot({ fullPage: false });
        fs.writeFileSync(focusedScreenshotPath, focusedScreenshotBytes);
        await page.keyboard.press('Tab');
        const measurements = await measure(page, fixture.targets);
        const screenshotPath = path.join(root, `evidence/frontend-ui-improvements/UI028/W30/actual-browser-zoom-200-${scenario.id}-after-tab-${evidenceRunId}.png`);
        const screenshotBytes = await page.screenshot({ fullPage: false });
        const issues = [];
        if (!focusedTarget.active || focusedTarget.visibleArea <= 0 || !focusedTarget.receivesPointerAtVisibleCenter)
            issues.push(`Focused target is not visibly reachable at 200%: ${JSON.stringify(focusedTarget)}.`);
        if (baselineZoomSetting.value !== '1' || baselineZoomSetting.label !== '100%')
            issues.push(`Chrome Settings did not confirm the 100% baseline: ${JSON.stringify(baselineZoomSetting)}.`);
        if (zoomResult.value !== '2' || zoomResult.label !== '200%')
            issues.push(`Chrome Settings did not confirm native 200% page zoom: ${JSON.stringify(zoomResult)}.`);
        const expectedRoute = new URL(url);
        if (baseline.route !== expectedRoute.pathname)
            issues.push(`Measured unexpected app route ${baseline.route}; expected ${expectedRoute.pathname}.`);
        if (defaultViewport.width !== 1280 || defaultViewport.devicePixelRatio !== 1)
            issues.push(`Expected a 1280px/DPR1 100% baseline; observed ${JSON.stringify(defaultViewport)}.`);
        if (baseline.cssViewport.width >= defaultViewport.width || baseline.devicePixelRatio <= defaultViewport.devicePixelRatio)
            issues.push('Native browser zoom did not reduce CSS viewport and increase devicePixelRatio.');
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
            browserZoom: { startingZoom, baselineSetting: baselineZoomSetting, requestedFactor: 2, reportedFactor: zoomResult.value, reportedLabel: zoomResult.label, settingsRoute: zoomResult.settingsRoute },
            defaultViewport,
            renderedAfterZoom: baseline,
            baselineScreenshot: { path: path.relative(root, baselineScreenshotPath).replaceAll('\\', '/'), sha256: createHash('sha256').update(baselineScreenshotBytes).digest('hex') },
            focusedTarget,
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
