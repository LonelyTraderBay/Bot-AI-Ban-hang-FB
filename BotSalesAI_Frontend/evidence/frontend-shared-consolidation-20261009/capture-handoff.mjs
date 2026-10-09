import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {chromium,expect} from '@playwright/test';
const output=import.meta.dirname,frontend=path.resolve(output,'../..'),repository=path.dirname(frontend),origin='http://127.0.0.1:4173';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const html=path.join(frontend,'apps/web/dist-demo/index.html');
const response=await fetch(origin),servedHtml=sha(Buffer.from(await response.text())),expectedHtml=sha(fs.readFileSync(html));
expect(response.status).toBe(200);expect(servedHtml).toBe(expectedHtml);
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),pageErrors=[],observations=[];
page.on('pageerror',error=>pageErrors.push(error.message));
try{for(const [id,route]of[['R04','overview'],['R05','inbox'],['R06','inbox/cv1']]){
 await page.goto(origin+'/s/shop-demo/'+route);await page.locator('main h1').waitFor();await page.waitForFunction(()=>!document.querySelector('main .MuiCircularProgress-root,main .MuiLinearProgress-root'));
 const actual=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,heading:document.querySelector('main h1')?.textContent,sharedFilters:document.querySelector('[aria-label="Bộ lọc hội thoại"]')?.getAttribute('data-ui-composition'),primaryLinks:[...document.querySelectorAll('main a')].filter(a=>/^Xem việc cần làm/.test(a.textContent)).map(a=>({href:a.getAttribute('href'),text:a.textContent}))}));expect(actual.documentWidth).toBeLessThanOrEqual(actual.viewport);
 if(id==='R04')expect(actual.primaryLinks).toHaveLength(1);else expect(actual.sharedFilters).toBe('field-group');
 const capture=path.join(output,id+'-handoff-current-1440.png');await page.screenshot({path:capture,fullPage:true});observations.push({id,route,actual,screenshot:{path:path.relative(repository,capture).replaceAll('\\','/'),sha256:sha(fs.readFileSync(capture))}});
}expect(pageErrors).toEqual([]);}finally{await browser.close();}
const record={status:'PASS',capturedAt:new Date().toISOString(),origin,statusCode:response.status,expectedHtml,servedHtml,pageErrors,observations,limits:'Actual compiled local mock demo, three affected screens; user acceptance remains PENDING.'};
fs.writeFileSync(path.join(output,'handoff-demo-current.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({status:record.status,routes:observations.length,htmlMatches:true}));
