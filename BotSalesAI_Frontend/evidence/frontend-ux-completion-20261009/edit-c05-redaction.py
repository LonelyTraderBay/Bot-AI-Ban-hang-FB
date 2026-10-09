from pathlib import Path
import json
F=Path(__file__).resolve().parents[2]
K=F.parent/'botsales-kit'
p=K/'contracts/openapi.json'
api=json.loads(p.read_text(encoding='utf-8'))
for name in ['CustomerAddress','AddressSnapshot']:
    api['components']['schemas'][name]['properties']['label']['nullable']=True
p.write_text(json.dumps(api,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def edit(path,old,new):
    p=F/path
    text=p.read_text(encoding='utf-8')
    assert old in text,(path,old)
    p.write_text(text.replace(old,new),encoding='utf-8')
edit('apps/web/src/mocks/masters.ts',"const addressFields = ['recipient'","const addressFields = ['label','recipient'")
edit('apps/web/src/modules/customers/addresses.tsx',"function snapshot(address:CustomerAddress)","function addressName(address:CustomerAddress) {return address.label || `Địa chỉ ${address.id}`;}\nfunction snapshot(address:CustomerAddress)")
for old,new in [("[\"recipient\",\"line1\",\"province\",\"countryCode\"]","[\"label\",\"recipient\",\"line1\",\"province\",\"countryCode\"]"),("render:a=>a.label","render:a=>addressName(a)"),("{a.label}","{addressName(a)}"),("${selected.label}","${addressName(selected)}"),("${archive?.label||''}","${archive?addressName(archive):''}"),("${archive.label}","${addressName(archive)}")]:
    edit('apps/web/src/modules/customers/addresses.tsx',old,new)
edit('apps/web/src/modules/orders/index.tsx','{a.label} ·',"{a.label || `Địa chỉ ${a.id}`} ·")
edit('tests/fixtures/master-resource-network.mjs',"assert.equal(hidden[0].line1,null);assert.equal(hidden[0].recipient,null);", "assert.equal(hidden[0].line1,null);assert.equal(hidden[0].recipient,null);assert.equal(hidden[0].label,null);assert(hidden[0].redactedFields.includes('label'));\n        assert.equal((await data(await request('listCustomerAddresses',{path:{...shop,customerId:'c1'},query:{q:'Địa chỉ tổng hợp'}}))).length,0);\n        assert.equal((await write('updateCustomerAddress',{label:'Không ghi trường bị che'},{...shop,customerId:'c1',addressId:'address-synthetic'},hidden[0].version)).status,403);")
edit('tests/fixtures/master-resource-network.mjs',"assert.equal(visible.shippingAddressSnapshot.phone,null);", "assert.equal(visible.shippingAddressSnapshot.phone,null);\n        database.find('customers','c1','shop-demo').redactedFields=['addresses'];\n        const fullyMasked=await data(await request('getOrder',{path:{...shop,orderId:order.id}}));assert.equal(fullyMasked.shippingAddressSnapshot.label,null);assert.equal(fullyMasked.shippingAddressSnapshot.line1,null);\n        assert.deepEqual(database.find('orders',order.id,'shop-demo').shippingAddressSnapshot,saved);")
