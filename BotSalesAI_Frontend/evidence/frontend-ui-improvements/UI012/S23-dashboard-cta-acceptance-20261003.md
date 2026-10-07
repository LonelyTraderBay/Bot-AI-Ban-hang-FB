# UI012/S23 — Phản hồi hover/pressed cho CTA Dashboard

**Ngày:** 03/10/2026 · **Route:** R04 · **Kết quả:** sửa xong trong scope UI; UI012 vẫn 4/5 vì manual screen-reader review chưa đạt.

## Finding và sửa đổi

S22 cho thấy link “Xem việc cần làm” có ảnh hover và pointer-down trùng hash. Design system đã định nghĩa ba semantic color riêng `primary.main`/`primary.light`/`primary.dark` ánh xạ lần lượt `accent`/`accentHover`/`accentPressed`; riêng hai CTA Dashboard trước đó dùng `primary.dark` cả khi hover, không có trạng thái active riêng.

Trong [`DashboardPage`](../../../apps/web/src/modules/dashboard/index.tsx), cả hai primary CTA hiện dùng `primary.light` cho `:hover` và `primary.dark` cho `:active`. Giữ nguyên `:focus-visible` 2 px, route, nội dung, permission gate và bố cục. Không thêm token hoặc component dùng chung không cần thiết. [`UI012 Playwright regression`](../../../tests/ui012-keyboard.spec.ts) kiểm màu computed hover/pressed khác nhau, contrast text/background ≥4.5:1 và keyboard `:focus-visible` vẫn hiện.

## Bằng chứng trực quan và kết quả

- [Capture report JSON](S23-dashboard-cta-feedback.json) ghi Chromium 153, 1440×1000 CSS px, DOM styles, contrast, keyboard focus, page errors và giới hạn.
- Ảnh: [hover](S23-overview-hover.png), [pressed](S23-overview-pressed.png), [keyboard focus](S23-overview-keyboard-focus.png).
- Hover là `rgb(255, 219, 140)` với text `rgb(21, 24, 30)`, contrast **13.34:1**. Pressed là `rgb(223, 174, 79)` với cùng text, contrast **8.72:1**. Cả hai cao hơn ngưỡng 4.5:1 được test cho text thường. Keyboard focus vẫn `:focus-visible`, outline `rgb(255, 219, 140) solid 2px`.
- Targeted Playwright regression: **1/1 PASS**. Full `npm.cmd run verify`: **exit 0**; generator 11/283/210/54, source checker 3/3, boundaries 427 imports/0 issue/8 negative fixtures, lint, TypeScript, domain/MSW 88/88, Vitest 85/85 và production build PASS. Production warning về chunk 737.92 kB raw / 186.81 kB gzip còn nguyên.
- Full `npm.cmd run test:e2e -- --reporter=line`: **191/191 PASS** trong 10.6 phút trên local Windows/Chromium 153 + synthetic MSW. Route-role 357/357, empty state 11/11, route-error 51/51; built-demo preview 446,249 script-transfer bytes, 449,798 initial-route gzip bytes, largest chunk 187,952 gzip bytes, first synthetic customer page 343 ms. Production artifact isolation test PASS. Local evidence only.
- E2E có thể ghi lại evidence cũ; trước chạy đã snapshot 2.351 file dưới `evidence/` và `botsales-kit/execution/frontend-evidence/`. Sau chạy, 7 file bị ghi lại đã được khôi phục; kiểm tra cuối khớp **2.351/2.351** hash, không có file mới trong hai vùng snapshot.

## UI + kiến trúc và giới hạn

- **UI: PASS cho finding feedback CTA này.** S22 baseline được giải quyết bởi S23; không còn ảnh hover/pressed trùng trong probe này.
- **ARCH: PRESERVED.** Dashboard module giữ ownership CTA; semantic color lấy từ canonical theme/token mapping; không thay module boundary, contract, route, permission, generated source hoặc design token.
- Hai CTA Dashboard được sửa chung trong cùng module và regression. Các CTA/controls khác không được bao phủ bởi S23.
- Đây không phải transcript screen reader hoặc manual audit toàn app. Không có backend/provider, GitHub CI, staging hay owner UAT evidence. UI012 vẫn **IN_PROGRESS 4/5**, C04 `PARTIAL`; không ghi tăng FE/product ledger.

## Fingerprints

| Artifact | SHA-256 |
|---|---|
| `apps/web/src/modules/dashboard/index.tsx` | `601024AAFA9B0A0FB38D2B337A672A94D51679687EA2235E4BB8EDC195B4A6BA` |
| `tests/ui012-keyboard.spec.ts` | `EE70DE7C2DEB325F96A8CB08D966536316E22FD3F0A091B8A8A451175F517646` |
| Production JS entry `apps/web/dist/assets/index-TQ1oVog0.js` | `391122587015F3DA61B25C850B444CD5E5C145D225CDAC99C1A36A7CAAB6E8D4` |
| Demo JS entry `apps/web/dist-demo/assets/index-DuI_cjOo.js` | `F4433C81F7C3503319FFF1C974F37AC7729CD2F8D55AF8044AA68B1965625098` |

