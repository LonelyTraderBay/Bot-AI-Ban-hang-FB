# FE027 — Nghiệm thu frontend bằng mock data

Ngày chạy: 02/10/2026. Scope `FRONTEND_WITH_SYNTHETIC_MOCK_API`. Browser chạy trên React demo artifact và synthetic MSW; không gọi backend/provider thật.

## Kết quả

- Full Playwright Chromium đạt 147/147. Có 54 route success smoke, axe + skip-link keyboard audit trên 54 route, 357 ca quyền đọc cho 51 route cửa hàng × 7 role, feature cases FE009–FE021, state cases, production/mock isolation, dataset 1.004 khách phân trang và bốn vertical journeys. Error composition đạt cho 50 route có route-owned read API; R33 dùng snapshot của Shell và được ghi `NOT_APPLICABLE`. Empty-state composition đạt 9/9 routes: 8 bảng và notification card list.
- `docs/route-implementation.json`: 54 route, 64 feature IDs, 65 feature-route rows; cả 65 rows có test tương tác UI trực tiếp với dữ liệu synthetic. Ma trận được sinh lại từ log 147/147; các giới hạn backend/contract nằm ở `gap` từng row.
- `docs/route-state-role-matrix.json`: 54 route × 7 role; 19 global state cases đạt, 432 ô state gồm 163 route-specific, 204 shared UI tested và 65 not applicable theo contract; không còn `NOT_TESTED`. Ma trận permission đọc được kiểm trực tiếp trên browser cho 51 route shop × 7 role; empty-list composition đạt 9/9 route.
- Reflow 320 CSS px đạt 54/54 route, không tràn ngang/page error. Đây là proxy nội dung cho 400% zoom, không phải thao tác zoom thật hay full screen-reader audit.
- Metric demo preview gần nhất được lưu đo 446,909 gzip bytes cho initial route và 185,403 gzip bytes cho chunk lớn nhất (`../FE025/demo-preview-metrics.json`). E2E lượt mới có build demo nhưng không đo lại bundle metric. Dataset 1.004 khách dùng page size 20 và cursor; không mount toàn bộ danh sách vào DOM.
- Thu được 4 screenshot và request manifest từ built React demo; mọi request trong manifest là mock. Không có page errors.

## Bằng chứng chính

- Full browser suite: `e2e-inbox-state-accessibility-current-20261002.log`
- Reflow: `route-reflow-320-current-20261002.log` và `.json`
- Matrix validation: `../FE022/current-vertical-slices-final-rerun-20261002.log`
- State/role matrix: `../FE023/route-state-role-matrix-inbox-state-current-20261002.log`; focused role test: `../FE024/route-role-matrix-current-final-20261002.log`
- Screenshot/request manifest: `ui-screenshots-20261002/manifest.json`
- Screenshots: `ui-screenshots-20261002/inbox-sales-script.png`, `inbox-price-stock-source.png`, `knowledge-content-preview.png`, `operations-digest-readiness.png`
- Shared verification: `../FE026/verify-inbox-layout-explicit-shell-current-20261002.log`; schema 356/356 and npm audit 0/478 are in `../FE024/`.

## Handoff and remaining limits

UI feature-route interaction coverage is complete for the 65 mapped rows under the accepted mock scope. Contract gaps such as shipping-address CRUD, account catalog, schedule writes, carrier label purchase, and server-side authorization remain labeled preview/unsupported states; no API endpoint or backend behavior is invented. The latest verified production build retains a chunk-size advisory (>500 kB raw; largest 730.75 kB raw / 184.41 KiB gzip).

GitHub CI, backend/provider, staging, full screen-reader, actual browser zoom and owner acceptance were not run or recorded. These local results validate UI/mock behavior and do not certify backend behavior, production readiness or owner acceptance.
