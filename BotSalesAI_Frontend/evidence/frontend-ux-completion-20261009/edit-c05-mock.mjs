// One-time migration. Canonical and MSW data edits remain reviewable beside the before-source copies.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..'),kit=path.resolve(root,'../botsales-kit');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
const apiPath=path.join(kit,'contracts/openapi.json'),api=json(apiPath),s=api.components.schemas;
for(const name of ['CustomerAddressWrite','CustomerAddressWritePatch']) s[name].properties.phone={anyOf:[{type:'string',minLength:1,maxLength:40},{type:'null'}]};
for(const field of ['recipient','phone','line1','province','countryCode']) s.AddressSnapshot.properties[field]={anyOf:[s.AddressSnapshot.properties[field],{type:'null'}]};
s.AddressSnapshot.properties.redactedFields={type:'array',items:{type:'string'}};
write(apiPath,api);
const seedPath=path.join(root,'apps/web/src/mocks/seed.json'),seed=json(seedPath);
if(seed.warehouses || seed.accounts || seed.addresses) throw Error('Already migrated masters; do not rerun');
const time='2026-09-29T14:00:00.000Z',base=(id,shopId)=>({id,shopId,version:1,createdAt:time,updatedAt:time});
seed.warehouses=seed.shops.map(shop=>({...base(shop.defaultWarehouseId,shop.id),code:'MAIN',name:'Kho chính · dữ liệu tổng hợp',addressLine:'Địa điểm kho tổng hợp để nghiệm thu local',status:'active'}));
seed.addresses=seed.customers.map(customer=>({...base(customer.id==='c1'?'address-synthetic':customer.id==='b-c1'?'b-address-synthetic':`address-${customer.id}`,customer.shopId),customerId:customer.id,label:'Địa chỉ giao hàng mẫu',recipient:customer.displayName,phone:'0000000000',line1:'Địa chỉ tổng hợp, không dùng giao hàng thật',ward:null,district:null,province:'Địa bàn mẫu',postalCode:null,countryCode:'VN',status:'active',redactedFields:[]}));
const accounts=[['cash','111','Tiền mặt','asset'],['bank','112','Tiền ngân hàng','asset'],['inventory','156','Hàng tồn kho','asset'],['inventory_transit','157','Hàng đang chuyển','asset'],['customer_receivable','131','Phải thu khách hàng','asset'],['carrier_cod','138','COD chờ đối soát','asset'],['accounts_payable','331','Phải trả nhà cung cấp','liability'],['grni','335','Hàng nhận chưa có hóa đơn','liability'],['refund_payable','338','Nghĩa vụ hoàn tiền','liability'],['owner_capital','411','Vốn chủ sở hữu','equity'],['loan_principal','341','Nợ vay','liability'],['sales','511','Doanh thu bán hàng','income'],['income','711','Thu nhập khác','income'],['sales_returns','521','Hàng bán trả lại','income'],['cogs','632','Giá vốn','expense'],['shipping','64101','Phí vận chuyển','expense'],['platform_fee','64102','Phí nền tảng','expense'],['payment_fee','64103','Phí thanh toán','expense'],['ai_expense','64201','Chi phí AI','expense'],['operating_expense','642','Chi phí vận hành','expense']];
seed.accounts=seed.shops.flatMap(shop=>accounts.map(([id,code,name,group])=>({...base(shop.id==='shop-demo'?id:`b-${id}`,shop.id),code,name,group,status:'active',used:false})));
for(const journal of seed.journals) if(journal.shopId==='shop-second') for(const line of journal.lines) if(!line.accountId.startsWith('b-')) line.accountId='b-'+line.accountId;
for(const member of seed.members) {
 const role=member.roles[0];
 for(const permission of role==='owner'?['warehouses.manage','finance.accounts.manage']:role==='manager'?['warehouses.manage']:role==='accountant'?['finance.accounts.manage']:[]) if(!member.permissions.includes(permission))member.permissions.push(permission);
}
write(seedPath,seed);
const collectionPath=path.join(root,'apps/web/src/mocks/collections.json');write(collectionPath,{...json(collectionPath),warehouses:'Warehouse',addresses:'CustomerAddress',accounts:'Account'});
console.log('MSW master fixtures seeded per shop; address redaction response schema is nullable. No React-owned synthetic choices.');
