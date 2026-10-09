# Bàn giao FE022 — luồng xuyên module

<!-- CORRECTIONS_CURRENT -->
## Kết quả hiện hành — component A01–A07 sau F01–F09 và Toolbar/Shell

[Báo cáo source/gates](../../../../BotSalesAI_Frontend/evidence/frontend-component-fixes-20261008/REPORT.md) và [ca nghiệm thu](../../../../BotSalesAI_Frontend/evidence/frontend-component-fixes-20261008/ACCEPTANCE_GUIDE.md): READY_FOR_ACCEPTANCE_LOCAL_SCOPE; full E2E580/580,174 unit,39 contracts,built-demo6/6,native33/33 trên source mới. Thứ tự UI chỉ ở plan §16.6; FE freshness đọc canonical CLI, giữ mẫu số140. Counts554/173,566/174 và các manifest cũ bên dưới là snapshot lịch sử, không thay lần chạy mới.

Local React/TypeScript + HTTP MSW tổng hợp. Speech, hosted CI, Backend/provider thật và quyết định người dùng giữ trạng thái quan sát riêng; không tự điền PASS.
<!-- END_CORRECTIONS_CURRENT -->

## HISTORICAL_SNAPSHOT — hồ sơ trước đợt F01–F09

Phạm vi đã xác minh: 54 route, 64 feature ID và 65 feature-route entries; mỗi entry gắn với browser case có tương tác UI cụ thể trên React/Chromium và synthetic MSW. Bốn hành trình xuyên module cũng giữ nguyên identity của dữ liệu mẫu.

Kiểm tra hiện tại: full E2E Chromium/Firefox 512 passed; focused FE022 5/5 Chromium; ma trận 65 feature-route interactions / 0 partial / 0 route-mount-only.

Giới hạn: không xác nhận API/provider thật, lưu trữ server, SSE, server RBAC hay staging. FE017 publish dùng session permission và lifecycle state làm thay thế cho nghiệm thu mock; canonical Knowledge.allowedActions chưa có trong contract nên không được thêm DTO/endpoint.

Bước kế tiếp: chốt các gate frontend FE023–FE028 và rà soát tổng hợp theo ledger riêng; giữ nguyên giới hạn không chứng nhận backend/provider/staging/production hoặc owner acceptance.

## Sai lệch contract được phát hiện trong lần đối chiếu hiện tại

`feature-catalog.json` ánh xạ 64 feature vào 65 cặp route-feature hợp lệ. `route-manifest.json` có mảng `featureIds` ở 18/54 route nhưng chỉ khai báo 49/65 cặp đó; 16 cặp thiếu thuộc R06 (B01, B02, B03, B04, B05, B07, B08), R22 (E08), R33 (G01, G02, G03, G05, G06) và R34 (H05, H06, H07). Ma trận `docs/route-implementation.json` lấy liên kết từ `feature-catalog.json`, có kiểm tra với route tồn tại và test UI tương ứng; vì vậy không dùng ma trận này để khẳng định hai contract đã đồng nhất. Chưa sửa `route-manifest.json`: cần xác nhận ý nghĩa của mảng `featureIds` với chủ sở hữu contract trước khi coi các giá trị còn thiếu là lỗi dữ liệu thay vì danh sách chọn lọc.
