# BotSales AI 2.1.1 — demo vận hành để duyệt UI

Mở `index.html` bằng Chrome/Edge. File đã gói sẵn CSS/JS, không cài Node, không API key và không gửi dữ liệu lên server. Đây không phải website đã được triển khai public.

## Ba vòng bấm thử

**Bán hàng:** Tổng quan → Tạo đơn thử luồng 24/7 → Điện thoại & nhắc việc → Nhận chuẩn bị → Chuẩn bị hàng → kiểm sản phẩm → đóng gói → bàn giao → Giao hàng → mô phỏng giao thành công → Đối soát COD → nhập phí, xác nhận tiền về. Bàn giao chưa là doanh thu; COD chưa về chưa là tiền shop.

**Mua hàng:** Nhập lại hàng → lập đề nghị → Cần phê duyệt → duyệt → Đơn mua → gửi mẫu → NCC xác nhận → nhập số thực nhận (có thể một phần) → Bút toán/Công nợ. Không tự chuyển tiền; đơn đang đặt được trừ khỏi đề xuất mới.

**Ngoại lệ:** chuyển vai trò Chỉ xem hoặc trạng thái Mất mạng để thử chặn ghi; tạm dừng Admin rồi thử tạo đơn tự động mẫu; thử khóa kỳ khi còn COD/đơn mua chưa xong. Góp ý màn hình → nhập nhận xét → vào Góp ý & danh sách cần duyệt → xuất Markdown/JSON.

## Phạm vi chính xác

45 trang được kiểm render trong trình duyệt. Đây không phải 54 route sản phẩm đã hoàn thành. Chi tiết đầy đủ và phần chỉ có thiết kế trong PROTOTYPE_SCOPE.json. Đổi trả chỉ tới tạo yêu cầu/kiểm nhận cách ly, chưa hoàn tiền. Kế toán demo chỉ có bút toán các thao tác V2, không giả làm sổ đầy đủ cho số liệu cũ. Các trình soạn chính sách chỉ là cấu hình mẫu, chưa chạy giờ trực/nhắc nền thực.

Dữ liệu nghiệp vụ chỉ ở tab; tải lại sẽ reset. Góp ý lưu trên thiết bị khi trình duyệt cho phép, nên xuất file để bảo toàn. Không nhập dữ liệu khách thật, mật khẩu hoặc API key. Chuyển vai trò trong demo để review UX không phải cơ chế bảo mật sản phẩm.

## Build và test lại

`python build.py` gói nguồn thành HTML. `node test_domain_v2.cjs` kiểm mô hình mô phỏng. `python test_browser_v2.py` cần Python Playwright và Chromium (`CHROMIUM_PATH` có thể chỉ đường dẫn đã cài). Không tự cài hoặc deploy lên tài khoản ngoài.

Bằng chứng tại evidence/ được gắn hash artifact/nguồn. Những test này không được dùng để tick hoàn thành task backend, Push trên điện thoại thật hay production. Source demo là bản thử JavaScript gọn; ứng dụng thật theo kiến trúc và nhiệm vụ trong thư mục cha.

## Màu chính thức và phiên bản

Gói **2.1.1** tiếp nhận **Graphite Gold dark-only** đã duyệt trong `design/decision.json`. Token vẫn phiên bản **2.1**, HEX giữ nguyên; API **2.0.0**, phạm vi/kế hoạch nghiệp vụ **2.0**, Universal **3.1** không bị nâng giả chỉ để trùng số phiên bản. `release.json` giải thích từng miền phiên bản.

Đọc `DOCUMENT_INDEX.md` để tìm nguồn chuẩn, `UPGRADE.md` trước thay bộ cũ, và `RELEASE_NOTES.md` để biết điểm đã sửa. Hướng dẫn task đã đồng bộ nhưng không đổi 84 việc/420 bước hoặc cộng tiến độ sản phẩm. Chỉ một kit được chỉ định hiện hành trong repo; archive/reference không là nguồn màu hay kế hoạch đang chạy.
