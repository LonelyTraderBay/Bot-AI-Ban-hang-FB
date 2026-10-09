import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium, expect } from '@playwright/test';
const output=import.meta.dirname,root=path.resolve(output,'../..'),repository=path.dirname(root),origin='http://127.0.0.1:4173';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const html=hash(fs.readFileSync(path.join(root,'apps/web/dist-demo/index.html')));
expect(hash(Buffer.from(await(await fetch(origin)).text()))).toBe(html);
const browser=await chromium.launch(),page=await browser.newPage(),observations=[],pageErrors=[];
page.on('pageerror',error=>pageErrors.push(error.message));
try {
 for(const route of ['products/new','products/p1'])for(const width of [390,1280]){
  await page.setViewportSize({width,height:900});await page.goto(origin+'/s/shop-demo/'+route);
  const field=page.getByRole('textbox',{name:'Tên / màu / kích cỡ',exact:true}).first();await expect(field).toBeVisible();
  const section=page.getByRole('heading',{name:'Biến thể và giá',exact:true}).locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")]').first();
  await section.scrollIntoViewIfNeeded();
  const bounds=await field.boundingBox();expect(bounds.width).toBeGreaterThanOrEqual(120);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const screenshot=path.join(output,route.replace('/','-')+'-variant-handoff-'+width+'.png');await section.screenshot({path:screenshot});
  observations.push({route,width,field:bounds,screenshot:{path:path.relative(repository,screenshot).replaceAll('\\','/'),sha256:hash(fs.readFileSync(screenshot))}});
 }
 expect(pageErrors).toEqual([]);
}finally{await browser.close();}
const record={status:'PASS',capturedAt:new Date().toISOString(),origin,html,observations,pageErrors,limits:'Actual compiled local preview, default text size, create/edit at390/1280. Real native text200% is the separate108-probe execution; user acceptance remains PENDING.'};
fs.writeFileSync(path.join(output,'variant-handoff-current.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({status:record.status,observations:observations.length}));
