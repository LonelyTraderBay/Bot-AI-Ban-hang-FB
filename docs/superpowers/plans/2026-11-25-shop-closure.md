# Đóng và mở lại cửa hàng — kế hoạch triển khai

> Khi thực hiện, dùng `superpowers:executing-plans` hoặc `superpowers:subagent-driven-development` theo cách đã chọn. Đánh dấu từng bước sau khi xác minh kết quả.

**Mục tiêu** là cho chủ shop đóng và mở lại cửa hàng, bảo toàn dữ liệu và quyền đọc của shop.

**Kiến trúc** dùng thời điểm đóng trong bảng `shops` làm nguồn trạng thái cho API, web và worker. Lệnh đổi trạng thái dùng chung hạ tầng phiên, khóa phiên bản, chống gửi lặp và nhật ký. Yêu cầu ghi hoặc nhận công việc phải kiểm trạng thái trong giao dịch.

**Thành phần** gồm NestJS, Prisma, PostgreSQL/Supabase, OpenAPI, React/TypeScript, MSW và Playwright.

**Thiết kế đã duyệt** tại [`2026-11-25-shop-closure-design.md`](../specs/2026-11-25-shop-closure-design.md).

## Ràng buộc chung

- Giữ các sửa đổi Supabase đang có trong checkout chính. Làm tính năng trên nhánh riêng và kiểm migration trong cơ sở thử tách biệt trước khi xem xét Supabase.
- Shop cũ và shop mới mặc định `active`. Đóng chuyển sang `closed`. Xóa dữ liệu nằm ngoài phạm vi đã duyệt.
- Hợp đồng gốc là `botsales-kit/contracts/openapi.json`. Sinh lại YAML, chỉ mục operation và hợp đồng Frontend bằng công cụ dự án.
- Đóng và mở lại là thao tác của `owner` có membership đang hoạt động trong đúng shop. Mọi lần kiểm quyền có shop mẫu A và B, kể cả kiểm cả phiên đã mở trước khi đóng.

## Tình huống cần rà kỹ

- Hai yêu cầu đồng thời giữa đóng và ghi, hoặc giữa đóng và nhận việc, chỉ được kết thúc theo một thứ tự nhất quán.
- Replay cùng khóa không tạo audit lặp. Lệnh mới dùng phiên bản cũ bị từ chối.
- Các dòng COD và hoàn tiền còn chờ được kiểm theo trạng thái tài chính riêng, kể cả lúc vận đơn đã giao.
- Tin Messenger đến trong lúc đóng tiếp tục lưu đúng một lần. Mở lại không tạo việc bot từ tin cũ.
- Thu hồi thành viên và xử lý dữ liệu cá nhân vẫn được kiểm quyền. Trong shop khác, các API và tác vụ nền tiếp tục xử lý như trước.

## 1. Trạng thái database và hợp đồng

Tệp sở hữu gồm `BotSalesAI_Backend/apps/api/prisma/schema.prisma`, migration tiếp theo trong `apps/api/prisma/migrations/`, `botsales-kit/contracts/openapi.json` và `BotSalesAI_Backend/api-scope.json`.

- [x] Viết ca nâng cấp với hai shop có trước migration. Sau migrate, `closed_at` là `NULL` ở cả hai shop. Dòng dữ liệu cũ giữ nguyên ID.
- [x] Thêm `Shop.closedAt: DateTime?` ánh xạ cột `closed_at`. Xuất `Shop.status` là `active` hoặc `closed`, và `Shop.closedAt` nullable.
- [x] Khai báo `POST /shops/{shopId}/close` (`closeShop`) và `POST /shops/{shopId}/reopen` (`reopenShop`). Hai operation trả `ShopResponse`, dùng `If-Match`, `Idempotency-Key` và CSRF, có phản hồi xung đột theo hợp đồng. `listShops` nhận `status` mặc định `active`. Cursor gắn với bộ lọc.
- [x] Sinh hợp đồng rồi kiểm bằng `npm run generate:check` ở Frontend và bộ xác thực hợp đồng của kit. Áp migration trên fixture nâng cấp và xác nhận `prisma migrate status`.

## 2. API đổi trạng thái và quyền

Tệp sở hữu gồm `apps/api/src/modules/workspace/shops/shops-controller.ts`, `shops-service.ts`, nghiệp vụ trạng thái mới đặt cùng thư mục, `modules/workspace/policy/command-scope.ts` và `tests/integration/workspace/shops.test.mjs` dưới `BotSalesAI_Backend`.

- [x] Viết các ca chủ shop A đóng và mở lại, thành viên không phải chủ nhận `403`, chủ shop B gọi sang A nhận `404`, phiên bản cũ bị từ chối, gửi lặp có một mục audit, danh sách lọc đúng trạng thái. Chạy `npm run test:workspace` để thấy ca mới thất bại trước sửa.
- [x] Dùng giao dịch ghi shop đang có cho `closeShop` và `reopenShop`. Đổi `closedAt`, tăng `version`, ghi audit cùng giao dịch, và trả kết quả qua cơ chế tra lệnh. Giữ quyền đọc lịch sử trong `getShop`.
- [x] Đọc trạng thái với khóa shop khi bắt đầu ghi nghiệp vụ trong `writeShopCommand`, kiểm bên trong phần thực thi lệnh mới để replay lệnh đã hoàn tất vẫn đọc được kết quả. Chỉ cho phép ngoại lệ đã duyệt cho đổi trạng thái, thu hồi quyền thành viên và xử lý dữ liệu cá nhân. Lệnh ghi bị chặn dùng mã `SHOP_CLOSED`.
- [x] Kiểm điều kiện chặn đóng theo nghiệp vụ. Nhóm lỗi gồm đơn chưa xong, vận đơn hoặc trả hàng đang xử lý, giữ tồn, đơn mua chờ nhận, việc nền, khoản cần đối soát và gửi ngoài chưa rõ kết quả. Trả mã `SHOP_CLOSE_BLOCKED` cùng nhóm cần xử lý. Bản nháp chưa xác nhận giữ lại.
- [x] Chạy lại `npm run test:workspace`. Kiểm thêm cuộc đua đóng và ghi cùng hai trạng thái cuối hợp lệ, lịch sử được đọc sau khi đóng, thu hồi thành viên đi qua đúng quyền.

## 3. Webhook và worker

Tệp sở hữu gồm `apps/api/src/modules/inbox/messenger-inbound.ts`, `bot-inbound.ts`, `dispatch.ts`, `apps/api/src/platform/outbox/`, các scheduler do `apps/worker/src/main.mjs` gọi và ca trong `tests/integration/inbox/`, `tests/integration/ai/`, `tests/integration/workers/`, dưới `BotSalesAI_Backend`.

- [x] Viết ca shop A đã đóng nhận cùng tin hai lần. Kết quả lưu đúng một tin và không có việc bot cả trước lẫn sau khi mở lại. Shop B tiếp tục nhận việc. Viết ca đóng bị chặn nếu việc nghiệp vụ đang chạy hoặc gửi ngoài chưa có kết quả.
- [x] Khi nhận tin hợp lệ, cho luồng ghi Hộp thư tiếp tục và bỏ bước tạo việc bot nếu shop đóng. Dùng trạng thái ở thời điểm ghi, không quét lại tin đã nhận khi mở shop.
- [x] Các đường nhận việc, gửi Messenger, mua, thông báo, làm việc định kỳ và tự động đặt lại kiểm trạng thái trước khi bắt đầu tác động. Dùng cùng khóa shop trước khi khóa hàng chuyên biệt. Luồng quyền riêng tư giữ quyền và bước duyệt hiện có.
- [x] Kiểm trước và sau đóng bằng các bộ `test:inbox`, `test:ai`, `test:jobs` và bộ nghiệp vụ có đường nhận việc thay đổi. Xác nhận tài khoản shop B và độ bền chống gửi lặp.

## 4. Frontend live và demo

Tệp sở hữu gồm `apps/web/src/modules/workspace/index.tsx`, `shop-settings.tsx`, `apps/web/src/shared/model/scope.tsx`, mock trong `apps/web/src/mocks/service.ts` và `auxiliary.ts`, cùng ca tại `tests/ui-workspace-layout.spec.ts` dưới `BotSalesAI_Frontend`.

- [x] Viết ca shop A đóng qua hộp thoại, rời danh sách hoạt động, xuất hiện ở mục **Đã đóng**, xem được lịch sử, mở lại và còn nguyên dữ liệu. Ca shop B và người không phải chủ kiểm khả năng nhìn thấy nút và quyền backend.
- [x] Dùng thành phần hộp thoại, thông báo và `useCommand` hiện có trong **Thiết lập cửa hàng**. Hiện nhóm vướng do backend trả về. Hủy truy vấn cũ rồi nạp lại danh sách và trạng thái sau lệnh thành công.
- [x] Tách hai bộ lọc trong **Chọn cửa hàng**. Hiện trạng thái đã đóng và tắt thao tác ghi nghiệp vụ. Giữ đường đọc, thoát phiên, quản trị quyền và quyền riêng tư đã duyệt. Mock tuân theo cùng lệnh, quyền và dữ liệu trạng thái.
- [x] Chạy kiểm Frontend và ca trình duyệt mục tiêu. Kiểm thêm giao diện mở từ trước khi đóng, hộp thoại bằng bàn phím và lỗi xung đột phiên bản.

## 5. Xác minh tích hợp và ghi kết quả

- [x] Kiểm migration từ baseline 59 migration trên fixture chứa dữ liệu trước đó. Chạy Backend, kiểm hợp đồng, Frontend, ca hai shop qua HTTPS và `git diff --check`.
- [x] Ghi phạm vi đã kiểm, các luồng tiếp tục chờ nhà cung cấp và trạng thái migration Supabase trong kế hoạch audit. Giữ riêng các sửa đổi tiền kiểm Supabase từ công việc trước.
- [x] Rà diff theo thiết kế đã duyệt. Lưu các commit theo từng nhóm hoàn chỉnh trên nhánh tính năng. Bước cập nhật dữ liệu Cloud thực hiện với backup và xác minh đúng đích sau khi thay đổi đã được kiểm.

## Biên nhận triển khai cục bộ

- Dữ liệu hai shop được seed khi còn 59 migration. Nâng lên 61 giữ nguyên ID, tên, kho mặc định và trạng thái hoạt động. Firefox HTTPS dùng API thật để tạo, đóng, liệt kê ở mục đã đóng và mở lại cùng shop thử.
- Backend đạt 45 kiểm thử đơn vị, workspace 25/25, tài chính 18/18 và AI 13/13 trên fixture. Kiểm nâng cấp, Inbox/Privacy/Jobs, webhook mô phỏng và các CLI chứng từ đã qua các lượt tập trung.
- Frontend đạt verify, 291 ca Vitest và 122 ca domain/network. Chromium/Firefox đạt 16/16 kiểm tra demo dựng, gồm giới hạn trang đầu 511.397/512.000 byte gzip. Hai lượt riêng kiểm phiên, lỗi tải lại và dữ liệu cũ.
- JSON/YAML của 384 schema đồng nhất, kit đạt 544/544. Rà soát toàn nhánh duyệt các sửa đổi cuối trong d5bb1c2a. Các migration 60 và 61 hiện chạy trên fixture. Bước triển khai Supabase tiếp tục theo quy trình sao lưu và xác minh đích của hồ sơ Cloud.

## Xác minh migration trên Supabase thử

Ngày 25/11/2026, áp `20261125006000_shop_closure` và `20261125006100_closed_inbound_handoff` lên `botsalesai-dev` từ commit `975c7c84`. Prisma xác nhận schema đã cập nhật và đối chiếu 61/61 checksum khớp.

Đã kiểm bản sao trước khi áp bằng cách đọc toàn bộ archive và xác minh SHA-256. Bản sao lưu tại `D:/BotSalesAI/backup/supabase-before-shop-closure-975c7c84-20261125T154907687Z/database.dump` với SHA-256 `37de664ed60d695b8e0f43d3ba7c9510a56228417b082378f87bbde9068aeac3`. Biên nhận ở `migration-verification.json` cạnh bản sao.

Hai shop mẫu vẫn hoạt động và năm hội thoại cũ có giá trị mặc định đúng. Dấu kiểm của dữ liệu cũ khớp trước và sau cập nhật. Backend dùng role runtime đọc được hai cột mới qua TLS. Lượt này xác minh database, còn luồng giao diện Cloud chưa chạy.
