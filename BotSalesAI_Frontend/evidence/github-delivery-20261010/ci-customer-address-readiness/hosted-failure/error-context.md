# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-master-resources.spec.ts >> C05 customer address UI never replays a masked phone and orders load per-customer addresses
- Location: tests/ui-master-resources.spec.ts:40:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('table', { name: 'Địa chỉ trong hồ sơ khách' })
Expected substring: "Địa chỉ giao hàng mẫu"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" getByRole('table', { name: 'Địa chỉ trong hồ sơ khách' }) with timeout 5000ms
  - waiting for getByRole('table', { name: 'Địa chỉ trong hồ sơ khách' })

```

```yaml
- link "Đến nội dung chính":
  - /url: "#main-content"
- progressbar "Đang tải cửa hàng"
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import type {Page} from '@playwright/test';
  3  | import AxeBuilder from '@axe-core/playwright';
  4  | import {startDemoServer} from './session/demo-server.mjs';
  5  | 
  6  | let url='',close:(()=>Promise<void>)|undefined;
  7  | test.beforeAll(async()=>{const server=await startDemoServer({cacheIsolationKey:'master-resource-regression'});url=server.url;close=server.close;});
  8  | test.afterAll(async()=>close?.());
  9  | test.beforeEach(({page})=>page.setDefaultTimeout(15_000));
  10 | async function choose(page:Page,name:string,value:string){await page.getByRole('combobox',{name,exact:true}).click();await page.getByRole('option',{name:value,exact:true}).click();}
  11 | async function mutate(page:Page,path:string,body:unknown,version?:number){return page.evaluate(async({path,body,version})=>{const session=(await (await fetch('/api/v2/session')).json()).data;const response=await fetch('/api/v2/shops/shop-demo/'+path,{method:'PATCH',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken,'Idempotency-Key':crypto.randomUUID(),'If-Match':`"${version}"`},body:JSON.stringify(body)});return response.status;},{path,body,version});}
  12 | 
  13 | test('C05 warehouses validate before HTTP, protect drafts and create/update/archive with visible results',async({page})=>{
  14 |     const creates:string[]=[];page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname.endsWith('/warehouses'))creates.push(r.postData()||'');});
  15 |     await page.goto(url+'/s/shop-demo/settings/warehouses');await expect(page.getByRole('heading',{name:'Quản trị kho',exact:true})).toBeVisible();
  16 |     await page.getByRole('button',{name:'Thêm kho',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Thêm kho',exact:true});
  17 |     await dialog.getByRole('button',{name:'Lưu kho',exact:true}).click();await expect(dialog.getByText('Nhập mã kho.',{exact:true})).toBeVisible();expect(creates).toHaveLength(0);await expect(dialog.getByLabel('Mã kho', {exact:true})).toBeFocused();
  18 |     await dialog.getByLabel('Mã kho',{exact:true}).fill('UX-TEST');await dialog.getByLabel('Tên kho',{exact:true}).fill(' '+ 'A'.repeat(160));await dialog.getByLabel('Địa điểm kho',{exact:true}).fill('Địa điểm kho tổng hợp');await dialog.getByRole('button',{name:'Lưu kho',exact:true}).click();await expect(dialog.getByText('Tên kho tối đa 160 ký tự.',{exact:true})).toBeVisible();expect(creates).toHaveLength(0);
  19 |     await dialog.getByLabel('Mã kho',{exact:true}).fill('UX-TEST');await dialog.getByLabel('Tên kho',{exact:true}).fill('Kho UX kiểm chứng');await dialog.getByLabel('Địa điểm kho',{exact:true}).fill('Địa điểm kho tổng hợp');
  20 |     await dialog.getByRole('button',{name:'Hủy',exact:true}).click();const guard=page.getByRole('dialog').last();await expect(guard).toContainText('chưa lưu');await guard.getByRole('button',{name:'Tiếp tục sửa',exact:true}).click();await expect(dialog.getByLabel('Tên kho',{exact:true})).toHaveValue('Kho UX kiểm chứng');
  21 |     await dialog.getByRole('button',{name:'Lưu kho',exact:true}).click();await expect(dialog).not.toBeVisible();expect(creates).toHaveLength(1);await expect(page.getByRole('status').filter({hasText:'Đã lưu kho Kho UX kiểm chứng.'})).toBeVisible();
  22 |     await page.getByRole('button',{name:'Sửa kho UX-TEST',exact:true}).click();const edit=page.getByRole('dialog',{name:'Sửa kho Kho UX kiểm chứng',exact:true});await edit.getByLabel('Tên kho',{exact:true}).fill(' Kho UX đã sửa ');const updated=page.waitForRequest(r=>r.method()==='PATCH'&&new URL(r.url()).pathname.includes('/warehouses/'));await edit.getByRole('button',{name:'Lưu kho',exact:true}).click();expect((await updated).postDataJSON()).toEqual({name:'Kho UX đã sửa'});await expect(edit).not.toBeVisible();
  23 |     await page.getByRole('button',{name:'Ngừng dùng UX-TEST',exact:true}).click();const confirm=page.getByRole('dialog',{name:'Ngừng dùng kho',exact:true});await expect(confirm).toContainText('Kho UX đã sửa');await confirm.getByLabel('Lý do').fill('Ngừng sử dụng kho kiểm chứng');await confirm.getByRole('button',{name:'Ngừng dùng kho',exact:true}).click();await expect(confirm).not.toBeVisible();await expect(page.getByRole('table',{name:'Danh mục kho'}).getByRole('row').filter({hasText:'UX-TEST'})).toContainText('Đã lưu trữ');
  24 | });
  25 | 
  26 | test('C05 warehouse conflicts keep the draft across two concurrent versions and require explicit reconciliation',async({page})=>{
  27 |     await page.goto(url+'/s/shop-demo/settings/warehouses');await page.getByRole('button',{name:'Sửa kho MAIN',exact:true}).click();const editor=page.getByRole('dialog').first();await editor.getByLabel('Tên kho',{exact:true}).fill('Tên nháp của tôi');
  28 |     expect(await mutate(page,'warehouses/warehouse-01',{name:'Tên server lần 1'},1)).toBe(200);
  29 |     await editor.getByRole('button',{name:'Lưu kho',exact:true}).click();const compare=page.getByRole('dialog',{name:'Đối chiếu thay đổi',exact:true});await expect(compare).toBeVisible();const choice=compare.getByRole('combobox',{name:/Chọn dữ liệu: Tên kho/});await choice.click();await page.getByRole('option',{name:'Giữ bản nháp',exact:true}).click();await compare.getByRole('button',{name:'Áp dụng vào bản nháp'}).click();
  30 |     expect(await mutate(page,'warehouses/warehouse-01',{addressLine:'Địa điểm server lần 2'},2)).toBe(200);await editor.getByRole('button',{name:'Lưu kho',exact:true}).click();await expect(compare).toBeVisible();await expect(compare).toContainText('Tên nháp của tôi');await compare.getByRole('button',{name:'Áp dụng vào bản nháp'}).click();await expect(editor.getByLabel('Tên kho',{exact:true})).toHaveValue('Tên nháp của tôi');
  31 |     await expect(editor.getByLabel('Địa điểm kho',{exact:true})).toHaveValue('Địa điểm server lần 2');await editor.getByRole('button',{name:'Lưu kho',exact:true}).click();await expect(editor).not.toBeVisible();
  32 | });
  33 | 
  34 | test('C05 accounts create and protect used fields; journal choices come from the same API lookup',async({page})=>{
  35 |     await page.goto(url+'/s/shop-demo/finance/accounts');await page.getByRole('button',{name:'Sửa tài khoản 111',exact:true}).click();const used=page.getByRole('dialog').first();await expect(used.getByLabel('Mã tài khoản',{exact:true})).toBeDisabled();await expect(used.getByRole('combobox',{name:/^Nhóm tài khoản\b/})).toBeDisabled();await used.getByRole('button',{name:'Hủy',exact:true}).click();
  36 |     await page.getByRole('button',{name:'Thêm tài khoản',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Thêm tài khoản',exact:true});await dialog.getByLabel('Mã tài khoản',{exact:true}).fill('UX_EXTRA');await dialog.getByLabel('Tên tài khoản',{exact:true}).fill('Tài khoản nguồn API');await dialog.getByRole('button',{name:'Lưu tài khoản',exact:true}).click();await expect(dialog).not.toBeVisible();
  37 |     await page.getByRole('link',{name:'Chứng từ & sổ kép',exact:true}).click();await page.getByRole('button',{name:'Tạo bút toán nháp',exact:true}).click();const journal=page.getByRole('dialog',{name:'Bút toán nháp',exact:true});await journal.getByRole('combobox',{name:'Tài khoản dòng 1',exact:true}).click();await expect(page.getByRole('option',{name:'UX_EXTRA · Tài khoản nguồn API',exact:true})).toBeVisible();await page.keyboard.press('Escape');
  38 | });
  39 | 
  40 | test('C05 customer address UI never replays a masked phone and orders load per-customer addresses',async({page})=>{
> 41 |     await page.goto(url+'/s/shop-demo/customers/c1');const panel=page.getByRole('table',{name:'Địa chỉ trong hồ sơ khách'});await expect(panel).toContainText('Địa chỉ giao hàng mẫu');await page.getByRole('button',{name:'Sửa địa chỉ Địa chỉ giao hàng mẫu',exact:true}).click();const edit=page.getByRole('dialog',{name:'Sửa địa chỉ Địa chỉ giao hàng mẫu',exact:true});await expect(edit.getByLabel('Điện thoại giao hàng',{exact:true})).toBeDisabled();await expect(edit.getByLabel('Điện thoại giao hàng',{exact:true})).toHaveValue('');await edit.getByLabel('Tên địa chỉ',{exact:true}).fill('Địa chỉ qua API');
     |                                                                                                                                                 ^ Error: expect(locator).toContainText(expected) failed
  42 |     const patch=page.waitForRequest(r=>r.method()==='PATCH'&&new URL(r.url()).pathname.endsWith('/addresses/address-synthetic'));await edit.getByRole('button',{name:'Lưu địa chỉ',exact:true}).click();expect((await patch).postDataJSON()).toEqual({label:'Địa chỉ qua API'});await expect(edit).not.toBeVisible();
  43 |     await page.getByRole('link',{name:'Đơn hàng',exact:true}).click();await page.getByRole('button',{name:'Tạo đơn hàng',exact:true}).click();await choose(page,'Khách hàng','Linh (khách mẫu)');await page.getByRole('combobox',{name:'Địa chỉ giao hàng',exact:true}).click();await expect(page.getByRole('option',{name:'Địa chỉ qua API · Linh (khách mẫu)',exact:true})).toBeVisible();await page.keyboard.press('Escape');
  44 | });
  45 | 
  46 | test('C05 new management routes and address dialog reflow at all required widths with keyboard and axe',async({page,browserName})=>{
  47 |     for(const width of [320,390,768,1280,1440]) {
  48 |         await page.setViewportSize({width,height:900});
  49 |         for(const route of ['settings/warehouses','finance/accounts','customers/c1']) {
  50 |             await page.goto(url+'/s/shop-demo/'+route);await expect(page.locator('main h1')).toBeVisible();await page.getByRole('table').first().waitFor();
  51 |             expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),`${route}@${width}`).toBeLessThanOrEqual(1);
  52 |             expect((await new AxeBuilder({page}).include('main').analyze()).violations).toEqual([]);
  53 |         }
  54 |         await page.getByRole('button',{name:'Thêm địa chỉ',exact:true}).focus();await page.keyboard.press('Enter');const dialog=page.getByRole('dialog',{name:'Thêm địa chỉ',exact:true});await expect(dialog).toBeVisible();await expect(dialog.locator('..')).toHaveCSS('opacity','1');await expect(dialog.getByRole('button',{name:'Đóng',exact:true})).toBeVisible();expect((await new AxeBuilder({page}).include('[role="dialog"]').analyze()).violations).toEqual([]);await page.screenshot({path:`evidence/frontend-ux-completion-20261009/C05-address-${browserName}-${width}.png`});await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
  55 |     }
  56 | });
  57 | 
  58 | test('C05 complete customer addresses create/archive through HTTP; masked mandatory fields prevent creation',async({page})=>{
  59 |     await page.goto(url+'/s/shop-demo/customers');
  60 |     await expect(page.getByRole('heading',{name:'Khách hàng',exact:true})).toBeVisible();
  61 |     const customer=await page.evaluate(async()=>{
  62 |         const session=(await (await fetch('/api/v2/session')).json()).data;
  63 |         const response=await fetch('/api/v2/shops/shop-demo/customers',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken,'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({displayName:'Khách địa chỉ kiểm chứng',phone:null,email:null,notes:''})});
  64 |         if(response.status!==201)throw new Error('Customer creation failed');return (await response.json()).data;
  65 |     });
  66 |     await page.getByRole('row').filter({hasText:'Khách địa chỉ kiểm chứng'}).getByRole('link').click();await expect(page).toHaveURL(new RegExp('/customers/'+customer.id+'$'));await page.getByRole('button',{name:'Thêm địa chỉ',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Thêm địa chỉ',exact:true});
  67 |     await dialog.getByRole('button',{name:'Lưu địa chỉ',exact:true}).click();await expect(dialog.getByLabel('Tên địa chỉ',{exact:true})).toBeFocused();
  68 |     for(const [label,value] of [['Tên địa chỉ','Kho khách tổng hợp'],['Người nhận','Người nhận kiểm chứng'],['Điện thoại giao hàng','0000000000'],['Địa chỉ chi tiết','Địa điểm thử nghiệm'],['Tỉnh / thành phố','Địa bàn tổng hợp']])await dialog.getByLabel(label,{exact:true}).fill(value);
  69 |     const created=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname.endsWith('/addresses'));await dialog.getByRole('button',{name:'Lưu địa chỉ',exact:true}).click();expect((await created).status()).toBe(201);await expect(dialog).not.toBeVisible();
  70 |     await page.getByRole('button',{name:'Ngừng dùng Kho khách tổng hợp',exact:true}).click();const archive=page.getByRole('dialog',{name:'Ngừng dùng địa chỉ',exact:true});await expect(archive).toContainText(customer.displayName);await archive.getByLabel('Lý do').fill('Giữ lịch sử, ngừng dùng cho đơn mới');await archive.getByRole('button',{name:'Ngừng dùng địa chỉ',exact:true}).click();await expect(archive).not.toBeVisible();await expect(page.getByRole('table',{name:'Địa chỉ trong hồ sơ khách'})).toContainText('Đã lưu trữ');
  71 |     await page.evaluate(async customerId=>{
  72 |         const {find}=await import('/src/mocks/database.ts');find('customers',customerId,'shop-demo').redactedFields=['addresses'];
  73 |     },customer.id);
  74 |     expect(await mutate(page,'customers/'+customer.id,{notes:'Refetch hồ sơ đã che'},customer.version)).toBe(200);await expect(page.getByRole('button',{name:'Thêm địa chỉ',exact:true})).toBeDisabled();await expect(page.getByText('Quyền hiện tại che thông tin bắt buộc của địa chỉ; cần người có quyền phù hợp để tạo địa chỉ mới.',{exact:true})).toBeVisible();
  75 | });
  76 | 
  77 | test('C05 an unknown warehouse creation keeps the draft and prevents a second request',async({page})=>{
  78 |     const writes:string[]=[];page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname.endsWith('/warehouses'))writes.push(r.postData()||'');});
  79 |     await page.goto(url+'/s/shop-demo/settings/warehouses');await page.getByRole('button',{name:'Thêm kho',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Thêm kho',exact:true});
  80 |     await dialog.getByLabel('Mã kho',{exact:true}).fill('UNKNOWN');await dialog.getByLabel('Tên kho',{exact:true}).fill('Nháp giữ khi chưa rõ');await dialog.getByLabel('Địa điểm kho',{exact:true}).fill('Địa điểm tổng hợp');
  81 |     await page.evaluate(async()=>{(await import('/src/mocks/service.ts')).setOperationFailure('createWarehouse',{status:503,code:'UNKNOWN_RESULT',message:'Kết quả tổng hợp chưa xác định'});});
  82 |     const sent=page.waitForRequest(r=>r.method()==='POST'&&new URL(r.url()).pathname.endsWith('/warehouses'));await dialog.getByRole('button',{name:'Lưu kho',exact:true}).click();await expect(dialog.getByRole('alert').filter({hasText:'Chưa xác minh'})).toBeVisible();await expect(dialog.getByRole('button',{name:'Lưu kho',exact:true})).toBeDisabled();
  83 |     await dialog.getByLabel('Tên kho',{exact:true}).fill('Chỉnh tiếp trong bản chưa rõ');await expect(dialog.getByLabel('Tên kho',{exact:true})).toHaveValue('Chỉnh tiếp trong bản chưa rõ');await expect(dialog.getByRole('button',{name:'Lưu kho',exact:true})).toBeDisabled();expect(writes).toHaveLength(1);
  84 |     const intent=await page.evaluate(async()=>{const {intentSnapshot}=await import('/src/shared/api/intents.ts');return intentSnapshot().find(row=>row.operation==='createWarehouse');});expect(intent?.intentId).toBe((await sent).headers()['idempotency-key']);expect(intent?.shopId).toBe('shop-demo');
  85 | });
  86 | 
```