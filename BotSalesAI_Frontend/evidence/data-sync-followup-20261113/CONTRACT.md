# Đồng bộ dữ liệu liên trang — hợp đồng và baseline

- Baseline: `a458ea926bf3a54e424f50f7c7b91b5fe096b71f`, nhánh main, working tree sạch; owner: Codex. Phạm vi frontend và MSW demo, không thay API, quyền, backend, token hoặc bố cục.
- P1: ghi/đảo phiếu thu chi chỉ hoàn tất sau command thành công và phải làm mới chi tiết, danh sách, sổ, báo cáo, công nợ và tổng quan liên quan, kể cả khi SSE mất. Trạng thái và nút trong chi tiết phải khớp dữ liệu có thẩm quyền.
- P2: giải quyết hội thoại, tạo/hủy đơn phải làm mới tổng quan; ghi thu/hoàn tiền phải làm mới báo cáo và chứng từ bị ảnh hưởng. Không dựa vào sự kiện SSE để đồng bộ thay đổi của chính người dùng.
- Owner: mutation của module finance, inbox và orders; consumer là R04 tổng quan, R10 inbox, R18/R19 đơn, R20/R21/R22/R48/R49/R50 tài chính và công nợ. Quyền/action/route/state giữ theo route manifest và OpenAPI; giao diện chỉ đổi trạng thái theo dữ liệu, không đổi geometry, shared API hoặc keyboard.
- Baseline đã tái hiện trước lượt này: SSE ngắt, ghi phiếu trả `posted` nhưng detail vẫn nháp; giải quyết hội thoại API 4→3 nhưng R04 hiển thị 4; hủy đơn API 1→0 nhưng R04 hiển thị 1. Kiểm thử hồi quy phải xác minh UI và request có dữ liệu cập nhật, cả post và reverse, cùng luồng liên trang, failure/unknown có sẵn và hai trình duyệt.
- Chụp trước/sau desktop 1440 và mobile 390 cho R04/R10/R19/R21 ở ready state để phát hiện thay đổi render; test hành vi riêng. Native zoom, screen reader, backend thật và nghiệm thu người dùng không suy ra từ ảnh/test mock. S17 giữ IN_PROGRESS.
