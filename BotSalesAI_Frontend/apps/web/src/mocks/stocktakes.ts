import { applyStockAdjustment } from './catalog';
import { fiscalDate } from './accounting';
import { assertOpenPeriod, checkVersion, ensure, find, insert, now, num, rows, stockFor, str, strings, touch } from './database';
import type { Input, Row } from './database';
import { activeWarehouse } from './masters';

function stocktakeLine(stock: Row): Row {
    return { variantId: stock.variantId, sku: stock.sku, baselineVersion: stock.version, expected: stock.onHand, reserved: stock.reserved, counted: null };
}

export function stocktakeOperations(op: string, input: Input) {
    if (!['createStocktake', 'updateStocktake', 'postStocktake'].includes(op)) return undefined;
    const { shopId, body } = input;
    if (op === 'createStocktake') {
        const warehouse = activeWarehouse(shopId, str(body.warehouseId));
        const variantIds = strings(body.variantIds);
        ensure(variantIds.length > 0 && new Set(variantIds).size === variantIds.length, 'Chọn ít nhất một SKU và gộp mã trùng.', 422);
        ensure(str(body.reason).trim().length >= 5, 'Nhập lý do mở phiên kiểm kê.', 422);
        return insert('stocktakes', 'Stocktake', shopId, {
            warehouseId: warehouse.id, reason: str(body.reason).trim(), status: 'counting',
            lines: variantIds.map(id => stocktakeLine(stockFor(shopId, id, str(warehouse.id)))),
            countedBy: input.userId, reviewedBy: null, reviewReason: null, postedAt: null,
        });
    }
    const session = find('stocktakes', input.id, shopId);
    checkVersion(session, input);
    ensure(session.status === 'counting' || session.status === 'submitted', 'Phiên đã kết thúc.');
    if (op === 'updateStocktake' && body.action === 'cancel') {
        const reason = str(body.reason).trim();
        ensure(reason.length >= 5, 'Nhập lý do hủy phiên.', 422);
        return touch(Object.assign(session, { status: 'cancelled', reviewReason: reason, reviewedBy: input.userId }));
    }

    const warehouseId = str(session.warehouseId);
    activeWarehouse(shopId, warehouseId);
    const lines = rows(session.lines);
    const positions = lines.map(line => ({ line, stock: stockFor(shopId, str(line.variantId), warehouseId) }));
    if (op === 'postStocktake') {
        const reason = str(body.reason).trim();
        ensure(session.status === 'submitted' && reason.length >= 5, 'Chỉ ghi phiên đã gửi duyệt và có lý do.', 422);
        assertOpenPeriod(shopId, fiscalDate(shopId));
        for (const { line, stock } of positions) {
            ensure(line.baselineVersion === stock.version, 'Tồn đã thay đổi. Cập nhật mốc và đếm lại dòng bị ảnh hưởng.', 409, 'STOCKTAKE_BASELINE_STALE');
            ensure(typeof line.counted === 'number' && num(line.counted) >= num(stock.reserved),
                'Số đếm thấp hơn lượng đang giữ hoặc còn thiếu.', 409, 'INSUFFICIENT_STOCK');
        }
        for (const { line, stock } of positions) {
            const difference = num(line.counted) - num(line.expected);
            if (difference) applyStockAdjustment(input, stock, difference, reason, { type: 'stocktake', id: session.id });
        }
        return touch(Object.assign(session, { status: 'posted', reviewedBy: input.userId, reviewReason: reason, postedAt: now() }));
    }
    if (body.action === 'rebase') {
        session.lines = positions.map(({ line, stock }) => line.baselineVersion === stock.version ? line : stocktakeLine(stock));
        session.status = 'counting';
        return touch(session);
    }
    ensure(session.status === 'counting', 'Phiên đang chờ duyệt. Cập nhật mốc để tiếp tục đếm.');
    if (body.action === 'count') {
        const counts = rows(body.counts);
        ensure(counts.length > 0 && new Set(counts.map(count => count.variantId)).size === counts.length, 'Nhập số đếm cho SKU trong phiên.', 422);
        for (const count of counts) {
            const line = lines.find(item => item.variantId === count.variantId);
            ensure(line && typeof count.counted === 'number' && Number.isSafeInteger(count.counted) && count.counted >= 0,
                'SKU hoặc số đếm không hợp lệ.', 422);
            line.counted = count.counted;
        }
        session.countedBy = input.userId;
    } else {
        ensure(body.action === 'submit' && lines.every(line => line.counted !== null), 'Nhập đủ số đếm trước khi gửi duyệt.', 422);
        ensure(positions.every(({ line, stock }) => line.baselineVersion === stock.version), 'Tồn đã thay đổi. Cập nhật mốc trước khi gửi duyệt.', 409, 'STOCKTAKE_BASELINE_STALE');
        session.status = 'submitted';
    }
    return touch(session);
}
