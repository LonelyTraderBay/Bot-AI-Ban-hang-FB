# Hồ sơ dự án Frontend — 08/10/2026

<!-- CORRECTIONS_CURRENT -->
## Cập nhật hiện hành — 18/10/2026

Đợt đồng bộ UI đang ở UIC11; trạng thái việc, dependency và delivery nằm tại [plan §16.6](FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status). Source/test/config cuối được kiểm ở UIC10 commit 85e2a677951e0e46aef6919e775de3e0c0d54103: npm run verify exit 0; discovery 1.082 E2E test/79 file; built-demo 6/6 trên Chromium/Firefox và 244 lần mở route (61 route × 2 viewport × 2 browser), không có page error hoặc finding. Đây là local built-demo proof; full E2E của exact SHA còn chờ GitHub Actions, full Firefox local trước đó INCOMPLETE do RAM. Chi tiết và logs tại [UIC10](../evidence/frontend-ui-consistency-20261017/UIC10/REPORT.md).

UIC11 đối soát immutable final HEAD 85e2a677 với baseline 4a502be7: 329 inventory entries (282 unchanged, 47 changed, 0 removed); 801 Git paths (748 added, 53 modified), không thiếu disposition/commit owner và final paths đều fingerprint. Có 4 hash lịch sử trong inventory không khớp hash tái tính từ Git baseline; giữ nguyên và ghi rõ trong [UIC11 report](../evidence/frontend-ui-consistency-20261017/UIC11/REPORT.md). Owner CLI validate/status và generator đều chạy lại; trạng thái FE là 0/140 checkpoint hiệu lực, 28/28 task STALE, 0 BLOCKED. Hai ledger đầu vào không đổi; đây là freshness của tracker, không phải tỷ lệ code hay tiến độ UIC.

Remote origin/codex/ui-consistency-plan-20261016 hiện ở SHA 8f4ada345e03af18e607ee87b8044dce418df8db. Push Actions #39071935869 và PR Actions #39071938654 chưa terminal tại thời điểm ghi; UIC08–UIC10 đã commit local nhưng chưa push theo thứ tự. UIC11 chỉ được đẩy sau exact-SHA CI của các task trước. Backend/provider/server authorization/persistence, staging/production, screen-reader/speech/human review, thiết bị thật và user acceptance chưa được chứng minh; sản phẩm hiện xác minh trong scope Frontend + MSW/mock.
<!-- END_CORRECTIONS_CURRENT -->

## HISTORICAL_SNAPSHOT — hồ sơ trước đợt F01–F09

## Snapshot kiểm thực tế — 08/10/2026

Checkout đã được kiểm là `HEAD 53c0ba8f413b1f1e0fa16a747ed27f728b861dd6` cộng working tree hiện hành. FE026 clean isolated run và FE027 built-demo UAT hiện hành liên kết source/artifact bằng SHA-256; `npm run verify` exit 0 và browser suite đạt 512/512 Chromium/Firefox. Ma trận hiện hành ghi 54 route, 64 feature, 65 feature-route row, 22 journey, 357/357 private route-role, empty 11/11, error 51/51 và không còn applicable state cell chưa kiểm.

Đây là nghiệm thu kỹ thuật local trong `FRONTEND_WITH_SYNTHETIC_MOCK_API`. FE-G05 chưa đạt đầy đủ vì Narrator speech/transcript và broad human accessibility review chưa chạy; FE-G09 chờ người dùng nghiệm thu. Hosted CI chưa chạy; backend/provider/server authorization/persistence/staging/production chưa được kiểm. FE tracker đo checkpoint evidence freshness, không đo tỷ lệ source đã viết; dùng CLI canonical và generated report để đọc con số hiện hành. UI spacing rollout là kế hoạch riêng: xem §16.6 trong [plan](FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status) và không gộp với FE.

Chi tiết có hash: [FE026 clean artifact manifest](../../botsales-kit/execution/frontend-evidence/FE026/clean-artifacts-current-20261008-attempt03.json), [FE027 UAT matrix](../../botsales-kit/execution/frontend-evidence/FE027/uat-matrix-current-20261008.json), [FE028 quality gates](../../botsales-kit/execution/frontend-evidence/FE028/quality-gate-matrix-current-20261008.json), [FE028 handoff](../../botsales-kit/execution/frontend-evidence/FE028/handoff.md).

**CURRENT PHASE:** Frontend-only work follows the dependency and evidence recorded in [plan §16.6](FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status). This context file records scope and canonical pointers; it does not duplicate S-step statuses. Do not change FE/full-product ledgers without task-level evidence.

Phạm vi hiện hành: React/TypeScript Frontend trong apps/web, API synthetic MSW chỉ demo/test. AI tự triển khai/kiểm thử/tái xác minh/bàn giao trong scope; người dùng nghiệm thu cuối. [FRONTEND_SCOPE](FRONTEND_SCOPE.md) là nguồn phạm vi. Không Backend/provider/persistence/staging/deploy proof; không tự commit/push hoặc ghi owner acceptance.

## Trạng thái source

The source rollout review and its scope are recorded in [§16.17](FRONTEND_UI_IMPROVEMENT_PLAN.md#preimplementation-review-20261007); current implementation status and remaining dependencies are recorded only in [§16.6](FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status). Scoped checks do not prove full enforcement or full UI acceptance.

## Quy định và nguồn chuẩn

Design consolidation remains the policy source: [workflow v1.29](FRONTEND_SPACING_STANDARD.md#unified-workflow), SPC-001–075; the [shared catalog](../apps/web/src/shared/ui/README.md) distinguishes CURRENT from TARGET APIs; and [plan §16](FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan) owns dependency/status. Current evidence is linked per step; the design document itself does not certify runtime or Enterprise conformance. Evidence hash/coverage validation and shared UI regression suites run in required `npm run verify`.

**HISTORICAL_SNAPSHOT — audit v15.0:** [report](../evidence/frontend-ui-improvements/ui-policy-steel-20261006/REPORT.md) ghi68 TS/TSX,28 TSX,16 modules;27 shared exports;176 composition uses/21 files. Ba strict scans0 findings,24/24existing fixtures vàgenerator exit0; adversarial probes vẫn chứng minh bypass. Browser diagnostic nhỏ ghi ba Finance first-body boundaries32/40px thay16 và Imports clearance label15/control24px tại806/1440. Đây là kết quả theo source/state của lần đó, không proof chạy lại build/full E2E/native200/speech/hosted CI trong lượt hợp nhất tài liệu.

Lượt triển khai trước ở [§15](FRONTEND_UI_IMPROVEMENT_PLAN.md#15-audit-và-triển-khai-shared-composition-toàn-dự-án--06102026) và [report](../evidence/frontend-ui-improvements/shared-composition-20261006/REPORT.md):six owners đã triển khai, current renders216/216;114pairs comparable/102baseline partial. Full E2E485/486 FAIL, targeted artifact retest6/6 riêng; không cộng thànhfull suite PASS. Các Wxx/UI027/FE04-10 trong kế hoạch và REPORT là HISTORICAL_SNAPSHOT theo hash, không chứng minh current freshness.

## Nguồn chuẩn và tiến độ

- Hành vi: ../botsales-kit/contracts/openapi.json, contracts/route-manifest.json, permission/event contracts và UX-CONTRACT. Atomic values: design/tokens.json →generator; không sửa generated bằng tay.
- Runtime owner: theme.ts/layout.ts/visual.ts/components.tsx/composition.tsx. [Shared catalog](../apps/web/src/shared/ui/README.md) giải thích API; không normative scale/ledger thứ hai. Một MUI/theme, QueryClient, Router; module không import module khác; shared không import app/modules/mocks.
- Quy định và workflow UI duy nhất: [FRONTEND_SPACING_STANDARD](FRONTEND_SPACING_STANDARD.md#unified-workflow); AGENTS/DESIGN/UX/coding standards route tới nó. AI_RULES Universal3.1 root/kit giữ nguyên; không tạo checklist hoặc skill rule riêng cùng vai trò.
- FE task/ledger: execution/frontend-plan.json/frontend-progress.json. Đọc node ../botsales-kit/scripts/progress.mjs status sau thay đổi source/policy; snapshot trước policy audit ghi0/140 effective,28 stale,blocked=[] /next FE001.S01. Đây là evidence freshness, không0% code. Không ghi tăng từ audit/docs.
- Full-product execution/plan.json/progress.json/tasks/T*.md chỉ đọc. FE-G01..09 cần evidence còn hiệu lực; không dùng số fixture/component/rule làm điểm readiness.

## Tiếp tục

[CONTINUE_FRONTEND](CONTINUE_FRONTEND.md), [plan §16.6](FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status) và [report bằng chứng](../evidence/REPORT.md) là đường vào hiện hành; §16.17 giữ lý do thiết kế lịch sử. Tiếp tục UIC theo dependency và exact-SHA delivery; không chuyển kết quả mock/local thành Backend/UAT. Theo [workflow canonical](FRONTEND_SPACING_STANDARD.md#unified-workflow); không nhận FE checkpoint từ journal cũ khi owner CLI báo STALE. Strict FAIL/UNKNOWN, mandatory NOT_RUN và hosted check chưa terminal giữ đúng trạng thái.
