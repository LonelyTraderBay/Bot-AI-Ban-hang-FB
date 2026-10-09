import assert from 'node:assert/strict';

/** Runs through the registered MSW HTTP handlers and canonical response validation. */
export async function runMasterResourceChecks({request,json,reset,writeHeaders,csrf,database,service,run,assertSchema}) {
    let seq=0;
    const shop={shopId:'shop-demo'};
    const write=async(op,body,path=shop,version,key)=>request(op,{path,body,headers:{...writeHeaders(await csrf(),key||`master-${++seq}`),...(version===undefined?{}:{'If-Match':`"${version}"`})}});
    const data=async response=>{assert(response.ok,`${response.status}: ${JSON.stringify(await response.clone().json())}`);return (await json(response)).data;};
    const warehouse={code:'TEST',name:'Kho kiểm chứng',addressLine:'Địa điểm tổng hợp'};
    const account={code:'TEST_ACCOUNT',name:'Tài khoản kiểm chứng',group:'asset'};
    const address={label:'Địa chỉ kiểm chứng',recipient:'Người nhận tổng hợp',phone:'0000000000',line1:'Địa chỉ tổng hợp',ward:null,district:null,province:'Địa bàn mẫu',postalCode:null,countryCode:'VN'};
    const customer=()=>write('createCustomer',{displayName:'Khách kiểm chứng',phone:null,email:null,notes:''}).then(data);
    await run('C05 warehouse CRUD is paginated, versioned and archives without deleting history',async()=>{
        reset();const created=await data(await write('createWarehouse',warehouse));assertSchema('Warehouse',created);
        const list=await request('listWarehouses',{path:shop,query:{limit:1}});assert.equal(list.status,200);const first=await json(list);assert.equal(first.data.length,1);assert.equal(first.page.hasMore,true);
        const next=await json(await request('listWarehouses',{path:shop,query:{limit:1,cursor:first.page.nextCursor}}));assert.notEqual(next.data[0].id,first.data[0].id);
        assert.equal((await write('updateWarehouse',{name:'Tên mới'},{...shop,warehouseId:created.id},created.version)).status,200);
        assert.equal((await write('updateWarehouse',{name:'Không ghi đè'},{...shop,warehouseId:created.id},created.version)).status,412);
        assert.equal((await write('archiveWarehouse',{expectedVersion:2,reason:'Ngừng sử dụng kho mẫu'},{...shop,warehouseId:created.id})).status,202);
        const archived=await data(await request('getWarehouse',{path:{...shop,warehouseId:created.id}}));assert.equal(archived.status,'archived');assert.equal(archived.version,3);
        assert.equal((await write('createWarehouse',warehouse)).status,409);
    });
    await run('C05 owner and manager can manage warehouses; every other role is denied at HTTP',async()=>{
        for(const role of ['owner','manager','sales','warehouse','accountant','bot_admin','viewer']){
            reset();service.setRole(role);assert.equal((await write('createWarehouse',warehouse)).status,['owner','manager'].includes(role)?201:403,role);
        }reset();
    });
    await run('C05 warehouse archive rejects default, stock/reservations, open orders and reorder rules',async()=>{
        reset();assert.equal((await write('archiveWarehouse',{expectedVersion:1,reason:'Không cho ngừng kho mặc định'},{...shop,warehouseId:'warehouse-01'})).status,409);
        for(const kind of ['stock','reserved','order','rule']){
            reset();const w=await data(await write('createWarehouse',{...warehouse,code:kind}));
            if(kind==='stock'||kind==='reserved')database.insert('stock','StockSnapshot','shop-demo',{warehouseId:w.id,onHand:kind==='stock'?1:0,reserved:kind==='reserved'?1:0});
            if(kind==='order')database.insert('orders','Order','shop-demo',{warehouseId:w.id,orderState:'draft'});
            if(kind==='rule')database.insert('reorderRules','ReorderRule','shop-demo',{warehouseId:w.id,enabled:true});
            assert.equal((await write('archiveWarehouse',{expectedVersion:w.version,reason:'Phải kiểm tham chiếu trước ngừng dùng'},{...shop,warehouseId:w.id})).status,409,kind);
        }
    });
    await run('C05 account CRUD protects used code/group and archived journal references',async()=>{
        reset();const a=await data(await write('createAccount',account));assertSchema('Account',a);
        const lines=[{accountId:a.id,debit:{amount:'100',currency:'VND'},credit:{amount:'0',currency:'VND'},description:'Nợ mẫu'},{accountId:'sales',debit:{amount:'0',currency:'VND'},credit:{amount:'100',currency:'VND'},description:'Có mẫu'}];
        const journal=await data(await write('createJournal',{sourceType:'manual',sourceId:'C05-JOURNAL',effectiveDate:'2026-09-29',lines,reason:'Kiểm chứng nguồn tài khoản'}));
        assert.equal((await write('updateAccount',{code:'CHANGED'},{...shop,accountId:a.id},1)).status,409);
        assert.equal((await write('updateAccount',{group:'expense'},{...shop,accountId:a.id},1)).status,409);
        assert.equal((await write('updateAccount',{name:'Tên mới được phép'},{...shop,accountId:a.id},1)).status,200);
        assert.equal((await write('archiveAccount',{expectedVersion:2,reason:'Còn nháp không được ngừng'},{...shop,accountId:a.id})).status,409);
        assert.equal((await write('postJournal',{expectedVersion:journal.version},{...shop,resourceId:journal.id})).status,202);
        assert.equal((await write('archiveAccount',{expectedVersion:2,reason:'Lịch sử đã ghi được giữ'},{...shop,accountId:a.id})).status,202);
        const old=await data(await request('getJournal',{path:{...shop,resourceId:journal.id}}));assert.equal(old.lines[0].accountId,a.id);
        assert.equal((await write('createJournal',{sourceType:'manual',sourceId:'C05-ARCHIVED',effectiveDate:'2026-09-29',lines,reason:'Không được dùng tài khoản cũ'})).status,409);
    });
    await run('C05 only owner/accountant manage accounts; unknown, cross-shop and wrong-currency IDs cannot post',async()=>{
        for(const role of ['owner','manager','sales','warehouse','accountant','bot_admin','viewer']){
            reset();service.setRole(role);assert.equal((await write('createAccount',account)).status,['owner','accountant'].includes(role)?201:403,role);
        }
        for(const id of ['made_up','b-cash']){
            reset();assert.equal((await write('createJournal',{sourceType:'manual',sourceId:'C05-BAD',effectiveDate:'2026-09-29',lines:[{accountId:id,debit:{amount:'100',currency:'VND'},credit:{amount:'0',currency:'VND'},description:'Nợ'},{accountId:'sales',debit:{amount:'0',currency:'VND'},credit:{amount:'100',currency:'VND'},description:'Có'}],reason:'Chặn tài khoản sai scope'})).status,404);
        }
        reset();assert.equal((await write('createJournal',{sourceType:'manual',sourceId:'C05-FX',effectiveDate:'2026-09-29',lines:[{accountId:'cash',debit:{amount:'100',currency:'USD'},credit:{amount:'0',currency:'USD'},description:'Nợ'},{accountId:'sales',debit:{amount:'0',currency:'USD'},credit:{amount:'100',currency:'USD'},description:'Có'}],reason:'Chặn đồng tiền không được phép'})).status,422);
    });
    await run('C05 address CRUD enforces customer, tenant, field masking and a second version conflict',async()=>{
        reset();const c=await customer(),path={...shop,customerId:c.id};const a=await data(await write('createCustomerAddress',address,path));assertSchema('CustomerAddress',a);
        assert.equal((await request('getCustomerAddress',{path:{...shop,customerId:'c1',addressId:a.id}})).status,404);
        assert.equal((await request('getCustomerAddress',{path:{shopId:'shop-second',customerId:'b-c1',addressId:a.id}})).status,404);
        assert.equal((await write('updateCustomerAddress',{line1:'Địa chỉ phiên bản 2'},{...path,addressId:a.id},1)).status,200);
        assert.equal((await write('updateCustomerAddress',{line1:'Bản ghi đè cũ'},{...path,addressId:a.id},1)).status,412);
        assert.equal((await write('updateCustomerAddress',{line1:'Địa chỉ phiên bản 3'},{...path,addressId:a.id},2)).status,200);
        assert.equal((await write('updateCustomerAddress',{line1:'Bản thứ hai đã cũ'},{...path,addressId:a.id},2)).status,412);
        assert.equal((await write('archiveCustomerAddress',{expectedVersion:3,reason:'Không dùng địa chỉ này nữa'},{...path,addressId:a.id})).status,202);
        assert.equal((await data(await request('getCustomerAddress',{path:{...path,addressId:a.id}}))).status,'archived');
        const masked=await data(await request('getCustomerAddress',{path:{...shop,customerId:'c1',addressId:'address-synthetic'}}));assert.equal(masked.phone,null);assert(masked.redactedFields.includes('phone'));
        assert.equal((await write('updateCustomerAddress',{phone:'0000000000'},{...shop,customerId:'c1',addressId:'address-synthetic'},masked.version)).status,403);
        database.find('customers','c1','shop-demo').redactedFields=['addresses'];
        const hidden=await data(await request('listCustomerAddresses',{path:{...shop,customerId:'c1'}}));assert.equal(hidden[0].line1,null);assert.equal(hidden[0].recipient,null);assert.equal(hidden[0].label,null);assert(hidden[0].redactedFields.includes('label'));
        assert.equal((await data(await request('listCustomerAddresses',{path:{...shop,customerId:'c1'},query:{q:'Địa chỉ tổng hợp'}}))).length,0);
        assert.equal((await write('updateCustomerAddress',{label:'Không ghi trường bị che'},{...shop,customerId:'c1',addressId:'address-synthetic'},hidden[0].version)).status,403);
    });
    await run('C05 customer address permission is checked independently of route controls',async()=>{
        for(const role of ['owner','manager','sales','warehouse','accountant','bot_admin','viewer']){
            reset();const c=await customer();service.setRole(role);assert.equal((await write('createCustomerAddress',address,{...shop,customerId:c.id})).status,['owner','manager','sales'].includes(role)?201:403,role);
        }reset();
    });
    await run('C05 confirmed order keeps the quote snapshot after address edits and hides phone in responses',async()=>{
        reset();const quote=await data(await write('quoteOrder',undefined,{...shop,orderId:'DH-1001'}));assert.equal(quote.shippingAddressSnapshot.phone,null);
        const evidence=service.mockCustomerConfirmation('shop-demo',quote.id);const confirmation=await data(await write('recordCustomerConfirmation',evidence,{...shop,orderId:'DH-1001'}));
        const order=database.find('orders','DH-1001','shop-demo');assert.equal((await write('confirmOrder',{expectedVersion:order.version,quoteId:quote.id,customerConfirmationId:confirmation.id},{...shop,orderId:order.id})).status,202);
        const saved=structuredClone(order.shippingAddressSnapshot);
        assert.equal((await write('updateCustomerAddress',{line1:'Địa chỉ mới sau xác nhận'},{...shop,customerId:'c1',addressId:'address-synthetic'},1)).status,200);
        assert.deepEqual(database.find('orders',order.id,'shop-demo').shippingAddressSnapshot,saved);
        const visible=await data(await request('getOrder',{path:{...shop,orderId:order.id}}));assert.equal(visible.shippingAddressSnapshot.line1,saved.line1);assert.equal(visible.shippingAddressSnapshot.phone,null);
        database.find('customers','c1','shop-demo').redactedFields=['addresses'];
        const fullyMasked=await data(await request('getOrder',{path:{...shop,orderId:order.id}}));assert.equal(fullyMasked.shippingAddressSnapshot.label,null);assert.equal(fullyMasked.shippingAddressSnapshot.line1,null);
        assert.deepEqual(database.find('orders',order.id,'shop-demo').shippingAddressSnapshot,saved);
    });
    await run('C05 address changes before confirmation invalidate the quoted shipping snapshot',async()=>{
        reset();const quote=await data(await write('quoteOrder',undefined,{...shop,orderId:'DH-1001'})),evidence=service.mockCustomerConfirmation('shop-demo',quote.id),confirmation=await data(await write('recordCustomerConfirmation',evidence,{...shop,orderId:'DH-1001'}));
        await data(await write('updateCustomerAddress',{line1:'Địa chỉ đổi trước xác nhận'},{...shop,customerId:'c1',addressId:'address-synthetic'},1));
        assert.equal((await write('confirmOrder',{expectedVersion:database.find('orders','DH-1001','shop-demo').version,quoteId:quote.id,customerConfirmationId:confirmation.id},{...shop,orderId:'DH-1001'})).status,409);
        assert.equal(database.find('orders','DH-1001','shop-demo').orderState,'draft');
    });
    await run('C05 invalid schemas, missing version and repeated idempotency are validated over HTTP',async()=>{
        reset();assert.equal((await write('createWarehouse',{...warehouse,code:''})).status,422);assert.equal((await write('createAccount',{...account,group:'unknown'})).status,422);
        const a=await data(await write('createAccount',account,shop,undefined,'C05-SAME'));const b=await data(await write('createAccount',account,shop,undefined,'C05-SAME'));assert.equal(a.id,b.id);
        assert.equal((await write('createAccount',{...account,name:'Ý định khác'},shop,undefined,'C05-SAME')).status,409);
        assert.equal((await write('updateAccount',{name:'Thiếu phiên bản'},{...shop,accountId:a.id})).status,428);
        assert.equal((await write('updateAccount',{name:'Sai tenant'},{shopId:'shop-second',accountId:a.id},1)).status,404);
    });
    await run('C05 warehouses and future variants create zero inventory per active location without fabricating balances',async()=>{
        reset();const w=await data(await write('createWarehouse',warehouse));
        const stocked=database.all('stock','shop-demo').filter(row=>row.warehouseId===w.id);
        assert(stocked.length>0);assert(stocked.every(row=>row.onHand===0&&row.reserved===0&&row.available===0&&row.unitCost===null));
        const product=await data(await write('createProduct',{name:'Sản phẩm nhiều kho',description:'',categoryId:null,status:'active',variants:[{sku:'C05-MULTI',name:'Biến thể mẫu',price:{amount:'100',currency:'VND'},options:{},active:true}],imageFileIds:[]}));
        const stock=database.all('stock','shop-demo').filter(row=>row.variantId===product.variants[0].id);
        assert.deepEqual(new Set(stock.map(row=>row.warehouseId)),new Set(['warehouse-01',w.id]));
        assert(stock.every(row=>row.onHand===0&&row.reserved===0&&row.available===0));
        assert.equal((await write('createWarehouse',{...warehouse,code:'SPACES',name:'   '})).status,422);
        assert.equal((await write('createAccount',{...account,name:'   '})).status,422);
        assert.equal((await write('updateWarehouse',{addressLine:'   '},{...shop,warehouseId:w.id},1)).status,422);
    });
    await run('C05 master events agree with canonical EventEnvelope and duplicate writes emit no second event',async()=>{
        reset();const events=[];const unsubscribe=service.subscribeChanges(event=>events.push(event));
        try {
            const w=await data(await write('createWarehouse',warehouse,shop,undefined,'C05-EVENT'));
            await data(await write('createWarehouse',warehouse,shop,undefined,'C05-EVENT'));
            assert.equal(events.length,1);assertSchema('EventEnvelope',events[0]);
            assert.equal(events[0].type,'warehouse.updated');assert.equal(events[0].resourceId,w.id);assert.equal(events[0].resourceVersion,1);
            const a=await data(await write('createAccount',account));assert.equal(events.at(-1).type,'account.updated');assertSchema('EventEnvelope',events.at(-1));
            const c=await customer(),addressRecord=await data(await write('createCustomerAddress',address,{...shop,customerId:c.id}));
            assert.equal(events.at(-1).type,'customer_address.updated');assert.equal(events.at(-1).resourceId,addressRecord.id);assertSchema('EventEnvelope',events.at(-1));
            assert(a.id);
        }finally{unsubscribe();}
    });
    reset();
}
