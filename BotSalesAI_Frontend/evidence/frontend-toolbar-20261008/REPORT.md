# Sửa nguyên nhân Toolbar/Products — 08/10/2026

Trạng thái tại lần ghi hồ sơ: **READY_FOR_ACCEPTANCE_LOCAL_SCOPE**. Trạng thái UI duy nhất ở [plan §16.6](../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status). Phạm vi React/TypeScript + HTTP MSW tổng hợp, HEAD 53c0ba8f413b1f1e0fa16a747ed27f728b861dd6 cộng source working tree có SHA-256 trong execution records. CLI đã đo 140/140 checkpoint, stale 0; sau cập nhật liên kết tài liệu, round artifact review và validator cuối phải giữ giá trị này. Kết quả cuối có hash ở [canonical record](canonical-revalidation-latest.json) và [S19 manifest](S19-current-evidence.json).

## Nguyên nhân và sửa tại owner

1. Toolbar dùng flex row với align-items normal, nên nút tìm kiếm stretch theo extra cao nhiều dòng. Products đặt trạng thái và toàn lookup danh mục vào extra. Gap có token đúng nhưng gate cũ không kiểm cross-axis stretch.
2. Shared Toolbar căn giữa desktop, giữ chiều cao tự nhiên theo theme; thêm slot filters hữu hạn ngoài native search form, tương thích extra và nhánh operation không hỗ trợ q. Không đặt height cố định hoặc thêm dependency.
3. Products giữ trạng thái ở hàng tìm kiếm, đặt tìm/chọn danh mục ở hàng phụ hai cột bằng nhau; helper/count/more/retry thuộc field liên quan. Inventory/Movements đưa apply/reset filter vào slot riêng để Enter không submit q.
4. Axe phát hiện table header action trống, đã đặt tên “Thao tác”. Native Firefox text-only 200% phát hiện tên tài khoản Shell bị noWrap cắt; cho xuống dòng. Đây là hai finding có bằng chứng riêng, không bỏ rule hay loại element để làm test xanh.

[Contract trước code](CONTRACT.md), [rà pattern/impact](ANALOGOUS_PATTERNS.md) và [diff/source preservation](diff-review-current.json) ghi scope, lựa chọn, hunk và giới hạn. Những chỉnh sửa F01–F09 đã có được giữ và kiểm lại trong full suite; [report trước Toolbar](../frontend-corrections-20261008/REPORT.md) là snapshot 554/173 của source trước lượt này.

## Đo trước/sau thật

| Trạng thái | Chiều cao nút tìm kiếm | Bằng chứng |
|---|---:|---|
| Products trước sửa, 1440px | 130,25px | [baseline](baseline.json), [regression trước sửa FAIL đúng lỗi](regression-before.log) |
| Bản build sau sửa, Chromium 1440/320 | 44px / 44px | [built observation](built-comparison-review-current.json) |
| Bản build sau sửa, Firefox 1440/320 | 44px / 44px | Cùng artifact observation, document width đúng viewport |

Baseline ghi 22 JSX call site → 23 route, 46 quan sát trước source edit. Timestamp source edit lấy từ [tool history provenance](implementation-provenance.json), không suy từ mtime. [Baseline Shell](shell-before.json) và source-before giữ thêm repro tên tài khoản; text 337px trong vùng 71px trước sửa. Các ảnh lỗi/lần chạy FAIL được giữ lịch sử.

[Ảnh desktop đã xem](products-built-chromium-1440.png) · [ảnh 320px](products-built-chromium-320.png) · [ảnh Firefox desktop](products-built-firefox-1440.png).

## Gate trên cùng source cuối

| Gate | Kết quả thực chạy | Evidence |
|---|---|---|
| generate:check | 11 outputs / 283 schemas / 210 operations / 54 routes | [log generate](runs/toolbar-1791451298034-53876/generate.log) |
| verify | Exit 0: lint/typecheck/source/boundary/build, domain/network 88/88, unit 174 và UI gates | [log verify](runs/toolbar-1791453471887-70896/verify.log) |
| Full E2E | **566/566**, Chromium 283 và Firefox 283; một full run hoàn chỉnh | [log e2e](runs/toolbar-1791449812941-81044/e2e.log) |
| Unit verbose | 174/174 | [log unit](runs/toolbar-1791450799118-6420/unit.log) |
| Shared API/composition/ancestry | 38/38 | [log contracts](runs/toolbar-1791449655351-53160/contracts.log) |
| Layout | 82/82; 79 source files, 0 finding, 1 exception đã có | [log layout](runs/toolbar-1791449664671-59904/layout.log) |
| Provenance validator fixtures | 11/11 | [log evidence-validator](runs/toolbar-1791449664422-26044/evidence-validator.log) |
| Feature source maps | 16/16 | [log source-maps](runs/toolbar-1791451297907-9880/source-maps.log) |
| Dedicated built-demo | 6/6, riêng với full E2E | [log built-demo](runs/toolbar-1791453253022-85404/built-demo.log) |
| Isolated clean local | 10/10 install/audit/setup/verify/repeated builds/artifact smoke | [cold manifest](clean-artifacts-toolbar-20261008.json) |
| Toolchain hiện tại | 6/6 version/ci/tree/setup/doctor/audit; hash manifests/lock/env/worker giữ nguyên | [actual environment](environment-current.json) |
| Native browser/text 200% | Toolbar mới: 3 browser + 4 text cases; kế thừa F01/W30: 12 cases chạy lại | [browser Toolbar](actual-browser-zoom-200-current-toolbar-native-stable-20261008.json), [text Toolbar](native-text-only-200-current-toolbar-native-stable-20261008.json) |

Không cộng các suite thành phần trăm. Sáu ca Toolbar trên mỗi engine trong full run gồm: geometry/topology/axe, tất cả 23 route ở 320/1440, public extra cao, URL/q/clear/selected retention, Inventory apply/reset/Enter và 61-category pagination/busy/error/retry. Test trước sửa bắt lỗi thật; regression nằm trong suite sở hữu, không chỉ ở probe tạm.

Full run còn kiểm 54 routes, 357 private route-role cases mỗi engine, empty 11/11, error 51/51, F01–F09 và các workflow hiện có. Ma trận 432 state cells giữ tách shared-tested/route-specific/justified N/A; không nói mọi business branch đã được con người xem.

Production tree SHA-256: eaf6e218cecbf7daa81577ea43a44feb2572577f9445fa6a5e8d7f11d5eea7ab; demo: ab4a010f70b13f57afba0ae401aec82897125834964a2a1b47070f15ee77268d. Repeated/current artifacts khớp byte; production không chứa worker/mock markers. Cold temp workspace được giữ đúng manifest, không tự nhận đã xóa. Source/dependency/config không đổi trong các execution records; browser wrapper giữ bytes của evidence lịch sử và lưu output mới riêng.

Lần npm ci tại workspace đang mở preview gặp Windows EPERM vì preview giữ esbuild.exe. [Log thất bại](environment-ci-attempt1-npm.log) được giữ; xác minh đúng parent/process của workspace, dừng preview này rồi chạy lại cùng lệnh ci. Sáu environment stages đạt, protected hashes giữ nguyên và preview đã chạy lại. Không đổi lock/dependency, execution policy hoặc thay ci bằng một gate nhẹ hơn.

## Bàn giao và giới hạn

[Hướng dẫn nghiệm thu](ACCEPTANCE_GUIDE.md) cung cấp route/thao tác/kỳ vọng. [Inventory](inventory-current.json) phân loại đủ 16 module, 76 runtime source files/71 TS-TSX, 54 route, 0 unknown/unresolved runtime import; bốn dynamic import mới của Toolbar fixture có target hữu hạn và proof riêng. [Crosswalk](S01-contract-crosswalk-current-20261008.json) kiểm 222 API calls trên 71 files, 210 canonical operations, gaps 0.

Không thay schema/token canonical, dependency/lock hoặc full-product plan/progress/tasks; không commit/push trong lượt này. Staged/unstaged/untracked work có sẵn được giữ. Các run lỗi/interrupted còn lịch sử; không ghép targeted PASS với full FAIL.

UI/ARCH verdict chỉ trong local scope đã đo. Screen-reader speech/broad human conformance **NOT_RUN**, hosted CI **NOT_RUN**, người dùng nghiệm thu **PENDING**; Backend/provider/persistence/production runtime ngoài phạm vi. Regression bảo vệ invariant xác nhận được, không phải cam kết không còn mọi lỗi tương lai.
