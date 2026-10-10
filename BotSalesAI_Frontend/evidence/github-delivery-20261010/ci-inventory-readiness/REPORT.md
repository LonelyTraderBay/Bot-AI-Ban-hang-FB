# Đồng bộ readiness Inventory và chart Marketing

Revision trước sửa: 66077b4c02e3b1a00894dd16af10744ad0f1ab54. Run GitHub 38030831566 hoàn tất: Chromium 406 E2E + 3 built-demo PASS; Firefox 404 E2E PASS / 2 FAIL, built-demo SKIPPED. Audit/full verify và upload thành công cả hai. Không nhận toàn run là PASS. Raw logs/metadata/trace/error-context/timeline được giữ ở đây. ZIP Firefox artifact 11663451832 đã đối chiếu SHA256 a6da73271f5a91d4f9d8f5172ec248f76de057cbafa7bb94981767e272e99ff4.

Inventory: assertion heading chạy 2838490.320–2843491.920ms; shop phản hồi 2842572.805ms, module Inventory mới tải 2843009.963ms. Error-context còn progressbar Đang tải màn hình, chưa có bảng. Fixture cuối đăng ký waiter trước navigation cho GET exact /api/v2/shops/shop-demo/inventory hoặc /inventory/movements, kiểm HTTP 200, hết route-loading rồi giữ heading/table/geometry assertions. Giữ 10 tổ hợp route/width, gutter 16/24px, table overflow trong region và pageErrors rỗng.

Marketing: response mặc định render chart rồi chuẩn hóa URL/refetch; request đủ fromDate/toDate/bucket được ghi tại 3927266.792ms. Chart/SVG/table cũ bị tháo trước lệnh scroll hoàn tất; lỗi Element is not attached to the DOM. Fixture cuối chờ GET exact /api/v2/shops/shop-demo/marketing-summary đủ ba filter, HTTP 200, trước đo. Giữ hai viewport 1280x720 và 320x860, ba nhãn/bốn dòng bảng, bounds trong chart, font >=14px, không chồng nhãn/tràn trang. Không đổi app, API/schema, mock, CSS, timeout, retry hoặc threshold.

Trước sửa, local nguyên bản đạt Inventory 8/8 và nhãn Marketing 4/4; không thay thế FAIL hosted. Probe page-routing đầu 4 PASS không tạo delay hữu hiệu. Context-routing delay module 6.500ms trên Chromium đúng một request mỗi fixture: original FAIL cùng heading / synchronized PASS cùng geometry. Firefox ghi delayedRequests=0: hai PASS đó không dùng chứng minh chịu delay. Raw trace/network/kết quả giữ nguyên; ảnh Chromium original hiện Shell và loading. baseline.md/marketing-baseline.md ghi contract và owner trước edit.

Sau sửa: targeted 18/18 PASS (hai ca Inventory và một ca Marketing, ba lượt mỗi browser). Composition 41/41, layout 86/86, validator 11/11 PASS, không finding mới. Full npm run verify PASS exit 0, gồm lint/typecheck, domain/network, 238 unit test, build và UI gates; S17 COMPLETE với 275 fingerprint và ba log record khớp. local-validation.json ghi hash nguồn/generated/proof. Hosted trên SHA sau push: PENDING_AT_COMMIT.

Snapshot timeline có reference tới frame trước; literalMarkersOnly chỉ là tìm chuỗi, không phải DOM phục dựng. Error-context và trace đầy đủ là nguồn đối chiếu.

Thứ tự: P1 Inventory waiter; P1 Marketing canonical-response waiter; P2 raw proof/gate/hash/báo cáo. Phạm vi Frontend/mock; không tái chứng nhận canonical FE receipts, owner acceptance, screen-reader speech, Backend hoặc production.
