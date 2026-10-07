# UI021.S02 — quyết định ghép UI và kiến trúc

**Ngày:** 03/10/2026 · **C02:** PASS · **Kết luận:** UI PASS, ARCH PRESERVED; không cần sửa source.

Crosswalk hiện hành xác nhận các control bị snapshot strict đánh dấu đều có action thật: React handler, React Router target, native file input lồng trong label, anchor tải file, hoặc submit button. Các owner đã đúng với cấu trúc hiện có: app Shell/router sở hữu navigation chung; workspace/catalog/knowledge/inbox giữ state và action trong module; Toolbar chỉ sở hữu thao tác query dùng chung.

Giữ nguyên các React/MUI Button semantics, RouterLink, download anchor, query/cursor owner, permission guard và form validation. Không thêm exception/allowlist cho auditor vì chưa có API runner/config đang dùng và một exception rộng có thể che button thật sự không hoạt động. Không thêm wrapper, shared action registry hoặc component generic chỉ để scanner nhận diện props React.

Nguồn ownership select trong premium-ui.json ghi Select/Listbox là authored; scope React không có thay đổi contract, route-manifest, design tokens, generated outputs, MSW behavior hoặc module boundary. Không sửa premium-audit.json của người dùng.
