# 20 — Cho AI bắt đầu và tiếp tục đúng thứ tự

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Cách đặt vào repo
Trong repository hiện hành, giữ `botsales-kit/` và `BotSalesAI_Frontend/` cạnh nhau dưới repository root. Tài liệu canonical nằm trong kit; React source nằm tại `BotSalesAI_Frontend/apps/web`. Không tạo bản kit nested trong workspace. Không chạy app bằng prototype/index.html rồi coi đó là sản phẩm. Không overwrite root AGENTS/AI_RULES nếu đang có; loader snippet chỉ tham chiếu tới kit. Không sửa Universal.

Chủ repo giao câu lệnh ở PROJECT_BUILD_PROMPT_VI.txt cho AI có công cụ đọc/ghi/chạy test. File tự nó không chạy, không cấp credentials hay kéo dài phiên. Trong phạm vi frontend, AI đọc `execution/frontend-plan.json`, `frontend-progress.json` và `next`, tiếp nhận FE001 hoặc bước đủ dependency; không tiếp nhận T001–T084 hay cập nhật full-product ledger. Không dừng ở tóm tắt kế hoạch khi được giao implement; cũng không vượt gate live vì muốn tự làm tất cả.

## Nguồn và lệnh
FE001 xác định repository/workspace root và source binding hiện có; không bind lại ledger đã có VERIFIED evidence. Lệnh tracker chạy trong folder kit. Lệnh app chạy trong `BotSalesAI_Frontend`; command map hiện hành là `execution/frontend-command-map.json`. Kiểm package/scripts và lệnh thật trước khi sử dụng; `execution/command-map.json` thuộc full-product reference. Không copy bừa lệnh hoặc báo PASS khi chưa chạy.

## Evidence
Dùng templates/CHECKPOINT_EVIDENCE.json làm shape, thay bằng actual outputs/source digest. Lưu log trực tiếp và test count; không tự viết nội dung output như thể test đã chạy. Chỉ ghi sourceFiles thật thuộc repo root; expected/observed phải đối chiếu bước task. Checkpoint evidence không được dẫn vào old HTML để pass React/Nest tasks. Mỗi bước update sinh báo cáo tiến độ mới. Missing evidence -> chưa đạt; stale file -> reverify impacted task.

## Khi thay phiên
Đọc root instructions, kit START_HERE/Universal/lộ trình, SESSION_HANDOFF, tracker next và code tác vụ. Kiểm source/plan hash và outstanding diffs trước tiếp. Không restart toàn dự án, không tạo task thứ hai cho cùng ID, không nhân bản rules thành bản riêng từng AI. Commit/merge/đưa live chỉ khi nhiệm vụ thực có quyền đó.

## Tiếp nhận quyết định màu và nâng gói

Root loader phải tham chiếu đúng một kit hiện hành. Trước UI, đọc `design/decision.json`, docs/03,19 và design/IMPLEMENTATION_NOTES.md; không tự chọn bảng màu khác. Hướng dẫn gói ở `release.json`, nguồn màu chỉ ở `design/tokens.json`. Repo có tiến độ đi qua `UPGRADE.md`, không dùng tracker 0% của ZIP để ghi đè. Chạy `python scripts/validate-release.py` để kiểm gói, không suy kết quả này thành CI sản phẩm đã cấu hình.
