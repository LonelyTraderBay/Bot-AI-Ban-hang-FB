# Bàn giao Frontend — 08/10/2026

## Phạm vi và hiện trạng

- Đối tượng: workspace `BotSalesAI_Frontend` tại `HEAD 53c0ba8f413b1f1e0fa16a747ed27f728b861dd6` cộng working tree hiện hành. Repo có thay đổi staged/unstaged/untracked sẵn; lần bàn giao này không reset, clean, commit hoặc push.
- Mục tiêu đã kiểm: React/TypeScript Frontend với API mock tổng hợp, trên source và artifact local. `BotSalesAI_Backend` là placeholder không có backend runtime; không có bằng chứng live provider, persistence, staging, deployment hoặc hosted CI.
- FE ledger là tracker checkpoint/evidence freshness, không phải phần trăm code. Trước refresh FE028, canonical CLI báo 135/140, `blocked=[]`, FE028 là phần stale còn lại. Kết quả sau capture/checkpoint phải đọc lại bằng `node botsales-kit/scripts/progress.mjs validate`, `status` và `report`.
- UI rollout là một kế hoạch riêng tại `BotSalesAI_Frontend/docs/FRONTEND_UI_IMPROVEMENT_PLAN.md` §16.6; không cộng nó vào FE tracker. S03–S20 có trạng thái riêng trong bảng đó.

## Bản dựng, kiểm thử và hashes

| Hạng mục | Kết quả hiện hành |
|---|---|
| Khóa dependencies | `package-lock.json` SHA-256 `a3c0bb3a4906f92a5f23d4e8a0b862769b71de9e7efc9a48601ae44282bc963a`; isolated copy khớp |
| Root workflow | `.github/workflows/frontend.yml` SHA-256 `238511056b84e1cc972b87d2e8c673be34a8aac57295f4dd7855992c38804dc2` |
| Production | 34 files; tree SHA-256 `3c1642ce4cd2bbaaa57d99e46d517d0ab9f058fc41bbd1331fc4f6bb154bf145`; không có worker/marker MSW đã kiểm |
| Demo | 38 files; tree SHA-256 `2fb01aae6397b1ddfcdeb5b61db7081ae305ac526f6110f6833736b087b5e0fc`; có worker/fixture mô phỏng |
| Rebuild | Production và demo tree khớp byte-for-byte qua build lặp trong isolated clean copy |
| Verify | `npm run verify` exit 0: generated/source/boundary/lint/typecheck, domain/network 88, Vitest 138, build, layout 82, visual-token 75 files/0 finding, composition 38 tests/74 files/0 finding, S17 evidence validation PASS |
| Full browser | `npm run test:e2e` 512/512: 256 Chromium + 256 Firefox; synthetic MSW |
| Built-demo preview | 8/8 Chromium/Firefox; no browser page errors trong capture review |
| Route/UAT matrix | 54 routes, 64 features, 65 route-feature rows, 22 journeys, role 357/357, empty 11/11, error 51/51, 0 applicable state cells untested |
| Dependencies | clean `npm audit` ghi 0 vulnerabilities; npm vẫn hiển thị lifecycle-script notices cho esbuild/MSW, chưa tự approve |

Chi tiết đầy đủ, command/cwd/exit và hashes: [FE026 clean log](../FE026/clean-build-current-20261008-attempt03.log), [FE026 artifact manifest](../FE026/clean-artifacts-current-20261008-attempt03.json), [FE026 verify](../FE026/registered-verify-current-20261008.log), [FE027 UAT matrix](../FE027/uat-matrix-current-20261008.json), [FE027 capture manifest](../FE027/ui-screenshots-current-20261008/manifest.json), [FE027 full browser log](../FE001/S03-e2e-current-source-session-20261008.log), [current quality gates](quality-gate-matrix-current-20261008.json), [architecture review](architecture-review-current-20261008.md), [Production Claim Gate](production-claim-review-current-20261008.json).

## Run, fixture và API boundary

- Chạy từ `BotSalesAI_Frontend`: `npm ci`; `npm run setup`; `npm run dev`. Demo dùng MSW và seed tổng hợp; selector `Dataset mô phỏng → Dataset mặc định` trong công cụ demo gọi reset helper nội bộ; reload trang cũng khởi tạo lại in-memory fixture từ seed. Không có reset HTTP endpoint/CLI.
- Demo artifact: `npm run build:demo`, sau đó `npm run preview` phục vụ `apps/web/dist-demo`. Production artifact: `npm run build` tạo `apps/web/dist`, không mang theo MSW/seed fallback.
- UI dùng same-origin `/api/v2` lấy từ generated canonical OpenAPI. Không tồn tại `VITE_API_BASE_URL`. `API_PROXY_TARGET` chỉ là target proxy phát triển cho `npm run dev:live`; `.env.example` mặc định `http://127.0.0.1:3000`. Production cần cấu hình reverse proxy/origin phù hợp; không đưa secret vào biến `VITE_*`.
- `npm run dev` là chế độ demo. `npm run dev:live` không tự fallback sang MSW; service/API thật cần có theo contract. Production browser smoke hiện hành cho thấy lỗi API được báo rõ và không tự bật mock.
- Setup chỉ tạo `.env.local` từ `.env.example` nếu file chưa tồn tại và sinh worker từ package MSW; không ghi đè `.env.local` có sẵn.

## Gate còn thiếu và quyết định nghiệm thu

- **FE-G05 — CHƯA ĐẠT:** Narrator speech/transcript và broad human accessibility/conformance review chưa chạy. Automated checks/screen captures không thay thế hai việc đó; không tuyên bố WCAG đầy đủ.
- **FE-G09 — CHƯA XÁC MINH:** kỹ thuật UAT/handoff đã chuẩn bị; quyết định nghiệm thu cuối thuộc người dùng và chưa được ghi.
- **CI — CHƯA XÁC MINH:** local equivalent được plan cho phép đã đạt; GitHub Actions/branch protection chưa được chạy/quan sát.
- **Backend/provider/live — NGOÀI PHẠM VI, CHƯA XÁC MINH:** không có kết luận về server authorization, database/persistence, provider, staging, production operations hay recovery.
- Khuyến nghị: review artifact React/demo và các giới hạn trên một lượt. Chỉ sau quyết định thật của người dùng mới cập nhật trạng thái nghiệm thu; không đổi status FE-G05/09 bằng việc đóng checkpoint.

## Tiếp tục hoặc tái lập

Tại thư mục `botsales-kit`, chạy riêng `node scripts/progress.mjs validate`, `node scripts/progress.mjs status`, `node scripts/progress.mjs report`. Báo cáo sinh là `IMPLEMENTATION_PLAN.md` và `execution/FRONTEND_PROGRESS.md`; không sửa tay. Không checkpoint ledger toàn sản phẩm. Không commit/push/merge/deploy trong lượt bàn giao này.
