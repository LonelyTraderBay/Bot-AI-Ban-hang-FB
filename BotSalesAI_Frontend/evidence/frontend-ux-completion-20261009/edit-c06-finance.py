from pathlib import Path
F=Path(__file__).resolve().parents[2]
p=F/'apps/web/src/mocks/finance.ts';text=p.read_text(encoding='utf-8')
text=text.replace("import { activeAccount } from './masters';", "import { activeAccount, activeWarehouse } from './masters';\nimport { MANAGEMENT_POLICY, accountByCode, fiscalDate, carryingValue, setStockValue, postBusinessJournal, validateJournalLines, ledgerReport, trialBalanceReport, balanceSheetReport, journalReports } from './accounting';\nimport { isValidDateOnly, limitCodePoints } from '../shared/model/format';\nimport { stockFor, variant } from './database';")
start=text.index('export function cashflow(');end=text.index('export function finance(',start)
text=text[:start]+'''export function cashflow(shopId:string,window:ReportWindow):Row {return journalReports(shopId,window,'cashflow');}
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
''' + text[end:]
# The old timestamp helper is no longer a report source.
start=text.index('function inReportWindow(');end=text.index('export function cashflow(',start);text=text[:start]+text[end:]
text=text.replace("case 'getCashflow':",'''case 'getLedger':return ledgerReport(shopId,reportWindow(input),input.query.get('accountId'),input.query.get('cursor'),Math.min(100,Math.max(1,Number(input.query.get('limit'))||20)));
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
            opening.status='posted';opening.journalId=journal?.id||null;touch(opening);return command(shopId,op,{type:'opening_balance',id:opening.id});
        }
        case 'getCashflow':''')
# Preflight and current-period reversal are preserved before changing resource status.
text=text.replace("            assertOpenPeriod(shopId);\n            e.status = 'reversed';", "            const period=assertOpenPeriod(shopId,fiscalDate(shopId));\n            e.status = 'reversed';")
text=text.replace("effectiveDate: now().slice(0, 10), periodId: journal.periodId", "effectiveDate:fiscalDate(shopId), periodId:period.id")
text=text.replace("description: body.reason })), reversalOf: journal.id", "description:limitCodePoints(str(body.reason),300) })), reversalOf: journal.id,reason:body.reason")
text=text.replace("            const period = assertOpenPeriod(shopId, str(body.effectiveDate));", "            const period = assertOpenPeriod(shopId, str(body.effectiveDate));")
text=text.replace("            validateAccounts(shopId,lines);", "            validateAccounts(shopId,lines);\n            let sourceRevision=0;\n            if(body.replacesJournalId) {const original=find('journals',str(body.replacesJournalId),shopId);ensure(original.status==='reversed'&&original.sourceType===body.sourceType&&original.sourceId===body.sourceId,'Thay thế cần đúng nguồn bút toán đã đảo.',409,'INVALID_REPLACEMENT');sourceRevision=num(original.sourceRevision)+1;}")
text=text.replace("lines: body.lines, status: 'draft', periodId: period.id, policyVersion: 'synthetic-policy-1', reversalOf: null", "lines: body.lines, status: 'draft', periodId: period.id, policyVersion: MANAGEMENT_POLICY, reversalOf: null,replacesJournalId:body.replacesJournalId||null,sourceRevision,reason:body.reason")
text=text.replace("other.sourceId === j.sourceId && other.status === 'posted'", "other.sourceId === j.sourceId && num(other.sourceRevision)===num(j.sourceRevision) && ['posted','reversed'].includes(str(other.status))")
text=text.replace("            assertOpenPeriod(shopId);\n            const reversed =", "            const period=assertOpenPeriod(shopId,fiscalDate(shopId));\n            ensure(j.sourceType!=='opening_balance','Mở sổ có tồn đầu kỳ cần điều chỉnh bằng chứng từ có nguồn; không đảo riêng giá trị tồn.',409,'OPENING_REVERSAL_REQUIRES_ADJUSTMENT');\n            const reversed =")
text=text.replace("effectiveDate: now().slice(0, 10), periodId: j.periodId", "effectiveDate:fiscalDate(shopId), periodId:period.id")
text=text.replace("description: body.reason })), reversalOf: j.id", "description:limitCodePoints(str(body.reason),300) })), reversalOf: j.id,reason:body.reason")
p.write_text(text,encoding='utf-8');print('Finance opening/period/read-model handlers and reversal source revisions updated.')
