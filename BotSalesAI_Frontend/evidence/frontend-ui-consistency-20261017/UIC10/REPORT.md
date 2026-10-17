# UIC10 — Kiểm chứng source cuối, full browser suite và built-demo

**Trạng thái:** `LOCAL_VERIFIED; HOSTED_CI_PENDING`. Lượt đo lại chạy trên `HEAD=a76ebc0252ce6bb5b480880c452445efdcb4658a` cùng thay đổi UIC10 trong working tree. Inventory băm 13 file source/test/config/evidence đầu vào và artifact thực tế; xem [build-artifact-inventory.json](build-artifact-inventory.json). Đây là Frontend chạy với API tổng hợp/MSW.

## Kết quả trên tree hiện tại

- `npm.cmd --script-shell=cmd.exe run verify` — **exit 0**. Log đầy đủ: [lượt đầu](npm-verify-corrected-sequence-r1.log) và [lượt sau khi làm mới S17](npm-verify-corrected-sequence-r2.log), kèm `.exit`. Lượt đầu dừng đúng ở S17 vì bốn fingerprint UIC10 đã cũ; các test/build trước validator đều qua. Tôi giữ log đó và dùng finalizer riêng để cập nhật đúng danh sách source được phép trước khi chạy lại từ đầu.
- Lượt `verify` cuối: generator 15 outputs / 346 schemas / 245 operations / 61 routes; source/session 15/15; boundary scan 725 imports và 10/10 fixture; domain 117/117; Vitest 252/252; lint/typecheck/production build PASS; layout 86/86 trên 94 file với 0 finding; visual token 6/6 trên 93 file với 0 finding; composition 41/41 trên 92 file với 0 finding; S17 validator 11/11. Kết quả S17 hậu finalizer: **41 command/log records, 36 coverage rows, 286 source fingerprints, COMPLETE**. Logs preverify/finalizer/hậu kiểm đều nằm cùng thư mục này.
- `node node_modules/@playwright/test/cli.js test --config=playwright.config.ts --list` — **exit 0**, discovery đo được **1.082 test / 79 file**, 541 test mỗi browser project. Log: [test-discovery-corrected-sequence-r1.log](test-discovery-corrected-sequence-r1.log). Đây là phép đếm, không phải kết quả chạy full suite trên tree mới.
- `npm.cmd --script-shell=cmd.exe run build:demo` — **exit 0**. Log: [build-demo-corrected-sequence-r1.log](build-demo-corrected-sequence-r1.log). Artifact đo được 38 file, aggregate SHA-256 `86bdc6411bf9fc2c73b54ffaa16c28b0e17dd089b2811de65a8ae6f12bf590da`.
- `npm.cmd --script-shell=cmd.exe run test:e2e -- --config=playwright.built-demo.config.ts --workers=1 --reporter=line` — **6/6 PASS** sau khi lệnh dự án tự chạy setup, production build và demo build. Chrome `155.0.8059.40` và Firefox `155.0` đều có UA major `155`; preview `/s/shop-demo/overview`, session và MSW worker trả HTTP 200, 0 page error, 0 API write. Mỗi browser đã render đủ 61 route ở 390×844 và 1440×900: **244 lượt route, 0 issue, 0 page error**. Log: [built-demo-corrected-sequence-r1.log](built-demo-corrected-sequence-r1.log); bốn JSON hiện hành được hash trong [test-output-inventory.json](test-output-inventory.json).
- Inventory artifact sau build: production `34/34` file, aggregate SHA-256 `9f656ab6ef03b8c2515acd23ff21e30d917c345db1265b6170f0911e8eb3e1a6`, **không có MSW worker/runtime**; demo `38/38`, **có** `mockServiceWorker.js`. Capture và validator tái lập được bằng [record-artifact-inventory.mjs](record-artifact-inventory.mjs) với log [artifact-inventory-capture-corrected-sequence-r1.log](artifact-inventory-capture-corrected-sequence-r1.log).

## Full E2E và trạng thái GitHub

Discovery hiện hành xác nhận cần chạy đủ 1.082 test trên đúng source. Các log full Chromium `541/541` và Firefox `INCOMPLETE` trong inventory là lượt cũ trên snapshot `81bc9ef044d21457b2a0879d22d2ea001fb529f8`, không được tính là kết quả full-suite của tree hiện tại. Lượt Firefox cũ bị dừng sau khi test 292 bắt đầu vì chỉ còn 4,56 GiB RAM khả dụng và 300 process Firefox dùng 31,13 GiB; log và biên nhận INCOMPLETE được giữ nguyên.

Full Chromium cùng ba shard Firefox của UIC10 **chưa chạy local** trên tree hiện tại; tôi sẽ dùng push và PR Actions trên exact SHA để kiểm tra đủ suite. Lúc ghi nhận này UIC07 vẫn đang chạy:

- Push run [#39071935869](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39071935869): job `verify` PASS; Chromium và ba Firefox shard còn `in_progress`.
- PR run [#39071938654](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39071938654): job `verify` PASS; Chromium và ba Firefox shard còn `in_progress`.

UIC10 chưa được push vì thứ tự đã thống nhất yêu cầu đợi UIC07, UIC08 và UIC09 có Actions terminal trên từng SHA trước, tránh workflow `cancel-in-progress` thay lượt đang chạy. Không nhận local demo/mock là Backend, provider, staging, production hoặc nghiệm thu người dùng.

Screen-reader/human speech review, thiết bị vật lý, Safari/Edge và Backend/provider/production vẫn chưa có bằng chứng trong phạm vi này. Các giới hạn đó được giữ là `NOT_RUN`; không biến chúng thành PASS qua số test tự động.

Sau khi ghi nhận và kiểm tra hash của các log, tree đã được commit thành `85e2a677951e0e46aef6919e775de3e0c0d54103`; thay đổi commit chỉ đóng gói đúng source/evidence đã đo. Push và exact-SHA Actions của UIC10 còn chờ UIC07–UIC09 theo thứ tự.
