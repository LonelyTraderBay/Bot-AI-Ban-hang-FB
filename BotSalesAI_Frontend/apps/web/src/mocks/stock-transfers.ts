import { carryingValue, dispatchCost, postBusinessJournal, setStockValue } from './accounting';
import { all, checkVersion, db, ensure, find, insert, money, move, now, num, rows, stockFor, str, touch, units, variant } from './database';
import type { Input, Row } from './database';
import { activeWarehouse } from './masters';

function remaining(line: Row) {
    return num(line.quantity) - num(line.received) - num(line.missing);
}

function transferCost(shopId: string, transfer: Row, line: Row) {
    const batch = all('transferCosts', shopId).find(cost => cost.transferId === transfer.id && cost.variantId === line.variantId);
    ensure(batch, 'Thiếu giá vốn đã xuất của phiếu chuyển.', 409, 'COST_NOT_KNOWN');
    return units(batch.value);
}

function completeTransfer(transfer: Row, status: string) {
    return touch(Object.assign(transfer, { status, closedAt: now() }));
}

export function stockTransferOperations(op: string, input: Input) {
    if (op !== 'createStockTransfer' && op !== 'updateStockTransfer') return undefined;
    const { shopId, body } = input;
    if (op === 'createStockTransfer') {
        const from = activeWarehouse(shopId, str(body.fromWarehouseId));
        const to = activeWarehouse(shopId, str(body.toWarehouseId));
        ensure(from.id !== to.id, 'Kho gửi và kho nhận phải khác nhau.', 422, 'TRANSFER_WAREHOUSE');
        const lines = rows(body.lines);
        ensure(lines.length > 0 && new Set(lines.map(line => line.variantId)).size === lines.length, 'Thêm SKU và gộp dòng trùng.', 422);
        ensure(str(body.reason).trim().length >= 5, 'Nhập lý do chuyển kho.', 422);
        return insert('stockTransfers', 'StockTransfer', shopId, {
            fromWarehouseId: from.id, toWarehouseId: to.id, reason: str(body.reason).trim(),
            lines: lines.map(line => {
                const stock = stockFor(shopId, str(line.variantId), str(from.id));
                return { variantId: line.variantId, sku: stock.sku, quantity: line.quantity, received: 0, missing: 0 };
            }),
            status: 'draft', dispatchedAt: null, closedAt: null, discrepancyReason: null,
        });
    }
    const transfer = find('stockTransfers', input.id, shopId);
    checkVersion(transfer, input);
    const action = str(body.action), lines = rows(transfer.lines);
    const source = { type: 'stock_transfer', id: transfer.id };
    const currency = str(find('shops', shopId, shopId).currency);
    if (action === 'cancel') {
        ensure(transfer.status === 'draft', 'Chỉ hủy phiếu chưa xuất.');
        return completeTransfer(transfer, 'cancelled');
    }
    if (action === 'dispatch') {
        ensure(transfer.status === 'draft', 'Chỉ xuất một lần từ phiếu nháp.');
        activeWarehouse(shopId, str(transfer.fromWarehouseId));
        activeWarehouse(shopId, str(transfer.toWarehouseId));
        let totalCost = 0n;
        for (const line of lines) {
            const stock = stockFor(shopId, str(line.variantId), str(transfer.fromWarehouseId)), quantity = num(line.quantity);
            ensure(num(stock.available) >= quantity, 'Không đủ hàng khả dụng để chuyển.', 409, 'INSUFFICIENT_STOCK');
            const value = carryingValue(stock), cost = dispatchCost(stock, quantity);
            ensure(value !== null && cost !== null, 'Cần đối chiếu giá vốn trước khi xuất.', 409, 'COST_NOT_KNOWN');
            setStockValue(stock, value - cost, num(stock.onHand) - quantity, currency);
            move(input, stock, -quantity, 0, 'transfer_out', str(transfer.reason), source);
            (db.transferCosts ??= []).push({ shopId, transferId: transfer.id, variantId: line.variantId, value: money(cost, currency) });
            totalCost += cost;
        }
        if (totalCost > 0n) postBusinessJournal(shopId, 'transfer_dispatch', str(transfer.id), [
            { code: '157', debit: totalCost, credit: 0n, description: 'Hàng đang chuyển giữa kho' },
            { code: '156', debit: 0n, credit: totalCost, description: 'Xuất giá trị từ kho gửi' },
        ]);
        return touch(Object.assign(transfer, { status: 'in_transit', dispatchedAt: now() }));
    }
    ensure(transfer.status === 'in_transit', 'Phiếu chưa xuất hoặc đã kết thúc.');
    if (action === 'close_short') {
        ensure(input.permissions?.includes('warehouses.manage'), 'Cần quyền quản trị kho để đóng thiếu.', 403, 'FORBIDDEN');
        const reason = str(body.reason).trim();
        ensure(reason.length >= 5, 'Nhập lý do thiếu hàng.', 422);
        let outstandingValue = 0n;
        for (const line of lines) {
            const value = transferCost(shopId, transfer, line);
            outstandingValue += value - value * BigInt(num(line.received)) / BigInt(num(line.quantity));
            line.missing = remaining(line);
        }
        if (outstandingValue > 0n) postBusinessJournal(shopId, 'transfer_short', str(transfer.id), [
            { code: '642', debit: outstandingValue, credit: 0n, description: 'Thiếu hàng điều chuyển đã xác nhận' },
            { code: '157', debit: 0n, credit: outstandingValue, description: 'Ghi giảm hàng đang chuyển' },
        ], undefined, reason);
        transfer.discrepancyReason = reason;
        return completeTransfer(transfer, 'closed_short');
    }
    const received = rows(body.lines), destination = str(transfer.toWarehouseId);
    ensure(action === 'receive' && received.length > 0 && new Set(received.map(line => line.variantId)).size === received.length, 'Thêm số nhận cho các SKU của phiếu.', 422);
    activeWarehouse(shopId, destination);
    let totalCost = 0n;
    for (const row of received) {
        const line = lines.find(item => item.variantId === row.variantId);
        const quantity = num(row.quantity);
        ensure(line && Number.isInteger(quantity) && quantity > 0 && quantity <= remaining(line), 'Số nhận vượt lượng đang đi hoặc sai SKU.', 422, 'TRANSFER_RECEIPT');
        const variantId = str(line.variantId);
        variant(shopId, variantId);
        const stock = all('stock', shopId).find(item => item.warehouseId === destination && item.variantId === variantId)
            ?? insert('stock', 'StockSnapshot', shopId, { warehouseId: destination, variantId, sku: line.sku, onHand: 0, reserved: 0, available: 0, lowStockThreshold: 0, unitCost: null, asOf: now() });
        const value = carryingValue(stock), transported = transferCost(shopId, transfer, line);
        ensure(value !== null, 'Cần đối chiếu giá vốn tồn tại kho nhận.', 409, 'COST_NOT_KNOWN');
        const previous = BigInt(num(line.received)), next = previous + BigInt(quantity), sent = BigInt(num(line.quantity));
        const cost = transported * next / sent - transported * previous / sent;
        setStockValue(stock, value + cost, num(stock.onHand) + quantity, currency);
        move(input, stock, quantity, 0, 'transfer_in', 'Nhận hàng điều chuyển', source);
        line.received = Number(next);
        totalCost += cost;
    }
    if (totalCost > 0n) postBusinessJournal(shopId, 'transfer_receipt', `${transfer.id}:${transfer.version}`, [
        { code: '156', debit: totalCost, credit: 0n, description: 'Nhập giá trị vào kho nhận' },
        { code: '157', debit: 0n, credit: totalCost, description: 'Kết chuyển giá trị đã nhận' },
    ]);
    return lines.every(line => remaining(line) === 0) ? completeTransfer(transfer, 'completed') : touch(transfer);
}
