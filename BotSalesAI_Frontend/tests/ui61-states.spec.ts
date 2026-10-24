import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';
import path from 'node:path';

let url = '', close: (() => Promise<void>) | undefined;
test.beforeAll(async () => { const server = await startDemoServer({ runtime: 'dev', cacheIsolationKey: 'ui61-positive-states' }); url = server.url; close = server.close; });
test.afterAll(async () => close?.());
async function ready(page: Page, path: string) {
    await page.goto(url + path); await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('main .MuiCircularProgress-root, main .MuiLinearProgress-root')).toHaveCount(0);
}
async function receipt(page: Page, info: TestInfo, name: string) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    await info.attach(name, { body: await page.screenshot(), contentType: 'image/png' });
}
test('UI61 R14 valid import job retains status width and visible empty-row guidance', async ({ page }, info) => {
    for (const width of [320,390,1440]) {
        await page.setViewportSize({ width, height: 900 }); await ready(page, '/s/shop-demo/imports');
        await page.locator('input[type="file"]').setInputFiles({name:'ui61-layout.csv',mimeType:'text/csv',buffer:Buffer.from('sku,name,price,description,currency\nUI61-VALID,Sản phẩm kiểm tra bố cục,1000,Dữ liệu tổng hợp,VND','utf8')});
        await page.getByRole('button', { name:'Kiểm tra trước khi nhập',exact:true }).click();
        await expect(page).toHaveURL(/\/imports\/job-/);
        await expect(page.getByRole('table', { name:'Lỗi từng dòng trong tệp nhập',exact:true })).toBeVisible();
        const chip=page.locator('main .MuiChip-root').first();
        expect((await chip.boundingBox())!.width).toBeLessThan(200);
        const empty=page.getByRole('status').filter({hasText:'Không có dòng lỗi trong báo cáo kiểm tra.'});
        expect(await empty.evaluate(node=>!!node.closest('table'))).toBe(false);
        await receipt(page,info,`R14-${width}`);
    }
});
test('UI61 R36 valid export job retains intrinsic status and reflow without downloading', async ({ page }, info) => {
    for (const width of [320,390,1440]) {
        await page.setViewportSize({width,height:900}); await ready(page,'/s/shop-demo/reports');
        await page.getByRole('button',{name:'Tạo tệp báo cáo CSV',exact:true}).click();
        await page.getByRole('link',{name:/^Theo dõi công việc job-/}).click();
        await expect(page.getByRole('heading',{name:'Kết quả xử lý',exact:true})).toBeVisible();
        const chip=page.locator('main .MuiChip-root').first(); expect((await chip.boundingBox())!.width).toBeLessThan(200);
        await expect(page.getByRole('button',{name:'Mở kết quả xuất',exact:true})).toBeVisible();
        await receipt(page,info,`R36-${width}`);
    }
});
test('UI61 R61 valid public challenge retains its Panel radius and readable content without confirming consent', async ({ page }, info) => {
    for (const width of [320,390,1440]) {
        await page.setViewportSize({width,height:900});
        await ready(page,'/consent/confirm?token=local-demo-reconfirm-consent-challenge-20261009');
        await page.getByRole('button',{name:'Xem nội dung yêu cầu',exact:true}).click();
        await expect(page.getByRole('button',{name:'Đồng ý nhận marketing',exact:true})).toBeVisible();
        await expect(page.locator('main .MuiPaper-root').first()).toHaveCSS('border-top-left-radius','12px');
        await receipt(page,info,`R61-${width}`);
    }
});
test('UI61 R41 fulfillment lines retain card radius inside their dialog without changing stock', async ({ page }, info) => {
    for (const width of [320,390,1440]) {
        await page.setViewportSize({width,height:900}); await ready(page,'/s/shop-demo/fulfillment');
        await page.getByRole('button',{name:'Mở phiếu lấy hàng',exact:true}).first().click();
        const dialog=page.getByRole('dialog'); await expect(dialog).toBeVisible();
        await expect(dialog.locator('[data-draft-scope]').first()).toHaveCSS('border-top-left-radius','12px');
        await receipt(page,info,`R41-lines-${width}`); await page.keyboard.press('Escape');
    }
});
test('UI61 R23 local preview uses the canonical card shape without saving API data', async ({ page }, info) => {
    for (const width of [320,390,1440]) {
        await page.setViewportSize({width,height:900}); await ready(page,'/s/shop-demo/knowledge');
        await page.getByRole('button',{name:'Lưu bản xem trước (chỉ trên trang này)',exact:true}).click();
        const preview=page.getByRole('region',{name:'Bản xem trước nội dung sản phẩm',exact:true});
        await expect(preview).toHaveCSS('border-top-left-radius','12px');
        await preview.scrollIntoViewIfNeeded(); await receipt(page,info,`R23-preview-${width}`);
    }
});
test('UI61 A06 warning rhythm preserves 0/1/8 long messages at 320/390/1440', async ({ page }, info) => {
    const observations=[];
    for (const width of [320,390,1440]) for (const count of [0,1,8]) {
        await page.setViewportSize({width,height:900}); await ready(page,'/s/shop-demo/finance');
        const moduleUrl='/@fs/'+path.resolve('tests/design/report-warnings-fixture.tsx').replaceAll('\\','/');
        const warnings=await page.evaluate(async ({moduleUrl,count})=>{
            const container=document.createElement('section'); document.querySelector('main')!.replaceChildren(container);
            return (await import(/* @vite-ignore */ moduleUrl)).mountReportWarningsFixture(container,count);
        },{moduleUrl,count});
        await expect(page.getByRole('button',{name:'Tiếp tục kiểm tra',exact:true})).toBeVisible();
        await expect(page.locator('main').getByRole('alert')).toHaveCount(count);
        for (const [index,warning] of warnings.entries()) await expect(page.locator('main').getByRole('alert').nth(index)).toHaveText(warning);
        const geometry=await page.locator('main [data-ui-composition="surface-content"]').evaluateAll(nodes=>nodes.map(node=>({gap:getComputedStyle(node).gap,overflow:node.scrollWidth>node.clientWidth+1})));
        expect(geometry).toEqual(count?[{gap:'12px',overflow:false}]:[]);
        await receipt(page,info,`warnings-${count}-${width}`); observations.push({width,count,geometry});
    }
    await info.attach('warning-counts.json',{body:JSON.stringify(observations),contentType:'application/json'});
});
