# FE028 — Bàn giao frontend local/mock

**Cập nhật hiện hành:** 08/10/2026 · **Phạm vi:** `FRONTEND_WITH_SYNTHETIC_MOCK_API` · **Quyết định:** hồ sơ kỹ thuật local sẵn sàng cho người dùng review có giới hạn; không tự ghi nhận acceptance.

## Handoff hiện hành

- Đọc [handoff chi tiết 08/10](handoff-current-20261008.md), [quality gates](quality-gate-matrix-current-20261008.json), [architecture self-review](architecture-review-current-20261008.md) và [Production Claim Gate §19.6](production-claim-review-current-20261008.json).
- FE026 clean install/verify/build/audit đạt; production/demo tree hash, command logs và lock hash ở [clean artifact manifest](../FE026/clean-artifacts-current-20261008-attempt03.json). FE027 có [UAT matrix 54 route/64 feature/65 interaction rows/22 journey](../FE027/uat-matrix-current-20261008.json) và full browser run 512/512.
- Source/run/docs xác nhận demo fixture reset qua `Dataset mô phỏng → Dataset mặc định` trong toolbar hoặc reload; cả hai khởi tạo lại in-memory seed. API base same-origin `/api/v2`; `API_PROXY_TARGET` chỉ cấu hình proxy `dev:live`; không có `VITE_API_BASE_URL`.
- FE-G05 vẫn **CHƯA ĐẠT ĐẦY ĐỦ** (Narrator transcript và broad human conformance chưa chạy); FE-G09 **CHƯA XÁC MINH** (chờ người dùng quyết định). Hosted CI chưa chạy; backend/provider/staging/production không thuộc bằng chứng local này.
- Đọc FE tracker sau checkpoint qua `node scripts/progress.mjs validate`, `status` và `report` trong `botsales-kit`. Đây là độ mới của checkpoint evidence; không phải phần trăm source-code completion. Full-product ledger vẫn read-only.

## Historical handoff snapshot — 06/10/2026

**Cập nhật:** 06/10/2026 · **Phạm vi:** `FRONTEND_WITH_SYNTHETIC_MOCK_API` · **Mục đích:** đưa ứng dụng Frontend và hồ sơ kỹ thuật ra nghiệm thu cuối của người dùng.

## Đánh giá và ranh giới

Code sản phẩm thuộc React/TypeScript trong `apps/web`. API mock là MSW với dữ liệu tổng hợp, dùng trong demo/test; production build tách worker và dữ liệu mock. Contract, routes/permissions và design tokens lấy từ nguồn canonical trong `botsales-kit`. Không có `apps/api`, worker hoặc infrastructure sản phẩm trong phạm vi này. Tracker toàn sản phẩm `botsales-kit/execution/plan.json` và `progress.json` không được cập nhật.

FE plan có 28 task/140 checkpoint. Trạng thái hiện hành chỉ đọc bằng lệnh canonical phía dưới; các con số trong các matrix/log là timestamped snapshots tại lúc chạy. Kết quả kỹ thuật không phải user acceptance. FE-G01..09 hiện có 7/9 gate đạt trong phạm vi Frontend; FE-G05 còn phần screen-reader/human review, FE-G09 chờ quyết định của người dùng.

## Bằng chứng chính

- [Quality gate matrix sau SPC-060](quality-gate-matrix-spc060-current-20261006.json) đối chiếu chín FE gates và nêu rõ 7/9, các giới hạn, quyền và ý nghĩa.
- [Architecture review](architecture-review-spc060-current-20261006.md) ghi composition/boundary, source counts, checker outcomes và điều gì chưa được source scan chứng minh.
- [Production Claim Gate review](production-claim-review-spc060-current-20261006.json) áp dụng `AI_RULES.md §19.6`; đề nghị nghiệm thu Frontend local/mock, không tuyên bố Production-Ready/Enterprise-Grade toàn hệ thống.
- [W26 verify/build](../../../../BotSalesAI_Frontend/evidence/frontend-ui-improvements/UI028/W26/verify-with-visual-gate-current-20261006.log): generator 11/283/210/54; source 67/220/54; boundaries 475 imports/10 negative fixtures; lint/typecheck; domain/MSW 88/88; Vitest 93/93; production build; layout/visual-token gates.
- [Strict SPC-060 layout/token evidence](../../../../BotSalesAI_Frontend/evidence/frontend-spacing-audit-20261005/policy-spc060-current-20261006/): layout fixtures 10/10, strict scan 68 files/0 findings; visual-token fixtures 5/5, strict scan 68 files/0 findings; generator check 11/283/210/54.
- [Built-demo browser run](../FE008/S03-e2e-spc059-current-20261006.log): 484/484 Chromium + Firefox. [UAT matrix](../FE027/uat-matrix-spc059-current-20261006.json): 54 routes, 64 features, 65 feature-route interaction rows, 22 journeys, 357/357 route-role cases, empty 11/11, error 51/51, zero untested applicable state cells.
- [W32 artifact review](../../../../BotSalesAI_Frontend/evidence/frontend-ui-improvements/UI028/W32/summary-current-20261006.json): built demo SHA-256 `6f4120d693536fd4f9ca8d417604c9d4cc16cfc2bcc46ccddbbec25405d978f2`, smoke 2/2 and route matrix 216/216.
- [Dependency audit](../FE024/npm-audit-spc059-current-20261006.json): zero reported vulnerabilities across 463 audited entries. npm `allowScripts` notices for esbuild/MSW remain visible; scripts were not automatically approved.

## Quy định cho mọi UI tạo mới

Áp dụng [FRONTEND_SPACING_STANDARD.md SPC-001–060](../../../../BotSalesAI_Frontend/docs/FRONTEND_SPACING_STANDARD.md). Trước JSX/CSS, ghi vào design contract hiện có: route và layout profile; vùng page/section/surface/field-list/control; semantic spacing role và owner; reference cùng profile; viewport/state cần so; typography/token và hành vi cần giữ. Parent/child inset owner phải rõ để tránh cộng padding.

Dùng token/preset/role chuẩn. Các route cùng profile dùng cùng spacing rhythm; sai khác chỉ khi workflow/dữ liệu/responsive behavior cần và phải có rationale cùng shared named variant có consumer thật. Sau render, so cùng viewport/state và regression mọi consumer bị ảnh hưởng; chạy `test:layout`, `test:visual-tokens`, generator freshness cùng hành vi/reflow checks liên quan. Finding mới, `UNKNOWN` hoặc case cần kiểm nhưng chưa chạy thì ghi đúng trạng thái và chưa đóng task. Không bù bằng route-local px, số MUI factor, spacer, override hoặc exception rộng. SPC-060 là quy định thiết kế/check cho UI mới; checker không tự chứng nhận toàn bộ route hiện hữu đã đồng nhất trực quan.

## Tái lập và thử demo

Tại root `BotSalesAI_Frontend` trên Windows:

```powershell
npm ci
npm run setup
npm run verify
npm run build:demo
npm run preview
```

Preview mặc định ở `http://127.0.0.1:4173`. Chế độ demo dùng synthetic MSW và dữ liệu mẫu; reload trang sẽ khởi động lại dữ liệu in-memory của demo. `npm run dev` cũng chạy Frontend mock; `npm run dev:live` dùng API proxy thật và không phải điều kiện để nghiệm thu mock. Không đặt secret trong `VITE_*`; không nhập PII thật vào demo.

Các lệnh browser liên quan: `npm run test:e2e`; cài Chromium/Firefox bằng Playwright theo repo khi môi trường sạch cần browser binaries. Kết quả E2E trong hồ sơ là local built-demo, không phải hosted CI. Lệnh ledger:

```powershell
node botsales-kit/scripts/progress.mjs validate
node botsales-kit/scripts/progress.mjs status
```

`status` là nguồn duy nhất cho `verified/stale/blocked/next`; không sửa tay ledger. `report` sinh summary FE khi cần. Không ghi tiến độ toàn sản phẩm từ hồ sơ Frontend.

## Còn mở và nghiệm thu

- FE-G05: Narrator speech/transcript và review conformance rộng bởi con người vẫn `NOT_RUN`; không tuyên bố WCAG conformance đầy đủ.
- FE-G09: người dùng tự quyết định nghiệm thu cuối; hồ sơ này không ghi quyết định thay.
- Hosted CI chưa chạy; FE-G08 dùng clean local equivalent được rubric cho phép. Backend, provider, server authorization, persistence, staging, deploy và production operation chưa được chứng minh.
- Không có tỷ lệ phần trăm architecture-only được nguồn chuẩn định nghĩa. Không đổi số gate thành “% Enterprise-Grade”.

Không tự commit/push/merge/deploy. Lưu dated snapshots và log để reviewer phân biệt chính xác môi trường, revision, command, kết quả và giới hạn.
