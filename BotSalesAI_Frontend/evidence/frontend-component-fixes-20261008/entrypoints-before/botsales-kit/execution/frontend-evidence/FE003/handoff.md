# Bàn giao FE003 — runner và hợp đồng bằng chứng

<!-- CORRECTIONS_CURRENT -->
## Kết quả hiện hành — Toolbar/Shell sau F01–F09

[Báo cáo source/gates hiện hành](../../../../BotSalesAI_Frontend/evidence/frontend-toolbar-20261008/REPORT.md) và [ca nghiệm thu](../../../../BotSalesAI_Frontend/evidence/frontend-toolbar-20261008/ACCEPTANCE_GUIDE.md) ghi kết quả của source mới nhất: full E2E 566/566, unit 174, dedicated built-demo 6/6. Trạng thái/thứ tự UI chỉ ở plan §16.6; FE freshness đọc CLI canonical, giữ mẫu số 140. Các manifest 554/173 của F01–F09 và 512/138 bên dưới là lịch sử theo source cũ.

Scope local React/TypeScript + HTTP MSW tổng hợp. Speech, hosted CI, Backend/provider thật và nghiệm thu người dùng giữ trạng thái riêng; không tự điền PASS.
<!-- END_CORRECTIONS_CURRENT -->

## HISTORICAL_SNAPSHOT — hồ sơ trước đợt F01–F09

## FE003 evidence snapshot — 01/10/2026 (historical)

Phạm vi là giao diện React/TypeScript với synthetic mock API (`FRONTEND_WITH_SYNTHETIC_MOCK_API`). Revision nền là `18be3c6c75ed66ced592b2d58f36ffbdbd8ae221` trên `main`, kèm working tree có thay đổi frontend chưa commit. Không sửa ledger toàn sản phẩm.

Tại snapshot này, FE001–FE004 đã DONE với 20/140 checkpoint; đây là trạng thái trước các lượt thực hiện FE005–FE028 và không còn là trạng thái hiện hành.

## Lượt chạy mới nhất

- Windows, Node 24.19.0, npm 11.17.0, Chromium; dữ liệu chỉ từ MSW synthetic demo.
- Vitest/RTL: 66/66 qua 7 file. Lệnh gọi qua PowerShell shim từng bị execution policy chặn `vitest.ps1`; lỗi được giữ ở `S03-vitest-current-20261001.log`. Chạy cùng suite qua `cmd.exe` thành công ở `S03-vitest-cmd-current-20261001.log`.
- Playwright cấu hình Chromium liệt kê 123 test trong 18 file; `npm run test:e2e` đạt 123/123 ở `S03-e2e-current-20261001.log`. Run bao gồm setup, `generate:check`, typecheck, production/demo build, smoke 54 route, các tình huống module/state và bốn vertical journey.
- Axe được nạp trong suite; browser assertions thuộc phạm vi test đã chạy. Đây không phải kiểm toán thủ công đầy đủ: zoom thực, full keyboard/screen-reader, color contrast toàn diện và owner acceptance còn mở.
- Build kết thúc thành công nhưng có advisory chunk >500 kB raw. Kết quả là local Windows evidence, không phải GitHub CI. CI, backend/provider thật và staging chưa được chạy.

## Cách chạy lại trên Windows

Từ thư mục gốc `BotSalesAI_Frontend`, mở PowerShell:

```powershell
$env:Path = 'C:\Windows\System32;C:\Program Files\nodejs'
& 'C:\Program Files\nodejs\npm.cmd' --script-shell=cmd.exe test
& 'C:\Program Files\nodejs\npm.cmd' --script-shell=cmd.exe run test:e2e
```

Nếu cần xem danh sách E2E mà chưa chạy browser: `& 'C:\Program Files\nodejs\npm.cmd' --script-shell=cmd.exe run test:e2e -- --list`. Dùng `node botsales-kit/scripts/progress.mjs validate`, `status`, `next` để đọc frontend ledger trước khi chọn checkpoint; chỉ dùng `progress.mjs checkpoint` với evidence có log/hash và source snapshot. Không đăng ký CI PASS nếu chưa có GitHub Actions run.

## Hồ sơ liên quan

- Runner/config và kết quả mới nhất: `botsales-kit/execution/frontend-evidence/FE003/S03-runner-current-20261001.log`, `S03-vitest-cmd-current-20261001.log`, `S03-playwright-list-current-20261001.log`, `S03-e2e-current-20261001.log`, `S03-axe-import-current-20261001.log`.
- Lần launch Vitest bị policy chặn: `botsales-kit/execution/frontend-evidence/FE003/S03-vitest-current-20261001.log`.
- Lệnh canonical và trạng thái run: `botsales-kit/execution/frontend-command-map.json`; báo cáo hiện hành: `docs/CONTINUE_FRONTEND.md`, `evidence/REPORT.md`.
- FE003 evidence ghi snapshot working tree hiện tại; các addendum ngày 30/09 và các log cũ hơn trong report là lịch sử riêng, không thay kết quả trên.

FE-G01..09 chưa được tuyên bố hoàn tất chỉ từ runner này; không tuyên bố Production-Ready/Enterprise-Grade, CI, backend/provider, staging hoặc toàn sản phẩm đã nghiệm thu. Tiếp tục đọc `node botsales-kit/scripts/progress.mjs status` và `next`; ưu tiên FE004.S01 khi FE003.S05 được checkpoint.

## Runner and documentation audit snapshot — 04/10/2026 (superseded by FE028)

The following status and findings describe the point when FE003 was refreshed, before FE005–FE028 completed. Any “current” wording below refers only to that dated runner snapshot. See [final FE028 handoff](../FE028/handoff.md) for the present tracker and gate result.

FE003.S01–S03 have current source snapshots in `S01-current-command-map-20261004.json`, `S02-current-gate-task-crosswalk-20261004.json` and `S03-current-runner-baseline-20261004.json`. S01 checked ten active commands against package scripts/cwd and distinguished the retired `contracts` alias from `contract-tests`. S02 checked all nine FE gates and mapped all 28 frontend tasks to phase-level review gates; that map scopes review and does not say a gate passed. S03 ran Vitest **85/85 across 10 files** in 7.36 seconds, after the first host-shell launch could not resolve `vitest` due to an oversized injected PATH. The failed launch stays in `S03-unit-current-20261004.log`; the passing retry is `S03-unit-current-20261004-retry.log`. Playwright loaded the current config and listed **388 tests in 33 files** across Chromium and Firefox in `S03-playwright-list-current-20261004.log`; list mode is discovery, not test execution. The separate current UI012/S40 full browser evidence remains **388/388**.

For a local Vitest run on a host with a very long injected PATH, bound PATH for that process only:

```powershell
$repoBins = Join-Path (Get-Location) 'node_modules\.bin'
$env:Path = "$repoBins;C:\Program Files\nodejs;C:\Windows\System32;C:\Windows"
npm.cmd --script-shell=cmd.exe test
```

FE003.S04 was already valid and current once S01–S03 were restored. The additional S04 probe confirmed tracker `validate/status/next`, rejected wrong-scope and missing-log evidence, and left the ledger hash unchanged. Its first refresh helper expected S04 as the next checkpoint even though the tracker correctly selected S05; preserve that harness expectation mismatch in `S04-refresh.json` as diagnostic, not as a Frontend product failure. No checkpoint was recorded from the failed assumption.

At the FE003/FE004 refresh point the effective frontend ledger was **20/140 checkpoints**, FE001–FE004 DONE and FE005.S01 next. That snapshot and its document review were later superseded by FE005–FE028 and the final audit at `docs/FRONTEND_PLAN_DOCUMENT_AUDIT_2026-10-04.md`.

The PowerShell/native-runner PATH issue is environment-specific and did not require changing global settings. At this dated snapshot an older npm audit showed 9 high advisories; FE024 later updated the toolchain and measured zero current vulnerabilities. This FE003 refresh did not run a production/demo build or hosted CI. Backend/provider/staging and owner acceptance remain outside this runner evidence; no result in this handoff is Backend or production-runtime proof.

## Current Windows runner and documentation closeout — 07/10/2026 (FE003.S05)

This section records the FE003.S05 review on the Windows working tree at Git HEAD `53c0ba8f413b1f1e0fa16a747ed27f728b861dd6` plus uncommitted source changes. Environment: Node `v24.19.0`, npm `11.17.0`. At the start of S05, the canonical FE tracker reported 14/140 evidence checkpoints (9.33%), no blocked task, and FE003.S05 next; treat that as the start-of-step snapshot only. Query the CLI for the live count and next task. The FE tracker measures valid evidence fingerprints, not the percent of UI code implemented.

The current Windows rerun instructions are in [CONTINUE_FRONTEND.md](../../../../BotSalesAI_Frontend/docs/CONTINUE_FRONTEND.md). They invoke existing package scripts from `BotSalesAI_Frontend`, scope the temporary PATH change to the current PowerShell process, and restore the original value in `finally`. `npm ci` is limited to an isolated checkout because it replaces `node_modules`.

### Rechecked evidence and command results

| Check | Command / cwd | Result and evidence |
|---|---|---|
| Toolchain | `node --version`; `npm.cmd --version` / repository root | Node `v24.19.0`; npm `11.17.0`; Git HEAD above. |
| Local verify | `npm run verify` / `BotSalesAI_Frontend` | Exit 0; [log](../../../../BotSalesAI_Frontend/evidence/frontend-ui-document-sync-20261007/verify.log), SHA-256 `5917f7a430275e426297307fbc8e10f90961dd9e99405bdf2ca90e707fcfe123`. |
| Local full browser E2E | `npm run test:e2e` / `BotSalesAI_Frontend` | Exit 0, Chromium + Firefox, 504/504; [log](../../../../BotSalesAI_Frontend/evidence/frontend-ui-document-sync-20261007/e2e.log), SHA-256 `f0aed15b41fd27767829f897603f2d435f1e37674500d9563d43ae1b09b31b55`. Synthetic MSW demo only. |
| Unit baseline | Vitest/RTL / `BotSalesAI_Frontend` | 136/136 across 12 files; [log](S03-vitest-rtl-baseline-final-current-20261007.log), SHA-256 `680b0d3ae9eace6e3d292ace1e014cfcae07a1bbe98d5f6f15b0f9ad8de4a1d0`. |
| Domain/MSW baseline | `npm run test:domain` / `BotSalesAI_Frontend` | 88/88 (75 simulator + 13 network); [log](S03-domain-msw-baseline-final-current-20261007.log), SHA-256 `7260e9ef02481c757731749fa858b0758c63b17d01fa64f2347238699c47db3b`. |
| Cold install | `npm.cmd --script-shell=cmd.exe ci` / isolated temp copy | Exit 0; `npm ls --depth=0` exit 0; see [FE002.S05 receipt](../FE002/S05-clean-install-retry-verified-current-20261007.json). The first disposable attempt's failure is preserved and is not a product failure. |

The inherited shell PATH was too long for a child CMD lookup of `node`; a reduced process-only PATH resolved it. No machine/user PATH was edited. npm still reports `allowScripts` notices for esbuild/MSW; no script approval was added. A full Playwright `--list` discovery probe was stopped after the Node process reached about 3.5 GB RSS; its log is diagnostic and is not counted as a test result. Targeted config discovery and the independent 504/504 E2E run are recorded separately.

### Workflow and evidence boundaries

The inspected repository-root workflow is [`../../../../.github/workflows/frontend.yml`](../../../../.github/workflows/frontend.yml), SHA-256 `238511056b84e1cc972b87d2e8c673be34a8aac57295f4dd7855992c38804dc2`. It configures Ubuntu, Node 24, npm 11.17.0, clean install, audit, setup, verify, Chromium/Firefox installation and E2E artifact upload. **GitHub-hosted workflow run: NOT_RUN** in this evidence; workflow configuration and equivalent local checks do not establish a CI run. The S02 crosswalk also records that an older S19 relative-path fingerprint does not match this current root workflow file, so that historical fingerprint is not used as proof of current workflow content or execution.

FE-G05 still lacks complete human screen-reader/speech and conformance review; FE-G09 still requires product-owner acceptance. No evidence here proves Backend/provider, staging, production runtime or release approval. Keep older dated snapshots above as history; use `node botsales-kit/scripts/progress.mjs validate`, `node botsales-kit/scripts/progress.mjs status`, and `node botsales-kit/scripts/progress.mjs next` from repository root for live FE progress.