# Bàn giao BotSales AI 2.1 — Graphite Gold

## Phạm vi đã làm
Đổi nền xanh đậm sang graphite trung tính, CTA và điều hướng vàng champagne, chữ sáng, card phân lớp và trạng thái xanh mint/cam/đỏ/xanh lam riêng. Dùng một theme dark-only, không thêm thư viện hoặc hệ thống theme thứ hai. CSS của prototype và báo cáo tiến độ cùng lấy token chuẩn. Đã bổ sung generator và kiểm tra drift; đồng bộ design system, quy định dark-only và hướng dẫn AI trước T010.

Không đổi 64 yêu cầu, 54 route sản phẩm, API, quyền, kế hoạch 84 task/420 bước hoặc tiến độ thực. Universal AI_RULES giữ nguyên. Source JavaScript hiển thị chỉ đổi nhãn phiên bản; domain, dữ liệu mẫu và phân quyền demo không đổi.

## Đầu vào và tham khảo
Yêu cầu Jokertrader ngày 29/09/2026 14:59:51Z. Binance và Bybit là cảm hứng nhận diện, Coinbase Design System là tham khảo semantic color tokens. Các giá trị HEX là thiết kế riêng, không khẳng định trích chính xác brand palette. Nguồn và giới hạn đọc trang ở docs/16_SOURCES.md.

## Kiểm chứng
Xem README.md trong folder evidence và từng JSON. Kiểm màu 118/118, trình bày/browser 298/298, luồng cũ 70/70, domain 26/26, tracker 24/24, kit 518/518. Đây là kết quả của artifact và môi trường cục bộ, không thể suy ra 100% ứng dụng thật hoàn thành.

## Cách dùng
Mở prototype/index.html bằng trình duyệt để duyệt giao diện. Sản phẩm chưa triển khai dùng toàn gói 2.1 thay 2.0. Repo đã có tiến độ thực phải merge phần visual theo diff, không chép đè execution/progress.json hoặc bằng chứng đang có. AI đọc START_HERE và PROJECT_BUILD_PROMPT_VI như trước. Góp ý qua nút có sẵn rồi xuất file để lưu.

## Giới hạn
Không deploy online, không kết nối Meta/AI/Telegram/Web Push hay tiền thật. Không sửa kiến trúc hoặc tăng scope nghiệp vụ. Kiểm trên Chromium không thay thử Safari/iPhone/Android thật; chưa full accessibility audit. Bộ kế hoạch sản phẩm vẫn có 0% checkpoint được xác minh cho repo thật.
