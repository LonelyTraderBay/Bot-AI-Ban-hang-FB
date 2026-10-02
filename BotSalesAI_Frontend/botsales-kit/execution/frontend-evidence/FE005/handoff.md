# FE005 — Contracts và HTTP transport có kiểu

Ngày xác minh: 2026-10-01  
Phạm vi: frontend React/TypeScript với dữ liệu synthetic/mock API. Không yêu cầu backend hoặc API thật để nghiệm thu các checkpoint FE005.  
Revision nền: `18be3c6c75ed66ced592b2d58f36ffbdbd8ae221` trên `main`, cộng working tree hiện hành đang có thay đổi.

## Kết quả hiện hành

FE005 đã hoàn tất đủ S01–S05 trên source snapshot hiện hành. Contract canonical là OpenAPI 3.1.0 với 210 operationId duy nhất và 54 route; source audit ghi nhận 58 file, 224 operation references, 54 routes và 0 lỗi. Generator tái tạo khớp 11 outputs, 283 schemas, 210 operations và 54 routes. Không sửa OpenAPI hoặc generated contract bằng tay.

HTTP client dùng operation/schema registry sinh từ contract, kiểm tra request/response, giữ same-origin credentials, CSRF, `If-Match`, `Idempotency-Key`, `AbortSignal` và timeout. `Problem` có kiểu; lỗi response hoặc mutation chưa rõ kết quả không bị báo thành công và không retry mù. HTTP 202 chỉ được xem hoàn tất sau khi theo dõi trạng thái command. Unit suite hiện hành PASS 66/66 trên 7 files; generator contract suite PASS 6/6; typecheck toàn `apps/web` PASS.

## Kết quả contract và phạm vi UI

- Tiền và ID giữ kiểu chuỗi theo contract; nullable `Customer.phone`/`email` được bảo toàn.
- Query bắt buộc cho cashflow/profit-loss (`from`, `to`, `timezone`) chưa được giả lập mặc định tại FE005. Màn finance cần nhận kỳ do UI chọn trong task tương ứng.
- `listServiceCases` không có query `customerId`; UI chỉ có thể lọc tập kết quả được trả về và không tuyên bố là lịch sử đầy đủ.
- Contract Knowledge không khai báo `allowedActions`. UI demo có thể trình bày thao tác publish theo permission `knowledge.publish` và lifecycle hiện có, nhưng đây là mô phỏng frontend; không bổ sung field giả vào DTO/OpenAPI và không xem kiểm tra phía trình duyệt là kiểm soát quyền phía server.

## Bằng chứng lượt này

- `S01-source-registered-current-20261001.log`: source audit PASS, 58 files / 224 operation references / 54 routes / 0 issue.
- `S01-canonical-inventory-current-20261001.log`: OpenAPI 3.1.0, 210 unique operationIds, 54 routes, nullability/decimal/permission/event inventory và khoảng trống `Knowledge.allowedActions`.
- `S02-generate-current-20261001.log`: `generate:check` PASS, 11 outputs / 283 schemas / 210 operations / 54 routes.
- `S03-S04-unit-current-20261001.log`: Vitest PASS 66/66 trên 7 files; API client cases cover nullable DTO, CSRF/idempotency, If-Match, Problem status 409/412/422/428/429, timeout, invalid DTO, 202 completion và unsupported command status.
- `S05-contract-tests-current-20261001.log`: generator tests PASS 6/6, gồm unresolved schema, thiếu API version/server URL, route drift và stale generated output.
- `S05-typecheck-current-20261001.log`: `tsc -p apps/web/tsconfig.json --noEmit` exit 0.
- `S01`–`S05-current-revalidation-20261001.json`: checkpoint evidence được tracker kiểm tra hash/schema sau mỗi bước.

## Giới hạn nghiệm thu

Toàn bộ kiểm chứng FE005 chạy cục bộ trên Windows, Node 24.19.0/npm 11.17.0, sử dụng fixture/mock. Không có kết quả backend/provider, CI, staging, live API, UAT hoặc production deployment trong bằng chứng này. Các gate tổng thể FE-G01..09 chỉ được tuyên bố khi đủ bằng chứng tương ứng.

Tracker chuẩn cho tiến độ frontend là `botsales-kit/execution/frontend-progress.json`. FE005 hiện hoàn tất theo 5 checkpoint; task tiếp theo do `node botsales-kit/scripts/progress.mjs next` quyết định. Tracker toàn sản phẩm `execution/progress.json` không thuộc phạm vi cập nhật.
