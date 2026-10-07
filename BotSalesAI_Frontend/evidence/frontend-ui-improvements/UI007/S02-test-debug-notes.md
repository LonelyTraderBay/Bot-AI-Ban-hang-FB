# UI007 test-debug notes — không phải kết quả nghiệm thu

Ngày 02/10/2026. Hai lượt kiểm đầu được giữ lại trong lịch sử thay vì xem là PASS:

1. Lượt đầu: `4 failed`. Injection được đặt trong page rồi điều hướng bằng `page.goto`, tạo document mới và khởi tạo lại module mock; failure/delay không còn ở instance mà MSW dùng. Đây là lỗi setup test, chưa chứng minh hành vi sản phẩm. Test được đổi sang điều hướng React Router trong cùng document sau khi cài fault theo operation.
2. Lượt hai: `3 passed, 1 failed`. Ba state/fault đã được kiểm đúng. Case retry 503 nhận được response 200 và danh sách đơn đã hiển thị; assertion sai vì text link là trạng thái đơn, còn mã đơn là nhãn DetailLine. Assertion sửa để kiểm mã đơn trong panel, không đổi code nghiệp vụ.
3. Lượt full E2E đầu: `166 passed, 1 failed` / 167. FE014.S03 cũ đợi combobox ngân sách ngay cả khi API trả 200 nhưng không có budget hợp lệ; UI007 nay hiển thị empty-state riêng và không render control chọn rỗng. Đây là regression trong assertion sản phẩm/test contract sau khi thay UX. Log gốc giữ tại [S05 initial E2E](S05-full-e2e-initial-attempt.log).
4. FE014.S03 được đồng bộ để đợi empty-state, xác nhận không có combobox, và xác nhận nút lưu bị khóa; targeted regression đạt 1/1 ở [S06](S06-fe014-budget-empty-regression.log).
5. Kết quả UI007 targeted: [S03](S03-targeted-acceptance.log) chạy 5/5 trên built React demo. Full E2E lần hai đang chờ.
