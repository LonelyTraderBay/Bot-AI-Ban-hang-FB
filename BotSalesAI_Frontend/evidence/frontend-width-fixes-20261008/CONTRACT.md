# Contract trước sửa — W01–W04

Quyền: người dùng yêu cầu sửa tận gốc các finding đã phân tích, theo ưu tiên. Quy định/workflow duy nhất: FRONTEND_SPACING_STANDARD SPC-001–075; thứ tự/trạng thái chỉ tại kế hoạch UI §16.6. Báo cáo phân tích trước sửa giữ nguyên tại `../frontend-width-root-cause-20261008/`.

## Owner và quyết định

- **W01 P1:** AIProvidersPage và WorkspacesPage giữ ownership số record/cột. Dùng SectionGrid API hiện có; 0 chọn Empty có action duy nhất, 1 chọn một track `minmax(0,1fr)`, 2+ giữ hai track responsive. R30 desktop từ1280, R02 từ768. Không đổi role grid/pane/grid snapshot, không dùng React.Children.count chung. Reference R29 là danh sách card một cột có state empty và action; geometry của card collection R30/Workspaces khác bởi workflow nhiều card, được ghi riêng. Kiểm0/1/2/3, boundary1279/1280, refetch/count transition và shop/quyền.
- **W02 P2:** R13/R33/R42 giữ Panel fill content width và form/body flush bên trong inset Panel. Gỡ max-width route-local tạo whitespace bên trong surface. Nhóm các field liên quan bằng FieldGroup hiện có: tên/tiền tệ; timezone/locale; vùng/kích cỡ. Dưới768 xếp dọc; từ768 căn đầu, control có flex1/minWidth0; mapping source/target cùng flex. Reference R18 form trong panel đầy width với field group responsive. Giữ DOM order, label/helper, ref/form, dirty/version/validation, file/mapping và shipping preview semantics. R31 bounded form nằm trong pane báo cáo có context thật giữ nguyên.
- **W03 P2:** DevicesPage giữ hai pane. Notice chung là sibling tiếp theo trong PageSections, không auto-place vào ô trái của grid. Parent PageSections sở hữu section gap; bỏ before-gap ở child notice. Reference R52 hai-pane workflow; notice toàn page tuân notice/section ownership hiện hành.
- **W04 P2:** DetailLine là một slot DOM gồm row + divider. Row spacing giữ owner detail; parent SurfaceContent chỉ thêm gap giữa các logical rows, không cộng gap quanh divider. Plain container giữ chiều cao row+divider trước sửa. Một Box không inset bao row+divider, không thêm API/scale/spacing override. Caption/value co giãn và wrap ở320/native zoom, giữ label/ReactNode/escaping. Inventory mọi JSX call-site trước sửa; route smoke toàn54 small/large và conditional/unit/full E2E theo impact.

## Expected/observed trước sửa

Từ probe compiled trước sửa, hai engine: R30 content1632/card804 ở1920; 1279→1280 card1231→484. R13 body850/panel1632; R33 vàR42 body760/panel1632. R40 notice877/panel1632. R30 capability row45/divider1/row-top stride70 do gap12 quanh hai DOM children.

## Regression và closure

Thêm browser/unit expectation đúng và chạy trên source trước sửa để chứng minh đỏ; không hạ ngưỡng. Mỗi nhóm chạy regression liên quan trước nhóm sau. Sau W04, full unit/source/generate/boundary/lint/type/domain/build/layout/visual/composition/evidence, full Chromium/Firefox, builds/demo review, route closure, keyboard/axe/reflow/native zoom theo impact. Preserve logs/artifacts lịch sử; final manifests/tracker chỉ refresh từ run thật. Cùng final source hash cho gates. Backend/full-product ledger, API/schema/dependency không thay. Speech/hosted CI/user acceptance chỉ ghi trạng thái quan sát được.
