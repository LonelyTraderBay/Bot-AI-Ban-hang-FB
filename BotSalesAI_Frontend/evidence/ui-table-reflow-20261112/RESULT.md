# Reflow hai bảng S17 — 12/11/2026

Đối chiếu S17 sau PR #20: `ui-remaining-acceptance-20261110` còn OPEN vì các bảng nhiều thao tác và chỉ đọc vẫn cuộn ngang. Source `DataTable` đặt min-width 600–760px; test cũ yêu cầu vùng bảng cuộn. Lượt này chỉ xử lý R16 Lịch sử biến động kho và R32 Nhân sự và quyền truy cập, không phải toàn bộ các bảng còn mở.

Trước sửa, Chromium 320px đo 760px và 600px nội dung bảng trong vùng 286px; `before.log` ghi 2 thất bại và baseline ảnh 320/390/1440. Profile `reflowOnMobile` tại owner xếp ô theo cột dọc trên mobile, hiển thị nhãn từng cột, giữ bảng/header và callback, dữ liệu, quyền và desktop. Bảng nhân sự dùng các nút sẵn có trong ô thao tác, tránh lặp nút chi tiết mobile. Không đổi hợp đồng dữ liệu/API.

`after-first.log` ghi lỗi tràn document 337px do giá trị width 1 được MUI diễn giải thành 100%; đã sửa thành 1px. `after-second.log` đạt 4/4. `browser-regression.log` đạt 20/20 Chromium/Firefox: hai bảng, kiểm kho, tên/fallback và thao tác nhân sự; ảnh từ test cũ đã khôi phục về bản lịch sử. `semantic-final.log` đạt 4/4, kiểm columnheader, row, độ rộng ô và trang tại 320/390/1440; bản mock demo, không kiểm backend. Ảnh before/after nằm cùng thư mục; hash trong `artifact-hashes.json`.

UI verdict: CHƯA XÁC MINH cho toàn bộ yêu cầu: còn nhiều bảng chỉ đọc/nhiều thao tác chưa chuyển hoặc kiểm, chưa phủ đầy đủ các trạng thái/quyền, nội dung dài và ảnh hưởng native zoom 200%, Firefox text-only, screen reader, thiết bị thật và nghiệm thu chủ sở hữu. ARCH verdict giới hạn: không đổi API hoặc schema; các gate source báo theo log riêng, không suy ra nghiệm thu UI. S17 vẫn IN_PROGRESS; các bản ghi cũ giữ nguyên là lịch sử. Không tuyên bố full E2E hoặc CI hosted.
