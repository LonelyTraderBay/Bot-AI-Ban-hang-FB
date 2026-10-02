# Tiếp nhận phạm vi frontend với mock API — 30/09/2026

Nguồn quyết định: yêu cầu trực tiếp của người dùng trong chat này — chỉ phát triển frontend; mock data đủ cho nghiệm thu frontend; dùng quy trình AI_RULES.md để thống nhất code và hướng tới Production-Ready/Enterprise-Grade Frontend Architecture. Lượt thay đổi này sửa kế hoạch/tài liệu và công cụ sinh, không hoàn thành task ứng dụng.

## Nguồn hiện hành và bảo toàn

API/routes/permissions/feature catalog, design/tokens và hai bản AI_RULES.md giữ nguyên. Plan/progress/command-map/PLAN_GUIDE/tasks T của toàn sản phẩm giữ nguyên; không rebaseline, xóa hoặc cộng điểm ledger đó. FE001–FE028/140 bước có frontend-plan.json và frontend-progress.json riêng, bắt đầu NOT_STARTED/0%; sourceTaskIds chỉ truy vết đặc tả gốc.

Tracker hiện có được dùng lại với scope selection. Mặc định frontend khi có frontend-plan.json; --full-product chỉ đọc ledger gốc. report frontend sinh IMPLEMENTATION_PLAN.md, frontend-tasks và FRONTEND_PROGRESS.md; full-product report không ghi đè kế hoạch frontend. frontend-scope-adoption.json ghi hash kế hoạch mới và protected source hashes. Source ứng dụng/packages và bằng chứng test lịch sử không đổi trong lượt này.

## Complexity Gate và Change Budget

Kế hoạch gốc yêu cầu backend/live trong khi scope chỉ frontend/mock; không thể dùng cùng task IDs/mẫu số để nhận frontend đã xong nguyên task toàn sản phẩm. Chỉ chèn cảnh báo vào Markdown sẽ bị report ghi đè và để lại dependencies/acceptance sai scope.

Chọn namespace frontend, dùng lại evidence tracker/generator; không thêm service, dependency, framework app hoặc hệ khóa. Mỗi phase có trọng số nghiệm thu 10/25/40/20/5, không thời gian hoặc chất lượng tuyệt đối. Shared files vẫn một writer. Các nguồn bảo toàn có hashes đối chiếu.

Kiểm chứng: syntax tracker, validate hai plan, report từ nguồn, DAG/route/feature/operation/read paths, negative smoke trong thư mục thử, generated freshness, diff và protected hashes. Các kiểm này chỉ xác minh kế hoạch/tài liệu/cơ chế tracker; build/browser/UAT frontend chưa được chạy trong lượt này.

Khi đổi scope sau này: giữ frontend-progress/evidence/handoff, ghi adoption có nguồn, reconcile dependencies/acceptance và revalidate phần ảnh hưởng. Không reset tiến độ thật/đổi hash để lách evidence. Backend/live chỉ được triển khai khi có nhiệm vụ riêng.
