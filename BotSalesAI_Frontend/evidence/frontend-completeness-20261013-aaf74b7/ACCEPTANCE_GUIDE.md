# Nghiệm thu Frontend/mock — 13/10/2026

Source: HEAD `aaf74b7787ef0f76228e533abe33d22a1b67459c` cộng thay đổi working tree được hash trong các execution record. Kết quả cuối nằm tại [REPORT.md](REPORT.md); hướng dẫn này không tự chứng nhận các phép thử đã đạt.

Chạy các lệnh tại `BotSalesAI_Frontend` trên Windows/PowerShell, Node 24.19.0 và lockfile hiện có:

```powershell
$env:Path='C:\Program Files\nodejs;'+(Split-Path (Get-Command git).Source)+';C:\Windows\System32;C:\Windows'
npm.cmd ci
npm.cmd run setup
npm.cmd run doctor
npm.cmd run verify
npm.cmd run test:e2e
npm.cmd run build:demo
npx.cmd playwright test --config playwright.built-demo.config.ts
npm.cmd run dev
```

`npm ci` thay dependencies đã cài; thực hiện trong checkout bàn giao hoặc bản sao sạch khi cần giữ môi trường đang dùng. Full E2E dùng cấu hình một worker của dự án. Chỉ cài Chromium/Firefox bằng `npx.cmd playwright install chromium firefox` nếu binary chưa có. Binary được đo qua browser.version(); navigator.userAgent có thể là chuỗi preset (Chrome/153 trong lượt binary Chrome 155). Đối chiếu browser-binary-probe-e2e.log; không suy mọi browser/thiết bị đều đạt.

Ma trận kiểm chứng cuối dùng Chrome cài trên máy ≥154 (máy này 155) và Playwright Firefox ≥155. Để tái hiện đúng ma trận này, chạy `npx.cmd playwright test --config evidence/frontend-completeness-20261013-aaf74b7/final-supported-matrix.config.ts --reporter=line,json`. Config giữ đủ 878 cases/70 files, một worker, mọi assertion và không retry. Lệnh `npm run test:e2e` dùng bundled Chromium 153 ở máy này; lượt r7 của lệnh đó có một lỗi document navigation `ERR_NO_BUFFER_SPACE`, vẫn được báo FAIL và giữ trace. Không suy ma trận Chrome 155 PASS chứng minh lỗi transport Chromium 153 đã được sửa.

Mở địa chỉ Vite in ra, ví dụ `/s/shop-demo/overview`. Banner **Dữ liệu mô phỏng** phải hiện. Mở **Công cụ demo** để chọn role, fault hoặc dataset tổng hợp. Context trình duyệt mới/reload reset cơ sở dữ liệu MSW trong bộ nhớ; kiểm lại shop/role trước ca mới. Không dùng dữ liệu này như đơn hàng, tiền hoặc giao dịch thật.

| Ca nghiệm thu | Thao tác và kết quả cần quan sát |
|---|---|
| Marketing R53 | Đổi ngày/bucket, áp dụng, reload/back: URL và số liệu lấy từ API; actual spend null có nhãn chưa có số thực. Khoảng hơn 366 ngày hoặc đảo ngày báo đúng trường, không gửi query sai. |
| Paging | Đi tiếp rồi quay trước, đổi filter và deep link; giữ filter, không bịa tổng/số trang. Bộ nhớ giữ 100 cursor gần nhất cho mỗi bộ lọc và tối đa 100 bộ lọc. Về đầu vẫn hoạt động sau khi cursor cũ bị loại. |
| Bảy detail | Bot revision, evaluation, channel, AI connection, member, notification, service case: mở đối tượng, thấy loading rồi dữ liệu GET riêng; 403/404 không dùng dữ liệu dòng để giả detail; 503 cho thử lại. Escape/đóng trả focus theo owner. |
| Commands R37 | Bảng **Trạng thái thao tác** có cursor riêng, mở detail/refresh lấy status API. Bot admin không thấy command inventory.adjust; unknown kind/khác shop bị từ chối. Xem lịch sử không gửi lại command hoặc tự mở khóa unknown intent. |
| Keyboard/reflow | Narrow/desktop, Tab vào dialog content có tên và cuộn bằng End khi nội dung dài; zoom 200%/Firefox Text Only 200% không cắt nhãn cảnh báo kênh. Axe và keyboard tự động không chứng minh speech của screen reader. |
| Existing nghiệp vụ | Tạo/sửa đối tượng, version conflict, draft navigation, permission, scope switch, partial/unknown/recovery theo các ca owner trong full JSON. Giữ draft khi lỗi; success chỉ sau acknowledged result. |
| Privacy R35 | Tạo yêu cầu theo scope; password step-up và approve vẫn unavailable theo FE009.S03. Không có đường tắt duyệt/xóa để tăng coverage. |

Artifact demo xem bằng `npm.cmd run preview`, mở `http://127.0.0.1:4173/s/shop-demo/overview`; script workspace phục vụ `dist-demo` bằng Vite preview. Harness `playwright.built-demo.config.ts` dùng API preview với root/mode/outDir chính xác và port riêng. Không dùng artifact production để trình diễn mock.

Transport live: `npm.cmd run dev:live`; `apps/web/vite.config.ts` proxy `/api` qua `API_PROXY_TARGET` đọc từ `.env.local` tại root `BotSalesAI_Frontend` (`envDir=repoRoot`), mặc định loopback port 3000. UI dùng canonical `/api/v2` qua shared client. Khi tích hợp server, cấu hình same-origin/reverse proxy, cookie/CSRF/OIDC và event contract ở server; không import MSW vào UI hoặc bật fallback mock. Không đưa secret vào biến `VITE_*`. Chưa có backend runtime trong checkout này.

Rollback local: giữ source/revision + lock + artifact/checksums của bản trước; build trong checkout riêng rồi kiểm artifact trước khi đổi bản được phục vụ. Không reset working tree có thay đổi, không thay ledger toàn sản phẩm và không có deployment trong lượt này.

Quyết định nghiệm thu của người dùng: **PENDING**. Speech/human accessibility và hosted CI: **NOT_RUN** trên source bàn giao. Backend/provider, staging, production: ngoài phạm vi. Các raw FAIL/partial run và scanner limitations được giữ trong REPORT và các log, không cộng targeted retest thành full PASS.
