# Kiểm tra pending-save bằng tín hiệu, không phụ thuộc khoảng thời gian

Owner UIC07, chỉ test và evidence. [Baseline trước sửa](baseline.json): `c1be0fbf28830bfc3588a7506988da28f69e95a1`; source ứng dụng, draft model, mock service và config được giữ hash trước sửa, không thay đổi trong bản sửa này.

## Lỗi và nguyên nhân

[Job Firefox push](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39156086362/job/117760923137) đạt 196/197 E2E, lỗi ca giữ tên cửa hàng gõ trong lúc lưu. [Trích log](ci-failure-excerpt.log) giữ lỗi Save disabled ở timeout 5.000ms và exit 1. Artifact ID `12148050926`, SHA-256 và hash raw log trong baseline; trace gốc được lưu ngoài repository.

Trace đo request event hoàn tất 882621.998ms, response event 882622.661ms: cách nhau chỉ 0.663ms. Lệnh fill bắt đầu 882622.123ms và kết thúc 882686.622ms. Test cấu hình mock delay 800ms nhưng lại chờ sự kiện request trước khi fill; MSW phát sự kiện quan sát được sát lúc response về, nên test không bảo đảm edit xảy ra trước khi hoàn tất save. Source `useVersionedDraft` đã đọc draft mới nhất qua ref; không sửa production logic chỉ từ timeline mơ hồ của fixture.

Rà cùng file tìm thấy năm ca dựa vào cửa sổ 700/800/1200ms: nội bộ note, cấu hình shop, category, đổi mode note và order editor. Tất cả cùng invariant cần kiểm là giữ thao tác trong lúc client mutation còn pending.

## Sửa

Một helper cục bộ giữ đúng fetch mutation đã chọn bằng Promise; báo entered trước khi gửi qua MSW, chạy các thao tác/kiểm tra pending, rồi nhả trong `finally`. Fetch được phục hồi sau một request, các API khác vẫn hoạt động bình thường. Response HTTP thật và payload từ request vẫn được kiểm sau khi nhả. Không retry, tăng timeout DOM hay sửa API/app.

Giữ nguyên kiểm payload chỉ chứa snapshot đã submit, giá trị gõ sau, Save/close busy, draft guard, unknown 503, khóa gửi lại và recovery registry. Thêm kiểm giá trị ngay trong pha bị giữ; thay chờ theo đồng hồ bằng thứ tự nguyên nhân rõ ràng.

## Kết quả local trên source cuối

Hash test: `cbf1e0bef2c2d369542d7eb26d3b0ac1f38f3d89be4de8a80ba897025e82f75a`. Windows, Node 24.19.0, npm 11.17.0.

| Kiểm tra | Kết quả / bằng chứng |
|---|---|
| Năm ca pending, ba lần mỗi browser | [30/30 đạt trên Chromium/Firefox](targeted.log), exit 0 |
| Toàn file frontend-corrections | [42/42 đạt](suite.log), exit 0 |
| Full `npm run verify` | [Exit 0](verify.log), gồm generator/source/boundary/lint/type/domain, 252/252 Vitest, build, layout, visual-token, composition và evidence |
| S17 unit trong verify | 11/11; manifest preverify 51 record, 46 coverage row, 286 fingerprint, COMPLETE |
| Owner validator sau finalize | [52 record, 47 coverage row, 286 fingerprint, COMPLETE](owner-validator.log), exit 0 |

Mỗi log dương chứa hash test trước lệnh và có `.exit`. Ba báo cáo JSON tự sinh chỉ đổi `checkedAt`; semantic diff được kiểm trước khi lưu bản mới/hash ngoài repo và phục hồi byte tracked.

[Owner finalizer](refresh-s17.mjs) chỉ refresh fingerprint `tests/frontend-corrections.spec.ts` sau log exit 0 chứa đúng hash source; từ chối mọi fingerprint stale khác. CI trên commit mới được đối soát riêng sau push; record này lưu kiểm chứng local trước push. Đây là bằng chứng Frontend/MSW, không là nghiệm thu Backend/production hoặc của người dùng.
