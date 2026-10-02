# Bàn giao FE001 — intake frontend mock

## Phạm vi đã xác nhận

Người dùng yêu cầu hoàn thiện UI React/TypeScript bằng API mock tổng hợp; không chờ backend thật. Nguồn task là `execution/frontend-plan.json`, nguồn contract là OpenAPI và route manifest. Tracker 84 task của toàn sản phẩm cùng `execution/plan.json`, `execution/progress.json` và `tasks/T*.md` vẫn chỉ đọc.

FE017 dùng quyền `knowledge.publish` cộng lifecycle check cho nghiệm thu mock theo quyết định người dùng; không thêm `allowedActions` vào OpenAPI, DTO hoặc generated source.

## Trạng thái đầu vào

FE001 có 5 checkpoint intake. Working tree đã có thay đổi frontend/docs/evidence từ trước và được giữ nguyên. Ngưỡng test gần nhất được ghi tại `evidence/REPORT.md` và các log FE027: verify PASS, E2E Chromium 123/123, feature interaction matrix 65/65; build có advisory chunk 730.13 kB raw. Reflow audit 320 CSS px đạt 54/54 route. Browser zoom thật, screen-reader đầy đủ, owner UAT và GitHub CI chưa được thực hiện.

## Tiếp tục

Sau khi FE001.S01–S05 được xác minh lại bằng hash/log hiện hành, bắt đầu FE002 theo task card. FE002 kiểm tính tái lập Node/npm, lockfile, setup/doctor; không đổi stack khi chưa có lỗi tương thích thực. Dùng `npm.cmd` trên Windows nếu PowerShell chặn `npm.ps1`; clean install phải chạy trong temp workspace để giữ working tree.

Chỉ tiến hành từng task FE001–FE028 theo dependency order và bằng chứng. Dữ liệu mock phải được ghi nhãn là demo; không dùng thành công mock làm tuyên bố API thật hoặc release readiness. Không cập nhật tracker toàn sản phẩm.
