# Bàn giao FE003 — runner và hợp đồng bằng chứng

## Snapshot hiện hành — 01/10/2026

Phạm vi là giao diện React/TypeScript với synthetic mock API (`FRONTEND_WITH_SYNTHETIC_MOCK_API`). Revision nền là `18be3c6c75ed66ced592b2d58f36ffbdbd8ae221` trên `main`, kèm working tree có thay đổi frontend chưa commit. Không sửa ledger toàn sản phẩm.

Tại lúc rà soát, FE001–FE002 đã hoàn tất, FE003.S01–S04 đã VERIFIED; ledger frontend có 14/140 checkpoint, `blocked: []`, FE003.S05 là bước kế tiếp. Bằng chứng S05 này ghi nhận lượt hiện hành; sau checkpoint, số hợp lệ dự kiến là 15/140 và bước kế tiếp là FE004.S01.

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
