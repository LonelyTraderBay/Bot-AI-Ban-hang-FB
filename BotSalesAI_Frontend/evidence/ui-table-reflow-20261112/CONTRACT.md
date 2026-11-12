# Reflow các bảng còn mở — hợp đồng trước sửa

Baseline: HEAD 10c2505f; working tree đã có thay đổi customers, inbox, shared UI, S17 và evidence accessibility. Giữ nguyên các thay đổi này. Evidence S17 mô tả bảng chỉ đọc và nhiều thao tác vẫn cuộn ngang; test cũ chỉ kiểm cột ghim và khả năng cuộn, không chứng minh reflow.

Đợt đầu giới hạn hai bảng đã có tên và bằng chứng trước: Lịch sử biến động kho (R16, chín cột chỉ đọc) và Nhân sự và quyền truy cập (R32, nhiều thao tác). Chủ sở hữu DataTable giữ cấu trúc bảng, nhãn, thứ tự dữ liệu, render callbacks, quyền và desktop; profile mobile xếp các ô theo hàng, nhãn cột rõ, không thay API/schema. Không thay bảng khác mặc định. Kiểm 320/390/1440, dữ liệu, trạng thái, khả năng dùng nút/điều hướng, không tràn; Chromium và Firefox. Kiểm zoom native, text-only, screen reader và nghiệm thu thủ công vẫn chưa xác minh trừ khi có chứng cứ riêng.
