import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const out=import.meta.dirname,root=path.resolve(out,'../..'),repo=path.dirname(root),mode=process.argv[2]||'pending-canonical';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),assert=(v,m)=>{if(!v)throw Error(m);};
assert(['pending-canonical','final'].includes(mode),'Unknown document phase');
const records={};for(const stage of ['verify','e2e','unit','contracts','layout','evidence-validator','source-maps','built-demo','composer-stability','imports-clearance-regression','composer-regression','label-focus-regression','variant-regression','label-regression','startup-cache-regression']){
 const r=read(path.join(repo,read(path.join(out,stage+'-latest.json')).record));assert(!r.exitCode&&!r.sourceDrift.length&&hash(path.join(repo,r.log.path))===r.log.sha256,'Failed/changed '+stage);for(const [file,digest]of Object.entries(r.sourceFingerprints))assert(hash(path.join(repo,file))===digest,'Stale '+stage+':'+file);records[stage]=r;
}
const ui=read(path.join(out,'ui-final-full-coverage.json')),native=read(path.join(out,'native-current.json')),built=read(path.join(out,'built-shared-review.json')),cold=read(path.join(out,'clean-artifacts-width-20261009.json'));
assert(ui.status==='PASS'&&ui.fullCases===624&&ui.uiCases===250,'Incomplete full run');assert(native.status==='PASS'&&Object.values(native.proofCounts).reduce((n,c)=>n+c,0)===16&&native.routeLabelProbeCount===108,'Incomplete native proof');assert(built.status==='PASS'&&built.observations.length===216&&built.details.length===70&&!built.sourceDrift.length&&!built.artifactDrift.length,'Incomplete compiled proof');assert(cold.status==='PASS'&&cold.commandRuns.length===10&&cold.commandRuns.every(r=>!r.exitCode),'Incomplete clean build');
if(mode==='final'){const status=JSON.parse(execFileSync(process.execPath,['scripts/progress.mjs','status'],{cwd:path.join(repo,'botsales-kit'),encoding:'utf8'}));assert(status.verifiedSteps===140&&status.totalSteps===140&&!status.stale.length&&!status.blocked.length,'Fresh canonical status required');}
const status=mode==='final'?'READY_FOR_ACCEPTANCE_LOCAL_SCOPE':'VERIFIED_TECHNICAL_PROOFS_CANONICAL_REVALIDATION_PENDING';
const sourceHash=crypto.createHash('sha256').update(Object.entries(records.e2e.sourceFingerprints).map(([f,h])=>f+':'+h).sort().join('\n')).digest('hex');
const report=`# Hoàn thiện mật độ spacing — 09/10/2026

**${status}.** Thứ tự và trạng thái duy nhất: UI plan §16.6/16.20. Phạm vi React/TypeScript + API mock tổng hợp local; hoàn tất kỹ thuật khác với quyết định nghiệm thu của người dùng.

## Thay đổi theo ưu tiên

| Nhóm | Owner và kết quả |
|---|---|
| P0 | Loaded baseline216 observations trước sửa; bảo toàn dirty source. Standard v1.29, catalog, type/finite checker và consumer cùng nguồn. Scale/base8, dependency, schema, gutter16/24, font và target44 giữ nguyên. |
| P1 bảng/thông tin | Table8 dọc/12 ngang; không fixed height. DetailLine row8/valuegap12. AI capabilities dùng SurfaceContent dividedRows0, không thêm gap ngoài divider. Regression list7 dòng394→266px; hàng Products có action44 giảm69→61px ở trạng thái đo. |
| P1 toolbar/demo | Toolbar inset12/gap8, Pager12. Demo controls mặc định thu ở mọi viewport; warning luôn hiện, summary cùng nhãn lựa chọn, giữ state/status khi thu/mở. |
| P1 page/form/dialog | Main block16, section16; operational Panel12/16 và header→body12. Reading comfortable16/24 và boundary16. Form complex16 mặc định; category ngắn compact12. Independent PageSections major24. Ordinary EditDialog inset16; ConfirmDialog/DraftConflict/dirty-discard comfortable16/24. |
| P2 owner closure | Inbox pane/composer/list12 và context12/16; giữ bubbles/history/scroll/draft. Stats value8/note4, report context12/list16, empty24/32, navigation/footer/fallback gọn tại owner. Giữ chart geometry/marker16, hero/auth24/32. |
| P0 chốt | Full gates, actual compiled/native review, clean build và canonical FE receipts dùng source cuối và log thực. Không chắp targeted retest thành full PASS. |

## Kiểm chứng source cuối

| Bằng chứng | Quan sát |
|---|---|
| Full verify | Generate11outputs/283schemas/210operations/54routes; source/boundaries/lint/typecheck,88 domain/network,181 unit, production build, strict layout/visual/composition/evidence đạt. |
| Full E2E |624/624,312 Chromium +312 Firefox. Toàn bộ250 UI assertions thực thi trong cùng full run; không cộng các suite riêng vào count. |
| Contract/provenance |41/41 UI contracts,86/86 layout fixtures,79 source files0finding/1declared exception;11 evidence fixtures,16 source maps. |
| Built |6/6 compiled artifact cases;216 default route observations54×2widths×2engines;70 focused geometry/axe/keyboard cases trên7 route×5widths×2engines, có dialog category. |
| Native |7 Chromium browser zoom200% +9 Firefox text-only200% deep scenarios;108 native label probes54routes×390/1280. Native APIs xác nhận setting/viewport/DPR; không CSS surrogate. Speech và broad human conformance NOT_RUN. |
| Cài sạch |10 actual stages gồm npm ci/setup/verify/build lặp trong workspace tạm; source-copy hashes khớp source cuối; production/demo isolation và repeat byte hashes đạt. |
| Canonical FE |${mode==='final'?'140/140,0stale/blocked theo CLI; receipts sinh từ criterion/source/case/log thực; giữ mẫu số140.':'Đang tái xác minh dependency theo CLI; chưa đóng FE cho batch này.'} |

Source identity: HEAD ${records.e2e.HEAD} + SHA256 ${sourceHash}, ${Object.keys(records.e2e.sourceFingerprints).length} runtime/test/tool inputs. HEAD riêng không định danh dirty tree. Hash docs/evidence được chốt riêng sau handoff. [Full UI binding](ui-final-full-coverage.json), [native](native-current.json), [ảnh native tự rà](NATIVE_VISUAL_REVIEW.md), [compiled](built-shared-review.json), [inventory](inventory-current.json), [adoption](adoption-current.json), [route/state proof](route-matrices-refresh-current.json).

## Attempts và giới hạn

Red table/divider4FAIL trước owner fix, P1green4PASS; red P3 còn py24/gap16 trước profile change giữ riêng. Lượt đầu dialog axe đo giữa Fade Chromium gây contrast tạm thời; test đợi Animation.finished, không đổi màu hoặc bỏ rule. Unit3FAIL và contract2FAIL trước đồng bộ expected/finite resolver được giữ. Migration demo ban đầu tạo9 lời gọi top-level sai, discovery đã phát hiện và sửa; không giảm assertion nghiệp vụ. UI preflight phát hiện Catalog inset cũ và W03/W04 còn kỳ vọng section24/dividedRows12; đã đồng bộ với section16/dividedRows0, giữ độ rộng,7 dòng,divider và sai số. Full trung gian phát hiện route-empty/error và ui008 còn đợi mock controls trước khi mở disclosure; precondition đã sửa qua helper công khai, assertion nghiệp vụ giữ nguyên. Các lượt FAIL hoặc bị dừng có raw log/trace và preservation wrapper riêng; full cuối chạy độc lập trên source cuối.

Các kết quả cũ thuộc source snapshot trước density. Baseline source trước sửa gồm248inputs và216 ảnh/observations; sau sửa thu lại216 observations. Dữ liệu/ràng buộc có thể tăng chiều cao tự nhiên; kết quả px trên chỉ đại diện trạng thái đã đo, không hứa mọi màn giảm cùng tỷ lệ. Route mount/matrix không chứng minh mọi conditional branch. Hai notice không consumer giữ lifecycle có lý do; không tạo use giả.

Backend/provider/staging/production ngoài phạm vi; hosted CI, screen-reader speech/broad human conformance NOT_RUN; user acceptance PENDING. Không commit/push trong batch này. [Case nghiệm thu](ACCEPTANCE_GUIDE.md), [contract](CONTRACT.md), [patterns](ANALOGOUS_PATTERNS.md). Regression ngăn tái diễn các invariant được kiểm; không hứa UI không bao giờ có lỗi khác.
`;
fs.writeFileSync(path.join(out,'REPORT.md'),report);
for(const file of ['README.md','docs/PROJECT_CONTEXT.md','docs/CONTINUE_FRONTEND.md','docs/KNOWN_GAPS.md','evidence/REPORT.md']){let s=fs.readFileSync(path.join(root,file),'utf8');const prefix=file==='README.md'?'evidence/':file==='evidence/REPORT.md'?'':'../evidence/';s=s.replace(/<!-- CORRECTIONS_CURRENT -->[\s\S]*?<!-- END_CORRECTIONS_CURRENT -->/,`<!-- CORRECTIONS_CURRENT -->
## Kết quả hiện hành — thu gọn spacing 09/10/2026

[Báo cáo](${prefix}frontend-spacing-density-20261009/REPORT.md), [case nghiệm thu](${prefix}frontend-spacing-density-20261009/ACCEPTANCE_GUIDE.md): **${status}**. Full624/624,181unit,41contracts,6built-demo,216route observations/70focused cases,16deep native/108label probes đạt trên source cuối. ${mode==='final'?'Canonical140/140,0stale/blocked; xem CLI và receipt để đọc freshness.':'Canonical FE revalidation đang thực hiện.'} Trạng thái chỉ ở UI plan §16.6/16.20; các kết quả614/175/40 trước density là HISTORICAL_SNAPSHOT.

Scope local Frontend/mock; speech/hosted CI NOT_RUN, user acceptance PENDING; Backend/provider/production ngoài scope.
<!-- END_CORRECTIONS_CURRENT -->`);fs.writeFileSync(path.join(root,file),s);}
let plan=fs.readFileSync(path.join(root,'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md'),'utf8');
plan=plan.replace(/^(\| S(?:11|12|14|15|16|17|18|19|20) \|.*?\| )(?:DENSITY_REVALIDATION_IN_PROGRESS|VERIFIED_TECHNICAL_PROOFS_CANONICAL_REVALIDATION_PENDING)[^\n]*$/gm,(_,prefix)=>prefix+`${mode==='final'?'COMPLETE_LOCAL_DENSITY_REVALIDATION':'VERIFIED_TECHNICAL_PROOFS_CANONICAL_REVALIDATION_PENDING'} — standard v1.29 operational header12/reading16, gutter16/24, body12/16; [proof và limits](../evidence/frontend-spacing-density-20261009/REPORT.md). Native16deep/108labels; full624; không nhận speech/hosted/user acceptance. |`);
// The gate column describes the new normative profile; preserve historical prose outside current status table.
plan=plan.replace('Header last visible → first body 16±0.5 CSS px ở affected small/large','Header last visible → first body operational12/comfortable16 ±0.5 CSS px ở affected small/large');
const index=plan.indexOf('### 16.20.');assert(index>=0,'Missing current batch');const before=plan.slice(0,index);let batch=plan.slice(index);
batch=batch.replace(/\| (\d) \|([^\n]*?)\| (?:SPECIFIED_BASELINE_CAPTURED|IN_PROGRESS|PENDING_DEPENDENCY_\d|VERIFIED_TECHNICAL_PROOFS_CANONICAL_REVALIDATION_PENDING|COMPLETE_LOCAL_DENSITY_REVALIDATION) \|/g,(_,number,text)=>'| '+number+' |'+text+'| '+(mode==='final'?'COMPLETE_LOCAL_DENSITY_REVALIDATION':'VERIFIED_TECHNICAL_PROOFS_CANONICAL_REVALIDATION_PENDING')+' |');
batch=batch.replace(/Các kết quả Shared consolidation §16\.19[\s\S]*$/,'Các kết quả Shared consolidation §16.19 giữ phạm vi source lịch sử. Đợt density: '+status+'. [Proof/source hash/limits](../evidence/frontend-spacing-density-20261009/REPORT.md); FE140 giữ mẫu số. Speech/hosted CI NOT_RUN; user acceptance PENDING.\n');
fs.writeFileSync(path.join(root,'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md'),before+batch);
console.log({mode,status,sourceHash});
