import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve('BotSalesAI_Frontend');
const require=createRequire(path.join(root,'package.json'));
const {chromium,firefox,expect}=require('@playwright/test');
const {startDemoServer}=await import(pathToFileURL(path.join(root,'tests/session/demo-server.mjs')));
const folder=path.resolve('.git/codex-delivery/inventory-context-probe');
fs.mkdirSync(folder,{recursive:true});
const server=await startDemoServer({cacheIsolationKey:'inventory-lazy-probe'});
const results=[];
try {
 for(const [engine,browserType] of [['chromium',chromium],['firefox',firefox]]) {
  const browser=await browserType.launch();
  try {
   for(const fixture of ['original','synchronized']) {
    const name=`${engine}-${fixture}`;
    const context=await browser.newContext({viewport:{width:320,height:900}});
    await context.tracing.start({screenshots:true,snapshots:true,sources:true});
    const page=await context.newPage();
    const responses=[],errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>responses.push({at:Date.now(),url:response.url(),status:response.status()}));
    let delayedRequests=0;
    await context.route('**/src/modules/inventory/index.tsx',async route=>{delayedRequests++;const response=await route.fetch();await new Promise(resolve=>setTimeout(resolve,6500));await route.fulfill({response});});
    try {
     const apiResponse=fixture==='synchronized'?page.waitForResponse(response=>response.request().method()==='GET'&&new URL(response.url()).pathname==='/api/v2/shops/shop-demo/inventory'):null;
     await page.goto(server.url+'/s/shop-demo/inventory');
     if(apiResponse){expect((await apiResponse).status()).toBe(200);await page.getByRole('progressbar',{name:'Đang tải màn hình',exact:true}).waitFor({state:'hidden'});}
     await expect(page.getByRole('heading',{name:'Tồn kho',exact:true})).toBeVisible();
     await expect(page.getByRole('table',{name:'Tồn kho theo vị trí'})).toBeVisible();
     await expect(page.locator('main#main-content')).toHaveCSS('padding-left','16px');
     const geometry=await page.evaluate(()=>({clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));
     expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
     const table=await page.getByRole('region',{name:'Tồn kho theo vị trí'}).evaluate(element=>({clientWidth:element.clientWidth,scrollWidth:element.scrollWidth}));
     expect(table.clientWidth).toBeLessThanOrEqual(320);expect(table.scrollWidth).toBeGreaterThan(table.clientWidth);
     expect(errors).toEqual([]);
     results.push({name,status:'PASS',delayedRequests,geometry,table});
    }catch(error){results.push({name,status:'FAIL',delayedRequests,error:error.message,url:page.url()});fs.writeFileSync(path.join(folder,name+'.html'),await page.content());await page.screenshot({path:path.join(folder,name+'.png'),fullPage:true});}
    fs.writeFileSync(path.join(folder,name+'.network.json'),JSON.stringify(responses,null,2));
    await context.tracing.stop({path:path.join(folder,name+'.zip')});await context.close();console.log(JSON.stringify(results.at(-1)));
   }
  }finally{await browser.close();}
 }
}finally{await server.close();fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(results,null,2));}
