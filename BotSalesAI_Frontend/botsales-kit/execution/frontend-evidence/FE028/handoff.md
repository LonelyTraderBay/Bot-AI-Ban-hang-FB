# FE028 — Cổng chất lượng frontend và bàn giao mở rộng

Cập nhật 02/10/2026. Phạm vi là `FRONTEND_WITH_SYNTHETIC_MOCK_API`; không cần backend thật để nghiệm thu UI mock.

## Kết quả hiện có

- `npm run verify` đạt: generator freshness, source/operation/route checks, architecture boundaries với 8/8 negative fixtures, lint, typecheck, domain/MSW 88/88, Vitest 71/71 và production build.
- Cold copy `npm ci`, production build và demo build đạt. `npm run test:e2e` mới nhất đạt 147/147 Chromium trên React demo; production artifact không chứa MSW worker.
- 54 route có success smoke; 65/65 feature-route interactions có browser test trực tiếp với mock. Quyền đọc route đạt 357/357 trường hợp trên 51 route cửa hàng × 7 role mô phỏng. API-error composition đạt 50 route có route-owned read API; R33 là not applicable theo cache của Shell.
- State/role matrix có 432 ô: 163 route-specific, 204 shared UI tested, 65 not applicable theo contract, 0 `NOT_TESTED`; empty-list composition đạt 9/9 list routes.
- 4 vertical journeys và 54 axe/skip-link keyboard checks đạt. Reflow tại 320 CSS px đạt 54/54. Dataset 1.004 khách trả theo cursor.
- `npm audit` không phát hiện lỗ hổng trong 478 dependencies; mock JSON Schema 356/356.

## Cổng và giới hạn

FE-G01, FE-G02, FE-G03, FE-G04 (coverage tự động), FE-G06, FE-G07, FE-G08 và phần tự động hóa của FE-G09 đạt trong phạm vi local frontend/mock. FE-G05 còn thiếu browser zoom thật, full screen-reader review và phần color contrast axe báo incomplete. GitHub CI chưa chạy; owner acceptance đang chờ chủ sản phẩm xem UI.

Production bundle còn cảnh báo chunk lớn hơn 500 kB raw (latest verify: 730.75 kB raw / 184.41 KiB gzip). Hệ thống không được chứng nhận backend authorization, persistence, provider delivery, staging hay production readiness. Các gap hợp đồng được ghi riêng theo route/feature; UI không tự tạo endpoint, DTO hoặc policy.

FE017 dùng quyền `knowledge.publish` và lifecycle check theo quyết định scope của người dùng. `Knowledge.allowedActions` không được thêm vào OpenAPI, DTO hay generated code.

## Chạy lại và mở rộng

Tại thư mục dự án, chạy `npm ci`, `npm run verify`, `npm run build:demo` và `npm run test:e2e`. Demo dùng MSW; production không tự bật mock khi API thiếu. Seed là dữ liệu tổng hợp trong bộ nhớ; refresh khôi phục trạng thái. Base URL/API transport được cấu hình riêng với mock, không import mock vào module UI.

Frontend evidence ledger được cập nhật qua `node botsales-kit/scripts/progress.mjs`; không sửa progress/report/task Markdown bằng tay. Ledger toàn sản phẩm và backend gates giữ nguyên.
