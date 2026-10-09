/** Synthetic management ledger. Exact amounts and business rules; no React dependency. */
import { all, find, insert, ensure, str, num, rows, record, units, money, now, assertOpenPeriod } from './database';
import type { Row } from './database';
import { activeAccount } from './masters';
import { dateOnlyInTimezone, dateOnlyStartOfDayToISOString, isValidDateOnly, limitCodePoints } from '../shared/model/format';

export const MANAGEMENT_POLICY='synthetic-policy-1';
export function fiscalDate(shopId:string,instant=now()) {return dateOnlyInTimezone(new Date(instant),str(find('shops',shopId,shopId).timezone));}
export function accountByCode(shopId:string,code:string) {
    const account=all('accounts',shopId).find(a=>a.code===code);
    ensure(account,`Chưa cấu hình tài khoản ${code} cho chính sách quản trị.`,409,'ACCOUNT_POLICY_MISSING');
    return activeAccount(shopId,str(account.id));
}
export function validateJournalLines(shopId:string,lines:Row[],allowZero=false) {
    const currency=str(find('shops',shopId,shopId).currency);
    let debit=0n,credit=0n;
    for(const line of lines) {
        activeAccount(shopId,str(line.accountId));
        ensure(record(line.debit).currency===currency&&record(line.credit).currency===currency,'Bút toán chỉ dùng đồng tiền của cửa hàng.',422,'JOURNAL_CURRENCY');
        const d=units(line.debit),c=units(line.credit);
        ensure(d>=0n&&c>=0n&&(d===0n||c===0n)&&d+c>0n,'Mỗi dòng chỉ có một bên Nợ hoặc Có dương.',422,'JOURNAL_LINE_INVALID');debit+=d;credit+=c;
    }
    ensure(debit===credit&&(allowZero||debit>0n),'Tổng Nợ/Có phải cân bằng.',422,'JOURNAL_UNBALANCED');return debit;
}
type PostingLine={code:string;debit:bigint;credit:bigint;description:string};
export function postBusinessJournal(shopId:string,sourceType:string,sourceId:string,lines:PostingLine[],effectiveDate=fiscalDate(shopId),reason='Ghi sổ theo chính sách quản trị tổng hợp.') {
    const period=assertOpenPeriod(shopId,effectiveDate),currency=str(find('shops',shopId,shopId).currency);
    ensure(!all('journals',shopId).some(j=>j.sourceType===sourceType&&j.sourceId===sourceId&&['posted','reversed'].includes(str(j.status))),'Nguồn đã được ghi sổ; không ghi lại sau đảo.',409,'SOURCE_ALREADY_POSTED');
    const values=lines.filter(l=>l.debit!==0n||l.credit!==0n).map(l=>({accountId:accountByCode(shopId,l.code).id,debit:money(l.debit,currency),credit:money(l.credit,currency),description:limitCodePoints(l.description,300)}));
    validateJournalLines(shopId,values);
    return insert('journals','Journal',shopId,{sourceType,sourceId,status:'posted',effectiveDate,periodId:period.id,policyVersion:MANAGEMENT_POLICY,lines:values,reversalOf:null,replacesJournalId:null,sourceRevision:0,reason});
}
export function carryingValue(stock:Row):bigint|null {
    if(stock.carryingValue!==undefined&&stock.carryingValue!==null)return units(stock.carryingValue);
    if(num(stock.onHand)===0)return 0n;
    return stock.unitCost ? units(stock.unitCost)*BigInt(num(stock.onHand)) : null;
}
export function setStockValue(stock:Row,value:bigint,quantity:number,currency:string) {
    ensure(value>=0n&&quantity>=0,'Giá trị tồn không âm.',422,'STOCK_VALUE_INVALID');
    ensure(quantity!==0||value===0n,'Không giữ giá trị tồn khi số lượng bằng 0.',422,'STOCK_VALUE_INVALID');
    stock.carryingValue=money(value,currency);stock.unitCost=quantity>0?money(value/BigInt(quantity),currency):null;
}
export function dispatchCost(stock:Row,quantity:number) {
    const value=carryingValue(stock);if(value===null)return null;
    ensure(quantity>0&&quantity<=num(stock.onHand),'Số lượng xuất vượt tồn.',422);
    return quantity===num(stock.onHand)?value:value*BigInt(quantity)/BigInt(num(stock.onHand));
}
export type ReportWindow={from:string;to:string;timezone:string;start:number;end:number};
export function journalInstant(shopId:string,journal:Row) {return Date.parse(dateOnlyStartOfDayToISOString(str(journal.effectiveDate),str(find('shops',shopId,shopId).timezone)));}
export function postedJournals(shopId:string) {return all('journals',shopId).filter(j=>['posted','reversed'].includes(str(j.status))).sort((a,b)=>str(a.effectiveDate).localeCompare(str(b.effectiveDate))||str(a.id).localeCompare(str(b.id)));}
export function bookSnapshot(shopId:string) {
    const journals=postedJournals(shopId),warnings:string[]=[];
    if(!all('openingBalances',shopId).some(o=>o.status==='posted'))warnings.push('Chưa có mở sổ được kiểm và ghi; số liệu chỉ bao gồm chứng từ đã có.');
    for(const entry of all('financeEntries',shopId).filter(e=>(e.status==='posted'||e.status==='reversed')&&e.cashImpact!==false))if(!journals.some(j=>j.sourceType==='finance_entry'&&j.sourceId===entry.id))warnings.push(`Phiếu ${entry.id} chưa có nguồn bút toán.`);
    for(const order of all('orders',shopId).filter(o=>['delivered','part_returned','returned'].includes(str(o.fulfillmentState))))if(!journals.some(j=>j.sourceType==='order_delivery'&&j.sourceId===order.id))warnings.push(`Đơn ${order.id} thiếu bút toán ghi nhận giao hàng.`);
    for(const receipt of all('receipts',shopId).filter(r=>r.status==='posted'))if(!journals.some(j=>j.sourceType==='goods_receipt'&&j.sourceId===receipt.id))warnings.push(`Phiếu nhận ${receipt.id} chưa có nguồn bút toán.`);
    for(const returned of all('returns',shopId).filter(r=>['inspected','closed'].includes(str(r.state))&&units(r.refundObligation)>0n))if(!journals.some(j=>j.sourceType==='return_inspection'&&j.sourceId===returned.id))warnings.push(`Phiếu trả ${returned.id} thiếu bút toán kiểm hàng.`);
    for(const journal of journals) {
        if(journal.policyVersion!==MANAGEMENT_POLICY)warnings.push(`Chính sách của ${journal.id} cần đối chiếu.`);
        if(rows(journal.lines).reduce((n,l)=>n+units(l.debit)-units(l.credit),0n)!==0n)warnings.push(`Bút toán ${journal.id} không cân bằng.`);
        if(rows(journal.lines).some(l=>!all('accounts',shopId).some(a=>a.id===l.accountId)))warnings.push(`Bút toán ${journal.id} thiếu tài khoản nguồn.`);
    }
    const inventoryAccount=all('accounts',shopId).find(a=>a.code==='156');
    const values=all('stock',shopId).map(carryingValue);
    if(values.some(v=>v===null))warnings.push('Có tồn kho chưa có giá vốn được đối chiếu.');
    else if(inventoryAccount) {
        const inventory=values.reduce<bigint>((n,v)=>n+(v||0n),0n),book=journals.flatMap(j=>rows(j.lines)).filter(l=>l.accountId===inventoryAccount.id).reduce((n,l)=>n+units(l.debit)-units(l.credit),0n);
        if(inventory!==book)warnings.push('Giá trị tồn kho hiện tại chưa khớp tài khoản hàng tồn kho.');
    }
    return {shopId,asOf:now(),policyVersion:MANAGEMENT_POLICY,completeness:warnings.length?'incomplete':'complete',warnings,journals};
}
function totalsByAccount(journals:Row[]) {
    const balances=new Map<string,{debit:bigint;credit:bigint}>();
    for(const journal of journals)for(const line of rows(journal.lines)) {
        const id=str(line.accountId),value=balances.get(id)||{debit:0n,credit:0n};value.debit+=units(line.debit);value.credit+=units(line.credit);balances.set(id,value);
    }return balances;
}
function reportBase(shopId:string) {const {journals,...snapshot}=bookSnapshot(shopId);return {journals,snapshot,currency:str(find('shops',shopId,shopId).currency)};}
export function ledgerReport(shopId:string,window:ReportWindow,accountId:string|null,cursor:string|null,limit:number):Row {
    if(accountId)find('accounts',accountId,shopId);
    const {journals,snapshot,currency}=reportBase(shopId),balances=new Map<string,bigint>();let opening=0n,debit=0n,credit=0n;
    const selected=(line:Row)=>!accountId||line.accountId===accountId;
    for(const journal of journals.filter(j=>journalInstant(shopId,j)<window.start))for(const line of rows(journal.lines).filter(selected)) {
        const id=str(line.accountId),value=units(line.debit)-units(line.credit);balances.set(id,(balances.get(id)||0n)+value);opening+=value;
    }
    const entries:Row[]=[];
    for(const journal of journals.filter(j=>journalInstant(shopId,j)>=window.start&&journalInstant(shopId,j)<window.end))rows(journal.lines).forEach((line,index)=>{
        if(!selected(line))return;
        const id=str(line.accountId),account=all('accounts',shopId).find(a=>a.id===id),d=units(line.debit),c=units(line.credit),balance=(balances.get(id)||0n)+d-c;balances.set(id,balance);debit+=d;credit+=c;
        entries.push({id:`${journal.id}_line_${index}`,journalId:journal.id,sourceType:journal.sourceType,sourceId:journal.sourceId,effectiveDate:journal.effectiveDate,accountId:id,accountCode:account?.code||id,accountName:account?.name||'Tài khoản nguồn chưa có',description:line.description,debit:line.debit,credit:line.credit,balance:money(balance,currency)});
    });
    let offset=0;if(cursor){const index=entries.findIndex(e=>e.id===cursor);ensure(index>=0,'Cursor không thuộc khoảng/tài khoản này.',422,'INVALID_CURSOR');offset=index+1;}
    const items=entries.slice(offset,offset+limit),hasMore=offset+items.length<entries.length;
    return {...snapshot,from:window.from,to:window.to,timezone:window.timezone,accountId,openingBalance:money(opening,currency),closingBalance:money(opening+debit-credit,currency),totalDebit:money(debit,currency),totalCredit:money(credit,currency),entries:items,page:{limit,total:entries.length,hasMore,nextCursor:hasMore?items.at(-1)?.id:null}};
}
export function trialBalanceReport(shopId:string,window:ReportWindow):Row {
    const {journals,snapshot,currency}=reportBase(shopId),opening=totalsByAccount(journals.filter(j=>journalInstant(shopId,j)<window.start)),movement=totalsByAccount(journals.filter(j=>journalInstant(shopId,j)>=window.start&&journalInstant(shopId,j)<window.end));
    let debit=0n,credit=0n,closingDebit=0n,closingCredit=0n;
    const accounts=all('accounts',shopId).map(account=>{
        const before=opening.get(str(account.id))||{debit:0n,credit:0n},moved=movement.get(str(account.id))||{debit:0n,credit:0n},initial=before.debit-before.credit,balance=initial+moved.debit-moved.credit;
        const positive=(v:bigint)=>v>0n?v:0n;debit+=moved.debit;credit+=moved.credit;closingDebit+=positive(balance);closingCredit+=positive(-balance);
        return {accountId:account.id,code:account.code,name:account.name,group:account.group,openingDebit:money(positive(initial),currency),openingCredit:money(positive(-initial),currency),debit:money(moved.debit,currency),credit:money(moved.credit,currency),closingDebit:money(positive(balance),currency),closingCredit:money(positive(-balance),currency)};
    });
    return {...snapshot,...{from:window.from,to:window.to,timezone:window.timezone},rows:accounts,totalDebit:money(debit,currency),totalCredit:money(credit,currency),closingDebit:money(closingDebit,currency),closingCredit:money(closingCredit,currency),difference:money(closingDebit-closingCredit,currency),balanced:debit===credit&&closingDebit===closingCredit};
}
export function balanceSheetReport(shopId:string,atDate:string):Row {
    ensure(isValidDateOnly(atDate),'Chọn ngày lịch hợp lệ.',422,'INVALID_REPORT_DATE');
    const {journals,snapshot,currency}=reportBase(shopId),selected=journals.filter(j=>str(j.effectiveDate)<=atDate),balances=totalsByAccount(selected);
    let assets=0n,liabilities=0n,equity=0n,profit=0n;
    const accounts=all('accounts',shopId).map(account=>{
        const value=balances.get(str(account.id))||{debit:0n,credit:0n},balance=value.debit-value.credit;
        if(account.group==='asset')assets+=balance;else if(account.group==='liability')liabilities-=balance;else if(account.group==='equity')equity-=balance;else profit-=balance;
        return {accountId:account.id,code:account.code,name:account.name,group:account.group,balance:money(['liability','equity','income'].includes(str(account.group))?-balance:balance,currency)};
    });
    return {...snapshot,atDate,rows:accounts,assets:money(assets,currency),liabilities:money(liabilities,currency),equity:money(equity,currency),retainedProfit:money(profit,currency),difference:money(assets-liabilities-equity-profit,currency),balanced:assets===liabilities+equity+profit,sourceJournalIds:selected.map(j=>j.id)};
}
export function journalReports(shopId:string,window:ReportWindow,kind:'cashflow'|'profit_loss'):Row {
    const {journals,snapshot,currency}=reportBase(shopId),selected=journals.filter(j=>journalInstant(shopId,j)>=window.start&&journalInstant(shopId,j)<window.end),balances=totalsByAccount(selected),accounts=all('accounts',shopId);
    const amount=(code:string)=>{const account=accounts.find(a=>a.code===code),v=account?balances.get(str(account.id)):undefined;return v?v.debit-v.credit:0n;};
    const base={...snapshot,from:window.from,to:window.to,timezone:window.timezone,sourceJournalIds:selected.map(j=>j.id)};
    if(kind==='cashflow') {
        let receipts=0n,disbursements=0n;
        for(const j of selected) {
            const net=rows(j.lines).filter(l=>accounts.some(a=>a.id===l.accountId&&/^(111|112)/.test(str(a.code)))).reduce((n,l)=>n+units(l.debit)-units(l.credit),0n);
            if(net>0n)receipts+=net;else disbursements-=net;
        }return {...base,receipts:money(receipts,currency),disbursements:money(disbursements,currency),netCashMovement:money(receipts-disbursements,currency)};
    }
    const revenue=-amount('511'),returns=amount('521'),otherIncome=accounts.filter(a=>a.group==='income'&&!['511','521'].includes(str(a.code))).reduce((n,a)=>{const v=balances.get(str(a.id));return n+(v?v.credit-v.debit:0n);},0n),cogs=amount('632'),operating=accounts.filter(a=>a.group==='expense'&&a.code!=='632').reduce((n,a)=>{const v=balances.get(str(a.id));return n+(v?v.debit-v.credit:0n);},0n);
    const incomplete=snapshot.completeness==='incomplete';
    return {...base,grossSales:money(revenue,currency),discounts:money(0n,currency),salesReturns:money(returns,currency),netSales:money(revenue-returns,currency),cogs:incomplete?null:money(cogs,currency),grossProfit:incomplete?null:money(revenue-returns-cogs,currency),operatingProfit:incomplete?null:money(revenue-returns+otherIncome-cogs-operating,currency),shippingIncome:money(0n,currency),shippingExpense:money(amount('64101'),currency),platformFees:money(amount('64102'),currency),paymentFees:money(amount('64103'),currency),aiExpense:money(amount('64201'),currency),otherOperatingExpenses:money(operating-amount('64101')-amount('64102')-amount('64103')-amount('64201'),currency)};
}
