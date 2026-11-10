import {expect,test} from '@playwright/test';
import {startDemoServer} from './session/demo-server.mjs';
let url='',close:(()=>Promise<void>)|undefined;
test.beforeAll(async()=>{const server=await startDemoServer({cacheIsolationKey:'team-mobile-dialog'});url=server.url;close=server.close;});
test.afterAll(async()=>close?.());
test('mobile team details exposes revoke confirmation for another member',async({page})=>{
 await page.setViewportSize({width:320,height:900});await page.goto(`${url}/s/shop-demo/settings/team`);
 const row=page.getByRole('row').filter({hasText:'Mã nhân sự: user-warehouse'});await row.getByRole('button',{name:'Chi tiết nhân sự'}).first().click();
 const detail=page.getByRole('dialog',{name:'Chi tiết nhân sự'});await expect(detail.getByText('Mã nhân sự: user-warehouse')).toBeVisible();
 await detail.getByRole('button',{name:'Thu hồi'}).click();const confirm=page.getByRole('dialog',{name:'Thu hồi quyền nhân viên'});await expect(confirm).toBeVisible();await expect(confirm).toContainText('user-warehouse');
 await confirm.getByRole('button',{name:'Hủy'}).click();await expect(confirm).toBeHidden();
});
