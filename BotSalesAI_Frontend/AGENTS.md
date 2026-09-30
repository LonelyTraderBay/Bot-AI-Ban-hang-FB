# BotSales AI — Frontend
Đọc AI_RULES.md nguyên bản, docs/FRONTEND_SCOPE.md, docs/PROJECT_CONTEXT.md,
botsales-kit/docs/02_ARCHITECTURE.md, 06_API_AND_REALTIME.md, 18_CODING_STANDARDS.md.
Chỉ source React/TS tại apps/web; không port prototype HTML.
Nguồn chuẩn: botsales-kit/contracts/openapi.json, route-manifest.json và design/tokens.json.
Chạy npm run generate:check; không sửa packages/*/src/generated* bằng tay.
Frontend-only không hoàn thành các gate backend/staging trong tracker toàn dự án.
Không ghi tăng execution/progress.json của kit khi chưa đủ bằng chứng nguyên task.
Một MUI/Query/Router; module không import module khác. MSW chỉ trong chế độ demo.
Đọc evidence/REPORT.md trước tuyên bố kết quả build; không nhận test chưa chạy là PASS.
