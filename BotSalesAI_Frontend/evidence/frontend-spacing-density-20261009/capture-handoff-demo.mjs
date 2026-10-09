import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {chromium,expect} from '@playwright/test';
const output=import.meta.dirname,root=path.resolve(output,'../..'),repo=path.dirname(root),origin='http://127.0.0.1:4173';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const response=await fetch(origin,{headers:{'Cache-Control':'no-cache'}}),servedHtml=crypto.createHash('sha256').update(await response.text()).digest('hex'),expectedHtml=hash(path.join(root,'apps/web/dist-demo/index.html'));
expect(response.status).toBe(200);expect(servedHtml).toBe(expectedHtml);
const browser=await chromium.launch(),pageErrors=[],observations=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>pageErrors.push(e.message));
 for(const route of ['products','integrations/ai','shipments','approvals','inbox','knowledge/k1','categories']){
  await page.goto(origin+'/s/shop-demo/'+route);await page.locator('main h1').waitFor();await page.waitForFunction(()=>!document.querySelector('main .MuiCircularProgress-root,main .MuiLinearProgress-root'));
  if(route==='categories'){await page.getByRole('button',{name:'Thêm danh mục',exact:true}).click();await page.getByRole('dialog').evaluate(async e=>{await Promise.all(e.closest('.MuiDialog-root').getAnimations({subtree:true}).map(a=>a.finished));});}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(1440);
  const file=path.join(output,'handoff-'+route.replaceAll('/','-')+'.png');await page.screenshot({path:file,fullPage:true});
  observations.push({route,heading:await page.locator('main h1').innerText(),screenshot:{path:path.relative(repo,file).replaceAll('\\','/'),sha256:hash(file)}});
 }
 expect(pageErrors).toEqual([]);
 fs.writeFileSync(path.join(output,'handoff-demo-current.json'),JSON.stringify({status:'PASS',recordedAt:new Date().toISOString(),origin,statusCode:response.status,servedHtml,expectedHtml,pageErrors,observations,limits:'Seven actual compiled demo states. Public preview serves source-final built HTML; broader route/branch/native evidence remains separate.'},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',screens:observations.length,servedHtml}));
} finally {await browser.close();}
