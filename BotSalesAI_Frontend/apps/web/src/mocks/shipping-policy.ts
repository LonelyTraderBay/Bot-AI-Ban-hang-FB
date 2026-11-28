import { all, checkVersion, db, ensure, find, now, num, record, rows, str } from './database';
import type { Input, Row } from './database';

function provinceKey(province: string) {
    return province.trim().normalize('NFC').replace(/\s+/gu, ' ').toLocaleLowerCase('vi');
}

function zoneKey(countryCode: string, province: string) {
    return countryCode + ':' + provinceKey(province);
}

function storedPolicy(shopId: string) {
    return all('shippingPolicies', shopId)[0];
}

export function shippingPolicyOperations(operation: string, input: Input) {
    if (operation !== 'getShippingPolicy' && operation !== 'updateShippingPolicy') return undefined;
    const { shopId } = input;
    const current = storedPolicy(shopId) ?? { shopId, version: 1, rules: [] };
    if (operation === 'getShippingPolicy') return current;

    checkVersion(current, input);
    const rules = rows(input.body.rules).map(rule => ({
        countryCode: str(rule.countryCode),
        province: str(rule.province).trim().normalize('NFC').replace(/\s+/gu, ' '),
        serviceName: str(rule.serviceName).trim(),
        amount: str(rule.amount),
    }));
    ensure(rules.every(rule => rule.province && rule.serviceName), 'Nhập tỉnh/thành và tên dịch vụ.', 422, 'INVALID_SHIPPING_RULE');
    const zones = rules.map(rule => zoneKey(rule.countryCode, rule.province));
    ensure(new Set(zones).size === zones.length, 'Mỗi quốc gia và tỉnh/thành chỉ được khai báo một lần.', 422, 'DUPLICATE_SHIPPING_ZONE');
    const saved = { shopId, version: num(current.version) + 1, rules };
    const existing = storedPolicy(shopId);
    if (existing) Object.assign(existing, saved);
    else (db.shippingPolicies ??= []).push(saved);
    return saved;
}

export function shippingRateForQuote(shopId: string, address: Row | null, mode: 'quote' | 'preview' = 'quote'): Row | null {
    const policy = storedPolicy(shopId);
    if (!policy) return null;
    const rules = rows(policy.rules);
    if (!rules.length) return null;
    const countryCode = str(address?.countryCode), province = str(address?.province);
    if (mode === 'preview' && (!countryCode || !province)) return null;
    ensure(countryCode && province, 'Cần quốc gia và tỉnh/thành để báo phí giao hàng.', 422, 'SHIPPING_ADDRESS_INCOMPLETE');
    const rule = rules.find(item => zoneKey(str(item.countryCode), str(item.province)) === zoneKey(countryCode, province));
    if (mode === 'preview' && !rule) return null;
    ensure(rule, 'Địa chỉ nằm ngoài các vùng giao hàng đã cấu hình.', 422, 'SHIPPING_ZONE_UNAVAILABLE');
    return {
        policyVersion: policy.version,
        countryCode: rule.countryCode, province: rule.province, serviceName: rule.serviceName,
        fee: { amount: rule.amount, currency: find('shops', shopId, shopId).currency },
    };
}

export function assertShippingQuoteCurrent(shopId: string, quote: Row) {
    const policy = storedPolicy(shopId);
    const quotedVersion = record(quote.shippingRate).policyVersion;
    const currentVersion = rows(policy?.rules).length ? policy?.version : undefined;
    ensure(quotedVersion === currentVersion && Date.parse(str(quote.expiresAt)) > Date.parse(now()),
        'Phí giao hoặc thời hạn báo giá đã thay đổi. Lấy báo giá mới và xác nhận lại với khách.', 409, 'SHIPPING_QUOTE_STALE');
}
