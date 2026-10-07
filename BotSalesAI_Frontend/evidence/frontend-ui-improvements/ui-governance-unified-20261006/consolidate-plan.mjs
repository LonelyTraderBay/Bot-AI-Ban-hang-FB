// One-off docs-only plan edit, preserving existing stable S01–S20 IDs.
import fs from 'node:fs';
const path = 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md';
let text = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
function once(before, after) {
  if (text.split(before).length !== 2) throw new Error(`Expected one occurrence: ${before}`);
  text = text.replace(before, after);
}
function section(start, next, body) {
  const a = text.indexOf(start), b = text.indexOf(next, a);
  if (a < 0 || b < a) throw new Error(`Section missing: ${start}`);
  text = text.slice(0, a) + body.trimEnd() + '\n\n' + text.slice(b);
}
once('**Phiên bản:** 15.0', '**Phiên bản:** 16.0');
const current = text.match(/^\*\*Lượt yêu cầu hiện hành v15\.0:.*$/m)?.[0];
if (!current) throw new Error('Current summary missing');
once(current, '**Lượt yêu cầu hiện hành v16.0: thống nhất tài liệu trước khi sửa code UI.** [§16](#steel-plan) quản lý một workflow, CURRENT/TARGET contract đủ27 shared APIs, inventory từng file và rollout theo dependency/acceptance. Nguồn quy định: [standard v1.25 §0](FRONTEND_SPACING_STANDARD.md#unified-workflow), SPC-001–075 giữ ID. S01–02 hoàn tất audit/specification; S03–20 chưa triển khai runtime/checker/browser runner trong lượt này. Không đổi React/tokens/contracts/generated code/CI/ledger. v15.0 là audit bypass trước hợp nhất; v14.0/§15 là migration trước có176 vị trí/21 file/16 module và evidence riêng. Mục8.x–15.x là lịch sử theo thời điểm ghi, không thay current evidence hoặc giao việc từ “next” cũ.');
section('### 16.1. Phạm vi', '### 16.2. Dữ liệu', `### 16.1. Phạm vi, kết luận và cách hiểu 100%

Quy định có hiệu lực: [standard v1.25 workflow §0](FRONTEND_SPACING_STANDARD.md#unified-workflow), SPC-001–075. [Catalog CURRENT/TARGET](../apps/web/src/shared/ui/README.md) ghi đủ27 APIs và owner ngoài shared. Mọi AI/tác giả trong scope áp dụng cùng chuẩn; inventory đã phân loại không chứng minh enforcement100% hoặc UI đạt Enterprise. FE-G01..09 vẫn cần evidence riêng.

Scope: React Frontend và import/build/test/style/asset closure của BotSalesAI_Frontend: app/Shell/feature-local/shared, HTML/CSS, packages generated, public/PWA, contracts/tokens, synthetic MSW, config/tooling/tests/docs và active parent workflow. Theo yêu cầu mới nhất, **lượt này dừng ở audit/specification/kế hoạch trước sửa code**. Khi triển khai, AI tự xử lý prerequisite Frontend/sửa/kiểm/bàn giao; dependency là thứ tự kỹ thuật, không approval giữa chừng. Không Backend/live/deploy/owner acceptance, task chờ hosted CI, FE-ID/ledger/checkpoint mới. Các tracker full-product giữ read-only.

Áp dụng [Andrej Karpathy Skills](plugin://andrej-karpathy-skills@openai-curated-remote): hiểu trước, nêu giả định, sửa root cause nhỏ nhất, tái dùng TypeScript/PostCSS/MUI/test tooling; thay đúng vùng và kiểm invariant. Không framework/provider/CRUD/form/slot/schema engine/dependency mới. Explicit finite forwarding có thể dài hơn generic spread nhưng dễ kiểm/bảo trì; không KPI số dòng/component/rule.`);
once('### 16.3. Inventory và quyết định', `**Bổ sung tái đo v16.0:** [inventory](../evidence/frontend-ui-improvements/ui-governance-unified-20261006/inventory.json) phân loại **355 workspace files +1 active parent workflow**, 73 files dưới apps/web/src (68TS/TSX), 24 feature files/16modules và11 app generator outputs. Manifest54 IDs khớp54 router bindings/exported components,0 thiếu/0extra. Runtime literal import/entry closure không unresolved first-party import. Tooling có một global TypeScript fallback path/version chưa xác minh, xử lý S03; các temp output paths được map nguồn rõ. 71 nested MUI metadata/slot declarations là paths cần kiểm, không71 lỗi. Disk/excluded counts tăng theo artifacts nên không pin thành allowlist. [Coverage review](../evidence/frontend-ui-improvements/ui-governance-unified-20261006/coverage-review.md) ghi denominator/quyền edit/gates và giới hạn.

### 16.3. Inventory và quyết định`);
once('| Pager |36/15| Cursor/history/disabled, inset16/action8 | Giữ; không đổi pagination semantics vì style |', '| Pager |36/15| Cursor/history/disabled, inset16/action8 | Giữ; fixture hasMore=true/nextCursor=null trước xử lý enabled-no-op source-condition risk |');
once('Kiểm inset/header relationship và compact radius12/8', 'Kiểm inset/header relationship và named radius từ canonical role; không ép radius vào spacing scale');
once('Chi tiết props/lines/invariants ở shared audit.', 'Chi tiết CURRENT/TARGET props/slots/semantics/acceptance đủ27 APIs tại catalog; [shared contract review](../evidence/frontend-ui-improvements/ui-governance-unified-20261006/shared-contract-review.md) là evidence nguồn, không policy thứ hai.');
once('### 16.5. Hợp đồng khoảng cách', `**A19 /P1 — Pager source-condition risk:** Page contract cho phép hasMore=true và nextCursor=null; source enable nút next theo hasMore nhưng handler chỉ đổi cursor khi có nextCursor. Chưa browser-confirm trên demo; tạo regression payload này tại S12 trước chọn frontend safe behavior. Giữ Backend/schema ngoài scope; không render enabled-no-op.

### 16.5. Hợp đồng khoảng cách`);
section('### 16.6. Kế hoạch triển khai', '### 16.7. DoR/DoD', `### 16.6. Kế hoạch triển khai chi tiết, dependency và tiến độ

S01–S20 là bước ổn định trong backlog §16, không task/ledger mới. Workflow/fields bằng chứng theo standard §0/§13.2. Bảng này chỉ giữ work/dependency/acceptance/status. DONE_AUDIT/SPECIFICATION không DONE_RUNTIME. Artifact docs hiện hành tại [REPORT](../evidence/frontend-ui-improvements/ui-governance-unified-20261006/REPORT.md).

| Bước | Ưu tiên / dependency | Công việc và file owner | Acceptance đo được | Trạng thái |
|---|---|---|---|---|
| S01 | P0 /— | Disk+Git+import/entry/route inventory; toàn27 APIs và app/local/style/package/asset/test/config owners; adversarial baseline | Mọi relevant file có owner/treatment/step; routes/source khớp; exclusions/unknown-resolution rõ; không đoán readiness% | DONE_AUDIT |
| S02 | P0 /S01 | Hợp nhất standardv1.25/workflow, catalogCURRENT/TARGET, routingdocs, planv16; 75 IDs giữ nghĩa | Một workflow; 27contracts; current/history tách; links/IDs/deps/coverage kiểm; runtime không đổi | DONE_SPECIFICATION |
| S03 | P0 /S01,S02 | Refresh inventory/hashes và design/evidence scope contract; xác minh pinned TypeScript resolution cả fallback tooling | Import/style/tooling inputs resolved hoặc explicit unsupported FAIL; immutable originals/generated/ledgers rõ; loaded before baseline trước mỗi source batch | READY |
| S04 | P0 /S03 | Existing3gates: root/parser/scope fail-closed; discovery JSX/native/CSS/HTML/assets/packages/slots và current gate applicability | Empty/missing root/import/new file/parse failure reject; expected inventory=scan coverage; generated/library paths có gate riêng | TODO |
| S05 | P0 /S04 | Resolver/binding/provenance nhỏ qua TypeScriptProgram/tsconfig/realpath/alias/barrel/namespace/element-access/shadow | P01/02/08/19/20 không lọt; canonical aliases PASS; module public entry/boundary đúng; no name-based trust | TODO |
| S06 | P0 /S05 | Readonly canonical public values +consumer write scan tại layout/visual/token owners | P09 mutation/alias/Object.assign FAIL; reads/generator/types đúng; runtime canonical data không bị sửa bởi consumer | TODO |
| S07 | P0 /S05 | All style entries: native/MUI spread, styled/GlobalStyles/style-tag/createElement, ReactNode creators, slotProps/CSS | P06/12/16/17/18 bị gate tương ứng kiểm; safe ref/name/event/RHF/adornment PASS; opaque visual source UNKNOWN/strict fail | TODO |
| S08 | P0 /S05,S07 | Value/unit provenance: shorthand/logical vars/calc/aliases/computed arithmetic/theme/breakpoint; generated asset metadata input | P03–07/19/21–25 blocked đúng gate; canonical/system/forced-color/intrinsic geometry PASS theo scope, không round mọi số | TODO |
| S09 | P0 /S05,S07 | Role/ancestry ownership theo binding; wrappers/fragments/conditionals/QueryState/portals/native render | P10–15/20 FAIL; distinct nested surfaces PASS; unresolved ownership không clean; đúng lastvisible-header/body edges | TODO |
| S10 | P1 /S05,S09 | Khóa đủ27 public APIs và value/slot closure; normalize safe asconst/satisfies; flow/geometry/columns/variant/responsive | F01 PASS; unknown override/keys/values/branches FAIL; valid native form/ref/ARIA/data/RHF giữ; source/types/catalog khớp mọi export | TODO |
| S11 | P0 /S03,S09,S15 | Fresh baseline → sửa Finance three titledPanel owner cases → rà toàn Panel/page/shell consumers theo §16.11 | Header-lastvisible→first-body16±0.5 CSSpx ở affected small/large; không double inset; h2/actions/bottom inset/behavior giữ | TODO |
| S12 | P1 /S03,S08,S09,S10,S15 | Inventory86QueryState placements; minimal state geometry/variant thật; intrinsiclink role; Pager regression; rollout hết16modules/24featurefiles | Không universal240 inline; giữ pending/stale/error/refetch/draft/URL/permission; safe malformed-page behavior sau repro; mọi file/route/slot được EDIT/KEEP_VERIFY | TODO |
| S13 | P2 /S02,S10 | Optional runtime cleanup: two notice lifecycle,422metadata after repro, close offset classification, formatting touched owners | KEEP/adopt/remove rationale bắt buộc qua S14/S19; cleanup N/A nếu không có defect/benefit; defect tái hiện nâng priority vào S11/S12, không deferred | TODO_OPTIONAL_CLEANUP |
| S14 | P1 /S02,S05,S10 | Small permanent policy check/fixtures nếu checker hiện có chưa đáp ứng; IDs/pointers/catalog export-type-role-consumer mapping | Missing/duplicate/stale/newunmapped export FAIL; all27 lifecycle dispositions có lý do; generated/reference permissions đúng | TODO |
| S15 | P0 /S03,S09,S10 | Gia cố existing browsercollector/ownership regression trước owneredit: readiness/minobservations/profile+slot+state+variant | Wrong route/loading/zero groups reject; baseline cases bắt Finance defect; positive distinct surface/fragment/wrappedactions PASS; final acceptance sau S11/S12 | TODO |
| S16 | P1 /S11,S12,S15 | Dùng runner/assertions hiện có: reflow/text200/browserzoom200/focus/hit/occlusion/portal/nativefallback | 320CSSpx; native text/zoom methods riêng; critical target/action/draft không mất; method chưa chạy NOT_RUN | TODO |
| S17 | P1 /S03,S14,S15,S16 | Small permanent evidence completeness/provenance check +fixtures, dùng task artifacts hiện có | Missing/stale/fakebefore/nonzeroexit/incompletefile-route-slot-state coverage strict FAIL; N/Areason; validator không chứng minh log đúng | TODO |
| S18 | P1 /S04,S05,S06,S07,S08,S09,S10,S14,S17 | Nối required checks vào verify/active ../.github/workflows/frontend.yml; trigger ownworkflow+UI closure/timeout/artifacts | Local equivalent chạy đủ; workflow/script failures không mask; parentworkflowactive/nestedretired đúng; không hostedPASS | TODO |
| S19 | P0 /S11,S12,S14,S16,S17,S18 | Final allfile/allconsumer reconciliation, relevant unit/domain/fixtures/source/build/demo isolation +full built-demo E2E khi shared impact toànapp | 356inventory rows refresh+verdict/treatment, all27 reviewed incl lifecycle;54routes small/large engines +impact states; FAIL/retest riêng; final hashes | TODO |
| S20 | P0 /S19 | Final diff/hash/catalog/rule/coverage handoffREPORT; FE/fullproduct chỉ đọc theo quyền hiện hành | Mandatory scope checks có proof; open limits rõ; UI/ARCH separate; no owner/speech/hosted/Enterprise claim từdocs | TODO |

**Thứ tự thực thi:** S03 → S04–05 → S06–09 → S10 → S15 readiness/regression harness → S11 confirmed owner fix → S12 waves → S16 → S17–18 → S19–20. S14 chạy sau S10 song song owner migration. S13 cleanupP2 không prerequisite S19: classification/lifecycle decisions vẫn bắt buộc ở S14/S19, runtime cleanup chỉ nếu cần; defect thật phải nâng vào mandatory wave. Không để optional readability trì hoãn sửa lỗi đã chứng minh. S15 tạo harness trước sửa; final evidence dùng source cuối, không baseline lấy sau.

Không gom checker thành generic interpreter/schema engine. Chỉ shared resolver helper khi binding/provenance lặp ở ≥2 existing gates và API/fixture hữu hạn. Không thêm package. Mỗi batch một writer shared/canonical; module độc lập được song song sau contract ổn định.`);
section('### 16.7. DoR/DoD', '### 16.8. Ma trận', `### 16.7. DoR/DoD và cơ chế AI phải tuân thủ

Thực hiện nguyên [workflow chuẩn §0](FRONTEND_SPACING_STANDARD.md#unified-workflow) và [artifact fields §13.2](FRONTEND_SPACING_STANDARD.md#132-fields-bằng-chứng-của-chính-task). Không checklist thứ hai ở plan. Task nhỏ ghi gọn, shared change đủ graph/profile/slot/state/branch/native/style impact; baseline đúng lúc source edit, giữ behavior/query/draft/permission. Latest docs-first scope không tự chuyển sang runtime khi chưa kết thúc specification.

| Trục | Giá trị và cách hiểu | Điều kiện |
|---|---|---|
| Tiến độ | SPECIFIED /IMPLEMENTED /VERIFIED_SCOPED; S statuses | Không dùng đã viết policy/source thay checks; mandatory proof thiếu vẫn open |
| Acceptance | ĐẠT /CHƯA ĐẠT /CHƯA XÁC MINH /KHÔNG ÁP DỤNG kèm lý do | Theo original AI_RULES; UI/ARCH/source/paired/native có verdict riêng |
| Bàn giao | READY_FOR_ACCEPTANCE /DELIVERED_WITH_EVIDENCE_LIMITS | Không owner accepted; limits giữ check liên quan mở, không DONE/PASS giả |

Markdown không bảo đảm người có quyền source sẽ không bypass. Enforcement là tooling +meaningful fixtures +render/behavior+evidence checks thật theo S03–20. Các check dự kiến chưa có không được ghiPASS. Hosted policy/protection/screenreader/owner proof ngoài lượt local được ghi chưa xác minh, không tạo external wait và không tựpush/deploy. Thay gate phải có equivalent/increased positive/negative/UNKNOWN proof theo SPC-072.`);
once('Expected gap/inset±0.5 CSS px, internal scroll hợp lệ', 'Expected owner edge gap/inset±0.5 CSS px; CSSgap vsdistributed/wrap rõ; internal scroll hợp lệ');
if (text.includes('### 16.10.')) throw new Error('Plan appendix already exists');
text += `
### 16.10. Coverage từng file, không bỏ sót code UI

Nguồn tái lập: [inventory.mjs](../evidence/frontend-ui-improvements/ui-governance-unified-20261006/inventory.mjs), [inventory.json](../evidence/frontend-ui-improvements/ui-governance-unified-20261006/inventory.json), [coverage-review](../evidence/frontend-ui-improvements/ui-governance-unified-20261006/coverage-review.md). Đây là task-local audit, không permanent runtime gate hoặc FE tracker.

Mỗi row có path/hash/category/owner/editPolicy/plannedTreatment/requiredVerification/rolloutSteps/gitState/import references/route impact; verificationStatus ở lượt này là NOT_RUN_THIS_DOCS_TURN. KEEP_VERIFY nghĩa phải assessment/check tại implementation intake, không “file không đổi = đã đạt”. Khi có finding thì chuyển EDIT_VERIFY và chỉ sửa vùng liên quan. Deleted paths có RETIRED_VALIDATE, không khôi phục dirty deletion tự động.

| Boundary | Inventory/owner cần reconcile | Triển khai/kiểm |
|---|---|---|
| App/root/native/Shell/style | main.tsx, index.html, app files, bootstrap.css, routes/fallback/feedback/recovery/nav/banner/demo/footer | S03–09 scope/style; S11–12 assessment; S15–19 states/render/focus |
| Shared foundation | 27API owners, theme/layout/visual, model/API hooks/helpers | S05–10 binding/value/API; S11–14 minimal fixes/catalog; S19everyconsumer |
| Feature UI và helpers | 24files/16modules; JSX +import/parser/chart/preview helpers | Waves §16.11; source/read/action states, không chỉ index.tsx |
| Generated app outputs | 11outputs theo scripts/generate.mjs, gồmcontracts/tokens/CSS/icon/manifest | GENERATE_VERIFY; input/version/freshness/isolation; không handedit |
| Public/PWA/vendor/demo | app-sw.js/sampleCSV/pinnedMSWworker/mockstate/locale/data | Boundary/paths/persistence/capability/source-gate applicability; worker/generated/library owner rõ |
| Tests/tooling/config/CI | Node/Vitest/Playwright, scripts/fixtures, tsconfig/Vite/envtemplates/packages/lock, activeparentworkflow | S03–10 controls/scope; S14–19 permanent wiring và realrun; secretsfile không đọc/hash |
| Docs/ledger/reference/history | Canonicalpolicy/plan/catalog; originalUniversal/generatedFEviews/fullproduct/prototype/history | Permissions riêng; original/fullproduct read-only, generatedviews qua owner script; historical không currentproof |

**Reconciliation bắt buộc:** (1) disk partition =relevant+excluded có count/reason; (2) tracked present/deleted/untracked/ignored active entries được xét; (3) tsconfig/Vite/HTML/CSS/assets/import closure đối chiếu actual router+manifest; (4) mọi row có treatment/verification reason/step; (5) diffadded/moved/deleted source không mất khỏi scope; (6) requiredsource coverage và affectedroute/slot/state cases khớp declared universe. Newfile/import/route/export phải mở scope từsource, không pin355/54/27 làm allowlist. Đây là mục tiêu S04/S14/S17/S19; inventorydocs chỉ chứng minh discovery/classification, chưa rendered conformance.

**Resolution còn phải làm ở S03:** môi trường fallbackrequire globalTypeScript còn UNKNOWNpath/version. AI xác minh pinned localcompiler path/version hoặc thay finite resolver nhỏ trước sourceedit. Ba tempcompilepaths và một domain-scenarioscjs đã map source rõ; runtime appclosure không unresolved first-party imports. Không ghi “fullstrictcoverage đã sạch” từ mapping này; resolvergates còn bypass theo audit.

### 16.11. Thứ tự wave toàn bộ module và owner ngoài module

Đây là subdivision S11/S12/S19, không taskIDs/ledger mới. Mỗi wave thực hiện workflow§0, refresh sourcehash/before đúng lúc, EDIT hoặcKEEP có rationale, targeted tests đủ rồi chuyển wave; không sửa lại file đã compliant. Ưu tiên dựa trên confirmedFinancebug →shared blast radius →form/action/query risks →special geometry. Inbox/report geometry được kiểm sớm trong shared harness để không phát hiện incompatibility cuối, migrationchính có profile riêng.

| Wave | Module/owner | Files /routes tại snapshot | Nội dung cần chốt và kiểm |
|---|---|---|---|
| 0 /P0 | app/root/Shell +sharedfoundation | Ngoài24featurefiles; toànaffectedroute khi sharedowner đổi | Single providers/nativefirstpaint, pageedges/demo tools/nav/portals; 27API value/slots; theme/fields/actions; guardedbaseline |
| 1 /P0 | finance | 3files /R20,R21,R22,R48,R49,R50 | Three confirmed titledPanels sửaowner; demo-account-preview/report-explanations giữ semantics; cards/form/query/error/longtext |
| 2 /P1 | catalog | 3files /R09–R14 | index/imports/import-file: uploader/mapping/group spacing, fieldlabel/error/RHF/nativefile/ref; CSVdryrun/result, cursor/editdialog |
| 2 /P1 | orders | 2files /R17–R19,R43 | index/demo-address-preview: checkout/list/draft/action/confirm, permission/pending/conflict/unknown; no formatting payload change |
| 2 /P1 | procurement | 1file /R44–R47 | Supplier/replenish/purchase/receipt, namedgroups/lookups/loadmore, mutation/reason/draft/dialog; partialdata truth |
| 3 /P1 | customers | 1file /R07,R08,R54 | Collection/customer detail/workflow, input/query/cursor/longIDs, actionvisible/capability/state |
| 3 /P1 | inventory | 1file /R15,R16 | Filters/adjustment/state notice, longamount/table/action grouping; no reset422draft |
| 3 /P1 | fulfillment | 1file /R41,R42 | Shipping/checklist/dialog/actions, empty/error/stale/unknown, wrap/pending/permission |
| 4 /P1 | workspace | 1file /R01–R03,R32–R36 | AuthCard riêng+admin/settings, login/nativeform/loading/forbidden/notfound; role/draft/secret transient/mock labels; auth reflow sớm wave0harness |
| 4 /P1 | bot | 1file /R26–R28,R51 | Config/version/capability/action/query/editor, input/helper/error/confirm; no newmodel/providerAPI |
| 4 /P1 | integrations | 1file /R29,R30 | Connect/config/capability statuses, secretentry/draft/result/empty/unavailable; synthetic flow truthful |
| 4 /P1 | knowledge | 1file /R23–R25 | Upload/content/query/search/state/dialog, fieldgroups/longtext/validation/pending/permission |
| 4 /P1 | notifications | 2files /R39,R40 | index/push-capabilities: permission/browsercapability/PWAboundary, preferencefields/action feedback; no real outboundmessages |
| 4 /P1 | operations | 1file /R37,R38,R52 | Queue/history/status/unknown/recovery/actions, tableoverflow/filter/cursor/deep-link semantics |
| 5 /P1 | inbox | 2files /R05,R06 | index/conversation-components: panes/tabslot/composer/message/context; owninsets/scroll/keyboard/focus/draft/selection/stale/loading |
| 5 /P1 | reports | 2files /R31,R53 | index/report-utils: customSVG/chartlabels/ticks/legend/sourceprofile, responsivegeometry, tablelongtext/query/empty; chartscoordinates khôngspacing |
| 5 /P1 | dashboard | 1file /R04 | Hero/Stats/rolecards/grid, canonicaltypography/intrinsiclinkgap, action/no-op/permission, longKPI/reflow |
| 6 /P0 | all consumers +tooling/assets/generated | 24featurefiles/54routes +outsideowners | Final allrow/import/export/variant/state reconciliation, generator/type/lint/unit/domain/build/demo/fullE2E theoS19; evidence/handoffS20 |

Files cụ thể mỗi module tại inventory.modules.files; table này bao đủ16modules,24files,54routes không trùng/thiếu. Shared owner đổi giữa waves thì refresh affectedimpact và kiểm lại consumers của owner đó; không chạy lại mọi thứ vô cớ khi sourcekhông đổi. Mọi module vẫn giữ localcolumns/schema/permission/action/data; không cross-module import hay generic UIengine.

### 16.12. Tương thích, migration an toàn và bàn giao

| Rủi ro Frontend | Điều kiện thực | Cách kiểm và giới hạn |
|---|---|---|
| Default shared layout đổi nhiều consumers | Panel/QueryState/theme/CSS default tác động hiddenstates | Inventory everyconsumer, slot/stateprofile; no silent broaddefault beforeloadedbaseline; minimalvariant khi need thật |
| Native form/ref/event bị mất | props closure/slot/spread rewrite | Type positive/negative+RHF/ref/name/submit/draft behavior; no remount/newformstate |
| Async/cursor/error stale behavior | QueryState/Pager/Toolbar/hooks, concurrentmutations | Preserve querykey/abort/operationallowlist/cursor/scope/unknownerror; meaningful fixture and action observation |
| CSS cascade/portal/fallback | RootCSS/theme/styleimports/menu/dialog/nativeDOM/SVG | Scopeprovenance +realrenderfocus/hit/text/reflow, no selectoroverride/negativegap/hideoverflow workaround |
| Generated/worker/CI source ownership | Icon/manifest/tokenoutputs/vendorworker/parentworkflow | Inputs/generator/CLI fresh andpinned; no handedit; productionmockisolation; activeworkflow pathtrigger audit |
| Dirty user changes/rollback | Checkout có staged/unstaged/untracked/deleted work | Freeze hashes/diff; mộtwriter; revert chỉ task-owned patch sau impact review, không reset/clean hoặc restore toànfile người dùng |
| Coverage/evidence hụt | Addedfile/branch, NOT_RUN, failedsuite, oldbaseline | Keepopen actualproof, AI tự xử lý prerequisite; neverfakebefore/countretestasfullPASS/owneracceptance |

S20 bàn giao change/reason/tests/risks, actual finalhashes/commands/exits, everyfile/consumer/branchverdict và limits. Không tính“100%” từ số rule hoặc inventory: chỉ nhận hoàn thành scope khi các mandatory acceptance của plan đã có evidence trên sourcecuối. Lượt v16 này chỉ hoàn thành audit/specification, chưa triển khai S03–20.
`;
fs.writeFileSync(path, text, 'utf8');
process.stdout.write('Plan v16.0 updated: 20 stable steps, complete module waves, docs-only status.\n');
