# Đồng bộ navigation fixture Finance

Revision trước sửa: 8ddfd1d8b5597e92ea70a8823f1027413f0b3bc3. Run GitHub 38036173350 hoàn tất: Chromium 406 E2E và 3 built-demo PASS; Firefox 405 E2E PASS / 1 FAIL, built-demo SKIPPED. Audit, full verify và upload thành công cả hai. Không nhận toàn run là PASS. Raw logs, metadata, trace, error-context và timeline được giữ trong thư mục này. ZIP artifact Firefox 11664733738 đã đối chiếu SHA256 30a51369ae89129f6980801e0a3a7ed6d7e89bfe5fca50f12fe546838581f44a.

Hosted: call@25321 goto reconciliation?tab=cases kết thúc tại 1826561.084ms; call@25323 isVisible trả false tại 1826589.111ms; call@25325 goto debts-periods bắt đầu 1826590.823ms rồi không hoàn tất trước deadline 180 giây. Document cases vừa nạp mocks/browser và mocks/service; chưa có GET reconciliation-cases của document này hoàn tất trước navigation kế tiếp. Session xuất hiện sau đó với status -1. Không có native-dialog event trong phần trace trích. Đây là thiếu đồng bộ readiness của fixture trước khi quyết định nhánh và chuyển trang; không kết luận lỗi native draft guard hay thiếu tổng budget.

Local nguyên bản tái hiện cùng boundary: 3 PASS / 1 FAIL Firefox. call@82 goto cases kết thúc 37650.777ms; call@84 isVisible trả false 37670.068ms; call@86 goto debts-periods bắt đầu 37671.803ms khi boot chưa xong rồi bị giữ tới deadline. Trace hosted và local đầy đủ được giữ nguyên byte. timeline.json chỉ lọc raw call/resource records, không dựng lại DOM hoặc suy đoán nguyên nhân bên trong browser. baseline.md và contract.md giữ đúng nhận định tại thời điểm trước sửa.

Fixture cuối đăng ký GET exact /api/v2/shops/shop-demo/reconciliation-cases và /api/v2/shops/shop-demo/periods trước goto, yêu cầu HTTP 200 và mảng data, chờ heading chuẩn và số action khớp dữ liệu rồi mới quyết định nhánh. Dialog được đóng qua UI, xác nhận count 0 trước navigation kế tiếp. Giữ hai viewport 390x844 và 1280x900, bounds dialog, page overflow, HTTP-write rỗng và pageErrors rỗng. Không thay app, API/schema, mock, CSS, timeout, retry hoặc threshold.

Seed mặc định không có case đối soát và không có kỳ closed của shop-demo. Nhánh match/reopen có điều kiện vẫn được giữ; sáu lượt này không chứng minh geometry của hai dialog đó trên dataset mặc định. Không tạo dữ liệu giả hoặc nhận coverage vắng là đã chạy.

Sau sửa: targeted 6/6 PASS, ba lượt mỗi browser. Composition 41/41, layout 86/86 và validator 11/11 PASS; full npm run verify exit 0, gồm 238 unit test, lint/typecheck, domain/network, build và UI gates. S17 COMPLETE có 275 fingerprint và ba log record khớp. Discovery giữ 406 test / 69 file mỗi browser, tổng 812. local-validation.json ghi hash nguồn, generated và raw proof. Hosted trên SHA sau push: PENDING_AT_COMMIT.

Thứ tự: P1 sửa fixture Finance; P2 raw proof, gate, hash và báo cáo. Phạm vi Frontend/mock; không tái chứng nhận canonical FE receipts, owner acceptance, screen-reader speech, Backend hoặc production.
