import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium, firefox, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { spawn } from 'node:child_process';
import net from 'node:net';

const output=import.meta.dirname, frontend=path.resolve(output,'../..'), repository=path.dirname(frontend);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(path.join(dir,item.name)):[path.join(dir,item.name)]);
const inputs=[path.join(frontend,'apps/web/vite.config.ts'),path.join(frontend,'tests/session/demo-worker-startup.spec.ts'),...walk(path.join(frontend,'apps/web/src')),...walk(path.join(frontend,'packages'))].filter(file=>!file.includes(path.sep+'dist'+path.sep));
const sourceFingerprints=Object.fromEntries(inputs.map(file=>[path.relative(repository,file).replaceAll('\\','/'),hash(file)]));
const artifacts=walk(path.join(frontend,'apps/web/dist-demo')).map(file=>({path:path.relative(repository,file).replaceAll('\\','/'),sha256:hash(file)}));
const routes=read(path.join(frontend,'packages/contracts/src/routes.json')).routes;
const seed=read(path.join(frontend,'apps/web/src/mocks/seed.json'));
const values={shopId:'shop-demo',conversationId:'cv1',customerId:'c1',productId:'p1',orderId:'DH-1001',knowledgeId:'k1',jobId:seed.jobs[0]?.id||'missing-job'};
const pathname=route=>route.path.replace(/:([A-Za-z]+)/g,(_,key)=>{if(!values[key])throw new Error('Unresolved route '+route.id+':'+key);return values[key];});
const listener=net.createServer(); await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
const origin='http://127.0.0.1:'+port, startedAt=new Date().toISOString(), observations=[], details=[], pageErrors=[];
const args=[path.join(frontend,'node_modules/vite/bin/vite.js'),'preview','--outDir','dist-demo','--host','127.0.0.1','--port',String(port),'--strictPort'];
const server=spawn(process.execPath,args,{cwd:path.join(frontend,'apps/web'),windowsHide:true,stdio:'pipe'});let serverLog='',failure;
for(const stream of [server.stdout,server.stderr])stream.on('data',bytes=>serverLog+=bytes);
async function ready(page,route,width){await page.setViewportSize({width,height:1000});await page.goto(origin+pathname(route));await page.locator('main h1').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('main .MuiCircularProgress-root,main .MuiLinearProgress-root'));}
async function measure(page){return page.locator('main').evaluate(main=>{const r=element=>{const rect=element.getBoundingClientRect();return {x:rect.x,y:rect.y,width:rect.width,height:rect.height,bottom:rect.bottom,right:rect.right};};const grids=[...main.querySelectorAll('[data-ui-composition="section-grid"]')].map(grid=>({...r(grid),gap:parseFloat(getComputedStyle(grid).gap),columns:getComputedStyle(grid).gridTemplateColumns,children:[...grid.children].map(r)}));const forms=[...main.querySelectorAll('[data-ui-composition="form-fields"]')].map(form=>{const panel=form.closest('.MuiPaper-root'),body=panel?.lastElementChild,s=body&&getComputedStyle(body);return {...r(form),maxWidth:getComputedStyle(form).maxWidth,panelTitle:panel?.querySelector('h2')?.textContent,bodyWidth:body&&s?body.getBoundingClientRect().width-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight):null};});const groups=[...main.querySelectorAll('[data-ui-composition="surface-content"]')].filter(group=>group.querySelector('[data-ui-detail-line]')).map(group=>({gap:parseFloat(getComputedStyle(group).gap),slots:[...group.children].map(slot=>({...r(slot),dividers:slot.querySelectorAll('.MuiDivider-root').length}))}));const note=main.querySelector('[data-testid="notification-protection-note"]');return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,heading:main.querySelector('h1')?.textContent,grids,forms,groups,note:note?{...r(note),insideGrid:!!note.closest('[data-ui-composition="section-grid"]')}:null,detailCount:main.querySelectorAll('[data-ui-detail-line]').length};});}
try{
 const deadline=Date.now()+15000;while(true){if(server.exitCode!==null)throw new Error('Preview exited '+serverLog);try{if((await fetch(origin)).ok)break;}catch{}if(Date.now()>deadline)throw new Error('Preview timeout');await new Promise(resolve=>setTimeout(resolve,100));}
 expect(crypto.createHash('sha256').update(await(await fetch(origin)).text()).digest('hex')).toBe(hash(path.join(frontend,'apps/web/dist-demo/index.html')));
 for(const [engineName,engine]of [['chromium',chromium],['firefox',firefox]]){
  const browser=await engine.launch({headless:true});try{
   const context=await browser.newContext();const page=await context.newPage();page.on('pageerror',error=>pageErrors.push({engine:engineName,message:error.message}));page.on('dialog',dialog=>void dialog.accept());
   for(const route of routes)for(const width of [320,1920]){
    await ready(page,route,width);const actual=await measure(page);expect(actual.documentWidth).toBeLessThanOrEqual(width);expect(actual.heading).toBeTruthy();observations.push({engine:engineName,route:route.id,module:route.module,width,result:'PASS',...actual});
   }
   for(const id of ['R04','R05','R06'])for(const width of [320,390,768,1280,1440]){
    const route=routes.find(route=>route.id===id);await ready(page,route,width);const actual=await measure(page);expect(actual.documentWidth).toBeLessThanOrEqual(width);
    if(id==='R04'){
     const primary=page.getByRole('link',{name:'Xem việc cần làm',exact:true});expect(await primary.count()).toBe(1);expect(await primary.getAttribute('href')).toBe('/s/shop-demo/operations');expect((await primary.boundingBox()).height).toBeGreaterThanOrEqual(44);
     await primary.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
     const normal=await primary.evaluate(element=>getComputedStyle(element).backgroundColor);
     await primary.hover();const hover=await primary.evaluate(element=>getComputedStyle(element).backgroundColor);expect(hover).not.toBe(normal);
     await page.mouse.down();const active=await primary.evaluate(element=>({matches:element.matches(':active'),background:getComputedStyle(element).backgroundColor}));expect(active.matches).toBe(true);expect(active.background).not.toBe(hover);expect(active.background).not.toBe(normal);
     await page.mouse.move(0,0);await page.mouse.up();expect(new URL(page.url()).pathname).toBe('/s/shop-demo/overview');
     await primary.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(primary).toBeFocused();const focusRing=await primary.evaluate(element=>({matches:element.matches(':focus-visible'),width:parseFloat(getComputedStyle(element).outlineWidth)}));expect(focusRing.matches).toBe(true);expect(focusRing.width).toBeGreaterThanOrEqual(2);
     actual.primaryInteraction={normal,hover,active,focusRing};
    }
    if(id==='R05'||id==='R06'){const filters=page.locator('[data-ui-composition="field-group"][aria-label="Bộ lọc hội thoại"]');expect(await filters.getAttribute('data-ui-composition')).toBe('field-group');if(id==='R06'&&width<1280)await expect(filters).toBeHidden();else{await expect(filters).toBeVisible();const group=await filters.evaluate(element=>{const form=element.parentElement.querySelector('form'),r=element.getBoundingClientRect(),f=form.getBoundingClientRect();return {outside:!element.closest('form'),left:r.left,right:r.right,formLeft:f.left,formRight:f.right,padding:getComputedStyle(element).paddingLeft};});expect(group.outside).toBe(true);expect(group.padding).toBe('0px');expect(group.left).toBeCloseTo(group.formLeft,0);expect(group.right).toBeCloseTo(group.formRight,0);}}
    const violations=(await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;expect(violations).toEqual([]);
    const field=page.locator('main input:not([type="hidden"]):not(:disabled):visible,main button:not(:disabled):visible,main a[href]:visible').first();await field.focus();await expect(field).toBeFocused();await page.keyboard.press('Tab');const focus=await page.evaluate(()=>{const a=document.activeElement,r=a?.getBoundingClientRect();return {inMain:!!a?.closest('main'),width:r?.width,height:r?.height};});expect(focus.inMain).toBe(true);expect(focus.width).toBeGreaterThan(0);
    const screenshot=path.join(output,`${id}-${engineName}-${width}-after.png`);await page.screenshot({path:screenshot,fullPage:true});details.push({engine:engineName,route:id,width,result:'PASS',axeViolations:0,keyboard:focus,screenshot:{path:path.relative(repository,screenshot).replaceAll('\\','/'),sha256:hash(screenshot)},...actual});
   }
  }finally{await browser.close();}console.log(JSON.stringify({engine:engineName,routes:observations.filter(item=>item.engine===engineName).length,details:details.filter(item=>item.engine===engineName).length}));
 }
 expect(observations).toHaveLength(216);expect(details).toHaveLength(30);expect(pageErrors).toEqual([]);
}catch(error){failure=String(error.stack||error);console.error(failure);}finally{server.kill();}
const sourceDrift=Object.entries(sourceFingerprints).filter(([file,digest])=>hash(path.join(repository,file))!==digest).map(([file])=>file);
const artifactDrift=artifacts.filter(file=>hash(path.join(repository,file.path))!==file.sha256);
const record={status:!failure&&!sourceDrift.length&&!artifactDrift.length?'PASS':'FAIL',startedAt,finishedAt:new Date().toISOString(),method:'Actual isolated compiled dist-demo, 54 routes x 2 viewports x 2 engines; owner-specific geometry/axe/keyboard on R04/R05/R06 x five widths x two engines.',executable:process.execPath,args,origin,sourceFingerprints,artifacts,sourceDrift,artifactDrift,pageErrors,observations,details,failure,serverLog,limits:'Mock local scope; route mount/geometry is not every conditional business state or user acceptance.'};
fs.writeFileSync(path.join(output,'built-shared-review.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({status:record.status,routes:observations.length,details:details.length,sourceDrift}));if(record.status!=='PASS')process.exitCode=1;
