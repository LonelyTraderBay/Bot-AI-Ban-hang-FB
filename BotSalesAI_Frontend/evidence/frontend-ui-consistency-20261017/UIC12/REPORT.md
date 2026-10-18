# UIC12 — Đối chiếu GitHub Actions theo SHA và bàn giao bằng chứng phát hành

**Trạng thái:** `IN_PROGRESS — CHỜ WORKFLOW SHA UIC08 NỀN KẾT THÚC`. Báo cáo này chỉ ghi kết quả đọc trực tiếp từ remote; không suy CI từ local PASS. Hoàn tất bảng receipt sau khi từng commit được push theo thứ tự và cả push workflow lẫn PR workflow đã terminal trên đúng SHA.

## Phạm vi và nguồn kiểm tra

Nhánh đích `codex/ui-consistency-plan-20261016`, PR #1 tới `main`. Tại lần đọc hiện hành, remote ref ở `499ee5ade6c99807abb4a016e74921300bfa8907`; push run [#39085799682, attempt 2](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39085799682/attempts/2) vẫn `in_progress`, PR run [#39085802916](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39085802916) terminal `success`. Attempt 1 của push run thất bại ở R04 và được giữ làm lịch sử; lỗi này đã dẫn tới test barrier đóng dialog trong commit UIC08 corrective.

Kiểm tra trên runner dùng `gh run view`, Actions job/check list, artifacts, remote branch ref và PR head. Mỗi receipt cuối phải chứa SHA đầy đủ, run ID/attempt/event, trạng thái terminal, tên/kết quả từng job, artifact ID/tên, remote ref sau push và PR head. Chỉ kết luận xanh khi push và PR workflow của đúng SHA đều hoàn thành; run tổ tiên hoặc local test không thay thế.

## Bằng chứng local cuối hiện có

Trên HEAD local `9cbe7094b23e6505b634eff0b30846f7d26a7e38`, `npm run verify` exit 0: generator 15 output/346 schema/245 operation/61 route; source 15/15; boundary 725 imports và 10/10 fixture; domain 117/117; Vitest 252/252; lint/typecheck/build PASS; layout 86/86; visual token 6/6; UI composition 41/41; evidence validator 11/11; S17 COMPLETE với 43 command/log records, 38 coverage rows, 286 fingerprints. Log: [npm verify](../UIC10/npm-verify-uic08-overlay-corrected-sequence-final-20261018.log).

Built-demo trên cùng source đạt 6/6; Chromium 155 và Firefox 155 mở 61 route tại 390px/1440px, tổng 244 route opens, 0 issue, 0 pageerror, 0 API writes; artifact gồm 38 file, SHA-256 `86bdc6411bf9fc2c73b54ffaa16c28b0e17dd089b2811de65a8ae6f12bf590da`. Xem [log](../UIC10/built-demo-uic08-overlay-corrected-sequence-final-20261018.log) và bốn receipt JSON trong `../../frontend-ui-improvements/UI028/W32/`.

Các kết quả local này chứng minh source mock/MSW trong checkout; chúng không chứng minh Backend, nhà cung cấp thật, staging, production hay user acceptance.

## Chuỗi commit phải đối chiếu

| Thứ tự | Việc | SHA dự kiến | Remote / push run | PR run | Trạng thái |
|---:|---|---|---|---|---|
| 0 | UIC08 nền đã có trên remote | `499ee5ade6c99807abb4a016e74921300bfa8907` | #39085799682 attempt 2 — đang chạy | #39085802916 — success | Chờ push attempt 2 terminal |
| 1 | UIC08 sửa race đóng dialog | `cd1e35fee113773f3a360dd689749153ad6e1e27` | Chờ push | Chờ PR | Chưa push |
| 2 | UIC09 regression gates/định danh browser | `b14295f5fbdf953c9e90834deeaf957e11e45dd6` | Chờ push | Chờ PR | Chưa push |
| 3 | UIC10 full verify và artifact source cuối | `3e49d9424075b1bd28e7e26a16cb702505ffedf9` | Chờ push | Chờ PR | Chưa push |
| 4 | UIC11 tài liệu và freshness | `218f23f697d6846f59b1bfd7f1c49083c3179a8d` | Chờ push | Chờ PR | Chưa push |
| 5 | UIC11 đối soát sau rebase | `9cbe7094b23e6505b634eff0b30846f7d26a7e38` | Chờ push | Chờ PR | Chưa push |
| 6 | UIC11 reconciliation evidence follow-up | `52b9b4a028a4cd1ba530bac4192f69af67ab1a44` | Chờ push | Chờ PR | Chưa push |
| 7 | UIC11 link/hash finalization sau khi chốt tài liệu UIC12–UIC13 | Sẽ khóa SHA trước khi push | Chờ push | Chờ PR | Chưa tạo |
| 8 | UIC12 receipt CI cuối | Tạo sau khi receipt UIC08–UIC11 đã đầy đủ | Chờ push | Chờ PR | Chưa tạo |
| 9 | UIC13 bàn giao | Tạo sau UIC12 | Chờ push | Chờ PR | Chưa tạo |

Machine-readable receipts: [GitHub push/PR/workflow/jobs/artifacts](github-ci-receipts.json) và [branch policy](branch-policy-receipt.json). Hai tệp này sẽ được cập nhật từ dữ liệu live sau khi workflow terminal; trạng thái `PENDING` hiện tại không được coi là kết quả.

Không dùng `--force`; chỉ đẩy fast-forward SHA đã review. Sau mỗi push phải đọc lại `ls-remote`, ghi chính xác Actions push/PR, xem từng job và artifact; nếu có job lỗi phải đọc log/trace và sửa bằng commit riêng rồi chạy lại full kiểm tra.

## Branch protection và điều kiện đóng

Receipt hiện chụp lúc `2026-10-18T03:31:57Z`: rulesets rỗng; protection API trả HTTP 404 `Branch not protected` cho cả `main` và `codex/ui-consistency-plan-20261016`; remote khi chụp ở `499ee5ade6c99807abb4a016e74921300bfa8907`. Sẽ làm mới snapshot sau khi đẩy xong toàn bộ chuỗi. Handoff chưa đóng cho tới khi mọi commit ở bảng có trạng thái cuối và báo cáo UIC13 nêu rõ các acceptance vẫn ngoài scope.
