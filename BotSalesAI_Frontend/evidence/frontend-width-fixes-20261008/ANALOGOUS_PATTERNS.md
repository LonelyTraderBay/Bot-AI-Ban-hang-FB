# Các vị trí cùng pattern và quyết định

Nguồn inventory trước sửa: `baseline.json` và namespace phân tích `../frontend-width-root-cause-20261008/`. Đây là evidence; trạng thái duy nhất tại UI plan §16.6.

| Pattern | Quyết định |
|---|---|
| Sparse card collection | Sửa R30 AI và R02 Workspaces theo số record0/1/2+; regression0/1/2/3 và breakpoint. Không dùng count DOM children trong shared SectionGrid. |
| Role/stat/chart grids | Giữ Dashboard, Stats, AgentTeam và report grids: nội dung/card có chức năng riêng; không tự ép một cột hoặc đổi số role. |
| Hai pane chức năng | Giữ privacy, reports, procurement và các pane khác. Grid giữ workflow geometry, gap vẫn từ owner. |
| Form cap trong full-width surface | Bỏ cap R13/R33/R42, giữ field order/native form/ref/draft; nhóm field liên quan bằng FieldGroup. R31 form760 nằm trong pane báo cáo có context thật, giữ. |
| Notice toàn workflow trong ô grid | R40 notice làm sibling của grid trong PageSections; bỏ child beforeGap. Không đổi hai pane. |
| Fragment detail row + divider | Một owner DetailLine sửa98 call-sites trong13 module. Không sửa từng consumer bằng margin/gap override. Shared API và spacing scale không đổi. |

Closure shared: all54 routes ở320/1920 trong hai engine;50 focused compiled geometry/axe/keyboard observations; full E2E và inherited native cases theo impact. Mount smoke không chứng minh mọi nhánh; các conditional/dialog/business cases vẫn thuộc full suite sở hữu.
