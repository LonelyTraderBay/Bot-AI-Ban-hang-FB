# Baseline điều tra navigation dialog tài chính

SHA trước sửa 8ddfd1d8b5597e92ea70a8823f1027413f0b3bc3; run 38036173350, Firefox job 114166937338 ghi page.goto: Test timeout of 180000ms exceeded ở ca tổng hợp Finance report, entry, journal, reconciliation and period dialogs. Source hiện gộp hai viewport 390x844/1280x900 với nhiều navigation/dialog trong một deadline; một số dialog còn mở khi chuyển trang. Chưa kết luận nguyên nhân cho tới trace hosted.

Owner: tests/ui-finance-layout.spec.ts. Giữ đủ viewport/flow, HTTP-write=0, pageErrors=[], bounds dialog và overflow. Không đổi app/API/schema/mock/style/timeout/retry hoặc bỏ assertion để che lỗi. Đang chạy nguyên bản local và chờ artifact/trace. Phạm vi Frontend/mock, không tăng acceptance.

