# Bàn giao local trước push — 10/10/2026

Nguồn: repository Bot-AI-Ban-hang-FB, nhánh main, baseline remote 53c0ba8f413b1f1e0fa16a747ed27f728b861dd6. Người dùng yêu cầu commit toàn bộ thay đổi thành các nhóm nhỏ theo thứ tự, ghi chú tiếng Việt và kiểm tra GitHub đầy đủ.

## Kết quả kiểm tra local

| Kiểm tra | Kết quả |
|---|---|
| npm audit --audit-level=low | 0 lỗ hổng |
| npm run verify | Exit 0; generator 15 outputs / 346 schemas / 245 operations / 61 routes; lint/typecheck/build/source/boundaries PASS |
| Domain / network và unit | 117 kiểm tra domain/network; 238 unit test PASS |
| Layout / composition / evidence | 86 layout fixtures; 41 composition/shared fixtures; 11 validator fixtures; 275 source fingerprints PASS |
| Contract / kit / tracker | JSON/YAML tương đương, 346 schema; 532/532 kit checks; 26/26 tracker tests PASS |
| Khóa kỳ kế toán | 6/6; chạy lặp ba lần ở từng browser Chromium và Firefox |
| Built demo | 6/6; 61 route × hai viewport × hai browser, không page error hoặc shell overflow trong các case này |
| Full browser suite local | Attempt 01 phát hiện 696 test; dừng sau lỗi fixture để sửa; không ghi attempt này là PASS |
| Full browser suite hosted | PENDING_AT_COMMIT: workflow sẽ chạy lại toàn bộ trên checkout GitHub sạch; trạng thái cuối đối chiếu theo đúng SHA sau push |

Log thật và SHA-256 nằm trong [local-proof-hashes.json](local-proof-hashes.json). Báo cáo này được chuẩn bị trước push; hosted CI được báo theo run thực ở kết quả bàn giao sau push, không điền PASS từ local hoặc cấu hình.

## Nguyên nhân và thay đổi cần cho bàn giao

- Actions trước đó (run 37589718906, job 112688038980) thiếu executable Chromium khi verify chạy browser audit. Workflow hiện cài cả hai browser trước verify, chạy mọi push/PR, thêm hồi quy built-demo và giữ artifact test-results của cả hai suite. Timeout job 75 phút bao phủ suite mở rộng và bản build; timeout/assertion nghiệp vụ vẫn có giới hạn.
- Hash evidence/source phụ thuộc byte thực. Git attributes giữ nguyên LF/CRLF khi stage/checkout; whitespace check vẫn phát hiện khoảng trắng cuối dòng và dòng trống cuối file, đồng thời nhận CR của CRLF hợp lệ.
- Fixture FE015 gửi opening-balances trước khi đổi dataset hoàn tất, gây 409. Test chờ feedback hoàn tất reset. Lần lặp Firefox còn thao tác trước khi React render; fixture chờ navigation sẵn sàng bằng action wait có giới hạn, giữ nguyên assertion nghiệp vụ. Các lần thất bại và trace được bảo toàn cạnh log cuối.
- Bản ghi frontend-progress.json.91084.tmp từ lượt ghi dở được giữ nguyên byte ở recovery/ cùng provenance; không dùng thay ledger canonical.

## Thứ tự commit

Mỗi nhóm có subject/body tiếng Việt, Conventional Commit, P0/P1/P2 và Signed-off-by. Commit được giữ riêng theo owner và dependency, không gom toàn repository thành một commit.

| Thứ tự | SHA | Nội dung | Số tệp |
|---|---|---|---|
| 1 | 0d9fad21 | fix(ci): [P0] Cài browser trước verify và bảo toàn hash đa nền tảng | 2 |
| 2 | 75660211 | feat(contracts): [P0] Đồng bộ API 2.6 và tài nguyên nghiệp vụ chuẩn | 22 |
| 3 | c7e6ed88 | fix(api): [P0] Hủy lệnh theo scope và bảo vệ bản nháp có phiên bản | 17 |
| 4 | 3d520a53 | fix(ui): [P1] Chuẩn hóa shared UI, label, spacing và xác nhận thao tác | 16 |
| 5 | c742703a | feat(mock): [P1] Hoàn thiện dịch vụ mô phỏng và invariant nghiệp vụ | 27 |
| 6 | 2bbf81c9 | feat(finance): [P1] Hoàn thiện tài khoản, sổ quản trị và nhập sao kê | 8 |
| 7 | bbcd5bc7 | feat(commerce): [P1] Bổ sung tài nguyên khách hàng, kho và luồng mua bán | 22 |
| 8 | ec1327be | feat(frontend): [P1] Hoàn thiện inbox media, quyền riêng tư và báo cáo | 10 |
| 9 | 91009ad4 | fix(app): [P1] Đồng bộ điều hướng, chặn mất bản nháp và khởi động demo | 9 |
| 10 | 667cbb1c | test(frontend): [P1] Mở rộng hồi quy browser, session và bố cục | 70 |
| 11 | fe03554f | fix(tracker): [P1] Kiểm chứng receipt theo đúng owner Frontend và kit | 3 |
| 12 | 597f9025 | test(finance): [P1] Chờ ứng dụng sẵn sàng trước thao tác fixture | 1 |
| 13 | e559a172 | docs(project): [P2] Đồng bộ đặc tả, quy trình UI và trạng thái nguồn | 75 |
| 14 | cd305d29 | chore(evidence): [P2] Lưu ledger và bằng chứng checkpoint Frontend | 3851 |
| 15 | 439ccf9d | chore(evidence): [P2] Lưu audit và hồi quy component, toolbar | 1373 |
| 16 | 01452baf | chore(evidence): [P2] Lưu kiểm chứng hợp nhất shared UI | 4713 |
| 17 | a047f24d | chore(evidence): [P2] Lưu kiểm chứng UX và nguyên nhân lỗi chiều rộng | 1066 |
| 18 | 7a4f033e | chore(evidence): [P2] Lưu kiểm chứng spacing và mật độ giao diện | 1187 |
| 19 | 3196fa67 | chore(evidence): [P2] Bổ sung snapshot hồi quy và tài liệu UI | 1412 |
| 20 | Commit chứa báo cáo này | chore(evidence): [P2] Ghi kết quả kiểm tra bàn giao GitHub hiện hành | 41 |

SHA của commit chứa chính báo cáo này và SHA remote cuối được đối chiếu từ Git sau commit/push; không ghi SHA tự tham chiếu vào nội dung đã hash.

## Giới hạn đúng phạm vi

Frontend và API mock tổng hợp; không xác minh Backend/provider/production, screen-reader speech hoặc user acceptance. Branch main hiện chưa bật branch protection theo API đã đọc; workflow PASS không tự tạo required-check enforcement.

FE CLI tại snapshot báo 0/140 checkpoint hiệu lực, 28 task STALE, 0 task BLOCKED. Receipt lịch sử giữ nguyên; báo cáo sinh phản ánh trạng thái hiệu lực, không tự tái chứng nhận checkpoint từ một lượt verify. Các số liệu density 624/181/140 trong hồ sơ trước thuộc snapshot lịch sử đó.
