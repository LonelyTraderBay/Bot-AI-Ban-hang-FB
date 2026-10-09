# Chẩn đoán helper tái xác minh canonical — 08/10/2026

Hai lỗi helper đã được quan sát trong tool output và sửa trước khi đóng tracker:

- Lượt preflight ban đầu dừng với `Current 88-case simulator/network artifact required`. Artifact thực có 75 simulator và 13 network; tất cả PASS, đúng cách tổng hợp của `scripts/test-domain.mjs`. Helper đã kiểm riêng hai nhóm và từng kết quả; không đổi artifact, test hoặc ngưỡng.
- Lượt `r1` qua 140 preflight, ghi FE001–FE006 rồi CLI từ chối `start FE007` với `Task not ready`. `frontend-plan.json` đặt FE007 trước FE008 trong mảng nhưng FE007 phụ thuộc FE008. Helper đã chuyển sang thứ tự topo theo `dependsOn`, giữ CLI kiểm dependency. Log thất bại `canonical-revalidation-r1.log` và các receipt r1 giữ nguyên; lượt phục hồi dùng r3 mới, không ghi đè receipt đã dùng.

Các lượt này không được nhận là canonical PASS. Chỉ record hoàn tất, 140/140, stale 0, blocked 0 và protected drift 0 được dùng để bàn giao.
