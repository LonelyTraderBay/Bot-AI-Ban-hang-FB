# Baseline selector built-demo

- Revision đã push: `5e9aba2f1072160ff7fed3b0e02754953f47d895`; run `38029965630` đang verify/E2E. Chưa ghi run này là PASS.
- Root workflow gọi `--project=${{ matrix.browser }}` cho config built-demo. Config khai báo `chromium-built-demo` và `firefox-built-demo`; gọi CLI thực với `--project=chromium --list` đã exit 1 `Project(s) "chromium" not found`.
- Owner: `.github/workflows/frontend.yml`; consumer: matrix Chromium/Firefox và gate wiring `tests/ui-shared-api-contract.test.mjs`. Local 6/6 built-demo trước đó chạy cả hai project nên không chứng minh selector từng job. Các run hosted trước chưa tới bước built-demo vì E2E FAIL; phải sửa lỗi này để bước bắt buộc thật sự chạy được.
- Scope: nối đúng suffix project cho bước built-demo; kiểm quan hệ selector workflow với tên config ở existing gate test; chạy đúng từng CLI project (3 ca mỗi engine). Giữ đầy đủ workflow steps, browser matrix, source/runtime gates, assertions, timeout và retry.
- Không đổi app, API, mock, kiểu dữ liệu, UI hoặc Backend/full-product tracker. Source/log hashes được ghi sau source cuối; hosted trên SHA sau push phải xác nhận bằng run thực.
