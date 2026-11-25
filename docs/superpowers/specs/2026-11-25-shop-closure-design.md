# Đóng và mở lại cửa hàng

Ngày 25/11/2026. Chủ dự án đã duyệt thiết kế và quy tắc vận hành.

## Mục tiêu

Chủ cửa hàng có thể đóng shop khỏi danh sách đang hoạt động và mở lại khi cần. Shop giữ nguyên ID, cấu hình, thành viên, đơn hàng, tồn kho, sổ sách và nhật ký để tra cứu hoặc tiếp tục sử dụng sau này. Shop đã đóng chỉ cho phép đọc dữ liệu nghiệp vụ theo quyền hiện có. Đồng bộ Backend, hợp đồng dùng chung, Frontend live và demo, với một migration tương thích dữ liệu cũ trên PostgreSQL và Supabase.

## Phương án đã xem xét

- Đóng và cho mở lại, giữ dữ liệu và quyền đã cấp. Chủ dự án đã chọn phương án này.
- Đóng shop và cho xóa vĩnh viễn shop chưa phát sinh nghiệp vụ. Phương án này cần tiêu chí riêng cho hồ sơ mặc định, thành viên và dữ liệu cần lưu. Phiên bản này triển khai thao tác đóng và mở lại.

## Hành vi trên giao diện

- Ở **Thiết lập cửa hàng**, chủ shop có nút **Đóng cửa hàng**. Hộp thoại nêu tên shop, tác động lên các thao tác nghiệp vụ và yêu cầu xác nhận. Nếu API phát hiện công việc đang xử lý, giao diện hiện nhóm cần xử lý để chủ shop có thể quay về xử lý rồi thử lại.
- Ở **Chọn cửa hàng**, danh sách mặc định hiển thị shop đang hoạt động. Mục **Đã đóng** cho thành viên có quyền xem lịch sử. Trạng thái **Đã đóng** hiện rõ trong shop, các thao tác tạo, sửa và gửi trong luồng kinh doanh bị vô hiệu hóa. Chủ shop có thể **Mở lại cửa hàng** từ phần thiết lập của shop đã đóng.
- Mở lại đưa shop về danh sách hoạt động. Nếu chủ shop đã tạm dừng bot, gửi tự động hoặc ngắt kết nối trước đó, các lựa chọn đó tiếp tục có hiệu lực.

## Dữ liệu, API và tác vụ nền

- Thêm thời điểm đóng nullable vào `Shop`. Shop hiện có và shop mới mặc định hoạt động. Trạng thái đóng xuất phát từ dữ liệu shop và đi qua hợp đồng API cùng kiểu dữ liệu Frontend được sinh từ nguồn chuẩn.
- Chỉ thành viên đang hoạt động có vai trò `owner` của chính shop được đóng hoặc mở lại. Backend thực thi quyền, khóa phiên bản và chống gửi lặp theo cơ chế hiện có. Ghi trạng thái và nhật ký trong cùng giao dịch. Các truy vấn danh sách giữ phân trang theo trạng thái. Quyền đọc lịch sử tiếp tục theo membership. Người ngoài shop không đọc được trạng thái hay dữ liệu.
- Chặn các lệnh ghi nghiệp vụ theo trạng thái ở Backend, kể cả gọi API trực tiếp hoặc dùng một giao diện đang mở từ trước. Đóng shop và bắt đầu công việc mới phải dùng cùng ràng buộc giao dịch để một yêu cầu đang chạy không lọt qua bước kiểm. Cho phép tra cứu và các thao tác phiên cần thiết để xem lịch sử.
- Từ chối đóng nếu có đơn đã xác nhận còn xử lý, vận đơn đang giao, lượt trả hàng đang xử lý, giữ tồn còn hiệu lực, đơn mua đã gửi còn chờ nhận, hoặc công việc nền đang chờ xử lý. Bản nháp chưa xác nhận được giữ. Các luồng định kỳ, webhook và worker chỉ tạo công việc kinh doanh mới cho shop đang hoạt động, với các ngoại lệ dưới đây.

## Đề xuất về dữ liệu đến và quyền sau khi đóng

- Tin nhắn Messenger đã được xác thực trong thời gian shop đóng vẫn vào Hộp thư để nhân viên xem. Bot dừng trả lời và các tin nhắn đó không được đưa vào hàng đợi xử lý bù khi mở lại. Giữ biên nhận và quy tắc chống ghi lặp của kênh.
- COD, công nợ hoặc hoàn tiền còn cần đối soát, cũng như lần gửi tới nhà cung cấp có kết quả chưa rõ, chặn đóng. Giao diện chỉ rõ nhóm vướng để chủ shop xử lý. Hệ thống giữ nguyên trạng thái nghiệp vụ cho đến khi có thao tác hợp lệ.
- Thu hồi quyền thành viên và xử lý yêu cầu dữ liệu cá nhân tiếp tục theo quyền, bước xác minh và phê duyệt hiện có. Các luồng đó hoạt động khi shop đóng để chủ shop có thể bảo vệ quyền truy cập và dữ liệu khách hàng.

## Tiêu chí nghiệm thu

- Chủ shop A đóng được một shop mẫu đủ điều kiện. Thành viên khác không đóng hoặc mở lại được, shop B giữ nguyên quyền và dữ liệu.
- Shop A rời danh sách hoạt động, xuất hiện trong mục đã đóng, vẫn đọc được dữ liệu lịch sử và bị chặn ghi. Khi mở lại, ID, hồ sơ, dữ liệu và trạng thái tạm dừng đã có được giữ nguyên.
- Gửi lặp cùng khóa tạo một thay đổi và một mục audit. Phiên bản cũ và tác vụ chưa kết thúc bị chặn với lỗi có thể xử lý. Có ca kiểm cạnh tranh giữa đóng shop và một yêu cầu ghi hoặc nhận việc.
- Tin nhắn nhận khi đóng không xếp việc bot, kể cả sau khi mở lại. Shop còn đối soát bị từ chối đóng và vẫn xử lý được quyền thành viên và yêu cầu dữ liệu cá nhân theo phạm vi của từng vai trò.
- Kiểm migration trên database thử và kiểm Backend, Frontend cùng hợp đồng. Thời điểm áp migration lên Supabase thử được quyết định sau khi xác minh thay đổi và bản sao lưu.
