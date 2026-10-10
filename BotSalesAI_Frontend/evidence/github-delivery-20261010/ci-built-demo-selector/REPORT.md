# Selector built-demo trong GitHub matrix

Workflow root được sửa để gọi `--project=${{ matrix.browser }}-built-demo`, khớp tên project của `playwright.built-demo.config.ts`. Existing gate `ui-shared-api-contract.test.mjs` đọc suffix selector và tên project từ config, kiểm từng engine phải có project tương ứng. Giữ đầy đủ source gates, 406 E2E mỗi engine, built-demo và artifact upload; không đổi timeout/retry/assertion hoặc app.

Lệnh CLI cũ `--project=chromium --list` tái hiện **exit 1**, `Project(s) "chromium" not found`; raw log/exit giữ trong `selector-before.*`. Local 6/6 chạy cả hai project trước đây không chứng minh selector của từng job. Các run hosted trước chưa qua E2E nên chưa thực thi bước này; không ghi chúng là bằng chứng built-demo PASS.

Đúng lệnh từng job sau sửa:

- `--project=chromium-built-demo`: **3/3 PASS**, exit 0.
- `--project=firefox-built-demo`: **3/3 PASS**, exit 0.
- Cả hai kiểm 61 manifest routes ở 390px/1440px, 0 issue/page error; cùng artifact SHA-256 `09405e36f634fb68bf0baceb8ea501d73d13baa5e917668e9fe1c576789c25dc`.
- Stage fixtures mới: composition **41**, layout **86**, evidence validator **11**. Full `npm run verify` **exit 0**, S17 khớp **275** source fingerprint hiện hành; log/exit và `local-validation.json` là kết quả kiểm thực.

Hosted trên SHA mới là **PENDING_AT_COMMIT**, xác nhận riêng sau push bằng run thật. Run `38029965630` của revision trước chưa hoàn tất tại thời điểm sửa selector; không sử dụng làm hosted PASS. Validation này thuộc Frontend/mock và wiring workflow, không chứng nhận Backend, production, screen reader hay owner acceptance. Các evidence đã commit ở snapshot trước giữ nguyên provenance của snapshot đó.
