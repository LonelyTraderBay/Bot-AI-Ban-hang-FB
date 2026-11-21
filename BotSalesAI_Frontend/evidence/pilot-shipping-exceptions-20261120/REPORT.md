# Cấu hình giao hàng và hàng đợi ngoại lệ

## Baseline trước triển khai

- Checkout `d5541f25`. Có 61 route trong 16 module. Báo cáo source-check đã được làm mới bằng mã baseline trước đợt này.
- R19 sở hữu báo giá có hạn và xác nhận theo phiên bản địa chỉ. R42 có bản thử phí cố định và cột phí báo giá. R33 chỉ dẫn tới bản thử phí.
- R37 giữ bản ghi công việc, lịch sử thao tác và bộ lọc trên trang đang tải. R36 nhận mã tác vụ và đọc chi tiết. Job, command và work item có quyền đọc khác nhau.
- R62 bổ sung cấu hình biểu phí thủ công theo quốc gia và tỉnh. Phí dự kiến được lưu cùng báo giá và vận đơn. Hợp đồng tiền hàng giữ nguyên cho đến khi chính sách thu phí được xác định. R63 dùng danh sách theo phạm vi cửa hàng và lọc trước phân trang.
- Owner source là module Giao nhận, Đơn hàng và Điều hành. Màn hình dùng Shell, PageHeader, Panel, FormFields, QueryState, DataTable, RouteLink và Pager hiện hành. Tác động gián tiếp gồm điều hướng, quyền đọc, xử lý draft và bộ sinh contract.
- Phương pháp xác minh theo workflow UI chuẩn của workspace. Giữ mock rõ nguồn và các quyền hiện hành. Phiên này xây frontend, hợp đồng và mô phỏng, với nghiệm thu backend/provider ở môi trường riêng.

## Thay đổi đã triển khai

- R62 tại `/s/:shopId/settings/shipping`. Người có quyền `shop.manage` thêm, sửa và gỡ biểu phí thủ công. Mỗi quốc gia và tỉnh/thành có một quy tắc. Ghi có điều kiện theo phiên bản của biểu phí. R33 và R42 dẫn tới R62 theo quyền.
- R19 tính phí dự kiến theo địa chỉ tại bước báo giá. Báo giá mang phiên bản biểu phí, và quá trình xác nhận dùng phiên bản đó. Nếu thay biểu phí giữa lúc báo giá và chốt đơn, cần báo giá và xác nhận lại. R42 kế thừa phí dự kiến đã chốt. Tiền hàng, phí giao dự kiến và phí thực tế có các trường riêng.
- R63 tại `/s/:shopId/operations/exceptions`. Lọc loại, trạng thái, người phụ trách và hạn xử lý trước khi phân trang công việc. Có thể nhận việc và mở hồ sơ gốc hoặc R37 để cập nhật kết quả. Hai tab tác vụ và thao tác cần quyền `jobs.read`. Từ tác vụ có thể đi tới R36, và thao tác chưa rõ có thể đọc lại theo mã.
- Phạm vi phí cố định theo vùng ở cấp shop, phù hợp cấu hình một kho cho pilot. Dữ liệu mô phỏng lưu trong phiên demo. Chốt chính sách cước thu khách, kết nối hãng, lưu dữ liệu bền vững, xác minh sự kiện ngoài và nghiệm thu trên dữ liệu thật thuộc bước tích hợp.

## Kiểm chứng cục bộ

- `npm run verify` đạt trên bản sửa cuối. Kiểm tra source, ranh giới module, lint, TypeScript, layout, token, composition và build production đều đạt. Vitest đạt 272/272 và kiểm tra nghiệp vụ/HTTP mock đạt 118/118.
- Ba ca hồi quy nghiệp vụ riêng kiểm quyền và phạm vi shop, cập nhật biểu phí bị trùng hoặc sai phiên bản, phí đi từ báo giá tới vận đơn và lọc ngoại lệ trước phân trang.
- `npm run build:demo` đạt. OpenAPI JSON/YAML khớp, kiểm tra cấu trúc kit đạt 536/536 và danh mục khớp 63 route trong 16 module. S17 vẫn `IN_PROGRESS`.
- Playwright trên bản demo dựng lại đạt 6/6. Mỗi engine mở đủ 63 route, lưu biểu phí bằng bàn phím rồi đọc kết quả trên báo giá, và lọc/tra lại thao tác từ R63 ở 390 px. R62 có kiểm chiều ngang trang ở 320 px.
- Ở lượt kiểm ngay trước chỉnh nhãn mô phỏng, Chrome và Firefox đều đạt 413 tổ hợp đọc route cho 7 vai trò và kiểm bố cục Toolbar ở 320/1440 px. Hai ca mở toàn bộ route của lượt gộp đó thất bại trên bản demo cũ, gồm một lần Firefox hết thời gian. Chạy lại riêng với bản demo mới đạt theo kết quả trên.
- Phạm vi bằng chứng là trình duyệt và MSW cục bộ. Thiết bị vật lý, lời đọc screen reader, tích hợp backend/provider và nghiệm thu của chủ shop còn ở các mốc riêng.
