# UI015 — inventory mobile Inbox và demo controls

Ngày: 03/10/2026 · Scope: React/TypeScript frontend với MSW tổng hợp; không xét backend.

## Nguồn và hành vi hiện tại

- `botsales-kit/contracts/route-manifest.json`: R05 là danh sách Inbox, R06 là chi tiết hội thoại. Đọc cần `conversations.read`; trả lời cần `conversations.reply`; phân công/tiếp quản theo `conversations.assign`. Không có contract mới được thêm.
- `apps/web/src/modules/inbox/index.tsx`: danh sách/chi tiết dùng layout responsive. Trên màn hình hẹp, chi tiết thay danh sách và có link “Danh sách hội thoại”; list tin nhắn có scroll riêng, composer nằm sau nội dung thread; panel bối cảnh nằm sau thread trên mobile. Thread/context hai cột chỉ bật tại breakpoint XL. Không có source change ở Inbox cho UI015 vì chưa tái hiện lỗi layout bằng browser viewport test.
- `tests/fe016.spec.ts`: đã có 390×844 cursor/draft/Back test và một test composer/context ở desktop 1600×900. Hai test kiểm browser viewport/layout; không bật bàn phím phần mềm của hệ điều hành.
- `apps/web/src/app/Shell.tsx`: badge “Dữ liệu mô phỏng” và cảnh báo tổng hợp hiện rõ trong demo; trước sửa, các select role, fault và dataset luôn chiếm chỗ bên dưới cảnh báo ở mọi breakpoint. MockTools đã guard `__MOCK__` và chỉ import module control trong demo.
- `apps/web/src/shared/ui/components.tsx`: bảng dùng vùng cuộn ngang có tên truy cập được; hiện UI015 không chuyển bảng thành card và không đổi cách cuộn.

## Khoảng trống có căn cứ

1. Ba mock selectors không cần thiết trong thao tác thông thường ở viewport hẹp và tạo thêm vùng chiếm chiều cao. Căn cứ: cấu trúc Shell; UI015 thêm disclosure chỉ ở xs/sm.
2. E2E chưa có kiểm tra disclosure/focus và document overflow cho Inbox ở các chiều rộng nhỏ. UI015 bổ sung browser test 320/390/768/1280 CSS px.
3. Chưa có bằng chứng bàn phím native che/hay không che composer/send trên điện thoại hoặc browser mobile thật. Chỉ một lần kiểm tra thiết bị với bàn phím đang mở mới có thể đóng tiêu chí này; screenshot viewport/Playwright desktop không thay thế.

## Quyết định phạm vi

- Thu gọn controls bằng nút MUI có `aria-expanded`, `aria-controls`, Enter/Tab; giữ badge mô phỏng và cảnh báo luôn hiển thị. Desktop giữ controls luôn mở.
- Giữ layout Inbox, sticky behavior, table structure, cursor/history, API/permission boundaries và preview demo nguyên trạng khi không có reproduction chứng minh cần thay đổi.
- UI015.C04 được ghi PARTIAL cho đến khi có phép đo native soft keyboard trên thiết bị/browser mobile thật. Không tuyên bố UI015 DONE.
