# BotSales AI — Frontend 0.1.0

**Dự án trong folder này triển khai Frontend React/TypeScript với API mock tổng hợp.** Scope và thực hiện tự động được chốt ngày 04/10/2026 tại [FRONTEND_SCOPE](docs/FRONTEND_SCOPE.md). AI tự sửa/kiểm thử/bàn giao trong scope; bạn chỉ nghiệm thu cuối. Kit có đặc tả Backend/toàn sản phẩm để tham chiếu contract, không giao task xây server ở đây.

Quy định UI duy nhất là [workflow canonical v1.28](docs/FRONTEND_SPACING_STANDARD.md#unified-workflow), SPC-001–075. [Shared catalog](apps/web/src/shared/ui/README.md) mô tả API/source CURRENT và tiêu chí TARGET; [plan v16.0 §16.6](docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status) sở hữu trạng thái/dependency. Kết quả đo và giới hạn hiện hành tại [evidence report](evidence/REPORT.md); không lấy trạng thái rollout hoặc phần trăm từ snapshot lịch sử.

UI và FE dùng hai tracker khác nhau; FE có 28 task/140 checkpoint, còn trạng thái VERIFIED/STALE/BLOCKED/next luôn đọc trực tiếp bằng `node ../botsales-kit/scripts/progress.mjs status` trên checkout hiện tại. Không dùng số trong README làm trạng thái ledger. Hồ sơ scope, giới hạn và bằng chứng đặt tại [REPORT](evidence/REPORT.md), [FE027 UAT hiện hành](../botsales-kit/execution/frontend-evidence/FE027/uat-matrix-current-20261008.json) và [FE028 handoff 08/10](../botsales-kit/execution/frontend-evidence/FE028/handoff.md); các snapshot không thay source freshness hiện hành.

## Kiểm chứng hiện hành — 08/10/2026

Đối tượng là checkout React/TypeScript hiện tại, `HEAD 53c0ba8f413b1f1e0fa16a747ed27f728b861dd6` cộng working-tree changes. `npm run verify` exit 0; full local demo E2E đạt 512/512 (256 Chromium + 256 Firefox). FE027 matrix hiện hành ghi 54 route, 64 feature, 65 feature-route rows, 22 journey, 357/357 ca route-role, empty 11/11, error 51/51 và 0 applicable state cell chưa kiểm. Đây là bằng chứng local dùng dữ liệu MSW tổng hợp.

FE026 clean isolated run ghi lockfile khớp, `npm ci`/audit/setup/verify/build pass, production và demo artifact tái lập byte-for-byte; production không có worker/mock marker đã kiểm, demo có worker/fixture. Manifest, tree hashes và log đầy đủ nằm trong [FE026 artifact evidence](../botsales-kit/execution/frontend-evidence/FE026/clean-artifacts-current-20261008-attempt03.json) và [handoff FE028](../botsales-kit/execution/frontend-evidence/FE028/handoff.md). Kết quả đó không chứng minh hosted CI, Backend, provider, staging hoặc production deployment.

Gate review hiện hành: 7/9 FE gates đạt trong phạm vi đã nêu; FE-G05 còn Narrator transcript và broad human accessibility/conformance review chưa chạy; FE-G09 chờ quyết định nghiệm thu cuối của người dùng. Không tuyên bố WCAG đầy đủ, Production-Ready/Enterprise-Grade toàn hệ thống hoặc owner acceptance. Đọc trạng thái checkpoint từ CLI canonical và báo cáo sinh trong `../botsales-kit/IMPLEMENTATION_PLAN.md`/`../botsales-kit/execution/FRONTEND_PROGRESS.md`; tracker không phải phần trăm code.

**HISTORICAL_SNAPSHOT:** Local React + synthetic-MSW evidence gồm `verify`/production build, spacing/visual-token scans 68 source files với 0 finding, reflow/text/zoom checks và built-demo browser results theo dated logs. Đây không phải Backend, hosted CI, staging, provider thật hoặc owner acceptance. FE-G05 còn Narrator speech/human conformance `NOT_RUN`; FE-G09 là nghiệm thu cuối của người dùng. Không tự chứng nhận Production-Ready/Enterprise-Grade toàn hệ thống. Xem [CONTINUE_FRONTEND](docs/CONTINUE_FRONTEND.md) và các timestamped evidence được liên kết trong handoff.

`SHA256SUMS.json` là checksum gói giao ban đầu 29/09, không là checksum worktree hiện tại. FE026 clean-build manifest ngày 06/10 ghi riêng production tree và demo tree; W32 built-demo route matrix ghi artifact SHA-256 `6f4120d693536fd4f9ca8d417604c9d4cc16cfc2bcc46ccddbbec25405d978f2` ([W32 summary](evidence/frontend-ui-improvements/UI028/W32/summary-current-20261006.json)). Đây là checksum các artifact khác nhau, không phải checksum Git/worktree; dùng manifest đi kèm đúng run để đối chiếu.

## 1. Mở trong VS Code

Giải nén toàn bộ ZIP vào thư mục mới, chọn **File → Open Folder → BotSalesAI_Frontend**. Không chép đè repo đang làm dở. Cài Node.js 24 theo baseline dự án và cần Internet để tải dependencies.

Trong terminal tại thư mục có `package.json` gốc:

```bash
npm ci
npm run setup
npm run dev
```

Địa chỉ phát triển được cấu hình là `http://127.0.0.1:5173`. Đừng mở `apps/web/index.html` bằng cách nhấp đúp hoặc VS Code Live Server: đây là ứng dụng Vite cần tiến trình phát triển.

Repo hiện có `package-lock.json`; `npm ci` cài đúng lockfile. Không chạy `npm audit fix --force`, bỏ strict hoặc tắt test để ép build xanh.

Trên Windows có `START_WINDOWS.cmd` hỗ trợ cùng quy trình và dừng khi gặp lỗi. Cấu hình VS Code tại `.vscode/tasks.json`; có thể dùng **Terminal → Run Task**. Playwright Chromium/Firefox và Chrome cài máy đã có bằng chứng tự động; riêng `START_WINDOWS.cmd` và thao tác trình duyệt thủ công chưa được kiểm tra.

## 2. Chế độ chạy

| Lệnh | Mục đích |
|---|---|
| `npm run dev` | Frontend với MSW network mocks; không gửi dịch vụ ngoài. |
| `npm run dev:live` | Frontend gọi API thật qua proxy, không có mock đăng nhập. |
| `npm run build:demo` | Build review có mô phỏng vào `apps/web/dist-demo`, sau khi typecheck đạt. |
| `npm run preview` | Mở build demo đã tạo trên cổng 4173. |
| `npm run build` | Build không chứa nhánh MSW của demo; cần backend phù hợp để dùng nghiệp vụ. |
| `npm run doctor` | Kiểm Node, dependencies, worker file và lockfile. |
| `npm run verify` | Generator, nguồn, boundaries, lint, typecheck, mock-domain, Vitest, build và strict layout/visual-token/composition gates. |
| `npm run test:e2e` | Chạy các ca Playwright đã viết; cần Chromium (`npx playwright install chromium firefox`). |

`npm run setup` sinh lại hợp đồng/màu và tạo `mockServiceWorker.js` từ MSW đã cài, không tự viết bản worker giả. Nó chỉ copy `.env.example` thành `.env.local` khi chưa có file đích.

## 3. Vùng code để chỉnh

```text
apps/web/src/
  app/                    router, khung điều hướng, phiên, SSE, phục hồi lệnh
  modules/                16 module theo nghiệp vụ
  shared/api/             client có schema, CSRF, phiên bản, chống gửi lặp
  shared/model/           scope, định dạng, nhãn, bộ lọc
  shared/ui/              theme MUI, bảng, biểu mẫu và thành phần dùng chung
  mocks/                  API mô phỏng DEV/TEST, dữ liệu tổng hợp
packages/contracts/src/   kiểu/API/route được sinh từ OpenAPI gốc
packages/design-tokens/   token được sinh từ nguồn đã duyệt
../botsales-kit/            contracts/tokens 2.1.1 + kế hoạch frontend/mock hiện hành
scripts/                 generator, kiểm nguồn/ranh giới, thiết lập và kiểm mock
samples/                 CSV mẫu để thử import
```

`apps/web/src/app/router.tsx` là nơi ghép route; module không import module khác. Không đưa nghiệp vụ vào `shared` hoặc gọi trực tiếp SDK Facebook/AI từ trình duyệt. `docs/route-implementation.json` liên kết từng R01–R54 tới component nguồn; việc có component chưa đồng nghĩa route đã chạy trong browser.

**Màu chuẩn chỉ sửa tại `../botsales-kit/design/tokens.json` sau một quyết định đổi màu được duyệt**, rồi chạy `npm run generate`; không sửa `tokens.css` hoặc HEX trong component. Bản bàn giao giữ palette đã chốt, không có light/system/toggle.

## 4. Những màn hình đã có source

Tổng quan; sản phẩm/biến thể/danh mục/import; khách hàng/yêu cầu hỗ trợ; hộp thư/tiếp quản; tồn kho/biến động; báo giá/xác nhận/đơn/đổi trả; chuẩn bị/giao hàng; thông báo/thiết bị; nhà cung cấp/nhập lại/đơn mua/nhận hàng; thu chi/bút toán/COD/công nợ/khóa kỳ; kiến thức/feedback; cấu hình bot/phòng thử/eval/đội ngũ AI; phê duyệt/bản tin; kết nối; báo cáo/marketing; shop/nhân sự/privacy/jobs/audit.

Các màn hình có bảng, lọc, form hoặc hành động theo hợp đồng tương ứng, không chèn dữ liệu mẫu trực tiếp vào JSX. Những phần thiếu hợp đồng hoặc cần dịch vụ thật được liệt kê riêng trong KNOWN_GAPS, không tự tạo API cạnh tranh.

## 5. Thử nghiệp vụ với dữ liệu mẫu

Chế độ demo tự dùng tài khoản mẫu. Có hai shop tách dữ liệu và bộ chọn vai trò/trạng thái mô phỏng trên thanh thông báo. Đơn `DH-1001`, hội thoại `cv1`, khách `c1` phục vụ luồng bán hàng.

- Đơn hàng: báo giá → xác nhận khách mô phỏng (chỉ ở demo) → giữ hàng → nhận việc → lấy/đóng gói → tạo vận chuyển → bàn giao → ghi nhận giao thành công. Chỉ ghi tiền khi có bằng chứng thử theo form; không có giao dịch ngân hàng thật.
- Mua hàng: nhà cung cấp/offer → đề nghị nhập/đơn mua → yêu cầu phê duyệt → duyệt → gửi mô phỏng → xác nhận nhà cung cấp → nhận một phần → ghi phiếu.
- CSV: thử `samples/products.csv`, `samples/bank.csv`, `samples/cod.csv`. Form ngân hàng/COD dùng formatId `botsales-csv-v1`. COD chỉ nhận đơn đã được mô phỏng giao thành công.

Nhãn demo luôn xuất hiện. Mua hàng, lệnh gửi, kiểm thử AI và scan tệp trong mock **không có tác động hoặc bằng chứng ngoài hệ thống**. Thời gian nghiệp vụ mẫu cố định ngày 29/09/2026 để tái lập kiểm tra. Tải lại trang mất thay đổi của mock. Góp ý có thể xuất JSON riêng; không nộp dữ liệu khách thật vào demo.

## 6. Nối backend sau này

UI gọi cùng origin `/api/v2`; giữ cookie session phía backend. Với `dev:live`, đặt `API_PROXY_TARGET` trong `.env.local`. Các biến VITE_* được đóng gói vào browser: **không đặt secret, API key hoặc token Page vào đây**. `VITE_WEB_PUSH_PUBLIC_KEY` chỉ dành cho khóa công khai VAPID.

Backend phải đáp ứng `../botsales-kit/contracts/openapi.json`. Đăng nhập thật là OIDC, không dùng mock account. SSE chỉ làm mất hiệu lực cache và đọc snapshot lại. Khi mất phản hồi ghi, UI khóa thao tác tương ứng và hiển thị mã intent/lệnh; chưa có mã lệnh thì cần backend đối chiếu, không tự gửi lần hai.

Quyền trên UI chỉ phục vụ trải nghiệm. Backend phải xác thực tenant, đối tượng, trường, phiên bản và chính sách ở từng request. Gói này không có server, cơ sở dữ liệu, worker 24/7 hoặc xác nhận an toàn tiền/kho thật.

## 7. Tiếp tục với AI trong VS Code

Đọc `AGENTS.md`, original `AI_RULES.md`, `docs/PROJECT_CONTEXT.md` và `evidence/REPORT.md`; mọi UI đi qua [workflow duy nhất](docs/FRONTEND_SPACING_STANDARD.md#unified-workflow). [CONTINUE_FRONTEND](docs/CONTINUE_FRONTEND.md) chỉ dẫn việc hiện hành và nguồn evidence, không một pipeline song song. Không sửa canonical schema/đổi stack hoặc bỏ kiểm tra để xử lý lỗi dependency.

**HISTORICAL_SNAPSHOT — tracker full-product của gói ban đầu:** 84 việc/420 bước, 0%. Nó theo dõi toàn sản phẩm, không phải số file frontend đã sinh. Bằng chứng ở `evidence/` của repo này không được dùng để tự đánh dấu xong backend/staging/production.
