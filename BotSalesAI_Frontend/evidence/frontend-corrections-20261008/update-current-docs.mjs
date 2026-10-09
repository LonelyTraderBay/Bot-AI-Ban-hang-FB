import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const frontend=path.resolve(import.meta.dirname,'../..'), repository=path.dirname(frontend);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
if (process.argv.includes('--refresh-record-links')) {
    const file = path.join(import.meta.dirname, 'REPORT.md');
    let report = fs.readFileSync(file, 'utf8');
    for (const stage of ['generate','verify','e2e','unit','contracts','layout','evidence-validator','source-maps','built-demo']) {
        const record = read(path.join(repository, read(path.join(import.meta.dirname, stage + '-latest.json')).record));
        if (record.exitCode || record.sourceDrift.length) throw new Error('Failed latest record: ' + stage);
        const target = path.relative(import.meta.dirname, path.join(repository, record.log.path)).replaceAll('\\', '/');
        const row = `| ${stage} | PASS, exit 0, source drift 0 | [log](${target}) |`;
        report = report.replace(new RegExp('^\\| ' + stage + ' \\|[^\\n]+$', 'm'), row);
    }
    const note = '[Bảo toàn evidence khi verify cuối](final-verify-preservation.json): artifact domain đang được canonical receipt tham chiếu giữ nguyên byte; output mới 75 simulator + 13 network và raw log được lưu riêng. Exit thực và source drift vẫn quyết định PASS/FAIL.';
    if (!report.includes('[Bảo toàn evidence khi verify cuối]')) report = report.replace('## Tracker, baseline và bàn giao', note + '\n\n## Tracker, baseline và bàn giao');
    fs.writeFileSync(file, report);
    console.log('Current report links refreshed from completed raw execution records; status and other documents unchanged.');
    process.exit(0);
}
const ready=process.argv.includes('--ready');
const status=JSON.parse(execFileSync(process.execPath,['scripts/progress.mjs','status'],{cwd:path.join(repository,'botsales-kit'),encoding:'utf8'}));
if(ready && (status.verifiedSteps!==140 || status.stale.length || status.blocked.length)) throw new Error('Current 140/140 required before final document handoff');
const gates=read(path.join(import.meta.dirname,'quality-gate-matrix-corrections-20261008.json'));
const uat=read(path.join(import.meta.dirname,'uat-matrix-corrections-20261008.json'));
const cold=read(path.join(import.meta.dirname,'clean-artifacts-corrections-20261008.json'));
if(uat.summary.fullBrowserCases!==554 || cold.status!=='PASS' || gates.gates.filter(gate=>gate.status==='PASS_LOCAL_SCOPE').length!==7) throw new Error('Actual final technical records required');
const stageRows=['generate','verify','e2e','unit','contracts','layout','evidence-validator','source-maps','built-demo'].map(stage=>{
    const record=read(path.join(repository,read(path.join(import.meta.dirname,stage+'-latest.json')).record));
    if(record.exitCode || record.sourceDrift.length) throw new Error('Failed run: '+stage);
    return `| ${stage} | PASS, exit 0, source drift 0 | [log](${path.relative(import.meta.dirname,path.join(repository,record.log.path)).replaceAll('\\','/')}) |`;
});
const currentStatus=ready?'READY_FOR_ACCEPTANCE_LOCAL_SCOPE':'TECHNICAL_CHECKS_PASS_FE_REVALIDATION_IN_PROGRESS';
const text=`# Hoàn thiện Frontend F01–F09 — 08/10/2026

Trạng thái: **${currentStatus}**. Phạm vi: React/TypeScript + HTTP MSW tổng hợp. HEAD 53c0ba8f413b1f1e0fa16a747ed27f728b861dd6 cộng working tree đã băm; đây là kết quả kỹ thuật local của kế hoạch đã chốt.

## Kết quả sửa source

| Finding | Thay đổi đã kiểm chứng |
|---|---|
| F04 — P1 | Command bảo vệ request/wait/poll theo unmount, shop, quyền và logout; không trả success cho scope cũ; giữ idempotency key/command ID cho outcome chưa rõ, có StrictMode regression. |
| F01 — P1 | Baseline/version của nháp; đối chiếu bản gốc/nháp/server theo trường, bắt chọn xung đột hai bên; không tự ghi hoặc retry bằng version mới. Redaction không hiện/gửi lại. |
| F02/F03 — P1 | Product/images, category, order, supplier, notification PUT và privacy đều giữ nháp khi refetch; danh sách chọn nguyên khối; success chỉ làm sạch phần đã gửi. |
| F05 — P1 | Composer cho nhập/đổi loại khi pending, khóa gửi thêm; chỉ xóa đúng revision đã gửi; lỗi/unknown giữ nháp. |
| F06 — P1 | Guard toàn đơn mới, dòng thêm/xóa và ảnh; route/shop/logout/reload; canceled reload giữ MSW, save sạch không cảnh báo sai. |
| F07 — P2 | Footer callback requestClose/busy chung với icon/Escape/backdrop; inline order close đã chuyển shared dialog; mặc định khóa content pending, consumer giữ late edits mới cho nhập tiếp. |
| F08 — P2 | Notes 4.000 code point, 4.001 lỗi tiếng Việt tại trường trước HTTP ở create/update; privacy kiểm giới hạn cùng contract. ASCII/emoji có regression; các giới hạn nhập/bộ đếm cùng pattern ở 14 module và ConfirmDialog dùng Unicode code point, giữ nguyên ngưỡng số hiện có. |
| F09 — P2 | Inbox event đã biết chỉ invalidate Inbox/read-model liên quan; duplicate/out-of-order bỏ; gap/reconnect/resync/malformed/unknown full resync, revoke riêng. |

**9/9 finding hoàn tất trong kế hoạch**, gồm lỗi cùng nguyên nhân đã xác nhận. [Rà 16 module/24 file](ANALOGOUS_PATTERNS.md), [inventory AST](patterns-current.json), [shared catalog 22 components + 6 compositions](shared-api-current.json). Không lấy số file/test làm phần trăm UI tuân thủ toàn hệ thống.

Nhóm bàn giao: **P0** baseline/môi trường, gate source cuối và canonical FE 140 checkpoint; **P1** F04 lifecycle rồi F01–F03 đối chiếu/editor, F05 composer, F06 draft guard; **P2** F07 dialog, F08 validation Unicode và F09 SSE. Ghi chú này theo thứ tự đã chốt; không gom thay đổi có sẵn vào commit mới.

## Kiểm chứng source cuối

Full browser: **554/554**, 277 Chromium + 277 Firefox, một lượt đầy đủ. Unit **173/173**; domain/network **88/88**; shared contracts **38/38**; layout fixtures **82/82**, source 79 file/0 finding/1 exception; evidence validator **11/11**; source-map **16/16**; built-demo **6/6**. Generator 11 outputs/283 schemas/210 operations/54 routes. Cold build 10/10 stages; production/demo lặp byte-identical.

| Cổng | Kết quả thực | Bằng chứng |
|---|---|---|
${stageRows.join('\n')}

Native UI mới: [Chrome browser zoom 200%](actual-browser-zoom-200-current-corrections-native-20261008-final.json), [Firefox text-only 200%](native-text-only-200-current-corrections-native-20261008-final.json), cùng keyboard/axe/reflow và title/close overlap assertions. W30 năm case native mỗi method: [browser zoom](../frontend-ui-improvements/UI028/W30/actual-browser-zoom-200-current-corrections-w30-final-20261008.json), [text-only](../frontend-ui-improvements/UI028/W30/native-text-only-200-current-corrections-w30-final-20261008.json); source hash và từng scenario được kiểm lại trước checkpoint. Không dùng CSS transform thay native zoom.

[UAT hiện hành](uat-matrix-corrections-20261008.json): 54 routes, 64 features, 65 feature-route rows, ${uat.summary.journeys} journeys, 432 state cells; 357 private route-role cases/7 roles/51 routes mỗi engine. Shared-tested, route-specific-tested và N/A có lý do được phân biệt; canonical gaps vẫn giữ.

[Đối chiếu trên artifact đã build](built-comparison-review-current.json) cũng đạt riêng ở Chromium và Firefox: nháp giữ khi server đổi; áp dụng không gửi HTTP; lần lưu gửi PATCH tên với If-Match v2 và giữ ghi chú server. Có screenshot và hash artifact. Quan sát bổ sung này không cộng vào 554 full cases hoặc 6 built-suite cases.

![Dialog đối chiếu trên bản demo đã build, dữ liệu tổng hợp](built-comparison-chromium.png)

## Tracker, baseline và bàn giao

FE snapshot khi ghi tài liệu: **${status.verifiedSteps}/140**, stale ${status.stale.length}, blocked ${status.blocked.length}. ${ready?'Canonical checkpoint và generated reports được tái xác minh bằng receipt/log/hash; thay đổi docs cuối được kiểm lại trong lượt chốt cuối trước khi bàn giao.':'Đang tái xác minh từng checkpoint/dependency bằng công cụ canonical; số 0 hoặc stale lúc source đổi không phải code chưa viết.'} Full-product plan/ledger/T tasks giữ read-only; không đổi mẫu số 140.

Baseline [106 inputs](baseline.json) và các bản sao trước sửa được giữ; [timestamp first source mutation](implementation-provenance.json) lấy từ actual tool call. R1–R7/R9 REPRODUCED là probe lịch sử. Các full run thất bại/bị dừng để sửa assertion/source giữ lịch sử; không cộng targeted retest để gọi chúng PASS. Giữ 92 thay đổi tracked có sẵn; không reset/clean/bulk-stage hoặc commit ngoài phạm vi.

[Môi trường/npm thật](environment-current.json), [wrapper diagnosis](wrapper-diagnosis-current.json): cùng pinned CLI/source, PATH kế thừa 14.828 ký tự fail resolve tsc; PATH hữu hạn 173 ký tự pass. Compiler có thật; không thay execution policy, dependency, schema hoặc tokens.

[Cold artifact manifest](clean-artifacts-corrections-20261008.json): production tree **${cold.artifacts.productionRepeat.treeSha256}**, demo tree **${cold.artifacts.demoRepeat.treeSha256}**. Production không gồm MSW worker/fixtures đã kiểm; demo có nhãn dữ liệu mô phỏng. Bản demo dùng artifact dist-demo; [hướng dẫn nghiệm thu](ACCEPTANCE_GUIDE.md) có 9 ca thực tế.

## Giới hạn quan sát

[FE-G01..09](quality-gate-matrix-corrections-20261008.json) giữ rubric **7/9**, tách khỏi 9/9 finding: screen-reader speech/broad human conformance NOT_RUN; owner acceptance PENDING. Hosted CI/branch protection NOT_RUN. Backend/provider thật, database, staging và production runtime ngoài phạm vi. [Claim review](production-claim-review-corrections-20261008.json) không tự chứng nhận production hoặc WCAG. UI: local technical evidence PASS; architecture: scoped owners/boundaries PRESERVED với shared fixes; review do Codex tự kiểm, không giả peer review.
`;
const reportFile = path.join(import.meta.dirname, 'REPORT.md');
const contractArchive = path.join(import.meta.dirname, 'REPORT-before-final-handoff.md');
if (!fs.existsSync(contractArchive)) fs.copyFileSync(reportFile, contractArchive);
fs.writeFileSync(reportFile,text.replace('Baseline [106 inputs]', '[Contract/owner ghi trước source edit](REPORT-before-final-handoff.md) được giữ như lịch sử. Baseline [106 inputs]'));
const planFile=path.join(frontend,'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md');
let plan=fs.readFileSync(planFile,'utf8');
plan=plan.replace(/\*\*CURRENT PHASE[^\n]+/,`**CURRENT PHASE — ${currentStatus} (08/10/2026):** đợt F01–F09 có 554/554 full browser, 173 unit và các gates hiện hành; thứ tự/trạng thái tại §16.6, [báo cáo source cuối](../evidence/frontend-corrections-20261008/REPORT.md). Speech, hosted CI, Backend và owner acceptance giữ giới hạn riêng.`);
plan=plan.replace('**Lập / cập nhật ngày:** 07/10/2026.','**Lập / cập nhật ngày:** 08/10/2026.');
const start=plan.indexOf('**08/10/2026 — corrective batch F01–F09'), end=plan.indexOf('\n| Bước | Ưu tiên / dependency',start);
if(start<0 || end<0) throw new Error('Canonical batch section not found');
let batch=plan.slice(start,end).replace(/\*\*08\/10\/2026 — corrective batch F01–F09[^\n]+/,`**08/10/2026 — corrective batch F01–F09: ${currentStatus}.** [Report](../evidence/frontend-corrections-20261008/REPORT.md) giữ logs/source hashes/limits. FE mẫu số 140, full-product read-only.`);
batch=batch.replace(/^(\| [1-9] \|[^\n]+\| )[^|\n]+ \|$/gm,'$1COMPLETE_REGRESSION_ON_FINAL_SOURCE |');
batch=batch.replace(/^(\| 10 \|[^\n]+\| )[^|\n]+ \|$/m,`$1${ready?'COMPLETE_LOCAL_TECHNICAL_HANDOFF':'TECHNICAL_CHECKS_PASS_PENDING_FE_REFRESH'} |`);
plan=plan.slice(0,start)+batch+plan.slice(end);
const liveStart=plan.indexOf('| Bước | Ưu tiên / dependency',start),liveEnd=plan.indexOf('\n**Thứ tự thực thi:**',liveStart);
let table=plan.slice(liveStart,liveEnd).replaceAll('frontend-ui-document-sync-20261007/REPORT.md','frontend-corrections-20261008/REPORT.md');
table=table.replaceAll('21 components + 6 compositions','22 components + 6 compositions').replaceAll('27 public API','28 public API').replaceAll('27 exported React APIs','28 exported React APIs').replaceAll('toàn bộ 27 API','toàn bộ 28 API').replaceAll('Một workflow; 27 contracts','Một workflow; 28 contracts');
table=table.replace(/\| S16 \|[^\n]+/,`| S16 | P1 /S11,S12,S15 | Reflow/text 200%/browser zoom 200%/focus/hit/occlusion/portal/native fallback theo owner hiện có | 320 CSS px; native text/zoom có method riêng; critical target/action/draft không mất; method chưa chạy ghi NOT_RUN | COMPLETE_METHODS_LOCAL_SOURCE — dialog đối chiếu: browser zoom 200% 1/1 và text-only 200% 1/1; W30: native 5/5 mỗi method và browser stress 10/10 trên source cuối. [Bằng chứng hiện hành](../evidence/frontend-corrections-20261008/REPORT.md). Speech/broad human conformance NOT_RUN; captures 07/10 giữ lịch sử. |`);
table=table.replace(/\| S19 \|[^\n]+/,`| S19 | P0 /S11,S12,S14,S16,S17,S18 | Inventory/source/API/consumer/route-state, all gates và artifact cuối | Zero unknown/missing/stale mandatory proof trong local scope | ${ready?'COMPLETE_LOCAL_AUTOMATED_REVALIDATION':'TECHNICAL_CHECKS_PASS_FE_REFRESH_PENDING'} — 554/554 full Chromium/Firefox; 6/6 built-demo; 173 unit; 28 shared APIs; 54 routes/432 state cells; [report source cuối](../evidence/frontend-corrections-20261008/REPORT.md). |`);
table=table.replace(/\| S20 \|[^\n]+/,`| S20 | P0 /S19 | Diff/hash/catalog/gates/FE tracker/demo và acceptance guide | Local technical handoff; giới hạn riêng | ${currentStatus} — [báo cáo](../evidence/frontend-corrections-20261008/REPORT.md), [ca nghiệm thu](../evidence/frontend-corrections-20261008/ACCEPTANCE_GUIDE.md); không tự nhận owner/speech/hosted/Backend. |`);
plan=plan.slice(0,liveStart)+table+plan.slice(liveEnd);
plan=plan.replace('Giữ catalog hiện có gồm 21 component function + 6 composition function (27 public APIs)','Catalog hiện hành gồm 22 component function + 6 composition function (28 public APIs), gồm DraftConflict theo invariant F01 đã xác nhận');
plan=plan.replace('Shared API có 27/27 direct render coverage, 38 cases.','Shared API có 28/28 direct render coverage; 38 contract fixtures và rendered unit cases riêng.');
for (const section of ['16.16', '16.17', '16.18']) {
    const heading = new RegExp(`(^### ${section.replace('.', '\\.')}\\.[^\\n]+\\n)(?!\\n> \\*\\*SNAPSHOT_LICH_SU)`, 'm');
    plan = plan.replace(heading, `$1\n> **SNAPSHOT_LICH_SU — 07/10/2026.** Phần này lưu quyết định/bằng chứng ở thời điểm ghi; các số liệu, lời mô tả current và TODO cũ không là trạng thái source 08/10. Thứ tự/trạng thái hiện hành chỉ ở §16.6 và [báo cáo F01–F09](../evidence/frontend-corrections-20261008/REPORT.md). Catalog source cuối: 22 components + 6 compositions = 28 public APIs; các bổ sung ngày 08/10 được nêu riêng.\n`);
}
plan=plan.replace('#### Số liệu và trạng thái hiện đã được đối chiếu','#### Số liệu của snapshot 07/10 và bổ sung 08/10');
plan=plan.replace('- Shared API có 28/28 direct render coverage;', '- **Bổ sung 08/10 — source F01–F09:** Shared API có 28/28 direct render coverage;');
fs.writeFileSync(planFile,plan);
execFileSync(process.execPath,['evidence/frontend-corrections-20261008/update-entrypoints.mjs',ready?'READY_FOR_ACCEPTANCE_LOCAL_SCOPE':'IN_PROGRESS'],{cwd:frontend,stdio:'inherit'});
console.log(currentStatus);
