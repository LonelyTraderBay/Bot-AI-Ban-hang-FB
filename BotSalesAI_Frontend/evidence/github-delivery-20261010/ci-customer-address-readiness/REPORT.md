# C05: chờ dữ liệu địa chỉ khách sẵn sàng

Trước sửa: HEAD56 b2770caab2cae0e4db83c3680a370f64c1390113. Run GitHub 38050319695 hoàn tất: Chromium 406 PASS/1 VS01 FAIL, Firefox 406 PASS/1 C05 FAIL. Audit/full verify/upload đều PASS; built demo SKIPPED vì E2E FAIL. Lỗi VS01 được xử lý trong commit 55–56 riêng.

Trace Firefox cho thấy assertion bảng địa chỉ trong 5000 ms bắt đầu lúc 3180690.935 và hết lúc 3185692.203; UI cuối vẫn có progressbar “Đang tải cửa hàng”. Trace chỉ ghi session/shop/events GET200; chưa có request khách hoặc địa chỉ. Bảng được kiểm trước khi luồng lấy địa chỉ bắt đầu. Nguyên nhân sâu khiến shop query/render chậm UNKNOWN; không quy toàn bộ lỗi cho tải module hay HTTP chậm.

Source chỉ sửa phần khởi tạo một ca C05: đăng ký exact GET /api/v2/shops/shop-demo/customers/c1/addresses trước goto, yêu cầu HTTP200, chờ loader route ẩn rồi kiểm bảng. Giữ phone bị che disabled/trống, tên địa chỉ, PATCH chỉ {label}, dialog đóng và option giao hàng của đúng khách trong đơn. App/mock/API/config/dependency/timeout/retry/ngưỡng và các ca khác không đổi. Contract được ghi trước source edit.

Kiểm chứng local:

- Source gốc CLI: 4/4 PASS (repeat2 trên hai engine); local nhanh không tái hiện lỗi hosted.
- Probe trì hoãn một module customer 6500 ms: gốc FAIL đúng bảng/5000 ms, candidate PASS toàn callback.
- Probe riêng trì hoãn một shop fetch response 6500 ms: gốc FAIL đúng bảng và không gửi PATCH, candidate PASS toàn callback với PATCH chỉ label. Hai probe giữ default15000/expect5000; đây là mô phỏng boundary, không xác định nguyên nhân sâu của hosted.
- Source cuối: 6/6 PASS (repeat3 Chromium/Firefox); composition41, layout86, validator11, full verify238 unit/S17 COMPLETE với275 fingerprint hiện tại.
- Discovery: 407 ca/69 tệp mỗi engine, tổng814; không bớt ca kiểm.

Raw hosted log/jobs/artifacts và trace zip/error-context/timeline cùng các probe gốc/candidate được lưu kèm SHA256 trong local-validation.json. Log được giữ đúng byte; không tái dựng kết quả. Historical evidence giữ nguyên theo revision đã ghi. Hosted trên SHA mới PENDING_AT_COMMIT; không ghi owner acceptance, native zoom, screen-reader, Backend hay production PASS.
