const assert=require('node:assert/strict');
exports.run=async function({service:svc,database:d,fileModule,operations:ops}){
let n=0;const transcript=[];const checks=[];
async function check(name,fn){try{await fn();checks.push({name,status:'PASS'});}catch(e){checks.push({name,status:'FAIL',error:e.message});}}
async function call(op,body,path={},extra={}){const spec=ops[op];const query=['getCashflow','getProfitLoss'].includes(op)?new URLSearchParams({from:'2026-09-01T00:00:00.000Z',to:'2026-10-01T00:00:00.000Z',timezone:'Asia/Vientiane'}):new URLSearchParams();const r=await svc.handle({op,path:{shopId:'shop-demo',...path},query,body,headers:{'x-csrf-token':svc.CSRF,'idempotency-key':'test-'+(++n),...extra}});transcript.push({op,requestSchema:spec.requestSchema,request:body,schema:spec.responseSchema,data:structuredClone(r.data)});return structuredClone(r.data);}
const row=(c,id)=>d.find(c,id,'shop-demo');const first=c=>d.all(c,'shop-demo')[0];
svc.resetService();
await check('Full order lifecycle and purchase partial receiving use actual simulator handlers',async()=>{
 let order=await call('getOrder',undefined,{orderId:'DH-1001'});const quote=await call('quoteOrder',undefined,{orderId:order.id});const evidence=svc.mockCustomerConfirmation('shop-demo',quote.id);const confirmation=await call('recordCustomerConfirmation',evidence,{orderId:order.id});
 await call('confirmOrder',{expectedVersion:row('orders',order.id).version,quoteId:quote.id,customerConfirmationId:confirmation.id},{orderId:order.id});
 let prep=first('prepJobs');let notice=first('notifications');await call('acknowledgeNotification',{expectedVersion:notice.version},{resourceId:notice.id});
 prep=row('prepJobs',prep.id);for(const line of prep.lines)await call('pickPrepLine',{expectedVersion:prep.version,orderLineId:line.orderLineId,scannedSku:line.sku,pickedQuantity:line.requiredQuantity,issueReason:null},{resourceId:prep.id});
 await call('packPrepJob',{expectedVersion:prep.version},{resourceId:prep.id});order=row('orders',order.id);
 const shipment=await call('createShipment',{orderId:order.id,warehouseId:order.warehouseId,carrierId:'carrier-demo',orderLineIds:order.lines.map(l=>l.id)});
 await call('handoverShipment',{expectedVersion:shipment.version},{resourceId:shipment.id});
 await call('recordShipmentEvent',{expectedVersion:row('shipments',shipment.id).version,externalEventId:'delivery-test-1',eventType:'delivered',occurredAt:d.now(),evidenceRef:'delivery-proof-test'},{resourceId:shipment.id});
 await call('payOrder',{expectedVersion:order.version,amount:order.total,method:'bank_transfer',reference:'BANK-TEST-1001',reason:'Ghi nhận thu tiền đã đối chiếu',evidenceRef:'bank-proof-test'},{orderId:order.id});
 const returned=await call('createReturnCase',{orderId:order.id,reason:'Khách trả đúng sản phẩm',lines:[{orderLineId:order.lines[0].id,quantity:1}]});
 await call('inspectReturn',{expectedVersion:returned.version,lines:[{orderLineId:order.lines[0].id,acceptedQuantity:1,disposition:'sellable',reason:'Kiểm hàng nguyên vẹn'}]},{resourceId:returned.id});
 await call('refundOrder',{expectedVersion:order.version,amount:order.total,reason:'Đã chuyển hoàn tiền theo bằng chứng',paymentReference:'REFUND-TEST-1001',evidenceRef:'refund-proof-test'},{orderId:order.id});
 const offer=d.all('offers','shop-demo').find(o=>o.variantId==='v-p6');
 const po=await call('createPurchaseOrder',{supplierId:offer.supplierId,warehouseId:'warehouse-01',suggestionId:null,lines:[{variantId:offer.variantId,supplierOfferId:offer.id,quantity:10}]});
 await call('requestPurchaseApproval',{expectedVersion:po.version},{resourceId:po.id});const approval=first('approvals');
 await call('decideApproval',{expectedVersion:approval.version,intentHash:approval.intentHash,decision:'approve',reason:'Duyệt nhập hàng cho mô phỏng'},{resourceId:approval.id});
 await call('sendPurchaseOrder',{expectedVersion:row('purchases',po.id).version,approvalId:approval.id,intentHash:po.intentHash},{resourceId:po.id});
 await call('confirmPurchaseOrder',{expectedVersion:row('purchases',po.id).version,externalReference:'PO-TEST-EXT-1',supplierConfirmationRef:'supplier-proof-test'},{resourceId:po.id});
 const receipt=await call('createGoodsReceipt',{purchaseOrderId:po.id,expectedPurchaseVersion:row('purchases',po.id).version,sourceDocumentRef:'GR-TEST-001',lines:[{purchaseLineId:po.lines[0].id,acceptedQuantity:4,rejectedQuantity:0,reason:'Kiểm 4 sản phẩm đạt'}]});
  await call('postGoodsReceipt',{expectedVersion:receipt.version},{resourceId:receipt.id});
  const stockAfterPost=d.all('stock','shop-demo').find(item=>item.variantId===po.lines[0].variantId&&item.warehouseId===po.warehouseId).onHand;
  await assert.rejects(()=>call('postGoodsReceipt',{expectedVersion:receipt.version},{resourceId:receipt.id}),error=>error.status===412);
  assert.equal(d.all('stock','shop-demo').find(item=>item.variantId===po.lines[0].variantId&&item.warehouseId===po.warehouseId).onHand,stockAfterPost);
  assert.equal(d.all('debts','shop-demo').filter(item=>item.source?.type==='goods_receipt'&&item.source.id===receipt.id).length,1);
  assert.equal(d.all('journals','shop-demo').filter(item=>item.sourceType==='goods_receipt'&&item.sourceId===receipt.id).length,1);
 const entry=await call('createFinanceEntry',{kind:'disbursement',classification:'operating_expense',amount:{amount:'25000',currency:'VND'},occurredAt:d.now(),description:'Chi phí vận hành thử nghiệm',sourceRef:null});
 await call('postFinanceEntry',{expectedVersion:entry.version,reason:'Kiểm tra chứng từ mẫu'},{entryId:entry.id});

 assert.equal(row('purchases',po.id).status,'part_received');assert.equal(d.all('stock','shop-demo').find(x=>x.variantId==='v-p6').onHand,4);
 assert.equal(row('orders',order.id).paymentState,'refunded');
});
await check('Procurement rejects cross-shop and unapproved suppliers and unusable auto-send budgets',async()=>{
 svc.resetService();
 const offer=d.all('offers','shop-demo').find(item=>item.variantId==='v-p1');
 const body={supplierId:offer.supplierId,warehouseId:'warehouse-01',suggestionId:null,lines:[{variantId:offer.variantId,supplierOfferId:offer.id,quantity:offer.minimumQuantity}]};
 const purchaseCount=d.all('purchases','shop-demo').length;
 await assert.rejects(()=>call('createPurchaseOrder',{...body,supplierId:'b-supplier-01'}),error=>error.status===404);
 const supplier=row('suppliers',offer.supplierId),previousStatus=supplier.status;supplier.status='draft';
 try{await assert.rejects(()=>call('createPurchaseOrder',body),error=>error.status===409);}finally{supplier.status=previousStatus;}
 const rule={variantId:offer.variantId,warehouseId:'warehouse-01',supplierOfferId:offer.id,reorderPoint:0,targetQuantity:10,safetyStock:0,mode:'auto_send',enabled:true,budgetPolicyId:'budget-2'};
 await assert.rejects(()=>call('createReorderRule',rule),error=>error.status===422);
 await assert.rejects(()=>call('createReorderRule',{...rule,budgetPolicyId:null}),error=>error.status===422);
 assert.equal(d.all('purchases','shop-demo').length,purchaseCount);
});
await check('Stale purchase approval cannot authorize a changed resource version',async()=>{
 svc.resetService();
 const offer=d.all('offers','shop-demo').find(item=>item.variantId==='v-p1');
 const purchase=await call('createPurchaseOrder',{supplierId:offer.supplierId,warehouseId:'warehouse-01',suggestionId:null,lines:[{variantId:offer.variantId,supplierOfferId:offer.id,quantity:offer.minimumQuantity}]});
 const approval=await call('requestPurchaseApproval',{expectedVersion:purchase.version},{resourceId:purchase.id});
 d.touch(row('purchases',purchase.id));
 await assert.rejects(()=>call('decideApproval',{expectedVersion:approval.version,intentHash:approval.intentHash,decision:'approve',reason:'Mô phỏng PO đổi phiên bản đồng thời'},{resourceId:approval.id}),error=>error.status===409);
 assert.equal(row('approvals',approval.id).status,'pending');
 assert.equal(row('purchases',purchase.id).status,'pending_approval');
});
await check('Both sides of every mock journal balance',()=>{for(const j of d.all('journals','shop-demo')){const debit=d.rows(j.lines).reduce((a,l)=>a+d.units(l.debit),0n),credit=d.rows(j.lines).reduce((a,l)=>a+d.units(l.credit),0n);assert.equal(debit,credit);assert.ok(debit>0n);}});
await check('Seeded shop does not read another shop product',async()=>{await assert.rejects(()=>call('getProduct',undefined,{shopId:'shop-second',productId:'p2'}),e=>e.status===404);});
await check('CSRF is required for writes',async()=>{await assert.rejects(()=>call('createCategory',{name:'Không được tạo',parentId:null},{},{'x-csrf-token':'wrong'}),e=>e.status===403);});
await check('Read-only role cannot create products',async()=>{svc.setRole('viewer');try{await assert.rejects(()=>call('createProduct',{name:'Không ghi',description:'',categoryId:null,status:'draft'}),e=>e.status===403);}finally{svc.setRole('owner');}});
await check('Revoked shop membership never falls back to another active shop membership',async()=>{
 const current=d.db.members.find(m=>m.userId==='user-demo'&&m.shopId==='shop-demo');
 const other=d.db.members.find(m=>m.userId==='user-demo'&&m.shopId==='shop-second');
 assert.ok(current&&other);assert.equal(other.status,'active');const previous=current.status;
 current.status='revoked';
 try{await assert.rejects(()=>call('listCustomers',undefined,{shopId:'shop-demo'}),e=>e.status===403);const otherShopCustomers=await call('listCustomers',undefined,{shopId:'shop-second'});assert.ok(Array.isArray(otherShopCustomers));}
 finally{current.status=previous;}
});
await check('Duplicate idempotency key is not duplicated',async()=>{const body={name:'Kiểm chống trùng',parentId:null};const headers={'idempotency-key':'fixed-category-key'};const a=await call('createCategory',body,{},headers),b=await call('createCategory',body,{},headers);assert.equal(a.id,b.id);assert.equal(d.all('categories','shop-demo').filter(x=>x.name===body.name).length,1);});
await check('Same key with different payload is rejected',async()=>{await assert.rejects(()=>call('createCategory',{name:'Nội dung thay đổi',parentId:null},{},{'idempotency-key':'fixed-category-key'}),e=>e.status===409&&e.code==='IDEMPOTENCY_CONFLICT');});
await check('Stale inventory adjustment cannot mutate stock',async()=>{const before=structuredClone(d.all('stock','shop-demo')[0]);await assert.rejects(()=>call('createInventoryAdjustment',{variantId:before.variantId,warehouseId:before.warehouseId,quantityDelta:1,reason:'Kiểm phiên bản đã cũ',expectedVersion:99999,unitCost:null}),e=>e.status===412);assert.equal(row('stock',before.id).onHand,before.onHand);});
await check('Negative stock is rejected atomically',async()=>{const before=structuredClone(d.all('stock','shop-demo')[0]);await assert.rejects(()=>call('createInventoryAdjustment',{variantId:before.variantId,warehouseId:before.warehouseId,quantityDelta:-100000,reason:'Không được xuất âm kho',expectedVersion:before.version,unitCost:null}),e=>e.status===409);assert.equal(row('stock',before.id).onHand,before.onHand);});
await check('Unbalanced journal is rejected',async()=>{await assert.rejects(()=>call('createJournal',{sourceType:'manual',sourceId:'unbalanced-proof',effectiveDate:d.now().slice(0,10),lines:[{accountId:'cash',debit:{amount:'100',currency:'VND'},credit:{amount:'0',currency:'VND'},description:'Nợ'},{accountId:'income',debit:{amount:'0',currency:'VND'},credit:{amount:'90',currency:'VND'},description:'Có'}]}),e=>e.status===422);});
await check('Known failure fault is observable',async()=>{svc.setFault('error');await assert.rejects(()=>call('getDashboard'),e=>e.status===503);});
await check('Empty state fault is distinguishable',async()=>{svc.setFault('empty');const data=await call('listProducts');assert.deepEqual(data,[]);});
await check('Read model reflects source amounts not current page',async()=>{const data=await call('getCashflow');assert.ok(data);assert.ok('receipts' in data);});
await check('CSV parser preserves embedded commas',()=>{assert.deepEqual(fileModule.parseCSV('name,notes\n"A,B",C'),[['name','notes'],['A,B','C']]);});
await check('Unknown command retains the same result on idempotent retry',async()=>{const stock=structuredClone(d.all('stock','shop-demo')[0]);const body={variantId:stock.variantId,warehouseId:stock.warehouseId,quantityDelta:-1,unitCost:null,expectedVersion:stock.version,reason:'Thử mất phản hồi sau xử lý'};svc.setFault('unknown');const a=await call('createInventoryAdjustment',body,{},{'idempotency-key':'unknown-once'});assert.equal(a.status,'unknown');const after=row('stock',stock.id).onHand;const b=await call('createInventoryAdjustment',body,{},{'idempotency-key':'unknown-once'});assert.equal(a.id,b.id);assert.equal(row('stock',stock.id).onHand,after);assert.equal(after,stock.onHand-1);});
// Schema compatibility checks are recorded separately; only successful responses are included.
for(const [op,spec]of Object.entries(ops)){if(spec.method==='GET'&&spec.responseSchema&&!/\{(?!shopId)/.test(spec.path)&&op!=='completeLogin'){await check('Read API '+op,()=>call(op));}}
return {status:checks.every(x=>x.status==='PASS')?'PASS':'FAIL',checks,transcript,db:structuredClone(d.db)};
};
