# Contract trước sửa fixture Finance

Local nguyên bản 4 lượt: 3 PASS / 1 FAIL Firefox. Trace call@82 goto cases kết thúc rồi call@84 isVisible trả về false; call@86 goto debts-periods bắt đầu 37671.803ms khi document cases còn nạp mocks/browser/service và session chưa hoàn tất. Navigation bị giữ cho tới deadline chung. Không phải budget tiêu hết bởi phép đo: cả chuỗi trước navigation chỉ khoảng 8 giây trong page context. Không thấy dialog native trong trace đã trích; chưa suy đoán lỗi native draft guard.

Bước sửa: đăng ký GET exact reconciliation-cases và periods trước goto, phải HTTP 200; chờ heading chuẩn, số action khớp danh sách API rồi mới quyết định nhánh có dữ liệu. Không coi phần tử chưa render là nhánh không có dữ liệu. Seed hiện mặc định không có case đối soát và chỉ có kỳ open của shop-demo; các nhánh match/reopen tùy dữ liệu vẫn giữ nguyên và báo đúng phạm vi. Đóng dialog qua UI và xác nhận count 0 trước chuyển trang. Không thay app/MSW, threshold, timeout/retry hay giới hạn HTTP-write/pageErrors/layout.

