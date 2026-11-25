import type { MarketingBucket, MarketingSummary, MarketingTrendPoint } from '@botsales/contracts';
import { dateOnlyInTimezone, isValidDateOnly } from '../shared/model/format';
import { all, ensure, first, money, now, num, record, rows, str, units } from './database';
import type { Input } from './database';
import { marketingFixture } from './marketing-fixture';
import { classifiedExpenses } from './accounting';

const DAY_MS = 24 * 60 * 60 * 1000;
const BUCKETS: readonly MarketingBucket[] = ['day', 'week', 'month'];

function addDays(value: string, days: number): string {
    const date = new Date(`${value}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function daysInclusive(fromDate: string, toDate: string): number {
    return Math.floor((Date.parse(`${toDate}T00:00:00.000Z`) - Date.parse(`${fromDate}T00:00:00.000Z`)) / DAY_MS) + 1;
}

function bucketEnd(date: string, bucket: MarketingBucket, rangeEnd: string): string {
    if (bucket === 'day') return date;
    if (bucket === 'week') {
        const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
        const daysToSunday = (7 - weekday) % 7;
        return addDays(date, Math.min(daysToSunday, daysInclusive(date, rangeEnd) - 1));
    }
    const [year = 0, month = 1] = date.split('-').map(Number);
    const nextMonth = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(nextMonth.getTime() - DAY_MS).toISOString().slice(0, 10);
    return lastDay < rangeEnd ? lastDay : rangeEnd;
}

function sumMoney(values: readonly (string | null)[], currency: string): { amount: string; currency: string } | null {
    const present = values.filter((value): value is string => value !== null);
    if (present.length === 0) return null;
    const scale = Math.max(...present.map(value => value.split('.')[1]?.length || 0));
    const factor = 10n ** BigInt(scale);
    const total = present.reduce((sum, value) => {
        const negative = value.startsWith('-');
        const [whole = '0', fraction = ''] = (negative ? value.slice(1) : value).split('.');
        const amount = BigInt(whole) * factor + BigInt((fraction + '0'.repeat(scale)).slice(0, scale) || '0');
        return sum + (negative ? -amount : amount);
    }, 0n);
    const negative = total < 0n;
    const absolute = negative ? -total : total;
    const whole = (absolute / factor).toString();
    const fraction = scale ? (absolute % factor).toString().padStart(scale, '0').replace(/0+$/u, '') : '';
    return { amount: `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`, currency };
}

function aggregate(rows: typeof marketingFixture, fromDate: string, toDate: string, currency: string) {
    const selected = rows.filter(row => row.date >= fromDate && row.date <= toDate);
    const questionCounts = new Map<string, number>();
    const reasonCounts = new Map<string, number>();
    for (const row of selected) {
        for (const question of row.questions) questionCounts.set(question, (questionCounts.get(question) || 0) + 1);
        for (const item of row.lostSaleReasons) reasonCounts.set(item.reason, (reasonCounts.get(item.reason) || 0) + item.count);
    }
    return {
        knownAttributedOrders: selected.reduce((sum, row) => sum + row.knownAttributedOrders, 0),
        unknownAttributionOrders: selected.reduce((sum, row) => sum + row.unknownAttributionOrders, 0),
        estimatedSpend: sumMoney(selected.map(row => row.estimatedSpend), currency),
        topQuestions: [...questionCounts].sort(([left, a], [right, b]) => b - a || left.localeCompare(right, 'vi')).slice(0, 4).map(([question]) => question),
        lostSaleReasons: [...reasonCounts].sort(([left, a], [right, b]) => b - a || left.localeCompare(right, 'vi')).map(([reason, count]) => ({ reason, count })),
    };
}

function getRange(input: Input, timezone: string, asOf: string) {
    const queryFrom = input.query.get('fromDate');
    const queryTo = input.query.get('toDate');
    const bucketValue = input.query.get('bucket') || 'day';
    ensure(BUCKETS.includes(bucketValue as MarketingBucket), 'Chọn nhóm ngày, tuần hoặc tháng hợp lệ.', 422, 'MARKETING_BUCKET_INVALID');
    ensure((queryFrom === null) === (queryTo === null), 'Cần chọn đồng thời ngày bắt đầu và ngày kết thúc.', 422, 'MARKETING_RANGE_INCOMPLETE');

    let fromDate: string;
    let toDate: string;
    if (queryFrom === null || queryTo === null) {
        toDate = dateOnlyInTimezone(new Date(asOf), timezone);
        fromDate = addDays(toDate, -29);
    } else {
        ensure(isValidDateOnly(queryFrom) && isValidDateOnly(queryTo), 'Ngày phải hợp lệ theo định dạng YYYY-MM-DD.', 422, 'MARKETING_DATE_INVALID');
        fromDate = queryFrom;
        toDate = queryTo;
    }
    ensure(fromDate <= toDate, 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.', 422, 'MARKETING_RANGE_REVERSED');
    ensure(daysInclusive(fromDate, toDate) <= 366, 'Khoảng báo cáo không được vượt quá 366 ngày.', 422, 'MARKETING_RANGE_TOO_LARGE');
    return { fromDate, toDate, bucket: bucketValue as MarketingBucket };
}

/** Aggregate only the synthetic event rows that fall inside the shop-local date range. */
export function marketingSummary(input: Input, asOf = now()): MarketingSummary {
    const shop = first('shops', input.shopId);
    const timezone = String(shop.timezone);
    const currency = String(shop.currency);
    const permissions = input.permissions ?? [];
    const range = getRange(input, timezone, asOf);
    const source = input.shopId === 'shop-demo' ? marketingFixture : [];
    const orders = all('orders', input.shopId);
    const confirmedIn = (from: string, to: string) => orders.filter(order => {
        if (order.orderState !== 'confirmed' && order.orderState !== 'completed') return false;
        const instant = str(order.createdAt);
        const day = dateOnlyInTimezone(new Date(instant), timezone);
        return instant <= asOf && day >= from && day <= to;
    });
    const selected = confirmedIn(range.fromDate, range.toDate);
    const estimateOrderId = input.shopId === 'shop-demo' ? 'DH-DEMO-PAID-01' : '';
    const estimateOrder = selected.find(order => order.id === estimateOrderId);
    const estimateDay = estimateOrder ? dateOnlyInTimezone(new Date(str(estimateOrder.createdAt)), timezone) : null;
    const estimateCount = (from: string, to: string) => Number(estimateDay !== null && estimateDay >= from && estimateDay <= to);
    const canReadOrders = permissions.includes('orders.read');
    const advertising = permissions.includes('finance.read') ? classifiedExpenses(input.shopId).filter(row => row.category === 'advertising_expense') : [];
    const actualSpend = (fromDate: string, toDate: string) => {
        const entries = advertising.filter(row => row.day >= fromDate && row.day <= toDate);
        return entries.length ? money(entries.reduce((total, row) => total + row.total, 0n), currency) : null;
    };
    const points: MarketingTrendPoint[] = [];
    for (let fromDate = range.fromDate; fromDate <= range.toDate;) {
        const toDate = bucketEnd(fromDate, range.bucket, range.toDate);
        const values = aggregate(source, fromDate, toDate, currency);
        points.push({ fromDate, toDate, knownAttributedOrders: values.knownAttributedOrders, estimatedAttributedOrders: estimateCount(fromDate, toDate),
            unknownAttributionOrders: values.unknownAttributionOrders, estimatedSpend: values.estimatedSpend, actualSpend: actualSpend(fromDate, toDate) });
        fromDate = addDays(toDate, 1);
    }
    const totals = aggregate(source, range.fromDate, range.toDate, currency);
    const usedPromotions = new Map<string, { name: string; orders: number; discount: bigint; sales: bigint }>();
    for (const order of orders) {
        if (order.orderState === 'cancelled' || !order.promotionAppliedAt || !order.promotion || !order.total) continue;
        const instant = str(order.promotionAppliedAt);
        const date = dateOnlyInTimezone(new Date(instant), timezone);
        if (instant > asOf || date < range.fromDate || date > range.toDate) continue;
        const rule = record(order.promotion), key = str(rule.id);
        const group = usedPromotions.get(key) ?? { name: str(rule.name), orders: 0, discount: 0n, sales: 0n };
        group.orders++;
        group.discount += units(rule.discount);
        group.sales += units(order.total);
        usedPromotions.set(key, group);
    }
    const promotionResults = Array.from(usedPromotions, ([promotionId, group]) => ({
        promotionId, name: group.name, orders: group.orders, discount: money(group.discount, currency), netSales: money(group.sales, currency),
    }));
    let demandStock: MarketingSummary['demandStock'];
    if (canReadOrders && permissions.includes('inventory.read')) {
        const stock = all('stock', input.shopId).filter(row => row.warehouseId === shop.defaultWarehouseId);
        const variants = new Map<string, NonNullable<MarketingSummary['demandStock']>[number]>();
        for (const order of selected) {
            for (const line of rows(order.lines)) {
                const variantId = str(line.variantId);
                const current = variants.get(variantId);
                if (current) { current.orderedUnits += num(line.quantity); continue; }
                const position = stock.find(row => row.variantId === variantId);
                variants.set(variantId, { variantId, sku: str(line.sku), orderedUnits: num(line.quantity),
                    availableUnits: position ? num(position.available) : null, orderId: str(order.id) });
            }
        }
        demandStock = [...variants.values()].sort((a, b) => b.orderedUnits - a.orderedUnits || a.variantId.localeCompare(b.variantId)).slice(0, 25);
    }
    // The demo links predefined synthetic sources. The live API only reads reviewed evidence.
    const estimatedAttributedOrders = estimateCount(range.fromDate, range.toDate);
    const campaignResults = estimatedAttributedOrders ? [{ channel: 'messenger', campaignId: 'mau-thang-9',
        knownOrders: 0, estimatedOrders: 1, orderId: canReadOrders ? estimateOrderId : null,
        attributionSourceId: canReadOrders ? 'ho-so-quy-gan-mau-01' : null, actualSpend: null, spendJournalId: null }] : [];
    const topicDay = '2026-09-29';
    const questionTopics = permissions.includes('conversations.read') && permissions.includes('knowledge.read')
        ? input.shopId === 'shop-demo' && range.fromDate <= topicDay && range.toDate >= topicDay
            ? [{ title: 'Hướng dẫn chọn kích cỡ', knowledgeId: 'k2', count: 2, conversationId: 'cv1' }] : [] : undefined;
    return { asOf, period: { ...range, timezone }, trend: points, ...totals, estimatedAttributedOrders, actualSpend: actualSpend(range.fromDate, range.toDate),
        campaignResults, demandStock, questionTopics,
        ...(promotionResults.length ? { promotionResults } : {}) };
}
