# UIC06 — Shared API, composition, density và layout

**Kết quả:** `LOCAL VERIFIED` trên source UIC05 `9a8bcd1af62ecaad44fc345066db751906c92b23`; UIC05 đã push đúng SHA và cả push run `39015629456` lẫn PR run `39015632140` kết thúc `success`. Hai run đều có verify/build, Chromium E2E và ba Firefox shard PASS; PR run cũng hoàn tất upload evidence. Remote branch được kiểm tra cùng SHA `9a8bcd1af62ecaad44fc345066db751906c92b23`. UIC06 sẵn sàng commit/push riêng; GitHub checks UIC06 sẽ được xác minh sau khi push.

## Phạm vi và số liệu đo được

- Khám phá bằng TypeScript symbol từ ba owner file (`components.tsx`, `composition.tsx`, `draft-conflict.tsx`): **28/28 public component/composition export**. File [shared-api-closure.json](shared-api-closure.json) liệt kê từng API, owner/line, mọi file consumer và JSX use, direct render test, disposition; **26 API có production consumer**, **30 file consumer**, **1.431 JSX use**. `PartialDataNotice` và `CapabilityUnavailable` là hai export không có consumer; lifecycle decision S14 được ghi rõ, không tạo consumer giả. **28/28 API** có direct rendered contract coverage. Generator ghi fingerprint SHA-256 cho **50 file source/spec/test/tool**.
- Direct shared render contract: **54/54 test PASS** (`baseline-render-contract.log`). Composition gates: **41/41 test PASS**, 92 source file, **0 finding** (`composition-post-setup.log`). Layout gates: **86/86 test PASS**, 94 source file, **0 finding**, một exception đã khai báo (`layout-post-setup.log`).
- Chromium: **30/30** profile/consumer test PASS trong 5,9 phút và **10/10** collection/layout test PASS trong 1,1 phút. Firefox: **30/30** profile/consumer test PASS trong 7,8 phút và **10/10** collection/layout test PASS trong 1,5 phút. Tổng: **80/80 browser tests PASS** trên app demo cục bộ.
- Route composition browser matrix đo **61 canonical route × 2 viewport (390 và 1440 px) × 2 browser = 244 route-viewport observations**. Mỗi route được kiểm heading/loading, owner gap và child margin, shell inset, horizontal overflow và page errors; mỗi browser cũng kiểm đủ sáu shared composition owners.
- Bộ collection đo số lượng **0/1/2/3** visible shops; AI integration grid đo empty/1/2/3 và refetch; test còn kiểm full-width form, notice sau hai pane và DetailLine. Cùng lượt kiểm table, form, detail, dashboard, dialog, toolbar, query pending→ready, density và responsive geometry.
- Các test phát sinh artifact độc lập cũng được giữ lại: **4 JSON S12** quan sát R09/R11 ở Chromium và Firefox; **6 JSON S15** quan sát composition của Catalog, Dashboard và Knowledge trên cả hai browser. Các file ghi route, viewport, trạng thái/geometry thực đo và synthetic MSW scope; manifest băm cả 10 artifact cùng ba receipt source/boundary/domain do full verify cập nhật.
- Clean `npm ci`: exit 0, 411 packages, audit **0 vulnerabilities**. Npm báo hai install script (esbuild, MSW) chưa được duyệt theo cấu hình `allowScripts`; chúng không được phê duyệt hoặc bypass. `npm run setup`: PASS, outputs 15, schemas 346, operations 245, routes 61.
- Full `npm run verify`: **exit 0**. Source 15/15; boundaries 86 file/725 import, negative fixtures 10/10; domain 117/117; Vitest 26 file/249 test; layout 86/86; visual-token 6/6 và scanner 93 file/0 finding; composition 41/41/92 file/0 finding; evidence validator 11/11 và S17 `COMPLETE` với 27 command/log record, 22 coverage row, 283 current fingerprint.

## Lần chạy trước setup và exception có chủ sở hữu

Hai checker chạy trước `npm run setup` trả về một finding mỗi checker vì worktree mới chưa có file generated `apps/web/public/mockServiceWorker.js`. Owner `scripts/setup.mjs` tạo worker từ MSW; sau setup, cả hai checker được chạy lại và PASS với 0 finding. Log lỗi ban đầu được giữ tại `baseline-layout.log` và `baseline-composition.log`, không bị ghi đè hay đổi thành PASS.

Layout checker sử dụng đúng một exception đã có: `UI028-A11Y-SKIP-LINK-PADDING`, `apps/web/src/app/bootstrap.css` selector `.skip-link` padding 12px. Đây là cơ chế nhìn thấy skip link khi focus; catalog đã nêu owner, browser evidence và điều kiện gỡ. Scanner báo exception đang dùng, không báo finding.

## Giới hạn bằng chứng

Các browser test chạy trên Frontend demo với MSW/dữ liệu tổng hợp; chúng không chứng minh backend, provider, persistence, staging, production hoặc UAT thật. Backend trong repository vẫn là placeholder. UIC06 xác nhận export/consumer/render/layout trong phạm vi nêu trên; role × state × action closure thuộc UIC07, native zoom/text-only/screen-reader/human acceptance thuộc UIC08. Không có source API, nghiệp vụ hay quyền nào cần thay đổi trong UIC06 dựa trên các lượt kiểm này.

## Bằng chứng có thể lặp lại

- [Proof manifest](proof-manifest.json) ghi SHA-256/kích thước toàn bộ log, `.exit`, report, API closure/generator, 10 artifact S12/S15, ba receipt source/boundary/domain và snapshot của kế hoạch; hai lỗi pre-setup được phân loại rõ, mọi receipt bắt buộc sau setup/full verify phải exit 0.
- Cài đặt/setup/full verify: `clean-install.log`, `setup-final.log`, `full-verify.log` và các file `.exit` tương ứng.
- Owner closure và fingerprint: `build-shared-api-closure.mjs`, `shared-api-closure-generator.log`, `shared-api-closure.json`.
- Static gates: `baseline-render-contract.log`, `layout-post-setup.log`, `composition-post-setup.log`; lần chạy trước setup được giữ riêng.
- Browser consumers/routes: `browser-profiles-chromium.log`, `browser-profiles-firefox.log`.
- Collection 0/1/2/3 và density: `collection-0-1-2-3-chromium.log`, `collection-0-1-2-3-firefox.log`.
