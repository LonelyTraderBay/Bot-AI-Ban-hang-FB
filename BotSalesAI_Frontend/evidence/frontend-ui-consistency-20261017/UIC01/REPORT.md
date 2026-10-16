# UIC01 — Kiểm kê và khóa baseline trước sửa

- Ngày đo: 17/10/2026
- Task: `UIC01`
- Phạm vi: React Frontend chạy API MSW tổng hợp
- Kết quả local: **PASS_SCOPED**
- Delivery: **chưa commit/push; chờ GitHub Actions UIC00 kết thúc để không hủy run đang chạy**

## Nguồn và phạm vi đã khóa

Đo trên HEAD `4a502be79a40cd7dc02c1eaa80445665a226b55f`, nhánh `codex/ui-consistency-plan-20261016`, upstream `origin/codex/ui-consistency-plan-20261016`. Repository có 22.599 tracked paths; Frontend có 14.532, trong đó 14.214 đường dẫn nằm dưới `evidence/` và được giữ làm tài liệu/bằng chứng tham chiếu, không tính là app source. Inventory gán treatment và SHA-256 cho 329 file đầu vào thuộc Frontend, các contract chuẩn, tài liệu phạm vi và workflow. 318 file tracked còn lại của workspace Frontend được phân loại theo source, test, tooling, asset, generated output hoặc tài liệu.

Có 90 file app source và 150 file test. Bản cài `node_modules` được tách thành third-party; phiên bản package lấy từ `package-lock.json`. Trong 22.084 untracked paths có một ứng viên ngoài evidence: `BotSalesAI_Frontend/0` (102 byte, không có extension). Không có source/config import ứng viên này; giữ nguyên file và nội dung. Bằng chứng lưu số lượng và SHA-256 của tập tên path trước khi thêm artifact UIC01, không hash nội dung các untracked cũ.

Mỗi input trong inventory có đúng một treatment. Các finding có owner cụ thể: `theme.ts` là `EDIT_VERIFY` cho backdrop đã xác nhận lệch token; `mocks/browser.ts` là `EDIT_VERIFY` điều tra pageerror nhưng chưa xác minh nguyên nhân; Dashboard là `KEEP_VERIFY` vì khoảng trống mới là candidate, chưa chứng minh sai ý đồ. Generated token CSS, MSW worker và route evidence chỉ được kiểm bằng generator/owner tương ứng.

## Đối chiếu route, role và owner

Manifest chuẩn có 61 routes (`botsales-kit/contracts/route-manifest.json`, version 2.3). Frontend contract sinh có 61, Router có 61 page bindings và route implementation có 61 hàng. IDs/paths khớp đầy đủ; TypeScript checker phân giải đủ component owner/export; cây import runtime của các route có 96 file first-party, không còn local import chưa giải được. Router guards, lazy loading, shell theo shop, route error và not-found fallback được ghi riêng cho từng tuyến.

Bảy role trong `permissionCatalog.rolePresets` đối chiếu kỳ vọng UI từ `readPermission` với ma trận nguồn hiện có: **427/427 cặp route-role khớp**. Đối chiếu này xác nhận tính thống nhất giữa contract và gate UI, không chứng minh server authorization. Ma trận UIC01 lập **3.402 ô route × role × state áp dụng** từ 61 routes và các state canonical; tất cả được đánh dấu `NOT_REVALIDATED_BY_UIC01` để UIC07 kiểm bằng render/hành vi thật. Tài liệu role/state cũ ghi 399 ca từng đạt được tạo ngày 13/10/2026 và chỉ dùng làm tham chiếu, không nâng thành kết quả hiện tại.

TypeScript symbol scan tìm được 33 public exports trên sáu shared UI owners, trong đó 22 component functions và 6 composition functions khớp catalog. Direct consumer closure có trong `route-closure.json`; hai notice không có consumer và `Column<T>` là type nội bộ của `DataTable`, phù hợp với quyết định trong catalog. Tìm được 28 nhóm consumer liên quan portal/overlay, gồm 86 vị trí: Dialog, mobile Drawer, Tooltip và `TextField(select)` mở menu. Danh sách vị trí và route consumer được giữ trong JSON.

## Baseline trước sửa và toolchain

Audit UIC00 được đo trên `1fd4530609f4e69193a27b0d5a4959181e3f8fc9`. Git diff của app, package, test, scripts, lockfile, cấu hình chạy, workflow và canonical token/route/permission inputs tới HEAD hiện tại rỗng. Vì vậy các quan sát UIC00 có thể dùng làm before khi trùng route, seed, viewport và browser method.

- **UIC02 / theme backdrop:** 6/6 quan sát trước là `rgba(0,0,0,0.5)`, token chuẩn `#090C12CC` tương đương `rgba(9,12,18,0.8)`. Lưu cả mismatch gốc lẫn ảnh; chưa sửa.
- **UIC03 / MSW worker:** lần Chrome 155 đầu có 30 PASS/1 FAIL do `pageerror` khi update ServiceWorker; lượt targeted recheck riêng là 4/4 PASS. Worker request trả HTTP 200, nguyên nhân lỗi chưa xác minh. Cả hai lượt được giữ nguyên.
- **UIC04 / Dashboard:** 1440px đo được hàng 1.152px, financial panel 699,06px và track trống 452,94px. Chưa có căn cứ về ý đồ bố cục; đây chưa được kết luận là defect.

Toolchain đọc trực tiếp: Node 24.19.0, npm 11.17.0, Playwright 1.63.0; lockfile khóa React 19.1.1, MUI 7.3.1, Vite 7.3.6, TypeScript 5.9.2, Vitest 5.0.3 và MSW 2.11.1. Chrome cài hệ thống là 155.0.8059.40; Firefox hệ thống 157.0.1. Playwright-managed Firefox 155.0 (revision 1543) và Chromium 153.0.8010.12 (revision 1243). Audit UIC00 dùng Chrome 155, Playwright Firefox 155 và Chromium 153 bổ sung; Chromium 153 thấp hơn mức hỗ trợ Chrome ≥154 nên không tính vào acceptance browser.

Lệnh `npm.cmd --script-shell=cmd.exe run generate:check` đạt: 15 generated outputs, 346 schemas, 245 operations và 61 routes. Lệnh inventory dưới đây đạt, route parity đúng, 427 role expectations khớp, toàn bộ 61 owner symbol phân giải và local import chưa giải được bằng 0:

```powershell
$nodeExe = (Get-Command node.exe).Source
& $nodeExe 'evidence\frontend-ui-consistency-20261017\UIC01\generate-uic01-evidence.mjs'
```

## Giới hạn và bàn giao

UIC01 khóa inventory, contract, import closure và baseline có sẵn để bắt đầu từng owner. Trong task này không chạy lại 3.402 hành vi, native zoom/text-only zoom, screen reader, human review hay thiết bị thật; các mục đó thuộc UIC07/UIC08. Dữ liệu backend/provider/staging/production không nằm trong phạm vi; mọi runtime kết quả ở đây là Frontend với MSW.

Artifact:

- [`inventory.json`](inventory.json) — file treatment, hashes, exclusions và bảo toàn untracked.
- [`route-closure.json`](route-closure.json) — 61 tuyến, owner/import closure, permission/state/role matrix, public exports và portal consumers.
- [`baseline.json`](baseline.json) — toolchain, nguồn before, ba finding và giới hạn tái sử dụng.
- [`SHA256SUMS.json`](SHA256SUMS.json) — checksum artifact UIC01.
- [`generate-uic01-evidence.mjs`](generate-uic01-evidence.mjs) — generator tái lập bằng Node built-in và TypeScript đã cài.

Kết quả UIC01 chỉ được tính là giao hàng sau commit/push riêng bằng tiếng Việt và Actions terminal trên đúng SHA. UIC00 run đang chạy tại [GitHub Actions #38933113980](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/38933113980); `verify`, ba shard Firefox đã thành công, Chromium/built-demo còn chạy khi hồ sơ này được tạo.
