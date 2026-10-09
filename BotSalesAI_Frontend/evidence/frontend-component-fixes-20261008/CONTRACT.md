# Contract xử lý A01–A07

Phạm vi được người dùng duyệt ngày 08/10/2026: sửa các findings tại [audit trước sửa](../frontend-component-risk-audit-20261008/REPORT.md). Trạng thái/thứ tự duy nhất ở kế hoạch UI §16.6; file này ghi intent và evidence theo workflow chuẩn, không là tracker khác.

## Intent, owner và invariant

| Finding / thứ tự | Owner / affected consumers | Contract và phép kiểm |
|---|---|---|
| A01 / P2 đầu tiên | Orders DraftForm, R18 tạo và R19 chỉnh sửa | Field vẫn full width trên mobile; nút xóa có kích thước tự nhiên, không lấy chiều cao helper. Giữ dòng, số lượng, draft và validation; đo clean/error 320/768/1440 trên Chromium/Firefox. |
| A02 / P2 | ProductEditorPage R10/R11 | Tìm danh mục có hàng riêng; mặt trường danh mục và trạng thái cùng hàng/căn trên desktop, xếp cột trên mobile. Lookup metadata ở dưới trường danh mục; giữ Controller, paging, search, selected retention, conflict và quyền. |
| A03 / P2 | ImportsPage R13 | Nút Bỏ không bị stretch bởi TextField/helper; mobile vẫn full width theo intent action và desktop intrinsic height. Giữ mapping/upload/dry run. |
| A04 / P2 | Amount, 48 consumers trong audit; Stat/DetailLine/h4 và cells | Tiền Decimal hợp lệ dài tối đa 60 ký tự không mất precision hoặc bị clip ngoài table. Table tiền giữ chuỗi liền trong vùng scroll có tên. Sửa owner nhỏ nhất; đối chiếu toàn bộ consumers, long/negative/fraction/null và format unchanged. |
| A05 / P2 | Status, 68 consumers trong audit | Chip thụ động giữ height theo nhãn, không stretch theo đoạn bên cạnh; nhãn dài được wrap, không fixed height. Kiểm từng nhóm consumer và fixture dài. |
| A06 / P3 | Empty, 7 runtime consumers | Chuỗi không có khoảng trắng wrap trong vùng nội dung; marker và action vẫn dùng được. Đây là hardening cho đầu vào được API cho phép, chưa có lỗi seed thực. |
| A07 / P3 | Order DraftForm shipping address, demo/live branches R18/R19 | Giá trị đã khóa vẫn đọc được toàn bộ trên màn hình hẹp; không bật quyền sửa và không thay schema/API. Select đang chỉnh sửa giữ menu đầy đủ; readonly hiển thị text wrap có nhãn. |

Không thêm dependency, generic style override, fixed action height, Number conversion hoặc thay contract canonical. Baseline runtime trước edit: audit routes 432, states 204, select 16, fixtures 60, sourceDrift 0; baseline.json đối chiếu hash hiện tại trước first source edit. Sau mỗi nhóm chạy regression liên quan trước nhóm sau; gates cuối gồm full verify/E2E/build/demo và native zoom/text theo standard SPC-051. Không nhận local mock thành Backend, hosted CI, speech hoặc user acceptance.

## Mở rộng A07 từ lỗi tái hiện trên text-only 200%, trước edit

`native-text-only-200-current-components-native-r3-20261008.json` tái hiện payment đã khóa bị cắt: 280/258 px. `native-menu-before4.log` kiểm popup đã paint, selected text phải khớp control và đợi menu cũ đóng: nhãn sản phẩm chạy tới x=477,70 trong popup chỉ tới x=374. Đây là lỗi thật cùng pattern, thêm vào A07: payment readonly dùng FieldGroup + text wrap; theme sở hữu MenuItem whiteSpace normal/overflowWrap anywhere trên tất cả menu consumers, giữ minHeight token 44, chọn/bàn phím/disabled semantics. Source trước mở rộng được giữ trong `source-before-native-remediation/`. Collector chỉ nhận ellipsis của select enabled khi đã chứng minh selected option trong popup đọc đầy đủ; disabled select không có ngoại lệ. Các attempts trước4 lỗi collector được giữ, không dùng làm proof menu.
