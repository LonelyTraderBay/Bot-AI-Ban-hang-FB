## Baseline bổ sung: chart Marketing

Cùng run 38030831566, Firefox ghi lỗi thứ hai ở tests/ui012-keyboard.spec.ts:227: Element is not attached to the DOM trong chart.scrollIntoViewIfNeeded. Source MarketingPage chuẩn hóa period mặc định thành fromDate/toDate/bucket trên URL rồi đổi query key; chart của response mặc định có thể bị tháo khỏi DOM trong bước chuyển tiếp. Đây là giả thuyết từ source, cần trace hosted xác minh.

Owner test UI012 nhãn chart; app Reports chỉ đọc. Giữ hai viewport 1280x720 và 320x860, đủ ba nhãn tiếng Việt, bốn dòng bảng, vị trí mọi nhãn nằm trong chart, cỡ chữ >=14px, không chồng nhãn và không tràn trang. Bước chờ dự kiến dùng GET exact /api/v2/shops/shop-demo/marketing-summary có đủ fromDate/toDate/bucket và HTTP 200; không đổi timeout/retry/threshold, chart/app/schema/mock/style.

