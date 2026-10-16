import fs from 'node:fs';
import path from 'node:path';
import {expect,test} from '@playwright/test';
import {startDemoServer} from './session/demo-server.mjs';
test('audit dashboard row occupancy with actual child geometry',async({page,browser},info)=>{
 const server=await startDemoServer({cacheIsolationKey:'dashboard-row-diagnostic'});
 const observations=[];
 try{
  for(const width of[390,768,1279,1280,1440,1920]){
   await page.setViewportSize({width,height:900});await page.goto(server.url+'/s/shop-demo/overview');await expect(page.locator('main h1')).toBeVisible();
   await expect(page.locator('main .MuiCircularProgress-root,main .MuiLinearProgress-root')).toHaveCount(0);
   const panel=page.getByRole('heading',{name:'Dòng tiền và doanh thu',exact:true}).locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]');
   const measurement=await panel.evaluate(e=>{
    const parent=e.parentElement!,r=parent.getBoundingClientRect(),p=e.getBoundingClientRect(),s=getComputedStyle(parent);
    const siblings=[...parent.children].map(c=>{const x=c.getBoundingClientRect();return {title:c.querySelector('h2')?.textContent,left:x.left,top:x.top,right:x.right,width:x.width,height:x.height,gridColumn:getComputedStyle(c).gridColumn};});
    const sameRow=siblings.filter(x=>Math.abs(x.top-p.top)<1);
    const occupied=sameRow.reduce((n,x)=>n+x.width,0)+(sameRow.length-1)*parseFloat(s.columnGap);
    return{parent:{left:r.left,right:r.right,width:r.width,columns:s.gridTemplateColumns,gap:s.columnGap},panel:{left:p.left,right:p.right,width:p.width,height:p.height},sameRow,unusedWidth:r.width-occupied,siblings};
   });
   observations.push({width,...measurement});
  }
  fs.writeFileSync(path.join(process.env.UI_AUDIT_OUTPUT_DIR!,'dashboard-occupancy.json'),JSON.stringify({browserVersion:browser.version(),observations},null,2)+'\n');
  await info.attach('dashboard-row-measurements',{body:JSON.stringify(observations),contentType:'application/json'});
 }finally{await server.close();}
});
