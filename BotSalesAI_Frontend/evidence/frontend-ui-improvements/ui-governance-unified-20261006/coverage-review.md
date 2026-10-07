# Kiểm kê ranh giới UI — 06/10/2026

Đây là audit đọc source/config và phân loại file trước triển khai. Không sửa React, CSS, contract, token, config, workflow hoặc ledger. Inventory là evidence snapshot; không là nguồn quy định hay tracker thứ hai. Phân loại đủ file không đồng nghĩa từng behavior hoặc gate đã được kiểm chứng.

- Tái lập: `node evidence/frontend-ui-improvements/ui-governance-unified-20261006/inventory.mjs`.
- Dữ liệu đầy đủ từng file: [inventory.json](inventory.json); script: [inventory.mjs](inventory.mjs).
- Mỗi entry có path, hash, bytes, Git presence, category, owner, edit policy, kiểm tra hiện có, kiểm tra cần làm, S-step, import references và route impact. `plannedTreatment` theo chuẩn §0.3; `verificationStatus=NOT_RUN_THIS_DOCS_TURN`, không mặc định gate PASS. Source KEEP_VERIFY cần assessment ở implementation intake; file đúng thì giữ, finding thật mới EDIT_VERIFY. Generated/icon/manifest/worker là GENERATE_VERIFY, tooling/config/tests là TOOLING_VERIFY, public sample/handwritten worker là ASSET_VERIFY, Universal/ledger/history là REFERENCE_READONLY.
- Dùng nguyên tắc Karpathy: hiểu scope trước; inventory nhỏ, dùng TypeScript/compiler và generator đang có; không thêm dependency hay framework gate; không đổi code không liên quan.

## 1. Mẫu số kiểm kê và giới hạn kết luận

Snapshot đo được **355 file liên quan trong workspace +1 workflow thật ở Git root =356 entries**. `apps/web/src` chỉ là một phần: **73 files =68 TS/TSX +2 CSS +2 JSON +1 README**. 68 TS/TSX gồm40 TS và28 TSX, không phải toàn bộ code/UI boundary.

Disk traversal đọc tên mọi file/leaf symlink; file secrets cục bộ chỉ được đếm, không đọc content/hash. Nó phân vùng disk thành file liên quan và những họ loại trừ có lý do. Ở snapshot14:15:21 UTC: **72,649 =355 relevant workspace +72,294 excluded**; workflow ngoài workspace được ghi riêng. File evidence mới có thể làm mẫu số disk tăng, không tăng số source UI. Khi tái lập inventory, `checkedAt` và số disk/excluded trong JSON là snapshot mới, các số14:15:21 ở report này là historical observation có công bố thời gian. Kết quả này là coverage phân loại theo ranh giới đã công bố, không là % Enterprise, % tuân thủ hoặc kết quả kiểm thử.

**Không file relevant nào còn UNKNOWN owner/category tại snapshot.** Có5 import bằng biểu thức trong tooling không resolve bằng literal:4 có finite source mapping được kiểm tồn tại,1 global compiler fallback còn UNKNOWN path/version; chúng giữ nhãn rõ ở JSON. Source dependency closure dùng literal import/re-export/dynamic import hiện không có unresolved own import. Closure có83 entries khi cộng HTML/manifest/icon/worker entrypoints; có cả demo branch và type dependencies, không được suy rằng83 files đều có trong live bundle.

## 2. File families phải được đưa vào kế hoạch

| Family | Files | Owner/edit policy | S-steps chính |
|---|---:|---|---|
| App entry/router/shell/bootstrap/type support |14| App owner; source/UI impact trước sửa |S04–05, S07–09, S15–16, S19|
| Feature source/helper |24|16 module owners; không module import module khác |S04, S09–13, S15–16, S19|
| Shared UI source/catalog |6|5 runtime owner files +README API catalog; chuẩn normative tại docs |S05–14, S19|
| Shared behavior/model |13|shared/api, shared/model; giữ hành vi, scope, query và drafts |S04–05, S19|
| Synthetic demo state/data |15|mocks chỉ demo/test; không Backend thật |S04, S15, S17, S19|
| Generated frontend outputs |11|Generator/canonical input; không sửa tay |S04, S08, S18–19|
| Generated vendor worker |1|MSW/setup; ignored nhưng được ship ở demo |S04, S18–19|
| HTML entry |1|Native HTML/head/skip link/entry CSS/startup |S04, S07–08, S15, S19|
| Handwritten public worker/sample |2|Push-only app-sw.js +products.csv |S04, S07–08, S18–19|
| Tests/fixtures/test generators |95|Vitest/Node/Playwright; expected failures +positive +UNKNOWN cases |S04–10, S14–17, S19|
| Frontend tools/gate config |16|Checkers/generator/runner/exception schema; không tự miễn gate |S04–09, S14, S17–18|
| Toolchain config/lock/templates/editor tasks |17|Compiler/Vite/ESLint/test discovery/mode/lock |S03–05, S18–19|
| Canonical contracts/tokens/acceptance inputs |18|JSON canonical; chỉ sửa nếu UI contract thật cần |S03–04, S08, S14, S19|
| Derived kit input views |3|openapi.yaml, operation-index.json, tokens.css; sinh từ canonical |S03–04, S08, S14|
| Canonical frontend task plan |1|frontend-plan.json; regenerate display views khi thay đổi |S02–03, S14, S20|
| FE ledger/view |2|Chỉ canonical checkpoint khi đủ evidence nguyên task; audit này read-only |S17, S20|
| Generated FE plan/progress views |30|IMPLEMENTATION_PLAN, FE tasks và FRONTEND_PROGRESS; không sửa status tay |S02, S14, S20|
| Policy/plan/docs |63|Nguồn authority/routing hiện có; không nhân bản normative scales |S02–03, S14, S17, S20|
| Kit validation/generation tools |11|Chỉ phần sync Frontend cần thiết; không full-product checkpoints |S03, S14, S20|
| Release/evidence snapshots |7|Freshness/provenance; không tự coi là current PASS |S17, S20|
| Synthetic root CSV samples |3|Finance/catalog parser and acceptance fixtures |S03, S15, S19|
| Original Universal rules |2|Giữ nguyên root/kit byte identity |S02, S14, S20|
| Active parent workflow |1|`../.github/workflows/frontend.yml` |S04, S18–19|

Tổng356. Đây là mapping nhiệm vụ bảo trì; không yêu cầu sửa mọi file. File đúng hiện tại giữ nguyên, nhưng vẫn thuộc coverage/evidence khi owner thay đổi có impact.

## 3. Không bỏ qua những đường vào ngoài source folder

1. `apps/web/index.html:1` nạp `/src/app/tokens.css`, `/src/app/bootstrap.css`, manifest và main. `main.tsx:10–11` cũng import2 CSS. Kiểm kê resolve5 HTML/manifest entry references; tất cả target tồn tại. Việc CSS được tham chiếu cả HTML lẫn JS cần đánh giá bằng built artifact/load behavior khi sửa entry, không tự xóa vì thấy trùng dòng.
2. Vite/TS aliases trỏ `@botsales/contracts` và `@botsales/tokens` ra8 package source/data files. Các file này hiện toàn generator-owned, nên gate phải verify provenance và parity, không consumer exemption theo tên thư mục. Không có handwritten package source bị bỏ sót tại snapshot.
3. Root generator sinh11 outputs:6 contract package files,2 design-token package files, token CSS, manifest và icon. Manifest/icon có raw canonical colors hợp lệ theo generator; không áp ban consumer literal lên generated SVG để sửa tay.
4. `mockServiceWorker.js` hiện ignored bởi Git nhưng phải tồn tại khi demo chạy. Đây là generated third-party worker, chủ sở hữu là locked MSW/setup. Không loại khỏi runtime assurance chỉ vì `git ls-files` không thấy nó. Live build isolation/unregister behavior kiểm riêng.
5. `app-sw.js` viết tay và registration tại notifications/index.tsx:87; push path, navigation, permissions và accessibility behavior phải giữ. Đây không là backend worker hoặc lý do thêm backend task.
6. `apps/web/public/samples/products.csv` và root `samples/*.csv` đều được kiểm kê. Public file có thể không có static TS import nhưng vẫn là deployable asset; không loại khỏi scope dựa riêng import closure.
7. Active CI ở Git-root `.github/workflows/frontend.yml`; workflow cũ trong frontend/.github được staged-delete và JSON ghi rõ retired path với RETIRED_VALIDATE. Giữ nguyên deletion và staged/dirty work của người dùng. Push/PR path filters hiện gồm`BotSalesAI_Frontend/**` và workflow itself. 45-minute timeout, verify/E2E commands và upload dist/dist-demo/test-results là config đã đọc, không hosted run PASS.
8. Mã tạo DOM ở startup fallback main.tsx cũng là UI. Closed shared composition API không tự kiểm được native DOM/HTML/style/slot paths; S04/S07 phải có coverage contract cho các entry này.

## 4. Source gates hiện đo phạm vi khác nhau

| Gate/config scope đọc từ code | Files thuộc scope hiện tại | Giới hạn |
|---|---:|---|
| TypeScript source program (first-party TS/JSON imports) |78|Không bao public worker, HTML, CSS, test/config programs; source membership không phải typecheck PASS |
| Lint/source scan dưới apps/web/src |68|Không tự bao package/public/test/config/HTML |
| Layout scan |69|68 TS/TSX +bootstrap CSS; generated token CSS qua provenance riêng |
| Visual-token scan |69|Như trên; không SVG/HTML/JSON seed/public worker |
| Composition scan |68|TS/TSX; không đủ chứng minh actual render hoặc native DOM/style channels |
| Generator outputs |11|Parity/provenance riêng; không browser behavior |

Các số trên được tính theo scope implementation đã đọc, **không chạy hoặc báo PASS các gate** trong audit inventory này. `currentGates` booleans ở JSON biểu thị thuộc phạm vi, không kết quả execution. S04 phải làm source/generator/native/imported-asset coverage minh bạch; không ép mọi data/worker file có spacing rule không liên quan. S07/S08 khóa style source/values tại đường thực sự có thể tác động UI; unsupported syntax/style channel phải hiện UNKNOWN thay vì mặc định sạch.

## 5. Mapping mọi module và route

Đối chiếu canonical manifest với54 entries trong `router.pages`, lazy-selected export và function declaration ở file trong route-implementation. **54/54 có mapping static phù hợp; không extra router page, không missing source/function.** R19 có wrapper OrderPage→OrderDetailPage; Catalog imports routes được re-export tại catalog/index.tsx:165 từ imports.tsx. Đây là mapping static; các trạng thái/permission/browser render không được nhận PASS từ bảng này.

| Module | Source/helper files | Canonical route IDs |
|---|---:|---|
|bot|1|R26,R27,R28,R51|
|catalog|3|R09,R10,R11,R12,R13,R14|
|customers|1|R07,R08,R54|
|dashboard|1|R04|
|finance|3|R20,R21,R22,R48,R49,R50|
|fulfillment|1|R41,R42|
|inbox|2|R05,R06|
|integrations|1|R29,R30|
|inventory|1|R15,R16|
|knowledge|1|R23,R24,R25|
|notifications|2|R39,R40|
|operations|1|R37,R38,R52|
|orders|2|R17,R18,R19,R43|
|procurement|1|R44,R45,R46,R47|
|reports|2|R31,R53|
|workspace|1|R01,R02,R03,R32,R33,R34,R35,R36|

Mỗi module file hiện nhận impact bảo thủ là toàn routes trong module. Shared/runtime common owner nhận toàn54 routes. S03/S15 phải refine symbol/variant/state/profile impact; bảng static không được tự bỏ route chỉ vì kiểm một trang cùng tên hoặc cùng profile. Profile/state mapping chưa tự chứng minh bởi inventory này; dùng contract và browser expectations trước migration.

## 6. Unknown resolution hiện được giữ rõ

5 nonliteral `require` calls trong tooling:3 tại scripts/test-domain.mjs:13 trỏ finite temp outputs service/database/files.js, tương ứng source service/database/files.ts tồn tại;1 tại line14 trỏ tests/domain-scenarios.cjs tồn tại;1 tại scripts/tools.mjs:7 trỏ compiler global fallback. RootDir/outDir/files trong compiler config được đọc để xác định3 temp output constructions, không chạy temp build để giả output đã có. Bốn source mappings được ghi BOUNDED_TEMP_COMPILE_OUTPUT/BOUNDED_REPOSITORY_TEST_MODULE và NOT_RUN_THIS_DOCS_TURN; global fallback path/version chưa resolve giữ UNKNOWN_ENVIRONMENT_PATH_AND_VERSION. Đây không phải unresolved runtime app imports. Current script vẫn giữ NON_LITERAL_DYNAMIC_IMPORT, bổ sung resolutionClassification để không vô tình biến biểu thức tooling thành trusted source. Khi S04/S05 gia cố, dùng bounded tooling behavior/helper, không blanket suppression cho cả repo.

## 7. Những họ được loại khỏi sản phẩm, vẫn được đếm

| Family | Snapshot count | Vì sao |
|---|---:|---|
|node_modules dependency install|66,485|Third-party; verify lock/version/audit và browser artifacts, không refactor vendor UI |
|Evidence snapshots/tooling|5,550|Historical/current reports, captures, logs; không đếm thành product source |
|Full-product tracker|95|Frontend-only; tasksT/plan/progress Backend read-only |
|Prototype/reference archive|88|Không import vào app; không port HTML prototype |
|Build outputs|72|Source-derived dist/dist-demo; rebuild, không sửa trực tiếp |
|Test outputs|3|Run-generated snapshots/results |
|Local environment|1|Bảo vệ secrets; content/hash không đọc |

Tổng excluded72,294 tại snapshot14:15:21 UTC. Empty `.github/workflows` trong workspace và nested`BotSalesAI_Frontend/botsales-kit` không tạo file source. Họ loại trừ có tên và lý do; file mới ở source/import closure không được tự xếp vào họ lịch sử chỉ để tránh gate.

## 8. Acceptance bổ sung cho kế hoạch thống nhất

- S03: freeze **list và hash** source/config/canonical inputs; classify generated/handwritten/runtime/test/tooling/doc, owner và relevant checks; static inventory ≠ UI verified.
- S04: compare disk+Git+import closure/entrypoints; source mới/mất file/không resolve/extension hoặc style path không hỗ trợ phải có verdict. Test HTML native style, imported CSS/assets ngoài src, barrel/package imports, public worker và generated bypass phù hợp scope. Không giới hạn mẫu số ở68 TS/TSX.
- S05–10: policy-binding/readonly/style/value/ancestry/closed API fixtures cần cover owners và imports thực; dùng compiler hiện có, không build generic metadata engine hoặc dependency mới.
- S11–13: rollout consumer **theo toàn16 module lists**; sửa owner một lần khi đúng, module helper/public workers vẫn giữ behavior. Không bắt sửa file đã đúng.
- S14: catalog/policy sync cần cả generated-source ownership và current file additions; không catalog hóa toàn bộ business forms thành shared abstractions.
- S15–16: route/state/profile observations theo54 canonical routes và current impact; expected groups/readiness, native text/zoom/focus/overlay riêng. No zero-groups PASS.
- S17–18: fingerprint canonical inputs/config/tests/entrypoints/workflow, không chỉ `.tsx`; source hash đổi thì coverage/evidence freshness thay đổi. Required local checks phải gồm generator/shared gates/browser impact; remote CI chưa chạy ghi NOT_RUN.
- S19–20: compare initial/final complete classified lists, authorize diff từng file, regenerate outputs qua canonical writer, không unexplained new/missing/unowned files; không nhận100% compliance từ số inventory entries.

Không build, lint, typecheck execution, full E2E, browser native zoom, speech, hosted CI hoặc owner acceptance trong inventory task. Chỉ script inventory đã chạy exit0 và kiểm kê tĩnh theo source hiện tại.
