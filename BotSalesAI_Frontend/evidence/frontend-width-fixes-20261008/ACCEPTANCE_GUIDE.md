# Ca nghiệm thu WIDTH.W01–W04

Demo: http://127.0.0.1:4173. Dữ liệu tổng hợp được tạo lại khi reload; dùng khóa demo, không nhập thông tin thật.

1. **Nhà cung cấp AI** `/s/shop-demo/integrations/ai`: một kết nối dùng đủ vùng nội dung. Tạo kết nối thứ hai với model `synthetic-model`, khóa `demo-key`: desktop có hai cột. Xóa về một thẻ: trở lại một cột. Dữ liệu rỗng có một nút tạo và thông báo rõ.
2. **Workspaces** `/workspaces`: các thẻ giữ khoảng cách chuẩn; số shop0/1/2/3 đã kiểm tự động bằng dữ liệu hợp contract.
3. **Thiết lập shop** `/s/shop-demo/settings/shop`: hai nhóm field theo cặp khi đủ chỗ, xếp dọc ở màn hình hẹp; body phủ vùng inset Panel. Sửa tên rồi rời trang: chọn tiếp tục chỉnh sửa, tên vẫn giữ.
4. **Imports** `/s/shop-demo/imports`: source/target mapping cân chiều rộng, nút Bỏ giữ chiều cao tự nhiên. Thêm/bỏ một mapping; giá trị ở dòng khác vẫn giữ. Kiểm file CSV và thông báo lỗi theo suite sở hữu.
5. **Vận đơn** `/s/shop-demo/shipments`: vùng/kích cỡ xếp responsive, notice/phí phủ đủ body. Bỏ địa chỉ, đổi vùng không phục vụ hoặc tắt hiệu lực: thông báo phù hợp, không gửi hãng thật.
6. **Thiết bị** `/s/shop-demo/notifications/devices`: thông báo chống lặp nằm toàn hàng dưới hai pane, cách24px; màn hình hẹp xếp pane dọc.
7. **DetailLine** trong AI và các trang chi tiết: divider đi cùng dòng nội dung, không có khoảng trống thừa quanh divider. Tab/Shift+Tab vẫn thấy focus; ở320px và zoom200% nội dung dài xuống dòng, trang không cuộn ngang.

Đối chiếu ảnh sau sửa `R*-after.png` với ảnh baseline giữ nguyên ở namespace phân tích. Quyết định nghiệm thu người dùng chưa được tự ghi đạt. Speech/hosted CI/backend/provider thật không nằm trong bằng chứng local này.
