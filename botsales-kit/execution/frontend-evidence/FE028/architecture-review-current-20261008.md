# FE028 — Rà soát kiến trúc Frontend hiện hành

**Ngày:** 08/10/2026 · **Scope:** `FRONTEND_WITH_SYNTHETIC_MOCK_API` · **Reviewer:** Codex self-review; không tuyên bố peer review độc lập.

## Đối tượng đã kiểm

- `HEAD` là `53c0ba8f413b1f1e0fa16a747ed27f728b861dd6`; có thay đổi sẵn trong working tree. Rà soát dùng source hiện tại, không coi `HEAD` đơn lẻ là bản đang chạy.
- Đã đọc `apps/web/src/main.tsx`, `app/router.tsx`, `app/Shell.tsx`, `app/SessionProvider.tsx`, các entry module, `shared/api/client.ts`, Vite config, mock startup/service/database, package scripts, route/permission contracts và tài liệu kiến trúc/API hiện hành.
- Trạng thái thay đổi API client kiểm riêng: `client.ts` kiểm status HTTP thành công khớp status trong operation contract; `api-client.test.tsx` có regression tương ứng. `npm run verify` và browser suite hiện hành đạt theo các log FE026/FE001 được dẫn dưới đây.

## Data flow và ownership quan sát được

1. `main.tsx` tạo đúng một React root, một MUI `ThemeProvider`, một TanStack `QueryClientProvider`, một `SessionProvider` và một `RouterProvider`. Query cache sở hữu server state; form giữ state cục bộ/RHF theo module; session và shop/permission scope nằm ở provider/model dùng chung.
2. `app/router.tsx` ghép route canonical tới public entry của 16 module. Module exports được ghép tại app/router; boundary regression cấm module nghiệp vụ import module khác hoặc `shared` phụ thuộc ngược vào app/module/mock.
3. UI gọi `shared/api/client.ts`; endpoint path, method, expected success status, query/body schema và headers đến từ generated OpenAPI operations. Base path là `/api/v2`; browser gửi same-origin request. Client kiểm schema/header, CSRF, idempotency, version, abort/timeout và scope epoch trước/sau request.
4. `__MOCK__` được đặt theo Vite mode. `main.tsx` chỉ dynamic-import/start MSW khi `__MOCK__` bật. Live startup gỡ service worker demo cũ rồi tải lại; Vite từ chối `VITE_ENABLE_MOCKS=true` trong production và xóa worker khỏi output production. Không thấy nhánh fallback tự chuyển API thật sang mock.
5. `apps/web/src/mocks/database.ts` clone `seed.json` vào store trong bộ nhớ; `resetDb()` khởi tạo lại seed. Demo toolbar có `Dataset mô phỏng → Dataset mặc định`, qua `setMockControl()` gọi `resetService()` để khôi phục seed; reload trang demo cũng khởi tạo lại store. Đây là thao tác UI demo và helper nội bộ, không phải HTTP endpoint/CLI reset.
6. `API_PROXY_TARGET` chỉ cấu hình proxy phát triển khi chạy `dev:live`; `.env.example` đặt mặc định `http://127.0.0.1:3000`. UI không dùng `VITE_API_BASE_URL`; production trông đợi origin/reverse proxy triển khai chuyển tiếp same-origin `/api/v2`.

## Kết quả kiểm và đánh giá

- `npm run verify` trên source hiện tại exit 0: generator, source/boundary, lint, strict TypeScript, 88 domain/network checks, 138 Vitest, production build, 82 layout checks, 75 visual-token checks, 38 composition checks và S17 evidence validation đều PASS. Chi tiết/hash ở `FE026/registered-verify-current-20261008.log` và clean-run log.
- Boundary/strict UI gates không có finding ở run hiện tại; test fixtures âm chạy trong verify. Full demo browser run là 512/512 và focused preview của built artifact là 8/8. Đây là kiểm chứng local/synthetic.
- Không phát hiện provider/state/router trùng, import cross-module mới hoặc lý do thực tế để thêm abstraction/dependency trong scope được xem. Chưa có source Backend trong placeholder `BotSalesAI_Backend`; không thể dùng review này làm live API/auth/database review.
- Production artifact có 34 file, không có worker/mốc mock được kiểm; demo artifact có 38 file và worker. Cả hai tree tái lập byte-for-byte trong clean copy.

## Verdict và giới hạn

**Kiến trúc Frontend:** `ĐẠT_TRONG_SCOPE` theo source, contract, boundary regression và artifact local hiện có. Đây là self-review có kiểm thử tự động, không phải review độc lập. FE-G05 vẫn thiếu Narrator transcript/broad human conformance; FE-G09 vẫn chờ quyết định nghiệm thu của người dùng. Không kết luận backend, server authorization, persistence, provider, hosted CI, staging, production vận hành, full WCAG hoặc Production-Ready/Enterprise-Grade toàn hệ thống.
