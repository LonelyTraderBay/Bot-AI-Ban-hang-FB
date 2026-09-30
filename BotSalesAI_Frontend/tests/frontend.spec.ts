import {test,expect} from '@playwright/test';
import routes from '../packages/contracts/src/routes.json';
const detailIds:Record<string,string>={conversationId:'cv1',customerId:'c1',productId:'p1',orderId:'DH-1001',knowledgeId:'k1',jobId:'missing-job'};
test('catalog edit persists through network mock without page reload',async({page})=>{
 await page.goto('/s/shop-demo/products');await expect(page.getByRole('heading',{name:'Sản phẩm',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Thêm sản phẩm',exact:true}).click();await page.getByLabel('Tên sản phẩm',{exact:true}).fill('Sản phẩm kiểm thử');await page.getByLabel('SKU',{exact:true}).fill('TEST-001');await page.getByLabel(/Giá bán/).fill('150000');await page.getByRole('button',{name:'Lưu sản phẩm',exact:true}).click();await expect(page).toHaveURL(/\/products\/product-/);
 await page.getByRole('link',{name:'Danh sách',exact:true}).click();await expect(page.getByText('Sản phẩm kiểm thử',{exact:true})).toBeVisible();
});
test('all canonical routes render or show an explicit not-found resource state',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of routes.routes){const path=route.path.replace(':shopId','shop-demo').replace(/:([A-Za-z]+)/g,(_,key)=>detailIds[key]||'missing');await page.goto(path);await expect(page.locator('#root')).not.toBeEmpty();await expect(page.getByText('Chưa khởi động được ứng dụng',{exact:true})).toHaveCount(0);await page.waitForTimeout(150);}
 expect(errors).toEqual([]);
});
test('mobile page has no viewport overflow',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/s/shop-demo/overview');await expect(page.getByRole('button',{name:'Mở menu'})).toBeVisible();const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));expect(width.scroll).toBeLessThanOrEqual(width.client+1);});
