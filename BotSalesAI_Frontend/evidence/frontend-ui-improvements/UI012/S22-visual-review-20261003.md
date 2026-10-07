# UI012/S22 — Rà soát trực quan các trạng thái UI mẫu

**Ngày:** 03/10/2026 · **Phạm vi:** React demo cục bộ + dữ liệu MSW tổng hợp · **Kết quả:** AI rà soát trực quan trên ảnh chụp giới hạn; không phải biên bản kiểm thử người dùng và không đóng C04.

## Môi trường và bằng chứng

- Chromium 153, viewport 1440×1000 CSS px, device scale factor 1.
- Route R04 Dashboard: ảnh trạng thái mặc định, hover, pointer-down và keyboard focus.
- Route R23 Knowledge: lỗi validation HTTP 422 tổng hợp khi lưu bản nháp; không gọi backend/provider và không ghi dữ liệu bền vững. S22 capture script mở `/s/shop-demo/knowledge`; metadata cũ ghi nhầm R17 (Orders) và đã được sửa sang R23.
- [Capture manifest](S22-visual-state-review-capture.json) ghi kích thước ảnh, focus, tên truy cập suy ra từ DOM, trạng thái lỗi và giới hạn phép đo.
- [Ảnh keyboard focus](S22-overview-keyboard-focus.png), [ảnh hover](S22-overview-hover.png), [ảnh pressed](S22-overview-pressed.png), [ảnh lỗi 422](S22-knowledge-synthetic-422.png) và [accessibility tree](S22-overview-accessibility-tree.yaml).

## Phát hiện

| Mã | Mức | Kết quả có thể quan sát | Hành động tiếp theo |
|---|---|---|---|
| S22-01 | PASS — phạm vi mẫu | Link “Xem việc cần làm” nhận `:focus-visible`; viền focus vàng, liền nét, 2 px (`rgb(255, 219, 140)`) nhìn thấy rõ trong ảnh. | Giữ style hiện tại; xác nhận lại trên các loại control và nền khác khi manual review toàn diện. Đây không phải phép đo contrast độc lập. |
| S22-02 | PASS — phạm vi mẫu | Các control chỉ có icon được kiểm trên R04 có tên nguồn: “Đăng xuất”, “Thông báo”, và ba nút “Sao chép mã đơn hàng”. Không có control rỗng tên trong tập đã lấy. | Bao phủ thêm route/dialog/menu và hỏi screen reader thật để xác nhận cách đọc; dữ liệu tên DOM không xác nhận lời đọc. |
| S22-03 | PASS — trạng thái validation tổng hợp | Dialog có tên “Nguồn kiến thức mới”; alert nhìn thấy nội dung lỗi 422; một field có `aria-invalid=true`; dữ liệu nhập được giữ lại và focus nằm ở field `content`. Không có page error. | Manual keyboard + screen-reader cần xác nhận thứ tự đọc, liên kết lỗi với field, trạng thái sau submit và hành vi đóng/mở dialog. |
| S22-04 | P2 — phản hồi tương tác | Ảnh hover và pointer-down của cùng link có SHA-256 giống nhau (`B3FA0F225C4725C7DBA521194E081E272904CB979685AFD51C75234EC004998D`), nên trong trạng thái đã chụp không thấy khác biệt trực quan giữa hover và pressed. | Cân nhắc trạng thái `:active` riêng, chẳng hạn đổi sắc độ/nền hoặc dịch chuyển rất nhẹ; giữ focus style độc lập. Thêm kiểm tra trạng thái nếu thay đổi. Đây là đề xuất UX, chưa phải lỗi WCAG đã chứng minh. |
| S22-05 | CHƯA XÁC MINH | Accessibility tree và nhãn đọc từ DOM không phải speech output/transcript; lượt này không quan sát Narrator/NVDA hoặc screen reader khác. | Chạy checklist C04 bằng screen reader thực, ghi phiên bản/browser, route, thao tác, speech/transcript, lỗi và ảnh/record được phép lưu. |

## Giới hạn và quyết định tiến độ

Đây là rà soát một control trên R04 và một luồng lỗi tổng hợp trên R23 ở desktop 1440×1000. Nó không đại diện cho toàn bộ 54 route, mọi dialog/menu/select/file input/chart/table, trạng thái lỗi/hover/pressed/icon, zoom, mobile hoặc thiết bị thật. Không đánh giá riêng contrast của viền focus trong lượt này.

S14/S17/S21 vẫn là nguồn đo Chromium zoom và text flow theo phạm vi đã ghi. S22 bổ sung quan sát trực quan, không thay các phép đo ấy và không tạo bằng chứng screen-reader. **UI012 giữ 4/5, C04 PARTIAL; FE-G05 chưa PASS.** Không cập nhật progress ledger vì chưa hoàn tất toàn bộ checkpoint.

**Kiến trúc:** `ARCH: PRESERVED`. Không đổi React source, route, permission, API contract, generated source hay design tokens.
