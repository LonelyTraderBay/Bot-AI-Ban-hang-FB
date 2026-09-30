# Khoảng trống và giới hạn chưa được nghiệm thu

Bản nguồn có component cho toàn bộ54route nhưng **chưa được phép suy ra đã hoàn thành toàn bộ yêu cầu frontend**. Các khoảng trống dưới đây không phải tính năng tự động bị gỡ khỏi phạm vi.

## Chặn kiểm chứng trong môi trường hiện tại

1. Không truy cập npm registry; chưa cài React/MUI/Vite/Query/RHF/MSW và các thư viện test. Không có package-lock thật. Node môi trường22/TS5.8 khác target24/TS5.9.2.
2. Full React typecheck, ESLint, build, kiểm thử component/browser/accessibility/performance chưa đạt bằng chứng. Có thể tồn tại lỗi mà parser và mock tests không phát hiện.
3. Không có ảnh chụp React app mới. Ảnh trong botsales-kit/prototype chỉ là tài liệu tham khảo cũ, không bằng chứng của repo này.

## Đặc tả/hợp đồng cần giải quyết khi nối backend

- Quote đặt hàng cần addressId nhưng hợp đồng hiện chưa có đầy đủ CRUD địa chỉ giao hàng. Form cho nhập ID đã có; không tự bịa endpoint. Chưa đạt trải nghiệm nhập địa chỉ hoàn chỉnh cho người mới.
- Tạo bút toán cần accountId; chưa có API danh mục hệ thống tài khoản tương ứng. Form dùng ID rõ ràng, không tự đoán tài khoản của pháp nhân.
- Bản tin trưởng nhóm có danh sách/lịch sử nhưng chưa có đầy đủ API chỉnh lịch riêng; UI không bật lịch nền giả.
- Chưa có contract tạo/in nhãn vận đơn cụ thể hoặc capability của hãng được chọn; UI vận chuyển không tự nhận đã mua/in nhãn thật.
- Legacy BotConfigWritePatch còn hằng requireHumanOrderConfirmation=true, trong khi chính sách tự chốt v2 tách riêng. Giữ nguyên hợp đồng, không dùng cờ đó để bật tự chốt vượt quyền.
- Giao thức step-up cũ dùng password không được đồng nhất ngầm với OIDC. Tác vụ privacy phá hủy dữ liệu cần backend xác nhận/ADR trước; UI không có đường tắt mật khẩu mẫu.
- Quốc gia, base currency, kế toán và phân quyền cấp cao vẫn là policy backend/owner inputs; không lấy mẫuVND thành cấu hình pháp định của shop.

## Giới hạn triển khai frontend phải kiểm tiếp

- UI tiếng Việt. i18next đã khởi tạo nhưng chưa chuyển toàn bộ văn bản trong các màn hình vào từ điển; chưa có bản dịch/nghiệm thu đa ngôn ngữ.
- Các bảng đọc có cursor/limit. Một số dropdown danh mục lấy100bản ghi để thử; cần lookup phân trang/tìm kiếm phù hợp cho dữ liệu lớn, không coi giới hạn đó là hỗ trợ mọiquymô.
- Một số form mua hàng/đối soát có đường nhập đơn giản một dòng; cần UAT và bổ sung trình biên tập nhiều dòng tương ứng toàn bộ contract.
- Không có proof cho navigation blocker bảo toàn mọi form chưa lưu. Form danh mục/khách đã tránh ghi đè do refetch; cần kiểm chuyểnroute/chuyểnshop/đóngdialog toàn bộ.
- Chưa có browser test thực tế cho fielderrors422, trạng thái412/428, keyboardfocus, overflow320px, uploads/avatars, menu và screenreader.
- Lệnh chưa rõ kết quả được giữ trong bộ nhớ qua điều hướng, có cảnh báo trước đóng tab; không có cơ chế phục hồi metadata này xuyên reload. Backend phải truy vết command/intent; API hiện chỉ đọc command theoID, không có endpoint tìm theoIdempotencyKey. Không tự mở khóa nếu chưa xác minh.
- Khóa readonly/missingpermission ở UI không là bảo mật máy chủ. JWT/secret/PII không lưu localStorage; APIkey chỉ gửi trườngwrite-only. Cần securitytest với backend thật.
- PWAmanifest/serviceworkerPush được cung cấp. Chưa kiểm installability trên Android/iOS/Safari, icon/iconmaskable, consent/Push thật hoặc Telegram thật.
- `VITE_APP_NAME` được khai báo nhưng tên ở shell/manifest vẫn theo BotSalesAI của bản chuẩn; thay thương hiệu cần đồng bộ đúng generator/shell, không coi biến đó đã điều khiển toàn bộ branding.

## Giới hạn của mocks (không phải code sản phẩm)

Dữ liệu nằm trong tab và reset khi reload; ngày cố định29/09/2026; một kho/tiềnVND mỗi shopmẫu; serialized simulator không chứng minh race trên DB. Không có actual scan, AI, ngân hàng, nhà cung cấp, vận chuyển hay thông báo nền. Kiểm thửAI là kết quả mô phỏng có nhãn, không số đo LLM. CSVmẫu tối đa1000dòng, không hỗ trợ XLSXparser. Báo cáo mock là mô hình hữu hạn, chưa triển khai đủ nguyên tắc hạch toán/migration/kỳ kế toán cho production. Chưa nghiệm thu các lọc ngày tài chính theo múi giờ trong mọi màn hình.

Không có backend từ việc gọi build:live. Các cổng toàn sản phẩm ở kit vẫn nguyên trạng. Phần frontend có source sẽ tiếp tục được kiểm/sửa theo chính source và các yêu cầu này; không đổi trạng thái thiếu thành PASS hoặc N/A.
