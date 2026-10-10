import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createRequire} from 'node:module';
const root=path.resolve('BotSalesAI_Frontend'),require=createRequire(path.join(root,'package.json'));
const {chromium,expect}=require('@playwright/test'),ts=require('typescript');
const {startDemoServer}=await import(pathToFileURL(path.join(root,'tests/session/demo-server.mjs')));
const folder=path.resolve('.git/codex-delivery/return-refetch-probe');fs.mkdirSync(folder,{recursive:true});
const server=await startDemoServer({cacheIsolationKey:'return-refetch-probe'}),browser=await chromium.launch(),results=[];
try{
 for(const fixture of ['original','candidate']){
  const source=fs.readFileSync('.git/codex-delivery/return-'+fixture+'.spec.ts','utf8').replaceAll('\r\n','\n');
  const helpers=source.slice(source.indexOf('async function visit'),source.indexOf("test('F01 preserves"));
  const start=source.indexOf("test('F01 analogous return-inspection"),callbackStart=source.indexOf('async ({ page }) => {',start),end=source.indexOf('\n});',callbackStart);
  const callback=source.slice(callbackStart,end+2);
  const wrap=`const originalVisit=visit; visit=async(page,path)=>{
   const initial=page.waitForResponse(response=>response.request().method()==='GET'&&new URL(response.url()).pathname==='/api/v2/shops/shop-demo/returns');
   await originalVisit(page,path);expect((await initial).status()).toBe(200);
   await expect(page.getByRole('cell',{name:'seed-returncase-10036',exact:true})).toBeVisible();
   await page.evaluate(()=>{
    const nativeFetch=window.fetch.bind(window);let created=false,delayed=false;window.__returnDelayed=0;
    window.fetch=async(input,init)=>{const request=input instanceof Request?input:null;const url=new URL(request?request.url:String(input),location.href);const method=(init?.method||request?.method||'GET').toUpperCase();
     if(method==='POST'&&url.pathname==='/api/v2/shops/shop-demo/returns')created=true;
     const response=await nativeFetch(input,init);
     if(method==='GET'&&url.pathname==='/api/v2/shops/shop-demo/returns'&&created&&!delayed){delayed=true;window.__returnDelayed++;await new Promise(resolve=>setTimeout(resolve,6500));}
     return response;
    };
   });
  };`;
  const compiled=ts.transpileModule(helpers+wrap+'const target='+callback+';', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const target=new Function('expect','demoUrl',compiled+';return target;')(expect,server.url);
  const context=await browser.newContext({viewport:{width:1280,height:900}});await context.tracing.start({screenshots:true,snapshots:true,sources:true});const page=await context.newPage();
  const network=[],inspections=[];let createdId='';
  page.on('request',request=>{const uri=new URL(request.url());if(request.method()==='POST'&&uri.pathname.endsWith('/inspect'))inspections.push({path:uri.pathname,body:request.postDataJSON()});});
  page.on('response',response=>{const uri=new URL(response.url());network.push({url:response.url(),status:response.status(),at:Date.now()});if(response.request().method()==='POST'&&uri.pathname==='/api/v2/shops/shop-demo/returns'&&response.status()===201)void response.json().then(payload=>{createdId=payload.data.id;});});
  let status='PASS',error;
  try{await target({page});}catch(failure){status='FAIL';error=failure.message;fs.writeFileSync(path.join(folder,fixture+'.html'),await page.content());await page.screenshot({path:path.join(folder,fixture+'.png'),fullPage:true});}
  const delayedRequests=await page.evaluate(()=>window.__returnDelayed);
  results.push({fixture,status,error,createdId,inspections,delayedRequests});
  fs.writeFileSync(path.join(folder,fixture+'.network.json'),JSON.stringify(network,null,2));await context.tracing.stop({path:path.join(folder,fixture+'.zip')});await context.close();console.log(JSON.stringify(results.at(-1)));
 }
}finally{await browser.close();await server.close();fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(results,null,2));}
