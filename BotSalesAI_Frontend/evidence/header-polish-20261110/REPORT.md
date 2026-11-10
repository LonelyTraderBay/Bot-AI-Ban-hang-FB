# Tinh chỉnh header — 10/11/2026

Đã chỉnh owner Shell theo [contract](CONTRACT.md), giữ Graphite Gold, không đổi canonical tokens hoặc business/API/permission. Phạm vi là header dùng chung, không phải đợt audit lại toàn bộ nội dung ứng dụng.

- Căn giữa hàng nội dung trong chiều cao header, giữ gutter và min-height 56/64; cho reflow thay vì ép chiều cao khi breadcrumb/chữ dài.
- Breadcrumb dùng tên shop thật, link về `/workspaces`, trang hiện tại có `aria-current=page`.
- Ô lọc có nhãn/placeholder “Tìm trong menu”, clear có tên “Xóa bộ lọc menu”; giữ hành vi lọc nav và khôi phục focus.
- Nhãn Demo/API dùng outlined neutral, vẫn giữ disclosure; label có thể tăng chiều cao khi chữ lớn. Glyph thông báo đồng bộ cỡ small, vùng bấm vẫn >=44.
- Sửa lỗi focus mobile được regression phát hiện: clear không focus input bị ẩn; focus nav trong drawer để Escape tiếp tục đóng menu và trả focus về nút mở.

## Bằng chứng và kiểm tra

[Baseline](before.json) được chụp trước [thời điểm source edit](implementation.json), hai engine, R42 tại 320/390/768/1280/1440/1920. [After](after.json) giữ cùng route/data/viewport/engine. Tất cả 12 phép đo sau có offset -0,5 px (hairline dưới header) và 0 document overflow, so với -6 px mobile/-10 px desktop trước sửa. Ở 768 px, breadcrumb được phép wrap và header tăng chiều cao, đúng contract min-height; không ép một chiều cao cố định. Các ảnh context không là pixel verdict cho body dữ liệu bất đồng bộ.

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| Source scanners trước sửa | PASS, layout 95/visual 94/composition 93, zero findings; layout giữ một exception có sẵn | before-layout.log, before-visual.log, before-composition.log |
| Header/UX07 lượt đầu | 10/14, bốn mobile focus/Escape FAIL; đã sửa tại owner | header-focused.log/json |
| Header/UX07 sau sửa | 14/14 PASS, hai engine | header-corrected.log/json |
| Hồi quy header/Shell/UX/overlay/navigation | 56/56 PASS, hai engine; geometry tại 8 độ rộng 320–1920, keyboard, mobile clear/Escape, text stress 200%, Axe header | scoped-final.log/json |
| Built-demo | 6/6 PASS, 61 routes × 390/1440 × 2 engine = 244 observations, 0 issues/page errors | built-demo.log/json |
| Verify tổng hợp | 12/12 steps exit 0; 258 unit tests, 117 domain/MSW checks; lint/type/build/UI/evidence PASS | verify.log |

Text stress sử dụng DOM/CSS có đánh dấu trong test, không thay cho native browser zoom hoặc thiết bị thật. Full E2E 1.126/1.126 của đợt unslop trước là snapshot lịch sử; đợt header này không gọi đó là full-suite PASS cho source mới.

Ảnh so sánh: [desktop trước](before/R42-chromium-1440.png), [desktop sau](after/R42-chromium-1440.png), [mobile trước](before/R42-chromium-390.png), [mobile sau](after/R42-chromium-390.png). Firefox có cùng các capture trong before/after.

## Đối chiếu owner và giới hạn

`Shell.tsx`: EDIT_VERIFY — owner duy nhất của header/nav, không đổi shared API. `ui-ux-completion.spec.ts` và `ui-header.spec.ts`: TOOLING_VERIFY — cập nhật tên truy cập và chống tái phát geometry/focus. Theme/layout/visual/generated token/contracts: KEEP_VERIFY/GENERATE_VERIFY theo generator/scanners, không sửa. Collector và JSON/log/ảnh là tooling/evidence, không được app import. Các artifact trước đó giữ nguyên; không sửa full-product/FE tracker.

UI scoped: header có baseline paired và regression đo được; ARCH: chỉ Shell và tests, permission/API giữ nguyên. S17 toàn UI vẫn IN_PROGRESS; missing paired captures và human acceptance của đợt trước không được đóng bởi task này. Screen-reader speech, native zoom, thiết bị thật, hosted CI, backend/provider và owner acceptance chưa được xác minh ở đợt này.

Áp dụng unslop của Damir Sokolovsky (@heydamir), CC BY 4.0; ui-consistency; workflow canonical FRONTEND_SPACING_STANDARD v1.29.

Artifact demo SHA-256: `ba3bc80ff09096fbb872e52d3448bed8f22fce59ff689718c3da1397cd0b2a06`, 38 files. [Đối chiếu paired/inventory/source](paired-audit.json): đúng 56 ca dự kiến, mỗi ca PASS một lần, 307 source inputs không drift, canonical tokens giữ nguyên.
