# Header — intent, baseline và phạm vi

Yêu cầu: triển khai đề xuất unslop đã được người dùng duyệt, giữ Graphite Gold và kiểm desktop/mobile. Owner là `apps/web/src/app/Shell.tsx`; chiều cao/gutter/gap/target lấy từ layout/theme/tokens hiện có. Không sửa canonical tokens, API, quyền hoặc trạng thái nghiệp vụ.

Định hướng: công cụ vận hành cửa hàng; điềm tĩnh, rõ ràng, chính xác; Graphite Gold; nội dung nghiệp vụ mang điểm nhấn, header giữ yên; đường dẫn gắn với cửa hàng đang vận hành. Áp dụng unslop của Damir Sokolovsky (@heydamir), CC BY 4.0 và workflow duy nhất tại FRONTEND_SPACING_STANDARD v1.29.

Root cause: Paper có min-height nhưng hàng bên trong chỉ cao theo controls, nằm trên cùng. Căn giữa qua flex ở đúng header owner, không bù bằng padding/translate. Chiều cao tối thiểu giữ 56/64, cho phép tăng khi chữ lớn hoặc nội dung dài.

Control/slot contract:
- Menu mobile: nút native, target >=44, mở drawer, giữ selected/permission/focus/đóng menu.
- Breadcrumb: tên shop thật từ scope, link `/workspaces`; trang hiện tại có aria-current=page. Cho wrap khi dài; giữ ẩn trên mobile hẹp theo breakpoint hiện có.
- Tìm trong menu: vẫn lọc nav hiện có, không giả global search hay tự gọi API; clear giữ focus; trạng thái rỗng có thể khôi phục. Search/clear đổi accessible name đồng bộ với test UX07.
- Demo/API: giữ disclosure, accessible name và text thật; dùng outlined neutral từ palette đang có, không đổi warning palette toàn app.
- Thông báo: link `/s/:shopId/notifications`, glyph small đồng bộ search, vùng bấm >=44.
- Avatar: hiển thị định danh, không thêm menu/no-op button.

Impact: mọi route trong Shell; không động auth/workspaces layout hoặc shared public API. Kiểm route matrix qua built-demo, shell gutters/controls qua regression hiện có, thêm header geometry/semantics/filter/keyboard/reflow checks. Các route/state/history thiếu proof không được suy PASS.

Baseline trước sửa: collector `collect.cjs before` phục vụ dist-demo đã kiểm trước đó ở port riêng, Chromium/Firefox, R42 tại 320/390/768/1280/1440/1920; capture context 390/1440 và header 320. `before.json` giữ thời điểm, expected/observed, measurements, source hashes và ảnh/hash. Source edit chỉ sau baseline hoàn tất. Bản after phải cùng route/data/engine/viewport; native browser zoom và screen-reader không được suy từ CSS text stress.

Gate dự kiến: source/layout/visual/composition scanners; generate/type/lint/unit/domain/build/evidence qua verify; scoped desktop/mobile E2E trên hai engines; built-demo route matrix. Không commit/push/deploy ở đợt header này. Giữ nguyên artifact local từ các lượt trước.

## Focus recovery phát hiện khi kiểm mobile

Lượt đầu header-focused kết thúc 10/14; bốn ca mobile (320/390 × hai engine) không đóng drawer bằng Escape sau khi xóa bộ lọc. clearSearch hiện focus vào input đang bị ẩn trên mobile, còn button empty-state vừa bấm bị unmount. Sửa tại owner: input chỉ nhận focus khi đang render; nếu bị ẩn, focus nav landmark trong drawer (tabIndex=-1), giữ menu mở và danh sách đã khôi phục. Regression phải xác nhận focus trong nav, Escape đóng drawer và trả focus về nút mở. Không đổi timeout hoặc giảm assertion.
