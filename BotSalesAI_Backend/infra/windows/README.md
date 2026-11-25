# Bản thử BotSales AI chạy trực tiếp trên Windows

Dùng PowerShell 7 và thư mục thử riêng trên ổ Windows. Bản thử dùng hai shop tổng hợp. Mốc khóa phiên bản, kết quả và giới hạn nằm trong [BE-WIN](../../BACKEND_PLAN.md#be-win).

## Phạm vi hướng dẫn

PostgreSQL Windows theo [BE-WIN](../../BACKEND_PLAN.md#be-win) phục vụ kiểm fixture, diễn tập phục hồi và quay lui. Bản thử đang chọn hồ sơ Supabase Cloud theo [BE-CLOUD](../supabase/README.md). Redis, kho đối tượng và ClamAV vẫn chạy trên Windows. Hồ sơ trên máy đặt DB fixture và kho đối tượng ở `D:/BotSalesAI/data`, dump và bản sao tệp ở `D:/BotSalesAI/backup`. Bộ chạy [offline-acceptance.ps1](offline-acceptance.ps1) thuộc hồ sơ tập dượt v1.91.

Đầu ra cục bộ dùng `BOTSALES_ARTIFACT_ROOT=D:/BotSalesAI/artifacts`. Mở phiên PowerShell mới để lấy biến ở phạm vi tài khoản. Trong cửa sổ đã mở, đặt `$env:BOTSALES_ARTIFACT_ROOT = 'D:/BotSalesAI/artifacts'` trước khi chạy kiểm. Khi chạy pilot đã cấu hình trên máy này, dùng `$RunDirectory = 'D:/BotSalesAI/data'` và tệp cấu hình fixture `D:/BotSalesAI/config/windows-pilot.env`. Lệnh smoke qua HTTPS có thể nạp trực tiếp tệp đó.

```powershell
node --env-file=D:/BotSalesAI/config/windows-pilot.env tests/integration/auth/browser-smoke.mjs --pilot
```

Khi diễn tập backup từ hồ sơ này, truyền `-BackupDirectory` và `-RestoreRunDirectory` tới thư mục riêng đã tạo trên D. `backup-restore.ps1` kiểm `data_directory` của cả hai cụm trước khi ghi bản phục hồi.

## Chuẩn bị gói

- Giữ bộ nhị phân PostgreSQL Windows x64, ba công cụ hàng đợi/kho tệp/quét tệp, Node theo `.node-version`, npm theo `package.json`, Firefox của Playwright và cache npm đủ cho hai lockfile. Ghi phiên bản, nguồn và SHA-256 các gói. Cài phụ thuộc BE từ checkout sạch bằng `npm ci --offline --no-audit --no-fund --cache <cache-cục-bộ>`. Chuẩn bị phụ thuộc FE trước khi chạy `dev:live`.
- Dùng chứng thư phát triển khớp `localhost` và `127.0.0.1`, CA cho Node và profile Firefox fixture tin cậy CA. Các biến OIDC, HTTPS và adapter mô phỏng theo [hướng dẫn backend](../../README.md). Tạo mật khẩu dành riêng cho cụm metadata thử và giữ ngoài Git.
- Khi diễn tập, giữ một thư mục mới có quyền truy cập của người đang chạy. Đặt log, dump, tài liệu đối chiếu và các cấu hình có secret trong thư mục thử ngoài checkout.

## Chạy và dừng dịch vụ

Từ gốc `BotSalesAI_Backend`, cấp `BOTSALES_DB_ADMIN_PASSWORD`, `BOTSALES_DB_MIGRATION_PASSWORD` và `BOTSALES_DB_RUNTIME_PASSWORD` trong phiên PowerShell. `$PgBin` trỏ tới thư mục `pgsql/bin`. `$RunDirectory` trỏ tới thư mục thử đã tạo. Ví dụ sau dùng cổng 55770 cho cụm nguồn và 55772 cho cụm phục hồi.

```powershell
./infra/windows/postgres.ps1 -Action Start -Bin $PgBin -RunDirectory $RunDirectory -Port 55770
./infra/windows/postgres.ps1 -Action Start -Bin $PgBin -RunDirectory $RunDirectory -Port 55772
```

Đặt `MIGRATION_DATABASE_URL` và `DATABASE_URL` theo [mẫu cấu hình](../../.env.example). Đích dùng `127.0.0.1`, cổng cụm đã chọn, DB `botsales_be_dev` và hai tài khoản khác quyền. Áp `npm run db:migrate` và `npm run db:seed` cho cụm nguồn. Cụm phục hồi giữ schema trống đến bước restore.

| Thành phần | Cách chạy cho fixture |
|---|---|
| Hàng đợi | Chạy `redis-server.exe --bind 127.0.0.1 --port 56770 --protected-mode yes --maxmemory-policy noeviction --appendonly no` từ thư mục dữ liệu riêng. Kiểm `redis-cli.exe -h 127.0.0.1 -p 56770 ping` và đặt `REDIS_URL` cùng đích. Dùng instance khác, DB trống, để kiểm replay. |
| Kho tệp | Chạy `weed.exe mini` với `-ip=127.0.0.1 -ip.bind=127.0.0.1`, `-dir` riêng, các cổng dịch vụ không trùng, `-s3.port=44370`, `-bucket=botsales-file-fixture` và `-s3.config` chứa thông tin xác thực fixture. Đặt `OBJECT_STORE_FIXTURE_ADAPTER=1` và các biến `FILE_OBJECT_STORE_*` tương ứng. |
| Quét tệp | Chạy `clamd.exe --config-file=<tệp-config>` với `Foreground yes`, `TCPAddr 127.0.0.1`, `TCPSocket 56970` và `DatabaseDirectory` cục bộ. Đặt `FILE_SCAN_PORT=56970`. Bộ test `test:catalog` nhận `P0_CLAMD_PORT` để kiểm chữ ký tổng hợp và tệp sạch. |
| API, worker, HTTPS và IdP | `npm run test:pilot:browser` khởi động và dừng các tiến trình thử, bao gồm FE `dev:live`, rồi ghi kết quả Firefox. Dùng `P0_LOCAL_PILOT=1` khi seed và đặt các biến HTTPS/OIDC từ cấu hình fixture. |

Khi cần kiểm kết nối của pilot, có thể đặt preloader sau để giới hạn TCP của Node tới loopback. Bộ kiểm Firefox ghi yêu cầu web ngoài hai origin thử. Windows có thể giữ kết nối Internet.

```powershell
$loopback = [Uri]::new((Resolve-Path ./infra/windows/require-loopback.mjs).Path).AbsoluteUri
$env:NODE_OPTIONS = "--import=$loopback"
npm run verify
npm run test:workspace
npm run test:pilot:browser
```

## Sao lưu, phục hồi và quay lui

1. Chạy [điều phối diễn tập hai shop](../RELEASE_RUNBOOK.md#diễn-tập-postgresql-với-hai-shop-mẫu), pha `prepare`, vào một tệp trạng thái mới. Cho worker chuyển tệp đang chờ sang kho rồi dừng các luồng ghi. Khi dùng kho riêng, chạy `node infra/windows/object-snapshot.mjs backup <thư-mục-mới>` và `node scripts/check-object-storage.mjs` với cấu hình nguồn.
2. Chạy `./infra/windows/backup-restore.ps1 -Bin $PgBin -RunDirectory $RunDirectory -SourcePort 55770 -RestorePort 55772`. Script từ chối hai cổng trùng, xác minh thư mục dữ liệu qua từng kết nối, kiểm schema đích trống và giữ SHA-256 dump. Báo cáo dùng bộ so sánh hiện hành.
3. Dừng kho nguồn và dựng kho đích với thư mục dữ liệu mới dưới cùng địa chỉ S3 logic để khớp mã kho lưu trong PostgreSQL. Đổi `DATABASE_URL` sang cụm phục hồi, chạy `node infra/windows/object-snapshot.mjs restore <thư-mục-backup>`, kiểm digest và quyền ghi bằng `node scripts/check-object-storage.mjs` và `--probe-write`.
4. Chạy các pha `verify-queued`, `verify-completed` với Redis trống. Xác nhận tải đúng shop, từ chối shop kia và mỗi export phục hồi chỉ chạy một lần. Để thử quay lui, dừng stack đích, chọn lại cụm nguồn và kho nguồn, kiểm readiness cùng digest object lần nữa.
5. Chạy `postgres.ps1 -Action Stop` cho từng cụm thử đã dùng. Dùng `redis-cli.exe -h 127.0.0.1 -p <cổng> shutdown nosave` cho hàng đợi tổng hợp. Dừng ClamAV và SeaweedFS theo tiến trình của lượt thử, rồi kiểm lại các cổng. Giữ dữ liệu và bằng chứng phục hồi.
