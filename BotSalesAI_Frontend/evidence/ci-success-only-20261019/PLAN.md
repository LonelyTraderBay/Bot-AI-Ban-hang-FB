# CI chỉ chấp nhận success — phạm vi và bằng chứng

- Baseline: `main` tại `a8257726778fe9b955768119b1df791aa400d7fc`, checkout sạch trước khi tạo nhánh công việc.
- Owner: tooling CI ở `.github/`; frontend S17 theo dõi fingerprint của workflow frontend.
- Hợp đồng: mỗi producer job phải có `status=completed`, `conclusion=success` trong đúng workflow run và attempt. Kiểm đủ từng matrix child, không chỉ kết quả gộp `needs`.
- Hai consumer bắt buộc: `gate frontend (success only)` và `gate repository hygiene (success only)`, chạy với `always()` và chỉ quyền đọc contents/actions.
- Lỗi API, metadata thiếu/trùng/sai run/attempt hoặc mọi kết luận khác success làm gate thất bại. Đổi inventory hoặc rerun một phần thiếu producer cần chạy lại toàn workflow.
- Không thay source ứng dụng, contract, SDK, UI tracker hay acceptance. API proof local dùng metadata của hai workflow đã hoàn tất trên baseline; không nhận đó là CI của bản sửa mới.
- `refresh-s17.mjs` chỉ cho phép thay fingerprint của hai workflow và hai file gate; yêu cầu log thực có exit 0 và hash đúng source. Giữ nguyên checks/coverage lịch sử, thêm đúng record của phạm vi CI.
- Hosted CI, enforcement branch protection và kiểm chứng merge được ghi riêng sau khi push; không suy từ unit/local verify.

## Lệnh kiểm chứng local

1. `node --test --test-reporter=tap .github/scripts/check-repository-hygiene.test.mjs .github/scripts/require-success.test.mjs`
2. CLI gate với metadata GitHub thực của baseline, hai profile frontend/repository-hygiene.
3. `node .../refresh-s17.mjs --preverify`, sau khi hai log trên đã có exit 0 và hash source.
4. `npm run verify` trong frontend, ghi log và exit code thực.
5. `node .../refresh-s17.mjs --finalize`, rồi validator S17 hiện hữu.
