# FE020.F05 — Chờ danh sách phê duyệt ổn định trước thao tác

Owner UIC07 / FE020.F05; phạm vi test và bằng chứng. [Baseline trước sửa](baseline.json) là `aa63992b956b280971a09bb47533665624833bee`, giữ hash test, module operations và cấu hình Playwright. Không sửa ứng dụng, API, shared UI, layout, dependency hoặc tracker.

## Lỗi quan sát và nguyên nhân

[Job Firefox PR](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39152869853/job/117751755796) đạt 196/197 E2E, lỗi FE020.F05 vì không thấy hộp thoại sau click; bước built demo chưa chạy. [Trích log lỗi](ci-failure-excerpt.log) giữ nguyên lỗi timeout 5.000ms, số test và exit 1. Raw log/trace đầy đủ và hai JPEG nguyên bản được giữ ngoài repository; hash artifact, log và frame trong baseline.

Trace: click bắt đầu ở 972108.598ms, kết thúc 972689.2ms; GET `/approvals?limit=20` HTTP 200 về ở 972518.961ms, ngay trong khoảng thao tác. Điểm click là (371,359), nút được đo tại y=337.9–381.9 trước thao tác. Frame sau cho thấy bảng phê duyệt đã mở rộng và nút chuyển vị trí. Test trước đây chỉ chờ heading bên dưới bảng đang loading; điều đó chưa bảo đảm vị trí nút ổn định. Đây là căn cứ sửa điểm đồng bộ trong test, không phải bằng chứng API tạo ủy quyền sai.

## Sửa và kiểm chứng

Đăng ký chờ đúng GET danh sách phê duyệt `limit=20` trước navigation; kiểm HTTP 200, payload không rỗng, bảng hiển thị và đủ số hàng từ payload rồi mới mở hộp thoại. Giữ nguyên mọi kiểm tra hạn mức, supplier/warehouse/offer/budget, chỉ một POST và trạng thái `paused`; không tăng timeout hoặc retry.

## Kết quả local trên source cuối

Hash test cuối: `4c92beb9a4deee84baee5b11a60bf6179b942608282f70a1b38d4840851beab3`. Windows, Node 24.19.0, npm 11.17.0.

| Kiểm tra | Kết quả / bằng chứng |
|---|---|
| F05 lặp trên Chromium/Firefox | [6/6 đạt, mỗi browser 3/3](targeted.log), exit 0 |
| Toàn bộ file FE020/FE027 | [14/14 đạt](suite.log), exit 0 |
| Full `npm run verify` | [Exit 0](verify.log), gồm generator/source/boundary/lint/type/domain, 252/252 Vitest, build, layout, visual-token, composition và evidence |
| S17 unit trong verify | 11/11; manifest preverify 48 record, 43 coverage row, 286 fingerprint, COMPLETE |
| Owner validator sau finalize | [49 record, 44 coverage row, 286 fingerprint, COMPLETE](owner-validator.log), exit 0 |

Log dương gắn hash test trước lệnh chạy, kèm `.exit`. Ba JSON báo cáo tự sinh chỉ đổi `checkedAt`; đã kiểm semantic diff, lưu bản mới và hash ngoài repository rồi phục hồi byte tracked. Không thêm churn timestamp vào bản sửa.

[Owner finalizer](refresh-s17.mjs) chỉ refresh fingerprint của `tests/fe020.spec.ts` sau log exit 0 gắn đúng hash source; từ chối thay đổi fingerprint của các file khác, gồm bản sửa VS04 trước đó. CI của commit sửa được kiểm riêng sau push; record này lưu kiểm chứng local trước push, không lấy lần chạy baseline làm PASS của bản mới.

Phạm vi là Frontend/MSW tổng hợp; không ghi nghiệm thu của người dùng hoặc tuyên bố Backend/production đã được kiểm.
