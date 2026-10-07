import {test,expect} from '@playwright/test';
import {startDemoServer} from './session/demo-server.mjs';

let demoUrl='';
let closeDemo: (()=>Promise<void>)|undefined;

test.beforeAll(async()=>{
    const server=await startDemoServer();
    demoUrl=server.url;
    closeDemo=server.close;
});

test.afterAll(async()=>closeDemo?.());

async function gotoDemo(page: import('@playwright/test').Page,path: string){
    await page.goto(new URL(path,demoUrl).toString());
}

async function chooseMockOption(page: import('@playwright/test').Page,label: string,value: string){
    await page.getByRole('combobox',{name:label}).click();
    await page.getByRole('option',{name:value,exact:true}).click();
}

type ObservedRequest={method:string;path:string;body:string|null;headers:Record<string,string>};
function observeShopRequests(page: import('@playwright/test').Page){
    const requests:ObservedRequest[]=[];
    page.on('request',request=>{
        const url=new URL(request.url());
        if(url.pathname.includes('/shops'))
            requests.push({method:request.method(),path:url.pathname,body:request.postData(),headers:request.headers()});
    });
    return requests;
}

test('workspace onboarding creates a shop with an active membership and returns to its scoped route',async({page})=>{
    const calls=observeShopRequests(page);
    await gotoDemo(page,'/workspaces');
    await expect(page.getByRole('heading',{name:'Chọn cửa hàng',exact:true})).toBeVisible();
    await expect(page.getByText('Joker Studio · Shop mẫu',{exact:true})).toBeVisible();
    await expect(page.getByText('Cửa hàng mẫu thứ hai',{exact:true})).toBeVisible();

    await page.getByRole('link',{name:'Tạo cửa hàng',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Tạo cửa hàng',exact:true})).toBeVisible();
    await page.getByLabel('Tên cửa hàng').fill('Workspace kiểm thử FE009');
    await chooseMockOption(page,'Tiền tệ cơ sở','LAK');
    await page.getByRole('button',{name:'Tạo cửa hàng',exact:true}).click();

    await expect(page).toHaveURL(/\/s\/shop-[^/]+\/overview$/);
    const createCall=calls.find(call=>call.method==='POST'&&call.path.endsWith('/shops'));
    expect(JSON.parse(createCall?.body||'null')).toMatchObject({name:'Workspace kiểm thử FE009',currency:'LAK',timezone:'Asia/Vientiane',locale:'vi-VN'});
    await expect(page.getByRole('navigation',{name:'Điều hướng chính'}).getByRole('link',{name:/Workspace kiểm thử FE009/})).toBeVisible();
    await page.getByRole('navigation',{name:'Điều hướng chính'}).getByRole('link',{name:/Workspace kiểm thử FE009/}).click();
    await expect(page.getByRole('heading',{name:'Workspace kiểm thử FE009',exact:true})).toBeVisible();
    await expect(page.getByText('LAK · Asia/Vientiane',{exact:true})).toBeVisible();
});

test('customer create validates fields, submits through mock HTTP, and preserves edits after a stale version',async({page})=>{
    const calls=observeShopRequests(page);
    await gotoDemo(page,'/s/shop-demo/customers');
    await expect(page.getByRole('heading',{name:'Khách hàng',exact:true})).toBeVisible();
    await expect(page.getByRole('table',{name:'Danh sách khách hàng'})).toBeVisible();
    await expect(page.getByRole('columnheader',{name:'Liên hệ'})).toBeVisible();
    await page.getByRole('button',{name:'Thêm khách hàng',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Thêm khách hàng'});
    const name=dialog.getByLabel('Tên khách hàng');
    await name.fill('Khách FE009 mới');
    await dialog.getByLabel('Email (không bắt buộc)').fill('sai-email');
    await dialog.getByRole('button',{name:'Lưu khách hàng',exact:true}).click();
    await expect(dialog.getByText('Nhập email đúng định dạng.',{exact:true})).toBeVisible();
    await expect(name).toHaveValue('Khách FE009 mới');
    expect(calls.filter(call=>call.method==='POST'&&call.path.endsWith('/shops/shop-demo/customers'))).toHaveLength(0);

    await expect(dialog.getByLabel('Số điện thoại (không bắt buộc)')).toBeVisible();
    await expect(dialog.getByLabel('Ghi chú (không bắt buộc)')).toBeVisible();
    await dialog.getByLabel('Email (không bắt buộc)').fill('fe009@example.test');
    await dialog.getByLabel('Số điện thoại (không bắt buộc)').fill('02012345678');
    await dialog.getByRole('button',{name:'Lưu khách hàng',exact:true}).click();
    await expect(page).toHaveURL(/\/customers\/customer-/);
    await expect(page.getByRole('heading',{name:'Khách FE009 mới',exact:true})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Thông tin khách hàng'})).toBeVisible();
    const createCall=calls.find(call=>call.method==='POST'&&call.path.endsWith('/shops/shop-demo/customers'));
    expect(JSON.parse(createCall?.body||'null')).toMatchObject({displayName:'Khách FE009 mới',phone:'02012345678',email:'fe009@example.test'});
    await expect(page.getByLabel('Số điện thoại (không bắt buộc)')).toHaveValue('02012345678');

    const updatedName='Khách FE009 đổi tên';
    await page.getByLabel('Tên khách hàng').fill(updatedName);
    await chooseMockOption(page,'Trạng thái thử','Xung đột lần ghi tiếp');
    await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
    await expect(page.getByRole('alert').filter({hasText:'dữ liệu bị thay đổi bởi người khác'})).toBeVisible();
    await expect(page.getByLabel('Tên khách hàng')).toHaveValue(updatedName);

    await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
    await expect(page.getByRole('heading',{name:updatedName,exact:true})).toBeVisible();
    const customerPatches=calls.filter(call=>call.method==='PATCH'&&call.path.includes('/shops/shop-demo/customers/'));
    expect(customerPatches).toHaveLength(2);
    expect(customerPatches.every(call=>Boolean(call.headers['if-match']))).toBe(true);
    expect(JSON.parse(customerPatches[1].body||'null')).toMatchObject({displayName:updatedName});
    await page.getByRole('link',{name:'Danh sách khách'}).click();
    await expect(page).toHaveURL(/\/customers$/);
    await page.getByLabel('Tìm kiếm').fill(updatedName);
    await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();
    await expect(page.getByRole('link',{name:'Hồ sơ',exact:true})).toHaveCount(1);
    await expect(page.getByText(updatedName,{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Trang tiếp'})).toBeDisabled();

    await page.getByRole('navigation',{name:'Điều hướng chính'}).getByRole('link',{name:/Joker Studio/}).click();
    await page.getByRole('link',{name:'Mở cửa hàng',exact:true}).nth(1).click();
    await page.getByRole('navigation',{name:'Điều hướng chính'}).getByRole('link',{name:'Khách hàng',exact:true}).click();
    await page.getByLabel('Tìm kiếm').fill(updatedName);
    await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();
    await expect(page.getByRole('link',{name:'Hồ sơ',exact:true})).toHaveCount(0);
    await expect(page.getByText(updatedName,{exact:true})).toHaveCount(0);
});

test('customer detail keeps redacted contact fields read-only and does not overwrite them on save',async({page})=>{
    await page.setViewportSize({width:320,height:800});
    await gotoDemo(page,'/s/shop-demo/customers/c1');
    await expect(page.getByRole('heading',{name:'Linh (khách mẫu)',exact:true})).toBeVisible();
    const phone=page.getByLabel('Số điện thoại (không bắt buộc)');
    await expect(phone).toBeDisabled();
    await expect(page.getByText(/Một số trường bị ẩn theo quyền/)).toBeVisible();
    await expect(page.getByRole('heading',{name:'Yêu cầu hỗ trợ'})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

    await page.getByLabel('Tên khách hàng').fill('Linh đã cập nhật');
    await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Linh đã cập nhật',exact:true})).toBeVisible();
    await expect(phone).toBeDisabled();
    await expect(phone).toHaveValue('09•• ••• 121');
});

test('FE009.G01 shop setup checklist guides to supported pages and leaves missing contract fields unverified',async({page})=>{
    const writes:string[]=[];
    page.on('request',request=>{ if(request.method()!=='GET') writes.push(`${request.method()} ${new URL(request.url()).pathname}`); });
    await gotoDemo(page,'/s/shop-demo/settings/shop');
    await expect(page.getByRole('heading',{name:'Checklist thiết lập vận hành',exact:true})).toBeVisible();
    await expect(page.getByText(/Quốc gia kinh doanh không được suy ra từ múi giờ/)).toBeVisible();
    await expect(page.getByText('Quốc gia và giờ kinh doanh',{exact:true})).toBeVisible();
    await expect(page.getByText('Chưa có trường cấu hình trong contract',{exact:true})).toBeVisible();
    await expect(page.getByRole('link',{name:'Xem preview phí giao',exact:true})).toHaveAttribute('href','/s/shop-demo/shipments');
    await expect(page.getByRole('link',{name:'Quản lý thành viên',exact:true})).toHaveAttribute('href','/s/shop-demo/settings/team');
    expect(writes).toEqual([]);
});

test('FE009.G05 marketing consent preview is interactive but never claims server opt-out',async({page})=>{
    const writes:string[]=[];
    page.on('request',request=>{ if(request.method()!=='GET') writes.push(`${request.method()} ${new URL(request.url()).pathname}`); });
    await gotoDemo(page,'/s/shop-demo/settings/shop');
    await page.getByRole('link',{name:'Xem thử consent',exact:true}).click();
    await expect(page).toHaveURL(/\/settings\/privacy$/);
    await expect(page.getByRole('heading',{name:'Xem thử consent marketing',exact:true})).toBeVisible();
    const preview=page.getByTestId('consent-preview-status');
    await expect(preview).toContainText('Chưa xác minh từ API');
    await page.getByRole('checkbox',{name:'Ngừng liên hệ marketing (chỉ bản xem trước)'}).check();
    await expect(preview).toContainText('Opt-out mô phỏng; chưa ghi server');
    await expect(preview).toContainText('Số khách opt-out trong preview: 1');
    expect(writes).toEqual([]);
});

test('FE009.H06 audit screen distinguishes available fields from missing contract detail',async({page})=>{
    await gotoDemo(page,'/s/shop-demo/settings/audit');
    await expect(page.getByRole('heading',{name:'Nhật ký hoạt động',exact:true})).toBeVisible();
    const auditTable=page.getByRole('table');
    for(const header of ['Người thực hiện','Thao tác','Đối tượng','Kết quả','Mã truy vết'])
        await expect(auditTable.getByRole('columnheader',{name:header,exact:true})).toBeVisible();
    await expect(page.getByRole('alert').filter({hasText:'Loại actor, phiên bản policy/config và snapshot chi tiết chưa có trong DTO'})).toBeVisible();
});

test('FE009.B06 after-sale cases only link orders loaded for the selected customer and customer profile shows their shipment',async({page})=>{
    const calls=observeShopRequests(page);
    await gotoDemo(page,'/s/shop-demo/service-cases');
    await expect(page.getByRole('heading',{name:'Chăm sóc sau bán',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Tạo yêu cầu',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Yêu cầu mới'});

    await chooseMockOption(page,'Khách hàng','Linh (khách mẫu)');
    const relatedOrder=dialog.getByRole('combobox',{name:'Đơn hàng liên quan (không bắt buộc)'});
    await expect(relatedOrder).toBeEnabled();
    await chooseMockOption(page,'Đơn hàng liên quan (không bắt buộc)','DH-DEMO-PAID-01 · completed');
    await chooseMockOption(page,'Khách hàng','Minh (khách mẫu)');
    await expect(relatedOrder).not.toContainText('DH-DEMO-PAID-01');
    await chooseMockOption(page,'Khách hàng','Linh (khách mẫu)');
    await chooseMockOption(page,'Đơn hàng liên quan (không bắt buộc)','DH-DEMO-PAID-01 · completed');
    await chooseMockOption(page,'Loại yêu cầu','Yêu cầu trả hàng');
    await dialog.getByLabel('Nội dung').fill('Khách muốn kiểm tra tình trạng yêu cầu trả một phần đơn.');
    await dialog.getByRole('button',{name:'Tạo yêu cầu',exact:true}).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('Khách muốn kiểm tra tình trạng yêu cầu trả một phần đơn.',{exact:true})).toBeVisible();
    const createCall=calls.find(call=>call.method==='POST'&&call.path.endsWith('/shops/shop-demo/service-cases'));
    expect(JSON.parse(createCall?.body||'null')).toMatchObject({customerId:'c1',orderId:'DH-DEMO-PAID-01',kind:'return_request'});
    await expect(page.getByRole('link',{name:'DH-DEMO-PAID-01',exact:true})).toBeVisible();

    await page.getByRole('link',{name:'Linh (khách mẫu)',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Linh (khách mẫu)',exact:true})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Vận đơn liên quan',exact:true})).toBeVisible();
    await expect(page.getByText('seed-shipment-10021',{exact:true})).toBeVisible();
    await expect(page.getByRole('link',{name:'DH-DEMO-PAID-01',exact:true})).toBeVisible();
});

test('team invitation and membership revoke stay shop-scoped and protect the active owner',async({page})=>{
    const calls=observeShopRequests(page);
    await gotoDemo(page,'/s/shop-demo/settings/team');
    const table=page.getByRole('table',{name:'Dữ liệu'});
    const rows=table.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    const initialMemberCount=await rows.count();
    expect(initialMemberCount).toBeGreaterThan(1);
    const ownerRow=rows.filter({hasText:'Jokertrader'});
    await expect(ownerRow.getByRole('button',{name:'Thu hồi'})).toBeDisabled();

    await page.getByRole('button',{name:'Mời nhân viên',exact:true}).click();
    const invite=page.getByRole('dialog',{name:'Mời nhân viên'});
    await invite.getByLabel('Email nhân viên').fill('fe009-member@example.test');
    await invite.getByRole('button',{name:'Lưu',exact:true}).click();
    await expect(invite).toHaveCount(0);
    await expect(rows).toHaveCount(initialMemberCount+1);
    const inviteCall=calls.find(call=>call.method==='POST'&&call.path.endsWith('/shops/shop-demo/members'));
    expect(JSON.parse(inviteCall?.body||'null')).toMatchObject({email:'fe009-member@example.test',roles:['viewer']});

    const warehouseRow=rows.filter({hasText:'user-warehouse'});
    await warehouseRow.getByRole('button',{name:'Thu hồi'}).click();
    const confirm=page.getByRole('dialog',{name:'Thu hồi quyền nhân viên'});
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button',{name:'Xác nhận',exact:true}).click();
    await expect(warehouseRow.getByText('Đã thu hồi',{exact:true})).toBeVisible();
    await expect(ownerRow.getByText('Đang hoạt động',{exact:true})).toBeVisible();
    const revokeCall=calls.find(call=>call.method==='DELETE'&&call.path.includes('/shops/shop-demo/members/member-warehouse'));
    expect(revokeCall).toBeDefined();
    expect(revokeCall?.headers['if-match']).toBeTruthy();

    await chooseMockOption(page,'Vai trò mô phỏng','manager');
    await expect(page.getByRole('alert').filter({hasText:'Bạn không có quyền truy cập màn hình này'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Mời nhân viên',exact:true})).toHaveCount(0);
});

test('privacy delete requests remain pending approval with no frontend step-up shortcut',async({page})=>{
    const calls=observeShopRequests(page);
    await gotoDemo(page,'/s/shop-demo/settings/privacy');
    await expect(page.getByText(/Phê duyệt yêu cầu xóa cần xác thực nâng cao của backend/)).toBeVisible();
    await page.getByRole('button',{name:'Tạo yêu cầu',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Yêu cầu dữ liệu cá nhân'});
    await chooseMockOption(page,'Khách hàng','Linh (khách mẫu)');
    await chooseMockOption(page,'Loại yêu cầu','Xóa dữ liệu cá nhân');
    await dialog.getByLabel('Lý do / xác minh yêu cầu').fill('Khách gửi yêu cầu xóa, chờ xác minh theo chính sách lưu giữ.');
    await dialog.getByRole('button',{name:'Tạo yêu cầu chờ duyệt',exact:true}).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('Chờ phê duyệt',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:/duyệt ngay|xóa ngay|xác nhận xóa/i})).toHaveCount(0);
    const privacyCall=calls.find(call=>call.method==='POST'&&call.path.endsWith('/shops/shop-demo/privacy/requests'));
    expect(JSON.parse(privacyCall?.body||'null')).toMatchObject({customerId:'c1',kind:'delete',reason:'Khách gửi yêu cầu xóa, chờ xác minh theo chính sách lưu giữ.'});
});
