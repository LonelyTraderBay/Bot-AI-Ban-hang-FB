# Hồi quy CI của PR 27

## Baseline trước khi sửa

- Commit `329338b5`, lần chạy frontend `44705158222`. Source verify, build và built demo đạt. Có 15/18 nhóm E2E thất bại. [Lần chạy GitHub Actions](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44705158222)
- Các lỗi có bằng chứng gồm liên kết thiết lập phí giao ở FE009, thông báo điều chỉnh vượt lượng khả dụng ở FE011, phân loại trạng thái rỗng của chi tiết đơn R19 và phép đếm cố định 61 màn ở UI61. Một lượt kiểm stale của manager quan sát tiêu đề R04 khi chờ R05.
- Nguồn chuẩn do route manifest và OpenAPI sở hữu. R19 mở bằng `getOrder`, còn lookup combo nằm trong form sửa và chỉ gọi với quyền catalog. R62 là đích cấu hình giao hàng cho người có quyền. Điều chỉnh thiếu tồn phải giữ form, báo lỗi hợp đồng và giữ số tồn.
- Phạm vi sửa gồm hợp đồng route, đầu ra sinh, test hồi quy và bằng chứng frontend. Cả 67 màn hình và các bất biến kiểm thử vẫn thuộc phạm vi CI.

## Sửa và kiểm chứng cục bộ

- FE009 kiểm liên kết cấu hình giao hàng ở vùng nội dung. FE011 kiểm HTTP 409 với mã `INSUFFICIENT_STOCK` và giữ các assertion dữ liệu, bản nháp, thông báo và số lần gọi.
- R19 khai báo lookup ưu đãi trong hành vi mở form sửa. Kiểm thử mới đối chiếu request từ trình duyệt. UI61 so danh sách ID đã mở với manifest.
- R65 cho thấy lỗi rỗng sau khi các lượt chạy đi qua R19. Chuyển chế độ danh sách rỗng về một điểm xử lý phía MSW, sau khi các bộ đọc trả kết quả và trước phân trang. Vitest đã kiểm chế độ một lần, lặp và từ chối quyền. [Kết quả 5 ca Vitest](p1-regression-results.json)
- Phạm vi là frontend và API MSW. Trạng thái S17 hiện hành là `IN_PROGRESS`.
- `npm run verify` đạt cùng mã sửa với 277 ca Vitest và 122 kiểm tra mô phỏng/nghiệp vụ HTTP. Kiểm hợp đồng JSON/YAML và 544 mục của kit đạt.
- Chromium đã chạy qua kiểm danh sách rỗng 51/51 và ma trận danh sách rỗng của owner 51/51. Lượt hồi quy theo vai trò manager đã xác nhận lại R05 khi dữ liệu cũ.

## Ma trận route và feature FE022

- Lần chạy sau sửa có FE022.S05 báo sai ánh xạ B05 ở cả hai engine. Ma trận giữ dữ liệu trước khi B05 dùng thêm R64. Đối chiếu toàn bộ tìm thấy 12 ánh xạ đã thay đổi trong 9 dòng route có bằng chứng. [Lần chạy CI](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44850997768)
- Sinh lại ma trận từ feature catalog. Kiểm kết quả sinh lại ổn định và 61 bản ghi giữ nguyên bằng chứng tương tác đã lưu. Sáu route mới vẫn hiện rõ `NOT_RUN` trong ledger FE022 đến khi liên kết bằng chứng theo route. Bộ kiểm browser của CI tiếp tục chạy smoke cho toàn bộ route và các ca nghiệp vụ mới.
- FE022.S05 so đủ 67 ID, kiểm trạng thái theo từng route và giữ ràng buộc có bằng chứng tương tác cho đủ 64 feature ID. Chỉ sáu route mới được ghi thiếu bằng chứng liên kết trong ma trận.
- Lượt hồi quy local trên Chromium và Firefox đạt 14/14. Phạm vi gồm smoke đủ 67 màn trên mỗi engine, FE022.S05, lookup R19 và bốn luồng nghiệp vụ R64–R67. Chạy lại `npm run verify` và bộ kiểm evidence S17 đạt.
