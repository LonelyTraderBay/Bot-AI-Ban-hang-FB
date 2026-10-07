# Ánh xạ token sang MUI

`tokens.json` là nguồn chuẩn; CSS là output. AI tạo MUI theme bridge tại **T010**, sau T009 hợp đồng và trước T011 shell: canvas→background.default, surface→background.paper, accent→primary.main, textPrimary/textSecondary→text, success/warning/danger→semantic colors. onAccent là chữ trên CTA accent. Không dùng chữ trắng trên mọi nền semantic. Control border dùng borderControl; borderDecorative chỉ phân cách trang trí, không đảm nhiệm dấu hiệu nhận biết control.

Giữ spacing/radius/typography theo token; icon và status có text/shape, không chỉ màu. Dialog, Select, Tooltip, Table, menu portal, disabled/focus/hover và biểu đồ cần theme đầy đủ. Token contrast được kiểm trên nền opaque quy định; hover/alpha/overlay thực tế vẫn phải đo trên UI. CSS media giảm motion chỉ là primitive, component animation cũng phải tôn trọng preference.

Đơn vị CSS cho font/space ở bản sinh là px; bridge có thể dùng rem tương đương cho khả năng scale. Không khóa browser zoom. Breakpoint đăng ký ở theme từ JSON; không hardcode giá trị khác trong từng module. Không đưa font binary vào gói bàn giao.

## Dark-only đã chốt từ 1.1 (vẫn hiệu lực)

Docs/19 chốt hành vi; không tạo getTheme(mode), light palette hay switcher.
Bridge tạo theme cố định ở root, nằm ngoài session/router để login và boot error
cùng theme. CSS từ tokens phải tải trước JS; html/body/#root có background/color
đúng. Không dùng color-scheme CSS như thay thế theme component; không ép tắt
forced-colors. `primary.light` là sắc độ được thư viện sử dụng, không app light mode.

## Graphite Gold: ánh xạ hiện hành đã duyệt

- primary.main/contrastText = accent/onAccent; hover/pressed dùng accentHover/accentPressed; không `filter: brightness` phụ thuộc màu ngoài ý muốn.
- background.default/paper = canvas/surface; input, raised, elevated, hover và selected dùng custom semantic tokens, không dùng màu MUI mặc định không kiểm.
- info.main = info; success/warning/error = success/warning/danger. Label dùng màu tương ứng trên successSurface/warningSurface/dangerSurface/infoSurface; không cần alpha ghép khác nhau ở mỗi module.
- text.primary/secondary/disabled và placeholder không hoán đổi tùy ý. textMuted dùng chú thích có đủ tương phản; không coi disabled text là nội dung hướng dẫn duy nhất.
- icon vai trò sử dụng info/accent/success/violet, vẫn một provider và một palette dark-only.
- generated CSS = `python scripts/generate-theme.py`; kiểm idempotence bằng `--check`. MUI bridge thật phải được dựng/kiểm trong task tương ứng, chưa có trong prototype.
- Không tải logo/font/SDK Binance, Bybit hoặc Coinbase vào sản phẩm. Tài liệu tham khảo chỉ phục vụ thị giác và semantic tokens.

## Nguồn duy nhất khi đưa vào repo thật

Đọc `design/decision.json` trước T010. Gói 2.1.1 giữ token phiên bản 2.1 và cùng mã màu, không thêm theme. `packages/design-tokens/` là nơi tích hợp trong repo sản phẩm, không được trở thành một bảng HEX chỉnh tay cạnh `design/tokens.json`. T010 phải chọn một nguồn canonical và liên kết hoặc sinh bản còn lại; mặc định token trong kit là đầu vào và module sản phẩm chỉ import/copy có kiểm hash. Nếu chuyển nguồn sang package, ghi quyết định/chuyển đổi rõ, cập nhật tất cả generator/refs và giữ một nguồn ghi duy nhất. Không tự tạo hai palette “demo”/“production”.

Không ép màu ảnh sản phẩm, màu biến thể, OAuth bên ngoài hoặc bản in về palette UI. Các token hover/pressed/status phải dùng đúng ngữ nghĩa, không lấy vàng thay thành công hoặc đỏ thay cảnh báo. Kiểm nền trước JS, overlay/modal, trạng thái quyền và giao diện mobile; dùng T010, T011, T061, T065, T078, T080 trong kế hoạch.
