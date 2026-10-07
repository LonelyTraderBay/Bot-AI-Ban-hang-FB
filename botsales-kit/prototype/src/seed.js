/* Synthetic fixtures. The original v1.1 áo mẫu transaction is retained and extended
   with clearly synthetic records for visual review. No customer or provider data. */
'use strict';
globalThis.BSDemo = globalThis.BSDemo || {};
BSDemo.seed = function () {
  const products = [
    ['p1','DEMO-001','Áo mẫu A','Áo','M · Xanh','150000','100000',8,2,'shirt'],
    ['p2','AO-002','Áo thun Essential','Áo','L · Than','249000','135000',24,5,'shirt'],
    ['p3','QU-003','Quần linen Relaxed','Quần','M · Cát','420000','230000',3,5,'pants'],
    ['p4','TU-004','Túi tote Everyday','Phụ kiện','Kem','189000','80000',18,5,'bag'],
    ['p5','AO-005','Sơ mi Oxford','Áo','L · Xanh','459000','255000',12,3,'shirt'],
    ['p6','MU-006','Mũ lưỡi trai Studio','Phụ kiện','Đen','159000','65000',0,3,'cap'],
    ['p7','QU-007','Quần short Weekend','Quần','L · Xanh','290000','150000',9,3,'pants'],
    ['p8','TU-008','Túi đeo chéo Mini','Phụ kiện','Xám','329000','180000',2,3,'bag']
  ].map(([id,sku,name,category,variant,price,cost,onHand,threshold,icon])=>({id,sku,name,category,variant,price,cost,onHand,threshold,icon,reserved:0,active:true,description:'Dữ liệu mẫu để duyệt giao diện. Không phải sản phẩm bán thật.',version:1}));
  const customers = [
    {id:'c1',name:'Linh (khách mẫu)',phone:'09•• ••• 128',tag:'Khách quay lại',note:'Ưu tiên tư vấn kích cỡ. Thông tin giả lập.'},
    {id:'c2',name:'Minh (khách mẫu)',phone:'08•• ••• 630',tag:'Khách mới',note:''},
    {id:'c3',name:'An (khách mẫu)',phone:'09•• ••• 241',tag:'Thân thiết',note:'Quan tâm chất liệu linen.'},
    {id:'c4',name:'Hà (khách mẫu)',phone:'07•• ••• 091',tag:'Khách mới',note:''},
    {id:'c5',name:'Khách Mẫu',phone:'Chưa cung cấp',tag:'Khách mới',note:'Fixture từ đặc tả 1.1.'}
  ];
  const line = (id,qty)=>{let p=products.find(x=>x.id===id);return {productId:id,sku:p.sku,name:p.name,variant:p.variant,quantity:qty,unitPrice:p.price,unitCost:p.cost};};
  const order = (id,c,day,lines,state='completed',payment='paid')=>({id,customerId:c,date:`2026-09-${day}`,lines,state,payment,fulfillment:state==='completed'?'fulfilled':'unfulfilled',note:'Đơn hàng mẫu',version:1});
  const orders=[
    order('DH-1001','c5','29',[line('p1',2)]),
    order('DH-1002','c1','23',[line('p2',2),line('p4',1)]),
    order('DH-1003','c2','24',[line('p5',1)]),
    order('DH-1004','c3','25',[line('p3',1),line('p7',1)]),
    order('DH-1005','c1','26',[line('p8',1)]),
    order('DH-1006','c4','27',[line('p2',1)]),
    order('DH-1007','c3','28',[line('p5',1),line('p4',2)]),
    order('DH-1008','c2','29',[line('p2',1)],'confirmed','unpaid'),
    order('DH-1009','c4','29',[line('p3',1)],'draft','unpaid')
  ];
  products.find(p=>p.id==='p2').reserved=1;
  const conversations=[
    {id:'cv1',customerId:'c1',mode:'bot',status:'open',unread:2,eligible:true,topic:'Tư vấn áo thun',messages:[
      {from:'customer',text:'Shop ơi, áo thun Essential còn size L không?',time:'14:08'},
      {from:'bot',text:'Dạ còn ạ. Áo thun Essential size L có giá 249.000 ₫. Bạn thích màu than đúng không ạ?',time:'14:08',source:'Sản phẩm AO-002 · dữ liệu mô phỏng'},
      {from:'customer',text:'Đúng rồi, cho mình 1 chiếc nhé. Phí giao hàng thế nào?',time:'14:10'}]},
    {id:'cv2',customerId:'c2',mode:'human',status:'open',unread:1,eligible:true,topic:'Cần nhân viên hỗ trợ',messages:[
      {from:'customer',text:'Mình muốn đổi size của đơn hàng cũ.',time:'13:56'},
      {from:'bot',text:'Mình sẽ chuyển nhân viên kiểm tra điều kiện đổi hàng cho bạn.',time:'13:56',source:'Quy trình chuyển người hỗ trợ'}]},
    {id:'cv3',customerId:'c3',mode:'bot',status:'open',unread:0,eligible:true,topic:'Quần linen',messages:[
      {from:'customer',text:'Quần linen có dễ nhăn không?',time:'13:40'},
      {from:'bot',text:'Chất liệu linen có độ nhăn tự nhiên. Bạn có thể ủi ở nhiệt độ phù hợp với nhãn giặt ạ.',time:'13:40',source:'Hướng dẫn sản phẩm · đã duyệt'}]},
    {id:'cv4',customerId:'c4',mode:'human',status:'open',unread:0,eligible:false,topic:'Không đủ điều kiện gửi',messages:[
      {from:'customer',text:'Mình sẽ nhắn lại sau nhé.',time:'Hôm qua'}]},
    {id:'cv5',customerId:'c5',mode:'bot',status:'resolved',unread:0,eligible:true,topic:'Đã xử lý',messages:[
      {from:'customer',text:'Mình nhận hàng rồi, cảm ơn shop!',time:'12:10'},
      {from:'bot',text:'Shop cảm ơn bạn. Chúc bạn một ngày vui vẻ!',time:'12:10',source:'Lời chào đã duyệt'}]}
  ];
  const knowledge=[
    {id:'k1',name:'Chính sách giao hàng',type:'Chính sách',status:'published',content:'Phí vận chuyển được nhân viên xác nhận theo địa chỉ nhận hàng. Không hứa miễn phí vận chuyển nếu chưa có chính sách được duyệt.',version:1},
    {id:'k2',name:'Hướng dẫn chọn kích cỡ',type:'Hướng dẫn',status:'published',content:'Hỏi nhu cầu và kích cỡ khách thường mặc. Khi chưa có bảng size của sản phẩm, chuyển nhân viên hỗ trợ, không đoán số đo.',version:2},
    {id:'k3',name:'Chính sách đổi hàng',type:'Chính sách',status:'draft',content:'Bản nháp đang chờ chủ shop xác nhận thời hạn và điều kiện đổi hàng.',version:1},
    {id:'k4',name:'Cách chăm sóc chất liệu linen',type:'Sản phẩm',status:'published',content:'Linen có độ nhăn tự nhiên. Làm theo nhãn giặt của từng sản phẩm.',version:1}
  ];
  const base={categories:['Áo','Quần','Phụ kiện'],products,customers,orders,conversations,knowledge,
    expenses:[{id:'PC-001',type:'inventory',amount:'1000000',note:'Nhập 10 Áo mẫu A — fixture gốc',date:'2026-09-29'},{id:'PC-002',type:'operating',amount:'180000',note:'Đóng gói — ví dụ bổ sung',date:'2026-09-29'}],
    movements:[{id:'MV-001',productId:'p1',change:10,reason:'Nhập đầu kỳ theo fixture gốc',date:'2026-09-29'}, {id:'MV-002',productId:'p1',change:-2,reason:'Xuất kho DH-1001',date:'2026-09-29'}],
    bot:{enabled:true,tone:'Thân thiện, ngắn gọn',instructions:'Chỉ tư vấn theo dữ liệu shop đã duyệt. Giá và tồn kho lấy từ công cụ tra cứu. Không tự hứa ưu đãi.',maxBudget:'300000',provider:'OpenAI-compatible',humanWhenUnknown:true},
    channel:{connected:true,page:'Trang Facebook mẫu · Studio',health:'ok'},providers:[{id:'ai1',name:'Kết nối AI mẫu',adapter:'OpenAI-compatible',model:'demo-model',enabled:true}],
    reviews:[{id:'kr1',title:'Bổ sung điều kiện đổi size',content:'Khách hỏi đổi size nhưng nguồn kiến thức chưa được duyệt. Cần chủ shop cung cấp chính sách.',status:'pending',source:'Hội thoại Minh (mẫu)'}],
    jobs:[],audit:[{id:'a1',action:'Nạp bộ dữ liệu mô phỏng',detail:'Không truy cập dịch vụ bên ngoài',date:'2026-09-29 14:19'}],
    team:[{id:'u1',name:'Jokertrader',role:'Chủ shop'},{id:'u2',name:'Nhân viên mẫu',role:'Nhân viên'},{id:'u3',name:'Kế toán mẫu',role:'Kế toán'}],
    privacy:{retention:'90',note:'Đề xuất demo, chưa phải chính sách pháp lý đã được duyệt.'}
  };
  const b=structuredClone(base);
  b.products=[{...structuredClone(products[0]),id:'pb1',name:'Áo mẫu B — khác shop',price:'250000',onHand:4,reserved:0}];
  b.customers=[{id:'cb1',name:'Khách B (mẫu)',phone:'Chưa cung cấp',tag:'Khách mới',note:''}];
  b.orders=[];b.conversations=[];b.expenses=[];b.movements=[];b.reviews=[];b.channel.connected=false;b.channel.page='Trang Facebook mẫu B';
  return {activeShop:'shop_demo_a',role:'owner',counter:1100,shops:{
    shop_demo_a:{id:'shop_demo_a',name:'Shop Mẫu A',subtitle:'Không gian bán hàng',currency:'VND',timezone:'Asia/Vientiane',...base},
    shop_demo_b:{id:'shop_demo_b',name:'Shop Mẫu B',subtitle:'Dữ liệu độc lập',currency:'VND',timezone:'Asia/Vientiane',...b}
  }};
};
