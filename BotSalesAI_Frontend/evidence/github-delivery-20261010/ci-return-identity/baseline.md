# Baseline identity/refetch fixture kiểm nhận hàng trả

Revision trước sửa: 46d30b0b21cb477494ff9339f8365e29dbc56ce1. Run 38044074123 Firefox job 114189949532 ghi F01 analogous return-inspection draft does not adopt a refetched version without comparison FAIL tại nút Áp dụng vào bản nháp trong dialog Đối chiếu thay đổi: element not found, timeout 5000ms. Chưa có trace hosted để kết luận cuối.

Owner: tests/frontend-corrections.spec.ts, ca F01 return-inspection. Source đã đọc ReturnsPage, useVersionedDraft, DraftConflict, mock create/inspect và seed. Fixture tạo một return rồi click Kiểm nhận.first(); seed đầu seed-returncase-10036 đang received/enabled. mutate()/pulse() chỉ chờ mutation HTTP, không chờ list/detail refetch. Giả thuyết: lựa chọn theo vị trí có thể mở return seed trước list refetch, trong khi concurrent mutation tác động created ID; hoặc confirm chạy trước detail version mới được quan sát. Cần controlled probe và trace hosted để phân biệt.

Giữ invariant: đúng created resource ID, frozen baseline, local inspection reason, conflict phải yêu cầu chọn, áp dụng chỉ cập nhật draft, final POST expectedVersion+1 và đúng return ID. Không đổi app/model/API/schema/mock seed/timeout/retry/threshold. Phạm vi Frontend/mock; sẽ giữ nguyên bản local, raw controlled PASS/FAIL và trace trước Source edit/report.
