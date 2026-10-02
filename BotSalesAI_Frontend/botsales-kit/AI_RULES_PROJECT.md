# BotSales AI — policy frontend với mock API

Scope hiện hành theo yêu cầu người dùng 30/09/2026: apps/web, frontend tests/config/tooling và mock API tổng hợp đủ nghiệm thu frontend. Áp dụng root AGENTS.md/AI_RULES.md Universal3.1 nguyên bản. Backend/worker/provider/staging trong docs kit chỉ là đặc tả tham chiếu trong repo này.

Đọc START_HERE.md, IMPLEMENTATION_PLAN.md, execution/SESSION_HANDOFF.md và nguồn task. Task chuẩn: execution/frontend-plan.json; ledger: frontend-progress.json; dùng FE001–FE028. Không nhận T001–T084 hoặc thay execution/progress.json toàn sản phẩm. Kế hoạch/phiếu là đầu ra sinh, không sửa tay.

Quy trình: baseline/quyền/nguồn → Definition of Ready/Change Budget → Complexity Gate nếu liên quan → sửa nhỏ theo contract → Verification Ladder → diff/docs/evidence/handoff → Production Claim Gate. AI tự tìm dữ kiện trong repo; chỉ hỏi quyết định chưa thể xác minh.

Một MUI/theme/Router/Query; module không import module khác, app ghép public entries, shared không nghiệp vụ. Không generic CRUD engine hoặc framework vì dự đoán mở rộng. DTO/routes/tokens sinh từ canonical JSON, không sửa output. Graphite Gold dark-only giữ nguyên.

MSW chỉ demo/test ở lớp HTTP. Dữ liệu tổng hợp/schema-valid, seed/reset/clock/scenarios phủ success/error/permission/shop/version/unknown và các luồng; chạy React/browser thật. Không fixture JSX, provider SDK/secret trong bundle, mock fallback production hoặc thành công giả. Mock service không chứng minh DB/ledger/provider thật.

Production-Ready/Enterprise-Grade Frontend là mục tiêu FE-G01..09 trong IMPLEMENTATION_PLAN.md. Đạt frontend mock không đồng nghĩa toàn hệ thống production. Ghi ĐẠT/CHƯA ĐẠT/CHƯA XÁC MINH/N/A đúng scope; missing/test chưa chạy không PASS. Thiếu backend credentials không chặn UAT mock; thiếu contract/test frontend bắt buộc chặn đúng phần.

Một writer cho shared/router/contracts/tokens/lockfile/CI/ledger. Không tự push/merge/deploy/gửi tin/chi tiền hoặc giả peer review/owner acceptance. Handoff mỗi phiên ghi task/step/revision+diff/log/environment/gaps/next thật.
