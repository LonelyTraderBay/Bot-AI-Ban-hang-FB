# UIC13 — Bàn giao đồng bộ UI theo bằng chứng

**Trạng thái:** `PENDING UIC12 — CHƯA BÀN GIAO`. Chỉ chuyển sang `DELIVERED_WITH_EVIDENCE_LIMITS` sau khi UIC12 lưu đủ push/PR checks terminal theo exact SHA và các validator tài liệu/fingerprint cuối đạt.

## Mục tiêu và ranh giới

UIC rollout gồm các việc UIC00–UIC13 trong §16.6 của [kế hoạch UI](../../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status). Handoff này đóng phạm vi đồng bộ UI Frontend chạy với API mock/MSW và những receipt đã được kiểm tra. Nó không thay thế tiến độ FE001–FE028: phép đo hiện hành của owner CLI trong UIC11 là 0/140 checkpoint hiệu lực, 28 task STALE, 0 BLOCKED. Không cập nhật tracker sản phẩm hoặc ghi nhận acceptance khi chưa có bằng chứng của đúng owner.

## Cách nghiệm thu lại từ checkout sạch

1. Kiểm tra branch/ref và SHA theo receipt UIC12; không cherry-pick ngoài chuỗi phụ thuộc.
2. Từ `BotSalesAI_Frontend`, dùng Node/npm theo cấu hình workspace và chạy `npm run verify`; lưu exit code cùng stdout/stderr.
3. Chạy built-demo suite bằng `npm run test:e2e -- --config=playwright.built-demo.config.ts --workers=1 --reporter=line`; giữ route JSON và hash artifact.
4. Chạy `npm run test:evidence`, doc-link validator UIC11 và hash-manifest verifier; mỗi lần phải ghi lại exit code, số mục kiểm, thời gian, revision và artifact path.
5. So remote ref, PR head, workflow run attempts, check/job results, artifacts và policy API với UIC12. Không tính một run khác SHA làm chứng cho commit này.

## Khôi phục nếu hồi quy sau khi giao

Đọc remote ref và working tree trước khi khôi phục. Tạo commit revert mới theo thứ tự ngược dependency cho các commit source gây hồi quy; không reset nhánh đã push, không force-push và không xóa log/artifact. Sau revert, chạy lại generator, `npm run verify`, built-demo tests bị ảnh hưởng, S17 owner finalizer/validator và hash/link validators; ghi kết quả rồi push fast-forward. Giữ các commit evidence cần để giải thích sự cố, trừ khi một receipt mới chứng minh rõ phần nào đã được thay thế.

## Ma trận UIC00–UIC13 và bằng chứng

| Hạng mục | Kết quả đo / nội dung đóng | Bằng chứng thực tế | Trạng thái bàn giao |
|---|---|---|---|
| UIC00 — kế hoạch | 13 kiểm tra tài liệu; owner/dependency/link/hash baseline lưu trước khi sửa UI. | [Báo cáo audit gốc](../../frontend-ui-consistency-20261016/REPORT.md), [validator kế hoạch](../../frontend-ui-consistency-20261016/planning-validation.json) | VERIFIED_LOCAL_DOCUMENTATION |
| UIC01 — inventory | 329 file fingerprint/treatment; 61/61 route owner-map; 427/427 role expectation; 3.402 ô state được kiểm kê. | [Báo cáo UIC01](../UIC01/REPORT.md), push #38969265018 và PR #38969272554 cùng SHA | PUSHED + exact-SHA CI PASS |
| UIC02 — backdrop | Source/local 0/18 → 18/18; push PASS. PR attempt 2 thất bại 1/447 ở FE010, trong khi verify/build và ba Firefox shard PASS. | [Báo cáo UIC02](../UIC02/REPORT.md), push #38976937841, PR #38976941387 attempt 2; downstream UIC04 exact-SHA full CI PASS #39003608005 attempt 3 / #39003610996 | PUSHED; exact-PR historical failure is retained; downstream regression verified |
| UIC03 — MSW lifecycle | Root cause lifecycle gây pageerror được xử lý; push và PR exact SHA terminal PASS đủ verify, Chromium và ba Firefox shard. | [Báo cáo UIC03](../UIC03/REPORT.md), #38999419334 / #38999422754 | PUSHED + exact-SHA CI PASS |
| UIC04 — Dashboard | Hình học/intent đo và quyết định layout một cột; FE010 route-return regression được chẩn đoán/sửa; push attempt 3 và PR PASS. | [Báo cáo UIC04](../UIC04/REPORT.md), #39003608005 attempt 3 / #39003610996 | PUSHED + exact-SHA CI PASS; attempts 1–2 retained |
| UIC05 — token trace | 8 MUI z-index slots và 7 CSS vars khớp token; runtime token/portal; unit 249/249, domain 117/117, layout 86/86, token 6/6, composition 41/41. | [Báo cáo UIC05](../UIC05/REPORT.md), #39015629456 / #39015632140 | PUSHED + exact-SHA CI PASS |
| UIC06 — shared APIs | 28 exports disposition; 26 consumer APIs / 30 files / 1.431 JSX uses; 28/28 direct render; layout 94 files/0 finding, composition 92/0. | [Báo cáo UIC06](../UIC06/REPORT.md), #39020678465 attempt 2 / #39020682925 | PUSHED + exact-SHA CI PASS |
| UIC07 — route/state/action | Corrective FE022.VS02 validated; shell 51/51; targeted 6/6 and full verify/S17. | [Báo cáo UIC07](../UIC07/REPORT.md), exact SHA `dfe9411b37529f9bcfa87171d90df1d8f10f057e`, #39079265365 / #39079271134 | PUSHED + exact-SHA CI PASS; failed parent run retained |
| UIC08 — reflow/accessibility | 61 routes × 9 profiles × 2 browsers = 1.098/1.098; UI012 22/22; Chrome native zoom 5/5; Firefox text resize 5/5; R04 close-gate Chromium 10/10. | [Báo cáo UIC08](../UIC08/REPORT.md), local evidence and correction commit `cd1e35fee113773f3a360dd689749153ad6e1e27`; exact hosted correction CI to be filled in UIC12 | LOCAL_VERIFIED; HOSTED_CI_PENDING |
| UIC09 — regression gates | Browser identity Chromium/Firefox 2/2 at version 155; gate inventory 36/36; full local verify 252/252; S17 current finalizer 43/38/286. | [Báo cáo UIC09](../UIC09/REPORT.md), commit `b14295f5fbdf953c9e90834deeaf957e11e45dd6`; exact hosted CI to be filled in UIC12 | LOCAL_VERIFIED; HOSTED_CI_PENDING |
| UIC10 — source closeout | Final verify exit 0; built-demo 6/6, 244 route opens, 0 issue/pageerror/API write, demo artifact 38 files with recorded SHA-256. Full historical local browser run remains `INCOMPLETE`; GitHub full-suite exact SHA pending. | [Báo cáo UIC10](../UIC10/REPORT.md), commit `3e49d9424075b1bd28e7e26a16cb702505ffedf9`, latest full verify/built-demo receipts | LOCAL_VERIFIED; HOSTED_CI_PENDING |
| UIC11 — docs/freshness | 329 inventory items; 836 Git paths fully owned; 4 historical baseline hash mismatches retained; FE CLI 0/140 effective, 28 STALE/0 BLOCKED; link/hash counts in current UIC11 report; full verify PASS; S17 43/38/286. | [Báo cáo UIC11](../UIC11/REPORT.md), reconciliation, link validation, hash manifest; correction commit `52b9b4a028a4cd1ba530bac4192f69af67ab1a44` pending delivery | LOCAL_RECONCILED_WITH_HISTORICAL_BASELINE_LIMITS |
| UIC12 — GitHub delivery | Exact SHA, push/PR events, per-job results, artifacts, remote ref and branch rules checked for every delivery commit. | [Receipt UIC12](../UIC12/REPORT.md), [máy đọc CI](../UIC12/github-ci-receipts.json), [branch policy](../UIC12/branch-policy-receipt.json) — pending terminal outcomes of remaining exact-SHA runs | IN_PROGRESS |
| UIC13 — handoff | Clean-replay steps, rollback sequence, acceptance scope and unresolved limits recorded here. | This report plus final UIC12 receipts; this commit's own Actions result is the exact SHA run linked by GitHub after push. | PENDING UIC12 |

Historical failures remain visible and are not relabeled PASS: UIC02 PR attempt 2 had one Chromium FE010 failure; UIC04 attempts 1–2 and UIC07 parent/UIC08 base attempt 1 also failed and are recorded in their task reports. Corrective descendant commits were tested separately. The UIC13 closing revision will replace `HOSTED_CI_PENDING`, `IN_PROGRESS`, and `PENDING UIC12` only where exact-SHA terminal evidence supports the change.

Điều kiện còn ngoài phạm vi mock hiện tại phải giữ nguyên: Backend/provider thật và phân quyền server, dữ liệu/persistence thật, staging/production, Safari/Edge, thiết bị vật lý, screen-reader/speech, kiểm tra trực quan bởi con người và owner/user acceptance. Không tuyên bố sản phẩm/backend hoàn tất 100% từ bằng chứng Frontend.

## Hoàn tất

UIC13 được hoàn tất khi bảng ma trận UIC00–UIC13 không có hạng mục kế hoạch nào bị bỏ quên; các mục trong scope có bằng chứng tái lập và commit/push riêng theo thứ tự; UIC12 xác nhận GitHub đúng SHA; links, S17 fingerprints và hash manifest qua kiểm chứng; các giới hạn còn mở có owner/next acceptance step rõ ràng. Trạng thái cuối chỉ được chọn từ số liệu thực tế sau các điều kiện trên.
