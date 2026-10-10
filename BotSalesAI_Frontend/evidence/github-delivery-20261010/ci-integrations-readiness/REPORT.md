# R29/R30: readiness trước kiểm heading và dialog tích hợp

Baseline HEAD58: 8b80b960a8f7baece3bc2a94ddff4a0c951018c6. Run 38056330563: Chromium SUCCESS với 407 E2E, 3 built demo và upload; Firefox lỗi heading “Kết nối Facebook” ở openRoute, trước mở dialog. Log/job/artifact/trace thật được lưu trước sửa tracked source.

Quan sát trực tiếp từ trace: Second viewport390: DOMContentLoaded completes and integrations module200 is recorded before heading deadline, but main remains route-loading and no new listChannels GET starts. Prior320px channel/AI dialogs completed. Heading asserted before route/data mount was ready.

Nguyên nhân sâu hơn: UNKNOWN: trace does not establish why lazy route/dependency/render settlement is delayed; not solely transfer time of integrations module.. Probe module-delay6500ms là mô phỏng boundary, không chứng minh thời gian tải module của hosted.

Source chỉ sửa helper openRoute dùng chung hai ca trong tests/ui-integrations-layout.spec.ts. Đăng ký đúng GET listChannels/listAIConnections trước goto domcontentloaded; AI đồng thời chờ getProviderCatalog. Yêu cầu HTTP 200, route loader ẩn rồi giữ heading assertion. Prefix /api/v2 và ba path đã đối chiếu canonical operations; URL route /s/ được chuyển sang API /shops/.

Giữ cả 5 chiều rộng route và 3 viewport dialog, mọi kiểm document/dialog bounds và width+1/height+1, kiểu password của API key. Không gửi thao tác ghi trong probe; không thay app/mock/API/config/dependency/timeout/retry/ngưỡng hoặc các fixture khác. Contract ghi trước source edit.

Local baseline gốc 8/8 PASS (2 ca, repeat 2 trên hai engine). Hai probe cả callback dialog trì hoãn đúng một module 6500 ms: navigation đầu và riêng navigation thứ ba tại viewport 390 px. Cả hai đều gốc FAIL đúng heading 5000 ms/candidate PASS đủ ba viewport và không có request ghi; source default 30000/expect 5000/test 180000 giữ nguyên. Final 12/12 PASS (2 ca, repeat 3 trên hai engine), composition 41/layout 86/validator 11, full verify 238 unit/S17 COMPLETE với 275 fingerprint. Discovery 407 ca trong 69 tệp mỗi engine, tổng 814 ca.

Raw logs/trace/error-context/timeline/probe cùng source, readonly và generated hashes được đóng trong local-validation.json. Snapshot lịch sử giữ nguyên theo revision đã ghi; hosted trên SHA mới PENDING_AT_COMMIT. Không ghi owner acceptance/native zoom/screen-reader/Backend/production PASS.
