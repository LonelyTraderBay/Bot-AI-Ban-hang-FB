from pathlib import Path
F=Path(__file__).resolve().parents[2];p=F/'apps/web/src/mocks/files.ts';text=p.read_text(encoding='utf-8')
start=text.index("    if (op === 'importBankStatement' || op === 'importCODStatement') {");end=text.index("    if (op === 'createExport')",start)
text=text[:start]+'''    if (op === 'importBankStatement' || op === 'importCODStatement') {
        const kind=op==='importBankStatement'?'bank':'cod';
        if(body.validationToken) {
            const preview=statementPreviews.get(str(body.validationToken));
            ensure(preview&&preview.shopId===shopId&&preview.kind===kind&&preview.fileId===body.fileId&&preview.accountOrCarrierId===body.accountOrCarrierId&&preview.sourceBatchId===body.sourceBatchId&&preview.formatId===body.formatId,'Preview không thuộc đúng tệp/tài khoản/đợt hoặc đã dùng.',409,'PREVIEW_MISMATCH');
            ensure(Date.parse(preview.expiresAt)>Date.parse(now()),'Preview đã hết hạn; xem lại trước khi nhập.',409,'PREVIEW_EXPIRED');
        }
        const previewRows=statementRows(input,kind),errors:Row[]=[];let completed=0;
        const currency=str(find('shops',shopId,shopId).currency);
        for(const line of previewRows) {
            if(line.errors.length){errors.push({row:line.row,field:'transaction',code:'INVALID_ROW',message:line.errors.join('; ')});continue;}
            const values=line.values;
            if(kind==='bank') {
                const tx=insert('bankTransactions','BankTransaction',shopId,{accountId:body.accountOrCarrierId,externalTransactionId:values.externalTransactionId,amount:{amount:values.amount,currency},direction:values.direction,occurredAt:values.occurredAt,referenceText:values.referenceText||'',matchState:'unmatched'});
                insert('reconciliations','ReconciliationCase',shopId,{transactionId:tx.id,state:'unmatched',suggestedResourceIds:[],difference:tx.amount,reason:'Chưa đối soát; không tự xác nhận tiền.'});
            }else {
                const orderIds=(values.orderIds||'').split(';').filter(Boolean),orders=orderIds.map(orderId=>find('orders',orderId,shopId)),gross=sum(orders,'total');
                insert('codSettlements','CODSettlement',shopId,{carrierId:body.accountOrCarrierId,externalBatchId:values.externalBatchId,orderIds,grossDue:money(gross,currency),actualFees:money(0n,currency),bankReceived:money(0n,currency),difference:money(gross,currency),status:'pending',bankTransactionId:null});
            }completed++;
        }
        if(body.validationToken)statementPreviews.delete(str(body.validationToken));
        return job(shopId,'import',{status:errors.length?(completed?'partial':'failed'):'succeeded',total:previewRows.length,completed,errorCount:errors.length,rowErrors:errors});
    }
''' + text[end:]
# Report exports use the same ledger owner as the displayed report, not financeEntry page sums.
start=text.index("    if (type === 'cashflow') {");end=text.index("    ensure(false, 'Không hỗ trợ loại báo cáo.'",start)
text=text[:start]+'''    if (type === 'cashflow') {
        const report=journalReports(shopId,{from,to,timezone,start,end},'cashflow');
        return {fields:['from','to','timezone','asOf','policyVersion','completeness','receipts','disbursements','netCashMovement','warnings','sourceJournalIds'],rows:[report]};
    }
    if (type === 'profit_loss') {
        const data=postedJournals(shopId).filter(row=>str(row.effectiveDate)>=fromDate&&str(row.effectiveDate)<toDate).flatMap(row=>rowsFromJournal(row));
        return {fields:['effectiveDate','status','sourceType','sourceId','journalId','accountId','debitAmount','debitCurrency','creditAmount','creditCurrency'],rows:data};
    }
''' +text[end:]
text=text.replace("effectiveDate: journal.effectiveDate, status: journal.status, sourceType: journal.sourceType,", "effectiveDate: journal.effectiveDate, status: journal.status, sourceType: journal.sourceType,sourceId:journal.sourceId,journalId:journal.id,")
text=text.replace('fiscalDate, journalReports','journalReports')
p.write_text(text,encoding='utf-8')
print('Statement preview/import uses canonical format, upload purpose/scope and source uniqueness; exports use ledger.')
