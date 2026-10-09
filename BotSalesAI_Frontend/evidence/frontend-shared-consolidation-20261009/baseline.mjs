import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import {startDemoServer} from '../../tests/session/demo-server.mjs';
import {toolbarImpact} from '../../tests/design/toolbar-impact.mjs';
const output=import.meta.dirname,root=path.resolve(output,'../..'),repo=path.dirname(root);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const rel=file=>path.relative(repo,file).replaceAll('\\','/');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isSymbolicLink()||e.name==='node_modules'?[]:e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
if(fs.existsSync(path.join(output,'baseline.json')))throw Error('Baseline immutable');
const inputs=['apps/web/src','apps/web/tests','tests','scripts','packages','docs'].flatMap(d=>walk(path.join(root,d))).concat(['package.json','package-lock.json','playwright.config.ts','playwright.built-demo.config.ts','apps/web/vite.config.ts'].map(f=>path.join(root,f)));
const snapshots=['apps/web/src/modules/inbox/index.tsx','apps/web/src/modules/dashboard/index.tsx','tests/ui-toolbar-layout.spec.ts','tests/fe016.spec.ts','tests/ui-dashboard-layout.spec.ts','docs/FRONTEND_SPACING_STANDARD.md','docs/FRONTEND_UI_IMPROVEMENT_PLAN.md','apps/web/src/shared/ui/README.md'];
for(const file of snapshots){const dest=path.join(output,'before',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);}
const startedAt=new Date().toISOString(),sourceFingerprints=Object.fromEntries(inputs.map(f=>[rel(f),hash(f)]));
const protectedFiles=['botsales-kit/execution/plan.json','botsales-kit/execution/progress.json','BotSalesAI_Frontend/package.json','BotSalesAI_Frontend/package-lock.json','BotSalesAI_Frontend/AI_RULES.md','botsales-kit/AI_RULES.md','AGENTS.md','BotSalesAI_Frontend/AGENTS.md','.github/workflows/frontend.yml'];
const originalPaths=execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{cwd:repo,encoding:'utf8',maxBuffer:32e6}).split('\0').filter(Boolean);
const server=await startDemoServer({cacheIsolationKey:'shared-consolidation-before'}),browser=await chromium.launch();
const page=await browser.newPage(),observations=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try{for(const width of [320,1440])for(const [id,route]of[['R04','overview'],['R05','inbox'],['R06','inbox/cv1']]){
 await page.setViewportSize({width,height:1000});await page.goto(server.url+'/s/shop-demo/'+route);await page.locator('main h1').waitFor();await page.waitForFunction(()=>!document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
 const geometry=await page.evaluate(()=>{const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};const search=document.querySelector('input[placeholder="Tìm hội thoại…"]'),filters=document.querySelector('[aria-label="Bộ lọc hội thoại"]');return {documentWidth:document.documentElement.scrollWidth,search:search?box(search.closest('.MuiTextField-root')):null,filters:filters?box(filters):null,filtersVisible:!!filters?.getClientRects().length,sharedFilter:filters?.getAttribute('data-ui-composition'),primaryCta:[...document.querySelectorAll('main a')].filter(a=>['Xem việc cần làm','Xem đơn hàng'].some(t=>a.textContent?.includes(t))).map(a=>({text:a.textContent,href:a.getAttribute('href'),...box(a)}))};});
 await page.screenshot({path:path.join(output,`before-${id}-${width}.png`),fullPage:true});observations.push({id,route,width,geometry});
}if(errors.length)throw Error(errors.join('\n'));const drift=Object.entries(sourceFingerprints).filter(([file,h])=>hash(path.join(repo,file))!==h).map(([file])=>file);if(drift.length)throw Error('Baseline source drift');
const record={startedAt,finishedAt:new Date().toISOString(),HEAD:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),gitStatus:execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:repo,encoding:'utf8'}),originalPaths,sourceFingerprints,protectedFingerprints:Object.fromEntries(protectedFiles.map(f=>[f,hash(path.join(repo,f))])),toolbarImpact:toolbarImpact(root),observations,errors,classification:'Confirmed consolidation opportunity; not a claim of a pre-existing geometry defect.',sourceDrift:drift};fs.writeFileSync(path.join(output,'baseline.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({HEAD:record.HEAD,sourceInputs:inputs.length,observations:observations.length,originalPaths:originalPaths.length,errors}));
}finally{await browser.close();await server.close();}
