# Bàn giao FE003 — runner và hợp đồng bằng chứng

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
