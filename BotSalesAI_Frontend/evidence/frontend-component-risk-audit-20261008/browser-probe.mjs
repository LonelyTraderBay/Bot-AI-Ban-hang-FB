import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium, firefox } from 'playwright';

const root = process.cwd(), out = path.join(root, 'evidence/frontend-component-risk-audit-20261008');
const inventory = JSON.parse(fs.readFileSync(path.join(out, 'inventory.json')));
const engine = process.argv[2] || 'chromium';
const baseUrl = 'http://127.0.0.1:4173';
const ids = { conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001', knowledgeId: 'k1', jobId: 'missing-job' };
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const index = await fetch(baseUrl).then(r => r.text());
const builtIndex = fs.readFileSync(path.join(root, 'apps/web/dist-demo/index.html'), 'utf8');
if (index !== builtIndex) throw new Error('Preview index differs from the current build.');
const asset = index.match(/src="([^"]+\.js)"/)[1];
const assetBytes = Buffer.from(await fetch(baseUrl + asset).then(r => r.arrayBuffer()));
if (!assetBytes.equals(fs.readFileSync(path.join(root, 'apps/web/dist-demo', asset)))) throw new Error('Preview JS differs from the current build.');

export function measurePage() {
    const visible = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[aria-hidden="true"], [hidden]'); };
    const selector = e => { const bits = []; for (let n = e; n && n !== document.body; n = n.parentElement) { bits.unshift(n.tagName.toLowerCase() + (n.id ? `#${n.id}` : `:nth-child(${[...n.parentElement.children].indexOf(n) + 1})`)); if (n.id) break; } return bits.join(' > '); };
    const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const roots = [...document.querySelectorAll('main, [role="dialog"]')];
    const elements = [...new Set(roots.flatMap(r => [r, ...r.querySelectorAll('*')]))].filter(visible);
    const actions = elements.filter(e => e.matches('.MuiButton-root, .MuiIconButton-root')).map(e => {
        const s = getComputedStyle(e), p = e.parentElement, ps = getComputedStyle(p), original = rect(e);
        const clone = e.cloneNode(true);
        clone.removeAttribute('id'); clone.setAttribute('aria-hidden', 'true');
        for (const child of clone.querySelectorAll('[id]')) child.removeAttribute('id');
        Object.assign(clone.style, { position: 'fixed', visibility: 'hidden', pointerEvents: 'none', width: `${original.width}px`, height: 'auto', maxHeight: 'none', flex: 'none', alignSelf: 'flex-start', top: '0', left: '0' });
        p.appendChild(clone);
        const naturalHeight = clone.getBoundingClientRect().height;
        clone.remove();
        return { selector: selector(e), label: e.getAttribute('aria-label') || e.textContent.trim(), box: original, naturalHeight, excessHeight: original.height - naturalHeight, alignSelf: s.alignSelf, parent: { selector: selector(p), composition: p.getAttribute('data-ui-composition'), display: ps.display, direction: ps.flexDirection, alignItems: ps.alignItems, flexWrap: ps.flexWrap, box: rect(p), text: p.textContent.trim().slice(0, 320) }, disabled: e.matches(':disabled, [aria-disabled=true]') };
    });
    const layouts = elements.filter(e => { const s = getComputedStyle(e); return (s.display === 'flex' && s.flexDirection === 'row') || s.display === 'grid'; }).map(e => {
        const s = getComputedStyle(e);
        return { selector: selector(e), composition: e.getAttribute('data-ui-composition'), display: s.display, alignItems: s.alignItems, flexWrap: s.flexWrap, gap: s.gap, box: rect(e), children: [...e.children].filter(visible).map(c => ({ tag: c.tagName, label: c.getAttribute('aria-label') || c.textContent.trim().slice(0, 160), className: c.className?.toString(), box: rect(c) })) };
    });
    const localOverflow = elements.filter(e => { const s = getComputedStyle(e); return e.scrollWidth > e.clientWidth + 3 && !e.closest('.MuiTableContainer-root, .recharts-wrapper') && !e.matches('input, textarea, svg, path') && !['auto', 'scroll'].includes(s.overflowX); }).map(e => ({ selector: selector(e), tag: e.tagName, className: e.className?.toString(), clientWidth: e.clientWidth, scrollWidth: e.scrollWidth, text: e.textContent.trim().slice(0, 160), overflowX: getComputedStyle(e).overflowX }));
    return { heading: document.querySelector('main h1')?.textContent, document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }, actions, stretchedActions: actions.filter(a => a.excessHeight > 3 && ['normal', 'stretch'].includes(a.parent.alignItems) && a.alignSelf === 'auto' && a.parent.display === 'flex' && a.parent.direction === 'row'), layouts, localOverflow, nestedForms: document.querySelectorAll('form form').length };
}

if (process.argv[1]?.endsWith('browser-probe.mjs')) {
    const browser = await ({ chromium, firefox }[engine]).launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const observations = [], errors = [], requests = [];
    let scope = '';
    page.on('pageerror', e => errors.push({ scope, message: e.message }));
    page.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/')) requests.push({ scope, method: r.method(), path: new URL(r.url()).pathname }); });
    try {
        for (const width of [320, 390, 768, 1440]) for (const route of inventory.routes) {
            const pathname = route.path.replace(':shopId', 'shop-demo').replace(/:([A-Za-z]+)/g, (_, key) => ids[key] || 'missing');
            scope = `${route.id}:${width}`;
            await page.setViewportSize({ width, height: 900 });
            await page.goto(baseUrl + pathname, { waitUntil: 'domcontentloaded' });
            await page.locator('main h1').waitFor({ state: 'visible', timeout: 20000 });
            await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'), { timeout: 20000 });
            await page.evaluate(() => document.fonts.ready);
            const result = await page.evaluate(measurePage);
            observations.push({ id: route.id, path: pathname, actualUrl: page.url(), width, ...result });
            if (result.stretchedActions.length || result.document.scrollWidth > width || result.localOverflow.length) console.log(JSON.stringify({ scope, stretched: result.stretchedActions.map(a => ({ label: a.label, height: a.box.height, naturalHeight: a.naturalHeight })), overflow: result.localOverflow.length, pageWidth: result.document.scrollWidth }));
            if (observations.length % 27 === 0) console.log(`${engine}: ${observations.length}/216`);
        }
    } finally {
        const sourceDrift = Object.entries(inventory.fingerprints).filter(([file, expected]) => sha(fs.readFileSync(path.join(root, file))) !== expected).map(([file]) => file);
        const result = { capturedAt: new Date().toISOString(), engine, method: 'VIEWPORT_REFLOW + intrinsic action clone at identical width; no CSS or browser zoom claims', baseUrl, indexSha256: sha(index), asset, assetSha256: sha(assetBytes), expectedObservations: 216, observedObservations: observations.length, errors, requests, sourceDrift, observations };
        fs.writeFileSync(path.join(out, `routes-${engine}.json`), JSON.stringify(result, null, 2));
        await browser.close();
        console.log(JSON.stringify({ engine, observations: observations.length, errors: errors.length, sourceDrift, stretchObservations: observations.filter(o => o.stretchedActions.length).length, overflowObservations: observations.filter(o => o.document.scrollWidth > o.width).length, localOverflowObservations: observations.filter(o => o.localOverflow.length).length }));
    }
}
