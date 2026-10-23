# Tổng quan: thống nhất surface theo workflow canonical

Nguồn quy định duy nhất: docs/FRONTEND_SPACING_STANDARD.md §0, SPC-005/013/014/023/062/068/069/071–075. Đây là contract và bằng chứng của một lượt sửa, không là rule set hay ledger mới.

## Phạm vi và intent

Giúp owner đọc KPI, số liệu tài chính, đơn gần đây và trạng thái AI rõ ràng trên desktop/mobile. Giữ API, permission, seed, navigation, copy feedback, bot confirmation và toàn bộ tracker FE/full-product. Không ghi owner acceptance. Baseline từ lượt audit cùng SHA được kiểm lại hash trước source edit; ảnh before được giữ kèm.

## Invariants / owner

- Panel KPI sở hữu inset ngang/bottom compact12/16; Stats trong Panel không có margin cuối, gap giữa KPI vẫn16. Stats đứng độc lập giữ afterGap section16 mặc định để tương thích.
- Metric value slot dùng flex và min-height theo dòng typography h4 chuẩn; không cắt text hay khóa height. Số và Status cùng ranh giới note ở seed, vẫn grow khi giá trị dài.
- Panel/Stat/compactOutlined dùng radius.card12; hero vẫn radius.hero32; CTA hero dùng control8. Không sửa giá trị token chung.
- Finance giữ một page track đã có test, bên trong dùng SectionGrid content rhythm12: mobile1/desktop2 số liệu; ActionGroup giữ link theo chiều rộng nội dung.
- Order ID là một link duy nhất; CopyableCode có showValue=false để giữ copy/rejection/live feedback tại owner, accessible name gồm ID khi chỉ có icon.
- SPC-013 phân biệt compact12/16 và comfortable16/24; catalog và finite API checker cập nhật cùng source.

## Impact / xác minh

Stats/Stat: dashboard, operations, finance reports/management, marketing report. CompactOutlined: dashboard AI, financial line editors và DraftConflict. CopyableCode giữ mặc định có value cho tất cả consumer cũ. Khóa finite afterGap tại checker, giữ cả positive/negative fixture; chạy source/type/build/unit và regression browser liên quan trên Chromium/Firefox. Kiểm loaded UI và hình học tại320/390/768/1280/1920; copy, navigation, permission và draft-conflict theo impact. Kiểm cảnh nhỏ/lớn cho affected routes, long content và native zoom/text bằng công cụ khả dụng; phần thiếu phải ghi riêng.

## Bàn giao

Chỉ ghi READY_FOR_ACCEPTANCE_LOCAL_SCOPE cho phần đủ bằng chứng; frontend/MSW không thay backend/provider/production hoặc owner nghiệm thu. S17 refresh qua log/exit/hash thực; giữ nguyên prefix các record lịch sử và không biến kết quả cũ thành proof cho source mới.

Kiểm UI mobile phát hiện status trong nhóm điều khiển bị stretch thành thanh ngang. Giữ ActionGroup row/wrap theo owner, align center để tag và button theo kích thước nội dung; target44 vẫn giữ từ theme. Regression geometry đo tag nhỏ hơn nửa panel và target button≥44.
