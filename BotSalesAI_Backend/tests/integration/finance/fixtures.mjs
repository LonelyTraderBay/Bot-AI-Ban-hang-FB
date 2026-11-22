import { writeJournal, bookDelivery } from '../../../apps/api/dist/modules/finance/index.js';
import { ExactDecimal } from '../../../apps/api/dist/platform/money/index.js';

export async function deliveredDebt(writer, ledger, shop, customerId, at) {
    const { id: shopId, currency, defaultWarehouseId: warehouseId } = shop;
    const order = await writer.salesOrder.create({ data: {
        shopId, customerId, warehouseId, orderState: 'completed', fulfillmentState: 'delivered',
        paymentMethod: 'cod', total: '249000', currency, notes: '',
    } });
    const shipment = await writer.shipment.create({ data: {
        shopId, orderId: order.id, state: 'delivered', currency, warehouseId,
        deliveredAt: at, handedOverAt: at, lastEventAt: at,
    } });
    await ledger.$transaction(tx => bookDelivery(tx, { shopId, sourceId: shipment.id, at, currency }, order, new ExactDecimal(0)));
    return { order, shipment };
}

export async function independentReceipt(writer, ledger, shop, orderId, at, date, reference, bankAccountId) {
    const { id: shopId, currency } = shop;
    const evidence = await writer.paymentEvidence.create({ data: {
        shopId, orderId, kind: 'bank_receipt', amount: '50000', currency, verifiedAt: at, observedAt: at, reference,
    } });
    await ledger.$transaction(async tx => {
        const account = systemKey => tx.financeAccount.findUniqueOrThrow({ where: { shopId_systemKey: { shopId, systemKey } } });
        const bankAccount = bankAccountId ?? (await account('bank')).id;
        const deposit = await account('customer_deposit');
        const amount = { amount: '50000', currency };
        const zero = { amount: '0', currency };
        const desc = 'Khoản độc lập từ hồ sơ đã ghi';
        const { journal } = await writeJournal(tx, shopId, { sourceType: 'order_payment', sourceId: evidence.id, sourceRevision: 1,
            eventType: 'receive', effectiveDate: date, reason: desc, lines: [
                { accountId: bankAccount, debit: amount, credit: zero, description: desc },
                { accountId: deposit.id, debit: zero, credit: amount, description: desc },
            ] }, true);
        await tx.financeEntry.create({ data: { shopId, orderId, kind: 'receipt', classification: 'sales_receipt', amount: '50000',
            currency, status: 'posted', occurredAt: at, description: desc, journalId: journal.id, evidenceId: evidence.id,
            sourceType: 'order', sourceId: orderId, paymentReference: reference } });
    });
    return evidence;
}
