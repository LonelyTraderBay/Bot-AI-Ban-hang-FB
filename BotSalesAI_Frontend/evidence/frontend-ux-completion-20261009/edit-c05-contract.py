"""One-time additive C05 migration from the recorded 2.0.0 baseline."""
import copy, json
from pathlib import Path
R = Path(__file__).resolve().parents[3]
K = R / 'botsales-kit'
read = lambda p: json.loads((K / p).read_text(encoding='utf-8'))
api = read('contracts/openapi.json')
assert api['info']['version'] == '2.0.0'
schemas = api['components']['schemas']
ref = lambda n: {'$ref': '#/components/schemas/' + n}
text = lambda maximum, minimum=1: {'type': 'string', 'minLength': minimum, 'maxLength': maximum}
nullable = lambda s: {'anyOf': [s, {'type': 'null'}]}
obj = lambda props, required=None: {'type': 'object', 'properties': props, 'required': list(props) if required is None else required, 'additionalProperties': False}
base = {k: copy.deepcopy(schemas['Category']['properties'][k]) for k in ['id','shopId','version','createdAt','updatedAt']}
status = {'type': 'string', 'enum': ['active','archived']}
warehouse_fields = {'code': text(40), 'name': text(160), 'addressLine': text(500)}
address_fields = {'label': text(120), 'recipient': text(160), 'phone': text(40), 'line1': text(500), 'ward': nullable(text(120)), 'district': nullable(text(120)), 'province': text(120), 'postalCode': nullable(text(20)), 'countryCode': {'type':'string','pattern':'^[A-Z]{2}$'}}
account_fields = {'code': {'type':'string','pattern':'^[A-Za-z0-9_.-]{1,40}$'}, 'name': text(160), 'group': {'type':'string','enum':['asset','liability','equity','income','expense']}}
schemas['Warehouse'] = obj({**base, **warehouse_fields, 'status':status})
schemas['CustomerAddress'] = obj({**base, 'customerId':ref('Id'), **{k: nullable(v) if k in ['recipient','phone','line1','province','countryCode'] else v for k,v in address_fields.items()}, 'status':status, 'redactedFields':{'type':'array','items':{'type':'string'}}})
schemas['Account'] = obj({**base, **account_fields, 'status':status, 'used':{'type':'boolean'}})
schemas['AddressSnapshot'] = obj({'addressId':ref('Id'), 'addressVersion':{'type':'integer','minimum':1}, **address_fields})
schemas['AddressSnapshot']['description'] = 'Immutable server snapshot used by a quote/confirmed order. Later address edits do not rewrite it; redacted fields are never exposed in administrative reads.'
for name, fields in [('Warehouse',warehouse_fields),('CustomerAddress',address_fields),('Account',account_fields)]:
    schemas[name+'Write'] = obj(copy.deepcopy(fields))
    schemas[name+'WritePatch'] = obj(copy.deepcopy(fields), [])
    schemas[name+'WritePatch']['minProperties'] = 1
    schemas[name+'WritePatch']['description'] = 'Partial PATCH under If-Match; omitted values remain. Server checks the merged state and field/resource authorization.'
    for suffix, data in [('Response',ref(name)),('ListResponse',{'type':'array','items':ref(name)})]:
        schemas[name+suffix] = obj({'data':data,'meta':ref('Meta'), **({'page':ref('Page')} if suffix=='ListResponse' else {})})
# Optional response fields preserve old response and request compatibility.
for name in ['Order','OrderQuote']:
    schemas[name]['properties']['shippingAddressSnapshot'] = nullable(ref('AddressSnapshot'))
schemas['OrderDraftPatch']['properties']['shippingAddressId'] = nullable(ref('Id'))
templates = {o['operationId']: o for methods in api['paths'].values() for o in methods.values() if isinstance(o,dict) and 'operationId' in o}
added_ops = []
def operation(template, op_id, schema_name, path, permission, resource_param=None):
    o=copy.deepcopy(templates[template]); o.update(operationId=op_id,summary=op_id,tags=[schema_name.lower()],**{'x-permission':permission})
    for parameter in o['parameters']:
        if parameter.get('name')=='categoryId': parameter['name']=resource_param
    if schema_name=='CustomerAddress':
        o['parameters'].insert(1,{'name':'customerId','in':'path','required':True,'schema':ref('Id')})
    for response in o['responses'].values():
        if 'application/json' in response.get('content',{}):
            s=response['content']['application/json']['schema']; s['$ref']=s['$ref'].replace('Category',schema_name)
    if 'requestBody' in o:
        s=o['requestBody']['content']['application/json']['schema']; s['$ref']=s['$ref'].replace('Category',schema_name)
    o['description']='Frontend contract extension approved 2026-10-09. Same-shop references, effective permission, field redaction, version and idempotency are checked at HTTP execution. Archive retains history; command unknown must reconcile before another write.'
    method={'listCategories':'get','getCategory':'get','createCategory':'post','updateCategory':'patch','archiveCategory':'post'}[template]
    api['paths'].setdefault(path,{})[method]=o; added_ops.append(op_id)
for name, plural, resource, read_perm, write_perm in [('Warehouse','warehouses','warehouseId','inventory.read','warehouses.manage'),('CustomerAddress','customers/{customerId}/addresses','addressId','customers.read','customers.write'),('Account','finance/accounts','accountId','finance.read','finance.accounts.manage')]:
    p='/shops/{shopId}/'+plural
    list_name={'Warehouse':'listWarehouses','CustomerAddress':'listCustomerAddresses','Account':'listAccounts'}[name]
    for template,op_id,path in [('listCategories',list_name,p),('createCategory','create'+name,p),('getCategory','get'+name,p+'/{'+resource+'}'),('updateCategory','update'+name,p+'/{'+resource+'}'),('archiveCategory','archive'+name,p+'/{'+resource+'}/archive')]:
        operation(template,op_id,name,path,read_perm if template.startswith(('list','get')) else write_perm,resource)
api['info']['version']='2.1.0'
permissions=read('contracts/permission-catalog.json')
for permission,description,roles in [('warehouses.manage','Tạo, sửa và ngừng dùng kho có kiểm tra tồn/giữ hàng/nghiệp vụ mở',['owner','manager']),('finance.accounts.manage','Quản trị tài khoản kế toán; bảo vệ mã/nhóm đã dùng trong chứng từ',['owner','accountant'])]:
    permissions['permissions'].append({'id':permission,'description':description})
    for role in roles: permissions['rolePresets'][role].append(permission)
permissions['version']='2.1';schemas['Permission']['enum']=[p['id'] for p in permissions['permissions']]
routes=read('contracts/route-manifest.json');routes['version']='2.1'
for route_id,path,title,module,permission,name,feature in [('R55','settings/warehouses','Quản trị kho','inventory','inventory.read','Warehouse','D01'),('R56','finance/accounts','Tài khoản kế toán','finance','finance.read','Account','E01')]:
    routes['routes'].append({'id':route_id,'requirementId':'FR2-'+route_id,'path':'/s/:shopId/'+path,'title':title,'module':module,'readPermission':permission,'readOperations':['listWarehouses','getWarehouse'] if name=='Warehouse' else ['listAccounts','getAccount'],'actions':[{'label':label,'operationId':verb+name,'permission':'warehouses.manage' if name=='Warehouse' else 'finance.accounts.manage'} for verb,label in [('create','Tạo mới'),('update','Lưu thay đổi'),('archive','Ngừng dùng')]],'purpose':title+' có lịch sử và phiên bản.','content':'Danh sách có phân trang, tìm kiếm, trạng thái; editor dùng baseline và đối chiếu xung đột.','behavior':'Archive có version/reason; không hard-delete, giữ command recovery và quyền hiện hành.','edgeCases':'Cross-shop, redaction, stale version lần hai, tham chiếu đã dùng và outcome unknown.','states':copy.deepcopy(routes['routes'][-1]['states']),'acceptanceScenarioIds':['SC2-'+feature,'SC2-C05-'+name.upper()],'featureIds':[feature]})
customer=next(x for x in routes['routes'] if x['id']=='R08');customer['readOperations']+=['listCustomerAddresses','getCustomerAddress'];customer['actions'] += [{'label':label,'operationId':verb+'CustomerAddress','permission':'customers.write'} for verb,label in [('create','Thêm địa chỉ'),('update','Lưu địa chỉ'),('archive','Ngừng dùng địa chỉ')]];customer['acceptanceScenarioIds'].append('SC2-C05-ADDRESS')
features=read('contracts/feature-catalog.json')
for feature_id,route_id,scope in [('D01','R55','CRUD kho, archive chặn tồn/giữ hàng/nghiệp vụ mở; lookup cùng contract.'),('E01','R56','CRUD tài khoản; mã/nhóm đã dùng được bảo vệ; lookup bút toán từ API.'),('G04','R08','CRUD địa chỉ theo khách/cửa hàng và field redaction; đơn đã xác nhận giữ snapshot.')]:
    f=next(x for x in features['features'] if x['id']==feature_id)
    if route_id not in f['routeIds']: f['routeIds'].append(route_id)
    f.setdefault('approvedExtensions',[]).append({'approvedOn':'2026-10-09','scope':scope,'deliveryBoundary':'FRONTEND_CANONICAL_CONTRACT_SYNTHETIC_MSW'})
scenarios=read('fixtures/acceptance-scenarios.json')
for suffix,feature_id,route_id,then in [('WAREHOUSE','D01','R55','Owner/manager CRUD; warehouse role denied management; cross-shop/stale rejected; stock/reservations/open work prevent archive.'),('ACCOUNT','E01','R56','Owner/accountant CRUD; manager denied; used code/group immutable; archived IDs remain historical but cannot post new journals.'),('ADDRESS','G04','R08','Same-customer/same-shop references only; redacted values never echoed or written; quote and confirmed order snapshots remain unchanged after edits.')]:
    f=next(x for x in features['features'] if x['id']==feature_id)
    scenarios['scenarios'].append({'id':'SC2-C05-'+suffix,'featureId':feature_id,'given':'Current session, canonical fixture and versioned resource.','when':'Create/read/update/archive, paginated lookup, stale conflict and unauthorized/cross-shop requests.','then':then,'routeIds':[route_id],'taskIds':f['taskIds'],'executionStatus':'NOT_RUN_PRODUCT_TEST'})
events=read('contracts/events.schema.json');events['properties']['type']['enum'] += ['warehouse.updated','customer_address.updated','account.updated']
migration=read('contracts/migration-map.json');migration.setdefault('additiveExtensions',[]).append({'from':'2.0.0','to':'2.1.0','breaking':False,'approvedOn':'2026-10-09','operations':added_ops,'routeIds':['R55','R56'],'rules':['Existing APIs stay valid. Optional snapshots add response metadata; address selection in draft PATCH is optional.','No database/provider implementation or production release is certified.','Warehouse/address/account archive retains historical references; lookup must use canonical operations.']})
release=read('release.json');release['versions']['api']='2.1.0';release.setdefault('approvedExtensions',[]).append({'approvedOn':'2026-10-09','api':'2.1.0','scope':'Canonical resources + Frontend + synthetic MSW; live prohibitions remain.'})
outputs={'contracts/openapi.json':api,'contracts/permission-catalog.json':permissions,'contracts/route-manifest.json':routes,'contracts/feature-catalog.json':features,'fixtures/acceptance-scenarios.json':scenarios,'contracts/events.schema.json':events,'contracts/migration-map.json':migration,'release.json':release}
for path,data in outputs.items():
    before=(K/path).read_bytes(); snapshot=Path(__file__).parent/'C05-before-source/botsales-kit'/path
    if not snapshot.exists(): snapshot.parent.mkdir(parents=True,exist_ok=True);snapshot.write_bytes(before)
    (K/path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Added 15 resource operations and R55/R56; API 2.1.0; events remain schemaVersion 2; full-product ledger untouched.')
