# UI012/S28 — Nhãn biểu đồ lý do không chốt đơn

**Ngày:** 03/10/2026 · **Route:** R53 `/s/:shopId/reports/marketing` · **Kết quả:** UI PASS cho chart được lấy mẫu; ARCH PRESERVED; UI012.C04 vẫn PARTIAL.

## Baseline và sửa đổi

Ở viewport Chromium 1280×720 trước khi sửa, DOM của chart chỉ có hai nhãn trục ngang (`Không còn đúng kích cỡ`, `Chưa đủ thông tin sản phẩm`) cho ba cột. Bảng dữ liệu ngay dưới vẫn có đủ ba hàng, gồm `Chưa rõ phí giao hàng` với số lượng 3, nên dữ liệu không mất nhưng cột giữa khó diễn giải trực tiếp trên biểu đồ.

Reports giữ ownership trong module hiện tại. Trục ngang nay giữ mọi tick và hiển thị nhãn SVG nhiều dòng, giới hạn mỗi dòng theo cụm ngắn để vừa ở desktop/mobile. Bảng dữ liệu vẫn giữ nguyên nhãn đầy đủ. Không đổi API, route, permission, design token, contract/generated output hay module boundary.

## Kiểm chứng

- Regression Playwright mới kiểm tra đủ ba nhãn, đủ ba hàng bảng, giới hạn nhãn trong khung chart và không tràn document tại 1280×720 và 320×860 CSS px: **1/1 PASS**. Full suite cũng chạy thêm viewport capture 1440×1000.
- [S28 capture JSON](S28-marketing-chart-labels.json) ghi cả baseline, ba viewport sau sửa, kích thước bounds, bảng, page errors, mutation count và source-module SHA-256. Ảnh: [1280×720](S28-marketing-chart-labels-1280x720.png), [1440×1000](S28-marketing-chart-labels-1440x1000.png), [320×860](S28-marketing-chart-labels-320x860.png).
- `npm.cmd run verify` exit 0 sau thay đổi Reports: generator 11/283/210/54; source-check 3/3; boundary 427 imports, 0 issues, fixtures 8/8; lint, typecheck, domain/MSW 88/88, Vitest 85/85 và production build đều đạt. [S28 verify log](S28-verify.log).
- Full rebuilt-demo E2E sau sửa waiter FE010: **194/194 PASS trong 10,7 phút**, gồm route-role 357/357, empty 11/11, route-error 51/51, production mock isolation và bốn FE022 journeys. [S28 full E2E log sau sửa](S28-full-e2e-after-waiter-fix.log).
- Lượt full đầu đạt 193/194 vì FE010 đăng ký `waitForRequest` sau thao tác chọn danh mục, đôi lúc bỏ lỡ request đã phát. Test đó chạy riêng đạt 1/1; hai listener được chuyển lên trước thao tác và lần full rerun đạt 194/194. [Log lượt đầu](S28-full-e2e.log) được giữ để truy vết.

## Giới hạn và trạng thái

Đây là review trực quan của Codex trên Chromium local, với dữ liệu tổng hợp và MSW. Không có page error, mutation request hoặc horizontal document overflow ở ba viewport được capture. Ảnh và DOM không phải screen-reader speech/transcript, owner UAT, cross-browser hay thiết bị vật lý. UI012 giữ **4/5, C04 PARTIAL**; FE-G05 vẫn mở cho transcript/quan sát assistive technology và review thủ công rộng các route/error/icon/interaction states. Không cập nhật frontend/product progress ledger.

Fingerprint source/test/config/contracts hiện hành và production/demo artifacts: [UI024/S05](../UI024/S05-current-worktree-and-artifact-fingerprint.json); source aggregate `8AB5CBD968E3DA4E98DB4378C508378447A8CA20C6684E1AD3E82001B003F469`, production manifest `2DDA855B40CF26B8D22238EA2C12BF1E9753483276B2527CF000B1B662873C07`, demo manifest `E036DD9D8748FE716A8D21DF818E04086ED4312259D5F75F9621A964C431C0A5`.
