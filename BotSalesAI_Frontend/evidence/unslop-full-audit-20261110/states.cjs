const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium,firefox,expect}=require('@playwright/test');
const out=__dirname;
(async()=>{
 const {startDemoPreview}=await import(pathToFileURL(path.resolve('tests/session/demo-server.mjs')));
 const server=await startDemoPreview(),observations=[],fields=[];
 fs.mkdirSync(path.join(out,'states'),{recursive:true});
 try{
  await Promise.all([['chromium',chromium],['firefox',firefox]].map(async([engine,type])=>{
   const browser=await type.launch(engine==='chromium'?{channel:'chrome'}:{});
   try{
    for(const width of [1440,390]){
     for(const route of ['R14','R36','R61','R20','R22','R58','R59']){
      const context=await browser.newContext({viewport:{width,height:width<768?844:900}}),page=await context.newPage();
      const record={route,engine,width,fixture:'isolated synthetic MSW; no external submission'};
      try{
       if(route==='R14'){
        await page.goto(server.url+'/s/shop-demo/imports',{waitUntil:'domcontentloaded'});
        await page.locator('input[type="file"]').setInputFiles({name:'audit.csv',mimeType:'text/csv',buffer:Buffer.from('sku,name,price,description,currency\nAUDIT-UI-001,Áo kiểm UI,120000,Mẫu audit,VND\nAUDIT-UI-002,Thiếu giá,,Mẫu lỗi,VND')});
        await page.getByRole('button',{name:'Kiểm tra trước khi nhập',exact:true}).click();
        await expect(page).toHaveURL(/\/imports\/job-/);
        await expect(page.getByRole('heading',{name:'Kết quả kiểm tra tệp',exact:true})).toBeVisible();
        await expect(page.getByText('2 / 2',{exact:true})).toBeVisible();
       }else if(route==='R36'){
        await page.goto(server.url+'/s/shop-demo/reports',{waitUntil:'domcontentloaded'});
        await page.getByRole('button',{name:'Tạo tệp báo cáo CSV',exact:true}).click();
        await page.getByRole('link',{name:/^Theo dõi công việc /}).click();
        await expect(page.getByRole('heading',{name:'Kết quả xử lý',exact:true})).toBeVisible();
       }else if(route==='R61'){
        await page.goto(server.url+'/consent/confirm?token=local-demo-optout-consent-challenge-20261009',{waitUntil:'domcontentloaded'});
        await page.getByRole('button',{name:'Xem nội dung yêu cầu',exact:true}).click();
        await expect(page.getByRole('button',{name:'Xác nhận ngừng marketing',exact:true})).toBeEnabled();
       }else{
        const p={R20:'finance',R22:'finance/profit-loss',R58:'finance/ledger',R59:'finance/trial-balance'}[route];
        await page.goto(`${server.url}/s/shop-demo/${p}?fromDate=2026-09-01&toDate=2026-10-01`,{waitUntil:'domcontentloaded'});
       }
       await expect(page.locator('main h1')).toBeVisible();
       await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('main [role="progressbar"]')).toHaveCount(0,{timeout:15000});
       await expect(page.locator('main')).not.toHaveText('');
       record.path=new URL(page.url()).pathname+new URL(page.url()).search;
       record.text=await page.locator('main').innerText();
       record.overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
       if(engine==='chromium'){
        record.screenshot=`states/${route}-ready-${engine}-${width}.png`;
        await page.screenshot({path:path.join(out,record.screenshot),fullPage:true});
       }
      }catch(e){record.error=e.message;}
      observations.push(record);await context.close();
     }
     const page=await browser.newPage({viewport:{width,height:900}});
     for(const [route,p] of [['R05','inbox'],['R06','inbox/cv1'],['R09','products'],['R15','inventory'],['R16','inventory/movements']]){
      await page.goto(`${server.url}/s/shop-demo/${p}`,{waitUntil:'domcontentloaded'});
      await expect(page.locator('main [role="progressbar"]')).toHaveCount(0,{timeout:15000});
      const values=await page.locator('main [role="combobox"]').evaluateAll(elements=>elements.filter(e=>e.getBoundingClientRect().width>0).map(e=>{
       const root=e.closest('.MuiInputBase-root'),form=e.closest('.MuiFormControl-root');
       return{label:form?.querySelector('label')?.textContent,roleHeight:e.getBoundingClientRect().height,rootHeight:root?.getBoundingClientRect().height,width:e.getBoundingClientRect().width};
      }));
      fields.push({route,engine,width,fields:values});
     }
     await page.close();
    }
   }finally{await browser.close();}
  }));
 }finally{await server.close();}
 fs.writeFileSync(path.join(out,'states.json'),JSON.stringify({expected:28,observed:observations.length,observations,fields},null,2));
 console.log(JSON.stringify({expected:28,observed:observations.length,errors:observations.filter(o=>o.error).map(o=>({r:o.route,w:o.width,e:o.engine,error:o.error.slice(0,200)})),overflows:observations.filter(o=>o.overflow>0).length,fields:fields.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
