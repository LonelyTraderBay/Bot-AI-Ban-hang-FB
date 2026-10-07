# Hợp nhất quy định, quy trình và shared UI trước triển khai

**Ngày:** 06/10/2026 · **Scope:** React Frontend với synthetic mock · **Kết quả:** audit/specification, chưa triển khai runtime S03–S20. Áp dụng Andrej Karpathy Skills: hiểu source trước, reuse owner đúng, sửa phạm vi nhỏ, kiểm invariant; không thêm dependency/framework hoặc engine UI.

## Tài liệu đã chốt

- [Standard v1.25](../../../docs/FRONTEND_SPACING_STANDARD.md#unified-workflow): một workflow và nguồn SPC-001–075; file treatment, source authority, owner/unit/slot/state, verification và verdict rõ.
- [Catalog v2.0 CURRENT/TARGET](../../../apps/web/src/shared/ui/README.md): đủ27 public APIs; native/ref/RHF/ARIA, geometry/slot, behavior và acceptance theo component. TARGET chưa là code đã triển khai.
- [Plan v16.0 §16](../../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan): 20 bước ổn định, dependency/ưu tiên/acceptance; đủ16 module và owner ngoài module, file reconciliation, compatibility và rollback trong dirty checkout.
- AGENTS root/kit, AI_RULES_PROJECT, coding standards, README/DESIGN/UX/scope/context/continue chỉ route tới workflow và giữ trách nhiệm riêng; original Universal root/kit không đổi. Migration-debt allowance Wxx chỉ lịch sử, không đóng task hiện hành bằng global FAIL.

## Đo thực tế và phạm vi

| Đo tĩnh hiện hành | Kết quả | Giới hạn |
|---|---:|---|
| Relevant file inventory | 355 workspace +1 active parent workflow | Phân loại owner/treatment, chưa verification từng file |
| apps/web/src | 73 files, gồm68 TS/TSX và28 TSX | Không toàn UI boundary hoặc rendered instances |
| Feature source/helper | 24 files /16 modules | KEEP_VERIFY cần assessment/check, không phải file nào cũng sửa |
| Manifest/router mapping | 54/54,0 missing/extra | Mapping static, chưa UI/state/permission render PASS |
| Shared APIs | 27 =21 components +6 compositions | CURRENT/TARGET rõ; gate closure còn phải harden |
| MUI nested metadata/slots | 71 declarations | Ref/name/ARIA/events/RHF khác visual override; không71 lỗi |
| App generator outputs | 11 | Gồm token CSS, SVG/icon và manifest; không sửa tay |
| Literal runtime own imports | 0 unresolved | Không chứng minh binding/style source gates đủ mọi syntax |
| Nonliteral tooling imports | 4 bounded source mappings +1 global compiler fallback UNKNOWN | Xác minh compiler path/version tại S03; không tự PASS fallback |

[FILE_INDEX.md](FILE_INDEX.md) là bản đọc từng file; [inventory.json](inventory.json) ghi row/hash/category/edit policy/treatment/gate applicability/S-step/route impact đầy đủ. [coverage-review](coverage-review.md) giữ snapshot disk partition và exclusions có count/reason: dependencies/build/evidence/prototype/full-product tracker/secrets/cache. Số disk tăng khi evidence mới được tạo; denominator relevant không pin thành allowlist. Generated vendor worker ignored vẫn trong inventory; nested workflow đã xóa giữ RETIRED_VALIDATE, active workflow ở Git root giữ nguyên.

Read-only reviews: [policy-review](policy-review.md), [shared-contract-review](shared-contract-review.md). Các dòng nguồn trong report là pre-edit snapshot, không current line references sau khi hợp nhất. [Audit trước](../ui-policy-steel-20261006/REPORT.md) tái hiện bypass và Finance header→body32/40 thay expected16 ở các cases đã đo; lượt này không chạy lại browser hoặc sửa symptom. Pager malformed-page là source-condition risk cần targeted regression, chưa current demo browser bug.

## Rollout sau specification

P0: refresh inventory/contract/baseline → scope/parser/binding/provenance/style guards → finite shared API/ownership và readiness harness → sửa owner Finance. P1: real QueryState placements/intrinsic controls/Pager regression và từng wave đủ16 module → policy/evidence/CI wiring. P0 cuối: all-file/all-consumer checks, relevant build/demo/full E2E và handoff. Cleanup P2 chỉ khi có lợi ích/defect; lifecycle dispositions vẫn được đối chiếu, không tạo consumer giả.

Dependency là capability có fixture evidence. Gate mới phát hiện source lỗi thì giữ actual FAIL và acceptance mở, dùng gate để sửa consumer; không chờ source sạch rồi mới cho sửa lỗi. Không nhận fixture PASS như global source PASS. Không có bước chờ Backend/owner/hosted CI; human acceptance vẫn chỉ sau bàn giao.

## Kiểm chứng của lượt này

| Kiểm tra | Kết quả/nguồn |
|---|---|
| Inventory discovery/classification | Đã chạy script inventory, exit0; assertions trong coverage-review |
| Generator freshness | PASS/exit0:11outputs,283schemas,210operations,54routes; [command metadata](generate-check.json), [log](generate-check.log) |
| IDs/dependency/catalog/module/link/hash reconciliation | PASS/exit0:18 task-local checks;75 SPC IDs,37 CODE IDs,20 steps,27 API contracts,16 module/54 route waves; [validation](validation.json) |
| Protected files/hash | 343 relevant files ngoài14 edited docs không đổi so inventory baseline;86 files trong prior protected snapshot cũng không đổi, gồm FE/full-product/rules/inputs |
| Local compiler resolution | TypeScript5.9.2 khớp pinned dependency, local node_modules path xác minh; global fallback branch chưa chứng nhận |
| FE status chỉ đọc | Exit0,0/140 effective VERIFIED,28STALE,blocked=[],next FE001.S01 do AGENTS hash đổi; [log](fe-status.log). Đây là freshness, không0% code, không ghi ledger |
| Working/scoped-doc whitespace | git diff --check và scoped docs exit0; [metadata/log paths](diff-checks.json) |
| Staged index whitespace | git diff --cached --check exit2;78 historical evidence paths ngoài14 edited docs,0 current-doc issue. Giữ nguyên index/logs; không nhận toàn index PASS |
| Build/typecheck/lint/unit/domain/full E2E/native zoom/speech/hosted CI | NOT_RUN_THIS_DOCS_TURN: runtime/config không đổi; snapshots cũ không relabel current |

Generator dùng npm.cmd với script-shell PowerShell theo command để giải quyết shell lookup của Windows; Node directory chỉ thêm vào env của process chạy check, không thay PATH/execution policy máy. Không generated mutation.

Chỉ14 tài liệu canonical/routing/aggregate REPORT được chỉnh và task evidence được thêm; không source runtime/checker/config/tests/token/contract/CI/ledger edit. S01/S02 DONE_AUDIT/DONE_SPECIFICATION; S03 READY, S04–S20 TODO theo plan (S13 optional cleanup). Đây không Enterprise certification,100% UI conformance hoặc owner acceptance. FE/full-product trackers giữ nguyên, không tăng điểm từ policy.

Final docs validation kiểm local link/anchor trong14 edited docs, report này và FILE_INDEX, không missing target/anchor. [Kết quả ban đầu](validation-initial.json) giữ nguyên: một historical heading link cũ bị hỏng đã sửa target đúng, parser task-local lúc đầu tính hai table headers như component nên đã sửa để phân biệt header/data. Không thay source guard/product assertion hoặc làm yếu acceptance. Scripts consolidate-* là one-off migration đã chạy, không rerun; inventory/render-file-index/validate-docs là audit task-local tái lập được, không S14/S17 permanent enforcement đã triển khai.
