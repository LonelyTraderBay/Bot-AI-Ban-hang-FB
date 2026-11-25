import { all, find, insert, ensure, checkVersion, touch, command, str, num, rows, record, id, now, stockFor, move, variant, units, zero, money, MockFailure } from './database';
import type { Input, Row } from './database';
import { activeWarehouse } from './masters';
import { carryingValue, setStockValue, postBusinessJournal } from './accounting';
const skuKey = (value: unknown) => str(value).trim().normalize('NFC').toLowerCase();

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
            const taken = new Set(all('products', shopId).filter(product => product.id !== existing?.id)
                .flatMap(product => rows(product.variants).map(other => skuKey(other.sku))));
            for (const [position, v] of variants.entries()) {
                const key = skuKey(v.sku);
                if (taken.has(key)) {
                    const message = 'Mã SKU đã tồn tại trong cửa hàng.';
                    throw new MockFailure(409, 'CONFLICT', message, [{ path: `/variants/${position}/sku`, code: 'SKU_CONFLICT', message }]);
                }
                taken.add(key);
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
            applyStockAdjustment(input, s, num(body.quantityDelta), str(body.reason), null, body.unitCost);
            return command(shopId, op, { type: 'stock', id: s.id });
        }
        default: return undefined;
    }
}

export function applyStockAdjustment(input: Input, stock: Row, quantity: number, reason: string, source: Row | null, unitCost?: unknown) {
    const { shopId } = input;
    const currentValue = carryingValue(stock), currentQuantity = num(stock.onHand);
    const nextQuantity = currentQuantity + quantity;
    const currency = str(find('shops', shopId, shopId).currency);
    ensure(nextQuantity >= num(stock.reserved), 'Tồn sau điều chỉnh thấp hơn lượng đang giữ.', 409, 'INSUFFICIENT_STOCK');
    if (unitCost) ensure(record(unitCost).currency === currency && units(unitCost) >= 0n, 'Giá vốn phải không âm và dùng đồng tiền cửa hàng.', 422);
    const movement = move(input, stock, quantity, 0, 'adjustment', reason, source);
    const nextValue = unitCost ? units(unitCost) * BigInt(nextQuantity)
        : nextQuantity === 0 ? 0n
        : currentValue === null || currentQuantity === 0 ? null
        : currentValue + currentValue * BigInt(quantity) / BigInt(currentQuantity);
    if (nextValue === null) {
        stock.carryingValue = null;
        stock.unitCost = null;
        return;
    }
    setStockValue(stock, nextValue, nextQuantity, currency);
    if (currentValue === null || nextValue === currentValue) return;
    const difference = nextValue - currentValue;
    postBusinessJournal(shopId, 'stock_adjustment', str(movement.id), difference > 0n ? [
        { code: '156', debit: difference, credit: 0n, description: 'Điều chỉnh tăng giá trị tồn' },
        { code: '711', debit: 0n, credit: difference, description: 'Đối ứng điều chỉnh tồn có nguồn' },
    ] : [
        { code: '642', debit: -difference, credit: 0n, description: 'Điều chỉnh giảm giá trị tồn' },
        { code: '156', debit: 0n, credit: -difference, description: 'Giảm giá trị tồn có nguồn' },
    ]);
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
