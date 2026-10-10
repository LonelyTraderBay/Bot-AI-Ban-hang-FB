# Marketing filter race — baseline trước sửa nguồn

Source/remote ca5d9d8a2bdfcf0464d669ed333786e4c90d810f. Run 38014328694, Firefox job 114101155108 đã ghi FAIL tại tests/fe021.spec.ts:129: page.waitForResponse timeout 180000ms khi chờ marketing-summary có fromDate=2026-09-18, toDate=2026-09-24, bucket=week. Job còn chạy các ca khác khi lập baseline; không ghi toàn run là PASS.

Owner: MarketingPage trong apps/web/src/modules/reports/index.tsx, consumer /s/:shopId/reports/marketing, query getMarketingSummary và URL fromDate/toDate/bucket theo contract hiện hành. Không thay API/schema, shared UI, theme, token hoặc spacing. Thực hiện workflow SPC-041/052/055 trong FRONTEND_SPACING_STANDARD.md; đây là evidence của sửa lỗi bàn giao, không thêm tracker hay quy trình riêng.

Ba lượt test Firefox không điều khiển timing PASS chưa loại trừ race. Probe giữ response của query canonical cho tới khi đã nhập ngày 18–24/09 và gộp Tuần, rồi thả response thật: Chromium và Firefox đều bị đổi về 31/08–29/09, gộp Ngày. reproduction-before.log exit 1; JSON/screenshot/trace giữ nguyên kết quả. Lượt harness đầu chọn combobox theo exact name sai nên exit 1 trước khi đo; giữ riêng, không tính là reproduction thành công.

Nguyên nhân nguồn: effect phụ thuộc marketingPeriod/search vừa chuẩn hóa URL vừa setDraft mỗi lần period từ query mới xuất hiện. Query default và query explicit canonical dùng hai cache key; response thứ hai đến sau thao tác nhập sẽ ghi đè draft. URL navigation effect lại là owner đồng bộ khác của cùng draft.

Contract hành vi: response mặc định được phép khởi tạo URL/draft khi chưa tương tác; giữ ngày và kiểu gộp đã nhập trong lúc response canonical hoặc default còn pending; Apply gửi đúng ba giá trị và dùng tổng hợp API; URL explicit/back/reload tiếp tục điều khiển applied context. Invalid range vẫn đánh dấu trường/focus và không gửi GET sai; loading/error/empty/permission vẫn qua QueryState hiện hành. Filter chỉ đọc, không có mutation hoặc nghiệp vụ ghi sổ. Geometry và accessible names giữ owner hiện có.

Sửa dự kiến: chỉ URL effect sở hữu việc sync draft; API effect chỉ chuẩn hóa default URL khi chưa có filter explicit và chưa nhập draft. Thêm một ref ghi nhận tương tác, reset khi Apply hợp lệ hoặc URL navigation. Regression giữ/thả response bằng promise có điều khiển, không sleep, không nới timeout hoặc bỏ assertion. Kiểm cả browser, viewport 1280/320, canonical/default pending, invalid range, API aggregates, reload và sibling chart. Native zoom/text resize N/A cho thay đổi logic không đổi layout/style; không ghi native accessibility acceptance.

Regression trước sửa nguồn FAIL 4/4 trên hai browser, cho cả response default và canonical. Log/trace trong regression-before-results và regression-before.log. Hai test mới bổ sung vào suite, giữ nguyên 348 test cũ mỗi project.

Kiểm thêm explicit Back khi có filter chỉnh dở: URL navigation phải áp lại context lịch sử; canonical URL do API khởi tạo phải giữ chỉnh sửa mới nhập. Cần phân biệt hai intent này bằng marker cho URL mặc định đang được chuẩn hóa. URL sync chạy trước bootstrap API để Back về URL implicit có thể khởi tạo lại mặc định sau khi bỏ draft cũ. Capture gate của bản sửa đầu được giữ riêng; phải chạy lại gate trên bản nguồn cuối.
