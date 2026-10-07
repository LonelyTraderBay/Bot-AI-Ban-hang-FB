# UI021/S09 — crosswalk strict scan với React source hiện hành

**Ngày:** 03/10/2026 · **Phạm vi:** đúng React source `apps/web/src`, cấu hình `premium-ui.json`, strict mode. **Snapshot:** sau UI012/S27; HEAD `e68cb65e61c5c1aab2ae169dd8033df305df8872`, working tree đang dirty.

## Kết quả scan

Lệnh đã chạy: `python <frontend-design-premium v1.4.0>/scripts/audit_project.py . --mode strict --config premium-ui.json --output evidence/frontend-ui-improvements/UI021/S09-current-frontend-design-audit.json`. Runner exit **1**; report có 13 errors/violations, 0 warnings, 0 unresolved. Cả 13 finding cùng rule `affordance.actionless-button`. Root `premium-audit.json` giữ SHA-256 `12E315CB06ABF4C2390EAC41C1C8E2C58472530ADFEC542F374CE621FB655A01` trước/sau.

## Đối chiếu đủ 13 anchor

| Anchor hiện hành | Semantics trong React source | Đánh giá UI / owner |
|---|---|---|
| `apps/web/src/app/Shell.tsx:96` | `Button component={RouterLink}` tới `/workspaces`. | Điều hướng chọn cửa hàng; Shell sở hữu điều hướng. |
| `apps/web/src/app/Shell.tsx:106` | `Button component={RouterLink}` tới `/workspaces` cho shop hiện tại. | Điều hướng đổi cửa hàng thật. |
| `apps/web/src/app/router.tsx:143` | Nút `Tải lại` có `onClick` gọi `window.location.reload()`; cạnh bên là RouterLink. | Hành động khôi phục và lối thoát đều có thật. |
| `apps/web/src/app/router.tsx:144` | NotFound button dùng RouterLink tới `/workspaces`. | Điều hướng thật. |
| `apps/web/src/modules/catalog/imports.tsx:36` | Button label bao file input CSV ẩn; `onChange` đọc, kiểm tra và đưa file vào draft. | Chọn CSV thật; Catalog sở hữu import draft. |
| `apps/web/src/modules/catalog/imports.tsx:51` | Anchor `href` + `download` tải mẫu CSV. | Tải file thật. |
| `apps/web/src/modules/inbox/index.tsx:93` | Button RouterLink về URL danh sách hội thoại. | Quay lại danh sách thật; Inbox giữ route/cursor. |
| `apps/web/src/modules/knowledge/index.tsx:129` | Cụm dòng chứa nút lưu draft có handler mutation/retry và label bao file input có validate/change handler. | Submit/upload thật; Knowledge sở hữu form và tệp. |
| `apps/web/src/modules/workspace/index.tsx:41` | Nhánh chưa đăng nhập gọi `login()` với pending/disabled; nhánh có session là RouterLink. | Login/điều hướng thật. |
| `apps/web/src/modules/workspace/index.tsx:48` | CTA tạo shop và mở shop dùng RouterLink. | Điều hướng thật theo Workspace ownership. |
| `apps/web/src/modules/workspace/index.tsx:68` | Form có submit/save handler, validation và liên kết quay lại. | Submit/điều hướng thật; Workspace sở hữu form. |
| `apps/web/src/modules/workspace/index.tsx:232` | CTA R35 tới R07 là RouterLink và chỉ render khi `canReadCustomers`. | Link hoạt động, đồng thời tôn trọng quyền route đích; UI021 regression kiểm tra 2/2 ở S08. |
| `apps/web/src/shared/ui/components.tsx:221` | `RouteLink` chuyển `to` thành RouterLink. | Thành phần điều hướng dùng chung; không cần registry giả để làm scanner im lặng. |

## Kết luận theo cặp UI + ARCH

- **UI:** 13 finding được kiểm lại tại các anchor hiện hành; không tìm thấy nút rỗng trong 13 trường hợp. Riêng R35→R07 đã được sửa theo `customers.read` và có regression tổng hợp 2/2.
- **ARCH:** `PRESERVED`; route/module owners, quyền canonical và API boundary được giữ nguyên. Không sửa OpenAPI, route manifest, design tokens, generated files, scanner, allowlist hoặc root audit.
- **Trạng thái acceptance:** crosswalk giúp phân loại semantics nhưng **không biến strict exit 1 thành PASS**. UI021.C04 còn PARTIAL; item giữ 4/5. Tool upstream cần hiểu các polymorphic MUI/RouterLink/file-label semantics hoặc tiêu chí strict phải được chủ repo chấp thuận rõ ràng.
- **Giới hạn:** đây là static scan + đọc source. Không chứng minh backend authorization, remote CI, staging/production hoặc owner UAT. E2E hiện hành tham chiếu riêng UI012/S27 (193/193 local Chromium + synthetic MSW).

Xem [S09 strict JSON](S09-current-frontend-design-audit.json), [S09 run log](S09-current-audit-run-20261003.log), [S09 provenance](S09-current-audit-provenance.md), [S09 acceptance](S09-acceptance.json) và [S09 fingerprint](S09-current-scan-fingerprint.json). S08 remains historical and contains the route-permission source/test detail.
