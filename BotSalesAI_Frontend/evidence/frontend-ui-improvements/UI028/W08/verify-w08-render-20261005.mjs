import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const demo = await startDemoServer({ cacheIsolationKey: 'ui028-w08-after-20261005' });
const baseline = JSON.parse(await fs.readFile(path.join(here, 'render-before-code-current-20261005.json'), 'utf8'));
const contract = JSON.parse(await fs.readFile(path.join(here, 'design-contract-pre-code-20261005.json'), 'utf8'));
const errors = [];
const states = [];
const emptyStates = [];
let browser;

function px(value) { return `${value}px`; }
function assertNoOverflow(metric, width, name) {
    assert.ok(metric.documentWidth <= width, `${name}: document width ${metric.documentWidth} exceeds viewport ${width}`);
}
async function openRoute(page, route) {
    await page.goto(new URL(route, demo.url).toString(), { waitUntil: 'domcontentloaded' });
    await page.locator('main#main-content h1').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('main#main-content .MuiLinearProgress-root').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
}
async function sourceHashes() {
    const files = Object.keys(contract.sourceHashesBeforeCode);
    return Object.fromEntries(await Promise.all(files.map(async file => [
        file,
        createHash('sha256').update(await fs.readFile(path.join(root, file))).digest('hex'),
    ])));
}
async function recordDialog(page, { route, name, width, trigger }) {
    const height = width < 500 ? 844 : 900;
    await page.setViewportSize({ width, height });
    await openRoute(page, route);
    await page.getByRole('button', { name: trigger, exact: true }).click();
    const dialog = page.getByRole('dialog').last();
    await dialog.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(200);
    const measurement = await dialog.evaluate(element => {
        const container = element.closest('.MuiDialog-container');
        const content = element.querySelector('.MuiDialogContent-root');
        const actions = element.querySelector('.MuiDialogActions-root');
        const description = element.querySelector('.MuiDialogContent-root > .MuiTypography-root');
        const style = node => node ? (() => {
            const computed = getComputedStyle(node);
            return {
                padding: computed.padding,
                paddingTop: computed.paddingTop,
                paddingRight: computed.paddingRight,
                paddingBottom: computed.paddingBottom,
                paddingLeft: computed.paddingLeft,
                gap: computed.gap,
                marginBottom: computed.marginBottom,
                marginLeft: computed.marginLeft,
            };
        })() : null;
        const rect = node => node ? (() => {
            const bounds = node.getBoundingClientRect();
            return {
                x: Math.round(bounds.x),
                y: Math.round(bounds.y),
                width: Math.round(bounds.width),
                height: Math.round(bounds.height),
                right: Math.round(bounds.right),
                bottom: Math.round(bounds.bottom),
            };
        })() : null;
        return {
            title: element.getAttribute('aria-labelledby') ? document.getElementById(element.getAttribute('aria-labelledby'))?.textContent?.trim() : null,
            container: rect(container),
            paper: rect(element),
            paperStyle: style(element),
            content: style(content),
            description: style(description),
            actions: style(actions),
            actionButtons: [...element.querySelectorAll('.MuiDialogActions-root button')].map(style),
            viewport: { width: innerWidth, height: innerHeight },
            documentWidth: document.documentElement.scrollWidth,
        };
    });

    const expectedMargin = width < 768 ? 16 : 32;
    const expectedContentInset = width < 768 ? 16 : 24;
    assert.equal(measurement.paperStyle.marginLeft, px(expectedMargin), `${name}/${width}: dialog viewport inset`);
    assert.equal(measurement.content.padding, px(expectedContentInset), `${name}/${width}: content inset`);
    assert.equal(measurement.actions.padding, px(16), `${name}/${width}: action inset`);
    assert.equal(measurement.actions.gap, px(8), `${name}/${width}: explicit action gap`);
    assert.ok(measurement.actionButtons.length >= 2, `${name}/${width}: expected cancel and primary actions`);
    assert.equal(measurement.actionButtons[1].marginLeft, '0px', `${name}/${width}: no MUI child margin duplication`);
    if (measurement.description) assert.equal(measurement.description.marginBottom, px(16), `${name}/${width}: description gap`);
    assert.ok(measurement.paper.x >= expectedMargin && measurement.paper.right <= width - expectedMargin, `${name}/${width}: dialog remains within viewport margins`);
    assertNoOverflow(measurement, width, `${name}/${width}`);

    const screenshot = `w08-after-${name}-${width}.png`;
    await page.screenshot({ path: path.join(here, screenshot), fullPage: false });
    states.push({ route, name, width, trigger, measurement, screenshot, status: 'PASS' });
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
}

async function recordEmpty(page, width) {
    const height = width < 500 ? 844 : 900;
    await page.setViewportSize({ width, height });
    const route = '/s/shop-demo/integrations/ai';
    await openRoute(page, route);
    const empty = page.locator('main#main-content .MuiStack-root[role="status"]').filter({ hasText: 'Chưa có kết nối AI.' }).first();
    if (await empty.count() === 0) {
        emptyStates.push({ route, width, status: 'NOT_OBSERVED', reason: 'The default in-memory demo seed has AI connections; empty-list selection was unavailable in this standalone browser run.' });
        return;
    }
    await empty.waitFor({ state: 'visible', timeout: 5000 });
    const measurement = await empty.evaluate(element => {
        const style = getComputedStyle(element);
        return {
            padding: style.padding,
            paddingTop: style.paddingTop,
            paddingRight: style.paddingRight,
            paddingBottom: style.paddingBottom,
            paddingLeft: style.paddingLeft,
            gap: style.gap,
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: innerWidth,
            text: element.textContent?.trim(),
        };
    });
    assert.equal(measurement.paddingLeft, px(16), `empty/${width}: inline inset`);
    assert.equal(measurement.paddingRight, px(16), `empty/${width}: inline inset`);
    assert.equal(measurement.paddingTop, px(width < 768 ? 32 : 48), `empty/${width}: responsive block inset`);
    assert.equal(measurement.gap, px(16), `empty/${width}: content gap`);
    assertNoOverflow({ documentWidth: measurement.documentWidth }, width, `empty/${width}`);
    const screenshot = `w08-after-ai-empty-${width}.png`;
    await page.screenshot({ path: path.join(here, screenshot), fullPage: false });
    emptyStates.push({ route, width, measurement, screenshot, status: 'PASS' });
}

try {
    assert.equal(baseline.status, 'CAPTURED', 'pre-code baseline must be valid before comparison');
    assert.equal(baseline.browser, 'Chromium via Playwright');
    assert.equal(baseline.states.length, 4, 'expected both dialog types at both viewports');
    assert.ok(baseline.emptyStates.every(item => item.available === false), 'do not claim an Empty-state browser baseline when the default seed did not render it');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1280, 390]) {
        await recordDialog(page, { route: '/s/shop-demo/customers', name: 'customer-create', width, trigger: 'Thêm khách hàng' });
        await recordDialog(page, { route: '/s/shop-demo/integrations/channels', name: 'channel-confirm', width, trigger: 'Ngắt kết nối' });
        await recordEmpty(page, width);
    }
    assert.deepEqual(errors, [], 'browser console page errors');
    const currentHashes = await sourceHashes();
    const result = {
        capturedAt: '2026-10-05',
        status: emptyStates.some(item => item.status === 'NOT_OBSERVED') ? 'PARTIAL' : 'PASS',
        scope: 'post-code local React demo with synthetic in-memory API; no mutation; exact paired desktop/mobile dialog geometry checks; Empty state is explicitly reported if not observable',
        browser: 'Chromium via Playwright',
        baseline: {
            artifacts: ['render-before-code-current-20261005.json'],
            emptyStateProbe: 'R30 was not rendered by the default synthetic seed in the pre-code baseline; see baseline.emptyStates.',
            sourceHashesBeforeCode: contract.sourceHashesBeforeCode,
        },
        sourceHashesAfterCode: currentHashes,
        states,
        emptyStates,
        pageErrors: errors,
        comparison: 'Same routes, seed, browser and 1280x900/390x844 viewports; baseline and after artifacts retained separately.',
    };
    await fs.writeFile(path.join(here, 'render-after-code-verified-current-20261005.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ status: result.status, sourceHashesAfterCode: currentHashes, states: states.map(item => ({ name: item.name, width: item.width, measurement: item.measurement })), emptyStates, pageErrors: errors }, null, 2));
} catch (error) {
    await fs.writeFile(path.join(here, 'render-after-code-verified-current-20261005.json'), `${JSON.stringify({ capturedAt: '2026-10-05', status: 'FAIL', error: error instanceof Error ? error.stack : String(error), states, emptyStates, pageErrors: errors }, null, 2)}\n`, 'utf8');
    throw error;
} finally {
    await browser?.close();
    await demo.close();
}
