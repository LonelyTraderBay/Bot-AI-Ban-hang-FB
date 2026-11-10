const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const crypto = require('node:crypto');
const { chromium, firefox, expect } = require('@playwright/test');

const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Expected before or after');
const dir = __dirname;
const root = process.cwd();
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
if (fs.existsSync(path.join(dir, `${phase}.json`))) throw new Error('Do not overwrite an evidence capture');

(async () => {
    const { startDemoPreview } = await import(pathToFileURL(path.join(root, 'tests/session/demo-server.mjs')));
    const server = await startDemoPreview();
    const observations = [], captures = [];
    fs.mkdirSync(path.join(dir, phase), { recursive: true });
    const startedAt = new Date().toISOString();
    try {
        for (const [name, type] of [['chromium', chromium], ['firefox', firefox]]) {
            const browser = await type.launch(name === 'chromium' ? { channel: 'chrome' } : {});
            try {
                const context = await browser.newContext();
                const page = await context.newPage();
                for (const width of [320, 390, 768, 1280, 1440, 1920]) {
                    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
                    await page.goto(`${server.url}/s/shop-demo/shipments`);
                    await expect(page.locator('main h1')).toBeVisible();
                    await expect(page.locator('header [aria-label="Dữ liệu mô phỏng"]')).toBeVisible();
                    const metrics = await page.locator('header').evaluate(header => {
                        const row = header.firstElementChild;
                        const h = header.getBoundingClientRect(), r = row.getBoundingClientRect();
                        const style = getComputedStyle(header);
                        return { height: h.height, rowHeight: r.height, centerOffset: (r.top + r.height / 2) - (h.top + h.height / 2),
                            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                            background: style.backgroundColor, border: style.borderBottomColor,
                            breadcrumb: header.querySelector('nav')?.textContent,
                            mode: header.querySelector('[aria-label="Dữ liệu mô phỏng"]')?.textContent };
                    });
                    observations.push({ browser: name, version: browser.version(), route: 'R42', path: new URL(page.url()).pathname, width, metrics });
                    if ([320, 390, 1440].includes(width)) {
                        const file = path.join(dir, phase, `R42-${name}-${width}.png`);
                        if (width === 320) await page.locator('header').screenshot({ path: file });
                        else await page.screenshot({ path: file });
                        captures.push({ path: path.relative(root, file).replaceAll('\\', '/'), sha256: digest(file) });
                    }
                }
                await context.close();
            } finally { await browser.close(); }
        }
    } finally { await server.close(); }
    const ledger = JSON.parse(fs.readFileSync('evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json'));
    const sourceFingerprints = Object.fromEntries(Object.keys(ledger.sourceFingerprints).map(file => [file, digest(path.resolve(root, '..', file))]));
    const result = { phase, startedAt, finishedAt: new Date().toISOString(), expected: 12, observed: observations.length, observations, captures, sourceFingerprints };
    fs.writeFileSync(path.join(dir, `${phase}.json`), `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify({ phase, expected: result.expected, observed: result.observed, offsets: observations.map(o => ({ browser: o.browser, width: o.width, offset: o.metrics.centerOffset, overflow: o.metrics.overflow })) }));
})().catch(error => { console.error(error); process.exitCode = 1; });
