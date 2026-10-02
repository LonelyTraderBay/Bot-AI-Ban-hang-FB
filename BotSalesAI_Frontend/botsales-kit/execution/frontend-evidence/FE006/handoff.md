# FE006 — Bàn giao Graphite Gold và nền shared UI

Ngày xác minh: 2026-09-30  
Phạm vi: frontend React/TypeScript với synthetic mock API; không gọi backend thật.  
Nguồn thị giác: `botsales-kit/design/tokens.json` v2.1 và quyết định dark-only ADR-VIS-021.

## Thay đổi

MUI theme vẫn là một `createTheme` và một root `ThemeProvider`; typography, spacing, radii, breakpoints, semantic colors, touch target và reduced-motion được ánh xạ trực tiếp từ token đã duyệt. `h4` dùng page title 28px; `h5`/`h6` dùng section title 18px. CSS bootstrap dùng cùng font stack trước khi JS chạy và giữ dark canvas khi JS bị chặn. Các `Alert` mặc định có nền/text success, warning, danger và info từ semantic token surface/color; form input, table, menu, dialog, focus và reduced-motion tiếp tục dùng chung bridge. Không thêm palette, theme switcher, màu HEX trong MUI theme hoặc chỉnh generated file thủ công.

## Kiểm chứng lượt hiện hành

- `npm run generate:check`: PASS, 11 outputs/283 schemas/210 operations/54 routes.
- `npm run typecheck`: PASS; `npm run lint`: PASS.
- `npm test`: PASS, 3 files/45 tests; `components.test.tsx` PASS 17/17. Ca test mới xác nhận token typography/spacing/touch target, font pre-JS, reduced motion và 4 severity Alert surfaces.
- `npm run test:e2e`: PASS 23/23 Chromium trên source sau thay đổi FE006; chi tiết tại evidence FE003/S03. Không có CI run.
- Browser audit app React thật trên route `/s/shop-demo/overview`: 320/390/768/1440 CSS px, không tràn trang; bảng cuộn trong vùng có nhãn trên mobile; background HTML/body/root dark trước JS; forced-colors/reduced-motion được emulation; axe không có violation trên app/main, nhưng `color-contrast` còn incomplete.
- Contrast các 10 cặp token chữ/nền đạt tối thiểu 5.77:1; viền input token đạt 4.75:1. Đây là cặp token đã nêu và dashboard được kiểm tra, không phải chứng nhận WCAG toàn ứng dụng.
- Screenshot React hiện hành: `S04-dashboard-320.png`, `S04-dashboard-390.png`, `S04-dashboard-768.png`, `S04-dashboard-1440.png`; bản tổng hợp là `S04-visual-review.json`.

Một lượt test trước khi sửa assertion CSS ghi 44/45 do regex trong test nuốt dấu `}`. Assertion đã được sửa; lượt cuối PASS 45/45. Log lượt lỗi không còn trong bộ evidence hiện hành.

## Giới hạn

FE006 không xác nhận production/demo build sau thay đổi theme này, CI, full keyboard/screen-reader UAT, toàn bộ route/module contrast, backend/provider, staging hoặc production readiness. Axe `color-contrast` còn incomplete; review thủ công ở đây giới hạn dashboard desktop/mobile. MUI Alert `standard` là variant được kiểm; nếu UI dùng variant khác cần bổ sung token/contrast test trước khi dùng.

## Tiếp tục

Tracker frontend riêng là `botsales-kit/execution/frontend-progress.json`. Làm theo `progress.mjs next`; không sửa tracker toàn sản phẩm `botsales-kit/execution/progress.json`.
