import fs from 'node:fs';
import path from 'node:path';
import { chromium, firefox } from '@playwright/test';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';
import { auditComposition } from '../../../scripts/check-ui-composition.mjs';

const [phase, browserName] = process.argv.slice(2);
if (!['before', 'after'].includes(phase) || !['chromium', 'firefox'].includes(browserName)) throw new Error('Usage: node capture.mjs before|after chromium|firefox');
const manifest = JSON.parse(fs.readFileSync('botsales-kit/contracts/route-manifest.json', 'utf8'));
const detailIds = { conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001', knowledgeId: 'k1', jobId: 'missing-job' };
const observations = [], issues = [];
const snapshot = auditComposition(process.cwd());
const server = await startDemoServer({ cacheIsolationKey: `shared-composition-${phase}-${browserName}` });
const browser = await ({ chromium, firefox }[browserName]).launch();
try {
    const page = await browser.newPage();
    page.on('pageerror', error => issues.push(error.message));
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
        await page.setViewportSize(viewport);
        for (const route of manifest.routes) {
            const pathname = route.path.replace(':shopId', 'shop-demo').replace(/:([A-Za-z]+)/g, (_, key) => detailIds[key] || 'missing');
            await page.goto(new URL(pathname, server.url).toString(), { waitUntil: 'domcontentloaded' });
            await page.locator('main h1').waitFor({ state: 'visible', timeout: 15000 });
            await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'), null, { timeout: 15000 });
            await page.evaluate(() => document.fonts.ready);
            const rendered = await page.evaluate(() => {
                const main = document.querySelector('main') || document.getElementById('root');
                const rect = main.getBoundingClientRect();
                const round = value => Math.round(value * 100) / 100;
                const geometry = Array.from(main.querySelectorAll('.MuiStack-root,.MuiBox-root')).filter(element => {
                    const style = getComputedStyle(element);
                    return ['flex', 'grid'].includes(style.display) && (parseFloat(style.gap) > 0 || parseFloat(style.rowGap) > 0);
                }).map(element => {
                    const style = getComputedStyle(element), box = element.getBoundingClientRect();
                    return { tag: element.tagName, display: style.display, direction: style.flexDirection, wrap: style.flexWrap, gap: style.gap, padding: style.padding, margin: style.margin, align: style.alignItems, justify: style.justifyContent, width: round(box.width), height: round(box.height), top: round(box.top - rect.top), left: round(box.left - rect.left), children: element.children.length, composition: element.getAttribute('data-ui-composition'), rhythm: element.getAttribute('data-ui-rhythm'), childMargins: Array.from(element.children).map(child => [getComputedStyle(child).marginTop, getComputedStyle(child).marginBottom]) };
                });
                return { geometry, mainBlockInset: [getComputedStyle(main).paddingTop, getComputedStyle(main).paddingBottom], documentWidth: [document.documentElement.scrollWidth, document.documentElement.clientWidth] };
            });
            observations.push({ routeId: route.id, path: pathname, module: route.module, viewport, ...rendered });
            if (phase === 'after') {
                const gaps = { 'form-fields': '16px', 'field-group': '8px', 'surface-content': '12px', 'action-group': '8px', 'page-sections': '24px', 'section-grid': '24px' };
                for (const group of rendered.geometry.filter(group => group.composition)) {
                    const expected = group.composition === 'section-grid' && group.rhythm === 'content' ? '12px' : gaps[group.composition];
                    if (group.gap !== expected) issues.push(`${route.id} ${viewport.width}: ${group.composition} gap ${group.gap}`);
                    if (group.childMargins.some(margins => margins.some(value => value !== '0px'))) issues.push(`${route.id} ${viewport.width}: ${group.composition} duplicates child boundary`);
                }
                if (pathname.startsWith('/s/') && rendered.mainBlockInset.some(value => value !== '24px')) issues.push(`${route.id} ${viewport.width}: Shell main inset ${rendered.mainBlockInset}`);
                if (rendered.documentWidth[0] > rendered.documentWidth[1]) issues.push(`${route.id} ${viewport.width}: document horizontal overflow ${rendered.documentWidth}`);
            }
            if (observations.length % 18 === 0) console.log(`${phase} ${browserName}: ${observations.length}/108 route-viewport observations`);
        }
    }
} finally { await browser.close(); await server.close(); }
const current = auditComposition(process.cwd());
if (JSON.stringify(current.sourceHashes) !== JSON.stringify(snapshot.sourceHashes)) throw new Error('Source changed while capturing: snapshot invalid.');
const output = path.join('evidence/frontend-ui-improvements/shared-composition-20261006', `${phase}-${browserName}.json`);
fs.writeFileSync(output, JSON.stringify({ phase, browserName, sourceSnapshot: snapshot, observations, issues, status: issues.length ? 'FAIL' : 'PASS' }, null, 2) + '\n');
console.log(JSON.stringify({ output, observations: observations.length, issues: issues.length }));
if (issues.length) process.exitCode = 1;
