# Sửa các vấn đề từ audit unslop — 10/11/2026

Giữ Graphite Gold, token, hành vi và dữ liệu nghiệp vụ. Baseline trước sửa và phạm vi ở [CONTRACT](CONTRACT.md) và [audit](../unslop-full-audit-20261110/REPORT.md).

- P1: bốn nút chọn ảnh, CSV và tài liệu kiến thức dùng nút thật kích hoạt input tệp; giữ xác thực tệp và trạng thái quyền, cho phép Enter, Space, click. R23 được bổ sung do cùng kiểu label; trước sửa chưa có phép đo bàn phím riêng cho R23.
- P2: EditDialog căn title/close theo trục giữa; Status giữ nguyên từ; select compact giữ vùng nhận thao tác tối thiểu 44 px và căn giữa nội dung; 28 cột action được đặt tên; ngữ nghĩa heading tại R02/R19/R52 được sửa mà giữ cỡ chữ.
- P3: vùng công cụ mô phỏng trở thành aside có tên; copy một số màn hình được diễn đạt theo nghiệp vụ, vẫn giữ cảnh báo mô phỏng, dữ liệu và bảo mật.

Kết quả bản source cuối:

- [Ma trận 61 route](final3/matrix.json): 488/488 lần trên 320/390/768/1440 px và Chromium/Firefox; 0 lỗi collector/JS, 0 tràn ngang toàn trang, 0 control clipping, 0 control nhỏ trong probe; 122 axe scan không phát hiện violation trong state đã quét.
- [Hộp thoại](final3/overlays.json): 112/112 lần trên hai engine ở 390/1440 px; title lệch không quá 0,5 px; tất cả vừa viewport, sau 4 Tab focus nằm trong dialog, Escape đóng và trả focus về opener. 18/18 lần kích hoạt file chooser trên ba route cũ thành công. Kiểm thêm R23 trong Playwright. Focus ban đầu ở trap container MUI ngoài Paper; không nhận là initial Paper focus PASS.
- [Trạng thái](final3/status-wrap.json): 122/122, không có từ bị ngắt giữa chữ; [select](final3/fields-final.json): 20/20 tổ hợp, tất cả control và root đo được cao ít nhất 44 px. [Căn chữ select](select-align-final.log): 4 tổ hợp Chrome/Firefox và 390/1440, lệch tối đa 0,57 px.
- [Build demo](build-final3.log) và [verify](verify-final3.log) hoàn tất; verify gồm generate, boundary, lint, typecheck, unit/domain, build, layout, visual, composition và evidence validator.
- [Playwright hồi quy](e2e-final3.log): 104/104 trên hai engine, gồm bàn phím chọn tệp, header, bộ lọc, validation tệp, luồng phiên, draft dialog và 200% text/spacing stress. Đây là CSS stress, không phải native browser zoom hoặc text-only resize.

Các log và ảnh của lần thử trung gian được giữ để truy vết; chỉ `final3/` và các log `final3` là phép đo source cuối. Verify lần đầu báo fingerprint S17 cũ; sau khi cập nhật snapshot cùng giới hạn lịch sử, verify bản cuối đã qua. Lần chạy test tệp đồng thời gặp cổng bận là diagnostic, không dùng làm kết quả kiểm thử.

Giới hạn: dữ liệu và tương tác dùng frontend demo/MSW, không xác nhận backend/provider thật. Không tuyên bố toàn bộ state, mọi vai trò, screen reader thực, native zoom/text-only resize, thiết bị vật lý, hosted CI hoặc owner acceptance. Các ảnh và DOM probe không thay cho nghiệm thu người dùng. Lượt này không chạy lại toàn bộ 1126 E2E lịch sử; phạm vi và số lượng hồi quy mới được ghi trong log Playwright.

Áp dụng unslop của Damir Sokolovsky (@heydamir), CC BY 4.0.
