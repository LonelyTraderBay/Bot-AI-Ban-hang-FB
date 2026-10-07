# UI028.W09 — Shell design contract trước sửa source

**Trạng thái:** contract/pre-code; chưa phải nghiệm thu.
**Owner:** Shell/global/workspace fallback/demo controls/route errors.
**Nguồn:** `docs/FRONTEND_UI_IMPROVEMENT_PLAN.md` §14.5–14.6, `docs/FRONTEND_SPACING_STANDARD.md` SPC-033–045 và `botsales-kit/design/tokens.json`.

## Bề mặt và vai trò

| Vùng | Owner / semantic role | Mục tiêu |
|---|---|---|
| Shell header | Shell, `layout.headerMobile/headerDesktop` | Cao 56 px dưới 768 px; 64 px từ 768 px; nội dung dùng gutter chung |
| Banner demo, status và main | Shell/global; `layoutSx.page.gutter` là owner gutter | Gutter 16 px mobile, 24 px tablet/desktop; không bù lại bằng padding ở cả parent và child |
| Main | Shell column layout | `flex: 1` để lấp phần còn lại của viewport; không dùng min-height viewport giả làm khoảng trắng |
| Footer | `layoutSx.footer.insetInline/insetBlock` | Inline 16 px mobile, 24 px tablet/desktop; block 16 px; thẳng hàng với header/main |
| Sidebar/navigation | Navigation group/item roles | Giữ route, permission, menu state, scroll, drawer và keyboard behavior |
| Demo controls | Shell/MockTools | Giữ role/fault/dataset controls; mobile thu gọn có tên/expanded state, desktop luôn dùng được |
| Workspace/route/global fallback | Route owner + shared semantic role | Giữ status/error/retry/permission semantics; fallback ngoài Shell tự sở hữu inset đúng một lần |

## Baseline cần đối chiếu

- Route: `/s/shop-demo/overview`, `/s/shop-demo/imports`, `/workspaces`.
- Viewport: Chromium 1280×900 và 390×844; demo seed mặc định, role `owner`, fault `normal`.
- Quan sát: header/main/footer bounds và computed padding, nav/banner alignment, document scroll width, demo controls visibility, route errors/page errors, screenshots.
- Bất biến: không đổi route manifest, quyền, API/mock behavior, draft/focus, nav links, banner copy, feedback download behavior hoặc fallback/retry behavior.
- Baseline sources/hashes và metrics được ghi trước source edit trong `baseline-before-source-edit-current-20261005.json`; không ghi đè baseline.

## Cổng sau code

Đối chiếu cùng routes, viewports, browser, seed và state; yêu cầu header 56/64, gutter 16/24, footer 16/24×16, main flex-fill, zero horizontal overflow và không double inset. Chạy layout checker cùng report baseline/final theo SPC-045, generator, typecheck/lint và các browser tests shell/route/error phù hợp. UI verdict và ARCH verdict được ghi riêng; phạm vi này không chứng minh Backend hoặc production runtime.
