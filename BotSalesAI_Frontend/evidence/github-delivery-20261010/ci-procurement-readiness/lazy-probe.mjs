import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve('BotSalesAI_Frontend'),require=createRequire(path.join(root,'package.json'));
const {chromium,expect}=require('@playwright/test'),ts=require('typescript');
const {startDemoServer}=await import(pathToFileURL(path.join(root,'tests/session/demo-server.mjs')));
const folder=path.resolve('.git/codex-delivery/procurement-lazy-probe');fs.mkdirSync(folder,{recursive:true});
const server=await startDemoServer({cacheIsolationKey:'procurement-lazy-probe'}),browser=await chromium.launch(),results=[];
try{
 for(const fixture of ['original','candidate']){
  const source=fs.readFileSync('.git/codex-delivery/procurement-'+fixture+'.spec.ts','utf8').replaceAll('\r\n','\n');
  const helpers=source.slice(source.indexOf('async function gotoDemo'),source.indexOf("test('FE022.VS01"));
  const start=source.indexOf("test('FE022.VS02"),callbackStart=source.indexOf('async ({ page }) => {',start),end=source.indexOf('\n});',callbackStart);
  const compiled=ts.transpileModule(helpers+'const target='+source.slice(callbackStart,end+2)+';',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const target=new Function('expect','demoUrl','openDemoControls',compiled+'return target;')(expect,server.url,()=>{throw new Error('Unexpected demo controls dependency in VS02');});
  const context=await browser.newContext({viewport:{width:1280,height:900}});context.setDefaultTimeout(15000);
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});const page=await context.newPage();
  let delayedRequests=0;const pending=new Set(),network=[];
  page.on('response',response=>network.push({url:response.url(),status:response.status(),at:Date.now()}));
  await context.route('**/src/modules/procurement/index.tsx',route=>{delayedRequests++;const promise=(async()=>{const response=await route.fetch();await new Promise(resolve=>setTimeout(resolve,6500));await route.fulfill({response});})();pending.add(promise);return promise.finally(()=>pending.delete(promise));});
  let status='PASS',error;
  try{await target({page});}catch(failure){status='FAIL';error=failure.message;fs.writeFileSync(path.join(folder,fixture+'.html'),await page.content());await page.screenshot({path:path.join(folder,fixture+'.png'),fullPage:true});}
  await Promise.allSettled([...pending]);
  results.push({fixture,status,error,delayedRequests,engine:'chromium',moduleDelayMs:6500,observerTimeoutMs:15000,sourceTimeoutUnchanged:180000});
  fs.writeFileSync(path.join(folder,fixture+'.network.json'),JSON.stringify(network,null,2));await context.tracing.stop({path:path.join(folder,fixture+'.zip')});await context.close();console.log(JSON.stringify(results.at(-1)));
 }
}finally{await browser.close();await server.close();fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(results,null,2));}
