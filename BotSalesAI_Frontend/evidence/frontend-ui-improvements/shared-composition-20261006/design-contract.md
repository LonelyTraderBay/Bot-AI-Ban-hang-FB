# Shared UI composition — design contract

Scope: toàn bộ React/TS Frontend trong apps/web, mock tổng hợp. Không thay nghiệp vụ, contract, permissions hoặc tracker tiến độ.

Người dùng cần đọc các nhóm nội dung và thao tác trên mọi màn với cùng nhịp. Hành động ưu tiên, form submit, draft guard, query states, route links và bố cục responsive hiện có phải được giữ.

Owner: tokens.json → layout.ts/theme → component semantic → page/module. Các nhóm lặp thật dùng chung: FormFields (16px), FieldGroup (8px), SurfaceContent (12px), ActionGroup (8px + wrap), PageSections (24px), SectionGrid (24px). Các variant inset/boundary chỉ dùng lại role hiện có và có consumer thật. Geometry cột/kích thước đặc thù giữ tại module; sx/style/gap/padding/margin không thuộc API của component composition.

Reference: profile/semantic table tại FRONTEND_SPACING_STANDARD.md; render trước/sau toàn bộ 54 manifest routes ở 390/1440px trên Chromium/Firefox. Source snapshot trước sửa, import graph + route manifest và rendered geometry được lưu trong thư mục này. Source checker baseline là FAIL có các wrapper cần migrate, không gọi đó là readiness failure của toàn hệ thống.

Addendum trước sửa hai owner: main của Shell hiện không có inset dọc; chuẩn hóa contentInsetBlock=24px trên cả mobile/desktop, một owner ở Shell cho 51 route shop. Các flow chuẩn reset margin-top/bottom trực tiếp của con về zero để notice/header không cộng thêm vào gap của cha. Thay đổi dự kiến: đầu nội dung dịch xuống 24px, các boundary bị cộng margin sẽ giảm về đúng gap chuẩn; typography/direction/width/padding nghiệp vụ còn lại giữ nguyên. Không dùng reset cho phần tử bên trong con hoặc cho primitive/business layout ngoài sáu flow.

Acceptance: không còn Stack/Box tự ghép sáu pattern chuẩn tại consumer; source checker có positive/negative fixtures và chạy trong verify. Bố cục render giữ gap/inset/flow của source trước sửa; action và form semantics giữ qua DOM/browser regression. Mọi consumer/route trong impact matrix phải có kết quả, phần không chạy ghi NOT_RUN. Không tạo generic form/table engine hoặc component chưa có consumer.

## Scope refinement: existing Box and flex-flow consumers
The final AST review found four additional shape-compatible instances outside the initial172 Stack/Box-grid matches: two24px flex section flows in notifications/operations, one12px dashboard content grid, and one compact12px outlined checklist row in workspace. Reuse PageSections, SectionGrid rhythm=content and SurfaceContent compactControlOutlined. Preserve computed layout and radius from existing semantic owners. Final migration176 instances/21unique consumer files, not a new tracker. Closed APIs keep finite geometry and explicitly forwarded native/data/accessibility props. No arbitrary style props or checker exemption.
