# Bàn giao FE002 — toolchain frontend mock

Đây là snapshot handoff sau FE002 ngày 04/10/2026; tiến độ 10/140 và hướng dẫn FE003 bên dưới chỉ mô tả thời điểm đó. Trạng thái hiện hành được xem tại `botsales-kit/execution/SESSION_HANDOFF.md` và `docs/FRONTEND_PLAN_DOCUMENT_AUDIT_2026-10-04.md`.

## Đã hoàn tất

FE002.S01–S05 có evidence hiện hành tại `execution/frontend-evidence/FE002/`. Đã pin Node `24.19.0` trong `.node-version` và npm `11.17.0` bằng `packageManager` trong root `package.json`. Phiên bản trực tiếp trong hai manifest khớp package-lock; React/React DOM đều chỉ có `19.1.1` sau cài đặt.

`npm install`, setup và doctor đều exit 0. Setup sinh 11 đầu ra contract/token và dùng MSW CLI để tạo worker chính thức; doctor có 9/9 kiểm tra PASS. File `.env.local` đã có trước đó, được giữ nguyên theo hash.

Cài đặt lạnh `npm ci` trong thư mục tạm riêng exit 0, 426 package được thêm/428 kiểm tra. Lock hash repo và thư mục thử trùng nhau. Cả `npm install` và `npm ci` báo 9 lỗ hổng mức high; npm cũng cảnh báo lifecycle scripts của esbuild/MSW chưa được duyệt và ESLint 9.34.0 đã hết hỗ trợ. Không chạy `npm audit fix`, không sửa lockfile và không cấp quyền script; cần triage trong FE024 bằng advisory cụ thể trước khi quyết định cập nhật dependency. Kết quả cài đặt không phải build hoặc audit sạch.

## Ghi chú còn theo dõi

npm 11 báo lifecycle script của `esbuild` và `msw` đang chờ phê duyệt; chưa cấp phê duyệt thực thi. Các chức năng cần thiết đã được kiểm trực tiếp: esbuild import/binary chạy, MSW browser import chạy và setup gọi MSW CLI để cập nhật worker. `npm ci` cũng báo ESLint 9.34.0 không còn được hỗ trợ upstream; không nâng major trong task toolchain này.

## Tiếp tục tại snapshot FE002

Ledger frontend hiện 10/140 checkpoint, 26 task stale cần tái xác minh, `blocked: []`; bắt đầu FE003 theo task card để xác minh command map, runner Vitest/Playwright và báo cáo kiểm chứng. Giữ FE001/FE002 source snapshots cố định khi làm FE003. README hiện có số liệu coverage lịch sử, sẽ xử lý trong task FE026/FE028 theo write scope.
