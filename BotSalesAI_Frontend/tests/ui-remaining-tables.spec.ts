import { expect, test } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';
import { setDemoControl } from './session/demo-controls';
let url='', close:(()=>Promise<void>)|undefined;
test.beforeAll(async()=>{const server=await startDemoServer({cacheIsolationKey:'remaining-tables'});url=server.url;close=server.close;});
test.afterAll(async()=>close?.());
const routes=[
 ['products','Danh sách sản phẩm','Chi tiết','link'],
 ['inventory','Tồn kho theo vị trí','Xem chi tiết SKU DEMO-001','button'],
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
  if(route==='inventory') await control.scrollIntoViewIfNeeded();
  const rects=await control.evaluate(node=>{const a=node.getBoundingClientRect(),r=node.closest('[data-ui-table-layout]')!.getBoundingClientRect();return {left:a.left,right:a.right,regionLeft:r.left,regionRight:r.right};});
  expect(rects.left,`${route} left`).toBeGreaterThanOrEqual(rects.regionLeft-1);expect(rects.right,`${route} right`).toBeLessThanOrEqual(rects.regionRight+1);
  if(route==='settings/team' && width<600){
   const row=control.locator('xpath=ancestor::li[1]'), role=row.getByText('Chủ cửa hàng',{exact:true}); await expect(role).toBeVisible();
   const geometry=await role.evaluate(node=>{const text=node.getBoundingClientRect(),region=node.closest('[data-ui-table-layout]')!.getBoundingClientRect();return {right:text.right,regionRight:region.right};});
   expect(geometry.right).toBeLessThanOrEqual(geometry.regionRight+1);
  }
  if(width<768){await region.focus();await expect(region).toBeFocused();
   const horizontalOverflow=await region.evaluate(n=>n.scrollWidth-n.clientWidth);
   if(route==='inventory') expect(horizontalOverflow).toBeGreaterThan(0);
   else expect(horizontalOverflow).toBeLessThanOrEqual(1);
  }
  await page.screenshot({path:info.outputPath(`${route.replaceAll('/','-')}-${width}.png`),fullPage:true});
  await control.click(); if(role==='link') await expect(page).toHaveURL(/\/products\//); else await expect(page.getByRole('dialog').first()).toBeVisible();
  if(route==='settings/team' && width<600){const dialog=page.getByRole('dialog',{name:'Chi tiết nhân sự'});await expect(dialog.getByRole('button',{name:'Thu hồi'})).toBeDisabled();await dialog.getByRole('button',{name:'Sửa quyền'}).click();await expect(page.getByRole('dialog',{name:'Cập nhật quyền'})).toBeVisible();}
 }
});
test('stock history displays names from accessible lookups and keeps staff fallback',async({page},info)=>{
 await page.setViewportSize({width:390,height:900}); await page.goto(`${url}/s/shop-demo/inventory/movements`);
 const collection=page.getByRole('region',{name:'Lịch sử biến động kho'});
 const row=collection.getByRole('listitem').filter({hasText:'Áo mẫu A · M · Xanh · DEMO-001'}).first();
 await expect(row).toBeVisible();
 const details=row.locator('details');
 await row.getByText('Xem thêm thông tin',{exact:true}).click();
 await expect(details.getByText('MAIN · Kho chính · dữ liệu tổng hợp')).toBeVisible();
 await expect(details.getByText('Jokertrader · tài khoản mẫu')).toBeVisible();
 await page.screenshot({path:info.outputPath('movements-390.png'),fullPage:true});
 await setDemoControl(page, 'role', 'warehouse');
 await expect(row).toBeVisible();
 await expect(async () => {
  if (!(await details.evaluate(node=>node.hasAttribute('open')))) await row.getByText('Xem thêm thông tin',{exact:true}).click();
  await expect(details.getByText('Jokertrader · tài khoản mẫu')).toBeVisible({timeout:1000});
 }).toPass({timeout:7000});
});
test('team preserves explicit IDs when directory does not supply names',async({page})=>{
 await page.goto(`${url}/s/shop-demo/settings/team`);const table=page.getByRole('table',{name:'Nhân sự và quyền truy cập'});
 await expect(table.getByText('Jokertrader · tài khoản mẫu')).toBeVisible();await expect(table.getByText('Mã nhân sự: user-warehouse')).toBeVisible();
});
