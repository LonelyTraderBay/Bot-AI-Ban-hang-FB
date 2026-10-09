import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const output=import.meta.dirname,frontend=path.resolve(output,'../..'),repository=path.dirname(frontend);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const mode=process.argv[2]||'preflight';if(!['preflight','closed'].includes(mode))throw new Error('Unknown document state');
const closed=mode==='closed';
const records=Object.fromEntries(['generate','verify','e2e','unit','contracts','layout','source-maps','evidence-validator','built-demo'].map(stage=>{const record=read(path.join(repository,read(path.join(output,stage+'-latest.json')).record));if(record.exitCode||record.sourceDrift.length)throw new Error('Unverified '+stage);return [stage,record];}));
const status=JSON.parse(execFileSync(process.execPath,['scripts/progress.mjs','status'],{cwd:path.join(repository,'botsales-kit'),encoding:'utf8'}));
if(closed&&(status.verifiedSteps!==140||status.stale.length||status.blocked.length))throw new Error('Close source status only after canonical checkpoint preflight/refresh');
const cold=read(path.join(output,'clean-artifacts-components-20261008.json'));
const state=closed?'READY_FOR_ACCEPTANCE_LOCAL_SCOPE':'VERIFYING_CANONICAL_FE_EVIDENCE';
const report=`# Kết quả xử lý component A01–A07 — 08/10/2026

**Trạng thái: ${state}.** Thứ tự/trạng thái UI chỉ ở [plan §16.6](../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status); đây là hồ sơ kết quả trên source hiện tại, không là tracker cạnh tranh.

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

Raw records, argv/cwd/exit/source/log hashes: ${Object.entries(records).map(([stage,record])=>`[${stage}](${path.relative(output,path.join(repository,record.log.path)).replaceAll('\\','/')})`).join(', ')}. Artifact demo tree: **${cold.artifacts.demoRepeat.treeSha256}**.

## Coverage, nguồn và bảo toàn

Inventory đọc **16 modules,54 routes,76 file trong cây source (71 TS/TSX),28 shared APIs**, router/import closure không có unresolved runtime owner. 396 file/path dispositions được phân loại; count không là phần trăm code hoặc bằng chứng mọi business branch đã render. Matrix giữ54 routes/432 state cells và357 role cases/7 roles/51 private routes; shared/route-specific/N/A giữ lý do riêng.

Ma trận route/feature và state/role được [sinh lại bằng hai generator sở hữu](route-matrices-refresh-current.json) từ log full E2E và verbose unit hiện hành. Đối chiếu xác nhận không đổi phân loại hay mapping; chỉ cập nhật đường dẫn log, thời gian sinh và fingerprint log. [Ma trận nghiệm thu hiện hành](uat-matrix-components-20261008.json).

[Baseline](baseline.json) hash-paired với audit trước sửa:432 route observations,204 states,16 selects,60 stress. [Provenance](implementation-provenance-current.json) xác nhận first runtime patch **11:08:09.260Z**, sau baseline11:06:48.618Z và failing pre-edit run. Before artifacts không sửa ngược thành PASS. Native attempts lỗi collector và run E2E bị dừng sớm để sửa EOF vẫn giữ lịch sử.

Diff scope:12 file code/theme và1 shared catalog trong cây source,2 test files có sẵn, suite component và fixture mới; bảo toàn128 tracked changes và toàn bộ3687 paths có sẵn. Full-product plan/progress/T*.md read-only. Không stage/commit/push/reset/clean/xóa file trong batch này. [Diff review](diff-review-current.json).

FE quan sát tại lúc viết hồ sơ: **${status.verifiedSteps}/${status.totalSteps}, stale ${status.stale.length} tasks**. ${closed?'Đã tái xác minh 140 checkpoints bằng canonical CLI; sau cập nhật liên kết/status tài liệu phải chạy vòng cuối và đọc status/validate lại. Trạng thái cuối có hash tại canonical-revalidation-latest.json và S19-current-evidence.json.':'Các receipts cũ không được relabel bằng hash mới; checkpoint evaluator phải preflight named owner assertions + log actual, sau đó canonical CLI mới ghi toàn bộ dependency và reports. Giữ mẫu số140.'}

## Nghiệm thu và giới hạn

[Ca nghiệm thu](ACCEPTANCE_GUIDE.md), [contract](CONTRACT.md), [đối chiếu pattern](ANALOGOUS_PATTERNS.md). Demo4173 phải chạy compiled artifact cuối. Scope **FRONTEND_WITH_SYNTHETIC_MOCK_API**. Screen-reader speech/broad human conformance **NOT_RUN**, hosted CI **NOT_RUN**, người dùng **PENDING**; Backend/provider/persistence/staging/production runtime ngoài phạm vi. Regression bảo vệ invariant đã đo; không cam kết mọi thay đổi UI tương lai không thể tái sinh lỗi.
`;
fs.writeFileSync(path.join(output,'REPORT.md'),report);
const entrypoints=['README.md','docs/PROJECT_CONTEXT.md','docs/CONTINUE_FRONTEND.md','docs/KNOWN_GAPS.md','evidence/REPORT.md'].map(file=>path.join(frontend,file)).concat(['FE001','FE003','FE022','FE023','FE028'].map(id=>path.join(repository,'botsales-kit/execution/frontend-evidence',id,'handoff.md')),path.join(repository,'botsales-kit/execution/SESSION_HANDOFF.md'));
for(const file of entrypoints){
 const backup=path.join(output,'entrypoints-before',path.relative(repository,file));if(!fs.existsSync(backup)){fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(file,backup);}
 const reportLink=path.relative(path.dirname(file),path.join(output,'REPORT.md')).replaceAll('\\','/'),guideLink=path.relative(path.dirname(file),path.join(output,'ACCEPTANCE_GUIDE.md')).replaceAll('\\','/');
 const text=fs.readFileSync(file,'utf8');if(!/<!-- CORRECTIONS_CURRENT -->[\s\S]*?<!-- END_CORRECTIONS_CURRENT -->/.test(text))throw new Error('Current marker missing: '+file);
 const block=`<!-- CORRECTIONS_CURRENT -->\n## Kết quả hiện hành — component A01–A07 sau F01–F09 và Toolbar/Shell\n\n[Báo cáo source/gates](${reportLink}) và [ca nghiệm thu](${guideLink}): ${state}; full E2E580/580,174 unit,39 contracts,built-demo6/6,native33/33 trên source mới. Thứ tự UI chỉ ở plan §16.6; FE freshness đọc canonical CLI, giữ mẫu số140. Counts554/173,566/174 và các manifest cũ bên dưới là snapshot lịch sử, không thay lần chạy mới.\n\nLocal React/TypeScript + HTTP MSW tổng hợp. Speech, hosted CI, Backend/provider thật và quyết định người dùng giữ trạng thái quan sát riêng; không tự điền PASS.\n<!-- END_CORRECTIONS_CURRENT -->`;
 fs.writeFileSync(file,text.replace(/<!-- CORRECTIONS_CURRENT -->[\s\S]*?<!-- END_CORRECTIONS_CURRENT -->/,block));
}
if(closed){
 const file=path.join(frontend,'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md');let text=fs.readFileSync(file,'utf8');
 text=text.replace(/^\*\*CURRENT PHASE[^\n]+/m,'**CURRENT PHASE — READY_FOR_ACCEPTANCE_LOCAL_SCOPE A01–A07 (08/10/2026):** source fixes, full580/580 E2E,174 unit,39 contracts và native33/33 đã đạt. Thứ tự/trạng thái duy nhất tại §16.6; [báo cáo source cuối](../evidence/frontend-component-fixes-20261008/REPORT.md). FE freshness tái xác minh canonical; speech, hosted CI, Backend và owner acceptance giữ giới hạn riêng.');
 text=text.replace(/^\*\*08\/10\/2026 — xử lý A01–A07[^\n]+/m,'**08/10/2026 — xử lý A01–A07 sau component audit: COMPLETE_LOCAL_AUTOMATED_REVALIDATION.** A01 Orders → A02 ProductEditor → A03 Imports → A04 Amount → A05 Status → A06 Empty → A07 readonly address/payment và MenuItem đã sửa tại owner; full580/580,174 unit,39 contracts,6 built-demo và33 native cases đạt. [Contract/baseline](../evidence/frontend-component-fixes-20261008/CONTRACT.md), [report/gates](../evidence/frontend-component-fixes-20261008/REPORT.md), [ca nghiệm thu](../evidence/frontend-component-fixes-20261008/ACCEPTANCE_GUIDE.md). FE denominator140, dependency/freshness bằng canonical CLI; quyết định người dùng PENDING.');
 const start=text.indexOf('### 16.6.'),end=text.indexOf('### 16.7.',start);if(start<0||end<0)throw new Error('Current status boundaries unresolved');
 const section=text.slice(start,end).split('\n').map(line=>{
  if(line.startsWith('**08/10/2026 — bổ sung P2 Toolbar/Shell'))return line.replace('**08/10/2026','**HISTORICAL_SNAPSHOT — 08/10/2026')+' Source trước A01–A07; behavior được kiểm lại trong full suite mới.';
  if(/^\| S\d\d /.test(line))return line.replaceAll('frontend-corrections-20261008/REPORT.md','frontend-component-fixes-20261008/REPORT.md').replaceAll('frontend-toolbar-20261008/REPORT.md','frontend-component-fixes-20261008/REPORT.md').replaceAll('frontend-toolbar-20261008/ACCEPTANCE_GUIDE.md','frontend-component-fixes-20261008/ACCEPTANCE_GUIDE.md').replaceAll('566/566','580/580').replaceAll('554/554','580/580').replaceAll('173 unit','174 unit').replaceAll('38 contract','39 contract').replace('Toolbar native browser 3/3 và text-only 4/4 bổ sung.','Native current33/33 gồm A01–A07 và inherited profiles.');
  return line;
 }).join('\n');text=text.slice(0,start)+section+text.slice(end);fs.writeFileSync(file,text);
}
console.log(JSON.stringify({mode,state,entrypoints:entrypoints.length,observedFe:status.verifiedSteps,stale:status.stale.length}));
