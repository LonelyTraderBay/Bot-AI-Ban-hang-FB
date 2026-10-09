import {test,expect} from '@playwright/test';
import {startDemoServer} from './session/demo-server.mjs';
import AxeBuilder from '@axe-core/playwright';

let url='',close:(()=>Promise<void>)|undefined;
test.beforeAll(async()=>{const server=await startDemoServer({cacheIsolationKey:'ux-completion'});url=server.url;close=server.close;});
test.afterAll(async()=>close?.());

test('UX01 setup feedback CTA reaches review workflow rather than dynamic knowledge detail',async({page})=>{
 await page.goto(url+'/s/shop-demo/settings/shop');
 await page.getByRole('link',{name:'Duyệt góp ý',exact:true}).click();
 await expect(page).toHaveURL(/\/knowledge\/review$/);
 await expect(page.getByRole('heading',{name:'Duyệt phản hồi AI',exact:true})).toBeVisible();
});
test('UX02 stock warnings describe low/zero stock without implying a server block',async({page})=>{
 await page.goto(url+'/s/shop-demo/inventory');
 const table=page.getByRole('table',{name:'Tồn kho theo vị trí'});
 await expect(table.getByRole('row').filter({hasText:'QU-003'})).toContainText('Sắp hết hàng');
 await expect(table.getByRole('row').filter({hasText:'MU-006'})).toContainText('Hết hàng');
 await expect(table).not.toContainText('Bị chặn');
});
test('UX02 inventory receipts and accounting open periods have domain-specific names',async({page})=>{
 await page.goto(url+'/s/shop-demo/inventory/movements');
 const table=page.getByRole('table',{name:'Lịch sử biến động kho'});
 await expect(table).toContainText('Nhập kho');
 await expect(table).not.toContainText('Phiếu thu');
 await page.goto(url+'/s/shop-demo/finance/debts-periods');
 await expect(page.locator('main table').last()).toContainText('Đang mở');
});

test('UX04 onboarding protects the whole draft on leave and reload',async({page})=>{
 await page.goto(url+'/onboarding');
 await page.getByRole('textbox',{name:'Tên cửa hàng',exact:true}).fill('Cửa hàng bản nháp');
 await page.getByRole('textbox',{name:'Múi giờ',exact:true}).fill('Asia/Ho_Chi_Minh');
 await page.getByRole('link',{name:'Quay lại',exact:true}).click();
 const guard=page.getByRole('dialog',{name:'Rời màn hình chưa lưu?',exact:true});
 await expect(guard).toBeVisible();
 await guard.getByRole('button',{name:'Tiếp tục chỉnh sửa',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Tên cửa hàng',exact:true})).toHaveValue('Cửa hàng bản nháp');
 const unload=page.waitForEvent('dialog',{timeout:10000});
 const reload=page.reload({timeout:10000}).catch(()=>undefined);
 const native=await unload;
 expect(native.type()).toBe('beforeunload');
 await native.dismiss();
 await reload;
 await expect(page.getByRole('textbox',{name:'Múi giờ',exact:true})).toHaveValue('Asia/Ho_Chi_Minh');
 await page.getByRole('link',{name:'Quay lại',exact:true}).click();
 await guard.getByRole('button',{name:'Rời màn hình',exact:true}).click();
 await expect(page).toHaveURL(/\/workspaces$/);
});

test('UX04 acknowledged shop creation leaves without a false dirty warning',async({page})=>{
 await page.goto(url+'/onboarding');
 await page.getByRole('textbox',{name:'Tên cửa hàng',exact:true}).fill('Cửa hàng nghiệm thu '+Date.now());
 await page.getByRole('button',{name:'Tạo cửa hàng',exact:true}).click();
 await expect(page).toHaveURL(/\/s\/[^/]+\/overview$/);
 await expect(page.getByRole('dialog',{name:'Rời màn hình chưa lưu?',exact:true})).toHaveCount(0);
});

test('UX05 product detail returns to committed filters; direct links use the list fallback',async({page})=>{
 await page.goto(url+'/s/shop-demo/products?q=AO-002&status=active');
 await page.getByRole('row').filter({hasText:'AO-002'}).getByRole('link',{name:'Chi tiết',exact:true}).click();
 await page.getByRole('link',{name:'Danh sách',exact:true}).click();
 await expect(page).toHaveURL(/\/products\?q=AO-002&status=active$/);
 await page.goto(url+'/s/shop-demo/products/p1');
 await page.getByRole('link',{name:'Danh sách',exact:true}).click();
 await expect(page).toHaveURL(/\/products$/);
});

for(const collection of ['customers','orders','knowledge'])test(`UX05 ${collection} list returns to its own filter context`,async({page})=>{
 test.setTimeout(30000);
 const listPath=`/s/shop-demo/${collection}`;
 await page.goto(url+listPath);
 const firstRow=page.locator('main table').first().locator('tbody tr').first();
 await expect(firstRow.locator('a').first()).toBeVisible();
 const term=(await firstRow.locator('td').first().innerText()).split('\n')[0].trim();
 const search='?q='+encodeURIComponent(term);
 await page.goto(url+listPath+search);
 await page.locator('main table').first().locator('tbody tr').first().locator('a').first().click();
 // URLSearchParams uses form encoding; spaces may therefore be represented as +.
 const expected=url+listPath+'?'+new URLSearchParams({q:term}).toString();
 await page.locator('main a').filter({hasText:/Danh sách|Tất cả nguồn/}).first().click();
 await expect(page).toHaveURL(expected);
});

test('UX03 category, member and AI deletion confirmations name the selected object and consequence',async({page})=>{
 test.setTimeout(60000);
 await page.goto(url+'/s/shop-demo/categories');
 const category=page.locator('main table tbody tr').filter({hasText:'Quần'}).first();
 await category.getByRole('button',{name:'Ngừng dùng',exact:true}).click();
 let dialog=page.getByRole('dialog',{name:'Ngừng dùng danh mục',exact:true});
 await expect(dialog).toContainText('Quần');await expect(dialog).toContainText('không xóa sản phẩm');
 await expect(dialog.getByRole('button',{name:'Ngừng dùng danh mục',exact:true})).toBeDisabled();
 await page.keyboard.press('Escape');
 await page.goto(url+'/s/shop-demo/settings/team');
 await page.getByRole('row').filter({hasText:'user-warehouse'}).getByRole('button',{name:'Thu hồi',exact:true}).click();
 dialog=page.getByRole('dialog',{name:'Thu hồi quyền nhân viên',exact:true});
 await expect(dialog).toContainText('user-warehouse');await expect(dialog).toContainText('không được tiếp tục truy cập');
 await expect(dialog.getByRole('button',{name:'Thu hồi quyền',exact:true})).toBeEnabled();
 await page.keyboard.press('Escape');
 await page.goto(url+'/s/shop-demo/integrations/ai');
 await page.getByRole('button',{name:'Xóa',exact:true}).first().click();
 dialog=page.getByRole('dialog',{name:'Xóa kết nối AI',exact:true});
 await expect(dialog).toContainText('Kết nối AI mô phỏng');await expect(dialog).toContainText('không còn cấu hình đang sử dụng');
 await expect(dialog.getByRole('button',{name:'Xóa kết nối AI',exact:true})).toBeDisabled();
});

test('UX07 titles and breadcrumb distinguish create/detail/review; menu empty state clears with focus',async({page})=>{
 test.setTimeout(60000);
 await page.goto(url+'/s/shop-demo/products/new');
 await expect(page).toHaveTitle('Thêm sản phẩm · BotSales AI');
 await expect(page.getByRole('navigation',{name:'Đường dẫn hiện tại'})).toContainText('Thêm sản phẩm');
 await page.goto(url+'/s/shop-demo/products/p1');
 await expect(page).toHaveTitle('Chi tiết sản phẩm · BotSales AI');
 const search=page.getByRole('textbox',{name:'Tìm màn hình',exact:true});
 await search.fill('zzzzzz');
 await expect(page.getByText('Không tìm thấy màn hình phù hợp.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Xóa tìm màn hình',exact:true}).click();
 await expect(search).toHaveValue('');await expect(search).toBeFocused();
 await expect(page.getByRole('link',{name:'Sản phẩm',exact:true})).toBeVisible();
 await page.goto(url+'/s/shop-demo/knowledge/review');
 await expect(page).toHaveTitle('Đánh giá và phản hồi · BotSales AI');
 await page.goto(url+'/unknown-path');await expect(page).toHaveTitle('Không tìm thấy trang · BotSales AI');
});

test('UX10 multi-table pages have distinct business names',async({page})=>{
 await page.goto(url+'/s/shop-demo/suppliers');
 await expect(page.getByRole('table',{name:'Nhà cung cấp',exact:true})).toBeVisible();
 await expect(page.getByRole('table',{name:'Báo giá sản phẩm',exact:true})).toBeVisible();
 await page.goto(url+'/s/shop-demo/finance/debts-periods');
 await expect(page.getByRole('table',{name:'Công nợ',exact:true})).toBeVisible();
 await expect(page.getByRole('table',{name:'Kỳ kế toán',exact:true})).toBeVisible();
 await expect(page.getByRole('table',{name:'Dữ liệu',exact:true})).toHaveCount(0);
});

test('UX06 AI capability names and states are readable in Vietnamese',async({page})=>{
 await page.goto(url+'/s/shop-demo/integrations/ai');
 await expect(page.getByText('Kết quả có cấu trúc',{exact:true})).toBeVisible();
 await expect(page.getByText('Có hỗ trợ',{exact:true}).first()).toBeVisible();
 await expect(page.getByText('supported',{exact:true})).toHaveCount(0);
});

test('UX15 detail captions reflow without splitting short words across all required viewports',async({page},info)=>{
 test.setTimeout(90000);
 await page.goto(url+'/s/shop-demo/inbox/cv1');
 const context=page.getByRole('complementary',{name:'Bối cảnh khách hàng',exact:true});
 for(const width of [320,390,768,1280,1440]){
  await page.setViewportSize({width,height:900});
  const caption=context.getByText('Kênh',{exact:true});await expect(caption).toBeVisible();
  const measure=await caption.evaluate(element=>({height:element.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(element).lineHeight),width:element.getBoundingClientRect().width}));
  expect(measure.height).toBeLessThanOrEqual(measure.lineHeight+1);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({path:`evidence/frontend-ux-completion-20261009/C04-inbox-${info.project.name}-${width}.png`});
 }
 const axe=await new AxeBuilder({page}).include('main').analyze();expect(axe.violations).toEqual([]);
});
