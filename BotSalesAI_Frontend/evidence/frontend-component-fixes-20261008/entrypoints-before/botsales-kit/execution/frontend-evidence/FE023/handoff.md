# Bàn giao FE023 — states, forms, i18n và khôi phục UI

<!-- CORRECTIONS_CURRENT -->
## Kết quả hiện hành — Toolbar/Shell sau F01–F09

[Báo cáo source/gates hiện hành](../../../../BotSalesAI_Frontend/evidence/frontend-toolbar-20261008/REPORT.md) và [ca nghiệm thu](../../../../BotSalesAI_Frontend/evidence/frontend-toolbar-20261008/ACCEPTANCE_GUIDE.md) ghi kết quả của source mới nhất: full E2E 566/566, unit 174, dedicated built-demo 6/6. Trạng thái/thứ tự UI chỉ ở plan §16.6; FE freshness đọc CLI canonical, giữ mẫu số 140. Các manifest 554/173 của F01–F09 và 512/138 bên dưới là lịch sử theo source cũ.

Scope local React/TypeScript + HTTP MSW tổng hợp. Speech, hosted CI, Backend/provider thật và nghiệm thu người dùng giữ trạng thái riêng; không tự điền PASS.
<!-- END_CORRECTIONS_CURRENT -->

## HISTORICAL_SNAPSHOT — hồ sơ trước đợt F01–F09

## Kết quả xác minh hiện tại

- Vitest verbose chạy 12 file, đạt 138/138, exit 0. Có kiểm loading bounded, empty/error/forbidden/stale, partial data, capability unavailable, unknown mutation outcome, 422 focus/giữ input, 412/428/404 và mọi key tiếng Việt đã đăng ký.
- Browser chạy 36/36 trên Chromium và Firefox. Mỗi engine đạt 5/5 FE023 case: dirty dialog, customer lookup cursor, delayed load/retry, chuyển shop khi còn draft và reset dirty baseline sau save.
- Trên cả hai engine: route smoke 54/54; role matrix 357/357 (51 private route × 7 role); empty composition 11/11; API-error composition 51/51. API-error test kiểm tra không hiện success toast khi read API thất bại; R33 dùng shop snapshot của Shell nên không áp dụng route-owned API error.
- Snapshot ma trận sinh từ log unit/browser hiện tại được lưu tại `route-state-role-matrix-current-20261008-revalidated.json`: 54 route × 7 role; 19 shared-state case có kết quả; 432 ô route-state gồm 163 route-specific tested, 204 shared UI tested, 65 not applicable và 0 not tested. Role kỳ vọng lấy từ permission catalog; kết quả không chứng minh server RBAC. `BotSalesAI_Frontend/docs/route-state-role-matrix.json` vẫn giữ nguyên snapshot đã được FE003 xác minh trước đó; không thay đổi tài liệu dùng chung khi chỉ thu evidence mới cho FE023.
- `requiredVietnameseKeys` có 78 key đã đăng ký và test xác nhận đầy đủ. Ứng dụng hiện chỉ bật `vi`; kết quả này không khẳng định mọi chuỗi hard-coded đều đi qua i18next hoặc đã có ngôn ngữ thứ hai.

## Giới hạn nghiệm thu

Các test dùng React demo và synthetic MSW. Ma trận phân biệt trạng thái dùng chung với trạng thái được test trực tiếp theo route; không suy rộng shared-state test thành toàn bộ biến thể cho mỗi route. Không xác nhận server authorization, backend/provider thật, screen-reader UAT, browser zoom thủ công, hosted CI hoặc owner acceptance.

## Log hiện hành

- Unit: `unit-verbose-current-20261008-revalidated.log`
- Browser: `browser-state-current-20261008-revalidated.log`
- Sinh ma trận: `route-state-role-matrix-current-20261008-revalidated.log`
- Ma trận sinh hiện tại: `route-state-role-matrix-current-20261008-revalidated.json`
