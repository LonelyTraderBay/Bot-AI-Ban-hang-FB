# UI022/S22 — current local runner and frontend gates — 03/10/2026

## Phạm vi và môi trường

Đây là kết quả local của repository-root CI workflow sau khi làm cho E2E runner Windows gọi npm CLI qua `process.execPath`, truyền tiếp filter CLI, giới hạn PATH cho các shell con, và để Playwright khởi động Vite trực tiếp bằng Node từ `apps/web`. Thay đổi chỉ chạm package/test-runner/config; React UI, OpenAPI, route manifest, design tokens, generated source và progress ledger không đổi.

Máy kiểm: Windows, Node `v24.19.0`, npm `11.17.0`, Playwright Chromium 153, demo React + synthetic MSW. Phiên chạy dùng PATH process-scoped chỉ gồm thư mục Node và Windows system directories để tránh PATH môi trường công cụ hiện tại làm CMD không phân giải executable; biến PATH của hệ thống/người dùng không được sửa.

## Kết quả

| Lệnh / bước | Kết quả quan sát được |
|---|---|
| `npm.cmd run test:e2e -- tests/ui009-scope-regression.spec.ts --reporter=line` | Exit 0; setup, generator check, production/demo builds và UI009 **1/1 PASS** (4,9 giây). Xác nhận test filter được truyền từ package script tới Playwright. |
| `npm.cmd run test:e2e -- --reporter=line` | Exit 0; full Chromium E2E **188/188 PASS** trong 10,6 phút, 1 worker. |
| Route-role matrix / empty / route-error | **357/357**, **11/11**, **51/51 PASS**. |
| Built demo preview | Initial script transfer **446.249 bytes**; initial-route gzip **449.788 bytes**; largest chunk gzip **187.950 bytes**; 1.004 synthetic customers, API page size 20, first page **336 ms**. |
| `npm.cmd run verify` | Exit 0: generator **11 outputs / 283 schemas / 210 operations / 54 routes**; source **64 files / 220 API refs / 54 routes**; source-checker **3/3**; boundaries **427 imports / 0 issue / 8/8 negative fixtures**; ESLint, TypeScript, domain/MSW **88/88**, Vitest **85/85**, production build. |
| Production build advisory | Largest production chunk **737,92 kB raw / 186,81 kB gzip**; configured raw-size advisory remains. |

## Bảo toàn artifact có sẵn

Full E2E ghi lại sáu artifact thuộc snapshot trước phiên chạy: FE025 `demo-preview-metrics.json`, FE025 `large-dataset-metrics.json`, UI004 `S03-final-list-105.png`, UI005 `S03-edit-mobile.png`, UI005 `S03-edit-selected-outside-first-page.png` và UI005 `S04-edit-lookup-403-preserves-product.png`. Chúng đã được khôi phục từ snapshot SHA-256 lưu trước đó; sau khôi phục **13/13** file snapshot khớp hash. Bản đo hiện tại của lượt này được ghi trong mục trên, không ghi đè các artifact lịch sử.

## Cặp UI / kiến trúc và giới hạn

- **UI: PASS trên suite tự động hiện hành** — 188/188 test trên React demo với synthetic MSW.
- **ARCH: PASS trong scope runner** — npm CLI được gọi qua đường dẫn npm do lifecycle cung cấp; Playwright chạy Vite bằng Node trực tiếp với `cwd=apps/web`; cùng một source và lockfile được dùng cho setup/build/test. Không thêm browser engine hoặc module runtime mới.
- **UI022.C04 vẫn PARTIAL** — đây là local Windows evidence, không phải GitHub Actions run. Workflow root còn uncommitted và chưa có hosted install, runner log, artifact hoặc run URL; không có commit/push trong lượt này.
- Readiness giữ **7/9**; FE-G05 manual/screen-reader và FE-G09 owner UAT còn mở. Không có Backend/provider/staging/production claim.
