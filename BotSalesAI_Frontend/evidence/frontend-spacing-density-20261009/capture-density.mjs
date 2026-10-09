import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium, firefox} from '@playwright/test';
import {startDemoServer} from '../../tests/session/demo-server.mjs';

const out=import.meta.dirname, root=path.resolve(out,'../..'), repo=path.dirname(root), phase=process.argv[2];
if(!['before','after'].includes(phase))throw Error('Use before or after');
const recordFile=path.join(out,phase+'.json');
if(fs.existsSync(recordFile))throw Error('Immutable capture already exists: '+recordFile);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const rel=f=>path.relative(repo,f).replaceAll('\\','/');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isSymbolicLink()||['node_modules','dist','dist-demo','.vite'].includes(e.name)?[]:e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=['apps/web/src','apps/web/tests','tests','scripts','packages','docs'].flatMap(d=>walk(path.join(root,d))).concat(['package.json','package-lock.json','playwright.config.ts','playwright.built-demo.config.ts','apps/web/vite.config.ts','apps/web/tsconfig.json'].map(f=>path.join(root,f)));
const fingerprints=Object.fromEntries(files.map(f=>[rel(f),hash(f)]));
const protectedFiles=['AGENTS.md','BotSalesAI_Frontend/AI_RULES.md','botsales-kit/AI_RULES.md','botsales-kit/design/tokens.json','botsales-kit/contracts/openapi.json','botsales-kit/contracts/route-manifest.json','botsales-kit/execution/plan.json','botsales-kit/execution/progress.json','BotSalesAI_Frontend/package.json','BotSalesAI_Frontend/package-lock.json'];
if(phase==='before')for(const f of files){const dest=path.join(out,'before-source',path.relative(root,f));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(f,dest);}
const routes=JSON.parse(fs.readFileSync(path.join(root,'packages/contracts/src/routes.json'),'utf8')).routes;
const seed=JSON.parse(fs.readFileSync(path.join(root,'apps/web/src/mocks/seed.json'),'utf8'));
const values={shopId:'shop-demo',conversationId:'cv1',customerId:'c1',productId:'p1',orderId:'DH-1001',knowledgeId:'k1',jobId:seed.jobs[0]?.id||'missing-job'};
const routePath=r=>r.path.replace(/:([A-Za-z]+)/g,(_,k)=>{if(!values[k])throw Error('Unresolved '+k);return values[k];});
const server=await startDemoServer({cacheIsolationKey:'density-'+phase}), startedAt=new Date().toISOString(), observations=[], errors=[];
try{for(const [engineName,engine]of [['chromium',chromium],['firefox',firefox]]){
 const browser=await engine.launch();try{const page=await browser.newPage();page.on('pageerror',e=>errors.push({engine:engineName,message:e.message}));
 for(const width of [320,1440])for(const route of routes){await page.setViewportSize({width,height:900});await page.goto(server.url+routePath(route));await page.locator('main h1').waitFor();await page.waitForFunction(()=>!document.querySelector('main .MuiCircularProgress-root,main .MuiLinearProgress-root'));
 const actual=await page.locator('main').evaluate(main=>{const box=e=>{if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,y:r.y,width:r.width,height:r.height,padding:s.padding,gap:s.gap};};return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,heading:main.querySelector('h1')?.textContent,main:box(main),demoTools:box(document.getElementById('mock-tools-controls')),compositions:[...main.querySelectorAll('[data-ui-composition]')].map(e=>({type:e.getAttribute('data-ui-composition'),rhythm:e.getAttribute('data-ui-rhythm'),...box(e)})),rows:[...main.querySelectorAll('tbody tr')].slice(0,10).map(box),details:[...main.querySelectorAll('[data-ui-detail-line]')].map(e=>({outer:box(e),inner:box(e.firstElementChild)}))};});
 if(actual.documentWidth>width||!actual.heading)throw Error('Route geometry/readiness '+route.id+' '+width);
 const screenshot=path.join(out,phase+'-'+route.id+'-'+engineName+'-'+width+'.png');await page.screenshot({path:screenshot,fullPage:true});observations.push({route:route.id,module:route.module,engine:engineName,width,...actual,screenshot:{path:rel(screenshot),sha256:hash(screenshot)}});
 }console.log(JSON.stringify({phase,engine:engineName,observations:observations.length}));}finally{await browser.close();}
 }
 if(errors.length||observations.length!==routes.length*4)throw Error('Incomplete capture');
 const sourceDrift=Object.entries(fingerprints).filter(([f,h])=>hash(path.join(repo,f))!==h).map(([f])=>f);if(sourceDrift.length)throw Error('Source drift '+sourceDrift.join(','));
 const record={phase,status:'PASS',startedAt,finishedAt:new Date().toISOString(),HEAD:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),gitStatus:execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:repo,encoding:'utf8'}),originalPaths:execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{cwd:repo,encoding:'utf8',maxBuffer:64e6}).split('\0').filter(Boolean),sourceFingerprints:fingerprints,protectedFingerprints:Object.fromEntries(protectedFiles.map(f=>[f,hash(path.join(repo,f))])),observations,errors,sourceDrift,limits:'Loaded route geometry baseline/current capture; not every conditional business state, accessibility conformance or acceptance.'};
 fs.writeFileSync(recordFile,JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({phase,status:record.status,observations:observations.length,inputs:files.length}));
}finally{await server.close();}
