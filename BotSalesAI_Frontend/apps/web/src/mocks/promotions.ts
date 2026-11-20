import { dateOnlyInTimezone, isValidDateOnly } from '../shared/model/format';
import { dispatchCost } from './accounting';
import { checkVersion, ensure, find, insert, money, now, num, record, rows, stockFor, str, sum, touch, units, variant } from './database';
import type { Input, Row } from './database';

export function promotionCurrent(promotion: Row, shopDate: string) {
    return promotion.status === 'active' && str(promotion.startsOn) <= shopDate && shopDate <= str(promotion.endsOn);
}

export function promotionDate(shopId: string) {
    return dateOnlyInTimezone(new Date(now()), str(find('shops', shopId, shopId).timezone));
}

export function promotionOperations(op: string, input: Input) {
    const { shopId, body } = input;
    if (op === 'decidePromotion') {
        const current = find('promotions', input.id, shopId);
        checkVersion(current, input);
        ensure(str(body.reason).trim().length >= 5, 'Nhập lý do duyệt hoặc tạm dừng.', 422);
        if (body.action === 'activate') {
            ensure(current.status !== 'active' && str(current.endsOn) >= promotionDate(shopId), 'Chương trình đang bật hoặc đã hết hiệu lực.');
            validateLines(shopId, rows(current.lines));
            current.status = 'active';
        } else {
            ensure(current.status === 'active', 'Chỉ tạm dừng chương trình đang bật.');
            current.status = 'paused';
        }
        return touch(current);
    }
    if (op !== 'createPromotion' && op !== 'updatePromotion') return undefined;
    const name = str(body.name).trim(), startsOn = str(body.startsOn), endsOn = str(body.endsOn), lines = rows(body.lines);
    ensure(name && isValidDateOnly(startsOn) && isValidDateOnly(endsOn) && startsOn <= endsOn,
        'Tên và khoảng ngày hiệu lực phải hợp lệ.', 422, 'PROMOTION_DATES');
    ensure(units(body.discountAmount) > 0n, 'Mức giảm phải lớn hơn 0.', 422);
    validateLines(shopId, lines);
    const detailedLines = lines.map(line => {
        const { product, item } = variant(shopId, str(line.variantId));
        return { ...line, sku: item.sku, label: str(product.name) + ' · ' + str(item.name) };
    });
    const draft = { ...body, name, lines: detailedLines, status: 'draft' };
    if (op === 'createPromotion') return insert('promotions', 'Promotion', shopId, draft);
    const current = find('promotions', input.id, shopId);
    checkVersion(current, input);
    ensure(current.status !== 'active', 'Tạm dừng chương trình trước khi sửa.');
    return touch(Object.assign(current, draft));
}

function validateLines(shopId: string, lines: Row[]) {
    ensure(lines.length >= 2 && new Set(lines.map(line => line.variantId)).size === lines.length,
        'Combo cần ít nhất hai biến thể khác nhau.', 422, 'PROMOTION_LINES');
    for (const line of lines) {
        const { product, item } = variant(shopId, str(line.variantId));
        ensure(product.status === 'active' && item.active, 'Combo chỉ dùng sản phẩm đang bán.', 422, 'PROMOTION_LINES');
    }
}

export function applyPromotion(shopId: string, warehouseId: string, promotionId: string, lines: Row[]) {
    if (!promotionId) return { lines, promotion: null };
    const promotion = find('promotions', promotionId, shopId);
    ensure(promotionCurrent(promotion, promotionDate(shopId)), 'Ưu đãi chưa bật, đã dừng hoặc hết hạn.', 409, 'PROMOTION_INACTIVE');
    const currency = str(find('shops', shopId, shopId).currency);
    ensure(lines.every(line => record(line.unitPrice).currency === currency),
        'Đơn áp dụng ưu đãi cần dùng cùng đồng tiền cửa hàng.', 422, 'PROMOTION_CURRENCY');
    const matched = rows(promotion.lines).map(required => {
        const line = lines.find(item => item.variantId === required.variantId);
        const quantity = num(required.quantity);
        ensure(line && num(line.quantity) >= quantity, 'Đơn chưa có đủ SKU và số lượng tối thiểu cho combo.', 422, 'PROMOTION_INELIGIBLE');
        const stock = stockFor(shopId, str(line.variantId), warehouseId);
        ensure(num(stock.available) >= num(line.quantity), 'Không đủ tồn khả dụng cho combo.', 409, 'INSUFFICIENT_STOCK');
        const valuation = stock.carryingValue ?? stock.unitCost;
        ensure(!valuation || record(valuation).currency === currency, 'Giá vốn ưu đãi cần dùng đồng tiền cửa hàng.', 422, 'PROMOTION_CURRENCY');
        const cost = dispatchCost(stock, quantity);
        ensure(cost !== null, 'Chưa có giá vốn combo.', 409, 'COST_NOT_KNOWN');
        return { line, gross: units(line.unitPrice) * BigInt(quantity), cost };
    });
    const gross = matched.reduce((total, row) => total + row.gross, 0n);
    const cost = matched.reduce((total, row) => total + row.cost, 0n);
    const discount = units(promotion.discountAmount);
    const net = gross - discount;
    ensure(net > 0n && (net - cost) * 100n >= net * BigInt(num(promotion.minMarginPercent)),
        'Mức giảm vượt giá bán hoặc biên lợi nhuận cho phép.', 409, 'PROMOTION_MARGIN');
    let cumulativeGross = 0n;
    const byVariant = new Map(matched.map(({ line, gross: weight }) => {
        const previous = discount * cumulativeGross / gross;
        cumulativeGross += weight;
        return [line.variantId, discount * cumulativeGross / gross - previous];
    }));
    return {
        lines: lines.map(line => {
            const reduction = byVariant.get(line.variantId);
            return reduction === undefined ? line : {
                ...line, discount: money(reduction, currency), lineTotal: money(units(line.lineTotal) - reduction, currency),
            };
        }),
        promotion: { id: promotion.id, version: promotion.version, name: promotion.name, discount: money(discount, currency) },
    };
}

export function assertPaidPromotionPrice(order: Row, lines: Row[]) {
    if (order.promotionId && order.paymentState !== 'unpaid') {
        ensure(sum(lines, 'lineTotal') === units(order.total), 'Đơn đã có tiền xác minh. Đối chiếu khoản thu trước khi đổi số tiền.', 409, 'PAID_PROMOTION_CHANGED');
    }
}

export function assertPromotionQuote(order: Row, quote: Row, current: ReturnType<typeof applyPromotion>) {
    const saved = record(quote.promotion);
    ensure((saved.id ?? null) === (current.promotion?.id ?? null) && (saved.version ?? null) === (current.promotion?.version ?? null)
        && sum(current.lines, 'lineTotal') === units(quote.total),
        'Ưu đãi hoặc số tiền đã đổi. Lấy báo giá và xác nhận lại.', 409, 'PROMOTION_QUOTE_STALE');
    assertPaidPromotionPrice(order, current.lines);
}
