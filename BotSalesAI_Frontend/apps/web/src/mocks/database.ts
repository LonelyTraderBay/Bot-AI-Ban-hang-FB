/** DEV/TEST ONLY. In-memory API simulator; never imported by a production entry. */
import seed from './seed.json';
import schemaCatalog from '../../../../packages/contracts/src/schemas.json';
import permissionCatalog from '../../../../packages/contracts/src/permissions.json';
export type Row = Record<string, unknown>;
export type Store = Record<string, Row[]>;
export type Input = {
    shopId: string;
    id: string;
    path: Record<string, string>;
    query: URLSearchParams;
    body: Row;
    version?: number;
    userId: string;
};
export class MockFailure extends Error {
    constructor(public status: number, public code: string, message: string) { super(message); }
}
export const record = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
export const str = (value: unknown): string => typeof value === 'string' ? value : '';
export const num = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? value : 0;
export const rows = (value: unknown): Row[] => Array.isArray(value) ? value.map(record) : [];
export const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
export function ensure(condition: unknown, message: string, status = 409, code = 'BUSINESS_CONFLICT'): asserts condition {
    if (!condition)
        throw new MockFailure(status, code, message);
}
let sequence = 10000;
export const id = (prefix = 'demo') => `${prefix}-${++sequence}`;
export const now = () => new Date(Date.parse('2026-09-29T14:00:00Z') + (sequence - 10000) * 1000).toISOString();
export const future = () => new Date(Date.parse(now()) + 15 * 60000).toISOString();
export let db: Store = structuredClone(seed) as Store;
export function resetDb() { db = structuredClone(seed) as Store; sequence = 10000; }
export function restoreDb(snapshot: Store) { db = snapshot; }
export const all = (collection: string, shopId: string) => (db[collection] || []).filter(row => row.shopId === shopId || (collection === 'shops' && row.id === shopId));
export function find(collection: string, resourceId: string, shopId: string): Row {
    const item = all(collection, shopId).find(row => row.id === resourceId);
    ensure(item, 'Không tìm thấy dữ liệu trong cửa hàng hiện tại.', 404, 'NOT_FOUND');
    return item;
}
export function first(collection: string, shopId: string): Row {
    const item = all(collection, shopId)[0];
    ensure(item, 'Chưa có cấu hình hoặc dữ liệu.', 404, 'NOT_CONFIGURED');
    return item;
}
export function checkVersion(item: Row, input: Input) {
    const expected = input.version ?? (typeof input.body.expectedVersion === 'number' ? input.body.expectedVersion : undefined);
    ensure(expected !== undefined, 'Thiếu phiên bản hiện tại.', 428, 'VERSION_REQUIRED');
    ensure(expected === item.version, 'Dữ liệu đã đổi. Tải lại để xem phiên bản mới.', 412, 'STALE_VERSION');
}
export function touch(item: Row) { item.version = num(item.version) + 1; item.updatedAt = now(); return item; }
const schemas: Record<string, unknown> = schemaCatalog.components.schemas;
function initial(schema: Row, depth = 0): unknown {
    if (depth > 12)
        return null;
    if (typeof schema.$ref === 'string')
        return initial(record(schemas[schema.$ref.split('/').pop() || '']), depth + 1);
    if ('const' in schema)
        return schema.const;
    if (Array.isArray(schema.enum))
        return schema.enum[0];
    if (Array.isArray(schema.anyOf) || Array.isArray(schema.oneOf)) {
        const choices = rows(schema.anyOf || schema.oneOf);
        const nullable = choices.find(s => s.type === 'null');
        return initial(nullable || choices[0] || {}, depth + 1);
    }
    if (schema.type === 'object')
        return Object.fromEntries(strings(schema.required).map(key => [key, initial(record(record(schema.properties)[key]), depth + 1)]));
    if (schema.type === 'array')
        return [];
    if (schema.type === 'integer' || schema.type === 'number')
        return num(schema.minimum);
    if (schema.type === 'boolean')
        return false;
    if (schema.type === 'null')
        return null;
    if (schema.format === 'date-time')
        return now();
    if (schema.format === 'date')
        return now().slice(0, 10);
    return '';
}
export function make(schemaName: string, shopId: string, data: Row): Row {
    const base = record(initial(record(schemas[schemaName])));
    if ('id' in base)
        base.id = id(schemaName.toLowerCase());
    if ('shopId' in base)
        base.shopId = shopId;
    if ('version' in base)
        base.version = 1;
    if ('createdAt' in base)
        base.createdAt = now();
    if ('updatedAt' in base)
        base.updatedAt = now();
    return { ...base, ...data };
}
export function insert(collection: string, schema: string, shopId: string, data: Row): Row {
    const value = make(schema, shopId, data);
    (db[collection] ??= []).unshift(value);
    return value;
}
/** Exact fixed-point arithmetic, 4 fractional digits in the simulator. Not a UI calculator. */
const SCALE = 10000n;
export function units(value: unknown): bigint {
    const text = typeof value === 'string' ? value : str(record(value).amount);
    ensure(/^-?\d+(\.\d{1,4})?$/.test(text), 'Số tiền không hợp lệ.', 422, 'INVALID_MONEY');
    const negative = text.startsWith('-');
    const [integer, fraction = ''] = text.replace('-', '').split('.');
    return (BigInt(integer) * SCALE + BigInt(fraction.padEnd(4, '0'))) * (negative ? -1n : 1n);
}
export function money(value: bigint, currency = 'VND'): Row {
    const abs = value < 0n ? -value : value;
    const remainder = (abs % SCALE).toString().padStart(4, '0').replace(/0+$/, '');
    return { amount: `${value < 0n ? '-' : ''}${abs / SCALE}${remainder ? '.' + remainder : ''}`, currency };
}
export const zero = () => money(0n);
export function sum(items: Row[], field: string) { return items.reduce((total, item) => total + (item[field] ? units(item[field]) : 0n), 0n); }
export function command(shopId: string, kind: string, result: Row | null = null): Row {
    return insert('commands', 'Command', shopId, { kind, status: 'succeeded', result, problem: null });
}
export function audit(input: Input, action: string, resource: Row | null = null) {
    insert('audit', 'AuditEvent', input.shopId, {
        actorId: input.userId, action, resource: resource || { type: 'shop', id: input.shopId }, occurredAt: now(), requestId: id('request'), summary: 'Thao tác trên bộ dữ liệu mô phỏng; không gọi dịch vụ bên ngoài.'
    });
}
export function job(shopId: string, kind: string, data: Row = {}) {
    return insert('jobs', 'Job', shopId, {
        kind, status: 'succeeded', completed: 1, total: 1, errorCount: 0, rowErrors: [], validationToken: null, downloadUrl: null, result: null, ...data
    });
}
export function stockFor(shopId: string, variantId: string, warehouseId: string) {
    const stock = all('stock', shopId).find(s => s.variantId === variantId && s.warehouseId === warehouseId);
    ensure(stock, 'Chưa có vị trí tồn kho này.', 422, 'STOCK_NOT_FOUND');
    return stock;
}
export function move(input: Input, stock: Row, quantity: number, reserved: number, kind: string, reason: string, source: Row | null) {
    ensure(num(stock.onHand) + quantity >= 0 && num(stock.reserved) + reserved >= 0 && num(stock.onHand) + quantity >= num(stock.reserved) + reserved, 'Không đủ hàng bán được.', 409, 'INSUFFICIENT_STOCK');
    stock.onHand = num(stock.onHand) + quantity;
    stock.reserved = num(stock.reserved) + reserved;
    stock.available = num(stock.onHand) - num(stock.reserved);
    stock.asOf = now();
    touch(stock);
    insert('movements', 'StockMovement', input.shopId, {
        variantId: stock.variantId, warehouseId: stock.warehouseId, kind, quantityDelta: quantity, reservedDelta: reserved, reason, sourceRef: source, actorId: input.userId
    });
}
export function variant(shopId: string, variantId: string) {
    for (const product of all('products', shopId)) {
        const item = rows(product.variants).find(v => v.id === variantId);
        if (item)
            return { product, item };
    }
    throw new MockFailure(404, 'NOT_FOUND', 'Không tìm thấy biến thể sản phẩm.');
}
export function assertOpenPeriod(shopId: string, date = now().slice(0, 10)) {
    const matching = all('periods', shopId).find(p => str(p.startDate) <= date && str(p.endDate) >= date);
    ensure(matching, 'Chưa có kỳ kế toán cho ngày chứng từ.', 409, 'PERIOD_NOT_CONFIGURED');
    ensure(matching.state === 'open' || matching.status === 'open', 'Kỳ đã khóa; không được ghi thêm.', 409, 'PERIOD_CLOSED');
    return matching;
}
export function grantedPermissions(role: string): string[] {
    const catalog = record(permissionCatalog);
    const roles = record(catalog.rolePresets);
    const entry = roles[role];
    if (Array.isArray(entry))
        return strings(entry);
    const presets = rows(catalog.rolePresets);
    const preset = presets.find(p => p.id === role || p.role === role);
    return strings(record(entry).permissions || preset?.permissions);
}
