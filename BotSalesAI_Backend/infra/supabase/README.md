# PostgreSQL trên Supabase Cloud cho bản thử Windows

Theo dõi trạng thái chuyển đổi tại [BE-CLOUD](../../BACKEND_PLAN.md#be-cloud). Bản thử dùng dự án Free [botsalesai-dev](https://supabase.com/dashboard/project/ssxkuwmnfnbkahejrgoj) tại Singapore cho hai shop tổng hợp. Backend và frontend chạy trên Windows. Redis, IdP và HTTPS thử, SeaweedFS và ClamAV tiếp tục dùng cấu hình Windows.

## Xác minh đích trước khi nhập

1. Xác định dự án và tổ chức qua Dashboard. Xác nhận trạng thái hoạt động, gói Free, vùng và phiên bản PostgreSQL thực tế. Kiểm schema `public` chưa có bảng hoặc lịch sử Prisma của BotSales AI. Nếu đích có dữ liệu, lập phương án hợp nhất trước khi nhập.
2. Tắt Data API của dự án dành riêng cho BotSales AI. Migration hiện có tham chiếu trực tiếp `public`. Giữ tên schema và kiểm quyền trên bảng, hàm và schema của các role `anon`, `authenticated` và `service_role`. Giữ quyền chức năng nhạy cảm theo migration đã áp dụng. [Cấu hình Data API](https://supabase.com/docs/guides/api/securing-your-api)
3. Dùng kết nối PostgreSQL trực tiếp hoặc **Session pooler** cổng 5432 khi máy Windows chỉ có IPv4. Kiểm TLS và xác thực máy chủ từ máy sẽ chạy ứng dụng. Dùng kết nối phiên cho Prisma migration và công cụ dump/restore. Lấy thông số thực tế từ **Connect** trong Dashboard. [Kết nối PostgreSQL trên Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres)
4. Chuẩn bị `botsales_migrator` sở hữu đối tượng ứng dụng và `botsales_runtime` có quyền nghiệp vụ theo migration. Kết nối quản trị chỉ dùng khi thiết lập hoặc bảo trì. Kiểm tài khoản runtime truy cập đúng dữ liệu nghiệp vụ và thiếu quyền thay đổi cấu trúc, quyền quản trị hoặc quyền ghi lịch sử Prisma.

## Sao lưu và nhập dữ liệu

1. Dừng ứng dụng ghi vào PostgreSQL Windows. Kiểm đúng cụm `D:/BotSalesAI/data/postgres-55770`. Dùng `pg_dump --format=custom --schema=public` để giữ schema ứng dụng, dữ liệu, quyền và lịch sử Prisma. Giữ dump, SHA-256 và báo cáo từ [verify-restore.sql](../backup/verify-restore.sql) dưới `D:/BotSalesAI/backup`. Kiểm file object trên kho Windows riêng vì dump chỉ chứa dữ liệu PostgreSQL.
2. Kiểm archive bằng `pg_restore --list`. Trên đích đã có schema `public`, tạo danh sách phục hồi bỏ đúng ba mục tạo schema, mô tả schema và ACL cấp schema của nguồn. Giữ các mục bảng, kiểu dữ liệu, trigger, hàm, quyền từng đối tượng và dữ liệu. Quyền cấp schema được thiết lập riêng cho role ứng dụng trên đích.
3. Kiểm checksum trước khi phục hồi. Với đích Cloud trống, dùng `pg_restore --dbname postgres --no-owner --use-list <danh-sách> --exit-on-error --single-transaction` bằng role `botsales_migrator`. Role này sở hữu đối tượng được tạo và áp các grant runtime trong dump. Kiểm tương thích phiên bản và quyền trên đích. Cấp mật khẩu qua môi trường tiến trình hoặc tệp mật khẩu được bảo vệ.
4. Dùng cùng [truy vấn đối chiếu](../backup/verify-restore.sql) trên đích, so kết quả qua [bộ kiểm restore](../backup/check-restore-evidence.mjs). Đối chiếu số bảng, hai shop và lịch sử migration, rồi chạy Prisma migration status qua `MIGRATION_DATABASE_URL` bằng checkout khớp lịch sử migration của dump. Ghi kết quả và lỗi vào BE-CLOUD.

## Chạy API và worker trên Windows

Trên máy thử, `activeEnvironmentFile` trong `D:/BotSalesAI/config/windows-pilot.json` trỏ tới hồ sơ riêng `D:/BotSalesAI/config/supabase/windows-supabase.env`. Hồ sơ lưu ngoài Git và quyền NTFS giới hạn cho tài khoản Windows đang chạy. Giữ `D:/BotSalesAI/config/windows-pilot.env` cho fixture cục bộ.

| Biến | Kết nối |
|---|---|
| `MIGRATION_DATABASE_URL` | Role `botsales_migrator.<project-ref>` qua Session pooler, `sslmode=require`, `sslaccept=strict` và `sslcert` trỏ tới CA Supabase |
| `DATABASE_URL` | Role `botsales_runtime.<project-ref>` qua Session pooler, `sslmode=verify-full` và `sslrootcert` trỏ tới CA Supabase |

Khởi động Redis, SeaweedFS và ClamAV theo [hướng dẫn Windows](../windows/README.md#chạy-và-dừng-dịch-vụ). Chạy các lệnh dưới đây từ `BotSalesAI_Backend` ở các cửa sổ PowerShell riêng rồi mở `https://localhost:5173/workspaces`. API readiness kiểm cả kết nối DB và ClamAV khi hồ sơ cấu hình quét tệp.

```powershell
./infra/windows/start-pilot.ps1 -Service Idp
./infra/windows/start-pilot.ps1 -Service Api
./infra/windows/start-pilot.ps1 -Service Worker
./infra/windows/start-pilot.ps1 -Service Frontend
```

Để kiểm lại hai shop qua HTTPS, dừng IdP và frontend trên cổng 9443 và 5173 trước khi chạy smoke. Khởi động ClamAV nếu hồ sơ đặt `FILE_SCAN_PORT` hoặc `FILE_SCAN_SOCKET`, vì ca kiểm readiness sử dụng cùng cấu hình scanner với API. Ca kiểm mở máy chủ HTTPS và IdP thử, đăng nhập từng chủ shop, kiểm quy tắc 200/404, đăng xuất rồi dừng các tiến trình kiểm. Với `--worker`, giữ worker và Redis đang chạy để thử một export CSV mỗi shop.

```powershell
$profile = 'D:/BotSalesAI/config/supabase/windows-supabase.env'
$env:NODE_EXTRA_CA_CERTS = node --env-file=$profile -p 'process.env.NODE_EXTRA_CA_CERTS'
node --env-file=$profile infra/supabase/smoke.mjs
```

Các lệnh seed và bộ kiểm ghi dữ liệu có ràng buộc fixture loopback dùng [PostgreSQL Windows](../windows/README.md). Giữ cấu hình Cloud ngoài `.env` mặc định của workspace để bộ kiểm cục bộ và CI dùng đúng fixture.

Bằng chứng Cloud dùng checkout Windows trên `292d4bd4` với thay đổi cục bộ. DB Cloud có 51 migration đã kiểm trên checkout đó. Baseline GitHub của đợt bàn giao BE-CLOUD chứa 44 migration. Chạy kiểm migration trên DB fixture riêng khi dùng checkout GitHub này.

## Sao lưu định kỳ và quay lui

Lưu dump thủ công và SHA-256 từ Cloud xuống D. Khi phục hồi sang cụm Windows, bootstrap hai role ứng dụng và giữ schema `public` trống. Trong danh sách restore, bỏ ba mục cấp schema ở bước nhập và các mục `DEFAULT ACL public` của role nền tảng `postgres`, `supabase_admin`. Giữ các ACL của đối tượng ứng dụng cho `botsales_runtime`. Phục hồi một giao dịch và so khớp với báo cáo Cloud. Lượt kiểm ngày 25/11/2026 đã khớp 113 bảng và 46 nhóm nghiệp vụ. Sao lưu kho đối tượng theo [hướng dẫn Windows](../windows/README.md#sao-lưu-phục-hồi-và-quay-lui).

Gói Free có giới hạn 500 MB database và có thể tạm dừng sau một tuần không hoạt động. [Giới hạn gói Free](https://supabase.com/pricing)

Khi cần quay lui, dừng API và worker rồi chọn hồ sơ Windows bằng `-EnvironmentFile D:/BotSalesAI/config/windows-pilot.env` hoặc đổi `activeEnvironmentFile`. Hồ sơ này dùng cụm Windows gốc tại cổng 55770. Nếu cần giữ dữ liệu mới từ Cloud, phục hồi dump Cloud vào cụm Windows riêng và đối chiếu, rồi cấu hình URL tới cụm vừa phục hồi. Kiểm lại readiness, quyền hai shop, Redis và truy xuất object sau khi chuyển.
