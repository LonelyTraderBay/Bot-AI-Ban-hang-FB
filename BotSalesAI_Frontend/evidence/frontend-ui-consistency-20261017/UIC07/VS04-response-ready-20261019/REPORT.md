# FE022.VS04 — Đồng bộ phản hồi danh sách trước kiểm tra giao diện

## Phạm vi và baseline

Owner: UIC07 / FE022.VS04. Baseline `2e8ba77e58bcc90426dbb3d662a5d0e7333e3f33`; hash mã/test/cấu hình và thời điểm trước sửa được giữ trong [baseline.json](baseline.json). Thay đổi thuộc test và bằng chứng; API, ứng dụng, shared UI, token, layout và tracker FE/toàn sản phẩm giữ nguyên.

[Job PR lỗi](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39147321646/job/117735493217) có 177/178 test đạt. Ca VS04 lỗi ở kiểm liên kết `Đề xuất từ phản hồi` với timeout DOM mặc định 5.000ms. [Job push đối chiếu](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/39147319016/job/117735460239) đạt 178/178. Log/trace đầy đủ của lượt lỗi được bảo tồn ngoài repository; artifact GitHub ID `12145352990`, SHA-256 trong baseline.

Trace cho thấy POST review HTTP 200 tạo `knowledge-10004`; GET danh sách knowledge HTTP 200 trả đúng ID, title và draft revision. URL đã chuyển sang `/knowledge`, trong khi snapshot DOM tại lỗi còn nội dung trang review. Test bắt đầu kiểm DOM ngay sau click, trước khi chờ GET danh sách; đây là thiếu đồng bộ giữa phản hồi API và render trong test. Không có bằng chứng lỗi tạo bản nháp hoặc sai dữ liệu API trong trace này.

## Sửa và kiểm hồi quy

- Chờ hộp thoại duyệt đóng; đăng ký chờ GET danh sách trước thao tác điều hướng.
- Kiểm HTTP 200, draft ID/title trong payload, URL, heading, liên kết và href đã render; giữ kiểm nội dung, draft revision và bot evaluation.
- Đăng ký chờ GET chi tiết trước click liên kết để không bỏ lỡ phản hồi nhanh.
- Giữ fixture làm chậm đúng GET collection 6.000ms để kiểm đường đồng bộ; không tăng timeout DOM, retry hay bỏ assertion.

[Tái hiện trước sửa](repro-before.log) exit 1 tại cùng assertion 5.000ms; [repro-source.json](repro-source.json) giữ hash của bản test có latency nhưng chưa có điểm đồng bộ. Test trước/sau dùng cùng fixture tổng hợp.

## Kết quả local trên source cuối

Windows, Node 24.19.0, npm 11.17.0; Chrome 155.0.8059.80 và Firefox 155.0 theo [toolchain.log](toolchain.log). Hash test cuối: `bf10c16e7c6c321c4253095e908e053b2b516d55795c56230c3f91daadc84be4`.

| Kiểm tra | Kết quả / bằng chứng |
|---|---|
| Tái hiện trước điểm đồng bộ, GET chậm 6.000ms | Exit 1 tại cùng assertion; giữ log âm làm baseline |
| VS04 lặp trên hai browser | [6/6 đạt, Chrome 3/3 và Firefox 3/3](targeted.log), exit 0 |
| VS01–VS04 và S05 trên hai browser | [10/10 đạt](flows.log), exit 0 |
| Full `npm run verify` | [Exit 0](verify.log), gồm generator/source/boundary/lint/type/domain, 252/252 Vitest, build, layout, visual-token, composition và evidence |
| S17 unit trong verify | 11/11; manifest preverify 45 record, 40 coverage row, 286 fingerprint, COMPLETE |
| Owner validator sau finalize | [46 record, 41 coverage row, 286 fingerprint, COMPLETE](owner-validator.log), exit 0 |

Các log dương gắn hash test cuối ngay trước lệnh chạy; mỗi log có file `.exit`. Ba báo cáo tự sinh `boundaries.json`, `domain-tests.json`, `source-check.json` chỉ đổi timestamp, đã được lưu và đối chiếu hash ngoài repository trước khi phục hồi đúng byte tracked; không thêm churn báo cáo lịch sử vào commit sửa test.

[Owner finalizer](refresh-s17.mjs) chỉ cập nhật fingerprint của file test này khi log exit 0 chứa đúng hash source; từ chối fingerprint stale ngoài phạm vi. Hosted CI của commit chứa bản sửa phải được kiểm riêng sau push, không lấy các lượt baseline làm PASS của bản sửa. Record này lưu kết quả local trước push; receipt GitHub cuối được đối soát theo HEAD và PR head khi bàn giao.

Không thay đổi giao diện sản phẩm, không ghi acceptance của người dùng và không suy kết quả mock thành bằng chứng Backend/production.
