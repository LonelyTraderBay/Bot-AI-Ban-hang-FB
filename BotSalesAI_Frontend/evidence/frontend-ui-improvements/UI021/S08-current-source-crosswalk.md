# UI021.S08 — crosswalk 13 finding của strict scanner với React source

**Ngày:** 03/10/2026 · **Phạm vi:** `apps/web/src` · **Nguồn:** S08 strict report sau permission-edge fix (exit 1).

| Finding hiện hành | Hành vi thực trong React | Kết quả đối chiếu UI/owner |
|---|---|---|
| `app/Shell.tsx:96` | MUI Button được render với RouterLink tới `/workspaces`. | Điều hướng workspace thật; Shell/router sở hữu route. |
| `app/Shell.tsx:106` | MUI Button được render với RouterLink tới `/workspaces`. | Điều hướng để đổi cửa hàng thật; không phải nút rỗng. |
| `app/router.tsx:143` | Route error có `window.location.reload()` và link RouterLink tới workspace. | Có hành động phục hồi/lối thoát thật. |
| `app/router.tsx:144` | NotFound dùng RouterLink quay về workspace. | Điều hướng thật. |
| `modules/catalog/imports.tsx:36` | Label chứa input file ẩn; `onChange` đọc file, validate và cập nhật draft. | Chọn CSV thật; Catalog sở hữu file/import draft. |
| `modules/catalog/imports.tsx:51` | MUI Button render anchor có `href` và thuộc tính `download`. | Tải mẫu CSV thật; không cần onClick giả. |
| `modules/inbox/index.tsx:93` | Nút quay lại dùng RouterLink theo URL inbox. | Điều hướng thật; Inbox giữ route/list cursor. |
| `modules/knowledge/index.tsx:129` | Dòng JSX lớn gồm control submit/save có handler và label/input upload có validate file. | Các control có hành vi; Knowledge sở hữu form và file draft. |
| `modules/workspace/index.tsx:41` | Nhánh chưa đăng nhập gọi login; nhánh khác là RouterLink. | Đăng nhập/điều hướng thật; pending có disable. |
| `modules/workspace/index.tsx:48` | Link tạo cửa hàng và mở từng shop dùng RouterLink. | Điều hướng thật theo shop scope. |
| `modules/workspace/index.tsx:68` | Nút submit gọi save với validation; link còn lại quay về workspace. | Submit/điều hướng thật; Workspace sở hữu form. |
| `modules/workspace/index.tsx:232` | CTA “Mở danh sách khách đầy đủ” dùng RouterLink tới R07. | Link hoạt động, vì vậy finding “actionless” là false positive. Tách biệt, visibility khi không có `customers.read` là một permission-composition case chưa được test; xem phần dưới. |
| `shared/ui/components.tsx:221` | `RouteLink` dùng MUI Button với RouterLink `to`. | Component điều hướng dùng chung; không tạo action registry để thỏa scanner. |

## Permission edge cần kiểm chứng riêng

Trang R35 có `readPermission: privacy.manage`; đích R07 có `readPermission: customers.read`. `ContactConsentPreview` ẩn nội dung/checkbox khi `canReadCustomers` false nhưng vẫn render link đến R07. Trong `permission-catalog.json`, 7 role preset hiện hành có owner với cả hai quyền; không preset nào có `privacy.manage` mà thiếu `customers.read`. `setRole()` của mock chỉ chấp nhận preset có trong catalog.

R35 và R07 độc lập theo `route-manifest.json`, nên UI phải tôn trọng quyền của route đích. Link nay chỉ render khi `canReadCustomers` true. [S08 browser regression](../../../tests/ui021-permission-edge.spec.ts) dùng session tổng hợp giữ `privacy.manage` nhưng bỏ `customers.read`: R35 vẫn mở, CTA bị ẩn, và truy cập trực tiếp R07 bị từ chối. Phiên owner mặc định vẫn thấy link và điều hướng thành công. Kết quả targeted là 2/2 PASS; không thay catalog role/contract, không suy rộng thành policy cấp quyền của Backend.

## Kết luận

13/13 finding đã được đối chiếu tới hành vi đang có; riêng CTA R35→R07 được sửa theo quyền route đích và kiểm bằng regression. Không sửa scanner, config hoặc root `premium-audit.json` để loại finding. Strict audit hiện hành vẫn exit 1 cho tới khi rule nhận diện đúng semantics React/MUI hoặc runner upstream có cách đánh giá tương đương. Xem [S08 strict report](S08-current-frontend-design-audit.json) và [S08 current verification](S08-permission-edge-and-current-verification.md).
