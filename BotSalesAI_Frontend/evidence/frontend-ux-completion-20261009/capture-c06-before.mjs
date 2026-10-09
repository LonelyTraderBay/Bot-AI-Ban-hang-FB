import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {startDemoServer} from '../../tests/session/demo-server.mjs';
const output='evidence/frontend-ux-completion-20261009';
if(fs.existsSync(path.join(output,'C06-before.json')))throw new Error('C06 baseline already exists; never overwrite before evidence.');
const sources=['apps/web/src/mocks/finance.ts','apps/web/src/mocks/orders.ts','apps/web/src/mocks/fulfillment.ts','apps/web/src/mocks/procurement.ts','apps/web/src/mocks/catalog.ts','apps/web/src/mocks/database.ts','apps/web/src/mocks/files.ts','apps/web/src/mocks/service.ts','apps/web/src/mocks/seed.json','apps/web/src/mocks/collections.json','apps/web/src/modules/finance/index.tsx','apps/web/src/app/router.tsx','apps/web/src/shared/api/event-invalidation.ts','docs/route-source-map.json','../botsales-kit/contracts/openapi.json','../botsales-kit/contracts/route-manifest.json','../botsales-kit/contracts/events.schema.json','../botsales-kit/contracts/feature-catalog.json','../botsales-kit/contracts/migration-map.json','../botsales-kit/fixtures/acceptance-scenarios.json','../botsales-kit/release.json'];
const fingerprints=sources.map(file=>{
 const bytes=fs.readFileSync(file),target=path.join(output,'C06-before-source',file.startsWith('../')?file.slice(3):'BotSalesAI_Frontend/'+file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);return {path:file,sha256:createHash('sha256').update(bytes).digest('hex')};
});
const server=await startDemoServer({cacheIsolationKey:'c06-before'}),browser=await chromium.launch(),observations=[];
try {
 for(const width of [320,1280]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  for(const route of ['finance','finance/profit-loss','finance/journals','finance/reconciliation','finance/debts-periods']) {
   await page.goto(server.url+'/s/shop-demo/'+route);await page.getByRole('heading',{level:1}).waitFor();await page.locator('main table, main [role="table"], main .MuiAlert-root').first().waitFor();
   const name=`C06-before-${route.replaceAll('/','-')}-${width}.png`;await page.screenshot({path:path.join(output,name),fullPage:true});observations.push({route,width,artifact:name,title:await page.title(),geometry:await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}))});
  }await page.close();
 }
 fs.writeFileSync(path.join(output,'C06-before.json'),JSON.stringify({recordedAt:new Date().toISOString(),scope:'SYNTHETIC_LOCAL_BEFORE_C06',fingerprints,observations},null,2)+'\n');console.log(JSON.stringify({status:'BASELINE_CAPTURED',files:fingerprints.length,observations:observations.length}));
}finally{await browser.close();await server.close();}
