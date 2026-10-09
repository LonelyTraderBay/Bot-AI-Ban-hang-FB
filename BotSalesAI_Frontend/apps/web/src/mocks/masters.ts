/** DEV/TEST ONLY. Explicit master resource rules; business decisions stay at HTTP execution. */
import { all, find, insert, ensure, checkVersion, touch, command, str, num, rows, record, now } from './database';
import type { Input, Row } from './database';

export function activeWarehouse(shopId: string, warehouseId: string) {
    const warehouse = find('warehouses', warehouseId, shopId);
    ensure(warehouse.status === 'active', 'Kho đã ngừng dùng; chọn kho đang hoạt động.', 409, 'WAREHOUSE_ARCHIVED');
    return warehouse;
}
export function activeAccount(shopId: string, accountId: string) {
    const account = find('accounts', accountId, shopId);
    ensure(account.status === 'active', 'Tài khoản đã ngừng dùng; không ghi chứng từ mới.', 409, 'ACCOUNT_ARCHIVED');
    return account;
}
const addressFields = ['label','recipient','phone','line1','ward','district','province','postalCode','countryCode'] as const;
export function hiddenAddressFields(customer: Row): string[] {
    const hidden = Array.isArray(customer.redactedFields) ? customer.redactedFields : [];
    return addressFields.filter(field => hidden.includes('addresses') || hidden.includes('shippingAddress') || hidden.includes(`address.${field}`) || (field === 'phone' && hidden.includes('phone')));
}
function visibleAddress(address: Row, customer: Row) {
    const hidden = hiddenAddressFields(customer);
    return { ...address, ...Object.fromEntries(hidden.map(field => [field,null])), redactedFields:hidden };
}
export function addressSnapshot(shopId: string, customerId: string, addressId: string): Row {
    const address = find('addresses', addressId, shopId);
    ensure(address.customerId === customerId, 'Địa chỉ không thuộc khách hàng đã chọn.', 422, 'ADDRESS_CUSTOMER_MISMATCH');
    ensure(address.status === 'active', 'Địa chỉ đã ngừng dùng.', 409, 'ADDRESS_ARCHIVED');
    ensure(address.recipient && address.phone && address.line1 && address.province && address.countryCode, 'Địa chỉ chưa đủ thông tin giao hàng.', 422, 'ADDRESS_INCOMPLETE');
    return { addressId:address.id, addressVersion:address.version, label:address.label, ...Object.fromEntries(addressFields.map(field => [field,address[field] ?? null])) };
}
/** Stored snapshots remain immutable; reads apply the customer's current field masking. */
export function visibleOrderAddress(order: Row, shopId: string): Row {
    if (!order.shippingAddressSnapshot) return order;
    const customer = find('customers', str(order.customerId), shopId), hidden = hiddenAddressFields(customer);
    return { ...order, shippingAddressSnapshot:{ ...record(order.shippingAddressSnapshot), ...Object.fromEntries(hidden.map(field => [field,null])), redactedFields:hidden } };
}
function uniqueCode(collection: string, shopId: string, code: unknown, exceptId?: unknown) {
    ensure(str(code).trim().length > 0, 'Nhập mã trước khi lưu.', 422, 'CODE_REQUIRED');
    ensure(!all(collection,shopId).some(item => item.id !== exceptId && str(item.code).toLocaleLowerCase('vi') === str(code).trim().toLocaleLowerCase('vi')), 'Mã đã tồn tại, kể cả bản ghi đã ngừng dùng.', 409, 'CODE_EXISTS');
}
function accountUsed(account: Row, shopId: string) {
    return all('journals',shopId).some(journal => rows(journal.lines).some(line => line.accountId === account.id));
}
function requiredText(body:Row,fields:readonly string[]) {
    for(const field of fields) if(Object.hasOwn(body,field)) ensure(str(body[field]).trim().length>0,'Trường bắt buộc không được chỉ chứa khoảng trắng.',422,'REQUIRED_TEXT');
}
function lookup(items: Row[], input: Input) {
    const q=input.query.get('q')?.trim().toLocaleLowerCase('vi'), status=input.query.get('status');
    return items.filter(item => (!status || item.status===status) && (!q || JSON.stringify(item).toLocaleLowerCase('vi').includes(q)));
}
export function masters(op: string, input: Input): Row | Row[] | undefined {
    const { shopId, body }=input;
    if (['listCustomerAddresses','getCustomerAddress','createCustomerAddress','updateCustomerAddress','archiveCustomerAddress'].includes(op)) {
        const customer=find('customers',str(input.path.customerId),shopId);
        if (op==='listCustomerAddresses') return lookup(all('addresses',shopId).filter(address => address.customerId===customer.id).map(address => visibleAddress(address,customer)),input);
        const hidden=hiddenAddressFields(customer);
        if(op==='createCustomerAddress'||op==='updateCustomerAddress') requiredText(body,['label','recipient','line1','province','countryCode']);
        if (op==='createCustomerAddress') {
            ensure(!hidden.some(field => body[field] !== undefined && body[field] !== null), 'Không được ghi trường địa chỉ đang bị che.', 403, 'FIELD_REDACTED');
            return visibleAddress(insert('addresses','CustomerAddress',shopId,{...body,customerId:customer.id,status:'active',redactedFields:[]}),customer);
        }
        const address=find('addresses',input.id,shopId);
        ensure(address.customerId===customer.id,'Không tìm thấy địa chỉ trong hồ sơ này.',404,'NOT_FOUND');
        if(op==='getCustomerAddress') return visibleAddress(address,customer);
        checkVersion(address,input);
        if(op==='archiveCustomerAddress') {
            ensure(address.status==='active','Địa chỉ đã ngừng dùng.');address.status='archived';touch(address);
            return command(shopId,op,{type:'customer_address',id:address.id});
        }
        ensure(address.status==='active','Không sửa địa chỉ đã ngừng dùng.');
        ensure(!hidden.some(field => Object.hasOwn(body,field)),'Không được ghi trường địa chỉ đang bị che.',403,'FIELD_REDACTED');
        return visibleAddress(touch(Object.assign(address,body)),customer);
    }
    switch(op) {
        case 'listWarehouses':return lookup(all('warehouses',shopId),input);
        case 'getWarehouse':return find('warehouses',input.id,shopId);
        case 'createWarehouse': {
            requiredText(body,['code','name','addressLine']);uniqueCode('warehouses',shopId,body.code);
            const warehouse=insert('warehouses','Warehouse',shopId,{...body,code:str(body.code).trim(),status:'active'});
            for(const product of all('products',shopId).filter(p=>p.status!=='archived')) for(const variant of rows(product.variants))
                insert('stock','StockSnapshot',shopId,{variantId:variant.id,warehouseId:warehouse.id,sku:variant.sku,onHand:0,reserved:0,available:0,lowStockThreshold:0,unitCost:null,asOf:now()});
            return warehouse;
        }
        case 'updateWarehouse': {
            const warehouse=find('warehouses',input.id,shopId);checkVersion(warehouse,input);ensure(warehouse.status==='active','Kho đã ngừng dùng.');
            requiredText(body,['code','name','addressLine']);
            uniqueCode('warehouses',shopId,body.code ?? warehouse.code,warehouse.id);return touch(Object.assign(warehouse,body));
        }
        case 'archiveWarehouse': {
            const warehouse=find('warehouses',input.id,shopId);checkVersion(warehouse,input);ensure(warehouse.status==='active','Kho đã ngừng dùng.');
            ensure(find('shops',shopId,shopId).defaultWarehouseId!==warehouse.id,'Kho mặc định phải được giữ hoạt động.',409,'DEFAULT_WAREHOUSE');
            ensure(!all('stock',shopId).some(stock => stock.warehouseId===warehouse.id && (num(stock.onHand)!==0 || num(stock.reserved)!==0 || num(stock.quarantined)>0)),'Kho còn tồn hoặc hàng đang giữ.',409,'WAREHOUSE_STOCK');
            ensure(!all('orders',shopId).some(order => order.warehouseId===warehouse.id && !['completed','cancelled'].includes(str(order.orderState))) && !all('purchases',shopId).some(purchase => purchase.warehouseId===warehouse.id && !['received','cancelled'].includes(str(purchase.status))) && !all('shipments',shopId).some(shipment => shipment.warehouseId===warehouse.id && !['delivered','returned','cancelled'].includes(str(shipment.state))),'Kho còn nghiệp vụ đang mở.',409,'WAREHOUSE_OPEN_WORK');
            ensure(!all('reorderRules',shopId).some(rule => rule.warehouseId===warehouse.id && rule.enabled),'Kho còn quy tắc nhập hàng đang bật.',409,'WAREHOUSE_ACTIVE_RULE');
            warehouse.status='archived';touch(warehouse);return command(shopId,op,{type:'warehouse',id:warehouse.id});
        }
        case 'listAccounts':return lookup(all('accounts',shopId).map(account => ({...account,used:accountUsed(account,shopId)})),input);
        case 'getAccount': {const account=find('accounts',input.id,shopId);return {...account,used:accountUsed(account,shopId)};}
        case 'createAccount':requiredText(body,['code','name']);uniqueCode('accounts',shopId,body.code);return insert('accounts','Account',shopId,{...body,status:'active',used:false});
        case 'updateAccount': {
            const account=find('accounts',input.id,shopId);checkVersion(account,input);ensure(account.status==='active','Tài khoản đã ngừng dùng.');const used=accountUsed(account,shopId);
            requiredText(body,['code','name']);
            ensure(!used || ((body.code===undefined || body.code===account.code) && (body.group===undefined || body.group===account.group)),'Mã và nhóm đã dùng trong chứng từ không được sửa.',409,'ACCOUNT_USED');
            uniqueCode('accounts',shopId,body.code ?? account.code,account.id);return {...touch(Object.assign(account,body)),used};
        }
        case 'archiveAccount': {
            const account=find('accounts',input.id,shopId);checkVersion(account,input);ensure(account.status==='active','Tài khoản đã ngừng dùng.');
            ensure(!all('journals',shopId).some(journal => journal.status==='draft' && rows(journal.lines).some(line => line.accountId===account.id)),'Tài khoản còn bút toán nháp chưa xử lý.',409,'ACCOUNT_DRAFT');
            account.status='archived';touch(account);return command(shopId,op,{type:'account',id:account.id});
        }
        default:return undefined;
    }
}
