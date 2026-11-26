import {expect,test} from '@playwright/test';
import {startDemoServer} from './session/demo-server.mjs';
let url='',close:(()=>Promise<void>)|undefined;
test.beforeAll(async()=>{const server=await startDemoServer({cacheIsolationKey:'team-mobile-dialog'});url=server.url;close=server.close;});
test.afterAll(async()=>close?.());
test('mobile team details exposes revoke confirmation for another member',async({page})=>{
 await page.setViewportSize({width:320,height:900});await page.goto(`${url}/s/shop-demo/settings/team`);
 const row=page.getByRole('region',{name:'Nhân sự và quyền truy cập'}).getByRole('listitem').filter({hasText:'Mã nhân sự: user-warehouse'});await row.getByRole('button',{name:'Chi tiết nhân sự'}).first().click();
 const detail=page.getByRole('dialog',{name:'Chi tiết nhân sự'});await expect(detail.getByText('Mã nhân sự: user-warehouse')).toBeVisible();
 await detail.getByRole('button',{name:'Thu hồi'}).click();const confirm=page.getByRole('dialog',{name:'Thu hồi quyền nhân viên'});await expect(confirm).toBeVisible();await expect(confirm).toContainText('user-warehouse');
 await confirm.getByRole('button',{name:'Hủy'}).click();await expect(confirm).toBeHidden();
});

for (const width of [767, 768]) {
    test(`team detail traps reverse Tab at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${url}/s/shop-demo/settings/team`);
        const row = page.getByRole('region', { name: 'Nhân sự và quyền truy cập' })
            .getByRole(width < 768 ? 'listitem' : 'row').filter({ hasText: 'Mã nhân sự: user-warehouse' });
        const trigger = row.getByRole('button', { name: 'Chi tiết nhân sự', exact: true });
        await trigger.focus();
        await page.keyboard.press('Enter');
        const detail = page.getByRole('dialog', { name: 'Chi tiết nhân sự', exact: true });
        await expect(detail.getByText('Quyền hiệu lực', { exact: true })).toBeVisible();

        const compact = width === 767;
        const closeButtons = detail.getByRole('button', { name: 'Đóng', exact: true });
        const titleClose = closeButtons.first();
        const lastButton = compact ? detail.getByRole('button', { name: 'Thu hồi', exact: true }) : closeButtons.last();
        await titleClose.focus();
        await page.keyboard.press('Shift+Tab');
        await expect(lastButton).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(titleClose).toBeFocused();
        await expect(detail.getByText('Sửa quyền', { exact: true })).toHaveCount(compact ? 1 : 0);

        await page.keyboard.press('Escape');
        await expect(detail).toBeHidden();
        await expect(trigger).toBeFocused();
        if (!compact) {
            await expect(row.getByRole('button', { name: 'Sửa quyền', exact: true })).toBeVisible();
            await expect(row.getByRole('button', { name: 'Thu hồi', exact: true })).toBeVisible();
        }
    });
}
