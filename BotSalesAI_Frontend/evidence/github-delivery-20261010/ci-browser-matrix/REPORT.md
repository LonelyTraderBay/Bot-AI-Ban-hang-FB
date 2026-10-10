# Bàn giao sửa CI và hồi quy browser — 10/10/2026

Đây là bổ sung sau 20 commit đã push lên main tại 7fd39700da0f2af52ad137318f11c02fa85c05eb. Các snapshot và kết quả lần đầu được giữ nguyên; báo cáo này mô tả phần sửa sau khi đọc bằng chứng CI thật.

## Nguyên nhân và thay đổi

- Run GitHub [38007318262](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/38007318262) có verify SUCCESS trên Ubuntu nhưng job bị cancelled ở giới hạn 75 phút khi full E2E còn chạy; built-demo gate chưa được chạy.
- Hai engine trước chạy tuần tự trong một job. Matrix mới tách Chromium/Firefox, fail-fast=false, mỗi job một worker và timeout hữu hạn 120 phút; E2E, built demo và artifact đều có scope browser/revision.
- Discovery mặc định còn thực thi các fixture node:test trong *.test.mjs. Giới hạn browser discovery vào *.spec.ts giữ nguyên 348 test/69 file mỗi engine; Node gates vẫn nằm trong verify.
- Fixture được đồng bộ với UI/API hiện hành: locale API vẫn được merge trong giao diện tiếng Việt; invalid privacy save disabled; feedback dataset được chọn đúng status; /@fs URL không thừa slash trên Linux; draft trùng vận đơn được tạo dirty thật và xác nhận bỏ thay đổi rõ ràng.
- Finance vertical slice dùng nguồn đăng ký, preview/token, import response 200 theo OpenAPI và vẫn kiểm phân bổ một phần công nợ. Route matrix được sinh bằng generator --source-only, bổ sung SC2-D06; giữ NOT_RUN và không tạo browser claim giả. Nếu matrix có browser claims, S05 vẫn kiểm các file/log/case/coverage đã khai báo.
- MarketingReasonTick dùng Text của Recharts đo/wrap theo category band và token font hiện hành; giữ nhãn đầy đủ, chữ >=14px, bảng dữ liệu và kiểm không chồng/cắt hai chiều. Panel kiểm margin/mép child theo SPC-014, giữ gap 12px và inset responsive; padding nội bộ của Button được đo riêng.

## Kiểm tra local đã thực thi

| Kiểm tra | Kết quả |
|---|---|
| npm run verify trên nguồn ổn định | PASS, exit 0 |
| Domain/network | 117/117 |
| Unit | 238/238 |
| Layout / composition / validator | 86/86, 41/41, 11/11 |
| S17 | 275 fingerprint và 3 log khớp |
| YAML workflow wiring | PASS |
| Browser discovery cuối | Chromium 348, Firefox 348; 69 file/engine |
| Targeted attempt 01 | 18 PASS / 6 FAIL; giữ log/trace |
| Targeted attempt 02 | Shell exit 255; chưa chạy browser, giữ lỗi quoting npx |
| Targeted attempt 03 | 6/6 PASS trên hai engine cho các ca còn lỗi |

Attempt 01 đã xác minh chart tại 320/1280, locale, validation, dataset, Panel và conditional caching trên hai engine. Attempt 03 tái kiểm vận đơn, import/phân bổ công nợ và S05 sau sửa cuối. Lượt verify bị stale do sửa reporter khi đang chạy được giữ riêng; không dùng làm bằng chứng PASS.

Hash của các log bàn giao nằm trong local-validation.json. Hash/đường dẫn từng raw artifact nằm trong hosted-attempt-01/index.json. ZIP artifact 11655735180 có SHA256 52aa3b8b1eb4f669c7d0f4f1e575ad49a006bcfd2f6ef07e2b0efebe61130742; raw trace/error-context được bảo toàn byte, không chỉnh format để làm sạch diff.

## Bằng chứng hosted của revision mới

PENDING_AT_COMMIT: phải lấy kết quả từ run thật trên đúng SHA sau push. Workflow bắt buộc chạy audit, verify, full E2E 348/engine, built-demo gate và upload artifact từng engine. Báo cáo trước push không tự ghi hosted PASS.

Frontend với MSW/dữ liệu tổng hợp. Không tái chứng nhận canonical FE receipts, owner acceptance, screen-reader speech, Backend, staging hoặc production. Main chưa có branch protection tại snapshot đã kiểm; không thay đổi thiết lập đó.

## Commit bổ sung

Commit 21–27 chia theo CI → fixture/cache → forms/draft → finance/contracts → chart/geometry → bằng chứng CI gốc → gate và bàn giao hiện hành. SHA được ghi dưới đây sau khi tạo từng nhóm; commit chứa chính báo cáo này nhận SHA từ Git history.

| Nhóm | SHA | Ghi chú |
|---|---|---|
| 21 | b96eb13f | fix(ci): [P0] Tách browser matrix và giữ đúng discovery Playwright |
| 22 | c50ce302 | test(browser): [P1] Sửa URL module Linux và scope thông báo dataset |
| 23 | 2f0cad84 | test(forms): [P1] Kiểm đúng locale, validation và bảo vệ bản nháp |
| 24 | 2a71a89d | test(finance): [P1] Đồng bộ preview import và mapping scenario canonical |
| 25 | 7c08561b | fix(reports): [P1] Wrap nhãn theo category band và kiểm đúng mép Panel |
| 26 | e357f5ec | chore(evidence): [P2] Lưu trace và nguyên nhân lỗi CI lần đầu |
