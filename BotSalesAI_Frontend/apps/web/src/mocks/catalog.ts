import { all, find, insert, ensure, checkVersion, touch, command, str, num, rows, record, id, now, stockFor, move, variant, units, zero, money } from './database';
import type { Input, Row } from './database';
import { activeWarehouse } from './masters';
import { carryingValue, setStockValue, postBusinessJournal } from './accounting';
export function catalog(op: string, input: Input): Row | undefined {
    const { shopId, body } = input;
    switch (op) {
        case 'createProduct':
        case 'updateProduct': {
            const existing = op === 'updateProduct' ? find('products', input.id, shopId) : undefined;
            if (existing)
                checkVersion(existing, input);
            const variants = rows(body.variants ?? existing?.variants);
            ensure(variants.length > 0, 'Cần ít nhất một biến thể.', 422);
            ensure(new Set(variants.map(v => str(v.sku).toLowerCase())).size === variants.length, 'Mã SKU trong sản phẩm bị trùng.', 422);
            for (const v of variants) {
                ensure(!all('products', shopId).some(p => p.id !== existing?.id && rows(p.variants).some(other => str(other.sku).toLowerCase() === str(v.sku).toLowerCase())), 'Mã SKU đã tồn tại.', 422, 'SKU_EXISTS');
                ensure(units(v.price) >= 0n, 'Giá bán phải không âm.', 422);
                const previous = rows(existing?.variants).find(item => item.id === v.id);
                Object.assign(v, {
                    id: str(v.id) || id('variant'), shopId,
                    version: previous ? num(previous.version) + 1 : 1,
                    createdAt: previous ? str(previous.createdAt) : now(),
                    updatedAt: now(), productId: existing?.id || ''
                });
            }
            if (body.categoryId)
                find('categories', str(body.categoryId), shopId);
            const data = { ...body, variants };
            const product = existing ? touch(Object.assign(existing, data)) : insert('products', 'Product', shopId, { ...data, categoryId: body.categoryId ?? null, imageFileIds: body.imageFileIds || [], description: body.description || '' });
            for (const v of variants) {
                v.productId = str(product.id);
                for(const warehouse of all('warehouses',shopId).filter(w=>w.status==='active'))
                    if (!all('stock', shopId).some(s => s.variantId === v.id && s.warehouseId===warehouse.id))
                        insert('stock', 'StockSnapshot', shopId, { variantId: v.id, warehouseId:warehouse.id, sku: v.sku, onHand: 0, reserved: 0, available: 0, lowStockThreshold: 0, unitCost: null, asOf: now() });
            }
            return product;
        }
        case 'archiveProduct': {
            const p = find('products', input.id, shopId);
            checkVersion(p, input);
            ensure(!all('stock', shopId).some(s => rows(p.variants).some(v => v.id === s.variantId) && num(s.reserved) > 0), 'Sản phẩm đang giữ hàng cho đơn chưa xử lý.');
            p.status = 'archived';
            touch(p);
            return command(shopId, op, { type: 'product', id: p.id });
        }
        case 'createCategory':
        case 'updateCategory': {
            if (body.parentId) {
                ensure(body.parentId !== input.id, 'Danh mục không thể là cha của chính nó.', 422);
                find('categories', str(body.parentId), shopId);
            }
            if (op === 'createCategory')
                return insert('categories', 'Category', shopId, { ...body, parentId: body.parentId ?? null, status: 'active' });
            const c = find('categories', input.id, shopId);
            checkVersion(c, input);
            return touch(Object.assign(c, body));
        }
        case 'archiveCategory': {
            const c = find('categories', input.id, shopId);
            checkVersion(c, input);
            ensure(!all('products', shopId).some(p => p.categoryId === c.id && p.status === 'active'), 'Danh mục còn sản phẩm đang bán.');
            c.status = 'archived';
            touch(c);
            return command(shopId, op, { type: 'category', id: c.id });
        }
        case 'createCustomer': return insert('customers', 'Customer', shopId, { ...body, externalIdentity: null, redactedFields: [] });
        case 'updateCustomer': {
            const c = find('customers', input.id, shopId);
            checkVersion(c, input);
            return touch(Object.assign(c, body));
        }
        case 'createInventoryAdjustment': {
            activeWarehouse(shopId,str(body.warehouseId));
            const s = stockFor(shopId, str(body.variantId), str(body.warehouseId));
            checkVersion(s, input);
            ensure(num(body.quantityDelta) !== 0, 'Số lượng điều chỉnh phải khác 0.', 422);
            variant(shopId, str(body.variantId));
            const oldValue=carryingValue(s),oldQuantity=num(s.onHand),newQuantity=oldQuantity+num(body.quantityDelta),currency=str(find('shops',shopId,shopId).currency);
            ensure(newQuantity>=0,'Điều chỉnh vượt tồn hiện có.',409,'INSUFFICIENT_STOCK');
            if(body.unitCost)ensure(record(body.unitCost).currency===currency&&units(body.unitCost)>=0n,'Giá vốn phải không âm và dùng đồng tiền cửa hàng.',422);
            const nextValue=body.unitCost?units(body.unitCost)*BigInt(newQuantity):oldValue===null?null:oldQuantity===0?(newQuantity===0?0n:null):num(body.quantityDelta)<0?oldValue-oldValue*BigInt(-num(body.quantityDelta))/BigInt(oldQuantity):oldValue+oldValue*BigInt(num(body.quantityDelta))/BigInt(oldQuantity);
            move(input, s, num(body.quantityDelta), 0, 'adjustment', str(body.reason), null);
            if(nextValue!==null) {
                setStockValue(s,nextValue,newQuantity,currency);
                if(oldValue!==null&&nextValue!==oldValue) {
                    const delta=nextValue-oldValue,movement=all('movements',shopId).at(-1);
                    postBusinessJournal(shopId,'stock_adjustment',str(movement?.id),delta>0n?[{code:'156',debit:delta,credit:0n,description:'Điều chỉnh tăng giá trị tồn'},{code:'711',debit:0n,credit:delta,description:'Đối ứng điều chỉnh tồn có nguồn'}]:[{code:'642',debit:-delta,credit:0n,description:'Điều chỉnh giảm giá trị tồn'},{code:'156',debit:0n,credit:-delta,description:'Giảm giá trị tồn có nguồn'}]);
                }
            }else {
                s.carryingValue=null;s.unitCost=null;
            }
            return command(shopId, op, { type: 'stock', id: s.id });
        }
        default: return undefined;
    }
}
export function pricedLines(shopId: string, items: Row[]) {
    ensure(items.length > 0, 'Đơn hàng cần có sản phẩm.', 422);
    ensure(new Set(items.map(l => l.variantId)).size === items.length, 'Gộp số lượng của cùng một biến thể.', 422);
    return items.map(line => {
        const { product, item } = variant(shopId, str(line.variantId));
        ensure(product.status === 'active' && item.active, 'Sản phẩm không còn bán.');
        ensure(Number.isInteger(line.quantity) && num(line.quantity) > 0, 'Số lượng phải là số nguyên dương.', 422);
        return {
            id: line.id || id('line'), variantId: item.id, sku: item.sku, name: `${str(product.name)} · ${str(item.name)}`, quantity: line.quantity, unitPrice: item.price, discount: zero(), lineTotal: money(units(item.price) * BigInt(num(line.quantity)), str((item.price as Row).currency))
        };
    });
}
