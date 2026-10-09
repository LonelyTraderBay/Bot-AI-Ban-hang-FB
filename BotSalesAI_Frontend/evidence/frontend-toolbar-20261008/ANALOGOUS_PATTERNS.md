# Rà nguyên nhân Toolbar và các consumer

Discovery đọc JSX function owner, router page binding, canonical route manifest và metadata q của operation. [Baseline](baseline.json) ghi 22 call site, 23 route và 46 quan sát trước sửa tại 320/1440px. [Helper sở hữu](../../tests/design/toolbar-impact.mjs) dùng cùng mapping trong regression và dừng nếu consumer không có route/operation hợp lệ. Không suy tỷ lệ giao diện hoàn chỉnh từ số dòng hoặc số file.

## Kết luận theo owner

| Owner/pattern | Bằng chứng và xử lý |
|---|---|
| Shared Toolbar | `align-items: normal` ở flex row làm button stretch theo multiline extra. Căn giữa desktop tại shared owner; giữ chiều cao tự nhiên theo theme. Thêm slot filters hữu hạn ngoài search form. |
| Products | Status và lookup nhiều dòng cùng nằm trong extra. Giữ status inline, chuyển lookup sang FormFields/FieldGroup hàng phụ gồm hai cột bằng nhau; helper/count/retry thuộc field tương ứng. Giữ debounce, server pagination, selected retention và URL/cursor. |
| Inventory/Movements | Extra chứa form filter có apply/reset riêng nhưng bị bọc trong search form. Chuyển sang filters; regression kiểm Enter không submit q và apply/reset còn đúng. |
| Consumer khác | Không thay nghiệp vụ. Regression tự discovery đủ 23 route kiểm natural action height/capability/reflow ở 320/1440 trong hai engine. Các operation không nhận q không được tự thêm search; Inbox R06 ở mobile ẩn list pane được ghi N/A rõ ràng. |
| Multiline extra tương thích | Fixture render Toolbar công khai với extra cao, độc lập với Products; button vẫn tự nhiên. Unit kiểm cả nhánh không-q và form isolation cho filters. |
| Products header action trống | Axe thật báo `empty-table-header`. Bổ sung tên “Thao tác”; giữ kiểm axe không bỏ rule hoặc assertion. |
| Shell tên tài khoản | Native Firefox text-only 200% tái hiện text 337px trong box 71px do noWrap/overflow hidden. [Baseline Shell](shell-before.json) và source-before giữ hunk gốc. Cho tên wrap/overflowWrap; không thay auth/logout/token. Shell ảnh hưởng 51 route `/s/`, kiểm gutter/all-route và native trên source cuối. |
| Gate cũ | Kiểm semantic gap/gutter/overflow không bắt được cross-axis stretch. Thêm geometry + topology + behavior vào suite chính; trước sửa case thật FAIL (130,25px), sau sửa không chỉ dựa screenshot. |

Inventory source/import closure rà đủ 16 module tại [inventory hiện hành](inventory-current.json), với 0 file chưa phân loại và 0 unresolved runtime import. Bốn dynamic import mới thuộc fixture Toolbar được phân loại hữu hạn theo đúng file/target; chúng không được gọi là runtime import và không tự tạo bằng chứng đã render.

## Phạm vi và lịch sử

Source/token/schema canonical, lockfile/dependency và các module ngoài hunk đã xác nhận giữ nguyên. Shared catalog là mô tả API; policy duy nhất vẫn là FRONTEND_SPACING_STANDARD. Các lỗi F01–F09 và rà 16 module trước đó ở [báo cáo pattern gốc](../frontend-corrections-20261008/ANALOGOUS_PATTERNS.md), được kiểm lại bằng full suite, không chép thành một tracker khác.

Các lần FAIL/interrupted giữ trong log; targeted retest không được cộng vào full run để nhận PASS. Không cam kết loại bỏ mọi lỗi tương lai: invariant đã xác nhận được khóa trong unit và Chromium/Firefox regression hiện hành.
