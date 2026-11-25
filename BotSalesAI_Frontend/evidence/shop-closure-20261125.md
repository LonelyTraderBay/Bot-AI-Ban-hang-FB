# Đóng và mở lại cửa hàng trên Web

Baseline 1040560e. Hai bản ghi Shop trong seed thiếu status và closedAt theo hợp đồng vừa sinh. Trang chọn shop và Shell kiểm schema nên baseline render dữ liệu shop chưa đạt. Trước sửa, trang chọn chỉ gọi listShops không có bộ lọc, trang thiết lập chỉ có updateShop. Mock không xử lý closeShop/reopenShop.

R02 dùng bộ lọc trạng thái và phân trang theo URL. R33 dùng Panel, MutationButton và ConfirmDialog để xác nhận đúng shop, thông báo nhóm công việc và giữ focus bàn phím. Shell sở hữu thông báo chỉ đọc, membership sở hữu quyền, useCommand chặn ghi tại điểm gửi, các hành động quản trị được hợp đồng cho phép vẫn hoạt động. Dùng spacing và tokens sẵn có. Kiểm demo local ở Chromium/Firefox và kiểm hợp đồng ở lớp service.

## Kết quả cục bộ

- Hai ca đỏ ban đầu bắt được closedAt có giá trị trên shop mới và closeShop trả 501. Sau triển khai, ba ca Vitest ở lớp mô phỏng kiểm chuyển trạng thái, quyền, chống gửi lặp, xung đột phiên bản, quyền đọc sau thu hồi, yêu cầu dữ liệu cá nhân và các nhóm vướng.
- `tests/ui-workspace-layout.spec.ts -g "shop closure"` chạy 6/6 ca trên Chromium và Firefox. Kiểm mở hộp thoại bằng Enter, Escape trả focus, đóng, tách danh sách, mở lịch sử audit, mở lại, giữ tên và ID. Ở 390 × 844, lỗi nhóm nhận focus và người quản lý không có nút đóng. Ca tab cũ ngắt EventSource, gửi thay đổi từ một yêu cầu độc lập, quan sát 412, sau đó 409 cập nhật màn hình sang chỉ đọc.
- Bản demo dựng bằng Vite chạy lại sáu ca trên cùng hai trình duyệt. Hai phép đo preview cho trang tổng quan đều đạt 510.955 byte gzip, dưới giới hạn 512.000 byte. Khối JavaScript lớn nhất 104.320 byte gzip, giới hạn 204.800. Mô-đun consent chỉ tải khi cần trong MSW.
- TypeScript, ESLint, kiểm biên module, generate:check (15 đầu ra, 262 operation), source/layout/visual/composition, 122 ca domain/network và 287 ca Vitest đạt. Bản live và demo đều dựng được. Phê duyệt yêu cầu dữ liệu dùng điều kiện xác thực nâng cao hiện hành của live. Demo cho tạo yêu cầu và giữ giới hạn xác thực hiện có.
- BASELINE_NOT_CAPTURED cho màn hình shop đang hiển thị trước thay đổi. Lần thử baseline trong worktree mới dừng ở bước khởi động service worker. Chưa kiểm zoom gốc, screen reader, thiết bị thật hoặc nghiệm thu người dùng. Phép kiểm demo này chỉ dùng dữ liệu tổng hợp trên máy.

## Kiểm tra sau review

- Khi tab đang hiển thị, Shell đọc lại shop và trang chọn đọc lại danh sách đang xem sau mỗi 20 giây. Ca kiểm thử dùng đồng hồ ảo và tắt EventSource ở màn hình phí giao hàng. Lệnh từ một yêu cầu độc lập đóng shop khi hộp thoại gỡ vùng đang mở, rồi mở lại shop. Bảng phí vẫn đọc được, nút sửa hoạt động lại. Nếu đang nhập tên dịch vụ khi shop đóng, bản nháp còn nguyên và nút lưu bị khóa.
- Demo ghi nhận lệnh đóng/mở theo shop, người thao tác, loại lệnh và mã băm của khóa chống gửi lặp. Ca mất phản hồi sau khi đóng đã tra lại kết quả qua danh sách lệnh. Trình duyệt chỉ gửi một POST đóng, đọc lại phiên bản 2 và một bản ghi lệnh. Ca service gửi lại cùng khóa và nhận lại kết quả cũ.
- Bản demo dựng lại đạt 12/12 ca luồng đóng/mở trên Chromium và Firefox, gồm cả danh sách đang mở tự cập nhật và chủ shop đóng vẫn xem được màn hình báo cáo. Hai phép đo trang tổng quan đều đạt 511.254/512.000 byte gzip, còn dư 746 byte. Khối lớn nhất là 104.320/204.800 byte gzip.
- `npm run verify` đạt toàn bộ cổng frontend, gồm 122 ca domain/network và 287 ca Vitest. Các ca trình duyệt trên dùng API mô phỏng cục bộ.

## Bản nháp khi tải lại trạng thái shop

Ca hồi quy ban đầu tái hiện việc ô tên cửa hàng và bản nháp biến mất khi lần tải lại nhận HTTP 503. Với bản sửa, cùng ca kiểm tra trên Chromium và Firefox giữ được nội dung đang nhập, hiện cảnh báo dữ liệu cũ và xóa cảnh báo sau khi tải thành công. Khi lần tải kế tiếp nhận 404, biểu mẫu biến mất. Phản hồi 503 tiếp theo vẫn giữ màn hình lỗi và dữ liệu shop đã bị xóa khỏi cache của Shell.

Bản demo dựng lại đạt 14/14 ca luồng đóng/mở và 2/2 phép đo kích thước trên Chromium và Firefox. Trang đầu dùng 511.404/512.000 byte gzip, còn dư 596 byte. Khối lớn nhất dùng 104.320/204.800 byte. Ba ca phiên bị thu hồi qua SSE hoặc hết hạn qua 401 đều đạt trên cả hai trình duyệt với API kiểm thử cục bộ.
