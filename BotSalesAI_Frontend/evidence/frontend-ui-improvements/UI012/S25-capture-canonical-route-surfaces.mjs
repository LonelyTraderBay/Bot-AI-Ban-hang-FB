import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {startDemoServer} from '../../../tests/session/demo-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const outputDir = path.join(here, 'S25-route-captures');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'botsales-kit/contracts/route-manifest.json'), 'utf8'));
const routes = Array.isArray(manifest.routes) ? manifest.routes : manifest;
const detailIds = {
  conversationId:'cv1', customerId:'c1', productId:'p1', orderId:'DH-1001',
  knowledgeId:'k1', jobId:'missing-job',
};
const demo = await startDemoServer({cacheIsolationKey:'ui012-visual-tour-s25'});
let browser;

try {
  await fs.mkdir(outputDir, {recursive:true});
  browser = await chromium.launch({headless:true});
  const context = await browser.newContext({viewport:{width:1440,height:1000}, deviceScaleFactor:1});
  const page = await context.newPage();
  const pageErrors = [];
  const mutationRequests = [];
  const captures = [];
  let currentRouteId = 'startup';
  page.on('pageerror', error => pageErrors.push({routeId:currentRouteId, message:error.message}));
  page.on('request', request => {
    if (!['GET','HEAD','OPTIONS'].includes(request.method())) mutationRequests.push({routeId:currentRouteId, method:request.method(), path:new URL(request.url()).pathname});
  });

  for (const route of routes) {
    currentRouteId = route.id;
    const routePath = route.path
      .replace(':shopId', 'shop-demo')
      .replace(/:([A-Za-z]+)/g, (_, key) => detailIds[key] || 'missing');
    await page.goto(new URL(routePath, demo.url).toString(), {waitUntil:'domcontentloaded'});
    await page.locator('main#main-content h1').waitFor({state:'visible', timeout:20000});
    await page.locator('main#main-content .MuiLinearProgress-root').waitFor({state:'detached', timeout:20000}).catch(()=>{});
    await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState !== 'running'), null, {timeout:5000}).catch(()=>{});
    const result = await page.evaluate(() => {
      const main = document.querySelector('main#main-content');
      const heading = main?.querySelector('h1');
      return {
        h1:heading?.innerText?.trim() || '',
        mainVisible:Boolean(main && main.getBoundingClientRect().width && main.getBoundingClientRect().height),
        viewport:{width:innerWidth,height:innerHeight,devicePixelRatio},
        documentWidth:{scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth},
        visibleDialogCount:[...document.querySelectorAll('[role="dialog"]')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0}).length,
      };
    });
    const name = `S25-${route.id}.png`;
    const file = path.join(outputDir, name);
    await page.screenshot({path:file, fullPage:false});
    captures.push({routeId:route.id,path:routePath,title:route.title,module:route.module,screenshot:`S25-route-captures/${name}`,bytes:(await fs.stat(file)).size,...result});
    console.log(`${route.id} ${routePath} ${result.h1}`);
  }

  const sheets = [];
  for (let start=0; start<captures.length; start+=12) {
    const batch = captures.slice(start,start+12);
    const cards = await Promise.all(batch.map(async capture => {
      const bytes = await fs.readFile(path.join(here,capture.screenshot));
      const data = `data:image/png;base64,${bytes.toString('base64')}`;
      return `<figure><figcaption>${capture.routeId} · ${escapeHtml(capture.title)} · ${escapeHtml(capture.h1)}</figcaption><img src="${data}"></figure>`;
    }));
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:0;background:#e5e7eb;font:13px Arial,sans-serif}.grid{width:1440px;display:grid;grid-template-columns:repeat(4,360px);grid-template-rows:repeat(3,278px)}figure{margin:0;padding:6px;background:#fff;border:1px solid #9ca3af}figcaption{height:22px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-weight:600}img{display:block;width:346px;height:240px;object-fit:contain;background:#f3f4f6}</style></head><body><div class="grid">${cards.join('')}</div></body></html>`;
    const sheetPage = await context.newPage();
    await sheetPage.setViewportSize({width:1440,height:834});
    await sheetPage.setContent(html, {waitUntil:'load'});
    const name = `S25-contact-sheet-${String(sheets.length+1).padStart(2,'0')}.png`;
    await sheetPage.screenshot({path:path.join(here,name),fullPage:true});
    sheets.push({name,firstRoute:batch[0].routeId,lastRoute:batch.at(-1).routeId,bytes:(await fs.stat(path.join(here,name))).size});
    await sheetPage.close();
  }

  const report = {
    date:'2026-10-03',
    scope:'AI visual review of first-viewport React demo surfaces for every canonical route; static initial state only',
    environment:'Chromium 153; 1440x1000 CSS px; deviceScaleFactor 1; local demo + synthetic MSW',
    routeCount:captures.length,
    captures,
    contactSheets:sheets,
    pageErrors,
    mutationRequests,
    overflowRoutes:captures.filter(item=>item.documentWidth.scroll>item.documentWidth.client).map(item=>({routeId:item.routeId,scroll:item.documentWidth.scroll,client:item.documentWidth.client})),
    limits:[
      'This is a screenshot-based AI visual tour of initial route surfaces, not a human owner UAT or screen-reader session.',
      'It does not exercise every loading, empty, error, permission, hover, pressed, disabled, dialog, menu, upload, or responsive state.',
      'Dynamic detail routes use the same demo fixture identifiers as the existing all-route accessibility test.',
      'No app source, contract, route manifest, design token, permission, generated file, or progress ledger was changed for this capture.',
    ],
  };
  await fs.writeFile(path.join(here,'S25-canonical-route-visual-review.json'),`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output:'S25-canonical-route-visual-review.json',routeCount:captures.length,contactSheets:sheets,pageErrors,mutationRequests,overflowRoutes:report.overflowRoutes},null,2));
} finally {
  await browser?.close();
  await demo.close();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}
