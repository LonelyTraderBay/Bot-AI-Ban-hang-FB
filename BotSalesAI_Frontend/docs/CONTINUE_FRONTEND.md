# Tiếp tục frontend trong VS Code

Đọc AI_RULES.md nguyên bản và AGENTS.md. Đây là nhiệm vụ tiếp tục frontend, không được tự mở rộng sang backend/production. Không viết lại source hiện có hoặc đổi stack.

1. Xác minh repo và diff; đọc docs/KNOWN_GAPS.md cùng evidence/REPORT.md. Kiểm đúng Node24, thư viện đã khai báo và quyền cài dependency. Không dùng Node22/TS5.8 đã có trong môi trường tạo gói để nhận đạt target.
2. `npm install`: tạo lockfile thật. Nếu registry không truy cập được thì giữ BLOCKED, không tạo file khóa hoặc stub thư viện giả. Khi đã có lockfile, kiểm peer dependency và security advisory trên đúng phiên bản; ghi quyết định nếu cần đổi patch.
3. `npm run setup`, `npm run doctor`, `npm run generate:check`, `npm run boundaries`, `npm run test:source`. Không sửa đầu ra generator bằng tay.
4. `npm run typecheck`: sửa lỗi bằng schema/type thật của thư viện. Không thêm any, tắt strict, bỏ component hoặc bịa module declaration để qua cổng. Source chưa được fulltypecheck nên đây là bước bắt buộc.
5. `npm run lint`, `npm run test:domain`, `npm test`, `npm run build`, `npm run build:demo`. Xác minh production build không chứa nhánhmock/seed/worker giả. Testfail không phải lý do tắt suite.
6. Chạy `npm run dev`, `npx playwright install chromium`, `npm run test:e2e`. Hiện testbrowser chỉ là suite ban đầu: thêm kiểm cho54route, trạng thái, 2shops/roles, form/errors/import, order/stock/receipt/finance, noresendunknown, bànphím và thiết bị. Ảnhtrongkitprototype không dùng làm evidenceapp.
7. Ưu tiên verticalslice: catalog→stock→order→prep; procurement→approval→receipt; finance→reconciliation; inbox→knowledge/bot. Đọc/sửa các form/dữ liệu bị hạn chế đã liệt kê trong KNOWN_GAPS để đáp ứng đầy đủ đặc tả, không tự tuyên bố sourcecoverage=featurecomplete.
8. Hợp đồng thiếu/hằnglegacy mâu thuẫn: ghi precisegap, giữ behaviorfail-closed; muốn thêmendpoint/phépủyquyền phải có nguồn duyệt và updatecanonical+generator+tests. Không giả backend chỉ để màn hình đẹp.
9. Ghi kết quả trên revision hiện tại, câu lệnh/exitcode/log; tạo ảnh từ Reactapp chạy thật. Chỉ khi đầy đủ bằng chứng mới đề nghị nghiệm thu frontend. Không tự tăng84task/420step toàn sản phẩm hoặc phát hành ra hosting.
