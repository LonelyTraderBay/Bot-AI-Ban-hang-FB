# UI021.S05 — strict audit hiện hành và provenance

**Ngày:** 03/10/2026 · **Phạm vi:** `apps/web/src` · **Kết quả:** audit được chạy lại, strict scan exit 1; đây không phải PASS.

## Runner, cấu hình và lệnh

- Runner: skill `frontend-design-premium` v1.4.0 tại `scripts/audit_project.py`; SHA-256 `67FD35597C85A2F37DD3C566F0BD79768CBE059114EDCF28074FC5AFA3E0CE68`.
- Upstream skill resolution: `MATCH`; skill metadata file SHA-256 `02F3EC65D5CBE787FFED1812D6438971560EA8F00A6E8B9EB63846E6189163C2`.
- Config: [premium-ui.json](../../../premium-ui.json), SHA-256 `99723F9FD2485AC6634496AB259A8C1C0DEEB4E4B1B6B3079C1E82B799F7BCBB`; `sourceRoots` chỉ gồm `apps/web/src`.
- Lệnh đã chạy: `python <installed-frontend-design-premium-v1.4.0>/scripts/audit_project.py . --mode strict --config premium-ui.json --output evidence/frontend-ui-improvements/UI021/S05-current-frontend-design-audit.json`.
- Kết quả [JSON](S05-current-frontend-design-audit.json): strict mode, **exit 1**, 13 errors/violations, 0 warnings, 0 unresolved. Cả 13 đều cùng rule `affordance.actionless-button`.
- SHA-256 JSON kết quả: `F7902E3B69AD4B226BB4980F7F2015B53A61A6B93D304F4D02055C121D8A56C3`.
- Root [premium-audit.json](../../../premium-audit.json) vẫn là artifact của người dùng; SHA-256 trước và sau lần chạy được ghi nhận là `12E315CB06ABF4C2390EAC41C1C8E2C58472530ADFEC542F374CE621FB655A01`. Không sửa file này.

## Cách hiểu kết quả

Report hiện hành khác snapshot 02/10 có 12 finding: source React hiện tại có 13 anchor mà rule scanner gọi là button không hành động. Crosswalk ở [S05 current source crosswalk](S05-current-source-crosswalk.md) xác nhận các control này là RouterLink, reload handler, input file trong label, download anchor hoặc control có handler thật. Vì scanner không nhận dạng được một số semantics MUI polymorphic/JSX, các finding đó là **false positive đã crosswalk**, nhưng strict command vẫn exit 1; không ghi scan là PASS, không thêm allowlist và không sửa code chỉ để che rule.

Một điểm cần theo dõi riêng được phát hiện tại `ContactConsentPreview`: CTA tới R07 được render ngay cả khi `canReadCustomers` false. Canonical manifest quy định R35 cần `privacy.manage`, R07 cần `customers.read`; các role preset hiện có không chứa tổ hợp `privacy.manage` mà thiếu `customers.read` (chỉ `owner` có cả hai). Vì vậy tình huống permission-composition này chưa tái hiện được qua các vai trò demo chuẩn; ghi là **chưa xác minh**, không đánh đồng với 13 scanner false positive hoặc một lỗi đã xác nhận. Trước khi sửa, cần test được membership hợp lệ có tổ hợp quyền này hoặc xác nhận policy/backend cấp quyền tương ứng.

## Trạng thái checkpoint

- C01–C03 vẫn PASS theo inventory, quyết định ghép UI/architecture và targeted regressions đã lưu.
- C04 tiếp tục PARTIAL: current strict scan chạy được nhưng exit 1; không có cơ sở kết luận scanner PASS. `S04-design-audit-runner-status.md` là kết quả lịch sử trước khi runner skill được tìm thấy.
- C05 PASS sau khi lưu runner/version/config/output/hash, crosswalk mới và acceptance [S06](S06-acceptance.json).
- FE-G02/readiness không đổi bởi scanner: báo cáo hiện hành giữ FE-G01/02/03/04/06/07/08 PASS, FE-G05 manual và FE-G09 owner UAT còn mở; **7/9 = 77,8%** trong scope Frontend + synthetic mock API.

