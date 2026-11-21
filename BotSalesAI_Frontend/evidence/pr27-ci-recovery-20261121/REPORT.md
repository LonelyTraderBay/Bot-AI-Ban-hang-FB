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

## Kiểm tra race ở R40

- Lượt CI `44852149730` ghi một lỗi lấy inventory của job build trước khi chạy Firefox 6/9. Giữ nguyên quy tắc CI yêu cầu artifact và kết quả của đúng run.
- Trace Chromium 7/9 cho thấy ca R40 của manager đã bấm nút công cụ demo khi route mới còn đang tải. Sau click, disclosure vẫn đóng trong snapshot và hết thời gian đợi. Tám lần chạy riêng trên hai engine đều đạt. Ca hồi quy sẽ đợi dòng thiết bị vừa tạo hiển thị trên R40 trước thao tác đổi vai trò, sau đó kiểm lại dòng này với vai trò manager. [CI Chromium và trace](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44852149730/job/136685759060)
- Sau khi đổi điều kiện chờ, preview đạt 12/12 cho owner và manager trên Chromium và Firefox. Bộ kiểm evidence S17 và kiểm inventory Playwright 620/620 ca trên mỗi engine đạt.

## Inventory Actions khi chờ build

- Firefox 6/9 ở run 44852149730 và Chromium 2/9 ở run 44852858444 dừng trước browser tests do inventory của API không nhất quán. Bộ chờ kiểm lại phản hồi có số job chưa khớp trong thời hạn sẵn có. Snapshot đầy đủ và build completed/success của đúng run/attempt vẫn là điều kiện tải artifact. API lỗi, danh tính sai và job trùng tiếp tục thất bại. [Run đầu](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44852149730) · [Run thứ hai](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44852858444)
- 139/139 ca kiểm workflow và vệ sinh repo đạt. Ca mới xác nhận inventory lệch không thể trả artifact, lần đọc đầy đủ mới tiếp tục, thời hạn hết vẫn thất bại và build lỗi vẫn bị chặn ngay.

## Khởi tạo phiên trong lượt mở toàn bộ màn

- Firefox 3/9 ở run 44853159729 tới đúng URL R62. Trace cho thấy màn còn hiển thị tiến trình tải phiên khi hết thời gian đợi 5 giây. Tách bước chờ HTTP phiên và bước chờ shell trên từng trang mới, giữ các điều kiện render, lỗi router và nhãn dữ liệu mô phỏng. [CI Firefox và trace](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44853159729/job/136689198543)
- Lượt source verify báo ba SHA-256 của policy và script CI đã cũ sau khi đổi bước chờ build. Đã cập nhật các dấu vân tay và chạy lại bộ kiểm evidence.
- Bản sửa đạt 4/4 lượt mở đủ 67 màn, hai lượt mỗi engine trên preview. `npm run verify` đạt cùng nội dung source, gồm đủ 417 SHA-256 của S17.

## Nhận xét review về nghiệp vụ

- Hai nhận xét review còn mở khi CI đã đạt 26/26. Kho nhận đang có phiếu chuyển đang đi không thể lưu trữ. Đối soát tiền phải giữ các khoản thu độc lập và trừ đúng phần giảm phải thu đã ghi từ cùng một phiếu thu đơn. [Review kho đích](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/27#discussion_r4640359329) · [Review đối soát](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/27#discussion_r4640359344)
- Kho có 0 tồn vẫn trả HTTP 409 `WAREHOUSE_OPEN_WORK` khi đang nhận điều chuyển. Bản ghi kho giữ nguyên phiên bản và sau đó nhận từng phần bình thường.
- Hai ca COD xác nhận khoản thu 249.000 VND chỉ được tính một lần, còn khi có thêm phiếu thu công nợ 50.000 VND thì tổng xác minh là 299.000 VND và trạng thái `needs_check` nằm ở hàng chờ mở.
- Vitest P1 đạt 7/7 và Playwright P1 đạt 10/10 trên Chromium, Firefox. `npm run verify` đạt với 279 Vitest, 122 kiểm tra nghiệp vụ/HTTP và bộ kiểm evidence.

## Ổn định lượt axe trên main sau merge

- Trên merge commit b9a54c31, cả hai lượt frontend của run 44856461106 dừng ở giới hạn 300 giây của bài Firefox axe chạy nối tiếp toàn bộ 67 màn. Lượt Firefox preview chạy riêng kiểm đủ 67 màn và trạng thái tải R04, ghi nhận 0 lỗi axe và 0 lỗi trang. [Lượt 1](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44856461106/attempts/1) · [Lượt 2](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44856461106/attempts/2)
- Phạm vi sửa là cách chia lượt kiểm ở frontend. Các route vẫn lấy từ manifest, giữ bộ rule WCAG 2.1 A/AA, kiểm bàn phím và trạng thái tải, cùng kiểm tổng inventory của CI.
- Bốn nhóm R01–R17, R18–R34, R35–R51 và R52–R67 giữ thời hạn riêng và bảo toàn báo cáo chung. Check khởi động báo route cụ thể và dùng thời hạn 15 giây cho root và shell. Firefox preview đạt 5/5, báo cáo có đủ 67 màn theo đúng thứ tự manifest, trạng thái tải R04 và 0 lỗi. npm run verify đạt.
