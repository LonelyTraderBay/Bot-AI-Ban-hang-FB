# BotSales AI — bắt đầu frontend với mock API

Phạm vi người dùng xác nhận ngày 30/09/2026: frontend React/TypeScript hiện có, mock data đủ để nghiệm thu UI và các luồng. Production-Ready/Enterprise-Grade Frontend Architecture là mục tiêu kiểm chứng theo AI_RULES.md, chưa phải kết quả đã đạt. Kit đặc tả 2.1.1, API2.0.0 và Graphite Gold token2.1 giữ làm nguồn chuẩn.

Ở root repository, đọc AGENTS.md. Trong `../BotSalesAI_Frontend/`, đọc AI_RULES.md nguyên bản, docs/FRONTEND_SCOPE.md, docs/PROJECT_CONTEXT.md, docs/CONTINUE_FRONTEND.md, docs/KNOWN_GAPS.md và evidence/REPORT.md. Tại kit, đọc IMPLEMENTATION_PLAN.md và docs/02,06,18. Khi được giao implement, dùng PROJECT_BUILD_PROMPT_VI.txt và nhận task FE. Giữ source đã có; không port prototype HTML hoặc dựng lại stack.

| Vai trò | Nguồn |
|---|---|
| Kế hoạch đọc | IMPLEMENTATION_PLAN.md — 28 task/140 bước frontend |
| Task/tiến độ chuẩn | execution/frontend-plan.json / frontend-progress.json |
| Phiếu/tiến độ đọc | execution/frontend-tasks/FE*.md / FRONTEND_PROGRESS.md |
| Hướng dẫn sinh | execution/FRONTEND_PLAN_GUIDE.md |
| API/UI | contracts/openapi.json, route-manifest.json, permission-catalog.json, design/tokens.json |
| Full-product ngoài scope | execution/plan.json, progress.json, tasks/T*.md, PROGRESS.* — giữ nguyên, chỉ đọc |

Tại kit chạy `node scripts/progress.mjs validate`, `status`, `next`, `report`. Mặc định tracker chọn frontend. `--full-product validate|status|next` chỉ đọc kế hoạch 84 task/420 bước gốc. Lệnh app là npm scripts ở root frontend; đọc CONTINUE_FRONTEND.md, không chạy pnpm dự kiến từ kit gốc.

Nghiệm thu dùng React build demo thật, browser/contract/component tests và dữ liệu MSW tổng hợp có nhãn. Build production phải tách mocks/seed; chưa có backend thật không chặn nghiệm thu mock frontend. Gap contract hoặc gate frontend chưa đạt vẫn cần giải quyết/ghi rõ; không claim từ số route/tài liệu. Không cần credentials provider thật cho UAT mock và không tự gửi tin/chi tiền/triển khai.

Universal3.1 giữ nguyên. Graphite Gold dark-only ở design/decision.json và tokens.json đã duyệt; không hỏi lại màu hoặc thêm theme. Xem execution/FRONTEND_SCOPE_ADOPTION.md về cách bảo toàn ledger toàn sản phẩm.

**Tiếp tục theo quyết định 04/10/2026:** đọc [scope hiện hành](../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md), [backlog UI + kiến trúc](../BotSalesAI_Frontend/docs/FRONTEND_UI_IMPROVEMENT_PLAN.md) và [hướng dẫn tự thực hiện](../BotSalesAI_Frontend/docs/CONTINUE_FRONTEND.md). AI hoàn thiện code/checks/evidence/handoff trong phạm vi frontend, không đặt owner/manual/hosted CI thành prerequisite giữa chừng; người dùng chỉ nghiệm thu cuối. Tài liệu Backend và tracker T trong kit là tham chiếu, không giao việc xây server cho checkout này.
