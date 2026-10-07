# Audit và triển khai Shared UI Frontend — 06/10/2026

Phạm vi: React/TypeScript trong `BotSalesAI_Frontend`, local synthetic MSW. Đã triển khai các phần tái sử dụng có invariant chung; đây không phải đánh giá Backend, hosted CI, owner UAT hoặc chứng nhận Production/Enterprise. Kế hoạch chi tiết ở [§15](../../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#15-audit-và-triển-khai-shared-composition-toàn-dự-án--06102026); API ở [shared catalog](../../../apps/web/src/shared/ui/README.md).

Kết quả bàn giao đọc bằng máy: [handoff.json](handoff.json). Implementation shared/rules đã hoàn tất; verdict `DELIVERED_WITH_EVIDENCE_LIMITS` giữ riêng current render, paired baseline bị thiếu và first-run/retest results. Không dùng tổng cộng các test lặp để tăng coverage.

## Kết quả source và kiến trúc

| Phép đo | Trước | Sau | Cách hiểu |
|---|---:|---:|---|
| TS/TSX files |67|68| Một implementation file mới; không tính Markdown/generated CSS |
| TSX files |27|28| AST source inventory |
| Module folders |16|16| Không thay module boundaries |
| Shared UI exports |21|27|21 component đã có +6 composition thuần render |
| Nhóm bố cục chuyển về shared owner |0 của mẫu audit mới|176|172 initial matches +4 shape-compatible instances;21 unique consumer files |
| JSX Stack occurrences |242|87| Sau gồm cả implementation shared; số còn lại không tự là debt |
| JSX Box occurrences |106|92| Profile/slot/geometry riêng vẫn dùng MUI và semantic roles |
| Composition findings trên source cuối |172 initial candidates; mở rộng census thêm4|0| Gate theo sáu role, aliases và shape; không phải mọi lỗi UI |

Các phép đếm lấy từ AST, không đếm node DOM/runtime branches, không dùng để tính % readiness. [Initial migration](migration-manifest.json) giữ hashes của21 file trước/sau bước đầu; [supplemental migration](supplemental-migration-manifest.json) ghi4 instances bổ sung. Hashes intermediate không thay [source freeze cuối](final-source-hashes.json).

| Component | Occurrences | Spacing owner |
|---|---:|---|
| FormFields |72| Field gap16 px; form/div/ref/submit/noValidate/draft marker |
| FieldGroup |28| Control group gap8 px |
| SurfaceContent |28| Content gap12 px; named inset/divider/compact outline variants |
| ActionGroup |25| Action gap8 px; responsive direction/wrap |
| PageSections |9| Peer section/data-group flow24 px |
| SectionGrid |14| Section grid24 px; named content grid12 px |
| Tổng |176| Một shared owner mỗi quan hệ |

Giá trị vẫn từ canonical tokens → theme/layout/visual. API không nhận generic `sx`, `style`, `className`, spacing/padding/margin/gap hoặc opaque props; geometry có finite keys và runtime forwarding explicit. Grid columns/direction vẫn theo workflow. Sáu components không có API request, query/cache, permissions hoặc mutation state.

Chỉnh thêm tại shared owners: Shell main inset trên/dưới24 px; semantic parent reset direct-child block margins để không cộng gap lần hai; Panel title là h2 nhưng giữ visual h6; Stat value là paragraph nhưng giữ visual h4. Inset bên trong child vẫn có owner riêng. Không dùng `!important`, local bù trừ hoặc thêm dependency.

## Đã shared, giữ feature-local, và quy định

21 components cũ tiếp tục là owner: PageHeader/Panel; Stat/Stats/Amount/CopyableCode/Status/DetailLine; DataTable/Toolbar/Pager/LookupLoadMore; Empty/QueryState/ErrorNotice/PartialDataNotice/CapabilityUnavailable; RouteLink/MutationButton; EditDialog/ConfirmDialog. Các con số tiêu biểu:91 Panel,47 DataTable,48 EditDialog,23 ConfirmDialog,86 QueryState,88 ErrorNotice,107 MutationButton,64 RouteLink.210 TextField và191 Typography occurrences dùng MUI/theme, không cần wrapper đổi tên.

Schema, field binding, table columns, query operation allowlist, mutation payload, permissions và domain state giữ trong module. Inbox message/composer, report charts, dashboard role cards và operational workflow giữ component/profile riêng. Không tạo universal form/table/CRUD engine hoặc chuyển API vào layout. Các role query/inbox/report/dashboard/table/dialog đã có central owner; không suy rằng mọi Stack/Box còn lại cần thêm component.

Quy định bắt buộc: [SPC-061–063](../../../docs/FRONTEND_SPACING_STANDARD.md#134-shared-composition-bắt-buộc-và-owner-duy-nhất--06102026), CODE-034–036, catalog và AGENTS/design/UX/scope/continue/context đã đồng bộ. `test:ui-composition` +9 fixtures chạy trong `verify`, cùng spacing/visual-token gates. Checker theo alias/default/namespace imports, local variables/spreads, chặn override/opaque geometry/prop ngoài API (kể cả aria/data props) và các double-boundary/inset có thể phân tích tĩnh. Dynamic nesting/cascade cần browser evidence. CI config gọi verify/E2E; chưa có hosted run trong lượt này.

## Render và consumer impact

- Baseline `[before-chromium.json](before-chromium.json)` / `[before-firefox.json](before-firefox.json)` được ghi trước migration, có source hashes. Không ghi đè hoặc dựng lại từ source sau.
- Current `[after-chromium.json](after-chromium.json)` / `[after-firefox.json](after-firefox.json)`:54 route ×2 widths (390×844,1440×900) ×2 browsers =216 observations;0 page errors,0 gap/margin/main-inset/overflow issues. Source hashes khớp source cuối.
- [Import graph](import-graph.json) và [consumer matrix](consumer-impact-matrix.json) dùng AST imports + route manifest. Mapping là conservative closure theo module và app router/Shell; không suy mọi export/branch xuất hiện trên mỗi route. Mỗi route có current render verdict; trạng thái khác phải truy từng behavior test.
- [Paired comparison](layout-comparison.json): **114 cặp đủ dữ liệu** giữ nguyên tag/display/direction/wrap/gap/padding/align/justify/width/left/child count:108 mobile observations và6 desktop observations của R01–R03. Vertical margin/top/height deltas được ghi riêng cho main inset và normalization. Không tuyên bố pixel-identical.
- **102 baseline desktop không đủ so sánh:** toàn bộ R04–R54 tại1440 px trên cả hai browser ghi0 measurable groups. Collector cũ đợi heading đầu tiên nên có thể đợi h6 thương hiệu ở sidebar trong lúc `main` vẫn hiện LinearProgress; nó chỉ loại CircularProgress. Đây là lỗi instrumentation, không phải bằng chứng route-content PASS. Collector và permanent guard đã sửa để đợi `main h1` và hết cả hai loại loader. Toàn bộ after được đo lại; không ghi đè/backfill baseline từ source sau. Comparison ghi `PARTIAL_BASELINE`,102 hàng `BASELINE_NOT_COMPARABLE`. Không dùng kết luận214/216 của lượt đo sai trước đó; assertion render hiện hành vẫn đi đủ216 observations.

Screenshots `imports-806.png`, `imports-390.png`, `imports-1440.png`, `dashboard-390.png`, `order-form-390.png` đã chụp lại với readiness đã sửa và xem cả5: imports desktop có nội dung thật, alert/control/header có phân cách, fields/actions/sections rõ, nội dung mobile không chồng. Bảng dài dùng scroll region riêng. Screenshot không thay flow/accessibility regression và không phải paired visual diff.

## Commands và trạng thái thực

Working directory cho tất cả commands: workspace root `BotSalesAI_Frontend`; Windows/PowerShell, locked dependencies. Dùng npm.cmd; không đổi execution policy. Trong bảng, tên runner `capture.mjs`/`summarize.mjs` là shorthand cho đường dẫn `evidence/frontend-ui-improvements/shared-composition-20261006/`; chạy `node <đường-dẫn-runner> <arguments>` từ root. Targeted browser command dùng `node node_modules/@playwright/test/cli.js test <spec> --output <folder-evidence>`.

| Command/gate | Evidence | Kết quả |
|---|---|---|
| `npm.cmd run verify` |[verify-handoff.log](verify-handoff.log)| PASS, exit0; generator11 outputs/283 schemas/210 operations/54 routes; source/boundary/lint/type/domain/build;96 unit/component tests/11 files; layout10 fixtures/69 files 0 findings 1 scoped exception; visual5 fixtures/69 files 0; composition9 fixtures/68 files 0 |
| `node capture.mjs after chromium` |after-chromium.json| PASS, exit0;108 observations |
| `node capture.mjs after firefox` |after-firefox.json| PASS, exit0;108 observations |
| `node summarize.mjs` |layout-comparison/import-graph/matrix/freeze| Current render/source PASS; paired baseline PARTIAL:114 comparable,102 NOT_COMPARABLE; exit0 with explicit baseline gaps |
| `npm.cmd run test:e2e` |[e2e-release.log](e2e-release.log)| FAIL, exit1;485/486 passed (42.2m). Chromium preview test failed while writing metrics with Windows UNKNOWN; UI/API/bundle assertions before write had passed. Không gọi lượt đầu full-suite PASS |
| Locked Playwright CLI, `tests/artifacts/demo-preview.spec.ts` |[artifact-retest.log](artifact-retest.log)| PASS, exit0;6/6 cases (16.5s), Chromium/Firefox. Giữ nguyên test, runtime và assertions; lỗi I/O không tái hiện |
| Locked Playwright CLI, `tests/ui-composition-layout.spec.ts` |[composition-browser-final.log](composition-browser-final.log)| PASS, exit0;2/2 cases (4.2m), readiness đã sửa;54 routes ×2 viewports per case |
| Native Chromium tab zoom200% |[browser-zoom-200.json](browser-zoom-200.json), [log](browser-zoom-200-handoff.log)| PASS, exit0;5/5 stress states; zoom API báo2.0, CSS viewport640×360/DPR2;0 overflow/clipped text/page error/write request; focus indicator và hit-testing PASS |
| Native Firefox Zoom Text Only200% |[text-resize-200.json](text-resize-200.json), [log](text-resize-200-handoff.log)| PASS, exit0;5/5 stress states; computed text2×, giữ CSS viewport/DPR;0 overflow/clipped text/page error/write request; focus indicator và hit-testing PASS |
| Whitespace/doc links/source freeze |[delivery-check.json](delivery-check.json)| PASS, exit0; final hashes, policy links và scoped diff whitespace (xem số đo JSON) |

Permanent rendered guard checks six owners are observed, exact semantic gaps, zero direct-child margins, Shell24 px block inset and contained page overflow. New test was added after full-suite discovery; its two cases run separately for this delivery. Future default discovery includes it. Native form/ref/submission/draft and heading semantics also have meaningful component tests; full E2E retains domain/dialog/navigation/recovery flows.

## Failures and intermediate artifacts

Initial unit run attempted a nonexistent `test:unit` script; it did not execute tests. Used the actual `npm test` script subsequently. A JSDOM computed-margin assertion returned16 px despite the parent selector; real browser measurements showed0 px. The cascade assertion lives in real-browser guard/capture; unit checks native semantics/token units. No `!important` or lowered browser assertion was added.

Strict gates caught7 opaque MUI prop spreads and6 opaque geometry calls. Fixed closed explicit forwarding/static geometry at source; no checker exemption. Broader census found2 flex flows and2 Box variants; named shared APIs retain24/12 px and existing radii. Typecheck caught the new dashboard SectionGrid import missing; fixed before final freeze. Intermediate verify logs retain failures. Two full-suite runs were stopped when source scope changed; their partial passes are not counted. Captures whose hashes changed were rejected by the runner; intermediate JSON remains clearly named and is not final evidence.

Review `imports-1440.png` phát hiện ảnh desktop chỉ có loading bar. Kiểm kê collector xác nhận51/54 desktop baseline mỗi browser không có flow/grid groups. `after-invalid-route-readiness-*.json` và `composition-browser.log` thuộc runner lỗi, được giữ để truy vết và **không** dùng chứng minh layout desktop. Source UI không đổi khi sửa readiness. Kết luận cuối dựa vào after được đo lại, guard corrected và regression thực chạy; paired baseline vẫn có giới hạn114/216.

Đã rà cùng pattern heading wait trong existing tests: W28/built-demo/frontend route tests còn đợi heading trong `main`; W29 đợi control cụ thể của profile; W30 chuẩn bị form/composer/dialog trên các viewport hẹp. Không lấy global sidebar heading làm ready condition cho collector/guard mới. Current216 route observations và guard mới là evidence trực tiếp của sáu composition owners.

Hai runner native 200% được dẫn xuất từ W30, đổi output sang folder này và hash toàn source hiện hành. Chạy headless trên profile tạm riêng, không đổi profile người dùng. Lượt bổ sung focus hit-test của Firefox gặp lỗi helper đặt sai scope, ghi ERROR/0 scenario trong `text-resize-hit-helper-scope-error.json`; đã sửa tại function measure và chạy lại, không coi lượt lỗi là PASS. Chromium native zoom làm Playwright viewport screenshot ở state cuộn trả ảnh trống; những ảnh này là diagnostic (`pre-paint-*`/`invalid-native-zoom-viewport-*`), không là bằng chứng visual. Runner cuối đợi paint/animation và dùng CDP compositor viewport không truyền document clip; đã xem cả5 ảnh Chromium đúng nội dung. Native Firefox có 5 ảnh riêng đã được xem, không dùng CSS stress hoặc đổi viewport để nhận zoom/text-only PASS.

Full E2E lượt cuối có một lỗi ghi file `FE025/demo-preview-metrics.json` (Windows `UNKNOWN`, source UI/API assertions đã đạt trước bước ghi). Firefox trong cùng suite và cả6 artifact retest cases sau đó ghi được metrics. Nguyên nhân cụ thể không được xác định; không tự gọi là lỗi permission/locking hay sửa bằng retry/suppress. Không sửa test/runtime để bỏ ghi evidence hoặc hạ budget. Kết quả485/486 và6/6 được giữ tách biệt; đây là xác minh sau targeted retest, không là full-suite exit0 trong một lượt. Nhận xét tiến độ trong commentary đã báo sớm486/486 trước khi đọc tổng kết; báo cáo này sửa theo exit/count thực.

## Delivery limits

Frontend-only implementation/source/render verification. No owner acceptance, manual screen-reader result, hosted CI, Backend/staging/live persistence or production rollout claimed. Default captures do not prove all route states; named E2E cases define behavior coverage. Native200% được kiểm lại riêng trên 5 stress states mỗi phép thử (form validation, long-label menu, long-ID report, inbox composer, reason dialog); không suy thành mọi 54 route/state đã có native zoom proof hay full WCAG conformance. FE/UI/global-product ledgers were not updated; prior ledger hashes may be stale after source changes. No commit/staging/reset/cleanup was performed on the user's preexisting dirty tree.

Useful future maintenance is feature-local splitting of large module files and operation-specific test coverage when business requirements change. It does not justify another primitive system or generic API-driven UI engine. Any future shared extension needs a real invariant, consumer, typed API, source fixtures and rendered impact evidence under SPC-052/053/057/060–063.
