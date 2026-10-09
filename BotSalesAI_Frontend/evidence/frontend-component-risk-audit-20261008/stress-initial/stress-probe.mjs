import fs from 'node:fs';
import path from 'node:path';
import { chromium, firefox } from 'playwright';
import { startDemoServer } from '../../tests/session/demo-server.mjs';
import { measurePage } from './browser-probe.mjs';

const out = path.resolve('evidence/frontend-component-risk-audit-20261008');
const server = await startDemoServer({ cacheIsolationKey: 'component-risk-audit' });
const fixture = '/@fs/' + path.join(out, 'stress-fixture.tsx').replaceAll('\\', '/');
const cases = ['field-group-mixed', 'form-fields-mixed', 'action-group-mixed', 'page-header-actions', 'stat-money', 'detail-money', 'empty-long-code', 'copyable-long-code', 'status-with-content', 'pager-long-total'];
const observations = [], errors = [];
try {
    for (const engine of ['chromium', 'firefox']) {
        const browser = await ({ chromium, firefox }[engine]).launch({ headless: true });
        try {
            const page = await browser.newPage();
            let scope = '';
            page.on('pageerror', e => errors.push({ engine, scope, error: e.message }));
            for (const width of [320, 1440]) for (const id of cases) {
                scope = `${id}:${width}`;
                await page.setViewportSize({ width, height: 900 });
                await page.goto(server.url + '/s/shop-demo/products');
                await page.locator('main h1').waitFor();
                await page.evaluate(async ({ fixture, id }) => {
                    const container = document.createElement('section');
                    document.querySelector('main').replaceChildren(container);
                    (await import(fixture)).mountStress(container, id);
                    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                }, { fixture, id });
                await page.locator('main section > *').first().waitFor();
                const geometry = await page.evaluate(measurePage);
                const extra = await page.evaluate(() => ({
                    amount: [...document.querySelectorAll('main span')].filter(e => e.textContent.includes('999.999')).map(e => ({ width: e.getBoundingClientRect().width, parentWidth: e.parentElement.getBoundingClientRect().width, clippedBy: (() => { const results = []; for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).overflowX === 'hidden') results.push(n.className); return results; })() })),
                    chips: [...document.querySelectorAll('main .MuiChip-root')].map(e => ({ height: e.getBoundingClientRect().height, parentHeight: e.parentElement.getBoundingClientRect().height, alignItems: getComputedStyle(e.parentElement).alignItems })),
                }));
                observations.push({ engine, id, width, scope: 'Diagnostic fixture renders real shared components with synthetic props; not a canonical route or production incident', ...geometry, ...extra });
                console.log(JSON.stringify({ engine, id, width, pageWidth: geometry.document.scrollWidth, stretched: geometry.stretchedActions.map(a => ({ label: a.label, height: a.box.height, naturalHeight: a.naturalHeight })), amount: extra.amount, chips: extra.chips }));
                if (width === 320) { const file = `${engine}-fixture-${id}-${width}.png`; await page.screenshot({ path: path.join(out, file) }); observations.at(-1).screenshot = file; }
            }
        } finally { await browser.close(); }
    }
} finally {
    await server.close();
    fs.writeFileSync(path.join(out, 'stress-fixtures.json'), JSON.stringify({ capturedAt: new Date().toISOString(), method: 'real shared render with controlled props, VIEWPORT_REFLOW only', observations, errors }, null, 2));
}
