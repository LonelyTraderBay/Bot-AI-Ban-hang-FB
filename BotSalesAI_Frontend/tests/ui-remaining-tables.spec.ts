import path from 'node:path';
import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';
import { openDemoControls } from './session/demo-controls';
let url='', close:(()=>Promise<void>)|undefined;
test.beforeAll(async()=>{const server=await startDemoServer({cacheIsolationKey:'remaining-tables'});url=server.url;close=server.close;});
test.afterAll(async()=>close?.());
const routes=[
 ['products','Danh sách sản phẩm','Chi tiết','link'],
 ['inventory','Tồn kho theo vị trí','Điều chỉnh','button'],
 ['fulfillment','Công việc chuẩn bị đơn','Mở phiếu lấy hàng','button'],
 ['purchases','Đơn mua hàng','Xem chi tiết','button'],
 ['settings/team','Nhân sự và quyền truy cập','Chi tiết nhân sự','button'],
] as const;
for(const width of [320,390,1440]) test(`mobile actions and desktop layout ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});
 for(const [route,label,action,role] of routes){
  await page.goto(`${url}/s/shop-demo/${route}`);
  const region=page.getByRole('region',{name:label,exact:true}); await expect(region).toBeVisible();
  const control=region.getByRole(role,{name:action,exact:true}).first(); await expect(control).toBeVisible();
  const rects=await control.evaluate(node=>{const a=node.getBoundingClientRect(),r=node.closest('[role=region]')!.getBoundingClientRect();return {left:a.left,right:a.right,regionLeft:r.left,regionRight:r.right};});
  expect(rects.left,`${route} left`).toBeGreaterThanOrEqual(rects.regionLeft-1);expect(rects.right,`${route} right`).toBeLessThanOrEqual(rects.regionRight+1);
  if(route==='settings/team' && width<600){
   const row=control.locator('xpath=ancestor::tr'), role=row.getByText('Chủ cửa hàng',{exact:true}); await expect(role).toBeVisible();
   const geometry=await role.evaluate(node=>{const text=node.getBoundingClientRect(),region=node.closest('[role=region]')!.getBoundingClientRect();return {right:text.right,regionRight:region.right};});
   expect(geometry.right).toBeLessThanOrEqual(geometry.regionRight+1);
  }
  if(width<600){await region.focus();const before=await region.evaluate(n=>n.scrollLeft);await page.keyboard.press('ArrowRight');await expect.poll(()=>region.evaluate(n=>n.scrollLeft)).toBeGreaterThan(before);}
  await page.screenshot({path:path.join('evidence/ui-remaining-tables-20261110',`after-${info.project.name}-${route.replaceAll('/','-')}-${width}.png`),fullPage:true});
  await control.click(); if(role==='link') await expect(page).toHaveURL(/\/products\//); else await expect(page.getByRole('dialog').first()).toBeVisible();
  if(route==='settings/team' && width<600){const dialog=page.getByRole('dialog',{name:'Chi tiết nhân sự'});await expect(dialog.getByRole('button',{name:'Thu hồi'})).toBeDisabled();await dialog.getByRole('button',{name:'Sửa quyền'}).click();await expect(page.getByRole('dialog',{name:'Cập nhật quyền'})).toBeVisible();}
 }
});
test('stock history displays names from accessible lookups and keeps staff fallback',async({page},info)=>{
 await page.setViewportSize({width:390,height:900}); await page.goto(`${url}/s/shop-demo/inventory/movements`);
 const table=page.getByRole('table',{name:'Lịch sử biến động kho'}); await expect(table.getByText('Áo mẫu A · M · Xanh · DEMO-001')).toBeVisible(); await expect(table.getByText('MAIN · Kho chính · dữ liệu tổng hợp').first()).toBeVisible();
 await expect(table.getByText('Jokertrader · tài khoản mẫu').first()).toBeVisible();
 await page.screenshot({path:path.join('evidence/ui-remaining-tables-20261110',`after-${info.project.name}-movements-390.png`),fullPage:true});
 await openDemoControls(page);await page.getByRole('combobox',{name:'Vai trò mô phỏng'}).click();await page.getByRole('option',{name:'warehouse',exact:true}).click();
 await expect(table.getByText('Áo mẫu A · M · Xanh · DEMO-001')).toBeVisible();await expect(table.getByText('Jokertrader · tài khoản mẫu').first()).toBeVisible();
});
test('team preserves explicit IDs when directory does not supply names',async({page})=>{
 await page.goto(`${url}/s/shop-demo/settings/team`);const table=page.getByRole('table',{name:'Nhân sự và quyền truy cập'});
 await expect(table.getByText('Jokertrader · tài khoản mẫu')).toBeVisible();await expect(table.getByText('Mã nhân sự: user-warehouse')).toBeVisible();
});
