# BotSales AI — Frontend
Đọc AI_RULES.md nguyên bản, docs/FRONTEND_SCOPE.md, docs/PROJECT_CONTEXT.md,
botsales-kit/docs/02_ARCHITECTURE.md, 06_API_AND_REALTIME.md, 18_CODING_STANDARDS.md.
Chỉ source React/TS tại apps/web; không port prototype HTML.
Nguồn chuẩn: botsales-kit/contracts/openapi.json, route-manifest.json và design/tokens.json.
Chạy npm run generate:check; không sửa packages/*/src/generated* bằng tay.
Frontend-only không hoàn thành các gate backend/staging trong tracker toàn dự án.
Không ghi tăng execution/progress.json của kit khi chưa đủ bằng chứng nguyên task.
Mục tiêu hiện hành: frontend với mock API tổng hợp đủ nghiệm thu, theo botsales-kit/IMPLEMENTATION_PLAN.md.
Task chuẩn: botsales-kit/execution/frontend-plan.json; ledger: botsales-kit/execution/frontend-progress.json. Tracker mặc định dùng FE001–FE028.
botsales-kit/execution/plan.json, progress.json và tasks/T*.md là kế hoạch toàn sản phẩm ngoài scope, giữ nguyên và chỉ đọc.
Áp dụng AI_RULES.md nguyên bản; Production-Ready/Enterprise-Grade Frontend chỉ được đề nghị sau các gate FE-G01..09 có bằng chứng.
Một MUI/Query/Router; module không import module khác. MSW chỉ trong chế độ demo.
Đọc evidence/REPORT.md trước tuyên bố kết quả build; không nhận test chưa chạy là PASS.
