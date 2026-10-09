# 19 — DARK-ONLY: quyết định đã chốt từ nền tảng

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.5.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

**ADR-011 | Chủ dự án: Jokertrader | Quyết định dark-only gốc ngày 29/09/2026.**
Nguồn phê duyệt: yêu cầu trực tiếp của người dùng lúc 06:44:43Z về chốt theme dark
ngay từ đầu, không code nhiều loại. Phạm vi chốt là UI ứng dụng Bot bán hàng;
không suy ra phê duyệt toàn stack, mọi chỉ tiêu tải hoặc quyền triển khai production.

## 1. Quyết định sản phẩm

Chỉ xây dựng và bảo trì **một giao diện dark**. Không phải "mặc định dark" trong
một sản phẩm vẫn có light và system. Không có lộ trình ngầm thêm light, không theme
switcher, không setting đổi theme, không API/cookie/localStorage field cho lựa chọn
theme. Một bộ token semantic và một điểm tạo theme cho UI ứng dụng.

## 2. Các điều bắt buộc

| ID | Quy định | Điều kiện nghiệm thu |
|---|---|---|
| DARK-001 | Chỉ một app theme dark | OS light, OS dark và no-preference đều cho palette dark |
| DARK-002 | Không light/system trong state/config sản phẩm | Không ThemeMode union hoặc lựa chọn theme API/UI |
| DARK-003 | Không toggle hoặc persistence chọn theme | Không button/hook/store/cookie/localStorage phục vụ đổi theme |
| DARK-004 | Token là nguồn màu chuẩn | Source token → output CSS/bridge; regenerate không tạo diff ngoài dự kiến |
| DARK-005 | Nền đúng trước JS | HTML/CSS bootstrap dark, chặn JS vẫn thấy nền/fallback dark |
| DARK-006 | Một theme provider ứng dụng | Login, boot, session error, 403/404/500 và portal đều kế thừa |
| DARK-007 | Không nhánh theo màu hệ điều hành | Không matchMedia/prefers-color-scheme/light-dark() trong app-owned style logic |
| DARK-008 | Shared primitive/component/chart đồng nhất | Menu, dialog, tooltip, table, disabled/hover/focus được kiểm |
| DARK-009 | Không vô hiệu accessibility | Forced-colors, reduced-motion, keyboard, zoom vẫn sử dụng được |
| DARK-010 | Phạm vi rõ | Ảnh hàng, màu biến thể sản phẩm, Meta OAuth UI và bản in không là theme app |
| DARK-011 | Thay đổi có quyền và chuyển đổi | Chỉ yêu cầu rõ của chủ dự án mới đổi quyết định; ADR không tự cấp quyền |
| DARK-012 | Test chứng minh cổng hoạt động | Ca thêm light/system/toggle phải bị từ chối; không grep chữ light bừa bãi |

Các từ primary.light/primary.dark của MUI có thể chỉ sắc độ một màu, không phải
chế độ giao diện [S18]. Không viết linter cấm mọi token/chữ "light" trên toàn repo:
có thể làm hỏng dữ liệu sản phẩm, fixture âm và thư viện. Guard phân tích đúng AST,
resolved imports và CSS trong source ứng dụng do dự án sở hữu; unit test xác minh
các ngoại lệ hợp lệ. Thư viện có mã hỗ trợ nhiều theme không có nghĩa app đã tạo
nhiều theme; cấm app chủ động cấu hình/sinh/đóng gói palette thay thế.

## 3. Cách triển khai cho baseline MUI

MUI có hướng dẫn dark-only dùng createTheme với palette.mode='dark' [S05].
Chỉ tạo theme một lần ở platform/design bridge, ánh xạ màu từ tokens.json. Không
copy bảng màu MUI mặc định thành nguồn độc lập; không đưa tham số mode vào factory.

```ts
// Hình dạng cần triển khai trong repo thật, không phải file app đã được kiểm chạy.
const appTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: tokens.colors.canvas,
      paper: tokens.colors.surface,
    },
    text: {
      primary: tokens.colors.textPrimary,
      secondary: tokens.colors.textSecondary,
    },
    primary: {
      main: tokens.colors.accent,
      contrastText: tokens.colors.onAccent,
    },
  },
  typography: { fontFamily: tokens.fontFamily },
});
```

ThemeProvider ở root bao ngoài loading/session/router; CssBaseline bên trong.
Success/warning/error, contrastText và mọi component override lấy semantic tokens
như design/IMPLEMENTATION_NOTES.md. Không coi snippet palette này là toàn theme
hoàn chỉnh. Portal dùng context đúng; error boundary ngoài provider cần fallback
CSS bootstrap. Không khởi tạo provider mới trong từng route để "sửa màu".

Không dùng colorSchemes đa chế độ, useColorScheme/setMode, InitColorSchemeScript,
ThemeModeContext, next-themes hoặc theme storage manager cho baseline một theme.
Nếu phiên bản thư viện/repo cũ cần API khác, map sang hành vi dark-only đã chốt,
kiểm output CSS và runtime; không tự nâng/thay thư viện. useTheme đọc token vẫn hợp lệ.

## 4. Tránh chớp nền sáng khi khởi động

Trong head, trước CSS ứng dụng:

```html
<meta name="color-scheme" content="dark">
```

CSS nguồn sinh từ tokens (design/tokens.css) phải được tải trước entry JS, có:

```css
:root { color-scheme: dark; }
html, body, #root {
  min-height: 100%;
  background-color: var(--color-canvas);
  color: var(--color-text-primary);
}
body { margin: 0; }
```

CSS color-scheme giúp native controls/browser UI theo màu đã chỉ định; nó không
tự đổi màu mọi component [S14]. Phần bootstrap có thể inline với nonce/hash CSP
hoặc external render-blocking CSS; không mở unsafe-inline để làm nhanh. Nếu inline,
nó phải được generator lấy từ token, không chép màu bằng tay vào HTML cạnh nguồn.
Cần test lúc chặn JS và lúc tải chậm/cold-cache, không chỉ screenshot sau hydration.
Nếu build SSR, server và client xuất cùng dark theme; không thêm logic đọc OS.
Browser extension hoặc giao diện ngoài quyền kiểm soát không được cam kết đồng màu.

## 5. Những gì không tạo thêm một theme

Forced-colors/high-contrast là lựa chọn hỗ trợ tiếp cận của người dùng; không ghi
forced-color-adjust:none toàn app để ép palette. System colors cho forced-colors
được phép có lý do và test. prefers-reduced-motion là preference chuyển động, không
phải lựa chọn light/dark. Không khóa zoom hoặc loại bỏ focus vì thẩm mỹ.

Bản PDF hướng dẫn và template in phiếu có thể nền sáng để đọc/in, tách khỏi bundle
và token runtime UI; không thêm light theme ứng dụng để in một phiếu. Ảnh sản phẩm,
logo shop, mã màu biến thể do nghiệp vụ nhập được giữ nguyên nội dung nhưng không
được dùng để override palette app. Meta/OAuth trang bên ngoài không thuộc theme app.

## 6. Khi tiếp quản repo đã có light/dark

T001–T009 tìm source theme, storage keys, switcher, listener, tests và output CSS. Áp dụng
chuyển đổi có giới hạn: cố định provider dark; bỏ UI selector/hook/listener và nhánh
light do app sở hữu; bỏ đọc/ghi preference cũ; dọn đúng key của theme nếu được phép,
không localStorage.clear() làm mất session/dữ liệu khác. Thử preference cũ='light'
vẫn render dark. Không xóa code ngoài phạm vi hoặc mã vendor.

Một sản phẩm có chung theme với app khác chưa thuộc phạm vi phải được khoanh ranh
giới trước; không biến yêu cầu này thành quyền thay theme của tất cả repo. Không
để dual-theme chạy song song vô thời hạn; phần chuyển đổi tạm cần owner/mốc kết thúc
và test, không được coi là trạng thái hoàn thành dark-only.

## 7. Bộ kiểm tra bắt buộc

QA-001..006 và QA-021..024 trong governance/acceptance-scenarios.json bao phủ:
OS light/dark/no-preference; DOM không có switch; storage cũ không đổi theme;
JS bị chặn/cold-load; portal/error states; forced-colors/zoom/reduced-motion;
không cảnh báo sai với primary.light hoặc fixture âm; output không có palette
app light. Thử viewport 390/768/1440 và reflow theo docs/03. Playwright có emulation
color scheme/media [S15], nhưng chỉ có file test chưa chứng minh app đã được kiểm.

## 8. Điều kiện thay quyết định

AI không được thêm lựa chọn theme qua ADR tự duyệt. Chỉ khi chủ dự án yêu cầu rõ,
đánh giá ảnh hưởng token/component/QA/config/persistence rồi duyệt phạm vi chuyển
đổi. Trong phiên bản này, thay thế dark-only chưa được phê duyệt. Tiếp tục mở rộng
module không được nhân tiện "chuẩn hóa" lại thành light+dark.


## Phạm vi nghiệp vụ kế thừa từ 2.0 (vẫn hiệu lực)
Phạm vi hiện hành gồm 64 bổ sung A01–H08 ở contracts/feature-catalog.json. Giữ CODE-001..024 và DARK-001..012; bổ sung governance backend/worker theo docs/02,21–27. Không lấy ví dụ cũ về fulfill/payment làm nghiệp vụ v2; docs/05,22,24 và OpenAPI v2 là nguồn hiện hành. Kế hoạch cũ G0–G5 đã được thay bằng execution/plan.json T001–T084.

## Bảng màu Graphite Gold chính thức

Graphite Gold thay thế bảng màu xanh cũ ở `design/tokens.json`. Vẫn duy nhất dark-only; “sáng sủa” nghĩa là nội dung và các lớp nền dễ phân biệt hơn, không thêm light/system. Generator: `scripts/generate-theme.py`; hướng ứng dụng ở docs/03 và design/IMPLEMENTATION_NOTES.md. Các trạng thái cam/đỏ/xanh không được đổi ý nghĩa vì accent nay là vàng.

Quyết định màu hiện hành: `design/decision.json` (ADR-VIS-021, APPROVED, 2026-09-29T15:30:32Z). Việc đổi màu hoặc thêm palette cần yêu cầu mới có thẩm quyền; AI không tự tái thiết kế. Token 2.1 được giữ nguyên trong gói 2.1.1. Bảng màu tham khảo 1.1/2.0 chỉ là lịch sử, không là lựa chọn runtime.
