import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve('BotSalesAI_Frontend');
const require=createRequire(path.join(root,'package.json'));
const {chromium,expect}=require('@playwright/test');
const {startDemoServer}=await import(pathToFileURL(path.join(root,'tests/session/demo-server.mjs')));
const server=await startDemoServer();
const browser=await chromium.launch();
const folder=path.resolve('.git/codex-delivery/catalog-probe-after');
fs.mkdirSync(folder,{recursive:true});
const results=[];
try {
 for(const [cpu,detailDelay,listDelay] of [[6,0,3000],[6,1500,3000]]) {
  const name=`cpu-${cpu}-detail-${detailDelay}-list-${listDelay}`;
  const context=await browser.newContext();
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  const page=await context.newPage();
  const cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
  const network=[];
  page.on('response',async response=>{if(new URL(response.url()).pathname.startsWith('/api/v2/shops/shop-demo/products'))network.push({at:Date.now(),method:response.request().method(),url:response.url(),status:response.status(),body:await response.text().catch(()=>null)});});
  try {
   await page.goto(server.url+'/s/shop-demo/products');
   await expect(page.getByRole('heading',{name:'Sản phẩm',exact:true})).toBeVisible();
   await expect(page.getByText('Dữ liệu mô phỏng',{exact:true})).toBeVisible();
   await page.evaluate(async({detailDelay,listDelay})=>{const service=await import('/src/mocks/service.ts');service.setOperationDelay('getProduct',detailDelay);service.setOperationDelay('listProducts',listDelay);},{detailDelay,listDelay});
   await page.getByRole('button',{name:'Thêm sản phẩm',exact:true}).click();
   await page.getByLabel('Tên sản phẩm',{exact:true}).fill('Sản phẩm kiểm thử');
   await page.getByLabel('SKU',{exact:true}).fill('TEST-001');
   await page.getByLabel(/Giá bán/).fill('150000');
   const createResponse=page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname==='/api/v2/shops/shop-demo/products');
   await page.getByRole('button',{name:'Lưu sản phẩm',exact:true}).click();
   const created=await createResponse;expect(created.status()).toBe(201);const createdProduct=(await created.json()).data;expect(createdProduct.name).toBe('Sản phẩm kiểm thử');
   await expect(page).toHaveURL(/\/products\/product-/);
   await expect(page.getByRole('dialog',{name:'Rời màn hình chưa lưu?'})).toHaveCount(0);
   const listResponse=page.waitForResponse(response=>response.request().method()==='GET'&&new URL(response.url()).pathname==='/api/v2/shops/shop-demo/products');
   await page.getByRole('link',{name:'Danh sách',exact:true}).click();
   await expect(page).toHaveURL(/\/products$/);await expect(page.getByRole('dialog',{name:'Rời màn hình chưa lưu?'})).toHaveCount(0);const listed=await listResponse;expect(listed.status()).toBe(200);expect((await listed.json()).data).toContainEqual(expect.objectContaining(createdProduct));
   await expect(page.getByText('Sản phẩm kiểm thử',{exact:true})).toBeVisible();
   results.push({name,status:'PASS',url:page.url()});
  } catch(error) {
   results.push({name,status:'FAIL',url:page.url(),error:error.message});
   fs.writeFileSync(path.join(folder,name+'.html'),await page.content());
   await page.screenshot({path:path.join(folder,name+'.png'),fullPage:true});
  }
  fs.writeFileSync(path.join(folder,name+'.network.json'),JSON.stringify(network,null,2));
  await context.tracing.stop({path:path.join(folder,name+'.zip')});
  await context.close();
  console.log(JSON.stringify(results.at(-1)));
 }
} finally {await browser.close();await server.close();fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(results,null,2));}
