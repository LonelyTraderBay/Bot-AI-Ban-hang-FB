# BotSales AI Backend

Workspace triển khai API và công việc nền. [Kế hoạch triển khai](BACKEND_PLAN.md) theo dõi phạm vi và tiến độ. [Quy định workspace](AGENTS.md) ghi quyền sở hữu tệp.

## Cài và chạy

Từ `BotSalesAI_Backend/`, dùng Node.js `24.22.3` và npm `11.17.0` theo manifest.

```powershell
npm ci
npm run verify
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm start
```

Chỉ sao chép mẫu khi chưa có `.env`. Mẫu dùng `API_BIND=127.0.0.1` và `API_PORT=3000`. `npm start` tải `.env` ở gốc backend và dùng kết quả build của `npm run verify` hoặc `npm run build`.

| Kiểm tra | Kết quả ở BE-02 |
|---|---|
| `GET /api/v2/health/live` | 200 và `{"status":"ok"}` |
| `GET /api/v2/health/ready` | 200 khi tiến trình đã sẵn sàng. Kiểm thử tiêm điều kiện lỗi để xác nhận 503 và phục hồi về 200. |
| `GET /api/v2/health/ready?unknown=value` | 400 và `VALIDATION_FAILED` dưới dạng `application/problem+json` theo schema `Problem`. |
| Endpoint chưa bật | 404 với `Problem`. Phản hồi có `X-Request-Id`; lỗi dùng cùng giá trị cho trường `requestId`. |

BE-02 chạy hai route vận hành. PostgreSQL, tài khoản OIDC và operation sản phẩm được nối theo BE-03 trở đi. Trạng thái readiness ở BE-02 chỉ phản ánh phần phụ thuộc đã cấu hình ở mốc này.

## Kiểm tra

- `npm run lint` kiểm lint và ranh giới workspace. Module nghiệp vụ sử dụng `index` công khai của module khác.
- `npm run typecheck` kiểm TypeScript, `npm run build` sinh API ở `apps/api/dist/`.
- `npm test` chạy các ca HTTP và ca đối chứng của ma trận trên bản build.
- `npm run verify:matrix` đọc ma trận từ kế hoạch và hợp đồng chuẩn trong kit, rồi dò controller đã đăng ký trên bản build. Khi bật operation sản phẩm, cập nhật `api-scope.json` với ID operation, ID ca và tệp kiểm thử tương ứng. Gắn `ContractOperation` cho handler sản phẩm để đối chiếu cùng method/path của OpenAPI.
- `npm run verify` chạy toàn bộ kiểm tra trên. CI chạy cùng lệnh và lưu `test-results/backend/matrix.json` dưới dạng artifact gắn SHA. Báo cáo ghi riêng SHA của checkout và của baseline hợp đồng. [Workflow backend](../.github/workflows/backend.yml)
