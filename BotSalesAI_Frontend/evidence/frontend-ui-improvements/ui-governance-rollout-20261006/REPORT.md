# Rollout quy định UI — S03/S04, 06/10/2026

## Current S06 — partial public layout readonly

S05 binding capability đã có proof; S06 bắt đầu. [Before](S06-readonly-before.log) compiler probes2FAIL/2PASS tái hiện mutable `layoutSx.form.fieldGap.gap`, trực tiếp và nested alias; public visual mapping đã readonly. Source đổi một dòng `as const satisfies LayoutSxContract`; [after](S06-readonly-after.log)4/4exit0. [S06 status](S06-readonly-status.json) ghi before source hash và exact emitted-JS hash bằng pinned compiler5.9.2: sourceChanged=true, emittedJsUnchanged=true. Đây là type-only edit, không visual fix; không chụp browser baseline hoặc claim paired render proof cho lượt này. Header/body defect vẫn open S11.

Actual source gates layout75/visual75/composition74,0finding/exits0; actual tsc --noEmit exit0. Còn token/color readonly type exports, consumer assignment/alias/Object.assign và other mutation paths; S06 IN_PROGRESS_LAYOUT_READONLY_ONLY. Không nhận compile readonly là runtime freeze hoặc không thể mutate qua cast/JS. S07–S20/full acceptance tiếp tục theo plan. S05 source-unchanged statement phía dưới đúng thời điểm S05 capture, trước type-only layout edit này.

## Current S05 — DONE_BINDING_CAPABILITY_SCOPED

Ba production gates đã dùng chung symbol resolver, với actual canonical owner/export identity và thư viện đúng package/realpath. Known/constant-key aliases, namespace, import và re-export barrels, genuine styled/Emotion css, readonly đọc và bounded RHF registration/Controller forwarding được kiểm; unknown component/factory selection giữ strict failure. Shadow không nhận global alias/parameter trust, gồm finite semantic props và bridge factor/cssPixel bindings. Foreign dependency alias không được nhận là MUI chỉ vì ở node_modules.

[Binding acceptance review](S05-binding-review.md) trace P01/P02/P08/P19/P20 và giới hạn sang S06–S20. Final combined118/118exit0/no skips; targeted final-owner24/24 riêng, không cộng thành142. [S05 status](S05-status.json) ghi actual commands/exits/hashes: layout75/0, visual75/0, composition74/0; file lists khớp S04, missing/extra=[]. tsc --noEmit, boundaries và generator exit0; generator11outputs/283schemas/210operations/54routes. Runtime source changes so S03=[], sáu protected files/index không đổi. Chưa browser/build/full regression trong batch source-tooling này, không UI conformance100%/owner/Enterprise proof.

Before layout4FAIL/1PASS giữ riêng; initial integration failures do controlled fixtures thiếu genuine imports được sửa tại fixtures, không production fallback. MUI export-from case trước sửaFAIL ở targeted test; final suite có positive/negative re-export cases. Partial status files/logs dưới đây giữ lịch sử, không current claims. Next S06 public readonly +consumer mutation guards; S07–S20 giữ toàn bộ mandatory acceptance.

## Current S05 — partial binding integration, full goal còn mở

Goal tiếp tục triển khai sau lượt documentation-only revision. Shared resolver `scripts/ui-bindings.mjs` dùng pinned TypeScript Program/tsconfig và real dependency module identity; canonical token/layout/visual/theme/component/composition exports được nhận theo symbol. Const aliases/barrels/namespace/literal element access/destructuring/safe type syntax giữ provenance; trusted names/fake visual suffix/parameter shadow/mutable alias/opaque access không nhận canonical. First-party JavaScript workers vào Program bằng allowJs dành cho source audit, không thay tsconfig hoặc giả typecheck proof.

Production composition và visual gates đã nối resolver; API/tag/role identity và genuine renamed styled được kiểm. Legacy syntax/virtual fixtures giữ vai trò parser/style diagnostics, không thay production-binding tests. Controlled MUI declarations trong unit fixtures chỉ kiểm resolver behavior; real project typecheck là command riêng. Native createElement/slot/callback producer/value/ancestry và layout integration chưa đóng toàn bộ S05–S10.

[Current fixtures](S05-related-fixtures-current.log)96/96,exit0, không skip. [S05-status.json](S05-status.json) ghi commands/exits/hash: layout75/0, visual75/0, composition74/0 và actual tsc --noEmit exit0. Test initial integration92/94 có2FAIL vì missing tsconfig làm mất JSON diagnostics; [initial log](S05-related-fixtures-initial.log) giữ riêng. Resolver config failure nay có binding finding và parse-only diagnostics, không lexical fallback/PASS. Intermediate94/94 giữ [log riêng](S05-related-fixtures-final.log), không cộng runs.

Lúc integration đầu, JS worker chưa vào Program; đã sửa allowJs. Visual lần đầu có4UNKNOWN cho finite canonical palette selection; đã resolve finite arrays/conditional branches, negative mixed raw palette vẫn FAIL. Những phát hiện này ghi từ command output của lượt triển khai, không giả có paired raw artifact cho các runs chưa lưu. Chưa sửa shared/feature UI hoặc chạy browser/full regression trong batch này. S05 IN_PROGRESS_PARTIAL_BINDING_INTEGRATION; S06–S20 còn mở. Sáu protected originals/plans/ledgers và Git index không đổi theo S05 capture.

Next: layout gate binding integration, remaining symbol paths và meaningful positive/negative/UNKNOWN probes; sau đó tiếp dependency của S06–S20. Không nhận scoped tooling PASS là UI conformance100%, owner acceptance hoặc Enterprise certification. S04 và status.json cũ phía dưới là snapshot discovery, không source/checker hashes mới nhất.

## Current S04 — discovery hoàn tất trong scope

S04 DONE_DISCOVERY_SCOPED. Thêm DOM parser từ JSDOM26.1.0 đã có trong workspace, không dependency mới; không execute script/resources khi audit HTML. Meaningful execution fixture có control ghi console để xác minh phép quan sát phát hiện execution, rồi chứng minh auditor không chạy script. Entry thiếu/module script thiếu, missing stylesheet/manifest/icon, inline styles/events/scripts/srcset chưa có mapping đều FAIL. Các source inline chưa được hỗ trợ không được mặc nhiên nhận sạch; S07/S08 vẫn phải bảo vệ style/value semantics.

CSS url references và CSV download qua Vite BASE_URL có local source mapping. PWA app-sw.js được đưa vào source scan; MSW worker được đối chiếu byte với vendor source đang cài, không rewrite library. Vite aliases đối chiếu tsconfig từ object được export/return; unused alias object không là proof. Vite config và first-party imports của nó cũng vào source closure; HTML-transforming hooks chưa có generated mapping FAIL. Opaque configs/URL syntax không được âm thầm đánh giá an toàn.

S04-entry-before.log tái hiện12gate bypass cases; các runs sau68/71/72/73/75/76 được giữ riêng. Final S04-coverage-fixtures-final.log77/77PASS,exit0. Current artifacts S04-coverage-check-layout.json75files/0findings, visual75/0, composition74/0; actual exits0. S04-entry-generator.log exit0,11outputs/283schemas/210operations/54routes. [S04-coverage.json](S04-coverage.json) đối chiếu expected/actual không thiếu/thừa;83runtime inventory rows đều được discovery;89input paths có hashes/treatment. Inventory363workspace files+1workflow, classification không phải364runtime verified files.

Phạm vi S04 là discovery/parser/import/entry/assets và applicability. Lexical-name trust/value/unit/owner/closed slots vẫn thuộc S05–S10; generic style/API escape hatches chưa được nhận đã khóa. Final source/hash/browser acceptance vẫn bắt buộc tại S19. Generator/library có owner/check riêng; metadata/input hashes không tự là visual proof. Tests mới chưa nối vào verify/workflow (S18). Không shared/feature UI edit, build/fullE2E/native/speech/owner proof mới. Tiếp tục S05, giữ full objectiveS03–S20.

## Historical S04 — các batch partial trước discovery closure

## Current S04 — import/config closure

Thêm ui-import-scope.mjs dùng pinned TypeScript và tsconfig thật; ba gates cùng dùng kết quả discovery. Quét cả configured first-party script files và import closure, không chỉ apps/web/src. Missing local/alias/CSS imports, opaque dynamic import, discovered script bị tsconfig loại và first-party path thoát project đều FAIL. CSS @import nối tiếp được theo; library imports và JSON/data assets được phân loại riêng. Fixture project có cấu hình hữu hạn và token package source để giữ positive canonical alias; không thêm dependency mới hoặc nới source policy.

S04-import-before.log ghi15cases,2PASS/13FAIL:12gate cases tái hiện import bypass; một malformed config test phát hiện TypeScript assertion do backslash config filename trên Windows. Chuẩn hóa filename sang dạng TypeScript sử dụng; không nuốt lỗi config. S04-import-after.log51/51, S04-config-closure-final.log53/53, S04-config-closure-final-ownership.log54/54; tất cả exit0, các runs được giữ riêng. Current gate artifacts S04-config-check-layout.json72files/0findings, visual72/0, composition71/0, đều actual exit0. Thêm3 first-party package script files vào coverage của app, không gọi72 là toàn bộ inventory.

**S04 còn mở:** HTML/source assets và inline style/script paths; CSS url/public/PWA/generated metadata; Vite/entry/config reconciliation; applicability cho slots và expected inventory-to-gate coverage. Resolver hiện mới dùng tsconfig để discovery, chưa là symbol/binding provenance S05. Shared/feature UI chưa sửa; không build/browser/fullE2E trong batch này. status.json.checks là batch hiện hành; priorChecks là batch S03/initial S04 bên dưới. Không nối số tests từ các runs thành một phép thử mới.

**Final của batch import/config:** thêm negative fixture cho malformed CSS và stylesheet language chưa có parser. Không phân loại SCSS/Sass/Less/Stylus như data asset vô hại; ghi unsupported FAIL. CSS parse failure cũng đến composition gate qua scope helper, không chỉ hai style gates. S04-config-closure-final-style.log đạt55/55,exit0; current gate artifacts là S04-config-final-check-layout.json72/0, visual72/0 và composition71/0, exit0. Giữ artifacts của các intermediate runs riêng. Inventory refresh361workspace files+1workflow,0unknown categories và0unresolved own runtime imports; không claim362files đã runtime-verified.

## Historical S03 và initial S04

Goal hiện hành yêu cầu triển khai toàn bộ kế hoạch tới khi hoàn tất. Lượt specification trước đã hoàn thành; đây là tiến độ triển khai thực, không thu nhỏ objective S03–S20.

## Đã thực hiện

**S03 DONE_INTAKE.** Baseline nguồn/checker/index/protected files ở S03-before.json được giữ nguyên. TypeScript helper bỏ global fallback, kiểm exact pin5.9.2, manifest/module version, realpath package/module/executable nằm trong local dependencies. Thiếu hoặc sai trả ERR_PROJECT_TYPESCRIPT. Không thêm dependency hoặc thay public helper API. Typecheck thật exit0; domain/mock transport88/88; source68files/54routes và boundaries504imports/10fixtures đạt; generator11outputs/283schemas/210operations/54routes đạt.

**S04 IN_PROGRESS_PARTIAL_SCOPE.** Ba gates dùng chung discovery invariant nhỏ, chặn missing/empty/generated-only application source, không silently bỏ JS/JSX/MJS/CJS. TypeScript chọn parser theo tên file; parse failure bị ghi FAIL. Symlink source chưa xác định owner bị từ chối. Giữ parser/style/exception checks hiện có. Visual fixtures có app source thật thay vì dựa vào root rỗng; không tạo production waiver cho test.

Không sửa shared UI implementation hoặc feature UI ở batch này. Loaded render BEFORE phải chụp đúng route/state trước S11/S12, không lấy tooling baseline làm visual proof.

## Bằng chứng kiểm tra

- S03-compiler-before.log:6tests,2PASS/4FAIL tái hiện helper cũ; S03-compiler-after.log:8/8PASS,exit0.
- S04-scope-before.log:12negative cases,2PASS/10FAIL tái hiện gate scope thiếu.
- S04-scope-after.log:35/36PASS,exit1 do expected file count của visual fixture cũ chưa gồm app entry. Sửa fixture expectation giữ assertion discovery feature; không nới gate.
- S04-fixtures-final.log:44/44PASS,exit0 gồm8compiler,12scope và24existing checker cases. Không cộng hai run thành một lần PASS.
- S04-layout.log:69files/0finding/1scoped exception; S04-visual.log:69/0; S04-composition.log:68/0; đều exit0 theo capabilities hiện có.
- status.json ghi commands/exits/hashes và bảo toàn index/originals/FE/full-product ledgers. Capture không tự xác thực log; exits lấy từ actual command results.
- Inventory mới358workspace files+1active parentworkflow,73app source files/24feature files/16modules/54routes;0unknown category/0unresolved own runtime imports. Năm nonliteral tooling constructions có finite source mappings; không là missing runtime imports. Classification không là rendered conformance.

## Còn phải thực hiện

S04 chưa hoàn tất: permanent gate còn cần tsconfig/import/package closure reconciliation, HTML/assets/slots applicability, missing-import/scope mutation controls và đối chiếu expected coverage. Source scan69/68files không đại diện359inventory entries. S05 binding/provenance, S06–S10 mutation/style/value/owner/API, S14 catalog checks và S15 browser harness còn mở; chưa triển khai visual owner migration S11/S12 hay các gates cuối S16–S20.

Các tests mới chưa nối vào package verify/active workflow; wiring thuộc S18 và không được gọi đã có CI enforcement. Chưa chạy production/demo build, full E2E, browser/native resize/zoom, speech/hosted CI/owner acceptance. Không claim Enterprise hoặc100%UI. Goal tiếp tục active; bước tiếp theo là phần scope còn thiếu của S04, theo dependency trong plan.
