# CI readiness — 24/10/2026

PR c92a6611/run 39987193070: Chromium 197/175/186 và Firefox 1/3 đều success; Firefox 2 có 174 PASS, 1 FAIL tại R60 stale owner. Không merge. Log giải mã giữ ở outputs/c92-pr-firefox-two-failed.log; context member đọc bằng ZIP byte range/CRC ở work/c92-ff2-context/context-74.md (không nhận là full archive).

Nguyên nhân xác minh: R60 ready thành công lúc 16:59:21 UTC ngày 23/10, stale walk tới R59 lúc 17:00:50. Ca chạy qua nửa đêm Asia/Ho_Chi_Minh. BalanceSheetPage mặc định atDate bằng ngày hiện tại của shop; context lỗi ghi 2026-10-24 và lỗi API không có dữ liệu cache. Test đã warm query của ngày 23, nhưng remount ngày 24 tạo query key mới. Đây là giả định thời gian sai của fixture, không phải lỗi retained-data của ứng dụng.

Sửa có phạm vi: cố định mốc bắt đầu đồng hồ browser vào giữa ngày bằng Playwright clock.install, vẫn cho Date/timer tiến triển; fastForward qua staleTime thay sleep 5.200ms. Giữ mọi route/role, yêu cầu stale copy và giới hạn API hiện có. Không dùng setFixedTime vì sẽ đóng băng Date.now, khiến query không qua staleTime. Nguồn: https://playwright.dev/docs/clock.

Lượt push b023 trước đó còn fail khác: loading sales đợi option Tải chậm hết 600.000ms. SessionProvider.refresh gỡ query shop/scope; MockTools chỉ thông báo vai trò đã áp dụng sau await refresh. Consumer chọn role rồi mở ngay fault selector có thể bị remount đóng menu. Hai consumer sẽ đợi thông báo áp dụng role và giá trị role hiện hành; click option có timeout 10 giây để lỗi thao tác không ăn toàn bộ ngân sách 10 phút của route matrix. Log nguyên bản ở outputs/b023-push-120497629928-failed.log. Lượt push đó cũng có cold Suspense R22 >15 giây; không tính PASS, raw log và full artifact 12515904797/hash/CRC được giữ riêng. C92 Firefox 3 đã qua cùng contract; chưa tuyên bố chữa nguyên nhân cold-load từ việc đổi timeout.

Local scoped/full verify và hosted SHA kế tiếp phải được kiểm lại trước merge. App source, API, schema và artifact build giữ nguyên; chỉ sửa test synchronization/clock fixture.

Local sau sửa: [4/4 Chromium/Firefox](readiness-owner-sales.log), gồm mọi route owner ready/stale và sales loading; 6,9 phút. [Full verify](readiness-verify.log) exit 0: 256 Vitest, 117 domain/network, type/lint/build và source/UI/evidence gates. S17 sau finalize: 77 check/72 coverage/308 fingerprint, chỉ refresh hai consumer test và owning script. Hosted CI mới vẫn phải hoàn tất trước merge.

[Các attempt FAIL](readiness-failed-attempts.zip) giữ đúng byte ba job log, hai CI snapshot và context c92; [manifest](readiness-failed-attempts.json) ghi hash từng member/archive, đọc lại cả sáu entry và CRC đạt. Không tính các lượt đó thành CI PASS và không nhận context trích riêng là full artifact.
