# Sửa tận gốc WIDTH.W01–W04 — 08/10/2026

**IN_PROGRESS FINAL_GATES.** Source fix và focused regression đã đạt; đang chờ một full600 E2E hoàn tất và canonical evidence revalidation. Thứ tự/trạng thái chỉ ở [UI plan §16.6](../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status).

## Nguyên nhân và sửa tại owner

| Ưu tiên | Finding | Sửa |
|---|---|---|
| P1 | W01: collection một thẻ bị cố định hai track | AI/Workspaces chọn cột theo dữ liệu0/1/2+; Empty có một CTA; không đổi pane/role grids. |
| P2 | W02: full Panel chứa form bị cap760/850 | Gỡ cap ở Imports/Shop/Shipping; FieldGroup responsive giữ trường liên quan theo cặp và DOM order. |
| P2 | W03: notice chung auto-place trong một ô grid | PageSections giữ grid và notice thành siblings; gap24 thuộc parent. |
| P2 | W04: DetailLine Fragment trả hai children, parent gap cộng quanh divider | Một Box bao row+divider, không inset mới; label/value wrap; parent chỉ đặt gap giữa logical rows. |

Đã rà15 SectionGrid placements và98 DetailLine call-sites trong13 module theo [baseline](baseline.json), [contract](CONTRACT.md) và [vị trí tương tự](ANALOGOUS_PATTERNS.md). Không đổi canonical API/schema/dependency/token scale.

## Bằng chứng đã có

- Trước sửa:10 browser failures kỳ vọng ở cả engines, unit atomic1 failure kỳ vọng; source snapshot giữ nguyên. Sau sửa:W01 14/14, W02/W03 4/4, W04 2/2; một focused suite20/20, không hạ assertion.
- Unit175/175; contract39/39; layout82/82 và scan79 files0 findings; evidence fixtures11/11; source-map16/16; `verify` đạt.
- Compiled demo:54 routes ×320/1920 ×hai engines =216 route observations;50 focused geometry/axe/keyboard cases ở320/768/1279/1280/1920. [Dữ liệu đo](built-width-review.json); screenshot sau sửa đi kèm hash.
- AI tại1920:content/card1632 thay cho804. R13/R33/R42 form phủ vùng inset body; R40 notice1632, gap24; capability group7 logical children thay cho14.
- WIDTH native14/14 đạt (actual Chrome tab zoom200% và Firefox native text-only200%); inherited native được tái kiểm riêng. Không dùng CSS hoặc viewport emulation để gọi native zoom.
- Cold install/build10/10:lock đồng nhất, production không có MSW, demo có worker, hai build lặp lại byte-identical. Temp workspace được giữ có đường dẫn; không nhận đã dọn.

## Bàn giao

[Ca nghiệm thu](ACCEPTANCE_GUIDE.md). Full E2E/canonical tracker chưa đóng ở bản ghi đang chạy này. Các attempt lỗi công cụ được giữ; không cộng targeted pass để đóng một full run thất bại. Full-product ledger/Universal/workflow bảo toàn; staged/dirty work không reset hoặc clean.

Phạm vi: React/TypeScript + HTTP MSW tổng hợp trên Windows local. Backend/provider/staging/production hosting ngoài scope; screen-reader speech, hosted CI và nghiệm thu người dùng chưa tự ghi PASS. Regression bảo vệ những invariant đã đo, không bảo đảm mọi lỗi UI tương lai đều bị loại bỏ.
