import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
import {createServer} from 'vite';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EVIDENCE_DIR = process.env.BOTSALES_DESIGN_EVIDENCE_DIR
    ? path.resolve(PROJECT_ROOT, process.env.BOTSALES_DESIGN_EVIDENCE_DIR)
    : null;

export async function runDesignBrowserAudit() {
    const server = await createServer({
        configFile: path.join(PROJECT_ROOT, 'apps/web/vite.config.ts'),
        root: path.join(PROJECT_ROOT, 'apps/web'),
        mode: 'demo',
        server: {host:'127.0.0.1',port:0,strictPort:false},
    });
    let browser;
    try {
        await server.listen();
        const address = server.httpServer?.address();
        if (!address || typeof address === 'string') throw new Error('Vite did not expose a local test address.');
        const baseUrl = `http://127.0.0.1:${address.port}`;
        browser = await chromium.launch({headless:true});
        const context = await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});

        const coldPage = await context.newPage();
        await coldPage.route('**/src/main.tsx',route=>route.abort());
        await coldPage.goto(`${baseUrl}/workspaces`,{waitUntil:'domcontentloaded'});
        const preJavaScript = await coldPage.evaluate(()=>({
            html:getComputedStyle(document.documentElement).backgroundColor,
            body:getComputedStyle(document.body).backgroundColor,
            root:getComputedStyle(document.querySelector('#root')).backgroundColor,
            colorScheme:getComputedStyle(document.documentElement).colorScheme,
        }));
        await coldPage.close();

        const page = await context.newPage();
        await page.goto(`${baseUrl}/s/shop-demo/overview`,{waitUntil:'domcontentloaded'});
        await page.locator('main#main-content h1').waitFor({state:'visible',timeout:20000});
        await page.getByText('Hội thoại đang mở',{exact:true}).waitFor({state:'visible'});

        const viewports = [];
        if (EVIDENCE_DIR) await fs.promises.mkdir(EVIDENCE_DIR, { recursive: true });
        for (const width of [320,390,768,1440]) {
            await page.setViewportSize({width,height:1000});
            const observed = await page.evaluate(()=>{
                const grid = [...document.querySelectorAll('.MuiBox-root')].find(element=>{
                    const text=element.textContent||'';
                    return getComputedStyle(element).display==='grid'&&text.includes('Hội thoại đang mở')&&text.includes('Trợ lý bán hàng');
                });
                return {
                    width:window.innerWidth,
                    documentWidth:document.documentElement.scrollWidth,
                    contentWidth:document.documentElement.clientWidth,
                    kpiColumns:grid?getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length:0,
                    tableScrollsLocally:(()=>{const table=document.querySelector('main#main-content table');const region=table?.parentElement;return Boolean(region&&table.scrollWidth>region.clientWidth&&['auto','scroll'].includes(getComputedStyle(region).overflowX)&&document.documentElement.scrollWidth<=document.documentElement.clientWidth);})(),
                    tableHintVisible:(()=>{const hint=[...document.querySelectorAll('main#main-content *')].find(item=>item.textContent==='Cuộn ngang để xem đủ cột.');return Boolean(hint&&getComputedStyle(hint).display!=='none');})(),
                };
            });
            viewports.push(observed);
            if (EVIDENCE_DIR) await page.screenshot({path:path.join(EVIDENCE_DIR,`S04-dashboard-${width}.png`),fullPage:true});
        }

        await page.setViewportSize({width:1440,height:1000});
        const axe = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
        const contentAxe = await new AxeBuilder({page}).include('main#main-content').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
        await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
        await page.getByRole('link',{name:'Xem việc cần làm'}).focus();
        const accessibilityPreferences = await page.evaluate(()=>({
            forcedColors:matchMedia('(forced-colors: active)').matches,
            reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
            focusedTag:document.activeElement?.tagName,
            focusOutline:getComputedStyle(document.activeElement).outlineStyle,
            scrollBehavior:getComputedStyle(document.documentElement).scrollBehavior,
        }));
        await page.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});
        const report = {
            scope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',
            route:'/s/shop-demo/overview',
            viewports,
            preJavaScript,
            accessibilityPreferences,
            axe:{appViolations:axe.violations.map(item=>({id:item.id,impact:item.impact,description:item.description,nodes:item.nodes.map(node=>({target:node.target,summary:node.failureSummary}))})),mainViolations:contentAxe.violations.map(item=>({id:item.id,impact:item.impact,description:item.description,nodes:item.nodes.map(node=>({target:node.target,summary:node.failureSummary}))})),passes:contentAxe.passes.length,incomplete:contentAxe.incomplete.map(item=>item.id)},
        };
        if (EVIDENCE_DIR) await fs.promises.writeFile(path.join(EVIDENCE_DIR,'S04-browser-audit.json'),JSON.stringify(report,null,2)+'\n','utf8');
        return report;
    } finally {
        await browser?.close();
        await server.close();
    }
}
