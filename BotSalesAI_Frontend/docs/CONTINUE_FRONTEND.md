# Tiếp tục frontend với mock API

Cập nhật 02/10/2026 theo yêu cầu người dùng: hoàn thiện UI frontend bằng synthetic mock API; backend thật không phải điều kiện nghiệm thu màn hình. Scope `FRONTEND_WITH_SYNTHETIC_MOCK_API`. Không cập nhật ledger toàn sản phẩm.

## Trạng thái hoàn tất

`node botsales-kit/scripts/progress.mjs status` xác nhận 100% — 140/140 checkpoint, 28/28 task, `blocked=[]`, `stale=[]`. `validate` xác nhận cấu trúc 28 task/140 checkpoint. Ledger biểu thị checklist UI frontend với mock API, không phải release certification.

## Bằng chứng mới nhất

Windows Node 24.19.0/npm 11.17.0: `npm run verify` đạt (generator, source/boundaries, lint/typecheck, domain/MSW 88/88, Vitest 71/71, production build). Full Chromium E2E đạt 147/147 trên React demo build: 54 route success, axe/keyboard, FE009–FE021, state tests, 357 role-route checks, 9 empty-state routes, 51 route error compositions và bốn vertical journeys. Mock JSON Schema 356/356; npm audit 0/478. Ma trận state: 54 routes × 7 roles, 432 cells, 0 `NOT_TESTED`. Reflow 320 CSS px không tràn trên 54/54 route.

Log hiện hành: `botsales-kit/execution/frontend-evidence/FE026/verify-ui-select-and-feplan-002-20261002.log`, `FE027/e2e-ui-select-and-feplan-002-current-20261002.log`, `FE023/unit-verbose-ui-select-current-20261002.log`, `FE024/mock-schema-isolated-ui-select-current-20261002.log`, `FE024/npm-audit-ui-select-current-20261002.json`. Bốn ảnh UI và request manifests ở `botsales-kit/execution/frontend-evidence/FE027/ui-screenshots-20261002/manifest.json`.

## Quyết định và giới hạn

FE017 dùng quyền `knowledge.publish` + lifecycle check cho UI mock theo quyết định trực tiếp của người dùng; không thêm `Knowledge.allowedActions` vào OpenAPI/DTO/generated code. Production artifact không có MSW worker; demo có. Các màn hình/provider preview được gắn nhãn synthetic và không giả đã lưu server.

FE-G05 còn chờ browser zoom thật, screen-reader và hoàn tất color-contrast; 320px hiện là reflow proxy. FE-G09 tự động đạt, nhưng chủ sản phẩm chưa xác nhận UAT. GitHub CI, backend/provider, server authorization, hosting và staging không được suy ra từ local tests. Production build có advisory chunk 730.75 KiB raw/184.41 KiB gzip; audit strict của design tool còn 12 false positive đã đối chiếu trong `evidence/frontend-design-audit-reconciliation-current-20261002.md`. Xem `docs/KNOWN_GAPS.md` và `evidence/REPORT.md` để biết từng giới hạn.

Luôn đọc `AGENTS.md`, nguyên bản `AI_RULES.md`, `docs/FRONTEND_SCOPE.md`, `docs/PROJECT_CONTEXT.md`, `docs/KNOWN_GAPS.md` và `evidence/REPORT.md`. Chỉ sửa source React/TS trong `apps/web`; generated contract phải do generator tạo; chạy `npm run generate:check` và các gates liên quan sau khi sửa.

## Runner revalidation ngày 01/10/2026

Sau FE002, Vitest/RTL chạy 66/66 trong 7 file; Playwright nạp 123 test trong 18 file; full Chromium `npm run test:e2e` chạy lại và đạt 123/123, bao gồm setup, `generate:check`, typecheck, production/demo builds và bốn vertical journeys. Axe được nạp trong browser cases; package import cũng được xác minh. Lần gọi Vitest với `--script-shell=powershell.exe` bị Windows execution policy chặn ở `vitest.ps1`; lần chạy lại qua `cmd.exe` thành công và suite không bị tắt.

Log mới: `botsales-kit/execution/frontend-evidence/FE003/S03-vitest-cmd-current-20261001.log`, `S03-playwright-list-current-20261001.log`, `S03-axe-import-current-20261001.log` và `S03-e2e-current-20261001.log`. Đây là local Windows evidence, không phải GitHub CI. Tiếp tục dùng command map `botsales-kit/execution/frontend-command-map.json` và shell `cmd.exe` cho lệnh npm gọi shim trên Windows.
