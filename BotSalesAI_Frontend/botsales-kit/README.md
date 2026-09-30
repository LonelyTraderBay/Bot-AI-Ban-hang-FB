# BotSales AI 2.1.1 — bộ dự án đã đồng bộ

Bắt đầu bằng **START_HERE.md**, sau đó **IMPLEMENTATION_PLAN.md**. Không chạy code production từ prototype.

Gói hiện hành thay thế 2.1/2.0 cho dự án chưa triển khai (giữ cơ chế kế hoạch nghiệp vụ 2.0): 64 yêu cầu A–H, 54 route đặc tả, 84 task/420 bước triển khai và tiến độ ban đầu 0%. Ngày quyết định/phạm vi tại docs/00. AI_RULES.md Universal 3.1 giữ nguyên; bản riêng ở AI_RULES_PROJECT.md.

## Chỉ cần làm ba việc

1. Copy cả folder vào repo dưới tên `botsales-kit` (không chép đè file quy tắc gốc của repo).
2. Mở AI lập trình có quyền làm việc trong repo, gửi nội dung PROJECT_BUILD_PROMPT_VI.txt.
3. Xem `execution/PROGRESS.html` sau khi AI cập nhật; xem `IMPLEMENTATION_PLAN.md` hoặc phiếu `execution/tasks/Txxx.md` để biết từng bước.

AI tự khảo sát, dùng kế hoạch trong phạm vi đã giao và cập nhật bằng chứng. Tài khoản, chính sách live, quyền chi tiền và phê duyệt phát hành vẫn cần người có thẩm quyền; thiếu thì ghi BLOCKED đúng phần rồi làm việc độc lập. File không tự khởi động AI hoặc duy trì phiên làm việc.

## Nguồn chuẩn và đầu ra sinh

- plan.json / progress.json → scripts/progress.mjs report → IMPLEMENTATION_PLAN.md, tasks/*.md, PROGRESS.md/html, progress-report.json.
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

Chạy tại thư mục kit theo thứ tự (cần Python, Node; phần YAML cần dependencies đã ghim trong scripts/requirements-validation.txt):
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
