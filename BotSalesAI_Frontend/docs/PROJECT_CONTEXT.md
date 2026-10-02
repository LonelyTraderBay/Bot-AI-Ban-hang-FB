# Hồ sơ dự án frontend

## Mục tiêu và nguồn đã duyệt

Mục tiêu theo yêu cầu người dùng: hoàn thiện frontend BotSales AI bằng React/TypeScript và synthetic mock API đủ cho nghiệm thu UI. Backend thật không phải điều kiện để hoàn tất giao diện. Áp dụng nguyên bản `AI_RULES.md`; giữ kiến trúc nhất quán, rõ ranh giới và có thể mở rộng. Chưa tuyên bố Production-Ready/Enterprise-Grade trước khi mọi gate bắt buộc được xác nhận.

Nguồn contract là `botsales-kit/contracts/openapi.json`, `route-manifest.json` và `design/tokens.json`. Task chuẩn là `botsales-kit/execution/frontend-plan.json`; tiến độ chỉ ghi trong `frontend-progress.json` bằng `scripts/progress.mjs`. Kế hoạch, ledger toàn sản phẩm và `tasks/T*.md` ngoài scope, chỉ đọc.

## Trạng thái hiện tại — 02/10/2026

- UI React có 54 route canonical và 16 module nghiệp vụ; MSW chỉ được bật ở demo/test. Production artifact không chứa worker hay runtime mock. Dữ liệu mẫu là tổng hợp, có nhãn và reset theo phiên tab.
- Windows Node 24.19.0/npm 11.17.0: `npm run verify` đạt; generator 11 outputs/283 schemas/210 operations/54 routes; source 62 files/227 operation refs/54 routes; boundaries 410 imports, negative fixtures 8/8; ESLint, TypeScript, domain/MSW 88/88, Vitest 71/71 và production build đều đạt.
- Full Chromium E2E đạt 147/147 trên demo build: route success/state, axe và keyboard, FE009–FE021, 357 route-role cases, 9 empty states, 51 route error compositions và bốn luồng xuyên module. Schema mock đạt 356/356; npm audit 0 lỗ hổng/478 dependencies.
- Ma trận feature có 64 feature IDs và 65/65 feature-route interaction rows có browser test trực tiếp. Ma trận state có 54 route × 7 vai trò, 432 ô: 163 route-specific, 204 shared UI, 65 không áp dụng theo contract và 0 `NOT_TESTED`. Reflow 320 CSS px đạt 54/54 route.
- Ledger frontend hiện 100% — 140/140 checkpoint, 28/28 task, không BLOCKED/STALE. Đây là hoàn thành checklist UI/mock; nó không cấp quyền phát hành hay thay owner approval. FE-G05 còn phần kiểm zoom thật/screen-reader/contrast thủ công; FE-G09 chờ chủ sản phẩm xác nhận.

## Kiến trúc và giới hạn

Giữ một MUI, React Query và Router; module không import module nghiệp vụ khác; shared không chứa logic nghiệp vụ. API IO theo operationId/DTO canonical. MSW chỉ chạy trong demo/test; không có fallback mock ở live/production. Không sửa tay source generated; chạy `npm run generate:check` sau thay đổi contract.

FE017 dùng quyền `knowledge.publish` cùng lifecycle check làm substitute UI theo quyết định trực tiếp của người dùng; canonical OpenAPI không có `Knowledge.allowedActions`, và không thêm field đó vào DTO/generated code. Các giới hạn contract/provider được ghi trong `docs/KNOWN_GAPS.md`; giao diện báo rõ preview mô phỏng, không giả vờ đã lưu server hoặc gọi dịch vụ thật.

Bằng chứng mới nhất nằm ở `botsales-kit/execution/frontend-evidence/FE026/verify-ui-select-and-feplan-002-20261002.log`, `FE027/e2e-ui-select-and-feplan-002-current-20261002.log`, `FE023/unit-verbose-ui-select-current-20261002.log`, `FE024/mock-schema-isolated-ui-select-current-20261002.log` và `FE027/ui-screenshots-20261002/manifest.json`. Xem `evidence/REPORT.md` để biết trạng thái FE-G01..09 và phần chưa được xác nhận.

## Tiếp tục

Checklist triển khai frontend mock đã đủ 100%. Bước sau là người dùng xem các ảnh demo và xác nhận UAT; nếu cần tuyên bố production/release thì hoàn thành kiểm zoom browser thật, screen-reader, axe color contrast và các gate môi trường/owner còn mở. Không tự ghi owner acceptance, không cập nhật ledger toàn sản phẩm, không push/merge/deploy. Đọc `AGENTS.md`, `AI_RULES.md`, `docs/FRONTEND_SCOPE.md`, `docs/KNOWN_GAPS.md` và `evidence/REPORT.md` trước khi mở rộng.
