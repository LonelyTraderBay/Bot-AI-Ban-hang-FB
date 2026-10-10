import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve('BotSalesAI_Frontend');
const require=createRequire(path.join(root,'package.json'));
const {chromium,expect}=require('@playwright/test');
const ts=require('typescript');
const {startDemoServer}=await import(pathToFileURL(path.join(root,'tests/session/demo-server.mjs')));
const {ownedLabelGeometry}=await import(pathToFileURL(path.join(root,'tests/design/owned-label-geometry.mjs')));
const folder=path.resolve('.git/codex-delivery/toolbar-lazy-probe');fs.mkdirSync(folder,{recursive:true});
const server=await startDemoServer({cacheIsolationKey:'toolbar-lazy-probe'});
const results=[];const browser=await chromium.launch();
try {
 for(const fixture of ['original','candidate']){
  const source=fs.readFileSync('.git/codex-delivery/toolbar-'+fixture+'.spec.ts','utf8');
  const helper=source.match(/async function ready\([\s\S]*?\r?\n}/)[0];
  const compiled=ts.transpileModule(helper,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const ready=new Function('expect','demoUrl',compiled+';return ready;')(expect,server.url);
  const context=await browser.newContext({viewport:{width:320,height:1000}});
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});const page=await context.newPage();
  const responses=[],errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>responses.push({at:Date.now(),url:response.url(),status:response.status()}));
  let delayedRequests=0;
  await context.route('**/src/modules/inbox/index.tsx',async route=>{delayedRequests++;const response=await route.fetch();await new Promise(resolve=>setTimeout(resolve,6500));await route.fulfill({response});});
  try{
   await ready(page,'/s/shop-demo/inbox',fixture==='candidate'?'/api/v2/shops/shop-demo/conversations':undefined);
   await page.locator('button[aria-controls="mock-tools-controls"]').click();
   await page.evaluate(()=>{const sizes=[...document.querySelectorAll('*')].map(element=>[element,parseFloat(getComputedStyle(element).fontSize)]);for(const [element,size] of sizes)if(Number.isFinite(size))element.style.fontSize=`${size*2}px`;});
   const labels=await page.evaluate(ownedLabelGeometry);
   expect(labels.filter(label=>label.owner==='demo-tools')).toHaveLength(3);expect(labels.filter(label=>label.owner==='toolbar')).toHaveLength(1);expect(labels.filter(label=>label.overlaps||label.outsideField)).toEqual([]);
   for(const label of labels){expect(label.labelPosition).toBe('static');expect(label.labelTransform).toBe('none');expect(label.fieldBounds.height).toBeLessThanOrEqual(label.naturalHeight+1);expect(label.legends.every(width=>width<=1)).toBe(true);}
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);expect(errors).toEqual([]);
   results.push({fixture,status:'PASS',delayedRequests,labels});
  }catch(error){results.push({fixture,status:'FAIL',delayedRequests,error:error.message,url:page.url()});fs.writeFileSync(path.join(folder,fixture+'.html'),await page.content());await page.screenshot({path:path.join(folder,fixture+'.png'),fullPage:true});}
  fs.writeFileSync(path.join(folder,fixture+'.network.json'),JSON.stringify(responses,null,2));await context.tracing.stop({path:path.join(folder,fixture+'.zip')});await context.close();console.log(JSON.stringify(results.at(-1)));
 }
}finally{await browser.close();await server.close();fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(results,null,2));}
