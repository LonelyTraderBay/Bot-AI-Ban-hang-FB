# Baseline kiểm tra readiness Inventory

Revision trước sửa: 66077b4c02e3b1a00894dd16af10744ad0f1ab54. Run GitHub 38030831566, Firefox job 114151293860 ghi FAIL ở tests/ui-inventory-layout.spec.ts:28: heading Tồn kho chưa xuất hiện sau assertion mặc định 5.000ms. Job Chromium của cùng SHA đã hoàn tất thành công. Chưa nhận toàn run là PASS.

Owner: tests/ui-inventory-layout.spec.ts, fixture đo R15/R16; app Inventory và Router chỉ đọc. Contract phải giữ: 10 tổ hợp route/width 320,390,768,1280,1440; gutter 16/24px; table overflow chứa trong region; pageErrors rỗng; không đổi assertion, timeout, retry, API/schema, app, mock hoặc style. Trước source edit, cần trace hosted xác định route loading/API timing và probe kiểm cùng failure boundary.

Nguồn đã đối chiếu: apps/web/src/modules/inventory/index.tsx dùng listStockSnapshots/listStockMovements; apps/web/src/app/router.tsx lazy import Inventory và progressbar Đang tải màn hình; contracts/openapi.json có GET /shops/{shopId}/inventory và /inventory/movements. Predicate API sẽ dùng exact /api/v2/shops/shop-demo/inventory và /inventory/movements, đăng ký trước navigation, phải HTTP 200 rồi route loading kết thúc trước assertion heading/geometry.

Trạng thái: INVESTIGATING. Trace hosted và hồi quy chưa hoàn tất tại baseline này. Phạm vi Frontend/mock, không tăng acceptance hoặc tái chứng nhận FE receipts.

