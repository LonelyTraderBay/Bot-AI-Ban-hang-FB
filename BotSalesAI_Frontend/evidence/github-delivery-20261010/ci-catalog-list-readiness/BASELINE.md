# Baseline trước chỉnh fixture Catalog

- Revision đã push: `f6a16be9ccf8fa4a47c8a9358317390a4c630f6e`; run hosted `38026153033`, Chromium job `114137308661`.
- Symptom hosted: `tests/frontend.spec.ts:55` không tìm thấy tên sản phẩm sau click “Danh sách”; assertion URL chi tiết trước đó đã qua. Chưa có artifact completed tại lúc ghi baseline, chưa kết luận nguyên nhân hosted.
- Local nguyên fixture: 10/10 PASS (5 Chromium, 5 Firefox). Probe Chromium với CPU ×1/×6 và GET chi tiết chậm 1.500 ms vẫn PASS. Khi CPU ×6 và GET danh sách chậm 3.000 ms, assertion tên hết 5.000 ms: màn hình đã về danh sách, vẫn có tám hàng cache cũ. HTTP POST 201, GET chi tiết 200 và GET danh sách 200 chứa sản phẩm mới đều được ghi lại; response danh sách về sau hơn 6 giây so với response chi tiết. Probe CPU ×12 dừng sớm tại heading ban đầu, là precondition khác và không dùng để chứng minh nguyên nhân ca lưu.
- Owner: `tests/frontend.spec.ts`; consumer: regression Catalog create/dirty draft trên Chromium và Firefox. API owner, cache hook, guard và ProductEditor không đổi.
- Contract cần giữ: tạo đúng tên/SKU/giá qua HTTP mock; không còn draft guard sau lưu; link “Danh sách” điều hướng trong app; danh sách API chứa ID vừa tạo và UI hiển thị tên. Thêm quan sát response POST và GET danh sách trước thao tác gây request; giữ assertion UI, giữ timeout/retry/gate hiện có.
- Phạm vi: test readiness và evidence. Không đổi app, schema, mock service, giao diện hoặc behavior. Không chứng nhận Backend/production hay nghiệm thu owner. Trace hosted phải được đối chiếu trước khi ghi nguyên nhân cuối.

## Đối chiếu trace hosted và bước sửa tiếp

Trace đã tải từ artifact `11661417424`, SHA-256 `f68750c32ca3a4e161ea6db7ebe491674b5683c6aba63443fd8a7f191fb6a6e8`. Chromium hoàn tất 405 PASS/1 FAIL. Hosted **khác** probe GET list chậm: chỉ có POST 201 và GET detail 200; không có GET list sau click, URL giữ ở detail và snapshot đầy đủ không có dialog draft guard. Frame trước click còn breadcrumb “Thêm sản phẩm” dù URL đã đổi; frame sau click đã thành “Chi tiết sản phẩm” và scroll dịch chuyển. `Shell.tsx` thực hiện focus `main` trong effect của `location.pathname`; URL assertion chưa chứng minh effect React của route đã xong.

Fixture sẽ chờ title canonical “Chi tiết sản phẩm · BotSales AI” và `main#main-content` được focus trước click link. Đây là completion do owner Shell/RouteMetadata đã triển khai, không thêm sleep hoặc đổi focus/scroll của app. Probe refetch trước đó chứng minh một race riêng và được giữ như kết quả trung gian; không dùng để nhận là nguyên nhân hosted.
