# 14 — Kế hoạch triển khai có thể thực thi theo từng bước

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

Nguồn full-product: `../execution/plan.json`, `../execution/progress.json` và `../execution/tasks/T001.md`…`T084.md`, chỉ đọc trong phạm vi frontend. Tổng 14 giai đoạn, 84 task, 420 checkpoint. Mỗi task có dependency rõ, feature IDs, readFirst, vùng sửa, outputs, 5 bước cụ thể và ca từ chối/lỗi. `../IMPLEMENTATION_PLAN.md` hiện là đầu ra của frontend-plan/frontend-progress/FRONTEND_PLAN_GUIDE, gồm FE001–FE028/140 bước; không dùng nó làm bản kế hoạch full-product. Không dùng lại backlog 23 task của v1.1.

## Loop bắt buộc
1. Xác minh source/worktree/tool quyền. Đọc START_HERE, Universal, AI_RULES_PROJECT và task hiện tại.
2. Chạy tracker validate/status/next. next chọn task có mọi dependency được kiểm chứng và không BLOCKED, theo priority. Không tự nhảy task vì màn hình đó dễ.
3. `start TASK OWNER`; đọc actual files/scope, rồi thực hiện từng S01–S05 đúng thứ tự. Nối contract/data/test trước khi làm trang hàng loạt.
4. Ghi evidence JSON/log/source hashes cho mỗi bước đã thực sự đạt; `checkpoint` từ chối thiếu/sai loại/hash/dep.
5. Report tự sinh %; nếu input thiếu thì `block TASK reason`, chọn task độc lập tiếp theo. Không biến mock thành live PASS. Hết phiên thì handoff và lời resume.

## Tiến độ
Một task có checkpoint weights 1/3/2/2/2; task % = tổng trọng số bước VERIFIED còn hiệu lực / 10. Mỗi phase 6 task, weighted equally by checkpoint totals; project % = tổng phase weight × phase verified ratio. Trọng số phase tổng 100%. Đây là tỷ lệ nghiệm thu phạm vi đã lập, không phải ước lượng thời gian hoặc % code lines. STALE/BLOCKED/NOT_STARTED không tự sinh điểm. Done task cũng mất hiệu lực nếu nguồn/hash/dependency thay đổi.

Đặt file tracker JSON và evidence vào version control khi được phép commit. Local lock không khóa tracker ở máy/branch khác. Actual required tests/review remain ground truth; script chỉ giúp phát hiện cập nhật sai cấu trúc/hash và giảm tự báo phần trăm tùy ý.
