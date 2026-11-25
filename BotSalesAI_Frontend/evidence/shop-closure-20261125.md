# Đóng và mở lại cửa hàng trên Web

Baseline 1040560e. Hai bản ghi Shop trong seed thiếu status và closedAt theo hợp đồng vừa sinh. Trang chọn shop và Shell kiểm schema nên baseline render dữ liệu shop chưa đạt. Trước sửa, trang chọn chỉ gọi listShops không có bộ lọc, trang thiết lập chỉ có updateShop. Mock không xử lý closeShop/reopenShop.

R02 dùng bộ lọc trạng thái và phân trang theo URL. R33 dùng Panel, MutationButton và ConfirmDialog để xác nhận đúng shop, thông báo nhóm công việc và giữ focus bàn phím. Shell sở hữu thông báo chỉ đọc, membership sở hữu quyền, useCommand chặn ghi tại điểm gửi, các hành động quản trị được hợp đồng cho phép vẫn hoạt động. Dùng spacing và tokens sẵn có. Kiểm demo local ở Chromium/Firefox và kiểm hợp đồng ở lớp service.

## Kết quả cục bộ

- Hai ca đỏ ban đầu bắt được closedAt có giá trị trên shop mới và closeShop trả 501. Sau triển khai, ba ca Vitest ở lớp mô phỏng kiểm chuyển trạng thái, quyền, chống gửi lặp, xung đột phiên bản, quyền đọc sau thu hồi, yêu cầu dữ liệu cá nhân và các nhóm vướng.
- `tests/ui-workspace-layout.spec.ts -g "shop closure"` chạy 6/6 ca trên Chromium và Firefox. Kiểm mở hộp thoại bằng Enter, Escape trả focus, đóng, tách danh sách, mở lịch sử audit, mở lại, giữ tên và ID. Ở 390 × 844, lỗi nhóm nhận focus và người quản lý không có nút đóng. Ca tab cũ ngắt EventSource, gửi thay đổi từ một yêu cầu độc lập, quan sát 412, sau đó 409 cập nhật màn hình sang chỉ đọc.
- Bản demo dựng bằng Vite chạy lại sáu ca trên cùng hai trình duyệt. Hai phép đo preview cho trang tổng quan đều đạt 510.955 byte gzip, dưới giới hạn 512.000 byte. Khối JavaScript lớn nhất 104.320 byte gzip, giới hạn 204.800. Mô-đun consent chỉ tải khi cần trong MSW.
- TypeScript, ESLint, kiểm biên module, generate:check (15 đầu ra, 262 operation), source/layout/visual/composition, 122 ca domain/network và 287 ca Vitest đạt. Bản live và demo đều dựng được. Phê duyệt yêu cầu dữ liệu dùng điều kiện xác thực nâng cao hiện hành của live. Demo cho tạo yêu cầu và giữ giới hạn xác thực hiện có.
- BASELINE_NOT_CAPTURED cho màn hình shop đang hiển thị trước thay đổi. Lần thử baseline trong worktree mới dừng ở bước khởi động service worker. Chưa kiểm zoom gốc, screen reader, thiết bị thật hoặc nghiệm thu người dùng. Phép kiểm demo này chỉ dùng dữ liệu tổng hợp trên máy.
