# Bằng chứng bản phối màu 2.1

Phạm vi: tài liệu, công cụ theo dõi và prototype cục bộ. Không phải kết quả sản phẩm, backend hay tích hợp thật.

| Kiểm tra | Kết quả | Nguồn |
|---|---:|---|
| Nhất quán kit | 518/518 | kit-validation.json |
| Cú pháp schema/tham số và JSON/YAML | Đạt, 283 schema | contract-validation.json |
| Công cụ tiến độ trong bản sao cô lập | 24/24 | tracker-tests.json |
| Màu và đầu ra sinh | 118/118 | visual-validation.json |
| Nghiệp vụ demo | 26/26 | ../prototype/evidence/domain-tests.json |
| Luồng tương tác demo | 70/70 | ../prototype/evidence/browser-tests.json |
| Trình bày và reflow demo | 298/298 | ../prototype/evidence/visual-browser-tests.json |

`baseline-preservation.json` đối chiếu từng byte với gói 2.0; hash là bằng chứng nội dung được giữ, không thay bằng chứng nghiệp vụ. Các nguồn kế hoạch, trọng số, trạng thái thực thi, AI_RULES và domain không bị sửa.

Ảnh mới có hậu tố `-v21.png` tại prototype/evidence/. 45 trang được thử ở 390/768/1440px; một tập màn hình trọng yếu được thử thêm tại 320/1024px. Các ảnh `demo-*.png` được suite cũ tạo lại cùng HTML hiện hành; để xem không có toast test, dùng ảnh `*-v21.png`.

Browser dùng Chromium document injection (`set_content`) do môi trường chặn điều hướng URL, không xác nhận file mở trực tiếp trên máy người dùng hoặc website đã deploy. Không có request mạng ngoài hay lỗi JavaScript trong các suite trên. Không kiểm Safari, điện thoại thật, screen reader hoặc full WCAG; cặp màu tính toán không chứng minh toàn màn hình đạt chuẩn. Không tạo chứng nhận production hoặc tăng tiến độ sản phẩm.

Bằng chứng 2.0 giữ ở reference/evidence-v2.0 và không được tính là test 2.1. Lần chạy đầu tracker phát hiện thư mục execution/evidence bị thiếu sau giải nén: bản 2.1 thêm README để giữ thư mục. Lượt visual đầu phát hiện tràn ngang ở nhóm nút nhân viên AI/phone nhỏ: đã sửa wrap/min-width, không che overflow cả trang; test lại đạt.
