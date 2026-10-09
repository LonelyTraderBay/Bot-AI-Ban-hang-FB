import fs from 'node:fs';
import { chromium } from 'playwright';
import { startDemoServer } from '../../tests/session/demo-server.mjs';
const server = await startDemoServer({cacheIsolationKey:'density-dirty-dialog-before'});
const browser = await chromium.launch();
const observed = [];
const measure = async dialog => dialog.evaluate(element => Object.fromEntries(['.MuiDialogTitle-root','.MuiDialogContent-root','.MuiDialogActions-root'].map(selector => { const node=element.querySelector(selector), style=getComputedStyle(node); return [selector,{paddingTop:style.paddingTop,paddingLeft:style.paddingLeft,gap:style.gap}]; })));
try {
 for(const width of [320,1440]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.goto(server.url+'/s/shop-demo/categories');
  await page.getByRole('button',{name:'Thêm danh mục',exact:true}).click();
  await page.getByRole('dialog').getByRole('textbox',{name:'Tên',exact:true}).fill('Bản nháp');
  await page.keyboard.press('Escape');
  const inner=page.getByRole('dialog',{name:'Rời biểu mẫu chưa lưu?',exact:true}); await inner.waitFor();
  observed.push({width,kind:'editor-discard',geometry:await measure(inner)});
  await page.close();
  const shell=await browser.newPage({viewport:{width,height:900}});
  await shell.goto(server.url+'/s/shop-demo/orders/new');
  await shell.getByLabel('Ghi chú chuẩn bị').fill('Bản nháp');
  await shell.getByRole('link',{name:'Danh sách đơn',exact:true}).click();
  const outer=shell.getByRole('dialog',{name:'Rời màn hình chưa lưu?',exact:true}); await outer.waitFor();
  observed.push({width,kind:'navigation-discard',geometry:await measure(outer)}); await shell.close();
 }
 fs.writeFileSync(new URL('dirty-dialog-before.json',import.meta.url),JSON.stringify({observedAt:new Date().toISOString(),observed},null,2)+'\n');
 console.log(JSON.stringify(observed));
} finally {await browser.close(); await server.close();}
