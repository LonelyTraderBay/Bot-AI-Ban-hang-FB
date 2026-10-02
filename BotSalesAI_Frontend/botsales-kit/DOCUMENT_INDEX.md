# Bản đồ tài liệu chuẩn 2.1.1

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

Đường dẫn ở đây tính từ gốc kit. Đọc nguồn đúng vai trò; bản tổng hợp, CSS, YAML và báo cáo là đầu ra sinh, không sửa tay thay nguồn.

| Mục đích | Nguồn hiện hành | Cách sử dụng |
|---|---|---|
| Bắt đầu | [START_HERE.md](START_HERE.md) | Cách đặt kit và giao việc |
| Giao AI code | [PROJECT_BUILD_PROMPT_VI.txt](PROJECT_BUILD_PROMPT_VI.txt) | Thực hiện trong repo/công cụ có quyền |
| Kế hoạch frontend | [execution/frontend-plan.json](execution/frontend-plan.json) | FE001–FE028; mock API đủ nghiệm thu frontend |
| Bản kế hoạch để đọc | [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Sinh từ frontend-plan, frontend-progress và FRONTEND_PLAN_GUIDE |
| Tiến độ frontend | [execution/frontend-progress.json](execution/frontend-progress.json) | Chỉ evidence frontend đúng diff mới có điểm |
| Xem tiến độ frontend | [execution/FRONTEND_PROGRESS.md](execution/FRONTEND_PROGRESS.md) | Sinh bằng tracker report mặc định |
| Full-product ngoài scope | [execution/plan.json](execution/plan.json), [progress.json](execution/progress.json) | 84 task/420 bước gốc giữ nguyên, chỉ đọc |
| Tiếp nhận scope | [execution/FRONTEND_SCOPE_ADOPTION.md](execution/FRONTEND_SCOPE_ADOPTION.md) | Quyết định phạm vi và bảo toàn nguồn |
| Màu đã duyệt | [design/decision.json](design/decision.json) | ADR-VIS-021; không mở lại quyết định |
| Giá trị màu | [design/tokens.json](design/tokens.json) | Nguồn HEX/semantic token duy nhất |
| Bảng màu đọc được | [design/PALETTE.md](design/PALETTE.md) | Sinh từ token, không sửa tay |
| MUI mapping | [design/IMPLEMENTATION_NOTES.md](design/IMPLEMENTATION_NOTES.md) | FE006 trước FE007; T010/T011 chỉ là đặc tả gốc |
| Chuẩn AI dùng chung | [AI_RULES.md](AI_RULES.md) | Universal 3.1 nguyên bản |
| Chuẩn dự án | [AI_RULES_PROJECT.md](AI_RULES_PROJECT.md) | Không ghi đè quy tắc gốc repo |
| API hiện hành | [contracts/openapi.json](contracts/openapi.json) | JSON nguồn, YAML/index là output |
| Demo | [prototype/index.html](prototype/index.html) | Chỉ review UI, không phải app production |
| Tiếp nhận bản mới | [UPGRADE.md](UPGRADE.md) | Bảo toàn tiến độ repo đang chạy |
| Kết quả gói | [evidence/DELIVERY_REPORT_VI.md](evidence/DELIVERY_REPORT_VI.md) | Phạm vi kiểm chứng và giới hạn |

## 28 đặc tả nguồn

| File | Nội dung |
|---|---|
| [00_PROVENANCE_AND_DECISIONS.md](docs/00_PROVENANCE_AND_DECISIONS.md) | 00 — Nguồn, phê duyệt và hiệu lực |
| [01_PRODUCT_SCOPE.md](docs/01_PRODUCT_SCOPE.md) | 01 — Phạm vi sản phẩm và 64 chức năng |
| [02_ARCHITECTURE.md](docs/02_ARCHITECTURE.md) | 02 — Kiến trúc được chọn và cấu trúc code |
| [03_DESIGN_SYSTEM.md](docs/03_DESIGN_SYSTEM.md) | 03 — Design system dark-only và tiêu chuẩn trải nghiệm |
| [04_SCREENS_AND_FLOWS.md](docs/04_SCREENS_AND_FLOWS.md) | 04 — Màn hình và luồng hiện hành |
| [05_DOMAIN_AND_INVARIANTS.md](docs/05_DOMAIN_AND_INVARIANTS.md) | 05 — Nguồn dữ liệu, máy trạng thái và bất biến |
| [06_API_AND_REALTIME.md](docs/06_API_AND_REALTIME.md) | 06 — Contract-first API và realtime |
| [07_AI_AND_CHANNELS.md](docs/07_AI_AND_CHANNELS.md) | 07 — Admin AI, dữ liệu và kênh Facebook |
| [08_SECURITY_TENANCY_RBAC.md](docs/08_SECURITY_TENANCY_RBAC.md) | 08 — Bảo mật, phân quyền và quyền tự động |
| [09_STATE_AND_DATA_ACCESS.md](docs/09_STATE_AND_DATA_ACCESS.md) | 09 — State, cache, forms và mô hình dữ liệu UI |
| [10_TESTING_ACCEPTANCE.md](docs/10_TESTING_ACCEPTANCE.md) | 10 — Kiểm thử và tiêu chí nghiệm thu |
| [11_DELIVERY_MULTI_AGENT.md](docs/11_DELIVERY_MULTI_AGENT.md) | 11 — Phối hợp AI và bàn giao không lệch code |
| [12_OPERATIONS_RELEASE.md](docs/12_OPERATIONS_RELEASE.md) | 12 — Hạ tầng, CI/CD và vận hành thực tế |
| [13_EXTENSION_AND_MIGRATION.md](docs/13_EXTENSION_AND_MIGRATION.md) | 13 — Nâng cấp từ 1.1 và mở rộng về sau |
| [14_IMPLEMENTATION_BACKLOG.md](docs/14_IMPLEMENTATION_BACKLOG.md) | 14 — Kế hoạch triển khai có thể thực thi theo từng bước |
| [15_RISKS_DECISION_REGISTER.md](docs/15_RISKS_DECISION_REGISTER.md) | 15 — Rủi ro, dữ kiện còn thiếu và chặn đúng chỗ |
| [16_SOURCES.md](docs/16_SOURCES.md) | 16 — Nguồn và giới hạn chứng cứ |
| [17_TRACEABILITY.md](docs/17_TRACEABILITY.md) | 17 — Truy vết yêu cầu → màn hình → kế hoạch → kiểm thử |
| [18_CODING_STANDARDS.md](docs/18_CODING_STANDARDS.md) | 18 — Chuẩn code thống nhất cho BotSales AI |
| [19_DARK_ONLY_POLICY.md](docs/19_DARK_ONLY_POLICY.md) | 19 — DARK-ONLY: quyết định đã chốt từ nền tảng |
| [20_AI_BOOTSTRAP_AND_ENFORCEMENT.md](docs/20_AI_BOOTSTRAP_AND_ENFORCEMENT.md) | 20 — Cho AI bắt đầu và tiếp tục đúng thứ tự |
| [21_NOTIFICATIONS.md](docs/21_NOTIFICATIONS.md) | 21 — Đơn hàng tới điện thoại: gửi, nhận việc và nhắc hạn |
| [22_FULFILLMENT.md](docs/22_FULFILLMENT.md) | 22 — Lấy hàng, đóng gói, giao và trả từng phần |
| [23_PROCUREMENT.md](docs/23_PROCUREMENT.md) | 23 — Quản lý mua hàng và tự đặt có giới hạn |
| [24_FINANCE.md](docs/24_FINANCE.md) | 24 — Kế toán quản trị, công nợ, COD và lời/lỗ |
| [25_OPERATIONS_AI.md](docs/25_OPERATIONS_AI.md) | 25 — Trưởng nhóm và bốn vai trò vận hành |
| [26_DATA_DICTIONARY.md](docs/26_DATA_DICTIONARY.md) | 26 — Mô hình lưu trữ và ràng buộc triển khai |
| [27_RUNTIME_POLICY.md](docs/27_RUNTIME_POLICY.md) | 27 — Cấu hình live, an toàn mặc định và quyền được giao |

## Một lộ trình sinh, không nhiều nguồn cạnh tranh

`design/tokens.json` → `scripts/generate-theme.py` → CSS, PALETTE và bảng màu trong docs/03. 
`contracts/*.json` → `scripts/generate-reference.py` → YAML/index, docs/04 và docs/17. 
`release.json` + docs nguồn → `scripts/sync-release.py` → metadata, DOCUMENT_INDEX, ARCHITECTURE_BLUEPRINT. 
`execution/plan.json` + progress + PLAN_GUIDE → `node scripts/progress.mjs report` → kế hoạch/phiếu việc/tiến độ. 
`prototype/src/*` + release/token → `prototype/build.py` → prototype/index.html.

Lịch sử nằm trong reference/ và CHANGELOG; mã phiên bản cũ ở đó không có hiệu lực thay thế nguồn hiện hành. Các phiên bản API/token/Universal khác nhau là chủ ý và được khai báo tại release.json.
