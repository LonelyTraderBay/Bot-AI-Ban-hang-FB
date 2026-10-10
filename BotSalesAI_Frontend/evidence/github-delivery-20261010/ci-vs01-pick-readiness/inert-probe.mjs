import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createRequire} from 'node:module';
const root=path.resolve('BotSalesAI_Frontend'),require=createRequire(path.join(root,'package.json'));
const {chromium,expect}=require('@playwright/test'),ts=require('typescript');
const {startDemoServer}=await import(pathToFileURL(path.join(root,'tests/session/demo-server.mjs')));
const folder=path.resolve('.git/codex-delivery/vs01-inert-probe');fs.mkdirSync(folder,{recursive:true});const server=await startDemoServer({cacheIsolationKey:'vs01-inert-probe'}),browser=await chromium.launch(),results=[];
try{
 for(const fixture of ['original','candidate']){
  const source=fs.readFileSync('.git/codex-delivery/vs01-'+fixture+'.spec.ts','utf8').replaceAll('\r\n','\n');
  const helpers=source.slice(source.indexOf('async function gotoDemo'),source.indexOf("test('FE022.VS01"));
  const start=source.indexOf("test('FE022.VS01"),callbackStart=source.indexOf('async ({ page }) => {',start),end=source.indexOf('\n});',callbackStart);
  const wrap=`const originalGoto=gotoDemo;gotoDemo=async(page,path)=>{
   const initial=page.waitForResponse(response=>response.request().method()==='GET'&&new URL(response.url()).pathname==='/api/v2/shops/shop-demo/inventory');await originalGoto(page,path);expect((await initial).status()).toBe(200);
   await page.evaluate(()=>{const nativeFetch=window.fetch.bind(window);let claimed=false,until=0;window.__vs01Delays=[];
    window.fetch=async(input,init)=>{const request=input instanceof Request?input:null,url=new URL(request?request.url:String(input),location.href),method=(init?.method||request?.method||'GET').toUpperCase();
     if(method==='POST'&&url.pathname.endsWith('/claim'))claimed=true;
     const response=await nativeFetch(input,init);
     if(claimed&&method==='GET'&&url.pathname==='/api/v2/shops/shop-demo/prep-jobs'){if(!until)until=Date.now()+3000;const delayMs=Math.max(0,until-Date.now());if(delayMs){window.__vs01Delays.push({path:url.pathname,search:url.search,delayMs,at:Date.now()});await new Promise(resolve=>setTimeout(resolve,delayMs));}}
     return response;
    };
   });
  };`;
  const compiled=ts.transpileModule(helpers+wrap+'const target='+source.slice(callbackStart,end+2)+';',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const target=new Function('expect','demoUrl','openDemoControls',compiled+'return target;')(expect,server.url,()=>{throw new Error('Unexpected demo controls dependency in VS01');});
  const context=await browser.newContext({viewport:{width:1280,height:900}});context.setDefaultTimeout(15000);await context.tracing.start({screenshots:true,snapshots:true,sources:true});const page=await context.newPage();
  const nativeWait=page.waitForResponse.bind(page);page.waitForResponse=(...args)=>{const pending=nativeWait(...args);void pending.catch(()=>undefined);return pending;};
  const network=[],picks=[];page.on('response',response=>network.push({url:response.url(),status:response.status(),at:Date.now()}));page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname.endsWith('/pick'))picks.push({path:new URL(request.url()).pathname,body:request.postDataJSON()});});
  let status='PASS',error;try{await target({page});}catch(failure){status='FAIL';error=failure.message;fs.writeFileSync(path.join(folder,fixture+'.html'),await page.content());await page.screenshot({path:path.join(folder,fixture+'.png'),fullPage:true});}
  const dialog=page.getByRole('dialog',{name:'Phiếu chuẩn bị DH-1001'}),scan=dialog.getByRole('textbox',{name:'Nhập/quét SKU thực tế'}),quantity=dialog.getByRole('spinbutton',{name:'Số lượng đã lấy'});
  const observed={scan:await scan.inputValue(),quantity:await quantity.inputValue(),inert:await dialog.locator('[inert]').count(),pickEnabled:await dialog.getByRole('button',{name:'Xác nhận dòng đã kiểm'}).isEnabled()};
  results.push({fixture,status,error,observed,picks,delays:await page.evaluate(()=>window.__vs01Delays),wholeVS01Callback:true,engine:'chromium',observerTimeoutMs:15000,sourceTimeoutUnchanged:180000});
  fs.writeFileSync(path.join(folder,fixture+'.network.json'),JSON.stringify(network,null,2));await context.tracing.stop({path:path.join(folder,fixture+'.zip')});await context.close();console.log(JSON.stringify(results.at(-1)));
 }
}finally{await browser.close();await server.close();fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(results,null,2));}
