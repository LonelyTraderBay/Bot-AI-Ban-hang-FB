# Phát hiện UI/UX chi tiết

## UX01 — P1 — Liên kết checklist dẫn nhầm tác vụ

**Phân loại:** Lỗi đã tái hiện. **Ảnh hưởng:** R33, R24, R25.

**Bằng chứng:** Nút Duyệt góp ý mở /knowledge/feedback. Router bắt feedback làm knowledgeId ở R24; màn hiện không tìm thấy dữ liệu. R25 đúng là /knowledge/review.

**Owner source:** workspace/index.tsx:137.

**Nguyên nhân:** Đường dẫn nghiệp vụ viết trực tiếp; kiểm một URL có match router không phát hiện được đích sai do route động.

**Đề xuất:** Sửa đích theo R25; dùng builder nhỏ theo route đã sở hữu; kiểm cả nhãn và màn đích của các CTA xuyên module.

**Điều kiện nghiệm thu sau sửa:** Bấm CTA từ thiết lập phải mở Duyệt phản hồi AI. Giữ /knowledge/:knowledgeId hoạt động, không tạo alias giả cho feedback.

## UX02 — P1 — Trạng thái dùng cùng từ nhưng khác nghĩa

**Phân loại:** Sai nghĩa nghiệp vụ đã xác nhận. **Ảnh hưởng:** R15, R16, R50.

**Bằng chứng:** QU-003 còn3, ngưỡng5 và TU-008 còn2, ngưỡng3 đều bị gắn Bị chặn. Lịch sử nhập kho hiện Phiếu thu cho receipt. Kỳ kế toán open hiện Đang xử lý.

**Owner source:** inventory/index.tsx:128; shared/model/labels.ts:3.

**Nguyên nhân:** Suy trạng thái ngăn xử lý từ ngưỡng tồn; từ điển global không nhận domain nên receipt/open bị dùng chung nghĩa.

**Đề xuất:** Tách trình bày theo domain; cảnh báo tồn có các nhãn Còn hàng/Sắp hết/Hết hàng dựa trên snapshot. Biến động kho receipt phải là Nhập kho, kỳ open là Đang mở. Không sửa quy tắc bán hàng hoặc số liệu tại client.

**Điều kiện nghiệm thu sau sửa:** Kiểm biên0, bằng ngưỡng, dưới/trên ngưỡng; cùng receipt ở tài chính vẫn là Phiếu thu. Kỳ open/locked trình bày đúng domain.

## UX03 — P1 — Dialog rủi ro chưa chỉ rõ đối tượng

**Phân loại:** Thiếu ngữ cảnh đã xác nhận. **Ảnh hưởng:** R11, R12, R19, R24, R29, R30, R32, R40, R51, R52.

**Bằng chứng:** Mở thu hồi user-warehouse, ngừng danh mục Quần và xóa kết nối AI: dialog không ghi đối tượng đã chọn; CTA đều là Xác nhận. Đã kiểm source23 consumer, không mở đủ23.

**Owner source:** shared/ui/components.tsx:454.

**Nguyên nhân:** Shared ConfirmDialog chỉ nhận title/description, không có nhãn hành động riêng; consumer viết mô tả chung và bỏ identity.

**Đề xuất:** Thêm confirmLabel tương thích mặc định; consumer truyền tên/mã được phép hiển thị, tác động và đối tượng. Giữ reason/version/permission/busy/draft guard.

**Điều kiện nghiệm thu sau sửa:** Mỗi thao tác rủi ro đọc độc lập vẫn biết tác động lên ai/cái gì; nhãn Thu hồi quyền/Ngừng dùng/Xóa kết nối. Escape/Hủy/Đóng không thực thi lệnh. Không focus mặc định vào hành động nguy hiểm.

## UX04 — P1 — Tạo cửa hàng chưa được bảo vệ khi rời

**Phân loại:** Mất nháp đã tái hiện. **Ảnh hưởng:** R03.

**Bằng chứng:** Nhập Nháp kiểm tra UX, bấm Quay lại: không có cảnh báo. Browser Back quay lại thì Tên cửa hàng rỗng. Không tạo shop trong audit.

**Owner source:** workspace/index.tsx:56.

**Nguyên nhân:** Onboarding nằm ngoài Shell có blocker; chỉ dùng useState và không đăng ký draft guard.

**Đề xuất:** Bảo vệ form ở owner thích hợp cho route global; so sánh name/currency/timezone, chỉ sạch sau commit hoặc người dùng chọn bỏ. Không thêm localStorage chứa dữ liệu nhạy cảm.

**Điều kiện nghiệm thu sau sửa:** Kiểm Quay lại, link, Back và reload; form sạch không cảnh báo, commit thành công không cảnh báo sai.

## UX05 — P1 — Nút về danh sách làm mất bộ lọc

**Phân loại:** Mất ngữ cảnh đã tái hiện. **Ảnh hưởng:** R09, R11; rà R07, R08, R17, R19, R23, R24.

**Bằng chứng:** Tìm AO-002 tạo URL ?q=AO-002, mở Chi tiết rồi bấm Danh sách: trở về /products và8 sản phẩm, bộ lọc mất. Browser Back và nút Danh sách là hai hành vi khác nhau.

**Owner source:** catalog/index.tsx:142.

**Nguyên nhân:** Link quay lại chỉ biết path gốc; thiếu return context của danh sách. URL filter đang đúng nhưng không được mang qua liên kết detail.

**Đề xuất:** Giữ đường về chứa q/cursor/filter của đúng shop/route; kiểm allowlist nội bộ. Truy cập chi tiết trực tiếp có fallback về danh sách gốc.

**Điều kiện nghiệm thu sau sửa:** Search/filter/cursor rồi mở chi tiết và quay lại qua UI giữ đúng ngữ cảnh; đổi shop không hồi phục bộ lọc scope cũ. Không dựa vào history -1 mù quáng.

## UX06 — P2 — Tiếng Việt và thuật ngữ chưa đồng nhất

**Phân loại:** Nhãn thô đã xác nhận. **Ảnh hưởng:** R02, R06, R08, R23, R29, R30, R34, R38, R39, R43, R48, R50, R51, R54.

**Bằng chứng:** Hồ sơ khách hiện completed/draft; tin nhắn read/delivered; AI supported/structuredOutput; phê duyệt consumed; đổi trả inspected; case question; channel in_app.

**Owner source:** customers/index.tsx:134; shared/model/labels.ts:1.

**Nguyên nhân:** Một số consumer bỏ qua mapper; mapper thiếu enum và fallback nguyên key. Mã kỹ thuật và nhãn nghiệp vụ chưa có vai trò trình bày riêng.

**Đề xuất:** Dùng nhãn domain tiếng Việt cho status/kind/capability; technical code giữ ở dòng phụ hoặc chi tiết khi có giá trị chẩn đoán. Không đổi mã API hoặc SKU.

**Điều kiện nghiệm thu sau sửa:** Enum canonical trên các trạng thái khả dụng có nhãn đầy đủ; unknown thật hiện Chưa xác định, không dùng xanh thành công. Kiểm cả accessible name.

## UX07 — P2 — Định hướng route/tab chưa đủ rõ

**Phân loại:** Metadata và trạng thái tìm kiếm đã xác nhận. **Ảnh hưởng:** Tất cả54 route; Shell.

**Bằng chứng:** 54 route cùng title BotSales AI — Graphite Gold. Tìm màn hình zzzzzz làm menu trống nhưng không có giải thích không tìm thấy hoặc nút xóa. Breadcrumb màn tạo sản phẩm/đơn vẫn dùng ngữ cảnh chi tiết.

**Owner source:** app/router.tsx; app/Shell.tsx:110; apps/web/index.html.

**Nguyên nhân:** Title chỉ khai báo HTML; breadcrumb dựa title tổng quát; search sidebar chỉ lọc danh sách.

**Đề xuất:** Title theo tác vụ từ route manifest; không đưa PII vào title. Sidebar có trạng thái không tìm thấy và Xóa tìm kiếm; breadcrumb phân biệt tạo/sửa/chi tiết.

**Điều kiện nghiệm thu sau sửa:** Title đổi khi điều hướng, kể cả forbidden/not-found. Xóa search khôi phục menu và focus input. Tên route không lấy dữ liệu thuộc scope cũ.

## UX08 — P2 — Nội dung giải thích lấn tác vụ chính

**Phân loại:** Cải tiến phân cấp từ UI/source. **Ảnh hưởng:** R01, R03, R04, R06, R18, R23, R26, R31, R33, R34, R38, R40, R42, R51, R52, R53.

**Bằng chứng:** R38 panel ủy quyền mẫu trước hàng phê duyệt; R42 panel phí/vùng mẫu trước vận đơn. Viewport1280x720: bảng R38 bắt đầu y637, R42 y775. Nhiều đoạn hiển thị tên API/schema, quy tắc AI lập trình cho người vận hành.

**Owner source:** operations/index.tsx; fulfillment/index.tsx; bot/index.tsx.

**Nguyên nhân:** Sắp xếp theo tính năng/evidence được thêm, chưa ưu tiên tần suất và quyết định vận hành; copy của hồ sơ kỹ thuật đi vào UI.

**Đề xuất:** Đưa queue/list thật trong phạm vi mock lên trước; preview ở disclosure/tab rõ nhãn. Giữ banner mô phỏng và điều kiện an toàn có ảnh hưởng quyết định. Viết trợ giúp theo tác vụ bằng tiếng Việt; chi tiết kỹ thuật mở khi cần.

**Điều kiện nghiệm thu sau sửa:** Mở trang thấy việc chính và CTA liên quan trước phần thử; không đánh đồng preview với thao tác thật. Đo task position ở viewport thực, không chỉ padding.

## UX09 — P2 — Identity và ngày còn khó đọc

**Phân loại:** Trình bày dữ liệu đã xác nhận. **Ảnh hưởng:** R16, R17, R19, R24, R26, R32, R34, R41, R46, R47, R48, R50, R51.

**Bằng chứng:** Đơn hiện c1/warehouse-01/address-synthetic; nhiều actor/source chỉ có ID. Ngày hiệu lực và kỳ kế toán còn ISO. Có mã có ích để đối chiếu nhưng thiếu tên nghiệp vụ phía trước.

**Owner source:** orders/index.tsx; finance/index.tsx:229,322.

**Nguyên nhân:** DTO reference được render nguyên dạng; chưa resolve tên qua read model có quyền. Date-only chưa qua formatter riêng.

**Đề xuất:** Dùng tên đã có và được phép đọc + mã phụ/copy. Nếu contract chỉ có ID thì ghi rõ Mã..., không suy ra danh tính. Date-only định dạng tiếng Việt không chuyển UTC làm lệch ngày.

**Điều kiện nghiệm thu sau sửa:** Không N+1 theo từng row; dùng cache/read model/lookup bounded được contract cho phép. Không fetch danh tính thiếu quyền. Ngày giữ đúng date-only và timezone.

## UX10 — P2 — Nhiều bảng cùng tên Dữ liệu

**Phân loại:** Accessible name đã đo. **Ảnh hưởng:** R09, R12, R17, R19, R21, R23, R24, R25, R26, R28, R32, R34, R35, R37, R38, R40, R41, R42, R43, R44, R45, R46, R47, R48, R49, R50, R51, R54.

**Bằng chứng:** 30/38 bảng quan sát có aria-label Dữ liệu. R44 và R50 có hai bảng cùng tên. Heading nhìn thấy giúp mắt nhưng không đổi accessible name của table/scroll region.

**Owner source:** shared/ui/components.tsx:122.

**Nguyên nhân:** DataTable có default generic; consumer không truyền label nghiệp vụ.

**Đề xuất:** Truyền label rõ cho từng bảng; shared owner đảm bảo table và vùng cuộn cùng ngữ cảnh. Giữ horizontal scrolling được phép cho bảng dữ liệu.

**Điều kiện nghiệm thu sau sửa:** R44 có Nhà cung cấp/Báo giá sản phẩm; R50 có Công nợ/Kỳ kế toán. Keyboard cuộn và focus rõ; không tuyên bố speech PASS khi chưa nghe screen reader.

## UX11 — P2 — Phân trang thiếu đường lùi trực tiếp

**Phân loại:** Cải tiến từ thiết kế hiện có. **Ảnh hưởng:** Các route dùng Pager.

**Bằng chứng:** Pager có Đầu danh sách và Trang tiếp, không có Trang trước hoặc thông tin vùng đang xem. Đây là hạn chế usability, không chứng minh cursor API sai.

**Owner source:** shared/ui/components.tsx:242.

**Nguyên nhân:** UI tối thiểu cho cursor chỉ giữ next/current; người dùng phải về đầu hoặc dùng browser history.

**Đề xuất:** Có thể giữ stack cursor đã đi qua theo bộ lọc/scope và nút Trang trước. Hiển thị số hàng đã tải/hiện có; không bịa page count hoặc total.

**Điều kiện nghiệm thu sau sửa:** Thay filter xóa stack; refresh deep-link có fallback rõ; cuối trang disable next; không thêm API offset/sort không có trong contract.

## UX12 — P2 — Form cần chỉ dẫn và thời điểm báo lỗi rõ

**Phân loại:** Cải tiến form từ UI/source. **Ảnh hưởng:** R03, R05, R09, R18, R33, R35, R40, R48.

**Bằng chứng:** R35 vừa mở khi unconfigured đã có trường đỏ. R03 timezone là mã tự nhập, lỗi Intl trả thẳng ErrorNotice. Ngôn ngữ R33 cho nhập locale nhưng app chỉ hỗ trợ vi. Một số filter mặc định là ô trống thay vì Tất cả.

**Owner source:** workspace/index.tsx:75,122,206; finance/index.tsx:240.

**Nguyên nhân:** Validation tính ngay không xét touched/submit; cấu hình format và ngôn ngữ UI không được giải thích riêng.

**Đề xuất:** Trạng thái chưa cấu hình dùng hint trung tính; lỗi sau tương tác/submit. Timezone có mẫu/lookup hợp lệ, lỗi tiếng Việt. Làm rõ locale dùng định dạng hay UI; ghi đúng chỉ hỗ trợ vi. Giữ giới hạn contract.

**Điều kiện nghiệm thu sau sửa:** Trước nhập không báo người dùng làm sai; dữ liệu sai vẫn chặn request. Lỗi tại trường, focus lỗi đầu; rỗng/null và default filter có ý nghĩa rõ.

## UX13 — P2 — Phản hồi lưu chưa thống nhất

**Phân loại:** Cải tiến được xác nhận từ source. **Ảnh hưởng:** R12, R32, R44; rà các editor/dialog còn lại.

**Bằng chứng:** Shop settings có success role=status; save danh mục/nhân sự chủ yếu đóng dialog và invalidate. Chưa kiểm lưu thực tế trong audit này; không khẳng định request đã mất hoặc lưu sai.

**Owner source:** catalog/index.tsx:185; workspace/index.tsx:167.

**Nguyên nhân:** Consumer tự viết xử lý completion; shared command bảo vệ kỹ thuật nhưng không sở hữu lời phản hồi theo tác vụ.

**Đề xuất:** Dùng inline success/role=status tại nơi liên quan, nêu đối tượng và kết quả thật. Nếu còn edit trong lúc save, phản hồi phần đã gửi và giữ phần chưa lưu.

**Điều kiện nghiệm thu sau sửa:** Success chỉ sau outcome xác định; lỗi/unknown không báo thành công. Không thêm global toast hoặc thư viện mới trái convention. Geometry pending chưa đo nên chỉ là điểm cần kiểm.

## UX14 — P2 — Màn rỗng chưa dẫn bước tiếp theo

**Phân loại:** Cải tiến empty/recovery đã quan sát. **Ảnh hưởng:** R14, R25, R28, R36, R45, R49; các danh sách có no-match.

**Bằng chứng:** R25/R28/R45/R49 hiện Chưa có dữ liệu phù hợp ở default không filter; R14/R36 missing-job có thông báo chung và không có link về luồng tạo. Không xem missing-job là thiếu route.

**Owner source:** shared/ui/components.tsx:122,142.

**Nguyên nhân:** Shared DataTable chỉ có empty text mặc định; consumer ít phân biệt first-use/no-match/không có quyền/đối tượng không còn.

**Đề xuất:** Copy theo tình huống: chưa có phản hồi, chưa chạy đánh giá, chưa có đề nghị, chưa nhập sao kê. Có CTA/đường quay lại hợp lệ đúng quyền. Unknown outcome dùng recovery riêng hiện có.

**Điều kiện nghiệm thu sau sửa:** Empty có lý do và bước tiếp theo, khác lỗi transport. Không gợi ý tạo dữ liệu ngoài quyền; không lộ sự tồn tại tài nguyên ở shop khác.

## UX15 — P2 — Nhãn DetailLine bị co và tách chữ

**Phân loại:** Lỗi đọc nhãn đã đo. **Ảnh hưởng:** R06; rà các consumer DetailLine.

**Bằng chứng:** Ở viewport1280x720, nhãn Kênh trong bối cảnh Inbox rộng30.484px, cao42px/2 dòng dù chỉ một từ. Giá trị Trang Facebook mẫu · Studio rộng173.516px. Hai phần cùng flex-shrink:1 và overflow-wrap:anywhere.

**Owner source:** shared/ui/components.tsx:471.

**Nguyên nhân:** Shared DetailLine chỉ minWidth0 cho cả caption/value, không có giới hạn theo vai trò; nội dung dài ăn phần nhãn. Không overflow không đồng nghĩa dễ đọc.

**Đề xuất:** Shared owner giữ vùng caption tối thiểu theo nội dung, cho value wrap; chuyển thành hai dòng khi phần dùng thực sự hẹp. Dùng quy định geometry có giới hạn, không pixel workaround từng màn.

**Điều kiện nghiệm thu sau sửa:** Kênh không bị tách giữa chữ ở bố cục hiện tại; caption dài/value dài đều đọc được khi320px và zoom. Không gây overflow hoặc giảm target44px. Các consumer khác chỉ là phạm vi cần rà, chưa khẳng định đều lỗi.
