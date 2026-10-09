import {expect, test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {startDemoServer} from './session/demo-server.mjs';

let origin='', close:(()=>Promise<void>)|undefined;
test.beforeAll(async()=>{const server=await startDemoServer({cacheIsolationKey:'density-contract'});origin=server.url;close=server.close;});
test.afterAll(async()=>close?.());
async function ready(page:import('@playwright/test').Page, route:string){await page.goto(origin+'/s/shop-demo/'+route);await expect(page.locator('main h1')).toBeVisible();await expect(page.locator('main .MuiCircularProgress-root,main .MuiLinearProgress-root')).toHaveCount(0);}

test('density table saves row space while preserving action target and data',async({page})=>{
 for(const width of [320,806,1440]){
  await page.setViewportSize({width,height:900});await ready(page,'products');
  const cells=page.locator('main tbody td');await expect(cells.first()).toHaveCSS('padding-top','8px');await expect(cells.first()).toHaveCSS('padding-left','12px');
  const link=page.getByRole('link',{name:'Chi tiết',exact:true}).first();expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(page.getByText('DEMO-001',{exact:true})).toBeVisible();await expect(page.getByText('150.000 ₫',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  await link.focus();await expect(link).toBeFocused();
  if(width>=768){const height=await page.locator('main tbody tr').first().evaluate(e=>e.getBoundingClientRect().height);expect(height).toBeGreaterThanOrEqual(60);expect(height).toBeLessThanOrEqual(63);}
 }
});

test('density divided facts list has one row inset and no additional inter-row gap',async({page})=>{
 for(const width of [320,1440]){
  await page.setViewportSize({width,height:900});await ready(page,'integrations/ai');
  const facts=page.locator('[data-ui-composition="surface-content"][data-ui-rhythm="dividedRows"]');await expect(facts).toHaveCount(1);await expect(facts).toHaveCSS('gap','0px');
  await expect(facts.locator(':scope > [data-ui-detail-line]')).toHaveCount(7);
  for(const row of await facts.locator(':scope > [data-ui-detail-line]').all()){await expect(row.locator(':scope > .MuiBox-root').first()).toHaveCSS('padding-top','8px');await expect(row.locator('.MuiDivider-root')).toHaveCount(1);}
  if(width===1440){expect((await facts.boundingBox())!.height).toBeCloseTo(266,0);const panel=page.getByRole('heading',{name:'Kết nối AI mô phỏng'}).locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]');expect((await panel.boundingBox())!.width).toBeGreaterThan(1100);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
 }
});

test('density demo disclosure retains state and always shows the synthetic warning',async({page})=>{
 for(const width of [390,806,1440]){
  await page.setViewportSize({width,height:900});await ready(page,'products');
  const tools=page.locator('#mock-tools-controls'), toggle=page.getByRole('button',{name:'Công cụ demo',exact:true});
  await expect(tools).toBeHidden();await expect(toggle).toHaveAttribute('aria-expanded','false');
  await expect(page.getByRole('alert').filter({hasText:'Frontend review: API được mô phỏng'})).toBeVisible();
  await toggle.focus();await page.keyboard.press('Enter');await expect(tools).toBeVisible();
  await page.getByRole('combobox',{name:'Dataset mô phỏng'}).click();await page.getByRole('option',{name:'1.000 khách hàng tổng hợp',exact:true}).click();
  await expect(page.getByText('Đã tải 1.000 khách hàng tổng hợp vào API mô phỏng.')).toBeVisible();
  await page.getByRole('button',{name:'Ẩn công cụ demo',exact:true}).click();await expect(tools).toBeHidden();
  await expect(page.locator('[data-testid="mock-tools-summary"]')).toContainText('1.000 khách hàng');
  await page.getByRole('button',{name:'Công cụ demo',exact:true}).click();await expect(page.getByRole('combobox',{name:'Dataset mô phỏng'})).toContainText('1.000 khách hàng');
 }
});

test('density operational Panel uses 12px boundary while complex form and reading Panel keep comfortable rhythm',async({page})=>{
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});await ready(page,'finance');
  await expect(page.locator('main')).toHaveCSS('padding-top','16px');
  const panel=page.getByRole('heading',{name:'Kỳ báo cáo',exact:true}).locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]');
  const geometry=await panel.evaluate(e=>{const header=e.firstElementChild!,body=e.lastElementChild!;return {gap:body.firstElementChild!.getBoundingClientRect().top-Math.max(...[...header.children].map(c=>c.getBoundingClientRect().bottom)),bodyTop:getComputedStyle(body).paddingTop,bodyInline:getComputedStyle(body).paddingLeft};});
  expect(geometry.gap).toBeCloseTo(12,0);expect(geometry.bodyTop).toBe('0px');expect(geometry.bodyInline).toBe(width<768?'12px':'16px');
  await ready(page,'orders/new');await expect(page.locator('[data-ui-composition="form-fields"]').first()).toHaveCSS('gap','16px');
  await ready(page,'knowledge/k1');const reading=page.getByRole('heading',{name:'Nội dung & nguồn',exact:true}).locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]');await expect(reading).toHaveAttribute('data-ui-density','comfortable');await expect(reading.locator(':scope > :last-child')).toHaveCSS('padding-left',width<768?'16px':'24px');
 }
});

test('density simple category editor keeps labels, errors and keyboard reflow usable',async({page})=>{
 for(const width of [320,1440]){
  await page.setViewportSize({width,height:900});await ready(page,'categories');await page.getByRole('button',{name:'Thêm danh mục',exact:true}).click();
  const dialog=page.getByRole('dialog').first();await expect(dialog).toBeVisible();await expect(dialog.locator('[data-ui-composition="form-fields"]')).toHaveCSS('gap','12px');
  await expect(dialog.locator('.MuiDialogContent-root')).toHaveCSS('padding-left','16px');
  const name=dialog.getByRole('textbox',{name:'Tên',exact:true});await name.focus();await expect(name).toBeFocused();await page.keyboard.press('Tab');
  await dialog.evaluate(async element => { await Promise.all(element.closest('.MuiDialog-root')!.getAnimations({subtree:true}).map(animation => animation.finished)); });
  expect((await new AxeBuilder({page}).include('[role="dialog"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  await name.fill('Bản nháp phải được giữ');await page.keyboard.press('Escape');
  const warning=page.getByRole('dialog',{name:'Rời biểu mẫu chưa lưu?',exact:true});await expect(warning).toBeVisible();
  for(const selector of ['.MuiDialogTitle-root','.MuiDialogContent-root']) await expect(warning.locator(selector)).toHaveCSS('padding-left',width<768?'16px':'24px');
  await expect(warning.locator('.MuiDialogActions-root')).toHaveCSS('padding','12px');await expect(warning.locator('.MuiDialogActions-root')).toHaveCSS('gap','8px');
  await warning.getByRole('button',{name:'Tiếp tục sửa',exact:true}).click();await expect(name).toHaveValue('Bản nháp phải được giữ');
  await page.keyboard.press('Escape');await warning.getByRole('button',{name:'Bỏ thay đổi',exact:true}).click();await expect(dialog).toBeHidden();
  await ready(page,'orders/new');await page.getByLabel('Ghi chú chuẩn bị').fill('Giữ nháp điều hướng');await page.getByRole('link',{name:'Danh sách đơn',exact:true}).click();
  const navigation=page.getByRole('dialog',{name:'Rời màn hình chưa lưu?',exact:true});await expect(navigation).toBeVisible();
  for(const selector of ['.MuiDialogTitle-root','.MuiDialogContent-root']) await expect(navigation.locator(selector)).toHaveCSS('padding-left',width<768?'16px':'24px');
  await expect(navigation.locator('.MuiDialogActions-root')).toHaveCSS('padding','12px');await expect(navigation.locator('.MuiDialogActions-root')).toHaveCSS('gap','8px');
  await navigation.getByRole('button',{name:'Tiếp tục chỉnh sửa',exact:true}).click();await expect(page.getByLabel('Ghi chú chuẩn bị')).toHaveValue('Giữ nháp điều hướng');
 }
});
