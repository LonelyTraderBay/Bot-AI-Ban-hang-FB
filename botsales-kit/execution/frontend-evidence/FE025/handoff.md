# FE025 — Bàn giao responsive, accessibility và hiệu năng

Ngày xác minh: 08/10/2026  
Phạm vi: `FRONTEND_WITH_SYNTHETIC_MOCK_API`; local React app/demo, dữ liệu MSW tổng hợp.

## Kết quả theo checkpoint

- **S01 — baseline:** Chromium 153 và Firefox 155, viewport 1280×720, demo build có 31 JS assets. Initial route gzip là 453.567 byte; chunk lớn nhất là MUI 100.019 byte gzip. Dataset `FE025-LARGE-CUSTOMERS-1000-V1` tạo 1.000 khách hàng tổng hợp; API trả trang đầu 20/1.004 bản ghi, 21 DOM rows kể cả header. Thời gian trang đầu quan sát trong lần đo này: 354 ms Chromium, 433 ms Firefox.
- **Ngưỡng cần review:** test hiện có áp các guard 500 KiB initial-route gzip và 200 KiB largest-chunk gzip. Mã gọi đây là `proposedBudgets` và nêu rõ đây là giới hạn preview local, không phải SLO Backend/platform. Receipt giữ chúng ở trạng thái đề xuất/guard của test, không ghi thành ngân sách production đã duyệt.
- **S02 — reflow và tương tác:** FE001 ghi full E2E 512/512 (Chromium 256/256, Firefox 256/256). W28 đo 54/54 route tại 390 và 1440 px ở cả hai browser; W29 đo 320, 390, 767, 768, 1024, 1279, 1280, 1440 và 1920 px trên hai browser với 7 profile, không issue/page error/overflow. Dashboard media audit bổ sung 320/390/768/1440 px. Browser zoom thật 200% Chromium 5/5; native text-only zoom Firefox 155 5/5, giữ viewport và DPR. Layout gate hiện hành: 82/82 tests, 76 source files, 0 findings.
- **S03 — performance/artifact:** production và demo build, generate-check, typecheck chạy trong wrapper E2E và đều qua. Production bundle lớn nhất: MUI 328.326 byte raw/100.019 gzip; Charts 313.031 raw/94.993 gzip. Demo preview kiểm request mock session và xác nhận production artifact không mang worker/fixture MSW. Dataset test giữ giới hạn một trang API và DOM.
- **S04 — accessibility:** axe theo tags WCAG 2.1 A/AA không có violation trên 54 route loaded state ở Chromium và Firefox. Bộ keyboard-only hiện tại đạt 18/18 trên hai browser. Browser media audit xác nhận `forced-colors: active`, `prefers-reduced-motion: reduce`, focus outline vẫn hiện và scroll behavior là `auto`. Riêng audit dashboard ghi axe `incomplete: color-contrast`; đây không phải violation nhưng cần giữ là trường hợp chưa tự kết luận.
- **S05 — bàn giao:** artifacts, lệnh, log, hash source và giới hạn được liên kết trong các receipt S01–S05. Không có thay đổi source sản phẩm trong FE025; các số đo không cho thấy bottleneck vượt guard local hiện hành nên không thêm cache, virtualization hoặc global state.

## Spacing-role finding đã xử lý trước FE025

`BotSalesAI_Frontend/evidence/REPORT.md` và các scoped reports ghi nhận lỗi spacing role trên Approvals, Notification devices, Profit & loss và Shipments đã được sửa tại owners `FormFields`/`FieldGroup`/`ActionGroup`/`PageSections`. Source hiện tại cho Shipments đặt preview có điều kiện và danh sách shipment trong `PageSections`; composition regression đi qua wrapper và nhánh điều kiện. Full verify ngày 08/10 ghi `ui-composition PASS: 74 source files, 0 finding(s)` và 38/38 composition tests. W28/W29 là bằng chứng geometry/reflow; chúng không được dùng thay cho kiểm toán mọi spacing role trên toàn bộ UI.

## Lệnh và artifact chính

- `npm.cmd --script-shell=cmd.exe run test:e2e -- tests/artifacts/demo-preview.spec.ts tests/accessibility/routes.spec.ts` — 8/8, hai browser, production/demo build.
- `npm.cmd --script-shell=cmd.exe run test:e2e -- tests/ui012-keyboard.spec.ts` — 18/18, hai browser.
- `node --input-type=module -e "import {runDesignBrowserAudit} from './tests/design/browser-audit.mjs'; const r=await runDesignBrowserAudit(); console.log(JSON.stringify(r));"` — dashboard responsive/media preference audit.
- `node evidence/frontend-ui-improvements/UI028/W30/capture-actual-browser-zoom-200-current-20261006.mjs` — Chromium thật, 5 scenarios.
- `node evidence/frontend-ui-improvements/UI028/W30/capture-native-text-only-200-current-20261006.mjs` — Firefox native text-only, 5 scenarios.
- Full E2E hiện hành 512/512 và full verify hiện hành 138 unit / 88 domain-network được ghi trong FE001 logs; full E2E summary không chứa raw stdout từng case, vì vậy các suite trực tiếp quan trọng đã được chạy lại với log riêng.

Log S01–S05, log Playwright mới, JSON báo cáo media preference, W28/W29/W30, số đo bundle/dataset và ảnh tương ứng nằm cạnh handoff này hoặc trong đường dẫn artifacts nêu trong receipt. Capture helper kiểm tra lại các số lượng, kết quả, viewport và SHA-256 trước khi sinh receipt.

## Giới hạn nghiệm thu

- Chỉ xác minh local Frontend React với MSW; không chứng minh Backend/provider thật, hosted CI, staging hay production.
- Chromium/Firefox desktop Playwright không tương đương thiết bị cảm ứng thật. Touch hardware và screen-reader thủ công/transcript chưa được chạy.
- Native text-only và browser zoom được đo trong 5 scenarios xác định, không phải toàn route matrix. Axe automation không phải chứng nhận WCAG toàn diện; browser media audit còn mục `color-contrast` ở trạng thái incomplete.
- Người dùng là người nghiệm thu cuối; file này không ghi owner approval.
