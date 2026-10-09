import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const output=import.meta.dirname,frontend=path.resolve(output,'../..'),repository=path.dirname(frontend);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const assert=(value,message)=>{if(!value)throw Error(message);};
const mode=process.argv[2]||'pending-canonical';assert(['pending-canonical','final'].includes(mode),'Unknown document phase');
const records={};
for(const stage of ['composer-stability','imports-clearance-regression','generate','verify','e2e','unit','contracts','layout','evidence-validator','source-maps','built-demo','startup-cache-regression','label-regression','variant-regression','label-focus-regression','composer-regression']){
 const record=read(path.join(repository,read(path.join(output,stage+'-latest.json')).record));assert(!record.exitCode&&!record.sourceDrift.length&&hash(path.join(repository,record.log.path))===record.log.sha256,'Failed/changed '+stage);
 for(const [file,digest]of Object.entries(record.sourceFingerprints))assert(hash(path.join(repository,file))===digest,'Stale '+stage+':'+file);
 records[stage]=record;
}
const log=fs.readFileSync(path.join(repository,records.e2e.log.path),'utf8'),fullCount=Number(log.match(/\b(\d+) passed \(/)?.[1]);
assert(fullCount>0&&!/\b\d+ failed\b/.test(log),'One full passing run required');
for(const engine of ['chromium','firefox'])assert(log.split('\n').filter(line=>/^\s*ok\s+\d+/.test(line)&&line.includes('['+engine+']')).length===fullCount/2,'Incomplete engine '+engine);
const built=read(path.join(output,'built-shared-review.json'));assert(built.status==='PASS'&&built.observations.length===216&&built.details.length===30&&!built.pageErrors.length&&!built.sourceDrift.length&&!built.artifactDrift.length,'Built review incomplete');
const cold=read(path.join(output,'clean-artifacts-width-20261009.json'));assert(cold.status==='PASS'&&cold.commandRuns.length===10&&cold.commandRuns.every(item=>item.exitCode===0),'Cold build incomplete');
const native=read(path.join(output,'native-current.json'));assert(Object.values(native.proofCounts).reduce((n,count)=>n+count,0)===8&&native.routeLabelProbeCount===108,'Deep and all-route label native proof incomplete');
let status;
if(mode==='final'){
 status=JSON.parse(execFileSync(process.execPath,['scripts/progress.mjs','status'],{cwd:path.join(repository,'botsales-kit'),encoding:'utf8'}));
 assert(status.verifiedSteps===140&&status.totalSteps===140&&!status.stale.length&&!status.blocked.length,'Canonical revalidation required before final docs');
}
const batchStatus=mode==='final'?'READY_FOR_ACCEPTANCE_LOCAL_SCOPE':'VERIFIED_SOURCE_GATES_CANONICAL_REVALIDATION_PENDING';
const finalSourceHash=crypto.createHash('sha256').update(Object.entries(records.e2e.sourceFingerprints).map(([file,digest])=>file+':'+digest).sort().join('\n')).digest('hex');
function write(relative,text){const file=path.join(frontend,relative),archive=path.join(output,'before-handoff-docs',relative);if(fs.existsSync(file)&&!fs.existsSync(archive)){fs.mkdirSync(path.dirname(archive),{recursive:true});fs.copyFileSync(file,archive);}fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text.trimEnd()+'\n');}
const report=`# Hoàn thiện hợp nhất Shared UI — 09/10/2026

**${batchStatus}.** Ba công việc kỹ thuật thuộc UI plan §16.19 được thực hiện theo thứ tự P2 Inbox → P3 Dashboard → P3 tài liệu. [UI plan §16.6](../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status) là nơi duy nhất quản lý trạng thái.

## Thay đổi và nguyên nhân

| Ưu tiên | Điểm hợp nhất | Kết quả |
|---|---|---|
| P2 — R05/R06 | Inbox có Stack riêng sở hữu inset/filter rhythm ngoài Toolbar | Toolbar.filters + FieldGroup hiện có sở hữu đúng boundary, bốn bộ lọc ngoài form tìm kiếm; handlers/URL/cursor/query/draft được giữ. |
| P3 — R04 | Hai primary CTA cùng chrome chỉ khác quyền/label/đích | Descriptor local chọn operations.read → orders.read → null, một RouterLink; orders.write cho tạo đơn độc lập. |
| P3 — tài liệu | SPC-067/current wording còn count27 trong khi export thực28 | Quy định mọi public API/export mới, catalog/discovery sở hữu count; snapshot27 lịch sử được gắn nhãn, contract không pin số lượng mãi mãi. |
| Bổ sung — khởi động demo | Firefox/MSW nhận conditional304 không body cho module | Demo serve trả đầy đủ GET script/style; giữ live/non-asset/HEAD caching, regression đỏ/xanh hai engine. |
| Bổ sung — Shared outlined fields | Floating transform làm nhãn chồng giá trị ở text-only200%; label trong flow còn giữ pointer-events:none khi rỗng | Theme sở hữu normal-flow label/meta12px/gap4px/no-notch và click-label focus; Toolbar/demo selectors co giãn theo chữ. Regression geometry/focus và native54-route probes đạt. |
| Bổ sung — Inbox composer | Minimum lịch sử350px ép tổng header/message/composer vượt thread650px | Desktop giữ minimum6em theo cỡ chữ để lịch sử còn đọc được; phần nhập liệu cuộn riêng, action giữ vùng riêng ngoài scroll body, Tab tới nút vẫn thấy được; giữ nháp9 dòng/chữ200%, native desktop1600. |
| Bổ sung — Imports spacing test | Test cũ đo control24px/label12–18px theo floating label | Giữ boundary field và label24px, gap label→control4px, không transform; kiểm lại cả hai engine, không hạ ngưỡng. |
| Bổ sung — R10/R11 | Hàng biến thể không wrap, ô tên flex:1 co về width0 ở1280/text-only200% | Owner dùng FieldGroup wrap và minimum theo chữ cho SKU/tên/giá; regression giữ nháp qua thêm/xóa, native create/edit đạt. |

Axe mới bắt tiêu đề mặc định h6 bỏ cấp tại hội thoại: đã dùng component h2/h3 và giữ typography. Full attempt01 còn phát hiện Firefox nhận304 rỗng cho module contract qua MSW. Vite demo serve chỉ bỏ conditional headers của GET script/style để trả đầy đủ body; live, non-asset, HEAD và build giữ behavior. Regression trước2FAIL, sau2PASS và full suite cuối kiểm lại. Native visual review còn bắt nhãn chồng giá trị ở200%; Shared theme dùng outlined labels trong normal flow/meta12px, CSS role labelAfterGap4px từ token hiện có, không transform/notch; pointer-events:auto giữ click-label focus khi ô rỗng hoặc có giá trị. Toolbar wrap/min-width theo chữ và demoControl sở hữu geometry; consumer widths được bỏ. Doubled-text before2FAIL, final2PASS; native label/value/intrinsic-height/notch kiểm đủ54 routes ở390/1280. Không thêm Shared API, dependency, schema, spacing scale hoặc generic CTA engine. [Contract](CONTRACT.md), [before snapshot](baseline.json), [EDIT/KEEP](ANALOGOUS_PATTERNS.md), [diff so với dirty baseline](final-scope-review.json).

## Kiểm chứng trên source cuối

| Gate | Kết quả quan sát |
|---|---|
| generate:check | 11 outputs / 283 schemas / 210 operations / 54 routes. |
| Toàn bộ verify | Đạt lint/typecheck/source/boundaries/negative fixtures/build/UI gates; 175 unit và75 simulator+13 network. |
| Full E2E | Một full run ${fullCount}/${fullCount}, ${fullCount/2} mỗi Chromium/Firefox; không cộng targeted retest. |
| UI trong source cuối | 240/240 assertions UI không đổi được chạy trong một full614-case run; scoped240 trước footer fix là lịch sử và không cộng vào full. [Binding](ui-final-full-coverage.json). |
| UI contracts/layout | 40/40 contracts;86/86 layout fixtures,79 files0 findings1 declared exception;11/11 evidence fixtures;16/16 source maps. |
| Composer stability | 6/6, ba lần mỗi engine; body cuộn riêng/action giữ vùng riêng, bounds trước Tab/hit-testing/Shift+Tab giữ nháp. |
| Regression sở hữu | Inbox+Toolbar58/58 trước chuyển nhóm; Dashboard4/4; các test mới cũng đạt trong full source cuối; conditional module2/2 kiểm script/style, non-asset/HEAD/live cache và startup qua Service Worker. |
| Branches | Metadata pending/422/empty/recovery giữ filters/URL/composer;8 tuples quyền cho CTA; modifier mở tab thật, hover/focus; built review kiểm mouse active ở cả engines/5 widths. |
| Built demo | 6/6 artifact cases;216 observations=54 routes×320/1920×2 engines;30 focused geometry/axe/keyboard cases=R04/R05/R06×5 widths×2 engines. |
| Native | 3 browser zoom200%,5 deep Firefox text-only200% và108 label probes trên54 routes×390/1280 bằng native text-only200% bằng WebExtension native API;21 list-ellipsis recoveries kiểm Enter tới exact full text trong detail và1 Select recovery bằng Enter/Escape giữ exact full option/value/focus theo SPC-051. |
| Cài sạch/build | 239 source inputs có byte hash khớp bản copy trước cleanup;10 actual stages trong workspace tạm, npm ci cùng lock/audit/setup/verify/contracts/build lặp; production không chứa mock, demo có worker; temporary workspace được xóa sau PASS. |
| Toàn source | 76 source files/71 TS,54 routes/16 modules/28 Shared APIs; mọi route có Shared owner, runtime imports không unresolved. Các import động test-only có finite mapping và execution proof riêng. |
| FE tracker | ${mode==='final'?'Canonical CLI140/140,0 stale/blocked tại lần tái xác minh. Đọc [receipt hiện hành](canonical-revalidation-latest.json) và CLI để biết freshness sau thay đổi; giữ mẫu số140.':'Các gates source đạt; canonical dependency revalidation còn đang thực hiện, chưa nhận140/140 cho batch này.'} |

Source full E2E: HEAD ${records.e2e.HEAD} + SHA-256 ${finalSourceHash} của ${Object.keys(records.e2e.sourceFingerprints).length} runtime/test/tool inputs. HEAD riêng không định danh dirty tree. Các logs/exit/hashes nằm trong stage-latest pointers và S19 manifest sau chốt. [Compiled measurements](built-shared-review.json), [native provenance](native-current.json), [adoption](adoption-current.json), [inventory](inventory-current.json).

## Lịch sử attempt và giới hạn

Scoped UI240/240 đạt trước footer fix, giữ [record lịch sử](ui-preflight-before-composer-footer.json); drift chỉ composer owner và test FE016. Sau đó regression hẹp bắt Firefox đã focus action nhưng action tràn form123.10px. [Raw failure](composer-footer-before.json) và [trace](composer-footer-before-trace/original-trace.zip) giữ nguyên. Owner tách phần nhập liệu cuộn và action không shrink nằm ngoài vùng cuộn. Test giữ mọi assertion cũ, thêm readable body, action bounds trước Tab, hit-testing và Shift+Tab/draft; toàn bộ240 UI assertions không đổi được chạy lại trong full source cuối, không lấy scoped preflight cũ làm PASS hiện hành.

Full attempt05 dừng có kiểm soát sau case186 FAIL vì test clearance theo nhãn floating cũ; trace ghi field/label24px, control45.25px. [Before2FAIL](imports-clearance-before.json) và [after2PASS](imports-clearance-regression-latest.json) giữ riêng; test mới kiểm boundary24px + label height + gap4px và normal-flow invariants, không tăng tolerance hoặc bỏ kiểm reflow. [Full raw record](full-attempt-05-latest.json).

Native visual FAIL và native before2FAIL/2PASS được giữ; collector ERROR thiếu ownedLabels giữ riêng. Full attempt02 bị dừng có kiểm soát trước label fix; không nhận là full completed PASS. [Label regression trước](label-before.json), [sau](label-regression-latest.json). Native108 route probes còn phát hiện R10/R11 width0: đã sửa wrap/minimum theo chữ tại editor; click nhãn rỗng còn được kiểm và sửa tại Shared theme; [regression trước](variant-before.json) và [sau](variant-regression-latest.json) trên cả hai engine.

Full attempt01 giữ FAIL case496 Firefox cùng [trace](full-attempt-01-composition-trace/original-trace.zip), [record](full-attempt-01-latest.json) và [controlled stop](full-attempt-01-interruption.json); không gọi lượt bị dừng là một full completed run. [Conditional regression trước](startup-cache-before.json) ghi2FAIL, [sau](startup-cache-regression-latest.json) ghi2PASS. Sau sửa boundary demo, full suite được chạy lại độc lập trên source cuối.

Before structural test đỏ vì thiếu Shared marker; geometry baseline không được mô tả là bug. Sau move, axe phát hiện skipped headings rồi regression đạt sau sửa semantic owner. Attempt metadata đầu dùng exact combobox label không tính selected value nên timeout; đã giữ raw interrupted run, sửa selector/đợi response thực rồi chạy lại cả nhóm và full suite. Raw text-only FAIL do intentional list ellipsis được giữ; collector chỉ phân loại link đúng pattern và chứng minh native keyboard recovery từng giá trị, mọi clip chưa recovery vẫn FAIL. Built-review attempt đầu loại bỏ hidden R06 list khỏi role query nên timeout: giữ record/screenshots, chuyển sang owner marker và assert hidden đúng breakpoint; không hạ geometry/axe/keyboard assertions.

Full-product tracker/contracts/Universal/workflow/dependencies và mọi dirty path có sẵn được bảo toàn theo baseline; FE views/receipts chỉ sinh bằng owner canonical. [Scope review](final-scope-review.json), browser byte preservation và domain publication có hồ sơ riêng. Không commit/push hoặc công bố hosted CI trong batch này.

## Nghiệm thu

[Hướng dẫn](ACCEPTANCE_GUIDE.md), [ảnh demo/HTML thực](handoff-demo-current.json), demo http://127.0.0.1:4173. Dashboard/Inbox list/detail ở desktop và mobile có case cụ thể; tất cả 16 module/54 routes có regression/compiled observations, không đồng nghĩa mọi business branch được test.

Phạm vi React/TypeScript + HTTP/SSE MSW tổng hợp local. Backend/provider/staging/production hosting OUTSIDE_SCOPE; screen-reader speech/broad human conformance và hosted CI NOT_RUN; quyết định nghiệm thu người dùng PENDING. Regression bảo vệ invariant đã kiểm, không bảo đảm loại bỏ mọi lỗi tương lai. Các gate count mô tả suites riêng, không cộng thành phần trăm code.
`;
write('evidence/frontend-shared-consolidation-20261009/REPORT.md',report);
for(const relative of ['README.md','docs/PROJECT_CONTEXT.md','docs/CONTINUE_FRONTEND.md','docs/KNOWN_GAPS.md','evidence/REPORT.md']){
 const text=fs.readFileSync(path.join(frontend,relative),'utf8'),prefix=relative==='README.md'?'evidence/':relative==='evidence/REPORT.md'?'':'../evidence/';assert(text.includes('<!-- CORRECTIONS_CURRENT -->'),'Missing current block '+relative);
 const block=`<!-- CORRECTIONS_CURRENT -->
## Kết quả hiện hành — hợp nhất Shared UI 09/10/2026

[Báo cáo/gates](${prefix}frontend-shared-consolidation-20261009/REPORT.md) và [ca nghiệm thu](${prefix}frontend-shared-consolidation-20261009/ACCEPTANCE_GUIDE.md): ${batchStatus}. Full E2E${fullCount}/${fullCount},175 unit,40 contracts,6 built-demo,216 route observations/30 focused cases và8 deep native scenarios/108 all-route label probes đạt trên source cuối. ${mode==='final'?'FE canonical140/140,0 stale/blocked lúc tái xác minh; đọc CLI/receipt cho freshness hiện tại.':'Canonical FE revalidation đang thực hiện; chưa đóng batch.'} Mẫu số FE140 giữ nguyên; thứ tự/trạng thái chỉ tại UI plan §16.6. Counts600/39/47 của WIDTH và các số cũ bên dưới là HISTORICAL_SNAPSHOT; không nhận47 native scenarios đã chạy lại trong batch này.

Scope: Frontend+mock API tổng hợp local; speech/broad human conformance/hosted CI NOT_RUN, nghiệm thu người dùng PENDING, Backend/provider/staging/production ngoài scope.
<!-- END_CORRECTIONS_CURRENT -->`;
 write(relative,text.replace(/<!-- CORRECTIONS_CURRENT -->[\s\S]*?<!-- END_CORRECTIONS_CURRENT -->/,block));
}
const relative='docs/FRONTEND_UI_IMPROVEMENT_PLAN.md';let plan=fs.readFileSync(path.join(frontend,relative),'utf8');
plan=plan.replace('27 API owners, theme/layout/visual, model/API hooks/helpers','Mọi public Shared API owners theo export discovery, theme/layout/visual, model/API hooks/helpers');
plan=plan.replace('backlog hiện hành là 27/28 task và 137/140 checkpoint', 'snapshot backlog trước rollout là 27/28 task và 137/140 checkpoint; trạng thái hiện hành chỉ ở §16.6 và CLI canonical');
plan=plan.replace('27 API value/slots; theme/fields/actions; guarded baseline','Mọi public API values/slots theo discovery; theme/fields/actions; guarded baseline');
plan=plan.replace('Chốt props/slots hữu hạn cho 27 API và lifecycle;', 'Chốt props/slots hữu hạn cho mọi public API theo discovery và lifecycle;');
plan=plan.replace('Đây là audit của task hiện tại, không phải runtime gate thường trực hoặc FE tracker.', '**HISTORICAL_SNAPSHOT — inventory audit 06/10/2026**, không phải runtime gate thường trực hoặc FE tracker. Inventory hiện hành theo [batch source cuối](../evidence/frontend-shared-consolidation-20261009/inventory-current.json); các số và NOT_RUN bên dưới thuộc lượt audit ban đầu.');
plan=plan.replace('**Resolution còn phải làm ở S03:**', '**HISTORICAL_SNAPSHOT — resolution được ghi tại audit S03:**');
plan=plan.replace('Có 21 component exports + 6 composition exports (27 React components);', 'Danh sách và count hiện hành lấy từ symbol/export discovery và catalog;');
plan=plan.replace(/^\*\*CURRENT PHASE[^\n]*$/m,`**CURRENT PHASE — ${batchStatus} Shared consolidation (09/10/2026):** [report](../evidence/frontend-shared-consolidation-20261009/REPORT.md), [ca nghiệm thu](../evidence/frontend-shared-consolidation-20261009/ACCEPTANCE_GUIDE.md). Thứ tự/trạng thái duy nhất tại §16.6; local mock và giới hạn nghiệm thu riêng.`);
const start=plan.indexOf('**09/10/2026 — hợp nhất Shared UI:'),end=plan.indexOf('**Giới hạn hồ sơ ở lượt lập kế hoạch:',start);assert(start>0&&end>start,'Missing active batch');
const live=`**09/10/2026 — hợp nhất Shared UI: ${batchStatus}.** P2 Inbox → P3 Dashboard → P3 tài liệu đã thực hiện tuần tự, full${fullCount}/${fullCount} và required source gates đạt. Các lỗi xác nhận trong gate đã sửa tại owner: demo conditional304, Shared label overlap/click focus, Toolbar/demo geometry và variant row R10/R11 width0 và phân chia chiều cao composer Inbox. Regression trước/sau được giữ; native8 deep/108 all-route probes đạt. ${mode==='final'?'Canonical FE140/140,0 stale/blocked sau dependency revalidation; local technical scope hoàn tất, người dùng PENDING.':'Đang tái xác minh canonical FE/dependency; batch chưa đóng.'} Ba finding P2/P3 và các root fix bổ sung thuộc S11/S12/S14, chốt S19/S20 hiện có; không tạo ledger/mẫu số mới. [Chi tiết §16.19](#shared-consolidation-20261009), [report](../evidence/frontend-shared-consolidation-20261009/REPORT.md), [ca nghiệm thu](../evidence/frontend-shared-consolidation-20261009/ACCEPTANCE_GUIDE.md).

| Thứ tự / ưu tiên | Công việc | Dependency và owner | Trạng thái | Điều kiện đóng |
|---|---|---|---|---|
| 0 — chuẩn bị | Chốt baseline/impact | Git/source, audit và workflow contract | COMPLETE_SCOPED | Before6 renders, source hashes/dirty paths/owner impact được giữ |
| 1 — P2 | Inbox Toolbar.filters + FieldGroup | Bước0; S11/S12, R05/R06 | COMPLETE_REGRESSION_ON_FINAL_SOURCE | URL/cursor/query/draft/metadata, responsive, axe/keyboard/native đạt |
| 2 — P3 | Một primary CTA Dashboard | Bước1 đã kiểm; S12, R04 | COMPLETE_REGRESSION_ON_FINAL_SOURCE |8 tuples quyền, label/href, độc lập create, focus/hover/active/modifier/target đạt |
| 3 — P3 | Wording Shared API discovery | Bước2 đã kiểm; S14, standard/catalog/current plan | COMPLETE_REGRESSION_ON_FINAL_SOURCE |40 contracts đạt; current export28, không pin count; snapshot lịch sử giữ nguyên |
| 4 — chốt | Full source/evidence/demo | Bước1–3; S19/S20/canonical owners | ${batchStatus} |Full run/gates, compiled/native/baseline/hash; FE dependency receipts; nghiệm thu người dùng riêng |

`;
plan=plan.slice(0,start)+live+plan.slice(end);
plan=plan.replace('**08/10/2026 — WIDTH.W01–W04: READY_FOR_ACCEPTANCE_LOCAL_SCOPE.**','**HISTORICAL_SNAPSHOT — 08/10/2026 — WIDTH.W01–W04: READY_FOR_ACCEPTANCE_LOCAL_SCOPE tại source trước Shared consolidation.**');
const sectionStart=plan.indexOf('### 16.6.'),sectionEnd=plan.indexOf('### 16.7.');
const currentSection=plan.slice(sectionStart,sectionEnd).split('\n').map(line=>{
 if(!/^\| S\d\d \|/.test(line))return line;
 line=line.replaceAll('frontend-width-fixes-20261008/REPORT.md','frontend-shared-consolidation-20261009/REPORT.md').replaceAll('frontend-width-fixes-20261008/ACCEPTANCE_GUIDE.md','frontend-shared-consolidation-20261009/ACCEPTANCE_GUIDE.md');
 if(line.startsWith('| S11 |'))line=line.replace('WIDTH giữ owner boundary của Panel;', 'Shared batch giữ owner boundary của Panel, Inbox dùng Toolbar.filters + FieldGroup flush; WIDTH');
 if(line.startsWith('| S12 |')&&!line.includes('Inbox R05/R06 và primary CTA R04'))line=line.replace('Current consumer symbols,', 'Inbox R05/R06 và primary CTA R04 hợp nhất bằng API hiện có; URL/cursor/draft và8 tuples quyền được kiểm. Current consumer symbols,');
 if(line.startsWith('| S14 |'))line=line.replace('28 exported React APIs có mapped contract/consumer hoặc lifecycle rationale.', 'Discovery hiện28 exported React APIs có mapped contract/consumer hoặc lifecycle rationale; SPC-067 phủ mọi export mới, không pin count.');
 if(line.startsWith('| S16 |'))line=line.split('|').slice(0,-2).join('|')+'| COMPLETE_METHODS_AFFECTED_LOCAL_SOURCE — Shared batch có3 browser zoom200% và5 Firefox text-only200% native scenarios cho R04/R05/R06 và editor R10/R11, gồm Inbox desktop1600 với nháp9 dòng và108 all-route label probes (54 routes×390/1280),22 exact-text ellipsis recoveries (21 list links và1 Select) theo SPC-051; [proof hiện hành](../evidence/frontend-shared-consolidation-20261009/native-current.json).47 cases WIDTH là snapshot lịch sử, không claim đã chạy lại toàn bộ. Speech/broad human conformance NOT_RUN. |';
 if(line.startsWith('| S17 |'))line=line.replace('39 contract','40 contract');
 if(line.startsWith('| S19 |'))line=line.split('|').slice(0,-2).join('|')+`| ${batchStatus} — ${fullCount}/${fullCount} full Chromium/Firefox;6/6 built-demo;175 unit;28 discovered Shared APIs;54 routes/432 state dispositions;216 compiled observations/30 focused cases/8 deep native scenarios/108 all-route label probes; [report source cuối](../evidence/frontend-shared-consolidation-20261009/REPORT.md). |`;
 if(line.startsWith('| S20 |'))line=line.split('|').slice(0,-2).join('|')+`| ${batchStatus} — [báo cáo](../evidence/frontend-shared-consolidation-20261009/REPORT.md), [ca nghiệm thu](../evidence/frontend-shared-consolidation-20261009/ACCEPTANCE_GUIDE.md); không tự nhận owner/speech/hosted/Backend. |`;
 return line;
}).join('\n');
plan=plan.slice(0,sectionStart)+currentSection+plan.slice(sectionEnd);
write(relative,plan);
console.log(JSON.stringify({phase:mode,status:batchStatus,fullBrowser:fullCount,sourceHash:finalSourceHash,canonical:status?.verifiedSteps??'PENDING'}));
