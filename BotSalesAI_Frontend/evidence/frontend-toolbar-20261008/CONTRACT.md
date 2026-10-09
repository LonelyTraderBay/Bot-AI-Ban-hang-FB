# S10/S11/S12/S15–S20 — sửa Toolbar

Yêu cầu 08/10: phân tích và sửa nguyên nhân Products lệch bố cục; giữ mọi thay đổi đã có. Công việc và trạng thái chỉ ở kế hoạch UI §16.6. Phạm vi React/MSW local, không Backend/provider/production.

## Intent, nguyên nhân và invariant

Người dùng tìm tên/SKU, lọc trạng thái và tìm/chọn danh mục trên toàn cửa hàng. q gửi khi submit; status/categoryId áp dụng ngay theo URL; lookup danh mục có debounce, phân trang, selected item retention và retry riêng. Không đổi hành vi này.

Toolbar hiện dùng flex row với align-items normal: extra cao nhiều dòng làm các sibling tự stretch. Products nhét status + category search/helper/select/load-more/error vào extra; nút submit cao theo toàn nhóm. Shared gap đúng token vẫn không chứng minh alignment/height đúng. Browser gate cũ chỉ kiểm gutter/inset/overflow hoặc gap, thiếu invariant này.

Sửa owner hiện có: Toolbar giữ inset/gap; hàng search căn control theo trục giữa tại desktop, full width tại mobile; button giữ chiều cao nội dung/theme, không đặt height cố định. extra tương thích, dành cho control trên hàng search; thêm slot hữu hạn filters cho nội dung phụ ở hàng riêng, ngoài native search form. Không mở generic sx/style hoặc nhận business/query state.

Products: status ở hàng search. Hàng phụ: tìm danh mục và chọn danh mục cạnh nhau khi đủ rộng; helper/count/load-more/error nằm dưới field liên quan. FormFields/FieldGroup giữ gap và boundary. Inventory/Movements chuyển bộ lọc có apply/reset riêng vào filters, không bị search form submit khi Enter trong bộ lọc. Giữ URL/cursor/IME/focus và behavior apply/reset.

Không ép field helper và button có cùng outer height; không chặn text wrap tại zoom. Invariant: search button không stretch theo multiline filter/extra; primary controls căn giữa cùng hàng khi đủ rộng; phụ không chèn vào primary; nội dung không overflow document 320px; focus/hit targets và tên truy cập còn đủ.

## Impact và kiểm chứng

Discovery từ JSX function owner → router pages → canonical manifest → operation metadata, kiểm mọi consumer có mapping; baseline source/render trước edit, đúng main h1 và loading kết thúc. Input không đổi được giữ KEEP_VERIFY; generated/token/schema giữ GENERATE_VERIFY bằng generator. Shared Toolbar/catalog và Products/Inventory consumer EDIT_VERIFY; regression/helper/evidence là TOOLING_VERIFY; lịch sử/full-product REFERENCE_READONLY; pinned dependencies THIRD_PARTY_VERIFY.

Regression trước sửa phải bắt geometry sai; sau sửa kiểm mọi affected route ở 320/1440, các branch không-q có N/A đúng metadata, Products lookup empty/more/busy/retry/retained selection và filter behavior, generic multiline extra, keyboard/axe; native browser zoom và text-only 200% là phép thử riêng. Source/build/verify strict, browser evidence theo workflow hiện hành, không hạ assertion. Scope final phải reconcile với diff/hashes và báo tracker/evidence stale trung thực khi chưa tái xác minh.

Giải pháp nhỏ hơn (chỉ align-items) bỏ stretch nhưng vẫn để primary nằm chung nhóm lookup dài và lệch hierarchy; slot filters là thêm API hữu hạn cho ba consumer thật. Không dependency mới, không token/schema/theme numeric change. Rollback đúng các hunk mới dựa source baseline; không reset checkout.

## Finding bổ sung qua gate thật

Axe phát hiện header action của Products trống: đổi nhãn thành “Thao tác”, giữ assertion không loại best-practice để che FAIL. Native Firefox text-only 200% tại 1280 đo tên account sidebar 337px text trong box 71px, overflow hidden do noWrap. `shell-before.json`, source-before Shell và screenshot native attempt1 là baseline trước đúng hunk này. Shell cho tên wrap/overflowWrap thay vì cắt chữ; không thay token/inset, auth/logout. Impact mở rộng các route `/s/` dùng Shell; full route smoke/reflow/gutters và native account/toolbar phải kiểm trên source cuối. Không quy lỗi này cho Toolbar và không loại target cắt chữ khỏi phép đo.
