# Audit unslop toàn UI — 10/11/2026

**Kết luận: còn 8 nhóm vấn đề.** Lỗi gần giống header nhất nằm ở phần tiêu đề hộp thoại: chữ và nút đóng lệch tâm gần 10 px. Ưu tiên cao nhất là nút chọn tệp không kích hoạt được bằng bàn phím. Đây là kết quả audit hiện tại; lượt này không sửa source ứng dụng, test, tracker, palette hay commit.

[Bảng kiểm đủ 61 trang](ROUTE_REVIEW.md) · [Finding có cấu trúc](findings.json) · [Kết quả đóng audit](closeout.json).

## Phạm vi và bằng chứng

- 61 route canonical × 4 độ rộng (320/390/768/1440 CSS px) × Chromium/Firefox = **488/488 lần mở**, 0 navigation/collector error, 0 pageerror, 0 tràn ngang toàn trang, 0 control-clipping candidate trong DOM probe. Bảng vẫn cuộn ngang bên trong region theo thiết kế; không coi vùng cột nằm ngoài viewport bảng là lỗi tràn trang.
- Header dùng Shell đo **456 lần**, độ lệch tâm tuyệt đối tối đa **0,5 px**. Không thấy tái phát lỗi căn tâm header trong ma trận này. Phép đo không thay cho toàn bộ test tìm kiếm/menu header.
- Axe: **122 scan** ở Chromium, 1440/390 px; có finding đã triage bên dưới, không phải accessibility PASS toàn bộ.
- **28 loại hộp thoại × 2 độ rộng × 2 engine = 112/112** lần mở. Tất cả vừa viewport và không tràn ngang; sau bốn Tab focus còn trong dialog, Escape đóng và focus trở lại opener ở 112/112. Focus ban đầu nằm ở trap container của MUI ngoài Paper, nên không tuyên bố kiểm tra initial-Paper-focus đạt.
- **18 phép kích hoạt chọn tệp**: 12 bàn phím và 6 click đối chứng, hai engine ở 1440 px. Không chọn/gửi tệp thật.
- Kiểm word-wrap nhãn trạng thái **122/122** route/engine tại 390 px; kiểm select **20/20** tổ hợp ở [fields-final.json](fields-final.json).
- Thêm **28/28 ready state**: kết quả kiểm CSV có dòng hợp lệ/lỗi R14, job xuất thành công R36, consent preview R61, bốn báo cáo tài chính theo kỳ R20/R22/R58/R59. Không xác nhận nhập dữ liệu hoặc quyết định marketing cuối cùng.
- Review ảnh từng route qua 16 contact sheet desktop, 8 mobile và 6 phần cuối trang dài; thêm 4 sheet dialog mobile, ảnh dialog mẫu desktop/mobile và 7 ảnh state bổ sung mobile. Tổng artifact: 122 ảnh route full-page, 56 ảnh dialog, 14 ảnh state bổ sung. Review ảnh bằng AI kết hợp DOM/source, không giả làm nghiệm thu người dùng hoặc screen-reader speech.
- Đối chiếu 307 source inputs với baseline của build demo: **0 thay đổi**. AST inventory xét 87 TS/TSX, tạo 48 candidate; đây không phải 48 lỗi đã xác nhận.

## Định hướng giữ nguyên

**Sản phẩm:** không gian vận hành bán hàng, kho, tài chính và đội ngũ AI cho cửa hàng.

**Tính cách:** điềm tĩnh, rõ ràng, chính xác.

**Thế giới:** dữ liệu vận hành và chứng từ; nền Graphite, Gold cho hành động hoặc dữ liệu trọng tâm.

**Điểm nhấn:** trạng thái công việc và số liệu có ý nghĩa nghiệp vụ. Không bổ sung hero, glow, gradient hoặc trang trí vào ứng dụng vận hành.

**Dấu hiệu riêng:** ngữ cảnh shop và trạng thái tác vụ nhất quán xuyên suốt. Mức chỉnh phù hợp là polish trong brand hiện tại, giữ token, font, thứ tự nội dung và thông tin bắt buộc.

## Thứ tự ưu tiên

| Nhóm | Mức | Phạm vi quan sát | Tác động |
|---|---|---|---|
| U01 | P1 | 3 route | Nút chọn ảnh/CSV không mở bộ chọn tệp bằng Enter hoặc Space |
| U02 | P2 | 28 loại dialog | Tiêu đề và nút đóng hộp thoại lệch tâm khoảng 9,85 px |
| U03 | P2 | 7 route | Nhãn trạng thái ngắn bị bẻ giữa chữ trong bảng |
| U04 | P2 | 5 route | Một số ô chọn compact có vùng chạm cao khoảng 37 px |
| U05 | P2 | 23 route | Cột thao tác có ô tiêu đề rỗng |
| U06 | P2 | 3 route | Heading nhảy cấp hoặc dùng để trình bày số/ngày |
| U07 | P3 | 57 route | Tóm tắt công cụ demo nằm ngoài landmark có tên |
| U08 | P3 | 6 route | Một số lời dẫn còn dùng tên API và thuật ngữ triển khai |

## U01 — P1: Nút chọn ảnh/CSV không mở bộ chọn tệp bằng Enter hoặc Space

**Trang:** R10, R11, R13 (3).

**Bằng chứng:** 12/12 thao tác Enter/Space không mở file chooser; 6/6 click đối chứng mở được, trên Chromium và Firefox ở 1440 px. Axe cũng ghi aria-allowed-role ở cả ba route.

**Nguyên nhân:** Button component="label" tạo label role=button có tabindex nhưng thiếu kích hoạt bàn phím tương đương nút native; input file bị hidden.

**Hướng xử lý:** Dùng nút native kích hoạt input file qua ref, hoặc control tải tệp truy cập được; giữ đủ Enter, Space và click trong phép kiểm tra.

**Source:** [apps/web/src/modules/catalog/index.tsx:151](../../apps/web/src/modules/catalog/index.tsx#L151), [apps/web/src/modules/catalog/imports.tsx:38](../../apps/web/src/modules/catalog/imports.tsx#L38).

**Artifact:** [overlays.json](overlays.json).

## U02 — P2: Tiêu đề và nút đóng hộp thoại lệch tâm khoảng 9,85 px

**Trang:** R07, R08, R12, R15, R21, R23, R26, R28, R29, R30, R32, R35, R37, R38, R39, R42, R43, R44, R45, R46, R47, R48, R49, R50, R54, R55, R56, R57 (28).

**Bằng chứng:** 112/112 lần mở, thuộc 28 loại hộp thoại ở 390/1440 px trên hai engine, có titleCenterDelta từ -9.8515625 đến -9.8499985 px (xấp xỉ -9,85 px).

**Nguyên nhân:** EditDialog dùng flex alignItems:flex-start; dòng tiêu đề thấp hơn hit area 44 px của nút đóng, nên chữ nằm cao hơn tâm biểu tượng.

**Hướng xử lý:** Căn tâm theo cross-axis tại owner EditDialog, cho tiêu đề nhiều dòng nở tự nhiên; giữ target nút đóng 44 px. Đo lại cả tiêu đề ngắn/dài, mobile/desktop và hành vi focus.

**Source:** [apps/web/src/shared/ui/components.tsx:497](../../apps/web/src/shared/ui/components.tsx#L497).

**Artifact:** [overlays.json](overlays.json), [overlays/R07-390.png](overlays/R07-390.png), [overlays/R07-1440.png](overlays/R07-1440.png).

## U03 — P2: Nhãn trạng thái ngắn bị bẻ giữa chữ trong bảng

**Trang:** R15, R16, R17, R21, R37, R42, R54 (7).

**Bằng chứng:** 7 route ở 390 px. Ví dụ R16: “Nhập” bị chia ba dòng trong label khoảng 30 px; R42: “giao” chia hai dòng. R21 tái hiện trên Firefox; sáu route còn lại trên cả hai engine.

**Nguyên nhân:** Status cho phép overflowWrap:anywhere trong cột auto bị ép hẹp; bảng min-width 600 px vẫn không đảm bảo chiều rộng riêng cho trạng thái.

**Hướng xử lý:** Giữ nguyên từ cho trạng thái ngắn và đặt bề rộng tối thiểu phù hợp tại cột/variant dùng chung. Cho bảng cuộn trong region đã có tên; không giảm font để nhét chữ.

**Source:** [apps/web/src/shared/ui/components.tsx:120](../../apps/web/src/shared/ui/components.tsx#L120), [apps/web/src/shared/ui/components.tsx:143](../../apps/web/src/shared/ui/components.tsx#L143).

**Artifact:** [status-wrap.json](status-wrap.json), [screens/R16-chromium-390.png](screens/R16-chromium-390.png), [screens/R42-chromium-390.png](screens/R42-chromium-390.png).

## U04 — P2: Một số ô chọn compact có vùng chạm cao khoảng 37 px

**Trang:** R05, R06, R09, R15, R16 (5).

**Bằng chứng:** 20/20 tổ hợp route × engine × 390/1440 px đều có select nhỏ: root và combobox cùng cao 37.125 px (Chromium), khoảng 37.13 px (Firefox). Select “Ngành hàng mẫu” ở R06 cao 53.125 px, không thuộc lỗi.

**Nguyên nhân:** Select size=small kế thừa hình học compact từ MUI, chưa có min-height tương ứng mục tiêu 44 px của sản phẩm.

**Hướng xử lý:** Cân chỉnh compact control tại shared owner theo target nội bộ ≥44 px, giữ typography và responsive hiện tại. Đây là chênh lệch chuẩn chạm dự án, không được gọi tự động là vi phạm WCAG AA chỉ vì nhỏ hơn 44 px.

**Source:** [apps/web/src/shared/ui/theme.ts:41](../../apps/web/src/shared/ui/theme.ts#L41), [docs/FRONTEND_SPACING_STANDARD.md:298](../../docs/FRONTEND_SPACING_STANDARD.md#L298).

**Artifact:** [fields-final.json](fields-final.json).

## U05 — P2: Cột thao tác có ô tiêu đề rỗng

**Trang:** R07, R12, R13, R15, R17, R24, R25, R26, R32, R37, R38, R40, R41, R42, R43, R44, R45, R46, R47, R48, R50, R51, R54 (23).

**Bằng chứng:** Axe empty-table-header ở 23 route; DOM xác nhận th scope=col không có nội dung.

**Nguyên nhân:** Các consumer truyền label rỗng cho cột thao tác và DataTable render trực tiếp c.label.

**Hướng xử lý:** Đặt tên “Thao tác” tại khai báo cột; nếu thiết kế cần ẩn chữ, dùng tên chỉ dành cho công nghệ hỗ trợ. Không suy đoán nhãn cho mọi cột rỗng bằng một fallback mù.

**Source:** [apps/web/src/shared/ui/components.tsx:143](../../apps/web/src/shared/ui/components.tsx#L143).

**Artifact:** [matrix.json](matrix.json).

## U06 — P2: Heading nhảy cấp hoặc dùng để trình bày số/ngày

**Trang:** R02, R19, R52 (3).

**Bằng chứng:** R02 dùng h1→h5 cho tên cửa hàng; R19 tổng tiền mặc định thành h4; R52 khoảng thời gian dùng subtitle2 mặc định thành h6.

**Nguyên nhân:** Typography variant được dùng để chọn cỡ chữ mà chưa chỉ định component ngữ nghĩa.

**Hướng xử lý:** Đặt component h2/h3 cho tiêu đề thực và div/p cho số tiền hoặc metadata; giữ nguyên variant để không thay giao diện Graphite Gold.

**Source:** [apps/web/src/modules/workspace/index.tsx:57](../../apps/web/src/modules/workspace/index.tsx#L57), [apps/web/src/modules/orders/index.tsx:234](../../apps/web/src/modules/orders/index.tsx#L234), [apps/web/src/modules/operations/index.tsx:378](../../apps/web/src/modules/operations/index.tsx#L378).

**Artifact:** [matrix.json](matrix.json).

## U07 — P3: Tóm tắt công cụ demo nằm ngoài landmark có tên

**Trang:** R04, R05, R06, R07, R08, R09, R10, R11, R12, R13, R14, R15, R16, R17, R18, R19, R20, R21, R22, R23, R24, R25, R26, R27, R28, R29, R30, R31, R32, R33, R34, R35, R36, R37, R38, R39, R40, R41, R42, R43, R44, R45, R46, R47, R48, R49, R50, R51, R52, R53, R54, R55, R56, R57, R58, R59, R60 (57).

**Bằng chứng:** Axe region trên 57 route dùng Shell (R04–R60), target là phần tóm tắt owner/trạng thái/dataset.

**Nguyên nhân:** Khối demo ở giữa header và main, chưa có landmark/region có tên bao quanh phần tóm tắt.

**Hướng xử lý:** Gắn ngữ nghĩa phù hợp, chẳng hạn aside có tên “Công cụ mô phỏng”. Giữ thông báo mô phỏng và khả năng thu/mở; phạm vi vấn đề là demo.

**Source:** [apps/web/src/app/Shell.tsx:148](../../apps/web/src/app/Shell.tsx#L148), [apps/web/src/app/Shell.tsx:196](../../apps/web/src/app/Shell.tsx#L196).

**Artifact:** [matrix.json](matrix.json).

## U08 — P3: Một số lời dẫn còn dùng tên API và thuật ngữ triển khai

**Trang:** R01, R10, R11, R18, R31, R33 (6).

**Bằng chứng:** Ví dụ listCustomers/listProducts ở R18; getReportSummary/listJobs/Snapshot API ở R31; API upload/secret ở R10/R11; lời dẫn thiết lập nhắc Locale/catalog ở R33; R01 còn tiêu đề chào mừng chung.

**Nguyên nhân:** Copy triển khai còn xuất hiện trong luồng cho người vận hành; đây là đánh giá biên tập, không phải lỗi runtime.

**Hướng xử lý:** Đổi lời dẫn sang hành động/ngữ cảnh nghiệp vụ, ví dụ “Tìm khách theo tên hoặc mã”. Đưa tên operation sang tài liệu kỹ thuật khi không giúp quyết định. Giữ nguyên cảnh báo dữ liệu mô phỏng, quyền, bảo mật và độ đầy đủ kế toán.

**Source:** [apps/web/src/modules/orders/index.tsx:108](../../apps/web/src/modules/orders/index.tsx#L108), [apps/web/src/modules/orders/index.tsx:144](../../apps/web/src/modules/orders/index.tsx#L144), [apps/web/src/modules/reports/index.tsx:195](../../apps/web/src/modules/reports/index.tsx#L195), [apps/web/src/modules/catalog/index.tsx:151](../../apps/web/src/modules/catalog/index.tsx#L151), [apps/web/src/modules/workspace/index.tsx:48](../../apps/web/src/modules/workspace/index.tsx#L48).

**Artifact:** [matrix.json](matrix.json), [screens/R18-chromium-390.png](screens/R18-chromium-390.png), [screens/R31-chromium-1440.png](screens/R31-chromium-1440.png).

## Những điểm chưa có bằng chứng là lỗi

Không có cơ sở thay hệ màu Graphite Gold, đổi font hoặc thiết kế lại toàn bộ layout. Trong state đã mở, không thấy glow/gradient/emoji trang trí lặp lại cần loại bỏ. Nội dung cảnh báo kế toán về dữ liệu thiếu, cảnh báo quyền và disclosure mô phỏng có giá trị nghiệp vụ; không xóa để trang trông ngắn hơn. Truncation có chủ đích trong select cần được xét theo khả năng mở danh sách, không tự gọi mọi ellipsis là lỗi.

Các source checker mới chạy đều PASS: [generate](generate-check.log) (15 outputs, 346 schemas, 245 operations, 61 routes), [layout](layout-check.log) (95 files, 0 findings, 1 exception hiện hữu), [visual tokens](visual-check.log) (94 files, 0), [composition](composition-check.log) (93 files, 0). Các scanner này không phát hiện hết lỗi hình học/hành vi và không thay kết quả browser.

## Giới hạn và dữ liệu loại khỏi kết luận

Đây là audit frontend demo với MSW tổng hợp. Không có bằng chứng backend/provider thật; không tuyên bố đã chạy mọi mutation, role, lỗi mạng, ConfirmDialog hoặc state nghiệp vụ. Lượt này không chạy native browser zoom, text-only resize, thiết bị vật lý, đọc màn hình thực hoặc hosted CI. Không chạy lại full regression vì không sửa ứng dụng; các kết quả regression từ lượt trước là lịch sử, không đưa vào số PASS của audit này.

Giữ các probe đầu để truy vết nhưng **loại khỏi positive coverage**: states-unsettled.json, status-wrap-unsettled.json, fields-unsettled.json và phần states.json.fields. Các phép đo đầu có thể chạy trước khi main sẵn sàng hoặc chọn combobox ẩn trên mobile; có log timeout đi kèm. Kết quả cuối dùng readiness main heading/final decision và combobox truy cập được: [matrix.json](matrix.json), [overlays.json](overlays.json), [status-wrap.json](status-wrap.json), [states.json](states.json), [fields-final.json](fields-final.json). Không dùng các lần thử lỗi để giả PASS hoặc cộng trùng coverage.

**UI verdict: FINDINGS. Architecture/source: không thay đổi.** Header và các hành vi dialog đã nêu được xác minh trong phạm vi đo; chưa thể kết luận toàn bộ UI sạch lỗi. Source/test thay đổi sẵn có từ lượt header được giữ nguyên.

Audit áp dụng [unslop](C:/Users/Joker-PC/.codex/skills/unslop/SKILL.md) của Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), CC BY 4.0; hướng áp dụng giữ theo yêu cầu Graphite Gold của dự án.
