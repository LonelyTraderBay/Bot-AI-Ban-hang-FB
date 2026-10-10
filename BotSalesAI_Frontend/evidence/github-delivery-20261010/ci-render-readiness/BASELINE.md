# Baseline trước sửa readiness của fixture

Revision đã push: ad103f6765aadf312ac85ef1082823bedec25176. Hosted run 38020914430 còn đang chạy tại lúc ghi baseline. Chromium job 114121537888 báo chartSvg=null tại ui028-w25-reports-layout.spec.ts:105. Firefox job 114121538100 báo không thấy heading Chính sách đổi hàng tại ui-knowledge-layout.spec.ts:67. Không coi hai job là PASS; trace hosted chưa tải được khi job chưa upload artifact.

Reports local giữ nguyên test, chạy ba lượt mỗi browser: 1 FAIL / 5 PASS. Lỗi local là Marketing chart viewport is missing, khác assertion chartSvg=null của hosted. Trace local ở playwright-46792-a9e17652-5adb-45f9-9cb7-b9a93421bf07 ghi viewport 768: wrapper/table đã visible, sau đó query chuyển từ URL implicit sang fromDate=2026-08-31,toDate=2026-09-29,bucket=day; GET canonical bắt đầu 41832.410ms, hoàn tất khoảng 41841.710ms. Phép đo bắt đầu 41820.987ms trong chuyển tiếp; snapshot 41820.580ms và 41833.468ms không có chart. Snapshot 41858.944ms có lại wrapper nhưng chưa có SVG. Vị trí thời gian lấy từ trace local, không gán cho hosted.

Source MarketingPage chuẩn hóa URL từ period của API; query key implicit và canonical khác nhau. ResponsiveContainer tiếp tục cần render SVG sau khi container có kích thước. Fixture trước chỉ chờ wrapper và table, chưa chờ GET canonical/SVG. Contract phép đo: dữ liệu của bộ lọc chuẩn phải hoàn tất, SVG và nhãn render rồi mới đọc geometry. Owner thay đổi dự kiến chỉ tests/ui028-w25-reports-layout.spec.ts; không đổi app, hook, API/schema, style, ngưỡng spacing, timeout hoặc retry. Consumer impact là readiness của test hiện có, vẫn giữ đủ sáu width và toàn bộ assertion.

Knowledge local giữ nguyên test trên Firefox ba lượt: 6/6 PASS cả route và dialog. Chưa đủ bằng chứng xác định nguyên nhân hosted; chưa sửa Knowledge source/fixture theo phỏng đoán. Sẽ đọc raw trace khi artifact sẵn sàng và ghi kết quả riêng.

Gate sau fixture edit: kiểm lại hai browser, discovery đầy đủ, ba source gate và full verify/S17 theo source cuối. Không ghi owner acceptance, screen-reader speech, Backend/production hoặc canonical FE receipt PASS từ việc sửa fixture.
