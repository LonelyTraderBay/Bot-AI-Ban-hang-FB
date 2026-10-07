# 03 — Design system dark-only và tiêu chuẩn trải nghiệm

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## 1. Hướng thị giác

Ứng dụng vận hành hằng ngày, không landing page. Ưu tiên nội dung, trạng thái và thao tác rõ ràng. Graphite Gold: nền than trung tính, card sáng hơn nền, chữ trắng ngà và điểm nhấn vàng champagne. Không nhuộm xanh toàn trang, không neon hoặc kính mờ. Gradient trung tính chỉ dùng ở khối giới thiệu, không phủ trang hay chứa số liệu quan trọng trên ảnh. Dark-only là yêu cầu; không thêm switch light/dark. Logo/tên thương hiệu tạm phải thay được qua cấu hình, không đẩy vào logic.

`design/tokens.json` là nguồn chuẩn. Màu dùng semantic role, không trỏ hex trong module. `tokens.css` là bản sinh; theme MUI phải map từ token, không tạo palette riêng. Bản PDF tài liệu có nền sáng để đọc/in, không thay đổi yêu cầu dark của sản phẩm.

## 2. Tokens cơ sở

<!-- BEGIN GENERATED CORE PALETTE -->
| Token nguồn | HEX đã duyệt | Cách dùng |
|---|---|---|
| `colors.canvas` | `#111318` | Nền ứng dụng |
| `colors.surface` | `#1C2028` | Card, bảng và dialog |
| `colors.raised` | `#282F3A` | Bề mặt nổi |
| `colors.textPrimary` | `#F5F7FA` | Chữ chính |
| `colors.textSecondary` | `#B9C2D0` | Chữ phụ |
| `colors.onAccent` | `#15181E` | Chữ tối trên CTA vàng |
| `colors.accent` | `#F6C85F` | CTA, mục chọn, liên kết |
| `colors.accentHover` | `#FFDB8C` | CTA khi rê chuột |
| `colors.accentPressed` | `#DFAE4F` | CTA khi nhấn |
| `colors.borderDecorative` | `#343D4B` | Viền trang trí |
| `colors.borderControl` | `#7B879A` | Biên input có ý nghĩa |
| `colors.success` | `#4DD7A3` | Thành công, có nhãn |
| `colors.warning` | `#FFB078` | Cảnh báo, có nhãn |
| `colors.danger` | `#FF8596` | Lỗi, có nhãn |
| `colors.info` | `#8ABCFB` | Thông tin, không là CTA |
<!-- END GENERATED CORE PALETTE -->

Các cặp màu cụ thể được tính tương phản trong evidence. Token đạt contrast không có nghĩa màn hình đạt WCAG; opacity, hover, disabled và ảnh nền cần kiểm thử riêng. Đường phân chia trang trí không bị lẫn với viền input bắt buộc tương phản.

Typography dùng system sans-serif hỗ trợ tiếng Việt; không đưa file font vào gói. Body 14–16 px, page title 28 px, section title 18 px, meta tối thiểu 12 px với độ tương phản hợp lệ. Số tiền dùng tabular numerals, canh phải, hiển thị mã tiền tệ rõ. Line-height body 1.5. Spacing theo thang 4, 8, 12, 16, 24, 32, 48 px. Radius control 8, card 12, dialog 16 px.

## 3. Layout và responsive

Desktop ≥1280: sidebar 240 px, topbar 64 px, content padding 24 px. Tablet 768–1279: sidebar compact 72 px hoặc drawer; không ép inbox ba cột nhỏ. Mobile <768: menu drawer, topbar 56 px, padding 16 px, một pane chính. Đây là breakpoint thiết kế; kiểm cả 320 CSS px ở reflow/zoom ngoài viewport test 390/768/1440.

Inbox desktop có list 300 px, conversation linh hoạt ≥400 px, customer/context panel 320 px. Khi không đủ chiều ngang, context chuyển drawer, sau đó conversation thành route chi tiết một pane. Nút Back quay về cùng filters/scroll. Composer không bị bàn phím mobile che; không dùng fixed height phá zoom.

Table: pagination server, sticky header nếu container phù hợp; mobile ưu tiên cột chính + row details drawer. Bảng thật cần hai chiều có vùng scroll nhãn rõ; không làm cả trang cuộn ngang. Dashboard không hiển thị 20 KPI ngang; mỗi card có label, kỳ và asOf. Không chỉ dùng màu xanh/đỏ để thể hiện biến động.

## 4. Component contracts

| Component/pattern | Props/behavior bắt buộc | State phải chứng minh |
|---|---|---|
| PageHeader | title, description?, actions, breadcrumb | action hidden/disabled, long title |
| AsyncBoundary | loading, empty, error, forbidden, stale | không lộ dữ liệu cũ sau 403 |
| DataTable | rows, columns, pagination, sorting, row actions | 0/1/25 rows, long values, error |
| MoneyText | decimal amount, currency, redacted/null | null là “Chưa có”, không là 0 |
| StatusBadge | status semantic + text | icon/text không phụ thuộc màu |
| ConfirmActionDialog | effect summary, permission, pending | double submit, error, keyboard |
| FormField | visible label, hint, error linkage | required, invalid, read-only |
| JobProgress | jobId, progress, partial failures | queued/running/partial/failed |
| SecretInput | local transient value, one-time submit | no echo/log, clear after completion |
| SourceEvidence | title, revision, asOf, availability | retired/missing/outdated source |

Không bọc mọi MUI primitive chỉ để đổi tên. Tạo wrapper khi có policy/design/accessibility dùng chung thật. Storybook/component gallery nội bộ phải thể hiện state của các pattern nền tảng; gallery không được bật ở production công khai.

## 5. Form và feedback

Nhãn luôn hiển thị, placeholder không thay label. Validate client để hỗ trợ người dùng, validate server để quyết định. Backend `errors` map vào field path; lỗi chung lên summary focus được. Không reset form sau thất bại. Unsaved changes guard trước đổi route/shop; có lựa chọn hủy điều hướng hoặc bỏ bản nháp. Không persist secret.

Nút submit pending giữ chiều rộng, chặn submit lặp; Enter có hành vi phù hợp loại form. Toast chỉ thông báo phụ, trạng thái nghiệp vụ phải nằm trên màn hình. Thao tác mất mạng hiển thị trạng thái chưa xác nhận, không nói “đã lưu” hoặc tự retry side-effect. Delete product đã có lịch sử chuyển thành archive với xác nhận; không xóa sổ đơn/tiền.

## 6. Accessibility gates

Mục tiêu WCAG 2.2 AA [S06]. Text bình thường contrast ≥4.5:1; text lớn ≥3:1; dấu hiệu control/focus cần kiểm non-text contrast. Vùng chạm sản phẩm chọn tối thiểu 44×44 px cho thao tác chính; đây là mục tiêu thiết kế cao hơn mức tối thiểu 24×24 có ngoại lệ của SC 2.5.8. Không gọi 44×44 là yêu cầu AA bắt buộc cho mọi phần tử.

Có skip link, landmark, heading thứ bậc, icon button có accessible name, keyboard menu/table/form, focus trap/return cho dialog, Escape phù hợp, reduced motion, text resize 200%, reflow 400% theo trường hợp. Không dùng focus ring bị sticky header che. Chart có bảng/tóm tắt thay thế. Stream messages announce vừa phải; không đọc lại toàn cuộc hội thoại mỗi event. Không tự scroll người dùng khỏi đoạn đang đọc; nút “Có tin mới” thay auto-jump khi không ở cuối.

Axe là kiểm tự động một phần; vẫn cần keyboard thủ công và screen reader cho đăng nhập, tạo đơn, inbox, popup xác nhận và form lỗi. Gói này có prototype review; kiểm browser cục bộ không phải bằng chứng accessibility toàn ứng dụng sản phẩm.

## 7. Ngôn ngữ giao diện

Dùng thuật ngữ nhất quán: “Hộp thư”, “Sản phẩm”, “Biến thể”, “Tồn khả dụng”, “Đơn nháp”, “Đã xác nhận”, “Thu/chi”, “Lợi nhuận tạm tính”, “Nguồn kiến thức”, “Bản đang dùng”. Không gọi nhập tài liệu là “AI đã học xong”; dùng “Đã lập chỉ mục” rồi “Đã duyệt sử dụng”.

Ví dụ lỗi: “Sản phẩm đã được người khác cập nhật. Hãy tải bản mới trước khi lưu lại.”; “Chưa xác định tin nhắn đã gửi hay chưa. Đang kiểm tra trạng thái, vui lòng không tạo lần gửi mới.”; “Không thể gửi vì trạng thái quyền của kênh chưa được xác minh.”

## 8. Quyết định dark-only đã chốt, không chỉ mặc định

ADR-011 và DARK-001..012 ở docs/19 là nguồn phạm vi chi tiết: không light/system,
không theme selector, không persisted preference; CSS bootstrap dark trước JS,
portal/error/login cùng root theme. Không dùng nhu cầu bản in để thêm palette
light cho app. Forced-colors/reduced-motion/zoom vẫn được tôn trọng. Cơ chế token và nền bootstrap được giữ từ baseline; bảng màu hiện hành là
Graphite Gold 2.1 trong design/tokens.json, thay bảng màu xanh 1.1/2.0.


## Phạm vi nghiệp vụ kế thừa từ 2.0 (vẫn hiệu lực)
Phạm vi hiện hành gồm 64 bổ sung A01–H08 ở contracts/feature-catalog.json. Giữ CODE-001..024 và DARK-001..012; bổ sung governance backend/worker theo docs/02,21–27. Không lấy ví dụ cũ về fulfill/payment làm nghiệp vụ v2; docs/05,22,24 và OpenAPI v2 là nguồn hiện hành. Kế hoạch cũ G0–G5 đã được thay bằng execution/plan.json T001–T084.

## 9. Graphite Gold — màu chính thức đã duyệt

Nguồn yêu cầu: Jokertrader, 29/09/2026 14:59:51Z, phối màu lại lấy cảm hứng từ Binance, Bybit và nền tảng tài chính. Đây là quyền thay đổi thị giác; không tự cấp quyền đổi nghiệp vụ, API, task hay điểm tiến độ. Màu cụ thể là thiết kế BotSales đã được tiếp nhận theo yêu cầu 15:30:32Z, không sao chép logo, font độc quyền hoặc toàn bộ layout của các sàn.

Nguồn duy nhất: `design/tokens.json`. Chạy `python scripts/generate-theme.py`; kiểm drift bằng `python scripts/generate-theme.py --check`. CSS, bản token trong prototype và `design/PALETTE.md` là output. `prototype/build.py` tự sinh theme trước khi đóng gói. `scripts/progress.mjs report` lấy cùng CSS. Quyết định duyệt là `design/decision.json`; không hỏi chọn màu lại. T001–T084 và trọng số kế hoạch 2.0 được giữ nguyên; trước T010 (Theme tối và component nền), đọc bổ sung docs/03, docs/19 và design/IMPLEMENTATION_NOTES.md. Các task giao diện dùng cùng nguồn này; không đổi dependency/trọng số trong plan.json.

Màu vàng dùng cho CTA, điều hướng đang chọn, liên kết và đường dữ liệu chính; không tô cả bảng hoặc mọi KPI. Màu xanh mint/cam/đỏ là trạng thái có nhãn; xanh lam là thông tin, tím là biểu tượng vai trò trưởng nhóm. Phân vai chỉ bằng icon, không biến bốn vai trò thành bốn theme. `badge.blue` trong prototype ánh xạ `info`, không ánh xạ accent vàng.

Card: surface; input: input; hàng hover: hover; điều hướng/chat đang chọn: selected. Không dùng border trang trí làm bằng chứng đạt tương phản input. CTA vàng luôn dùng onAccent màu mực, không chữ trắng. Nội dung nhỏ thiết yếu tối thiểu 12px trong prototype; nhãn nhóm trang trí 11px; các nút mobile chính tối thiểu 44px. Giữ overflow vùng bảng, không ép toàn trang cuộn ngang.

Bắt buộc kiểm login, lỗi/loading, menu, modal, inbox, tài chính, điện thoại, đơn mua, report; kiểm OS light vẫn dark, JavaScript bị chặn, focus, disabled, hover, reduced-motion và forced-colors. Tỷ lệ màu không thay thế kiểm tra toàn bộ WCAG. Kết quả mới ở `evidence/visual-validation.json` và `prototype/evidence/visual-browser-tests.json`.
