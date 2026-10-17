import fs from 'node:fs';
import path from 'node:path';
import { chromium, firefox } from 'playwright';
import { startDemoServer } from '../../../tests/session/demo-server.mjs';

const root = process.cwd();
const out = 'evidence/frontend-ui-consistency-20261017/UIC08/scroll-owner-inspection-current.json';
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'packages/contracts/src/routes.json'), 'utf8'));
const routes = manifest.routes.filter(route => ['R06', 'R49'].includes(route.id));
const widths = [320, 390, 768, 1280, 1920];
const details = { conversationId: 'cv1' };
const evidence = { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', routes: [], browsers: [] };

for (const browserType of [chromium, firefox]) {
    const server = await startDemoServer({ cacheIsolationKey: `uic08-scroll-owners-${browserType.name()}` });
    const browser = await browserType.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 320, height: 480 }, deviceScaleFactor: 1 });
    const rows = [];
    try {
        for (const route of routes) {
            const routePath = route.path.replace(':shopId', 'shop-demo').replace(/:([A-Za-z]+)/g, (_, key) => details[key] || 'missing');
            await page.goto(new URL(routePath, server.url).toString(), { waitUntil: 'domcontentloaded' });
            await page.locator('main#main-content h1').first().waitFor({ state: 'visible', timeout: 20_000 });
            await page.evaluate(() => document.fonts.ready);
            for (const width of widths) {
                await page.setViewportSize({ width, height: width <= 390 ? 480 : 720 });
                await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                const result = await page.evaluate(() => {
                    const describe = element => {
                        const style = getComputedStyle(element);
                        const rect = element.getBoundingClientRect();
                        const name = element.getAttribute('aria-label')
                            || (element.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
                        return {
                            tag: element.tagName.toLowerCase(),
                            id: element.id,
                            className: typeof element.className === 'string' ? element.className.slice(0, 160) : '',
                            role: element.getAttribute('role'),
                            name,
                            tabIndexAttribute: element.getAttribute('tabindex'),
                            tabIndex: element.tabIndex,
                            overflowX: style.overflowX,
                            scrollWidth: element.scrollWidth,
                            clientWidth: element.clientWidth,
                            scrollLeft: element.scrollLeft,
                            bounds: { x: Math.round(rect.x), right: Math.round(rect.right), y: Math.round(rect.y), bottom: Math.round(rect.bottom) },
                            text: (element.innerText || '').trim().slice(0, 120),
                        };
                    };
                    const scrollers = [...document.querySelectorAll('main *')].filter(element => {
                        const style = getComputedStyle(element);
                        return /(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1;
                    });
                    return {
                        viewport: { width: document.documentElement.clientWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
                        regions: scrollers.map(element => {
                            const chain = [];
                            let current = element;
                            for (let depth = 0; current && depth < 6; depth += 1, current = current.parentElement) chain.push(describe(current));
                            const namedFocusableAncestor = chain.find(item => item.tabIndex >= 0 && (item.name || ['region', 'grid', 'table', 'tablist'].includes(item.role))) || null;
                            return {
                                scroller: describe(element),
                                ancestors: chain.slice(1),
                                namedFocusableAncestor,
                                canScrollHorizontally: element.scrollWidth > element.clientWidth + 1,
                            };
                        }),
                    };
                });
                for (const region of result.regions) {
                    const scroller = await page.locator('main *').evaluateAll((elements, index) => {
                        const list = elements.filter(element => {
                            const style = getComputedStyle(element);
                            return /(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1;
                        });
                        const element = list[index];
                        if (!element) return null;
                        const before = element.scrollLeft;
                        element.scrollLeft = element.scrollWidth;
                        const end = element.scrollLeft;
                        element.scrollLeft = 0;
                        return { before, end, maximum: element.scrollWidth - element.clientWidth };
                    }, result.regions.indexOf(region));
                    region.scrollProbe = scroller;
                }
                rows.push({ routeId: route.id, path: routePath, width, ...result });
            }
        }
    } finally {
        await page.close();
        await browser.close();
        await server.close();
    }
    evidence.browsers.push({ name: browserType.name(), version: browser.version(), rows });
}

evidence.routes = routes.map(({ id, path: routePath, title }) => ({ id, path: routePath, title }));
fs.writeFileSync(path.join(root, out), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ output: out, browsers: evidence.browsers.map(browser => ({ name: browser.name, version: browser.version, rows: browser.rows.length, scrollRegions: browser.rows.reduce((count, row) => count + row.regions.length, 0) })) }, null, 2));
