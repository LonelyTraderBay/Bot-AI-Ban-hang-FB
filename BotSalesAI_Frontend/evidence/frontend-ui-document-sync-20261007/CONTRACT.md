# Đồng bộ tài liệu UI và đối chiếu thực tế — 07/10/2026

Người dùng yêu cầu thống nhất tài liệu và kiểm code thực tế, không suy đoán. Baseline là audit tại `../frontend-ui-document-audit-20261007/`; working tree đang có các sửa spacing ở bốn module và checker/tests, phải giữ nguyên.

Owner: kit generator/navigation cho kế hoạch sinh; standard cho quy định; shared catalog + types/source cho API; UI plan §16.6 cho status; evidence report cho kết quả đo. FE tracker hiệu lực chỉ lấy từ CLI, không tăng ledger từ docs hoặc suite chung. Full-product plan/ledger và Universal originals giữ nguyên.

Thực hiện: sửa generator/source docs; đối chiếu export/type/consumer/route bằng TypeScript và canonical manifest; chạy local verify/build và full Chromium/Firefox E2E; sinh lại route/state matrix theo log thật; capture inventory và source hashes tại vị trí kit hiện hành. Lưu log/exit code và source snapshot, bảo toàn evidence lịch sử khi browser tests viết lại output.

Đây là sửa docs/tooling; không đổi React runtime/layout. Baseline UI before/after N/A cho lượt này; các baseline sửa spacing vẫn thuộc lượt trước. Mọi bước chưa chạy, stale hoặc fail phải được ghi rõ. Không suy UI percentage từ số route/API/fixture; không xác nhận Backend, hosted CI, screen-reader speech, owner acceptance hoặc production.
