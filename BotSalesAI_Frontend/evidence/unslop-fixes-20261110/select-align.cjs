const {chromium,firefox,expect}=require('@playwright/test');
const {pathToFileURL}=require('url');
const path=require('path');
(async()=>{
 const {startDemoPreview}=await import(pathToFileURL(path.resolve('tests/session/demo-server.mjs')));
 const server=await startDemoPreview(),results=[];
 try{for(const [engine,type] of [['chromium',chromium],['firefox',firefox]]){
  const browser=await type.launch(engine==='chromium'?{channel:'chrome'}:{});
  try{for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:900}});
   await page.goto(server.url+'/s/shop-demo/products');
   const control=page.getByRole('combobox',{name:'Trạng thái'});
   await control.click();await page.getByRole('option',{name:'Đang bán',exact:true}).click();
   await expect(control).toContainText('Đang bán');
   const metric=await control.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);const t=range.getBoundingClientRect(),r=el.getBoundingClientRect();return {height:r.height,delta:t.top+t.height/2-r.top-r.height/2};});
   results.push({engine,width,...metric});
   if(metric.height<44 || Math.abs(metric.delta)>1)throw Error(JSON.stringify(results));
   await page.close();
  }}finally{await browser.close();}
 }}finally{await server.close();}
 console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1});
