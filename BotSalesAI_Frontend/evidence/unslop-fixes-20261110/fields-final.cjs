const fs=require('fs'),path=require('path');
const {pathToFileURL}=require('url');
const {chromium,firefox,expect}=require('@playwright/test');
(async()=>{
 const {startDemoPreview}=await import(pathToFileURL(path.resolve('tests/session/demo-server.mjs')));
 const server=await startDemoPreview(),rows=[];
 try{
  for(const[engine,type]of[['chromium',chromium],['firefox',firefox]]){
   const browser=await type.launch(engine==='chromium'?{channel:'chrome'}:{});
   try{
    const page=await browser.newPage();
    for(const width of[1440,390]){
     await page.setViewportSize({width,height:900});
     for(const[route,pathname,title]of[['R05','inbox','Hộp thư khách hàng'],['R06','inbox/cv1','Hộp thư khách hàng'],['R09','products','Sản phẩm'],['R15','inventory','Tồn kho'],['R16','inventory/movements','Lịch sử kho']]){
      await page.goto(server.url+'/s/shop-demo/'+pathname,{waitUntil:'domcontentloaded'});
      await expect(page.locator('main h1')).toHaveText(title);
      await expect(page.locator('main').getByRole('combobox').first()).toBeVisible();
      const fields=await page.locator('main').getByRole('combobox').evaluateAll(es=>es.map(e=>({label:e.closest('.MuiFormControl-root')?.querySelector('label')?.textContent,height:e.getBoundingClientRect().height,rootHeight:e.closest('.MuiInputBase-root')?.getBoundingClientRect().height})).filter(e=>e.height>0));
      if(!fields.length)throw new Error('No ready fields: '+route);
      rows.push({route,engine,width,fields});
     }
    }
   }finally{await browser.close();}
  }
 }finally{await server.close();}
 fs.writeFileSync(path.join(__dirname,'fields-final.json'),JSON.stringify({expected:20,observed:rows.length,rows},null,2));
 console.log(JSON.stringify({expected:20,observed:rows.length,smallRoutes:[...new Set(rows.filter(r=>r.fields.some(f=>f.rootHeight<44)).map(r=>r.route))]}));
})().catch(e=>{console.error(e);process.exitCode=1;});
