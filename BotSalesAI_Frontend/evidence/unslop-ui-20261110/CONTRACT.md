# Contract và baseline — tinh chỉnh UI 10/11/2026

Scope: React frontend và demo MSW, không đổi backend, contract, Graphite Gold hay dữ liệu/nghiệp vụ. Baseline là checkout sạch trước edit và ảnh render desktop tại 1440×900, Tổng quan mobile 390×844, chụp trong lượt audit ngay trước task; ảnh và SHA-256 source kèm theo. Route scan trước edit mở 61 route, nhưng ảnh trước chỉ lưu các đại diện; trạng thái/dialog/zoom chưa có paired baseline đầy đủ.

- Shell/navigation sở hữu lựa chọn menu và icon: chọn đường dẫn dài nhất khớp ranh giới phân đoạn; một mục tối đa; các route chi tiết kế thừa mục cha; quyền truy cập không đổi. Consumer: tất cả route theo shop, kể cả mobile drawer; kiểm routes cha/con, đường dẫn tiền tố gần giống, quyền và điều hướng.
- Theme sở hữu typography: dùng weight token sẵn có, không sửa palette/scale canonical hoặc generated. Consumer: heading toàn app; kiểm typography, reflow và render desktop/mobile.
- Dashboard sở hữu hierarchy, copy, bố cục KPI và role: giữ mọi số liệu, trạng thái, đường dẫn, quyền và lệnh; giảm trang trí, dùng từ nghiệp vụ, giữ giới hạn dữ liệu và cảnh báo. Consumer R04 và các quyền/nhánh loading/error. Component chung Stat giữ API tương thích.
- Inventory giữ nội dung nghiệp vụ và thời gian snapshot; dùng ngôn ngữ dễ hiểu. Consumer R15 và các state.
- Quy trình/owner: dùng theme, layout, components và composition hiện có; không tạo token/mapping/layout cạnh tranh. Shared/type/test và affected consumer kiểm cùng lượt; đối chiếu 61 route, browser/zoom và verify theo khả năng, công bố rõ NOT_RUN/NOT_VERIFIED.

## Continuation — artifact bootstrap readiness

Final full-suite attempt used preview runtime with three workers and retained all 1126 cases. Firefox artifact-preview session assertion timed out again. Trace: page.waitForResponse began at 1116372.766ms; navigation at 1116372.946ms returned at 1120761.015ms (~4388ms); response wait expired at 1131377.343ms. Resources returned HTTP 200; trace contains no session response before teardown. This establishes overlapping navigation/readiness budgets, not a backend failure or proof of acceptable startup latency.

Use the existing navigateDemoAndRead owner to register the response listener before navigation, then give readiness its existing 15s budget after navigation. Preserve HTTP 200, UI/demo, artifact isolation and bundle limits; no retry/sleep or test-wide timeout change. Save failed log/trace and pre-edit test; rerun focused cold Firefox startup under workers, then full inventory on fixed snapshot. Baseline path: continuation/demo-preview.before.ts and continuation/firefox-preview-failure.trace.zip.

## Continuation — settled dialog accessibility audit

Full attempt after bootstrap fix found a Chromium R39 detail color-contrast violation: sampled foreground #678dbc/background #1f2b3d, ratio 4.15, while canonical info colors are #8abcfb/#25354b. The test starts Axe as soon as fetched fields are visible and has no settled dialog-opacity wait. Trace preserves the MUI dialog opacity transition (225ms); inline target opacity 1 alone does not establish settled computed opacity. Other dialog tests already assert computed container opacity 1 before Axe.

Add that same computed-opacity assertion before geometry/accessibility scanning for each detail and viewport. Preserve all Axe rules and violations assertions, payload/permission, focus, scrolling and geometry checks. No delay, disabled animation or palette change. Verify R39 repeats then rerun the complete suite; preserve the interrupted attempt and trace. This is a readiness fix for the audit, not a claim that transient frames satisfy contrast.
