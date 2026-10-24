# Tối ưu CI cho một maintainer — 24/10/2026

Baseline: main `c5e7803ea997619090db0f82db048fcd8ff32b06`, working tree sạch trước tác vụ.
Đo từ log hosted CI cuối của đúng SHA: Firefox ba shard 19,1 / 60,5 / 55,2 phút;
Chromium 22,3 / 48,4 / 39,2 phút. Span theo test start bao gồm hook/navigation/teardown,
không phải thời gian CPU riêng của assertion. 558 E2E mỗi engine và 6 built-demo.
Nguồn log/raw profile được giữ tại workspace consolidate-main-20261023-200028, outputs/ci-speed-v2.

Contract/owner/consumer impact trước source edit:

- Owner: frontend test harness, workflow frontend và repository success gate; không đổi UI/API/kit/backend.
- Giữ mọi bài hiện có, Chrome/Firefox, full verify/audit/S17, failure propagation và 9 required contexts.
- Cân ba partition bằng thời gian đo; giữ nguyên file làm đơn vị, chỉ chia 14 test role-state
  đã dùng page fixture riêng. Dùng discovery hiện tại; test mới tự được đưa vào, không dùng allowlist coverage.
- Thử hai worker mỗi runner CI. Giữ local mặc định một worker; không bật fullyParallel toàn suite.
- Tái sử dụng một Vite process do global setup sở hữu trong cùng run. Mock DB/role thuộc từng trang,
  không thuộc Vite process. Server có cacheIsolationKey và live mode vẫn có vòng đời/cache riêng.
- Build live/demo một lần ở verify và truyền artifact bất biến trong cùng run/attempt cho browser jobs.
  Không lấy artifact của revision/run trước. Test local qua npm run test:e2e vẫn tự build như cũ.
- Gate tổng vẫn kiểm từng matrix child completed/success; skipped/neutral/thiếu job không được qua.

Kiểm chứng cần có: partition phủ discovery chính xác một lần; fixture reuse/close/isolation;
full verify; browser matrix trên hosted runner với hai worker; closing CI trên SHA main.
Nếu hai worker gây resource/fixture contention phải sửa nguyên nhân hoặc quay về một worker,
không tăng retry/timeout hay hạ assertion để làm xanh. Tại thời điểm lập contract trước source edit,
chưa có kết quả hosted cho thay đổi này; kết quả cuối được đối chiếu theo SHA/run khi bàn giao.

Kiểm chứng local trước PR: 16 planner/cache/run-isolation regression, 76 repository/gate regression,
12 lifecycle/cache/Service Worker trên Chrome và Firefox với hai worker đều PASS. Hai ma trận
loading owner/manager cùng hoàn thành trong 237,8 giây; một ma trận owner baseline mất gần 4 phút.
Đây là phép thử concurrency cục bộ, chưa phải mức giảm thời gian toàn CI. Native JSON reporter
cũng được kiểm tra khớp ID discovery và một kết quả passed cho test thực.

Consumer wiring `tests/ui-shared-api-contract.test.mjs` được cập nhật theo driver mới: giữ cài
engine trước E2E, đủ ba partition mỗi engine, built-demo một lần, fail-fast của từng job, một worker
local/tối đa hai worker CI, không fullyParallel toàn suite và kiểm inventory/result đầy đủ. Lượt
verify đầu phát hiện consumer còn đòi câu lệnh shard cũ; log FAIL giữ trong workspace, không dùng
làm bằng chứng PASS. Log verify trong thư mục này phải là lượt thành công sau khi cập nhật consumer.

Mỗi partition lưu native JSON report và plan gồm mọi ID. `ci-timings.json` chỉ là số đo lịch sử
để xếp lịch; khi thời gian lệch lại, cập nhật trọng số từ report thực rồi chạy regression discovery.
Không xóa test khỏi discovery để cân tải. Thời gian và tổng phút chạy job phải so từ cùng workflow,
bao gồm setup/build/upload; không coi ước tính trọng số là thời gian CI đã đạt.

Hosted run đầu 40053375818 trên commit 90b25da8 dừng ở audit: fast-uri 3.1.8 (dependency của Ajv
8.20.0, range ^3.0.1) có bốn advisory; các matrix browser bị skipped và gate không được qua.
Phạm vi bổ sung trước khi sửa lockfile: cập nhật duy nhất fast-uri lên bản vá tương thích 3.1.9,
giữ nguyên Ajv và mọi dependency khác. Owner là lockfile; consumer là Ajv/schema generation và
validation trong app, domain tests và browser suite. Không thay ngưỡng audit hoặc bỏ kiểm tra.
Các log local cũ được giữ theo lockfile trong header; cần audit/full verify và hosted CI mới trên
lockfile đã vá trước khi merge. Nguồn bản vá: GitHub advisories GHSA-w74x-v6f9-j3xg,
GHSA-xhq7-xmqj-769h, GHSA-wjr9-j795-jxcr và GHSA-333x-w4r6-6crp; cả bốn chỉ rõ 3.1.9.
