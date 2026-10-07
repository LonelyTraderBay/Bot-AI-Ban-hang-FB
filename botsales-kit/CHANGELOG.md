# Canonical release 2.1.1 — 29/09/2026

Tiếp nhận chính thức Graphite Gold, giữ nguyên HEX 2.1; đồng bộ nguồn/plan/task/prompt/governance và phiên bản đầu ra. Không đổi nghiệp vụ/API/trọng số hoặc quyền vận hành. Xem RELEASE_NOTES.md, UPGRADE.md và design/decision.json. Các mục phía dưới là lịch sử.

---

# Visual release 2.1 — 29/09/2026

Đổi bảng màu và phân cấp hiển thị theo yêu cầu Jokertrader: Graphite Gold dark-only. Đồng bộ token chuẩn → CSS → prototype → progress report; làm rõ trạng thái hover/focus/badge, tăng chữ nhỏ và phân sắc icon vai trò. Giữ 64 yêu cầu, 54 route, 210 operation, nghiệp vụ và 84 task/420 checkpoint baseline 2.0; không cộng tiến độ sản phẩm. AI_RULES.md giữ nguyên. Thêm generator theme, báo cáo tương phản và ca thử thị giác. Tài liệu 2.0 ngoài phạm vi thị giác vẫn hiệu lực; reference là lịch sử.

Không phát hành website, không gọi Facebook/AI/Push/Telegram thật, không chứng nhận production hoặc WCAG toàn hệ thống.

---

# 2.0 — 29/09/2026

Phạm vi A01–H08 đã duyệt; giữ dark-only và Universal. Chọn PWA+Telegram; tách bốn vai trò/quyền. Nâng API /api/v2; bổ sung notifications/operations/fulfillment/procurement/journal/COD/approval. Tách dispatch/delivery/cash và trả từng phần. Thay backlog v1 bằng 84 task/420 checkpoint, evidence-linked progress và resume. Demo review nâng trên prototype 1.1.1, không biến thành backend sản phẩm. Live integration, real accounting policy và production chưa thực hiện.

### Khả năng tái lập gói

Thêm execution/evidence/README.md để thư mục ghi bằng chứng không bị mất khi ZIP/Git bỏ thư mục rỗng. Lượt chạy tracker đầu tiên sau giải nén phát hiện thiếu thư mục; không sửa logic tính điểm hoặc tiêu chí test.
