import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createRequire} from 'node:module';
const root=path.resolve('BotSalesAI_Frontend'),require=createRequire(path.join(root,'package.json')),{chromium,expect}=require('@playwright/test'),ts=require('typescript');
const {startDemoServer}=await import(pathToFileURL(path.join(root,'tests/session/demo-server.mjs')));
const folder=path.resolve('.git/codex-delivery/customer-address-lazy-probe');fs.mkdirSync(folder,{recursive:true});const server=await startDemoServer({cacheIsolationKey:'customer-address-lazy-probe'}),browser=await chromium.launch(),results=[];
try{
 for(const fixture of ['original','candidate']){
  const source=fs.readFileSync('.git/codex-delivery/customer-address-'+fixture+'.spec.ts','utf8').replaceAll('\r\n','\n'),tree=ts.createSourceFile('fixture.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const node=tree.statements.find(statement=>ts.isExpressionStatement(statement)&&ts.isCallExpression(statement.expression)&&statement.expression.arguments[0]?.text?.startsWith('C05 customer address UI never replays'));
  if(!node)throw new Error('Target callback missing');const helpers=source.slice(source.indexOf('async function choose'),source.indexOf("test('C05 warehouses"));
  const compiled=ts.transpileModule(helpers+'const target='+node.expression.arguments[1].getText(tree)+';',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,target=new Function('expect','url',compiled+'return target;')(expect,server.url);
  const context=await browser.newContext({viewport:{width:1280,height:900}});context.setDefaultTimeout(15000);await context.tracing.start({screenshots:true,snapshots:true,sources:true});const page=await context.newPage();
  for(const method of ['waitForResponse','waitForRequest']){const native=page[method].bind(page);page[method]=(...args)=>{const pending=native(...args);void pending.catch(()=>undefined);return pending;};}
  const pending=new Set(),network=[],patches=[];let delayedRequests=0;
  await context.route('**/src/modules/customers/index.tsx',route=>{delayedRequests++;const task=(async()=>{const response=await route.fetch();await new Promise(resolve=>setTimeout(resolve,6500));await route.fulfill({response});})();pending.add(task);return task.finally(()=>pending.delete(task));});
  page.on('response',response=>network.push({url:response.url(),status:response.status(),at:Date.now()}));page.on('request',request=>{if(request.method()==='PATCH'&&new URL(request.url()).pathname.endsWith('/addresses/address-synthetic'))patches.push({path:new URL(request.url()).pathname,body:request.postDataJSON()});});
  let status='PASS',error;try{await target({page});}catch(failure){status='FAIL';error=failure.message;fs.writeFileSync(path.join(folder,fixture+'.html'),await page.content());await page.screenshot({path:path.join(folder,fixture+'.png'),fullPage:true});}
  await Promise.allSettled([...pending]);results.push({fixture,status,error,delayedRequests,moduleDelayMs:6500,engine:'chromium',wholeC05Callback:true,sourceDefaultTimeoutMs:15000,sourceExpectTimeoutUnchanged:5000,patches});fs.writeFileSync(path.join(folder,fixture+'.network.json'),JSON.stringify(network,null,2));await context.tracing.stop({path:path.join(folder,fixture+'.zip')});await context.close();console.log(JSON.stringify(results.at(-1)));
 }
}finally{await browser.close();await server.close();fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(results,null,2));}
