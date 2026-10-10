# Baseline trước sửa source

Source owner: `tests/vertical-slices/fe022-flows.spec.ts`, duy nhất ca VS02. Snapshot nguyên byte được lưu khi HEAD `b9205ab5b49d7dc47e5bcb4c27191a9152564c14`; source Dashboard đang được kiểm tra riêng, chưa commit. Procurement, mock, API contract và các flow FE022 khác chỉ đọc.

Run 38044074123, Firefox job 114189949532: lỗi ở heading `Đơn mua hàng` ngay sau gotoDemo purchases, trước bất kỳ command domain nào. Goto chỉ chờ page load; PurchasesPage là lazy module và dùng listPurchaseOrders query limit20. Trace goto4681722.006–4682498.940ms, heading wait4682508.392–4687516.728ms. Error-context còn main loading. Artifact11668014780 SHA256c1d444cbf653d0d62c3116e010b1f2d578e7a50e573281cddf26f5a81811abaf đã kiểm.

Giữ tạo purchase, request/decision approval, supplier send/confirm, receipt, stock delta và payable identity; giữ mã resource và mọi HTTP status/domain assertion. Không đổi app/mock/contracts, ngưỡng/timeout/retry. Chưa gán kết luận lazy-module timing cho đến khi đối chiếu network và probe.
