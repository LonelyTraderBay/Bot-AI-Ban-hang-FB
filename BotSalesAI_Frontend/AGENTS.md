# BotSales AI — Frontend
Đọc AI_RULES.md nguyên bản, docs/FRONTEND_SCOPE.md, docs/PROJECT_CONTEXT.md,
../botsales-kit/docs/02_ARCHITECTURE.md, 06_API_AND_REALTIME.md, 18_CODING_STANDARDS.md.
Chỉ source React/TS tại apps/web; không port prototype HTML.
Nguồn chuẩn: ../botsales-kit/contracts/openapi.json, ../botsales-kit/contracts/route-manifest.json và ../botsales-kit/design/tokens.json.
Chạy npm run generate:check; không sửa packages/*/src/generated* bằng tay.
Frontend-only không hoàn thành các gate backend/staging trong tracker toàn dự án.
Không ghi tăng execution/progress.json của kit khi chưa đủ bằng chứng nguyên task.
Mục tiêu hiện hành: frontend với mock API tổng hợp đủ nghiệm thu; phạm vi và tự động hóa theo docs/FRONTEND_SCOPE.md.
Nguồn việc FE là frontend-plan.json; IMPLEMENTATION_PLAN.md là bản sinh để đọc. Backlog UI bổ sung theo docs/FRONTEND_UI_IMPROVEMENT_PLAN.md.
Mọi UI mới/sửa phải đọc và áp dụng [quy trình UI duy nhất](docs/FRONTEND_SPACING_STANDARD.md#unified-workflow), chuẩn v1.28 SPC-001–075. Quy định chi tiết nằm tại nguồn này; không lập checklist, spacing map hoặc quy trình cạnh tranh trong module/skill. Không được bỏ gate, che FAIL/UNKNOWN hoặc ghi DONE thiếu bằng chứng; `npm run verify` bao gồm validator hash/coverage evidence và workflow Frontend ở repo cha.
Đọc [shared catalog CURRENT/TARGET](apps/web/src/shared/ui/README.md) trước khi chọn/mở rộng API. TARGET mô tả invariant/tiêu chí kiểm; phải đối chiếu source/tests để xác định phần đã triển khai. Công việc, dependency và trạng thái nằm duy nhất ở [kế hoạch v16.0 §16](docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan); kết quả/hash/giới hạn ở [evidence hiện hành](evidence/REPORT.md).
Theo workflow, ghi contract/baseline/owner/consumer impact trong evidence của task trước source edit; áp dụng source gates, render/hành vi và phương pháp native resize/zoom theo impact. `npm run verify` gọi layout, visual-token, composition và UI layout-binding regression checks. Source PASS không thay browser proof. Strict FAIL/UNKNOWN hoặc phép thử bắt buộc NOT_RUN không đóng UI. Không tự miễn gate, generic style override, success giả hoặc dùng lịch sử migration để che bằng chứng thiếu.
Task chuẩn: ../botsales-kit/execution/frontend-plan.json; ledger: ../botsales-kit/execution/frontend-progress.json. Tracker mặc định dùng FE001–FE028.
../botsales-kit/execution/plan.json, progress.json và tasks/T*.md là kế hoạch toàn sản phẩm ngoài scope, giữ nguyên và chỉ đọc.
Áp dụng AI_RULES.md nguyên bản; Production-Ready/Enterprise-Grade Frontend chỉ được đề nghị sau các gate FE-G01..09 có bằng chứng.
Một MUI/Query/Router; module không import module khác. MSW chỉ trong chế độ demo.
Đọc evidence/REPORT.md trước tuyên bố kết quả build; không nhận test chưa chạy là PASS. S17 evidence validator là required `verify` gate; local workflow success không tự thành hosted CI/branch protection evidence.
Quyết định 04/10/2026: AI tự triển khai/kiểm thử/tái xác minh/bàn giao trong scope, không chờ owner/manual/hosted CI giữa chừng; người dùng nghiệm thu cuối.
Không tự ghi owner acceptance, screen-reader PASS, hosted CI PASS hoặc tăng điểm chỉ vì đổi kế hoạch. Lỗi thực phải sửa và ghi evidence; không giấu bằng trạng thái DONE.


Người dùng đã chốt review và yêu cầu tiếp tục triển khai quy định UI/shared API theo dependency đến khi hoàn thiện. Tiếp tục source theo plan §16.6, giữ nguyên mọi thay đổi sẵn có trong working tree, không sửa Backend/full-product tracker hoặc ghi acceptance thiếu evidence. S03–S08 chỉ đóng theo phạm vi đã chứng minh; không coi các chỉ dẫn next S06 hoặc “S03–S20 chưa triển khai” trong snapshot cũ là current.
