# Contract trước sửa source

HEAD trước sửa: `198feb4734215131c86d280aca17c54bb2dac84c`. Snapshot source gốc lấy tại HEAD50 vẫn khớp nguyên byte với HEAD52. CLI gốc: 4/4 PASS trên Chromium/Firefox, repeat2. Probe trì hoãn đúng một request module6500ms trên Chromium: callback VS02 gốc FAIL tại heading5000ms; candidate PASS toàn bộ callback, gồm approval, supplier, receipt, stock+2 và payable200000. Delay chỉ ở harness; timeout source180000ms giữ nguyên.

Hosted trace cho thấy heading bắt đầu4682508.392ms và hết hạn4687516.728ms, main vẫn `Đang tải màn hình`. Module procurement đã trả200 ở4683328.315ms; request purchase-orders đầu bị hủy, GET200 kế tiếp bắt đầu4688497.051ms sau deadline. Vì vậy bằng chứng xác định test đọc heading trước khi route hoàn tất loading; chưa xác định nguyên nhân sâu của vòng đời Suspense/query. Không quy toàn bộ thời gian cho tải module.

Thay đổi duy nhất VS02: đăng ký exact GET purchase-orders trước goto; kiểm200; chờ progressbar route loading ẩn rồi giữ nguyên heading và toàn bộ HTTP/domain/identity assertions. Không đổi gotoDemo chung, các ca FE022 khác, app/mock/API/dependency, timeout/retry/ngưỡng. Probe có kiểm soát không thay thế nghiệm thu hosted; bằng chứng Frontend/mock không chứng nhận Backend/production.
