"""One-time canonical migration. Execute only after C05 scoped regression closes."""
from pathlib import Path
import json,copy
F=Path(__file__).resolve().parents[2];K=F.parent/'botsales-kit'
def read(path):return json.loads((K/path).read_text(encoding='utf-8'))
api=read('contracts/openapi.json');assert api['info']['version']=='2.1.0'
s=api['components']['schemas']
def ref(name):return {'$ref':'#/components/schemas/'+name}
def text(limit=100):return {'type':'string','minLength':1,'maxLength':limit}
def array(item,minimum=None):
    value={'type':'array','items':item}
    if minimum is not None:value['minItems']=minimum
    return value
def obj(fields,required=None):return {'type':'object','properties':fields,'required':list(fields) if required is None else required,'additionalProperties':False}
def enum(values):return {'type':'string','enum':values}
def response(name):s[name+'Response']=obj({'data':ref(name),'meta':ref('Meta')})
def list_response(name):s[name+'ListResponse']=obj({'data':array(ref(name)),'meta':ref('Meta'),'page':ref('Page')})
base=copy.deepcopy(s['Warehouse']['properties']);base={k:v for k,v in base.items() if k in ['id','shopId','version','createdAt','updatedAt']}
report={'shopId':ref('Id'),'asOf':ref('DateTime'),'policyVersion':text(),'completeness':enum(['complete','provisional','incomplete']),'warnings':array({'type':'string'})}
window={'from':ref('DateTime'),'to':ref('DateTime'),'timezone':text()}
s['OpeningStockLine']=obj({'variantId':ref('Id'),'warehouseId':ref('Id'),'quantity':{'type':'integer','minimum':0},'unitCost':ref('Money')})
opening={'effectiveDate':{'type':'string','format':'date'},'policyVersion':text(),'lines':array(ref('JournalLine')),'inventory':array(ref('OpeningStockLine')),'reason':text(1000)}
s['OpeningBalanceWrite']=obj(opening)
s['OpeningBalance']=obj({**base,**opening,'status':enum(['draft','posted']),'journalId':{'anyOf':[ref('Id'),{'type':'null'}]}})
response('OpeningBalance');list_response('OpeningBalance')
s['AccountingPeriodCreate']=obj({'startDate':{'type':'string','format':'date'},'endDate':{'type':'string','format':'date'},'reason':text(1000)})
s['LedgerEntry']=obj({'id':ref('Id'),'journalId':ref('Id'),'sourceType':text(),'sourceId':ref('Id'),'effectiveDate':{'type':'string','format':'date'},'accountId':ref('Id'),'accountCode':text(40),'accountName':text(160),'description':{'type':'string','maxLength':300},'debit':ref('Money'),'credit':ref('Money'),'balance':ref('Money')})
s['Ledger']=obj({**report,**window,'accountId':{'anyOf':[ref('Id'),{'type':'null'}]},'openingBalance':ref('Money'),'closingBalance':ref('Money'),'totalDebit':ref('Money'),'totalCredit':ref('Money'),'entries':array(ref('LedgerEntry')),'page':ref('Page')});response('Ledger')
s['TrialBalanceLine']=obj({'accountId':ref('Id'),'code':text(40),'name':text(160),'group':copy.deepcopy(s['Account']['properties']['group']),**{k:ref('Money') for k in ['openingDebit','openingCredit','debit','credit','closingDebit','closingCredit']}})
s['TrialBalance']=obj({**report,**window,'rows':array(ref('TrialBalanceLine')),**{k:ref('Money') for k in ['totalDebit','totalCredit','closingDebit','closingCredit','difference']},'balanced':{'type':'boolean'}});response('TrialBalance')
s['BalanceSheetLine']=obj({'accountId':ref('Id'),'code':text(40),'name':text(160),'group':copy.deepcopy(s['Account']['properties']['group']),'balance':ref('Money')})
s['BalanceSheet']=obj({**report,'atDate':{'type':'string','format':'date'},'rows':array(ref('BalanceSheetLine')),**{k:ref('Money') for k in ['assets','liabilities','equity','retainedProfit','difference']},'balanced':{'type':'boolean'},'sourceJournalIds':array(ref('Id'))});response('BalanceSheet')
s['StockSnapshot']['properties']['carryingValue']={'anyOf':[ref('Money'),{'type':'null'}]}
s['Journal']['properties']['reason']={'type':'string','maxLength':1000}
s['JournalCreate']['properties']['replacesJournalId']={'anyOf':[ref('Id'),{'type':'null'}]}
s['Journal']['properties']['replacesJournalId']={'anyOf':[ref('Id'),{'type':'null'}]}
s['Journal']['properties']['sourceRevision']={'type':'integer','minimum':0}
s['ReturnCase']['properties']['lines']['items']['properties']['acceptedQuantity']={'type':'integer','minimum':0}
for name in ['Cashflow','ProfitLoss']:
    s[name]['properties'].update({'sourceJournalIds':array(ref('Id')),'policyVersion':text(),'completeness':enum(['complete','provisional','incomplete'])})
s['FileUpload']['properties']['purpose']['enum']+=['bank_statement','cod_statement']
s['FileObject']['properties']['purpose']=copy.deepcopy(s['FileUpload']['properties']['purpose'])
s['FileObject']['properties']['resourceId']={'anyOf':[ref('Id'),{'type':'null'}]}
s['FileUpload']['properties']['resourceId']=ref('Id')
s['StatementFormat']=obj({'id':ref('Id'),'formatId':text(),'kind':enum(['bank','cod']),'name':text(160),'maxRows':{'type':'integer','minimum':1},'maxBytes':{'type':'integer','minimum':1},'requiredColumns':array(text()),'exampleCsv':{'type':'string'},'resourceOptions':array(obj({'id':ref('Id'),'label':text(160)}))});list_response('StatementFormat')
s['StatementImport']['properties']['validationToken']=text(200)
s['StatementPreviewRow']=obj({'row':{'type':'integer','minimum':2},'values':{'type':'object','additionalProperties':{'type':'string'}},'errors':array({'type':'string'})})
s['StatementPreview']=obj({'fileId':ref('Id'),'kind':enum(['bank','cod']),'accountOrCarrierId':ref('Id'),'sourceBatchId':text(200),'formatId':text(),'rows':array(ref('StatementPreviewRow')),'validRows':{'type':'integer','minimum':0},'invalidRows':{'type':'integer','minimum':0},'validationToken':text(200),'expiresAt':ref('DateTime')});response('StatementPreview')
new_ops=[]
def operation(template,op_id,path,method,response_schema,request_schema=None,permission='finance.read',parameters=None):
    source=next(o for v in api['paths'].values() for m,o in v.items() if m in ['get','post','patch','put'] and o.get('operationId')==template)
    o=copy.deepcopy(source);o['operationId']=op_id;o['summary']=op_id;o['tags']=['finance'];o['x-permission']=permission;o['x-feature-ids']=['E01'];o['x-approved-extension']='2026-10-09_FRONTEND_CONTRACT_MSW'
    o['parameters']=copy.deepcopy(parameters if parameters is not None else [p for p in o.get('parameters',[]) if p.get('in')=='header' or p.get('name')=='shopId'])
    if '{openingId}' in path:o['parameters'].insert(1,{'name':'openingId','in':'path','required':True,'schema':ref('Id')})
    if request_schema:o['requestBody']={'required':True,'content':{'application/json':{'schema':ref(request_schema)}}}
    else:o.pop('requestBody',None)
    success=next(k for k in o['responses'] if k.startswith('2'));status='202' if response_schema=='CommandResponse' else '201' if op_id in ['createOpeningBalance','createAccountingPeriod'] else '200'
    o['responses'][status]=o['responses'].pop(success);o['responses'][status]['content']['application/json']['schema']=ref(response_schema)
    api['paths'].setdefault(path,{})[method]=o;new_ops.append(op_id)
shop_param=copy.deepcopy(api['paths']['/shops/{shopId}/periods']['get']['parameters'][0])
lookup_params=[shop_param,{'$ref':'#/components/parameters/Limit'},{'$ref':'#/components/parameters/Cursor'}]
operation('listAccountingPeriods','listOpeningBalances','/shops/{shopId}/finance/opening-balances','get','OpeningBalanceListResponse',parameters=lookup_params)
operation('getAccount','getOpeningBalance','/shops/{shopId}/finance/opening-balances/{openingId}','get','OpeningBalanceResponse')
operation('createJournal','createOpeningBalance','/shops/{shopId}/finance/opening-balances','post','OpeningBalanceResponse','OpeningBalanceWrite','finance.post')
operation('updateAccount','updateOpeningBalance','/shops/{shopId}/finance/opening-balances/{openingId}','put','OpeningBalanceResponse','OpeningBalanceWrite','finance.post')
operation('postJournal','postOpeningBalance','/shops/{shopId}/finance/opening-balances/{openingId}/post','post','CommandResponse','VersionRequest','finance.post')
operation('createJournal','createAccountingPeriod','/shops/{shopId}/periods','post','AccountingPeriodResponse','AccountingPeriodCreate','finance.close')
report_params=copy.deepcopy(api['paths']['/shops/{shopId}/finance/profit-loss']['get']['parameters'])
operation('getProfitLoss','getLedger','/shops/{shopId}/finance/ledger','get','LedgerResponse',parameters=report_params+lookup_params[1:]+[{'name':'accountId','in':'query','required':False,'schema':ref('Id')}])
operation('getProfitLoss','getTrialBalance','/shops/{shopId}/finance/trial-balance','get','TrialBalanceResponse',parameters=report_params)
operation('getProfitLoss','getBalanceSheet','/shops/{shopId}/finance/balance-sheet','get','BalanceSheetResponse',parameters=[shop_param,{'name':'atDate','in':'query','required':True,'schema':{'type':'string','format':'date'}}])
operation('listAccountingPeriods','listStatementFormats','/shops/{shopId}/finance/statement-formats','get','StatementFormatListResponse',permission='finance.reconcile',parameters=lookup_params)
operation('createJournal','previewStatementImport','/shops/{shopId}/finance/statement-import-preview','post','StatementPreviewResponse','StatementImport','finance.reconcile')
api['info']['version']='2.2.0'
events=read('contracts/events.schema.json')
for event in ['journal.updated','accounting_period.updated','opening_balance.updated']:
    for document in [events, s['EventEnvelope']]:document['properties']['type']['enum'].append(event)
routes=read('contracts/route-manifest.json');routes['version']='2.2'
extensions=[('R57','opening-balances','Mở sổ kế toán','OpeningBalancesPage',['listOpeningBalances','getOpeningBalance','listAccounts','listWarehouses','listProducts'],[('createOpeningBalance','Tạo bản nháp','finance.post'),('updateOpeningBalance','Lưu bản nháp','finance.post'),('postOpeningBalance','Ghi mở sổ','finance.post')]),('R58','ledger','Sổ cái','LedgerPage',['getLedger','getJournal','listAccounts'],[]),('R59','trial-balance','Cân đối phát sinh','TrialBalancePage',['getTrialBalance','getLedger'],[]),('R60','balance-sheet','Cân đối quản trị','BalanceSheetPage',['getBalanceSheet','getLedger'],[])]
for route_id,suffix,title,component,reads,actions in extensions:
    route=copy.deepcopy(next(r for r in routes['routes'] if r['id']=='R56'));route.update({'id':route_id,'requirementId':'FR2-'+route_id,'path':'/s/:shopId/finance/'+suffix,'title':title,'readOperations':reads,'actions':[{'operationId':op,'label':label,'permission':perm} for op,label,perm in actions],'purpose':title+' theo chứng từ quản trị tổng hợp.','content':'Snapshot, policy, trạng thái đủ dữ liệu, tổng và nguồn chứng từ.','behavior':'Aggregate từ read-model, không tổng hợp trang UI; mutation version/permission/idempotency/recovery.','edgeCases':'Thiếu nguồn/mở sổ, lệch tồn, khóa kỳ, stale lần hai, duplicate/reversal, pagination và cross-shop.','acceptanceScenarioIds':['SC2-E01','SC2-C06-FINANCE'],'featureIds':['E01']});routes['routes'].append(route)
next(r for r in routes['routes'] if r['id']=='R50')['actions'].append({'label':'Tạo kỳ kế toán','operationId':'createAccountingPeriod','permission':'finance.close'})
next(r for r in routes['routes'] if r['id']=='R49')['readOperations'].append('listStatementFormats')
next(r for r in routes['routes'] if r['id']=='R49')['actions'].append({'label':'Xem trước sao kê','operationId':'previewStatementImport','permission':'finance.reconcile'})
features=read('contracts/feature-catalog.json')
for feature in features['features']:
    if feature['id']=='E01':
        feature['routeIds'] += [r[0] for r in extensions]
        feature.setdefault('approvedExtensions',[]).append({'approvedOn':'2026-10-09','scope':'Mở sổ, journal-driven ledger/trial/balance/P&L/cashflow và đối soát quản trị.','deliveryBoundary':'FRONTEND_CANONICAL_CONTRACT_SYNTHETIC_MSW'})
scenarios=read('fixtures/acceptance-scenarios.json');feature=next(f for f in features['features'] if f['id']=='E01')
scenarios['scenarios'].append({'id':'SC2-C06-FINANCE','featureId':'E01','given':'Canonical synthetic VND journal/account/stock policy and finance-golden fixture.','when':'Opening/posting/dispatch/delivery/return/refund/import/reconcile; stale, duplicate, closed period and paginated reads.','then':'Profit 80000 then 30000 VND; assets = liabilities + equity; immutable source journals, correct period and full read-model totals.','routeIds':['R20','R22','R48','R49','R50']+[r[0] for r in extensions],'taskIds':feature['taskIds'],'executionStatus':'NOT_RUN_PRODUCT_TEST'})
migration=read('contracts/migration-map.json');migration['additiveExtensions'].append({'from':'2.1.0','to':'2.2.0','breaking':False,'approvedOn':'2026-10-09','operations':new_ops,'routeIds':[r[0] for r in extensions],'rules':['Existing response/request fields remain valid; report provenance and valuation metadata are optional additive fields.','Management synthetic policy only; no national reporting/provider/backend certification.','Original posted lines remain immutable; reversal retains source uniqueness.']})
release=read('release.json');release['versions']['api']='2.2.0';release['approvedExtensions'].append({'approvedOn':'2026-10-09','api':'2.2.0','scope':'Management accounting canonical contracts + Frontend + synthetic MSW only.'})
outputs={'contracts/openapi.json':api,'contracts/events.schema.json':events,'contracts/route-manifest.json':routes,'contracts/feature-catalog.json':features,'fixtures/acceptance-scenarios.json':scenarios,'contracts/migration-map.json':migration,'release.json':release}
for file,value in outputs.items():(K/file).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
formats=[]
for kind,columns,example in [('bank',['externalTransactionId','amount','currency','direction','occurredAt','referenceText'],'externalTransactionId,amount,currency,direction,occurredAt,referenceText\nBANK-DEMO-001,229000,VND,credit,2026-09-29T14:00:00Z,Đối soát COD mẫu DH-1001\n'),('cod',['externalBatchId','orderIds'],'externalBatchId,orderIds\nCOD-DEMO-001,DH-1001\n')]:
    formats.append({'id':kind+'-botsales-csv-v1','formatId':'botsales-csv-v1','kind':kind,'name':'CSV mẫu '+('ngân hàng' if kind=='bank' else 'COD'),'maxRows':1000,'maxBytes':5*1024*1024,'requiredColumns':columns,'exampleCsv':example})
(K/'fixtures/statement-formats.json').write_text(json.dumps({'scope':'SYNTHETIC_LOCAL_FORMATS_NOT_PROVIDER_CERTIFIED','formats':formats},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Canonical API 2.2.0: 11 finance operations; R57–R60; no full-product tracker changes.')
