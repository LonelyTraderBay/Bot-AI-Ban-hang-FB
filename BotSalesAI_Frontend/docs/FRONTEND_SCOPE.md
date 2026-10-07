# Phạm vi và thực hiện tự động của dự án Frontend

**Phạm vi hiện hành:** React/TypeScript Frontend trong `apps/web`, với API mock tổng hợp cho demo/test. Trạng thái, thứ tự và bằng chứng triển khai chỉ lấy từ [plan §16.6](FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan); tài liệu scope này không giữ bản sao trạng thái S-step. Giữ Frontend-only và không cập nhật FE/full-product ledger nếu thiếu evidence nguyên task.

Chính sách phạm vi: mọi công việc sản phẩm trong `BotSalesAI_Frontend` là React/TypeScript Frontend với API mock tổng hợp; AI tự triển khai, kiểm thử và chuẩn bị hồ sơ để người dùng nghiệm thu cuối theo quyết định 04/10/2026. UI dùng [workflow duy nhất v1.28](FRONTEND_SPACING_STANDARD.md#unified-workflow), SPC-001–075, và [shared catalog CURRENT/TARGET](../apps/web/src/shared/ui/README.md). File này giữ thẩm quyền phạm vi/tự thực hiện; không một checklist UI hoặc nguồn token thứ hai; mandatory verify/evidence gates không được skip hoặc waiver để giả PASS.

## 1. Phạm vi có hiệu lực

**Current status:** AI tự triển khai, kiểm thử và chuẩn bị hồ sơ nghiệm thu theo dependency trong §16.6. Không chờ Backend/owner/hosted CI giữa chừng; gate scoped không được coi là full UI acceptance.

Công việc và thứ tự kỹ thuật lấy từ [plan v16.0 §16](FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan); current status/evidence are recorded per S-step. Không ghi checkpoint/PASS từ policy hoặc dùng current source scan để nhận enforcement100%.

- Sản phẩm triển khai: `apps/web`; test, mock HTTP, generator, packages contracts/tokens và cấu hình phục vụ app Frontend. Kiểm tra hiện tại có `apps/web`; không có `apps/api`, `apps/worker` hoặc `infra` triển khai sản phẩm.
- Frontend dùng một MUI/theme, TanStack Query, Router, RHF/Zod và i18next. App ghép public entries; module không import module khác; shared không import app/modules/mocks. Không port prototype HTML.
- API chuẩn: `../botsales-kit/contracts/openapi.json`, route/permission/event contracts và `design/tokens.json`. Generated output phải sinh bằng generator; không sửa tay để né contract. MSW chỉ demo/test, dữ liệu tổng hợp và có nhãn. Production artifact không chứa seed/worker/fallback demo.
- Kit vẫn chứa đặc tả toàn sản phẩm, Backend và lịch sử. Chúng mô tả giao tiếp, bất biến và UI cần hiển thị; **không giao việc xây server cho checkout này**. `execution/plan.json`, `progress.json`, `tasks/T*.md`, `PROGRESS.*` và full-product reports chỉ đọc. T-ID trong `sourceTaskIds` là truy vết, không là dependency Frontend.
- Ngoài phạm vi: Backend/DB/worker thật, migrations/restore/tải server, OIDC/Meta/AI/carrier/supplier/Push/Telegram thật, backend staging, hosting/deploy. `dev:live` là chế độ client để tích hợp sau này, không là task dựng Backend.

## 2. Một nguồn cho mỗi vai trò

| Vai trò | Nguồn có hiệu lực |
|---|---|
| Quy tắc chung | `AI_RULES.md` nguyên bản; giữ cả bản root/kit byte-identical |
| Phạm vi và chính sách tự thực hiện | File này; quyết định 04/10/2026 |
| Task FE001–FE028 / ledger | `../botsales-kit/execution/frontend-plan.json` / `frontend-progress.json` |
| Quy trình và tiêu chí FE-G01..09 | `../botsales-kit/execution/FRONTEND_PLAN_GUIDE.md` |
| Bản đọc sinh tự động | `../botsales-kit/IMPLEMENTATION_PLAN.md`, `frontend-tasks/FE*.md`, `FRONTEND_PROGRESS.md`, `frontend-progress-report.json` |
| Backlog UI + kiến trúc bổ sung | [FRONTEND_UI_IMPROVEMENT_PLAN v16.0 §16](FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan), cùng backlog UI hiện có; không tạo ledger chép tay |
| Quy tắc/UI workflow | [FRONTEND_SPACING_STANDARD v1.28](FRONTEND_SPACING_STANDARD.md#unified-workflow), SPC-001–075; nguồn normative duy nhất. [Shared catalog](../apps/web/src/shared/ui/README.md) giải thích CURRENT/TARGET API, không nguồn rule/scale mới. |
| Bằng chứng thực / tiếp tục | `evidence/REPORT.md`, `docs/CONTINUE_FRONTEND.md`; luôn đối chiếu source/artifact hashes |
| Audit toàn bộ tài liệu | Mục 12 của kế hoạch UI và inventory từng file trong `evidence/frontend-scope-automation-audit-20261004/` |

## 3. AI tự làm đến bàn giao, không có bước chờ người dùng giữa chừng

1. Xác minh baseline/diff và nhận việc; tự tìm input trong repo. Không hỏi lại palette, browser matrix, FE017 mock permission hay ngoại lệ scanner đã được người dùng duyệt.
2. Sửa UI và ownership/invariant kiến trúc trong cùng ID. Chạy checks phù hợp, xử lý lỗi, thêm regression có ý nghĩa và cập nhật evidence đúng diff. Thiếu toolchain cục bộ được AI khắc phục trong scope; không biến thành việc người dùng phải cài/chạy thay.
3. UI012: hoàn thiện browser/keyboard/axe/zoom/contrast/semantic/visual coverage có thể kiểm chứng tự động. Screen-reader speech và human review chưa quan sát được phải ghi `NOT_RUN`/giới hạn; không yêu cầu người dùng thực hiện giữa chừng, không coi DOM là speech PASS.
4. UI022: hoàn thiện workflow và tái lập clean local checks. FE-G08 đã cho phép **CI hoặc clean local tương đương**. Hosted run, publish workflow và credentials GitHub không là prerequisite bàn giao Frontend. Chưa chạy hosted CI ghi `NOT_RUN`; cấu hình có lỗi phải sửa, không dùng thay đổi phạm vi để bỏ lỗi cấu hình.
5. UI023: AI chạy UAT kỹ thuật trên demo, lập case/result/issues/ngoại lệ, chuẩn bị hồ sơ để người dùng xem một lần cuối. Không chờ owner UAT trước khi nhận việc. AI không điền thay quyết định nghiệm thu của người dùng.
6. UI024: AI chốt fingerprint, artifact, gate matrix, hướng dẫn run/reset/thay API, báo cáo rủi ro và handoff; không chờ hosted CI hoặc owner ký trước khi chuẩn bị bàn giao. Bàn giao ở mức `READY_FOR_ACCEPTANCE`; nghiệm thu thật được ghi sau câu trả lời của người dùng.
7. Revalidate task FE `STALE` theo dependency bằng script canonical và bằng chứng nguyên task. Không cộng điểm từ số dòng tài liệu, UI DONE hoặc log không bao phủ acceptance FE. Không checkpoint toàn sản phẩm.

Không có dependency bắt buộc vào Backend, tài khoản provider, remote publication, người kiểm screen reader hay owner sign-off để AI **thực hiện và chuẩn bị bàn giao**. Dependency kỹ thuật giữa các task và kiểm tra tính đúng vẫn giữ nguyên.

## 4. Trạng thái và tính trung thực

Tại lượt chốt 04/10, tracker FE có **140/140 checkpoint VERIFIED, 28/28 task DONE, `blocked=[]`, `stale=[]` và không còn task tiếp theo**. Backlog UI riêng có **26/26 item, 130/130 checkpoint**; hai tracker giữ mẫu số riêng. Scope là Frontend React/TypeScript với API mock tổng hợp, không phải Backend hoặc toàn sản phẩm.

**HISTORICAL_SNAPSHOT:** số FE 04/10 ở đoạn trước chỉ mô tả thời điểm đó. Các lượt source/shared UI/policy sau đó có evidence riêng và có thể làm FE dependency stale; không suy backlog/FE hiện tại hoàn tất từ snapshot. UI rollout theo dõi tại §16.6: S03–S08 đã đóng scoped, S09 đang chạy, S10–S20 còn mở. Đọc canonical FE tracker để lấy FE status/next; không dùng UI plan để cộng điểm FE. Người dùng nghiệm thu cuối, AI không ghi acceptance thay.

Không tạo trạng thái BLOCKED để chờ owner, Backend hoặc hosted CI. Lỗi kỹ thuật thực phải được ghi, sửa và kiểm lại; nếu bất khả thi trong quyền/công cụ hiện có thì báo đúng phần thiếu, tiếp tục phần độc lập. Không thể đảm bảo mọi lần chạy tương lai không lỗi, không giả PASS hay tắt gate để đáp ứng một con số.

Phân biệt ba mốc: **hoàn tất việc AI có thể tự kiểm chứng**; **hồ sơ sẵn sàng nghiệm thu**; **người dùng đã nghiệm thu**. `READY_FOR_ACCEPTANCE` không là acceptance hoặc certification. Rubric snapshot 04/10 ghi 7/9; FE-G05 speech/human và FE-G09 owner acceptance chưa được lượt audit này xác minh. Đọc evidence/source freshness trước mọi claim hiện hành. Đây không tạo task `BLOCKED`, nhưng cũng không cho phép claim 9/9 hay Production-Ready/Enterprise-Grade.

## 5. Các quyết định đã có

Frontend-only/mock được duyệt 30/09; Backend/provider thật không chặn UI mock. FE017 được phép dùng `knowledge.publish` + lifecycle, không thêm `Knowledge.allowedActions` vào schema. UI020 desktop Chrome ≥154 / Firefox ≥155 đã được duyệt; Edge/Safari/physical mobile best effort, PWA install/OS push ngoài scope đã chọn. UI021 có accepted-review exception cho 13 findings; scanner exit 1 vẫn giữ đúng. Quyết định tự thực hiện 04/10 thay các prerequisite owner/manual/hosted của kế hoạch cũ; không sửa kết quả lịch sử.

Không có quyền mới để commit/push/merge/deploy, gửi tin thật, chi tiền, đổi canonical API/palette hoặc ghi owner approval. Việc này không cần những thao tác đó để hoàn tất hồ sơ Frontend local.
