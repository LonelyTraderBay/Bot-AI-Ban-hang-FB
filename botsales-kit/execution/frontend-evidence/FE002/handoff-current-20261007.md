# Bàn giao hiện hành FE002 — 07/10/2026

FE002 đã hoàn tất và checkpoint bằng chứng hiện hành. Trạng thái cuối sau `node scripts/progress.mjs report`: 10/140 checkpoint (6,67%), FE001–FE002 DONE, `blocked=[]`; bước tiếp theo là FE003.S01. Dùng tracker frontend, không dùng ledger full-product.

## Bằng chứng thực tế

- S01: Node `v24.19.0`, npm `11.17.0`, manifest/lock và peer ranges được đối chiếu; không có lý do thực tế để đổi phiên bản.
- S02: setup/doctor và quyền ghi được kiểm tra; `.env.local` không bị in nội dung; worker MSW tồn tại.
- S03: `npm.cmd --script-shell=powershell.exe install` exit 0; `npm ls --depth=0` exit 0; manifest, lock và các target liên quan không đổi.
- S04: `npm.cmd --script-shell=powershell.exe run setup` và `run doctor` exit 0; generator báo 11 outputs, 283 schemas, 210 operations, 54 routes; doctor 9/9 PASS.
- S05: `npm.cmd --script-shell=cmd.exe ci` chạy trong thư mục tạm cô lập mới exit 0; `npm ls --depth=0` exit 0; 412 package paths; manifest/config trong thư mục thử và workspace gốc giữ nguyên hash.

## Lỗi môi trường đã tái hiện

Lượt S05 đầu tiên thất bại vì `cmd.exe` không tìm thấy Node khi kế thừa PATH của phiên. Log ban đầu và thư mục tạm lỗi được giữ. Phép đối chứng ghi tại `S05-path-resolution-diagnosis-current-20261007.log`: PATH kế thừa 14.378 ký tự khiến `where.exe node.exe` exit 1; PATH giới hạn 97 ký tự resolve đúng `C:\Program Files\nodejs\node.exe`. Lượt cài lại dùng PATH giới hạn cho child process, không sửa PATH hệ thống.

## Theo dõi

- Npm đã cảnh báo lifecycle scripts của esbuild/MSW chưa được allow. Không cấp quyền trong task này; tiếp tục đánh giá theo kế hoạch an toàn dependency.
- `npm ci` chỉ chứng minh cài dependency tái lập trong mock frontend; không phải build, UI acceptance hay tích hợp backend.
- Bằng chứng chi tiết: `S01-toolchain-and-peers-current-20261007.json`, `S02-setup-doctor-install-constraints-current-20261007.json`, `S03-npm-install-verified-current-20261007.json`, `S04-setup-doctor-verified-current-20261007.json`, `S05-clean-install-retry-verified-current-20261007.json`.
