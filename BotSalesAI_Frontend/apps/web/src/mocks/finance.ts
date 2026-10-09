import { all, find, insert, ensure, checkVersion, touch, command, str, num, rows, record, now, units, sum, money, assertOpenPeriod } from './database';
import type { Input, Row } from './database';
import { activeAccount, activeWarehouse } from './masters';
import { MANAGEMENT_POLICY, accountByCode, fiscalDate, setStockValue, postBusinessJournal, validateJournalLines, ledgerReport, trialBalanceReport, balanceSheetReport, journalReports, bookSnapshot } from './accounting';
import { isValidDateOnly, limitCodePoints } from '../shared/model/format';
import { stockFor, variant } from './database';
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
export function cashflow(shopId:string,window:ReportWindow):Row {return journalReports(shopId,window,'cashflow');}
export function profitLoss(shopId:string,window:ReportWindow):Row {return journalReports(shopId,window,'profit_loss');}
function openingData(shopId:string,body:Row) {
    ensure(body.policyVersion===MANAGEMENT_POLICY,'Chọn chính sách quản trị tổng hợp hiện hành.',422,'POLICY_MISMATCH');
    ensure(isValidDateOnly(str(body.effectiveDate)),'Ngày mở sổ không hợp lệ.',422);assertOpenPeriod(shopId,str(body.effectiveDate));
    const lines=rows(body.lines),inventory=rows(body.inventory),currency=str(find('shops',shopId,shopId).currency);validateJournalLines(shopId,lines,true);
    ensure(new Set(inventory.map(l=>`${l.warehouseId}:${l.variantId}`)).size===inventory.length,'Không lặp dòng tồn theo kho/biến thể.',422,'DUPLICATE_STOCK');
    let value=0n;
    for(const line of inventory) {
        activeWarehouse(shopId,str(line.warehouseId));variant(shopId,str(line.variantId));stockFor(shopId,str(line.variantId),str(line.warehouseId));
        ensure(Number.isInteger(line.quantity)&&num(line.quantity)>=0&&units(line.unitCost)>=0n&&record(line.unitCost).currency===currency,'Tồn đầu kỳ cần số nguyên không âm và giá vốn đúng tiền.',422);value+=units(line.unitCost)*BigInt(num(line.quantity));
    }
    const inventoryAccount=accountByCode(shopId,'156');const bookValue=lines.filter(l=>l.accountId===inventoryAccount.id).reduce((n,l)=>n+units(l.debit)-units(l.credit),0n);
    ensure(value===bookValue,'Giá trị tồn đầu kỳ phải bằng số dư tài khoản hàng tồn kho.',422,'OPENING_INVENTORY_MISMATCH');return {lines,inventory,currency};
}
function assertOpeningAvailable(shopId:string) {
    ensure(!all('openingBalances',shopId).some(o=>o.status==='posted'),'Mở sổ đã được ghi; chỉnh bằng chứng từ điều chỉnh có nguồn.',409,'OPENING_ALREADY_POSTED');
    ensure(!all('journals',shopId).some(j=>['posted','reversed'].includes(str(j.status)))&&!all('financeEntries',shopId).some(e=>e.status==='posted'||e.status==='reversed')&&!all('movements',shopId).some(m=>num(m.quantityDelta)!==0),'Đã có ghi sổ/di chuyển tồn; cần đối chiếu lịch sử trước khi mở sổ.',409,'OPENING_HISTORY_EXISTS');
    ensure(!all('stock',shopId).some(s=>num(s.onHand)!==0||num(s.reserved)!==0),'Tồn hiện có chưa đối chiếu; không ghi đè bằng mở sổ.',409,'OPENING_STOCK_EXISTS');
}
export function finance(op: string, input: Input): Row | undefined {
    const { shopId, body } = input;
    switch (op) {
        case 'getLedger':return ledgerReport(shopId,reportWindow(input),input.query.get('accountId'),input.query.get('cursor'),Math.min(100,Math.max(1,Number(input.query.get('limit'))||20)));
        case 'getTrialBalance':return trialBalanceReport(shopId,reportWindow(input));
        case 'getBalanceSheet':return balanceSheetReport(shopId,input.query.get('atDate')||'');
        case 'createAccountingPeriod': {
            const start=str(body.startDate),end=str(body.endDate);
            ensure(isValidDateOnly(start)&&isValidDateOnly(end)&&start<=end,'Ngày kỳ kế toán không hợp lệ.',422,'PERIOD_RANGE_INVALID');
            ensure(!all('periods',shopId).some(p=>start<=str(p.endDate)&&end>=str(p.startDate)),'Kỳ kế toán không được chồng lấn.',409,'PERIOD_OVERLAP');
            return insert('periods','AccountingPeriod',shopId,{startDate:start,endDate:end,state:'open',blockingIssues:[],closedBy:null});
        }
        case 'createOpeningBalance':assertOpeningAvailable(shopId);openingData(shopId,body);return insert('openingBalances','OpeningBalance',shopId,{...body,status:'draft',journalId:null});
        case 'updateOpeningBalance': {
            const opening=find('openingBalances',input.id,shopId);checkVersion(opening,input);ensure(opening.status==='draft','Mở sổ đã ghi không được sửa trực tiếp.');assertOpeningAvailable(shopId);openingData(shopId,body);return touch(Object.assign(opening,body));
        }
        case 'postOpeningBalance': {
            const opening=find('openingBalances',input.id,shopId);checkVersion(opening,input);ensure(opening.status==='draft','Mở sổ đã ghi.');assertOpeningAvailable(shopId);
            const {lines,inventory,currency}=openingData(shopId,opening),period=assertOpenPeriod(shopId,str(opening.effectiveDate));
            const journal=lines.length?insert('journals','Journal',shopId,{sourceType:'opening_balance',sourceId:opening.id,status:'posted',effectiveDate:opening.effectiveDate,periodId:period.id,policyVersion:MANAGEMENT_POLICY,lines:structuredClone(lines),reversalOf:null,replacesJournalId:null,sourceRevision:0,reason:opening.reason}):null;
            for(const line of inventory) {const stock=stockFor(shopId,str(line.variantId),str(line.warehouseId));stock.onHand=line.quantity;stock.available=line.quantity;setStockValue(stock,units(line.unitCost)*BigInt(num(line.quantity)),num(line.quantity),currency);stock.asOf=now();touch(stock);}
            opening.status='posted';opening.journalId=journal?.id||null;touch(opening);
            const shop=find('shops',shopId,shopId);shop.policyVersion=MANAGEMENT_POLICY;touch(shop);
            return command(shopId,op,{type:'opening_balance',id:opening.id});
        }
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
            const period = assertOpenPeriod(shopId,fiscalDate(shopId,str(e.occurredAt)));
            if (e.sourceRef)
                ensure(!all('financeEntries', shopId).some(other => other.id !== e.id && other.status === 'posted' && JSON.stringify(other.sourceRef) === JSON.stringify(e.sourceRef)), 'Chứng từ nguồn đã ghi tiền.');
            const currency=str(find('shops',shopId,shopId).currency);
            ensure(record(e.amount).currency===currency,'Phiếu chỉ dùng đồng tiền cơ sở của cửa hàng.',422,'JOURNAL_CURRENCY');
            let debt:Row|undefined;
            if(record(e.sourceRef).type==='debt') {
                debt=find('debts',str(record(e.sourceRef).id),shopId);
                ensure(!debt.disputed&&units(e.amount)<=units(debt.outstandingAmount)&&((e.kind==='disbursement')===(debt.direction==='payable')),'Phiếu vượt nợ hoặc không đúng chiều/đang tranh chấp.',422,'DEBT_ALLOCATION_INVALID');
            }
            const cash=postingAccount(shopId,'111'),counterpart=postingAccount(shopId,debt?(debt.direction==='payable'?'331':debt.counterpartyType==='carrier'?'138':'131'):e.kind==='disbursement'&&e.classification==='other'?'642':classificationCodes[str(e.classification)]);
            const debit = e.kind === 'receipt' ? cash : counterpart, credit = e.kind === 'receipt' ? counterpart : cash;
            insert('journals', 'Journal', shopId, {
                sourceType: 'finance_entry', sourceId: e.id, status: 'posted', effectiveDate:fiscalDate(shopId,str(e.occurredAt)), periodId: period.id, policyVersion: MANAGEMENT_POLICY, lines: [{ accountId: debit, debit: e.amount, credit: money(0n,currency), description:limitCodePoints(str(e.description),300) }, { accountId: credit, debit: money(0n,currency), credit: e.amount, description:limitCodePoints(str(e.description),300) }], reversalOf: null
            });
            if(debt){debt.outstandingAmount=money(units(debt.outstandingAmount)-units(e.amount),currency);touch(debt);}
            e.status = 'posted';
            touch(e);
            return command(shopId, op, { type: 'finance_entry', id: e.id });
        }
        case 'reverseFinanceEntry': {
            const e = find('financeEntries', input.id, shopId);
            checkVersion(e, input);
            ensure(e.status === 'posted', 'Chỉ đảo phiếu đã ghi.');
            const period=assertOpenPeriod(shopId,fiscalDate(shopId));
            const journal = all('journals', shopId).find(j => j.sourceType === 'finance_entry' && j.sourceId === e.id);
            ensure(journal&&journal.status==='posted','Phiếu thiếu nguồn bút toán hoặc nguồn đã đảo; cần đối chiếu.',409,'JOURNAL_SOURCE_MISSING');
            ensure(!['bank_allocation','cod_settlement','order','order_refund'].includes(str(record(e.sourceRef).type)),'Chứng từ đối soát/đơn cần điều chỉnh theo nguồn và bằng chứng; không đảo phiếu riêng.',409,'SOURCE_CORRECTION_REQUIRED');
            e.status = 'reversed';
            touch(e);
            if(record(e.sourceRef).type==='debt'){const debt=find('debts',str(record(e.sourceRef).id),shopId);debt.outstandingAmount=money(units(debt.outstandingAmount)+units(e.amount),str(record(e.amount).currency));touch(debt);}
            if (journal) {
                journal.status = 'reversed';
                touch(journal);
                insert('journals', 'Journal', shopId, {
                    sourceType: 'reversal', sourceId: e.id, status: 'posted', effectiveDate:fiscalDate(shopId), periodId:period.id, policyVersion: journal.policyVersion, lines: rows(journal.lines).map(l => ({ ...l, debit: l.credit, credit: l.debit, description:limitCodePoints(str(body.reason),300) })), reversalOf: journal.id,reason:body.reason
                });
            }
            return command(shopId, op, { type: 'finance_entry', id: e.id });
        }
        case 'createJournal': {
            const period = assertOpenPeriod(shopId, str(body.effectiveDate));
            const lines = rows(body.lines);
            ensure(!['opening_balance','goods_receipt','shipment_dispatch','order_delivery','return_inspection','finance_entry','stock_adjustment'].includes(str(body.sourceType)),'Nguồn tự động chỉ được ghi qua nghiệp vụ sở hữu.',422,'SOURCE_OWNER_REQUIRED');
            validateAccounts(shopId,lines);
            let sourceRevision=0;
            if(body.replacesJournalId) {const original=find('journals',str(body.replacesJournalId),shopId);ensure(original.status==='reversed'&&original.sourceType===body.sourceType&&original.sourceId===body.sourceId,'Thay thế cần đúng nguồn bút toán đã đảo.',409,'INVALID_REPLACEMENT');sourceRevision=num(original.sourceRevision)+1;}
            ensure(lines.length >= 2 && sum(lines, 'debit') === sum(lines, 'credit') && sum(lines, 'debit') > 0n, 'Bút toán cần cân bằng Nợ/Có và lớn hơn 0.', 422);
            ensure(lines.every(l => units(l.debit) >= 0n && units(l.credit) >= 0n && (units(l.debit) === 0n || units(l.credit) === 0n)), 'Một dòng chỉ có Nợ hoặc Có.', 422);
            return insert('journals', 'Journal', shopId, {
                sourceType: body.sourceType, sourceId: body.sourceId, effectiveDate: body.effectiveDate, lines: body.lines, status: 'draft', periodId: period.id, policyVersion: MANAGEMENT_POLICY, reversalOf: null,replacesJournalId:body.replacesJournalId||null,sourceRevision,reason:body.reason
            });
        }
        case 'postJournal': {
            const j = find('journals', input.id, shopId);
            checkVersion(j, input);
            ensure(j.status === 'draft', 'Bút toán không còn nháp.');
            assertOpenPeriod(shopId, str(j.effectiveDate));
            validateAccounts(shopId,rows(j.lines));
            ensure(sum(rows(j.lines), 'debit') === sum(rows(j.lines), 'credit'), 'Bút toán không cân bằng.');
            ensure(!all('journals', shopId).some(other => other.id !== j.id && other.sourceType === j.sourceType && other.sourceId === j.sourceId && num(other.sourceRevision)===num(j.sourceRevision) && ['posted','reversed'].includes(str(other.status))), 'Nguồn đã ghi sổ.');
            j.status = 'posted';
            touch(j);
            return command(shopId, op, { type: 'journal', id: j.id });
        }
        case 'reverseJournal': {
            const j = find('journals', input.id, shopId);
            checkVersion(j, input);
            ensure(j.status === 'posted', 'Không thể đảo bút toán chưa ghi.');
            const period=assertOpenPeriod(shopId,fiscalDate(shopId));
            ensure(!['finance_entry','goods_receipt','shipment_dispatch','order_delivery','return_inspection','stock_adjustment'].includes(str(j.sourceType)),'Bút toán tự động cần điều chỉnh theo nghiệp vụ nguồn, không đảo riêng.',409,'SOURCE_CORRECTION_REQUIRED');
            ensure(j.sourceType!=='opening_balance','Mở sổ có tồn đầu kỳ cần điều chỉnh bằng chứng từ có nguồn; không đảo riêng giá trị tồn.',409,'OPENING_REVERSAL_REQUIRES_ADJUSTMENT');
            const reversed = insert('journals', 'Journal', shopId, {
                sourceType: 'reversal', sourceId: j.id, status: 'posted', effectiveDate:fiscalDate(shopId), periodId:period.id, policyVersion: j.policyVersion, lines: rows(j.lines).map(l => ({ ...l, debit: l.credit, credit: l.debit, description:limitCodePoints(str(body.reason),300) })), reversalOf: j.id,reason:body.reason
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
            ensure(!all('financeEntries',shopId).some(e=>e.status==='draft'&&fiscalDate(shopId,str(e.occurredAt))>=str(p.startDate)&&fiscalDate(shopId,str(e.occurredAt))<=str(p.endDate)),'Còn phiếu thu chi nháp trong kỳ.');
            ensure(!all('openingBalances',shopId).some(o=>o.status==='draft'&&str(o.effectiveDate)>=str(p.startDate)&&str(o.effectiveDate)<=str(p.endDate)),'Còn hồ sơ mở sổ nháp trong kỳ.');
            ensure(!all('reconciliations', shopId).some(r => r.state !== 'matched'), 'Còn sai lệch đối soát.');
            ensure(!all('codSettlements', shopId).some(r => r.status !== 'matched'), 'Còn COD chưa khớp.');
            ensure(bookSnapshot(shopId).completeness==='complete','Sổ chưa đối chiếu đầy đủ nguồn và tồn; xem cảnh báo báo cáo trước khi khóa.',409,'BOOK_INCOMPLETE');
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
            activeAccount(shopId,str(tx.accountId));
            assertOpenPeriod(shopId,fiscalDate(shopId,str(tx.occurredAt)));
            const postingLines:Array<{code:string;debit:bigint;credit:bigint;description:string}>=[];
            const bankCode=str(find('accounts',str(tx.accountId),shopId).code);
            ensure(bankCode.startsWith('112'),'Giao dịch phải thuộc tài khoản ngân hàng theo chính sách.',422,'BANK_ACCOUNT_REQUIRED');
            postingLines.push({code:bankCode,debit:tx.direction==='credit'?total:0n,credit:tx.direction==='debit'?total:0n,description:'Tiền ngân hàng được phân bổ có nguồn'});
            for (const allocation of allocations) {
                ensure(record(allocation.resource).type === 'debt', 'Bộ mô phỏng hỗ trợ ghép khoản công nợ.', 422);
                const debt = find('debts', str(record(allocation.resource).id), shopId);
                ensure(!debt.disputed && units(allocation.amount) <= units(debt.outstandingAmount), 'Khoản nợ tranh chấp hoặc phân bổ vượt nợ.', 422);
                ensure((tx.direction === 'credit') === (debt.direction === 'receivable'), 'Chiều tiền không khớp công nợ.', 422);
                ensure(record(allocation.amount).currency === record(tx.amount).currency && record(debt.outstandingAmount).currency === record(tx.amount).currency, 'Không ghép khác tiền tệ.', 422);
                const code=debt.direction==='payable'?'331':debt.counterpartyType==='carrier'?'138':'131';
                postingLines.push({code,debit:debt.direction==='payable'?units(allocation.amount):0n,credit:debt.direction==='receivable'?units(allocation.amount):0n,description:`Phân bổ khoản nợ ${debt.id}`});
                debt.outstandingAmount = money(units(debt.outstandingAmount) - units(allocation.amount), str(record(tx.amount).currency));
                touch(debt);
            }
            c.difference = money(units(c.difference) - total, str(record(tx.amount).currency));
            c.state = units(c.difference) === 0n ? 'matched' : 'suggested';
            c.reason = body.reason;
            touch(c);
            tx.matchState = c.state;
            touch(tx);
            const entry=insert('financeEntries', 'FinanceEntry', shopId, {
                kind: tx.direction === 'credit' ? 'receipt' : 'disbursement', classification: 'other', amount: money(total, str(record(tx.amount).currency)), status: 'posted', occurredAt: tx.occurredAt, description: body.reason, sourceRef: { type: 'bank_allocation', id: tx.id }, reversalOf: null
            });
            postBusinessJournal(shopId,'finance_entry',str(entry.id),postingLines,fiscalDate(shopId,str(tx.occurredAt)),str(body.reason));
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
            ensure(units(body.actualFees)>=0n&&units(body.actualFees)<=units(cod.grossDue),'Phí thực tế không âm hoặc vượt phải thu.',422);
            activeAccount(shopId,str(bank.accountId));
            const bankCode=str(find('accounts',str(bank.accountId),shopId).code);
            ensure(bankCode.startsWith('112'),'Chọn tài khoản ngân hàng theo chính sách.',422,'BANK_ACCOUNT_REQUIRED');
            assertOpenPeriod(shopId,fiscalDate(shopId,str(bank.occurredAt)));
            cod.actualFees = body.actualFees;
            cod.bankReceived = bank.amount;
            cod.difference = money(0n,str(record(cod.grossDue).currency));
            cod.bankTransactionId = bank.id;
            cod.status = 'matched';
            touch(cod);
            bank.matchState = 'matched';
            touch(bank);
            for (const r of all('reconciliations', shopId).filter(r => r.transactionId === bank.id)) {
                r.state = 'matched';
                r.difference = money(0n,str(record(r.difference).currency));
                touch(r);
            }
            const orderIds = Array.isArray(cod.orderIds) ? cod.orderIds : [];
            for (const debt of all('debts', shopId).filter(d => record(d.source).type === 'order' && orderIds.includes(record(d.source).id))) {
                debt.outstandingAmount = money(0n,str(record(debt.originalAmount).currency));
                touch(debt);
            }
            const entry=insert('financeEntries', 'FinanceEntry', shopId, {
                kind: 'receipt', classification: 'sales_receipt', amount: bank.amount, status: 'posted', occurredAt: bank.occurredAt, description: 'Tiền COD thực nhận sau phí', sourceRef: { type: 'cod_settlement', id: cod.id }, reversalOf: null
            });
            postBusinessJournal(shopId,'finance_entry',str(entry.id),[{code:bankCode,debit:units(bank.amount),credit:0n,description:'Tiền COD thực nhận'},{code:'64101',debit:units(body.actualFees),credit:0n,description:'Phí vận chuyển thực đã khấu trừ'},{code:'138',debit:0n,credit:units(cod.grossDue),description:'Giảm phải thu nhà vận chuyển'}],fiscalDate(shopId,str(bank.occurredAt)),str(body.reason));
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
