# UIC02 — Đồng bộ backdrop dùng token

Sau commit UIC01 SHA 5610e0bff36da57bd2604a83968845042ac191d2, kiểm lại source hiện hành đạt 4/4 PASS trên Chromium và Firefox; hash theme khớp ảnh/đo after. Log: [overlay-current-source-chromium-firefox.log](overlay-current-source-chromium-firefox.log).
Lượt chẩn đoán trước đó khi worktree còn thiếu dòng MuiBackdrop override tái hiện 2/2 FAIL đúng baseline theme; log giữ tại [current-tree-overlay-failure-chromium.log](current-tree-overlay-failure-chromium.log). Đã khôi phục override theo token và lượt current-source xác nhận lại.
Trạng thái kiểm chứng local: **PASS**. Parent source SHA: `679f94380745fb42aae440c247cdcf275510127d`.

## Kết quả đo trước và sau

Token canonical từ `packages/design-tokens/src/tokens.json`: `#090C12CC`, computed value kỳ vọng: `rgba(9, 12, 18, 0.8)`. Cùng kịch bản Vite demo, seed mặc định, Chrome 155.0.8059.40 và Playwright Firefox 155.0, viewport 390×900 và 1440×900. Baseline lưu lúc 2026-10-16T17:54:01.346Z; sau sửa lúc 2026-10-16T17:55:07.781Z.

- Trước sửa: **0/18** lớp phủ hiển thị khớp token; màu đo được: `rgba(0, 0, 0, 0.5)`.
- Sau sửa: **18/18** lớp phủ hiển thị khớp token: Dialog, guard bản nháp, ConfirmDialog và Drawer mobile theo các viewport áp dụng.
- Select/Menu backdrop vô hình: **8/8** mẫu vẫn trong suốt.
- Paper surface, viền và bán kính dialog giữ nguyên giữa hai lần đo: **PASS**.
- Đóng bằng backdrop/Escape, giữ và bỏ bản nháp, trả focus, chặn xác nhận hủy khi thiếu lý do và đóng an toàn: **PASS**; pageerror trong hai lượt đo: **0**.

## Forced colors và regression

Chạy riêng với Playwright `forcedColors: 'active'` trên cùng hai browser và viewport (**8** mẫu). Cả hai pha đều thấy media query bật, dialog/backdrop hiện hữu và focus-visible; cặp trước/sau cho opacity 0,5 → 0,8 ở **4/4** mẫu. UA ánh xạ màu hệ thống khác nhau giữa Chrome và Firefox. Đây là kiểm tra browser emulation, không thay thế nghiệm thu trực tiếp bằng Windows High Contrast.
Regression `tests/ui-overlay-theme.spec.ts`: **4/4 PASS** trên project Chromium và Firefox của Playwright. Log: [playwright-regression.log](playwright-regression.log).
Full local verify trên source hiện hành: **PASS**; 15 generated outputs/346 schemas/245 operations/61 routes; 724 imports; domain 117 checks; Vitest 25 files/242 tests; layout 86/86; visual tokens 5/5; composition 41/41; S17 hiện có 19 command/log records, 16 coverage rows và 281 fingerprints. Log: [verify-uic02-current-source.log](verify-uic02-current-source.log).

## Phạm vi và giới hạn

Sửa đúng owner `apps/web/src/shared/ui/theme.ts`: visible `MuiBackdrop` lấy `colors.overlay`, slot `invisible` giữ `transparent`; không đổi token hoặc dependency. Browser run dùng ứng dụng Vite demo/MSW và dữ liệu tổng hợp. Kết quả xác nhận frontend local, không phải backend, staging, production hoặc UAT.

## Bằng chứng

- Raw computed-style và tương tác: [before.json](before.json), [after.json](after.json).
- Forced-colors riêng: [forced-colors-before.json](forced-colors-before.json), [forced-colors-after.json](forced-colors-after.json).
- 14 ảnh Chrome ghép theo phase/viewport/component: `before-*.png`, `after-*.png`.
- Lượt đối chiếu source hiện hành: [overlay-current-source-chromium-firefox.log](overlay-current-source-chromium-firefox.log); lần tái hiện regression trước khi khôi phục override: [current-tree-overlay-failure-chromium.log](current-tree-overlay-failure-chromium.log).
- Kịch bản tái tạo: [capture-uic02.mjs](capture-uic02.mjs), [capture-uic02-forced-colors.mjs](capture-uic02-forced-colors.mjs).
- SHA256 theme baseline: `4f0c1e67c38d2b07b335279436e1b7f72559c890c5241d95937d6e4d01d7607a`; theme sau sửa: `27682e063e02d2ec347f41b37d08ff8145180d1b2319fe528dd9dde7975e4e59`; regression spec: `9f4642c2be2dfc7c831152d88e6550dc751251355f8d7ce300b04a9b8df0a587`.
- `node scripts/generate.mjs --check`: PASS, 15 output / 346 schema / 245 operation / 61 route.
- `node scripts/check-source.mjs`: PASS, 85 file / 271 operation call / 61 route / 0 finding; `node scripts/check-boundaries.mjs`: PASS, 723 import / 10 negative fixture / 0 issue.
- `node scripts/check-visual-tokens.mjs`: PASS, 92 source file / 0 finding; TypeScript `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit`: PASS; ESLint `node node_modules/eslint/bin/eslint.js apps/web/src --max-warnings 0`: PASS.
- Shared test `node node_modules/vitest/vitest.mjs run --config apps/web/vitest.config.ts apps/web/tests/shared-ui-render-contract.test.tsx`: 54/54 PASS; Playwright `node node_modules/@playwright/test/cli.js test tests/ui-overlay-theme.spec.ts --workers=1 --reporter=line`: 4/4 PASS.
- Evidence fixtures `node --test tests/ui-evidence-validator.test.mjs`: 11/11 PASS; S17 validator: PASS, 13 command/log records / 11 coverage rows / 281 current fingerprints after refreshing the changed theme and adding the regression test hash.
- `npm.cmd` invocations for typecheck, lint and Vitest could not resolve local `.bin` executables in the CMD child PATH. Their exact CLI entrypoints were run directly through Node and passed; this is recorded as an environment limitation.
