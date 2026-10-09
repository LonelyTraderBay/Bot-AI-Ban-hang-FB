import { all, find, insert, ensure, checkVersion, touch, command, str, num, rows, record, now, units, sum, money, zero, assertOpenPeriod } from './database';
import type { Input, Row } from './database';
import { activeAccount } from './masters';
function validateAccounts(shopId: string, lines: Row[]) {
    const currency=str(find('shops',shopId,shopId).currency);
    for(const line of lines) {
        activeAccount(shopId,str(line.accountId));
        ensure(record(line.debit).currency===currency && record(line.credit).currency===currency,'Bút toán chỉ dùng đồng tiền của cửa hàng.',422,'JOURNAL_CURRENCY');
    }
}
function postingAccount(shopId:string,code:string|undefined) {
    ensure(code,'Chưa cấu hình tài khoản cho phân loại chứng từ.',422,'ACCOUNT_POLICY_MISSING');
    const account=all('accounts',shopId).find(a=>a.code===code);
    ensure(account,'Chưa cấu hình tài khoản cho chính sách ghi sổ mẫu.',409,'ACCOUNT_POLICY_MISSING');
    return str(activeAccount(shopId,str(account.id)).id);
}
const classificationCodes:Record<string,string>={sales_receipt:'511',inventory_purchase:'156',shipping:'64101',platform_fee:'64102',payment_fee:'64103',ai_expense:'64201',operating_expense:'642',capital:'411',loan_principal:'341',transfer:'112',other:'711'};
type ReportWindow = { from: string; to: string; timezone: string; start: number; end: number };
export function allTimeReportWindow(shopId: string): ReportWindow {
    const timezone = str(all('shops', shopId)[0]?.timezone) || 'UTC';
    return { from: '1970-01-01T00:00:00.000Z', to: '9999-12-31T23:59:59.999Z', timezone, start: 0, end: Date.parse('9999-12-31T23:59:59.999Z') };
}
function reportWindow(input: Input): ReportWindow {
    const from = input.query.get('from') || '';
    const to = input.query.get('to') || '';
    const timezone = input.query.get('timezone') || '';
    const start = Date.parse(from), end = Date.parse(to);
    ensure(Number.isFinite(start) && Number.isFinite(end) && start < end, 'Khoảng báo cáo cần from < to theo ISO 8601.', 422, 'INVALID_REPORT_WINDOW');
    try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(new Date(start)); }
    catch { ensure(false, 'Múi giờ báo cáo không hợp lệ.', 422, 'INVALID_TIMEZONE'); }
    return { from, to, timezone, start, end };
}
function inReportWindow(value: unknown, window: ReportWindow) {
    const timestamp = Date.parse(str(value));
    return Number.isFinite(timestamp) && timestamp >= window.start && timestamp < window.end;
}
export function cashflow(shopId: string, window: ReportWindow): Row {
    const entries = all('financeEntries', shopId).filter(e => e.status === 'posted' && e.cashImpact !== false && inReportWindow(e.occurredAt, window));
    const received = sum(entries.filter(e => e.kind === 'receipt'), 'amount'), spent = sum(entries.filter(e => e.kind === 'disbursement'), 'amount');
    return {
        shopId, from: window.from, to: window.to, timezone: window.timezone, asOf: now(), receipts: money(received), disbursements: money(spent), netCashMovement: money(received - spent), warnings: ['Số liệu của phiên mô phỏng; không phải số dư tài khoản ngân hàng.']
    };
}
export function profitLoss(shopId: string, window: ReportWindow): Row {
    const delivered = all('orders', shopId).filter(o => ['delivered', 'part_returned', 'returned'].includes(str(o.fulfillmentState)) && inReportWindow(o.updatedAt, window));
    const revenue = sum(delivered, 'total');
    const returned = all('returns', shopId).filter(r => ['inspected', 'closed'].includes(str(r.state)) && inReportWindow(r.updatedAt, window));
    const refunds = sum(returned, 'refundObligation');
    const lines = delivered.flatMap(o => rows(o.lines));
    let cogs = lines.reduce((sum, l) => sum + (l.costSnapshot ? units(l.costSnapshot) : 0n), 0n);
    for (const r of returned) {
        const order = find('orders', str(r.orderId), shopId);
        for (const l of rows(r.lines)) {
            const original = rows(order.lines).find(o => o.id === l.orderLineId);
            if (original?.costSnapshot && l.disposition === 'sellable')
                cogs -= units(original.costSnapshot) * BigInt(num(l.quantity)) / BigInt(num(original.quantity));
        }
    }
    const entries = all('financeEntries', shopId).filter(e => e.status === 'posted' && e.kind === 'disbursement' && inReportWindow(e.occurredAt, window));
    const expense = (classification: string) => sum(entries.filter(e => e.classification === classification), 'amount');
    const ops = expense('shipping') + expense('platform_fee') + expense('payment_fee') + expense('ai_expense') + expense('operating_expense');
    const complete = lines.every(l => l.costSnapshot !== null && l.costSnapshot !== undefined);
    return {
        shopId, from: window.from, to: window.to, timezone: window.timezone, asOf: now(), policyVersion: 'synthetic-policy-1', grossSales: money(revenue), discounts: zero(), salesReturns: money(refunds), netSales: money(revenue - refunds), cogs: complete ? money(cogs) : null, grossProfit: complete ? money(revenue - refunds - cogs) : null, operatingProfit: complete ? money(revenue - refunds - cogs - ops) : null, completeness: complete ? 'provisional' : 'incomplete', warnings: ['Báo cáo mô phỏng theo sự kiện giao hàng; chưa đối chiếu thuế hoặc ngân hàng thực.'], shippingIncome: zero(), shippingExpense: money(expense('shipping')), platformFees: money(expense('platform_fee')), paymentFees: money(expense('payment_fee')), aiExpense: money(expense('ai_expense')), otherOperatingExpenses: money(expense('operating_expense'))
    };
}
export function finance(op: string, input: Input): Row | undefined {
    const { shopId, body } = input;
    switch (op) {
        case 'getCashflow': return cashflow(shopId, reportWindow(input));
        case 'getProfitLoss': return profitLoss(shopId, reportWindow(input));
        case 'createFinanceEntry': {
            ensure(units(body.amount) > 0n, 'Số tiền phải lớn hơn 0.', 422);
            return insert('financeEntries', 'FinanceEntry', shopId, { ...body, status: 'draft', reversalOf: null });
        }
        case 'updateFinanceEntry': {
            const entry = find('financeEntries', input.id, shopId);
            checkVersion(entry, input);
            ensure(entry.status === 'draft', 'Phiếu đã ghi, không sửa trực tiếp.');
            return touch(Object.assign(entry, body));
        }
        case 'postFinanceEntry': {
            const e = find('financeEntries', input.id, shopId);
            checkVersion(e, input);
            ensure(e.status === 'draft', 'Phiếu không còn nháp.');
            const period = assertOpenPeriod(shopId, str(e.occurredAt).slice(0, 10));
            if (e.sourceRef)
                ensure(!all('financeEntries', shopId).some(other => other.id !== e.id && other.status === 'posted' && JSON.stringify(other.sourceRef) === JSON.stringify(e.sourceRef)), 'Chứng từ nguồn đã ghi tiền.');
            const cash=postingAccount(shopId,'111'),counterpart=postingAccount(shopId,e.kind==='disbursement'&&e.classification==='other'?'642':classificationCodes[str(e.classification)]);
            const debit = e.kind === 'receipt' ? cash : counterpart, credit = e.kind === 'receipt' ? counterpart : cash;
            insert('journals', 'Journal', shopId, {
                sourceType: 'finance_entry', sourceId: e.id, status: 'posted', effectiveDate: str(e.occurredAt).slice(0, 10), periodId: period.id, policyVersion: 'synthetic-policy-1', lines: [{ accountId: debit, debit: e.amount, credit: zero(), description: e.description }, { accountId: credit, debit: zero(), credit: e.amount, description: e.description }], reversalOf: null
            });
            e.status = 'posted';
            touch(e);
            return command(shopId, op, { type: 'finance_entry', id: e.id });
        }
        case 'reverseFinanceEntry': {
            const e = find('financeEntries', input.id, shopId);
            checkVersion(e, input);
            ensure(e.status === 'posted', 'Chỉ đảo phiếu đã ghi.');
            assertOpenPeriod(shopId);
            e.status = 'reversed';
            touch(e);
            const journal = all('journals', shopId).find(j => j.sourceType === 'finance_entry' && j.sourceId === e.id);
            if (journal) {
                journal.status = 'reversed';
                touch(journal);
                insert('journals', 'Journal', shopId, {
                    sourceType: 'reversal', sourceId: e.id, status: 'posted', effectiveDate: now().slice(0, 10), periodId: journal.periodId, policyVersion: journal.policyVersion, lines: rows(journal.lines).map(l => ({ ...l, debit: l.credit, credit: l.debit, description: body.reason })), reversalOf: journal.id
                });
            }
            return command(shopId, op, { type: 'finance_entry', id: e.id });
        }
        case 'createJournal': {
            const period = assertOpenPeriod(shopId, str(body.effectiveDate));
            const lines = rows(body.lines);
            validateAccounts(shopId,lines);
            ensure(lines.length >= 2 && sum(lines, 'debit') === sum(lines, 'credit') && sum(lines, 'debit') > 0n, 'Bút toán cần cân bằng Nợ/Có và lớn hơn 0.', 422);
            ensure(lines.every(l => units(l.debit) >= 0n && units(l.credit) >= 0n && (units(l.debit) === 0n || units(l.credit) === 0n)), 'Một dòng chỉ có Nợ hoặc Có.', 422);
            return insert('journals', 'Journal', shopId, {
                sourceType: body.sourceType, sourceId: body.sourceId, effectiveDate: body.effectiveDate, lines: body.lines, status: 'draft', periodId: period.id, policyVersion: 'synthetic-policy-1', reversalOf: null
            });
        }
        case 'postJournal': {
            const j = find('journals', input.id, shopId);
            checkVersion(j, input);
            ensure(j.status === 'draft', 'Bút toán không còn nháp.');
            assertOpenPeriod(shopId, str(j.effectiveDate));
            validateAccounts(shopId,rows(j.lines));
            ensure(sum(rows(j.lines), 'debit') === sum(rows(j.lines), 'credit'), 'Bút toán không cân bằng.');
            ensure(!all('journals', shopId).some(other => other.id !== j.id && other.sourceType === j.sourceType && other.sourceId === j.sourceId && other.status === 'posted'), 'Nguồn đã ghi sổ.');
            j.status = 'posted';
            touch(j);
            return command(shopId, op, { type: 'journal', id: j.id });
        }
        case 'reverseJournal': {
            const j = find('journals', input.id, shopId);
            checkVersion(j, input);
            ensure(j.status === 'posted', 'Không thể đảo bút toán chưa ghi.');
            assertOpenPeriod(shopId);
            const reversed = insert('journals', 'Journal', shopId, {
                sourceType: 'reversal', sourceId: j.id, status: 'posted', effectiveDate: now().slice(0, 10), periodId: j.periodId, policyVersion: j.policyVersion, lines: rows(j.lines).map(l => ({ ...l, debit: l.credit, credit: l.debit, description: body.reason })), reversalOf: j.id
            });
            j.status = 'reversed';
            touch(j);
            return command(shopId, op, { type: 'journal', id: reversed.id });
        }
        case 'closeAccountingPeriod': {
            const p = find('periods', input.id, shopId);
            checkVersion(p, input);
            ensure(p.state === 'open', 'Kỳ không ở trạng thái mở.');
            ensure(!all('journals', shopId).some(j => j.periodId === p.id && j.status === 'draft'), 'Còn bút toán nháp.');
            ensure(!all('reconciliations', shopId).some(r => r.state !== 'matched'), 'Còn sai lệch đối soát.');
            ensure(!all('codSettlements', shopId).some(r => r.status !== 'matched'), 'Còn COD chưa khớp.');
            p.state = 'closed';
            p.closedBy = input.userId;
            touch(p);
            return command(shopId, op, { type: 'period', id: p.id });
        }
        case 'reopenAccountingPeriod': {
            const p = find('periods', input.id, shopId);
            checkVersion(p, input);
            ensure(p.state === 'closed', 'Kỳ chưa khóa.');
            const approval = find('approvals', str(body.approvalId), shopId);
            ensure(approval.status === 'approved' && record(approval.resource).id === p.id, 'Cần phê duyệt đúng kỳ.');
            p.state = 'open';
            p.closedBy = null;
            touch(p);
            approval.status = 'consumed';
            touch(approval);
            return command(shopId, op, { type: 'period', id: p.id });
        }
        case 'matchSettlement': {
            const c = find('reconciliations', input.id, shopId);
            checkVersion(c, input);
            ensure(c.state !== 'matched' && c.transactionId === body.transactionId, 'Sai giao dịch hoặc đã đối soát.');
            const tx = find('bankTransactions', str(body.transactionId), shopId);
            const allocations = rows(body.allocations);
            const total = sum(allocations, 'amount');
            ensure(total > 0n && total <= units(c.difference), 'Phân bổ vượt số tiền chưa khớp.', 422);
            for (const allocation of allocations) {
                ensure(record(allocation.resource).type === 'debt', 'Bộ mô phỏng hỗ trợ ghép khoản công nợ.', 422);
                const debt = find('debts', str(record(allocation.resource).id), shopId);
                ensure(!debt.disputed && units(allocation.amount) <= units(debt.outstandingAmount), 'Khoản nợ tranh chấp hoặc phân bổ vượt nợ.', 422);
                ensure((tx.direction === 'credit') === (debt.direction === 'receivable'), 'Chiều tiền không khớp công nợ.', 422);
                ensure(record(allocation.amount).currency === record(tx.amount).currency && record(debt.outstandingAmount).currency === record(tx.amount).currency, 'Không ghép khác tiền tệ.', 422);
                debt.outstandingAmount = money(units(debt.outstandingAmount) - units(allocation.amount), str(record(tx.amount).currency));
                touch(debt);
            }
            c.difference = money(units(c.difference) - total, str(record(tx.amount).currency));
            c.state = units(c.difference) === 0n ? 'matched' : 'suggested';
            c.reason = body.reason;
            touch(c);
            tx.matchState = c.state;
            touch(tx);
            insert('financeEntries', 'FinanceEntry', shopId, {
                kind: tx.direction === 'credit' ? 'receipt' : 'disbursement', classification: 'other', amount: money(total, str(record(tx.amount).currency)), status: 'posted', occurredAt: tx.occurredAt, description: body.reason, sourceRef: { type: 'bank_allocation', id: tx.id }, reversalOf: null
            });
            return command(shopId, op, { type: 'reconciliation', id: c.id });
        }
        case 'matchCODSettlement': {
            const cod = find('codSettlements', input.id, shopId);
            checkVersion(cod, input);
            ensure(cod.status === 'pending' || cod.status === 'part_settled', 'COD đã xử lý.');
            const bank = find('bankTransactions', str(body.bankTransactionId), shopId);
            ensure(bank.matchState === 'unmatched', 'Giao dịch ngân hàng đã ghép.');
            ensure(bank.direction === 'credit' && record(bank.amount).currency === record(cod.grossDue).currency && record(body.actualFees).currency === record(cod.grossDue).currency, 'COD phải là tiền vào cùng loại tiền.', 422);
            ensure(units(cod.grossDue) - units(body.actualFees) === units(bank.amount), 'Tiền về cộng phí không khớp COD.');
            cod.actualFees = body.actualFees;
            cod.bankReceived = bank.amount;
            cod.difference = zero();
            cod.bankTransactionId = bank.id;
            cod.status = 'matched';
            touch(cod);
            bank.matchState = 'matched';
            touch(bank);
            for (const r of all('reconciliations', shopId).filter(r => r.transactionId === bank.id)) {
                r.state = 'matched';
                r.difference = zero();
                touch(r);
            }
            const orderIds = Array.isArray(cod.orderIds) ? cod.orderIds : [];
            for (const debt of all('debts', shopId).filter(d => record(d.source).type === 'order' && orderIds.includes(record(d.source).id))) {
                debt.outstandingAmount = zero();
                touch(debt);
            }
            insert('financeEntries', 'FinanceEntry', shopId, {
                kind: 'receipt', classification: 'sales_receipt', amount: bank.amount, status: 'posted', occurredAt: bank.occurredAt, description: 'Tiền COD thực nhận sau phí', sourceRef: { type: 'cod_settlement', id: cod.id }, reversalOf: null
            });
            if (units(body.actualFees) > 0n)
                insert('financeEntries', 'FinanceEntry', shopId, {
                    kind: 'disbursement', classification: 'shipping', amount: body.actualFees, cashImpact: false, status: 'posted', occurredAt: bank.occurredAt, description: 'Phí COD khấu trừ, không chi tiền lần hai', sourceRef: { type: 'cod_fee', id: cod.id }, reversalOf: null
                });
            for (const order of all('orders', shopId).filter(o => orderIds.includes(o.id))) {
                order.paymentState = 'verified';
                touch(order);
            }
            return command(shopId, op, { type: 'cod_settlement', id: cod.id });
        }
        default: return undefined;
    }
}
