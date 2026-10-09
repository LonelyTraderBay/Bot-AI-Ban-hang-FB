import { openDemoControls } from './session/demo-controls';
import {test,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {startDemoServer} from './session/demo-server.mjs';
import {evidenceRunId} from './evidence-run-id.mjs';

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
    if (['Vai trò mô phỏng', 'Trạng thái thử', 'Dataset mô phỏng'].includes(label)) await openDemoControls(page);
    await page.getByRole('combobox',{name:label}).click();
    await page.getByRole('option',{name:value,exact:true}).click();
}

type ObservedRequest={method:string;path:string;body:string|null;headers:Record<string,string>};
function observeShopRequests(page: import('@playwright/test').Page){
    const requests:ObservedRequest[]=[];
    page.on('request',request=>{
        const url=new URL(request.url());
        if(url.pathname.includes('/shops'))
            requests.push({method:request.method(),path:url.pathname+url.search,body:request.postData(),headers:request.headers()});
    });
    return requests;
}

test('product editor validates positive prices, protects image-only drafts, and saves variant payload through mock HTTP',async({page})=>{
    const calls=observeShopRequests(page);
    await gotoDemo(page,'/s/shop-demo/products/new');
    await expect(page.getByRole('heading',{name:'Thêm sản phẩm',exact:true})).toBeVisible();
    const name=page.getByLabel('Tên sản phẩm');
    const skus=page.getByLabel('SKU');
    const prices=page.getByLabel('Giá bán (VND)');
    await expect(prices.first()).toHaveValue('');
    await name.fill('Sản phẩm FE010');
    await skus.nth(0).fill('FE010-PRODUCT-M');
    await chooseMockOption(page,'Danh mục','Áo');
    await page.getByRole('button',{name:'Lưu sản phẩm',exact:true}).click();
    await expect(page.getByText('Nhập giá bán',{exact:true})).toBeVisible();
    expect(calls.filter(call=>call.method==='POST'&&call.path.endsWith('/shops/shop-demo/products'))).toHaveLength(0);

    await prices.first().fill('0');
    await page.getByRole('button',{name:'Lưu sản phẩm',exact:true}).click();
    await expect(page.getByText('Giá phải lớn hơn 0',{exact:true})).toBeVisible();
    expect(calls.filter(call=>call.method==='POST'&&call.path.endsWith('/shops/shop-demo/products'))).toHaveLength(0);

    await prices.first().fill('249000');
    await page.getByRole('button',{name:'Thêm biến thể'}).click();
    await skus.nth(1).fill('FE010-PRODUCT-L');
    await page.getByLabel('Tên / màu / kích cỡ').nth(1).fill('Size L');
    await prices.nth(1).fill('259000');
    await page.locator('input[type="file"]').setInputFiles({name:'fe010.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pWQAAAAASUVORK5CYII=','base64')});
    await expect(page.getByText('1 tệp được gắn với sản phẩm',{exact:true})).toBeVisible();

    await page.getByRole('link',{name:'Danh sách',exact:true}).click();
    const guard=page.getByRole('dialog',{name:'Rời màn hình chưa lưu?'});
    await expect(guard).toBeVisible();
    await guard.getByRole('button',{name:'Tiếp tục chỉnh sửa',exact:true}).click();
    await expect(name).toHaveValue('Sản phẩm FE010');
    await expect(skus.nth(1)).toHaveValue('FE010-PRODUCT-L');
    await expect(page.getByText('1 tệp được gắn với sản phẩm',{exact:true})).toBeVisible();

    await page.getByRole('button',{name:'Lưu sản phẩm',exact:true}).click();
    await expect(page).toHaveURL(/\/products\/product-/);
    const createCall=calls.find(call=>call.method==='POST'&&call.path.endsWith('/shops/shop-demo/products'));
    const payload=JSON.parse(createCall?.body||'null');
    expect(payload).toMatchObject({name:'Sản phẩm FE010',categoryId:'cat-0',status:'draft'});
    expect(payload.variants.map((v:{sku:string;name:string;price:{amount:string;currency:string}})=>({sku:v.sku,name:v.name,price:v.price}))).toEqual([
        {sku:'FE010-PRODUCT-M',name:'Mặc định',price:{amount:'249000',currency:'VND'}},
        {sku:'FE010-PRODUCT-L',name:'Size L',price:{amount:'259000',currency:'VND'}}
    ]);
    expect(payload.imageFileIds).toHaveLength(1);
    expect(payload).not.toHaveProperty('unitCost');
    expect(payload.variants[0]).not.toHaveProperty('unitCost');

    await page.getByRole('link',{name:'Danh sách',exact:true}).click();
    await page.getByLabel('Tìm kiếm').fill('FE010-PRODUCT-L');
    await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();
    await expect(page.getByText('Sản phẩm FE010',{exact:true})).toBeVisible();
    const clothingProducts=page.waitForRequest(request=>{
        const url=new URL(request.url());
        return request.method()==='GET'&&url.pathname.endsWith('/shops/shop-demo/products')&&url.searchParams.get('categoryId')==='cat-1';
    });
    await chooseMockOption(page,'Danh mục','Quần');
    await clothingProducts;
    await expect(page.getByText('Sản phẩm FE010',{exact:true})).toHaveCount(0);
    const clothingRestore=page.waitForRequest(request=>{
        const url=new URL(request.url());
        return request.method()==='GET'&&url.pathname.endsWith('/shops/shop-demo/products')&&url.searchParams.get('categoryId')==='cat-0';
    });
    await chooseMockOption(page,'Danh mục','Áo');
    await clothingRestore;
    await expect(page.getByText('Sản phẩm FE010',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Trang tiếp'})).toBeDisabled();
});

test('product update sends If-Match and keeps edits visible after a 412 conflict',async({page})=>{
    const calls=observeShopRequests(page);
    await gotoDemo(page,'/s/shop-demo/products/p1');
    await expect(page.getByRole('heading',{name:'Thông tin sản phẩm',exact:true})).toBeVisible();
    await page.getByLabel('Tên sản phẩm').fill('Áo cập nhật FE010');
    await page.getByLabel('Giá bán (VND)').first().fill('71000');
    await chooseMockOption(page,'Trạng thái thử','Xung đột lần ghi tiếp');
    const staleSave=page.waitForResponse(response=>response.request().method()==='PATCH'&&new URL(response.url()).pathname.endsWith('/shops/shop-demo/products/p1'));
    await page.getByRole('button',{name:'Lưu sản phẩm',exact:true}).click();
    expect((await staleSave).status()).toBe(412);
    const comparison=page.getByRole('dialog',{name:'Đối chiếu thay đổi',exact:true});
    await expect(comparison).toBeVisible();
    await expect(comparison.getByText('Áo cập nhật FE010',{exact:true})).toBeVisible();
    expect(calls.filter(call=>call.method==='PATCH'&&call.path.endsWith('/shops/shop-demo/products/p1'))).toHaveLength(1);
    await comparison.getByRole('button',{name:'Áp dụng vào bản nháp',exact:true}).click();
    await expect(page.getByLabel('Tên sản phẩm')).toHaveValue('Áo cập nhật FE010');
    await expect(page.getByLabel('Giá bán (VND)').first()).toHaveValue('71000');
    const patch=calls.find(call=>call.method==='PATCH'&&call.path.endsWith('/shops/shop-demo/products/p1'));
    expect(patch).toBeDefined();
    expect(patch?.headers['if-match']).toBeTruthy();
    expect(JSON.parse(patch?.body||'null')).toMatchObject({name:'Áo cập nhật FE010'});
    expect(JSON.parse(patch?.body||'null')).not.toHaveProperty('unitCost');
    const latestVersion=await page.evaluate(async()=>(await(await fetch('/api/v2/shops/shop-demo/products/p1')).json()).data.version);
    const saved=page.waitForResponse(response=>response.request().method()==='PATCH'&&new URL(response.url()).pathname.endsWith('/shops/shop-demo/products/p1'));
    await page.getByRole('button',{name:'Lưu sản phẩm',exact:true}).click();
    expect((await saved).status()).toBe(200);
    const patches=calls.filter(call=>call.method==='PATCH'&&call.path.endsWith('/shops/shop-demo/products/p1'));
    expect(patches).toHaveLength(2);
    expect(patches[1].headers['if-match']).toBe(`"${latestVersion}"`);
    await expect(page.getByLabel('Tên sản phẩm')).toHaveValue('Áo cập nhật FE010');
});

test('warehouse role can read catalog products but cannot edit product fields or price cost data',async({page})=>{
    await gotoDemo(page,'/s/shop-demo/products/p1');
    await chooseMockOption(page,'Vai trò mô phỏng','warehouse');
    await expect(page.getByLabel('Tên sản phẩm')).toBeDisabled();
    await expect(page.getByLabel('Giá bán (VND)').first()).toBeDisabled();
    await expect(page.getByRole('button',{name:'Lưu sản phẩm',exact:true})).toHaveCount(0);
    await expect(page.getByText(/giá vốn|unitCost/i)).toHaveCount(0);
});

test('categories create, search, update with a version, and render cursor pagination',async({page})=>{
    const calls=observeShopRequests(page);
    await gotoDemo(page,'/s/shop-demo/categories');
    await expect(page.getByRole('heading',{name:'Danh mục',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Trang tiếp'})).toBeDisabled();
    await page.getByRole('button',{name:'Thêm danh mục',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Thêm danh mục'});
    await dialog.getByLabel('Tên').fill('Danh mục FE010');
    await dialog.getByRole('button',{name:'Lưu',exact:true}).click();
    await expect(dialog).toHaveCount(0);
    const create=calls.find(call=>call.method==='POST'&&call.path.endsWith('/shops/shop-demo/categories'));
    expect(JSON.parse(create?.body||'null')).toMatchObject({name:'Danh mục FE010',parentId:null});

    await page.getByLabel('Tìm kiếm').fill('Danh mục FE010');
    await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();
    const row=page.getByRole('row').filter({hasText:'Danh mục FE010'});
    await expect(row).toBeVisible();
    await row.getByRole('button',{name:'Sửa',exact:true}).click();
    const edit=page.getByRole('dialog',{name:'Sửa danh mục'});
    await edit.getByLabel('Tên').fill('Danh mục FE010 đã sửa');
    await edit.getByRole('button',{name:'Lưu',exact:true}).click();
    await expect(edit).toHaveCount(0);
    const update=calls.find(call=>call.method==='PATCH'&&call.path.match(/\/shops\/shop-demo\/categories\/category-/)&&JSON.parse(call.body||'null')?.name==='Danh mục FE010 đã sửa');
    expect(update?.headers['if-match']).toBeTruthy();
    expect(JSON.parse(update?.body||'null')).toMatchObject({name:'Danh mục FE010 đã sửa'});
    await expect(page.getByText('Danh mục FE010 đã sửa',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Trang tiếp'})).toBeDisabled();
});

test('CSV preview reports row-level errors and commits only valid product rows',async({page})=>{
    const calls=observeShopRequests(page);
    await gotoDemo(page,'/s/shop-demo/imports');
    await expect(page.getByRole('heading',{name:'Nhập dữ liệu sản phẩm',exact:true})).toBeVisible();
    await expect(page.getByRole('alert').filter({hasText:'Trong demo mô phỏng'})).toContainText('5 MB');
    await expect(page.getByRole('alert').filter({hasText:'Trong demo mô phỏng'})).toContainText('1.000 dòng');
    const sampleLink=page.getByRole('link',{name:'Tải CSV mẫu',exact:true});
    await expect(sampleLink).toHaveAttribute('download','botsales-products.csv');
    const sampleResponse=await page.request.get(new URL(await sampleLink.getAttribute('href')||'',page.url()).toString());
    expect(sampleResponse.ok()).toBe(true);
    expect(await sampleResponse.text()).toBe(await readFile(resolve(process.cwd(),'samples/products.csv'),'utf8'));

    const csv=[
        'sku,name,price,description,currency',
        'FE010-IMPORT-OK,Sản phẩm nhập FE010,155000,Hàng hợp lệ,VND',
        'FE010-IMPORT-BAD,Thiếu giá,,Giá trống,VND',
        'DEMO-001,Sản phẩm SKU trùng,12000,SKU đã tồn tại,VND'
    ].join('\n');
    await page.locator('input[type="file"]').setInputFiles({name:'fe010-import.csv',mimeType:'text/csv',buffer:Buffer.from(csv,'utf8')});
    await page.getByRole('button',{name:'Kiểm tra trước khi nhập',exact:true}).click();
    await expect(page).toHaveURL(/\/imports\/job-/);
    await expect(page.getByText('3 / 3',{exact:true})).toBeVisible();
    await expect(page.getByRole('row').filter({hasText:'Thiếu SKU/tên hoặc giá không hợp lệ.'})).toBeVisible();
    await expect(page.getByRole('row').filter({hasText:'SKU đã có trong cửa hàng.'})).toBeVisible();
    const dryRun=calls.find(call=>call.method==='POST'&&call.path.endsWith('/shops/shop-demo/imports'));
    expect(JSON.parse(dryRun?.body||'null')).toMatchObject({dryRun:true,duplicateStrategy:'reject'});
    expect(JSON.parse(dryRun?.body||'null').mapping).toEqual(expect.arrayContaining([
        {sourceColumn:'sku',targetField:'sku'},
        {sourceColumn:'price',targetField:'price'}
    ]));

    await page.getByRole('button',{name:'Xác nhận nhập các dòng hợp lệ',exact:true}).click();
    const confirm=page.getByRole('dialog',{name:'Ghi dữ liệu đã kiểm tra'});
    await confirm.getByRole('button',{name:'Nhập các dòng hợp lệ',exact:true}).click();
    await expect(page.getByText('1 / 3',{exact:true})).toBeVisible();
    const commit=calls.find(call=>call.method==='POST'&&/\/shops\/shop-demo\/imports\/job-[^/]+\/commit$/.test(call.path));
    expect(JSON.parse(commit?.body||'null')).toMatchObject({confirmValidRowsOnly:true});

    const importedJobId = new URL(page.url()).pathname.match(/\/imports\/(job-[^/]+)/)?.[1];
    expect(importedJobId).toBeTruthy();
    await page.getByRole('link',{name:'Chọn tệp khác',exact:true}).click();
    const recentJob = page.getByRole('row').filter({hasText: importedJobId!});
    await expect(recentJob).toBeVisible();
    await expect(recentJob.getByRole('link',{name:'Xem kết quả',exact:true})).toHaveAttribute('href', `/s/shop-demo/imports/${importedJobId}`);
    await page.getByRole('navigation',{name:'Điều hướng chính'}).getByRole('link',{name:'Sản phẩm',exact:true}).click();
    const search=page.getByRole('textbox',{name:'Tìm kiếm'});
    await search.fill('FE010-IMPORT-OK');
    const validProductSearch=page.waitForResponse(response=>{
        const url=new URL(response.url());
        return response.request().method()==='GET'&&url.pathname.endsWith('/shops/shop-demo/products')&&url.searchParams.get('q')==='FE010-IMPORT-OK';
    });
    await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();
    await validProductSearch;
    await expect(page.getByText('Sản phẩm nhập FE010',{exact:true})).toBeVisible();
    await search.fill('FE010-IMPORT-BAD');
    const invalidProductSearch=page.waitForResponse(response=>{
        const url=new URL(response.url());
        return response.request().method()==='GET'&&url.pathname.endsWith('/shops/shop-demo/products')&&url.searchParams.get('q')==='FE010-IMPORT-BAD';
    });
    await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();
    await invalidProductSearch;
    await expect(page.getByText('Sản phẩm nhập FE010',{exact:true})).toHaveCount(0);
    await search.fill('DEMO-001');
    const duplicateProductSearch=page.waitForResponse(response=>{
        const url=new URL(response.url());
        return response.request().method()==='GET'&&url.pathname.endsWith('/shops/shop-demo/products')&&url.searchParams.get('q')==='DEMO-001';
    });
    await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();
    await duplicateProductSearch;
    await expect(page.getByText('Sản phẩm SKU trùng',{exact:true})).toHaveCount(0);
});

test('import validation token is rejected with 412 after catalog changes and the preview remains visible',async({page})=>{
    const calls=observeShopRequests(page);
    await gotoDemo(page,'/s/shop-demo/imports');
    const csv='sku,name,price,description,currency\nFE010-STALE-IMPORT,Sản phẩm bản xem trước,15000,Thử token cũ,VND';
    await page.locator('input[type="file"]').setInputFiles({name:'fe010-stale.csv',mimeType:'text/csv',buffer:Buffer.from(csv,'utf8')});
    await page.getByRole('button',{name:'Kiểm tra trước khi nhập',exact:true}).click();
    await expect(page).toHaveURL(/\/imports\/job-/);
    await expect(page.getByText('1 / 1',{exact:true})).toBeVisible();

    await page.getByRole('navigation',{name:'Điều hướng chính'}).getByRole('link',{name:'Sản phẩm',exact:true}).click();
    await page.getByRole('button',{name:'Thêm sản phẩm',exact:true}).click();
    await page.getByLabel('Tên sản phẩm').fill('Sản phẩm làm cũ preview');
    await page.getByLabel('SKU').fill('FE010-CATALOG-CHANGE');
    await page.getByLabel('Giá bán (VND)').fill('25000');
    await page.getByRole('button',{name:'Lưu sản phẩm',exact:true}).click();
    await expect(page).toHaveURL(/\/products\/product-/);
    await page.goBack();
    await expect(page).toHaveURL(/\/products$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/imports\/job-/);

    await page.getByRole('button',{name:'Xác nhận nhập các dòng hợp lệ',exact:true}).click();
    const confirm=page.getByRole('dialog',{name:'Ghi dữ liệu đã kiểm tra'});
    await confirm.getByRole('button',{name:'Nhập các dòng hợp lệ',exact:true}).click();
    await expect(page.getByRole('alert').filter({hasText:'Danh mục đã đổi sau dry-run'})).toBeVisible();
    await expect(page.getByText('Chờ xác nhận',{exact:true})).toBeVisible();
    await confirm.getByRole('button',{name:'Hủy',exact:true}).click();
    await expect(page.getByRole('button',{name:'Xác nhận nhập các dòng hợp lệ',exact:true})).toBeVisible();
    const commit=calls.find(call=>call.method==='POST'&&/\/shops\/shop-demo\/imports\/job-[^/]+\/commit$/.test(call.path));
    expect(JSON.parse(commit?.body||'null')).toMatchObject({confirmValidRowsOnly:true});
});

test('CSV demo row limit is explained and rejects more than 1000 data rows before preview',async({page})=>{
    await gotoDemo(page,'/s/shop-demo/imports');
    await expect(page.getByRole('alert').filter({hasText:'Trong demo mô phỏng'})).toContainText('1.000 dòng');
    const rows=Array.from({length:1001},(_,index)=>`FE010-LIMIT-${index},Dòng giới hạn ${index},1000,Kiểm tra limit,VND`);
    const csv=['sku,name,price,description,currency',...rows].join('\n');
    await page.locator('input[type="file"]').setInputFiles({name:'fe010-over-limit.csv',mimeType:'text/csv',buffer:Buffer.from(csv,'utf8')});
    const dryRun=page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname.endsWith('/shops/shop-demo/imports'));
    await page.getByRole('button',{name:'Kiểm tra trước khi nhập',exact:true}).click();
    expect((await dryRun).status()).toBe(422);
    await expect(page).toHaveURL(/\/imports$/);
    await expect(page.getByRole('alert').filter({hasText:'CSV cần 1–1000 dòng dữ liệu.'})).toBeVisible();
});

test('demo upload rejects files over 5 MB before making an upload request',async({page})=>{
    let uploadRequests=0;
    page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname.endsWith('/shops/shop-demo/uploads')) uploadRequests++;});
    await gotoDemo(page,'/s/shop-demo/imports');
    await expect(page.getByRole('alert').filter({hasText:'Trong demo mô phỏng'})).toContainText('5 MB');
    await page.locator('input[type="file"]').setInputFiles({name:'fe010-too-large.csv',mimeType:'text/csv',buffer:Buffer.alloc(5*1024*1024+1,'x')});
    await expect(page.locator('#product-import-file-error')).toContainText('vượt giới hạn 5 MB');
    await expect(page.getByRole('button',{name:'Kiểm tra trước khi nhập',exact:true})).toBeDisabled();
    expect(uploadRequests).toBe(0);
});

test('product category lookup pages the full collection and preserves the selected category while editing',async({page})=>{
    await gotoDemo(page,'/s/shop-demo/inbox');
    await expect(page.getByRole('navigation',{name:'Điều hướng chính'})).toBeVisible();

    const seedCategories=async()=>page.evaluate(async(count:number)=>{
        for(let index=0;index<count;index++){
            const response=await fetch('/api/v2/shops/shop-demo/categories',{
                method:'POST',
                headers:{'content-type':'application/json','x-csrf-token':'botsales-demo-csrf-not-a-real-secret','idempotency-key':`ui005-category-${index}`},
                body:JSON.stringify({name:`Danh mục UI005 ${String(index).padStart(3,'0')}`,parentId:null})
            });
            const result=await response.json();
            if(!response.ok) throw new Error(`Category fixture ${index} failed: ${response.status} ${JSON.stringify(result)}`);
        }
        const first=await fetch('/api/v2/shops/shop-demo/categories?limit=100');
        const firstPage=await first.json();
        const lastPage=await fetch(`/api/v2/shops/shop-demo/categories?limit=100&cursor=${encodeURIComponent(firstPage.page.nextCursor)}`);
        const last=await lastPage.json();
        return {total:firstPage.page.total,firstPageCount:firstPage.data.length,hasMore:firstPage.page.hasMore,target:last.data.at(-1),targetCount:last.data.length};
    },102);

    const apiRequests:Array<{method:string;url:string;body:string|null}> = [];
    const apiResponses:Array<{method:string;url:string;status:number}> = [];
    page.on('request',request=>{
        const url=new URL(request.url());
        const relevant=url.pathname.endsWith('/categories')||url.pathname.endsWith('/products')||/\/products\/[^/]+$/.test(url.pathname);
        if(relevant&&!(url.pathname.endsWith('/categories')&&request.method()==='POST'))
            apiRequests.push({method:request.method(),url:url.pathname+url.search,body:request.postData()});
    });
    page.on('response',response=>{
        const url=new URL(response.url());
        if((url.pathname.endsWith('/categories')&&response.request().method()==='GET')||url.pathname.endsWith('/products')||/\/products\/[^/]+$/.test(url.pathname))
            apiResponses.push({method:response.request().method(),url:url.pathname+url.search,status:response.status()});
    });

    const firstDataset=await seedCategories();
    expect(firstDataset).toMatchObject({total:105,firstPageCount:100,hasMore:true,target:{id:'cat-2',name:'Phụ kiện'},targetCount:5});

    const listPage=page.waitForResponse(response=>{
        const url=new URL(response.url());
        return response.request().method()==='GET'&&url.pathname.endsWith('/shops/shop-demo/categories')&&url.searchParams.get('limit')==='20'&&!url.searchParams.has('cursor')&&!url.searchParams.has('q');
    });
    await page.getByRole('navigation',{name:'Điều hướng chính'}).getByRole('link',{name:'Sản phẩm',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Sản phẩm',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Thêm sản phẩm',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Thêm sản phẩm',exact:true})).toBeVisible();
    const firstListResponse=await listPage;
    const firstListBody=await firstListResponse.json();
    expect(firstListResponse.status()).toBe(200);
    expect(firstListBody.page).toMatchObject({total:105,limit:20,hasMore:true});
    expect(firstListBody.data).toHaveLength(20);
    await expect(page.getByLabel('Tìm danh mục')).toBeVisible();
    await expect(page.getByRole('combobox',{name:'Danh mục'})).toBeEnabled();

    const categoryCount=(count:number)=>page.getByText(`Đã tải ${count} lựa chọn`,{exact:true});
    for(const count of [40,60,80,100,105]){
        await page.getByRole('button',{name:'Tải thêm danh mục'}).click();
        await expect(categoryCount(count)).toBeVisible();
    }
    await expect(page.getByRole('button',{name:'Tải thêm danh mục'})).toHaveCount(0);
    await page.getByRole('combobox',{name:'Danh mục'}).click();
    const targetOption=page.getByRole('option',{name:'Phụ kiện',exact:true});
    await expect(targetOption).toHaveCount(1);
    await targetOption.click();
    await expect(page.getByRole('combobox',{name:'Danh mục'})).toContainText('Phụ kiện');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);

    await page.getByLabel('Tìm danh mục').fill('Danh mục UI005 050');
    const searchedPage=page.waitForResponse(response=>{
        const url=new URL(response.url());
        return response.request().method()==='GET'&&url.pathname.endsWith('/shops/shop-demo/categories')&&url.searchParams.get('q')==='Danh mục UI005 050';
    });
    await expect(categoryCount(1)).toBeVisible();
    await searchedPage;
    await expect(page.getByRole('combobox',{name:'Danh mục'})).toContainText('Phụ kiện');
    await page.screenshot({path:resolve(process.cwd(),`evidence/frontend-ui-improvements/UI005/S02-create-selected-last-category-${test.info().project.name}-${evidenceRunId}.png`),fullPage:true});
    await page.getByLabel('Tên sản phẩm').fill('Sản phẩm UI005 cuối danh mục');
    await page.getByLabel('SKU').fill('UI005-LAST-CATEGORY');
    await page.getByLabel('Giá bán (VND)').fill('12000');
    await page.getByRole('button',{name:'Lưu sản phẩm',exact:true}).click();
    await expect(page).toHaveURL(/\/products\/product-/);
    const createCall=apiRequests.find(request=>request.method==='POST'&&request.url.endsWith('/shops/shop-demo/products'));
    const createPayload=JSON.parse(createCall?.body||'null');
    expect(createPayload).toMatchObject({name:'Sản phẩm UI005 cuối danh mục',categoryId:'cat-2'});
    await expect(page.getByRole('combobox',{name:'Danh mục'})).toContainText('Phụ kiện');

    // A new page gives the edit check a fresh query cache while the mock is reset to its canonical seed.
    await gotoDemo(page,'/s/shop-demo/inbox');
    await expect(page.getByRole('navigation',{name:'Điều hướng chính'})).toBeVisible();
    const freshSeed=await page.evaluate(async()=>{
        const response=await fetch('/api/v2/shops/shop-demo/categories?limit=100');
        const result=await response.json();
        return {total:result.page.total,p1:await (await fetch('/api/v2/shops/shop-demo/products/p1')).json()};
    });
    expect(freshSeed.total).toBe(3);
    expect(freshSeed.p1.data.categoryId).toBe('cat-0');
    const editDataset=await seedCategories();
    expect(editDataset.total).toBe(105);
    await page.getByRole('navigation',{name:'Điều hướng chính'}).getByRole('link',{name:'Sản phẩm',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Sản phẩm',exact:true})).toBeVisible();
    const p1Row=page.getByRole('row').filter({hasText:'Áo mẫu A'});
    await expect(p1Row).toBeVisible();
    await p1Row.getByRole('link',{name:'Chi tiết',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Thông tin sản phẩm',exact:true})).toBeVisible();
    await expect(page.getByLabel('Tên sản phẩm')).toHaveValue('Áo mẫu A');
    await expect(page.getByRole('combobox',{name:'Danh mục'})).toContainText('Áo');
    await expect(page.getByRole('combobox',{name:'Danh mục'})).toBeEnabled();
    const desktopCategoryBox=await page.getByRole('combobox',{name:'Danh mục'}).boundingBox();
    const desktopStatusBox=await page.getByRole('combobox',{name:'Trạng thái Đang bán',exact:true}).boundingBox();
    expect(desktopCategoryBox?.width||0).toBeGreaterThan(350);
    expect(desktopStatusBox?.width||0).toBeGreaterThan(350);
    expect(Math.abs((desktopCategoryBox?.width||0)-(desktopStatusBox?.width||0))).toBeLessThan(100);
    await page.screenshot({path:resolve(process.cwd(),`evidence/frontend-ui-improvements/UI005/S03-edit-selected-outside-first-page-${test.info().project.name}-${evidenceRunId}.png`),fullPage:true});

    await page.setViewportSize({width:390,height:844});
    const mobileCategoryBox=await page.getByRole('combobox',{name:'Danh mục'}).boundingBox();
    const mobileStatusBox=await page.getByRole('combobox',{name:'Trạng thái Đang bán',exact:true}).boundingBox();
    expect(mobileCategoryBox?.width||0).toBeGreaterThan(300);
    expect(mobileStatusBox?.width||0).toBeGreaterThan(300);
    expect((mobileStatusBox?.y||0)).toBeGreaterThan((mobileCategoryBox?.y||0));
    await page.screenshot({path:resolve(process.cwd(),`evidence/frontend-ui-improvements/UI005/S03-edit-mobile-${test.info().project.name}-${evidenceRunId}.png`),fullPage:true});
    await page.setViewportSize({width:1280,height:720});

    await page.getByLabel('Tìm danh mục').fill('Danh mục UI005 050');
    const p1Search=page.waitForResponse(response=>{
        const url=new URL(response.url());
        return response.request().method()==='GET'&&url.pathname.endsWith('/shops/shop-demo/categories')&&url.searchParams.get('q')==='Danh mục UI005 050';
    });
    await expect(categoryCount(1)).toBeVisible();
    expect((await p1Search).status()).toBe(200);
    await expect(page.getByRole('combobox',{name:'Danh mục'})).toContainText('Áo');
    await page.getByLabel('Tìm danh mục').fill('');
    await expect(categoryCount(20)).toBeVisible();

    await chooseMockOption(page,'Trạng thái thử','Tải chậm');
    await page.getByRole('button',{name:'Tải thêm danh mục'}).click();
    await expect(page.getByRole('button',{name:'Tải thêm danh mục'})).toHaveText('Đang tải…');
    await expect(page.getByLabel('Tên sản phẩm')).toHaveValue('Áo mẫu A');
    await expect(categoryCount(40)).toBeVisible();

    await chooseMockOption(page,'Trạng thái thử','Mất quyền truy vấn tiếp');
    const forbiddenPage=page.waitForResponse(response=>{
        const url=new URL(response.url());
        return response.request().method()==='GET'&&url.pathname.endsWith('/shops/shop-demo/categories')&&url.searchParams.has('cursor');
    });
    await page.getByRole('button',{name:'Tải thêm danh mục'}).click();
    const forbiddenResponse=await forbiddenPage;
    expect(forbiddenResponse.status()).toBe(403);
    const forbiddenCursor=new URL(forbiddenResponse.url()).searchParams.get('cursor');
    const lookupError=page.getByRole('alert').filter({hasText:'Không tải thêm được danh mục'});
    await expect(lookupError).toContainText('HTTP 403');
    await expect(page.getByLabel('Tên sản phẩm')).toHaveValue('Áo mẫu A');
    await expect(page.getByRole('combobox',{name:'Danh mục'})).toContainText('Áo');
    await expect(page.getByRole('combobox',{name:'Danh mục'})).toBeEnabled();
    await page.screenshot({path:resolve(process.cwd(),`evidence/frontend-ui-improvements/UI005/S04-edit-lookup-403-preserves-product-${test.info().project.name}-${evidenceRunId}.png`),fullPage:true});

    await chooseMockOption(page,'Trạng thái thử','Bình thường');
    const retryPage=page.waitForResponse(response=>{
        const url=new URL(response.url());
        return response.request().method()==='GET'&&url.pathname.endsWith('/shops/shop-demo/categories')&&url.searchParams.has('cursor');
    });
    await lookupError.getByRole('button',{name:'Thử lại danh mục'}).click();
    const retryResponse=await retryPage;
    expect(retryResponse.status()).toBe(200);
    expect(new URL(retryResponse.url()).searchParams.get('cursor')).toBe(forbiddenCursor);
    await expect(categoryCount(60)).toBeVisible();
    await expect(page.getByLabel('Tên sản phẩm')).toHaveValue('Áo mẫu A');

    await page.getByLabel('Tên sản phẩm').fill('Áo mẫu A UI005');
    const updateResponse=page.waitForResponse(response=>response.request().method()==='PATCH'&&new URL(response.url()).pathname.endsWith('/shops/shop-demo/products/p1'));
    await page.getByRole('button',{name:'Lưu sản phẩm',exact:true}).click();
    expect((await updateResponse).status()).toBe(200);
    const editCall=apiRequests.find(request=>request.method==='PATCH'&&request.url.endsWith('/shops/shop-demo/products/p1'));
    expect(JSON.parse(editCall?.body||'null')).toEqual({name:'Áo mẫu A UI005'});
    const savedProduct=await page.evaluate(async()=>(await(await fetch('/api/v2/shops/shop-demo/products/p1')).json()).data);
    expect(savedProduct).toMatchObject({name:'Áo mẫu A UI005',categoryId:'cat-0'});

    const evidenceDir=resolve(process.cwd(),'evidence/frontend-ui-improvements/UI005');
    await mkdir(evidenceDir,{recursive:true});
    const evidence={scope:'frontend with synthetic MSW data',totalCategories:105,selectedLastCategory:{id:'cat-2',name:'Phụ kiện'},createPayload:createPayload,editPayload:JSON.parse(editCall?.body||'null'),savedProductCategoryId:savedProduct.categoryId,productQueryStayedVisibleAfterLookup403:true,loadMore403WasRetried:true,apiRequests,apiResponses};
    await writeFile(resolve(evidenceDir,`S03-request-trace-${test.info().project.name}-${evidenceRunId}.json`),JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
    await writeFile(resolve(evidenceDir,`S03-acceptance-${test.info().project.name}-${evidenceRunId}.json`),JSON.stringify({synthetic:true,categoryTotal:105,firstPageCount:20,lastCategorySelectableOnCreate:true,createPayloadCategoryId:'cat-2',selectedLabelRetainedAfterSearch:true,editSelectedCategoryOutsideFirstPage:true,editPayloadOmitsUnchangedCategory:true,storedProductCategoryId:savedProduct.categoryId,loadMoreDelayVisible:true,loadMore403Visible:true,retrySucceeded:true,primaryProductQueryPreserved:true},null,2)+'\n',{flag:'wx'});
    console.log(`UI005 acceptance: ${JSON.stringify({categoryTotal:105,createCategoryId:createPayload.categoryId,editCategoryId:savedProduct.categoryId,categoryRequests:apiResponses.filter(response=>response.url.includes('/categories')).length})}`);
});
