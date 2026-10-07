# UI021.S01 — đối chiếu design-audit với React source hiện tại

**Ngày:** 03/10/2026 · **Phạm vi:** apps/web/src · **Kết quả:** C01 PASS (inventory; không phải kết quả chạy lại scanner).

## Nguồn và độ mới

- premium-audit.json ở root là artifact người dùng, SHA-256 12E315CB06ABF4C2390EAC41C1C8E2C58472530ADFEC542F374CE621FB655A01. Artifact có 25 findings: 16 dưới apps/web/src, 8 prototype ngoài phạm vi, 1 test; tổng 2 unresolved + 23 violation. Không sửa artifact này.
- Latest audit output được lưu là evidence/frontend-design-audit-current-20261002.json, schemaVersion 1, mode strict, 12 errors/violations, 0 unresolved. Báo cáo ngày 02/10 ghi exit 1. Kết quả này là snapshot lịch sử, không được tuyên bố là lần chạy hiện tại sau các thay đổi UI017–UI020.
- premium-ui.json khai báo nguồn React là apps/web/src và ownership Select/Listbox là authored. Native/MUI select ownership finding trong root artifact không còn được xem như finding hiện hành.
- Không tìm thấy design-auditor command, npm script hoặc executable trong repo/environment này. Vì vậy không sinh audit output mới, không suy đoán tool version và không thay đổi scanner config.

## Crosswalk 12 findings trong snapshot strict gần nhất

| Finding snapshot | Hành vi đang có trong React source | UI outcome | Owner / invariant kiến trúc | Bằng chứng |
|---|---|---|---|---|
| Shell.tsx:96 | Nút “Chọn cửa hàng” là MUI Button được RouterLink gắn đích /workspaces. | Điều hướng tới danh sách cửa hàng. | Shell sở hữu quyền/điều hướng dùng chung; Router sở hữu URL. | FE009 và frontend browser specs. |
| Shell.tsx:106 | Nút tên cửa hàng hiện tại cũng là RouterLink tới /workspaces. | Người dùng có thể đổi cửa hàng. | Không tự cập nhật shopId qua state rời; route là nguồn ngữ cảnh. | FE009 / FE016 workspace cases. |
| router.tsx:143 | RouteError có nút tải lại dùng window.location.reload và nút chọn cửa hàng dùng RouterLink. | Phục hồi route lỗi hoặc rời ngữ cảnh hiện tại. | RouteError thuộc app router; không giả vờ bản nháp chưa gửi đã lưu. | Frontend chunk-recovery browser case. |
| router.tsx:144 | NotFound dùng RouterLink “Về cửa hàng” tới /workspaces. | Có lối ra khỏi route không tồn tại. | Router điều khiển navigation. | Source hiện hành; route-error recovery test. |
| catalog/imports.tsx:36 | Nút label bao input file hidden; onChange kiểm loại/kích thước và cập nhật draft. | Chọn CSV và xem lỗi trước preview. | Catalog sở hữu file/import draft; không gửi khi chọn file. | FE010 CSV preview/limit tests; UI012 keyboard CSV chooser. |
| catalog/imports.tsx:51 | MUI Button render anchor với href và download cho file CSV mẫu. | Tải file mẫu. | Liên kết download là navigation browser; không cần onClick giả. | FE010 sample-download assertion. |
| inbox/index.tsx:94 | Icon nằm trong Button tại dòng hiện hành 93, component RouterLink tới inboxHref(). Đây là nút về danh sách, không phải send/note mutation. | Mobile quay lại danh sách hội thoại. | Inbox sở hữu route và cursor danh sách; message cursor riêng. | UI002/FE016: ba browser regressions trong S03-inbox-navigation.log. |
| knowledge/index.tsx:125 | Anchor cũ đã trôi: dòng 125 hiện là create.execute; nút file hiện nằm ở dòng 129, component label với input hidden và onChange validate PDF/TXT/CSV, dung lượng. | Chọn nguồn tệp; lỗi loại/kích thước được giữ trong form. | Knowledge sở hữu upload/fileId và draft lifecycle. | FE017 upload/validation browser tests. |
| workspace/index.tsx:41 | Nút login gọi login() khi chưa có session; nhánh có session là RouterLink. Nút bị disable khi pending/loading. | Đăng nhập hoặc tiếp tục tới workspace. | Workspace sở hữu session entry và pending state. | FE009 workspace tests; frontend live-session failure case. |
| workspace/index.tsx:48 | Có link tạo cửa hàng tới /onboarding và link từng card tới /s/{shopId}/overview. | Tạo/chọn cửa hàng. | Shop scope đi qua Router; không dùng ID của card cũ sau đổi shop. | FE009 onboarding/shop-card tests. |
| workspace/index.tsx:68 | Nút tạo cửa hàng gọi save() với validation/disable state; nút quay lại là RouterLink. | Lưu cấu hình hợp lệ hoặc quay lại workspace. | Form draft cục bộ tới lúc submit; API mock trả kết quả qua module hook. | FE009 onboarding creates shop case. |
| shared/ui/components.tsx:191 | Anchor cũ đã đổi nghĩa: dòng hiện tại là IconButton “Xóa tìm kiếm”, onClick gọi clearSearch; nút submit ở dòng 192. | Xóa query, giữ filter khác, trả focus; submit tìm kiếm. | Shared Toolbar sở hữu query string chung, không sở hữu dữ liệu nghiệp vụ của module. | apps/web/tests/components.test.tsx search-clear test; FE010 search browser cases. |

**Phân loại hiện tại:** 12/12 finding snapshot đã được đối chiếu bằng source. Không tìm thấy nút hiện hành nào trong các crosswalk này bị thiếu hành vi. Ba mapping trong reconciliation 02/10 đã cần chỉnh theo source mới: Inbox không gọi send/note, Knowledge line 125 không còn là upload control, shared line 191 hiện là search-clear action. Đây là kết quả source review + test chọn lọc; không thay thế việc chạy lại design auditor.

## Giới hạn

Root premium-audit.json, latest strict JSON và bản reconciliation 02/10 được giữ nguyên. Không tính findings prototype/test thành lỗi React. Không đổi copy/action hoặc xóa button để scanner cũ im lặng. Strict audit hiện hành sau UI017–UI020 và tool version vẫn CHƯA XÁC MINH.
