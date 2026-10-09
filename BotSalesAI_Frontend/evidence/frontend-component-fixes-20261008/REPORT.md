# Kết quả xử lý component A01–A07 — 08/10/2026

**Trạng thái: READY_FOR_ACCEPTANCE_LOCAL_SCOPE.** Thứ tự/trạng thái UI chỉ ở [plan §16.6](../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status); đây là hồ sơ kết quả trên source hiện tại, không là tracker cạnh tranh.

## Kết quả theo ưu tiên

| Finding | Root cause / cách sửa tại owner | Kiểm chứng |
|---|---|---|
| A01 P2 | Orders row stretch lấy height TextField + helper. Row xs stretch/sm start; action giữ height tự nhiên. | Create/edit, clean/qty0, thêm/xóa dòng, 320/768/1440; native text/browser200. Trước sửa 92,125/92,133px so với natural44px, regression thất bại cả hai engine. |
| A02 P2 | Category wrapper có search/select/helper được căn với status một tầng. Search chuyển hàng riêng; category/status căn mặt trường. | Tạo/sửa p1, lookup empty giữ nháp, 320/768/1440; native và compiled demo. |
| A03 P2 | Mapping row stretch kéo nút Bỏ theo helper. Alignment đúng intent tại consumer. | Sửa/thêm/xóa mapping giữ dữ liệu; height intrinsic, reflow và native. |
| A04 P2 | Amount nowrap trong Stat/DetailLine ngoài table. Thêm wrap hữu hạn và áp dụng 21 ngoài bảng; giữ 27 column consumers nowrap. | Decimal60, âm/fraction/null không mất precision; table keyboard scroll; source guard binding-aware chống call mới thiếu intent. |
| A05 P2 | Status height auto cho phép row stretch theo paragraph. fit-content giữ minHeight32 và wrap label. | 68 consumer giữ semantics; fixture short/long so intrinsic cùng width, axe/reflow/native. |
| A06 P3 | Empty không ngắt chuỗi không có khoảng trắng. minWidth0 + overflowWrap anywhere tại owner. | 7 consumer; 120-character fixture + keyboard/axe/native. Hardening cho dữ liệu hợp lệ, seed chưa tái hiện lỗi. |
| A07 P3 | Address/payment đã khóa dùng select cắt chữ; selected product menu nowrap tràn ở text200. Readonly field có nhãn + wrap; MenuItem theme normal/anywhere. | Tạo vẫn editable, edit readonly, không đổi quyền/DTO; menu selected đầy đủ, keyboard và native. Payment trước sửa280/258px; selected option x477,70 vượt popup tới x374. |

Sửa cùng nguyên nhân trên [toàn bộ consumers](ANALOGOUS_PATTERNS.md); không thêm dependency/API/schema/token/generic style override, không đổi precision hoặc business workflow. Draft/conflict/command/SSE F01–F09 và Toolbar/Shell được giữ và kiểm lại trong suite cuối.

## Gates trên cùng source cuối

| Gate | Kết quả thực chạy |
|---|---|
| generate:check | 11 outputs / 283 schemas / 210 operations / 54 routes |
| verify | PASS: lint/typecheck/source/boundaries, 174 unit, 75 simulator + 13 network, production build và UI gates |
| Full Chromium/Firefox E2E | **580/580, một full run**, 290/engine; bao gồm 14 component regressions. Không cộng targeted retest vào run thất bại. |
| Shared contract/composition/ancestry | 39/39, includes Amount source ownership guard |
| Layout | 82/82; strict scan79 files,0 findings,1 scoped exception |
| Visual/composition scans | 78/77 source files,0 findings |
| Source maps / evidence fixtures | 16/16 và11/11 |
| Dedicated built-demo | 6/6 |
| Native UI | **33/33**: component7 browser +7 text-only; inherited3 Toolbar browser +4 Toolbar text +1/1 conflict +5/5 W30. Hai phương pháp đo riêng, hash current; speech không được thay bằng DOM. |
| Compiled review thêm | Chromium/Firefox conflict flow, Toolbar và Orders/ProductEditor/Imports/readonly ở320/1440; không cộng vào full580 hoặc built6 |
| Environment | 6 bước install/tree/setup/doctor/audit PASS; protected manifests/lock/environment/worker unchanged |
| Cold build | 10 actual stages PASS; repeat production/demo byte identical; production không có worker/fixture, demo có worker |

Raw records, argv/cwd/exit/source/log hashes: [generate](runs/components-1791460725155-33816/generate.log), [verify](runs/components-1791460838729-35556/verify.log), [e2e](runs/components-1791461051112-24880/e2e.log), [unit](runs/components-1791460717257-83008/unit.log), [contracts](runs/components-1791460717041-55708/contracts.log), [layout](runs/components-1791460716902-80492/layout.log), [source-maps](runs/components-1791460724809-86548/source-maps.log), [evidence-validator](runs/components-1791460725591-53400/evidence-validator.log), [built-demo](runs/components-1791461137424-54940/built-demo.log). Artifact demo tree: **4e18d746a3722eabf12cc440bb1f68d195a149dc6fd9cd934298a85f00949b15**.

## Coverage, nguồn và bảo toàn

Inventory đọc **16 modules,54 routes,76 file trong cây source (71 TS/TSX),28 shared APIs**, router/import closure không có unresolved runtime owner. 396 file/path dispositions được phân loại; count không là phần trăm code hoặc bằng chứng mọi business branch đã render. Matrix giữ54 routes/432 state cells và357 role cases/7 roles/51 private routes; shared/route-specific/N/A giữ lý do riêng.

Ma trận route/feature và state/role được [sinh lại bằng hai generator sở hữu](route-matrices-refresh-current.json) từ log full E2E và verbose unit hiện hành. Đối chiếu xác nhận không đổi phân loại hay mapping; chỉ cập nhật đường dẫn log, thời gian sinh và fingerprint log. [Ma trận nghiệm thu hiện hành](uat-matrix-components-20261008.json).

[Baseline](baseline.json) hash-paired với audit trước sửa:432 route observations,204 states,16 selects,60 stress. [Provenance](implementation-provenance-current.json) xác nhận first runtime patch **11:08:09.260Z**, sau baseline11:06:48.618Z và failing pre-edit run. Before artifacts không sửa ngược thành PASS. Native attempts lỗi collector và run E2E bị dừng sớm để sửa EOF vẫn giữ lịch sử.

Diff scope:12 file code/theme và1 shared catalog trong cây source,2 test files có sẵn, suite component và fixture mới; bảo toàn128 tracked changes và toàn bộ3687 paths có sẵn. Full-product plan/progress/T*.md read-only. Không stage/commit/push/reset/clean/xóa file trong batch này. [Diff review](diff-review-current.json).

FE quan sát tại lúc viết hồ sơ: **140/140, stale 0 tasks**. Đã tái xác minh 140 checkpoints bằng canonical CLI; sau cập nhật liên kết/status tài liệu phải chạy vòng cuối và đọc status/validate lại. Trạng thái cuối có hash tại canonical-revalidation-latest.json và S19-current-evidence.json.

## Nghiệm thu và giới hạn

[Ca nghiệm thu](ACCEPTANCE_GUIDE.md), [contract](CONTRACT.md), [đối chiếu pattern](ANALOGOUS_PATTERNS.md). Demo4173 phải chạy compiled artifact cuối. Scope **FRONTEND_WITH_SYNTHETIC_MOCK_API**. Screen-reader speech/broad human conformance **NOT_RUN**, hosted CI **NOT_RUN**, người dùng **PENDING**; Backend/provider/persistence/staging/production runtime ngoài phạm vi. Regression bảo vệ invariant đã đo; không cam kết mọi thay đổi UI tương lai không thể tái sinh lỗi.
