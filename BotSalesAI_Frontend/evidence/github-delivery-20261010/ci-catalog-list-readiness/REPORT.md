# Catalog create: đồng bộ refetch danh sách

Nguồn sửa là `tests/frontend.spec.ts`. Fixture chờ đúng POST `/api/v2/shops/shop-demo/products` và kiểm HTTP 201/tên được lưu; chờ title canonical và focus `main` của route detail trước click “Danh sách”, rồi kiểm URL list/không có draft guard, chờ GET đúng API, kiểm HTTP 200 và ID/tên vừa tạo, giữ nguyên assertion tên hiển thị. Không thay app/cache/guard/mock/schema, số ca, timeout, retry hoặc workflow gate.

Local trước sửa: original fixture 10/10 PASS. Probe CPU ×6 và GET danh sách chậm 3.000 ms tái hiện lỗi cùng assertion tên: UI đã về list nhưng còn tám hàng cache cũ, trong khi GET mới chứa sản phẩm được tạo. Các probe CPU ×1/×6 với GET chi tiết chậm vẫn PASS. Probe CPU ×12 lỗi ở heading ban đầu, là precondition khác và được giữ trong raw log/results; không dùng làm bằng chứng lỗi sau lưu.

Trace hosted chỉ có POST 201 và GET detail 200, không có GET list sau click. URL giữ ở detail, snapshot đầy đủ không có dialog draft guard. Frame `711491.873` còn breadcrumb “Thêm sản phẩm”; frame `711603.616` đã thành “Chi tiết sản phẩm” và scroll dịch chuyển, trong khi click diễn ra `711545.735–711592.170`. Shell focus `main` theo effect của pathname: URL thay đổi chưa chứng minh React đã hoàn tất effect này. Probe slow-list là race riêng, không phải nguyên nhân hosted; kết quả refetch-only được giữ với prefix `refetch-only-`.

Probe navigation đặt focus trễ hữu hạn 120/220 ms và mouse down/up cách 500 ms để kiểm soát cửa sổ race. Không đổi app source; chỉ instrument browser của probe. Cả hai fixture cũ FAIL cùng assertion tên, URL ở detail: events ghi mouse down trúng `A` có href list, focus làm scroll `0 → 214`, mouse up trúng `DIV`, click vào `MAIN`. Cả hai fixture chờ title/focus PASS và về list. Raw source, events/network và trace cả bốn lượt nằm trong `navigation-*`; đây là probe kiểm soát timing, không phải benchmark/SLA.

Local trên source cuối:

- Catalog create và dirty-draft navigation: **20/20 PASS**, mỗi ca lặp 5 lần trên Chromium và Firefox (`catalog-after.log`).
- Probe navigation/focus: **2/2 PASS sau sửa**, giữ **2/2 FAIL trước sửa**. Hai probe CPU ×6/GET list chậm là PASS của bước refetch-only trung gian, giữ đúng phạm vi đó.
- `npm run verify`: **exit 0**, gồm lint/typecheck/domain/unit/build/source/UI/S17. Stage fixtures mới: composition **41**, layout **86**, evidence validator **11**; manifest có **275** source fingerprint hiện hành.
- Discovery không đổi: **406 ca/69 tệp mỗi browser**, tổng **812**.
- Một lượt discovery gọi từ repo cha thất bại `ENOENT` vì fixture dùng đường dẫn tương đối theo workspace Frontend. Raw log giữ với prefix `discovery-root-cwd-failed-`; chạy lại từ workspace đúng đã exit 0 và đủ 406/69 ở mỗi browser. Không đổi path consumer để che lỗi gọi lệnh.
- Build demo và built-demo regression: **6/6 PASS**, 61 manifest routes ở 390px/1440px trên cả hai browser, 0 issue/page error; artifact SHA-256 `09405e36f634fb68bf0baceb8ea501d73d13baa5e917668e9fe1c576789c25dc`. Bốn report `UI028/W32/built-demo-routes-*-current-20261007.json` được owning test sinh lại với artifact hiện hành.

Hosted baseline run `38026153033` trên `f6a16be9ccf8fa4a47c8a9358317390a4c630f6e`: Chromium hoàn tất **405 PASS/1 FAIL**; audit/full verify đã PASS trên cả hai job. Artifact `11661417424` tải về có SHA-256 khớp `f68750c32ca3a4e161ea6db7ebe491674b5683c6aba63443fd8a7f191fb6a6e8`; trace/error-context/timeline và hai frame được giữ trong folder này. Firefox còn chạy theo API snapshot tại thời điểm chuẩn bị sửa; không ghi toàn run cũ là PASS.

Trạng thái run trên SHA mới là **PENDING_AT_COMMIT**, phải xác nhận từ GitHub Actions sau push. Đây là validation Frontend/mock; không làm mới canonical FE receipts, không ghi nghiệm thu owner/screen reader/Backend/production. Các proof cũ giữ đúng revision và thời điểm của chúng.
