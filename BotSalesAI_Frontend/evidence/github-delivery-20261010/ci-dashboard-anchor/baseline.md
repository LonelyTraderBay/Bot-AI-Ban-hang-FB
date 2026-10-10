Baseline trước sửa source, Git HEAD `46d30b0b21cb477494ff9339f8365e29dbc56ce1`.

GitHub run 38044074123, Chromium job 114189949396 báo lỗi tại ca `Shared consolidation Dashboard primary link respects all eight permission tuples and native anchor interactions`: `browserContext.waitForEvent: Test timeout of 180000ms exceeded`. Đây là quan sát UI đang chạy, chưa có raw log/trace hoàn tất.

Source owner kiểm thử: `tests/ui-dashboard-layout.spec.ts`. Fixture session owner: `tests/design/shared-consolidation-fixture.ts`. Consumer được đọc: Dashboard, Shell, scope provider và Router. Source gốc được sao lưu nguyên byte trước sửa. Chưa xác định nguyên nhân hosted; không sửa source cho đến khi có bằng chứng.

Giữ tám tuple quyền, nhãn/href, anchor thật, target tối thiểu 44px, focus ring, hover, Tab, Ctrl-click mở trang mới đúng href và giữ trang gốc, Axe. Không tăng timeout, thêm retry, thay ngưỡng hoặc sửa app/mock/permission contract. Chưa có owner/native zoom/screen-reader/Backend/production acceptance.
