import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
import {startDemoServer} from '../../tests/session/demo-server.mjs';

const output=import.meta.dirname,root=path.resolve(output,'../..'),repo=path.dirname(root);
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',windowsHide:true,maxBuffer:64*1024*1024});
const selected=[...new Set(git('ls-files','-co','--exclude-standard','--','BotSalesAI_Frontend/apps/web/src','BotSalesAI_Frontend/docs','BotSalesAI_Frontend/DESIGN.md','BotSalesAI_Frontend/UX-CONTRACT.md','botsales-kit/contracts','botsales-kit/design','botsales-kit/scripts/generate-reference.py').split(/\r?\n/).filter(file=>/^(BotSalesAI_Frontend\/(apps\/web\/src\/|docs\/FRONTEND_|DESIGN\.md|UX-CONTRACT\.md)|botsales-kit\/(contracts\/|design\/|scripts\/generate-reference\.py))/.test(file)))].filter(file=>fs.existsSync(path.join(repo,file)));
for(const file of selected){const dest=path.join(output,'before-source',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(repo,file),dest);}
const baseline={recordedAt:new Date().toISOString(),head:git('rev-parse','HEAD').trim(),gitStatus:git('status','--porcelain'),sourceFingerprints:Object.fromEntries(selected.map(file=>[file,sha(path.join(repo,file))])),scope:'Frontend + canonical contract + synthetic MSW; no Backend/provider deployment',observations:[]};
fs.writeFileSync(path.join(output,'baseline.json'),JSON.stringify(baseline,null,2)+'\n');
const routes=JSON.parse(fs.readFileSync(path.join(root,'packages/contracts/src/routes.json'),'utf8')).routes;
const values={shopId:'shop-demo',conversationId:'cv1',customerId:'c1',productId:'p1',orderId:'DH-1001',knowledgeId:'k1',jobId:'missing-job'};
const server=await startDemoServer(),browser=await chromium.launch();
try{for(const width of [320,1280]){const page=await browser.newPage({viewport:{width,height:720}});for(const route of routes){const pathname=route.path.replace(/:([A-Za-z]+)/g,(_,key)=>values[key]);await page.goto(server.url+pathname);await expect(page.locator('main')).toBeVisible();await expect(page.locator('main [role="progressbar"]')).toHaveCount(0,{timeout:20000});const observation=await page.evaluate(()=>({url:location.pathname+location.search,title:document.title,width:innerWidth,documentWidth:document.documentElement.scrollWidth,heading:document.querySelector('main h1')?.textContent,text:document.querySelector('main')?.textContent,tables:[...document.querySelectorAll('main table')].map(table=>table.getAttribute('aria-label'))}));const screenshot=`before-${route.id}-${width}.png`;await page.screenshot({path:path.join(output,screenshot)});baseline.observations.push({route:route.id,...observation,screenshot});fs.writeFileSync(path.join(output,'baseline.json'),JSON.stringify(baseline,null,2)+'\n');console.log(route.id,width);}await page.close();}}finally{await browser.close();await server.close();}
