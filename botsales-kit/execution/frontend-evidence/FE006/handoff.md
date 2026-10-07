# FE006 — Bàn giao Graphite Gold và nền shared UI

Ngày xác minh: 2026-10-04  
Phạm vi: frontend React/TypeScript với synthetic mock API; không gọi backend thật.  
Nguồn thị giác: `botsales-kit/design/tokens.json` v2.1 và quyết định dark-only ADR-VIS-021.

## Thay đổi

MUI theme vẫn là một `createTheme` và một root `ThemeProvider`; typography, spacing, radii, breakpoints, semantic colors, touch target và reduced-motion được ánh xạ trực tiếp từ token đã duyệt. `h4` dùng page title 28px; `h5`/`h6` dùng section title 18px. CSS bootstrap dùng cùng font stack trước khi JS chạy và giữ dark canvas khi JS bị chặn. Các `Alert` mặc định có nền/text success, warning, danger và info từ semantic token surface/color; form input, table, menu, dialog, focus và reduced-motion tiếp tục dùng chung bridge. Không thêm palette, theme switcher, màu HEX trong MUI theme hoặc chỉnh generated file thủ công.

## Kiểm chứng hiện hành

- `npm run verify`: PASS trên source hiện hành; generator 11 outputs/283 schemas/210 operations/54 routes, strict typecheck, lint, source/boundary, domain/MSW 88/88, Vitest 85/85 và production build. Đây là check tổng hợp local; bundle lớn nhất còn advisory 738.39 kB raw/186.88 kB gzip.
- Token map hiện hành: dark-only Graphite Gold, generated tokens khớp canonical, typography/spacing/radii/breakpoints/semantic colors/touch/reduced-motion map đủ, không có HEX literal trong MUI theme; 10/10 kiểm tra PASS.
- Browser audit app React thật trên route `/s/shop-demo/overview`: 320/390/768/1440 CSS px, document không tràn ngang; bảng cuộn trong vùng có nhãn ở 320/390; HTML/body/root giữ nền dark trước JS; forced-colors/reduced-motion được emulation; axe không có violation ở app/main. `color-contrast` vẫn incomplete.
- Contrast đo trên DOM dashboard: 79 mẫu chữ, 0 fail, tỷ lệ thấp nhất 6.31:1; axe vẫn incomplete nên số đo chỉ bao phủ route/mẫu quan sát, không là chứng nhận WCAG toàn ứng dụng.
- Screenshot và JSON lượt mới nằm trong `current-20261004/`; `S04-contrast-manual-current-20261004.json` ghi kết quả contrast DOM. Bản cũ được giữ để truy vết.

## Giới hạn

FE006 không xác nhận hosted CI, full screen-reader/human conformance, toàn bộ route/module contrast, backend/provider, staging hoặc production readiness. Axe `color-contrast` còn incomplete; quan sát hình ảnh và contrast giới hạn dashboard desktop/mobile. MUI Alert `standard` là variant được kiểm; nếu UI dùng variant khác cần bổ sung token/contrast test trước khi dùng.

## Tiếp tục

Tracker frontend riêng là `botsales-kit/execution/frontend-progress.json`. Làm theo `progress.mjs next`; không sửa tracker toàn sản phẩm `botsales-kit/execution/progress.json`.
