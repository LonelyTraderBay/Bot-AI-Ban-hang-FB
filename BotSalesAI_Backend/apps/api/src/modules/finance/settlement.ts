import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { PaymentEvidenceKind, Prisma } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { requireVersion } from '../../http/response.js';
import { commandDto } from '../../platform/commands/index.js';
import { ExactDecimal, proportionalAmount } from '../../platform/money/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { recordStockMovement } from '../inventory/index.js';
import { FinanceAccess } from './access.js';
import type { Version } from './book.js';
import { pairedLines } from './entries.js';
import { cleanFinanceText, financeKey, financeMoney, financeShop, localAccountingDate, lockOpenPeriod, parseMoney,
    systemAccounts, writeJournal, type Money } from './journal.js';

type Observation = Version & { amount: Money; reason: string; evidenceRef: string };
export type Payment = Observation & { method: 'cash' | 'bank_transfer' | 'external'; reference: string };
export type Refund = Observation & { paymentReference: string };
export type Adjustment = Version & { warehouseId: string; variantId: string; quantityDelta: number; reason: string; unitCost: Money | null };

async function orderForPayment(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const order = await tx.salesOrder.findUnique({ where: financeKey(shopId, id) });
    if (!order) throw new NotFoundException();
    return order;
}

async function readEvidence(tx: Prisma.TransactionClient, shopId: string, orderId: string, body: Observation, reference: string,
    kinds: PaymentEvidenceKind[], currency: string) {
    if (!validUuid(body.evidenceRef)) throw new UnprocessableEntityException();
    const amount = parseMoney(body.amount, currency, true);
    const evidence = await tx.paymentEvidence.findFirst({
        where: { shopId, orderId, id: body.evidenceRef, reference, currency, kind: { in: kinds }, verifiedAt: { lte: new Date() } },
    });
    if (!evidence || !evidence.amount.eq(amount)) throw new UnprocessableEntityException();
    if (await tx.financeEntry.findUnique({ where: { shopId_evidenceId: { shopId, evidenceId: evidence.id } }, select: { id: true } })) {
        throw new ConflictException();
    }
    return evidence;
}

async function moneyOnOrder(tx: Prisma.TransactionClient, shopId: string, orderId: string) {
    const data = await tx.financeEntry.groupBy({
        by: ['kind'], where: { shopId, orderId, status: 'posted' }, _sum: { amount: true },
    });
    return {
        paid: new ExactDecimal(data.find(item => item.kind === 'receipt')?._sum.amount ?? 0),
        refunded: new ExactDecimal(data.find(item => item.kind === 'disbursement')?._sum.amount ?? 0),
    };
}

const paymentKinds: Record<Payment['method'], PaymentEvidenceKind[]> = {
    cash: ['cash_receipt'], bank_transfer: ['bank_receipt'], external: ['provider_receipt', 'carrier_collection'],
};

export class FinanceSettlement extends FinanceAccess {
    pay(headers: IncomingHttpHeaders, shopId: string, id: string, body: Payment, requestId: string) {
        const reference = cleanFinanceText(body.reference);
        const reason = cleanFinanceText(body.reason, 5);
        return this.write({ headers, shopId, action: 'payOrder', payload: { id, body }, requestId, reason }, async tx => {
            const order = await orderForPayment(tx, shopId, id);
            requireVersion(order.version, body.expectedVersion);
            if (order.orderState === 'cancelled' || order.paymentState === 'settled') throw new ConflictException();
            const { currency, timezone } = await financeShop(tx, shopId);
            if (order.currency !== currency) throw new ConflictException();
            const evidence = await readEvidence(tx, shopId, id, body, reference, paymentKinds[body.method], currency);
            const { paid, refunded } = await moneyOnOrder(tx, shopId, id);
            const gross = paid.minus(refunded).plus(evidence.amount);
            if (gross.gt(order.total)) throw new UnprocessableEntityException();
            const effectiveDate = localAccountingDate(evidence.observedAt, timezone);
            await lockOpenPeriod(tx, shopId, effectiveDate);
            const cod = evidence.kind === 'carrier_collection';
            if (cod) {
                if (order.paymentMethod !== 'cod' || order.fulfillmentState !== 'delivered') throw new ConflictException();
            } else if (!['unfulfilled', 'reserved', 'picking', 'packed'].includes(order.fulfillmentState) || order.paymentState === 'cod_collected') {
                throw new ConflictException();
            }
            const amount = financeMoney(evidence.amount, currency);
            let journalId: string | null = null;
            if (!cod) {
                const [liquid, deposit] = await systemAccounts(tx, shopId, body.method === 'cash' ? 'cash' : 'bank', 'customer_deposit');
                const { journal } = await writeJournal(tx, shopId, {
                    sourceType: 'order_payment', sourceId: evidence.id, sourceRevision: 1, eventType: 'receive', effectiveDate,
                    lines: pairedLines(liquid, deposit, amount, 'Ghi nhận tiền khách đã trả'), reason,
                }, true);
                journalId = journal.id;
            }
            const entry = await tx.financeEntry.create({
                data: {
                    shopId, orderId: id, amount: evidence.amount, currency, kind: 'receipt', classification: 'sales_receipt',
                    status: 'posted', occurredAt: evidence.observedAt, description: reason,
                    evidenceId: evidence.id, paymentReference: reference, sourceType: 'order', sourceId: id, journalId,
                },
            });
            await enqueueResourceUpdate(tx, 'finance.updated', entry);
            return tx.salesOrder.update({
                where: financeKey(shopId, id), data: {
                    paymentState: cod ? (gross.eq(order.total) ? 'cod_collected' : 'part_paid') : gross.eq(order.total) ? 'verified' : 'part_paid',
                    version: { increment: 1 },
                },
            });
        }, async (_tx, _result, command) => commandDto(command, 'order'));
    }

    refund(headers: IncomingHttpHeaders, shopId: string, id: string, body: Refund, requestId: string) {
        const reference = cleanFinanceText(body.paymentReference);
        const reason = cleanFinanceText(body.reason, 5);
        return this.write({ headers, shopId, action: 'refundOrder', payload: { id, body }, requestId, reason }, async tx => {
            const order = await orderForPayment(tx, shopId, id);
            requireVersion(order.version, body.expectedVersion);
            if (!['unfulfilled', 'reserved'].includes(order.fulfillmentState)) throw new ConflictException();
            const { currency, timezone } = await financeShop(tx, shopId);
            if (order.currency !== currency) throw new ConflictException();
            const evidence = await readEvidence(tx, shopId, id, body, reference, ['observed_refund'], currency);
            const { paid, refunded } = await moneyOnOrder(tx, shopId, id);
            const cumulative = refunded.plus(evidence.amount);
            if (!paid.gt(0) || cumulative.gt(paid)) throw new UnprocessableEntityException();
            const [deposit, bank] = await systemAccounts(tx, shopId, 'customer_deposit', 'bank');
            const { journal } = await writeJournal(tx, shopId, {
                sourceType: 'order_refund', sourceId: evidence.id, sourceRevision: 1, eventType: 'refund',
                effectiveDate: localAccountingDate(evidence.observedAt, timezone), reason,
                lines: pairedLines(deposit, bank, financeMoney(evidence.amount, currency), 'Ghi nhận khoản đã hoàn'),
            }, true);
            const entry = await tx.financeEntry.create({
                data: {
                    shopId, orderId: id, kind: 'disbursement', classification: 'sales_receipt', currency, amount: evidence.amount,
                    status: 'posted', occurredAt: evidence.observedAt, description: reason,
                    sourceType: 'order_refund', sourceId: id, paymentReference: reference, evidenceId: evidence.id, journalId: journal.id,
                },
            });
            await enqueueResourceUpdate(tx, 'finance.updated', entry);
            return tx.salesOrder.update({
                where: financeKey(shopId, id),
                data: { paymentState: cumulative.eq(paid) ? 'refunded' : 'part_refunded', version: { increment: 1 } },
            });
        }, async (_tx, _result, command) => commandDto(command, 'order'));
    }

    adjust(headers: IncomingHttpHeaders, shopId: string, body: Adjustment, requestId: string) {
        const reason = cleanFinanceText(body.reason, 5);
        return this.write({ headers, shopId, action: 'createInventoryAdjustment', payload: body, requestId, reason }, async (tx, scope, commandId) => {
            const { warehouseId, variantId, quantityDelta, unitCost } = body;
            if (![warehouseId, variantId].every(validUuid) || !Number.isInteger(quantityDelta) || quantityDelta === 0) throw new UnprocessableEntityException();
            if (unitCost && !scope.permissions.includes('finance.read')) throw new ForbiddenException();
            const stock = await tx.stockPosition.findUnique({ where: { shopId_warehouseId_variantId: { shopId, warehouseId, variantId } } });
            if (!stock) throw new NotFoundException();
            requireVersion(stock.version, body.expectedVersion);
            const { currency, timezone } = await financeShop(tx, shopId);
            const effectiveDate = localAccountingDate(new Date(), timezone);
            await lockOpenPeriod(tx, shopId, effectiveDate);
            const observed = unitCost ? parseMoney(unitCost, currency) : null;
            const unitValue = quantityDelta <= 0 ? null : observed ?? (stock.onHand > 0 ? proportionalAmount(stock.carryingValue, 1, stock.onHand) : null);
            if (quantityDelta > 0 && unitValue === null) throw new UnprocessableEntityException();
            const receivedValue = unitValue ? financeMoney(unitValue.mul(quantityDelta), currency).amount : undefined;
            const movement = await recordStockMovement(tx, {
                shopId, warehouseId, variantId, actorId: scope.userId, kind: 'adjustment',
                source: { type: 'stock_adjustment', id: commandId }, reason, delta: { onHand: quantityDelta },
                expectedVersion: body.expectedVersion, receivedValue,
            });
            const value = new ExactDecimal(movement.carryingDelta);
            if (!value.isZero()) {
                const gain = value.isPositive();
                const [asset, counterpart] = await systemAccounts(tx, shopId, 'inventory', gain ? 'inventory_gain' : 'inventory_loss');
                await writeJournal(tx, shopId, {
                    sourceType: 'stock_adjustment', sourceId: movement.id, eventType: 'adjust', sourceRevision: 1, effectiveDate, reason,
                    lines: pairedLines(gain ? asset : counterpart, gain ? counterpart : asset, financeMoney(value.abs(), currency), reason),
                }, true);
            }
            return movement;
        }, async (_tx, _result, command) => commandDto(command, 'stock_movement'));
    }
}
