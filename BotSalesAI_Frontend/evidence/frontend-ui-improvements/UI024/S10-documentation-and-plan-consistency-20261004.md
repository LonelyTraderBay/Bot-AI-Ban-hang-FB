# Kiểm tra tính nhất quán của kế hoạch và tài liệu Frontend — 04/10/2026

## Kết luận có phạm vi

Các tài liệu active chốt phạm vi triển khai trong `BotSalesAI_Frontend` là React/TypeScript Frontend với synthetic mock API, tests và tooling. Không có task xây Backend, database, worker, staging hoặc production service trong phạm vi checkout. Tài liệu kit về toàn sản phẩm/backend giữ vai trò hợp đồng và tham chiếu chỉ đọc theo `AGENTS.md`/`FRONTEND_SCOPE.md`.

Backlog trong `docs/FRONTEND_UI_IMPROVEMENT_PLAN.md` có **26/26 item DONE, 130/130 checkpoint, 0 item BLOCKED**. Đã đối chiếu 26 hàng tổng với 26 phiếu chi tiết; mọi phiếu đều mang trạng thái DONE. Kế hoạch UI ở `READY_FOR_ACCEPTANCE`.

Tracker canonical FE001–FE028 là mẫu số riêng: `progress.mjs validate` xác nhận 28 task/140 checkpoint hợp lệ; `progress.mjs status` báo **0/140 VERIFIED, 28 STALE, `blocked=[]`**. Hash/source drift khiến evidence cũ không còn hiệu lực; kết quả 26/26 UI không được dùng để thay bằng chứng từng task FE. Không có task hiện hành bị BLOCKED. Nếu tiếp tục khẳng định toàn bộ tracker FE đã kiểm chứng, việc revalidation vẫn là công việc tự động của AI theo dependency.

## Mâu thuẫn đã tìm thấy và xử lý

| Phát hiện | Cách xử lý |
|---|---|
| Bảng tổng UI báo DONE nhưng tiêu đề chi tiết UI014 vẫn TODO và UI017 vẫn IN_PROGRESS | Cập nhật hai phiếu theo acceptance S06, đồng bộ 26/26 và 130/130 |
| Bảng automation còn liệt kê UI012/UI022/UI023/UI024 là công việc đang mở | Thay bằng trạng thái đã chạy và link evidence; ghi các giới hạn speech, hosted CI, owner decision đúng phạm vi |
| README, project context, known gaps, continue guide, report, handoff và DELIVERY có snapshot progress/runtime cũ | Đồng bộ đoạn hiện hành theo S39/S40/S47, UI022/S27, UI023/S01–S02, UI024/S45/S09; lịch sử được giữ và gắn nhãn riêng |
| Root GitHub workflow chỉ cài Chromium trong khi Playwright cấu hình Chromium + Firefox | Sửa workflow, kiểm YAML, project/install parity và Playwright browser package dry-run; chi tiết UI022/S27 |
| Dễ gộp 100% UI với trạng thái readiness hoặc FE ledger | Nêu rõ 26/26 UI, 7/9 readiness và 0/140 VERIFIED FE ở các dòng riêng; không tăng ledger |

## Kiểm chứng trong lượt hoàn thiện

| Kiểm tra | Kết quả |
|---|---|
| Backlog UI: bảng trạng thái và phiếu chi tiết | 26 hàng; 26 DONE; 130/130 checkpoint; 0 BLOCKED; 26/26 phiếu chi tiết DONE |
| Frontend tracker `validate` | PASS: 28 task/140 checkpoint hợp lệ; kiểm cấu trúc, không chạy product tests |
| Frontend tracker `status` | 0/140 VERIFIED; 28 STALE; `blocked=[]` |
| `npm.cmd run generate:check` | PASS: 11 outputs, 283 schemas, 210 operations, 54 routes. PATH được rút gọn trong tiến trình PowerShell để npm child process tìm Node; không đổi PATH hệ thống |
| Liên kết Markdown trong 9 tài liệu active | 627 liên kết; 0 thiếu |
| Whitespace và `DELIVERY.json` | 0 trailing whitespace; JSON PASS |
| Runtime liên quan tới gói UI | S39 verify; S40 E2E 388/388; S41 keyboard 18/18; S42 actual browser zoom; S44 target geometry; S46 text-flow; UI023 UAT 146/146. Kết quả/giới hạn có trong S47, UI022/S27 và UI023/S02 |

## Giới hạn không được suy rộng

S39/S40/technical UAT là Windows local trên React demo và synthetic MSW. Hosted GitHub CI, speech transcript/human conformance review, quyết định acceptance cuối, Backend/provider, staging và production không được ghi PASS. FE-G05 còn partial, FE-G09 chờ quyết định người dùng, readiness giữ **7/9**. Đây là kiểm tra tài liệu/tracker cùng bằng chứng Frontend, không phải Production-Ready/Enterprise-Grade certification.

Tài liệu active đồng bộ: `README.md`, `DELIVERY.json`, `docs/FRONTEND_UI_IMPROVEMENT_PLAN.md`, `docs/FRONTEND_SCOPE.md`, `docs/PROJECT_CONTEXT.md`, `docs/CONTINUE_FRONTEND.md`, `docs/KNOWN_GAPS.md`, `evidence/REPORT.md`, `botsales-kit/execution/SESSION_HANDOFF.md`.
