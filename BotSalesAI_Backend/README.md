# BotSales AI Backend

Workspace triển khai API và công việc nền. [Kế hoạch triển khai](BACKEND_PLAN.md) theo dõi phạm vi và tiến độ. [Quy định workspace](AGENTS.md) ghi quyền sở hữu tệp.

## Cài và chạy

Từ `BotSalesAI_Backend/`, dùng Node.js `24.22.3` và npm `11.17.0` theo manifest.

```powershell
npm ci
npm run verify
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Điền ba mật khẩu riêng cho admin, migration và runtime trong `.env`. Đặt URL theo mẫu dưới, dùng mật khẩu đã mã hóa URL nếu có ký tự đặc biệt. PostgreSQL thử chỉ lắng nghe loopback ở cổng `55432`. [Cấu hình PostgreSQL P0](infra/p0/compose.yml)

```dotenv
MIGRATION_DATABASE_URL=postgresql://botsales_migrator:<migration-password>@127.0.0.1:55432/botsales_be_dev
DATABASE_URL=postgresql://botsales_runtime:<runtime-password>@127.0.0.1:55432/botsales_be_dev
```

```powershell
docker compose --env-file .env -p botsales-be-dev -f infra/p0/compose.yml up -d --wait
npm run db:migrate
npm run db:seed
npm run test:postgres
npm start
```

PostgreSQL 18.7 trên WSL cũng dùng được nếu chạy cùng cổng loopback và cấp quyền bằng `bootstrap.sql` trên cluster thử mới. Compose chạy bước bootstrap khi volume còn trống. Dữ liệu trong volume được giữ qua `stop` và `up`.

Prisma CLI dùng `MIGRATION_DATABASE_URL` cho migration. API và seed dùng `DATABASE_URL` với role runtime. `npm start` đọc `.env`, dùng API đã build và yêu cầu cấu hình DB. Seed nhận database fixture `botsales_be_dev`. Chạy lại seed giữ ID và dữ liệu hiện có của các bản ghi đã tạo. [Schema](apps/api/prisma/schema.prisma) · [Migration đầu tiên](apps/api/prisma/migrations/20261121000100_be03_foundation/migration.sql)

| Kiểm tra | Hành vi |
|---|---|
| `GET /api/v2/health/live` | 200 và `{"status":"ok"}` |
| `GET /api/v2/health/ready` | Kiểm PostgreSQL đã rời chế độ phục hồi, phiên runtime ở chế độ đọc/ghi và truy vấn được bảng `shops`. Trả 503 `SERVICE_UNAVAILABLE` nếu bất kỳ điều kiện nào chưa đạt. |
| `GET /api/v2/health/ready?unknown=value` | 400 và `VALIDATION_FAILED` dưới dạng `application/problem+json` theo schema `Problem`. |
| Endpoint chưa bật | 404 với `Problem`. Phản hồi có `X-Request-Id`; lỗi dùng cùng giá trị cho trường `requestId`. |

Workspace có hai route vận hành, năm route phiên đăng nhập và năm route đọc cửa hàng, xem và thu hồi membership.

## Chạy OIDC thử qua HTTPS

Sau khi migrate và seed PostgreSQL, điền các biến xác thực trong `.env`. Fixture đăng nhập bằng tài khoản tổng hợp `p0-editor` đã có membership tại shop A. Ứng dụng dùng `https://localhost:5173` còn IdP dùng `https://127.0.0.1:9443` để cách ly cookie theo hostname.

```dotenv
APP_ORIGIN=https://localhost:5173
OIDC_ISSUER=https://127.0.0.1:9443
OIDC_CLIENT_ID=botsales-p0-dev
OIDC_CLIENT_SECRET=<mật khẩu client sinh riêng>
OIDC_REDIRECT_URI=https://localhost:5173/api/v2/auth/callback
AUTH_SIGNING_KEY=<32 byte ngẫu nhiên mã hóa hex>
P0_TLS_CERT_FILE=<đường dẫn PEM của chứng thư máy chủ thử>
P0_TLS_KEY_FILE=<đường dẫn PEM của khóa máy chủ thử>
P0_FIREFOX_TRUST_PROFILE=<thư mục profile Firefox thử đã tin CA>
```

Chứng thư thử cần SAN `DNS:localhost` và `IP:127.0.0.1`. Đặt `NODE_EXTRA_CA_CERTS` trong môi trường trước khi khởi động Node, trỏ đến PEM của CA thử. Dùng profile Firefox riêng đã nhập CA này cho kiểm trình duyệt. Các tệp khóa, biến bí mật và profile nằm ngoài Git.

Chạy từ backend trong ba terminal với cùng cấu hình môi trường.

```powershell
npm run dev:idp
npm start
npm run dev:frontend:https
```

Mở `https://localhost:5173/login?returnTo=%2Flogin` và đăng nhập. Trình khởi động HTTPS dùng cấu hình Vite development của frontend và chuyển `/api` về API loopback ở cổng `3000`. Đích P0 cho phép `/login` và `/workspaces`. Đích mặc định là `/workspaces`. Dùng `/login` khi kiểm BE-04 để quan sát nút tiếp tục phiên trước khi luồng chọn shop ở BE-05 được nối.

Thử với `npm run test:oidc` trên DB fixture đã có seed và chạy API qua HTTPS trong bộ test. `npm run test:oidc:browser` khởi động ba dịch vụ ở trên, kiểm Firefox và dừng các tiến trình do bộ kiểm mở. Dừng phiên chạy thủ công trước khi chạy hai lệnh kiểm để giải phóng các cổng.

Lượt đăng nhập hết hạn sau 10 phút và callback tiêu thụ dữ liệu dùng một lần. Phiên ứng dụng hết hạn sau 8 giờ. Server lưu hash của cookie phiên, đổi phiên khi đăng nhập lại và thu hồi phiên khi logout. Phản hồi phiên dùng quyền từ các preset trong danh mục chuẩn. IdP bên ngoài được cấu hình và nghiệm thu ở BE-22.

## Chọn cửa hàng và quản lý nhân sự

Vào `https://localhost:5173/login` để kiểm đường dẫn mặc định về `/workspaces`. Danh sách chỉ hiện những shop người dùng có membership hoạt động. Chọn shop để frontend đọc chi tiết và mở khung làm việc của shop. Dữ liệu trang Tổng quan thuộc BE-07.

Tại màn Nhân sự và quyền, người có `members.manage` được xem, mời, sửa vai trò và thu hồi thành viên trong shop hiện tại. Các lệnh ghi dùng CSRF và `Idempotency-Key`. Sửa vai trò và thu hồi cần thêm phiên bản `If-Match`. Quyền thay đổi ở yêu cầu tiếp theo, kể cả từ phiên đang hoạt động. Tự sửa vai trò và cấp/sửa vai trò `owner` bị chặn. Xác minh nâng cao cho thao tác nhạy cảm thuộc BE-21.

Lời mời được ghi trong hệ thống và có hạn 7 ngày. Người được mời đăng nhập qua IdP đã cấu hình bằng đúng email đã xác minh để kích hoạt quyền. Chủ shop có thể thu hồi lời mời hoặc mời lại sau khi hết hạn. Thử nghiệm dùng IdP tổng hợp. Việc gửi thư cần tích hợp kênh email riêng.

`npm run test:workspace` kiểm API với fixture hai shop. `npm run test:workspace:browser` kiểm R02, R32, R34 và phục hồi command trên Firefox qua HTTPS giống cấu hình OIDC thử ở trên. Hai lệnh dùng DB fixture `botsales_be_dev` đã migrate và seed.

## Tra cứu command và audit

Các lệnh ghi R32 dùng chung ledger theo shop, người tạo, operation và `Idempotency-Key`. Đọc chi tiết bằng `GET /api/v2/shops/{shopId}/commands/{commandId}`. Khi mất phản hồi trước khi biết mã lệnh, gọi `GET /api/v2/shops/{shopId}/commands` với `kind` là operation và `q` là SHA-256 dạng hex của `Idempotency-Key`. Tra cứu chỉ trả lệnh của người tạo có `jobs.read` và quyền hiện hành cho thao tác nguồn. Nếu chưa thấy trạng thái đã kết thúc, giao diện giữ tham chiếu để đối chiếu tiếp.

Màn Nhật ký kiểm toán đọc `GET /api/v2/shops/{shopId}/audit` với quyền `audit.read`. Bản ghi outbox được lưu cùng giao dịch với command R32. Worker phát sự kiện thuộc BE-10.

## Kiểm tra

Luồng SKU P0 chạy qua `npm run test:catalog` và `npm run test:catalog:browser` trên fixture đã migrate và seed. Firefox cần cấu hình HTTPS thử như ca workspace. Bộ ca trình duyệt kiểm tạo, tìm SKU, đọc sau khi khởi động lại API và tra lại lệnh sau khi mất phản hồi.

Chạy Redis fixture bằng Compose, đặt `REDIS_URL=redis://127.0.0.1:56379`, rồi chạy `npm run build` và `npm run start:worker`. Worker đọc outbox và lịch job từ PostgreSQL. Các ca `npm run test:events` và `npm run test:jobs` tự khởi động worker trên fixture Redis/PostgreSQL. Handler nghiệp vụ được đăng ký theo operation khi module sở hữu triển khai.

Catalog nhận ảnh PNG, JPEG và WebP, cùng tệp nhập CSV UTF-8 hoặc XLSX tối đa 5 MB và 1.000 dòng dữ liệu. Backend thử nghiệm lưu nội dung đã kiểm trong PostgreSQL và cấp URL đọc ngắn hạn có kiểm lại quyền. Bước xem trước giữ lỗi từng dòng và cấp token xác nhận trong 30 phút. Chạy `npm run test:imports` để kiểm worker và `npm run test:imports:browser` để kiểm R13–R14 qua cấu hình Firefox HTTPS thử nghiệm. Dùng `npm run test:customers` để kiểm quyền khách hàng và bản chụp địa chỉ.

Chạy `npm run test:inventory` để kiểm tồn, lịch sử kho, giữ hàng và quản trị kho trên PostgreSQL fixture. `npm run test:inventory:browser` kiểm R15, R16 và R55 qua Firefox HTTPS. Nghiệp vụ ghi kho gọi cổng Inventory trong transaction cùng trạng thái nguồn. Movement chỉ cho phép ghi thêm. Đường ghi điều chỉnh qua HTTP được nối với bút toán Finance ở BE-12.

`npm run test:orders` kiểm chính sách giao, đơn, quote, giữ hàng, và tra lại lệnh trên hai shop PostgreSQL. `npm run test:orders:browser` kiểm R18–R19 qua Firefox HTTPS. Bộ kiểm ghi tin nhắn tổng hợp bằng role migration vào DB thử đã xác minh. Điều kiện chốt dùng tin nhắn fixture chỉ mở cho cấu hình IdP loopback thử nghiệm. Worker xử lý hết hạn đơn COD chưa thu tiền và còn giữ hàng khi chạy `npm run start:worker`.

`npm run test:finance` kiểm sổ kép, mở sổ, thu theo bằng chứng và đối ứng kho. `npm run test:finance:browser` kiểm R15, R19 và R48 với PostgreSQL fixture và Firefox HTTPS. Phiếu tài chính ghi vào kỳ mở. Bằng chứng thu/hoàn trong các bộ kiểm là bản ghi tổng hợp. Ledger trả số tổng theo cả cửa sổ trước khi phân trang.

`npm run test:orders` cũng kiểm nhận việc, lấy và đóng gói, bàn giao, sự kiện giao, kiểm hàng trả từng phần, phiên bản policy và thông báo. `npm run test:fulfillment:browser` chạy luồng R39–R43 với HTTPS, PostgreSQL và Redis fixture. Bộ kiểm bật `NOTIFICATION_FIXTURE_ADAPTER=1` riêng cho phiên thử. Adapter yêu cầu OIDC loopback P0 và nhận endpoint Web Push tổng hợp tại `https://push-fixture.invalid`. Kết quả adapter là dữ liệu thử cục bộ. Dữ liệu hãng giao và thông báo đến thiết bị thực được kiểm ở môi trường BE-22 sau khi cấp cấu hình.

`npm run test:procurement` kiểm duyệt mua theo phiên bản, gửi thử, đối chiếu kết quả và nhận từng phần. `npm run test:procurement:browser` kiểm R44–R47 và R38 qua Firefox HTTPS. `PROCUREMENT_FIXTURE_ADAPTER=1` bật cổng gửi thử trong phiên OIDC loopback. Chứng từ nhận và xác nhận bên bán dùng dữ liệu tổng hợp trên cơ sở fixture.

`npm run test:finance` kiểm CSV sao kê, quyền và token xem trước, một job cho mỗi đợt, phân bổ từng phần, phí COD thực tế, xác minh thu/hoàn R65 và khóa kỳ có phê duyệt. `npm run test:reconciliation:browser` kiểm nhập CSV, tra job, ghép công nợ, R65, khóa kỳ và báo cáo qua Firefox HTTPS cùng Redis fixture. Biểu mẫu ngân hàng và COD lấy từ bộ định dạng tổng hợp trong kit. Sổ ghi tiền khi đối chiếu theo chứng từ, và lưu liên kết từ từng khoản phân bổ về giao dịch, công nợ và bút toán.

`npm run test:inbox` kiểm kết nối Messenger thử nghiệm, sự kiện lặp và lệch thứ tự, tiếp quản, tệp riêng tư và duyệt tri thức. `npm run test:inbox:browser` chạy luồng với Firefox HTTPS và Redis fixture. Adapter Messenger thử bật riêng bằng `MESSENGER_FIXTURE_ADAPTER=1` trong cấu hình OIDC loopback.

`npm run test:ai` kiểm kết nối thử nghiệm, hạn mức theo ngày của shop, phòng thử, đánh giá gắn phiên bản và xử lý hội thoại bằng worker. `npm run test:ai:browser` kiểm R26, R27, R28 và R30 trên Firefox HTTPS. Cổng thử yêu cầu `AI_FIXTURE_ADAPTER=1` và OIDC loopback. Ở R30 chọn Cổng AI thử nghiệm, model `synthetic-model`, dùng giá trị tổng hợp dạng `fixture-<chuỗi ngẫu nhiên>`, rồi chạy kiểm kết nối. Ở R28 dùng bộ ca `botsales-fixture-v1`. Phòng thử hỗ trợ `SKU <mã>`, `TỒN <mã>`, `FAQ <cụm từ>` và `NHÁP <mã> <số lượng>`. Cổng thử tính một đơn vị tiền cấu hình cho lần chạy được chấp nhận. Đơn nháp trong hộp thư sử dụng quy trình xác nhận đơn chung của Orders.

`npm run test:operations` kiểm vai trò, phê duyệt, giới hạn gửi tự động, bản tin và báo cáo. Chạy `npm run test:operations:browser` sau suite này để mở các hồ sơ đã tạo trên Firefox HTTPS. Để bật bản tin nội bộ ở môi trường thử, đặt `OWNER_DIGEST_LOCAL_HOUR` từ `0` đến `23` và bật chính sách thông báo với chủ shop trong danh sách người nhận. Worker ghi mỗi bản tin của một ngày địa phương một lần. Dấu thời gian kiểm worker hết hiệu lực sau 30 giây.

Để đề nghị một giới hạn, người có quyền gửi `createApproval` cho `budget_policy` với action `budget.change.daily`, `budget.change.monthly` hoặc `budget.change.per_order`. Dòng đầu của `reason` là `LIMIT <số tiền> <tiền tệ>`, dòng sau ghi lý do. `intentHash` là SHA-256 hex của chuỗi JSON mảng `[action, shopId, budgetPolicyId, resourceVersion, amount, currency]`, trong đó `amount` là chuỗi thập phân dương bỏ số 0 thừa ở sau dấu thập phân. Kiểm số tiền và kỳ trên phê duyệt trước khi người có quyền khác quyết định. Gửi mã phê duyệt trong `updateBudgetPolicy` với đúng số tiền, kỳ và phiên bản. Hạn mức AI và thông báo thử dùng kỳ ngày và tính một đơn vị cấu hình trên mỗi lần thử được ghi.

Ủy quyền đơn mua được tạo ở trạng thái tạm dừng. Sau khi kích hoạt, cập nhật quy tắc đã lưu với cặp mã ngân sách và ủy quyền có cùng phạm vi. Khoản ngân sách giữ trước khi gửi được chốt khi adapter nhận hoặc khi có bằng chứng nhà cung cấp, giữ chờ khi kết quả chưa rõ và giải phóng khi kiểm quyền chặn trước lúc gửi. Phạm vi tạm dừng shop dùng `automationVersion` từ `getBotConfig`.

`npm run test:privacy` kiểm mở shop, consent, step-up, pháp lý giữ chứng từ và tải tệp xuất. `npm run test:privacy:browser` chạy Firefox HTTPS với PostgreSQL và Redis fixture. Suite tự cấp mật khẩu ngẫu nhiên cho phiên thử. Khi chạy thủ công, `P0_STEP_UP_PASSWORD` cần ít nhất 16 ký tự và chỉ dùng với IdP loopback. `PRIVACY_FIXTURE_ACTIONS=1` cho phép chủ shop thử phê duyệt sau khi lưu chính sách trên dữ liệu tổng hợp. Bản xuất có hạn 24 giờ, đường dẫn đọc tối đa 5 phút và kiểm lại quyền mỗi lần tải. [Kết quả BE-21](BACKEND_PLAN.md#kết-quả-kiểm-be-21)

- `npm run lint` kiểm lint và ranh giới workspace. Module nghiệp vụ sử dụng `index` công khai của module khác.
- `npm run typecheck` kiểm TypeScript, `npm run build` sinh API ở `apps/api/dist/`.
- `npm test` chạy các ca HTTP và ca đối chứng của ma trận trên bản build.
- `npm run test:postgres` chạy các ca tích hợp với PostgreSQL đã migrate và seed. Dùng database fixture riêng cho suite.
- `bash scripts/verify-postgres.sh` kiểm từ database trống, lặp migration, kiểm schema và seed, thử dừng PostgreSQL, kiểm OIDC qua HTTPS, quyền workspace, kho tệp S3, catalog, worker, SSE và job. Script dùng project Compose, volume và chứng thư thử riêng. Bước kho tệp chạy trên Linux x64, tải SeaweedFS 4.54 theo SHA-256, khởi động bucket loopback dùng một lần và lưu log `test-results/backend/object-storage-ci.txt`. Các cổng `55432`, `55433`, `56379`, `5173`, `9443`, `28333`, `29333`, `29340` và `28888` cần trống.
- `npm run verify:matrix` đọc ma trận từ kế hoạch và hợp đồng chuẩn trong kit, rồi dò controller đã đăng ký trên bản build. Khi bật operation sản phẩm, cập nhật `api-scope.json` với ID operation, ID ca và tệp kiểm thử tương ứng. Gắn `ContractOperation` cho handler sản phẩm để đối chiếu cùng method/path của OpenAPI.
- `npm run verify` chạy lint, kiểm ranh giới, validate Prisma, generate, build, ma trận và các ca kiểm dùng được khi chưa có DB. CI bổ sung kiểm PostgreSQL riêng và lưu báo cáo ma trận gắn SHA checkout và baseline hợp đồng. [Workflow backend](../.github/workflows/backend.yml)

### Khôi phục migration

`npm run db:migrate` áp dụng migration tiến tới. Giữ SQL đã áp dụng và thêm migration sửa tiếp khi cần. Với môi trường có dữ liệu, lưu backup trước migration và kiểm khả năng restore ở môi trường riêng. Database fixture có thể dựng lại trong một project và volume mới.

Chạy `npm run test:load:local` trên PostgreSQL fixture để đo đọc, cách ly shop và tranh cùng ý định. Quy trình đóng gói, kiểm staging, phục hồi và quay lui nằm trong [runbook](infra/RELEASE_RUNBOOK.md).
