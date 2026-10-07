# Review quyết định trước sửa code UI — 06/10/2026

Yêu cầu hiện hành là sửa quy định/quy trình/shared contracts và lập thứ tự triển khai trước khi sửa code UI. Lượt này docs-only; giữ các thay đổi staged/unstaged/untracked đã có. Áp dụng Andrej Karpathy Guidelines: hiểu trước, giải pháp nhỏ nhất, sửa đúng phạm vi, acceptance có thể kiểm chứng.

## Kết quả

- Standard §0.5 cụ thể hóa SPC hiện có: owner của từng quan hệ UI, một owner trên cùng ranh giới, điều kiện shared/local, props/slots và cách mở rộng API. Không thêm rule IDs hoặc thang spacing mới.
- Shared catalog §6 phân loại TARGET đủ 21 components +6 compositions, phân biệt phần giữ, phần phải migrate/verify và lifecycle chưa quyết định. Chưa thay implementation hoặc tạo component mới.
- Plan §16.13 chốt 7 đợt nhận việc theo S03–S20 và waves hiện có, giữ dependency/acceptance, xác định phạm vi từng file và giới hạn tuyên bố hoàn tất. Không tạo ledger hoặc workflow thứ hai.

## Kiểm tra của lượt này

| Kiểm tra | Kết quả và phạm vi |
|---|---|
| Current source export declarations | 21 exported component functions +6 compositions; read-only count, không là render coverage |
| Rule definitions | 75 definitions,75 unique IDs trong standard |
| Local links | 735 links trong ba tài liệu sửa,0 missing; kiểm file target,3 anchors mới kiểm riêng |
| Whitespace | Node check không thấy trailing whitespace; scoped git diff --check không báo whitespace error. Git có cảnh báo chuyển LF→CRLF theo cấu hình hiện hành |
| Before/after hashes | 216 files dưới source/tests/scripts/packages/contracts/design và các original/ledger/package/active workflow inputs được so trước/sau; chỉ shared/ui/README.md đổi. Không missing path trong tập này. Đây là bảo toàn phạm vi chỉnh sửa, không phải toàn repo runtime verification |
| Product tests/build/browser | NOT_RUN_THIS_DOCS_TURN; không suy PASS từ kết quả lịch sử |

Lần kiểm liên kết đầu exit1 vì regex coi plugin:// như filesystem path. Sửa phép phân loại URI của kiểm tra ad hoc rồi chạy lại exit0; không sửa link plugin hợp lệ hoặc tooling sản phẩm để che lỗi.

## Giới hạn và bước tiếp theo

Không đổi code UI, checker, test, token/contract/generated outputs, CI hoặc FE/full-product ledger trong lượt này. Các artifacts/tests intake đã có được giữ, không coi chúng là source migration hoàn tất hoặc S03 DONE. Inventory356 entries trong report hợp nhất là snapshot trước đó; phải refresh khi nhận triển khai và discovery file mới, không pin số này làm allowlist.

S03 là đợt đầu của triển khai sau specification. Sau đó theo plan §16.13/§16.6 và workflow canonical; mandatory FAIL/UNKNOWN/NOT_RUN giữ acceptance mở. Enforcement chưa được chứng minh100%, chưa có owner acceptance/hosted CI/screen-reader hoặc Enterprise certification mới.
