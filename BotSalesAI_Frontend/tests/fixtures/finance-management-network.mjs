import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/** Canonical MSW HTTP journey; expected amounts come from the owning golden fixture. */
export async function runFinanceManagementChecks({root,request,json,reset,writeHeaders,csrf,database,service,run,assertSchema}) {
    const expected=JSON.parse(fs.readFileSync(path.join(root,'../botsales-kit/fixtures/finance-golden.json'),'utf8'));
    const shop={shopId:'shop-demo'},query={from:'2026-09-01T00:00:00Z',to:'2026-10-01T00:00:00Z',timezone:'Asia/Vientiane'};
    let serial=0;
    const data=async response=>{assert(response.ok,`${response.status}: ${JSON.stringify(await response.clone().json())}`);return (await json(response)).data;};
    const write=async(op,body,path=shop,version,key)=>request(op,{path,body,headers:{...writeHeaders(await csrf(),key||`finance-${++serial}`),...(version===undefined?{}:{'If-Match':`"${version}"`})}});
    const expectStatus=async(response,status)=>assert.equal(response.status,status,JSON.stringify(await response.clone().json()));
    const current=(collection,id)=>database.find(collection,id,'shop-demo');
    const money=amount=>({amount:String(amount),currency:'VND'});
    const account=code=>database.all('accounts','shop-demo').find(a=>a.code===code);
    const journalLines=(debitCode,creditCode,amount)=>[{accountId:account(debitCode).id,debit:money(amount),credit:money(0),description:'Nợ kiểm chứng'},{accountId:account(creditCode).id,debit:money(0),credit:money(amount),description:'Có kiểm chứng'}];
    function emptyBusiness() {
        reset();const keep=new Set(['shops','members','accounts','warehouses','periods','products','customers','addresses','suppliers','offers','bots','privacyPolicies','notificationPolicies','conversations']);
        for(const collection of Object.keys(database.db))if(!keep.has(collection))database.db[collection]=database.db[collection].filter(r=>r.shopId!=='shop-demo');
        for(const product of database.all('products','shop-demo'))for(const variant of product.variants)database.insert('stock','StockSnapshot','shop-demo',{variantId:variant.id,warehouseId:'warehouse-01',sku:variant.sku,onHand:0,reserved:0,available:0,lowStockThreshold:0,unitCost:null,carryingValue:money(0),asOf:database.now()});
        for(const period of database.all('periods','shop-demo'))period.state='open';
    }
    async function open(amount='2000000') {
        const opening=await data(await write('createOpeningBalance',{effectiveDate:'2026-09-01',policyVersion:'synthetic-policy-1',lines:amount==='0'?[]:journalLines('112','411',amount),inventory:[],reason:'Mở sổ theo số dư quản trị tổng hợp'}));
        await expectStatus(await write('postOpeningBalance',{expectedVersion:opening.version},{...shop,openingId:opening.id}),202);return opening;
    }
    async function importBank(text,batch) {
        const form=new FormData();form.append('purpose','bank_statement');form.append('resourceId',account('112').id);form.append('file',new File([text],'bank.csv',{type:'text/csv'}));
        const file=await data(await request('uploadFile',{path:shop,form,headers:writeHeaders(await csrf(),`finance-file-${++serial}`)}));
        const body={fileId:file.id,accountOrCarrierId:account('112').id,formatId:'botsales-csv-v1',sourceBatchId:batch};
        const preview=await data(await write('previewStatementImport',body));assert.equal(preview.invalidRows,0);
        const job=await data(await write('importBankStatement',{...body,validationToken:preview.validationToken}));assert.equal(job.status,'succeeded');return {file,body,preview,job};
    }
    async function reports(profit) {
        const p=await data(await request('getProfitLoss',{path:shop,query}));assertSchema('ProfitLoss',p);assert.equal(p.completeness,'complete',p.warnings.join('; '));assert.equal(p.operatingProfit.amount,profit);
        const b=await data(await request('getBalanceSheet',{path:shop,query:{atDate:'2026-09-29'}}));assertSchema('BalanceSheet',b);assert.equal(b.balanced,true);assert.equal(b.difference.amount,'0');
        const t=await data(await request('getTrialBalance',{path:shop,query}));assert.equal(t.balanced,true);assert.equal(t.totalDebit.amount,t.totalCredit.amount);assert.equal(t.closingDebit.amount,t.closingCredit.amount);return {p,b,t};
    }
    await run('C06 golden HTTP: opening, receipt, supplier settlement, dispatch/delivery, COD, return and observed refund balance at every stage',async()=>{
        emptyBusiness();await open();
        const offer=database.all('offers','shop-demo').find(o=>o.variantId==='v-p6');offer.unitCost=money(100000);offer.minimumQuantity=1;offer.packSize=1;
        const product=database.all('products','shop-demo').find(p=>p.variants.some(v=>v.id==='v-p6'));product.variants.find(v=>v.id==='v-p6').price=money(150000);
        const po=await data(await write('createPurchaseOrder',{supplierId:offer.supplierId,warehouseId:'warehouse-01',suggestionId:null,lines:[{variantId:offer.variantId,supplierOfferId:offer.id,quantity:10}]}));
        await write('requestPurchaseApproval',{expectedVersion:po.version},{...shop,resourceId:po.id});const approval=database.all('approvals','shop-demo')[0];
        await expectStatus(await write('decideApproval',{expectedVersion:approval.version,intentHash:approval.intentHash,decision:'approve',reason:'Chủ shop duyệt đúng đơn mua golden'},{...shop,resourceId:approval.id}),200);
        await expectStatus(await write('sendPurchaseOrder',{expectedVersion:current('purchases',po.id).version,approvalId:approval.id,intentHash:po.intentHash},{...shop,resourceId:po.id}),202);
        await data(await write('confirmPurchaseOrder',{expectedVersion:current('purchases',po.id).version,externalReference:'GOLDEN-PO',supplierConfirmationRef:'synthetic-supplier-proof'},{...shop,resourceId:po.id}));
        const receipt=await data(await write('createGoodsReceipt',{purchaseOrderId:po.id,expectedPurchaseVersion:current('purchases',po.id).version,sourceDocumentRef:'GOLDEN-RECEIPT',lines:[{purchaseLineId:po.lines[0].id,acceptedQuantity:10,rejectedQuantity:0,reason:'Kiểm nhận đủ 10 sản phẩm'}]}));
        await expectStatus(await write('postGoodsReceipt',{expectedVersion:receipt.version},{...shop,resourceId:receipt.id}),202);
        await reports('0');
        const bankHeader='externalTransactionId,amount,currency,direction,occurredAt,referenceText\n';
        await importBank(bankHeader+'GOLDEN-SUPPLIER,1000000,VND,debit,2026-09-29T14:00:00Z,Thanh toán NCC có nguồn\n','GOLDEN-SUPPLIER');
        const settlement=database.all('reconciliations','shop-demo').at(-1),debt=database.all('debts','shop-demo')[0];
        await expectStatus(await write('matchSettlement',{expectedVersion:settlement.version,transactionId:settlement.transactionId,allocations:[{resource:{type:'debt',id:debt.id},amount:money(1000000)}],reason:'Đối chiếu chứng từ ngân hàng tổng hợp'},{...shop,resourceId:settlement.id}),202);
        await reports('0');
        const conversation=database.all('conversations','shop-demo').find(c=>c.customerId==='c1');
        const order=await data(await write('createOrder',{customerId:'c1',conversationId:conversation.id,warehouseId:'warehouse-01',lines:[{variantId:'v-p6',quantity:2}],notes:'',paymentMethod:'cod',shippingAddressId:null}));
        await data(await write('updateOrderDraft',{shippingAddressId:'address-synthetic'},{...shop,orderId:order.id},order.version));
        const quote=await data(await write('quoteOrder',undefined,{...shop,orderId:order.id})),confirmation=await data(await write('recordCustomerConfirmation',service.mockCustomerConfirmation('shop-demo',quote.id),{...shop,orderId:order.id}));
        await expectStatus(await write('confirmOrder',{expectedVersion:current('orders',order.id).version,quoteId:quote.id,customerConfirmationId:confirmation.id},{...shop,orderId:order.id}),202);
        const prep=database.all('prepJobs','shop-demo')[0],notice=database.all('notifications','shop-demo')[0];await data(await write('acknowledgeNotification',{expectedVersion:notice.version},{...shop,resourceId:notice.id}));
        for(const line of prep.lines)await data(await write('pickPrepLine',{expectedVersion:prep.version,orderLineId:line.orderLineId,scannedSku:line.sku,pickedQuantity:line.requiredQuantity,issueReason:null},{...shop,resourceId:prep.id}));
        await data(await write('packPrepJob',{expectedVersion:prep.version},{...shop,resourceId:prep.id}));
        const shipment=await data(await write('createShipment',{orderId:order.id,warehouseId:'warehouse-01',carrierId:'carrier-demo',orderLineIds:current('orders',order.id).lines.map(l=>l.id)}));
        await expectStatus(await write('handoverShipment',{expectedVersion:shipment.version},{...shop,resourceId:shipment.id}),202);await reports('0');
        await data(await write('recordShipmentEvent',{expectedVersion:current('shipments',shipment.id).version,externalEventId:'GOLDEN-DELIVERY',eventType:'delivered',occurredAt:'2026-09-29T14:00:00Z',evidenceRef:'synthetic-delivery-proof'},{...shop,resourceId:shipment.id}));await reports('100000');
        const codForm=new FormData();codForm.append('purpose','cod_statement');codForm.append('resourceId','carrier-demo');codForm.append('file',new File([`externalBatchId,orderIds\nGOLDEN-COD,${order.id}\n`],'cod.csv',{type:'text/csv'}));
        const codFile=await data(await request('uploadFile',{path:shop,form:codForm,headers:writeHeaders(await csrf(),`finance-cod-${++serial}`)})),codBody={fileId:codFile.id,accountOrCarrierId:'carrier-demo',formatId:'botsales-csv-v1',sourceBatchId:'GOLDEN-COD'};
        const preview=await data(await write('previewStatementImport',codBody));assert.equal(preview.invalidRows,0);await data(await write('importCODStatement',{...codBody,validationToken:preview.validationToken}));
        await importBank(bankHeader+'GOLDEN-COD-BANK,280000,VND,credit,2026-09-29T14:00:00Z,COD thực nhận\n','GOLDEN-COD-BANK');
        const cod=database.all('codSettlements','shop-demo')[0],tx=database.all('bankTransactions','shop-demo').find(t=>t.externalTransactionId==='GOLDEN-COD-BANK');
        await expectStatus(await write('matchCODSettlement',{expectedVersion:cod.version,bankTransactionId:tx.id,actualFees:money(20000),feeEvidenceRef:'synthetic-carrier-invoice',reason:'Tiền thực và phí thực được đối chiếu'},{...shop,resourceId:cod.id}),202);
        const sale=await reports(expected.expectedAfterSale.profit);assert.equal(sale.p.netSales.amount,expected.expectedAfterSale.sales);assert.equal(sale.p.cogs.amount,expected.expectedAfterSale.cogs);
        const bankBalance=sale.b.rows.find(r=>r.code==='112'),stockBalance=sale.b.rows.find(r=>r.code==='156');assert.equal(bankBalance.balance.amount,expected.expectedAfterSale.bank);assert.equal(stockBalance.balance.amount,expected.expectedAfterSale.inventory);
        const returned=await data(await write('createReturnCase',{orderId:order.id,reason:'Khách trả một sản phẩm nguyên vẹn',lines:[{orderLineId:current('orders',order.id).lines[0].id,quantity:1}]}));
        await data(await write('inspectReturn',{expectedVersion:returned.version,lines:[{orderLineId:current('orders',order.id).lines[0].id,acceptedQuantity:1,disposition:'sellable',reason:'Kiểm hàng bán lại được'}]},{...shop,resourceId:returned.id}));await reports(expected.returnExtension.expectedAfterObservedRefund.profit);
        await expectStatus(await write('refundOrder',{expectedVersion:current('orders',order.id).version,amount:money(150000),reason:'Khoản hoàn có bằng chứng tổng hợp',paymentReference:'GOLDEN-REFUND',evidenceRef:'synthetic-refund-proof'},{...shop,orderId:order.id}),202);
        const after=await reports(expected.returnExtension.expectedAfterObservedRefund.profit);assert.equal(after.b.rows.find(r=>r.code==='112').balance.amount,expected.returnExtension.expectedAfterObservedRefund.bank);assert.equal(after.b.rows.find(r=>r.code==='156').balance.amount,expected.returnExtension.expectedAfterObservedRefund.inventory);
        const first=await data(await request('getLedger',{path:shop,query:{...query,accountId:account('112').id,limit:1}})),second=await data(await request('getLedger',{path:shop,query:{...query,accountId:account('112').id,limit:1,cursor:first.page.nextCursor}}));assert.equal(first.totalDebit.amount,second.totalDebit.amount);assert.equal(first.closingBalance.amount,expected.returnExtension.expectedAfterObservedRefund.bank);assert.equal(first.closingBalance.amount,second.closingBalance.amount);assert.notEqual(first.entries[0].id,second.entries[0].id);
        assert(database.all('journals','shop-demo').every(j=>j.status==='posted'));assert.equal(database.all('debts','shop-demo').every(d=>d.outstandingAmount.amount==='0'),true);
    });
    await run('C06 opening rejects imbalance, inventory mismatch, cross-shop, stale and duplicate posting without replacing history',async()=>{
        emptyBusiness();const body={effectiveDate:'2026-09-01',policyVersion:'synthetic-policy-1',lines:journalLines('112','411','100'),inventory:[],reason:'Mở sổ tổng hợp để kiểm chứng'};
        await expectStatus(await write('createOpeningBalance',{...body,lines:[body.lines[0]]}),422);
        await expectStatus(await write('createOpeningBalance',{...body,inventory:[{variantId:'v-p6',warehouseId:'warehouse-01',quantity:1,unitCost:money(100)}]}),422);
        await expectStatus(await write('createOpeningBalance',{...body,inventory:[{variantId:'v-p6',warehouseId:'b-warehouse-01',quantity:1,unitCost:money(100)}]}),404);
        const opening=await data(await write('createOpeningBalance',body));await data(await write('updateOpeningBalance',{...body,reason:'Cập nhật lý do có phiên bản'},{...shop,openingId:opening.id},1));
        await expectStatus(await write('postOpeningBalance',{expectedVersion:1},{...shop,openingId:opening.id}),412);
        await expectStatus(await write('postOpeningBalance',{expectedVersion:2},{...shop,openingId:opening.id},undefined,'C06-OPENING-ONCE'),202);
        await expectStatus(await write('postOpeningBalance',{expectedVersion:2},{...shop,openingId:opening.id},undefined,'C06-OPENING-ONCE'),202);assert.equal(database.all('journals','shop-demo').length,1);
        await expectStatus(await write('createOpeningBalance',body),409);
    });
    await run('C06 periods reject overlaps and posting after concurrent close; drafts and missing source prevent closing',async()=>{
        emptyBusiness();await open('0');const period=database.all('periods','shop-demo')[0];
        await expectStatus(await write('createAccountingPeriod',{startDate:'2026-09-15',endDate:'2026-10-15',reason:'Kỳ chồng lấn bị chặn'}),409);
        await data(await write('createAccountingPeriod',{startDate:'2026-10-01',endDate:'2026-10-31',reason:'Mở kỳ mới không chồng lấn'}));
        const journal=await data(await write('createJournal',{sourceType:'manual',sourceId:'C06-period-race',effectiveDate:'2026-09-29',lines:journalLines('111','411','100'),reason:'Bút toán kiểm cạnh tranh khóa kỳ'}));
        await expectStatus(await write('closeAccountingPeriod',{expectedVersion:period.version},{...shop,resourceId:period.id}),409);
        current('periods',period.id).state='closed';const before=database.all('journals','shop-demo').length;
        await expectStatus(await write('postJournal',{expectedVersion:journal.version},{...shop,resourceId:journal.id}),409);assert.equal(current('journals',journal.id).status,'draft');assert.equal(database.all('journals','shop-demo').length,before);
        current('periods',period.id).state='open';await expectStatus(await write('postJournal',{expectedVersion:journal.version},{...shop,resourceId:journal.id}),202);
        await expectStatus(await write('closeAccountingPeriod',{expectedVersion:period.version},{...shop,resourceId:period.id}),202);
        emptyBusiness();await open('0');database.insert('financeEntries','FinanceEntry','shop-demo',{kind:'receipt',classification:'other',amount:money(1),status:'posted',occurredAt:database.now(),description:'Thiếu nguồn bút toán',sourceRef:null,reversalOf:null});
        const p=database.all('periods','shop-demo')[0];await expectStatus(await write('closeAccountingPeriod',{expectedVersion:p.version},{...shop,resourceId:p.id}),409);
        const report=await data(await request('getProfitLoss',{path:shop,query}));assert.equal(report.completeness,'incomplete');assert.equal(report.operatingProfit,null);assert(report.warnings.some(w=>w.includes('chưa có nguồn bút toán')));
    });
    await run('C06 reversal preserves original lines and replacement uses a new source revision, while automatic stock sources cannot be forged',async()=>{
        emptyBusiness();await open('0');const lines=journalLines('111','411','100');
        const journal=await data(await write('createJournal',{sourceType:'manual',sourceId:'C06-replace',effectiveDate:'2026-09-15',lines,reason:'Bút toán gốc có nguồn'}));
        await expectStatus(await write('postJournal',{expectedVersion:journal.version},{...shop,resourceId:journal.id}),202);
        await expectStatus(await write('reverseJournal',{expectedVersion:current('journals',journal.id).version,reason:'Đảo để thay bằng chứng từ đúng'},{...shop,resourceId:journal.id}),202);
        assert.deepEqual(current('journals',journal.id).lines,lines);
        const replacement=await data(await write('createJournal',{sourceType:'manual',sourceId:'C06-replace',replacesJournalId:journal.id,effectiveDate:'2026-09-29',lines:journalLines('111','411','120'),reason:'Thay thế chứng từ đã đảo'}));assert.equal(replacement.sourceRevision,1);
        await expectStatus(await write('postJournal',{expectedVersion:replacement.version},{...shop,resourceId:replacement.id}),202);
        const b=await data(await request('getBalanceSheet',{path:shop,query:{atDate:'2026-09-29'}}));assert.equal(b.assets.amount,'120');assert.equal(b.equity.amount,'120');assert.equal(b.balanced,true);
        await expectStatus(await write('createJournal',{sourceType:'stock_adjustment',sourceId:'forged-stock',effectiveDate:'2026-09-29',lines,reason:'Không giả chứng từ tồn tự động'}),422);
        const before=await data(await request('getBalanceSheet',{path:shop,query:{atDate:'2026-09-15'}}));assert.equal(before.assets.amount,'100');assert.equal(before.sourceJournalIds.length,1);
    });
    await run('C06 statement preview preserves partial rows and rejects invalid scope, duplicate sources and expired/bound tokens',async()=>{
        emptyBusiness();await open('0');const form=new FormData();form.append('purpose','bank_statement');form.append('resourceId',account('112').id);form.append('file',new File(['externalTransactionId,amount,currency,direction,occurredAt,referenceText\nC06-PARTIAL,50,VND,credit,2026-09-29T14:00:00Z,Đúng\nC06-BAD,-1,VND,credit,invalid,Lỗi\n'],'partial.csv',{type:'text/csv'}));
        const file=await data(await request('uploadFile',{path:shop,form,headers:writeHeaders(await csrf(),'C06-PARTIAL-FILE')}));
        const body={fileId:file.id,accountOrCarrierId:account('112').id,formatId:'botsales-csv-v1',sourceBatchId:'C06-PARTIAL'};
        await expectStatus(await write('previewStatementImport',{...body,accountOrCarrierId:'b-account-112'}),422);
        const preview=await data(await write('previewStatementImport',body));assert.equal(preview.validRows,1);assert.equal(preview.invalidRows,1);
        await expectStatus(await write('importBankStatement',{...body,sourceBatchId:'changed-batch',validationToken:preview.validationToken}),409);
        const job=await data(await write('importBankStatement',{...body,validationToken:preview.validationToken}));assert.equal(job.status,'partial');assert.equal(database.all('bankTransactions','shop-demo').length,1);assert.equal(database.all('journals','shop-demo').length,0);
        await expectStatus(await write('importBankStatement',{...body,validationToken:preview.validationToken}),409);
        const duplicate=await data(await write('previewStatementImport',body));assert.equal(duplicate.validRows,0);assert(duplicate.rows[0].errors.length>0);
        await expectStatus(await write('importBankStatement',{...body,validationToken:'expired-or-unknown-token'}),409);
    });
    await run('C06 finance roles and currency are enforced at HTTP, including public report totals across timezone boundaries',async()=>{
        emptyBusiness();await open('0');service.setRole('viewer');await expectStatus(await write('createAccountingPeriod',{startDate:'2026-10-01',endDate:'2026-10-31',reason:'Không có quyền đóng mở kỳ'}),403);service.setRole('accountant');
        const wrong=journalLines('111','411','10').map(l=>({...l,debit:{...l.debit,currency:'USD'},credit:{...l.credit,currency:'USD'}}));await expectStatus(await write('createJournal',{sourceType:'manual',sourceId:'C06-currency',effectiveDate:'2026-09-29',lines:wrong,reason:'Không ghép nhiều đồng tiền'}),422);
        const j=await data(await write('createJournal',{sourceType:'manual',sourceId:'C06-boundary',effectiveDate:'2026-09-01',lines:journalLines('111','411','10'),reason:'Biên ngày theo múi giờ shop'}));await expectStatus(await write('postJournal',{expectedVersion:j.version},{...shop,resourceId:j.id}),202);
        const included=await data(await request('getLedger',{path:shop,query:{from:'2026-08-31T17:00:00Z',to:'2026-09-01T17:00:00Z',timezone:'Asia/Vientiane'}}));assert.equal(included.totalDebit.amount,'10');
        const excluded=await data(await request('getLedger',{path:shop,query:{from:'2026-09-01T00:00:00Z',to:'2026-09-02T00:00:00Z',timezone:'UTC'}}));assert.equal(excluded.totalDebit.amount,'0');
    });
    reset();
}
