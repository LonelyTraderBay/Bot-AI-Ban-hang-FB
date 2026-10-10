# Đối chiếu ảnh baseline và probe trước sửa source

Source Orders vẫn nguyên byte HEAD60 khi đối chiếu. Đã xem baseline-loaded-390.png và baseline-loaded-1280.png của probe-final: đúng đơn DH-1001, phiên bản 1, hàng AO-002, tổng 249.000đ, dữ liệu demo tổng hợp và các action hiện đầy đủ.

Đã xem data-original.png: trang có heading Đơn DH-1001, phần nội dung QueryState đang hiện Đang tải dữ liệu và không có phiên bản. Đã xem lazy-original.png: main còn route loading, chưa có nội dung chi tiết đơn. Đây là ảnh của probe có trì hoãn kiểm soát 6500ms; không dùng chúng làm ảnh hoặc thời gian tải của GitHub.

Probe-final giữ original assertion 5000ms, default locator 30000ms, source test 180000ms. Cả hai negative fixture lỗi đúng Phiên bản 1; candidate hoàn thành toàn bộ callback với duy nhất một POST quote. Baseline Firefox và toàn callback nominal PASS; baseline CLI gốc 8/8 PASS. Ảnh không thay full gates hoặc hosted trace, và không chứng nhận owner acceptance, native zoom hay screen reader.

Lượt harness01/02 FAIL được giữ riêng cùng log, exit và giải thích; không nhận chúng là PASS. Tracked source chưa sửa khi ghi bản đối chiếu này.
