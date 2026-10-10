import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve('BotSalesAI_Frontend'),require=createRequire(path.join(root,'package.json'));
const pw=require('@playwright/test'),ts=require('typescript'),AxeBuilder=require('@axe-core/playwright').default;
const {startDemoServer}=await import(pathToFileURL(path.join(root,'tests/session/demo-server.mjs')));
const text=fs.readFileSync('.git/codex-delivery/dashboard-candidate.spec.ts','utf8');
const source=ts.createSourceFile('dashboard-candidate.spec.ts',text,ts.ScriptTarget.Latest,true);
const cases=source.statements.filter(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&node.expression.expression.getText(source)==='test'&&ts.isStringLiteral(node.expression.arguments[0])&&node.expression.arguments[0].text.startsWith('Shared consolidation Dashboard'));
if(cases.length!==2)throw new Error('Expected both isolated callbacks');
const folder=path.resolve('.git/codex-delivery/dashboard-isolation-probe');fs.mkdirSync(folder,{recursive:true});
const server=await startDemoServer({cacheIsolationKey:'dashboard-isolation-probe'}),results=[];
process.chdir(root);
try{
 for(const engine of ['chromium','firefox']){
  const browser=await pw[engine].launch();
  try{
   for(let index=0;index<cases.length;index++){
    const statement=cases[index].expression,title=statement.arguments[0].text,callback=statement.arguments[1].getText(source);
    const compiled=ts.transpileModule('const target='+callback+';',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
    const target=new Function('expect','demoUrl','path','AxeBuilder',compiled+'return target;')(pw.expect,server.url,path,AxeBuilder);
    const context=await browser.newContext({...pw.devices[engine==='chromium'?'Desktop Chrome':'Desktop Firefox']});context.setDefaultTimeout(15000);
    await context.tracing.start({screenshots:true,snapshots:true,sources:true});const page=await context.newPage();
    const network=[],attachments=[],pages=[];
    context.on('page',popup=>pages.push({urlAtEvent:popup.url()}));
    page.on('response',response=>{const uri=new URL(response.url());if(uri.pathname==='/api/v2/session')void response.json().then(body=>network.push({url:response.url(),status:response.status(),permissionVersion:body.data?.memberships?.find(row=>row.shopId==='shop-demo')?.permissionVersion})).catch(()=>{});});
    const info={attach:async(name,record)=>attachments.push({name,body:JSON.parse(record.body)})};
    let status='PASS',error;
    try{await target({page,context},info);}catch(failure){status='FAIL';error=failure.message;await page.screenshot({path:path.join(folder,engine+'-'+index+'.png'),fullPage:true});fs.writeFileSync(path.join(folder,engine+'-'+index+'.html'),await page.content());}
    results.push({engine,case:index,title,status,error,network,attachments,pages,remainingPageUrls:context.pages().map(item=>item.url()),observerTimeoutMs:15000});
    await context.tracing.stop({path:path.join(folder,engine+'-'+index+'.zip')});await context.close();console.log(JSON.stringify(results.at(-1)));
   }
  }finally{await browser.close();}
 }
}finally{await server.close();fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(results,null,2));}
