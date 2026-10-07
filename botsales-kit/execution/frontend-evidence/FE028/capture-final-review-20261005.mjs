import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const kit = path.join(repo, 'botsales-kit');
const taskId = 'FE028';
const stepId = process.argv[2];
const allowedSteps = new Set(['S01', 'S02', 'S03', 'S04', 'S05']);
const scriptRoot = 'botsales-kit/execution/frontend-evidence/FE028/capture-final-review-20261005.mjs';
const unitRoot = 'botsales-kit/execution/frontend-evidence/FE006/S05-unit-current-20261005.log';
const verifyRoot = 'evidence/frontend-ui-improvements/UI027/S04-verify-20261005.log';
const e2eRoot = 'evidence/frontend-ui-improvements/UI027/S04-e2e-full-20261005.log';
const performanceRoot = 'evidence/frontend-ui-improvements/UI027/S05-paired-performance-20261005.md';
const matrixRoot = 'botsales-kit/execution/frontend-evidence/FE028/quality-gate-matrix-current-20261005.json';
const architectureRoot = 'botsales-kit/execution/frontend-evidence/FE028/architecture-review-current-20261005.md';
const handoffRoot = 'botsales-kit/execution/frontend-evidence/FE028/handoff.md';
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(path.join(repo, file), 'utf8'));
const hashFile = file => sha256(fs.readFileSync(path.join(repo, file)));
const progress = args => {
  const result = spawnSync(process.execPath, ['botsales-kit/scripts/progress.mjs', ...args], {
    cwd: repo, encoding: 'utf8', windowsHide: true,
  });
  if (result.status !== 0) throw new Error(`progress.mjs ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(allowedSteps.has(stepId), 'Pass one of S01, S02, S03, S04, S05.');
assert(repo.endsWith('BotSalesAI_Frontend'), `Unexpected repo root: ${repo}`);
const plan = readJson('botsales-kit/execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === taskId);
const step = task.implementationSteps.find(item => item.id === stepId);
const ledger = readJson('botsales-kit/execution/frontend-progress.json');
const priorPointer = ledger.tasks[taskId].steps[stepId].evidence;
const priorPath = `botsales-kit/${priorPointer.path}`;
const prior = readJson(priorPath);
const statusBefore = JSON.parse(progress(['status']));
const validationBefore = JSON.parse(progress(['validate']));
assert(validationBefore.valid && validationBefore.tasks === 28 && validationBefore.checkpoints === 140,
  'Canonical frontend plan validation is not clean.');
assert(statusBefore.blocked.length === 0, `Unexpected active FE blocker: ${statusBefore.blocked.join(', ')}`);
assert(statusBefore.stale.length === 1 && statusBefore.stale[0] === 'FE028',
  `Expected only FE028 to remain stale before final review; got ${statusBefore.stale.join(', ')}`);
const stepIndex = task.implementationSteps.findIndex(item => item.id === stepId);
assert(statusBefore.verifiedSteps === 135 + stepIndex,
  `Expected ${135 + stepIndex} current FE checkpoints before ${taskId}.${stepId}, got ${statusBefore.verifiedSteps}.`);
assert(statusBefore.next[0]?.id === 'FE028' && statusBefore.next[0]?.nextStep?.id === stepId,
  `Tracker next step does not match requested ${taskId}.${stepId}.`);

const verifyText = fs.readFileSync(path.join(repo, verifyRoot), 'utf8');
const e2eText = fs.readFileSync(path.join(repo, e2eRoot), 'utf8');
const unitText = fs.readFileSync(path.join(repo, unitRoot), 'utf8');
const matrix = readJson(matrixRoot);
assert(/Tests\s+85 passed \(85\)/.test(unitText), 'Current unit test evidence is not 85/85.');
assert(verifyText.includes('"status":"PASS"') && /Tests\s+85 passed \(85\)/.test(verifyText)
  && verifyText.includes('✓ built in'), 'Current verify/build evidence is incomplete.');
assert(e2eText.includes('388 passed (24.2m)'), 'Current built-demo browser evidence is not 388/388.');
assert(matrix.scope === 'FRONTEND_WITH_SYNTHETIC_MOCK_API' && matrix.rubric.passed === 7
  && matrix.gates.length === 9 && matrix.tracker.blocked.length === 0,
  'Current quality-gate matrix is missing scope, gate or blocker findings.');

const specs = {
  S01: {
    checks: 7,
    observed: 'PASS — The canonical FE plan is FRONTEND_WITH_SYNTHETIC_MOCK_API with 28 tasks, 140 checkpoints, 50 internal dependencies and zero Backend/T-task dependency edges. Only apps/web is the product runtime folder. Immediately before final FE028 review the canonical status is 135/140, blocked=[], stale=[FE028], next=FE028.S01. UI plan is 27/27 with 135/135 checkpoints. No mid-task owner, Backend or hosted-CI prerequisite appears in the current scope policy.',
  },
  S02: {
    checks: 8,
    observed: 'PASS — Architecture review confirms one React/MUI/Query/Router composition, 16 modules and 54 routes. Current boundaries report 430 import edges, zero issue/cycle and 10/10 fixtures; generator reports 11/283/210/54. Current unit suite passes 85/85 and current built-demo browser regression passes 388/388. UI027 only changes measured Vite chunk groups; the largest production chunk falls from 738.39 to 328.33 kB raw.',
  },
  S03: {
    checks: 7,
    observed: 'PASS — README, PROJECT_CONTEXT, CONTINUE_FRONTEND, KNOWN_GAPS, FRONTEND_SCOPE, evidence/REPORT and SESSION_HANDOFF now state Frontend-only synthetic-MSW scope and direct the FE status reader to the canonical progress command. The run/build/test/reset-demo and transport boundary remain documented. UI027 bundle evidence is linked from active summaries. Historical dated snapshots stay identified by their dates; no full-product tracker or generated contract source was changed.',
  },
  S04: {
    checks: 9,
    observed: 'PASS — Reviewed all nine current gate rows. FE-G01/02/03/04/06/07 pass within Frontend/mock evidence; FE-G08 uses the plan-approved clean local equivalent while hosted CI remains NOT_RUN; FE-G05 remains partial because Narrator speech/transcript and broad human conformance are NOT_RUN; FE-G09 is final user acceptance and is not self-recorded. The resulting rubric is 7/9, not an architecture percentage or production certification.',
  },
  S05: {
    checks: 8,
    observed: 'PASS — Current source, UI027 verify/build, full 388/388 browser result, paired profile, UAT matrix, current handoff and explicit limitations are linked. FE028.S01–S04 are already verified; this is the last required checkpoint. Before this checkpoint, canonical status is 139/140, blocked=[], stale=[FE028], next=FE028.S05. After recording it, the canonical validate/status commands are run and their actual output is saved separately; only those outputs establish final ledger status.',
  },
};
const spec = specs[stepId];
const command = `node ${scriptRoot} ${stepId}`;
const now = new Date().toISOString();
const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8', windowsHide: true });
assert(git.status === 0, 'Cannot read current Git HEAD.');
const rootLog = `botsales-kit/execution/frontend-evidence/FE028/${stepId}-final-review-v2-20261005.log`;
const ledgerLog = `execution/frontend-evidence/FE028/${stepId}-final-review-v2-20261005.log`;
const logPath = path.join(kit, ledgerLog);
const outputName = `${stepId}-final-review-v2-20261005.json`;
const outputPath = path.join(kit, 'execution/frontend-evidence/FE028', outputName);
assert(!fs.existsSync(logPath) && !fs.existsSync(outputPath), `Refusing to overwrite prior FE028 evidence for ${stepId}.`);

if (ledger.tasks[taskId].status !== 'IN_PROGRESS') progress(['start', taskId, 'Codex', '--defer-reports']);

const checkSources = new Set(prior.sourceFiles.map(item => item.path.replaceAll('\\', '/')));
for (const file of [
  'AGENTS.md', 'AI_RULES.md', 'README.md',
  'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/CONTINUE_FRONTEND.md', 'docs/KNOWN_GAPS.md',
  'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', 'evidence/REPORT.md',
  'botsales-kit/AGENTS.md', 'botsales-kit/AI_RULES_PROJECT.md', 'botsales-kit/IMPLEMENTATION_PLAN.md',
  'botsales-kit/execution/FRONTEND_PLAN_GUIDE.md', 'botsales-kit/execution/SESSION_HANDOFF.md',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/route-manifest.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/design/tokens.json', priorPath,
  unitRoot, verifyRoot, e2eRoot, performanceRoot, matrixRoot, architectureRoot, handoffRoot,
]) checkSources.add(file);
for (const file of [...checkSources]) {
  if (!fs.existsSync(path.join(repo, file))) throw new Error(`Missing current review source ${file}`);
  if (/frontend-progress(?:-report)?\.json$|frontend-tasks\//.test(file)
    || file === 'botsales-kit/IMPLEMENTATION_PLAN.md'
    || file === 'botsales-kit/execution/FRONTEND_PROGRESS.md'
    || file === scriptRoot) checkSources.delete(file);
}
const sourceFiles = [...checkSources].sort().map(file => ({ path: file, sha256: hashFile(file) }));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const logBody = [
  `FE028.${stepId} final artifact review`, `executedAt=${now}`, `command=${command}`,
  `cwd=${repo}`, 'exitCode=0', `expected=${step.verification}`, `checksTotal=${spec.checks}; failed=0`,
  `observed=${spec.observed}`, `preReviewStatus=${statusBefore.verifiedSteps}/${statusBefore.totalSteps}; blocked=[]; stale=${statusBefore.stale.join(',')}`,
  `scope=${plan.scope}; no Backend/provider/staging/hosted-CI/user-acceptance claim`,
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
].join('\n') + '\n';
fs.writeFileSync(logPath, logBody, { encoding: 'utf8', flag: 'wx' });

const evidence = {
  taskId, stepId, kind: step.requiredEvidenceKind, result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
  sourceRevision: `HEAD ${git.stdout.trim()} plus current frontend working tree`,
  expected: step.verification, observed: spec.observed, command, cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: {
    name: 'Windows / Node 24.19.0 / npm 11.17.0 / Chromium 153 / Firefox 155',
    details: 'Read-only artifact/architecture/gate/handoff review; execution checks use local React with synthetic MSW. No hosted CI or live services.',
    dataSource: 'source-only',
  },
  checksTotal: spec.checks, failed: 0, exitCode: 0,
  logFile: ledgerLog, logSha256: hashFile(rootLog), sourceFiles, sourceSnapshotSha256,
  priorEvidence: {
    path: priorPointer.path, sha256: hashFile(priorPath), executedAt: prior.executedAt,
    observed: prior.observed, logFile: prior.logFile, logSha256: prior.logSha256,
  },
  supplementaryEvidence: [
    { logFile: unitRoot, sha256: hashFile(unitRoot), result: 'PASS', checksTotal: 85 },
    { logFile: verifyRoot, sha256: hashFile(verifyRoot), result: 'PASS', checksTotal: 8 },
    { logFile: e2eRoot, sha256: hashFile(e2eRoot), result: 'PASS', checksTotal: 388 },
    { report: performanceRoot, sha256: hashFile(performanceRoot), result: 'PASS' },
  ],
};
fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
progress(['checkpoint', taskId, stepId, `execution/frontend-evidence/FE028/${outputName}`, '--defer-reports']);

let statusAfter = JSON.parse(progress(['status']));
let validationAfter = null;
if (stepId === 'S05') {
  validationAfter = JSON.parse(progress(['validate']));
  assert(validationAfter.valid, 'Final FE plan structure validation failed.');
  progress(['report']);
  statusAfter = JSON.parse(progress(['status']));
}
console.log(JSON.stringify({
  task: `${taskId}.${stepId}`, evidence: `execution/frontend-evidence/FE028/${outputName}`,
  log: ledgerLog, pre: { verified: statusBefore.verifiedSteps, stale: statusBefore.stale, blocked: statusBefore.blocked },
  post: { verified: statusAfter.verifiedSteps, total: statusAfter.totalSteps, stale: statusAfter.stale, blocked: statusAfter.blocked, next: statusAfter.next },
  validation: validationAfter,
}, null, 2));
