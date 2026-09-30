'use strict';
globalThis.BSDemo = globalThis.BSDemo || {};
BSDemo.domain = (()=>{
  const money = value => {if(!/^\d+$/.test(String(value)))throw new Error('Số tiền phải là số nguyên VND không âm.');const n=BigInt(value);if(n>1000000000000n)throw new Error('Số tiền vượt giới hạn của demo.');return n;};
  const quantity = value => {const n=Number(value);if(!Number.isSafeInteger(n)||n<1||n>10000)throw new Error('Số lượng phải là số nguyên từ 1 đến 10.000.');return n;};
  const total=o=>o.lines.reduce((s,l)=>s+money(l.unitPrice)*BigInt(l.quantity),0n);
  const cost=o=>o.lines.reduce((s,l)=>s+money(l.unitCost)*BigInt(l.quantity),0n);
  const available=p=>p.onHand-p.reserved;
  const tally=s=>{
    const sold=s.orders.filter(o=>o.fulfillment==='fulfilled'&&o.state!=='returned');
    const revenue=sold.reduce((a,o)=>a+total(o),0n),cogs=sold.reduce((a,o)=>a+cost(o),0n);
    const receipts=s.orders.filter(o=>o.payment==='paid').reduce((a,o)=>a+total(o),0n);
    const disbursements=s.expenses.reduce((a,e)=>a+money(e.amount),0n);
    const operating=s.expenses.filter(e=>e.type==='operating').reduce((a,e)=>a+money(e.amount),0n);
    return {revenue,cogs,gross:revenue-cogs,operating,profit:revenue-cogs-operating,receipts,disbursements,cash:receipts-disbursements};
  };
  function command(s,id,action){
    const o=s.orders.find(x=>x.id===id);if(!o)throw new Error('Không tìm thấy đơn trong shop này.');
    const entries=o.lines.map(l=>({l,p:s.products.find(p=>p.id===l.productId)}));
    if(entries.some(x=>!x.p))throw new Error('Sản phẩm không còn trong bộ dữ liệu.');
    if(action==='confirm'){
      if(o.state!=='draft')throw new Error('Chỉ xác nhận đơn nháp.');
      for(const {l,p} of entries){if(!p.active)throw new Error(p.name+' đã ngừng bán.');if(available(p)<l.quantity)throw new Error(p.name+': chỉ còn '+available(p)+' sản phẩm khả dụng.');if(l.unitPrice!==p.price)throw new Error('Giá đã thay đổi. Hãy tạo lại đơn nháp với giá mới.');}
      entries.forEach(({l,p})=>p.reserved+=l.quantity);o.state='confirmed';
    }else if(action==='dispatch'){
      if(o.state!=='confirmed'||o.fulfillment!=='unfulfilled')throw new Error('Đơn chưa xác nhận hoặc đã xuất kho.');
      for(const {l,p}of entries)if(p.reserved<l.quantity||p.onHand<l.quantity)throw new Error('Tồn kho không đủ.');
      entries.forEach(({l,p})=>{p.onHand-=l.quantity;p.reserved-=l.quantity;s.movements.unshift({id:'mv-'+id+'-'+p.id,productId:p.id,change:-l.quantity,reason:'Xuất kho '+id,date:'2026-09-29'});});o.fulfillment='dispatched';
    }else if(action==='pay'){
      if(!['confirmed','completed'].includes(o.state)||o.payment==='paid')throw new Error('Chỉ thu tiền một lần cho đơn đã xác nhận.');
      o.payment='paid';if(o.fulfillment==='fulfilled')o.state='completed';
    }else if(action==='cancel'){
      if(!['draft','confirmed'].includes(o.state)||['dispatched','fulfilled'].includes(o.fulfillment)||o.payment==='paid')throw new Error('Chỉ hủy đơn chưa xuất kho và chưa thanh toán.');
      if(o.state==='confirmed')entries.forEach(({l,p})=>p.reserved-=l.quantity);o.state='cancelled';
    }else if(action==='return'){
      throw new Error('Mở Yêu cầu đổi trả V2; không tự hoàn tiền hoặc cộng hàng chưa kiểm.');
      entries.forEach(({l,p})=>{p.onHand+=l.quantity;s.movements.unshift({id:'ret-'+id+'-'+p.id,productId:p.id,change:l.quantity,reason:'Hoàn toàn bộ '+id,date:'2026-09-29'});});o.state='returned';o.payment='refunded';o.fulfillment='returned';
    }else throw new Error('Thao tác không được hỗ trợ.');
    o.version++;return o;
  }
  function addProduct(s,data,id){
    const name=String(data.name||'').trim(),sku=String(data.sku||'').trim().toUpperCase();
    if(!name||name.length>120)throw new Error('Tên sản phẩm cần 1–120 ký tự.');
    if(!/^[A-Z0-9_-]{2,32}$/.test(sku))throw new Error('SKU gồm 2–32 ký tự chữ, số, dấu - hoặc _.');
    if(s.products.some(p=>p.sku===sku&&p.id!==id))throw new Error('SKU đã tồn tại trong shop này.');
    money(data.price);money(data.cost);
    return {id,sku,name,category:data.category||'Khác',variant:String(data.variant||'Tiêu chuẩn').slice(0,60),price:String(data.price),cost:String(data.cost),onHand:0,reserved:0,threshold:3,icon:'shirt',active:true,description:String(data.description||'').slice(0,2000),version:1};
  }
  return {money,quantity,total,cost,available,tally,command,addProduct};
})();
if(typeof module!=='undefined')module.exports=BSDemo.domain;
