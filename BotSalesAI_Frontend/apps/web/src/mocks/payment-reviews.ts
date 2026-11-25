import { all, find, money, record, str, strings, sum, units } from './database';
import type { Input, Row } from './database';

function sourceIs(source: unknown, type: string, id: unknown) {
    const ref = record(source);
    return ref.type === type && ref.id === id;
}

export function paymentReviews(input: Input) {
    const { shopId, query } = input;
    const currency = str(find('shops', shopId, shopId).currency);
    const posted = all('financeEntries', shopId).filter(row => row.status === 'posted' && !row.reversalOf && record(row.amount).currency === currency);
    const debts = all('debts', shopId).filter(row => row.direction === 'receivable' && record(row.originalAmount).currency === currency && record(row.outstandingAmount).currency === currency);
    const journals = all('journals', shopId).filter(row => row.status === 'posted');
    const transfers = all('codSettlements', shopId);
    const returns = all('returns', shopId);
    const debtApplications = new Map(all('orderReceiptDebtApplications', shopId).map(row => [row.financeEntryId, units(row.amount)]));
    const assignments = all('workItems', shopId).filter(row => row.kind === 'payment_mismatch' && !['completed', 'cancelled'].includes(str(row.state)));
    const transferPhotos = input.permissions?.includes('finance.reconcile')
        ? all('files', shopId).filter(row => row.purpose === 'payment_evidence_image' && row.status === 'ready') : null;
    const result: Row[] = [];
    for (const order of all('orders', shopId)) {
        if (!order.total || record(order.total).currency !== currency || order.orderState === 'cancelled') continue;
        const relatedDebts = debts.filter(row => sourceIs(row.source, 'order', order.id));
        const debtIds = relatedDebts.map(row => str(row.id));
        const settlements = transfers.filter(row => strings(row.orderIds).includes(str(order.id)));
        const receipts = posted.filter(row => row.kind === 'receipt' && sourceIs(row.sourceRef, 'order', order.id));
        const debtReceipts = posted.filter(row => row.kind === 'receipt' && record(row.sourceRef).type === 'debt'
            && debtIds.includes(str(record(row.sourceRef).id)));
        const allocations = posted.filter(row => row.kind === 'receipt' && record(row.sourceRef).type === 'bank_allocation'
            && strings(row.reconciledDebtIds).some(id => debtIds.includes(id)));
        const codReceipts = posted.filter(row => row.kind === 'receipt' && settlements.some(cod => sourceIs(row.sourceRef, 'cod_settlement', cod.id)));
        const bankIds = [...new Set([...settlements.map(row => str(row.bankTransactionId)), ...allocations.map(row => str(record(row.sourceRef).id))].filter(Boolean))];
        const returnCases = returns.filter(row => row.orderId === order.id);
        const work = assignments.find(item => sourceIs(item.source, 'order', order.id) || bankIds.some(id => sourceIs(item.source, 'bank_transaction', id)));
        const due = [...relatedDebts.filter(row => units(row.outstandingAmount) > 0n).map(row => str(row.dueAt)), str(work?.dueAt)].filter(Boolean).sort().at(0);
        const documentation = (entries: Row[], linkedJournals: Row[]) => {
            const financeEntryIds = entries.map(row => str(row.id));
            const times = [str(order.updatedAt), ...entries.map(row => str(row.updatedAt)), ...linkedJournals.map(row => str(row.updatedAt))].filter(Boolean).sort();
            return {
                financeEntryIds,
                journalIds: journals.filter(row => linkedJournals.includes(row) || (row.sourceType === 'finance_entry' && financeEntryIds.includes(str(row.sourceId))))
                    .map(row => str(row.id)),
                references: [...new Set(entries.flatMap(entry => [str(entry.paymentReference), str(entry.evidenceRef)]).filter(Boolean))],
                updatedAt: times.at(-1) ?? order.updatedAt,
            };
        };
        const common = {
            orderId: order.id, dueAt: due ?? null, assigneeUserId: work?.assigneeUserId ?? null,
            workItemId: work?.id ?? null, returnIds: returnCases.map(row => row.id),
        };
        const expected = units(order.total);
        const postedReceipts = sum(receipts, 'amount');
        const outstanding = sum(relatedDebts, 'outstandingAmount');
        const debtSettled = sum(relatedDebts, 'originalAmount') - outstanding;
        // Remove only the receivable reduction written by the same order receipt.
        const recordedOverlap = receipts.reduce((total, row) => total + (debtApplications.get(row.id) ?? 0n), 0n);
        const independentDebtReceipts = sum(debtReceipts, 'amount');
        const debtProjection = debtSettled - recordedOverlap;
        // Historical receipts lack application links. Keep their possible overlap separate
        // from independent posted receipts already known to belong to this debt.
        const historicalReceipts = sum(receipts.filter(row => !debtApplications.has(row.id)), 'amount');
        const unexplainedDebtReduction = debtProjection > independentDebtReceipts ? debtProjection - independentDebtReceipts : 0n;
        const historicalOverlap = historicalReceipts < unexplainedDebtReduction ? historicalReceipts : unexplainedDebtReduction;
        const otherCollections = debtProjection - historicalOverlap;
        const verified = postedReceipts + (otherCollections > independentDebtReceipts ? otherCollections : independentDebtReceipts);
        const saysPaid = ['verified', 'settled', 'part_refunded', 'refunded'].includes(str(order.paymentState));
        const disputed = relatedDebts.some(row => row.disputed) || verified > expected || debtSettled < 0n
            || (relatedDebts.length > 0 && outstanding > expected - verified)
            || (saysPaid && verified !== expected && outstanding !== expected - verified) || (saysPaid && verified === 0n && expected > 0n);
        if (expected > 0n && (order.orderState !== 'draft' || order.paymentMethod === 'prepay')) {
            const status = disputed ? 'needs_check' : verified === expected ? 'settled' : verified > 0n ? 'partial'
                : order.paymentMethod === 'cod' && (relatedDebts.length > 0 || order.paymentState === 'cod_collected') ? 'cod_pending' : 'unpaid';
            result.push({
                ...common, id: `collection-${order.id}`, kind: 'collection', status, expected: order.total,
                verified: disputed && verified <= 0n ? null : money(verified, currency), remaining: disputed ? null : money(expected - verified, currency),
                bankTransactionIds: bankIds, codSettlementIds: settlements.map(row => row.id),
                ...(transferPhotos ? { pendingTransferImages: transferPhotos.filter(file => file.resourceId === order.id)
                    .map(file => ({ fileId: file.id, status: 'pending_review', createdAt: file.createdAt })) } : {}),
                ...documentation([...receipts, ...debtReceipts, ...allocations, ...codReceipts], journals.filter(row => row.sourceType === 'order_delivery' && row.sourceId === order.id)),
            });
        }
        const refundDue = sum(returnCases.filter(row => ['inspected','closed'].includes(str(row.state))
            && record(row.refundObligation).currency === currency), 'refundObligation');
        if (refundDue > 0n) {
            const refunds = posted.filter(row => row.kind === 'disbursement' && sourceIs(row.sourceRef, 'order_refund', order.id));
            const refunded = sum(refunds, 'amount');
            const blocked = refunded > refundDue || (refunded < refundDue && (verified < refundDue || disputed));
            result.push({
                ...common, id: `refund-${order.id}`, kind: 'refund', status: blocked ? 'needs_check' : refunded === refundDue ? 'settled' : 'refund_due',
                expected: money(refundDue, currency), verified: money(refunded, currency),
                remaining: refunded > refundDue ? null : money(refundDue - refunded, currency),
                bankTransactionIds: [], codSettlementIds: [],
                ...documentation(refunds, journals.filter(row => row.sourceType === 'return_inspection' && returnCases.some(rc => rc.id === row.sourceId))),
            });
        }
    }
    const kind = query.get('kind'), stage = query.get('stage');
    const search = query.get('q')?.trim().toLocaleLowerCase('vi');
    return result.filter(row => (!kind || row.kind === kind) && (stage !== 'open' || row.status !== 'settled') && (stage !== 'settled' || row.status === 'settled')
        && (!search || JSON.stringify(row).toLocaleLowerCase('vi').includes(search)))
        .sort((left, right) => str(right.updatedAt).localeCompare(str(left.updatedAt)) || str(left.id).localeCompare(str(right.id)));
}
