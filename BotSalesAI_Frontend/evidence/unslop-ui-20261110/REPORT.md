# Tinh chỉnh UI unslop — 10/11/2026

Phạm vi: React frontend, nguồn và demo MSW tổng hợp; không thay palette Graphite Gold, canonical tokens/contracts, backend hoặc tracker toàn sản phẩm. Kiểm thử tự động trên bản cuối: **ĐẠT**. Paired acceptance toàn UI vẫn **NOT_VERIFIED** do thiếu baseline trước sửa; S17 giữ IN_PROGRESS cho phần mở này.

## Hợp đồng và baseline

[Contract](CONTRACT.md) ghi owner, tác động và giới hạn. Ảnh baseline được chụp bằng Chrome ở lượt audit trước sửa (desktop 1440×900: R04, R06, R09, R11, R15, R20, R51; mobile 390×844: R04). Fingerprint trước sửa trong [baseline](baseline-hashes.json), ảnh ở `before/`. Ảnh sau ở `after/`; riêng 320px không có ảnh trước. Baseline chưa bao phủ mọi route, trạng thái, dialog và native zoom, do đó paired acceptance toàn UI là NOT_VERIFIED.

## UI và architecture

- Điều hướng: chọn mục sâu nhất theo ranh giới URL, có `aria-current` và nav landmark trong cả drawer desktop/mobile; menu vẫn lọc theo quyền hiện có. Icon MUI cùng kích thước được ánh xạ theo nghiệp vụ, nhãn nhóm dùng sentence case.
- Typography: theme chọn semibold từ token hiện có cho heading h4/h5/h6, không thay bảng màu, token nguồn hay generator. Auth wordmark dùng semibold hiện có.
- Tổng quan: tiêu đề theo ngữ cảnh, bỏ icon KPI và avatar robot màu trang trí; giữ số, trạng thái, quyền, CTA và cảnh báo. Thẻ vai trò tự xuống một cột khi không đủ chiều rộng.
- Tồn kho: giữ nguồn và thời điểm số liệu; thay từ kỹ thuật bằng từ nghiệp vụ. Shared Stat giữ API, chỉ bỏ box icon rỗng khi consumer không truyền icon.
- ARCH: owner theme/layout/shared/module, permission/API và contract không đổi theo source/boundary checks. Không suy ra backend hoặc provider đã được kiểm chứng.

## Kiểm tra hiện có

- Chromium/Firefox `tests/ui-dashboard-layout.spec.ts tests/ui-unslop.spec.ts`: 18/18 PASS, [log](targeted-layout.log). Kiểm viewport 320–1920, selection, drawer, tiêu điểm, quyền CTA và geometry.
- Chromium/Firefox FE011.AC01: 2/2 PASS, [log](inventory-focused.log), giữ kiểm tra timestamp và số tồn.
- Demo Chrome, 61 route × 390/1440 CSS px: 122 observations, 0 route-error, page-error hoặc tràn ngang document, [chi tiết](route-scan.json). Đây là smoke, không phải mọi state/interaction. Lượt đầu [shared cache](route-scan-shared-cache.json) có bốn lỗi route khi hai Vite dùng chung cache; trace console cho thấy React bị nạp trùng. Lượt sau tách cache và chạy lại sạch.
- Snapshot trước lượt tiếp tục: layout, visual-token và composition scanners trên source lúc đó: PASS, lần lượt 95/94/93 files, 0 findings; layout dùng một exception đã có. Lượt [verify trước](verify-current.log) exit 0 trên snapshot source/test khi đó: generator, source/boundary, lint, typecheck, 117 domain checks, 258 unit tests, build và các cổng UI/evidence đều đạt. S17 validator PASS ở trạng thái IN_PROGRESS; không đồng nghĩa paired acceptance đạt. Lượt trước `verify-final.log` FAIL vì fingerprint S17 cũ, được giữ lại.
- Full E2E lượt đầu bị dừng sau khi FE011.AC01 còn assertion “snapshot”; đã cập nhật kiểm tra thời gian và retest hai engine. [Lượt đầy đủ](full-e2e-retry.log) kết thúc 1.101/1.126, 25 lỗi; không gọi PASS. Sau khi sửa test, [38 ca liên quan](retest-combined.log) đạt trên hai engine và [3 timeout Firefox](retest-timeouts.log) đạt khi chạy riêng. Đây là snapshot lịch sử, được thay thế cho kết luận tự động hiện hành bởi lượt đầy đủ bên dưới.

Screen-reader speech, kiểm tra thủ công toàn bộ state, owner UAT, hosted CI, backend/provider và production: NOT_RUN. Không đánh dấu acceptance hoặc tiến độ sản phẩm từ các kết quả này.



## Tiếp tục và kết quả tự động cuối — 10/11/2026

Hai lỗi thời điểm đo được xử lý trong test: dùng navigateDemoAndRead để tách ngân sách điều hướng/đọc API, và chờ computed opacity của dialog bằng 1 trước geometry/Axe. Giữ HTTP 200, toàn bộ quy tắc Axe, focus, scrolling, geometry và palette. Trace/lượt bị dừng sau lỗi trong continuation/ được giữ làm lịch sử; không coi các lượt đó PASS.

- [Khởi động demo lặp](continuation/preview-bootstrap-repeat.log): 12/12, hai engine, ba workers
- [Dialog thông báo lặp](continuation/dialog-settled-repeat.log): 12/12, hai engine, ba workers
- [Full E2E cuối](continuation/full-e2e-complete.log): 1126/1126 (563 Chromium +563 Firefox), preview runtime và ba workers; các test nguồn vẫn chọn dev theo cấu hình hiện có. [Native JSON](continuation/full-e2e-complete.json), [đối chiếu inventory](continuation/inventory-reconciliation.json) xác nhận đủ 1126 ca dự kiến, mỗi ca PASS đúng một lần, skipped/retry/flaky=0
- [Kiểm drift](continuation/full-result-audit.json): 306 source/input files không đổi trong lúc chạy
- [Bản build riêng](continuation/built-demo-final.log): 6/6, ba ca mỗi engine; 244 route/viewport observations (61×2 widths×2 engines), 0 layout issues và page errors; demo artifact SHA-256 c6bf0d50d6b9a15a736dba1caf4dbb16743750bdd9e058949efaba5782f2e8a2
- [Verify cuối](continuation/verify-final.log): exit 0 trên source/tests sau hai sửa readiness; đủ 12 bước, 258 unit tests, 117 domain/MSW checks, lint/typecheck, build và các cổng UI/evidence đều PASS. S17 validator PASS với trạng thái IN_PROGRESS

Baseline trước sửa còn thiếu ở 54 route nên paired visual verdict vẫn NOT_VERIFIED; không tạo lại ảnh rồi gọi đó là baseline đã chụp trước. Screen-reader speech, owner acceptance và hosted CI chưa được xác minh. Đây là kiểm chứng local frontend/MSW, không là backend/provider/production proof.

Áp dụng unslop của Damir Sokolovsky (@heydamir), CC BY 4.0.
