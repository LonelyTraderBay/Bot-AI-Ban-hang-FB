# Bàn giao FE023 — states, forms, i18n và khôi phục UI

## Bằng chứng hiện hành

- Vitest verbose: 71/71. Có kiểm loading bounded, empty/error/forbidden/stale, partial data, capability unavailable, 422 focus và giữ input, 412/428/404, unknown command outcome và toàn bộ common Vietnamese translation keys.
- Chromium E2E: 147/147 trong `../FE027/e2e-inbox-state-accessibility-current-20261002.log`. Năm kịch bản FE023 kiểm dirty-dialog guard, cursor pagination, loading/retry, đổi shop khi draft chưa lưu và reset dirty baseline sau save. Lượt này còn xác nhận cột bối cảnh Inbox cuộn độc lập và composer luôn nằm trong khung.
- `docs/route-state-role-matrix.json` được sinh lại từ hai log trên: 54 route × 7 role, 19 global state cases có test, 432 ô route-state gồm 163 route-specific, 204 shared UI tested và 65 not applicable theo contract; không có ô `NOT_TESTED`.
- Browser evidence bao gồm success 54/54 routes, empty-list composition 9/9 routes và API-error composition 50/50 routes có route-owned read API. R33 là `NOT_APPLICABLE` vì shop settings dùng snapshot được shared Shell nạp/cache; test không tính đây là route API-error.
- Route read permission được kiểm qua browser trên 51 shop routes × 7 roles = 357 cases. Kết quả dựa trên permission catalog và không chứng minh server RBAC.

## Giới hạn

Chỉ tiếng Việt được bật làm ngôn ngữ ứng dụng. Shared-state cases chứng minh UI dùng chung; ma trận ghi rõ những ô nào là shared, route-specific hoặc không áp dụng. Mock errors không đại diện cho backend. Screen-reader UAT, browser zoom thật và owner acceptance cần xác nhận riêng.

## Bằng chứng

- Unit: `unit-inbox-state-current-20261002.log`
- Browser: `../FE027/e2e-inbox-state-accessibility-current-20261002.log`
- Matrix generation: `route-state-role-matrix-inbox-state-current-20261002.log`
- Generated matrix: `../../../../docs/route-state-role-matrix.json`
