# BotSales AI 2.1.1 — bộ dự án đã đồng bộ

Bắt đầu bằng **START_HERE.md**, sau đó **IMPLEMENTATION_PLAN.md**. Không chạy code production từ prototype.

**Phạm vi checkout hiện hành 04/10/2026: chỉ triển khai Frontend React/TS + mock API.** Đọc [scope/tự thực hiện](../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md), [kế hoạch UI + kiến trúc](../BotSalesAI_Frontend/docs/FRONTEND_UI_IMPROVEMENT_PLAN.md) và [tiếp tục](../BotSalesAI_Frontend/docs/CONTINUE_FRONTEND.md). AI làm code/checks/evidence/handoff trước, người dùng nghiệm thu cuối. Backend/full-product dưới đây là đặc tả tham chiếu read-only, không giao việc xây server. Hosted CI/manual/owner không là prerequisite để chuẩn bị bàn giao local; bằng chứng chưa có giữ NOT_RUN, không giả PASS.

Gói hiện hành thay thế 2.1/2.0 cho dự án chưa triển khai (giữ cơ chế kế hoạch nghiệp vụ 2.0): 64 yêu cầu A–H, 54 route đặc tả, 84 task/420 bước triển khai và tiến độ ban đầu 0%. Ngày quyết định/phạm vi tại docs/00. AI_RULES.md Universal 3.1 giữ nguyên; bản riêng ở AI_RULES_PROJECT.md.

## Chỉ cần làm ba việc

1. Copy cả folder vào repo dưới tên `botsales-kit` (không chép đè file quy tắc gốc của repo).
2. Mở AI lập trình có quyền làm việc trong repo, gửi nội dung PROJECT_BUILD_PROMPT_VI.txt.
3. Trong checkout Frontend, xem `execution/FRONTEND_PROGRESS.md`, `IMPLEMENTATION_PLAN.md` và phiếu `execution/frontend-tasks/FE*.md`. Task source là `execution/frontend-plan.json`, ledger `frontend-progress.json`; backlog UI bổ sung ở root docs. `PROGRESS.html` và `tasks/T*.md` theo dõi toàn sản phẩm ngoài scope, không dùng để nhận việc Frontend.

AI tự khảo sát, dùng kế hoạch Frontend trong phạm vi đã giao và cập nhật bằng chứng thật. Tài khoản/chính sách live, chi tiền và phát hành nằm ngoài task Frontend local; không dùng việc thiếu chúng để khóa UI mock. Lỗi kiểm tra thực vẫn cần sửa và ghi đúng. File không tự khởi động AI hoặc duy trì phiên làm việc.

## Nguồn chuẩn và đầu ra sinh

- frontend-plan.json / frontend-progress.json / FRONTEND_PLAN_GUIDE.md → scripts/progress.mjs report (mặc định) → IMPLEMENTATION_PLAN.md, frontend-tasks/FE*.md, FRONTEND_PROGRESS.md, frontend-progress-report.json. Không sửa tay outputs hoặc tăng ledger từ tài liệu.
- plan.json / progress.json / tasks/T*.md / PROGRESS.* / progress-report.json là nguồn và báo cáo toàn sản phẩm read-only tại checkout này. Không chạy --full-product report để thay chúng.
- contracts/openapi.json → scripts/generate-reference.py → openapi.yaml, operation-index.json.
- route-manifest.json + feature-catalog.json → cùng generator → docs/04 và docs/17.
- prototype/src/* → prototype/build.py → prototype/index.html.
- design/tokens.json → scripts/generate-theme.py → design/tokens.css, prototype/src/tokens.*, design/PALETTE.md. MUI bridge sản phẩm triển khai tại T010, không tự edit bảng màu cạnh nguồn.

Đầu ra sinh có thể tái tạo, nhưng tài liệu nguồn/plan không được thay trọng số để làm đẹp tiến độ. Không có file lock phiên bản dependency ứng dụng giả định; T007 kiểm và chốt phiên bản thực trên repo.

## Kiểm tra bộ giao này

Node: `node scripts/validate-kit.mjs`, `node scripts/progress.mjs validate`, `node prototype/test_domain_v2.cjs`. Python tùy chọn: `python scripts/validate_contracts.py`, `python scripts/test_progress.py`, `python prototype/test_browser_v2.py`. Bổ sung kiểm giao diện: `python scripts/generate-theme.py --check`, `python scripts/validate-theme.py`, `python prototype/test_visual.py`. Các bằng chứng tại evidence/ và prototype/evidence/ chỉ có scope tài liệu/công cụ/demo, không phải sản phẩm thật.

Bản 1.1 nén nằm trong reference/ chỉ làm lịch sử. Các core SC-* đã được chuyển v2 trong fixtures/core-acceptance-scenarios.json; file reference cũ không là expectation hiện hành. Quy tắc code và dark-only QA-* giữ dưới governance/, chưa phải lint/CI đã cấu hình trên repo mục tiêu.

## Màu chính thức và phiên bản

Gói **2.1.1** tiếp nhận **Graphite Gold dark-only** đã duyệt trong `design/decision.json`. Token vẫn phiên bản **2.1**, HEX giữ nguyên; API **2.0.0**, phạm vi/kế hoạch nghiệp vụ **2.0**, Universal **3.1** không bị nâng giả chỉ để trùng số phiên bản. `release.json` giải thích từng miền phiên bản.

Đọc `DOCUMENT_INDEX.md` để tìm nguồn chuẩn, `UPGRADE.md` trước thay bộ cũ, và `RELEASE_NOTES.md` để biết điểm đã sửa. Hướng dẫn task đã đồng bộ nhưng không đổi 84 việc/420 bước hoặc cộng tiến độ sản phẩm. Chỉ một kit được chỉ định hiện hành trong repo; archive/reference không là nguồn màu hay kế hoạch đang chạy.

## Sinh lại và kiểm đồng bộ

Các lệnh dưới đây là pipeline bảo trì/phân phối kit, không là bước bắt buộc để AI hoàn thiện UI. Không chạy toàn pipeline hoặc ghi prototype/canonical khi chỉ sửa Frontend. Trong task Frontend dùng root npm run generate:check và kit progress.mjs validate/status/report phù hợp. Khi được giao bảo trì kit riêng, chạy tại kit (Python/Node; YAML dùng dependencies đã ghim):
```bash
python scripts/generate-theme.py
python scripts/generate-reference.py
python scripts/sync-release.py
python prototype/build.py
node scripts/progress.mjs report
python scripts/generate-theme.py --check
python scripts/sync-release.py --check
python scripts/validate-release.py
```
`validate-release.py --distribution` thêm kiểm tracker 0% dành riêng cho ZIP mới; không dùng cờ đó trên repo đã làm dở. Lượt kiểm gói không cộng điểm sản phẩm. Xem evidence/DELIVERY_REPORT_VI.md cho kết quả chạy cụ thể.
