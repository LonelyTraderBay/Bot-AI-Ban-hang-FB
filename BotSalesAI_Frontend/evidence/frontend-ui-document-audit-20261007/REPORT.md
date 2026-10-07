# Audit tài liệu và tiến độ UI — 07/10/2026

**Phạm vi:** audit source/tài liệu/evidence local của Frontend React/TypeScript và các nguồn liên quan trong kit. Đây là kết quả audit, không phải policy, tracker hoặc chứng nhận hoàn tất UI mới. Không sửa mã sản phẩm, canonical progress, tài liệu nguồn hoặc xóa file trong lượt này. Các thay đổi spacing có sẵn được giữ nguyên.

**Baseline:** Git HEAD `70cbfad18a367a1ed028dd8f2b03bfb24b0de9bf`, working tree có thay đổi local; inventory tài liệu được lấy lúc `2026-10-07T05:30:05.788Z`. Chi tiết file/hash/link nằm trong [audit-current.json](audit-current.json); kết quả lệnh đọc hiện trạng nằm trong [checks-current.json](checks-current.json).

## 1. Kết luận tiến độ

Không có phép đo phần trăm lượng code đúng cho toàn bộ UI. Có thể đo task/checkpoint đã ghi nhận, coverage cấu trúc và độ mới của bằng chứng; các phép đo này có ý nghĩa khác nhau.

| Phép đo | Kết quả | Ý nghĩa và giới hạn |
|---|---|---|
| Backlog UI001–UI028, bảng task | 27/28 DONE = **96,43% task**; 137/140 = **97,86% checkpoint** | UI028 ở dòng 268 còn IN_PROGRESS 2/5. Đây là số theo bảng tài liệu, không phải phần trăm source hoặc acceptance. |
| Tổng kết cùng kế hoạch | Ghi **140/140**, UI028 5/5; bảng W01–W36 ghi 36/36 DONE | Mâu thuẫn với bảng task; chưa có một số tiến độ UI thống nhất. |
| Rollout §16.6 | 19/19 bước bắt buộc được ghi đóng; 19/20 nếu tính S13 optional = **95%** | S13 TODO_OPTIONAL_CLEANUP. Nhãn đóng bước không tự chứng minh evidence vẫn còn hiệu lực. |
| Cấu trúc runtime hiện có | **54 route**, **27 public React functions**: 21 components + 6 compositions | Source có triển khai; số route/API không chứng minh mọi state, spacing hay hành vi đều đúng. Hai notice có lifecycle conditional, không bắt buộc tạo consumer giả. |
| FE tracker tính lại hiệu lực | **0/140 VERIFIED = 0% evidence hiện hành**; 28 task STALE | Ledger lưu các bước đã làm, nhưng dependency/fingerprint không còn hiệu lực. Không có nghĩa code đã trở về 0%. |
| Manifest evidence | S17 PASS; **S19 FAIL, 10 vấn đề** | S17 là deliverable validator; S19 là reconciliation tổng thể. E2E 504/504 cũ chưa xác nhận source hiện tại. |

Kết luận: UI đã có triển khai rộng và tài liệu ghi nhận technical handoff, nhưng chưa thể xác nhận “100% hoàn tất trên source hiện tại”. Số 97,86% là phép tính từ bảng backlog còn lệch trạng thái, không phải ước lượng phần code còn thiếu.

## 2. Phạm vi kiểm tra

Inventory bao gồm **382 file tài liệu** tracked/untracked trước khi thêm báo cáo này, phân loại theo owner/vai trò:

| Vai trò | Số file |
|---|---:|
| Tài liệu điều hành hiện hành | 62 |
| Evidence/snapshot | 197 |
| Đặc tả full-product để tham chiếu | 85 |
| Generated frontend views | 30 |
| Template generator | 1 |
| Audit tài liệu lịch sử | 2 |
| Reference lịch sử | 4 |
| Prototype reference | 1 |

Đã kiểm hash/duplicate và đường dẫn Markdown trên inventory; đối chiếu nội dung các nguồn điều hành UI, tracker, generator, catalog/types/source và manifests liên quan. Không tuyên bố đọc ngữ nghĩa từng dòng của toàn bộ 382 file. Không scan thư mục dependency/build bị Git ignore, HTML links hoặc web bên ngoài; fenced examples bị loại khỏi link scan.

## 3. Findings cần xử lý

### P1 — Tiến độ UI và trạng thái hiện hành tự mâu thuẫn

- [UI plan: bảng task dòng 268](../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md) vẫn để UI028 IN_PROGRESS 2/5, trong khi dòng 67/80 và phần đóng UI028 ghi 140/140, 5/5, 36/36.
- Dòng 70 ghi FE hiệu lực 140/140, stale rỗng; lệnh tracker hiện tại trả 0/140, 28 task STALE, không BLOCKED. Bước kế tiếp FE001.S01 ghi `Changed source AGENTS.md`; các task sau chịu dependency stale.
- Generated [IMPLEMENTATION_PLAN](../../../botsales-kit/IMPLEMENTATION_PLAN.md) hiện ghi 0/140, phù hợp tracker tính lại. Không sửa generated output bằng tay để tăng phần trăm.

**Tác động:** người đọc không xác định được trạng thái current, implementation lịch sử và evidence freshness.

**Cách sửa:** giữ §16.6 làm nguồn status; chuyển summary cũ thành snapshot có ngày/fingerprint. Đối chiếu checkpoint UI028 với evidence rồi đồng bộ bảng task tại owner. FE phải tái xác minh bằng tracker theo dependency sau khi source ổn định; không chỉ sửa số/hash.

### P1 — S19 và inventory-final không còn current

[S19-current-evidence.json](../frontend-ui-improvements/ui-governance-rollout-20261007/S19-current-evidence.json) có **9 fingerprint đổi và 1 đường dẫn không tồn tại**. Đường dẫn thiếu là `BotSalesAI_Frontend/botsales-kit/contracts/route-manifest.json`; kit hiện nằm cạnh Frontend tại repository root. Danh sách đầy đủ trong audit JSON và output validator.

[inventory-final-20261007.json](../frontend-ui-improvements/ui-governance-rollout-20261007/inventory-final-20261007.json) có 378 current-path rows, trong đó **116 original paths không còn ở vị trí ghi nhận**, tất cả dưới `botsales-kit/` tương đối với Frontend, và **55 hash thay đổi**. Các số này chỉ đo freshness/relocation, không tính thành phần trăm code lỗi. Inventory ghi thêm một retired workflow disposition, nên tổng dispositions là 379.

`package.json:28` chỉ validate S17 trong `test:evidence`; `verify` gọi gate này. Do vậy verify PASS không tự chứng minh S19 còn hợp lệ. Lượt audit đã validate S19 riêng và nhận exit 1.

**Cách sửa:** giữ snapshot/log cũ nguyên vẹn; sinh inventory từ vị trí repository hiện tại, chạy evidence theo impact trên source cuối, rồi tạo reconciliation/manifest mới. Chỉ cập nhật final/current pointers sau khi validator và coverage thật đạt. Không thay hash cơ học để giữ kết quả E2E cũ.

### P1 — Generator tài liệu có thể tái sinh hướng dẫn sai scope

Lệnh `python scripts/sync-release.py --check` tại kit nhận exit 1: `RELEASE_DOC_DRIFT: DOCUMENT_INDEX.md, ARCHITECTURE_BLUEPRINT.md`.

- `scripts/sync-release.py:23–25` sinh navigation từ `execution/plan.json`, `progress.json`, `PLAN_GUIDE` full-product; `:44–45` tiếp tục mô tả lộ trình report cũ.
- `:51` gắn 84 task/420 bước vào IMPLEMENTATION_PLAN; bản IMPLEMENTATION_PLAN hiện được sinh cho FE001–FE028/140 bước.
- `DOCUMENT_INDEX.md:14–18` đã chỉ đúng frontend sources, nhưng đoạn lộ trình cuối file còn nguồn full-product. Chạy generator nguyên trạng có thể ghi lại navigation cũ.
- `ARCHITECTURE_BLUEPRINT.md:14` còn gắn 84/420 vào IMPLEMENTATION_PLAN. `UPGRADE.md:4` bảo bắt đầu T001, trái với START_HERE, PROJECT_BUILD_PROMPT và AI_RULES_PROJECT giao FE001.

**Cách sửa:** cập nhật owner generator/navigation để tách rõ frontend active và full-product reference; sửa UPGRADE source rồi regenerate/check. Giữ nguyên full-product plan/progress, không xóa đặc tả Backend/reference chỉ vì chưa có backend source.

### P2 — Entry docs và catalog còn trạng thái/version cũ

| File/vị trí | Nội dung cần đồng bộ |
|---|---|
| README.md:5 | Ghi workflow v1.26, đang S09 và S10–S20 còn mở; chuẩn hiện là v1.28, plan ghi S20 handoff. |
| docs/FRONTEND_SPACING_STANDARD.md:76 | Nhãn “Bằng chứng enforcement hiện hành” vẫn để S09/S10/S14–S20 mở. |
| botsales-kit/AI_RULES_PROJECT.md:19 | Vẫn nói S10/S14 đang mở và gọi report audit/specification 06/10 là “report hợp nhất” trong current navigation. |
| shared/ui/README.md:3,7,96,111 | Vừa ghi S19 còn review/TARGET chưa implement, vừa ghi S19 đã đối chiếu current snapshot; phải mô tả CURRENT/TARGET và historical evidence nhất quán. |
| shared/ui/README.md:61,65 và line references | Ghi FormFields 72 uses, PageSections 9 uses; JSX named uses hiện là 73 và 10. PageSections/SectionGrid source lines hiện 61/73 thay cho 59/71. |
| docs/FRONTEND_SPACING_STANDARD.md:280 | Anchor `#8-layout-owner-crosswalk` không khớp heading có suffix “— 39 path cần nêu rõ” ở catalog:117; cần stable explicit anchor hoặc sửa link. |

**Cách sửa:** tài liệu hướng dẫn trỏ status source thay vì nhân bản status/count/version. Catalog giữ API/owner/current-target; lịch sử đo/check phải có scope/ngày/source hash rõ. Không biến các ví dụ TARGET thành lời cam kết runtime khi chưa kiểm chứng.

## 4. File cũ: giữ, archive hay xóa?

**Chưa tìm thấy file dư đã đủ bằng chứng để xóa an toàn.** Hash toàn bộ inventory chỉ tìm được một nhóm byte-identical: Frontend/AI_RULES.md và kit/AI_RULES.md. Cả hai là bản nguyên gốc cần cho phân phối riêng từng component; root AGENTS và kit release validator yêu cầu bảo toàn. Không xóa một bản vì trùng nội dung.

| Nhóm/file | Đề xuất | Lý do |
|---|---|---|
| docs/FRONTEND_PLAN_DOCUMENT_AUDIT_2026-10-04.md và ...2026-10-05.md | Có thể chuyển archive sau khi sửa các current navigation/reference liên quan | Audit cũ, còn được plan/session handoff/FE evidence và scripts tham chiếu; không xóa trực tiếp. |
| Evidence Wxx/FE/Sxx, logs/PNG/manifests đã có | Giữ historical, thêm current pointer ở owner khi có evidence mới | Là provenance và baseline, có tham chiếu/hash; ngày cũ không có nghĩa dư. |
| Kit docs/ARCHITECTURE_BLUEPRINT/full-product tasks/reference/prototype | Giữ đúng vai trò; sửa generator/current navigation nếu cần | Contract/reference/generated owner khác nhau; không phải bản source UI trùng. |
| BotSalesAI_Frontend/botsales-kit/IMPLEMENTATION_PLAN.md đang mở trong IDE | Đóng tab cũ; mở ../../../botsales-kit/IMPLEMENTATION_PLAN.md từ báo cáo này | Đường dẫn nested hiện không tồn tại; không có file thực để xóa và không tạo kit copy mới. |

Link scan kiểm **3.558 occurrences**, ghi **1.309 raw problems**: 1 thuộc active documents (anchor nói trên), 1.288 thuộc evidence/snapshots, 10 thuộc audit lịch sử và 10 thuộc FRONTEND_PLAN_GUIDE template. Template dùng đường dẫn cho vị trí generated output ở kit root nên 10 mục này không phải link lỗi trong generated kế hoạch. Phần lớn lỗi snapshot phản ánh kit relocation; không sửa hàng loạt lịch sử/hash để làm đẹp số link.

## 5. Thứ tự xử lý đề xuất

1. Sửa scope/navigation trong generator và UPGRADE nguồn, regenerate bằng công cụ owner; giữ full-product tracker read-only.
2. Đồng bộ summary UI028/README/standard/catalog với status owner; gắn nhãn ngày/fingerprint cho các snapshot cũ, sửa stable anchor.
3. Sau source cuối, capture lại evidence/inventory/reconciliation theo impact; validate S19 riêng và tái xác minh FE dependency bằng tracker chuẩn. Bằng chứng không đủ phải ghi NOT_RUN/STALE, không nhận lại 100% chỉ bằng cập nhật tài liệu.
4. Archive hai audit cũ nếu muốn gọn navigation, xử lý references trước; giữ evidence gốc và AI_RULES component copies.

## 6. Kiểm chứng và giới hạn lượt audit

- `node ../botsales-kit/scripts/progress.mjs status`: đọc trạng thái canonical hiệu lực, không chỉnh ledger.
- Validator S17: PASS; validator S19: FAIL 10 vấn đề.
- `python scripts/sync-release.py --check`: FAIL drift hai generated documents, không sinh đè.
- Không chạy lại build/full E2E trong lượt audit tài liệu này. Log verify sau sửa spacing của lượt trước tại [verify-current-20261007.log](../frontend-ui-improvements/ui-governance-rollout-20261007/spacing-role-audit-20261007/verify-current-20261007.log) được giữ làm evidence theo scope của nó; không dùng để hợp thức S19 hoặc full E2E cũ.
- Không xác nhận hosted CI, Narrator/screen-reader speech, owner acceptance, Backend integration, staging hoặc production. Source hiện tại là Frontend local/mock.
- Không xóa/di chuyển file, không chỉnh product code/canonical docs/tracker trong audit. Chỉ thêm thư mục evidence audit này.
