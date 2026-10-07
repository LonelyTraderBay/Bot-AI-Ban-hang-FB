# Báo cáo sửa khoảng cách giữa thông báo demo và nhãn điều khiển Shell

Ngày kiểm tra: 2026-10-06. Phạm vi: React/TypeScript Frontend demo, không gọi Backend. Quy tắc áp dụng: SPC-055, SPC-057, SPC-060.

## Tái hiện và nguyên nhân

Trigger: mở route R13 /s/shop-demo/imports ở viewport 806×884, khi các điều khiển demo của Shell đang hiện. Alert kết thúc tại y=150 px; nhãn MUI “Vai trò mô phỏng” bắt đầu tại y=149 px. Khoảng cách render trước sửa là **-1 px**, mặc dù wrapper có margin-top 8 px. Nhãn của MUI outlined select được đặt cao hơn viền ô nhập khoảng 9 px; owner trước đó đo từ alert đến thân ô nhập, không tính vùng nhãn nổi.

Invariant sau sửa: nhãn nổi đầu tiên phải cách cạnh dưới alert ít nhất 8 px. Role chung layoutSx.shell.demoToolsBefore dùng token 24 px (factor.xl); đo lại tại cùng route/viewport cho alert bottom=150 px, label top=165 px, khoảng trống render **15 px**. Chuẩn semantic hiện hành được ghi tại docs/FRONTEND_SPACING_STANDARD.md; register W09 giữ nguyên như bằng chứng lịch sử của giá trị trước sửa.

## Impact và regression

Import graph cho thấy owner là Shell.tsx → MockTools → layoutSx.shell.demoToolsBefore. Consumer là toàn bộ 51 route shop-scoped từ route-manifest.json (IDs R04–R54). Playwright regression trong tests/ui-shell-layout.spec.ts đi lần lượt qua mọi consumer tại 806×884, kiểm alert và khoảng trống tới nhãn nổi; cùng test chạy riêng trên Chromium và Firefox. Tất cả 51 route đạt ngưỡng ≥8 px trên cả hai trình duyệt. Test Shell hiện có cũng kiểm tra nút mở điều khiển mobile tại 390 px.

| Route ID | Path chạy demo | Profile | Chromium 806×884 | Firefox 806×884 |
|---|---|---|---|---|
| R04 | /s/shop-demo/overview | dashboard | PASS | PASS |
| R05 | /s/shop-demo/inbox | inbox | PASS | PASS |
| R06 | /s/shop-demo/inbox/cv1 | inbox | PASS | PASS |
| R07 | /s/shop-demo/customers | detail-or-workflow | PASS | PASS |
| R08 | /s/shop-demo/customers/c1 | detail-or-workflow | PASS | PASS |
| R09 | /s/shop-demo/products | detail-or-workflow | PASS | PASS |
| R10 | /s/shop-demo/products/new | form-or-import | PASS | PASS |
| R11 | /s/shop-demo/products/p1 | detail-or-workflow | PASS | PASS |
| R12 | /s/shop-demo/categories | detail-or-workflow | PASS | PASS |
| R13 | /s/shop-demo/imports | form-or-import | PASS | PASS |
| R14 | /s/shop-demo/imports/missing-job | form-or-import | PASS | PASS |
| R15 | /s/shop-demo/inventory | detail-or-workflow | PASS | PASS |
| R16 | /s/shop-demo/inventory/movements | detail-or-workflow | PASS | PASS |
| R17 | /s/shop-demo/orders | detail-or-workflow | PASS | PASS |
| R18 | /s/shop-demo/orders/new | form-or-import | PASS | PASS |
| R19 | /s/shop-demo/orders/DH-1001 | detail-or-workflow | PASS | PASS |
| R20 | /s/shop-demo/finance | detail-or-workflow | PASS | PASS |
| R21 | /s/shop-demo/finance/entries | detail-or-workflow | PASS | PASS |
| R22 | /s/shop-demo/finance/profit-loss | detail-or-workflow | PASS | PASS |
| R23 | /s/shop-demo/knowledge | detail-or-workflow | PASS | PASS |
| R24 | /s/shop-demo/knowledge/k1 | detail-or-workflow | PASS | PASS |
| R25 | /s/shop-demo/knowledge/review | detail-or-workflow | PASS | PASS |
| R26 | /s/shop-demo/bot | detail-or-workflow | PASS | PASS |
| R27 | /s/shop-demo/bot/playground | detail-or-workflow | PASS | PASS |
| R28 | /s/shop-demo/bot/evaluations | detail-or-workflow | PASS | PASS |
| R29 | /s/shop-demo/integrations/channels | detail-or-workflow | PASS | PASS |
| R30 | /s/shop-demo/integrations/ai | detail-or-workflow | PASS | PASS |
| R31 | /s/shop-demo/reports | report | PASS | PASS |
| R32 | /s/shop-demo/settings/team | settings | PASS | PASS |
| R33 | /s/shop-demo/settings/shop | settings | PASS | PASS |
| R34 | /s/shop-demo/settings/audit | settings | PASS | PASS |
| R35 | /s/shop-demo/settings/privacy | settings | PASS | PASS |
| R36 | /s/shop-demo/jobs/missing-job | detail-or-workflow | PASS | PASS |
| R37 | /s/shop-demo/operations | detail-or-workflow | PASS | PASS |
| R38 | /s/shop-demo/approvals | detail-or-workflow | PASS | PASS |
| R39 | /s/shop-demo/notifications | detail-or-workflow | PASS | PASS |
| R40 | /s/shop-demo/notifications/devices | detail-or-workflow | PASS | PASS |
| R41 | /s/shop-demo/fulfillment | detail-or-workflow | PASS | PASS |
| R42 | /s/shop-demo/shipments | detail-or-workflow | PASS | PASS |
| R43 | /s/shop-demo/returns | detail-or-workflow | PASS | PASS |
| R44 | /s/shop-demo/suppliers | detail-or-workflow | PASS | PASS |
| R45 | /s/shop-demo/replenishment | detail-or-workflow | PASS | PASS |
| R46 | /s/shop-demo/purchases | detail-or-workflow | PASS | PASS |
| R47 | /s/shop-demo/receipts | detail-or-workflow | PASS | PASS |
| R48 | /s/shop-demo/finance/journals | detail-or-workflow | PASS | PASS |
| R49 | /s/shop-demo/finance/reconciliation | detail-or-workflow | PASS | PASS |
| R50 | /s/shop-demo/finance/debts-periods | detail-or-workflow | PASS | PASS |
| R51 | /s/shop-demo/bot/team | detail-or-workflow | PASS | PASS |
| R52 | /s/shop-demo/operations/digests | detail-or-workflow | PASS | PASS |
| R53 | /s/shop-demo/reports/marketing | report | PASS | PASS |
| R54 | /s/shop-demo/service-cases | detail-or-workflow | PASS | PASS |

## Kiểm tra

- npm exec -- playwright test tests/ui-shell-layout.spec.ts --project=chromium: 4/4 PASS; regression Shell quét 51 route.
- npm exec -- playwright test tests/ui-shell-layout.spec.ts --project=firefox: 4/4 PASS; regression Shell quét 51 route.
- npm run generate:check: PASS (11 outputs, 283 schemas, 210 operations, 54 routes).
- npm run typecheck: PASS.
- npm run test:layout: unit 10/10 PASS; layout scan 68 files, 0 finding, 1 existing exception used.
- npm run test:visual-tokens: unit 5/5 PASS; visual-token scan 68 files, 0 finding.
- npm run verify: PASS; source and boundary scans clean, domain checks 88/88, Vitest 10 files/93 tests, production build and all included gates passed.
- Đã tải lại màn Import trong trình duyệt nghiệm thu local; khoảng trống nhìn thấy tách rõ alert và ba nhãn điều khiển. Dữ liệu vẫn là mock trong bộ nhớ.

Không cập nhật tracker tiến độ hay đánh dấu UI028/owner acceptance. Đây là kết quả sửa và kiểm chứng một lỗi UI theo scope Frontend.
