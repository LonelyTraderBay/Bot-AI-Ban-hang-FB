# UIC11 — Đối soát tài liệu, inventory và freshness FE

**Trạng thái:** LOCAL_VERIFIED_WITH_HISTORICAL_BASELINE_LIMITS; UIC11 được giao thành một commit riêng, push xếp sau UIC07–UIC10. Phạm vi là đối soát; không cập nhật ledger tiến độ.

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

Doc-link validator kiểm 21 tài liệu README/kit/Frontend/plan/context/evidence/UIC01–UIC11; raw result [doc-link-validation.json](doc-link-validation.json) ghi 1.578 local links, 80 anchors và 0 broken links. Lượt đầu phát hiện 2 artifact audit chưa tạo; sau khi tạo, kiểm tra cuối exit 0. Hash manifest [final-document-hashes.json](final-document-hashes.json) fingerprint **84 file** tài liệu, generated outputs, S17 và evidence UIC11; bỏ manifest tự thân và log hash-manifest để tránh tham chiếu vòng. Lượt --verify cuối exit 0, kiểm 84 file và 0 lỗi; log tại [hash-manifest-verify-final.log](hash-manifest-verify-final.log).

## Source proof, Git và giới hạn nghiệm thu

UIC10 source proof ghi built-demo suite **6/6**, **244** route opens và không finding; discovery **1.082 tests/79 files** là phép đếm, không phải full-suite run. Full E2E trên exact source SHA đang chờ GitHub Actions; lần Firefox full suite local trước đây dừng INCOMPLETE do RAM. Xem [UIC10 report](../UIC10/REPORT.md).

Remote branch codex/ui-consistency-plan-20261016 đang ở UIC07 corrective SHA 8f4ada345e03af18e607ee87b8044dce418df8db. Push run [#39071935869](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39071935869) và PR run [#39071938654](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39071938654) chưa terminal ở lần đọc hiện hành. UIC08, UIC09, UIC10 đã commit riêng nhưng chưa push theo dependency. UIC11 commit/push sau khi đạt link/hash validation và đúng thứ tự delivery.

Backend/provider/server authorization/persistence, staging/production, screen-reader/speech/human review, thiết bị thật và owner/user acceptance chưa được chứng minh. Báo cáo này không đóng các điều kiện nghiệm thu đó.

## Hồ sơ liên quan

- [Kế hoạch rollout UIC00–UIC13](../../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status)
- [UIC10 final source proof](../UIC10/REPORT.md)
- [Bằng chứng inventory nguồn UIC01](../UIC01/REPORT.md)
## Kiểm chứng sau khi ghép corrective UIC07–UIC11 — 18/10/2026

Trên chuỗi commit đã rebase theo dependency, chạy lại `npm run verify` với Node `v24.19.0`, npm `11.17.0` và PATH Windows rút gọn cho tiến trình con. Lượt hợp lệ exit `0`: generate 15 output/346 schema/245 operation/61 route; source/session 15/15; boundary 725 import và 10/10 fixture; domain 117/117; Vitest 26 file/252 test; lint, typecheck, production build; layout 86/86 trên 94 file/0 finding; visual token 6/6 trên 93 file/0 finding; composition 41/41 trên 92 file/0 finding. Owner finalizer làm mới FE022 theo allowlist UIC07; post-finalize validator 11/11, S17 COMPLETE với 43 command/log, 38 coverage và 286 fingerprint.

- [Full verify](npm-verify-after-final-rebase-r1.log), [exit](npm-verify-after-final-rebase-r1.log.exit).
- [S17 preverify](s17-preverify-after-final-rebase.log), [finalize](s17-finalize-after-final-rebase.log), [post-finalize validator](test-evidence-after-final-rebase.log); cả ba exit `0`.
- Có lượt capture rỗng `npm-verify-after-final-rebase-empty-capture.log` (2 byte CRLF), exit `0` nhưng không chứa stdout/stderr; lượt này bị loại khỏi proof và không được tính. Lượt r1 ở trên là lần chạy trực tiếp có đầy đủ log.
