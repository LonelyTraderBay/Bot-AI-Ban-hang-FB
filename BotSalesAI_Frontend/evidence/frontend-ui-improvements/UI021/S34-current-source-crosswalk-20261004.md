# UI021/S34 — current strict scan và crosswalk React source

**Ngày:** 04/10/2026 · **Phạm vi:** `apps/web/src`, `premium-ui.json`, strict mode · **HEAD:** `e68cb65e61c5c1aab2ae169dd8033df305df8872` · **Trạng thái:** scan exit 1; UI021 vẫn IN_PROGRESS 4/5, C04 PARTIAL.

## Kết quả và provenance

Chạy `frontend-design-premium` v1.4.0 trên đúng React source. Report hiện hành: [S34 JSON](S34-current-frontend-design-audit-20261004.json); stdout, command, thời điểm, exit code, runner/config/report SHA-256 và hash trước/sau của `premium-audit.json`: [S34 run log](S34-current-audit-run-20261004.log). Strict scan cho **13 errors/violations**, **0 warnings**, **0 unresolved**, đều là `affordance.actionless-button`, process exit **1**. Report SHA-256 `177E057F838073FF1083C7E72780EBD40B15481CC5CF3647928EB4197339FF99`.

Root `premium-audit.json` giữ SHA-256 `12E315CB06ABF4C2390EAC41C1C8E2C58472530ADFEC542F374CE621FB655A01` trước và sau; người dùng artifact không bị ghi đè. Report S34 khác report S32 vì line anchor Knowledge/shared UI đã dịch theo source, dù số lượng và rule không đổi. Đây là refresh trên current source sau S33/S34, không phải pass của scanner.

## Crosswalk đủ 13 finding

| Finding hiện tại | Hành vi thấy trong React source | Nhận định |
|---|---|---|
| `app/Shell.tsx:96` | MUI `Button` dùng `component={RouterLink}` và `to="/workspaces"`. | Link điều hướng chọn cửa hàng; detector không nhận diện polymorphic RouterLink. |
| `app/Shell.tsx:106` | Nút tên shop dùng `component={RouterLink}` tới `/workspaces`. | Link đổi cửa hàng thật. |
| `app/router.tsx:143` | Dòng route-error có nút `Tải lại` với `onClick={() => window.location.reload()}` và nút kế bên là RouterLink. | Hai hành vi khôi phục/điều hướng có thật; anchor dòng gộp không chỉ riêng một control. |
| `app/router.tsx:144` | NotFound CTA dùng RouterLink tới `/workspaces`. | Điều hướng thật. |
| `modules/catalog/imports.tsx:36` | MUI Button `component="label"` chứa file input CSV ẩn; `onChange` đọc/kiểm tra tệp và cập nhật draft. | Chọn tệp thật thông qua label-associated input. |
| `modules/catalog/imports.tsx:51` | Anchor có `href` từ `BASE_URL` và thuộc tính `download="botsales-products.csv"`. | Tải mẫu CSV thật. |
| `modules/inbox/index.tsx:93` | Nút quay lại dùng RouterLink với URL danh sách hội thoại do `inboxHref()` tạo. | Điều hướng thật, route/cursor vẫn thuộc Inbox. |
| `modules/knowledge/index.tsx:132` | Dòng JSX chứa action `Lưu bản nháp` có async mutation handler; cùng dòng có Button `component="label"` chứa file input với validation và `onChange`. Anchor nằm trong vùng `catch`/JSX được gộp dòng. | Submit draft và chọn/tải tệp có hành vi thật; Knowledge giữ ownership. |
| `modules/workspace/index.tsx:41` | Nhánh đăng nhập có `onClick` gọi `login()` cùng pending/disabled; nhánh đã có session là RouterLink. | Login hoặc điều hướng thật. |
| `modules/workspace/index.tsx:48` | CTA tạo shop và mở shop đều dùng RouterLink. | Điều hướng thật trong Workspace. |
| `modules/workspace/index.tsx:68` | Form tạo shop có `onClick` gọi `save()`; nút quay lại là RouterLink. | Submit/save và điều hướng thật. |
| `modules/workspace/index.tsx:232` | CTA tới danh sách khách là RouterLink, chỉ render khi `canReadCustomers`. | Điều hướng thật và tôn trọng permission ở UI; regression permission-edge hiện có 2/2. |
| `shared/ui/components.tsx:227` | `RouteLink` chuyển prop `to` vào MUI Button qua `component={RouterLink}`. | Shared navigation component có đích cụ thể; không cần no-op handler. |

## Kết luận theo UI + ARCH

- **UI:** source crosswalk tìm thấy hành vi link, reload, chọn tệp, tải xuống hoặc submit cho cả 13 anchors. Đây là kiểm tra source tĩnh; chưa phải click-through độc lập cho từng anchor.
- **ARCH:** `PRESERVED`; không sửa React source, API/OpenAPI, route manifest, permission source, design tokens, generated files, auditor, config, allowlist hay FE/product tracker.
- **Acceptance:** semantics thực tế không xóa strict errors. Giữ **C04 PARTIAL**, không tuyên bố auditor PASS. Cần scanner owner/reviewer phân xử rule semantics/upstream detector hoặc quyết định acceptance được ghi nhận rõ trước khi đóng.
- **Giới hạn phạm vi:** không chứng minh backend authorization, hosted CI, staging/production hoặc product-owner UAT.

SHA-256 source files dùng trong crosswalk:

| File | SHA-256 |
|---|---|
| `apps/web/src/app/Shell.tsx` | `423BCB9BB2D197459058F480C511EC5836AF9EB2C6D8CB276BF079304809AF54` |
| `apps/web/src/app/router.tsx` | `288F2F6B882623A72F583FE440487BC46297E601FCE2C3E59A2069D7BD3A36A8` |
| `apps/web/src/modules/catalog/imports.tsx` | `392FA4D18F22D4C565A49D84217420B0FBED4970F4121D1F688B1C978C685F86` |
| `apps/web/src/modules/inbox/index.tsx` | `8B527DAEBDC4B3388703DD593B6A771C449AFDF9BADCE6B821C9CF1C87A8685D` |
| `apps/web/src/modules/knowledge/index.tsx` | `2488E7AC7C35EE8BA50A47F086587B847DB563CA3FD8D33BADFBE8D48F8BC50A` |
| `apps/web/src/modules/workspace/index.tsx` | `14D4C9BA6F9F0F8D1B7F3C0AC114DDCC24C81C67C86A7BC7475FED3158F7543D` |
| `apps/web/src/shared/ui/components.tsx` | `979AF3FE07E53BD428CD75AE8F5DC8164C80D33914F0092A47AD1B9C4AE89157` |
