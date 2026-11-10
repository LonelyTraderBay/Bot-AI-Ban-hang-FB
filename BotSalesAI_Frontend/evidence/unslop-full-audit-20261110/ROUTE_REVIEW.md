# Rà soát từng trang — 61/61

Đọc cùng [REPORT.md](REPORT.md), [findings.json](findings.json) và [matrix.json](matrix.json). Mỗi route đã mở ở 320/390/768/1440 px trên Chromium/Firefox; ảnh full-page lưu ở 1440 và 390 px trên Chromium. Các route dùng Shell cùng chịu U07; mã khác chỉ ghi khi có bằng chứng cụ thể. Không ghi nhận finding ở một state không đồng nghĩa mọi luồng của route đã được nghiệm thu.

- **U01 (P1)**: Nút chọn ảnh/CSV không mở bộ chọn tệp bằng Enter hoặc Space
- **U02 (P2)**: Tiêu đề và nút đóng hộp thoại lệch tâm khoảng 9,85 px
- **U03 (P2)**: Nhãn trạng thái ngắn bị bẻ giữa chữ trong bảng
- **U04 (P2)**: Một số ô chọn compact có vùng chạm cao khoảng 37 px
- **U05 (P2)**: Cột thao tác có ô tiêu đề rỗng
- **U06 (P2)**: Heading nhảy cấp hoặc dùng để trình bày số/ngày
- **U07 (P3)**: Tóm tắt công cụ demo nằm ngoài landmark có tên
- **U08 (P3)**: Một số lời dẫn còn dùng tên API và thuật ngữ triển khai

| ID | Trang canonical | Route | Ma trận | Finding | Kiểm bổ sung | Ảnh full-page |
|---|---|---|---:|---|---|---|
| R01 | Đăng nhập | `/login` | 8/8 | U08 | — | [Desktop](screens/R01-chromium-1440.png) · [Mobile](screens/R01-chromium-390.png) |
| R02 | Chọn cửa hàng | `/workspaces` | 8/8 | U06 | — | [Desktop](screens/R02-chromium-1440.png) · [Mobile](screens/R02-chromium-390.png) |
| R03 | Thiết lập cửa hàng | `/onboarding` | 8/8 | Chưa ghi nhận finding trong state đã kiểm | — | [Desktop](screens/R03-chromium-1440.png) · [Mobile](screens/R03-chromium-390.png) |
| R04 | Tổng quan | `/s/:shopId/overview` | 8/8 | U07 | — | [Desktop](screens/R04-chromium-1440.png) · [Mobile](screens/R04-chromium-390.png) |
| R05 | Hộp thư | `/s/:shopId/inbox` | 8/8 | U04, U07 | Target: 4 lần | [Desktop](screens/R05-chromium-1440.png) · [Mobile](screens/R05-chromium-390.png) |
| R06 | Chi tiết hội thoại | `/s/:shopId/inbox/:conversationId` | 8/8 | U04, U07 | Target: 4 lần | [Desktop](screens/R06-chromium-1440.png) · [Mobile](screens/R06-chromium-390.png) |
| R07 | Khách hàng | `/s/:shopId/customers` | 8/8 | U02, U05, U07 | Dialog: 4 lần | [Desktop](screens/R07-chromium-1440.png) · [Mobile](screens/R07-chromium-390.png) |
| R08 | Hồ sơ khách | `/s/:shopId/customers/:customerId` | 8/8 | U02, U07 | Dialog: 4 lần | [Desktop](screens/R08-chromium-1440.png) · [Mobile](screens/R08-chromium-390.png) |
| R09 | Sản phẩm | `/s/:shopId/products` | 8/8 | U04, U07 | Target: 4 lần | [Desktop](screens/R09-chromium-1440.png) · [Mobile](screens/R09-chromium-390.png) |
| R10 | Thêm sản phẩm | `/s/:shopId/products/new` | 8/8 | U01, U07, U08 | — | [Desktop](screens/R10-chromium-1440.png) · [Mobile](screens/R10-chromium-390.png) |
| R11 | Chi tiết sản phẩm | `/s/:shopId/products/:productId` | 8/8 | U01, U07, U08 | — | [Desktop](screens/R11-chromium-1440.png) · [Mobile](screens/R11-chromium-390.png) |
| R12 | Danh mục hàng | `/s/:shopId/categories` | 8/8 | U02, U05, U07 | Dialog: 4 lần | [Desktop](screens/R12-chromium-1440.png) · [Mobile](screens/R12-chromium-390.png) |
| R13 | Nhập dữ liệu | `/s/:shopId/imports` | 8/8 | U01, U05, U07 | — | [Desktop](screens/R13-chromium-1440.png) · [Mobile](screens/R13-chromium-390.png) |
| R14 | Kết quả nhập dữ liệu | `/s/:shopId/imports/:jobId` | 8/8 | U07 | State bổ sung: 4 lần | [Desktop](screens/R14-chromium-1440.png) · [Mobile](screens/R14-chromium-390.png) |
| R15 | Tồn kho | `/s/:shopId/inventory` | 8/8 | U02, U03, U04, U05, U07 | Dialog: 4 lần; Target: 4 lần | [Desktop](screens/R15-chromium-1440.png) · [Mobile](screens/R15-chromium-390.png) |
| R16 | Lịch sử kho | `/s/:shopId/inventory/movements` | 8/8 | U03, U04, U07 | Target: 4 lần | [Desktop](screens/R16-chromium-1440.png) · [Mobile](screens/R16-chromium-390.png) |
| R17 | Đơn hàng | `/s/:shopId/orders` | 8/8 | U03, U05, U07 | — | [Desktop](screens/R17-chromium-1440.png) · [Mobile](screens/R17-chromium-390.png) |
| R18 | Tạo đơn nháp | `/s/:shopId/orders/new` | 8/8 | U07, U08 | — | [Desktop](screens/R18-chromium-1440.png) · [Mobile](screens/R18-chromium-390.png) |
| R19 | Chi tiết đơn hàng | `/s/:shopId/orders/:orderId` | 8/8 | U06, U07 | — | [Desktop](screens/R19-chromium-1440.png) · [Mobile](screens/R19-chromium-390.png) |
| R20 | Thu/chi tổng quan | `/s/:shopId/finance` | 8/8 | U07 | State bổ sung: 4 lần | [Desktop](screens/R20-chromium-1440.png) · [Mobile](screens/R20-chromium-390.png) |
| R21 | Sổ thu/chi | `/s/:shopId/finance/entries` | 8/8 | U02, U03, U07 | Dialog: 4 lần | [Desktop](screens/R21-chromium-1440.png) · [Mobile](screens/R21-chromium-390.png) |
| R22 | Lợi nhuận quản trị | `/s/:shopId/finance/profit-loss` | 8/8 | U07 | State bổ sung: 4 lần | [Desktop](screens/R22-chromium-1440.png) · [Mobile](screens/R22-chromium-390.png) |
| R23 | Nguồn kiến thức | `/s/:shopId/knowledge` | 8/8 | U02, U07 | Dialog: 4 lần | [Desktop](screens/R23-chromium-1440.png) · [Mobile](screens/R23-chromium-390.png) |
| R24 | Chi tiết kiến thức | `/s/:shopId/knowledge/:knowledgeId` | 8/8 | U05, U07 | — | [Desktop](screens/R24-chromium-1440.png) · [Mobile](screens/R24-chromium-390.png) |
| R25 | Đánh giá và phản hồi | `/s/:shopId/knowledge/review` | 8/8 | U05, U07 | — | [Desktop](screens/R25-chromium-1440.png) · [Mobile](screens/R25-chromium-390.png) |
| R26 | Cấu hình bot | `/s/:shopId/bot` | 8/8 | U02, U05, U07 | Dialog: 4 lần | [Desktop](screens/R26-chromium-1440.png) · [Mobile](screens/R26-chromium-390.png) |
| R27 | Thử bot an toàn | `/s/:shopId/bot/playground` | 8/8 | U07 | — | [Desktop](screens/R27-chromium-1440.png) · [Mobile](screens/R27-chromium-390.png) |
| R28 | Kiểm thử chất lượng AI | `/s/:shopId/bot/evaluations` | 8/8 | U02, U07 | Dialog: 4 lần | [Desktop](screens/R28-chromium-1440.png) · [Mobile](screens/R28-chromium-390.png) |
| R29 | Kết nối Facebook | `/s/:shopId/integrations/channels` | 8/8 | U02, U07 | Dialog: 4 lần | [Desktop](screens/R29-chromium-1440.png) · [Mobile](screens/R29-chromium-390.png) |
| R30 | Nhà cung cấp AI | `/s/:shopId/integrations/ai` | 8/8 | U02, U07 | Dialog: 4 lần | [Desktop](screens/R30-chromium-1440.png) · [Mobile](screens/R30-chromium-390.png) |
| R31 | Báo cáo và xuất dữ liệu | `/s/:shopId/reports` | 8/8 | U07, U08 | — | [Desktop](screens/R31-chromium-1440.png) · [Mobile](screens/R31-chromium-390.png) |
| R32 | Nhân sự và quyền | `/s/:shopId/settings/team` | 8/8 | U02, U05, U07 | Dialog: 4 lần | [Desktop](screens/R32-chromium-1440.png) · [Mobile](screens/R32-chromium-390.png) |
| R33 | Thiết lập cửa hàng | `/s/:shopId/settings/shop` | 8/8 | U07, U08 | — | [Desktop](screens/R33-chromium-1440.png) · [Mobile](screens/R33-chromium-390.png) |
| R34 | Nhật ký kiểm toán | `/s/:shopId/settings/audit` | 8/8 | U07 | — | [Desktop](screens/R34-chromium-1440.png) · [Mobile](screens/R34-chromium-390.png) |
| R35 | Quyền riêng tư và lưu trữ | `/s/:shopId/settings/privacy` | 8/8 | U02, U07 | Dialog: 4 lần | [Desktop](screens/R35-chromium-1440.png) · [Mobile](screens/R35-chromium-390.png) |
| R36 | Theo dõi công việc nền | `/s/:shopId/jobs/:jobId` | 8/8 | U07 | State bổ sung: 4 lần | [Desktop](screens/R36-chromium-1440.png) · [Mobile](screens/R36-chromium-390.png) |
| R37 | Điều hành và công việc | `/s/:shopId/operations` | 8/8 | U02, U03, U05, U07 | Dialog: 4 lần | [Desktop](screens/R37-chromium-1440.png) · [Mobile](screens/R37-chromium-390.png) |
| R38 | Hàng chờ phê duyệt | `/s/:shopId/approvals` | 8/8 | U02, U05, U07 | Dialog: 4 lần | [Desktop](screens/R38-chromium-1440.png) · [Mobile](screens/R38-chromium-390.png) |
| R39 | Trung tâm thông báo | `/s/:shopId/notifications` | 8/8 | U02, U07 | Dialog: 4 lần | [Desktop](screens/R39-chromium-1440.png) · [Mobile](screens/R39-chromium-390.png) |
| R40 | Thiết bị, kênh nhận và lịch trực | `/s/:shopId/notifications/devices` | 8/8 | U05, U07 | — | [Desktop](screens/R40-chromium-1440.png) · [Mobile](screens/R40-chromium-390.png) |
| R41 | Chuẩn bị và lấy hàng | `/s/:shopId/fulfillment` | 8/8 | U05, U07 | — | [Desktop](screens/R41-chromium-1440.png) · [Mobile](screens/R41-chromium-390.png) |
| R42 | Vận đơn và giao hàng | `/s/:shopId/shipments` | 8/8 | U02, U03, U05, U07 | Dialog: 4 lần | [Desktop](screens/R42-chromium-1440.png) · [Mobile](screens/R42-chromium-390.png) |
| R43 | Đổi trả và kiểm hàng hoàn | `/s/:shopId/returns` | 8/8 | U02, U05, U07 | Dialog: 4 lần | [Desktop](screens/R43-chromium-1440.png) · [Mobile](screens/R43-chromium-390.png) |
| R44 | Nhà cung cấp hàng hóa | `/s/:shopId/suppliers` | 8/8 | U02, U05, U07 | Dialog: 4 lần | [Desktop](screens/R44-chromium-1440.png) · [Mobile](screens/R44-chromium-390.png) |
| R45 | Đề nghị nhập và quy tắc | `/s/:shopId/replenishment` | 8/8 | U02, U05, U07 | Dialog: 4 lần | [Desktop](screens/R45-chromium-1440.png) · [Mobile](screens/R45-chromium-390.png) |
| R46 | Đơn mua hàng | `/s/:shopId/purchases` | 8/8 | U02, U05, U07 | Dialog: 4 lần | [Desktop](screens/R46-chromium-1440.png) · [Mobile](screens/R46-chromium-390.png) |
| R47 | Nhận hàng và đối chiếu | `/s/:shopId/receipts` | 8/8 | U02, U05, U07 | Dialog: 4 lần | [Desktop](screens/R47-chromium-1440.png) · [Mobile](screens/R47-chromium-390.png) |
| R48 | Chứng từ và sổ kép | `/s/:shopId/finance/journals` | 8/8 | U02, U05, U07 | Dialog: 4 lần | [Desktop](screens/R48-chromium-1440.png) · [Mobile](screens/R48-chromium-390.png) |
| R49 | Đối soát ngân hàng và COD | `/s/:shopId/finance/reconciliation` | 8/8 | U02, U07 | Dialog: 4 lần | [Desktop](screens/R49-chromium-1440.png) · [Mobile](screens/R49-chromium-390.png) |
| R50 | Công nợ và khóa kỳ | `/s/:shopId/finance/debts-periods` | 8/8 | U02, U05, U07 | Dialog: 4 lần | [Desktop](screens/R50-chromium-1440.png) · [Mobile](screens/R50-chromium-390.png) |
| R51 | Bốn vai trò AI và quyền | `/s/:shopId/bot/team` | 8/8 | U05, U07 | — | [Desktop](screens/R51-chromium-1440.png) · [Mobile](screens/R51-chromium-390.png) |
| R52 | Bản tin và sức khỏe hệ thống | `/s/:shopId/operations/digests` | 8/8 | U06, U07 | — | [Desktop](screens/R52-chromium-1440.png) · [Mobile](screens/R52-chromium-390.png) |
| R53 | Thông tin hỗ trợ marketing | `/s/:shopId/reports/marketing` | 8/8 | U07 | — | [Desktop](screens/R53-chromium-1440.png) · [Mobile](screens/R53-chromium-390.png) |
| R54 | Yêu cầu sau bán | `/s/:shopId/service-cases` | 8/8 | U02, U03, U05, U07 | Dialog: 4 lần | [Desktop](screens/R54-chromium-1440.png) · [Mobile](screens/R54-chromium-390.png) |
| R55 | Quản trị kho | `/s/:shopId/settings/warehouses` | 8/8 | U02, U07 | Dialog: 4 lần | [Desktop](screens/R55-chromium-1440.png) · [Mobile](screens/R55-chromium-390.png) |
| R56 | Tài khoản kế toán | `/s/:shopId/finance/accounts` | 8/8 | U02, U07 | Dialog: 4 lần | [Desktop](screens/R56-chromium-1440.png) · [Mobile](screens/R56-chromium-390.png) |
| R57 | Mở sổ kế toán | `/s/:shopId/finance/opening-balances` | 8/8 | U02, U07 | Dialog: 4 lần | [Desktop](screens/R57-chromium-1440.png) · [Mobile](screens/R57-chromium-390.png) |
| R58 | Sổ cái | `/s/:shopId/finance/ledger` | 8/8 | U07 | State bổ sung: 4 lần | [Desktop](screens/R58-chromium-1440.png) · [Mobile](screens/R58-chromium-390.png) |
| R59 | Cân đối phát sinh | `/s/:shopId/finance/trial-balance` | 8/8 | U07 | State bổ sung: 4 lần | [Desktop](screens/R59-chromium-1440.png) · [Mobile](screens/R59-chromium-390.png) |
| R60 | Cân đối quản trị | `/s/:shopId/finance/balance-sheet` | 8/8 | U07 | — | [Desktop](screens/R60-chromium-1440.png) · [Mobile](screens/R60-chromium-390.png) |
| R61 | Xác nhận quyền marketing | `/consent/confirm` | 8/8 | Chưa ghi nhận finding trong state đã kiểm | State bổ sung: 4 lần | [Desktop](screens/R61-chromium-1440.png) · [Mobile](screens/R61-chromium-390.png) |

R14/R36 ở ma trận chính là state mã công việc không tồn tại; R61 là state thiếu token. Các state có dữ liệu thực tế của fixture đã được bổ sung riêng trong [states.json](states.json). Bốn báo cáo tài chính R20/R22/R58/R59 được mở thêm với kỳ 01/09–01/10/2026.

28 loại hộp thoại chỉ đại diện cho các opener trong overlays.cjs; không tuyên bố đã duyệt mọi hộp thoại xác nhận hoặc mọi nhánh submit. Các phép thử tệp/nhập/xuất dùng MSW cô lập; không gửi hoặc xác nhận nghiệp vụ thật.
