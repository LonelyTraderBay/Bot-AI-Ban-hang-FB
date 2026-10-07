# FE004 handoff — TypeScript và ranh giới module

Cập nhật: 04/10/2026. Phạm vi `FRONTEND_WITH_SYNTHETIC_MOCK_API`. Revision nền `e68cb65e61c5c1aab2ae169dd8033df305df8872` trên `main` cùng working tree frontend đang sửa, chưa commit. FE004.S01–S05 đã hoàn tất; tracker hiện có 20/140 checkpoint, FE001–FE004 DONE, FE005.S01 tiếp theo, `blocked: []`. Snapshot trước S05 là lịch sử: 19/140 và FE004.S05 kế tiếp.

## Current FE004 verification — 04/10/2026

Rà soát FE004 tìm thấy router import trực tiếp `modules/catalog/imports.tsx`, bỏ qua public entry của feature. Đã re-export `ImportsPage` và `ImportResultPage` qua `modules/catalog/index.tsx`, chuyển router về import entry đó, và thêm luật AST cấm app deep-import vào nội bộ module. Fixture cho app→public-entry hợp lệ và app→deep-import bị từ chối; toàn bộ **10/10** fixture qua.

Full current checks: typecheck strict + `noUncheckedIndexedAccess` exit 0; ESLint `--max-warnings 0` exit 0; source checker 65 files/220 operation calls/54 routes/0 issue; AST boundaries 65 files/430 imports/0 issue; domain/MSW 88/88; Vitest 85/85 trên 10 files; generator 11 outputs/283 schemas/210 operations/54 routes; production build exit 0. Xem `S01-current-types-and-module-map-20261004.json`, `S02-current-types-lint-boundaries-20261004.json`, `S03-current-composition-review-20261004.json`, `S04-current-boundary-fixtures-20261004.json` và các log `S05-*-current-20261004.log`.

`npm ls` xác nhận React/React DOM được dedupe và một phiên bản MUI 7.3.1, TanStack Query 5.85.5, Router 7.18.4. `git diff --check` theo scope không có whitespace error; Git chỉ in cảnh báo chuyển LF/CRLF trên working tree Windows. Production build giữ advisory chunk lớn nhất **738.39 kB raw / 186.88 kB gzip**; đây là cảnh báo hiện hữu, không bị tính là build failure. Không sửa package hay runtime ngoài phạm vi task.

## Source và kiến trúc hiện hành

## Source và kiến trúc đã kiểm

`apps/web/src/main.tsx` là composition root duy nhất: một React root, một MUI `ThemeProvider`, một React Query client/provider và một React Router provider. `app/router.tsx` đọc route manifest, nối 54 route tới 16 feature modules qua public `index.tsx` bằng lazy imports. Feature modules không import chéo nhau, app shell hoặc mocks. `shared/api`, `shared/model`, `shared/ui` giữ transport/query, mô hình hiển thị chung và component/theme không thuộc nghiệp vụ.

`apps/web/tsconfig.json` bật `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals` và `noUnusedParameters`. Full typecheck không có diagnostics. Quét `apps/web/src` không thấy explicit `any`, `@ts-ignore` hoặc `@ts-expect-error`. Cây npm dedupe React/React DOM; app dùng một bản MUI, React Query và Router.

## Lượt kiểm chứng lịch sử ngày 01/10/2026

Windows, Node 24.19.0, npm 11.17.0; Chromium; synthetic MSW data. Tất cả lệnh npm dưới đây có exit 0.

| Cổng | Kết quả | Log |
|---|---|---|
| TypeScript | Full app, `strict` + `noUncheckedIndexedAccess`, không diagnostics | `S01-typecheck-registered-current-20261001.log` |
| ESLint | PASS, `--max-warnings 0` | `S02-lint-registered-current-20261001.log` |
| AST boundaries | PASS, 58 files / 402 imports / 0 issues; fixtures 8/8 | `S03-boundaries-registered-current-20261001.log` |
| Source mapping | PASS, 58 files / 224 operation references / 54 routes / 0 issues | `../FE001/S02-route-source-refresh-20261001.log` |
| Unit tests | PASS, 66/66 in 7 files | `S03-unit-registered-current-20261001.log` |
| Negative boundary fixtures | PASS 8/8: allowed, alias, relative, type-only, dynamic, unresolved, cycle, parser error | `S04-negative-fixtures-current-20261001.log` |
| Dependency tree | React 19.1.1 deduped; MUI 7.3.1, Query 5.85.5, Router 7.18.4 | `S03-dependencies-current-20261001.log` |
| Type suppression scan | PASS, no explicit `any` or suppression | `S02-type-suppression-scan-current-20261001.log` |
| Generated contract drift | PASS, 11 outputs / 283 schemas / 210 operations / 54 routes | `S05-generate-registered-current-20261001.log` |
| Scoped diff review | `noUncheckedIndexedAccess` and AST parser/boundary checks reviewed; no extra refactor justified | `S05-change-budget-review-current-20261001.log` |
| Whitespace | `git diff --check` exit 0; only Git LF/CRLF notices | `S05-diff-check-final-20261001.log` |

## Cách chạy lại trên Windows

Từ root `BotSalesAI_Frontend`, dùng PATH gọn trong process để Windows tạo môi trường child `cmd.exe` hợp lệ, sau đó chạy đúng mục `types`, `lint`, `boundaries` hoặc `unit` trong `botsales-kit/execution/frontend-command-map.json`:

```powershell
$env:Path = 'C:\Windows\System32;C:\Program Files\nodejs'
& cmd.exe /d /s /c 'set PATH=C:\Windows\System32;C:\Program Files\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run typecheck'
& cmd.exe /d /s /c 'set PATH=C:\Windows\System32;C:\Program Files\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run lint'
& cmd.exe /d /s /c 'set PATH=C:\Windows\System32;C:\Program Files\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run boundaries'
& cmd.exe /d /s /c 'set PATH=C:\Windows\System32;C:\Program Files\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe test'
```

Lần chạy đầu với PATH thừa dài không phân giải được `node`, `tsc` và `eslint`; các log lỗi vẫn được giữ (`S01-typecheck-current-20261001.log`, `S02-lint-current-20261001.log`, `S03-boundaries-current-20261001.log`, `S05-source-current-20261001.log`). Đó là lỗi khởi chạy môi trường. Các rerun với PATH gọn và lệnh đã đăng ký ở trên đều PASS; không sửa PATH toàn máy.

## Historical note and limits

Các log cũ ghi 11 chẩn đoán từ thử nghiệm `noUncheckedIndexedAccess` trước khi option này bật. Snapshot hiện tại đã bật option và full typecheck pass; diagnostic cũ không còn là gap hiện hành. Những addendum FE004 ngày 30/09 là lịch sử của source snapshot trước đó.

Các kết quả này kiểm frontend local với mock. FE003 lưu full Playwright 123/123 Chromium; GitHub CI, browser zoom thực, kiểm tra thủ công screen-reader/keyboard đầy đủ, owner acceptance, backend/provider thật và staging chưa chạy. Cảnh báo bundle >500 kB raw vẫn được theo dõi; không tuyên bố FE-G01..09 hoặc Production-Ready/Enterprise-Grade đã hoàn tất.

Sau khi checkpoint FE004.S05, chọn task kế tiếp bằng `node botsales-kit/scripts/progress.mjs status` và `next`. Không sửa tay generated source trong `packages/*/src/generated*` và không cập nhật ledger toàn sản phẩm.
