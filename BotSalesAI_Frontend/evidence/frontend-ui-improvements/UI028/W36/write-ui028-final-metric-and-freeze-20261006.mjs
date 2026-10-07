import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const sha = value => createHash('sha256').update(value).digest('hex');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const readJson = relative => JSON.parse(read(relative));
const hashFile = relative => sha(fs.readFileSync(path.join(root, relative)));
const must = (condition, message) => { if (!condition) throw new Error(message); };
const paths = {
  plan: 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md',
  report: 'evidence/REPORT.md',
  w34: 'evidence/frontend-ui-improvements/UI028/W34/policy-sync-spc060-final-current-20261006.json',
  w35: 'evidence/frontend-ui-improvements/UI028/W35/fe-evidence-dependency-audit-spc060-final-current-20261006.json',
  verify: 'evidence/frontend-ui-improvements/UI028/W36/verify-equivalent-final-current-20261006-v2.log',
  e2e: 'evidence/frontend-ui-improvements/UI028/W36/built-demo-e2e-final-current-20261006.log',
  routeCheck: 'evidence/frontend-ui-improvements/UI028/W36/demo-route-http-check-current-20261006.log',
  ledger: 'botsales-kit/execution/frontend-progress.json',
  fe028S05: 'botsales-kit/execution/frontend-evidence/FE028/S05-ui028-w36-final-review-v4-current-20261006.json',
  oldW33: 'evidence/frontend-ui-improvements/UI028/W33/metric-register-current-20261006.json',
  demo: 'apps/web/dist-demo',
};

const planText = read(paths.plan);
const reportText = read(paths.report);
const policySync = readJson(paths.w34);
const dependencyAudit = readJson(paths.w35);
const verifyText = read(paths.verify);
const e2eText = read(paths.e2e);
const routeCheckText = read(paths.routeCheck);
const progressResult = spawnSync(process.execPath, ['botsales-kit/scripts/progress.mjs', 'status'], { cwd: root, encoding: 'utf8', windowsHide: true });
const validationResult = spawnSync(process.execPath, ['botsales-kit/scripts/progress.mjs', 'validate'], { cwd: root, encoding: 'utf8', windowsHide: true });
must(progressResult.status === 0, `Canonical FE status command failed: ${progressResult.stderr}`);
must(validationResult.status === 0, `Canonical FE validation failed: ${validationResult.stderr}`);
const tracker = JSON.parse(progressResult.stdout);
const validation = JSON.parse(validationResult.stdout);
const matrix = readJson('botsales-kit/execution/frontend-evidence/FE028/quality-gate-matrix-spc060-current-20261006.json');
must(validation.valid && validation.tasks === 28 && validation.checkpoints === 140, 'FE plan/ledger structural validation is not current PASS.');
must(tracker.verifiedSteps === 140 && tracker.totalSteps === 140 && tracker.stale.length === 0 && tracker.blocked.length === 0 && tracker.next.length === 0,
  `Canonical FE tracker is not clean: ${JSON.stringify(tracker)}`);
must(policySync.result === 'PASS', 'W34 policy sync is not PASS.');
must(dependencyAudit.result === 'PASS' && dependencyAudit.audit.currentCheckpoints === 140 && dependencyAudit.audit.changedSourceReferences === 0,
  'W35 live source/evidence audit is not clean.');
must(verifyText.includes('FINAL_RESULT=PASS') && (verifyText.match(/<<< .* PASS/g) ?? []).length === 13, 'Ordered direct-node frontend verify is not 13/13 PASS.');
must(/484 passed/.test(e2eText) && e2eText.includes('FINAL_RUNNER_EXIT_CODE=0') && !/^\s*not ok\s+\d+/m.test(e2eText),
  'Current full built-demo E2E is not 484/484 PASS.');
must(matrix.rubric.passed === 7 && matrix.gates.length === 9, 'FE gate matrix snapshot does not retain the documented 7/9 scope.');
const planRows = planText.split(/\r?\n/).filter(line => /^\| UI028\.W\d{2} \|/.test(line));
const planRowStatuses = planRows.map(line => line.split('|').map(cell => cell.trim()).filter(Boolean).at(-1));
must(planRows.length === 36 && planRowStatuses.every(status => status === 'DONE'),
  `Plan must have 36 W rows with DONE in the last column; observed ${planRows.length} rows, ${planRowStatuses.filter(status => status === 'DONE').length} DONE.`);
const ui028Section = planText.split('## 14. UI028')[1]?.split('\n## ')[0] ?? '';
const currentOverview = planText.split('## 1. Đọc nhanh tình trạng và việc tiếp theo')[1]?.split('\n## ')[0] ?? '';
must(/\*\*Trạng thái:\*\* `DONE 5\/5`/.test(ui028Section)
  && /W01–W36 và C01–C05 đã hoàn tất/.test(ui028Section), 'Current UI028 section is not recorded as DONE 5/5.');
must(currentOverview.includes('UI001–UI028: 28/28 hoàn tất kỹ thuật')
  && currentOverview.includes('140/140 hoàn tất kỹ thuật')
  && currentOverview.includes('13/13') && currentOverview.includes('484/484')
  && !currentOverview.includes('IN_PROGRESS 2/5'),
  'Current plan overview does not reconcile UI028 completion (historical changelog entries are allowed).');
must(reportText.includes('UI028/W36') && reportText.includes('484/484'), 'Final addendum is missing from the Frontend report.');
must(fs.existsSync(path.join(root, paths.fe028S05)), 'FE028.S05 final handoff evidence is not present.');
must(/statusCode=200/.test(routeCheckText) && /result=PASS/.test(routeCheckText), 'Current demo route HTTP check is not PASS.');

const demoRoot = path.join(root, paths.demo);
must(fs.existsSync(demoRoot), 'Built demo artifact is missing.');
const artifactFiles = [];
const walk = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (entry.isFile()) artifactFiles.push(absolute);
  }
};
walk(demoRoot);
artifactFiles.sort((a, b) => path.relative(demoRoot, a).localeCompare(path.relative(demoRoot, b)));
const artifactEntries = artifactFiles.map(absolute => ({
  path: path.relative(root, absolute).replaceAll(path.sep, '/'),
  sha256: hashFile(path.relative(root, absolute)),
  bytes: fs.statSync(absolute).size,
}));
const artifactSha256 = sha(Buffer.from(artifactEntries.map(file => `${file.path}:${file.sha256}`).join('\n')));
const recordedAt = new Date().toISOString();
const oldMetric = readJson(paths.oldW33);
oldMetric.recordedAt = recordedAt;
oldMetric.result = 'PASS_WITH_SCOPE_LIMITS';
oldMetric.metrics.M08_architectureDelivery = {
  status: 'PASS',
  evidence: 'Canonical FE tracker 140/140 with no stale/blocked/next; W35 checked all 140 evidence blobs and all recorded source hashes against the live files; W36 ordered direct-node verify 13/13 and built-demo E2E 484/484 PASS; W34 SPC-060 policy sync and W36 handoff/fingerprints are current. This closes the technical Frontend handoff only.',
  source: `${paths.w35}; ${paths.verify}; ${paths.e2e}; node botsales-kit/scripts/progress.mjs status`,
  limits: ['FE-G05 Narrator/screen-reader and human conformance remain NOT_RUN', 'FE-G09 owner acceptance remains user-owned and is not recorded by this evidence'],
};
oldMetric.artifact.sha256 = artifactSha256;
oldMetric.artifact.fileCount = artifactEntries.length;
oldMetric.artifact.fingerprintMethod = 'SHA-256 over sorted relative-path:file-SHA-256 lines';
oldMetric.regression = {
  defaultRun: '484/484 PASS on the current built synthetic-MSW demo with the repository-configured single Playwright worker',
  priorSnapshot: 'Earlier W32 480/484 plus 4/4 targeted retests remains a historical snapshot and is not used as the current full-run result.',
  currentLog: paths.e2e,
};
oldMetric.openItems = ['FE-G05 human/Narrator review is not claimed', 'FE-G09 user acceptance is pending the user', 'No Backend, hosted CI, staging, production deployment, or enterprise-wide claim is made'];
oldMetric.uiVerdict = 'PASS';
oldMetric.architectureVerdict = 'PASS_WITH_SCOPE_LIMITS';
oldMetric.noProgressLedgerWrite = true;
const metricsPath = 'evidence/frontend-ui-improvements/UI028/W33/metric-register-final-current-20261006.json';
fs.writeFileSync(path.join(root, metricsPath), `${JSON.stringify(oldMetric, null, 2)}\n`, 'utf8');

const handoffPath = 'evidence/frontend-ui-improvements/UI028/W36/handoff-current-20261006.md';
const handoff = `# UI028 — Frontend spacing and layout technical handoff\n\n**Result:** W01–W36 DONE (36/36); C01–C05 DONE (5/5). UI verdict PASS; architecture verdict PASS_WITH_SCOPE_LIMITS.\n\nThe SPC-060 rule for future UI is active in [FRONTEND_SPACING_STANDARD.md](../../../../docs/FRONTEND_SPACING_STANDARD.md#13-quy-trinh-phong-ngua-tai-pham-cho-ui-moi): choose and record a layout profile and semantic spacing owners before JSX/CSS; keep the same token-backed rhythm for routes in the same profile; deviations need a justified shared named variant and a real consumer; run spacing/visual-token gates and rendered layout/reflow regression across affected consumers.\n\n- Canonical Frontend tracker: ${tracker.verifiedSteps}/${tracker.totalSteps}, stale 0, blocked 0; all 140 evidence blobs and source references match live hashes.\n- Ordered direct-Node verify equivalents: 13/13 PASS; generator 11 outputs, 283 schemas, 210 operations, 54 routes; strict layout and visual-token scans each report 68 files and 0 findings.\n- Built-demo E2E: 484/484 PASS on the current synthetic-MSW demo, repository-configured serial browser run.\n- Built demo artifact: ${artifactEntries.length} files; SHA-256 fingerprint ${artifactSha256}.\n- Review the final freeze at [final-freeze-current-20261006.json](final-freeze-current-20261006.json) and metrics at [metric-register-final-current-20261006.json](../W33/metric-register-final-current-20261006.json).\n\nThis is a local Frontend/mock technical handoff. FE-G05 Narrator/screen-reader and human conformance review remain NOT_RUN; FE-G09 is pending the user's acceptance. No Backend/provider, hosted CI, staging, production deployment, or Production-Ready/Enterprise-Grade claim is made. The local demo remains at http://127.0.0.1:5173/s/shop-demo/imports.\n`;
fs.writeFileSync(path.join(root, handoffPath), handoff, 'utf8');
const evidenceHashes = [paths.w34, paths.w35, paths.verify, paths.e2e, paths.routeCheck, paths.fe028S05, handoffPath].map(relative => ({ path: relative, sha256: hashFile(relative) }));
const sourceDocs = policySync.sourceFiles;
const freeze = {
  schemaVersion: 1,
  task: 'UI028.W36',
  recordType: 'final_frontend_ui_plan_freeze',
  recordedAt,
  result: 'PASS_WITH_FINAL_USER_ACCEPTANCE_PENDING',
  scope: 'BotSalesAI_Frontend React/TypeScript UI; local synthetic-MSW acceptance only',
  plan: { path: paths.plan, sha256: hashFile(paths.plan), completedSteps: 36, totalSteps: 36, checkpoints: 'C01-C05 DONE 5/5' },
  handoff: { path: handoffPath, sha256: hashFile(handoffPath) },
  policy: { id: 'SPC-060', path: 'docs/FRONTEND_SPACING_STANDARD.md', version: '1.22', verifiedDocuments: 11, result: policySync.result },
  frontendTracker: {
    scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
    verifiedSteps: tracker.verifiedSteps,
    totalSteps: tracker.totalSteps,
    stale: tracker.stale,
    blocked: tracker.blocked,
    next: tracker.next,
    liveSourceAudit: dependencyAudit.audit,
  },
  checks: {
    orderedDirectNodeVerify: { result: 'PASS', gatesPassed: 13, gateCount: 13, path: paths.verify, sha256: hashFile(paths.verify) },
    builtDemoE2E: { result: 'PASS', passed: 484, failed: 0, path: paths.e2e, sha256: hashFile(paths.e2e) },
    artifact: { path: paths.demo, sha256: artifactSha256, fileCount: artifactEntries.length, files: artifactEntries },
    userDemoRoute: { url: 'http://127.0.0.1:5173/s/shop-demo/imports', result: 'HTTP 200', path: paths.routeCheck, sha256: hashFile(paths.routeCheck) },
  },
  verdicts: { ui: 'PASS', architecture: 'PASS_WITH_SCOPE_LIMITS', frontendGates: '7/9' },
  acceptanceAuthority: { ownerAcceptance: 'PENDING_USER', narratorAndHumanA11y: 'NOT_RUN', recordedByThisEvidence: false },
  explicitLimits: ['Local Frontend with synthetic MSW only', 'No Backend/provider integration, hosted CI, staging, production deployment, or Production-Ready/Enterprise-Grade claim'],
  sourceDocs,
  evidenceHashes,
  noProgressLedgerWrites: true,
};
const freezePath = 'evidence/frontend-ui-improvements/UI028/W36/final-freeze-current-20261006.json';
fs.writeFileSync(path.join(root, freezePath), `${JSON.stringify(freeze, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: freeze.result, steps: `${freeze.plan.completedSteps}/${freeze.plan.totalSteps}`, tracker: `${tracker.verifiedSteps}/${tracker.totalSteps}`, gates: '13/13', e2e: '484/484', artifactSha256, metrics: metricsPath, freeze: freezePath }, null, 2));
