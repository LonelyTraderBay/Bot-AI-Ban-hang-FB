# Nghiệm thu Shared UI — 09/10/2026

Phạm vi: React Frontend + MSW tổng hợp local. Kết quả kỹ thuật và source fingerprints ở REPORT.md / S19-current-evidence.json. Nghiệm thu người dùng PENDING; không có Backend/provider thật, hosted CI, production hoặc screen-reader speech proof.

## Thứ tự xem thực tế

1. Mở `http://127.0.0.1:4173/s/shop-demo/inbox`. Kiểm search và bốn bộ lọc cùng lề, mỗi dòng co theo pane; chọn chế độ/trạng thái/kênh/nhân viên, kiểm URL và kết quả. Search/clear giữ các filter.
2. Mở một hội thoại; nhập bản nháp, thao tác filter/search hoặc chờ cập nhật. Nội dung nháp còn nguyên. List cursor dùng listCursor; message paging dùng cursor. Back về list khôi phục page riêng; rời route có nháp vẫn hỏi theo guard hiện có.
3. Thử viewport 320/390/768/1280/1440. Detail ẩn list trên màn hẹp và có Back. Ở desktop list pane 300px vẫn giữ controls trong vùng lọc.
4. Dùng Tab/Enter chọn filter và mở conversation. Với preview có dấu “…”, mở chi tiết đọc đầy đủ; text-only 200% và browser zoom 200% là hai phép thử riêng.
5. Mở `http://127.0.0.1:4173/s/shop-demo/overview`. Owner thấy “Xem việc cần làm”; quyền orders.read khi thiếu operations.read dùng “Xem đơn hàng”. Tạo đơn chỉ theo orders.write. Tám tuple được kiểm bằng fixture session canonical trong regression, vì role demo có thể không tạo đủ mọi tuple logic.
6. Tab tới CTA, kiểm focus và kích thước thao tác; Ctrl+click mở tab mới. Hero/KPI/pause/query vẫn theo owner hiện có.
7. Mở `/s/shop-demo/products/new` và `/s/shop-demo/products/p1`. Trong “Biến thể và giá”, kiểm SKU/tên/giá ở 320/390/1280/1440 và text-only 200%: ô tên còn đọc/nhập được, hàng xuống dòng khi thiếu chỗ. Nhập bản nháp, thêm rồi xóa biến thể mới; nội dung biến thể cũ được giữ.
8. Nhãn outlined nằm phía trên control, nhãn dài tự xuống dòng và không chồng giá trị. Browser zoom và text-only zoom có bằng chứng riêng; hai trang đăng nhập/workspace không có TextField trong trạng thái mặc định được ghi số nhãn 0, không nhận là kiểm tra trường nhập chưa render.
9. Ở Inbox detail rộng1600px, bật ghi chú nội bộ, nhập9 dòng và tăng cỡ chữ200%. Vùng lịch sử co trong khung và còn đọc được ít nhất một dòng tin; bản nháp còn nguyên, Phần nhập liệu cuộn riêng, nút lưu luôn nằm trong vùng action; Tab tới nút, Shift+Tab trở lại textarea và nháp còn nguyên. Không bấm lưu nếu chỉ muốn kiểm tra bố cục. Với danh mục có dấu “…”, Enter mở menu để đọc toàn bộ lựa chọn; Escape đóng và giữ giá trị/focus.

## Đọc bằng chứng

- Before screenshot có từ trước source edit; structural red được giữ riêng. Không gọi một capture mặc định là proof tất cả business state.
- Metadata pending/error/empty/recovery có HTTP response và draft assertions trong suite FE016; suite Inbox hiện có giữ URL/cursor/scope/unknown-send coverage.
- Bản demo phải có HTML hash khớp dist-demo hiện hành; compiled review và full Chromium/Firefox run độc lập, không cộng targeted retest để đóng một full run FAIL.
- Có thể tự chạy từ workspace bằng npm.cmd run verify, npm.cmd run test:e2e, npm.cmd run build:demo. Lệnh/hash/exit thực trong các execution records của batch.
- [Ảnh hàng biến thể create/edit](variant-handoff-current.json): preview compiled ở390/1280, text mặc định; native text-only200% được kiểm riêng trong108 phép đo, không dùng ảnh text mặc định để thay bằng chứng native.

- Khởi động/reload Dashboard và Service Cases được kiểm trong conditional-ETag regression với Service Worker thật trên cả engine. Lượt full thất bại ban đầu và regression trước sửa giữ nguyên; kết quả cuối chỉ lấy một full run hoàn chỉnh.
