# C06 — Hợp đồng triển khai kế toán quản trị

Phạm vi đã duyệt: canonical contracts, React và MSW tổng hợp. Không chứng nhận ngân hàng/provider, sổ pháp định hoặc Backend.

## Nguyên nhân xác nhận từ source

- P&L lấy đơn/return và cashflow lấy financeEntries, không đối chiếu toàn bộ journal.
- Handover/delivery/return/payment/reconciliation thiếu bút toán tương ứng; receipt dùng ID tài khoản cố định khác shop.
- Reversal gắn kỳ cũ dù ngày đảo ở kỳ mới; source có thể ghi lại sau đảo.
- Upload sao kê chưa thuộc enum canonical; ID tài khoản ngân hàng là textbox.

## Invariant và owner

- Domain mock độc lập React giữ Decimal 4 chữ số hiện hành; journal cân bằng, một currency/shop, có policy/date/source/version. Posted và reversed originals giữ nguyên lines; đảo bằng journal mới trong kỳ đang mở. Không tạo số dư để lấp dữ liệu seed thiếu.
- Mở sổ có snapshot inventory theo warehouse/variant, số dư tài khoản, ngày/policy; kiểm tổng Nợ/Có và carrying value inventory. Post kiểm lại version/kỳ/reference; không ghi mở sổ thứ hai hoặc sau tác động vận hành đã ghi.
- Ledger/trial/balance/P&L/cashflow trả aggregate từ toàn bộ journal phù hợp, không cộng trang UI. Trả asOf, policy, completeness/warnings và journal/source drill-down.
- Handover giữ giá vốn lịch sử, giao hàng ghi nhận theo synthetic-policy-1; sellable return dùng giá vốn gốc và cập nhật moving weighted average. Chứng từ thu/chi/đối soát giữ tiền thực/ước tính riêng, không ghi cash hai lần.
- Import đúng purpose/scope, canonical CSV, source uniqueness, preview và partial/ambiguous matching; không dùng ảnh làm xác nhận tiền.
- R57–R60 dùng module finance, permission finance.read; mutation finance.post/finance.close theo catalog hiện hành. R50 có tạo kỳ không overlap. Không thay quyền quản trị khác.
- Event journal/period/opening thay đổi mở rộng invalidation resource; unknown/gap/reconnect giữ full resync.

## UI và consumer impact

R20/R21/R22/R48/R49/R50, mới R57–R60; domain consumer orders, fulfillment, procurement, inventory, dashboard và export. App router chỉ import public module index.

PageHeader/Panel/DataTable/QueryState/Pager/Amount/DetailLine/ConfirmDialog/EditDialog cùng compositions FormFields/FieldGroup/SurfaceContent/ActionGroup/PageSections giữ geometry, spacing v1.29 và Graphite Gold. Không thêm shared CRUD engine, dependency, scale hoặc override. Reports phân thứ bậc snapshot → totals → nguồn. Opening form có validation tại trường, focus lỗi, guard dữ liệu đầy đủ, recovery unknown và version/conflict; list lookup canonical phân trang. Source drill-down không tiết lộ trường bị che.

## Kiểm chứng cần đạt trước đóng scoped

Canonical generator/kit/contract, TypeScript/lint/boundaries/layout/composition; HTTP + pure domain cho mở sổ cân bằng, reference/scope/role/version, duplicate/reimport, khóa kỳ cạnh tranh, reversal và totals độc lập pagination. Golden HTTP journey 80.000 trước trả, 30.000 sau refund, assets = liabilities + equity tại từng mốc. Browser regression routes mới và consumer: keyboard/axe, 320/390/768/1280/1440, long content/validation/draft/unknown. Final native zoom/text resize và toàn bộ final gates ở C11; không gộp retest thành full PASS.
