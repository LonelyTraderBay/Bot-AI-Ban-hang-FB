# FE005 — Contracts và HTTP transport có kiểu

Ngày xác minh: 2026-10-04  
Phạm vi: frontend React/TypeScript với dữ liệu synthetic/mock API. Không yêu cầu backend hoặc API thật để nghiệm thu các checkpoint FE005.  
Revision nền: `18be3c6c75ed66ced592b2d58f36ffbdbd8ae221` trên `main`, cộng working tree hiện hành đang có thay đổi.

## Kết quả hiện hành

FE005.S01–S05 được tái xác minh trên working tree ngày 04/10/2026. Contract canonical là OpenAPI 3.1.0 với 210 operationId duy nhất và 54 route; source audit hiện tại ghi nhận 65 file, 220 operation references, 54 routes và 0 lỗi. Kiểm metadata xác nhận decimal-string cho tiền, ID dạng chuỗi, nullable customer phone/email, Problem fields và permission/event canonical. Generator tái tạo khớp 11 outputs, 283 schemas, 210 operations và 54 routes. Không sửa OpenAPI hoặc generated contract bằng tay.

HTTP client dùng operation/schema registry sinh từ contract, kiểm tra request/response, giữ same-origin credentials, CSRF, `If-Match`, `Idempotency-Key`, `AbortSignal` và timeout. `Problem` có kiểu; lỗi response hoặc mutation chưa rõ kết quả không bị báo thành công và không retry mù. HTTP 202 chỉ được xem hoàn tất sau khi theo dõi trạng thái command. Lượt unit hiện tại PASS 85/85 trên 10 files; generator contract suite PASS 6/6; source/boundaries, lint, strict typecheck, domain/MSW 88/88 và production build đều nằm trong `npm run verify` PASS.

## Kết quả contract và phạm vi UI

- Tiền và ID giữ kiểu chuỗi theo contract; nullable `Customer.phone`/`email` được bảo toàn.
- Query bắt buộc cho cashflow/profit-loss (`from`, `to`, `timezone`) chưa được giả lập mặc định tại FE005. Màn finance cần nhận kỳ do UI chọn trong task tương ứng.
- `listServiceCases` không có query `customerId`; UI chỉ có thể lọc tập kết quả được trả về và không tuyên bố là lịch sử đầy đủ.
- Contract Knowledge không khai báo `allowedActions`. UI demo có thể trình bày thao tác publish theo permission `knowledge.publish` và lifecycle hiện có, nhưng đây là mô phỏng frontend; không bổ sung field giả vào DTO/OpenAPI và không xem kiểm tra phía trình duyệt là kiểm soát quyền phía server.

## Bằng chứng lượt này

- `S01-source-current-20261004.log` và `S01-canonical-current-20261004.log`: source 65/220/54 không issue; canonical inventory 210 unique operationIds, 54 routes, 10/10 contract assertions.
- `S02-generate-current-20261004.log`: `generate:check` PASS, 11 outputs / 283 schemas / 210 operations / 54 routes.
- `S03-S04-unit-current-20261004.log`: Vitest PASS 85/85 trên 10 files; API-client suite covers nullable DTO, CSRF/idempotency, If-Match, Problem statuses 409/412/422/428/429, timeout, invalid DTO, 202 completion, aborted requests và unsupported command status.
- `S05-contract-tests-current-20261004.log`: generator tests PASS 6/6, gồm unresolved schema, thiếu API version/server URL, route drift và stale generated output.
- Typecheck, lint, domain/MSW và production build: PASS trong [FE006 verify log](../FE006/verify-current-20261004.log); chunk 738.39 kB raw / 186.88 kB gzip còn advisory.
- `S01`–`S05-current-revalidated-20261004.json`: checkpoint evidence được tracker kiểm tra hash/schema sau mỗi bước.

## Giới hạn nghiệm thu

Toàn bộ kiểm chứng FE005 chạy cục bộ trên Windows, Node 24.19.0/npm 11.17.0, sử dụng fixture/mock. Không có kết quả backend/provider, CI, staging, live API, UAT hoặc production deployment trong bằng chứng này. Các gate tổng thể FE-G01..09 chỉ được tuyên bố khi đủ bằng chứng tương ứng.

Tracker chuẩn cho tiến độ frontend là `botsales-kit/execution/frontend-progress.json`. FE005 hiện hoàn tất theo 5 checkpoint; task tiếp theo do `node botsales-kit/scripts/progress.mjs next` quyết định. Tracker toàn sản phẩm `execution/progress.json` không thuộc phạm vi cập nhật.
