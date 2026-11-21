# R64–R67 · Ưu đãi, thu/hoàn tiền, kiểm kê và chuyển kho

## Phạm vi và baseline trước sửa

- Baseline `d5541f25` cùng thay đổi R62–R63 trong working tree. Có 63 route trong 16 module. R64–R67 là màn mới. Kết quả baseline trình duyệt cho các route P0 nằm trong hồ sơ `pilot-shipping-exceptions-20261120`.
- R64 dùng Catalog quản lý combo theo SKU, số lượng, ngày hiệu lực và mức giảm. Đơn nháp, báo giá, xác nhận và kiểm hàng hoàn là các điểm phải giữ cùng số tiền. Chủ shop duyệt bật, nhân viên chọn ưu đãi đủ điều kiện, giá vốn và tồn được kiểm tra trong API.
- R65 dùng Finance đọc dữ liệu từ đơn, công nợ, phiếu thu/hoàn, hàng trả và đối soát. Hành động xác minh vẫn đi qua màn nghiệp vụ tương ứng.
- R66 dùng Inventory lưu số tồn và phiên bản tại thời điểm mở phiên. Số đếm chờ duyệt. Nếu vị trí thay đổi, làm mới phiên và đếm lại dòng bị ảnh hưởng trước khi ghi tồn.
- R67 dùng Inventory chuyển tồn qua trạng thái đang đi, nhận nhiều lần và kết thúc có lý do khi thiếu. Giá vốn theo lô xuất của phiếu, có đối ứng trong sổ quản trị mô phỏng. Hàng đi đường nằm ngoài tồn bán được.
- UI dùng Shell, PageHeader, Panel, DataTable, Toolbar, FormFields, EditDialog và cơ chế quyền, version, idempotency của workspace. Hợp đồng chuẩn đi cùng MSW và kiểm thử trình duyệt. Backend, dữ liệu bền vững, đối soát tiền thật và nghiệm thu vật lý thuộc mốc tích hợp.

## Hành vi đã triển khai

- **R64.** Combo giảm một khoản cố định cho một đơn, gồm ít nhất hai SKU. Có khâu tạo nháp, duyệt bật theo phiên bản và tạm dừng. R06 chỉ đọc combo có hiệu lực. R18 chọn combo, R19 dùng giá, tồn và biên lợi nhuận từ API để lưu báo giá và xác nhận lại khi phiên bản đổi. Phần hoàn từ hàng trả dùng giá đã giảm. R53 tổng hợp đơn đã chốt trong kỳ và số tiền giảm.
- **R65.** Hàng đợi lọc thu hoặc hoàn, đang mở hoặc đã xử lý. Có tín hiệu cần đối chiếu khi chứng từ và công nợ lệch. Chi tiết hiển thị mã chứng từ, bút toán, giao dịch liên quan, số còn lại, người phụ trách và hạn khi có nguồn. Các điểm ghi nhận tiếp tục ở R19, R43 và R49.
- **R66.** Theo SKU được chọn ở một kho. Lưu từng phần số đếm trước khi gửi duyệt. Khi tồn khác phiên bản, cập nhật mốc giữ số đếm của SKU còn khớp và yêu cầu đếm lại dòng đã đổi. Người có quyền quản trị kho xác nhận ghi chênh lệch, liên kết với biến động.
- **R67.** Có ít nhất hai kho hoạt động để mở phiếu. Xuất từ lượng khả dụng, nhận nhiều lần và ghi thiếu phần còn lại với lý do. Trạng thái, quyền và phiên bản được kiểm tra trên API. Biến động hai đầu và bút toán giá vốn có mã phiếu truy vết.

## Kiểm chứng ngày 20/11/2026

- `validate_contracts.py`, `validate-kit.mjs` và `generate:check` đạt. Kiểm tra 544 mục của kit đạt, OpenAPI có 376 schema và 259 operation. Danh mục có 67 màn hình trong 16 module.
- `npm run verify` và `npm run build:demo` đạt. Vitest đạt 277/277 ca, bộ kiểm tra nghiệp vụ và HTTP của API mô phỏng đạt 122/122. Năm ca P1 chuyên biệt kiểm tra hiệu lực, giá vốn và biên lợi nhuận của combo, hoàn tiền theo dòng đã giảm giá, truy vết chứng từ, giữ số kiểm kê hợp lệ khi tồn đổi và bảo toàn giá vốn khi nhận chuyển kho từng phần.
- Một lượt kiểm thử có chọn lọc trên Chrome và Firefox đạt 18/18 ca, gồm R62–R67, hồi quy đọc ưu đãi trong hội thoại, mở toàn bộ route và ma trận quyền đọc. Mỗi trình duyệt đạt 441 tổ hợp từ 7 vai trò và 63 route riêng tư.
- Kiểm tra lại bản demo cuối đạt 10/10 ca trên Chrome và Firefox. Mỗi trình duyệt đã mở đủ 67 màn và thực hiện bốn luồng P1. Combo mẫu giảm 30.000 ₫, được chọn từ hội thoại, lưu trên đơn nháp 369.000 ₫ và giữ đúng mức giảm trên báo giá. Ba ca còn lại kiểm tra tra chứng từ hoàn tiền ở viewport 390 px, ghi chênh lệch sau duyệt kiểm kê và giữ hàng đi đường sau khi nhận một phần phiếu chuyển kho.
- Kiểm tra hồi quy có chọn lọc đạt 12/12 ca trên hai trình duyệt, gồm xác nhận đơn với địa chỉ đã lưu, thay đổi dòng đơn làm hết hiệu lực báo giá, nhận một phần hàng trả và phát sinh khoản cần hoàn, quyết toán COD sau phí, phân bổ một phần giao dịch ngân hàng và đọc ưu đãi từ hội thoại. Ca hội thoại dùng máy chủ demo dev theo cấu hình của FE016, các ca FE012 và FE015 dùng bản build demo cuối.

## Phạm vi nghiệm thu

- Các thao tác đã kiểm trên bản demo với API MSW và dữ liệu mẫu. Backend, đồng bộ giữa thiết bị, cổng thanh toán, giao dịch thật, tồn kho thật và nghiệm thu thiết bị thực tế chưa được kiểm chứng. Hồ sơ S17 vẫn ở trạng thái `IN_PROGRESS`.
