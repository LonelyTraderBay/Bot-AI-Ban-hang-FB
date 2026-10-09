# Nghiệm thu spacing gọn — dữ liệu mock

Mở bản demo build mới tại http://127.0.0.1:4173. Banner mô phỏng luôn hiện; bấm “Công cụ demo” để mở role/fault/dataset. Thu công cụ giữ lựa chọn và thông báo trạng thái.

1. Products: hàng tìm kiếm cân theo control, bộ lọc nằm ngoài search form; bảng gọn nhưng nút không co vùng bấm. Kiểm320/806/1440px, tìm/clear/phân trang và bảng scroll nội bộ.
2. Nhà cung cấp AI: một card lấp track; danh sách7 capabilities không có khoảng thừa ngoài row inset/divider. Kiểm nhãn dài và mobile.
3. Categories: mở dialog thêm/sửa; gap12, inset16. Dùng Tab/Escape; chỉnh nháp rồi Hủy phải qua guard.
4. Đơn mới: form phức tạp giữ gap16, dòng hàng/địa chỉ không mất nháp hoặc vùng bấm.
5. Knowledge k1: panel nội dung đọc giữ inset16/24; nhóm section độc lập gap24.
6. Inbox: công cụ demo thu mặc định dành thêm chiều cao cho hội thoại. Soạn nhiều dòng, Tab tới gửi, đổi viewport; lịch sử có vùng cuộn riêng.
7. Finance/Shipments/Reports: header→body12 không double inset; biểu đồ/marker16 giữ geometry. Dialog xác nhận giữ comfortable16/24 và guard.

Regression, rendered screenshots, native browser/text200%, full verify/E2E, builds và canonical receipts nằm cùng thư mục này. Trạng thái đạt chỉ được ghi sau thực thi tương ứng. Screen-reader speech, hosted CI và quyết định nghiệm thu của người dùng chưa quan sát; Backend/provider/production ngoài phạm vi.
