# BotSales AI — Frontend 0.1.0

**Jokertrader · Nguồn yêu cầu: bộ chuẩn 2.1.1 · Graphite Gold dark-only.**

Đây là **mã nguồn React/TypeScript**, không phải file HTML demo cũ và không bao gồm backend sản phẩm. Có khai báo và component cho 54 route chuẩn; dữ liệu thử đi qua lớp HTTP MSW, UI dùng TanStack Query và hợp đồng OpenAPI gốc. API mô phỏng chỉ giữ dữ liệu trong bộ nhớ của tab.

## Phạm vi hiện hành — 02/10/2026

Phát triển và nghiệm thu **frontend-only bằng synthetic mock API** theo [kế hoạch frontend](botsales-kit/IMPLEMENTATION_PLAN.md). Trên Windows Node 24.19.0/npm 11.17.0, `npm run verify` đạt và bộ Playwright Chromium đạt 143/143. Ma trận có 54 route, 64 feature ID và 65/65 feature-route entries đều có tương tác UI mô phỏng gắn với test cụ thể; 357/357 quyền đọc route × role được kiểm trên 51 route cửa hàng × 7 role; bốn luồng xuyên module cũng đạt. Axe/keyboard và reflow 320 CSS px được kiểm trên đủ 54 route. Xem [CONTINUE_FRONTEND.md](docs/CONTINUE_FRONTEND.md), [KNOWN_GAPS.md](docs/KNOWN_GAPS.md) và [báo cáo kiểm chứng](evidence/REPORT.md) để biết giới hạn route-state, screen-reader, zoom thực và UAT.

## Trạng thái bàn giao — đọc trước

**Trạng thái hiện tại:** React production build và demo preview chạy với API mô phỏng; domain/MSW đạt 88/88, Vitest 71/71, Chromium E2E 143/143. Các chức năng ngoài contract được trình bày thành preview/giới hạn rõ ràng, không giả lập lưu máy chủ hay tích hợp provider thật. Ma trận role-route kiểm trực tiếp 357 trường hợp; state variants vẫn chỉ được khẳng định nơi có test cụ thể. Tracker frontend chỉ tính checkpoint còn khớp evidence/source hash; xem `node botsales-kit/scripts/progress.mjs status`. Backend/provider thật không chặn nghiệm thu UI mock; GitHub CI, kiểm screen-reader đầy đủ, zoom browser thực và owner UAT chưa được xác nhận.

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

Trên Windows có `START_WINDOWS.cmd` hỗ trợ cùng quy trình và dừng khi gặp lỗi. Cấu hình VS Code tại `.vscode/tasks.json`; có thể dùng **Terminal → Run Task**. Playwright Chromium đã kiểm tra tự động; riêng `START_WINDOWS.cmd` và thao tác trình duyệt thủ công chưa được kiểm tra.

## 2. Chế độ chạy

| Lệnh | Mục đích |
|---|---|
| `npm run dev` | Frontend với MSW network mocks; không gửi dịch vụ ngoài. |
| `npm run dev:live` | Frontend gọi API thật qua proxy, không có mock đăng nhập. |
| `npm run build:demo` | Build review có mô phỏng vào `apps/web/dist-demo`, sau khi typecheck đạt. |
| `npm run preview` | Mở build demo đã tạo trên cổng 4173. |
| `npm run build` | Build không chứa nhánh MSW của demo; cần backend phù hợp để dùng nghiệp vụ. |
| `npm run doctor` | Kiểm Node, dependencies, worker file và lockfile. |
| `npm run verify` | Generator, nguồn, boundaries, lint, full typecheck, mock-domain, Vitest và build. |
| `npm run test:e2e` | Chạy các ca Playwright đã viết; cần Chromium (`npx playwright install chromium`). |

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
botsales-kit/            contracts/tokens 2.1.1 + kế hoạch frontend/mock hiện hành
scripts/                 generator, kiểm nguồn/ranh giới, thiết lập và kiểm mock
samples/                 CSV mẫu để thử import
```

`app/router.tsx` là nơi ghép route; module không import module khác. Không đưa nghiệp vụ vào `shared` hoặc gọi trực tiếp SDK Facebook/AI từ trình duyệt. `docs/route-implementation.json` liên kết từng R01–R54 tới component nguồn; việc có component chưa đồng nghĩa route đã chạy trong browser.

**Màu chuẩn chỉ sửa tại `botsales-kit/design/tokens.json` sau một quyết định đổi màu được duyệt**, rồi chạy `npm run generate`; không sửa `tokens.css` hoặc HEX trong component. Bản bàn giao giữ palette đã chốt, không có light/system/toggle.

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

Backend phải đáp ứng `botsales-kit/contracts/openapi.json`. Đăng nhập thật là OIDC, không dùng mock account. SSE chỉ làm mất hiệu lực cache và đọc snapshot lại. Khi mất phản hồi ghi, UI khóa thao tác tương ứng và hiển thị mã intent/lệnh; chưa có mã lệnh thì cần backend đối chiếu, không tự gửi lần hai.

Quyền trên UI chỉ phục vụ trải nghiệm. Backend phải xác thực tenant, đối tượng, trường, phiên bản và chính sách ở từng request. Gói này không có server, cơ sở dữ liệu, worker 24/7 hoặc xác nhận an toàn tiền/kho thật.

## 7. Tiếp tục với AI trong VS Code

Đọc `AGENTS.md`, `AI_RULES.md` nguyên bản, `docs/PROJECT_CONTEXT.md` và `evidence/REPORT.md`. Ưu tiên cài đúng dependency → full typecheck → sửa nguyên nhân → lint → tests → build → kiểm trình duyệt. Không sửa canonical schema/đổi stack hoặc bỏ kiểm tra chỉ để xử lý lỗi dependency. `docs/CONTINUE_FRONTEND.md` có thứ tự chi tiết.

**Tracker 84 việc/420 bước của kit vẫn nguyên trạng 0%.** Nó theo dõi toàn sản phẩm, không phải số file frontend đã sinh. Bằng chứng ở `evidence/` của repo này không được dùng để tự đánh dấu xong backend/staging/production.
