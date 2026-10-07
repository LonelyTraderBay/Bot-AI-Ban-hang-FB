# UI021/S10 — đối chiếu strict scan sau UI012/S30

**Ngày:** 03/10/2026 · **Phạm vi:** `apps/web/src`, cấu hình `premium-ui.json`, strict mode. **Trạng thái:** scanner tiếp tục exit 1; UI021 vẫn 4/5, C04 PARTIAL.

S10 chạy lại `frontend-design-premium` v1.4.0 trên source sau điều chỉnh nhãn Reports. Kết quả giống S09: cùng 13 anchor, tất cả rule `affordance.actionless-button`, 0 warning và 0 unresolved. Source thay đổi kể từ S09 chỉ nằm trong `apps/web/src/modules/reports/index.tsx`; file này không xuất hiện trong 13 anchor. Vì thế bảng semantics theo từng anchor trong [S09 crosswalk](S09-current-source-crosswalk.md) vẫn áp dụng nguyên vẹn. S10 không tìm thấy finding mới.

Kết quả strict **không được đổi thành PASS**: scanner báo 13 error/violation và process exit 1. Bản đối chiếu semantics ở S09 cho thấy các anchor tương ứng RouterLink, handler, file chooser, download hoặc submit thật; nếu muốn phân loại rule khác, cần scanner-owner/reviewer quyết định rõ scope hoặc upstream sửa detector. Không đổi scanner, cấu hình, allowlist hay UI để làm im finding.

- JSON current scan: [S10 report](S10-current-frontend-design-audit.json), 13/13 findings, exit 1.
- Provenance, command và hashes: [S10 provenance](S10-current-audit-provenance.md).
- Root `premium-audit.json` hash trước/sau vẫn `12E315CB06ABF4C2390EAC41C1C8E2C58472530ADFEC542F374CE621FB655A01`.
- **ARCH: PRESERVED.** S10 chỉ đọc source và ghi evidence; không đổi API/route/tokens/generated files, scanner/config hoặc ledger.
