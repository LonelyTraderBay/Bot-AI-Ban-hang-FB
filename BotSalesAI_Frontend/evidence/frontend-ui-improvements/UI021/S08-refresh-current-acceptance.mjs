import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const fromRoot = (value) => path.join(root, value);
const reportPath = path.join(here, 'S07-current-frontend-design-audit-20261003.json');
const logPath = path.join(here, 'S07-current-audit-run-20261003.log');
const audit = JSON.parse(await readFile(reportPath, 'utf8'));
const runLog = await readFile(logPath, 'utf8');
const count = Number(audit.summary?.total);
const ruleIds = [...new Set(audit.findings?.map((finding) => finding.ruleId) ?? [])];
const before = runLog.match(/premiumAuditSha256Before=([A-F\d]+)/)?.[1];
const after = runLog.match(/premiumAuditSha256After=([A-F\d]+)/)?.[1];
if (audit.mode !== 'strict' || audit.summary?.errors !== 13 || audit.summary?.warnings !== 0
  || audit.summary?.unresolved !== 0 || count !== 13 || audit.findings?.length !== 13
  || ruleIds.length !== 1 || ruleIds[0] !== 'affordance.actionless-button'
  || !runLog.includes('runnerExit=1') || !before || before !== after) {
  throw new Error('S07 current strict audit report/log do not match the recorded 13-finding exit-1 result.');
}

const updateLine = async (file, prefix, transform) => {
  const fullPath = fromRoot(file);
  const original = await readFile(fullPath, 'utf8');
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  const lines = original.split(/\r?\n/);
  const matches = lines.map((line, index) => line.startsWith(prefix) ? index : -1).filter((index) => index >= 0);
  if (matches.length !== 1) throw new Error(`${file}: expected one line starting ${prefix}; found ${matches.length}.`);
  lines[matches[0]] = transform(lines[matches[0]]);
  await writeFile(fullPath, lines.join(newline), 'utf8');
};

const plan = 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md';
await updateLine(plan, '**Mã kế hoạch:**', (line) => line.replace('**Phiên bản:** 5.10', '**Phiên bản:** 5.11'));
await updateLine(plan, 'Phiên bản 5.10 lập phiếu quyết định UI020.C02', (line) => line);
await updateLine(plan, '| Evidence gần nhất |', (line) => {
  if (line.includes('UI021 [S07 current strict report]')) return line;
  return line.replace(
    'UI021 [S05 runner provenance](../evidence/frontend-ui-improvements/UI021/S05-current-audit-provenance.md),',
    'UI021 [S07 current strict report](../evidence/frontend-ui-improvements/UI021/S07-current-frontend-design-audit-20261003.json), [S07 run log](../evidence/frontend-ui-improvements/UI021/S07-current-audit-run-20261003.log), [S05 runner provenance](../evidence/frontend-ui-improvements/UI021/S05-current-audit-provenance.md),'
  );
});
await updateLine(plan, '| Gates gần nhất |', (line) => line.replace(
  'UI021/S05 strict audit scope React chạy được, exit 1 với 13 lỗi static cùng rule; C05 provenance đã ghi, C04 vẫn PARTIAL.',
  'UI021/S07 rerun strict audit trên source hiện hành vẫn exit 1 với 13 finding cùng rule; 13/13 crosswalk còn đúng, C04 vẫn PARTIAL và không gọi scanner PASS.'
));
await updateLine(plan, '| UI021 | P2 | TU | Đối chiếu design auditor', (line) => line.replace(
  'C04 PARTIAL: current strict run 13 findings/exit 1; 13/13 đã crosswalk, không gọi scanner PASS',
  'C04 PARTIAL: S07 current strict run 13 findings/exit 1, 0 unresolved; S05 crosswalk 13/13, không gọi scanner PASS'
));
await updateLine(plan, '- **C04 PARTIAL — strict audit rerun', () =>
  '- **C04 PARTIAL — strict audit rerun:** the latest S07 strict JSON reports 13 errors, 0 warnings, 0 unresolved, exit 1, all rule `affordance.actionless-button`; see [S07 JSON](../evidence/frontend-ui-improvements/UI021/S07-current-frontend-design-audit-20261003.json) and [S07 run log](../evidence/frontend-ui-improvements/UI021/S07-current-audit-run-20261003.log), which records runner exit and unchanged root premium-audit hash. S05 crosswalk maps all 13 anchors to real RouterLink/handler/file-input/download/submit semantics; the crosswalk does not change the scanner result to PASS.'
);
await updateLine(plan, '- **C05 PASS — current provenance and acceptance:**', (line) => line.replace(
  'report [JSON](../evidence/frontend-ui-improvements/UI021/S05-current-frontend-design-audit.json)',
  'latest report [S07 JSON](../evidence/frontend-ui-improvements/UI021/S07-current-frontend-design-audit-20261003.json) and [S07 log](../evidence/frontend-ui-improvements/UI021/S07-current-audit-run-20261003.log), plus historical S05 [JSON](../evidence/frontend-ui-improvements/UI021/S05-current-frontend-design-audit.json)'
));
{
  const fullPath = fromRoot(plan);
  const original = await readFile(fullPath, 'utf8');
  if (!original.includes('Phiên bản 5.11 ghi lại UI021/S07')) {
    const newline = original.includes('\r\n') ? '\r\n' : '\n';
    const history = 'Phiên bản 5.11 ghi lại UI021/S07: strict `frontend-design-premium` v1.4.0 được chạy lại trên source hiện hành sau R26; 13/13 finding cùng rule `affordance.actionless-button`, 0 warning/unresolved, exit 1. Root `premium-audit.json` giữ nguyên SHA-256 trước/sau. C04 vẫn PARTIAL vì strict scan không PASS; UI021 không tăng checkpoint. Đồng bộ các acceptance/status cũ sang UI015 DONE 5/5, E2E S20 188/188 và backlog 20/26, 113/130.\n' + newline;
    const marker = 'Phiên bản 5.10 lập phiếu quyết định UI020.C02';
    const markerIndex = original.indexOf(marker);
    if (markerIndex < 0) throw new Error('Could not find UI020 v5.10 history entry to insert UI021 v5.11 update.');
    const lineStart = original.lastIndexOf(newline, markerIndex) + newline.length;
    const lineEnd = original.indexOf(newline, markerIndex);
    const updated = original.slice(0, lineEnd + newline.length) + history + original.slice(lineEnd + newline.length);
    await writeFile(fullPath, updated, 'utf8');
  }
}
{
  const fullPath = fromRoot(plan);
  const original = await readFile(fullPath, 'utf8');
  if (!original.includes('### 11.44. UI021 current strict audit rerun after R26 — 03/10/2026')) {
    const newline = original.includes('\r\n') ? '\r\n' : '\n';
    const appendix = [
      '',
      '### 11.44. UI021 current strict audit rerun after R26 — 03/10/2026',
      '',
      '- **Current tool result:** the installed `frontend-design-premium` v1.4.0 runner and `premium-ui.json` strict `apps/web/src` scope were rerun after the R26 BotConfig text-wrap change. [S07 JSON](../evidence/frontend-ui-improvements/UI021/S07-current-frontend-design-audit-20261003.json) reports 13 errors, 0 warnings, 0 unresolved; every finding remains `affordance.actionless-button`. [S07 log](../evidence/frontend-ui-improvements/UI021/S07-current-audit-run-20261003.log) records exit 1 and matching before/after SHA-256 for root `premium-audit.json`.',
      '- **UI/architecture review:** S05 crosswalk maps the same 13 anchors to RouterLink, handlers, native file inputs, download anchors or submit semantics. No source action was missing in the crosswalk. The separate R35-to-R07 permission-composition edge remains unverified because the canonical mock role set cannot represent that combination; no source or permission policy was changed.',
      '- **Checkpoint:** UI021 remains IN_PROGRESS 4/5; C04 is PARTIAL because the actual strict scanner exits 1. Do not report the scanner as PASS or add an exception/fake handler to clear the exit. S07 is current scan evidence, not a defect-free certification.',
      '- **Progress and scope:** total backlog remains 20/26 and 113/130; readiness remains 7/9. No source, contract, generated file, root `premium-audit.json`, FE/product ledger, CI, backend or staging state changed.',
      '',
    ].join(newline);
    await writeFile(fullPath, original + appendix, 'utf8');
  }
}

const context = 'docs/PROJECT_CONTEXT.md';
await updateLine(context, '- `node botsales-kit/scripts/progress.mjs status` hiện là', (line) => {
  const tail = line.slice(line.indexOf('S09 contrast'));
  return '- `node botsales-kit/scripts/progress.mjs status` hiện là 0/140 checkpoint VERIFIED và 28/28 task STALE; không tăng ledger vì chưa có bằng chứng để đóng nguyên task FE. Kế hoạch UI bổ sung phiên bản 5.11 ghi 13/16 bắt buộc DONE, 7/10 tối ưu DONE, tổng 20/26 và 113/130 checkpoint. UI012 4/5 còn screen-reader/manual; UI015 DONE 5/5 theo Android Chrome emulator S07 (chưa thử handset); UI016–UI019 DONE; UI020 IN_PROGRESS 1/5, C02 chờ support matrix owner; UI021 IN_PROGRESS 4/5, C04 current S07 strict scan exit 1/13, C05 provenance PASS; UI022 IN_PROGRESS 4/5, C04 chờ remote run; UI023–UI024 TODO do owner/manual prerequisites. ' + tail;
});
await updateLine(context, 'Full automated frontend demo suite mới nhất', (line) => line
  .replace('UI015 còn C04 chờ đo native soft keyboard;', 'UI015 DONE 5/5: Android Chrome emulator S07 verified native keyboard; physical handset chưa được thử;')
  .replace('UI021 C01–C03/C05 PASS, C04 PARTIAL do strict v1.4.0 React-scope scan có 13 error và exit 1; xem [S05](../evidence/frontend-ui-improvements/UI021/S05-current-audit-provenance.md).', 'UI021 C01–C03/C05 PASS, C04 PARTIAL: current S07 strict v1.4.0 React-scope scan có 13 errors/exit 1; xem [S07](../evidence/frontend-ui-improvements/UI021/S07-current-frontend-design-audit-20261003.json) và [S05 provenance](../evidence/frontend-ui-improvements/UI021/S05-current-audit-provenance.md).'));
await updateLine(context, 'UI021.C01–C03 PASS.', (line) => line.replace(
  'current S05 crosswalks all 13 findings from a fresh React-only run.',
  'S05 crosswalks all 13 findings from the fresh React-only run; S07 reran the strict scan after later source changes and reproduced the same 13 anchors.'
));
await updateLine(context, 'UI: PASS for the crosswalked controls;', (line) => line
  .replace('The 03/10 strict scan exits 1 with 13 errors, 0 warnings and 0 unresolved;', 'The latest 03/10 S07 strict scan exits 1 with 13 errors, 0 warnings and 0 unresolved;')
  .replace('See [S05 provenance]', 'See [S07 report](../evidence/frontend-ui-improvements/UI021/S07-current-frontend-design-audit-20261003.json), [S07 log](../evidence/frontend-ui-improvements/UI021/S07-current-audit-run-20261003.log), [S05 provenance]'));

const reportFile = 'evidence/REPORT.md';
await updateLine(reportFile, '`node botsales-kit/scripts/progress.mjs status` hiện xác nhận', (line) => line
  .replace('Strict audit 02/10 với 12 finding là lịch sử; lần chạy React-only 03/10 bằng `frontend-design-premium` v1.4.0 có 13 finding', 'Strict audit 02/10 với 12 finding là lịch sử; lần chạy React-only mới nhất S07 ngày 03/10 bằng `frontend-design-premium` v1.4.0 có 13 finding'));
await updateLine(reportFile, 'The 12 findings in the 02/10 strict snapshot remain historical.', (line) => line
  .replace('A fresh 03/10 strict run with `frontend-design-premium` v1.4.0 targets only `apps/web/src` and reports', 'The latest S07 03/10 strict rerun after current source changes uses `frontend-design-premium` v1.4.0 and only `apps/web/src`; it reports')
  .replace('[UI021/S05 crosswalk]', '[UI021/S05 crosswalk]')
  .replace('[S05 provenance]', '[S05 provenance]')
  .replace('the [strict JSON](frontend-ui-improvements/UI021/S05-current-frontend-design-audit.json)', 'the latest [S07 strict JSON](frontend-ui-improvements/UI021/S07-current-frontend-design-audit-20261003.json) and [S07 run log](frontend-ui-improvements/UI021/S07-current-audit-run-20261003.log)'));
await updateLine(reportFile, 'UI021 C01–C03/C05 PASS, C04 PARTIAL.', (line) => line.replace(
  'At the UI021 update, the latest full rebuilt-demo E2E was UI024/S01 at 187/187; it is superseded by current post-fix UI012/S16 at 187/187.',
  'The current full rebuilt-demo E2E is UI012/S20 at 188/188; it remains local Chromium + synthetic MSW, not CI or owner UAT. Current strict scanner rerun is S07, exit 1/13; C04 remains PARTIAL.'
));

const acceptancePath = path.join(here, 'S06-acceptance.json');
const acceptance = JSON.parse(await readFile(acceptancePath, 'utf8'));
acceptance.status = 'IN_PROGRESS';
acceptance.checkpointCount = '4/5';
acceptance.revision.workingTree = 'S07 reran the strict React-only scanner against the current post-R26 source; the same 13 crosswalked anchors remain and the scanner still exits 1. UI015 is now complete and current full local E2E is S20 188/188. The crosswalked source regions were rechecked; unrelated dirty work remains un-attributed.';
acceptance.checkpoints.C04 = 'PARTIAL — current S07 strict run on apps/web/src has 13 affordance.actionless-button errors, 0 warnings, 0 unresolved, exit 1. S05 crosswalk maps all 13 anchors to real RouterLink/handler/file-input/download/submit semantics, but does not convert the scanner exit to PASS. No false-positive allowlist or fake action was added.';
acceptance.checkpoints.C05 = 'PASS — S07 report/log, original S05 runner/version/config provenance, source crosswalk, S20 current E2E, updated plan/context/report and refreshed SHA-256 fingerprints are linked. The root premium-audit.json was unchanged during S07.';
acceptance.verification.strictAudit = 'NOT_PASS; current rerun S07 exit 1, strict mode, scope apps/web/src, 13 errors/violations, 0 warnings, 0 unresolved; all findings rule affordance.actionless-button. Report evidence/frontend-ui-improvements/UI021/S07-current-frontend-design-audit-20261003.json; raw command/exit/hash log evidence/frontend-ui-improvements/UI021/S07-current-audit-run-20261003.log. Runner v1.4.0 SHA-256 67FD35597C85A2F37DD3C566F0BD79768CBE059114EDCF28074FC5AFA3E0CE68.';
acceptance.verification.fullDemoE2E = 'Latest current-source full suite UI012/S20: 188/188 PASS on local Chromium + synthetic MSW after R26 text-wrap fix; it does not establish CI or owner UAT.';
acceptance.backlog = { mandatoryDone: '13/16', optionalDone: '7/10', totalDone: '20/26', checkpoints: '113/130', next: 'UI021.C04 remains partial because strict scan exits 1; UI020 owner matrix, UI012 manual accessibility and FE-G09 owner UAT remain open.' };
acceptance.limitations = acceptance.limitations.filter((item) => !item.startsWith('No browser other than Chromium, backend, hosted CI, staging, real device'));
acceptance.limitations.push('UI015/S07 verifies Android Chrome soft-keyboard behavior on an emulator only; it is not a physical-handset or browser-support matrix result.');
for (const file of [
  'S07-current-frontend-design-audit-20261003.json',
  'S07-current-audit-run-20261003.log',
  'S08-refresh-current-acceptance.mjs',
  '../UI012/S20-current-full-e2e-20261003.log',
  '../UI015/S07-android-soft-keyboard-probe-20261003.json',
]) if (!acceptance.evidence.includes(file)) acceptance.evidence.push(file);
delete acceptance.fingerprints['installed-skill/frontend-design-premium/1.4.0/audit_project.py'];
const additionalFingerprints = [
  'evidence/frontend-ui-improvements/UI021/S07-current-frontend-design-audit-20261003.json',
  'evidence/frontend-ui-improvements/UI021/S07-current-audit-run-20261003.log',
  'evidence/frontend-ui-improvements/UI021/S08-refresh-current-acceptance.mjs',
  'evidence/frontend-ui-improvements/UI012/S20-current-full-e2e-20261003.log',
  'evidence/frontend-ui-improvements/UI015/S07-android-soft-keyboard-probe-20261003.json',
];
for (const file of additionalFingerprints) acceptance.fingerprints[file] = '';
for (const file of Object.keys(acceptance.fingerprints)) {
  const absolutePath = path.resolve(root, file);
  const bytes = await readFile(absolutePath);
  acceptance.fingerprints[file] = createHash('sha256').update(bytes).digest('hex').toUpperCase();
}
await writeFile(acceptancePath, `${JSON.stringify(acceptance, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  planVersion: '5.12',
  ui021: acceptance.status,
  checkpointCount: acceptance.checkpointCount,
  currentAudit: { exit: 1, findings: count, warnings: audit.summary.warnings, unresolved: audit.summary.unresolved, rule: ruleIds[0] },
  backlog: acceptance.backlog,
  fingerprints: Object.keys(acceptance.fingerprints).length,
}, null, 2));
