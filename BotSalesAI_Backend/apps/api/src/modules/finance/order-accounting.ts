import { ConflictException } from '@nestjs/common';
import type { Prisma, SalesOrder } from '../../generated/prisma/client.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { pairedLines } from './entries.js';
import { financeMoney, financeShop, localAccountingDate, systemAccounts, writeJournal } from './journal.js';
import { allocationTotals } from './reconciliation-data.js';
import { requireShipmentCost } from './shipment-cost.js';

type Posting = {
    shopId: string; sourceId: string; at: Date; currency: string;
    sourceRevision?: number; reason?: string;
};
type AccountingPair = { debit: string; credit: string; amount: Prisma.Decimal; description: string };

export async function bookBusinessPairs(tx: Prisma.TransactionClient, input: Posting, sourceType: string, eventType: string, pairs: AccountingPair[]) {
    const changes = pairs.filter(pair => pair.amount.gt(0));
    if (!changes.length) return;
    const { currency, timezone } = await financeShop(tx, input.shopId);
    if (currency !== input.currency) throw new ConflictException();
    const keys = [...new Set(changes.flatMap(pair => [pair.debit, pair.credit]))];
    const accounts = await systemAccounts(tx, input.shopId, ...keys);
    const { journal } = await writeJournal(tx, input.shopId, {
        sourceType, sourceId: input.sourceId, sourceRevision: input.sourceRevision ?? 1, eventType,
        effectiveDate: localAccountingDate(input.at, timezone), reason: input.reason ?? changes[0].description,
        lines: changes.flatMap(pair => pairedLines(accounts[keys.indexOf(pair.debit)], accounts[keys.indexOf(pair.credit)],
            financeMoney(pair.amount, currency), pair.description)),
    }, true);
    return journal;
}

export async function moneyOnOrder(tx: Prisma.TransactionClient, shopId: string, orderId: string) {
    const data = await tx.financeEntry.groupBy({
        by: ['kind'], where: { shopId, orderId, status: 'posted' }, _sum: { amount: true },
    });
    const allocations = await tx.settlementAllocation.findMany({
        where: { shopId, orderId }, select: { amount: true, bankAmount: true, applications: { select: { amount: true } } },
    });
    return {
        paid: allocationTotals(allocations).additionalVerified.plus(data.find(item => item.kind === 'receipt')?._sum.amount ?? 0),
        refunded: new ExactDecimal(data.find(item => item.kind === 'disbursement')?._sum.amount ?? 0),
    };
}

export async function returnBalances(tx: Prisma.TransactionClient, shopId: string, orderId: string) {
    const totals = await tx.orderReturn.aggregate({
        where: { shopId, orderId, state: 'inspected' }, _sum: { refundObligation: true, receivableCredit: true },
    });
    return {
        refund: new ExactDecimal(totals._sum.refundObligation ?? 0),
        credit: new ExactDecimal(totals._sum.receivableCredit ?? 0),
    };
}

export function bookHandover(tx: Prisma.TransactionClient, input: Posting, cost: Prisma.Decimal) {
    return bookBusinessPairs(tx, input, 'shipment', 'handover', [
        { debit: 'inventory_transit', credit: 'inventory', amount: cost, description: 'Chuyển giá vốn sang hàng đang giao' },
    ]);
}

export async function bookDelivery(tx: Prisma.TransactionClient, input: Posting, order: SalesOrder) {
    const cost = await requireShipmentCost(tx, input.shopId, input.sourceId);
    const { paid, refunded } = await moneyOnOrder(tx, input.shopId, order.id);
    const deposit = paid.minus(refunded);
    const balance = new ExactDecimal(order.total).minus(deposit);
    if (deposit.lt(0) || balance.lt(0) || (order.paymentMethod === 'prepay' && !balance.isZero())) throw new ConflictException();
    return bookBusinessPairs(tx, input, 'shipment', 'delivery', [
        { debit: 'customer_deposit', credit: 'sales', amount: deposit, description: 'Ghi doanh thu từ tiền khách đã trả' },
        { debit: 'carrier_receivable', credit: 'sales', amount: balance, description: 'Ghi doanh thu và COD phải thu' },
        { debit: 'cost_of_goods', credit: 'inventory_transit', amount: cost, description: 'Chuyển hàng đã giao sang giá vốn' },
    ]);
}

export async function bookInspectedReturn(tx: Prisma.TransactionClient, input: Posting, order: SalesOrder,
    delivered: boolean, salesValue: Prisma.Decimal, sellableCost: Prisma.Decimal, damagedTransitCost: Prisma.Decimal) {
    const { paid, refunded } = await moneyOnOrder(tx, input.shopId, order.id);
    const earlier = await returnBalances(tx, input.shopId, order.id);
    const net = paid.minus(refunded);
    // Pre-delivery refunds reduce the deposit already. Post-delivery payouts reduce earlier obligations.
    const priorPayout = await tx.financeEntry.aggregate({
        where: { shopId: input.shopId, orderId: order.id, status: 'posted', sourceType: 'return_refund' }, _sum: { amount: true },
    });
    const open = earlier.refund.minus(priorPayout._sum.amount ?? 0);
    if (net.lt(0) || open.lt(0)) throw new ConflictException();
    const availablePaid = ExactDecimal.max(0, net.minus(open));
    const collected = net.plus(priorPayout._sum.amount ?? 0);
    const credit = delivered ? ExactDecimal.min(salesValue, ExactDecimal.max(0, new ExactDecimal(order.total).minus(collected).minus(earlier.credit))) :
        new ExactDecimal(0);
    const refund = ExactDecimal.min(new ExactDecimal(salesValue).minus(credit), availablePaid);
    if (delivered && !credit.plus(refund).eq(salesValue)) throw new ConflictException();
    await bookBusinessPairs(tx, input, 'return_case', 'inspect', [
        { debit: delivered ? 'sales_returns' : 'customer_deposit', credit: 'refund_payable', amount: refund, description: 'Ghi nghĩa vụ hoàn sau khi kiểm hàng' },
        { debit: 'sales_returns', credit: 'carrier_receivable', amount: credit, description: 'Giảm công nợ COD chưa thu' },
        { debit: 'inventory', credit: delivered ? 'cost_of_goods' : 'inventory_transit', amount: sellableCost, description: 'Nhập lại hàng đạt kiểm' },
        { debit: 'inventory_loss', credit: 'inventory_transit', amount: damagedTransitCost, description: 'Ghi giảm hàng vận chuyển không đạt kiểm' },
    ]);
    return { refund, credit };
}
