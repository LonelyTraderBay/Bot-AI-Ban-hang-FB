# Bổ sung CI theo browser — 10/10/2026

Baseline source/remote: 7fd39700da0f2af52ad137318f11c02fa85c05eb; GitHub run 38007318262, job 114078988776. Run đang thực thi, chưa có kết luận PASS/FAIL khi ghi baseline này.

Log trực tiếp tại khoảng 55 phút E2E vẫn ghi các sweep Chromium UI028.W28/W29/W30. Cấu hình Playwright dùng một worker, hai project Chromium và Firefox; job hiện giới hạn 75 phút và còn phải kiểm tra built demo. Vì vậy CI cần ngân sách theo từng browser thay vì ghép cả hai vào một job tuần tự.

Owner: workflow root và regression kiểm tra wiring trong Frontend. Thay đổi dự kiến: matrix Chromium/Firefox ở các runner độc lập, fail-fast=false, mỗi job giữ một worker; full E2E và built demo dùng cùng project matrix; artifact riêng theo browser và revision; timeout hữu hạn 120 phút theo job. Các test, assertion nghiệp vụ và nguồn UI giữ nguyên.

Consumer impact: tên check/artifact có browser. Main tại snapshot kiểm tra trước đó chưa bật branch protection; không tự thay đổi quyền hoặc required-check settings. Không đóng FE checkpoint hay ghi owner acceptance từ thay đổi CI.

Kiểm tra bắt buộc trước push: regression workflow, YAML structure, các gate S17 theo nguồn mới và toàn bộ npm run verify. Kết quả hosted chỉ báo theo run thực trên SHA sau push.

Khi đối chiếu discovery, lệnh Playwright --list còn thực thi các fixture node:test từ *.test.mjs do testMatch mặc định nhận cả hai loại test. Nguồn kiểm tra xác nhận mọi browser spec hiện hữu là *.spec.ts, còn *.test.mjs thuộc Node và được verify chạy riêng. Giới hạn testMatch vào *.spec.ts phải giữ nguyên 348 browser test/project; log discovery trước và sau được giữ để đối chiếu, không bỏ unit gate.

Discovery trước được dừng bằng Ctrl+C khi còn thực thi fixture Node; exit 1, không ghi là PASS. Discovery sau hoàn tất exit 0, 348 test trong 69 file ở từng browser.

Lượt verify local đầu sau matrix trả exit 1: sourceFingerprints của workflow bị stale do reporter=line được thêm trong lúc verify đang chạy. Validator bắt đúng thay đổi nguồn; log giữ nguyên ở verify-attempt-01-stale-workflow.log. Phải refresh bằng gate thật và chạy lại verify trên nguồn ổn định trước commit/push. Không hạ validator hoặc dùng lượt này làm bằng chứng PASS.

Run đầu kết thúc cancelled do giới hạn 75 phút. Artifact 11655735180 được kiểm SHA256 và giữ nguyên trace/error-context trong hosted-attempt-01; các lỗi bên dưới lấy từ trace của đúng source SHA baseline.

Contract UI trước sửa: owner MarketingReasonTick trong apps/web/src/modules/reports/index.tsx; consumer duy nhất là XAxis của marketing-loss-chart. Nhãn chia theo 8 ký tự chồng khoảng 5px trên Chromium ở viewport 320. Giữ tokens.fontSizes.body, tokens.fontFamily, colors.textSecondary và layoutSx.report.chartViewportInset; dùng Text có sẵn của Recharts để đo/wrap theo category band thật. Kiểm hai engine tại 1280 và 320: đủ toàn bộ nhãn, không chồng/cắt theo cả hai chiều, chữ >=14px, bảng dữ liệu đủ dòng, trang không overflow. Không thay theme/shared spacing hoặc thêm dependency. Panel regression kiểm mép child và margin ngoài theo SPC-014; padding nội bộ của Button không thuộc header boundary.

Các fixture cần đồng bộ với owner hiện hành: F01 giữ giao diện tiếng Việt nhưng xác minh locale API đã merge; privacy invalid phải disabled và không ghi; dataset status dùng thông báo đúng scope; import ngân hàng dùng resource đăng ký, preview/token rồi kết quả 200 theo OpenAPI; đóng draft trùng vận đơn phải xác nhận bỏ thay đổi; module Vite /@fs chuẩn hóa POSIX path. S05 phải kiểm source-only NOT_RUN mà không bịa browser PASS; nhánh có browser claims vẫn giữ các assertion về bằng chứng và coverage. Các route/feature/journey test thật vẫn được chạy trong full suite.

Lượt targeted-attempt-01 có 18 PASS / 6 FAIL: trạng thái dirty chưa deterministic ở fixture vận đơn; assertion import đặt nhầm 202 thay vì contract 200; source-only route matrix thiếu SC2-D06 tại approvals. Giữ nguyên log/trace. Sửa fixture tạo draft dirty thật trước đóng; sửa đúng response contract; sinh lại docs/route-implementation.json bằng generator --source-only để giữ NOT_RUN và đủ scenario canonical.
