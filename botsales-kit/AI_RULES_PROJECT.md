# BotSales AI — policy frontend với mock API

Scope hiện hành theo yêu cầu người dùng 30/09/2026: apps/web, frontend tests/config/tooling và mock API tổng hợp đủ nghiệm thu frontend. Áp dụng root AGENTS.md/AI_RULES.md Universal3.1 nguyên bản. Backend/worker/provider/staging trong docs kit chỉ là đặc tả tham chiếu trong repo này.

Đọc START_HERE.md, IMPLEMENTATION_PLAN.md, execution/SESSION_HANDOFF.md và nguồn task. Task chuẩn: execution/frontend-plan.json; ledger: frontend-progress.json; dùng FE001–FE028. Không nhận T001–T084 hoặc thay execution/progress.json toàn sản phẩm. Kế hoạch/phiếu là đầu ra sinh, không sửa tay.

Quy tắc quyết định chung theo original `AI_RULES.md`; AI tự tìm dữ kiện trong repo và chỉ hỏi quyết định chưa thể xác minh. Với UI Frontend, áp dụng [workflow duy nhất](../BotSalesAI_Frontend/docs/FRONTEND_SPACING_STANDARD.md#unified-workflow), v1.28 SPC-001–075; không tạo quy trình/checklist cạnh tranh trong kit. Không được skip required `npm run verify`, che stale/failing evidence hoặc đánh dấu task hoàn thành thiếu coverage.

Một MUI/theme/Router/Query; module không import module khác, app ghép public entries, shared không nghiệp vụ. Không generic CRUD engine hoặc framework vì dự đoán mở rộng. DTO/routes/tokens sinh từ canonical JSON, không sửa output. Graphite Gold dark-only giữ nguyên.

MSW chỉ demo/test ở lớp HTTP. Dữ liệu tổng hợp/schema-valid, seed/reset/clock/scenarios phủ success/error/permission/shop/version/unknown và các luồng; chạy React/browser thật. Không fixture JSX, provider SDK/secret trong bundle, mock fallback production hoặc thành công giả. Mock service không chứng minh DB/ledger/provider thật.

Production-Ready/Enterprise-Grade Frontend là mục tiêu FE-G01..09 trong IMPLEMENTATION_PLAN.md. Đạt frontend mock không đồng nghĩa toàn hệ thống production. Ghi ĐẠT/CHƯA ĐẠT/CHƯA XÁC MINH/N/A đúng scope; missing/test chưa chạy không PASS. Thiếu backend credentials không chặn UAT mock; thiếu contract/test frontend bắt buộc chặn đúng phần.

Một writer cho shared/router/contracts/tokens/lockfile/CI/ledger. Không tự push/merge/deploy/gửi tin/chi tiền hoặc giả peer review/owner acceptance. Handoff mỗi phiên ghi task/step/revision+diff/log/environment/gaps/next thật.

Quyết định 04/10/2026: thực hiện tự động đến hồ sơ bàn giao frontend; chỉ người dùng nghiệm thu cuối. Đọc `../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md` và `../BotSalesAI_Frontend/docs/FRONTEND_UI_IMPROVEMENT_PLAN.md` để áp dụng đúng luồng UI012/022/023/024. Không chờ người dùng chạy screen reader, chọn lại matrix đã duyệt hoặc publish workflow giữa chừng. Clean local checks là bằng chứng frontend được FE-G08 cho phép; chưa chạy hosted CI vẫn ghi NOT_RUN. FE-G05 manual và FE-G09 acceptance chưa có không được nhận PASS, nhưng không ngăn AI chuẩn bị và hoàn tất phần việc tự động.

Đường vào UI hiện hành: [catalog CURRENT/TARGET](../BotSalesAI_Frontend/apps/web/src/shared/ui/README.md), [plan v16.0 §16](../BotSalesAI_Frontend/docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan), [report hợp nhất](../BotSalesAI_Frontend/evidence/frontend-ui-improvements/ui-governance-unified-20261006/REPORT.md), và [evidence rollout hiện hành](../BotSalesAI_Frontend/evidence/REPORT.md). Review quy định/thứ tự ban đầu được lưu tại [§16.17](../BotSalesAI_Frontend/docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#preimplementation-review-20261007); source rollout tiếp tục tự động theo dependency Frontend. S09, S11, S12 và S15 có scoped closeouts; S10 API consumer/render và S14 catalog lifecycle đang mở. S18 đã nối binding regression vào `test:layout`/`verify`; bước hiện hành duy nhất xem trong §16.6. Strict FAIL/UNKNOWN hoặc kiểm chứng bắt buộc NOT_RUN không đóng UI; policy/specification hoàn tất không là runtime PASS hoặc checkpoint mới.
