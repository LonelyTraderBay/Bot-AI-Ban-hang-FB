const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium, firefox, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const root = process.cwd(), out = __dirname;
const routes = JSON.parse(fs.readFileSync('../botsales-kit/contracts/route-manifest.json')).routes;
const ids = { conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001', knowledgeId: 'k1', jobId: 'missing-job' };
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const source = Object.keys(JSON.parse(fs.readFileSync('evidence/header-polish-20261110/final-source.json')).source);
const fingerprints = Object.fromEntries(source.map(file => [file, digest(file)]));
if (fs.existsSync(path.join(out, 'observations.ndjson'))) throw new Error('Do not overwrite an audit');
fs.mkdirSync(path.join(out, 'screens'), { recursive: true });
fs.writeFileSync(path.join(out, 'source-before.json'), JSON.stringify({ at: new Date().toISOString(), source: fingerprints }, null, 2));

async function measure(page) {
    return page.evaluate(() => {
        const visible = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'; };
        const name = e => (e.getAttribute('aria-label') || e.textContent || e.getAttribute('placeholder') || e.getAttribute('name') || '').trim().replace(/\s+/g, ' ').slice(0, 140);
        const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
        const main = document.querySelector('main') || document.body;
        const header = document.querySelector('header');
        let headerCenter = null;
        if (header?.firstElementChild) { const h = header.getBoundingClientRect(), r = header.firstElementChild.getBoundingClientRect(); headerCenter = r.top + r.height / 2 - h.top - h.height / 2; }
        const controls = [...main.querySelectorAll('button, [role="button"], [role="combobox"], input, textarea, select')].filter(visible);
        const smallTargets = controls.filter(e => (e.matches('button,[role="button"],[role="combobox"]')) && (e.getBoundingClientRect().height < 43.5 || e.getBoundingClientRect().width < 43.5)).map(e => ({ name: name(e), tag: e.tagName, disabled: e.matches(':disabled'), rect: rect(e) }));
        const clipped = [];
        for (const e of controls) {
            if (e.closest('.MuiTableContainer-root')) continue;
            const r = e.getBoundingClientRect();
            let p = e.parentElement;
            while (p && p !== document.body) {
                const s = getComputedStyle(p), b = p.getBoundingClientRect();
                const x = ['hidden', 'clip'].includes(s.overflowX) && (r.left < b.left - 1 || r.right > b.right + 1);
                const y = ['hidden', 'clip'].includes(s.overflowY) && (r.top < b.top - 1 || r.bottom > b.bottom + 1);
                if (x || y) { clipped.push({ name: name(e), tag: e.tagName, rect: rect(e), ancestor: p.tagName + '.' + p.className, bounds: rect(p), x, y }); break; }
                if (['auto', 'scroll'].includes(s.overflowX) || ['auto', 'scroll'].includes(s.overflowY)) break;
                p = p.parentElement;
            }
        }
        const truncated = [...main.querySelectorAll('label,.MuiChip-label,.MuiButton-root,.MuiTypography-root')].filter(visible).filter(e => e.clientWidth > 0 && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1) && (getComputedStyle(e).overflow === 'hidden' || getComputedStyle(e).textOverflow === 'ellipsis')).map(e => ({ name: name(e), rect: rect(e), scroll: [e.scrollWidth, e.scrollHeight], client: [e.clientWidth, e.clientHeight] }));
        const rows = [...main.querySelectorAll('.MuiStack-root')].filter(e => [...e.children].some(c => c.matches('h1,h2') || c.querySelector('h1,h2'))).filter(visible).map(e => ({ text: name(e), rect: rect(e), direction: getComputedStyle(e).flexDirection, align: getComputedStyle(e).alignItems, children: [...e.children].filter(visible).map(c => ({ text: name(c), rect: rect(c) })) }));
        return { heading: main.querySelector('h1,h2,h3')?.textContent?.trim(), h1: [...main.querySelectorAll('h1')].map(e => e.textContent),
            bodyText: main.innerText.slice(0, 22000), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            documentHeight: document.documentElement.scrollHeight, headerCenter, controls: controls.length, smallTargets, clipped, truncated, rows,
            buttons: [...main.querySelectorAll('button,a.MuiButton-root')].filter(visible).map(e => ({ name: name(e), disabled: e.matches(':disabled'), href: e.getAttribute('href') })),
            headings: [...main.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(e => ({ tag: e.tagName, text: name(e), size: getComputedStyle(e).fontSize, weight: getComputedStyle(e).fontWeight })) };
    });
}

(async () => {
    const { startDemoPreview } = await import(pathToFileURL(path.join(root, 'tests/session/demo-server.mjs')));
    const server = await startDemoPreview();
    const observations = [];
    try {
        await Promise.all([['chromium', chromium], ['firefox', firefox]].map(async ([engine, type]) => {
            const browser = await type.launch(engine === 'chromium' ? { channel: 'chrome' } : {});
            try {
                for (const width of [1440, 390, 320, 768]) {
                    const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 } });
                    const page = await context.newPage();
                    let pageErrors = [];
                    page.on('pageerror', e => pageErrors.push(e.message));
                    for (const route of routes) {
                        pageErrors = [];
                        const pathname = route.path.replace(':shopId', 'shop-demo').replace(/:([A-Za-z]+)/g, (_, key) => ids[key] || 'missing');
                        const record = { route: route.id, title: route.title, requested: pathname, engine, version: browser.version(), width };
                        try {
                            await page.goto(server.url + pathname, { waitUntil: 'domcontentloaded', timeout: 30000 });
                            await page.locator('main').first().waitFor({ state: 'visible', timeout: 15000 });
                            await page.locator('main h1,main h2,main h3').first().waitFor({ state: 'visible', timeout: 15000 });
                            await expect(page.locator('main [role="progressbar"]')).toHaveCount(0, { timeout: 15000 });
                            await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
                            record.actual = new URL(page.url()).pathname;
                            record.metrics = await measure(page);
                            if (engine === 'chromium' && [1440, 390].includes(width)) {
                                record.screenshot = `screens/${route.id}-${engine}-${width}.png`;
                                await page.screenshot({ path: path.join(out, record.screenshot), fullPage: true });
                                record.screenshotSha256 = digest(path.join(out, record.screenshot));
                                const axe = await new AxeBuilder({ page }).analyze();
                                record.axe = axe.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, html: n.html, failureSummary: n.failureSummary })) }));
                            }
                        } catch (e) { record.error = e.message; }
                        record.pageErrors = [...pageErrors];
                        observations.push(record);
                        fs.appendFileSync(path.join(out, 'observations.ndjson'), JSON.stringify(record) + '\n');
                        if (observations.length % 20 === 0) console.log(JSON.stringify({ observed: observations.length, expected: routes.length * 8, latest: route.id, engine, width }));
                    }
                    await context.close();
                }
            } finally { await browser.close(); }
        }));
    } finally { await server.close(); }
    const drift = Object.entries(fingerprints).filter(([file, sha]) => digest(file) !== sha).map(([file]) => file);
    const result = { recordedAt: new Date().toISOString(), expected: routes.length * 8, observed: observations.length, routes: routes.length, sourceDrift: drift,
        errors: observations.filter(o => o.error || o.pageErrors.length), candidates: observations.filter(o => o.metrics && (o.metrics.overflow > 0 || o.metrics.clipped.length || o.metrics.truncated.length || o.metrics.smallTargets.length || o.axe?.length)), observations };
    fs.writeFileSync(path.join(out, 'matrix.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ expected: result.expected, observed: result.observed, errors: result.errors.length, candidates: result.candidates.length, sourceDrift: drift }));
})().catch(e => { console.error(e); process.exitCode = 1; });
