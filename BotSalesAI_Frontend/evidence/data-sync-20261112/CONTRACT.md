# Đồng bộ dữ liệu và tổ chức mã — baseline

- Baseline Git: `60900d41a90799e8f6d43e24f31989a50cb5956c`; working tree sạch trước lượt này. Owner thực hiện: Codex. Phạm vi: frontend/MSW; không thay contract, backend, token, quyền hay cấu trúc thị giác.
- P1: Khi bút toán thay đổi, dashboard phải được đánh dấu cũ để đọc lại từ API; ghi/đảo bút toán cũng làm mới dashboard khi stream mất. Không suy thành công khi command chưa hoàn tất.
- P2: Đồng bộ đầy đủ do reconnect, gap, resync hoặc event không hợp lệ phải làm mới cả cache scoped và bản shop của Shell; event có ảnh hưởng `getShop` phải làm mới cả hai key. Không làm mới shop khác hoặc principal khác.
- Tổ chức: tách trang bút toán R48 khỏi finance/index thành file nội bộ module; giữ public export, route, state, actions, quyền và shared UI hiện tại.
- Consumers: ScopeEvents và toàn bộ route shop (event/cache); R04 dashboard; R33 shop settings và Shell; R48 journals; các báo cáo tài chính. Không đổi geometry, tokens hay shared UI API. Kiểm baseline render R04/R33/R48 desktop/mobile trước source edit, regression hành vi và các luồng liên trang trên demo, source gates và verify; các native zoom/screen reader/hosted/backend không tự nhận PASS.
- Source baseline: Git HEAD ở trên; captured screenshots được sinh trước source edit. Kết quả thực và giới hạn ghi riêng sau khi chạy; không cập nhật tiến độ hoặc acceptance tự động.
