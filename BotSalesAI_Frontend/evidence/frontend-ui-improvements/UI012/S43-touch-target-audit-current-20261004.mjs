import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {createServer} from 'vite';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const ROUTES = [
    {id:'R04',path:'/s/shop-demo/overview'},
    {id:'R05',path:'/s/shop-demo/inbox'},
    {id:'R06',path:'/s/shop-demo/inbox/cv1'},
    {id:'R09',path:'/s/shop-demo/products'},
    {id:'R15',path:'/s/shop-demo/inventory'},
    {id:'R17',path:'/s/shop-demo/orders'},
    {id:'R41',path:'/s/shop-demo/fulfillment'},
    {id:'R49',path:'/s/shop-demo/finance/reconciliation'},
];
const VIEWPORTS = [320,390];
const OUTPUT = path.join(HERE,'S43-touch-target-audit-current-20261004.json');
const SNAPSHOT_PATH = path.join(ROOT,'evidence/frontend-ui-improvements/UI024/S02-current-worktree-and-artifact-fingerprint.json');
const TARGET_SELECTOR = [
    'a[href]',
    'button',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[role="tab"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="menuitem"]',
].join(',');

const server = await createServer({
    configFile:path.join(ROOT,'apps/web/vite.config.ts'),
    root:path.join(ROOT,'apps/web'),
    mode:'demo',
    server:{host:'127.0.0.1',port:0,strictPort:false},
});
let browser;
try {
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === 'string') throw new Error('Vite did not expose a local test address.');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const sourceSnapshot = JSON.parse(await fs.readFile(SNAPSHOT_PATH,'utf8'));
    browser = await chromium.launch({headless:true});
    const context = await browser.newContext({
        viewport:{width:390,height:844},
        deviceScaleFactor:1,
        isMobile:true,
        hasTouch:true,
    });
    const page = await context.newPage();
    const measurements = [];

    for (const viewportWidth of VIEWPORTS) {
        await page.setViewportSize({width:viewportWidth,height:844});
        for (const route of ROUTES) {
            await page.goto(`${baseUrl}${route.path}`,{waitUntil:'domcontentloaded'});
            await page.locator('main#main-content h1').first().waitFor({state:'visible',timeout:20000});
            await page.waitForTimeout(300);
            const controls = await page.evaluate(({selector,routeId,width}) => {
                const textName = element => {
                    const labelledBy = element.getAttribute('aria-labelledby')
                        ?.split(/\s+/)
                        .map(id => document.getElementById(id)?.textContent?.trim())
                        .filter(Boolean)
                        .join(' ');
                    return (element.getAttribute('aria-label')
                        || labelledBy
                        || element.getAttribute('title')
                        || element.getAttribute('placeholder')
                        || element.innerText
                        || element.value
                        || '').replace(/\s+/g,' ').trim().slice(0,100);
                };
                return [...document.querySelectorAll(selector)].flatMap(element => {
                    const style = getComputedStyle(element);
                    const rect = element.getBoundingClientRect();
                    if (style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0
                        || rect.width<=0||rect.height<=0||rect.bottom<=0||rect.top>=innerHeight
                        || rect.right<=0||rect.left>=innerWidth) return [];
                    const role = element.getAttribute('role') || element.tagName.toLowerCase();
                    const measured = {
                        routeId,
                        viewportWidth:width,
                        tag:element.tagName.toLowerCase(),
                        role,
                        name:textName(element),
                        widthCssPx:Number(rect.width.toFixed(1)),
                        heightCssPx:Number(rect.height.toFixed(1)),
                        inlineLink:element.tagName==='A'&&style.display==='inline',
                        disabled:element.hasAttribute('disabled')||element.getAttribute('aria-disabled')==='true',
                    };
                    measured.below24InEitherDimension = measured.widthCssPx<24||measured.heightCssPx<24;
                    return [measured];
                });
            },{selector:TARGET_SELECTOR,routeId:route.id,width:viewportWidth});
            measurements.push(...controls);
        }
    }

    const summaryByViewport = VIEWPORTS.map(width => {
        const items = measurements.filter(item=>item.viewportWidth===width);
        const undersized = items.filter(item=>item.below24InEitherDimension);
        return {
            viewportWidthCssPx:width,
            visibleSemanticTargets:items.length,
            boundingBoxesAtLeast24By24:items.length-undersized.length,
            below24InEitherDimension:undersized.length,
            undersizedNotInlineLinks:undersized.filter(item=>!item.inlineLink).length,
            routeCounts:ROUTES.map(route=>({
                routeId:route.id,
                targetCount:items.filter(item=>item.routeId===route.id).length,
                below24Count:undersized.filter(item=>item.routeId===route.id).length,
            })),
        };
    });
    const undersized = measurements.filter(item=>item.below24InEitherDimension);
    const report = {
        title:'UI012 mobile touch-target size measurements',
        recordedAt:new Date().toISOString(),
        scope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        source:'React demo Vite dev server; synthetic MSW; Chromium mobile viewport/touch emulation',
        sourceSnapshot:{repositoryHead:sourceSnapshot.repositoryHead,workingTree:sourceSnapshot.workingTree,sourceFileCount:sourceSnapshot.sourceInputs.fileCount,sourceManifestSha256:sourceSnapshot.sourceInputs.manifestSha256},
        command:'node evidence/frontend-ui-improvements/UI012/S10-touch-target-audit.mjs',
        standard:{
            criterion:'WCAG 2.2 SC 2.5.8 Target Size (Minimum), Level AA',
            sizeThresholdCssPx:{width:24,height:24},
            officialReference:'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum',
            note:'Undersized targets can satisfy the criterion through spacing or other listed exceptions. This script measures bounds only; it does not decide spacing, equivalence or inline exceptions.',
        },
        method:{
            routeIds:ROUTES.map(route=>route.id),
            viewportWidthsCssPx:VIEWPORTS,
            targetSelector:TARGET_SELECTOR,
            includedStates:'Visible default/success route state only; no dialogs, open menus, hover, pressed or error states were injected.',
            measurement:'getBoundingClientRect() bounding-box dimensions in CSS pixels, rounded to one decimal; only semantic pointer-control selectors intersecting the viewport are sampled.',
            limitations:'Bounding boxes do not prove that a 24x24 square fits inside non-rectangular targets. Automated Chromium viewport/touch emulation is not a physical device or manual touch test. Below-threshold bounds are candidates for spacing/exception review, not automatic WCAG failures.',
        },
        summaryByViewport,
        belowThresholdTargets:undersized,
    };
    await fs.writeFile(OUTPUT,JSON.stringify(report,null,2)+'\n','utf8');
    console.log(JSON.stringify({output:path.relative(ROOT,OUTPUT),summaryByViewport},null,2));
} finally {
    await browser?.close();
    await server.close();
}
