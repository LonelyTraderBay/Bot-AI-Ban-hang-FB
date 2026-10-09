# Nghiệm thu thực tế A01–A07

Mở demo sau khi build source cuối: `http://127.0.0.1:4173/s/shop-demo/products`. Dữ liệu/API là MSW tổng hợp; người dùng nghiệm thu vẫn PENDING cho đến khi có quyết định thực tế. Kết quả kỹ thuật đọc [REPORT](REPORT.md), không lấy các snapshot trước sửa làm PASS hiện hành.

1. **Products**: tìm tên/SKU, đổi trạng thái/danh mục; nút tìm kiếm không cao theo metadata. Mở tạo mới và sửa sản phẩm; search danh mục có hàng riêng, category/status căn mặt trường ở desktop và xếp cột ở mobile. Search không có kết quả vẫn giữ nháp tên.
2. **Orders/new**: thêm hai dòng, nhập số lượng 0; nút bỏ dòng giữ kích thước tự nhiên, không bị kéo theo helper. Thử rời trang với nháp chưa lưu và chọn tiếp tục chỉnh sửa.
3. **Orders/DH-1001 → Sửa đơn nháp**: địa chỉ và thanh toán đã khóa hiển thị có nhãn, đọc đầy đủ và không sửa được. Menu sản phẩm đọc được nhãn dài khi mở; dùng Arrow/Enter/Escape. Thêm/xóa dòng không làm mất địa chỉ.
4. **Imports**: sửa tên cột, bỏ rồi thêm cột; nút Bỏ giữ chiều cao tự nhiên, nháp mapping được giữ. Không cần gửi import thật để nghiệm thu layout.
5. **Dashboard/Finance/Reports**: tiền ngoài bảng wrap khi dài và giữ toàn bộ chữ số; tiền trong bảng nằm trong vùng scroll. Status bên đoạn văn không bị stretch; thông báo rỗng vẫn có action bàn phím.
6. Thu hẹp xuống **320 CSS px**, kiểm Tab/Shift+Tab, zoom trình duyệt **200%** và Firefox **text-only 200%**. Scroll bảng/dialog theo vùng có tên; footer và focus vẫn nhìn thấy/dùng được. Hai phương pháp zoom phải kiểm riêng.
7. Hành vi kế thừa: tạo xung đột khách hàng, xem bản gốc/nháp/server và chọn rồi lưu; soạn tiếp lúc tin trước đang gửi; thử dirty guard và các đường đóng dialog. Các phép này đã có regression trong full suite source cuối.

Các chuỗi cực dài dùng trong regression/native fixture là dữ liệu stress tổng hợp, không tự xuất hiện trong seed demo. Trace/screenshot/raw log và hash nằm trong cùng thư mục evidence. Không đổi dữ liệu thật hoặc gọi provider. Speech, hosted CI, Backend và quyết định nghiệm thu giữ phạm vi riêng.
