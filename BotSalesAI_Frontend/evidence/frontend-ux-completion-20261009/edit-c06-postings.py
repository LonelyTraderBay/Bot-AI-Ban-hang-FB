from pathlib import Path
F=Path(__file__).resolve().parents[2]
def source(file):return F/('apps/web/src/mocks/'+file+'.ts')
def save(file,text):source(file).write_text(text,encoding='utf-8')
p=source('procurement');text=p.read_text(encoding='utf-8')
text=text.replace("import { activeWarehouse } from './masters';","import { activeWarehouse } from './masters';\nimport { carryingValue, setStockValue, postBusinessJournal } from './accounting';")
text=text.replace('units, money, zero, assertOpenPeriod','units, money, assertOpenPeriod')
text=text.replace('const oldValue = s.unitCost ? units(s.unitCost) * BigInt(num(s.onHand)) : 0n;',"const oldValue=carryingValue(s);ensure(oldValue!==null,'Tồn cũ chưa có giá vốn; cần đối chiếu trước khi tính bình quân.',409,'COST_NOT_KNOWN');")
text=text.replace('s.unitCost = money((oldValue + value) / BigInt(newCount));',"setStockValue(s,oldValue+value,newCount,str(record(original.unitCost).currency));")
start=text.index('            const period = assertOpenPeriod(shopId);\n            if (amount > 0n)');end=text.index("                insert('debts'",start)
text=text[:start]+'''            if (amount > 0n) {
                postBusinessJournal(shopId,'goods_receipt',str(receipt.id),[{code:'156',debit:amount,credit:0n,description:'Hàng đã kiểm nhận'},{code:'331',debit:0n,credit:amount,description:'Phải trả nhà cung cấp'}]);
''' + text[end:];save('procurement',text)
p=source('fulfillment');text=p.read_text(encoding='utf-8')
text=text.replace("import type { Input, Row } from './database';","import type { Input, Row } from './database';\nimport { carryingValue, dispatchCost, setStockValue, postBusinessJournal, fiscalDate } from './accounting';")
text=text.replace("            for (const line of rows(order.lines)) {\n                const stock = stockFor", "            let totalCost=0n;\n            for (const line of rows(order.lines)) {\n                const stock = stockFor")
text=text.replace('const cost = stock.unitCost ? units(stock.unitCost) * BigInt(num(line.quantity)) : null;\n                line.costSnapshot = cost === null ? null : money(cost);',"const cost=dispatchCost(stock,num(line.quantity)),value=carryingValue(stock);\n                ensure(cost!==null&&value!==null,'Cần giá vốn đã đối chiếu trước khi bàn giao.',409,'COST_NOT_KNOWN');\n                line.costSnapshot=money(cost);totalCost+=cost;setStockValue(stock,value-cost,num(stock.onHand)-num(line.quantity),str(recordMoney(stock.unitCost).currency)||'VND');")
text=text.replace("            shipment.state = 'handed_over';", "            if(totalCost>0n)postBusinessJournal(shopId,'shipment_dispatch',str(shipment.id),[{code:'157',debit:totalCost,credit:0n,description:'Giá vốn hàng đang vận chuyển'},{code:'156',debit:0n,credit:totalCost,description:'Xuất giá trị khỏi kho'}]);\n            shipment.state = 'handed_over';")
text=text.replace('num, rows, now, stockFor','num, rows, record as recordMoney, now, stockFor')
text=text.replace("            if (body.eventType === 'delivered') {",'''            if (body.eventType === 'delivered') {
                ensure(rows(order.lines).every(l=>l.costSnapshot!==null&&l.costSnapshot!==undefined),'Chưa có giá vốn bàn giao.',409,'COST_NOT_KNOWN');
                const cost=rows(order.lines).reduce((n,l)=>n+units(l.costSnapshot),0n),sale=units(order.total),receivable=order.paymentState==='verified'?'338':order.paymentMethod==='cod'?'138':'131';
                postBusinessJournal(shopId,'order_delivery',str(order.id),[{code:receivable,debit:sale,credit:0n,description:'Ghi nhận phải thu hoặc kết chuyển tiền ứng trước'},{code:'511',debit:0n,credit:sale,description:'Doanh thu theo giao hàng đã xác nhận'},{code:'632',debit:cost,credit:0n,description:'Giá vốn lịch sử của hàng đã giao'},{code:'157',debit:0n,credit:cost,description:'Kết chuyển hàng đang vận chuyển'}],fiscalDate(shopId,str(body.occurredAt)));
''')
text=text.replace('            let refund = 0n;','            let refund = 0n,restoredCost=0n;')
text=text.replace('                line.disposition = inspected.disposition;', '                line.acceptedQuantity=acceptedQuantity;\n                line.disposition = inspected.disposition;')
text=text.replace("                if (inspected.disposition === 'sellable' && acceptedQuantity > 0)\n                    move(input, stockFor(shopId, str(original.variantId), str(order.warehouseId)), acceptedQuantity, 0, 'return', str(inspected.reason), { type: 'return', id: r.id });",'''                if (inspected.disposition === 'sellable' && acceptedQuantity > 0) {
                    ensure(original.costSnapshot!==null&&original.costSnapshot!==undefined,'Không dùng giá vốn hiện tại thay lịch sử đã giao.',409,'COST_NOT_KNOWN');
                    const stock=stockFor(shopId,str(original.variantId),str(order.warehouseId)),value=carryingValue(stock);ensure(value!==null,'Giá trị tồn hiện tại chưa đối chiếu.',409,'COST_NOT_KNOWN');
                    const prior=all('returns',shopId).filter(other=>other.id!==r.id&&other.orderId===order.id&&['inspected','closed'].includes(str(other.state))).flatMap(other=>rows(other.lines)).filter(l=>l.orderLineId===original.id).reduce((n,l)=>n+num(l.acceptedQuantity),0);
                    const cost=units(original.costSnapshot)*BigInt(prior+acceptedQuantity)/BigInt(num(original.quantity))-units(original.costSnapshot)*BigInt(prior)/BigInt(num(original.quantity));
                    setStockValue(stock,value+cost,num(stock.onHand)+acceptedQuantity,str(recordMoney(original.costSnapshot).currency));restoredCost+=cost;
                    move(input,stock,acceptedQuantity,0,'return',str(inspected.reason),{type:'return',id:r.id});
                }''')
text=text.replace("            r.state = 'inspected';", "            if(refund>0n||restoredCost>0n)postBusinessJournal(shopId,'return_inspection',str(r.id),[{code:'521',debit:refund,credit:0n,description:'Hàng bán được nhận trả'},{code:'335',debit:0n,credit:refund,description:'Nghĩa vụ hoàn tiền, chưa ghi tiền đã hoàn'},{code:'156',debit:restoredCost,credit:0n,description:'Nhập lại theo giá vốn gốc'},{code:'632',debit:0n,credit:restoredCost,description:'Đảo giá vốn phần hàng bán được nhập lại'}]);\n            r.state = 'inspected';")
save('fulfillment',text)
p=source('orders');text=p.read_text(encoding='utf-8')
text=text.replace("import { activeWarehouse", "import { postBusinessJournal, fiscalDate } from './accounting';\nimport { activeWarehouse")
start=text.index("        case 'payOrder':");end=text.index("        case 'refundOrder':",start);part=text[start:end]
part=part.replace("            insert('financeEntries'", "            const entry=insert('financeEntries'")
part=part.replace("            order.paymentState = 'verified';",'''            ensure(record(body.amount).currency===record(order.total).currency,'Không ghi thu khác đồng tiền đơn.',422,'PAYMENT_CURRENCY');
            const delivered=['delivered','part_returned','returned'].includes(str(order.fulfillmentState)),counterpart=delivered?(order.paymentMethod==='cod'?'138':'131'):'338';
            postBusinessJournal(shopId,'finance_entry',str(entry.id),[{code:body.method==='cash'?'111':'112',debit:units(body.amount),credit:0n,description:'Tiền thu có bằng chứng tổng hợp'},{code:counterpart,debit:0n,credit:units(body.amount),description:delivered?'Giảm phải thu':'Tiền ứng trước, chưa ghi doanh thu'}]);
            for(const debt of all('debts',shopId).filter(d=>record(d.source).type==='order'&&record(d.source).id===order.id)){debt.outstandingAmount=money(0n);touch(debt);}
            order.paymentState = 'verified';''')
text=text[:start]+part+text[end:]
start=text.index("        case 'refundOrder':");part=text[start:]
part=part.replace('            assertOpenPeriod(shopId);','            assertOpenPeriod(shopId,fiscalDate(shopId));')
part=part.replace("            insert('financeEntries'", "            const entry=insert('financeEntries'")
part=part.replace("            order.paymentState = refunded", "            ensure(record(body.amount).currency===record(order.total).currency,'Không ghi hoàn khác đồng tiền đơn.',422,'PAYMENT_CURRENCY');\n            postBusinessJournal(shopId,'finance_entry',str(entry.id),[{code:'335',debit:amount,credit:0n,description:'Giảm nghĩa vụ hoàn tiền'},{code:'112',debit:0n,credit:amount,description:'Khoản hoàn đã được ghi nhận bằng chứng'}]);\n            order.paymentState = refunded")
text=text[:start]+part;save('orders',text)
print('Receipt/dispatch/delivery/return/payment/refund now post exact source journals.')
