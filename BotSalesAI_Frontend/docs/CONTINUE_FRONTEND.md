# Tiếp tục Frontend — 08/10/2026

<!-- CORRECTIONS_CURRENT -->
## Phạm vi hiện hành — UX và nghiệp vụ bổ sung 09/10/2026

Đang thực hiện UX01–UX15 và sáu nhóm chức năng theo [kế hoạch UI §16.6](FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status). Baseline và impact tại [contract](../evidence/frontend-ux-completion-20261009/CONTRACT.md). Trạng thái chỉ đọc từ kế hoạch; các gate của đợt trước không chứng minh source đang sửa đã hoàn tất. FE vẫn có 140 checkpoint; freshness phải đọc lại bằng CLI canonical.

Phạm vi Frontend + contract canonical + MSW tổng hợp. Nghiệm thu local cuối đợt chưa được xác nhận; Backend/provider/production có mốc riêng.

## HISTORICAL_SNAPSHOT — kết quả — thu gọn spacing 09/10/2026

[Báo cáo](../evidence/frontend-spacing-density-20261009/REPORT.md), [case nghiệm thu](../evidence/frontend-spacing-density-20261009/ACCEPTANCE_GUIDE.md): **READY_FOR_ACCEPTANCE_LOCAL_SCOPE**. Full624/624,181unit,41contracts,6built-demo,216route observations/70focused cases,16deep native/108label probes đạt trên source của đợt density. Canonical140/140,0stale/blocked; xem CLI và receipt để đọc freshness. Trạng thái chỉ ở UI plan §16.6/16.20; các kết quả614/175/40 trước density là HISTORICAL_SNAPSHOT.

Scope local Frontend/mock; speech/hosted CI NOT_RUN, user acceptance PENDING; Backend/provider/production ngoài scope.
<!-- END_CORRECTIONS_CURRENT -->

## HISTORICAL_SNAPSHOT — hồ sơ trước đợt F01–F09

## Trạng thái kiểm chứng hiện hành

- Frontend source/runtime review mới nhất: [FE028 handoff](../../botsales-kit/execution/frontend-evidence/FE028/handoff.md); gate states: [quality matrix](../../botsales-kit/execution/frontend-evidence/FE028/quality-gate-matrix-current-20261008.json); detailed source review: [architecture](../../botsales-kit/execution/frontend-evidence/FE028/architecture-review-current-20261008.md).
- FE026 clean build/artifact hashes và FE027 route/feature/state/role evidence là current snapshot 08/10. `npm run verify` đạt; full built-demo E2E 512/512. Scope vẫn local React + synthetic MSW.
- Sau FE028 evidence capture, current `VERIFIED/STALE/BLOCKED/next` lấy duy nhất bằng `node ../botsales-kit/scripts/progress.mjs validate` và `status`; generated summary được cập nhật bằng `report`. FE checkpoint count không phải code percentage.
- UI spacing rollout có status độc lập trong `FRONTEND_UI_IMPROVEMENT_PLAN.md` §16.6. Bảng hiện ghi S20 `READY_FOR_ACCEPTANCE_LOCAL_SCOPE`; không gộp UI rows vào FE tracker.
- Mở để người dùng quyết định/đánh giá: FE-G05 thiếu Narrator transcript và broad human conformance review; FE-G09 là nghiệm thu cuối. Hosted CI và live backend/provider vẫn `NOT_RUN`/ngoài scope. Không tự ghi các mục này thành PASS.

**Current navigation:** implementation proceeds in canonical FE task/checkpoint dependency order until the authorized frontend work is closed. Preserve all existing working-tree changes and keep the scope Frontend-only. The separate spacing/UI rollout and prior architecture review remain documented in [plan §16.6](FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status) and [§16.17](FRONTEND_UI_IMPROVEMENT_PLAN.md#preimplementation-review-20261007).

**Current next step:** read the live FE checkpoint and dependency order from `frontend-plan.json` with the canonical CLI described below. The spacing/UI rollout has its own source of truth in [plan §16.6](FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status); do not infer its state from the FE tracker or vice versa. This file is a continuation pointer, not a second status ledger. Preserve scoped closeouts and do not record acceptance or UI status beyond evidence.

**Policy authority:** [FRONTEND_SPACING_STANDARD](FRONTEND_SPACING_STANDARD.md#unified-workflow) is the sole normative spacing-role rule/workflow source; [shared catalog](../apps/web/src/shared/ui/README.md) describes CURRENT/TARGET APIs; [plan §16](FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan) owns spacing/UI rollout priority, dependencies, and status. FE implementation priority and checkpoints are owned by `botsales-kit/execution/frontend-plan.json` and its progress ledger. §16.17 records the pre-source architecture review and baseline; §16.6 is the live status for that UI rollout. Historical policy snapshots remain historical.

## Công việc hiện hành

FE implementation order is the canonical Frontend task plan and tracker described below. Separately, spacing-role work follows [FRONTEND_UI_IMPROVEMENT_PLAN §16](FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan), its single normative workflow [FRONTEND_SPACING_STANDARD](FRONTEND_SPACING_STANDARD.md#unified-workflow), SPC-001–075, and the [CURRENT/TARGET shared catalog](../apps/web/src/shared/ui/README.md). This file only points to current owners and evidence; it is not another task ledger. Run the acceptance checks required by the active FE checkpoint and, for the UI rollout, the gates in its own plan; one does not close the other.

**Historical snapshot — S06 partial** (replaced by the S06/S07 closeouts and current status above). Refresh inventory/baseline per batch, preserve dirty work, and do not treat a scoped tooling PASS as full UI acceptance.

## Trạng thái và bằng chứng

[Historical specification audit — 06/10/2026](../evidence/frontend-ui-improvements/ui-governance-unified-20261006/REPORT.md) ghi scope/inventory/mapping/docs verification và các giới hạn. **HISTORICAL_SNAPSHOT — audit v15.0:** [report cũ](../evidence/frontend-ui-improvements/ui-policy-steel-20261006/REPORT.md) có27 shared exports/112 semantic roles,176composition occurrences,68TS/TSX, ba strict gates0finding và24/24existing fixtures; adversarial probes vẫn vượt gate. Browser diagnostic Finance/Imports chỉ chứng minh state đã kiểm, không thay full E2E/native200/speech review.

§15/report shared-composition là source/runtime snapshot trước lượt docs-only:216current renders;114comparable/102partial baseline;full485/486FAIL +retest6/6 riêng. W36/FE28 snapshots cũ và FE003.S05/W33 journal không là task next hiện hành. Lịch sử giữ trong plan và evidence/REPORT; không ghi đè baseline hoặc dùng after làm before.

Đọc số liệu hiện hành bằng CLI canonical; không chép lại con số từ snapshot lịch sử hay addendum. Tại thư mục gốc repository, chạy riêng `node botsales-kit/scripts/progress.mjs validate`, `node botsales-kit/scripts/progress.mjs status`, và `node botsales-kit/scripts/progress.mjs next`. `botsales-kit/execution/FRONTEND_PROGRESS.md` là báo cáo sinh từ cùng tracker sau `node botsales-kit/scripts/progress.mjs report`; không sửa tay ledger hoặc báo cáo sinh. FE tracker đo checkpoint bằng chứng còn hiệu lực, không phải tỷ lệ phần trăm code đã viết. Tracker Frontend tách biệt với tracker toàn sản phẩm.

## Chạy lại Frontend trên Windows và CI

Lệnh ứng dụng được chạy từ thư mục gốc `BotSalesAI_Frontend`. Ví dụ bên dưới giới hạn `PATH` trong tiến trình PowerShell hiện tại để CMD con tìm được Node ngay cả khi `PATH` kế thừa quá dài; giá trị ban đầu được khôi phục sau khi chạy. Không thay PATH cấp user/máy.

```powershell
$frontendRoot = (Get-Location).Path
if ((Split-Path $frontendRoot -Leaf) -ne 'BotSalesAI_Frontend') { throw 'Run this block from the BotSalesAI_Frontend root.' }
$nodeExe = (Get-Command node.exe -ErrorAction Stop).Source
$npmCmd = (Get-Command npm.cmd -ErrorAction Stop).Source
$systemRoot = $env:SystemRoot
$savedPath = $env:Path
try {
  $pathEntries = @(
    (Split-Path $nodeExe),
    (Split-Path $npmCmd),
    "$systemRoot\System32",
    "$systemRoot\System32\WindowsPowerShell\v1.0",
    $systemRoot
  ) | Select-Object -Unique
  $env:Path = $pathEntries -join ';'

  & $npmCmd --script-shell=cmd.exe run doctor
  if ($LASTEXITCODE -ne 0) { throw "doctor exited $LASTEXITCODE" }
  & $npmCmd --script-shell=cmd.exe run verify
  if ($LASTEXITCODE -ne 0) { throw "verify exited $LASTEXITCODE" }
  & $npmCmd --script-shell=cmd.exe run test:e2e
  if ($LASTEXITCODE -ne 0) { throw "test:e2e exited $LASTEXITCODE" }
}
finally {
  $env:Path = $savedPath
}
```

`npm ci` thay thế `node_modules`; chỉ chạy trong checkout/copy cô lập dành cho cài sạch. Không chạy nó trong working tree cần giữ nguyên dependency đã cài. CI hiện cấu hình ở [`../../.github/workflows/frontend.yml`](../../.github/workflows/frontend.yml): Ubuntu, Node 24, npm 11.17.0, sau đó `npm ci`, `npm audit --audit-level=low`, `npm run setup`, `npm run verify`, cài Chromium/Firefox và `npm run test:e2e`. Đây là nội dung workflow đã kiểm tra trong source; chỉ run GitHub Actions mới chứng minh CI đã chạy. Cảnh báo npm `allowScripts` của esbuild/MSW cần được xem xét theo package hiện tại; không tự phê duyệt script để làm sạch cảnh báo.

Để xem thứ tự checkpoint Frontend, chạy `node botsales-kit/scripts/progress.mjs status` và `node botsales-kit/scripts/progress.mjs next` từ thư mục gốc repository; xác thực evidence bằng `node botsales-kit/scripts/progress.mjs validate`. Cập nhật báo cáo sinh bằng `node botsales-kit/scripts/progress.mjs report`. Chỉ checkpoint receipt có source snapshot, hash log và kết quả lệnh thực tế; không biến một run local thành CI PASS.

## Điều kiện bàn giao

Điều kiện bàn giao/closing nằm ở [workflow canonical](FRONTEND_SPACING_STANDARD.md#unified-workflow) và acceptance của bước hiện hành trong [plan §16](FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan). Strict FAIL/UNKNOWN hoặc mandatory NOT_RUN không DONE; paired proof bị thiếu giữ giới hạn mở. Không ghi owner acceptance hoặc tăng FE-G01..09 từ policy/component count; docs-only không tạo runtime PASS.

Phạm vi duy nhất React Frontend với synthetic MSW. Không server/liveprovider/persistence/staging/deploy; giữcontracts/tokens canonical vàAI_RULES nguyên bản. Git root ở folder cha; workflow thật là [`../../.github/workflows/frontend.yml`](../../.github/workflows/frontend.yml). Cấu hình workflow không là hosted run PASS; local equivalent được scope cho phép. Không commit/push/merge/deploy nếu chưa được giao riêng.
