# UI016 — readability và component boundaries: inventory

Ngày: 03/10/2026 · Kiểu kiểm tra: TypeScript AST/source measurement trên working tree hiện tại.

## Số đo tái lập

Đếm component function/arrow function viết hoa bằng AST, gồm toàn bộ span của node; đếm dòng source vượt 1.500 ký tự riêng biệt. Số này là tín hiệu cần review, không tự chứng minh runtime chậm hoặc cần tách.

- 18 dòng trong `apps/web/src/modules` dài hơn 1.500 ký tự.
- Sáu component lớn nhất hiện tại: `ReplenishmentPage` 15.255 ký tự; `ShipmentsPage` 14.109; `DevicesPage` 13.352; `OrderDetailPage` 12.540; `ReportsPage` 12.089; `ProductEditorPage` 11.540.
- `ConversationPanel` ở `apps/web/src/modules/inbox/index.tsx:52` là 11.348 ký tự và chứa bốn dòng trên 1.500 ký tự. Một function hiện giữ ba trách nhiệm/state groups: messages/paging/rating, reply/internal-note draft/send, customer/context assignment/read references. JSX message rows, composer, context panel và dialogs nằm trong cùng return tree.
- Chọn Inbox ConversationPanel làm phạm vi hẹp: UI015 vừa kiểm tra Inbox; `tests/fe016.spec.ts` có browser coverage cho mobile cursor/draft/Back, message paging, send/unknown-send, role permissions, context references và feedback. Việc tách state composer/context về child components giữ owners gần đúng vùng UI mà không đổi operation/route behavior.

## Phạm vi chọn

- Tách composer state + send/note commands thành component cùng module, message-row rendering thành component thuần, context query/assignment state thành component cùng module.
- Giữ route entry `InboxPage`, parent ownership của list/message cursors, URL behavior, mutation semantics, permission gates và source-preview demo components.
- Không refactor sáu component lớn nhất chỉ vì chúng dài; không đổi API, cache semantics, styling, keyboard behavior, layout hoặc dependency. Chạy FE016 regression/full suite, boundary checker, lint/type/build.
