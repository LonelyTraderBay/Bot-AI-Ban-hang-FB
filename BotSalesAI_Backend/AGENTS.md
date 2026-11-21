# Quy định mã nguồn backend BotSales AI

Áp dụng cho mọi thay đổi backend trong repository. Đọc thêm [quy định cấp repo](../AGENTS.md) và [kế hoạch backend](BACKEND_PLAN.md) trước khi nhận việc.

## Vị trí mã và tệp theo thành phần

**Toàn bộ mã triển khai backend phải nằm trong `BotSalesAI_Backend/`.** Dùng thư mục này làm gốc workspace cho manifest, lockfile, cấu hình TypeScript, fixture, kiểm thử, script, tài liệu chạy và bằng chứng riêng của backend.

| Đường dẫn tương đối với `BotSalesAI_Backend/` | Nội dung |
|---|---|
| `apps/api/` | API, webhook, xử lý HTTP, xác thực, các module nghiệp vụ, giao dịch và adapter dịch vụ ngoài. |
| `apps/api/prisma/` | Prisma schema, migration và seed theo kế hoạch. |
| `apps/worker/` | Điểm khởi động worker, lịch chạy và xử lý hàng đợi. Worker gọi giao diện nghiệp vụ công khai dùng chung với API. |
| `tests/` | Kiểm hợp đồng, tích hợp PostgreSQL, phân quyền, worker và ca xuyên nghiệp vụ của backend. Kiểm thử đơn vị có thể đặt cạnh module sở hữu. |
| `scripts/`, `infra/` | Lệnh build, sinh mã, kiểm tra, migration và định nghĩa hạ tầng riêng của backend khi cần. |

- `botsales-kit/` sở hữu [OpenAPI chuẩn](../botsales-kit/contracts/openapi.json), hợp đồng sự kiện, route và danh mục quyền. Sinh hoặc kiểm dữ liệu giao tiếp backend từ các nguồn này. Đầu ra riêng của backend nằm trong workspace backend.
- `BotSalesAI_Frontend/` sở hữu giao diện, API client và MSW demo. Hai workspace giao tiếp qua API và sự kiện theo hợp đồng chung. Backend chỉ dùng tầng nghiệp vụ và kiểm thử nằm trong workspace của mình.
- `.github/` sở hữu định nghĩa workflow cấp repo. Workflow backend gọi lệnh, lockfile và artifact theo đường dẫn của `BotSalesAI_Backend/`. Script thực thi và kiểm tra riêng của backend đặt trong workspace backend.

## Kiểm ranh giới khi thay đổi backend

1. Trước khi sửa, xác định mã BE trong kế hoạch, module sở hữu và vị trí tệp. Ánh xạ các đường dẫn `apps/api`, `apps/worker` và `infra` trong tài liệu kit vào `BotSalesAI_Backend/`.
2. Trước khi bàn giao, rà danh sách tệp thêm, sửa và di chuyển. API, worker, migration, kiểm thử và script backend phải nằm dưới workspace backend. Với file ngoài workspace, ghi rõ phạm vi phối hợp tương ứng như hợp đồng, frontend consumer hoặc workflow cấp repo.
3. Khi triển khai BE-02, đưa kiểm ranh giới workspace vào lệnh kiểm backend và CI. Lệnh kiểm phải xác nhận đường dẫn chạy, manifest và lockfile, đồng thời phát hiện import từ mã nội bộ hoặc mock frontend và route backend đặt ngoài workspace.
