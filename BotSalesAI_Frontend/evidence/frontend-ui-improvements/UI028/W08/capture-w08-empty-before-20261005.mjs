import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startDemoServer } from '../../../../tests/session/demo-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const demo = await startDemoServer({ cacheIsolationKey: 'ui028-w08-empty-before-20261005' });
const contract = JSON.parse(await fs.readFile(path.join(here, 'design-contract-pre-code-20261005.json'), 'utf8'));
const errors = [];
const states = [];
let browser;

async function openRoute(page, route) {
    await page.goto(new URL(route, demo.url).toString(), { waitUntil: 'domcontentloaded' });
    await page.locator('main#main-content h1').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('main#main-content .MuiLinearProgress-root').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
}

async function chooseEmptyDemoMode(page) {
    await openRoute(page, '/s/shop-demo/overview');
    const statePicker = page.getByRole('combobox', { name: 'Trạng thái thử' });
    await statePicker.waitFor({ state: 'visible', timeout: 20000 });
    await statePicker.click();
    await page.getByRole('option', { name: 'Danh sách rỗng (demo)', exact: true }).click();
    await page.evaluate(route => {
        window.history.pushState({}, '', route);
        window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    }, '/s/shop-demo/integrations/ai');
    await page.locator('main#main-content h1').waitFor({ state: 'visible', timeout: 20000 });
    await page.getByRole('status').filter({ hasText: 'Chưa có kết nối AI.' }).waitFor({ state: 'visible', timeout: 10000 });
}

async function sha256(file) {
    return createHash('sha256').update(await fs.readFile(path.join(root, file))).digest('hex');
}

try {
    assert.equal(await sha256('apps/web/src/shared/ui/components.tsx'), contract.sourceHashesBeforeCode['apps/web/src/shared/ui/components.tsx']);
    assert.equal(await sha256('apps/web/src/shared/ui/layout.ts'), contract.sourceHashesBeforeCode['apps/web/src/shared/ui/layout.ts']);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
        await chooseEmptyDemoMode(page);
        const empty = page.locator('main#main-content .MuiStack-root[role="status"]').filter({ hasText: 'Chưa có kết nối AI.' }).first();
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
        assert.equal(measurement.documentWidth, width);
        const screenshot = `w08-before-ai-empty-${width}.png`;
        await page.screenshot({ path: path.join(here, screenshot), fullPage: false });
        states.push({ route: '/s/shop-demo/integrations/ai', width, seedMode: 'Danh sách rỗng (demo)', measurement, screenshot });
    }
    assert.deepEqual(errors, []);
    const result = {
        capturedAt: '2026-10-05',
        status: 'CAPTURED',
        scope: 'pre-code Empty component rendered with the app-owned deterministic synthetic empty-list mode; no mutation',
        browser: 'Chromium via Playwright',
        sourceHashesAtCapture: {
            'apps/web/src/shared/ui/components.tsx': await sha256('apps/web/src/shared/ui/components.tsx'),
            'apps/web/src/shared/ui/layout.ts': await sha256('apps/web/src/shared/ui/layout.ts'),
        },
        states,
        pageErrors: errors,
    };
    await fs.writeFile(path.join(here, 'render-empty-before-code-current-20261005.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify(result, null, 2));
} catch (error) {
    await fs.writeFile(path.join(here, 'render-empty-before-code-attempt-current-20261005.json'), `${JSON.stringify({ capturedAt: '2026-10-05', status: 'FAIL', error: error instanceof Error ? error.stack : String(error), states, pageErrors: errors }, null, 2)}\n`, 'utf8');
    throw error;
} finally {
    await browser?.close();
    await demo.close();
}
