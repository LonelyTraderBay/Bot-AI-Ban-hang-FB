# Nghiệm thu Frontend F01–F09

Phạm vi: ứng dụng React với HTTP MSW và dữ liệu tổng hợp. Kết quả kỹ thuật hiện hành nằm trong [REPORT.md](REPORT.md); quyết định nghiệm thu thuộc người dùng.

## Chuẩn bị

Mở demo được bàn giao. Khi cần lặp lại từ đầu, tải lại trang để khôi phục bộ dữ liệu mẫu. Điều khiển “Trạng thái thử” và “Vai trò mô phỏng” nằm trong công cụ demo; trên màn hình nhỏ mở công cụ trước khi mở dialog. Các điều khiển này đổi fixture, không cấp quyền hoặc gọi provider thật.

### Tái lập trên Windows hiện tại

Terminal PowerShell ở `BotSalesAI_Frontend`. PATH hữu hạn dưới đây chỉ áp dụng cho terminal hiện tại; không thay thiết lập máy hoặc execution policy. Node/npm/dependencies giữ pins trong workspace.

```powershell
$env:PATH = 'C:\Program Files\nodejs;C:\Windows\System32;C:\Windows;C:\Program Files\Git\cmd;' + (Join-Path (Get-Location) 'node_modules\.bin')
npm.cmd ci
npm.cmd run setup
npm.cmd run build:demo
Set-Location apps/web
node ../../node_modules/vite/bin/vite.js preview --outDir dist-demo --host 127.0.0.1 --port 4173 --strictPort
```

Mở `http://127.0.0.1:4173/s/shop-demo/overview`. Chạy gate từ workspace root bằng `node evidence/frontend-corrections-20261008/run-checks.mjs verify`; helper ghi argv/cwd/exit/log/source hash, dùng PATH đã kiểm. `dev:live` vẫn cần API thật và không bật fallback mock.

## Các ca cần xem

| Ca | Màn hình và thao tác | Kết quả cần quan sát |
|---|---|---|
| 1 — Đối chiếu khách hàng | Khách hàng → hồ sơ Linh. Chọn “Xung đột lần ghi tiếp”, sửa tên và lưu. | HTTP mock báo 412; dialog có bản gốc/bản nháp/server. “Áp dụng vào bản nháp” không lưu; bấm “Lưu thay đổi” sau khi kiểm tra mới gửi lần tiếp theo. |
| 2 — Quyền và trường ẩn | Tại hồ sơ Linh, xem số điện thoại bị ẩn. | Trường không chỉnh được, không xuất hiện giá trị ẩn trong đối chiếu và không gửi lại khi lưu tên. |
| 3 — Ảnh và refetch | Sản phẩm → Áo mẫu A. Thêm ảnh, sửa tên, đổi trạng thái dữ liệu/khôi phục bình thường. | Nháp gồm cả ảnh vẫn được giữ. Rời màn hình hiện cảnh báo chưa lưu. Đối chiếu variants/ảnh chọn nguyên danh sách. |
| 4 — Đơn mới | Đơn hàng → thêm đơn. Nhập ghi chú hoặc thêm/xóa dòng; thử về danh sách, đổi shop, đăng xuất hoặc reload. | Có cảnh báo; chọn tiếp tục thì dữ liệu còn. Lưu thành công và không sửa tiếp thì rời trang không cảnh báo sai. |
| 5 — Dialog đơn | Mở đơn DH-1001 → “Sửa đơn nháp”. Sửa dữ liệu rồi dùng nút đóng/footer, Escape hoặc backdrop. | Các đường đóng cùng qua guard. Chọn tiếp tục vẫn có nháp; chờ lưu thì không đóng được. |
| 6 — Soạn tin | Inbox → hội thoại cv1. Bật “Tải chậm”, soạn ghi chú nội bộ và lưu; nhập nội dung tiếp trong lúc chờ. | Vẫn nhập/đổi loại được; không gửi thêm khi pending. Hoàn tất bản trước không xóa nội dung vừa nhập; lỗi/unknown giữ nội dung và khóa gửi trùng. |
| 7 — Giới hạn ghi chú | Khách hàng: thử 4.001 ký tự ở thêm mới và hồ sơ; sau đó 4.000. Lặp lại bằng emoji; privacy thử 4/5 và 2.000/2.001 emoji. | Giới hạn đếm Unicode code point theo contract. Customer 4.001 báo lỗi tiếng Việt tại trường, không gửi HTTP; 4.000 lưu nguyên nội dung. Privacy chỉ nhận 5–2.000, ngày lưu là số nguyên 1–36.500. |
| 8 — Các editor khác | Thông tin cửa hàng, privacy, danh mục, nhà cung cấp, thông báo. Sửa → tạo xung đột → đối chiếu → áp dụng → kiểm tra → lưu. | Version thuộc baseline của nháp; refetch không ghi đè. Trường một bên sửa chọn sẵn; hai bên sửa khác nhau bắt buộc chọn. |
| 9 — Bàn phím và màn hình hẹp | Mở đối chiếu, dùng Tab/Shift+Tab/Enter/Escape. Thu cửa sổ 320px hoặc zoom trình duyệt 200%. | Tiêu đề/nút đóng không chồng nhau, trường và action đọc/điều khiển được, nội dung dài xuống dòng. |

Đối chiếu đồng thời cùng trường, server đổi lần hai, redaction, late edits khi lưu và request count SSE có regression tự động với snapshot/network cụ thể; xem suite [frontend-corrections.spec.ts](../../tests/frontend-corrections.spec.ts) và logs liên kết trong report. Các helper native zoom chỉ chạy trong profile tạm và giữ hình/geometry; không sửa profile trình duyệt người dùng.

## Cách phản hồi

Ghi ca, route, thao tác, kỳ vọng và kết quả thực tế nếu cần chỉnh tiếp. Hồ sơ không tự nhận quyết định nghiệm thu, lời nói screen reader, hosted CI, Backend/provider thật hoặc triển khai production.
