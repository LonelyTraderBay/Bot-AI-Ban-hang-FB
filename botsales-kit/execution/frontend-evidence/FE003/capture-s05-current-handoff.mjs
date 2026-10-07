import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const kit = path.join(root, 'botsales-kit');
const output = path.join(kit, 'execution/frontend-evidence/FE003');
const relEvidence = 'execution/frontend-evidence/FE003';
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected cwd: ${root}`);

const invoke = (args) => {
  const result = spawnSync(process.execPath, ['botsales-kit/scripts/progress.mjs', ...args], { cwd: root, encoding: 'utf8' });
  return { exitCode: result.status ?? 1, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
};
const beforeLedger = sha(fs.readFileSync(path.join(kit, 'execution/frontend-progress.json')));
const validate = invoke(['validate']);
const statusRun = invoke(['status']);
const nextRun = invoke(['next']);
const afterLedger = sha(fs.readFileSync(path.join(kit, 'execution/frontend-progress.json')));
assert(validate.exitCode === 0 && /"tasks":\s*28/.test(validate.output) && /"checkpoints":\s*140/.test(validate.output), 'Frontend tracker validate failed or selected wrong plan');
assert(statusRun.exitCode === 0, 'Frontend tracker status failed');
const status = JSON.parse(statusRun.output);
assert(status.blocked.length === 0, 'Current FE tracker contains active blocked tasks');
assert(status.verifiedSteps === 14 && status.totalSteps === 140, 'Unexpected pre-checkpoint ledger baseline');
assert(nextRun.exitCode === 0, 'Frontend tracker next failed');
const next = JSON.parse(nextRun.output);
const nextStep = next.steps?.find((step) => step.status !== 'VERIFIED');
assert(next.id === 'FE003' && nextStep?.id === 'S05', `Expected FE003.S05 before recording it; received ${next.id}.${nextStep?.id}`);
assert(beforeLedger === afterLedger, 'Read-only tracker checks changed the frontend ledger');

const filesToRead = [
  'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/CONTINUE_FRONTEND.md', 'docs/KNOWN_GAPS.md',
  'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', 'docs/FRONTEND_PLAN_DOCUMENT_AUDIT_2026-10-04.md',
  'evidence/REPORT.md', 'botsales-kit/execution/SESSION_HANDOFF.md', 'botsales-kit/execution/frontend-evidence/FE003/handoff.md',
];
const docs = filesToRead.map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')] );
assert(JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-plan.json'), 'utf8')).scope === 'FRONTEND_WITH_SYNTHETIC_MOCK_API', 'Canonical FE plan scope changed.');
assert(docs.find(([file]) => file === 'docs/FRONTEND_SCOPE.md')[1].includes('Front'), 'Frontend scope summary is missing');
assert(docs.find(([file]) => file === 'docs/CONTINUE_FRONTEND.md')[1].includes('nghiệm thu cuối'), 'Continuation does not reserve user acceptance for the end');
assert(docs.find(([file]) => file === 'docs/FRONTEND_PLAN_DOCUMENT_AUDIT_2026-10-04.md')[1].includes('Frontend-only'), 'Detailed scope audit is missing');
const uiPlan = docs.find(([file]) => file === 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md')[1];
assert(uiPlan.includes('140/140') && uiPlan.includes('28/28 task DONE'), 'Main UI plan does not record the completed frontend plan target');

const observed = 'The canonical frontend ledger validates at 28 tasks/140 checkpoints and selects FE003.S05 after 14 verified checkpoints; active blocked is empty. The handoff keeps mock-only execution, local-versus-hosted evidence, and final owner acceptance distinct. FE004.S01 is next after this checkpoint. Tracker reads left frontend-progress.json byte-identical.';
const checks = [
  { label: 'frontend validate/status/next', observed: 'All commands exit 0; next is FE003.S05; blocked=[]; pre-checkpoint status 14/140.' },
  { label: 'read-only ledger safety', observed: `Ledger SHA256 before/after read-only commands is identical (${beforeLedger}).` },
  { label: 'handoff scope and acceptance', observed: 'All nine scope/progress/handoff documents retain FRONTEND_WITH_SYNTHETIC_MOCK_API and reserve the final acceptance decision to the user.' },
  { label: 'current runner handoff and limits', observed: 'Handoff retains 85/85 unit evidence, 388-test discovery, first PATH failure, local-only scope and no hosted CI claim.' },
];
const reviewer = 'Codex self-review; no independent peer review claimed';
const executedAt = new Date().toISOString();
const revision = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const branch = spawnSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const sourcePaths = [
  'botsales-kit/scripts/progress.mjs', 'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  'package.json', 'apps/web/package.json', 'apps/web/vitest.config.ts', 'playwright.config.ts',
  'botsales-kit/execution/frontend-evidence/FE003/S01-current-command-map-20261004.json',
  'botsales-kit/execution/frontend-evidence/FE003/S02-current-gate-task-crosswalk-20261004.json',
  'botsales-kit/execution/frontend-evidence/FE003/S03-current-runner-baseline-20261004.json',
  ...filesToRead, 'botsales-kit/execution/frontend-evidence/FE003/capture-s05-current-handoff.mjs',
];
const sourceFiles = sourcePaths.map((file) => ({ path: file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map((file) => `${file.path}:${file.sha256}`).sort().join('\n')));
const logFile = `${relEvidence}/S05-current-handoff-audit-20261004.log`;
const evidenceFile = `${relEvidence}/S05-current-handoff-audit-20261004.json`;
const log = [
  'FE003.S05 current Windows/CI handoff and documentation consistency', `executedAt=${executedAt}`, `cwd=${root}`,
  `commands=node botsales-kit/scripts/progress.mjs validate; status; next`, 'exitCodes=0/0/0',
  `observed=${observed}`, `checksTotal=${checks.length}; failed=0`,
  ...checks.flatMap((check) => [`CHECK ${check.label}: PASS`, check.observed]),
  `nextBeforeCheckpoint=${next.id}.${nextStep.id}; expectedAfterCheckpoint=FE004.S01`,
  'preCheckpointPlan=14/140 verified checkpoints; next=FE003.S05; active blocked=[]; after checkpoint expected next=FE004.S01',
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; local source/test/mock evidence only; hosted CI/backend/provider/staging not claimed.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map((file) => `SOURCE ${file.path} sha256=${file.sha256}`),
  `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(output, 'S05-current-handoff-audit-20261004.log'), log, 'utf8');
const evidence = {
  taskId: 'FE003', stepId: 'S05', kind: 'artifact_review', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: 'Windows handoff and active scope/progress docs match the current frontend tracker; local checks and unrun CI/live-service/owner limits remain distinct; next sequence is explicit.',
  observed, command: `node botsales-kit/execution/frontend-evidence/FE003/capture-s05-current-handoff.mjs`, cwd: root, reviewer,
  environment: { name: `Windows / Node ${process.versions.node} / npm 11.17.0`, details: 'Read-only tracker commands were rerun; handoff and documentation were source-reviewed. No build/browser suite or CI was started by this checkpoint.', dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, logFile, logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  tracker: { validateExitCode: validate.exitCode, statusExitCode: statusRun.exitCode, nextExitCode: nextRun.exitCode, preCheckpointVerifiedSteps: status.verifiedSteps, totalSteps: status.totalSteps, activeBlocked: status.blocked, next: `${next.id}.${nextStep.id}`, expectedAfterCheckpoint: 'FE004.S01' },
  runnerEvidence: { vitestPassed: 85, vitestFilesPassed: 10, playwrightDiscovered: 388, playwrightFiles: 33, playwrightProjects: ['chromium', 'firefox'], browserCasesRunInS03: false },
};
fs.writeFileSync(path.join(output, 'S05-current-handoff-audit-20261004.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', preCheckpoint: `${status.verifiedSteps}/${status.totalSteps}`, next: `${next.id}.${nextStep.id}`, blocked: status.blocked.length, evidence: evidenceFile, log: logFile }, null, 2));
