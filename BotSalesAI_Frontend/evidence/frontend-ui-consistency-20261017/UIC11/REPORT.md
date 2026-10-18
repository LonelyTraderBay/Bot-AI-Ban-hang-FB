# UIC11 — Đối soát tài liệu, inventory và freshness FE

**Trạng thái:** LOCAL_RECONCILED_WITH_HISTORICAL_BASELINE_LIMITS; phần ghi nhận ban đầu bên dưới là snapshot trước rebase và được mục “Đối soát cuối trên SHA UIC10 đã rebase” ở cuối báo cáo thay thế khi số liệu/SHA mâu thuẫn. Phạm vi là đối soát; không cập nhật ledger tiến độ.

## Nguồn và phương pháp

Reconciliation dùng immutable Git tree, so baseline 4a502be79a40cd7dc02c1eaa80445665a226b55f với final source HEAD UIC10 85e2a677951e0e46aef6919e775de3e0c0d54103, branch codex/uic07-corrected-sequence. Working-tree docs không tham gia phép so final source. Kết quả chi tiết và path-by-path hashes tại [final-inventory-reconciliation.json](final-inventory-reconciliation.json); script và raw log nằm cùng thư mục.

## Kiểm kê và xử lý thay đổi

Inventory đầu vào UIC01 có **329** entry: **282** giữ nguyên, **47** đổi, **0** xóa. Git diff từ baseline đến final HEAD có **801** path: **748 added**, **53 modified**. Cả 801 path có disposition và commit owner; mọi final file được fingerprint.

Dispositions theo path: documentation 1, edit/verify 3, frontend source 1, generate/verify 2, keep/verify 13, evidence mới 743, thay đổi tracked khác 1, test/tooling 11, tooling/verify 26. Phép đối soát kết luận không path nào thiếu treatment hoặc owner.

Có **4** SHA256 đã capture trong inventory lịch sử UIC01 không khớp hash tính lại từ baseline Git tree: BotSalesAI_Frontend/STACK_LOCK.md, BotSalesAI_Frontend/docs/CONTINUE_FRONTEND.md, BotSalesAI_Frontend/docs/FRONTEND_UI_IMPROVEMENT_PLAN.md, BotSalesAI_Frontend/premium-audit.json. Hai file hiện không đổi so baseline; hai tài liệu được thay đổi trong chuỗi sau đó. Mismatch được giữ làm giới hạn lịch sử, không sửa ngược artifact và không tuyên bố toàn bộ baseline inventory hash PASS. Reconciliation script giữ exit code 1 vì đúng điều kiện này; kết quả đối soát path/disposition vẫn được lưu đầy đủ.

## Owner CLI và generated documents

Từ BotSalesAI_Frontend, owner generator node ../botsales-kit/scripts/progress.mjs report exit 0 và tạo **31** output. Owner commands validate và status đều exit 0. Receipt tại [progress-cli-receipt.json](progress-cli-receipt.json), raw logs và exit files cùng thư mục.

Trạng thái FE hiện đo được là **0/140 checkpoint hiệu lực (0%)**, **28/28 task STALE**, **0 BLOCKED**. FE001/S01 là bước kế tiếp; nguyên nhân stale đầu tiên ghi Changed source apps/web/src/app/Shell.tsx. Đây là freshness của tracker FE, không phải tỷ lệ hoàn thiện code hay trạng thái UIC. Hash hai owner inputs execution/frontend-plan.json và execution/frontend-progress.json được ghi trong receipt; không sửa frontend-progress.json hoặc full-product progress.json.

## S17 freshness refresh và full verify hiện hành

Sau khi đồng bộ tài liệu, lần đọc S17 phát hiện chính xác hai stale reference: fingerprint source của BotSalesAI_Frontend/evidence/REPORT.md và hash log-reference của check uic03-msw-update-recovery tới UIC03/REPORT.md. Unit validator đạt 11/11 nhưng S17 validator trả exit 1 trên đúng hai hash này. Lượt gọi npm test:evidence ban đầu không khởi chạy được vì child PATH không thấy node; chạy trực tiếp bằng Node xác nhận stale path, rồi dùng PATH con tối giản có Node/Git để gọi lại package script.

Helper [refresh S17](refresh-s17-document-fingerprints.mjs) chỉ cho phép hai path stale đã đo, dừng nếu có path khác, cập nhật hash và ghi check/coverage receipt. [Log làm mới](s17-document-fingerprint-refresh.log) ghi cả hai SHA được thay. Sau refresh, [test:evidence](test-evidence-s17-after-refresh-corrected-sequence-r2.log) exit 0: 11/11 validator tests và S17 COMPLETE với 42 check/log records, 37 coverage rows, 286 fingerprints.

Full [npm run verify](npm-verify-s17-refreshed-corrected-sequence-r1.log) trên tree hiện hành exit 0: generator 15/346/245/61; boundaries 725 imports và 10/10 negative fixtures; domain 117/117; Vitest 252/252; lint/typecheck/production build; layout 86/86 trên 94 file, 0 finding; visual token 6/6 trên 93 file, 0 finding; UI composition 41/41 trên 92 file, 0 finding; test:evidence/S17 như trên. Verify làm mới ba generated evidence JSON: source-check.json, domain-tests.json và boundaries.json. App source/test/config không đổi từ UIC10; lần chạy này xác nhận lại toàn gate trên tài liệu và S17 sau UIC11.

## Kiểm tra liên kết và hash tài liệu

Snapshot doc-link/hash đầu tiên trước khi thêm UIC12–UIC13 và rebase đã được thay bằng số liệu cuối ở phần “Đối soát cuối trên SHA UIC10 đã rebase”. Kết quả validator chi tiết nằm trong [doc-link-validation.json](doc-link-validation.json); manifest hiện hành ở [final-document-hashes.json](final-document-hashes.json).

## Source proof, Git và giới hạn nghiệm thu

UIC10 source proof ghi built-demo suite **6/6**, **244** route opens và không finding; discovery **1.082 tests/79 files** là phép đếm, không phải full-suite run. Full E2E trên exact source SHA đang chờ GitHub Actions; lần Firefox full suite local trước đây dừng INCOMPLETE do RAM. Xem [UIC10 report](../UIC10/REPORT.md).

Remote branch, push/PR runs và trạng thái từng commit được chốt trong [receipt UIC12](../UIC12/REPORT.md); các SHA/run được ghi ở snapshot cũ phía trên không còn là trạng thái remote hiện hành.

Backend/provider/server authorization/persistence, staging/production, screen-reader/speech/human review, thiết bị thật và owner/user acceptance chưa được chứng minh. Báo cáo này không đóng các điều kiện nghiệm thu đó.

## Hồ sơ liên quan

- [Kế hoạch rollout UIC00–UIC13](../../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status)
- [UIC10 final source proof](../UIC10/REPORT.md)
- [Bằng chứng inventory nguồn UIC01](../UIC01/REPORT.md)

## Đối soát cuối trên SHA UIC10 đã rebase — 18/10/2026

Đã chạy lại reconciliation trên immutable Git trees với baseline `4a502be79a40cd7dc02c1eaa80445665a226b55f` và final source UIC10 `3e49d9424075b1bd28e7e26a16cb702505ffedf9` (không tính các thay đổi working-tree UIC11). Inventory UIC01 gồm **329** entry: **282** không đổi, **47** đổi, **0** xóa. Diff có **836** path: **783 thêm**, **53 sửa**; cả 836 path đều có disposition và commit owner, không thiếu treatment. Tất cả final files được fingerprint.

Reconciliation exit `1` chỉ vì **4 hash lịch sử** trong inventory UIC01 không khớp blob của baseline Git: `BotSalesAI_Frontend/STACK_LOCK.md`, `BotSalesAI_Frontend/docs/CONTINUE_FRONTEND.md`, `BotSalesAI_Frontend/docs/FRONTEND_UI_IMPROVEMENT_PLAN.md`, `BotSalesAI_Frontend/premium-audit.json`. Đây là mismatch tồn tại từ snapshot inventory, không bị sửa ngược hoặc che. [JSON đầy đủ](final-inventory-reconciliation.json), [log chạy đúng từ workspace Frontend](final-inventory-reconciliation-after-uic10-rebase.log) và [exit](final-inventory-reconciliation-after-uic10-rebase.log.exit). Lượt gọi nhầm từ repo root được giữ riêng là [log lỗi thư mục làm việc](uic11-reconciliation-wrong-working-directory.log), không tính làm bằng chứng PASS.

Hash manifest dùng `sourceHead=3e49d9424075b1bd28e7e26a16cb702505ffedf9`, là SHA UIC10 sau rebase; không còn dùng baseline cũ `bc00572d...`. Validator liên kết đã mở rộng tới UIC12–UIC13 để link/tài liệu handoff cũng được kiểm; các báo cáo downstream không bị đưa vào hash manifest UIC11 để tránh vòng freshness. Kết quả link và hash cuối hiện được ghi ngay dưới đây; receipt CI sẽ tiếp tục cập nhật trong UIC12/UIC13.
## Kiểm chứng sau khi ghép corrective UIC07–UIC11 — 18/10/2026

Trên chuỗi commit đã rebase theo dependency, chạy lại `npm run verify` với Node `v24.19.0`, npm `11.17.0` và PATH Windows rút gọn cho tiến trình con. Lượt hợp lệ exit `0`: generate 15 output/346 schema/245 operation/61 route; source/session 15/15; boundary 725 import và 10/10 fixture; domain 117/117; Vitest 26 file/252 test; lint, typecheck, production build; layout 86/86 trên 94 file/0 finding; visual token 6/6 trên 93 file/0 finding; composition 41/41 trên 92 file/0 finding. Owner finalizer làm mới FE022 theo allowlist UIC07; post-finalize validator 11/11, S17 COMPLETE với 43 command/log, 38 coverage và 286 fingerprint.

- [Full verify](npm-verify-after-final-rebase-r1.log), [exit](npm-verify-after-final-rebase-r1.log.exit).
- [S17 preverify](s17-preverify-after-final-rebase.log), [finalize](s17-finalize-after-final-rebase.log), [post-finalize validator](test-evidence-after-final-rebase.log); cả ba exit `0`.
- Có lượt capture rỗng `npm-verify-after-final-rebase-empty-capture.log` (2 byte CRLF), exit `0` nhưng không chứa stdout/stderr; lượt này bị loại khỏi proof và không được tính. Lượt r1 ở trên là lần chạy trực tiếp có đầy đủ log.

## Receipt inventory sau corrective UIC07 — 18/10/2026

Đối soát immutable tree ghi `baseline=4a502be79a40cd7dc02c1eaa80445665a226b55f`, `finalHead=cb2df8b500b1c375ca9de8086ad390cd60b8311f`. Inventory UIC01 gồm 329 entry: 280 unchanged, 49 changed, 0 removed. Git diff từ baseline có 931 path (844 added, 87 modified); cả 931 có disposition và commit owner, toàn bộ final file được fingerprint. Reconciliation exit `1` duy nhất vì 4 hash mismatch lịch sử giữa UIC01 inventory với Git blob của baseline; validator không che mismatch này.

Doc-link validator kiểm **23 tài liệu**, **1.648 local links**, **81 anchors**, **0 broken**; [log](doc-link-validation-final-uic12-uic13-r4.log), [exit](doc-link-validation-final-uic12-uic13-r4.log.exit). Hash manifest dùng source baseline UIC10 đã rebase `3e49d9424075b1bd28e7e26a16cb702505ffedf9`, fingerprint **144 file**; `--verify` kiểm **144/144**, **0 lỗi**. Manifest loại chính nó, log lệnh hash và báo cáo downstream UIC12/UIC13 để tránh vòng freshness; [generation log](hash-manifest-final-after-uic10-rebase.log), [verify log](hash-manifest-verify-final-after-uic10-rebase.log).

Full `npm run verify` được chạy lại sau reconciliation và cập nhật kế hoạch; exit `0`: generate 15/346/245/61; source 86 file/271 operation calls/61 route/0 issue; boundary 725 import và 10/10 fixture; domain 117/117; Vitest 252/252; lint/typecheck/production build; layout 86/86 trên 94 file/0 finding; visual token 6/6 trên 93 file/0 finding; composition 41/41 trên 92 file/0 finding; evidence validator 11/11. [Log](npm-verify-final-uic11-reconciliation-20261018.log), [exit](npm-verify-final-uic11-reconciliation-20261018.log.exit). S17 còn `COMPLETE`, 43 check/log, 38 coverage, 286 fingerprint; direct post-check cũng exit `0`: [log](test-evidence-after-uic11-corrected-reconciliation.log), [exit](test-evidence-after-uic11-corrected-reconciliation.log.exit).

Trên cùng application source `9cbe7094b23e6505b634eff0b30846f7d26a7e38`, built-demo đạt **6/6**, kiểm 61 route trên 390px và 1440px ở Chromium 155/Firefox 155: 244 route opens, 0 issue, 0 pageerror, 0 API write; artifact demo 38 file, SHA-256 `86bdc6411bf9fc2c73b54ffaa16c28b0e17dd089b2811de65a8ae6f12bf590da`. [Log](../UIC10/built-demo-uic08-overlay-corrected-sequence-final-20261018.log), [exit](../UIC10/built-demo-uic08-overlay-corrected-sequence-final-20261018.log.exit).

- [Inventory JSON](final-inventory-reconciliation.json), [log reconciliation](final-inventory-reconciliation-after-uic07-rebase.log), [exit](final-inventory-reconciliation-after-uic07-rebase.log.exit).
- [Doc-link JSON](doc-link-validation.json), [log](doc-link-validation-after-uic07-rebase.log), [exit](doc-link-validation-after-uic07-rebase.log.exit).
- [Hash manifest](final-document-hashes.json), [generate](hash-manifest-final-after-uic07-rebase.log), [verify](hash-manifest-verify-after-uic07-rebase.log); hash verify exit `0`.
