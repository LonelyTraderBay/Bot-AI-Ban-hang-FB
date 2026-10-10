# Bàn giao sửa race bộ lọc marketing

Revision trước sửa: ca5d9d8a2bdfcf0464d669ed333786e4c90d810f, đã push origin/main. Run GitHub 38014328694, job Firefox 114101155108 ghi timeout tại FE021 marketing filters preserve API-side aggregates: request ngày 18–24/09/2026, bucket week không xuất hiện. Khi lập báo cáo, các job vẫn chạy phần suite còn lại; không dùng revision đó làm hosted PASS.

## Nguyên nhân và thay đổi

MarketingPage dùng effect của marketingPeriod để chuẩn hóa URL và ghi đè draft. Query mặc định và query canonical explicit có cache key khác nhau; response đến sau thao tác nhập có thể đặt lại ngày và kiểu gộp. Probe giữ response thật rồi thả sau khi nhập đã tái hiện lỗi trên Chromium và Firefox.

URL effect nay sở hữu đồng bộ draft khi điều hướng. API chỉ khởi tạo URL mặc định khi bộ lọc còn implicit và chưa nhập; marker phân biệt URL do bootstrap tạo với điều hướng của người dùng. Ba trường đánh dấu tương tác, Apply hợp lệ reset marker. URL sync chạy trước bootstrap để Back về kỳ implicit bỏ chỉnh sửa cũ và khởi tạo đúng mặc định. Giữ contract API, validation, geometry, tokens và accessible names.

Hai regression mới giữ/thả response bằng promise có điều khiển cho query default và canonical; mỗi ca kiểm viewport 1280/320, giá trị draft, GET/200/payload tổng hợp, Apply, Back khi đang chỉnh dở và Forward. Không thêm sleep, retry, dependency hay nới timeout/assertion.

## Kiểm tra local trên nguồn cuối

| Kiểm tra | Kết quả |
|---|---|
| Controlled reproduction trước sửa | Cả hai browser bị ghi đè draft; exit 1 |
| Regression trước sửa | 4/4 FAIL đúng assertion giá trị ngày |
| Bản sửa đầu, kiểm Back khi chỉnh dở | 2 FAIL default / 2 PASS canonical; giữ trace |
| Regression cuối: filters, pending, URL sai, empty | 10/10 PASS, hai browser |
| Biểu đồ: keyboard/data alternative và label geometry | 4/4 PASS, hai browser |
| Composition / layout / evidence validator | 41/41, 86/86, 11/11 PASS |
| npm run verify trên nguồn ổn định | PASS, exit 0 |
| Domain/network / unit | 117/117, 238/238 PASS |
| S17 | 275 fingerprint hiện hành và 3 log khớp |
| Discovery | 350 ca/project, 69 file/project; 700 ca tổng |

Raw log/trace của các lượt lỗi và bản sửa đầu được giữ riêng. Harness attempt 01 lỗi locator trước khi đo; ba repeat không điều khiển timing PASS chưa loại trừ race. Các capture này là lịch sử, không đổi nhãn thành PASS. Hash log nguồn cuối và reproduction nằm trong local-validation.json; JSON attachment trong regression-complete-results ghi quan sát từng browser, loại response và viewport.

## Commit và GitHub

Commit 28: bdb331ff364c3e9c9fa51c3fcd21561703ae757f, P1 sửa MarketingPage và hai regression. Commit 29: P2 baseline/reproduction, trace trước/sau, log gate, manifest S17 và báo cáo này. SHA commit chứa báo cáo lấy từ Git history.

PENDING_AT_COMMIT: kết quả hosted phải lấy từ run thật trên SHA sau push. Workflow chạy audit dependency, verify, 350 E2E mỗi browser, built-demo gate và upload artifact mỗi browser. Không ghi hosted PASS từ kết quả local.

Phạm vi Frontend với MSW/dữ liệu tổng hợp. Không tái chứng nhận canonical FE receipts, nghiệm thu owner, screen-reader speech, Backend, staging hoặc production. Báo cáo các lần bàn giao trước được giữ nguyên.
